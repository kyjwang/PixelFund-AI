"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  analysisExplanationSchema,
  analysisRunSchema,
  marketContextSchema
} from "@pixelfund/schemas";
import {
  AgentCard,
  PixelButton,
  PixelCard,
  StatTile,
  TeamDecisionPanel
} from "../../components/GameUI";
import { gameAgents } from "../../components/PixelOffice";
import { api } from "../../lib/api";

type AnalysisRun = z.infer<typeof analysisRunSchema>;
type AnalysisExplanation = z.infer<typeof analysisExplanationSchema>;
type MarketContext = z.infer<typeof marketContextSchema>;

const meetingSteps = [
  "Technical Analyst checks price action.",
  "Fundamentals Analyst reviews valuation.",
  "News Analyst scans headlines.",
  "Macro Analyst checks rates and regime.",
  "Bull Researcher builds the upside case.",
  "Bear Researcher challenges the setup.",
  "Trader Agent converts debate into an execution plan.",
  "Risk Council reviews drawdown exposure.",
  "Portfolio Manager prepares final weighting."
];

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get("ticker")?.toUpperCase() ?? "AAPL");
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [explanation, setExplanation] = useState<AnalysisExplanation | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [selectedAgent, setSelectedAgent] = useState("BULL_RESEARCHER");
  const [meetingLog, setMeetingLog] = useState<string[]>([]);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = useMemo(
    () => runs.find((run) => run.ticker === ticker.toUpperCase()) ?? runs[0],
    [runs, ticker]
  );

  const completedCommittee = useMemo(
    () => (latest?.recommendations ?? []).filter((rec) => rec.status === "COMPLETED" && rec.agentType !== "PORTFOLIO_MANAGER"),
    [latest]
  );

  const voteMix = useMemo(() => {
    if (explanation) return explanation.voteMix;
    const mix = { BUY: 0, HOLD: 0, AVOID: 0 };
    for (const rec of completedCommittee) {
      if (rec.recommendation === "BUY" || rec.recommendation === "HOLD" || rec.recommendation === "AVOID") mix[rec.recommendation] += 1;
    }
    return mix;
  }, [completedCommittee, explanation]);

  const bullResearcher = latest?.recommendations?.find((r) => r.agentType === "BULL_RESEARCHER");
  const bearResearcher = latest?.recommendations?.find((r) => r.agentType === "BEAR_RESEARCHER");
  const traderAgent = latest?.recommendations?.find((r) => r.agentType === "TRADER_AGENT");
  const riskCouncil = ["AGGRESSIVE_RISK", "NEUTRAL_RISK", "CONSERVATIVE_RISK"].map((agentType) =>
    latest?.recommendations?.find((r) => r.agentType === agentType)
  );

  async function refresh(targetTicker = ticker) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    try {
      const [nextRuns, nextContext] = await Promise.all([
        api("/analysis-runs", z.array(analysisRunSchema)),
        api(`/stocks/${encodeURIComponent(normalized)}/context`, marketContextSchema)
      ]);
      setRuns(nextRuns);
      setMarketContext(nextContext);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load research data");
    }
  }

  function startTeamMeeting() {
    if (isMeetingRunning) return;
    setIsMeetingRunning(true);
    setMeetingLog([]);

    meetingSteps.forEach((step, idx) => {
      window.setTimeout(() => {
        setMeetingLog((items) => [...items, step]);
        if (idx === meetingSteps.length - 1) setIsMeetingRunning(false);
      }, idx * 520);
    });
  }

  useEffect(() => {
    void refresh(ticker);
  }, []);

  useEffect(() => {
    if (!latest?.id) {
      setExplanation(null);
      return;
    }

    const controller = new AbortController();
    void api(`/analysis-runs/${encodeURIComponent(latest.id)}/explain`, analysisExplanationSchema, {
      signal: controller.signal
    })
      .then(setExplanation)
      .catch(() => setExplanation(null));

    return () => controller.abort();
  }, [latest?.id, latest?.updatedAt]);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="Research Room" eyebrow="agent evidence" className="bg-[#fff8e7]">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-xs font-black uppercase" htmlFor="research-ticker">
            Ticker
            <input
              id="research-ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm"
            />
          </label>
          <PixelButton tone="magic" glow className="self-end" onClick={() => void refresh(ticker)}>
            Load Evidence
          </PixelButton>
        </div>
      </PixelCard>

      {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <TeamDecisionPanel
          score={explanation ? String(Math.round(explanation.managerScore)) : undefined}
          confidence={explanation ? `${Math.round(explanation.managerConfidence * 100)}%` : undefined}
          coverageText={explanation ? `${explanation.coverage.completed}/${explanation.coverage.total}` : `${completedCommittee.length}/14`}
          voteText={`${voteMix.BUY} BUY | ${voteMix.HOLD} HOLD | ${voteMix.AVOID} AVOID`}
          caveats={explanation?.caveats ?? []}
        >
          {(explanation?.agents ?? []).length > 0
            ? explanation?.agents.filter((agent) => agent.agentType !== "PORTFOLIO_MANAGER").map((agent) => (
                <AgentCard
                  key={agent.agentType}
                  role={`${agent.role}${explanation.topContributors.includes(agent.agentType) ? " *" : ""}`}
                  status={agent.status}
                  recommendation={agent.recommendation}
                  confidence={agent.confidence}
                  selected={selectedAgent === agent.agentType}
                  onSelect={() => setSelectedAgent(agent.agentType)}
                />
              ))
            : gameAgents.slice(0, 8).map((agent) => (
                <AgentCard
                  key={agent.id}
                  role={agent.role}
                  status="idle"
                  selected={selectedAgent === agent.id}
                  onSelect={() => setSelectedAgent(agent.id)}
                />
              ))}
        </TeamDecisionPanel>

        <PixelCard title="Team Meeting" eyebrow="live room log">
          <PixelButton tone="magic" onClick={startTeamMeeting} disabled={isMeetingRunning}>
            {isMeetingRunning ? "Meeting Running" : "Start Meeting"}
          </PixelButton>
          <div className="mt-3 max-h-72 overflow-auto border-2 border-black bg-[#0f172a] p-2 font-mono text-xs text-[#bbf7d0]">
            {meetingLog.length === 0 ? (
              <p>Waiting for the team lead...</p>
            ) : (
              meetingLog.map((item, idx) => (
                <p key={`${item}-${idx}`} className="border-b border-[#14532d] py-1 last:border-b-0">
                  {idx + 1}. {item}
                </p>
              ))
            )}
          </div>
        </PixelCard>
      </section>

      <PixelCard title="Debate Floor" eyebrow="bull vs bear">
        <div className="grid gap-3 lg:grid-cols-2">
          <DebateCard title="Bull Researcher" result={bullResearcher} tone="good" onSelect={() => setSelectedAgent("BULL_RESEARCHER")} />
          <DebateCard title="Bear Researcher" result={bearResearcher} tone="bad" onSelect={() => setSelectedAgent("BEAR_RESEARCHER")} />
        </div>
        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_1.4fr]">
          <DebateCard title="Trader Plan" result={traderAgent} tone="neutral" onSelect={() => setSelectedAgent("TRADER_AGENT")} />
          <div className="grid gap-3 md:grid-cols-3">
            {riskCouncil.map((risk, idx) => (
              <DebateCard
                key={risk?.agentType ?? idx}
                title={risk ? agentLabel(risk.agentType) : ["Aggressive Risk", "Neutral Risk", "Conservative Risk"][idx]}
                result={risk}
                tone={idx === 0 ? "good" : idx === 2 ? "bad" : "neutral"}
                onSelect={() => setSelectedAgent(risk?.agentType ?? ["AGGRESSIVE_RISK", "NEUTRAL_RISK", "CONSERVATIVE_RISK"][idx])}
              />
            ))}
          </div>
        </div>
      </PixelCard>

      <PixelCard title="Evidence Snapshot" eyebrow={marketContext?.dataQuality.status ?? "loading"}>
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="P/E" value={displayNumber(marketContext?.fundamentals.peRatio)} />
          <StatTile label="Revenue Growth" value={displayPercent(marketContext?.fundamentals.revenueGrowth)} />
          <StatTile label="EPS Growth" value={displayPercent(marketContext?.fundamentals.epsGrowth)} />
          <StatTile label="Beta" value={displayNumber(marketContext?.fundamentals.beta)} />
          <StatTile label="52w High" value={displayMoney(marketContext?.fundamentals.week52High)} />
          <StatTile label="52w Low" value={displayMoney(marketContext?.fundamentals.week52Low)} />
          <StatTile label="52w Return" value={displayPercent(marketContext?.fundamentals.week52Return)} />
          <StatTile label="Analyst Trend" value={marketContext?.analystTrend?.consensus ?? "N/A"} />
        </div>
        <div className="mt-3 grid gap-2 lg:grid-cols-2">
          {(marketContext?.news ?? []).slice(0, 4).map((item) => (
            <p key={`${item.source}-${item.headline}`} className="border-2 border-black bg-[#f7fff7] px-2 py-2 text-xs leading-5">
              <span className="font-semibold">{item.sentiment.toUpperCase()}</span> {item.headline}
            </p>
          ))}
          {(marketContext?.news.length ?? 0) === 0 ? <p className="text-xs text-slate-600">No news evidence loaded.</p> : null}
        </div>
      </PixelCard>
    </main>
  );
}

