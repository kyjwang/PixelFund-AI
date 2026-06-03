import { Injectable } from "@nestjs/common";
import { computeTechnicalIndicators } from "@pixelfund/domain";
import { FinnhubProvider } from "./finnhub.provider";
import type { DataQualityStatus, MarketContext, Quote } from "./market.types";

@Injectable()
export class MarketService {
  private quoteCache = new Map<string, { quote: Quote; cachedAt: number }>();
  private contextCache = new Map<string, { context: MarketContext; cachedAt: number }>();

  constructor(private readonly provider: FinnhubProvider) {}

  get capabilities() {
    return this.provider.capabilities;
  }

  providerCapabilities() {
    return {
      providers: [
        {
          name: this.provider.capabilities.name ?? "finnhub",
          priority: 1,
          status: process.env.FINNHUB_API_KEY && !process.env.FINNHUB_API_KEY.startsWith("your_") ? "ENABLED" : "DEMO",
          supportsSearch: true,
          supportsQuotes: true,
          supportsFundamentals: true,
          supportsNews: true,
          supportsAnalystTrend: true,
          supportsHistory: true,
          supportsBatch: this.provider.capabilities.supportsBatch,
          minPollMs: this.provider.capabilities.minPollMs,
          notes: [
            "Primary provider for supported symbols.",
            "Some non-US exchange resources may be unavailable on the current Finnhub plan.",
            "Provider registry is ready for a future fallback provider."
          ]
        }
      ]
    };
  }

  search(q: string) {
    return this.provider.search(q);
  }

  async quote(ticker: string) {
    const normalized = ticker.toUpperCase();
    const quote = await this.provider.getQuote(normalized);
    const cacheTtlMs = Number(process.env.MARKET_CACHE_TTL_MS ?? "900000");
    const cached = this.quoteCache.get(normalized);

    if (quote.source === "finnhub") {
      this.quoteCache.set(normalized, { quote, cachedAt: Date.now() });
      return quote;
    }

    if (cached && Date.now() - cached.cachedAt <= cacheTtlMs) {
      return {
        ...cached.quote,
        source: `${cached.quote.source}-cache`,
        updatedAt: cached.quote.updatedAt
      };
    }

    this.quoteCache.set(normalized, { quote, cachedAt: Date.now() });
    return quote;
  }

  subscribeQuotes(tickers: string[], onQuote: (quote: Quote) => void) {
    return this.provider.subscribeQuotes(tickers, onQuote);
  }

  news(ticker: string) {
    return this.provider.news(ticker);
  }

  fundamentals(ticker: string) {
    return this.provider.fundamentals(ticker);
  }

  analystTrend(ticker: string) {
    return this.provider.analystTrend(ticker);
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y") {
    const normalized = ticker.toUpperCase();
    const candles = await this.provider.history(normalized, range);
    const technicals = computeTechnicalIndicators(candles);
    const source = candles.find((c) => c.source)?.source ?? "demo";
    const status = statusFromSources([source]);
    return {
      ticker: normalized,
      range,
      candles,
      technicals,
      dataQuality: {
        status,
        provider: source,
        messages: messagesForStatus(status, normalized)
      }
    };
  }

