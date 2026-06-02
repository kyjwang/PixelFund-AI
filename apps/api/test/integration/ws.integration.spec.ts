import { describe, beforeAll, afterAll, beforeEach, expect, test } from "@jest/globals";
import { io, Socket } from "socket.io-client";
import request from "supertest";
import { INestApplication } from "@nestjs/common";
import {
  wsQuoteUpdatedSchema,
  wsQuoteStaleSchema,
  wsAgentStartedSchema,
  wsAgentCompletedSchema,
  wsAgentFailedSchema,
  wsPortfolioRecommendationCompletedSchema,
  wsPortfolioRecommendationFailedSchema,
  portfolioSchema
} from "@pixelfund/schemas";
import { createIntegrationApp, resetDb, waitFor } from "./test-app";
import { PrismaService } from "../../src/common/prisma.service";

describe("websocket integration", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl = "";
  let server: any;
  let socket: Socket;

  beforeAll(async () => {
    process.env.QUOTE_STALE_MS = "200";
    process.env.QUOTE_POLL_MS = "5000";
    const created = await createIntegrationApp();
    app = created.app;
    prisma = created.prisma;
    baseUrl = created.baseUrl;
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDb(prisma);
    socket = io(baseUrl, { transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      socket.on("connect", () => resolve());
      socket.on("connect_error", reject);
      setTimeout(() => reject(new Error("socket connect timeout")), 8000);
    });
  });

  afterAll(async () => {
    socket?.disconnect();
    if (app) await app.close();
  });

  test("emits quote.updated after subscription", async () => {
    const quotePromise = new Promise<any>((resolve, reject) => {
      socket.once("quote.updated", resolve);
      setTimeout(() => reject(new Error("quote.updated timeout")), 15000);
    });

    socket.emit("quote.subscribe", { ticker: "AAPL" });
    const quote = await quotePromise;
    expect(() => wsQuoteUpdatedSchema.parse(quote)).not.toThrow();
  });

  test("emits analysis lifecycle and portfolio recommendation events", async () => {
    const seen: string[] = [];
    const idemKey = `ws-${Date.now()}`;

    const donePromise = new Promise<void>((resolve, reject) => {
      socket.on("analysis.agent.started", (payload) => {
        wsAgentStartedSchema.parse(payload);
        seen.push("analysis.agent.started");
      });

      socket.on("analysis.agent.completed", (payload) => {
        wsAgentCompletedSchema.parse(payload);
        seen.push("analysis.agent.completed");
      });

      socket.on("analysis.agent.failed", (payload) => {
        wsAgentFailedSchema.parse(payload);
        seen.push("analysis.agent.failed");
      });

      socket.on("analysis.portfolioRecommendation.completed", (payload) => {
        wsPortfolioRecommendationCompletedSchema.parse(payload);
        seen.push("analysis.portfolioRecommendation.completed");
        resolve();
      });

      socket.on("analysis.portfolioRecommendation.failed", (payload) => {
        wsPortfolioRecommendationFailedSchema.parse(payload);
        seen.push("analysis.portfolioRecommendation.failed");
        resolve();
      });

      setTimeout(() => reject(new Error("analysis events timeout")), 45000);
    });

    await request(server)
      .post("/analysis-runs")
      .send({ ticker: "NVDA", idempotencyKey: idemKey })
      .expect(201);

    await donePromise.catch(async () => {
      await waitFor(
        async () => request(server).get("/analysis-runs").expect(200),
        (resp) => {
          const run = resp.body.data.find((item: any) => item.idempotencyKey === idemKey);
          return Boolean(run && ["COMPLETED", "FAILED"].includes(run.status));
        },
        30000
      );
    });
    expect(seen.includes("analysis.agent.started")).toBe(true);
    expect(seen.length).toBeGreaterThan(0);
  });

  test("emits portfolio.updated after trade", async () => {
    const portfolioUpdated = new Promise<any>((resolve, reject) => {
      socket.once("portfolio.updated", resolve);
      setTimeout(() => reject(new Error("portfolio.updated timeout")), 10000);
    });

    await request(server).post("/trades").send({ ticker: "TSLA", side: "BUY", quantity: 1 }).expect(201);
    const payload = await portfolioUpdated;
    expect(() => portfolioSchema.parse(payload)).not.toThrow();
  });

  test("emits quote.stale after stale threshold", async () => {
    const stalePromise = new Promise<any>((resolve, reject) => {
      socket.once("quote.stale", resolve);
      setTimeout(() => reject(new Error("quote.stale timeout")), 12000);
    });

    socket.emit("quote.subscribe", { ticker: "AAPL" });
    const stalePayload = await stalePromise;
    expect(() => wsQuoteStaleSchema.parse(stalePayload)).not.toThrow();
  });
});
