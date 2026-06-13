import { z } from "zod";

export const tickerSchema = z.string().trim().min(1).max(10).toUpperCase();
export const recommendationSchema = z.enum(["BUY", "HOLD", "AVOID"]);
export const agentStatusSchema = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
export const dataQualityStatusSchema = z.enum(["LIVE", "PARTIAL", "DELAYED", "UNSUPPORTED", "DEMO"]);
export const orderStatusSchema = z.enum(["PENDING", "FILLED", "PARTIALLY_FILLED", "CANCELED", "REJECTED", "EXPIRED"]);
export const cryptoSymbolSchema = z.enum(["BTC", "ETH", "SOL"]);
export const cryptoTraderActionSchema = z.enum(["BUY", "SELL", "HOLD"]);
export const cryptoStrategyModeSchema = z.enum(["BALANCED", "AGGRESSIVE"]);
export const agentTypeSchema = z.enum([
  "TECHNICAL_ANALYST",
  "NEWS_ANALYST",
  "FUNDAMENTALS_ANALYST",
  "RISK_ANALYST",
  "MACRO_ANALYST",
  "SENTIMENT_ANALYST",
  "QUANT_ANALYST",
  "CRYPTO_SPECIALIST",
  "BULL_RESEARCHER",
  "BEAR_RESEARCHER",
  "TRADER_AGENT",
  "AGGRESSIVE_RISK",
  "NEUTRAL_RISK",
  "CONSERVATIVE_RISK",
  "PORTFOLIO_MANAGER",
  "TEAM_LEAD"
]);

export const quoteSchema = z.object({
  ticker: tickerSchema,
  price: z.number().nonnegative(),
  change: z.number(),
  changePercent: z.number(),
  updatedAt: z.string(),
  source: z.string()
});

export const historicalCandleSchema = z.object({
  ticker: tickerSchema,
  date: z.string(),
  open: z.number().nonnegative(),
  high: z.number().nonnegative(),
  low: z.number().nonnegative(),
  close: z.number().nonnegative(),
  volume: z.number().nonnegative(),
  source: z.string()
});

export const technicalIndicatorsSchema = z.object({
  sma20: z.number().nullable(),
  sma50: z.number().nullable(),
  volatility30d: z.number().nullable(),
  maxDrawdown: z.number().nullable(),
  trend: z.enum(["UP", "DOWN", "SIDEWAYS", "UNKNOWN"]),
  volumeTrend: z.enum(["RISING", "FALLING", "STABLE", "UNKNOWN"]),
  source: z.string()
});

