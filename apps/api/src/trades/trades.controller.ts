import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { tradeCreateSchema } from "@pixelfund/schemas";
import { TradesService } from "./trades.service";

@Controller("trades")
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Post()
  async createTrade(@Body() body: unknown) {
    const payload = tradeCreateSchema.parse(body);
    return this.trades.placeTrade(payload);
  }

  @Get()
  async listTrades(@Query("limit") limit?: string) {
    return this.trades.listTrades(limit ? Number(limit) : undefined);
  }
}
