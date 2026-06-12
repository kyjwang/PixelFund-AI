import { Injectable } from "@nestjs/common";
import type { CryptoMarketDataBundle, CryptoSymbol } from "./crypto-trader.types";

const yahooSymbols: Record<CryptoSymbol, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD"
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        regularMarketTime?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

@Injectable()
export class YahooCryptoProvider {
  async cryptoMarketData(symbol: CryptoSymbol): Promise<CryptoMarketDataBundle | null> {
    const yahooSymbol = yahooSymbols[symbol];
    const data = await fetchYahooChart(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=2d&interval=30m&includePrePost=false`
    );
    const result = data?.chart?.result?.[0];
    const quote = result?.indicators?.quote?.[0];
    const timestamps = result?.timestamp ?? [];
    if (!quote || timestamps.length === 0) return null;

    const candles = timestamps
      .map((timestamp, index) => {
        const close = positive(quote.close?.[index]);
        if (close <= 0) return null;
        const open = positive(quote.open?.[index]) || close;
        const high = positive(quote.high?.[index]) || Math.max(open, close);
        const low = positive(quote.low?.[index]) || Math.min(open, close);
        return {
          timestamp: new Date(timestamp * 1000).toISOString(),
          open,
          high,
          low,
          close,
          volume: positive(quote.volume?.[index])
        };
      })
      .filter((candle): candle is CryptoMarketDataBundle["candles"][number] => Boolean(candle));

    const price = positive(result?.meta?.regularMarketPrice) || candles.at(-1)?.close || 0;
    if (price <= 0 || candles.length === 0) return null;

    return {
      symbol,
      price,
      candles,
      source: "Yahoo/yfinance research fallback",
      asOf: result?.meta?.regularMarketTime ? new Date(result.meta.regularMarketTime * 1000).toISOString() : candles.at(-1)?.timestamp ?? null,
      warnings: [],
      isFallback: true
    };
  }
}

async function fetchYahooChart(url: string): Promise<YahooChartResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_FETCH_TIMEOUT_MS ?? "6000"));
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": process.env.PIXELFUND_USER_AGENT ?? process.env.SEC_EDGAR_USER_AGENT ?? "PixelFund AI educational simulator"
      }
    });
    if (!res.ok) return null;
    return (await res.json()) as YahooChartResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function positive(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
