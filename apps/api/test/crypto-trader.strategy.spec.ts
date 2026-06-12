import { describe, expect, test } from "@jest/globals";
import { evaluateCryptoSignal } from "../src/crypto-trader/crypto-trader.strategy";
import type { CryptoCandle } from "../src/crypto-trader/crypto-trader.types";

const risingCandles: CryptoCandle[] = Array.from({ length: 24 }, (_, index) => {
  const price = 100 + index * 2;
  return {
    timestamp: new Date(Date.UTC(2026, 5, 12, index)).toISOString(),
    open: price - 1,
    high: price + 2,
    low: price - 2,
    close: price,
    volume: 1_000_000
  };
});

const fallingCandles: CryptoCandle[] = Array.from({ length: 24 }, (_, index) => {
  const price = 150 - index * 2;
  return {
    timestamp: new Date(Date.UTC(2026, 5, 12, index)).toISOString(),
    open: price + 1,
    high: price + 2,
    low: price - 2,
    close: price,
    volume: 1_000_000
  };
});

describe("crypto auto-trader strategy", () => {
  test("returns BUY when trend and momentum are positive and risk allows", () => {
    const signal = evaluateCryptoSignal({
      symbol: "BTC",
      price: 150,
      candles: risingCandles,
      btcCandles: risingCandles,
      heldQuantity: 0,
      averageCost: 0,
      portfolioValue: 100_000,
      coinExposurePercent: 0,
      cash: 50_000,
      stopLossPercent: 4,
      maxPortfolioPercent: 20,
      tradesToday: 0,
      maxTradesPerDay: 4,
      lastTradeAt: null,
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(signal.action).toBe("BUY");
    expect(signal.notional).toBeGreaterThanOrEqual(100);
    expect(signal.reason).toContain("trend");
  });

  test("returns SELL when the simulated stop-loss is breached", () => {
    const signal = evaluateCryptoSignal({
      symbol: "ETH",
      price: 95,
      candles: fallingCandles,
      btcCandles: risingCandles,
      heldQuantity: 2,
      averageCost: 100,
      portfolioValue: 100_000,
      coinExposurePercent: 10,
      cash: 20_000,
      stopLossPercent: 4,
      maxPortfolioPercent: 20,
      tradesToday: 0,
      maxTradesPerDay: 4,
      lastTradeAt: null,
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(signal.action).toBe("SELL");
    expect(signal.reason).toContain("stop-loss");
  });

  test("returns HOLD when the daily trade limit is reached", () => {
    const signal = evaluateCryptoSignal({
      symbol: "SOL",
      price: 150,
      candles: risingCandles,
      btcCandles: risingCandles,
      heldQuantity: 0,
      averageCost: 0,
      portfolioValue: 100_000,
      coinExposurePercent: 0,
      cash: 50_000,
      stopLossPercent: 6,
      maxPortfolioPercent: 20,
      tradesToday: 4,
      maxTradesPerDay: 4,
      lastTradeAt: null,
      now: new Date("2026-06-12T12:00:00.000Z")
    });

    expect(signal.action).toBe("HOLD");
    expect(signal.reason).toContain("Daily trade limit");
  });
});
