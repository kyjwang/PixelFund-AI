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
  | "MACRO_ANALYST"
  | "SENTIMENT_ANALYST"
  | "QUANT_ANALYST"
  | "CRYPTO_SPECIALIST"
  | "BULL_RESEARCHER"
  | "BEAR_RESEARCHER"
  | "TRADER_AGENT"
  | "AGGRESSIVE_RISK"
  | "NEUTRAL_RISK"
  | "CONSERVATIVE_RISK"
  | "PORTFOLIO_MANAGER"
  | "TEAM_LEAD";

export type AgentAnalysisOutput = {
  summary: string;
  confidence: number;
  recommendation: Recommendation;
  reasons: string[];
  score: number;
};

export type AgentProfile = {
  id: AnalysisAgentType;
  label: string;
  role: string;
  stage: "SPECIALIST" | "DEBATE" | "TRADER" | "RISK_COUNCIL" | "SYNTHESIS";
  defaultWeight: number;
  description: string;
};

export const AGENT_PROFILES: AgentProfile[] = [
  { id: "TECHNICAL_ANALYST", label: "TA", role: "Technical Analyst", stage: "SPECIALIST", defaultWeight: 0.26, description: "Reads price action, trend, range, and volume evidence." },
  { id: "NEWS_ANALYST", label: "NA", role: "News Analyst", stage: "SPECIALIST", defaultWeight: 0.2, description: "Evaluates headline sentiment and analyst trend evidence." },
  { id: "FUNDAMENTALS_ANALYST", label: "FA", role: "Fundamentals Analyst", stage: "SPECIALIST", defaultWeight: 0.3, description: "Checks valuation, growth, profitability, and balance sheet quality." },
  { id: "RISK_ANALYST", label: "RM", role: "Risk Analyst", stage: "SPECIALIST", defaultWeight: 0.24, description: "Caps downside using volatility, drawdown, beta, valuation, and event risk." },
  { id: "MACRO_ANALYST", label: "MA", role: "Macro Analyst", stage: "SPECIALIST", defaultWeight: 0.12, description: "Frames beta, volatility, and growth resilience against market regime." },
  { id: "SENTIMENT_ANALYST", label: "SA", role: "Sentiment Analyst", stage: "SPECIALIST", defaultWeight: 0.1, description: "Measures crowd tone, analyst consensus, and price reaction." },
  { id: "QUANT_ANALYST", label: "QA", role: "Quant Analyst", stage: "SPECIALIST", defaultWeight: 0.16, description: "Ranks trend, volume, valuation, and drawdown factors." },
  { id: "CRYPTO_SPECIALIST", label: "CS", role: "Crypto Specialist", stage: "SPECIALIST", defaultWeight: 0.06, description: "Checks crypto-beta and cross-asset liquidity sensitivity." },
  { id: "BULL_RESEARCHER", label: "BU", role: "Bull Researcher", stage: "DEBATE", defaultWeight: 0.12, description: "Builds the strongest upside case from completed evidence." },
  { id: "BEAR_RESEARCHER", label: "BE", role: "Bear Researcher", stage: "DEBATE", defaultWeight: 0.12, description: "Challenges the thesis with downside and data-quality objections." },
  { id: "TRADER_AGENT", label: "TR", role: "Trader Agent", stage: "TRADER", defaultWeight: 0.2, description: "Converts the committee view into action, sizing, invalidation, and horizon." },
  { id: "AGGRESSIVE_RISK", label: "AR", role: "Aggressive Risk", stage: "RISK_COUNCIL", defaultWeight: 0.08, description: "Tests whether upside justifies volatility." },
  { id: "NEUTRAL_RISK", label: "NR", role: "Neutral Risk", stage: "RISK_COUNCIL", defaultWeight: 0.1, description: "Balances expected reward against uncertainty." },
  { id: "CONSERVATIVE_RISK", label: "CR", role: "Conservative Risk", stage: "RISK_COUNCIL", defaultWeight: 0.12, description: "Protects against drawdown and weak evidence." },
  { id: "TEAM_LEAD", label: "TL", role: "Team Lead", stage: "SYNTHESIS", defaultWeight: 0, description: "Summarizes the room before final portfolio approval." },
  { id: "PORTFOLIO_MANAGER", label: "PM", role: "Portfolio Manager", stage: "SYNTHESIS", defaultWeight: 0, description: "Aggregates committee evidence into the final recommendation." }
];

