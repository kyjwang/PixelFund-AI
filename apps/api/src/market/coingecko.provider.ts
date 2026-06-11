import { Injectable } from "@nestjs/common";
import type { CryptoContext, MarketDataProvider } from "./market.types";

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

const cryptoSensitiveEquities = new Set(["COIN", "MSTR", "MARA", "RIOT", "HOOD", "SQ", "PYPL", "TSLA"]);

@Injectable()
export class CoinGeckoProvider implements MarketDataProvider {
  capabilities = {
    name: "coingecko",
    minPollMs: 30_000,
    supportsBatch: false,
    supportsSearch: false,
    supportsQuotes: false,
    supportsFundamentals: false,
    supportsNews: false,
    supportsAnalystTrend: false,
    supportsHistory: false,
    supportsCrypto: true
  };

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
