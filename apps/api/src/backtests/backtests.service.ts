import { Injectable } from "@nestjs/common";
import { runPortfolioManagerBacktest } from "@pixelfund/domain";
import type { BacktestCreateInput } from "@pixelfund/schemas";
import { MarketService } from "../market/market.service";

@Injectable()
export class BacktestsService {
  constructor(private readonly market: MarketService) {}

  async run(input: BacktestCreateInput) {
    const history = await this.market.history(input.ticker, "1y");
    return runPortfolioManagerBacktest({
      ticker: input.ticker,
      from: input.from,
      to: input.to,
      strategy: input.strategy,
      candles: history.candles,
      provider: history.dataQuality.provider,
      status: history.dataQuality.status,
      messages: history.dataQuality.messages
    });
  }
}
