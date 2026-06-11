import { Injectable } from "@nestjs/common";
import type { MarketDataProvider, NewsItem } from "./market.types";

@Injectable()
export class SocialSentimentProvider implements MarketDataProvider {
  capabilities = {
    name: "social-sentiment",
    minPollMs: 60_000,
    supportsBatch: false,
    supportsSearch: false,
    supportsQuotes: false,
    supportsFundamentals: false,
    supportsNews: false,
    supportsAnalystTrend: false,
    supportsHistory: false,
    supportsSocialSentiment: true
  };

  async socialSentiment(ticker: string): Promise<NewsItem[] | null> {
    if (process.env.ENABLE_SOCIAL_SENTIMENT !== "true") return null;
    const data = await fetchJson<{ messages?: Array<{ body?: string; created_at?: string; user?: { username?: string } }> }>(
      `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(ticker.toUpperCase())}.json`
    );
    const messages = data?.messages ?? [];
    if (messages.length === 0) return null;
    return messages
      .filter((message) => message.body)
      .slice(0, 8)
      .map((message) => {
        const score = scoreSentiment(message.body ?? "");
        return {
          headline: `StockTwits: ${message.body?.slice(0, 120)}`,
          summary: message.body,
          sentiment: score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral",
          sentimentScore: score,
          source: "social-sentiment:stocktwits",
          publishedAt: message.created_at
        };
      });
  }
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

function scoreSentiment(text: string) {
  const lower = text.toLowerCase();
  const positive = ["beat", "bull", "buy", "growth", "strong", "upside", "moon", "breakout"].filter((word) => lower.includes(word)).length;
  const negative = ["miss", "bear", "sell", "risk", "weak", "downside", "dump", "lawsuit"].filter((word) => lower.includes(word)).length;
  return Math.max(-1, Math.min(1, (positive - negative) / 4));
}
