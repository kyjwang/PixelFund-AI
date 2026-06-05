"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { analysisRunSchema, tradeSchema, watchlistItemSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile } from "../../components/GameUI";
import { api } from "../../lib/api";

type AnalysisRun = z.infer<typeof analysisRunSchema>;
type WatchlistItem = z.infer<typeof watchlistItemSchema>;
type Trade = z.infer<typeof tradeSchema>;

export default function HistoryPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [nextRuns, nextWatchlist, nextTrades] = await Promise.all([
        api("/analysis-runs", z.array(analysisRunSchema)),
        api("/watchlist", z.array(watchlistItemSchema)),
        api("/trades?limit=50", z.array(tradeSchema))
      ]);
      setRuns(nextRuns);
      setWatchlist(nextWatchlist);
      setTrades(nextTrades);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load history");
    }
  }

  async function addWatchlist() {
    const item = await api("/watchlist", watchlistItemSchema, {
      method: "POST",
      body: JSON.stringify({ ticker: ticker.trim().toUpperCase() || "AAPL" })
    });
    setWatchlist((items) => [item, ...items.filter((x) => x.ticker !== item.ticker)]);
  }

  async function removeWatchlist(symbol: string) {
    await api(`/watchlist/${encodeURIComponent(symbol)}`, z.object({ ticker: z.string() }), { method: "DELETE" });
    setWatchlist((items) => items.filter((x) => x.ticker !== symbol));
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="History Vault" eyebrow="records room" className="bg-[#fff8e7]">
        <div className="grid gap-2 sm:grid-cols-3">
          <StatTile label="Watchlist" value={`${watchlist.length} tickers`} />
          <StatTile label="Recommendations" value={`${runs.length} runs`} />
          <StatTile label="Simulated Trades" value={`${trades.length} orders`} />
        </div>
      </PixelCard>

      {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1fr]">
        <PixelCard title="Watchlist" eyebrow="ticker shelf">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              className="h-10 border-2 border-black bg-[#f7fff7] px-2 font-pixel text-sm"
              aria-label="Ticker to add"
            />
            <PixelButton tone="good" onClick={() => void addWatchlist()}>
              Add
            </PixelButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {watchlist.length === 0 ? <p className="text-xs text-slate-700">No watchlist items yet.</p> : null}
            {watchlist.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-1 border-2 border-black bg-[#f7fff7] px-2 py-1">
                <span className="text-xs font-semibold">{item.ticker}</span>
                <button className="border-l border-black pl-2 text-xs text-red-800" onClick={() => void removeWatchlist(item.ticker)} aria-label={`Remove ${item.ticker}`}>
                  x
                </button>
              </div>
            ))}
          </div>
        </PixelCard>

        <PixelCard title="Recommendation History" eyebrow="committee log">
          <div className="max-h-[420px] overflow-auto border-2 border-black">
            {runs.map((run) => (
              <div key={run.id} className="grid grid-cols-[70px_1fr_82px] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                <span className="font-semibold">{run.ticker}</span>
                <span className="truncate">{run.finalSummary ?? "Analysis in progress"}</span>
                <span className="text-right font-semibold">{run.finalRec ?? run.status}</span>
              </div>
            ))}
            {runs.length === 0 ? <p className="p-2 text-xs text-slate-600">No recommendations yet.</p> : null}
          </div>
        </PixelCard>

        <PixelCard title="Trade History" eyebrow="virtual order tape">
          <div className="max-h-[420px] overflow-auto border-2 border-black">
            {trades.map((trade) => (
              <div key={trade.id} className="grid grid-cols-[52px_58px_1fr] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                <span className={trade.side === "BUY" ? "font-semibold text-emerald-800" : "font-semibold text-slate-800"}>{trade.side}</span>
                <span>{trade.ticker}</span>
                <span className="text-right">{trade.quantity} @ {formatMoney(trade.price)} {trade.orderType ? `(${trade.orderType})` : ""}</span>
              </div>
            ))}
            {trades.length === 0 ? <p className="p-2 text-xs text-slate-600">No simulated trades yet.</p> : null}
          </div>
        </PixelCard>
      </section>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
