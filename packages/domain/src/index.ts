import type { AgentResult, BacktestResult, HistoricalCandle, MarketContext, TechnicalIndicators } from "@pixelfund/schemas";

export type Position = {
  ticker: string;
  quantity: number;
  averageCost: number;
};

export type TradeSide = "BUY" | "SELL";
export type Recommendation = "BUY" | "HOLD" | "AVOID";
export type AnalysisAgentType =
  | "TECHNICAL_ANALYST"
  | "NEWS_ANALYST"
  | "FUNDAMENTALS_ANALYST"
  | "RISK_ANALYST"
  | "PORTFOLIO_MANAGER";

export type AgentAnalysisOutput = {
  summary: string;
  confidence: number;
  recommendation: Recommendation;
  reasons: string[];
  score: number;
};

export function computeTechnicalIndicators(candles: HistoricalCandle[]): TechnicalIndicators {
  const sorted = candles
    .filter((c) => Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((c) => c.close);
  const volumes = sorted.map((c) => c.volume);
  const source = sorted.find((c) => c.source)?.source ?? "demo";
  const sma20 = averageLast(closes, 20);
  const sma50 = averageLast(closes, 50);
  const volatility30d = annualizedVolatility(closes.slice(-31));
  const maxDrawdown = calculateMaxDrawdown(closes);
  const recentVolume = averageLast(volumes, 10);
  const priorVolume = averageLast(volumes.slice(0, -10), 30);

  let trend: TechnicalIndicators["trend"] = "UNKNOWN";
  if (sma20 !== null && sma50 !== null) {
    const latest = closes.at(-1);
    if (latest && latest > sma20 && sma20 > sma50) trend = "UP";
    else if (latest && latest < sma20 && sma20 < sma50) trend = "DOWN";
    else trend = "SIDEWAYS";
  }

  let volumeTrend: TechnicalIndicators["volumeTrend"] = "UNKNOWN";
  if (recentVolume !== null && priorVolume !== null && priorVolume > 0) {
    const ratio = recentVolume / priorVolume;
    if (ratio >= 1.15) volumeTrend = "RISING";
    else if (ratio <= 0.85) volumeTrend = "FALLING";
    else volumeTrend = "STABLE";
  }

  return { sma20, sma50, volatility30d, maxDrawdown, trend, volumeTrend, source };
}

export function runPortfolioManagerBacktest(input: {
  ticker: string;
  from: string;
  to: string;
  candles: HistoricalCandle[];
  strategy: "PORTFOLIO_MANAGER_REPLAY";
  provider: string;
  status: BacktestResult["dataQuality"]["status"];
  messages: string[];
}): BacktestResult {
  const candles = input.candles
    .filter((c) => c.date >= input.from && c.date <= input.to && c.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const startValue = 10_000;

  if (candles.length < 30) {
    return {
      ticker: input.ticker.toUpperCase(),
      strategy: input.strategy,
      from: input.from,
      to: input.to,
      trades: 0,
      winRate: 0,
      simulatedPnl: 0,
      maxDrawdown: 0,
      recommendationAccuracy: 0,
      startValue,
      endValue: startValue,
      dataQuality: {
        status: "UNSUPPORTED",
        provider: input.provider,
        messages: [...input.messages, "Not enough historical candles for backtesting."]
      }
    };
  }

  let cash = startValue;
  let shares = 0;
  let trades = 0;
  let wins = 0;
  let recommendations = 0;
  let correct = 0;
  let peak = startValue;
  let drawdown = 0;
  let lastBuyPrice = 0;

  for (let i = 50; i < candles.length - 1; i += 5) {
    const indicators = computeTechnicalIndicators(candles.slice(Math.max(0, i - 50), i + 1));
    const today = candles[i];
    const next = candles[i + 1];
    const rec = indicators.trend === "UP" ? "BUY" : indicators.trend === "DOWN" ? "AVOID" : "HOLD";
    recommendations += 1;

    if ((rec === "BUY" && next.close >= today.close) || (rec === "AVOID" && next.close <= today.close) || rec === "HOLD") {
      correct += 1;
    }

    if (rec === "BUY" && shares === 0 && cash >= today.close) {
      shares = Math.floor(cash / today.close);
      cash -= shares * today.close;
      lastBuyPrice = today.close;
      trades += 1;
    } else if (rec === "AVOID" && shares > 0) {
      cash += shares * today.close;
      if (today.close > lastBuyPrice) wins += 1;
      shares = 0;
      trades += 1;
    }

    const value = cash + shares * today.close;
    peak = Math.max(peak, value);
    drawdown = Math.max(drawdown, peak > 0 ? (peak - value) / peak : 0);
  }

  const endValue = cash + shares * candles[candles.length - 1].close;
  if (shares > 0 && candles[candles.length - 1].close > lastBuyPrice) wins += 1;

  return {
    ticker: input.ticker.toUpperCase(),
    strategy: input.strategy,
    from: input.from,
    to: input.to,
    trades,
    winRate: trades > 0 ? round(wins / trades, 3) : 0,
    simulatedPnl: round(endValue - startValue, 2),
    maxDrawdown: round(drawdown, 3),
    recommendationAccuracy: recommendations > 0 ? round(correct / recommendations, 3) : 0,
    startValue,
    endValue: round(endValue, 2),
    dataQuality: {
      status: input.status,
      provider: input.provider,
      messages: input.messages
    }
  };
}

export function applyTrade(
  cash: number,
  positions: Position[],
  ticker: string,
  side: TradeSide,
  quantity: number,
  price: number
): { cash: number; positions: Position[]; realizedPnlDelta: number } {
  const normalized = ticker.toUpperCase();
  const next = [...positions];
  const idx = next.findIndex((p) => p.ticker === normalized);
  const existing = idx >= 0 ? next[idx] : { ticker: normalized, quantity: 0, averageCost: 0 };
  const gross = quantity * price;

  if (side === "BUY") {
    if (cash < gross) throw new Error("INSUFFICIENT_FUNDS");
    const totalCost = existing.averageCost * existing.quantity + gross;
    const nextQty = existing.quantity + quantity;
    const updated = {
      ...existing,
      quantity: nextQty,
      averageCost: totalCost / nextQty
    };
    if (idx >= 0) next[idx] = updated;
    else next.push(updated);
    return { cash: cash - gross, positions: next, realizedPnlDelta: 0 };
  }

  if (existing.quantity < quantity) throw new Error("INSUFFICIENT_SHARES");
  const remaining = existing.quantity - quantity;
  if (remaining === 0 && idx >= 0) next.splice(idx, 1);
  else if (idx >= 0) next[idx] = { ...existing, quantity: remaining };

  const realizedPnlDelta = (price - existing.averageCost) * quantity;
  return { cash: cash + gross, positions: next, realizedPnlDelta };
}

export function aggregateRecommendation(
  specialist: Array<{ recommendation?: Recommendation; confidence?: number }>
): Recommendation {
  const weights = { BUY: 0, HOLD: 0, AVOID: 0 };
  for (const s of specialist) {
    if (!s.recommendation) continue;
    const w = s.confidence ?? 0.5;
    weights[s.recommendation] += w;
  }
  if (weights.AVOID >= Math.max(weights.BUY, weights.HOLD)) return "AVOID";
  if (weights.BUY > weights.HOLD) return "BUY";
  return "HOLD";
}

export function buildAgentAnalysis(agentType: AnalysisAgentType, ticker: string, context: MarketContext): AgentAnalysisOutput {
  switch (agentType) {
    case "TECHNICAL_ANALYST":
      return technicalAnalysis(ticker, context);
    case "NEWS_ANALYST":
      return newsAnalysis(ticker, context);
    case "FUNDAMENTALS_ANALYST":
      return fundamentalsAnalysis(ticker, context);
    case "RISK_ANALYST":
      return riskAnalysis(ticker, context);
    case "PORTFOLIO_MANAGER":
      return {
        score: 50,
        confidence: 0.5,
        recommendation: "HOLD",
        summary: `Portfolio Manager is waiting for specialist evidence on ${ticker}.`,
        reasons: ["Specialist analysis has not completed yet."]
      };
    default:
      return exhaustive(agentType);
  }
}

export function aggregatePortfolioManager(
  specialist: Array<Pick<AgentResult, "agentType" | "recommendation" | "confidence" | "summary" | "status">>
): AgentAnalysisOutput {
  const completed = specialist.filter((s) => s.status === "COMPLETED" && s.recommendation);
  if (completed.length === 0) {
    return {
      score: 50,
      confidence: 0.45,
      recommendation: "HOLD",
      summary: "Portfolio Manager is holding because no specialist completed with usable evidence.",
      reasons: ["No completed specialist outputs were available.", "Fallback is deliberately conservative."]
    };
  }

  const weights: Record<AnalysisAgentType, number> = {
    TECHNICAL_ANALYST: 0.26,
    NEWS_ANALYST: 0.2,
    FUNDAMENTALS_ANALYST: 0.3,
    RISK_ANALYST: 0.24,
    PORTFOLIO_MANAGER: 0
  };

  let totalWeight = 0;
  let totalScore = 0;
  const reasons: string[] = [];
  const stanceScore: Record<Recommendation, number> = { BUY: 72, HOLD: 50, AVOID: 28 };

  for (const rec of completed) {
    const agentType = rec.agentType as AnalysisAgentType;
    const confidence = clamp(rec.confidence ?? 0.5, 0.2, 0.95);
    const weight = (weights[agentType] ?? 0.2) * confidence;
    const recommendation = rec.recommendation as Recommendation;
    totalScore += stanceScore[recommendation] * weight;
    totalWeight += weight;
    reasons.push(`${humanAgent(agentType)}: ${recommendation} at ${Math.round(confidence * 100)}% confidence`);
  }

  let score = totalWeight > 0 ? totalScore / totalWeight : 50;

  const risk = completed.find((s) => s.agentType === "RISK_ANALYST");
  if (risk?.recommendation === "AVOID" && (risk.confidence ?? 0) >= 0.7) {
    score = Math.min(score, 44);
    reasons.push("Risk Analyst high-confidence AVOID capped the final score.");
  }

  const recommendation = recommendationFromScore(score);
  const averageConfidence = completed.reduce((sum, s) => sum + (s.confidence ?? 0.5), 0) / completed.length;
  const coverage = completed.length / 4;
  const confidence = clamp(0.35 + averageConfidence * 0.45 + coverage * 0.2, 0.45, 0.9);
  const conflict = new Set(completed.map((s) => s.recommendation)).size > 1;

  return {
    score: round(score, 1),
    confidence: round(confidence, 2),
    recommendation,
    summary: `Portfolio Manager recommends ${recommendation} with a ${Math.round(score)} composite score from ${completed.length}/4 specialists.`,
    reasons: [
      ...reasons,
      conflict ? "Specialists disagreed, so confidence was moderated." : "Specialists were broadly aligned.",
      coverage < 1 ? "Partial specialist coverage lowered confidence." : "All specialist outputs were available."
    ]
  };
}

function technicalAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const quote = context.quote;
  const f = context.fundamentals;
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  if (isFiniteNumber(quote.changePercent)) {
    const delta = clamp(quote.changePercent, -8, 8);
    score += delta * 1.9;
    evidence += 1;
    reasons.push(`[${quote.source}] Today move is ${formatPercent(quote.changePercent)}.`);
  }

  if (isFiniteNumber(f.week52High) && isFiniteNumber(f.week52Low) && f.week52High > f.week52Low) {
    const rangePosition = (quote.price - f.week52Low) / (f.week52High - f.week52Low);
    if (rangePosition >= 0.35 && rangePosition <= 0.85) score += 8;
    if (rangePosition < 0.2) score -= 9;
    if (rangePosition > 0.95) score -= 4;
    evidence += 1;
    reasons.push(`[${f.source}] Price is ${Math.round(clamp(rangePosition, 0, 1) * 100)}% through its 52-week range.`);
  }

  if (isFiniteNumber(f.week52Return)) {
    const yearly = clamp(f.week52Return, -60, 80);
    score += yearly > 0 ? Math.min(yearly / 4, 12) : Math.max(yearly / 3, -16);
    evidence += 1;
    reasons.push(`[${f.source}] 52-week return is ${formatPercent(f.week52Return)}.`);
  }

  if (isFiniteNumber(f.tenDayAverageVolume) && isFiniteNumber(f.threeMonthAverageVolume) && f.threeMonthAverageVolume > 0) {
    const volumeRatio = f.tenDayAverageVolume / f.threeMonthAverageVolume;
    if (volumeRatio > 1.2 && quote.changePercent > 0) score += 5;
    if (volumeRatio > 1.2 && quote.changePercent < 0) score -= 5;
    evidence += 1;
    reasons.push(`[${f.source}] 10-day volume is ${round(volumeRatio, 2)}x the 3-month average.`);
  }

  if (context.technicals) {
    if (context.technicals.trend === "UP") score += 9;
    if (context.technicals.trend === "DOWN") score -= 9;
    evidence += 1;
    reasons.push(`[${context.technicals.source}] Historical trend is ${context.technicals.trend.toLowerCase()}.`);
  }

  return finishAgent(
    ticker,
    "Technical Analyst",
    "price momentum and trend evidence",
    score,
    evidence,
    context.dataQuality.score,
    reasons
  );
}

function newsAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  if (context.news.length > 0) {
    const weighted = context.news.reduce((sum, item, idx) => {
      const decay = 1 / (idx + 1);
      return sum + (item.sentimentScore ?? sentimentToScore(item.sentiment)) * decay;
    }, 0);
    const divisor = context.news.reduce((sum, _item, idx) => sum + 1 / (idx + 1), 0);
    const avg = divisor > 0 ? weighted / divisor : 0;
    score += avg * 28;
    evidence += Math.min(context.news.length, 5) / 2;
    reasons.push(`[news] ${context.news.length} recent headline${context.news.length === 1 ? "" : "s"} average ${sentimentLabel(avg)} sentiment.`);
    reasons.push(`[${context.news[0].source}] Latest: ${context.news[0].headline}`);
  } else {
    reasons.push("No recent headline feed was available.");
  }

  if (context.analystTrend) {
    const trend = context.analystTrend;
    const total = trend.strongBuy + trend.buy + trend.hold + trend.sell + trend.strongSell;
    if (total > 0) {
      const bullishShare = (trend.strongBuy + trend.buy) / total;
      const bearishShare = (trend.sell + trend.strongSell) / total;
      score += (bullishShare - bearishShare) * 18;
      evidence += 1;
      reasons.push(`[${trend.source}] Analyst trend consensus is ${trend.consensus} from ${total} ratings.`);
    }
  }

  return finishAgent(ticker, "News Analyst", "headline sentiment and analyst trend evidence", score, evidence, context.dataQuality.score, reasons);
}

function fundamentalsAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const f = context.fundamentals;
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  if (isFiniteNumber(f.peRatio)) {
    if (f.peRatio > 0 && f.peRatio <= 18) score += 9;
    else if (f.peRatio <= 32) score += 4;
    else if (f.peRatio > 55) score -= 12;
    else if (f.peRatio > 38) score -= 6;
    evidence += 1;
    reasons.push(`[${f.source}] Trailing P/E is ${round(f.peRatio, 1)}.`);
  }

  if (isFiniteNumber(f.revenueGrowth)) {
    score += clamp(f.revenueGrowth / 2, -10, 12);
    evidence += 1;
    reasons.push(`[${f.source}] Revenue growth is ${formatPercent(f.revenueGrowth)}.`);
  }

  if (isFiniteNumber(f.epsGrowth)) {
    score += clamp(f.epsGrowth / 3, -10, 12);
    evidence += 1;
    reasons.push(`[${f.source}] EPS growth is ${formatPercent(f.epsGrowth)}.`);
  }

  if (isFiniteNumber(f.netMargin)) {
    if (f.netMargin >= 18) score += 8;
    else if (f.netMargin >= 8) score += 4;
    else if (f.netMargin < 0) score -= 12;
    evidence += 1;
    reasons.push(`[${f.source}] Net margin is ${formatPercent(f.netMargin)}.`);
  }

  if (isFiniteNumber(f.roe)) {
    if (f.roe >= 20) score += 7;
    else if (f.roe >= 10) score += 3;
    else if (f.roe < 0) score -= 8;
    evidence += 1;
    reasons.push(`[${f.source}] Return on equity is ${formatPercent(f.roe)}.`);
  }

  if (isFiniteNumber(f.debtToEquity)) {
    if (f.debtToEquity <= 0.8) score += 5;
    else if (f.debtToEquity >= 2.5) score -= 8;
    evidence += 1;
    reasons.push(`[${f.source}] Debt/equity is ${round(f.debtToEquity, 2)}.`);
  }

  if (isFiniteNumber(f.marketCap)) {
    if (f.marketCap >= 10_000_000_000) score += 3;
    if (f.marketCap < 2_000_000_000) score -= 4;
    evidence += 0.5;
    reasons.push(`[${f.source}] Market cap is ${compactCurrency(f.marketCap)}.`);
  }

  return finishAgent(ticker, "Fundamentals Analyst", "valuation, growth, profitability, and balance sheet evidence", score, evidence, context.dataQuality.score, reasons);
}

function riskAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const f = context.fundamentals;
  const reasons: string[] = [];
  let risk = 50;
  let evidence = 0;

  if (isFiniteNumber(f.beta)) {
    if (f.beta > 1.6) risk += 16;
    else if (f.beta > 1.25) risk += 8;
    else if (f.beta < 0.85) risk -= 6;
    evidence += 1;
    reasons.push(`[${f.source}] Beta is ${round(f.beta, 2)}.`);
  }

  if (isFiniteNumber(context.quote.changePercent)) {
    const move = Math.abs(context.quote.changePercent);
    if (move >= 5) risk += 12;
    else if (move >= 2.5) risk += 6;
    evidence += 1;
    reasons.push(`[${context.quote.source}] Intraday move magnitude is ${formatPercent(move)}.`);
  }

  if (isFiniteNumber(f.week52High) && f.week52High > 0) {
    const drawdown = ((f.week52High - context.quote.price) / f.week52High) * 100;
    if (drawdown > 45) risk += 14;
    else if (drawdown > 25) risk += 8;
    else if (drawdown < 8) risk -= 3;
    evidence += 1;
    reasons.push(`[${f.source}] Drawdown from 52-week high is ${formatPercent(drawdown)}.`);
  }

  if (isFiniteNumber(f.peRatio) && f.peRatio > 50) {
    risk += 7;
    evidence += 0.5;
    reasons.push("Valuation risk is elevated versus broad-market norms.");
  }

  const negativeNews = context.news.filter((n) => n.sentiment === "negative").length;
  if (negativeNews > 0) {
    risk += Math.min(negativeNews * 4, 12);
    evidence += 0.5;
    reasons.push(`[news] ${negativeNews} negative recent headline${negativeNews === 1 ? "" : "s"} increased event risk.`);
  }

  const score = 100 - risk;
  return finishAgent(ticker, "Risk Analyst", "volatility, drawdown, valuation, and event-risk evidence", score, evidence, context.dataQuality.score, reasons);
}