function DebateCard({
  title,
  result,
  tone,
  onSelect
}: {
  title: string;
  result?: AnalysisRun["recommendations"][number];
  tone: "good" | "bad" | "neutral";
  onSelect: () => void;
}) {
  const toneClass = tone === "good" ? "bg-emerald-100" : tone === "bad" ? "bg-red-100" : "bg-[#edf6f9]";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-40 border-2 border-black p-3 text-left shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase">{title}</p>
        <span className={badgeClass(result?.recommendation ?? result?.status ?? "PENDING")}>{result?.recommendation ?? result?.status ?? "PENDING"}</span>
      </div>
      <p className="mt-2 min-h-10 text-xs leading-5">{result?.summary ?? "Waiting for this agent to report."}</p>
      <div className="mt-2 grid gap-1">
        {(result?.reasons ?? []).slice(0, 2).map((reason, idx) => (
          <EvidenceReason key={`${result?.id ?? title}-${idx}`} reason={reason} />
        ))}
      </div>
    </button>
  );
}

function EvidenceReason({ reason }: { reason: string }) {
  const match = reason.match(/^\[([^\]]+)\]\s*(.*)$/);
  return (
    <p className="flex gap-2 border-2 border-black bg-[#f7fff7] px-2 py-2 text-xs leading-5">
      {match ? <span className="h-fit border border-black bg-white px-1 text-[10px] font-semibold uppercase">{match[1]}</span> : null}
      <span>{match ? match[2] : reason}</span>
    </p>
  );
}

function agentLabel(agent: string) {
  return agent
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function badgeClass(value: string) {
  const base = "border-2 border-slate-950 px-2 py-1 text-xs font-semibold";
  if (value === "BUY") return `${base} bg-emerald-200 text-emerald-950`;
  if (value === "AVOID") return `${base} bg-red-200 text-red-950`;
  if (value === "HOLD") return `${base} bg-amber-200 text-amber-950`;
  return `${base} bg-slate-200 text-slate-950`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function displayNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : "N/A";
}

function displayPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? formatSignedPercent(value) : "N/A";
}

function displayMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? formatMoney(value) : "N/A";
}
