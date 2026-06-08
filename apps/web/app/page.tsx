"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import { APP_DISCLAIMER } from "@pixelfund/config";
import {
  analysisExplanationSchema,
  analysisRunSchema,
  marketContextSchema,
  portfolioSchema,
  quoteSchema,
  tradeSchema,
  watchlistItemSchema,
  wsQuoteStaleSchema
} from "@pixelfund/schemas";
import {
  AchievementToast,
  AgentCard,
  MissionPanel,
  PixelButton,
  PixelCard,
  PortfolioHud,
  StatusBadge,
  StockSearchPanel,
  TeamDecisionPanel
} from "../components/GameUI";
import { gameAgents, PixelOffice } from "../components/PixelOffice";
import { api } from "../lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
const stockSearchSchema = z.array(z.object({ symbol: z.string(), description: z.string() }));

type Portfolio = z.infer<typeof portfolioSchema>;
type AnalysisRun = z.infer<typeof analysisRunSchema>;
type AnalysisExplanation = z.infer<typeof analysisExplanationSchema>;
type WatchlistItem = z.infer<typeof watchlistItemSchema>;
type Quote = z.infer<typeof quoteSchema>;
type MarketContext = z.infer<typeof marketContextSchema>;
type Trade = z.infer<typeof tradeSchema>;

