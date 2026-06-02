import { Injectable } from "@nestjs/common";
import type { AnalystTrend, Fundamentals, HistoricalCandle, MarketDataProvider, NewsItem, Quote } from "./market.types";

@Injectable()
export class FinnhubProvider implements MarketDataProvider {
  capabilities = {
    name: "finnhub",
    minPollMs: 5000,
    supportsBatch: false,
    supportsSearch: true,
    supportsQuotes: true,
    supportsFundamentals: true,
    supportsNews: true,
    supportsAnalystTrend: true,
    supportsHistory: true
  };
  private key = process.env.FINNHUB_API_KEY;

  async search(symbol: string) {
    const normalized = symbol.trim().toUpperCase();
    if (!this.key || normalized.length === 0) return demoSearch(normalized);
    const data = await fetchJson<{ result?: Array<{ symbol?: string; description?: string }> }>(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(normalized)}&token=${this.key}`
    );
    return (data?.result ?? [])
      .filter((x) => x.symbol)
      .slice(0, 10)
      .map((x) => ({ symbol: String(x.symbol), description: x.description ?? "Listed equity" }));
  }

  async getQuote(ticker: string): Promise<Quote> {
    const normalized = ticker.toUpperCase();
    if (!this.key) {
      return demoQuote(normalized, "demo");
    }

    const q = await fetchJson<{ c?: number; d?: number; dp?: number; t?: number; error?: string }>(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(normalized)}&token=${this.key}`
    );
    if (isAccessDenied(q)) return demoQuote(normalized, "unsupported");
    if (!q || !isFiniteNumber(q.c) || q.c <= 0) return demoQuote(normalized, "demo-fallback");

