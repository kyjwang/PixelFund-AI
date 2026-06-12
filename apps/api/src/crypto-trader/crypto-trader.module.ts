import { Module } from "@nestjs/common";
import { CryptoTraderController } from "./crypto-trader.controller";
import { CryptoTraderService } from "./crypto-trader.service";
import { PrismaService } from "../common/prisma.service";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { MarketModule } from "../market/market.module";
import { WsModule } from "../ws/ws.module";

@Module({
  imports: [PortfolioModule, MarketModule, WsModule],
  controllers: [CryptoTraderController],
  providers: [CryptoTraderService, PrismaService],
  exports: [CryptoTraderService]
})
export class CryptoTraderModule {}