export default function HomePage() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get("ticker")?.toUpperCase() ?? "AAPL");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; description: string }>>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [analysisExplanation, setAnalysisExplanation] = useState<AnalysisExplanation | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("TECHNICAL_ANALYST");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [quoteStale, setQuoteStale] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [achievement, setAchievement] = useState<{ title: string; detail: string } | null>(null);
  const [hasAskedTeam, setHasAskedTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tickerRef = useRef(ticker);
  const watchlistRef = useRef(watchlist);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh(targetTicker = tickerRef.current) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    try {
      const [p, r, c, w, t] = await Promise.all([
        api("/portfolio", portfolioSchema),
        api("/analysis-runs", z.array(analysisRunSchema)),
        api(`/stocks/${encodeURIComponent(normalized)}/context`, marketContextSchema),
        api("/watchlist", z.array(watchlistItemSchema)),
        api("/trades?limit=20", z.array(tradeSchema))
      ]);
      setPortfolio(p);
      setRuns(r);
      setMarketContext(c);
      setQuote(c.quote);
      setWatchlist(w);
      setTrades(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to refresh office data");
    }
  }

  function scheduleRefresh(targetTicker = tickerRef.current) {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      void refresh(targetTicker);
    }, 300);
  }

  function subscribeTickers(socket: Socket, currentTicker: string, items: WatchlistItem[]) {
    socket.emit("quote.subscribe", { ticker: currentTicker });
    for (const item of items) socket.emit("quote.subscribe", { ticker: item.ticker });
  }

  useEffect(() => {
    tickerRef.current = ticker;
  }, [ticker]);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    const q = ticker.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const results = await api(`/stocks/search?q=${encodeURIComponent(q)}`, stockSearchSchema, {
          signal: controller.signal
        });
        setSearchResults(results.slice(0, 8));
      } catch {
        setSearchResults([]);
      }
    }, 220);

    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [ticker]);

  useEffect(() => {
    void refresh(ticker);
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      randomizationFactor: 0.4
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      subscribeTickers(socket, tickerRef.current, watchlistRef.current);
      setQuoteStale(false);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setQuoteStale(true);
    });

    socket.on("quote.updated", (payload: unknown) => {
      const parsed = quoteSchema.safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.ticker === tickerRef.current.toUpperCase()) {
        setQuote(parsed.data);
        setQuoteStale(false);
      }
    });

    socket.on("quote.stale", (payload: unknown) => {
      const parsed = wsQuoteStaleSchema.safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.ticker === tickerRef.current.toUpperCase()) setQuoteStale(true);
    });

    socket.on("analysis.agent.started", () => scheduleRefresh(tickerRef.current));
    socket.on("analysis.agent.completed", () => scheduleRefresh(tickerRef.current));
    socket.on("analysis.agent.failed", () => scheduleRefresh(tickerRef.current));
    socket.on("analysis.portfolioRecommendation.completed", () => {
      setIsAnalyzing(false);
      scheduleRefresh(tickerRef.current);
    });
    socket.on("analysis.portfolioRecommendation.failed", () => {
      setIsAnalyzing(false);
      scheduleRefresh(tickerRef.current);
    });
    socket.on("portfolio.updated", (payload: unknown) => {
      const parsed = portfolioSchema.safeParse(payload);
      if (parsed.success) {
        setPortfolio(parsed.data);
        scheduleRefresh(tickerRef.current);
      }
    });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected) subscribeTickers(socketRef.current, ticker, watchlist);
  }, [ticker, watchlist]);

  const latest = useMemo(
    () => runs.find((run) => run.ticker === ticker.toUpperCase()) ?? runs[0],
    [runs, ticker]
  );

  useEffect(() => {
    if (!latest?.id) {
      setAnalysisExplanation(null);
      return;
    }

    const controller = new AbortController();
    void api(`/analysis-runs/${encodeURIComponent(latest.id)}/explain`, analysisExplanationSchema, {
      signal: controller.signal
    })
      .then(setAnalysisExplanation)
      .catch(() => setAnalysisExplanation(null));

    return () => controller.abort();
  }, [latest?.id, latest?.updatedAt]);

  const selected = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === selectedAgent),
    [latest, selectedAgent]
  );

  const selectedGameAgent = useMemo(
    () => gameAgents.find((agent) => agent.id === selectedAgent) ?? gameAgents[0],
    [selectedAgent]
  );

  const selectedExplanation = analysisExplanation?.agents.find((agent) => agent.agentType === selectedAgent);
  const portfolioManager = latest?.recommendations?.find((r) => r.agentType === "PORTFOLIO_MANAGER");
  const teamLead = latest?.recommendations?.find((r) => r.agentType === "TEAM_LEAD");
  const completedCommittee = useMemo(
    () => (latest?.recommendations ?? []).filter((r) => r.status === "COMPLETED" && r.agentType !== "PORTFOLIO_MANAGER"),
    [latest]
  );

  const voteMix = useMemo(() => {
    if (analysisExplanation) return analysisExplanation.voteMix;
    const mix = { BUY: 0, HOLD: 0, AVOID: 0 };
    for (const rec of completedCommittee) {
      if (rec.recommendation === "BUY" || rec.recommendation === "HOLD" || rec.recommendation === "AVOID") mix[rec.recommendation] += 1;
    }
    return mix;
  }, [analysisExplanation, completedCommittee]);

  const agentStatuses = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const rec of latest?.recommendations ?? []) map[rec.agentType] = rec.status;
    return map;
  }, [latest]);

  const agentRecommendations = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const rec of latest?.recommendations ?? []) map[rec.agentType] = rec.recommendation ?? undefined;
    return map;
  }, [latest]);

  async function selectTicker(symbol: string) {
    const normalized = symbol.toUpperCase();
    setTicker(normalized);
    setSearchResults([]);
    await refresh(normalized);
  }

  async function runAnalysis(targetTicker = tickerRef.current) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    setTicker(normalized);
    setIsAnalyzing(true);
    setHasAskedTeam(true);
    setAchievement({ title: "Committee Convened", detail: `${normalized} is now moving through the AI office.` });
    window.setTimeout(() => setAchievement(null), 3200);
    try {
      const run = await api("/analysis-runs", analysisRunSchema, {
        method: "POST",
        body: JSON.stringify({ ticker: normalized, idempotencyKey: `${normalized}-${Date.now()}` })
      });
      setRuns((existing) => [run, ...existing.filter((item) => item.id !== run.id)]);
      await refresh(normalized);
      setError(null);
    } catch (e) {
      setIsAnalyzing(false);
      setError(e instanceof Error ? e.message : "Analysis failed");
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === "Enter") {
          event.preventDefault();
          void runAnalysis(tickerRef.current);
        }
        return;
      }

      const idx = Number(event.key);
      if (idx >= 1 && idx <= Math.min(gameAgents.length, 9)) {
        setSelectedAgent(gameAgents[idx - 1].id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const finalRec = latest?.finalRec ?? portfolioManager?.recommendation ?? "PENDING";
  const dataQuality = marketContext?.dataQuality.score ?? 0;
  const dataQualityStatus = marketContext?.dataQuality.status ?? "DEMO";
  const accountValue = portfolio?.totalValue ?? 0;
  const pnlPercent = portfolio && portfolio.totalValue > 0 ? portfolio.totalPnlPercent : 0;
  const completedAnalyses = runs.filter((run) => run.status === "COMPLETED").length;
  const xpLevel = Math.max(1, Math.floor((completedAnalyses + (trades.length > 0 ? 1 : 0) + watchlist.length) / 3) + 1);
  const streak = (portfolio?.totalPnl ?? 0) >= 0 ? `W${Math.max(1, Math.min(9, completedAnalyses || 1))}` : "L1";
  const portfolioMood = (portfolio?.totalPnl ?? 0) > 0 ? "Bullish" : (portfolio?.totalPnl ?? 0) < 0 ? "Bruised" : "Curious";
  const terminalStatus = agentStatuses[selectedGameAgent.id] ?? selected?.status ?? "IDLE";
  const terminalSignal = selected?.recommendation ?? selectedGameAgent.signal;
  const terminalConfidence =
    typeof selected?.confidence === "number" ? Math.round(selected.confidence * 100) : selectedGameAgent.confidence;
  const agentAnalysisText =
    selected?.summary ??
    selectedExplanation?.summary ??
    "Run an analysis to load backend output for this agent.";

  return (
    <main className="min-h-[100dvh] text-slate-950" aria-label="pixelFund AI office desk">
      <AchievementToast show={Boolean(achievement)} title={achievement?.title ?? ""} detail={achievement?.detail ?? ""} />
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-3 pb-28 pt-3 sm:px-4 md:px-6 md:pb-8 md:pt-5">
        <header className="grid gap-4">
          <PixelCard className="bg-[#fff8e7]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-pixel text-lg leading-8 md:text-2xl">AI Office</h1>
                  <span className={badgeClass(finalRec)} aria-label={`Final recommendation ${finalRec}`}>
                    Final Rec: {finalRec}
                  </span>
                  <span className={`border-2 border-slate-950 px-2 py-1 text-xs font-semibold ${socketConnected ? "bg-emerald-200" : "bg-red-200"}`}>
                    {socketConnected ? "Live socket" : "Reconnecting"}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-700">{APP_DISCLAIMER}</p>
              </div>
              <Link
                href={`/trading?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
                className="pixel-button rounded-[5px] border-2 border-black bg-[#0c7c59] px-3 py-2 text-center text-xs font-black uppercase text-white shadow-[4px_4px_0_#101827] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#101827] active:translate-x-1 active:translate-y-1 active:shadow-none"
              >
                Open Trading
              </Link>
            </div>
            <div className="mt-4">
              <PortfolioHud
                cash={formatMoney(portfolio?.cash ?? 10000)}
                portfolioValue={formatMoney(accountValue || 0)}
                pnlPercent={formatSignedPercent(pnlPercent)}
                hitRate={`${Math.max(0, Math.round((completedAnalyses / Math.max(1, runs.length)) * 100))}%`}
                selectedDesk={selectedGameAgent.label}
                level={xpLevel}
                streak={streak}
                mood={portfolioMood}
              />
            </div>
          </PixelCard>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <StockSearchPanel
              ticker={ticker}
              results={searchResults}
              isAnalyzing={isAnalyzing}
              onTickerChange={setTicker}
              onSelectTicker={(symbol) => void selectTicker(symbol)}
              onAnalyze={() => void runAnalysis()}
            />
            <MissionPanel analyzedCount={completedAnalyses} watchlistCount={watchlist.length} askedTeam={hasAskedTeam} />
          </div>
        </header>

        {error ? (
          <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]" aria-label="AI office floor">
          <PixelOffice
            onSelect={(agentId) => setSelectedAgent(agentId)}
            selectedAgent={selectedAgent}
            agentStatuses={agentStatuses}
            agentRecommendations={agentRecommendations}
            agentPerformance={{}}
          />

          <div className="grid gap-4">
            <PixelCard title="Market Tape" eyebrow={ticker.toUpperCase()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold leading-none">{quote ? formatMoney(quote.price) : "$0.00"}</p>
                  <p className="mt-2 text-xs text-slate-600">Source: {quote?.source ?? "loading"}</p>
                </div>
                <StatusBadge value={quote ? formatSignedPercent(quote.changePercent) : "0.0%"} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="Quality" value={`${dataQualityStatus} ${Math.round(dataQuality * 100)}%`} tone={dataQualityStatus === "LIVE" ? "good" : dataQualityStatus === "UNSUPPORTED" ? "bad" : undefined} />
                <Metric label="Feed" value={quoteStale ? "Stale" : "Live"} tone={quoteStale ? "bad" : "good"} />
              </div>
            </PixelCard>

            <PixelCard title="Manager Summary" eyebrow="portfolio manager + team lead">
              <div className="grid gap-2 text-xs">
                <StatusBadge value={`Final ${finalRec}`} />
                <p className="border-2 border-black bg-[#f7fff7] p-2 leading-5">
                  {portfolioManager?.summary ?? latest?.finalSummary ?? "Ask the AI team to receive the Portfolio Manager summary for this ticker."}
                </p>
                <p className="border-2 border-black bg-[#fff8e7] p-2 leading-5">
                  {teamLead?.summary ?? "Team Lead will organize the committee's strongest points once the team has completed its review."}
                </p>
              </div>
            </PixelCard>

            <TeamDecisionPanel
              score={analysisExplanation ? String(Math.round(analysisExplanation.managerScore)) : undefined}
              confidence={analysisExplanation ? `${Math.round(analysisExplanation.managerConfidence * 100)}%` : undefined}
              coverageText={analysisExplanation ? `${analysisExplanation.coverage.completed}/${analysisExplanation.coverage.total}` : `${completedCommittee.length}/14`}
              voteText={`${voteMix.BUY} BUY | ${voteMix.HOLD} HOLD | ${voteMix.AVOID} AVOID`}
              caveats={analysisExplanation?.caveats ?? []}
            >
              {(analysisExplanation?.agents ?? []).filter((agent) => agent.agentType !== "PORTFOLIO_MANAGER").slice(0, 8).map((agent) => (
                <AgentCard
                  key={agent.agentType}
                  role={agent.role}
                  status={agent.status}
                  recommendation={agent.recommendation}
                  confidence={agent.confidence}
                  selected={selectedAgent === agent.agentType}
                  onSelect={() => setSelectedAgent(agent.agentType)}
                />
              ))}
              {(analysisExplanation?.agents.length ?? 0) === 0
                ? gameAgents.slice(0, 8).map((agent) => (
                    <AgentCard key={agent.id} role={agent.role} status="idle" selected={selectedAgent === agent.id} onSelect={() => setSelectedAgent(agent.id)} />
                  ))
                : null}
            </TeamDecisionPanel>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]" aria-label="Selected agent details">
          <AgentIntroduction agent={selectedGameAgent} status={terminalStatus} signal={String(terminalSignal)} confidence={terminalConfidence} />
          <AnalysisOutput
            ticker={ticker.toUpperCase()}
            role={selectedGameAgent.role}
            status={terminalStatus}
            recommendation={selected?.recommendation ?? selectedExplanation?.recommendation ?? null}
            confidence={selected?.confidence ?? selectedExplanation?.confidence ?? null}
            text={agentAnalysisText}
            reasons={selected?.reasons ?? selectedExplanation?.reasons ?? []}
          />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="More rooms">
          <RoomLink href={`/trading?ticker=${encodeURIComponent(ticker.toUpperCase())}`} title="Trading Terminal" detail="Live quote gate, account panels, watchlist, open orders, and fills." />
          <RoomLink href={`/research?ticker=${encodeURIComponent(ticker.toUpperCase())}`} title="Research Room" detail="Agent debate, evidence, caveats, and team-meeting notes." />
          <RoomLink href="/history" title="History Vault" detail="Watchlist, recommendations, and account-scoped fill history." />
          <RoomLink href={`/backtest?ticker=${encodeURIComponent(ticker.toUpperCase())}`} title="Backtest Lab" detail="Replay the manager signal against historical closes." />
          <RoomLink href="/system" title="System Console" detail="API, database, Redis, provider, and runtime readiness." />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-black bg-white p-2 md:hidden" role="toolbar" aria-label="Office quick actions">
        <div className="grid grid-cols-2 gap-2">
          <PixelButton tone="magic" glow className="px-1 text-[10px]" onClick={() => void runAnalysis()}>
            Analyze
          </PixelButton>
          <Link
            href={`/trading?ticker=${encodeURIComponent(ticker.toUpperCase())}`}
            className="pixel-button min-h-10 rounded-[5px] border-2 border-black bg-emerald-200 px-1 py-2 text-center text-[10px] font-black uppercase text-emerald-950 shadow-[4px_4px_0_#101827]"
          >
            Trade
          </Link>
        </div>
      </div>
    </main>
  );
}

function AgentIntroduction({
  agent,
  status,
  signal,
  confidence
}: {
  agent: (typeof gameAgents)[number];
  status: string;
  signal: string;
  confidence: number;
}) {
  return (
    <PixelCard title="Agent Introduction" eyebrow={agent.role}>
      <div className="grid gap-3 sm:grid-cols-[96px_1fr]">
        <div className="pixel-portrait mx-auto h-28 w-24 rounded-[6px] border-[3px] border-black bg-[#d9f0e8] shadow-[4px_4px_0_#101827]" aria-hidden="true">
          <span />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-pixel text-xs">{agent.name}</p>
            <StatusBadge value={status.toLowerCase()} />
            <StatusBadge value={signal.toLowerCase()} />
            <StatusBadge value={`${confidence}% confidence`} />
          </div>
          <blockquote className="mt-3 border-2 border-black bg-[#101827] p-3 font-mono text-xs leading-6 text-[#c7f9cc] shadow-inner">
            "{introForAgent(agent.id)}"
          </blockquote>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <Metric label="Responsible for" value={agent.role} />
            <Metric label="Personality" value={agent.personality} />
            <Metric label="Can do" value={capabilityForAgent(agent.id)} />
            <Metric label="Trust most when" value={trustCueForAgent(agent.id)} />
          </div>
        </div>
      </div>
    </PixelCard>
  );
}

function AnalysisOutput({
  ticker,
  role,
  status,
  recommendation,
  confidence,
  text,
  reasons
}: {
  ticker: string;
  role: string;
  status: string;
  recommendation?: string | null;
  confidence?: number | null;
  text: string;
  reasons: string[];
}) {
  return (
    <PixelCard
      title="Analysis Output"
      eyebrow={`${ticker} / ${role}`}
    >
      <div className="flex flex-wrap gap-2">
        <StatusBadge value={status.toLowerCase()} />
        {recommendation ? <StatusBadge value={recommendation.toLowerCase()} /> : null}
        {typeof confidence === "number" ? <StatusBadge value={`${Math.round(confidence * 100)}% confidence`} /> : null}
      </div>
      <p className="mt-3 min-h-28 border-2 border-black bg-[#f7fff7] p-3 text-sm leading-6 text-slate-900">
        {text}
      </p>
      <div className="mt-3 grid gap-2">
        {reasons.length > 0 ? reasons.map((reason, idx) => <EvidenceReason key={`${ticker}-${idx}`} reason={reason} />) : (
          <p className="border-2 border-black bg-[#fff8e7] p-2 text-xs leading-5 text-slate-700">
            Structured reasons appear here after the backend agent has completed analysis for this ticker.
          </p>
        )}
      </div>
    </PixelCard>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-800" : tone === "bad" ? "text-red-800" : "text-slate-950";
  return (
    <div className="border-2 border-black bg-[#f7fff7] px-2 py-2">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function RoomLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="pixel-panel rounded-[8px] border-[3px] border-black bg-[#fffdf4] p-3 shadow-[5px_5px_0_#101827] transition-transform hover:-translate-y-1 hover:bg-[#f7fff7] active:translate-x-1 active:translate-y-1 active:shadow-none"
    >
      <p className="font-pixel text-[10px] leading-5 sm:text-xs">{title}</p>
      <p className="mt-2 text-xs leading-5 text-slate-700">{detail}</p>
    </Link>
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

function introForAgent(agentId: string) {
  const intros: Record<string, string> = {
    TECHNICAL_ANALYST: "I read price action, trend, volume, and support levels. Bring me a ticker when you want the chart story translated into plain language.",
    FUNDAMENTALS_ANALYST: "I inspect valuation, growth, margins, balance-sheet quality, and whether the business deserves the price investors are paying.",
    NEWS_ANALYST: "I scan headlines and company news for tone changes, event risk, and fresh context that can move the stock.",
    MACRO_ANALYST: "I connect the ticker to rates, market regime, growth appetite, and broader risk conditions.",
    SENTIMENT_ANALYST: "I watch crowd tone, analyst consensus, and whether optimism or fear is getting stretched.",
    QUANT_ANALYST: "I rank the setup through factor signals, trend quality, volatility, drawdown, and repeatable numeric evidence.",
    CRYPTO_SPECIALIST: "I track crypto-beta and liquidity spillover when risk assets are moving together.",
    BULL_RESEARCHER: "I build the strongest upside case so the team understands what could go right.",
    BEAR_RESEARCHER: "I challenge the thesis, expose weak evidence, and name what could break the setup.",
    TRADER_AGENT: "I turn the debate into entry, sizing, invalidation, and timing notes for the trade ticket.",
    RISK_ANALYST: "I guard the portfolio against concentration, volatility, stale data, and oversized bets.",
    AGGRESSIVE_RISK: "I ask whether the upside is strong enough to accept volatility.",
    NEUTRAL_RISK: "I balance reward, evidence quality, and uncertainty before the manager acts.",
    CONSERVATIVE_RISK: "I protect capital first and only approve size when evidence is clean.",
    TEAM_LEAD: "I organize the committee and turn noisy specialist opinions into one clean meeting summary.",
    PORTFOLIO_MANAGER: "I make the final simulated allocation call after weighing every completed agent."
  };
  return intros[agentId] ?? "I help the AI office understand this ticker from my specialist seat.";
}

function capabilityForAgent(agentId: string) {
  if (agentId.includes("RISK")) return "Size and guardrails";
  if (agentId.includes("RESEARCHER")) return "Thesis debate";
  if (agentId === "TRADER_AGENT") return "Execution plan";
  if (agentId === "TEAM_LEAD") return "Meeting summary";
  if (agentId === "PORTFOLIO_MANAGER") return "Final allocation";
  return "Evidence review";
}

function trustCueForAgent(agentId: string) {
  if (agentId === "NEWS_ANALYST") return "News is live";
  if (agentId === "TECHNICAL_ANALYST" || agentId === "QUANT_ANALYST") return "History is live";
  if (agentId === "FUNDAMENTALS_ANALYST") return "Fundamentals are live";
  if (agentId.includes("RISK") || agentId === "PORTFOLIO_MANAGER") return "Coverage is broad";
  return "Evidence quality is high";
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
