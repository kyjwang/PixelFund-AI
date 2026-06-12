import { describe, beforeAll, afterAll, beforeEach, expect, jest, test } from "@jest/globals";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createIntegrationApp, resetDb, waitFor } from "./test-app";
import { PrismaService } from "../../src/common/prisma.service";
import {
  analysisRunSchema,
  analysisExplanationSchema,
  backtestResultSchema,
  marketContextSchema,
  portfolioSchema,
  providerCapabilitiesSchema,
  quoteSchema,
  orderSchema,
  orderPreviewSchema,
  stockHistorySchema,
  tradeSchema,
  cryptoTraderCheckResultSchema,
  cryptoTraderClearDataResultSchema,
  cryptoTraderLogSchema,
  cryptoTraderSettingsSchema,
  watchlistItemSchema
} from "@pixelfund/schemas";
import { CoinGeckoProvider } from "../../src/market/coingecko.provider";
import { YahooCryptoProvider } from "../../src/crypto-trader/yahoo-crypto.provider";

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
        "MACRO_ANALYST",
        "SENTIMENT_ANALYST",
        "QUANT_ANALYST",
        "CRYPTO_SPECIALIST",
        "NEUTRAL_RISK",
        "NEWS_ANALYST",
        "PORTFOLIO_MANAGER",
        "RISK_ANALYST",
        "TEAM_LEAD",
        "TECHNICAL_ANALYST",
        "TRADER_AGENT"
      ].sort()
    );
    expect(run.recommendations.find((r: any) => r.agentType === "TRADER_AGENT")?.summary).toBeTruthy();

    const explanation = await request(server).get(`/analysis-runs/${first.body.data.id}/explain`).expect(200);
    const parsedExplanation = analysisExplanationSchema.parse(explanation.body.data);
    expect(parsedExplanation.coverage.completed).toBeGreaterThan(0);
    expect(parsedExplanation.agents.find((agent) => agent.agentType === "PORTFOLIO_MANAGER")?.baseWeight).toBe(0);
  });

  test("scopes analysis history by demo account header", async () => {
    const accountA = "analysis-account-a";
    const accountB = "analysis-account-b";

    const runA = await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", accountA)
      .send({ ticker: "MSFT", idempotencyKey: "analysis-a-msft" })
      .expect(201);
    await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", accountB)
      .send({ ticker: "AAPL", idempotencyKey: "analysis-b-aapl" })
      .expect(201);

    const stored = await prisma.$queryRawUnsafe<Array<{ ownerKey: string }>>(
      `SELECT "ownerKey" FROM "AnalysisRun" WHERE id = $1`,
      runA.body.data.id
    );
    expect(stored[0]?.ownerKey).toBe(accountA);

    const listA = await request(server).get("/analysis-runs").set("x-demo-user-id", accountA).expect(200);
    const listB = await request(server).get("/analysis-runs").set("x-demo-user-id", accountB).expect(200);

    expect(listA.body.data.map((run: any) => run.ticker)).toEqual(["MSFT"]);
    expect(listB.body.data.map((run: any) => run.ticker)).toEqual(["AAPL"]);
  });

  test("clears only the current account analysis history", async () => {
    const accountA = "clear-analysis-a";
    const accountB = "clear-analysis-b";

    const runA = await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", accountA)
      .send({ ticker: "MSFT", idempotencyKey: "clear-a-msft" })
      .expect(201);
    await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", accountB)
      .send({ ticker: "AAPL", idempotencyKey: "clear-b-aapl" })
      .expect(201);
    await request(server).post("/watchlist").set("x-demo-user-id", accountA).send({ ticker: "NVDA" }).expect(201);
    await request(server).post("/trades").set("x-demo-user-id", accountA).send({ ticker: "MSFT", side: "BUY", quantity: 1 }).expect(201);

    const cleared = await request(server).delete("/analysis-runs").set("x-demo-user-id", accountA).expect(200);

    expect(cleared.body.data.deletedAnalysisRuns).toBe(1);
    expect(cleared.body.data.deletedAgentResults).toBeGreaterThan(0);

    const agentResults = await prisma.agentResult.findMany({ where: { analysisRunId: runA.body.data.id } });
    expect(agentResults).toEqual([]);

    const analysisA = await request(server).get("/analysis-runs").set("x-demo-user-id", accountA).expect(200);
    const analysisB = await request(server).get("/analysis-runs").set("x-demo-user-id", accountB).expect(200);
    const watchlistA = await request(server).get("/watchlist").set("x-demo-user-id", accountA).expect(200);
    const tradesA = await request(server).get("/trades").set("x-demo-user-id", accountA).expect(200);

    expect(analysisA.body.data).toEqual([]);
    expect(analysisB.body.data.map((run: any) => run.ticker)).toEqual(["AAPL"]);
    expect(watchlistA.body.data.map((item: any) => item.ticker)).toEqual(["NVDA"]);
    expect(tradesA.body.data.map((trade: any) => trade.ticker)).toEqual(["MSFT"]);
  });

  test("clears visible legacy demo analysis rows from history clear requests", async () => {
    const accountA = "clear-visible-legacy-a";
    const runA = await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", accountA)
      .send({ ticker: "MSFT", idempotencyKey: "visible-a-msft" })
      .expect(201);
    const legacyRun = await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", "demo")
      .send({ ticker: "NVDA", idempotencyKey: "visible-legacy-nvda" })
      .expect(201);
    const otherRun = await request(server)
      .post("/analysis-runs")
      .set("x-demo-user-id", "other-visible-owner")
      .send({ ticker: "AAPL", idempotencyKey: "visible-other-aapl" })
      .expect(201);

    const cleared = await request(server)
      .delete("/analysis-runs")
      .set("x-demo-user-id", accountA)
      .send({ analysisRunIds: [legacyRun.body.data.id, otherRun.body.data.id] })
      .expect(200);

    expect(cleared.body.data.deletedAnalysisRuns).toBe(2);
    expect(await prisma.analysisRun.findUnique({ where: { id: runA.body.data.id } })).toBeNull();
    expect(await prisma.analysisRun.findUnique({ where: { id: legacyRun.body.data.id } })).toBeNull();
    expect(await prisma.analysisRun.findUnique({ where: { id: otherRun.body.data.id } })).toBeTruthy();
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

  test("trade preview returns sizing and trigger status", async () => {
    const res = await request(server)
      .post("/trades/preview")
      .send({ ticker: "AAPL", side: "BUY", quantity: 1, orderType: "LIMIT", limitPrice: 999 })
      .expect(201);

    expect(res.body.data.executableNow).toBe(true);
    expect(res.body.data.sizingHint.maxAffordableShares).toBeGreaterThan(0);
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

  test("order preview fails closed when market data is not tradable", async () => {
    const res = await request(server)
      .post("/orders/preview")
      .send({ ticker: "AAPL", side: "BUY", quantity: 1, orderType: "MARKET" })
      .expect(201);
    const parsed = orderPreviewSchema.parse(res.body.data);
    expect(parsed.tradable).toBe(false);
    expect(parsed.blockingReasons.length).toBeGreaterThan(0);
  });

  test("order creation rejects demo or stale market data", async () => {
    const res = await request(server)
      .post("/orders")
      .send({ ticker: "AAPL", side: "BUY", quantity: 1, orderType: "MARKET" })
      .expect(400);
    expect(res.body.error.code).toBe("MARKET_DATA_NOT_TRADABLE");
  });

  test("order listing and cancel are account scoped", async () => {
    const accountA = await prisma.demoAccount.create({ data: { ownerKey: "orders-a", cash: 100000 } });
    const accountB = await prisma.demoAccount.create({ data: { ownerKey: "orders-b", cash: 100000 } });
    const orderA = await prisma.order.create({
      data: { accountId: accountA.id, ticker: "MSFT", side: "BUY", quantity: 1, orderType: "LIMIT", limitPrice: 1, status: "PENDING" }
    });
    await prisma.order.create({
      data: { accountId: accountB.id, ticker: "AAPL", side: "BUY", quantity: 1, orderType: "LIMIT", limitPrice: 1, status: "PENDING" }
    });

    const listA = await request(server).get("/orders").set("x-demo-user-id", "orders-a").expect(200);
    const parsedA = orderSchema.array().parse(listA.body.data);
    expect(parsedA.map((order) => order.ticker)).toEqual(["MSFT"]);

    const canceled = await request(server).post(`/orders/${orderA.id}/cancel`).set("x-demo-user-id", "orders-a").expect(201);
    expect(orderSchema.parse(canceled.body.data).status).toBe("CANCELED");

    await request(server).post(`/orders/${orderA.id}/cancel`).set("x-demo-user-id", "orders-b").expect(404);
  });

  test("crypto trader settings, cash adjustment, and logs are account scoped", async () => {
    const accountA = "crypto-settings-a";
    const accountB = "crypto-settings-b";

    const settings = await request(server)
      .put("/crypto-trader/settings")
      .set("x-demo-user-id", accountA)
      .send({ enabled: true, selectedCoins: ["BTC", "ETH"], maxTradesPerDay: 6, stopLossPercent: 5, maxPortfolioPercent: 18 })
      .expect(200);
    const parsedSettings = cryptoTraderSettingsSchema.parse(settings.body.data);
    expect(parsedSettings.selectedCoins).toEqual(["BTC", "ETH"]);
    expect(parsedSettings.enabled).toBe(true);

    const cashAdded = await request(server)
      .post("/crypto-trader/cash-adjustment")
      .set("x-demo-user-id", accountA)
      .send({ amount: 10000 })
      .expect(201);
    expect(portfolioSchema.parse(cashAdded.body.data).cash).toBe(110000);

    await prisma.demoAccount.create({ data: { ownerKey: accountB, cash: 5000 } });
    await request(server)
      .post("/crypto-trader/cash-adjustment")
      .set("x-demo-user-id", accountB)
      .send({ amount: -10000 })
      .expect(400);

    await prisma.cryptoTraderLog.create({
      data: {
        ownerKey: accountA,
        swedenDay: "2026-06-12",
        ticker: "BTC",
        coinId: "bitcoin",
        action: "HOLD",
        score: 12,
        reason: "HOLD because signal was weak.",
        reasons: ["Momentum was not strong enough."]
      }
    });

    const logsA = await request(server).get("/crypto-trader/logs").set("x-demo-user-id", accountA).expect(200);
    const logsB = await request(server).get("/crypto-trader/logs").set("x-demo-user-id", accountB).expect(200);
    expect(cryptoTraderLogSchema.array().parse(logsA.body.data).map((log) => log.ticker)).toEqual(["BTC"]);
    expect(logsB.body.data).toEqual([]);
  });

  test("crypto trader check saves BUY and HOLD decisions with mocked CoinGecko data", async () => {
    const risingCandles = Array.from({ length: 24 }, (_, index) => {
      const price = 100 + index * 2;
      return {
        ticker: "BTC",
        date: new Date(Date.UTC(2026, 5, 12, index)).toISOString(),
        open: price - 1,
        high: price + 2,
        low: price - 2,
        close: price,
        volume: 0,
        source: "coingecko"
      };
    });
    const historySpy = jest.spyOn(CoinGeckoProvider.prototype, "cryptoHistory").mockResolvedValue(risingCandles);
    const contextSpy = jest.spyOn(CoinGeckoProvider.prototype, "cryptoContext").mockImplementation(async (ticker: string) => ({
      asset: ticker.toUpperCase() === "ETH" ? "ethereum" : "bitcoin",
      priceUsd: 150,
      change24hPercent: 2,
      source: "coingecko",
      updatedAt: "2026-06-12T12:00:00.000Z"
    }));

    try {
      const owner = "crypto-check-a";
      await request(server)
        .put("/crypto-trader/settings")
        .set("x-demo-user-id", owner)
        .send({ enabled: true, selectedCoins: ["BTC", "ETH"], maxTradesPerDay: 1, stopLossPercent: 4, maxPortfolioPercent: 20 })
        .expect(200);

      const checked = await request(server).post("/crypto-trader/check-now").set("x-demo-user-id", owner).expect(201);
      const parsed = cryptoTraderCheckResultSchema.parse(checked.body.data);

      expect(parsed.logs).toHaveLength(2);
      expect(parsed.logs.map((log) => log.action)).toEqual(["BUY", "HOLD"]);
      expect(parsed.logs[0].tradeId).toBeTruthy();
      expect(parsed.logs[1].reason).toContain("Daily trade limit");

      const portfolio = portfolioSchema.parse((await request(server).get("/portfolio").set("x-demo-user-id", owner).expect(200)).body.data);
      expect(portfolio.positions.find((position) => position.ticker === "BTC")?.quantity).toBeGreaterThan(0);
    } finally {
      historySpy.mockRestore();
      contextSpy.mockRestore();
    }
  });

  test("crypto trader check uses Yahoo/yfinance fallback when CoinGecko data is unavailable", async () => {
    const risingCandles = Array.from({ length: 24 }, (_, index) => {
      const price = 100 + index * 2;
      return {
        timestamp: new Date(Date.UTC(2026, 5, 12, index)).toISOString(),
        open: price - 1,
        high: price + 2,
        low: price - 2,
        close: price,
        volume: 0
      };
    });
    const historySpy = jest.spyOn(CoinGeckoProvider.prototype, "cryptoHistory").mockResolvedValue(null);
    const contextSpy = jest.spyOn(CoinGeckoProvider.prototype, "cryptoContext").mockResolvedValue(null);
    const yahooSpy = jest.spyOn(YahooCryptoProvider.prototype, "cryptoMarketData").mockImplementation(async (symbol) => ({
      symbol,
      price: 150,
      candles: risingCandles,
      source: "Yahoo/yfinance research fallback",
      asOf: "2026-06-12T12:00:00.000Z",
      warnings: [],
      isFallback: true
    }));

    try {
      const owner = "crypto-yahoo-fallback-a";
      await request(server)
        .put("/crypto-trader/settings")
        .set("x-demo-user-id", owner)
        .send({ enabled: true, selectedCoins: ["BTC"], maxTradesPerDay: 4, stopLossPercent: 4, maxPortfolioPercent: 20 })
        .expect(200);

      const checked = await request(server).post("/crypto-trader/check-now").set("x-demo-user-id", owner).expect(201);
      const parsed = cryptoTraderCheckResultSchema.parse(checked.body.data);

      expect(parsed.logs).toHaveLength(1);
      expect(parsed.logs[0].action).toBe("BUY");
      expect(parsed.logs[0].reason).toContain("CoinGecko unavailable; used Yahoo/yfinance fallback data.");
      expect(parsed.logs[0].reasons.join(" ")).toContain("Data source: Yahoo/yfinance research fallback");
      expect(parsed.logs[0].tradeId).toBeTruthy();
    } finally {
      historySpy.mockRestore();
      contextSpy.mockRestore();
      yahooSpy.mockRestore();
    }
  });

  test("crypto trader data clear removes only the current demo account data", async () => {
    const owner = "crypto-clear-a";
    const otherOwner = "crypto-clear-b";
    const ownerAccount = await prisma.demoAccount.create({ data: { ownerKey: owner, cash: 90000, realizedPnl: 123 } });
    const otherAccount = await prisma.demoAccount.create({ data: { ownerKey: otherOwner, cash: 70000 } });
    const run = await prisma.analysisRun.create({ data: { ownerKey: owner, ticker: "BTC", status: "COMPLETED" } });

    await prisma.agentResult.create({ data: { analysisRunId: run.id, agentType: "PORTFOLIO_MANAGER", status: "COMPLETED", summary: "Done" } });
    await prisma.cryptoTraderSettings.create({ data: { ownerKey: owner, enabled: true, selectedCoins: ["BTC"] } });
    await prisma.cryptoTraderLog.create({
      data: {
        ownerKey: owner,
        swedenDay: "2026-06-12",
        ticker: "BTC",
        coinId: "bitcoin",
        action: "HOLD",
        score: 0,
        reason: "HOLD",
        reasons: ["No signal"]
      }
    });
    await prisma.watchlistItem.create({ data: { ownerKey: owner, ticker: "NVDA" } });
    await prisma.position.create({ data: { accountId: ownerAccount.id, ticker: "BTC", quantity: 0.1, averageCost: 100000 } });
    await prisma.order.create({ data: { accountId: ownerAccount.id, ticker: "BTC", side: "BUY", quantity: 0.1, status: "FILLED" } });
    await prisma.trade.create({ data: { accountId: ownerAccount.id, ticker: "BTC", side: "BUY", quantity: 0.1, price: 100000 } });
    await prisma.cryptoTraderLog.create({
      data: {
        ownerKey: otherOwner,
        swedenDay: "2026-06-12",
        ticker: "ETH",
        coinId: "ethereum",
        action: "HOLD",
        score: 0,
        reason: "Other HOLD",
        reasons: ["Other owner"]
      }
    });

    const cleared = await request(server).delete("/crypto-trader/demo-data").set("x-demo-user-id", owner).expect(200);
    const parsed = cryptoTraderClearDataResultSchema.parse(cleared.body.data);

    expect(parsed.deletedAnalysisRuns).toBe(1);
    expect(parsed.deletedAgentResults).toBe(1);
    expect(parsed.deletedCryptoLogs).toBe(1);
    expect(parsed.deletedCryptoSettings).toBe(1);
    expect(parsed.deletedTrades).toBe(1);
    expect(parsed.deletedOrders).toBe(1);
    expect(parsed.deletedPositions).toBe(1);
    expect(parsed.deletedWatchlistItems).toBe(1);
    expect(parsed.deletedAccounts).toBe(1);
    expect(await prisma.demoAccount.findUnique({ where: { id: ownerAccount.id } })).toBeNull();
    expect(await prisma.demoAccount.findUnique({ where: { id: otherAccount.id } })).toBeTruthy();
    expect(await prisma.cryptoTraderLog.count({ where: { ownerKey: otherOwner } })).toBe(1);
  });

  test("isolates watchlists by demo account header", async () => {
    const accountA = "account-a";
    const accountB = "account-b";

    await request(server).post("/watchlist").set("x-demo-user-id", accountA).send({ ticker: "MSFT" }).expect(201);
    await request(server).post("/watchlist").set("x-demo-user-id", accountA).send({ ticker: "MSFT" }).expect(201);
    await request(server).post("/watchlist").set("x-demo-user-id", accountB).send({ ticker: "MSFT" }).expect(201);
    await request(server).post("/watchlist").set("x-demo-user-id", accountB).send({ ticker: "AAPL" }).expect(201);

    const listA = await request(server).get("/watchlist").set("x-demo-user-id", accountA).expect(200);
    const listB = await request(server).get("/watchlist").set("x-demo-user-id", accountB).expect(200);
    const parsedA = watchlistItemSchema.array().parse(listA.body.data);
    const parsedB = watchlistItemSchema.array().parse(listB.body.data);

    expect(parsedA.map((item) => item.ticker)).toEqual(["MSFT"]);
    expect(parsedB.map((item) => item.ticker).sort()).toEqual(["AAPL", "MSFT"]);

    await request(server).delete("/watchlist/MSFT").set("x-demo-user-id", accountA).expect(200);
    const afterDeleteA = await request(server).get("/watchlist").set("x-demo-user-id", accountA).expect(200);
    const afterDeleteB = await request(server).get("/watchlist").set("x-demo-user-id", accountB).expect(200);

    expect(afterDeleteA.body.data).toEqual([]);
    expect(afterDeleteB.body.data.map((item: any) => item.ticker).sort()).toEqual(["AAPL", "MSFT"]);
  });

  test("isolates portfolios and trade history by demo account header", async () => {
    const accountA = "trade-account-a";
    const accountB = "trade-account-b";

    await request(server).post("/trades").set("x-demo-user-id", accountA).send({ ticker: "MSFT", side: "BUY", quantity: 1 }).expect(201);
    await request(server).post("/trades").set("x-demo-user-id", accountB).send({ ticker: "AAPL", side: "BUY", quantity: 1 }).expect(201);

    const portfolioA = await request(server).get("/portfolio").set("x-demo-user-id", accountA).expect(200);
    const portfolioB = await request(server).get("/portfolio").set("x-demo-user-id", accountB).expect(200);
    const parsedPortfolioA = portfolioSchema.parse(portfolioA.body.data);
    const parsedPortfolioB = portfolioSchema.parse(portfolioB.body.data);

    expect(parsedPortfolioA.positions.map((position) => position.ticker)).toEqual(["MSFT"]);
    expect(parsedPortfolioB.positions.map((position) => position.ticker)).toEqual(["AAPL"]);

    const tradesA = await request(server).get("/trades").set("x-demo-user-id", accountA).expect(200);
    const tradesB = await request(server).get("/trades").set("x-demo-user-id", accountB).expect(200);
    const parsedTradesA = tradeSchema.array().parse(tradesA.body.data);
    const parsedTradesB = tradeSchema.array().parse(tradesB.body.data);

    expect(parsedTradesA.map((trade) => trade.ticker)).toEqual(["MSFT"]);
    expect(parsedTradesB.map((trade) => trade.ticker)).toEqual(["AAPL"]);
  });
});
