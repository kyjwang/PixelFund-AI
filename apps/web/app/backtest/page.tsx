"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { backtestResultSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile } from "../../components/GameUI";
import { api } from "../../lib/api";

type BacktestResult = z.infer<typeof backtestResultSchema>;

export default function BacktestPage() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get("ticker")?.trim().toUpperCase() ?? "");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized) {
      setError("Enter a ticker before running a replay.");
      return;
    }
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
      <PixelCard title="Backtest Lab" eyebrow="simulation room">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-xs font-black uppercase" htmlFor="backtest-ticker">
            Ticker
            <input
              id="backtest-ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="Ticker"
              className="h-12 rounded-[8px] border border-white/70 bg-white/70 px-3 font-pixel text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur focus:bg-white/95"
            />
          </label>
          <PixelButton tone="magic" glow className="self-end" onClick={() => void runBacktest()} disabled={isRunning}>
            {isRunning ? "Running" : "Run Replay"}
          </PixelButton>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-700">
          Replays the Portfolio Manager style signal against historical closes using virtual-cash simulation data only.
        </p>
      </PixelCard>

      {error ? <p className="glass-panel rounded-[8px] border-red-200/80 bg-red-100/80 p-3 text-sm text-red-950">{error}</p> : null}

      <PixelCard title="Replay Results" eyebrow={result?.ticker ?? "waiting"}>
        <div className="grid gap-2 text-xs sm:grid-cols-4">
          <StatTile label="P&L" value={formatMoney(result?.simulatedPnl ?? 0)} tone={(result?.simulatedPnl ?? 0) >= 0 ? "good" : "bad"} />
          <StatTile label="Win Rate" value={`${Math.round((result?.winRate ?? 0) * 100)}%`} />
          <StatTile label="Max Drawdown" value={`${Math.round((result?.maxDrawdown ?? 0) * 100)}%`} tone={(result?.maxDrawdown ?? 0) > 0.2 ? "bad" : undefined} />
          <StatTile label="Accuracy" value={`${Math.round((result?.recommendationAccuracy ?? 0) * 100)}%`} />
        </div>
        <p className="glass-chip mt-3 rounded-[8px] p-2.5 text-xs leading-5 text-slate-700">
          {result
            ? `${result.strategy} ran ${result.trades} simulated trades from ${result.from} to ${result.to}. ${result.dataQuality.messages[0] ?? ""}`
            : "Enter a ticker to see simulated P&L, win rate, drawdown, and recommendation accuracy. No symbol is selected by default."}
        </p>
      </PixelCard>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
