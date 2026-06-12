import { Injectable } from "@nestjs/common";
import type { CryptoContext, HistoricalCandle, MarketDataProvider, Quote } from "./market.types";

const directAssets: Record<string, string> = {
  BTC: "bitcoin",
  "BTC-USD": "bitcoin",
  ETH: "ethereum",
  "ETH-USD": "ethereum",
  SOL: "solana",
  "SOL-USD": "solana",
  DOGE: "dogecoin",
  "DOGE-USD": "dogecoin",
  ADA: "cardano",
  "ADA-USD": "cardano"
};

const assetSymbols: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  dogecoin: "DOGE",
  cardano: "ADA"
};

const cryptoSensitiveEquities = new Set(["COIN", "MSTR", "MARA", "RIOT", "HOOD", "SQ", "PYPL", "TSLA"]);
const simplePriceCacheMs = 25_000;
const historyCacheMs = 10 * 60_000;

type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

type CoinMarketItem = {
  id?: string;
  symbol?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  total_volume?: number;
  last_updated?: string;
};

type MarketChartPayload = {
  prices?: Array<[number, number]>;
  total_volumes?: Array<[number, number]>;
};

@Injectable()
export class CoinGeckoProvider implements MarketDataProvider {
  private readonly contextCache = new Map<string, CacheEntry<CryptoContext>>();
  private readonly historyCache = new Map<string, CacheEntry<HistoricalCandle[]>>();

  capabilities = {
    name: "coingecko",
    minPollMs: 30_000,
    supportsBatch: false,
    supportsSearch: false,
    supportsQuotes: true,
    supportsFundamentals: false,
    supportsNews: false,
    supportsAnalystTrend: false,
    supportsHistory: true,
    supportsCrypto: true
  };

  async getQuote(ticker: string): Promise<Quote | null> {
    const context = await this.cryptoContext(ticker);
    if (!context) return null;
    return {
      ticker: symbolForAsset(context.asset, ticker),
      price: context.priceUsd,
      change: context.priceUsd * (context.change24hPercent / 100),
      changePercent: context.change24hPercent,
      updatedAt: context.updatedAt,
      source: "coingecko"
    };
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y"): Promise<HistoricalCandle[] | null> {
    if (range !== "1d") return null;
    return this.cryptoHistory(ticker, 1);
  }

  async cryptoContext(ticker: string): Promise<CryptoContext | null> {
    const normalized = ticker.trim().toUpperCase();
    const asset = directAssets[normalized] ?? (cryptoSensitiveEquities.has(normalized) ? "bitcoin" : null);
    if (!asset) return null;

    const cacheKey = `context:${asset}`;
    const cached = this.contextCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await fetchJson<Record<string, { usd?: number; usd_24h_change?: number; usd_market_cap?: number; usd_24h_vol?: number; last_updated_at?: number }>>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${asset}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`
    );
    const item = data?.[asset];
    const context = item?.usd
      ? {
          asset,
          priceUsd: item.usd,
          change24hPercent: item.usd_24h_change ?? 0,
          marketCapUsd: item.usd_market_cap,
          volume24hUsd: item.usd_24h_vol,
          source: "coingecko",
          updatedAt: item.last_updated_at ? new Date(item.last_updated_at * 1000).toISOString() : new Date().toISOString()
        }
      : await this.cryptoContextFromMarkets(asset);

    if (context) this.contextCache.set(cacheKey, { data: context, expiresAt: Date.now() + simplePriceCacheMs });
    return context;
  }

  async cryptoHistory(ticker: string, days: 1 | 7 = 1): Promise<HistoricalCandle[] | null> {
    const normalized = ticker.trim().toUpperCase();
    const asset = directAssets[normalized];
    if (!asset) return null;

    const cacheKey = `history:${asset}:${days}`;
    const cached = this.historyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const data = await fetchJson<Array<[number, number, number, number, number]>>(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset)}/ohlc?vs_currency=usd&days=${days}`
    );
    if (!Array.isArray(data) || data.length === 0) {
      const fallback = await this.cryptoHistoryFromMarketChart(asset, normalized, days);
      if (fallback) this.historyCache.set(cacheKey, { data: fallback, expiresAt: Date.now() + historyCacheMs });
      return fallback;
    }
    const symbol = symbolForAsset(asset, normalized);
    const candles = data.map(([timestamp, open, high, low, close]) => ({
      ticker: symbol,
      date: new Date(timestamp).toISOString(),
      open: positive(open),
      high: positive(high),
      low: positive(low),
      close: positive(close),
      volume: 0,
      source: "coingecko"
    }));
    this.historyCache.set(cacheKey, { data: candles, expiresAt: Date.now() + historyCacheMs });
    return candles;
  }

  private async cryptoContextFromMarkets(asset: string): Promise<CryptoContext | null> {
    const data = await fetchJson<CoinMarketItem[]>(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(asset)}&price_change_percentage=24h`
    );
    const item = Array.isArray(data) ? data.find((entry) => entry.id === asset) ?? data[0] : null;
    if (!item?.current_price) return null;
    return {
      asset,
      priceUsd: item.current_price,
      change24hPercent: item.price_change_percentage_24h ?? 0,
      marketCapUsd: item.market_cap,
      volume24hUsd: item.total_volume,
      source: "coingecko",
      updatedAt: item.last_updated ?? new Date().toISOString()
    };
  }

  private async cryptoHistoryFromMarketChart(asset: string, normalized: string, days: 1 | 7): Promise<HistoricalCandle[] | null> {
    const data = await fetchJson<MarketChartPayload>(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset)}/market_chart?vs_currency=usd&days=${days}`
    );
    if (!Array.isArray(data?.prices) || data.prices.length === 0) return null;
    const symbol = symbolForAsset(asset, normalized);
    const volumeByTimestamp = new Map((data.total_volumes ?? []).map(([timestamp, volume]) => [timestamp, positive(volume)]));
    return data.prices
      .map(([timestamp, price], index, prices) => {
        const close = positive(price);
        if (close <= 0) return null;
        const previousClose = index > 0 ? positive(prices[index - 1]?.[1]) : close;
        const open = previousClose || close;
        return {
          ticker: symbol,
          date: new Date(timestamp).toISOString(),
          open,
          high: Math.max(open, close),
          low: Math.min(open, close),
          close,
          volume: volumeByTimestamp.get(timestamp) ?? 0,
          source: "coingecko-market-chart"
        };
      })
      .filter((candle): candle is HistoricalCandle => Boolean(candle));
  }
}

export function coinGeckoAssetForTicker(ticker: string) {
  return directAssets[ticker.trim().toUpperCase()] ?? null;
}

function symbolForAsset(asset: string, fallback: string) {
  return assetSymbols[asset] ?? fallback.trim().toUpperCase();
}

function positive(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_FETCH_TIMEOUT_MS ?? "6000"));
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: coingeckoHeaders()
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function coingeckoHeaders() {
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": process.env.PIXELFUND_USER_AGENT ?? process.env.SEC_EDGAR_USER_AGENT ?? "PixelFund AI educational simulator"
  };
  const demoKey = process.env.COINGECKO_DEMO_API_KEY?.trim();
  if (demoKey) headers["x-cg-demo-api-key"] = demoKey;
  return headers;
}
