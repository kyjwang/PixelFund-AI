import { z } from "zod";

export const tickerSchema = z.string().trim().min(1).max(10).toUpperCase();
export const recommendationSchema = z.enum(["BUY", "HOLD", "AVOID"]);
export const agentStatusSchema = z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]);
export const dataQualityStatusSchema = z.enum(["LIVE", "PARTIAL", "DELAYED", "UNSUPPORTED", "DEMO"]);
export const agentTypeSchema = z.enum([
  "TECHNICAL_ANALYST",
  "NEWS_ANALYST",
  "FUNDAMENTALS_ANALYST",
  "RISK_ANALYST",
  "PORTFOLIO_MANAGER"
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

export const marketContextSchema = z.object({
  ticker: tickerSchema,
  quote: quoteSchema,
  fundamentals: fundamentalsSchema,
  technicals: technicalIndicatorsSchema.optional(),
  news: z.array(newsItemSchema),
  analystTrend: analystTrendSchema.nullable(),
  generatedAt: z.string(),
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
  quantity: z.number().int().positive()
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
  quantity: z.number().int().nonnegative(),
  averageCost: z.number().nonnegative(),
  marketPrice: z.number().nonnegative(),
  marketValue: z.number().nonnegative(),
  unrealizedPnl: z.number()
});

export const portfolioSchema = z.object({
  cash: z.number(),
  totalValue: z.number(),
  totalPnl: z.number(),
  realizedPnl: z.number(),
  totalUnrealizedPnl: z.number(),
  positions: z.array(portfolioPositionSchema)
});

export const tradeSchema = z.object({
  id: z.string(),
  ticker: tickerSchema,
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
  createdAt: z.coerce.string()
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
export type Portfolio = z.infer<typeof portfolioSchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;
export type AnalysisRun = z.infer<typeof analysisRunSchema>;
export type AgentResult = z.infer<typeof agentResultSchema>;
