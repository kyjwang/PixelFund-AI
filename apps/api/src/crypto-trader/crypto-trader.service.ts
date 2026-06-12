import { BadRequestException, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { CryptoTraderSettings as PrismaCryptoTraderSettings } from "@prisma/client";
import { applyTrade } from "@pixelfund/domain";
import type { CryptoSymbol, CryptoTraderSettingsUpdate } from "@pixelfund/schemas";
import { PrismaService } from "../common/prisma.service";
import { DomainError } from "../common/errors/domain.error";
import { PortfolioService } from "../portfolio/portfolio.service";
import { CoinGeckoProvider, coinGeckoAssetForTicker } from "../market/coingecko.provider";
import { EventsGateway } from "../ws/events.gateway";
import { evaluateCryptoSignal } from "./crypto-trader.strategy";
import type { CryptoCandle } from "./crypto-trader.types";

const cryptoSymbols: CryptoSymbol[] = ["BTC", "ETH", "SOL"];
const checkIntervalMs = 30 * 60 * 1000;

type NormalizedCryptoTraderSettings = Omit<PrismaCryptoTraderSettings, "selectedCoins"> & {
  selectedCoins: CryptoSymbol[];
};

@Injectable()
export class CryptoTraderService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolio: PortfolioService,
    private readonly coinGecko: CoinGeckoProvider,
    private readonly events: EventsGateway
  ) {}

  onModuleInit() {
    this.interval = setInterval(() => void this.runEnabledBots(), checkIntervalMs);
    this.interval.unref?.();
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  accountKey(ownerKey?: string) {
    return (ownerKey ?? "demo").trim().slice(0, 64) || "demo";
  }

  async getSettings(ownerKey?: string) {
    const key = this.accountKey(ownerKey);
    const existing = await this.prisma.cryptoTraderSettings.findUnique({ where: { ownerKey: key } });
    if (existing) return normalizeSettings(existing);
    const created = await this.prisma.cryptoTraderSettings.create({
      data: {
        ownerKey: key,
        enabled: false,
        selectedCoins: ["BTC"],
        maxTradesPerDay: 4,
        stopLossPercent: 4,
        maxPortfolioPercent: 20
      }
    });
    return normalizeSettings(created);
  }

  async updateSettings(input: CryptoTraderSettingsUpdate, ownerKey?: string) {
    const current = await this.getSettings(ownerKey);
    const selectedCoins = input.selectedCoins ? uniqueCoins(input.selectedCoins) : current.selectedCoins;
    if (selectedCoins.length < 1 || selectedCoins.length > 2) {
      throw new BadRequestException("Choose one or two crypto coins.");
    }
    const updated = await this.prisma.cryptoTraderSettings.update({
      where: { ownerKey: current.ownerKey },
      data: {
        enabled: input.enabled ?? current.enabled,
        selectedCoins,
        maxTradesPerDay: input.maxTradesPerDay ?? current.maxTradesPerDay,
        stopLossPercent: input.stopLossPercent ?? current.stopLossPercent,
        maxPortfolioPercent: input.maxPortfolioPercent ?? current.maxPortfolioPercent
      }
    });
    return normalizeSettings(updated);
  }

  async adjustCash(amount: 10000 | -10000, ownerKey?: string) {
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const nextCash = account.cash + amount;
    if (nextCash < 0) {
      throw new DomainError("CASH_ADJUSTMENT_REJECTED", "Cannot reduce virtual cash below zero.");
    }
    await this.prisma.demoAccount.update({
      where: { id: account.id },
      data: { cash: nextCash }
    });
    const portfolio = await this.portfolio.getPortfolio(ownerKey);
    this.events.emit("portfolio.updated", portfolio);
    return portfolio;
  }

  async listLogs(limit = 50, ownerKey?: string) {
    const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? limit : 50, 1), 100);
    const logs = await this.prisma.cryptoTraderLog.findMany({
      where: { ownerKey: this.accountKey(ownerKey) },
      orderBy: { createdAt: "desc" },
      take: safeLimit
    });
    return logs.map(normalizeLog);
  }

  async checkNow(ownerKey?: string, now = new Date()) {
    const settings = await this.getSettings(ownerKey);
    const checkedAt = now.toISOString();
    const swedenDay = swedenDayKey(now);
    const btcCandles = await this.cryptoCandles("BTC");
    const logs = [];
    let tradesToday = await this.tradesToday(settings.ownerKey, swedenDay);

    for (const symbol of settings.selectedCoins) {
      if (tradesToday >= settings.maxTradesPerDay) {
        logs.push(
          await this.saveLog({
            ownerKey: settings.ownerKey,
            swedenDay,
            symbol,
            action: "HOLD",
            score: 0,
            reason: `Daily trade limit reached (${tradesToday}/${settings.maxTradesPerDay}).`,
            reasons: ["The bot saved a HOLD decision instead of placing another trade."],
            price: null,
            quantity: null,
            notional: null,
            tradeId: null
          })
        );
        continue;
      }

      const decision = await this.evaluateCoin(settings, symbol, btcCandles, tradesToday, now, swedenDay);
      logs.push(decision);
      if (decision.tradeId) tradesToday += 1;
    }

    const updatedSettings = await this.prisma.cryptoTraderSettings.update({
      where: { ownerKey: settings.ownerKey },
      data: { lastCheckedAt: now }
    });

    return {
      checkedAt,
      tradesToday,
      settings: normalizeSettings(updatedSettings),
      logs: logs.map(normalizeLog)
    };
  }

  private async runEnabledBots() {
    const settings = await this.prisma.cryptoTraderSettings.findMany({ where: { enabled: true } });
    for (const setting of settings) {
      if (setting.lastCheckedAt && Date.now() - setting.lastCheckedAt.getTime() < checkIntervalMs - 5000) continue;
      await this.checkNow(setting.ownerKey).catch(() => undefined);
    }
  }

  private async evaluateCoin(settings: NormalizedCryptoTraderSettings, symbol: CryptoSymbol, btcCandles: CryptoCandle[], tradesToday: number, now: Date, swedenDay: string) {
    const asset = coinGeckoAssetForTicker(symbol);
    const context = await this.coinGecko.cryptoContext(symbol);
    const candles = await this.cryptoCandles(symbol);
    const price = context?.priceUsd ?? candles.at(-1)?.close ?? 0;
    if (!asset || price <= 0 || candles.length === 0) {
      return this.saveLog({
        ownerKey: settings.ownerKey,
        swedenDay,
        symbol,
        action: "HOLD",
        score: 0,
        reason: "HOLD because live CoinGecko crypto data was unavailable.",
        reasons: ["CoinGecko returned no usable price or OHLC candles."],
        price: price || null,
        quantity: null,
        notional: null,
        tradeId: null
      });
    }

    const portfolio = await this.portfolio.getPortfolio(settings.ownerKey);
    const position = portfolio.positions.find((p) => p.ticker === symbol);
    const lastTrade = await this.prisma.cryptoTraderLog.findFirst({
      where: { ownerKey: settings.ownerKey, ticker: symbol, tradeId: { not: null }, action: { in: ["BUY", "SELL"] } },
      orderBy: { createdAt: "desc" }
    });
    const signal = evaluateCryptoSignal({
      symbol,
      price,
      candles,
      btcCandles,
      heldQuantity: position?.quantity ?? 0,
      averageCost: position?.averageCost ?? 0,
      portfolioValue: portfolio.totalValue,
      coinExposurePercent: position?.portfolioWeight ?? 0,
      cash: portfolio.cash,
      stopLossPercent: settings.stopLossPercent,
      maxPortfolioPercent: settings.maxPortfolioPercent,
      tradesToday,
      maxTradesPerDay: settings.maxTradesPerDay,
      lastTradeAt: lastTrade?.createdAt ?? null,
      now
    });

    let tradeId: string | null = null;
    let quantity: number | null = null;
    let notional: number | null = signal.notional > 0 ? signal.notional : null;

    if (signal.action === "BUY" && signal.notional >= 100) {
      quantity = roundQuantity(signal.notional / price);
      tradeId = (await this.executeCryptoTrade(settings.ownerKey, symbol, "BUY", quantity, price)).id;
    } else if (signal.action === "SELL" && (position?.quantity ?? 0) > 0) {
      quantity = roundQuantity(position!.quantity);
      notional = quantity * price;
      tradeId = (await this.executeCryptoTrade(settings.ownerKey, symbol, "SELL", quantity, price)).id;
    }

    return this.saveLog({
      ownerKey: settings.ownerKey,
      swedenDay,
      symbol,
      action: tradeId ? signal.action : "HOLD",
      score: signal.score,
      reason: tradeId ? signal.reason : signal.action === "HOLD" ? signal.reason : `${signal.action} signal skipped because risk or position rules blocked execution.`,
      reasons: signal.reasons.length ? signal.reasons : [signal.reason],
      price,
      quantity,
      notional,
      tradeId
    });
  }

  private async cryptoCandles(symbol: CryptoSymbol): Promise<CryptoCandle[]> {
    const candles = await this.coinGecko.cryptoHistory(symbol, 1);
    return (candles ?? []).map((candle) => ({
      timestamp: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
  }

  private async tradesToday(ownerKey: string, swedenDay: string) {
    return this.prisma.cryptoTraderLog.count({
      where: {
        ownerKey,
        swedenDay,
        tradeId: { not: null },
        action: { in: ["BUY", "SELL"] }
      }
    });
  }

  private async executeCryptoTrade(ownerKey: string, ticker: CryptoSymbol, side: "BUY" | "SELL", quantity: number, price: number) {
    const account = await this.portfolio.getOrCreateAccount(ownerKey);
    const currentPositions = await this.prisma.position.findMany({ where: { accountId: account.id } });
    let updated;
    try {
      updated = applyTrade(account.cash, currentPositions, ticker, side, quantity, price);
    } catch (error: any) {
      throw new DomainError(error?.message ?? "CRYPTO_TRADE_REJECTED", error?.message ?? "Crypto trade rejected.");
    }

    let tradeId = "";
    await this.prisma.$transaction(async (tx) => {
      await tx.demoAccount.update({
        where: { id: account.id },
        data: {
          cash: updated.cash,
          realizedPnl: account.realizedPnl + updated.realizedPnlDelta
        }
      });
      await tx.position.deleteMany({ where: { accountId: account.id, ticker } });
      for (const position of updated.positions) {
        await tx.position.upsert({
          where: { accountId_ticker: { accountId: account.id, ticker: position.ticker } },
          create: { accountId: account.id, ticker: position.ticker, quantity: position.quantity, averageCost: position.averageCost },
          update: { quantity: position.quantity, averageCost: position.averageCost }
        });
      }
      const trade = await tx.trade.create({
        data: {
          accountId: account.id,
          ticker,
          side,
          quantity,
          price,
          orderType: "MARKET"
        }
      });
      tradeId = trade.id;
    });

    const portfolio = await this.portfolio.getPortfolio(ownerKey);
    this.events.emit("portfolio.updated", portfolio);
    return { id: tradeId };
  }

  private async saveLog(input: {
    ownerKey: string;
    swedenDay: string;
    symbol: CryptoSymbol;
    action: "BUY" | "SELL" | "HOLD";
    score: number;
    reason: string;
    reasons: string[];
    price: number | null;
    quantity: number | null;
    notional: number | null;
    tradeId: string | null;
  }) {
    const asset = coinGeckoAssetForTicker(input.symbol) ?? input.symbol.toLowerCase();
    return this.prisma.cryptoTraderLog.create({
      data: {
        ownerKey: input.ownerKey,
        swedenDay: input.swedenDay,
        ticker: input.symbol,
        coinId: asset,
        action: input.action,
        score: input.score,
        reason: input.reason,
        reasons: input.reasons,
        price: input.price,
        quantity: input.quantity,
        notional: input.notional,
        tradeId: input.tradeId
      }
    });
  }
}

function normalizeSettings(settings: PrismaCryptoTraderSettings): NormalizedCryptoTraderSettings {
  return {
    ...settings,
    selectedCoins: uniqueCoins(settings.selectedCoins)
  };
}

function normalizeLog<T extends { reasons: unknown; ticker: string }>(log: T) {
  return {
    ...log,
    ticker: log.ticker as CryptoSymbol,
    reasons: Array.isArray(log.reasons) ? log.reasons.map(String) : []
  };
}

function uniqueCoins(coins: readonly string[]) {
  return Array.from(new Set(coins.map((coin) => coin.trim().toUpperCase()).filter((coin): coin is CryptoSymbol => cryptoSymbols.includes(coin as CryptoSymbol))));
}

function swedenDayKey(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function roundQuantity(value: number) {
  return Math.round(value * 100_000_000) / 100_000_000;
}
