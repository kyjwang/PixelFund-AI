import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { tickerSchema } from "@pixelfund/schemas";
import { WatchlistService } from "./watchlist.service";

@Controller("watchlist")
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list() {
    return this.watchlist.list();
  }

  @Post()
  add(@Body() body: unknown) {
    const payload = tickerSchema.parse((body as { ticker?: string })?.ticker);
    return this.watchlist.add(payload);
  }

  @Delete(":ticker")
  remove(@Param("ticker") ticker: string) {
    const normalized = tickerSchema.parse(ticker);
    return this.watchlist.remove(normalized);
  }
}
