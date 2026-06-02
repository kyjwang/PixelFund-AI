import { Controller, Get, Param, Query } from "@nestjs/common";
import { historyRangeSchema } from "@pixelfund/schemas";
import { MarketService } from "./market.service";

@Controller("stocks")
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get("search")
  search(@Query("q") q: string) {
    return this.market.search(q ?? "");
  }

  @Get(":ticker/quote")
  quote(@Param("ticker") ticker: string) {
    return this.market.quote(ticker);
  }

  @Get(":ticker/context")
  context(@Param("ticker") ticker: string) {
    return this.market.context(ticker);
  }

  @Get(":ticker/history")
  history(@Param("ticker") ticker: string, @Query("range") range?: string) {
    const parsed = historyRangeSchema.parse(range ?? "1y");
    return this.market.history(ticker, parsed);
  }
}

@Controller("market/providers")
export class MarketProvidersController {
  constructor(private readonly market: MarketService) {}

  @Get("capabilities")
  capabilities() {
    return this.market.providerCapabilities();
  }
}
