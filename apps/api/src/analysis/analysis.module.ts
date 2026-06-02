import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AnalysisService } from "./analysis.service";
import { AnalysisController } from "./analysis.controller";
import { PrismaService } from "../common/prisma.service";
import { AnalysisProcessor } from "./analysis.processor";
import { AiService } from "../ai/ai.service";
import { MarketModule } from "../market/market.module";
import { WsModule } from "../ws/ws.module";

@Module({
  imports: [BullModule.registerQueue({ name: "analysis" }), MarketModule, WsModule],
  controllers: [AnalysisController],
  providers: [AnalysisService, PrismaService, AnalysisProcessor, AiService],
  exports: [AnalysisService]
})
export class AnalysisModule {}
