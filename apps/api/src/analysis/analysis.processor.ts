import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../common/prisma.service";
import { AiService } from "../ai/ai.service";
import { MarketService } from "../market/market.service";
import { EventsGateway } from "../ws/events.gateway";
import { AnalysisService } from "./analysis.service";
import { ANALYSIS_PIPELINE, PREDICTION_HORIZONS, buildAgentAnalysis, buildMlFeatureSnapshot } from "@pixelfund/domain";
import type { AgentType } from "@prisma/client";
import { MlService } from "../ml/ml.service";

@Processor("analysis")
export class AnalysisProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly market: MarketService,
    private readonly events: EventsGateway,
    private readonly analysis: AnalysisService,
    private readonly ml: MlService
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
      for (const agent of ANALYSIS_PIPELINE) await this.runAgent(analysisRunId, agent as AgentType, ticker, context);

      const manager = await this.analysis.finalizeManager(analysisRunId);
      await this.runMlShadowPrediction(analysisRunId, ticker, context, {
        recommendation: manager.recommendation ?? "HOLD",
        confidence: manager.confidence ?? 0.45
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown run error";
      await this.analysis.markRunFailed(analysisRunId, reason);
      throw error;
    }
  }

  private async runAgent(analysisRunId: string, agent: AgentType, ticker: string, context: Awaited<ReturnType<MarketService["context"]>>) {
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
      const evidence = await this.prisma.agentResult.findMany({ where: { analysisRunId } });
      const base = buildAgentAnalysis(agent, ticker, context, evidence);
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

  private async runMlShadowPrediction(
    analysisRunId: string,
    ticker: string,
    context: Awaited<ReturnType<MarketService["context"]>>,
    deterministic: { recommendation: "BUY" | "HOLD" | "AVOID"; confidence: number }
  ) {
    const snapshot = buildMlFeatureSnapshot(context, context.generatedAt, "SWING_5_20D");
    const result = await this.ml.predict({
      ticker,
      generatedAt: context.generatedAt,
      deterministicRecommendation: deterministic.recommendation,
      deterministicConfidence: deterministic.confidence,
      horizons: [...PREDICTION_HORIZONS],
      features: snapshot.features
    });

    if (result.predictions.length === 0) return;

    await this.prisma.mlPrediction.createMany({
      data: result.predictions.map((prediction) => ({
        analysisRunId,
        horizon: prediction.horizon,
        modelVersion: result.modelVersion ?? "unknown",
        recommendation: prediction.recommendation,
        probabilities: prediction.probabilities as any,
        calibratedConfidence: prediction.calibratedConfidence,
        expectedReturnBucket: prediction.expectedReturnBucket,
        topFeatures: prediction.topFeatures as any,
        shadowMode: result.shadowMode,
        errorReason: result.errorReason ?? null
      }))
    });
  }
}
