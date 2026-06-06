import { describe, expect, test } from "vitest";
import {
  aggregatePortfolioManager,
  aggregateRecommendation,
  applyTrade,
  buildAgentAnalysis,
  buildAnalysisExplanation,
  computeTechnicalIndicators,
  canCancelOrder,
  evaluateOrderFill,
  isOrderTriggered,
  runPortfolioManagerBacktest
} from "../src/index";
import type { MarketContext } from "@pixelfund/schemas";

describe("portfolio accounting", () => {
  test("buy and average cost", () => {
    let state = { cash: 1000, positions: [] as any[] };
    state = applyTrade(state.cash, state.positions, "AAPL", "BUY", 2, 100);
    state = applyTrade(state.cash, state.positions, "AAPL", "BUY", 2, 200);
    expect(state.cash).toBe(400);
    expect(state.positions[0].averageCost).toBe(150);
    expect(state.positions[0].quantity).toBe(4);
  });

  test("insufficient funds", () => {
    expect(() => applyTrade(100, [], "AAPL", "BUY", 2, 60)).toThrow("INSUFFICIENT_FUNDS");
  });

  test("sell and insufficient shares", () => {
    const bought = applyTrade(1000, [], "AAPL", "BUY", 2, 100);
    const sold = applyTrade(bought.cash, bought.positions, "AAPL", "SELL", 1, 130);
    expect(sold.positions[0].quantity).toBe(1);
    expect(sold.realizedPnlDelta).toBe(30);
    expect(() => applyTrade(sold.cash, sold.positions, "AAPL", "SELL", 2, 130)).toThrow("INSUFFICIENT_SHARES");
  });

  test("full liquidation then re-entry", () => {
    const bought = applyTrade(2000, [], "MSFT", "BUY", 4, 100);
    const liquidated = applyTrade(bought.cash, bought.positions, "MSFT", "SELL", 4, 110);
    expect(liquidated.positions.length).toBe(0);
    expect(liquidated.realizedPnlDelta).toBe(40);
    const reentry = applyTrade(liquidated.cash, liquidated.positions, "MSFT", "BUY", 2, 120);
    expect(reentry.positions[0].quantity).toBe(2);
    expect(reentry.positions[0].averageCost).toBe(120);
  });

  test("repeated buys then staged sells", () => {
    let state = applyTrade(5000, [], "NVDA", "BUY", 2, 100);
    state = applyTrade(state.cash, state.positions, "NVDA", "BUY", 3, 160);
    expect(state.positions[0].averageCost).toBe(136);
    const sell1 = applyTrade(state.cash, state.positions, "NVDA", "SELL", 1, 180);
    expect(sell1.realizedPnlDelta).toBe(44);
    const sell2 = applyTrade(sell1.cash, sell1.positions, "NVDA", "SELL", 2, 120);
    expect(sell2.realizedPnlDelta).toBeCloseTo(-32, 5);
  });
});

describe("order lifecycle rules", () => {
  test("limit and stop triggers follow broker-style side rules", () => {
    expect(isOrderTriggered({ side: "BUY", orderType: "LIMIT", currentPrice: 99, limitPrice: 100 })).toBe(true);
    expect(isOrderTriggered({ side: "BUY", orderType: "LIMIT", currentPrice: 101, limitPrice: 100 })).toBe(false);
    expect(isOrderTriggered({ side: "SELL", orderType: "LIMIT", currentPrice: 101, limitPrice: 100 })).toBe(true);
    expect(isOrderTriggered({ side: "SELL", orderType: "STOP", currentPrice: 99, stopPrice: 100 })).toBe(true);
    expect(isOrderTriggered({ side: "BUY", orderType: "STOP", currentPrice: 101, stopPrice: 100 })).toBe(true);
  });

  test("evaluates full and partial fills", () => {
    expect(evaluateOrderFill({ quantity: 10, filledQuantity: 0, side: "BUY", orderType: "MARKET", currentPrice: 50 })).toEqual({
      shouldFill: true,
      fillQuantity: 10,
      nextStatus: "FILLED"
    });

    expect(evaluateOrderFill({ quantity: 10, filledQuantity: 2, availableQuantity: 3, side: "BUY", orderType: "LIMIT", currentPrice: 49, limitPrice: 50 })).toEqual({
      shouldFill: true,
      fillQuantity: 3,
      nextStatus: "PARTIALLY_FILLED"
    });
  });

  test("only open orders can be canceled", () => {
    expect(canCancelOrder("PENDING")).toBe(true);
    expect(canCancelOrder("PARTIALLY_FILLED")).toBe(true);
    expect(canCancelOrder("FILLED")).toBe(false);
    expect(canCancelOrder("REJECTED")).toBe(false);
  });
});

