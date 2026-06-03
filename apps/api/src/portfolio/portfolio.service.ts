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

  accountKey(ownerKey?: string) {
    return (ownerKey ?? "demo").trim().slice(0, 64) || "demo";
  }

  async getOrCreateAccount(ownerKey?: string) {
    const key = this.accountKey(ownerKey);
    const existing = await this.prisma.demoAccount.findUnique({ where: { ownerKey: key } });
    if (existing) return existing;
    return this.prisma.demoAccount.create({ data: { ownerKey: key, cash: DEFAULT_DEMO_CASH } });
  }

  async getPortfolio(ownerKey?: string) {
    const account = await this.getOrCreateAccount(ownerKey);
    const positions = await this.prisma.position.findMany({ where: { accountId: account.id } });
    const enriched = await Promise.all(
      positions.map(async (p) => {
        const quote = await this.market.quote(p.ticker);
        const marketValue = p.quantity * quote.price;
        const unrealizedPnl = (quote.price - p.averageCost) * p.quantity;
        const costBasis = p.averageCost * p.quantity;
        return {
          ...p,
          marketPrice: quote.price,
          marketValue,
          unrealizedPnl,
          unrealizedPnlPercent: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0,
          costBasis,
          portfolioWeight: 0
        };
      })
    );

    const totalPositionValue = enriched.reduce((sum, p) => sum + p.marketValue, 0);
    const totalUnrealizedPnl = enriched.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const totalValue = account.cash + totalPositionValue;
    const totalPnl = account.realizedPnl + totalUnrealizedPnl;

    return {
      accountKey: account.ownerKey,
      cash: account.cash,
      totalValue,
      totalPnl,
      totalPnlPercent: totalValue > totalPnl ? (totalPnl / (totalValue - totalPnl)) * 100 : 0,
      realizedPnl: account.realizedPnl,
      totalUnrealizedPnl,
      positions: enriched.map((p) => ({
        ...p,
        portfolioWeight: totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0
      }))
    };
  }
}