    return {
      ticker: normalized,
      price: q.c,
      change: q.d ?? 0,
      changePercent: q.dp ?? 0,
      updatedAt: q.t ? new Date(q.t * 1000).toISOString() : new Date().toISOString(),
      source: "finnhub"
    };
  }

  subscribeQuotes(tickers: string[], onQuote: (quote: Quote) => void) {
    const pollMs = Number(process.env.QUOTE_POLL_MS ?? "7000");
    const interval = setInterval(async () => {
      for (const ticker of tickers) {
        const jitter = Math.floor(Math.random() * 300);
        await new Promise((resolve) => setTimeout(resolve, jitter));
        const quote = await this.getQuote(ticker);
        onQuote(quote);
      }
    }, Math.max(this.capabilities.minPollMs, pollMs));

    return () => clearInterval(interval);
  }

  async news(ticker: string): Promise<NewsItem[]> {
    const normalized = ticker.toUpperCase();
    if (!this.key) return demoNews(normalized);
    const today = new Date();
    const from = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 7);
    const news = await fetchJson<
      Array<{ headline?: string; summary?: string; source?: string; url?: string; datetime?: number }> | { error?: string }
    >(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(normalized)}&from=${from.toISOString().slice(0, 10)}&to=${today.toISOString().slice(0, 10)}&token=${this.key}`
    );
    if (isAccessDenied(news)) return demoNews(normalized, "unsupported");
    const items = (Array.isArray(news) ? news : [])
      .filter((n) => n.headline)
      .slice(0, 8)
      .map((n) => {
        const scored = scoreSentiment(`${n.headline ?? ""} ${n.summary ?? ""}`);
        return {
          headline: n.headline ?? `${normalized} news`,
          summary: n.summary,
          url: n.url,
          sentiment: scored.sentiment,
          sentimentScore: scored.score,
          source: n.source ?? "Finnhub",
          publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : undefined
        };
      });
    return items.length > 0 ? items : demoNews(normalized, "demo-fallback");
  }

  async fundamentals(ticker: string): Promise<Fundamentals> {
    const normalized = ticker.toUpperCase();
    if (!this.key) return demoFundamentals(normalized, "demo");

    const data = await fetchJson<{ metric?: Record<string, number | null | undefined>; error?: string }>(
      `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(normalized)}&metric=all&token=${this.key}`
    );
    if (isAccessDenied(data)) return demoFundamentals(normalized, "unsupported");
    const metric = data?.metric ?? {};
    const hasMetrics = Object.keys(metric).length > 0;
    if (!hasMetrics) return demoFundamentals(normalized, "demo-fallback");

    return {
      peRatio: firstNumber(metric.peBasicExclExtraTTM, metric.peNormalizedAnnual, metric.peTTM),
      forwardPe: firstNumber(metric.forwardPE, metric.peExclExtraAnnual),
      marketCap: normalizeMarketCap(firstNumber(metric.marketCapitalization)),
      beta: firstNumber(metric.beta),
      revenueGrowth: firstNumber(metric.revenueGrowthTTMYoy, metric.revenueGrowthQuarterlyYoy),
      epsGrowth: firstNumber(metric.epsGrowthTTMYoy, metric.epsGrowthQuarterlyYoy, metric.epsGrowth3Y),
      grossMargin: firstNumber(metric.grossMarginTTM, metric.grossMarginAnnual),
      netMargin: firstNumber(metric.netProfitMarginTTM, metric.netProfitMarginAnnual),
      roe: firstNumber(metric.roeTTM, metric.roeAnnual),
      debtToEquity: firstNumber(metric["totalDebt/totalEquityAnnual"], metric["totalDebt/totalEquityQuarterly"]),
      currentRatio: firstNumber(metric.currentRatioAnnual, metric.currentRatioQuarterly),
      priceToSales: firstNumber(metric.psTTM, metric.psAnnual),
      dividendYield: firstNumber(metric.dividendYieldIndicatedAnnual, metric.currentDividendYieldTTM),
      week52High: firstNumber(metric["52WeekHigh"]),
      week52Low: firstNumber(metric["52WeekLow"]),
      week52Return: firstNumber(metric["52WeekPriceReturnDaily"]),
      tenDayAverageVolume: firstNumber(metric["10DayAverageTradingVolume"]),
      threeMonthAverageVolume: firstNumber(metric["3MonthAverageTradingVolume"]),
      source: "finnhub"
    };
  }

  async analystTrend(ticker: string): Promise<AnalystTrend | null> {
    const normalized = ticker.toUpperCase();
    if (!this.key) return demoAnalystTrend(normalized, "demo");

    const data = await fetchJson<
      Array<{ period?: string; strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }> | { error?: string }
    >(`https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(normalized)}&token=${this.key}`);
    if (isAccessDenied(data)) return null;
    const latest = Array.isArray(data) ? data?.[0] : undefined;
    if (!latest) return null;

    return toAnalystTrend(
      {
        period: latest.period,
        strongBuy: latest.strongBuy ?? 0,
        buy: latest.buy ?? 0,
        hold: latest.hold ?? 0,
        sell: latest.sell ?? 0,
        strongSell: latest.strongSell ?? 0
      },
      "finnhub"
    );
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y"): Promise<HistoricalCandle[]> {
    const normalized = ticker.toUpperCase();
    if (!this.key) return demoHistory(normalized, range, "demo");
    const to = Math.floor(Date.now() / 1000);
    const from = to - rangeSeconds(range);
    const resolution = range === "1d" ? "15" : "D";
    const data = await fetchJson<{
      s?: string;
      t?: number[];
      o?: number[];
      h?: number[];
      l?: number[];
      c?: number[];
      v?: number[];
      error?: string;
    }>(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(normalized)}&resolution=${resolution}&from=${from}&to=${to}&token=${this.key}`
    );
    if (isAccessDenied(data)) return demoHistory(normalized, range, "unsupported");
    if (!data || data.s !== "ok" || !Array.isArray(data.t) || data.t.length === 0) {
      return demoHistory(normalized, range, "demo-fallback");
    }
    return data.t.map((timestamp, idx) => ({
      ticker: normalized,
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: positive(data.o?.[idx]),
      high: positive(data.h?.[idx]),
      low: positive(data.l?.[idx]),
      close: positive(data.c?.[idx]),
      volume: positive(data.v?.[idx]),
      source: "finnhub"
    }));
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_FETCH_TIMEOUT_MS ?? "6000"));
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      try {
        return (await res.json()) as T;
      } catch {
        return null;
      }
    }
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isAccessDenied(data: unknown): data is { error: string } {
  return Boolean(
    data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string" &&
      (data as { error: string }).error.toLowerCase().includes("access")
  );
}

