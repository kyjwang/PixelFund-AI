import { Injectable } from "@nestjs/common";
import type { MacroSeriesPoint, MarketDataProvider } from "./market.types";

const macroSeries = [
  { series: "FEDFUNDS", label: "Federal Funds Rate" },
  { series: "CPIAUCSL", label: "Consumer Price Index" },
  { series: "UNRATE", label: "Unemployment Rate" },
  { series: "GDP", label: "Gross Domestic Product" },
  { series: "M2SL", label: "M2 Money Supply" }
];

@Injectable()
export class FredProvider implements MarketDataProvider {
  capabilities = {
    name: "fred",
    minPollMs: 60_000,
    supportsBatch: false,
    supportsSearch: false,
    supportsQuotes: false,
    supportsFundamentals: false,
    supportsNews: false,
    supportsAnalystTrend: false,
    supportsHistory: false,
    supportsMacro: true
  };

  private key = configured(process.env.FRED_API_KEY) ? process.env.FRED_API_KEY : undefined;

  async macroSeries(_ticker: string): Promise<MacroSeriesPoint[] | null> {
    if (!this.key) return null;
    const points = await Promise.all(
      macroSeries.map(async (series) => {
        const data = await fetchJson<{ observations?: Array<{ date?: string; value?: string }> }>(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${series.series}&api_key=${this.key}&file_type=json&sort_order=desc&limit=1`
        );
        const latest = data?.observations?.find((item) => item.value && item.value !== ".");
        const value = latest ? Number(latest.value) : Number.NaN;
        if (!latest?.date || !Number.isFinite(value)) return null;
        return {
          series: series.series,
          label: series.label,
          value,
          date: latest.date,
          source: "fred"
        };
      })
    );
    const usable = points.filter((point): point is MacroSeriesPoint => Boolean(point));
    return usable.length > 0 ? usable : null;
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

function configured(value: string | undefined) {
  return Boolean(value && value.trim() && !value.startsWith("your_"));
}