export const newsItemSchema = z.object({
  headline: z.string(),
  summary: z.string().optional(),
  url: z.string().optional(),
  source: z.string(),
  publishedAt: z.string().optional(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentScore: z.number().min(-1).max(1).optional()
});

export const fundamentalsSchema = z.object({
  peRatio: z.number().nullable().optional(),
  forwardPe: z.number().nullable().optional(),
  marketCap: z.number().nullable().optional(),
  beta: z.number().nullable().optional(),
  revenueGrowth: z.number().nullable().optional(),
  epsGrowth: z.number().nullable().optional(),
  grossMargin: z.number().nullable().optional(),
  netMargin: z.number().nullable().optional(),
  roe: z.number().nullable().optional(),
  debtToEquity: z.number().nullable().optional(),
  currentRatio: z.number().nullable().optional(),
  priceToSales: z.number().nullable().optional(),
  dividendYield: z.number().nullable().optional(),
  week52High: z.number().nullable().optional(),
  week52Low: z.number().nullable().optional(),
  week52Return: z.number().nullable().optional(),
  tenDayAverageVolume: z.number().nullable().optional(),
  threeMonthAverageVolume: z.number().nullable().optional(),
  source: z.string()
});

export const analystTrendSchema = z.object({
  period: z.string().optional(),
  strongBuy: z.number().int().nonnegative(),
  buy: z.number().int().nonnegative(),
  hold: z.number().int().nonnegative(),
  sell: z.number().int().nonnegative(),
  strongSell: z.number().int().nonnegative(),
  consensus: recommendationSchema,
  source: z.string()
});

export const sourceAuditEntrySchema = z.object({
  provider: z.string(),
  status: dataQualityStatusSchema,
  used: z.boolean(),
  asOf: z.string().optional(),
  warnings: z.array(z.string()),
  missingReason: z.string().optional()
});

export const sourceAuditSchema = z.object({
  quote: sourceAuditEntrySchema,
  history: sourceAuditEntrySchema,
  fundamentals: sourceAuditEntrySchema,
  filings: sourceAuditEntrySchema,
  macro: sourceAuditEntrySchema,
  news: sourceAuditEntrySchema,
  sentiment: sourceAuditEntrySchema,
  analystTrend: sourceAuditEntrySchema,
  crypto: sourceAuditEntrySchema
});

export const macroSeriesPointSchema = z.object({
  series: z.string(),
  label: z.string(),
  value: z.number(),
  date: z.string(),
  source: z.string()
});

export const cryptoContextSchema = z.object({
  asset: z.string(),
  priceUsd: z.number().nonnegative(),
  change24hPercent: z.number(),
  marketCapUsd: z.number().nonnegative().optional(),
  volume24hUsd: z.number().nonnegative().optional(),
  source: z.string(),
  updatedAt: z.string()
});

export const cryptoCandleSchema = z.object({
  timestamp: z.string(),
  open: z.number().nonnegative(),
  high: z.number().nonnegative(),
  low: z.number().nonnegative(),
  close: z.number().nonnegative(),
  volume: z.number().nonnegative()
});

export const marketContextSchema = z.object({
  ticker: tickerSchema,
  quote: quoteSchema,
  fundamentals: fundamentalsSchema,
  technicals: technicalIndicatorsSchema.optional(),
  news: z.array(newsItemSchema),
  analystTrend: analystTrendSchema.nullable(),
  generatedAt: z.string(),
  sourceAudit: sourceAuditSchema.optional(),
  macroSeries: z.array(macroSeriesPointSchema).optional(),
  cryptoContext: cryptoContextSchema.nullable().optional(),
  socialSentiment: z.array(newsItemSchema).optional(),
  dataQuality: z.object({
    score: z.number().min(0).max(1),
    status: dataQualityStatusSchema,
    provider: z.string(),
    liveQuote: z.boolean(),
    fundamentals: z.boolean(),
    news: z.boolean(),
    analystTrend: z.boolean(),
    warnings: z.array(z.string()),
    messages: z.array(z.string())
  })
});

export const providerCapabilitySchema = z.object({
  name: z.string(),
  priority: z.number().int().nonnegative(),
  status: z.enum(["ENABLED", "DISABLED", "DEMO"]),
  supportsSearch: z.boolean(),
  supportsQuotes: z.boolean(),
  supportsFundamentals: z.boolean(),
  supportsNews: z.boolean(),
  supportsAnalystTrend: z.boolean(),
  supportsHistory: z.boolean(),
  supportsBatch: z.boolean(),
  minPollMs: z.number().int().positive(),
  notes: z.array(z.string())
});

export const providerCapabilitiesSchema = z.object({
  providers: z.array(providerCapabilitySchema)
});

export const systemComponentSchema = z.object({
  name: z.string(),
  status: z.enum(["OK", "DEGRADED", "DOWN"]),
  message: z.string(),
  checkedAt: z.string()
});

export const systemHealthSchema = z.object({
  ok: z.boolean(),
  status: z.enum(["OK", "DEGRADED", "DOWN"]),
  service: z.literal("pixelfund-api"),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  checkedAt: z.string(),
  components: z.object({
    api: systemComponentSchema,
    database: systemComponentSchema,
    redis: systemComponentSchema,
    marketData: systemComponentSchema,
    ai: systemComponentSchema
  })
});

export const historyRangeSchema = z.enum(["1d", "1mo", "6mo", "1y"]);
export const stockHistorySchema = z.object({
  ticker: tickerSchema,
  range: historyRangeSchema,
  candles: z.array(historicalCandleSchema),
  technicals: technicalIndicatorsSchema,
  dataQuality: z.object({
    status: dataQualityStatusSchema,
    provider: z.string(),
    messages: z.array(z.string())
  })
});

export const tradeCreateSchema = z.object({
  ticker: tickerSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  orderType: z.enum(["MARKET", "LIMIT", "STOP"]).default("MARKET"),
  limitPrice: z.number().positive().optional(),
  stopPrice: z.number().positive().optional()
});

export const tradePreviewSchema = z.object({
  ticker: tickerSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  orderType: z.enum(["MARKET", "LIMIT", "STOP"]),
  currentPrice: z.number().nonnegative(),
  estimatedPrice: z.number().nonnegative(),
  estimatedGross: z.number().nonnegative(),
  projectedCash: z.number(),
  projectedShares: z.number().nonnegative(),
  executableNow: z.boolean(),
  sizingHint: z.object({
    maxAffordableShares: z.number().nonnegative(),
    currentExposurePercent: z.number().nonnegative(),
    projectedExposurePercent: z.number().nonnegative(),
    suggestedMaxShares: z.number().nonnegative(),
    message: z.string()
  }),
  warnings: z.array(z.string())
});

export const orderCreateSchema = tradeCreateSchema;

export const orderPreviewSchema = tradePreviewSchema.extend({
  tradable: z.boolean(),
  quoteSource: z.string(),
  quoteUpdatedAt: z.string(),
  dataQualityStatus: dataQualityStatusSchema,
  blockingReasons: z.array(z.string())
});

export const analysisRunCreateSchema = z.object({
  ticker: tickerSchema,
  idempotencyKey: z.string().min(1).max(128).optional()
});

export const backtestCreateSchema = z.object({
  ticker: tickerSchema,
  from: z.string(),
  to: z.string(),
  strategy: z.enum(["PORTFOLIO_MANAGER_REPLAY"])
});

export const backtestResultSchema = z.object({
  ticker: tickerSchema,
  strategy: z.literal("PORTFOLIO_MANAGER_REPLAY"),
  from: z.string(),
  to: z.string(),
  trades: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  simulatedPnl: z.number(),
  maxDrawdown: z.number(),
  recommendationAccuracy: z.number().min(0).max(1),
  startValue: z.number(),
  endValue: z.number(),
  dataQuality: z.object({
    status: dataQualityStatusSchema,
    provider: z.string(),
    messages: z.array(z.string())
  })
});
export const watchlistItemSchema = z.object({
  id: z.string(),
  ticker: tickerSchema,
  createdAt: z.coerce.string()
});

export const portfolioPositionSchema = z.object({
  ticker: tickerSchema,
  quantity: z.number().nonnegative(),
  averageCost: z.number().nonnegative(),
  marketPrice: z.number().nonnegative(),
  marketValue: z.number().nonnegative(),
  unrealizedPnl: z.number(),
  unrealizedPnlPercent: z.number(),
  costBasis: z.number().nonnegative(),
  portfolioWeight: z.number().nonnegative()
});

export const portfolioSchema = z.object({
  accountKey: z.string(),
  cash: z.number(),
  totalValue: z.number(),
  totalPnl: z.number(),
  totalPnlPercent: z.number(),
  realizedPnl: z.number(),
  totalUnrealizedPnl: z.number(),
  positions: z.array(portfolioPositionSchema)
});

export const tradeSchema = z.object({
  id: z.string(),
  orderId: z.string().nullable().optional(),
  ticker: tickerSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  orderType: z.enum(["MARKET", "LIMIT", "STOP"]).optional(),
  requestedPrice: z.number().nullable().optional(),
  createdAt: z.coerce.string()
});

export const orderSchema = z.object({
  id: z.string(),
  ticker: tickerSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  filledQuantity: z.number().nonnegative(),
  status: orderStatusSchema,
  orderType: z.enum(["MARKET", "LIMIT", "STOP"]),
  limitPrice: z.number().nullable().optional(),
  stopPrice: z.number().nullable().optional(),
  averageFillPrice: z.number().nullable().optional(),
  lastCheckedPrice: z.number().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
  filledAt: z.coerce.string().nullable().optional(),
  canceledAt: z.coerce.string().nullable().optional(),
  expiresAt: z.coerce.string().nullable().optional()
});

export const agentResultSchema = z.object({
  id: z.string(),
  analysisRunId: z.string(),
  agentType: agentTypeSchema,
  status: agentStatusSchema,
  errorReason: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  recommendation: recommendationSchema.nullable().optional(),
  reasons: z.array(z.string()).nullable().optional(),
  createdAt: z.coerce.string().optional(),
  updatedAt: z.coerce.string().optional()
});

export const agentExplanationStageSchema = z.enum(["SPECIALIST", "DEBATE", "TRADER", "RISK_COUNCIL", "SYNTHESIS"]);

export const agentExplanationItemSchema = z.object({
  agentType: agentTypeSchema,
  label: z.string(),
  role: z.string(),
  stage: agentExplanationStageSchema,
  description: z.string(),
  status: agentStatusSchema.or(z.literal("IDLE")),
  recommendation: recommendationSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  baseWeight: z.number().nonnegative(),
  effectiveWeight: z.number().nonnegative(),
  contribution: z.number().nonnegative(),
  summary: z.string().nullable(),
  reasons: z.array(z.string()),
  errorReason: z.string().nullable()
});

export const analysisExplanationSchema = z.object({
  analysisRunId: z.string(),
  ticker: tickerSchema,
  status: agentStatusSchema,
  finalRec: recommendationSchema.nullable(),
  finalSummary: z.string().nullable(),
  managerScore: z.number(),
  managerConfidence: z.number().min(0).max(1),
  voteMix: z.object({
    BUY: z.number().int().nonnegative(),
    HOLD: z.number().int().nonnegative(),
    AVOID: z.number().int().nonnegative()
  }),
  coverage: z.object({
    completed: z.number().int().nonnegative(),
    total: z.number().int().positive(),
    failed: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative()
  }),
  topContributors: z.array(agentTypeSchema),
  caveats: z.array(z.string()),
  agents: z.array(agentExplanationItemSchema)
});

export const cryptoTraderSettingsSchema = z.object({
  id: z.string(),
  ownerKey: z.string(),
  enabled: z.boolean(),
  selectedCoins: z.array(cryptoSymbolSchema).min(1).max(2),
  maxTradesPerDay: z.number().int().min(1).max(30),
  stopLossPercent: z.number().min(1).max(25),
  maxPortfolioPercent: z.number().min(1).max(20),
  strategyMode: cryptoStrategyModeSchema,
  aggressiveStartedAt: z.coerce.string().nullable().optional(),
  aggressiveExpiresAt: z.coerce.string().nullable().optional(),
  lastCheckedAt: z.coerce.string().nullable().optional(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string()
});

export const cryptoTraderSettingsUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  selectedCoins: z.array(cryptoSymbolSchema).min(1).max(2).optional(),
  maxTradesPerDay: z.number().int().min(1).max(30).optional(),
  stopLossPercent: z.number().min(1).max(25).optional(),
  maxPortfolioPercent: z.number().min(1).max(20).optional(),
  strategyMode: cryptoStrategyModeSchema.optional()
});

