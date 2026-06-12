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

@Injectable()
export class CoinGeckoProvider implements MarketDataProvider {
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
    const data = await fetchJson<Record<string, { usd?: number; usd_24h_change?: number; usd_market_cap?: number; usd_24h_vol?: number }>>(
      `https://api.coingecko.com/api/v3/simple/price?ids=${asset}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
    );
    const item = data?.[asset];
    if (!item?.usd) return null;
    return {
      asset,
      priceUsd: item.usd,
      change24hPercent: item.usd_24h_change ?? 0,
      marketCapUsd: item.usd_market_cap,
      volume24hUsd: item.usd_24h_vol,
      source: "coingecko",
      updatedAt: new Date().toISOString()
    };
  }

  async cryptoHistory(ticker: string, days: 1 | 7 = 1): Promise<HistoricalCandle[] | null> {
    const normalized = ticker.trim().toUpperCase();
    const asset = directAssets[normalized];
    if (!asset) return null;
    const data = await fetchJson<Array<[number, number, number, number, number]>>(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(asset)}/ohlc?vs_currency=usd&days=${days}`
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    const symbol = symbolForAsset(asset, normalized);
    return data.map(([timestamp, open, high, low, close]) => ({
      ticker: symbol,
      date: new Date(timestamp).toISOString(),
      open: positive(open),
      high: positive(high),
      low: positive(low),
      close: positive(close),
      volume: 0,
      source: "coingecko"
    }));
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
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
