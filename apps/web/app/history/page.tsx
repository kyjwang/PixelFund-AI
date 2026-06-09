"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { AGENT_PROFILES } from "@pixelfund/domain";
import { analysisRunSchema, tradeSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile, StatusBadge, cx } from "../../components/GameUI";
import { api } from "../../lib/api";

type AnalysisRun = z.infer<typeof analysisRunSchema>;
type Trade = z.infer<typeof tradeSchema>;

const clearHistorySchema = z.object({
  deletedAnalysisRuns: z.number(),
  deletedAgentResults: z.number()
});

const agentOrder = new Map(AGENT_PROFILES.map((agent, index) => [agent.id, index]));

export default function HistoryPage() {
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  async function refresh() {
    try {
      const [nextRuns, nextTrades] = await Promise.all([
        api("/analysis-runs", z.array(analysisRunSchema)),
        api("/trades?limit=50", z.array(tradeSchema))
      ]);
      setRuns(nextRuns);
      setTrades(nextTrades);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load history");
    }
  }

  async function clearAnalysisHistory() {
    if (isClearing || runs.length === 0) return;
    const confirmed = window.confirm("Clear all AI analysis history? Trades, portfolio, cash, PnL, and saved tickers stay untouched.");
    if (!confirmed) return;

    setIsClearing(true);
    try {
      await api("/analysis-runs", clearHistorySchema, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to clear AI history");
    } finally {
      setIsClearing(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="History Vault" eyebrow="records room">
        <div className="grid gap-2 sm:grid-cols-2">
          <StatTile label="AI Analyses" value={`${runs.length} runs`} />
          <StatTile label="Fills" value={`${trades.length} records`} />
        </div>
      </PixelCard>

      {error ? <p className="glass-panel rounded-[8px] border-red-200/80 bg-red-100/80 p-3 text-sm text-red-950">{error}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.75fr]">
        <PixelCard
          title="AI Analysis History"
          eyebrow="agent archive"
          action={
            <PixelButton tone="bad" disabled={isClearing || runs.length === 0} onClick={() => void clearAnalysisHistory()} className="whitespace-nowrap">
              {isClearing ? "Clearing" : "Clear AI History"}
            </PixelButton>
          }
        >
          <div className="max-h-[620px] overflow-auto pr-1">
            <div className="grid gap-3">
              {runs.map((run) => (
                <details key={run.id} className="group glass-chip rounded-[8px] p-3 text-xs">
                  <summary className="grid cursor-pointer list-none gap-3 [&::-webkit-details-marker]:hidden">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-pixel text-xs text-slate-950">{run.ticker}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase text-slate-500">{formatDateTime(run.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <StatusBadge value={run.finalRec ?? run.status} />
                        <StatusBadge value={run.status} />
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-800">{run.finalSummary ?? run.errorReason ?? "Analysis in progress"}</p>
                    <span className="text-[10px] font-bold uppercase text-[color:var(--pf-accent)] group-open:hidden">View Agent Details</span>
                    <span className="hidden text-[10px] font-bold uppercase text-[color:var(--pf-accent)] group-open:inline">Hide Agent Details</span>
                  </summary>

                  <div className="mt-3 border-t border-white/65 pt-3">
                    <p className="mb-2 text-[10px] font-black uppercase text-slate-500">Agent Details</p>
                    <div className="grid gap-2">
                      {sortAgentResults(run.recommendations).map((agent) => (
                        <div key={agent.id} className="rounded-[8px] border border-white/65 bg-white/52 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-950">{agentRole(agent.agentType)}</p>
                              <p className="mt-1 text-[10px] font-semibold uppercase text-slate-500">{stageLabel(agent.agentType)}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <StatusBadge value={agent.status} />
                              {agent.recommendation ? <StatusBadge value={agent.recommendation} /> : null}
                              {typeof agent.confidence === "number" ? <StatusBadge value={`${Math.round(agent.confidence * 100)}% confidence`} /> : null}
                            </div>
                          </div>

                          <p className={cx("mt-2 whitespace-pre-wrap break-words leading-5", agent.errorReason ? "text-red-900" : "text-slate-800")}>
                            {agent.summary ?? agent.errorReason ?? "Waiting for this agent."}
                          </p>

                          {agent.reasons?.length ? (
                            <div className="mt-2 grid gap-1">
                              {agent.reasons.map((reason, index) => (
                                <p key={`${agent.id}-reason-${index}`} className="rounded-[8px] border border-slate-950/10 bg-white/64 px-2 py-1.5 leading-5 text-slate-700">
                                  {reason}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
              {runs.length === 0 ? <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No AI analyses yet.</p> : null}
            </div>
          </div>
        </PixelCard>

        <PixelCard title="Fill History" eyebrow="virtual order tape">
          <div className="glass-chip max-h-[420px] overflow-auto rounded-[8px]">
            {trades.map((trade) => (
              <div key={trade.id} className="grid grid-cols-[52px_58px_1fr] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                <span className={trade.side === "BUY" ? "font-semibold text-emerald-800" : "font-semibold text-slate-800"}>{trade.side}</span>
                <span>{trade.ticker}</span>
                <span className="text-right">{trade.quantity} @ {formatMoney(trade.price)} {trade.orderType ? `(${trade.orderType})` : ""}</span>
              </div>
            ))}
            {trades.length === 0 ? <p className="p-2 text-xs text-slate-600">No fills yet.</p> : null}
          </div>
        </PixelCard>
      </section>
    </main>
  );
}

function sortAgentResults(agents: AnalysisRun["recommendations"]) {
  return [...agents].sort((a, b) => (agentOrder.get(a.agentType) ?? 999) - (agentOrder.get(b.agentType) ?? 999));
}

function agentRole(agentType: string) {
  return AGENT_PROFILES.find((agent) => agent.id === agentType)?.role ?? titleCase(agentType);
}

function stageLabel(agentType: string) {
  const stage = AGENT_PROFILES.find((agent) => agent.id === agentType)?.stage;
  if (stage === "SPECIALIST") return "Specialist";
  if (stage === "DEBATE") return "Debate";
  if (stage === "TRADER") return "Trader";
  if (stage === "RISK_COUNCIL") return "Risk Council";
  if (stage === "SYNTHESIS") return "Synthesis";
  return "Agent";
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