export const cryptoTraderLogSchema = z.object({
  id: z.string(),
  ownerKey: z.string(),
  swedenDay: z.string(),
  ticker: cryptoSymbolSchema,
  coinId: z.string(),
  action: cryptoTraderActionSchema,
  score: z.number(),
  reason: z.string(),
  reasons: z.array(z.string()),
  price: z.number().nullable().optional(),
  quantity: z.number().nullable().optional(),
  notional: z.number().nullable().optional(),
  tradeId: z.string().nullable().optional(),
  createdAt: z.coerce.string()
});

export const cryptoTraderCheckResultSchema = z.object({
  checkedAt: z.string(),
  tradesToday: z.number().int().nonnegative(),
  settings: cryptoTraderSettingsSchema,
  logs: z.array(cryptoTraderLogSchema)
});

export const cryptoCashAdjustmentSchema = z.object({
  amount: z.union([z.literal(10000), z.literal(-10000)])
});

export const cryptoTraderClearDataResultSchema = z.object({
  deletedAnalysisRuns: z.number().int().nonnegative(),
  deletedAgentResults: z.number().int().nonnegative(),
  deletedCryptoLogs: z.number().int().nonnegative(),
  deletedCryptoSettings: z.number().int().nonnegative(),
  deletedTrades: z.number().int().nonnegative(),
  deletedOrders: z.number().int().nonnegative(),
  deletedPositions: z.number().int().nonnegative(),
  deletedWatchlistItems: z.number().int().nonnegative(),
  deletedAccounts: z.number().int().nonnegative()
});

