import { Module } from "@nestjs/common";
import { MarketModule } from "../market/market.module";
import { BacktestsController } from "./backtests.controller";
import { BacktestsService } from "./backtests.service";

@Module({
  imports: [MarketModule],
  controllers: [BacktestsController],
  providers: [BacktestsService]
})
export class BacktestsModule {}
