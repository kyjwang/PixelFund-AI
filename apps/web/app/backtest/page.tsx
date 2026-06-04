"use client";

import { useState } from "react";
import { z } from "zod";
import { backtestResultSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile } from "../../components/GameUI";
import { api } from "../../lib/api";

type BacktestResult = z.infer<typeof backtestResultSchema>;

export default function BacktestPage() {
  const [ticker, setTicker] = useState("AAPL");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    const normalized = ticker.trim().toUpperCase() || "AAPL";
    setIsRunning(true);
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 1000 * 60 * 60 * 24 * 365);
      const next = await api("/backtests", backtestResultSchema, {
        method: "POST",
        body: JSON.stringify({
          ticker: normalized,
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          strategy: "PORTFOLIO_MANAGER_REPLAY"
        })
      });
      setResult(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="Backtest Lab" eyebrow="simulation room" className="bg-[#fff8e7]">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-xs font-black uppercase" htmlFor="backtest-ticker">
            Ticker
            <input
              id="backtest-ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm"
            />
          </label>
          <PixelButton tone="magic" glow className="self-end" onClick={() => void runBacktest()} disabled={isRunning}>
            {isRunning ? "Running" : "Run Replay"}
          </PixelButton>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-700">
          Replays the Portfolio Manager style signal against historical closes using fake-money simulation data only.
        </p>
      </PixelCard>

      {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}

      <PixelCard title="Replay Results" eyebrow={result?.ticker ?? "waiting"}>
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <StatTile label="P&L" value={formatMoney(result?.simulatedPnl ?? 0)} tone={(result?.simulatedPnl ?? 0) >= 0 ? "good" : "bad"} />
          <StatTile label="Win Rate" value={`${Math.round((result?.winRate ?? 0) * 100)}%`} />
          <StatTile label="Max Drawdown" value={`${Math.round((result?.maxDrawdown ?? 0) * 100)}%`} tone={(result?.maxDrawdown ?? 0) > 0.2 ? "bad" : undefined} />
          <StatTile label="Accuracy" value={`${Math.round((result?.recommendationAccuracy ?? 0) * 100)}%`} />
        </div>
        <p className="mt-3 border-2 border-black bg-[#f7fff7] p-2 text-xs leading-5 text-slate-700">
          {result
            ? `${result.strategy} ran ${result.trades} simulated trades from ${result.from} to ${result.to}. ${result.dataQuality.messages[0] ?? ""}`
            : "Run a replay to see simulated P&L, win rate, drawdown, and recommendation accuracy."}
        </p>
      </PixelCard>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