function finishAgent(
  ticker: string,
  agentName: string,
  evidenceLabel: string,
  rawScore: number,
  evidenceCount: number,
  dataQuality: number,
  inputReasons: string[]
): AgentAnalysisOutput {
  const score = round(clamp(rawScore, 0, 100), 1);
  const recommendation = recommendationFromScore(score);
  const evidenceCoverage = clamp(evidenceCount / 5, 0, 1);
  const conviction = Math.abs(score - 50) / 50;
  const confidence = round(clamp(0.35 + dataQuality * 0.22 + evidenceCoverage * 0.22 + conviction * 0.21, 0.35, 0.92), 2);
  const reasons = inputReasons.length > 0 ? inputReasons.slice(0, 5) : ["Insufficient data; conservative fallback used."];

  if (dataQuality < 0.75) {
    reasons.push("Data coverage is incomplete, so confidence is intentionally capped.");
  }

  return {
    score,
    confidence,
    recommendation,
    summary: `${agentName} gives ${ticker.toUpperCase()} a ${Math.round(score)} score from ${evidenceLabel}, suggesting ${recommendation}.`,
    reasons
  };
}

function recommendationFromScore(score: number): Recommendation {
  if (score >= 62) return "BUY";
  if (score <= 38) return "AVOID";
  return "HOLD";
}

