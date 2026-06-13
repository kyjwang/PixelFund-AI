import type { CryptoCandle, CryptoSignal, CryptoSignalInput } from "./crypto-trader.types";

const minTradeNotional = 100;
const minuteMs = 60 * 1000;

export function evaluateCryptoSignal(input: CryptoSignalInput): CryptoSignal {
  const reasons: string[] = [];
  const aggressive = input.strategyMode === "AGGRESSIVE";
  const cooldownMinutes = aggressive ? 5 : 60;
  const buyThreshold = aggressive ? 40 : 60;
  const sellThreshold = aggressive ? -25 : -35;
  const momentumThreshold = aggressive ? 0.002 : 0.006;
  const candles = sortCandles(input.candles);
  const closes = candles.map((candle) => candle.close).filter((close) => Number.isFinite(close) && close > 0);
  const btcCloses = sortCandles(input.btcCandles).map((candle) => candle.close).filter((close) => Number.isFinite(close) && close > 0);

  if (input.tradesToday >= input.maxTradesPerDay) {
    return hold(0, `Daily trade limit reached (${input.tradesToday}/${input.maxTradesPerDay}).`, reasons);
  }

  if (input.lastTradeAt && input.now.getTime() - input.lastTradeAt.getTime() < cooldownMinutes * minuteMs) {
    return hold(0, `Cooldown active for ${cooldownMinutes} minutes after the previous crypto trade.`, reasons);
  }

  if (closes.length < 12) {
    return hold(0, "Not enough crypto candle data for a reliable signal.", reasons);
  }

  if (input.heldQuantity > 0 && input.averageCost > 0) {
    const stopPrice = input.averageCost * (1 - input.stopLossPercent / 100);
    if (input.price <= stopPrice) {
      return {
        action: "SELL",
        score: -100,
        notional: input.heldQuantity * input.price,
        reason: `Simulated stop-loss triggered at ${input.stopLossPercent}% below average cost.`,
        reasons: [`stop-loss price ${round(stopPrice)} was breached by current price ${round(input.price)}.`]
      };
    }
  }

  const shortSma = averageLast(closes, 6);
  const longSma = averageLast(closes, 18);
  const recentMomentum = momentum(closes, 3);
  const volatility = realizedVolatility(closes.slice(-18));
  const btcMomentum = momentum(btcCloses, 6);

  let score = 0;

  if (shortSma !== null && longSma !== null && shortSma > longSma) {
    score += 35;
    reasons.push("SMA trend is positive.");
  } else if (shortSma !== null && longSma !== null && shortSma < longSma) {
    score -= 35;
    reasons.push("SMA trend is negative.");
  }

  if (recentMomentum > momentumThreshold) {
    score += 20;
    reasons.push(aggressive ? "Short-term momentum confirms upside." : "Recent momentum confirms upside.");
  } else if (recentMomentum < -momentumThreshold) {
    score -= 20;
    reasons.push(aggressive ? "Short-term momentum confirms downside." : "Recent momentum confirms downside.");
  } else {
    reasons.push("Momentum is not strong enough.");
  }

  if (volatility > 0.08) {
    score -= 25;
    reasons.push("Volatility filter is too high for a new entry.");
  } else {
    score += 10;
    reasons.push("Volatility filter is acceptable.");
  }

  if (input.symbol !== "BTC" && btcMomentum < -0.025) {
    score -= 20;
    reasons.push("BTC regime filter is negative, so altcoin buys need stronger confirmation.");
  }

  if (input.heldQuantity > 0 && score <= sellThreshold) {
    return {
      action: "SELL",
      score,
      notional: input.heldQuantity * input.price,
      reason: `${aggressive ? "Aggressive mode: " : ""}SELL because technical score ${Math.round(score)} turned defensive.`,
      reasons
    };
  }

  if (score >= buyThreshold) {
    const allowedExposure = Math.max(0, input.maxPortfolioPercent - input.coinExposurePercent);
    const maxNotionalByExposure = input.portfolioValue * (allowedExposure / 100);
    const targetNotional = Math.min(input.cash, maxNotionalByExposure, input.portfolioValue * 0.1);
    if (targetNotional < minTradeNotional) {
      return hold(score, "BUY signal skipped because cash or exposure room is below the $100 minimum.", reasons);
    }
    return {
      action: "BUY",
      score,
      notional: round(targetNotional),
      reason: aggressive ? "Aggressive mode: short-term momentum triggered BUY." : "BUY because SMA trend and momentum confirm the setup.",
      reasons
    };
  }

  return hold(score, `HOLD because ${aggressive ? "short-term " : ""}technical score ${Math.round(score)} is not actionable.`, reasons);
}

function hold(score: number, reason: string, reasons: string[]): CryptoSignal {
  return {
    action: "HOLD",
    score,
    reason,
    reasons,
    notional: 0
  };
}

function sortCandles(candles: CryptoCandle[]) {
  return [...candles]
    .filter((candle) => Number.isFinite(candle.close) && candle.close > 0)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function averageLast(values: number[], window: number) {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function momentum(values: number[], lookback: number) {
  if (values.length <= lookback) return 0;
  const latest = values.at(-1) ?? 0;
  const prior = values.at(-1 - lookback) ?? 0;
  return prior > 0 ? (latest - prior) / prior : 0;
}

function realizedVolatility(values: number[]) {
  if (values.length < 3) return 0;
  const returns = values.slice(1).map((value, index) => {
    const prior = values[index];
    return prior > 0 ? (value - prior) / prior : 0;
  });
  const avg = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - avg) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
