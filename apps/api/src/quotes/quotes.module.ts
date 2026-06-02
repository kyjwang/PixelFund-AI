import { Module } from "@nestjs/common";
import { QuotesService } from "./quotes.service";
import { MarketModule } from "../market/market.module";

@Module({
  imports: [MarketModule],
  providers: [QuotesService],
  exports: [QuotesService]
})
export class QuotesModule {}
