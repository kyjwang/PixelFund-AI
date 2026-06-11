import { Injectable } from "@nestjs/common";
import type { Fundamentals, MarketDataProvider } from "./market.types";

type CompanyTickerRow = {
  cik_str: number;
  ticker: string;
  title: string;
};

type CompanyFacts = {
  facts?: {
    "us-gaap"?: Record<
      string,
      {
        units?: Record<string, Array<{ fy?: number; fp?: string; form?: string; filed?: string; val?: number }>>;
      }
    >;
  };
};

@Injectable()
export class SecEdgarProvider implements MarketDataProvider {
  capabilities = {
    name: "sec-edgar",
    minPollMs: 10_000,
    supportsBatch: false,
    supportsSearch: false,
    supportsQuotes: false,
    supportsFundamentals: true,
    supportsNews: false,
    supportsAnalystTrend: false,
    supportsHistory: false,
    supportsFilings: true
  };

  private tickerCache: Map<string, CompanyTickerRow> | null = null;

  async fundamentals(ticker: string): Promise<Fundamentals | null> {
    const row = await this.resolveTicker(ticker);
    if (!row) return null;
    const cik = String(row.cik_str).padStart(10, "0");
    const facts = await secFetch<CompanyFacts>(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`);
    const gaap = facts?.facts?.["us-gaap"];
    if (!gaap) return null;

    const revenue = annualValues(gaap.Revenues ?? gaap.RevenueFromContractWithCustomerExcludingAssessedTax);
    const netIncome = annualValues(gaap.NetIncomeLoss);
    const assets = annualValues(gaap.Assets);
    const liabilities = annualValues(gaap.Liabilities);
    const equity = annualValues(gaap.StockholdersEquity);
    const shares = annualValues(gaap.CommonStocksIncludingAdditionalPaidInCapital);
    const latestRevenue = latest(revenue);
    const previousRevenue = previous(revenue);
    const latestIncome = latest(netIncome);
    const latestEquity = latest(equity);
    const latestLiabilities = latest(liabilities);

    const hasAny = [latestRevenue, latestIncome, latestEquity, latestLiabilities, latest(assets)].some((value) => typeof value === "number");
    if (!hasAny) return null;

    return {
      revenueGrowth: growthPercent(latestRevenue, previousRevenue),
      netMargin: ratioPercent(latestIncome, latestRevenue),
      roe: ratioPercent(latestIncome, latestEquity),
      debtToEquity: latestLiabilities && latestEquity && latestEquity > 0 ? latestLiabilities / latestEquity : null,
      marketCap: null,
      peRatio: null,
      epsGrowth: null,
      currentRatio: null,
      source: "sec-edgar"
    };
  }

  private async resolveTicker(ticker: string) {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized || normalized.includes(".") || normalized.includes("-")) return null;
    if (!this.tickerCache) {
      const data = await secFetch<Record<string, CompanyTickerRow>>("https://www.sec.gov/files/company_tickers.json");
      if (!data) return null;
      this.tickerCache = new Map(Object.values(data).map((row) => [row.ticker.toUpperCase(), row]));
    }
    return this.tickerCache.get(normalized) ?? null;
  }
}

async function secFetch<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MARKET_FETCH_TIMEOUT_MS ?? "6000"));
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": process.env.SEC_EDGAR_USER_AGENT ?? "PixelFund AI educational simulator contact@example.com",
        accept: "application/json"
      }
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function annualValues(fact: CompanyFacts["facts"] extends infer _T ? { units?: Record<string, Array<{ fy?: number; fp?: string; form?: string; filed?: string; val?: number }>> } | undefined : never) {
  const rows = Object.values(fact?.units ?? {})
    .flat()
    .filter((item) => item.form === "10-K" && item.fp === "FY" && typeof item.val === "number" && typeof item.fy === "number")
    .sort((a, b) => (a.fy ?? 0) - (b.fy ?? 0) || String(a.filed ?? "").localeCompare(String(b.filed ?? "")));
  const byYear = new Map<number, number>();
  for (const row of rows) byYear.set(row.fy ?? 0, row.val ?? 0);
  return Array.from(byYear.entries())
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
}

function latest(values: Array<{ year: number; value: number }>) {
  return values.at(-1)?.value ?? null;
}

function previous(values: Array<{ year: number; value: number }>) {
  return values.at(-2)?.value ?? null;
}

function growthPercent(current: number | null, prior: number | null) {
  if (current === null || prior === null || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function ratioPercent(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return (numerator / denominator) * 100;
}
