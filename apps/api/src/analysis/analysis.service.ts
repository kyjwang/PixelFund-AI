import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { AgentStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { ANALYSIS_PIPELINE, aggregatePortfolioManager, buildAnalysisExplanation } from "@pixelfund/domain";
import { PrismaService } from "../common/prisma.service";
import { EventsGateway } from "../ws/events.gateway";

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    @InjectQueue("analysis") private readonly queue: Queue
  ) {}

  private accountKey(ownerKey?: string) {
    return (ownerKey ?? "demo").trim().slice(0, 64) || "demo";
  }

  async createRun(ticker: string, idempotencyKey?: string, ownerKey?: string) {
    const key = this.accountKey(ownerKey);
    if (idempotencyKey) {
      const existing = await this.prisma.analysisRun.findFirst({
        where: { idempotencyKey, ticker, ownerKey: key },
        include: { recommendations: true },
        orderBy: { createdAt: "desc" }
      });
      if (existing) {
        await this.ensureRunQueued(existing);
        return existing;
      }
    }

    const freshnessWindowMs = 60_000;
    const recent = await this.prisma.analysisRun.findFirst({
      where: { ticker, ownerKey: key, createdAt: { gte: new Date(Date.now() - freshnessWindowMs) } },
      include: { recommendations: true },
      orderBy: { createdAt: "desc" }
    });
    if (recent && recent.status !== "FAILED") {
      await this.ensureRunQueued(recent);
      return recent;
    }

    const run = await this.prisma.analysisRun.create({
      data: {
        ownerKey: key,
        ticker,
        idempotencyKey,
        status: "PENDING",
        recommendations: {
          create: [
            ...ANALYSIS_PIPELINE.map((agentType) => ({ agentType, status: "PENDING" as AgentStatus })),
            { agentType: "PORTFOLIO_MANAGER", status: "PENDING" as AgentStatus }
          ]
        }
      },
      include: { recommendations: true }
    });

    await this.ensureRunQueued(run);

    return run;
  }

  private async ensureRunQueued(run: { id: string; ticker: string; status?: string }) {
    if (run.status === "COMPLETED" || run.status === "FAILED") return;

    try {
      const existingJob = await this.queue.getJob(run.id);
      if (existingJob) return;

      await this.queue.add(
        "run-analysis",
        { analysisRunId: run.id, ticker: run.ticker },
        {
          jobId: run.id,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 24 * 3600, count: 2000 }
        }
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown queue error";
      await this.prisma.analysisRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorReason: `Analysis queue unavailable: ${reason}`
        }
      });
      throw new ServiceUnavailableException("Analysis queue unavailable. Start Redis/API workers and try again.");
    }
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

  async listRuns(ownerKey?: string) {
    return this.prisma.analysisRun.findMany({
      where: { ownerKey: this.accountKey(ownerKey) },
      orderBy: { createdAt: "desc" },
      include: { recommendations: true },
      take: 20
    });
  }

  async clearRuns(ownerKey?: string, visibleAnalysisRunIds?: string[]) {
    const key = this.accountKey(ownerKey);
    const visibleIds = Array.from(new Set((visibleAnalysisRunIds ?? []).map((id) => id.trim()).filter(Boolean)));
    const where =
      key === "demo" || visibleIds.length === 0
        ? { ownerKey: key }
        : {
            OR: [
              { ownerKey: key },
              { ownerKey: "demo", id: { in: visibleIds } }
            ]
          };

    return this.prisma.$transaction(async (tx) => {
      const runs = await tx.analysisRun.findMany({
        where,
        select: { id: true }
      });
      const runIds = runs.map((run) => run.id);
      const deletedAgentResults =
        runIds.length > 0
          ? await tx.agentResult.deleteMany({
              where: { analysisRunId: { in: runIds } }
            })
          : { count: 0 };
      const deletedAnalysisRuns =
        runIds.length > 0
          ? await tx.analysisRun.deleteMany({
              where: { id: { in: runIds } }
            })
          : { count: 0 };

      return {
        deletedAnalysisRuns: deletedAnalysisRuns.count,
        deletedAgentResults: deletedAgentResults.count
      };
    });
  }

  async explainRun(id: string, ownerKey?: string) {
    const run = await this.prisma.analysisRun.findFirst({
      where: { id, ownerKey: this.accountKey(ownerKey) },
      include: { recommendations: true }
    });
    if (!run) throw new NotFoundException("Analysis run not found");
    return buildAnalysisExplanation(run);
  }
}
