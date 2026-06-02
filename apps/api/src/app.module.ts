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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    PortfolioModule,
    TradesModule,
    AnalysisModule,
    MarketModule,
    BacktestsModule,
    WatchlistModule,
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
