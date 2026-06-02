import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { MarketService } from "../market/market.service";
import { DEFAULT_DEMO_CASH } from "@pixelfund/config";

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService
  ) {}

  async getOrCreateAccount() {
    const existing = await this.prisma.demoAccount.findFirst();
    if (existing) return existing;
    return this.prisma.demoAccount.create({ data: { cash: DEFAULT_DEMO_CASH } });
  }

  async getPortfolio() {
    const account = await this.getOrCreateAccount();
    const positions = await this.prisma.position.findMany({ where: { accountId: account.id } });
    const enriched = await Promise.all(
      positions.map(async (p) => {
        const quote = await this.market.quote(p.ticker);
        const marketValue = p.quantity * quote.price;
        const unrealizedPnl = (quote.price - p.averageCost) * p.quantity;
        return { ...p, marketPrice: quote.price, marketValue, unrealizedPnl };
      })
    );

    const totalPositionValue = enriched.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPnl = enriched.reduce((sum, p) => sum + p.unrealizedPnl, 0);

    return {
      cash: account.cash,
      totalValue: account.cash + totalPositionValue,
      totalPnl: account.realizedPnl + totalUnrealizedPnl,
      realizedPnl: account.realizedPnl,
      totalUnrealizedPnl,
      positions: enriched
    };
  }
}
