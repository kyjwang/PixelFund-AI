import { Body, Controller, Delete, Get, Headers, Post, Put, Query } from "@nestjs/common";
import { cryptoCashAdjustmentSchema, cryptoTraderSettingsUpdateSchema } from "@pixelfund/schemas";
import { CryptoTraderService } from "./crypto-trader.service";

@Controller("crypto-trader")
export class CryptoTraderController {
  constructor(private readonly cryptoTrader: CryptoTraderService) {}

  @Get("settings")
  settings(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.cryptoTrader.getSettings(ownerKey);
  }

  @Put("settings")
  updateSettings(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = cryptoTraderSettingsUpdateSchema.parse(body);
    return this.cryptoTrader.updateSettings(payload, ownerKey);
  }

  @Post("check-now")
  checkNow(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.cryptoTrader.checkNow(ownerKey);
  }

  @Get("logs")
  logs(@Query("limit") limit?: string, @Headers("x-demo-user-id") ownerKey?: string) {
    return this.cryptoTrader.listLogs(limit ? Number(limit) : undefined, ownerKey);
  }

  @Post("cash-adjustment")
  cashAdjustment(@Body() body: unknown, @Headers("x-demo-user-id") ownerKey?: string) {
    const payload = cryptoCashAdjustmentSchema.parse(body);
    return this.cryptoTrader.adjustCash(payload.amount, ownerKey);
  }

  @Delete("demo-data")
  clearDemoData(@Headers("x-demo-user-id") ownerKey?: string) {
    return this.cryptoTrader.clearDemoData(ownerKey);
  }
}
