export type Quote = {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  source: string;
};

export type NewsItem = {
  headline: string;
  summary?: string;
  url?: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore?: number;
  source: string;
  publishedAt?: string;
};

export type Fundamentals = {
  peRatio?: number | null;
  forwardPe?: number | null;
  marketCap?: number | null;
  beta?: number | null;
  revenueGrowth?: number | null;
  epsGrowth?: number | null;
  grossMargin?: number | null;
  netMargin?: number | null;
  roe?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  priceToSales?: number | null;
  dividendYield?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
  week52Return?: number | null;
  tenDayAverageVolume?: number | null;
  threeMonthAverageVolume?: number | null;
  source: string;
};

export type AnalystTrend = {
  period?: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: "BUY" | "HOLD" | "AVOID";
  source: string;
};

export type HistoricalCandle = {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
};

export type TechnicalIndicators = {
  sma20: number | null;
  sma50: number | null;
  volatility30d: number | null;
  maxDrawdown: number | null;
  trend: "UP" | "DOWN" | "SIDEWAYS" | "UNKNOWN";
  volumeTrend: "RISING" | "FALLING" | "STABLE" | "UNKNOWN";
  source: string;
};

export type DataQualityStatus = "LIVE" | "PARTIAL" | "DELAYED" | "UNSUPPORTED" | "DEMO";

export type SourceAuditCategory =
  | "quote"
  | "history"
  | "fundamentals"
  | "filings"
  | "macro"
  | "news"
  | "sentiment"
  | "analystTrend"
  | "crypto";

export type SourceAuditEntry = {
  provider: string;
  status: DataQualityStatus;
  used: boolean;
  asOf?: string;
  warnings: string[];
  missingReason?: string;
};

export type SourceAudit = Record<SourceAuditCategory, SourceAuditEntry>;

export type MacroSeriesPoint = {
  series: string;
  label: string;
  value: number;
  date: string;
  source: string;
};

export type CryptoContext = {
  asset: string;
  priceUsd: number;
  change24hPercent: number;
  marketCapUsd?: number;
  volume24hUsd?: number;
  source: string;
  updatedAt: string;
};

export type MarketContext = {
  ticker: string;
  quote: Quote;
  fundamentals: Fundamentals;
  technicals?: TechnicalIndicators;
  news: NewsItem[];
  analystTrend: AnalystTrend | null;
  generatedAt: string;
  macroSeries?: MacroSeriesPoint[];
  cryptoContext?: CryptoContext | null;
  socialSentiment?: NewsItem[];
  sourceAudit?: SourceAudit;
  dataQuality: {
    score: number;
    status: DataQualityStatus;
    provider: string;
    liveQuote: boolean;
    fundamentals: boolean;
    news: boolean;
    analystTrend: boolean;
    warnings: string[];
    messages: string[];
  };
};

export type ProviderCapabilities = {
  name?: string;
  minPollMs: number;
  supportsBatch: boolean;
  supportsSearch?: boolean;
  supportsQuotes?: boolean;
  supportsFundamentals?: boolean;
  supportsNews?: boolean;
  supportsAnalystTrend?: boolean;
  supportsHistory?: boolean;
  supportsFilings?: boolean;
  supportsMacro?: boolean;
  supportsSocialSentiment?: boolean;
  supportsCrypto?: boolean;
};

export interface MarketDataProvider {
  capabilities: ProviderCapabilities;
  search?(symbol: string): Promise<Array<{ symbol: string; description: string }>>;
  getQuote?(ticker: string): Promise<Quote | null>;
  subscribeQuotes?(tickers: string[], onQuote: (quote: Quote) => void): () => void;
  news?(ticker: string): Promise<NewsItem[] | null>;
  fundamentals?(ticker: string): Promise<Fundamentals | null>;
  analystTrend?(ticker: string): Promise<AnalystTrend | null>;
  history?(ticker: string, range: "1d" | "1mo" | "6mo" | "1y"): Promise<HistoricalCandle[] | null>;
  macroSeries?(ticker: string): Promise<MacroSeriesPoint[] | null>;
  socialSentiment?(ticker: string): Promise<NewsItem[] | null>;
  cryptoContext?(ticker: string): Promise<CryptoContext | null>;
}
