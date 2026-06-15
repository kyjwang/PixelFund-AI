import { describe, expect, test } from "vitest";
import {
  PREDICTION_HORIZONS,
  aggregatePortfolioManager,
  buildMlFeatureSnapshot,
  calibrateConfidence,
  labelForwardOutcome
} from "../src/index";
import type { HistoricalCandle, MarketContext } from "@pixelfund/schemas";

describe("prediction horizons and labels", () => {
  test("defines short, swing, and long horizons in stable order", () => {
    expect(PREDICTION_HORIZONS).toEqual(["SHORT_1_3D", "SWING_5_20D", "LONG_1_3M"]);
  });

  test("labels forward outcomes without reading beyond the requested horizon", () => {
    const candles = makeCandles([100, 101, 102, 106, 120, 70]);

    expect(labelForwardOutcome(candles, "2026-01-01", "SHORT_1_3D")).toEqual({
      asOfDate: "2026-01-01",
      horizon: "SHORT_1_3D",
      startClose: 100,
      endClose: 106,
      forwardReturnPercent: 6,
      recommendation: "BUY"
    });
  });

  test("uses a neutral hold band for small forward returns", () => {
    const candles = makeCandles([100, 100.4, 100.8, 101.1, 101.2, 101.3]);

    expect(labelForwardOutcome(candles, "2026-01-01", "SHORT_1_3D")?.recommendation).toBe("HOLD");
  });
});

describe("ML feature snapshots", () => {
  test("uses only context generated at or before the snapshot date", () => {
    const context = makeContext();
    const snapshot = buildMlFeatureSnapshot(context, "2026-01-10", "SWING_5_20D");

    expect(snapshot.ticker).toBe("AAPL");
    expect(snapshot.horizon).toBe("SWING_5_20D");
    expect(snapshot.asOfDate).toBe("2026-01-10");
    expect(snapshot.features.quoteChangePercent).toBe(1.2);
    expect(snapshot.features.dataQualityScore).toBe(0.72);
    expect(snapshot.features.newsSentimentAverage).toBe(0.4);
    expect(snapshot.featureAsOf.maxNewsPublishedAt).toBe("2026-01-09T12:00:00.000Z");
    expect(snapshot.excludedFutureEvidence).toContain("news:2026-01-11T12:00:00.000Z");
  });

  test("excludes same-day evidence after an exact snapshot timestamp", () => {
    const context = makeContext();
    context.news = [
      ...context.news,
      {
        headline: "Published after generatedAt on same day",
        source: "test",
        publishedAt: "2026-01-10T18:00:00.000Z",
        sentiment: "positive",
        sentimentScore: 0.9
      }
    ];

    const snapshot = buildMlFeatureSnapshot(context, context.generatedAt, "SHORT_1_3D");

    expect(snapshot.featureAsOf.maxNewsPublishedAt).toBe("2026-01-09T12:00:00.000Z");
    expect(snapshot.excludedFutureEvidence).toContain("news:2026-01-10T18:00:00.000Z");
  });
});

describe("calibration and portfolio aggregation", () => {
  test("calibrates overconfident agents down when historical correctness is lower", () => {
    const calibration = calibrateConfidence([
      { agentType: "TECHNICAL_ANALYST", horizon: "SWING_5_20D", predictedConfidence: 0.8, wasCorrect: true },
      { agentType: "TECHNICAL_ANALYST", horizon: "SWING_5_20D", predictedConfidence: 0.8, wasCorrect: false },
      { agentType: "TECHNICAL_ANALYST", horizon: "SWING_5_20D", predictedConfidence: 0.8, wasCorrect: false },
      { agentType: "TECHNICAL_ANALYST", horizon: "SWING_5_20D", predictedConfidence: 0.8, wasCorrect: true }
    ]);

    expect(calibration["TECHNICAL_ANALYST:SWING_5_20D"].observations).toBe(4);
    expect(calibration["TECHNICAL_ANALYST:SWING_5_20D"].calibratedConfidence).toBeLessThan(0.8);
    expect(calibration["TECHNICAL_ANALYST:SWING_5_20D"].reliabilityWeight).toBeLessThan(1);
  });

  test("manager can use calibrated reliability weights while keeping risk caps", () => {
    const manager = aggregatePortfolioManager(
      [
        { agentType: "TECHNICAL_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.9, summary: "trend" },
        { agentType: "FUNDAMENTALS_ANALYST", status: "COMPLETED", recommendation: "BUY", confidence: 0.85, summary: "fundamentals" },
        { agentType: "RISK_ANALYST", status: "COMPLETED", recommendation: "AVOID", confidence: 0.78, summary: "risk" }
      ],
      {
        horizon: "SWING_5_20D",
        calibration: {
          "TECHNICAL_ANALYST:SWING_5_20D": { observations: 30, calibratedConfidence: 0.52, reliabilityWeight: 0.55 },
          "FUNDAMENTALS_ANALYST:SWING_5_20D": { observations: 30, calibratedConfidence: 0.62, reliabilityWeight: 0.75 },
          "RISK_ANALYST:SWING_5_20D": { observations: 30, calibratedConfidence: 0.76, reliabilityWeight: 1.1 }
        }
      }
    );

    expect(manager.recommendation).toBe("HOLD");
    expect(manager.reasons.some((reason) => reason.includes("calibrated reliability"))).toBe(true);
    expect(manager.reasons.some((reason) => reason.includes("Risk Analyst high-confidence AVOID capped"))).toBe(true);
  });
});

function makeCandles(closes: number[]): HistoricalCandle[] {
  return closes.map((close, idx) => ({
    ticker: "AAPL",
    date: new Date(Date.UTC(2026, 0, idx + 1)).toISOString().slice(0, 10),
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000_000,
    source: "test"
  }));
}

function makeContext(): MarketContext {
  return {
    ticker: "AAPL",
    quote: {
      ticker: "AAPL",
      price: 190,
      change: 2.25,
      changePercent: 1.2,
      updatedAt: "2026-01-10T16:00:00.000Z",
      source: "test"
    },
    fundamentals: {
      peRatio: 24,
      beta: 1.1,
      revenueGrowth: 12,
      netMargin: 20,
      debtToEquity: 0.8,
      source: "test"
    },
    technicals: {
      sma20: 185,
      sma50: 178,
      volatility30d: 22,
      maxDrawdown: 0.12,
      trend: "UP",
      volumeTrend: "RISING",
      source: "test"
    },
    news: [
      {
        headline: "Known before snapshot",
        source: "test",
        publishedAt: "2026-01-09T12:00:00.000Z",
        sentiment: "positive",
        sentimentScore: 0.4
      },
      {
        headline: "Future headline",
        source: "test",
        publishedAt: "2026-01-11T12:00:00.000Z",
        sentiment: "negative",
        sentimentScore: -0.9
      }
    ],
    analystTrend: {
      strongBuy: 2,
      buy: 4,
      hold: 3,
      sell: 1,
      strongSell: 0,
      consensus: "BUY",
      source: "test"
    },
    generatedAt: "2026-01-10T16:01:00.000Z",
    dataQuality: {
      score: 0.72,
      status: "PARTIAL",
      provider: "test",
      liveQuote: true,
      fundamentals: true,
      news: true,
      analystTrend: true,
      warnings: ["partial test data"],
      messages: ["partial test data"]
    }
  };
}
