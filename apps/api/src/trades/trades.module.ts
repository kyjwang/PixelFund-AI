import { Module } from "@nestjs/common";
import { TradesController } from "./trades.controller";
import { TradesService } from "./trades.service";
import { PrismaService } from "../common/prisma.service";
import { MarketModule } from "../market/market.module";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { WsModule } from "../ws/ws.module";

@Module({
  imports: [MarketModule, PortfolioModule, WsModule],
  controllers: [TradesController],
  providers: [TradesService, PrismaService]
})
export class TradesModule {}