export const analysisRunSchema = z.object({
  id: z.string(),
  ticker: tickerSchema,
  status: agentStatusSchema,
  finalSummary: z.string().nullable(),
  finalRec: recommendationSchema.nullable(),
  errorReason: z.string().nullable(),
  createdAt: z.coerce.string(),
  updatedAt: z.coerce.string(),
  recommendations: z.array(agentResultSchema)
});

export const wsQuoteUpdatedSchema = quoteSchema;
export const wsQuoteStaleSchema = z.object({
  ticker: tickerSchema,
  lastUpdatedAt: z.string()
});

export const wsAgentStartedSchema = z.object({
  analysisRunId: z.string(),
  agentType: agentTypeSchema,
  status: z.literal("RUNNING")
});

export const wsAgentCompletedSchema = agentResultSchema;
export const wsAgentFailedSchema = z.object({
  analysisRunId: z.string(),
  agentType: agentTypeSchema,
  status: z.literal("FAILED"),
  errorReason: z.string()
});

export const wsPortfolioRecommendationCompletedSchema = agentResultSchema;
export const wsPortfolioRecommendationFailedSchema = z.object({
  analysisRunId: z.string(),
  status: z.literal("FAILED"),
  errorReason: z.string()
});
export const wsOrderCreatedSchema = orderSchema;
export const wsOrderUpdatedSchema = orderSchema;
export const wsOrderFilledSchema = orderSchema;

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string()
  })
});

