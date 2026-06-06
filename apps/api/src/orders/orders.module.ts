import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../common/prisma.service";
import { MarketModule } from "../market/market.module";
import { PortfolioModule } from "../portfolio/portfolio.module";
import { WsModule } from "../ws/ws.module";
import { QuotesModule } from "../quotes/quotes.module";

@Module({
  imports: [MarketModule, PortfolioModule, WsModule, QuotesModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService]
})
export class OrdersModule {}
