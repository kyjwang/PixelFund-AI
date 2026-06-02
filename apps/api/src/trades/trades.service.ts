import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { MarketService } from "../market/market.service";
import { PortfolioService } from "../portfolio/portfolio.service";
import { applyTrade } from "@pixelfund/domain";
import { EventsGateway } from "../ws/events.gateway";
import { DomainError } from "../common/errors/domain.error";

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
    private readonly events: EventsGateway
  ) {}

  async placeTrade(input: { ticker: string; side: "BUY" | "SELL"; quantity: number }) {
    const ticker = input.ticker.toUpperCase();
    const account = await this.portfolio.getOrCreateAccount();
    const currentPositions = await this.prisma.position.findMany({ where: { accountId: account.id } });
    const quote = await this.market.quote(ticker);
    if (quote.source === "unsupported") {
      throw new DomainError("UNSUPPORTED_MARKET_DATA", "Live market data is unsupported for this ticker by the current provider.");
    }
    const staleMs = Number(process.env.QUOTE_STALE_MS ?? "20000");
    if (quote.source !== "finnhub" && Date.now() - new Date(quote.updatedAt).getTime() > staleMs) {
      throw new DomainError("STALE_QUOTE", "Quote is stale. Refresh and retry trade.");
    }

    let updated;
    try {
      updated = applyTrade(account.cash, currentPositions, ticker, input.side, input.quantity, quote.price);
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_FUNDS") {
        throw new DomainError("INSUFFICIENT_FUNDS", "Insufficient virtual cash");
      }
      if (e.message === "INSUFFICIENT_SHARES") {
        throw new DomainError("INSUFFICIENT_SHARES", "Insufficient shares to sell");
      }
      throw new DomainError("TRADE_ERROR", e.message);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.demoAccount.update({
        where: { id: account.id },
        data: {
          cash: updated.cash,
          realizedPnl: account.realizedPnl + updated.realizedPnlDelta
        }
      });
      await tx.position.deleteMany({ where: { accountId: account.id, ticker } });
      for (const p of updated.positions) {
        await tx.position.upsert({
          where: { accountId_ticker: { accountId: account.id, ticker: p.ticker } },
          create: { accountId: account.id, ticker: p.ticker, quantity: p.quantity, averageCost: p.averageCost },
          update: { quantity: p.quantity, averageCost: p.averageCost }
        });
      }
      await tx.trade.create({
        data: {
          accountId: account.id,
          ticker,
          side: input.side,
          quantity: input.quantity,
          price: quote.price
        }
      });
    });

    const portfolio = await this.portfolio.getPortfolio();
    this.events.emit("portfolio.updated", portfolio);
    return portfolio;
  }

  async listTrades(limit = 25) {
    const safeLimit = Number.isFinite(limit) ? limit : 25;
    return this.prisma.trade.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(safeLimit, 1), 100)
    });
  }
}