export const successEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: z.record(z.unknown()).optional()
  });

export type Quote = z.infer<typeof quoteSchema>;
export type HistoricalCandle = z.infer<typeof historicalCandleSchema>;
export type TechnicalIndicators = z.infer<typeof technicalIndicatorsSchema>;
export type NewsItem = z.infer<typeof newsItemSchema>;
export type Fundamentals = z.infer<typeof fundamentalsSchema>;
export type AnalystTrend = z.infer<typeof analystTrendSchema>;
export type MarketContext = z.infer<typeof marketContextSchema>;
export type StockHistory = z.infer<typeof stockHistorySchema>;
export type BacktestCreateInput = z.infer<typeof backtestCreateSchema>;
export type BacktestResult = z.infer<typeof backtestResultSchema>;
export type ProviderCapabilities = z.infer<typeof providerCapabilitiesSchema>;
export type SystemHealth = z.infer<typeof systemHealthSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;
export type TradePreview = z.infer<typeof tradePreviewSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderPreview = z.infer<typeof orderPreviewSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type CryptoSymbol = z.infer<typeof cryptoSymbolSchema>;
export type CryptoStrategyMode = z.infer<typeof cryptoStrategyModeSchema>;
export type CryptoTraderSettings = z.infer<typeof cryptoTraderSettingsSchema>;
export type CryptoTraderSettingsUpdate = z.infer<typeof cryptoTraderSettingsUpdateSchema>;
export type CryptoTraderLog = z.infer<typeof cryptoTraderLogSchema>;
export type CryptoTraderClearDataResult = z.infer<typeof cryptoTraderClearDataResultSchema>;
export type AnalysisRun = z.infer<typeof analysisRunSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
export type AnalysisExplanation = z.infer<typeof analysisExplanationSchema>;
