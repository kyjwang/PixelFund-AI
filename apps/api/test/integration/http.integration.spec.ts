import { describe, beforeAll, afterAll, beforeEach, expect, test } from "@jest/globals";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createIntegrationApp, resetDb, waitFor } from "./test-app";
import { PrismaService } from "../../src/common/prisma.service";
import {
  analysisRunSchema,
  backtestResultSchema,
  marketContextSchema,
  portfolioSchema,
  providerCapabilitiesSchema,
  quoteSchema,
  stockHistorySchema,
  tradeSchema
} from "@pixelfund/schemas";

describe("http integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: any;

  beforeAll(async () => {
    const created = await createIntegrationApp();
    app = created.app;
    prisma = created.prisma;
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test("returns envelope and portfolio payload", async () => {
    const res = await request(server).get("/portfolio").expect(200);
    expect(res.body.data).toBeDefined();
    expect(() => portfolioSchema.parse(res.body.data)).not.toThrow();
  });

  test("maps insufficient funds error envelope", async () => {
    const res = await request(server)
      .post("/trades")
      .send({ ticker: "AAPL", side: "BUY", quantity: 1000000 })
      .expect(400);

    expect(res.body.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(res.body.error.requestId).toBeDefined();
  });

  test("creates idempotent analysis run and reaches final state", async () => {
    const idemKey = "idem-aapl-1";
    const first = await request(server)
      .post("/analysis-runs")
      .send({ ticker: "AAPL", idempotencyKey: idemKey })
      .expect(201);

    const second = await request(server)
      .post("/analysis-runs")
      .send({ ticker: "AAPL", idempotencyKey: idemKey })
      .expect(201);

    expect(second.body.data.id).toBe(first.body.data.id);

    const finished = await waitFor(
      async () => request(server).get("/analysis-runs").expect(200),
      (resp) => {
        const runs = resp.body.data as Array<{ id: string; status: string; finalRec: string | null }>;
        const run = runs.find((r) => r.id === first.body.data.id);
        return !!run && run.status === "COMPLETED";
      }
    );

    const run = finished.body.data.find((r: any) => r.id === first.body.data.id);
    expect(() => analysisRunSchema.parse(run)).not.toThrow();
    expect(run.recommendations.map((r: any) => r.agentType).sort()).toEqual(
      [
        "AGGRESSIVE_RISK",
        "BEAR_RESEARCHER",
        "BULL_RESEARCHER",
        "CONSERVATIVE_RISK",
        "FUNDAMENTALS_ANALYST",
        "NEUTRAL_RISK",
        "NEWS_ANALYST",
        "PORTFOLIO_MANAGER",
        "RISK_ANALYST",
        "TECHNICAL_ANALYST",
        "TRADER_AGENT"
      ].sort()
    );
    expect(run.recommendations.find((r: any) => r.agentType === "TRADER_AGENT")?.summary).toBeTruthy();
  });

  test("trade updates portfolio accounting", async () => {
    await request(server).post("/trades").send({ ticker: "MSFT", side: "BUY", quantity: 2 }).expect(201);
    const afterBuy = await request(server).get("/portfolio").expect(200);
    const parsed = portfolioSchema.parse(afterBuy.body.data);
    expect(parsed.positions.find((p) => p.ticker === "MSFT")?.quantity).toBe(2);

    await request(server).post("/trades").send({ ticker: "MSFT", side: "SELL", quantity: 1 }).expect(201);
    const afterSell = await request(server).get("/portfolio").expect(200);
    const parsedSell = portfolioSchema.parse(afterSell.body.data);
    expect(parsedSell.positions.find((p) => p.ticker === "MSFT")?.quantity).toBe(1);
  });

  test("quote endpoint returns schema-valid payload envelope", async () => {
    const res = await request(server).get("/stocks/AAPL/quote").expect(200);
    expect(() => quoteSchema.parse(res.body.data)).not.toThrow();
  });

  test("market context endpoint returns evidence and data-quality payload", async () => {
    const res = await request(server).get("/stocks/AAPL/context").expect(200);
    const parsed = marketContextSchema.parse(res.body.data);
    expect(parsed.ticker).toBe("AAPL");
    expect(parsed.dataQuality.score).toBeGreaterThan(0);
    expect(parsed.dataQuality.status).toBeDefined();
  });

  test("history endpoint returns candles and technicals", async () => {
    const res = await request(server).get("/stocks/AAPL/history?range=1y").expect(200);
    const parsed = stockHistorySchema.parse(res.body.data);
    expect(parsed.candles.length).toBeGreaterThan(0);
    expect(parsed.technicals.trend).toBeDefined();
  });

  test("provider capabilities endpoint returns registry metadata", async () => {
    const res = await request(server).get("/market/providers/capabilities").expect(200);
    const parsed = providerCapabilitiesSchema.parse(res.body.data);
    expect(parsed.providers[0].name).toBe("finnhub");
  });

  test("backtest endpoint returns deterministic metrics", async () => {
    const res = await request(server)
      .post("/backtests")
      .send({
        ticker: "AAPL",
        from: "2025-06-01",
        to: "2026-06-01",
        strategy: "PORTFOLIO_MANAGER_REPLAY"
      })
      .expect(201);
    const parsed = backtestResultSchema.parse(res.body.data);
    expect(parsed.ticker).toBe("AAPL");
    expect(parsed.trades).toBeGreaterThanOrEqual(0);
  });

  test("trade history endpoint returns recent trades", async () => {
    await request(server).post("/trades").send({ ticker: "MSFT", side: "BUY", quantity: 1 }).expect(201);
    const res = await request(server).get("/trades").expect(200);
    expect(() => tradeSchema.array().parse(res.body.data)).not.toThrow();
    expect(res.body.data[0].ticker).toBe("MSFT");
  });
});