function humanAgent(agentType: AnalysisAgentType): string {
  return agentType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function compactCurrency(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `$${round(value / 1_000_000_000_000, 2)}T`;
  if (abs >= 1_000_000_000) return `$${round(value / 1_000_000_000, 2)}B`;
  if (abs >= 1_000_000) return `$${round(value / 1_000_000, 2)}M`;
  return `$${round(value, 2)}`;
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${round(value, 1)}%`;
}

function sentimentToScore(sentiment: "positive" | "neutral" | "negative") {
  if (sentiment === "positive") return 0.55;
  if (sentiment === "negative") return -0.55;
  return 0;
}

function sentimentLabel(score: number) {
  if (score >= 0.15) return "positive";
  if (score <= -0.15) return "negative";
  return "neutral";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function averageLast(values: number[], count: number): number | null {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length < count) return null;
  const slice = filtered.slice(-count);
  return round(slice.reduce((sum, value) => sum + value, 0) / slice.length, 3);
}

function annualizedVolatility(closes: number[]): number | null {
  if (closes.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return round(Math.sqrt(variance) * Math.sqrt(252) * 100, 2);
}

function calculateMaxDrawdown(closes: number[]): number | null {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let drawdown = 0;
  for (const close of closes) {
    peak = Math.max(peak, close);
    drawdown = Math.max(drawdown, peak > 0 ? (peak - close) / peak : 0);
  }
  return round(drawdown * 100, 2);
}

function exhaustive(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