export const ANALYSIS_PIPELINE = AGENT_PROFILES.filter((agent) => agent.id !== "PORTFOLIO_MANAGER").map((agent) => agent.id);

export const MANAGER_WEIGHTS = Object.fromEntries(
  AGENT_PROFILES.map((agent) => [agent.id, agent.defaultWeight])
) as Record<AnalysisAgentType, number>;

type AgentEvidence = {
  agentType: string;
  recommendation?: Recommendation | string | null;
  confidence?: number | null;
  summary?: string | null;
  status: string;
  reasons?: unknown;
  errorReason?: string | null;
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

export function buildAgentAnalysis(agentType: AnalysisAgentType, ticker: string, context: MarketContext, evidence: AgentEvidence[] = []): AgentAnalysisOutput {
  switch (agentType) {
    case "TECHNICAL_ANALYST":
      return technicalAnalysis(ticker, context);
    case "NEWS_ANALYST":
      return newsAnalysis(ticker, context);
    case "FUNDAMENTALS_ANALYST":
      return fundamentalsAnalysis(ticker, context);
    case "RISK_ANALYST":
      return riskAnalysis(ticker, context);
    case "MACRO_ANALYST":
      return macroAnalysis(ticker, context);
    case "SENTIMENT_ANALYST":
      return sentimentAnalysis(ticker, context);
    case "QUANT_ANALYST":
      return quantAnalysis(ticker, context);
    case "CRYPTO_SPECIALIST":
      return cryptoSpecialistAnalysis(ticker, context);
    case "BULL_RESEARCHER":
      return bullResearch(ticker, context, evidence);
    case "BEAR_RESEARCHER":
      return bearResearch(ticker, context, evidence);
    case "TRADER_AGENT":
      return traderPlan(ticker, context, evidence);
    case "AGGRESSIVE_RISK":
      return riskCouncil(ticker, context, evidence, "aggressive");
    case "NEUTRAL_RISK":
      return riskCouncil(ticker, context, evidence, "neutral");
    case "CONSERVATIVE_RISK":
      return riskCouncil(ticker, context, evidence, "conservative");
    case "PORTFOLIO_MANAGER":
      return {
        score: 50,
        confidence: 0.5,
        recommendation: "HOLD",
        summary: `Portfolio Manager is waiting for specialist evidence on ${ticker}.`,
        reasons: ["Specialist analysis has not completed yet."]
      };
    case "TEAM_LEAD":
      return teamLeadSummary(ticker, context, evidence);
    default:
      return exhaustive(agentType);
  }
}

export function aggregatePortfolioManager(
  specialist: AgentEvidence[]
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

  let totalWeight = 0;
  let totalScore = 0;
  const reasons: string[] = [];
  const stanceScore: Record<Recommendation, number> = { BUY: 72, HOLD: 50, AVOID: 28 };

  for (const rec of completed) {
    const agentType = rec.agentType as AnalysisAgentType;
    const confidence = clamp(rec.confidence ?? 0.5, 0.2, 0.95);
    const weight = (MANAGER_WEIGHTS[agentType] ?? 0.2) * confidence;
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

  const conservativeRisk = completed.find((s) => s.agentType === "CONSERVATIVE_RISK");
  if (conservativeRisk?.recommendation === "AVOID" && (conservativeRisk.confidence ?? 0) >= 0.65) {
    score = Math.min(score, 48);
    reasons.push("Conservative Risk critique limited the final approval score.");
  }

  const trader = completed.find((s) => s.agentType === "TRADER_AGENT");
  if (trader?.recommendation === "HOLD" && score > 62) {
    score -= 4;
    reasons.push("Trader Agent preferred patience, so final score was moderated.");
  }

  const recommendation = recommendationFromScore(score);
  const averageConfidence = completed.reduce((sum, s) => sum + (s.confidence ?? 0.5), 0) / completed.length;
  const coverage = clamp(completed.length / 14, 0, 1);
  const confidence = clamp(0.35 + averageConfidence * 0.45 + coverage * 0.2, 0.45, 0.9);
  const conflict = new Set(completed.map((s) => s.recommendation)).size > 1;

  return {
    score: round(score, 1),
    confidence: round(confidence, 2),
    recommendation,
    summary: `Portfolio Manager ${recommendation === "BUY" ? "approves" : recommendation === "AVOID" ? "rejects" : "holds"} ${recommendation} with a ${Math.round(score)} composite score from ${completed.length}/14 agent opinions.`,
    reasons: [
      ...reasons,
      conflict ? "Specialists disagreed, so confidence was moderated." : "Specialists were broadly aligned.",
      coverage < 1 ? "Partial investment-committee coverage lowered confidence." : "All investment-committee outputs were available."
    ]
  };
}

export function buildAnalysisExplanation(run: {
  id: string;
  ticker: string;
  status: string;
  finalRec?: Recommendation | null;
  finalSummary?: string | null;
  errorReason?: string | null;
  recommendations: AgentEvidence[];
}) {
  const byAgent = new Map(run.recommendations.map((rec) => [rec.agentType, rec]));
  const stanceScore: Record<Recommendation, number> = { BUY: 72, HOLD: 50, AVOID: 28 };
  const voteMix: Record<Recommendation, number> = { BUY: 0, HOLD: 0, AVOID: 0 };
  let weightedScore = 0;
  let weightedConfidence = 0;
  let totalWeight = 0;

  const agents = AGENT_PROFILES.map((profile) => {
    const rec = byAgent.get(profile.id);
    const recommendation = isRecommendation(rec?.recommendation) ? rec.recommendation : null;
    const confidence = clamp(rec?.confidence ?? 0, 0, 1);
    const effectiveWeight = recommendation ? profile.defaultWeight * clamp(confidence || 0.5, 0.2, 0.95) : 0;
    const contribution = recommendation ? stanceScore[recommendation] * effectiveWeight : 0;
    if (recommendation) {
      voteMix[recommendation] += 1;
      weightedScore += contribution;
      weightedConfidence += confidence * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    return {
      agentType: profile.id,
      label: profile.label,
      role: profile.role,
      stage: profile.stage,
      description: profile.description,
      status: rec?.status ?? "PENDING",
      recommendation,
      confidence: rec?.confidence ?? null,
      baseWeight: profile.defaultWeight,
      effectiveWeight: round(effectiveWeight, 4),
      contribution: round(contribution, 2),
      summary: rec?.summary ?? null,
      reasons: normalizeReasons(rec?.reasons),
      errorReason: rec?.errorReason ?? null
    };
  });

  const completedAgents = agents.filter((agent) => agent.status === "COMPLETED" && agent.agentType !== "PORTFOLIO_MANAGER");
  const failedAgents = agents.filter((agent) => agent.status === "FAILED");
  const missingAgents = agents.filter((agent) => agent.status === "PENDING" || agent.status === "RUNNING");
  const manager = agents.find((agent) => agent.agentType === "PORTFOLIO_MANAGER");
  const score = totalWeight > 0 ? weightedScore / totalWeight : 50;
  const conflict = [voteMix.BUY, voteMix.HOLD, voteMix.AVOID].filter((count) => count > 0).length > 1;
  const topContributors = agents
    .filter((agent) => agent.agentType !== "PORTFOLIO_MANAGER" && agent.contribution > 0)
    .sort((a, b) => b.effectiveWeight - a.effectiveWeight)
    .slice(0, 5)
    .map((agent) => agent.agentType);

  const caveats: string[] = [];
  if (failedAgents.length > 0) caveats.push(`${failedAgents.length} agent${failedAgents.length === 1 ? "" : "s"} failed and were excluded from scoring.`);
  if (missingAgents.length > 0) caveats.push(`${missingAgents.length} agent${missingAgents.length === 1 ? "" : "s"} had not completed when this explanation was generated.`);
  if (conflict) caveats.push("Committee recommendations conflict, so confidence is moderated.");
  if (totalWeight === 0) caveats.push("No usable completed recommendations were available; fallback is HOLD.");

  return {
    analysisRunId: run.id,
    ticker: run.ticker.toUpperCase(),
    status: run.status,
    finalRec: run.finalRec ?? null,
    finalSummary: run.finalSummary ?? null,
    managerScore: round(score, 1),
    managerConfidence: manager?.confidence ?? (totalWeight > 0 ? round(weightedConfidence / totalWeight, 2) : 0.45),
    voteMix,
    coverage: {
      completed: completedAgents.length,
      total: AGENT_PROFILES.filter((agent) => agent.id !== "PORTFOLIO_MANAGER").length,
      failed: failedAgents.length,
      pending: missingAgents.length
    },
    topContributors,
    caveats,
    agents
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

function macroAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const f = context.fundamentals;
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  if (isFiniteNumber(f.beta)) {
    if (f.beta > 1.4) score -= 7;
    else if (f.beta < 0.9) score += 4;
    evidence += 1;
    reasons.push(`[${f.source}] Beta of ${round(f.beta, 2)} sets the macro sensitivity baseline.`);
  }

  if (isFiniteNumber(context.technicals?.volatility30d)) {
    const volatility = context.technicals.volatility30d;
    if (volatility > 35) score -= 8;
    else if (volatility < 18) score += 5;
    evidence += 1;
    reasons.push(`[${context.technicals.source}] 30-day volatility is ${formatPercent(volatility)}.`);
  }

  if (isFiniteNumber(f.revenueGrowth)) {
    if (f.revenueGrowth > 10) score += 5;
    if (f.revenueGrowth < 0) score -= 6;
    evidence += 1;
    reasons.push(`[${f.source}] Revenue growth suggests ${f.revenueGrowth >= 0 ? "cyclical resilience" : "cyclical pressure"}.`);
  }

  if (context.dataQuality.status === "LIVE" || context.dataQuality.status === "PARTIAL") {
    score += 3;
    reasons.push(`[${context.dataQuality.provider}] Macro read has usable provider coverage.`);
  }

  return finishAgent(ticker, "Macro Analyst", "beta, volatility, growth resilience, and provider coverage", score, evidence, context.dataQuality.score, reasons);
}

function sentimentAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  const sentimentScores = context.news.map((item) => item.sentimentScore ?? sentimentToScore(item.sentiment));
  if (sentimentScores.length > 0) {
    const average = sentimentScores.reduce((sum, value) => sum + value, 0) / sentimentScores.length;
    score += average * 34;
    evidence += Math.min(sentimentScores.length, 5) / 2;
    reasons.push(`[news] Crowd/news tone is ${sentimentLabel(average)} across ${sentimentScores.length} headline${sentimentScores.length === 1 ? "" : "s"}.`);
  }

  if (context.analystTrend) {
    score += context.analystTrend.consensus === "BUY" ? 6 : context.analystTrend.consensus === "AVOID" ? -6 : 0;
    evidence += 1;
    reasons.push(`[${context.analystTrend.source}] Analyst consensus contributes a ${context.analystTrend.consensus} sentiment anchor.`);
  }

  if (Math.abs(context.quote.changePercent) >= 2) {
    score += clamp(context.quote.changePercent, -5, 5);
    evidence += 1;
    reasons.push(`[${context.quote.source}] Price reaction of ${formatPercent(context.quote.changePercent)} confirms sentiment intensity.`);
  }

  return finishAgent(ticker, "Sentiment Analyst", "headline tone, analyst consensus, and market reaction", score, evidence, context.dataQuality.score, reasons);
}

function quantAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const f = context.fundamentals;
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  if (context.technicals?.trend === "UP") score += 10;
  if (context.technicals?.trend === "DOWN") score -= 10;
  if (context.technicals) {
    evidence += 1;
    reasons.push(`[${context.technicals.source}] Trend factor is ${context.technicals.trend.toLowerCase()}.`);
  }

  if (context.technicals?.volumeTrend === "RISING" && context.quote.changePercent > 0) score += 5;
  if (context.technicals?.volumeTrend === "RISING" && context.quote.changePercent < 0) score -= 5;
  if (context.technicals) {
    evidence += 1;
    reasons.push(`[${context.technicals.source}] Volume factor is ${context.technicals.volumeTrend.toLowerCase()}.`);
  }

  if (isFiniteNumber(f.forwardPe) && isFiniteNumber(f.revenueGrowth)) {
    const growthAdjusted = f.forwardPe / Math.max(1, Math.abs(f.revenueGrowth));
    if (growthAdjusted < 1.8) score += 7;
    else if (growthAdjusted > 4) score -= 7;
    evidence += 1;
    reasons.push(`[${f.source}] Growth-adjusted valuation factor is ${round(growthAdjusted, 2)}.`);
  }

  if (isFiniteNumber(context.technicals?.maxDrawdown)) {
    const drawdown = context.technicals.maxDrawdown;
    if (drawdown > 30) score -= 6;
    evidence += 1;
    reasons.push(`[${context.technicals.source}] Max drawdown factor is ${formatPercent(drawdown)}.`);
  }

  return finishAgent(ticker, "Quant Analyst", "trend, volume, valuation, and drawdown factors", score, evidence, context.dataQuality.score, reasons);
}

function cryptoSpecialistAnalysis(ticker: string, context: MarketContext): AgentAnalysisOutput {
  const reasons: string[] = [];
  let score = 50;
  let evidence = 0;

  const symbol = ticker.toUpperCase();
  const cryptoAdjacent = ["COIN", "MSTR", "MARA", "RIOT", "HOOD", "SQ", "PYPL", "TSLA"].includes(symbol);
  if (cryptoAdjacent) {
    score += context.quote.changePercent >= 0 ? 5 : -7;
    evidence += 1;
    reasons.push(`[liquidity] ${symbol} is crypto-adjacent, so risk-asset liquidity can amplify moves.`);
  } else {
    score += 1;
    evidence += 0.5;
    reasons.push("[liquidity] No direct crypto-beta flag; crypto liquidity is a secondary consideration.");
  }

  if (isFiniteNumber(context.technicals?.volatility30d)) {
    const volatility = context.technicals.volatility30d;
    if (volatility > 40) score -= 6;
    else if (volatility < 22) score += 3;
    evidence += 1;
    reasons.push(`[${context.technicals.source}] Volatility read is ${formatPercent(volatility)}.`);
  }

  if (context.dataQuality.score < 0.7) {
    score -= 4;
    reasons.push("[data-quality] Thin evidence makes cross-asset liquidity signals less reliable.");
  }

  return finishAgent(ticker, "Crypto Specialist", "crypto-beta exposure, liquidity sensitivity, and volatility", score, evidence, context.dataQuality.score, reasons);
}

function bullResearch(ticker: string, context: MarketContext, evidence: AgentEvidence[]): AgentAnalysisOutput {
  const completed = completedEvidence(evidence);
  const reasons: string[] = [];
  let score = 50;
  let evidenceCount = 0;

  for (const item of completed.filter((agent) => agent.recommendation === "BUY")) {
    const confidence = item.confidence ?? 0.5;
    score += confidence * 8;
    evidenceCount += 1;
    reasons.push(`[${humanAgent(item.agentType as AnalysisAgentType)}] BUY case: ${firstReason(item)}`);
  }

  if (context.technicals?.trend === "UP") {
    score += 8;
    evidenceCount += 1;
    reasons.push(`[${context.technicals.source}] Trend supports a bullish thesis.`);
  }
  if (isFiniteNumber(context.fundamentals.revenueGrowth) && context.fundamentals.revenueGrowth > 8) {
    score += 7;
    evidenceCount += 1;
    reasons.push(`[${context.fundamentals.source}] Revenue growth gives the bull case operating support.`);
  }
  if (context.dataQuality.status === "LIVE" || context.dataQuality.status === "PARTIAL") {
    score += 4;
    reasons.push(`[${context.dataQuality.provider}] Evidence is usable enough to argue an upside case.`);
  }

  return finishAgent(ticker, "Bull Researcher", "the strongest upside evidence from specialists", score, evidenceCount, context.dataQuality.score, reasons);
}

function bearResearch(ticker: string, context: MarketContext, evidence: AgentEvidence[]): AgentAnalysisOutput {
  const completed = completedEvidence(evidence);
  const reasons: string[] = [];
  let score = 50;
  let evidenceCount = 0;

  for (const item of completed.filter((agent) => agent.recommendation === "AVOID")) {
    const confidence = item.confidence ?? 0.5;
    score -= confidence * 9;
    evidenceCount += 1;
    reasons.push(`[${humanAgent(item.agentType as AnalysisAgentType)}] Bear concern: ${firstReason(item)}`);
  }

  if (context.dataQuality.status === "UNSUPPORTED" || context.dataQuality.status === "DEMO") {
    score -= 14;
    evidenceCount += 1;
    reasons.push(`[data-quality] Missing live evidence weakens any confident trade.`);
  }
  if (isFiniteNumber(context.fundamentals.peRatio) && context.fundamentals.peRatio > 42) {
    score -= 8;
    evidenceCount += 1;
    reasons.push(`[${context.fundamentals.source}] Valuation leaves less room for execution mistakes.`);
  }
  if (context.technicals?.trend === "DOWN") {
    score -= 8;
    evidenceCount += 1;
    reasons.push(`[${context.technicals.source}] Trend gives the bear case timing support.`);
  }

  return finishAgent(ticker, "Bear Researcher", "the strongest downside and data-quality objections", score, evidenceCount, context.dataQuality.score, reasons);
}

function traderPlan(ticker: string, context: MarketContext, evidence: AgentEvidence[]): AgentAnalysisOutput {
  const completed = completedEvidence(evidence);
  const specialists = completed.filter((item) =>
    ["TECHNICAL_ANALYST", "NEWS_ANALYST", "FUNDAMENTALS_ANALYST", "RISK_ANALYST", "BULL_RESEARCHER", "BEAR_RESEARCHER"].includes(item.agentType)
  );
  const score = scoreFromEvidence(specialists, 50);
  const recommendation = recommendationFromScore(score);
  const quote = context.quote.price;
  const volatility = context.technicals?.volatility30d ?? 25;
  const riskSize = volatility > 45 || context.dataQuality.score < 0.6 ? "small 2-4%" : volatility > 25 ? "moderate 4-6%" : "standard 6-8%";
  const invalidation =
    recommendation === "BUY"
      ? `${formatMoneyLike(quote * 0.92)} or a break in the evidence trend`
      : recommendation === "AVOID"
        ? "wait for live evidence to improve or the bear thesis to clear"
        : "wait for a stronger specialist majority";
  const horizon = recommendation === "BUY" ? "2-6 weeks" : recommendation === "AVOID" ? "no entry until risk improves" : "watchlist only";
  const reasons = [
    `[plan] Action: ${recommendation}.`,
    `[plan] Position size hint: ${riskSize} of simulated portfolio.`,
    `[plan] Entry rationale: ${firstCompletedSummary(specialists)}`,
    `[plan] Invalidation: ${invalidation}.`,
    `[plan] Holding horizon: ${horizon}.`
  ];

  return {
    score: round(clamp(score, 0, 100), 1),
    confidence: round(clamp(0.42 + context.dataQuality.score * 0.24 + specialists.length * 0.035, 0.42, 0.88), 2),
    recommendation,
    summary: `Trader Agent proposes ${recommendation} for ${ticker.toUpperCase()} with ${riskSize} sizing and ${horizon} horizon.`,
    reasons
  };
}

function riskCouncil(ticker: string, context: MarketContext, evidence: AgentEvidence[], posture: "aggressive" | "neutral" | "conservative"): AgentAnalysisOutput {
  const trader = completedEvidence(evidence).find((item) => item.agentType === "TRADER_AGENT");
  const traderScore = scoreFromEvidence(trader ? [trader] : [], 50);
  const riskPenalty = riskPenaltyFromContext(context);
  const postureAdjustment = posture === "aggressive" ? 8 : posture === "conservative" ? -8 : 0;
  const dataPenalty = context.dataQuality.score < 0.65 ? 8 : 0;
  const score = traderScore + postureAdjustment - riskPenalty - dataPenalty;
  const label = posture === "aggressive" ? "Aggressive Risk" : posture === "neutral" ? "Neutral Risk" : "Conservative Risk";
  const reasons = [
    `[trader] Trader plan was ${trader?.recommendation ?? "HOLD"} with ${Math.round((trader?.confidence ?? 0.5) * 100)}% confidence.`,
    `[risk] Context risk penalty is ${round(riskPenalty, 1)} points from volatility, beta, drawdown, and data quality.`,
    `[risk] ${label} posture adjustment is ${postureAdjustment >= 0 ? "+" : ""}${postureAdjustment} points.`
  ];

  if (context.dataQuality.score < 0.65) reasons.push("[data-quality] Weak evidence requires smaller sizing or no trade.");

  return finishAgent(ticker, label, `${posture} critique of the trader plan`, score, 3, context.dataQuality.score, reasons);
}

function teamLeadSummary(ticker: string, context: MarketContext, evidence: AgentEvidence[]): AgentAnalysisOutput {
  const completed = completedEvidence(evidence).filter((item) => item.agentType !== "TEAM_LEAD" && item.agentType !== "PORTFOLIO_MANAGER");
  const score = scoreFromEvidence(completed, 50);
  const recommendation = recommendationFromScore(score);
  const buyCount = completed.filter((item) => item.recommendation === "BUY").length;
  const holdCount = completed.filter((item) => item.recommendation === "HOLD").length;
  const avoidCount = completed.filter((item) => item.recommendation === "AVOID").length;
  const reasons = [
    `[committee] Vote mix: ${buyCount} BUY, ${holdCount} HOLD, ${avoidCount} AVOID.`,
    `[committee] Strongest current point: ${firstCompletedSummary(completed)}`,
    `[data-quality] Evidence status is ${context.dataQuality.status} at ${Math.round(context.dataQuality.score * 100)}%.`
  ];

  if (new Set(completed.map((item) => item.recommendation)).size > 1) {
    reasons.push("[committee] Disagreement remains, so final communication should name the main tradeoff.");
  }

  return {
    score: round(clamp(score, 0, 100), 1),
    confidence: round(clamp(0.4 + context.dataQuality.score * 0.22 + completed.length * 0.025, 0.4, 0.9), 2),
    recommendation,
    summary: `Team Lead summarizes ${ticker.toUpperCase()} as ${recommendation} after ${completed.length} committee inputs.`,
    reasons
  };
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

function completedEvidence(evidence: AgentEvidence[]) {
  return evidence.filter((item) => item.status === "COMPLETED" && isRecommendation(item.recommendation));
}

function scoreFromEvidence(evidence: AgentEvidence[], fallback: number) {
  const stanceScore: Record<Recommendation, number> = { BUY: 72, HOLD: 50, AVOID: 28 };
  let total = 0;
  let weight = 0;
  for (const item of evidence) {
    if (!isRecommendation(item.recommendation)) continue;
    const confidence = clamp(item.confidence ?? 0.5, 0.2, 0.95);
    total += stanceScore[item.recommendation] * confidence;
    weight += confidence;
  }
  return weight > 0 ? total / weight : fallback;
}

function isRecommendation(value: unknown): value is Recommendation {
  return value === "BUY" || value === "HOLD" || value === "AVOID";
}

function riskPenaltyFromContext(context: MarketContext) {
  let penalty = 0;
  const volatility = context.technicals?.volatility30d;
  const maxDrawdown = context.technicals?.maxDrawdown;
  if (isFiniteNumber(context.fundamentals.beta) && context.fundamentals.beta > 1.25) penalty += Math.min((context.fundamentals.beta - 1.25) * 10, 8);
  if (isFiniteNumber(volatility) && volatility > 25) penalty += Math.min((volatility - 25) / 4, 10);
  if (isFiniteNumber(maxDrawdown) && maxDrawdown > 20) penalty += Math.min((maxDrawdown - 20) / 5, 8);
  if (context.dataQuality.status === "UNSUPPORTED") penalty += 10;
  else if (context.dataQuality.status === "DEMO") penalty += 7;
  else if (context.dataQuality.status === "PARTIAL") penalty += 3;
  return penalty;
}

function firstReason(item: AgentEvidence) {
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  return reasons.find((reason): reason is string => typeof reason === "string" && reason.length > 0) ?? item.summary ?? "specialist evidence was directionally supportive.";
}

function normalizeReasons(value: unknown) {
  return Array.isArray(value) ? value.filter((reason): reason is string => typeof reason === "string") : [];
}

function firstCompletedSummary(evidence: AgentEvidence[]) {
  return evidence.find((item) => item.summary)?.summary ?? "specialist evidence did not produce a clear entry thesis.";
}

function formatMoneyLike(value: number) {
  return `$${round(value, 2)}`;
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
