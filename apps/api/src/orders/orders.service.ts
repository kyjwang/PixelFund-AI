import { Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { applyTrade, canCancelOrder, evaluateOrderFill, isOrderTriggered } from "@pixelfund/domain";
import type { OrderCreateInput, OrderPreview, OrderStatus as OrderStatusInput } from "@pixelfund/schemas";
import { PrismaService } from "../common/prisma.service";
import { DomainError } from "../common/errors/domain.error";
import { MarketService } from "../market/market.service";
import { PortfolioService } from "../portfolio/portfolio.service";
import { EventsGateway } from "../ws/events.gateway";
import { QuotesService } from "../quotes/quotes.service";

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly market: MarketService,
    private readonly portfolio: PortfolioService,
    private readonly events: EventsGateway,
    private readonly quotes: QuotesService
  ) {}

  onModuleInit() {
    this.quotes.setQuoteObserver((quote) => {
      if (quote?.source === "finnhub") void this.processOpenOrdersForTicker(quote.ticker);
    });
  }

  async previewOrder(input: OrderCreateInput, ownerKey?: string): Promise<OrderPreview> {
    const ticker = input.ticker.toUpperCase();
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const quote = await this.market.quote(ticker);
    const history = await this.market.history(ticker, "1d");
    const portfolio = await this.portfolio.getPortfolio(ownerKey);
    const activePosition = portfolio.positions.find((p) => p.ticker === ticker);
    const requestedPrice = requestedOrderPrice(input);
    const estimatedPrice = requestedPrice ?? quote.price;
    const estimatedGross = estimatedPrice * input.quantity;
    const currentShares = activePosition?.quantity ?? 0;
    const projectedCash = input.side === "BUY" ? account.cash - estimatedGross : account.cash + estimatedGross;
    const projectedShares = input.side === "BUY" ? currentShares + input.quantity : Math.max(0, currentShares - input.quantity);
    const executableNow = isOrderTriggered({
      side: input.side,
      orderType: input.orderType,
      currentPrice: quote.price,
      limitPrice: input.limitPrice,
      stopPrice: input.stopPrice
    });
    const maxAffordableShares = estimatedPrice > 0 ? Math.floor(account.cash / estimatedPrice) : 0;
    const projectedPositionValue = projectedShares * quote.price;
    const currentExposurePercent = activePosition?.portfolioWeight ?? 0;
    const projectedTotalValue = input.side === "BUY" ? portfolio.totalValue : Math.max(0, portfolio.totalValue);
    const projectedExposurePercent = projectedTotalValue > 0 ? (projectedPositionValue / projectedTotalValue) * 100 : 0;
    const suggestedMaxShares = quote.price > 0 ? Math.floor((portfolio.totalValue * 0.1) / quote.price) : 0;
    const blockingReasons = tradabilityBlockers(quote, history.dataQuality.status);
    const warnings: string[] = [];

    if (input.side === "BUY" && account.cash < estimatedGross) warnings.push("Insufficient virtual cash for this order.");
    if (input.side === "SELL" && currentShares < input.quantity) warnings.push("Insufficient shares for this sell order.");
    if (!executableNow) warnings.push(`${input.orderType} order will rest as an open order until a live quote triggers it.`);
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
      warnings,
      tradable: blockingReasons.length === 0,
      quoteSource: quote.source,
      quoteUpdatedAt: quote.updatedAt,
      dataQualityStatus: history.dataQuality.status,
      blockingReasons
    };
  }

  async createOrder(input: OrderCreateInput, ownerKey?: string) {
    const ticker = input.ticker.toUpperCase();
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const preview = await this.previewOrder(input, ownerKey);
    const blockingWarning = preview.warnings.some((warning) => warning.toLowerCase().includes("insufficient"));
    if (!preview.tradable) throw new DomainError("MARKET_DATA_NOT_TRADABLE", "Live market data is unavailable or stale for this ticker.", preview.blockingReasons);
    if (blockingWarning) throw new DomainError("ORDER_REJECTED", preview.warnings.find((warning) => warning.toLowerCase().includes("insufficient")) ?? "Order rejected.");

    const order = await this.prisma.order.create({
      data: {
        accountId: account.id,
        ticker,
        side: input.side,
        quantity: input.quantity,
        orderType: input.orderType,
        limitPrice: input.orderType === "LIMIT" ? input.limitPrice : undefined,
        stopPrice: input.orderType === "STOP" ? input.stopPrice : undefined,
        lastCheckedPrice: preview.currentPrice,
        status: "PENDING"
      }
    });
    this.events.emit("order.created", order);

    if (preview.executableNow) return this.fillOrder(order.id, ownerKey);
    return order;
  }

  async listOrders(status?: OrderStatusInput, limit = 25, ownerKey?: string) {
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    await this.processOpenOrdersForAccount(account.id, ownerKey);
    const safeLimit = Number.isFinite(limit) ? limit : 25;
    return this.prisma.order.findMany({
      where: {
        accountId: account.id,
        ...(status ? { status: status as OrderStatus } : {})
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(safeLimit, 1), 100)
    });
  }

  async cancelOrder(id: string, ownerKey?: string) {
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const order = await this.prisma.order.findFirst({ where: { id, accountId: account.id } });
    if (!order) throw new NotFoundException("Order not found");
    if (!canCancelOrder(order.status)) throw new DomainError("ORDER_NOT_CANCELABLE", "Only pending or partially filled orders can be canceled.");

    const canceled = await this.prisma.order.update({
      where: { id },
      data: { status: "CANCELED", canceledAt: new Date() }
    });
    this.events.emit("order.updated", canceled);
    return canceled;
  }

  async processOpenOrdersForTicker(ticker: string) {
    const orders = await this.prisma.order.findMany({
      where: { ticker: ticker.toUpperCase(), status: { in: ["PENDING", "PARTIALLY_FILLED"] } }
    });
    for (const order of orders) await this.tryFillOrder(order.id);
  }

  private async processOpenOrdersForAccount(accountId: string, ownerKey?: string) {
    const orders = await this.prisma.order.findMany({
      where: { accountId, status: { in: ["PENDING", "PARTIALLY_FILLED"] } }
    });
    for (const order of orders) await this.tryFillOrder(order.id, ownerKey);
  }

  private async tryFillOrder(id: string, ownerKey?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || !canCancelOrder(order.status)) return order;
    const quote = await this.market.quote(order.ticker);
    const history = await this.market.history(order.ticker, "1d");
    const blockers = tradabilityBlockers(quote, history.dataQuality.status);
    if (blockers.length > 0) {
      const updated = await this.prisma.order.update({
        where: { id },
        data: { lastCheckedPrice: quote.price }
      });
      this.events.emit("order.updated", updated);
      return updated;
    }

    const fill = evaluateOrderFill({
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      side: order.side,
      orderType: order.orderType,
      currentPrice: quote.price,
      limitPrice: order.limitPrice,
      stopPrice: order.stopPrice
    });
    if (!fill.shouldFill) {
      const updated = await this.prisma.order.update({
        where: { id },
        data: { lastCheckedPrice: quote.price }
      });
      this.events.emit("order.updated", updated);
      return updated;
    }

    return this.fillOrder(id, ownerKey, quote.price, fill.fillQuantity);
  }

  private async fillOrder(id: string, ownerKey?: string, fillPrice?: number, fillQuantity?: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { account: true } });
    if (!order || !canCancelOrder(order.status)) return order;

    let price = fillPrice;
    if (price === undefined) {
      const quote = await this.market.quote(order.ticker);
      const history = await this.market.history(order.ticker, "1d");
      const blockers = tradabilityBlockers(quote, history.dataQuality.status);
      if (blockers.length > 0) {
        const rejected = await this.prisma.order.update({
          where: { id },
          data: { status: "REJECTED", rejectionReason: blockers.join(" "), lastCheckedPrice: quote.price }
        });
        this.events.emit("order.updated", rejected);
        return rejected;
      }
      price = quote.price;
    }
    const quantity = fillQuantity ?? order.quantity - order.filledQuantity;
    const currentPositions = await this.prisma.position.findMany({ where: { accountId: order.accountId } });

    let updated;
    try {
      updated = applyTrade(order.account.cash, currentPositions, order.ticker, order.side, quantity, price);
    } catch (error: any) {
      const rejected = await this.prisma.order.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: error?.message ?? "Fill rejected", lastCheckedPrice: price }
      });
      this.events.emit("order.updated", rejected);
      return rejected;
    }

    let savedOrder: Awaited<ReturnType<PrismaService["order"]["update"]>>;
    await this.prisma.$transaction(async (tx) => {
      await tx.demoAccount.update({
        where: { id: order.accountId },
        data: {
          cash: updated.cash,
          realizedPnl: order.account.realizedPnl + updated.realizedPnlDelta
        }
      });
      await tx.position.deleteMany({ where: { accountId: order.accountId, ticker: order.ticker } });
      for (const p of updated.positions) {
        await tx.position.upsert({
          where: { accountId_ticker: { accountId: order.accountId, ticker: p.ticker } },
          create: { accountId: order.accountId, ticker: p.ticker, quantity: p.quantity, averageCost: p.averageCost },
          update: { quantity: p.quantity, averageCost: p.averageCost }
        });
      }
      await tx.trade.create({
        data: {
          accountId: order.accountId,
          orderId: order.id,
          ticker: order.ticker,
          side: order.side,
          quantity,
          price,
          orderType: order.orderType,
          requestedPrice: requestedOrderPrice(order)
        }
      });
      const nextFilled = order.filledQuantity + quantity;
      const priorNotional = (order.averageFillPrice ?? 0) * order.filledQuantity;
      const nextAverageFillPrice = nextFilled > 0 ? (priorNotional + price * quantity) / nextFilled : null;
      savedOrder = await tx.order.update({
        where: { id },
        data: {
          filledQuantity: nextFilled,
          status: nextFilled >= order.quantity ? "FILLED" : "PARTIALLY_FILLED",
          averageFillPrice: nextAverageFillPrice,
          lastCheckedPrice: price,
          filledAt: nextFilled >= order.quantity ? new Date() : null
        }
      });
    });

    const portfolio = await this.portfolio.getPortfolio(ownerKey ?? order.account.ownerKey);
    this.events.emit("order.filled", savedOrder!);
    this.events.emit("order.updated", savedOrder!);
    this.events.emit("portfolio.updated", portfolio);
    return savedOrder!;
  }
}

function requestedOrderPrice(input: { orderType: string; limitPrice?: number | null; stopPrice?: number | null }) {
  if (input.orderType === "LIMIT") return input.limitPrice ?? undefined;
  if (input.orderType === "STOP") return input.stopPrice ?? undefined;
  return undefined;
}

function tradabilityBlockers(quote: { source: string; updatedAt: string }, historyStatus: string) {
  const staleMs = Number(process.env.QUOTE_STALE_MS ?? "20000");
  const age = Date.now() - new Date(quote.updatedAt).getTime();
  const blockers: string[] = [];
  if (quote.source !== "finnhub") blockers.push(`Quote source is ${quote.source}, not live provider data.`);
  if (!Number.isFinite(age) || age > staleMs) blockers.push("Live quote is stale.");
  if (historyStatus !== "LIVE") blockers.push(`Historical data quality is ${historyStatus}.`);
  return blockers;
}
