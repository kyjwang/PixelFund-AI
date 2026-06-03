import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { AgentStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { aggregatePortfolioManager } from "@pixelfund/domain";
import { PrismaService } from "../common/prisma.service";
import { EventsGateway } from "../ws/events.gateway";

const specialists = [
  "TECHNICAL_ANALYST",
  "NEWS_ANALYST",
  "FUNDAMENTALS_ANALYST",
  "RISK_ANALYST",
  "MACRO_ANALYST",
  "SENTIMENT_ANALYST",
  "QUANT_ANALYST",
  "CRYPTO_SPECIALIST"
] as const;

const debateAgents = ["BULL_RESEARCHER", "BEAR_RESEARCHER"] as const;
const riskCouncil = ["AGGRESSIVE_RISK", "NEUTRAL_RISK", "CONSERVATIVE_RISK"] as const;
const pipelineAgents = [...specialists, ...debateAgents, "TRADER_AGENT", ...riskCouncil, "TEAM_LEAD"] as const;

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    @InjectQueue("analysis") private readonly queue: Queue
  ) {}

  async createRun(ticker: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.prisma.analysisRun.findFirst({
        where: { idempotencyKey, ticker },
        include: { recommendations: true },
        orderBy: { createdAt: "desc" }
      });
      if (existing) return existing;
    }

    const freshnessWindowMs = 60_000;
    const recent = await this.prisma.analysisRun.findFirst({
      where: { ticker, createdAt: { gte: new Date(Date.now() - freshnessWindowMs) } },
      include: { recommendations: true },
      orderBy: { createdAt: "desc" }
    });
    if (recent) return recent;

    const run = await this.prisma.analysisRun.create({
      data: {
        ticker,
        idempotencyKey,
        status: "PENDING",
        recommendations: {
          create: [
            ...pipelineAgents.map((agentType) => ({ agentType, status: "PENDING" as AgentStatus })),
            { agentType: "PORTFOLIO_MANAGER", status: "PENDING" as AgentStatus }
          ]
        }
      },
      include: { recommendations: true }
    });

    await this.queue.add(
      "run-analysis",
      { analysisRunId: run.id, ticker },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 2000 }
      }
    );

    return run;
  }

  async finalizeManager(analysisRunId: string) {
    const recs = await this.prisma.agentResult.findMany({ where: { analysisRunId } });
    const specialist = recs.filter((r) => r.agentType !== "PORTFOLIO_MANAGER");
    const managerOutput = aggregatePortfolioManager(specialist);

    const manager = await this.prisma.agentResult.update({
      where: { analysisRunId_agentType: { analysisRunId, agentType: "PORTFOLIO_MANAGER" } },
      data: {
        status: "COMPLETED",
        recommendation: managerOutput.recommendation,
        confidence: managerOutput.confidence,
        summary: managerOutput.summary,
        reasons: managerOutput.reasons as any,
        errorReason: null
      }
    });

    await this.prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: {
        status: "COMPLETED",
        errorReason: null,
        finalRec: managerOutput.recommendation,
        finalSummary: managerOutput.summary
      }
    });

    this.events.emit("analysis.portfolioRecommendation.completed", manager);
    return manager;
  }

  async markRunFailed(analysisRunId: string, errorReason: string) {
    await this.prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: {
        status: "FAILED",
        errorReason
      }
    });

    this.events.emit("analysis.portfolioRecommendation.failed", {
      analysisRunId,
      status: "FAILED",
      errorReason
    });
  }

  async listRuns() {
    return this.prisma.analysisRun.findMany({
      orderBy: { createdAt: "desc" },
      include: { recommendations: true },
      take: 20
    });
  }
}
