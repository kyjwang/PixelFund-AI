import { describe, expect, jest, test } from "@jest/globals";
import { CryptoMarketDataService } from "../src/crypto-trader/crypto-market-data.service";
import type { CryptoSymbol } from "../src/crypto-trader/crypto-trader.types";
import type { HistoricalCandle } from "../src/market/market.types";

function candles(symbol: CryptoSymbol): HistoricalCandle[] {
  return Array.from({ length: 24 }, (_, index) => {
    const price = 100 + index;
    return {
      ticker: symbol,
      date: new Date(Date.UTC(2026, 5, 12, index)).toISOString(),
      open: price - 1,
      high: price + 2,
      low: price - 2,
      close: price,
      volume: 1000,
      source: "test"
    };
  });
}

describe("crypto market data service", () => {
  test("uses CoinGecko when CoinGecko price and candles are available", async () => {
    const coinGecko = {
      cryptoContext: jest.fn(async () => ({
        asset: "bitcoin",
        priceUsd: 123,
        change24hPercent: 1.2,
        source: "coingecko",
        updatedAt: "2026-06-12T12:00:00.000Z"
      })),
      cryptoHistory: jest.fn(async () => candles("BTC"))
    };
    const yahoo = {
      cryptoMarketData: jest.fn()
    };

    const bundle = await new CryptoMarketDataService(coinGecko as any, yahoo as any).resolve("BTC");

    expect(bundle.price).toBe(123);
    expect(bundle.candles).toHaveLength(24);
    expect(bundle.source).toBe("coingecko");
    expect(bundle.isFallback).toBe(false);
    expect(yahoo.cryptoMarketData).not.toHaveBeenCalled();
  });

  test("falls back to Yahoo/yfinance data when CoinGecko has no usable data", async () => {
    const coinGecko = {
      cryptoContext: jest.fn(async () => null),
      cryptoHistory: jest.fn(async () => null)
    };
    const yahoo = {
      cryptoMarketData: jest.fn(async () => ({
        symbol: "BTC",
        price: 124,
        candles: candles("BTC"),
        source: "Yahoo/yfinance research fallback",
        asOf: "2026-06-12T12:00:00.000Z",
        warnings: [],
        isFallback: true
      }))
    };

    const bundle = await new CryptoMarketDataService(coinGecko as any, yahoo as any).resolve("BTC");

    expect(bundle.price).toBe(124);
    expect(bundle.source).toBe("Yahoo/yfinance research fallback");
    expect(bundle.isFallback).toBe(true);
    expect(bundle.warnings.join(" ")).toContain("CoinGecko unavailable; used Yahoo/yfinance fallback data.");
  });

  test("returns unavailable only when CoinGecko and Yahoo/yfinance fallback both fail", async () => {
    const coinGecko = {
      cryptoContext: jest.fn(async () => null),
      cryptoHistory: jest.fn(async () => null)
    };
    const yahoo = {
      cryptoMarketData: jest.fn(async () => null)
    };

    const bundle = await new CryptoMarketDataService(coinGecko as any, yahoo as any).resolve("BTC");

    expect(bundle.price).toBe(0);
    expect(bundle.candles).toEqual([]);
    expect(bundle.source).toBe("unavailable");
    expect(bundle.warnings.join(" ")).toContain("Yahoo/yfinance fallback returned no usable crypto price/candles.");
  });
});
