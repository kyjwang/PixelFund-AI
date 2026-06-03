import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { MarketService } from "../market/market.service";
import { PortfolioService } from "../portfolio/portfolio.service";
import { applyTrade } from "@pixelfund/domain";
import { EventsGateway } from "../ws/events.gateway";
import { DomainError } from "../common/errors/domain.error";
import type { TradeCreateInput } from "@pixelfund/schemas";

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
    private readonly events: EventsGateway
  ) {}

  async previewTrade(input: TradeCreateInput, ownerKey?: string) {
    const ticker = input.ticker.toUpperCase();
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const quote = await this.market.quote(ticker);
    const portfolio = await this.portfolio.getPortfolio(ownerKey);
    const activePosition = portfolio.positions.find((p) => p.ticker === ticker);
    const requestedPrice = requestedOrderPrice(input);
    const estimatedPrice = requestedPrice ?? quote.price;
    const estimatedGross = estimatedPrice * input.quantity;
    const currentShares = activePosition?.quantity ?? 0;
    const projectedCash = input.side === "BUY" ? account.cash - estimatedGross : account.cash + estimatedGross;
    const projectedShares = input.side === "BUY" ? currentShares + input.quantity : Math.max(0, currentShares - input.quantity);
    const executableNow = orderExecutable(input, quote.price);
    const maxAffordableShares = estimatedPrice > 0 ? Math.floor(account.cash / estimatedPrice) : 0;
    const projectedPositionValue = projectedShares * quote.price;
    const currentExposurePercent = activePosition?.portfolioWeight ?? 0;
    const projectedTotalValue = input.side === "BUY" ? portfolio.totalValue : Math.max(0, portfolio.totalValue);
    const projectedExposurePercent = projectedTotalValue > 0 ? (projectedPositionValue / projectedTotalValue) * 100 : 0;
    const suggestedMaxShares = quote.price > 0 ? Math.floor((portfolio.totalValue * 0.1) / quote.price) : 0;
    const warnings: string[] = [];

    if (quote.source === "unsupported") warnings.push("Live market data is unsupported for this ticker by the current provider.");
    if (input.side === "BUY" && account.cash < estimatedGross) warnings.push("Insufficient virtual cash for this order.");
    if (input.side === "SELL" && currentShares < input.quantity) warnings.push("Insufficient shares for this sell order.");
    if (!executableNow) warnings.push(`${input.orderType} order is valid as a plan, but it would not execute at the current quote.`);
    if (projectedExposurePercent > 15) warnings.push("Projected ticker exposure is above the 15% concentration guardrail.");

    return {
      ticker,
      side: input.side,
      quantity: input.quantity,
      orderType: input.orderType,
      currentPrice: quote.price,
      estimatedPrice,
      estimatedGross,
      projectedCash,
      projectedShares,
      executableNow,
      sizingHint: {
        maxAffordableShares,
        currentExposurePercent,
        projectedExposurePercent,
        suggestedMaxShares,
        message:
          input.side === "BUY"
            ? `A 10% portfolio cap suggests up to ${suggestedMaxShares} share${suggestedMaxShares === 1 ? "" : "s"} at the current quote.`
            : `Selling ${input.quantity} share${input.quantity === 1 ? "" : "s"} would leave ${projectedShares} share${projectedShares === 1 ? "" : "s"}.`
      },
      warnings
    };
  }

  async placeTrade(input: TradeCreateInput, ownerKey?: string) {
    const ticker = input.ticker.toUpperCase();
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const currentPositions = await this.prisma.position.findMany({ where: { accountId: account.id } });
    const quote = await this.market.quote(ticker);
    const preview = await this.previewTrade(input, ownerKey);
    if (quote.source === "unsupported") {
      throw new DomainError("UNSUPPORTED_MARKET_DATA", "Live market data is unsupported for this ticker by the current provider.");
    }
    if (!preview.executableNow) {
      throw new DomainError("ORDER_NOT_TRIGGERED", "This limit/stop order would not execute at the current quote.");
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
          price: quote.price,
          orderType: input.orderType,
          requestedPrice: requestedOrderPrice(input)
        }
      });
    });

    const portfolio = await this.portfolio.getPortfolio(ownerKey);
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

function requestedOrderPrice(input: TradeCreateInput) {
  if (input.orderType === "LIMIT") return input.limitPrice;
  if (input.orderType === "STOP") return input.stopPrice;
  return undefined;
}

function orderExecutable(input: TradeCreateInput, currentPrice: number) {
  if (input.orderType === "MARKET") return true;
  if (input.orderType === "LIMIT") {
    if (!input.limitPrice) return false;
    return input.side === "BUY" ? currentPrice <= input.limitPrice : currentPrice >= input.limitPrice;
  }
  if (!input.stopPrice) return false;
  return input.side === "BUY" ? currentPrice >= input.stopPrice : currentPrice <= input.stopPrice;
}
