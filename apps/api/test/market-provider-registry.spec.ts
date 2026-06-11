import { describe, expect, test } from "@jest/globals";
import { marketContextSchema } from "@pixelfund/schemas";
import { MarketProviderRegistry } from "../src/market/provider-registry";
import type { Fundamentals, Quote } from "../src/market/market.types";

const staleQuote: Quote = {
  ticker: "NVDA",
  price: 0,
  change: 0,
  changePercent: 0,
  updatedAt: "2026-06-10T10:00:00.000Z",
  source: "demo-fallback"
};

const liveQuote: Quote = {
  ticker: "NVDA",
  price: 125,
  change: 1,
  changePercent: 0.8,
  updatedAt: "2026-06-10T10:01:00.000Z",
  source: "alpha-vantage"
};

const secFundamentals: Fundamentals = {
  peRatio: 32,
  revenueGrowth: 12,
  epsGrowth: 18,
  source: "sec-edgar"
};

describe("market provider registry", () => {
  test("falls back from an unusable primary quote provider to Alpha Vantage", async () => {
    const registry = new MarketProviderRegistry([
      {
        capabilities: { name: "finnhub", minPollMs: 5000, supportsBatch: false },
        getQuote: async () => staleQuote
      },
      {
        capabilities: { name: "alpha-vantage", minPollMs: 12000, supportsBatch: false },
        getQuote: async () => liveQuote
      }
    ]);

    const result = await registry.quote("NVDA");

    expect(result.data).toEqual(liveQuote);
    expect(result.audit.quote).toEqual(
      expect.objectContaining({
        provider: "alpha-vantage",
        status: "LIVE",
        used: true,
        asOf: liveQuote.updatedAt
      })
    );
    expect(result.audit.quote.warnings.join(" ")).toContain("finnhub");
  });

  test("prefers SEC EDGAR fundamentals before vendor fundamentals", async () => {
    const registry = new MarketProviderRegistry([
      {
        capabilities: { name: "sec-edgar", minPollMs: 1000, supportsBatch: false },
        fundamentals: async () => secFundamentals
      },
      {
        capabilities: { name: "finnhub", minPollMs: 5000, supportsBatch: false },
        fundamentals: async () => ({ peRatio: 50, source: "finnhub" })
      }
    ]);

    const result = await registry.fundamentals("NVDA");

    expect(result.data).toEqual(secFundamentals);
    expect(result.audit.fundamentals.provider).toBe("sec-edgar");
    expect(result.audit.filings.provider).toBe("sec-edgar");
    expect(result.audit.filings.status).toBe("LIVE");
  });

  test("records missing FRED macro data without crashing", async () => {
    const registry = new MarketProviderRegistry([
      {
        capabilities: { name: "fred", minPollMs: 60000, supportsBatch: false },
        macroSeries: async () => null
      }
    ]);

    const result = await registry.macroSeries("NVDA");

    expect(result.data).toEqual([]);
    expect(result.audit.macro).toEqual(
      expect.objectContaining({
        provider: "fred",
        status: "DEMO",
        used: false,
        missingReason: expect.stringContaining("unavailable")
      })
    );
  });
});

describe("market context source audit schema", () => {
  test("accepts source-level audit records without changing existing fields", () => {
    const parsed = marketContextSchema.parse({
      ticker: "NVDA",
      quote: liveQuote,
      fundamentals: secFundamentals,
      technicals: {
        sma20: 120,
        sma50: 115,
        volatility30d: 24,
        maxDrawdown: 12,
        trend: "UP",
        volumeTrend: "RISING",
        source: "alpha-vantage"
      },
      news: [],
      analystTrend: null,
      generatedAt: "2026-06-10T10:02:00.000Z",
      dataQuality: {
        score: 0.82,
        status: "PARTIAL",
        provider: "alpha-vantage+sec-edgar",
        liveQuote: true,
        fundamentals: true,
        news: false,
        analystTrend: false,
        warnings: ["News unavailable."],
        messages: ["NVDA is using partial live data."]
      },
      sourceAudit: {
        quote: { provider: "alpha-vantage", status: "LIVE", used: true, asOf: liveQuote.updatedAt, warnings: [] },
        history: { provider: "alpha-vantage", status: "LIVE", used: true, asOf: "2026-06-10", warnings: [] },
        fundamentals: { provider: "sec-edgar", status: "LIVE", used: true, asOf: "2026-06-10", warnings: [] },
        filings: { provider: "sec-edgar", status: "LIVE", used: true, asOf: "2026-06-10", warnings: [] },
        macro: { provider: "fred", status: "DEMO", used: false, warnings: [], missingReason: "FRED key unavailable." },
        news: { provider: "finnhub", status: "DEMO", used: false, warnings: [], missingReason: "No live news." },
        sentiment: { provider: "news-derived", status: "DEMO", used: false, warnings: [], missingReason: "No social sentiment configured." },
        analystTrend: { provider: "finnhub", status: "DEMO", used: false, warnings: [], missingReason: "No analyst trend." },
        crypto: { provider: "coingecko", status: "DEMO", used: false, warnings: [], missingReason: "Not a crypto asset." }
      }
    });

    expect(parsed.sourceAudit?.quote.provider).toBe("alpha-vantage");
    expect(parsed.dataQuality.provider).toBe("alpha-vantage+sec-edgar");
  });
});
