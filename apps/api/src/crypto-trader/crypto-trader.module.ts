import { Module } from "@nestjs/common";
import { CryptoTraderController } from "./crypto-trader.controller";
import { CryptoMarketDataService } from "./crypto-market-data.service";
import { CryptoTraderService } from "./crypto-trader.service";
import { YahooCryptoProvider } from "./yahoo-crypto.provider";
import { PrismaService } from "../common/prisma.service";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { MarketModule } from "../market/market.module";
import { WsModule } from "../ws/ws.module";

@Module({
  imports: [PortfolioModule, MarketModule, WsModule],
  controllers: [CryptoTraderController],
  providers: [CryptoTraderService, CryptoMarketDataService, YahooCryptoProvider, PrismaService],
  exports: [CryptoTraderService]
})
export class CryptoTraderModule {}
