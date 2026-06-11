import { Injectable, Optional } from "@nestjs/common";
import type {
  AnalystTrend,
  CryptoContext,
  DataQualityStatus,
  Fundamentals,
  HistoricalCandle,
  MacroSeriesPoint,
  MarketDataProvider,
  NewsItem,
  Quote,
  SourceAudit,
  SourceAuditCategory,
  SourceAuditEntry
} from "./market.types";

export type ProviderRegistryResult<T> = {
  data: T;
  audit: SourceAudit;
};

type ProviderMethod<T> = (provider: MarketDataProvider) => ((...args: any[]) => Promise<T | null>) | undefined;
type Usability<T> = (value: T) => boolean;
type AsOf<T> = (value: T) => string | undefined;

const categories: SourceAuditCategory[] = [
  "quote",
  "history",
  "fundamentals",
  "filings",
  "macro",
  "news",
  "sentiment",
  "analystTrend",
  "crypto"
];

@Injectable()
export class MarketProviderRegistry {
  constructor(@Optional() private readonly providers: MarketDataProvider[] = []) {}

  get capabilities() {
    return this.providers.map((provider, idx) => ({
      name: providerName(provider),
      priority: idx + 1,
      status: providerConfigured(provider) ? "ENABLED" : "DEMO",
      supportsSearch: Boolean(provider.capabilities.supportsSearch || provider.search),
      supportsQuotes: Boolean(provider.capabilities.supportsQuotes || provider.getQuote),
      supportsFundamentals: Boolean(provider.capabilities.supportsFundamentals || provider.fundamentals),
      supportsNews: Boolean(provider.capabilities.supportsNews || provider.news),
      supportsAnalystTrend: Boolean(provider.capabilities.supportsAnalystTrend || provider.analystTrend),
      supportsHistory: Boolean(provider.capabilities.supportsHistory || provider.history),
      supportsBatch: provider.capabilities.supportsBatch,
      minPollMs: provider.capabilities.minPollMs,
      notes: notesForProvider(provider)
    }));
  }

  async search(symbol: string) {
    for (const provider of this.providers) {
      if (!provider.search) continue;
      const results = await provider.search(symbol);
      if (results.length > 0) return results;
    }
    return [];
  }

  async quote(ticker: string): Promise<ProviderRegistryResult<Quote>> {
    return this.resolve("quote", (provider) => provider.getQuote, [ticker], isLiveQuote, (quote) => quote.updatedAt, demoQuote(ticker));
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y"): Promise<ProviderRegistryResult<HistoricalCandle[]>> {
    return this.resolve(
      "history",
      (provider) => provider.history,
      [ticker, range],
      (candles) => candles.length > 0 && sourceStatus(sourceFromCandles(candles)) === "LIVE",
      (candles) => candles.at(-1)?.date,
      []
    );
  }

  async fundamentals(ticker: string): Promise<ProviderRegistryResult<Fundamentals>> {
    const result = await this.resolve(
      "fundamentals",
      (provider) => provider.fundamentals,
      [ticker],
      (fundamentals) => sourceStatus(fundamentals.source) === "LIVE" && hasFundamentalValues(fundamentals),
      (fundamentals) => sourceStatus(fundamentals.source) === "LIVE" ? new Date().toISOString() : undefined,
      { source: "demo" }
    );

    if (result.data.source === "sec-edgar") {
      result.audit.filings = {
        provider: "sec-edgar",
        status: "LIVE",
        used: true,
        asOf: result.audit.fundamentals.asOf,
        warnings: []
      };
    }

    return result;
  }

  async news(ticker: string): Promise<ProviderRegistryResult<NewsItem[]>> {
    return this.resolve(
      "news",
      (provider) => provider.news,
      [ticker],
      (news) => news.length > 0 && sourceStatus(news[0]?.source ?? "demo") === "LIVE",
      (news) => news[0]?.publishedAt,
      []
    );
  }

  async analystTrend(ticker: string): Promise<ProviderRegistryResult<AnalystTrend | null>> {
    return this.resolve(
      "analystTrend",
      (provider) => provider.analystTrend,
      [ticker],
      (trend) => Boolean(trend && sourceStatus(trend.source) === "LIVE"),
      (trend) => (trend ? trend.period : undefined),
      null
    );
  }

  async macroSeries(ticker: string): Promise<ProviderRegistryResult<MacroSeriesPoint[]>> {
    return this.resolve(
      "macro",
      (provider) => provider.macroSeries,
      [ticker],
      (series) => series.length > 0 && sourceStatus(series[0]?.source ?? "demo") === "LIVE",
      (series) => series[0]?.date,
      []
    );
  }

  async socialSentiment(ticker: string): Promise<ProviderRegistryResult<NewsItem[]>> {
    return this.resolve(
      "sentiment",
      (provider) => provider.socialSentiment,
      [ticker],
      (items) => items.length > 0 && sourceStatus(items[0]?.source ?? "demo") === "LIVE",
      (items) => items[0]?.publishedAt,
      []
    );
  }

  async cryptoContext(ticker: string): Promise<ProviderRegistryResult<CryptoContext | null>> {
    return this.resolve(
      "crypto",
      (provider) => provider.cryptoContext,
      [ticker],
      (context) => Boolean(context && sourceStatus(context.source) === "LIVE"),
      (context) => context?.updatedAt,
      null
    );
  }

