import { Injectable } from "@nestjs/common";
import type { Fundamentals, HistoricalCandle, MarketDataProvider, NewsItem, Quote } from "./market.types";

@Injectable()
export class AlphaVantageProvider implements MarketDataProvider {
  capabilities = {
    name: "alpha-vantage",
    minPollMs: 12_000,
    supportsBatch: false,
    supportsSearch: true,
    supportsQuotes: true,
    supportsFundamentals: true,
    supportsNews: true,
    supportsAnalystTrend: false,
    supportsHistory: true
  };

  private key = configured(process.env.ALPHA_VANTAGE_API_KEY) ? process.env.ALPHA_VANTAGE_API_KEY : undefined;

  async search(symbol: string) {
    if (!this.key || !symbol.trim()) return [];
    const data = await alphaFetch<{ bestMatches?: Array<{ "1. symbol"?: string; "2. name"?: string }> }>(this.key, {
      function: "SYMBOL_SEARCH",
      keywords: symbol.trim()
    });
    return (data?.bestMatches ?? [])
      .filter((item) => item["1. symbol"])
      .slice(0, 10)
      .map((item) => ({ symbol: String(item["1. symbol"]), description: item["2. name"] ?? "Listed equity" }));
  }

  async getQuote(ticker: string): Promise<Quote | null> {
    if (!this.key) return null;
    const normalized = ticker.toUpperCase();
    const data = await alphaFetch<{ "Global Quote"?: Record<string, string> }>(this.key, {
      function: "GLOBAL_QUOTE",
      symbol: normalized
    });
    const quote = data?.["Global Quote"];
    const price = numberFromString(quote?.["05. price"]);
    if (!price || price <= 0) return null;
    return {
      ticker: normalized,
      price,
      change: numberFromString(quote?.["09. change"]) ?? 0,
      changePercent: numberFromPercent(quote?.["10. change percent"]) ?? 0,
      updatedAt: new Date().toISOString(),
      source: "alpha-vantage"
    };
  }

  async history(ticker: string, range: "1d" | "1mo" | "6mo" | "1y"): Promise<HistoricalCandle[] | null> {
    if (!this.key) return null;
    const normalized = ticker.toUpperCase();
    const data = await alphaFetch<Record<string, Record<string, string>>>(this.key, {
      function: "TIME_SERIES_DAILY_ADJUSTED",
      symbol: normalized,
      outputsize: range === "1y" || range === "6mo" ? "full" : "compact"
    });
    const series = data?.["Time Series (Daily)"] as Record<string, Record<string, string>> | undefined;
    if (!series) return null;
    const max = range === "1d" ? 2 : range === "1mo" ? 31 : range === "6mo" ? 126 : 252;
    return Object.entries(series)
      .slice(0, max)
      .reverse()
      .map(([date, row]) => ({
        ticker: normalized,
        date,
        open: positive(numberFromString(row["1. open"])),
        high: positive(numberFromString(row["2. high"])),
        low: positive(numberFromString(row["3. low"])),
        close: positive(numberFromString(row["4. close"])),
        volume: positive(numberFromString(row["6. volume"])),
        source: "alpha-vantage"
      }));
  }

  async fundamentals(ticker: string): Promise<Fundamentals | null> {
    if (!this.key) return null;
    const data = await alphaFetch<Record<string, string>>(this.key, {
      function: "OVERVIEW",
      symbol: ticker.toUpperCase()
    });
    if (!data || Object.keys(data).length === 0 || data.Symbol === undefined) return null;
    return {
      peRatio: numberFromString(data.PERatio),
      forwardPe: numberFromString(data.ForwardPE),
      marketCap: numberFromString(data.MarketCapitalization),
      beta: numberFromString(data.Beta),
      revenueGrowth: percentRatio(numberFromString(data.QuarterlyRevenueGrowthYOY)),
      epsGrowth: percentRatio(numberFromString(data.QuarterlyEarningsGrowthYOY)),
      grossMargin: percentRatio(numberFromString(data.GrossProfitTTM), numberFromString(data.RevenueTTM)),
      netMargin: percentRatio(numberFromString(data.ProfitMargin)),
      roe: percentRatio(numberFromString(data.ReturnOnEquityTTM)),
      priceToSales: numberFromString(data.PriceToSalesRatioTTM),
      dividendYield: percentRatio(numberFromString(data.DividendYield)),
      week52High: numberFromString(data["52WeekHigh"]),
      week52Low: numberFromString(data["52WeekLow"]),
      source: "alpha-vantage"
    };
  }

  async news(ticker: string): Promise<NewsItem[] | null> {
    if (!this.key) return null;
    const data = await alphaFetch<{ feed?: Array<{ title?: string; summary?: string; url?: string; source?: string; time_published?: string; overall_sentiment_score?: number }> }>(
      this.key,
      {
        function: "NEWS_SENTIMENT",
        tickers: ticker.toUpperCase(),
        limit: "10"
      }
    );
    const feed = data?.feed ?? [];
    if (feed.length === 0) return null;
    return feed
      .filter((item) => item.title)
      .slice(0, 8)
      .map((item) => {
        const score = clamp(item.overall_sentiment_score ?? 0, -1, 1);
        return {
          headline: item.title ?? `${ticker.toUpperCase()} news`,
          summary: item.summary,
          url: item.url,
          sentiment: score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral",
          sentimentScore: score,
          source: item.source ? `alpha-vantage:${item.source}` : "alpha-vantage",
          publishedAt: parseAlphaDate(item.time_published)
        };
      });
  }
}

async function alphaFetch<T>(key: string, params: Record<string, string>): Promise<T | null> {
  const search = new URLSearchParams({ ...params, apikey: key });
  const data = await fetchJson<T & { Note?: string; Information?: string; Error?: string }>(`https://www.alphavantage.co/query?${search.toString()}`);
  if (!data || data.Note || data.Information || data.Error) return null;
  return data;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_FETCH_TIMEOUT_MS ?? "6000"));
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function configured(value: string | undefined) {
  return Boolean(value && value.trim() && !value.startsWith("your_"));
}

function numberFromString(value: string | undefined) {
  if (!value || value === "None" || value === "-") return null;
  const parsed = Number(value.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function numberFromPercent(value: string | undefined) {
  return numberFromString(value);
}

function percentRatio(value: number | null, denominator?: number | null) {
  if (value === null) return null;
  if (denominator && denominator > 0) return (value / denominator) * 100;
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function positive(value: number | null) {
  return value && value > 0 ? value : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseAlphaDate(value: string | undefined) {
  if (!value || value.length < 8) return undefined;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
  return iso;
}
