import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";
import { tickerSchema } from "@pixelfund/schemas";
import { WatchlistService } from "./watchlist.service";

@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.watchlist.list(ownerKey);
  }

  @Post()
  add(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = tickerSchema.parse((body as { ticker?: string })?.ticker);
    return this.watchlist.add(payload, ownerKey);
  }

  @Delete(":ticker")
  remove(@Param("ticker") ticker: string, @Headers("x-demo-user-id") ownerKey?: string) {
    const normalized = tickerSchema.parse(ticker);
    return this.watchlist.remove(normalized, ownerKey);
  }
}
