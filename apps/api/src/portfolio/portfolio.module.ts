import { Module } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { PortfolioController } from "./portfolio.controller";
import { MarketModule } from "../market/market.module";
import { PrismaService } from "../common/prisma.service";

@Module({
  imports: [MarketModule],
  controllers: [PortfolioController],
  providers: [PortfolioService, PrismaService],
  exports: [PortfolioService]
})
export class PortfolioModule {}
