import { describe, expect, jest, test } from "@jest/globals";
import { MarketService } from "../src/market/market.service";
import { mergeSourceAudits } from "../src/market/provider-registry";
import type { SourceAudit } from "../src/market/market.types";

function audit(category: keyof SourceAudit, provider: string, used: boolean, status: "LIVE" | "DEMO" | "PARTIAL" = used ? "LIVE" : "DEMO") {
  return mergeSourceAudits({
    quote: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    history: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    fundamentals: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    filings: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    macro: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    news: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    sentiment: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    analystTrend: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    crypto: { provider: "not-requested", status: "DEMO", used: false, warnings: [], missingReason: "not requested" },
    [category]: { provider, status, used, asOf: "2026-06-10T10:00:00.000Z", warnings: [] }
  });
}

describe("market service source audit", () => {
  test("context includes provider audit and optional evidence channels", async () => {
    const registry = {
      capabilities: [],
      search: jest.fn(),
      quote: jest.fn(async () => ({
        data: { ticker: "NVDA", price: 125, change: 1, changePercent: 0.8, updatedAt: "2026-06-10T10:00:00.000Z", source: "alpha-vantage" },
        audit: audit("quote", "alpha-vantage", true)
      })),
      fundamentals: jest.fn(async () => ({
        data: { peRatio: 32, revenueGrowth: 12, epsGrowth: 18, source: "sec-edgar" },
        audit: mergeSourceAudits(audit("fundamentals", "sec-edgar", true), audit("filings", "sec-edgar", true))
      })),
      news: jest.fn(async () => ({
        data: [],
        audit: audit("news", "finnhub", false)
      })),
      analystTrend: jest.fn(async () => ({
        data: null,
        audit: audit("analystTrend", "finnhub", false)
      })),
      history: jest.fn(async () => ({
        data: [
          { ticker: "NVDA", date: "2026-06-09", open: 120, high: 126, low: 119, close: 125, volume: 1000, source: "alpha-vantage" },
          { ticker: "NVDA", date: "2026-06-10", open: 125, high: 127, low: 124, close: 126, volume: 1200, source: "alpha-vantage" }
        ],
        audit: audit("history", "alpha-vantage", true)
      })),
      macroSeries: jest.fn(async () => ({
        data: [{ series: "FEDFUNDS", label: "Fed Funds", value: 5.25, date: "2026-05-01", source: "fred" }],
        audit: audit("macro", "fred", true)
      })),
      socialSentiment: jest.fn(async () => ({
        data: [],
        audit: audit("sentiment", "social-sentiment", false)
      })),
      cryptoContext: jest.fn(async () => ({
        data: null,
        audit: audit("crypto", "coingecko", false)
      }))
    };
    const service = new MarketService(registry as any, { subscribeQuotes: jest.fn() } as any);

    const context = await service.context("NVDA");

    expect(context.sourceAudit?.quote.provider).toBe("alpha-vantage");
    expect(context.sourceAudit?.fundamentals.provider).toBe("sec-edgar");
    expect(context.sourceAudit?.macro.provider).toBe("fred");
    expect(context.macroSeries?.[0].series).toBe("FEDFUNDS");
    expect(context.cryptoContext).toBeNull();
    expect(context.dataQuality.provider).toContain("sec-edgar");
  });
});
