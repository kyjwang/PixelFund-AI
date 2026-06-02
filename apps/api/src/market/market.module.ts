import { Module } from "@nestjs/common";
import { MarketService } from "./market.service";
import { MarketController, MarketProvidersController } from "./market.controller";
import { FinnhubProvider } from "./finnhub.provider";

@Module({
  controllers: [MarketController, MarketProvidersController],
  providers: [MarketService, FinnhubProvider],
  exports: [MarketService]
})
export class MarketModule {}