  private async resolve<T>(
    category: SourceAuditCategory,
    method: ProviderMethod<T>,
    args: unknown[],
    usable: Usability<T>,
    asOf: AsOf<T>,
    fallback: T
  ): Promise<ProviderRegistryResult<T>> {
    const audit = emptyAudit();
    const warnings: string[] = [];
    let fallbackData: T | null = null;
    let fallbackEntry: SourceAuditEntry | null = null;
    let lastProvider = "none";

    for (const provider of this.providers) {
      const fn = method(provider);
      if (!fn) continue;
      const name = providerName(provider);
      lastProvider = name;

      try {
        const data = await fn.apply(provider, args);
        if (data === null || emptyData(data)) {
          warnings.push(`${name} returned no ${category} data.`);
          fallbackEntry = missingEntry(name, `${category} unavailable from ${name}.`, warnings);
          continue;
        }

        const entry = entryForData(name, data, usable(data), asOf(data), warnings);
        if (entry.used) {
          audit[category] = entry;
          return { data, audit };
        }

        fallbackData = data;
        fallbackEntry = entry;
        warnings.push(`${name} returned ${entry.status.toLowerCase()} ${category} data.`);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown provider error";
        warnings.push(`${name} failed: ${reason}`);
        fallbackEntry = missingEntry(name, reason, warnings);
      }
    }

    audit[category] = fallbackEntry ?? missingEntry(lastProvider, `${category} unavailable from configured providers.`, warnings);
    return { data: fallbackData ?? fallback, audit };
  }
}

export function mergeSourceAudits(...audits: Array<SourceAudit | undefined>): SourceAudit {
  const merged = emptyAudit();
  for (const audit of audits) {
    if (!audit) continue;
    for (const category of categories) {
      if (audit[category].provider !== "not-requested" || audit[category].used) merged[category] = audit[category];
    }
  }
  return merged;
}

function emptyAudit(): SourceAudit {
  const audit = {} as SourceAudit;
  for (const category of categories) {
    audit[category] = {
      provider: "not-requested",
      status: "DEMO",
      used: false,
      warnings: [],
      missingReason: `${category} was not requested.`
    };
  }
  return audit;
}

function entryForData<T>(provider: string, data: T, used: boolean, asOf: string | undefined, warnings: string[]): SourceAuditEntry {
  const source = sourceFromData(data, provider);
  const status = sourceStatus(source);
  return {
    provider,
    status,
    used,
    asOf,
    warnings: [...warnings],
    missingReason: used ? undefined : `${provider} returned ${status.toLowerCase()} data.`
  };
}

function missingEntry(provider: string, missingReason: string, warnings: string[]): SourceAuditEntry {
  return {
    provider,
    status: missingReason.toLowerCase().includes("unsupported") ? "UNSUPPORTED" : "DEMO",
    used: false,
    warnings: [...warnings],
    missingReason
  };
}

function sourceFromData<T>(data: T, provider: string) {
  if (Array.isArray(data)) return sourceFromArray(data, provider);
  if (data && typeof data === "object" && "source" in data && typeof (data as { source?: unknown }).source === "string") {
    return (data as { source: string }).source;
  }
  return provider;
}

function sourceFromArray(data: unknown[], provider: string) {
  const first = data.find((item) => item && typeof item === "object" && "source" in item) as { source?: string } | undefined;
  return first?.source ?? provider;
}

function sourceFromCandles(candles: HistoricalCandle[]) {
  return candles.find((candle) => candle.source)?.source ?? "demo";
}

function sourceStatus(source: string): DataQualityStatus {
  const normalized = source.toLowerCase();
  if (normalized.includes("unsupported")) return "UNSUPPORTED";
  if (normalized.includes("demo")) return "DEMO";
  if (normalized.includes("cache")) return "PARTIAL";
  if (normalized.includes("fallback")) return "PARTIAL";
  return "LIVE";
}

function isLiveQuote(quote: Quote) {
  return quote.price > 0 && sourceStatus(quote.source) === "LIVE";
}

function hasFundamentalValues(fundamentals: Fundamentals) {
  return Object.entries(fundamentals).some(([key, value]) => key !== "source" && typeof value === "number" && Number.isFinite(value));
}

function emptyData<T>(data: T) {
  return Array.isArray(data) && data.length === 0;
}

function providerName(provider: MarketDataProvider) {
  return provider.capabilities.name ?? "unknown";
}

function providerConfigured(provider: MarketDataProvider) {
  if (providerName(provider) === "sec-edgar" || providerName(provider) === "coingecko") return true;
  if (providerName(provider) === "social-sentiment") return process.env.ENABLE_SOCIAL_SENTIMENT === "true";
  const name = providerName(provider).toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const key = process.env[`${name}_API_KEY`];
  return Boolean(key && key.trim() && !key.startsWith("your_"));
}

function notesForProvider(provider: MarketDataProvider) {
  const name = providerName(provider);
  if (name === "finnhub") return ["Primary provider for current PixelFund quote, news, and analyst trend compatibility."];
  if (name === "alpha-vantage") return ["Free all-in-one backup for quote, history, fundamentals, indicators, and news sentiment."];
  if (name === "sec-edgar") return ["Official US filing-derived fundamentals when CIK mapping is available."];
  if (name === "fred") return ["Structured macro series for rates, inflation, unemployment, GDP, and liquidity context."];
  if (name === "coingecko") return ["Crypto market context for crypto assets and crypto-sensitive equities."];
  if (name === "social-sentiment") return ["Optional labeled social sentiment; never treated as factual company evidence."];
  return ["Configured market-data provider."];
}

function demoQuote(ticker: string): Quote {
  return {
    ticker: ticker.toUpperCase(),
    price: 0,
    change: 0,
    changePercent: 0,
    updatedAt: new Date().toISOString(),
    source: "demo"
  };
}