describe("recommendation aggregation", () => {
  test("handles disagreement and missing data", () => {
    const rec = aggregateRecommendation([
      { recommendation: "BUY", confidence: 0.6 },
      { recommendation: "AVOID", confidence: 0.7 },
      { confidence: 0.9 }
    ]);
    expect(rec).toBe("AVOID");
  });

  test("risk analyst can cap an otherwise bullish manager result", () => {
    const manager = aggregatePortfolioManager([
      { agentType: "TECHNICAL_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.8, summary: "trend" },
      { agentType: "NEWS_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.75, summary: "news" },
      { agentType: "FUNDAMENTALS_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.82, summary: "fundamentals" },
      { agentType: "RISK_ANALYST", status: "COMPLETED", recommendation: "AVOID", confidence: 0.78, summary: "risk" }
    ]);

    expect(manager.recommendation).toBe("HOLD");
    expect(manager.reasons.some((reason) => reason.includes("capped"))).toBe(true);
  });

  test("debate and risk council can moderate a bullish trader plan", () => {
    const manager = aggregatePortfolioManager([
      { agentType: "TECHNICAL_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.8, summary: "trend" },
      { agentType: "FUNDAMENTALS_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.8, summary: "fundamentals" },
      { agentType: "BULL_RESEARCHER", status: "COMPLETED", recommendation: "BUY", confidence: 0.76, summary: "bull" },
      { agentType: "TRADER_AGENT", status: "COMPLETED", recommendation: "BUY", confidence: 0.74, summary: "trade plan" },
      { agentType: "CONSERVATIVE_RISK", status: "COMPLETED", recommendation: "AVOID", confidence: 0.72, summary: "risk limit" }
    ]);

    expect(manager.score).toBeLessThan(62);
    expect(manager.reasons.some((reason) => reason.includes("Conservative Risk"))).toBe(true);
  });

  test("analysis explanation exposes coverage, votes, and top contributors", () => {
    const explanation = buildAnalysisExplanation({
      id: "run-1",
      ticker: "AAPL",
      status: "COMPLETED",
      finalRec: "HOLD",
      finalSummary: "Mixed committee",
      recommendations: [
        { agentType: "TECHNICAL_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.8, summary: "trend", reasons: ["trend"] },
        { agentType: "FUNDAMENTALS_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.7, summary: "growth", reasons: ["growth"] },
        { agentType: "CONSERVATIVE_RISK", status: "COMPLETED", recommendation: "AVOID", confidence: 0.75, summary: "risk", reasons: ["risk"] },
        { agentType: "PORTFOLIO_MANAGER", status: "COMPLETED", recommendation: "HOLD", confidence: 0.66, summary: "hold", reasons: ["mixed"] }
      ]
    });

    expect(explanation.voteMix.BUY).toBe(2);
    expect(explanation.voteMix.AVOID).toBe(1);
    expect(explanation.coverage.completed).toBe(3);
    expect(explanation.topContributors).toContain("TECHNICAL_ANALYST");
    expect(explanation.caveats.some((caveat) => caveat.includes("conflict"))).toBe(true);
  });
});

describe("agent analysis engine", () => {
  test("fundamentals agent rewards profitable growth with reasonable valuation", () => {
    const context = makeContext({
      peRatio: 18,
      revenueGrowth: 24,
      epsGrowth: 30,
      netMargin: 22,
      roe: 28,
      debtToEquity: 0.4
    });

    const output = buildAgentAnalysis("FUNDAMENTALS_ANALYST", "AAPL", context);
    expect(output.recommendation).toBe("BUY");
    expect(output.confidence).toBeGreaterThan(0.6);
  });

  test("bull and bear researchers use specialist evidence", () => {
    const context = makeContext({});
    const evidence = [
      {
        agentType: "FUNDAMENTALS_ANALYST",
        status: "COMPLETED",
        recommendation: "BUY",
        confidence: 0.8,
        summary: "growth",
        reasons: ["[finnhub] Revenue growth supports upside."]
      },
      {
        agentType: "RISK_ANALYST",
        status: "COMPLETED",
        recommendation: "AVOID",
        confidence: 0.7,
        summary: "risk",
        reasons: ["[finnhub] Beta is elevated."]
      }
    ] as const;

    const bull = buildAgentAnalysis("BULL_RESEARCHER", "AAPL", context, [...evidence]);
    const bear = buildAgentAnalysis("BEAR_RESEARCHER", "AAPL", context, [...evidence]);
    expect(bull.reasons.some((reason) => reason.includes("BUY case"))).toBe(true);
    expect(bear.reasons.some((reason) => reason.includes("Bear concern"))).toBe(true);
  });

  test("trader plan includes action, sizing, invalidation, and horizon", () => {
    const context = makeContext({});
    const trader = buildAgentAnalysis("TRADER_AGENT", "AAPL", context, [
      { agentType: "BULL_RESEARCHER", status: "COMPLETED", recommendation: "BUY", confidence: 0.8, summary: "bull case" },
      { agentType: "BEAR_RESEARCHER", status: "COMPLETED", recommendation: "HOLD", confidence: 0.45, summary: "bear case" }
    ]);

    expect(trader.reasons.some((reason) => reason.includes("Position size hint"))).toBe(true);
    expect(trader.reasons.some((reason) => reason.includes("Invalidation"))).toBe(true);
    expect(trader.reasons.some((reason) => reason.includes("Holding horizon"))).toBe(true);
  });

  test("unsupported data lowers risk council confidence", () => {
    const context = makeContext({});
    context.dataQuality = {
      ...context.dataQuality,
      score: 0.45,
      status: "UNSUPPORTED",
      provider: "unsupported",
      liveQuote: false,
      fundamentals: false,
      warnings: ["Live quote unavailable."],
      messages: ["Unsupported market data."]
    };

    const conservative = buildAgentAnalysis("CONSERVATIVE_RISK", "SIVE.ST", context, [
      { agentType: "TRADER_AGENT", status: "COMPLETED", recommendation: "BUY", confidence: 0.75, summary: "trade plan" }
    ]);
    expect(conservative.recommendation).not.toBe("BUY");
    expect(conservative.reasons.some((reason) => reason.includes("Weak evidence"))).toBe(true);
  });

  test("technical indicators detect an uptrend", () => {
    const candles = Array.from({ length: 60 }, (_item, idx) => ({
      ticker: "AAPL",
      date: new Date(Date.UTC(2026, 0, idx + 1)).toISOString().slice(0, 10),
      open: 100 + idx,
      high: 101 + idx,
      low: 99 + idx,
      close: 100 + idx,
      volume: 1_000_000 + idx * 1000,
      source: "test"
    }));

    const indicators = computeTechnicalIndicators(candles);
    expect(indicators.trend).toBe("UP");
    expect(indicators.sma20).toBeGreaterThan(indicators.sma50 ?? 0);
  });

  test("backtest returns deterministic performance metrics", () => {
    const candles = Array.from({ length: 90 }, (_item, idx) => ({
      ticker: "AAPL",
      date: new Date(Date.UTC(2026, 0, idx + 1)).toISOString().slice(0, 10),
      open: 100 + idx,
      high: 101 + idx,
      low: 99 + idx,
      close: 100 + idx,
      volume: 1_000_000,
      source: "test"
    }));

    const result = runPortfolioManagerBacktest({
      ticker: "AAPL",
      from: candles[0].date,
      to: candles[candles.length - 1].date,
      strategy: "PORTFOLIO_MANAGER_REPLAY",
      candles,
      provider: "test",
      status: "LIVE",
      messages: ["test data"]
    });

    expect(result.trades).toBeGreaterThan(0);
    expect(result.simulatedPnl).toBeGreaterThan(0);
    expect(result.recommendationAccuracy).toBeGreaterThan(0.5);
  });
});

function makeContext(fundamentals: Partial<MarketContext["fundamentals"]>): MarketContext {
  return {
    ticker: "AAPL",
    quote: {
      ticker: "AAPL",
      price: 190,
      change: 2,
      changePercent: 1.1,
      updatedAt: new Date().toISOString(),
      source: "finnhub"
    },
    fundamentals: {
      peRatio: 24,
      marketCap: 2_000_000_000_000,
      beta: 1.1,
      revenueGrowth: 12,
      epsGrowth: 10,
      netMargin: 20,
      roe: 22,
      debtToEquity: 0.8,
      week52High: 210,
      week52Low: 140,
      week52Return: 18,
      tenDayAverageVolume: 80_000_000,
      threeMonthAverageVolume: 70_000_000,
      source: "finnhub",
      ...fundamentals
    },
    news: [
      {
        headline: "Apple reports strong demand and profit growth",
        sentiment: "positive",
        sentimentScore: 0.75,
        source: "Finnhub"
      }
    ],
    analystTrend: {
      period: "2026-06",
      strongBuy: 8,
      buy: 14,
      hold: 10,
      sell: 1,
      strongSell: 0,
      consensus: "BUY",
      source: "finnhub"
    },
    generatedAt: new Date().toISOString(),
    dataQuality: {
      score: 1,
      status: "LIVE",
      provider: "finnhub",
      liveQuote: true,
      fundamentals: true,
      news: true,
      analystTrend: true,
      warnings: [],
      messages: ["AAPL is using live provider data."]
    }
  };
}
