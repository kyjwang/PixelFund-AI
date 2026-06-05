import { Module } from "@nestjs/common";
import { WatchlistController } from "./watchlist.controller";
import { WatchlistService } from "./watchlist.service";
import { PrismaService } from "../common/prisma.service";
import { PortfolioModule } from "../portfolio/portfolio.module";

@Module({
  imports: [PortfolioModule],
  controllers: [WatchlistController],
  providers: [WatchlistService, PrismaService],
  exports: [WatchlistService]
})
export class WatchlistModule {}
