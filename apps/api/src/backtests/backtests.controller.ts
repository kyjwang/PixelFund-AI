import { Body, Controller, Post } from "@nestjs/common";
import { backtestCreateSchema } from "@pixelfund/schemas";
import { BacktestsService } from "./backtests.service";

@Controller("backtests")
export class BacktestsController {
  constructor(private readonly backtests: BacktestsService) {}

  @Post()
  run(@Body() body: unknown) {
    const payload = backtestCreateSchema.parse(body);
    return this.backtests.run(payload);
  }
}
