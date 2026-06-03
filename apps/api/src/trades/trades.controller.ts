import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { tradeCreateSchema } from "@pixelfund/schemas";
import { TradesService } from "./trades.service";

@Controller("trades")
export class TradesController {
  constructor(private readonly trades: TradesService) {}

  @Post("preview")
  async previewTrade(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = tradeCreateSchema.parse(body);
    return this.trades.previewTrade(payload, ownerKey);
  }

  @Post()
  async createTrade(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = tradeCreateSchema.parse(body);
    return this.trades.placeTrade(payload, ownerKey);
  }

  @Get()
  async listTrades(@Query("limit") limit?: string) {
    return this.trades.listTrades(limit ? Number(limit) : undefined);
  }
}