  async context(ticker: string): Promise<MarketContext> {
    const normalized = ticker.toUpperCase();
    const cacheTtlMs = Number(process.env.MARKET_CONTEXT_CACHE_TTL_MS ?? "120000");
    const cached = this.contextCache.get(normalized);
    if (cached && Date.now() - cached.cachedAt <= cacheTtlMs) return cached.context;

    const [quote, fundamentals, news, analystTrend, history] = await Promise.all([
      this.quote(normalized),
      this.fundamentals(normalized),
      this.news(normalized),
      this.analystTrend(normalized),
      this.history(normalized, "1y")
    ]);

    const liveQuote = quote.source === "finnhub";
    const hasFundamentals = fundamentals.source === "finnhub";
    const hasNews = news.some((item) => !item.source.toLowerCase().includes("demo"));
    const hasAnalystTrend = analystTrend?.source === "finnhub";
    const hasHistory = history.dataQuality.status === "LIVE";
    const status = contextStatus({
      quoteSource: quote.source,
      fundamentalsSource: fundamentals.source,
      hasNews,
      hasAnalystTrend,
      hasHistory
    });
    const warnings: string[] = [];

    if (!liveQuote) warnings.push("Live quote unavailable; demo/fallback quote used.");
    if (!hasFundamentals) warnings.push("Live fundamentals unavailable; demo/fallback fundamentals used.");
    if (!hasNews) warnings.push("Live news unavailable; demo/fallback headlines used.");
    if (!hasAnalystTrend) warnings.push("Live analyst trend unavailable.");
    if (!hasHistory) warnings.push("Live historical candles unavailable; demo/fallback history used.");

    const score =
      (liveQuote ? 0.35 : 0.12) +
      (hasFundamentals ? 0.3 : 0.1) +
      (hasNews ? 0.2 : 0.08) +
      (hasAnalystTrend ? 0.1 : 0.03) +
      (hasHistory ? 0.05 : 0.01);

    const context = {
      ticker: normalized,
      quote,
      fundamentals,
      technicals: history.technicals,
      news,
      analystTrend,
      generatedAt: new Date().toISOString(),
      dataQuality: {
        score: Math.min(1, Number(score.toFixed(2))),
        status,
        provider: providerLabel([quote.source, fundamentals.source, history.dataQuality.provider]),
        liveQuote,
        fundamentals: hasFundamentals,
        news: hasNews,
        analystTrend: hasAnalystTrend,
        warnings,
        messages: [...messagesForStatus(status, normalized), ...warnings]
      }
    };
    this.contextCache.set(normalized, { context, cachedAt: Date.now() });
    return context;
  }
}

function statusFromSources(sources: string[]): DataQualityStatus {
  const normalized = sources.map((s) => s.toLowerCase());
  if (normalized.some((s) => s.includes("unsupported"))) return "UNSUPPORTED";
  const live = normalized.filter((s) => s === "finnhub").length;
  if (live === sources.length) return "LIVE";
  if (live > 0) return "PARTIAL";
  if (normalized.some((s) => s.includes("demo"))) return "DEMO";
  return "PARTIAL";
}

function contextStatus(input: {
  quoteSource: string;
  fundamentalsSource: string;
  hasNews: boolean;
  hasAnalystTrend: boolean;
  hasHistory: boolean;
}): DataQualityStatus {
  const quoteSource = input.quoteSource.toLowerCase();
  const fundamentalsSource = input.fundamentalsSource.toLowerCase();
  const coreUnsupported = quoteSource.includes("unsupported") || fundamentalsSource.includes("unsupported");
  if (coreUnsupported) return "UNSUPPORTED";

  const coreLive = quoteSource === "finnhub" && fundamentalsSource === "finnhub";
  const allLive = coreLive && input.hasNews && input.hasAnalystTrend && input.hasHistory;
  if (allLive) return "LIVE";
  if (coreLive || input.hasNews || input.hasAnalystTrend || input.hasHistory) return "PARTIAL";
  return "DEMO";
}

function providerLabel(sources: string[]) {
  return Array.from(new Set(sources)).join("+");
}

function messagesForStatus(status: DataQualityStatus, ticker: string) {
  if (status === "LIVE") return [`${ticker} is using live provider data.`];
  if (status === "UNSUPPORTED") return [`${ticker} was found, but at least one live market-data resource is unsupported by the current provider plan.`];
  if (status === "DEMO") return [`${ticker} is using demo fallback data because live provider data was unavailable.`];
  if (status === "DELAYED") return [`${ticker} is using delayed provider data.`];
  return [`${ticker} is using partial live data with fallback evidence for missing resources.`];
}
