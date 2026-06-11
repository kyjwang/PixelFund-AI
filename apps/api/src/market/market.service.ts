import { Injectable } from "@nestjs/common";
import { computeTechnicalIndicators } from "@pixelfund/domain";
import { FinnhubProvider } from "./finnhub.provider";
import { MarketProviderRegistry, mergeSourceAudits } from "./provider-registry";
import type { DataQualityStatus, MarketContext, Quote } from "./market.types";

@Injectable()
export class MarketService {
  private quoteCache = new Map<string, { quote: Quote; cachedAt: number }>();
  private contextCache = new Map<string, { context: MarketContext; cachedAt: number }>();

  constructor(
    private readonly registry: MarketProviderRegistry,
    private readonly quoteProvider: FinnhubProvider
  ) {}

  get capabilities() {
    return this.registry.capabilities[0] ?? this.quoteProvider.capabilities;
  }

  providerCapabilities() {
    return {
      providers: this.registry.capabilities
    };
  }

  search(q: string) {
    return this.registry.search(q);
  }

  async quote(ticker: string) {
    const normalized = ticker.toUpperCase();
    const result = await this.registry.quote(normalized);
    const quote = result.data;
    const cacheTtlMs = Number(process.env.MARKET_CACHE_TTL_MS ?? "900000");
    const cached = this.quoteCache.get(normalized);

    if (result.audit.quote.status === "LIVE") {
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
    return this.quoteProvider.subscribeQuotes(tickers, onQuote);
  }

  news(ticker: string) {
    return this.registry.news(ticker).then((result) => result.data);
  }

  fundamentals(ticker: string) {
    return this.registry.fundamentals(ticker).then((result) => result.data);
  }

  analystTrend(ticker: string) {
    return this.registry.analystTrend(ticker).then((result) => result.data);
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y") {
    const normalized = ticker.toUpperCase();
    const result = await this.registry.history(normalized, range);
    const candles = result.data;
    const technicals = computeTechnicalIndicators(candles);
    const source = candles.find((c) => c.source)?.source ?? result.audit.history.provider;
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
      },
      sourceAudit: result.audit
    };
  }

  async context(ticker: string): Promise<MarketContext> {
    const normalized = ticker.toUpperCase();
    const cacheTtlMs = Number(process.env.MARKET_CONTEXT_CACHE_TTL_MS ?? "120000");
    const cached = this.contextCache.get(normalized);
    if (cached && Date.now() - cached.cachedAt <= cacheTtlMs) return cached.context;

    const [quoteResult, fundamentalsResult, newsResult, analystTrendResult, history, macroResult, sentimentResult, cryptoResult] = await Promise.all([
      this.registry.quote(normalized),
      this.registry.fundamentals(normalized),
      this.registry.news(normalized),
      this.registry.analystTrend(normalized),
      this.history(normalized, "1y"),
      this.registry.macroSeries(normalized),
      this.registry.socialSentiment(normalized),
      this.registry.cryptoContext(normalized)
    ]);

    const quote = quoteResult.data;
    const fundamentals = fundamentalsResult.data;
    const news = newsResult.data;
    const analystTrend = analystTrendResult.data;
    const sourceAudit = mergeSourceAudits(
      quoteResult.audit,
      fundamentalsResult.audit,
      newsResult.audit,
      analystTrendResult.audit,
      history.sourceAudit,
      macroResult.audit,
      sentimentResult.audit,
      cryptoResult.audit
    );
    const liveQuote = sourceAudit.quote.status === "LIVE" && sourceAudit.quote.used;
    const hasFundamentals = sourceAudit.fundamentals.status === "LIVE" && sourceAudit.fundamentals.used;
    const hasNews = sourceAudit.news.status === "LIVE" && sourceAudit.news.used;
    const hasAnalystTrend = sourceAudit.analystTrend.status === "LIVE" && sourceAudit.analystTrend.used;
    const hasHistory = history.dataQuality.status === "LIVE";
    const hasMacro = sourceAudit.macro.status === "LIVE" && sourceAudit.macro.used;
    const hasSentiment = sourceAudit.sentiment.status === "LIVE" && sourceAudit.sentiment.used;
    const hasCrypto = sourceAudit.crypto.status === "LIVE" && sourceAudit.crypto.used;
    const status = contextStatus({
      quoteSource: sourceAudit.quote.status,
      fundamentalsSource: sourceAudit.fundamentals.status,
      hasNews,
      hasAnalystTrend,
      hasHistory,
      hasMacro,
      hasSentiment,
      hasCrypto
    });
    const warnings: string[] = [];

    if (!liveQuote) warnings.push("Live quote unavailable; demo/fallback quote used.");
    if (!hasFundamentals) warnings.push("Official or live fundamentals unavailable; demo/fallback fundamentals used.");
    if (!hasNews) warnings.push("Live news unavailable; demo/fallback headlines used.");
    if (!hasAnalystTrend) warnings.push("Live analyst trend unavailable.");
    if (!hasHistory) warnings.push("Live historical candles unavailable; demo/fallback history used.");
    if (!hasMacro) warnings.push("Structured macro data unavailable; macro agent will use ticker context only.");
    if (!hasSentiment) warnings.push("Social sentiment unavailable; sentiment remains news-derived only.");

    const score =
      (liveQuote ? 0.35 : 0.12) +
      (hasFundamentals ? 0.3 : 0.1) +
      (hasNews ? 0.2 : 0.08) +
      (hasAnalystTrend ? 0.1 : 0.03) +
      (hasHistory ? 0.05 : 0.01) +
      (hasMacro ? 0.04 : 0) +
      (hasSentiment ? 0.02 : 0) +
      (hasCrypto ? 0.02 : 0);

    const context = {
      ticker: normalized,
      quote,
      fundamentals,
      technicals: history.technicals,
      news,
      analystTrend,
      macroSeries: macroResult.data,
      socialSentiment: sentimentResult.data,
      cryptoContext: cryptoResult.data,
      sourceAudit,
      generatedAt: new Date().toISOString(),
      dataQuality: {
        score: Math.min(1, Number(score.toFixed(2))),
        status,
        provider: providerLabel(
          Object.values(sourceAudit)
            .filter((entry) => entry.used)
            .map((entry) => entry.provider)
        ),
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
  const live = normalized.filter((s) => !s.includes("demo") && !s.includes("fallback") && !s.includes("cache") && s !== "not-requested").length;
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
  hasMacro: boolean;
  hasSentiment: boolean;
  hasCrypto: boolean;
}): DataQualityStatus {
  const quoteSource = input.quoteSource.toLowerCase();
  const fundamentalsSource = input.fundamentalsSource.toLowerCase();
  const coreUnsupported = quoteSource.includes("unsupported") || fundamentalsSource.includes("unsupported");
  if (coreUnsupported) return "UNSUPPORTED";

  const coreLive = quoteSource === "live" && fundamentalsSource === "live";
  const allLive = coreLive && input.hasNews && input.hasAnalystTrend && input.hasHistory && input.hasMacro;
  if (allLive) return "LIVE";
  if (coreLive || input.hasNews || input.hasAnalystTrend || input.hasHistory || input.hasMacro || input.hasSentiment || input.hasCrypto) return "PARTIAL";
  return "DEMO";
}

function providerLabel(sources: string[]) {
  return Array.from(new Set(sources.filter(Boolean))).join("+") || "demo";
}

function messagesForStatus(status: DataQualityStatus, ticker: string) {
  if (status === "LIVE") return [`${ticker} is using live provider data.`];
  if (status === "UNSUPPORTED") return [`${ticker} was found, but at least one live market-data resource is unsupported by the current provider plan.`];
  if (status === "DEMO") return [`${ticker} is using demo fallback data because live provider data was unavailable.`];
  if (status === "DELAYED") return [`${ticker} is using delayed provider data.`];
  return [`${ticker} is using partial live data with fallback evidence for missing resources.`];
}
