import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../common/prisma.service";
import { AiService } from "../ai/ai.service";
import { MarketService } from "../market/market.service";
import { EventsGateway } from "../ws/events.gateway";
import { AnalysisService } from "./analysis.service";
import { buildAgentAnalysis } from "@pixelfund/domain";

@Processor("analysis")
export class AnalysisProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly market: MarketService,
    private readonly events: EventsGateway,
    private readonly analysis: AnalysisService
  ) {
    super();
  }

  async process(job: Job<{ analysisRunId: string; ticker: string }>) {
    const { analysisRunId, ticker } = job.data;

    await this.prisma.analysisRun.update({
      where: { id: analysisRunId },
      data: { status: "RUNNING", errorReason: null }
    });

    try {
      const context = await this.market.context(ticker);
      const agents = [
        "TECHNICAL_ANALYST",
        "NEWS_ANALYST",
        "FUNDAMENTALS_ANALYST",
        "RISK_ANALYST"
      ] as const;

      for (const agent of agents) {
        this.events.emit("analysis.agent.started", {
          analysisRunId,
          agentType: agent,
          status: "RUNNING"
        });

        await this.prisma.agentResult.update({
          where: { analysisRunId_agentType: { analysisRunId, agentType: agent } },
          data: { status: "RUNNING", errorReason: null }
        });

        try {
          const base = buildAgentAnalysis(agent, ticker, context);
          const output = await this.ai.analyze(agent, ticker, context, base);
          const saved = await this.prisma.agentResult.update({
            where: { analysisRunId_agentType: { analysisRunId, agentType: agent } },
            data: {
              status: "COMPLETED",
              summary: output.summary,
              confidence: output.confidence,
              recommendation: output.recommendation,
              reasons: output.reasons as any,
              errorReason: null
            }
          });
          this.events.emit("analysis.agent.completed", saved);
        } catch (error) {
          const reason = error instanceof Error ? error.message : "Unknown analysis error";
          await this.prisma.agentResult.update({
            where: { analysisRunId_agentType: { analysisRunId, agentType: agent } },
            data: { status: "FAILED", errorReason: reason }
          });
          this.events.emit("analysis.agent.failed", {
            analysisRunId,
            agentType: agent,
            status: "FAILED",
            errorReason: reason
          });
        }
      }

      await this.analysis.finalizeManager(analysisRunId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown run error";
      await this.analysis.markRunFailed(analysisRunId, reason);
      throw error;
    }
  }
}