function positive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function rangeSeconds(range: "1d" | "1mo" | "6mo" | "1y") {
  if (range === "1d") return 60 * 60 * 24;
  if (range === "1mo") return 60 * 60 * 24 * 31;
  if (range === "6mo") return 60 * 60 * 24 * 183;
  return 60 * 60 * 24 * 366;
}

function demoHistory(ticker: string, range: "1d" | "1mo" | "6mo" | "1y", source: "demo" | "demo-fallback" | "unsupported"): HistoricalCandle[] {
  const count = range === "1d" ? 32 : range === "1mo" ? 31 : range === "6mo" ? 126 : 252;
  const seed = stableHash(ticker);
  const start = 60 + (seed % 180);
  const candles: HistoricalCandle[] = [];
  for (let i = 0; i < count; i += 1) {
    const wave = Math.sin((i + (seed % 11)) / 7) * 4;
    const drift = i * (((seed % 17) - 6) / 110);
    const close = Math.max(1, start + wave + drift);
    const open = Math.max(1, close - Math.sin(i / 3));
    candles.push({
      ticker,
      date: new Date(Date.now() - (count - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      open: round(open, 2),
      high: round(Math.max(open, close) + 1.2, 2),
      low: round(Math.max(0.1, Math.min(open, close) - 1.2), 2),
      close: round(close, 2),
      volume: 1_000_000 + ((seed + i * 7919) % 7_000_000),
      source
    });
  }
  return candles;
}

function demoSearch(symbol: string) {
  const universe = [
    { symbol: "AAPL", description: "Apple Inc." },
    { symbol: "MSFT", description: "Microsoft Corporation" },
    { symbol: "NVDA", description: "NVIDIA Corporation" },
    { symbol: "TSLA", description: "Tesla Inc." },
    { symbol: "AMZN", description: "Amazon.com Inc." },
    { symbol: "GOOGL", description: "Alphabet Inc." }
  ];
  if (!symbol) return universe.slice(0, 5);
  const matches = universe.filter((item) => item.symbol.includes(symbol) || item.description.toUpperCase().includes(symbol));
  return matches.length > 0 ? matches : [{ symbol, description: "Demo symbol" }];
}

function demoQuote(ticker: string, source: "demo" | "demo-fallback" | "unsupported"): Quote {
  const seed = stableHash(ticker);
  const base = 70 + (seed % 240);
  const changePercent = round((((seed >>> 3) % 700) - 300) / 100, 2);
  const change = round((base * changePercent) / 100, 2);
  return {
    ticker,
    price: round(base + change, 2),
    change,
    changePercent,
    updatedAt: new Date().toISOString(),
    source
  };
}

function demoNews(ticker: string, source = "DemoWire"): NewsItem[] {
  const sentiment = scoreSentiment(`${ticker} earnings growth product demand margin risk`);
  return [
    {
      headline: `${ticker} investors weigh growth, margins, and market risk`,
      summary: "Demo-mode headline used when live company news is unavailable.",
      sentiment: sentiment.sentiment,
      sentimentScore: sentiment.score,
      source,
      publishedAt: new Date().toISOString()
    }
  ];
}

function demoFundamentals(ticker: string, source: "demo" | "demo-fallback" | "unsupported"): Fundamentals {
  const seed = stableHash(ticker);
  const peRatio = 12 + (seed % 45);
  const beta = 0.75 + ((seed >>> 4) % 110) / 100;
  const marketCap = (8 + (seed % 350)) * 1_000_000_000;
  const week52Low = 45 + (seed % 120);
  const week52High = week52Low * (1.25 + ((seed >>> 5) % 80) / 100);
  return {
    peRatio: round(peRatio, 1),
    forwardPe: round(peRatio * 0.92, 1),
    marketCap,
    beta: round(beta, 2),
    revenueGrowth: round(((seed >>> 2) % 35) - 8, 1),
    epsGrowth: round(((seed >>> 3) % 45) - 12, 1),
    grossMargin: round(28 + ((seed >>> 5) % 42), 1),
    netMargin: round(6 + ((seed >>> 6) % 26), 1),
    roe: round(8 + ((seed >>> 7) % 28), 1),
    debtToEquity: round(((seed >>> 8) % 260) / 100, 2),
    currentRatio: round(0.8 + ((seed >>> 9) % 180) / 100, 2),
    priceToSales: round(1.5 + ((seed >>> 10) % 900) / 100, 2),
    dividendYield: round(((seed >>> 11) % 350) / 100, 2),
    week52High: round(week52High, 2),
    week52Low: round(week52Low, 2),
    week52Return: round(((seed >>> 12) % 90) - 35, 1),
    tenDayAverageVolume: 1_000_000 + ((seed >>> 13) % 45) * 200_000,
    threeMonthAverageVolume: 1_500_000 + ((seed >>> 14) % 60) * 180_000,
    source
  };
}

function demoAnalystTrend(ticker: string, source: "demo" | "demo-fallback"): AnalystTrend {
  const seed = stableHash(ticker);
  return toAnalystTrend(
    {
      period: new Date().toISOString().slice(0, 7),
      strongBuy: 1 + (seed % 4),
      buy: 2 + ((seed >>> 2) % 8),
      hold: 3 + ((seed >>> 4) % 10),
      sell: (seed >>> 6) % 4,
      strongSell: (seed >>> 8) % 2
    },
    source
  );
}

function toAnalystTrend(
  trend: Omit<AnalystTrend, "consensus" | "source">,
  source: string
): AnalystTrend {
  const bullish = trend.strongBuy * 2 + trend.buy;
  const bearish = trend.strongSell * 2 + trend.sell;
  const consensus = bullish > bearish + trend.hold * 0.35 ? "BUY" : bearish > bullish ? "AVOID" : "HOLD";
  return { ...trend, consensus, source };
}

function scoreSentiment(text: string): { sentiment: "positive" | "neutral" | "negative"; score: number } {
  const lower = text.toLowerCase();
  const positive = [
    "beat",
    "beats",
    "growth",
    "upgrade",
    "raises",
    "record",
    "profit",
    "strong",
    "launch",
    "demand",
    "partnership",
    "approval"
  ];
  const negative = [
    "miss",
    "cuts",
    "downgrade",
    "lawsuit",
    "probe",
    "weak",
    "decline",
    "loss",
    "risk",
    "warning",
    "recall",
    "layoff"
  ];
  const pos = positive.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);
  const neg = negative.reduce((sum, word) => sum + (lower.includes(word) ? 1 : 0), 0);
  const score = round(Math.max(-1, Math.min(1, (pos - neg) / 4)), 2);
  const sentiment = score >= 0.2 ? "positive" : score <= -0.2 ? "negative" : "neutral";
  return { sentiment, score };
}

function firstNumber(...values: Array<number | null | undefined>) {
  return values.find(isFiniteNumber) ?? null;
}

function normalizeMarketCap(value: number | null) {
  if (!isFiniteNumber(value)) return null;
  return value < 10_000_000 ? value * 1_000_000 : value;
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
