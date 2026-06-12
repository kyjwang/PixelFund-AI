import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { TradesModule } from "./trades/trades.module";
import { AnalysisModule } from "./analysis/analysis.module";
import { MarketModule } from "./market/market.module";
import { PrismaService } from "./common/prisma.service";
import { RequestIdMiddleware } from "./common/http/request-id.middleware";
import { QuotesModule } from "./quotes/quotes.module";
import { WsModule } from "./ws/ws.module";
import { StartupService } from "./common/config/startup.service";
import { WatchlistModule } from "./watchlist/watchlist.module";
import { BacktestsModule } from "./backtests/backtests.module";
import { HealthModule } from "./health/health.module";
import { OrdersModule } from "./orders/orders.module";
import { CryptoTraderModule } from "./crypto-trader/crypto-trader.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    PortfolioModule,
    TradesModule,
    OrdersModule,
    AnalysisModule,
    MarketModule,
    BacktestsModule,
    WatchlistModule,
    HealthModule,
    CryptoTraderModule,
    QuotesModule,
    WsModule
  ],
  providers: [PrismaService, StartupService]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
