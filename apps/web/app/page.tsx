"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import { APP_DISCLAIMER } from "@pixelfund/config";
import {
  analysisRunSchema,
  backtestResultSchema,
  marketContextSchema,
  portfolioSchema,
  quoteSchema,
  tradeSchema,
  watchlistItemSchema,
  wsQuoteStaleSchema
} from "@pixelfund/schemas";
import { gameAgents, PixelOffice } from "../components/PixelOffice";
import { api } from "../lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
const stockSearchSchema = z.array(z.object({ symbol: z.string(), description: z.string() }));
const meetingSteps = [
  { agentId: "TECHNICAL_ANALYST", log: "Technical Analyst is checking price action..." },
  { agentId: "FUNDAMENTALS_ANALYST", log: "Fundamentals Analyst is reviewing valuation..." },
  { agentId: "NEWS_ANALYST", log: "News Analyst is scanning headlines..." },
  { agentId: "RISK_ANALYST", log: "Risk Manager is checking downside risk..." },
  { agentId: "MACRO_ANALYST", log: "Macro Analyst is checking rates and market regime..." },
  { agentId: "SENTIMENT_ANALYST", log: "Sentiment Analyst is reading the crowd pulse..." },
  { agentId: "QUANT_ANALYST", log: "Quant Analyst is ranking factor signals..." },
  { agentId: "CRYPTO_SPECIALIST", log: "Crypto Specialist is checking liquidity spillover..." },
  { agentId: "BULL_RESEARCHER", log: "Bull Researcher is building the strongest upside case..." },
  { agentId: "BEAR_RESEARCHER", log: "Bear Researcher is challenging the setup..." },
  { agentId: "TRADER_AGENT", log: "Trader Agent is converting debate into an execution plan..." },
  { agentId: "AGGRESSIVE_RISK", log: "Aggressive Risk is checking if reward justifies volatility..." },
  { agentId: "NEUTRAL_RISK", log: "Neutral Risk is balancing reward against uncertainty..." },
  { agentId: "CONSERVATIVE_RISK", log: "Conservative Risk is protecting against drawdown..." },
  { agentId: "PORTFOLIO_MANAGER", log: "Portfolio Manager is reviewing allocation impact..." },
  { agentId: "TEAM_LEAD", log: "Team Lead is preparing final summary..." }
];

type Portfolio = z.infer<typeof portfolioSchema>;
type AnalysisRun = z.infer<typeof analysisRunSchema>;
type WatchlistItem = z.infer<typeof watchlistItemSchema>;
type Quote = z.infer<typeof quoteSchema>;
type MarketContext = z.infer<typeof marketContextSchema>;
type Trade = z.infer<typeof tradeSchema>;
type BacktestResult = z.infer<typeof backtestResultSchema>;

export default function HomePage() {
  const [ticker, setTicker] = useState("AAPL");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; description: string }>>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("TECHNICAL_ANALYST");
  const [agentUiStatuses, setAgentUiStatuses] = useState<Record<string, string>>({});
  const [agentMockAnalysis, setAgentMockAnalysis] = useState<Record<string, string>>({});
  const [meetingLog, setMeetingLog] = useState<string[]>([]);
  const [isMeetingRunning, setIsMeetingRunning] = useState(false);
  const [pinnedInsights, setPinnedInsights] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quoteStale, setQuoteStale] = useState(false);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      setError(e instanceof Error ? e.message : "Unable to refresh data");
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

  const selected = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === selectedAgent),
    [latest, selectedAgent]
  );

  const selectedGameAgent = useMemo(
    () => gameAgents.find((agent) => agent.id === selectedAgent) ?? gameAgents[0],
    [selectedAgent]
  );

  const portfolioManager = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === "PORTFOLIO_MANAGER"),
    [latest]
  );

  const bullResearcher = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === "BULL_RESEARCHER"),
    [latest]
  );

  const bearResearcher = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === "BEAR_RESEARCHER"),
    [latest]
  );

  const traderAgent = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === "TRADER_AGENT"),
    [latest]
  );

  const riskCouncil = useMemo(
    () =>
      ["AGGRESSIVE_RISK", "NEUTRAL_RISK", "CONSERVATIVE_RISK"].map((agentType) =>
        latest?.recommendations?.find((r) => r.agentType === agentType)
      ),
    [latest]
  );

  const agentStatuses = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const rec of latest?.recommendations ?? []) map[rec.agentType] = rec.status;
    for (const [agentId, status] of Object.entries(agentUiStatuses)) map[agentId] = status;
    return map;
  }, [latest, agentUiStatuses]);

  const agentRecommendations = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const rec of latest?.recommendations ?? []) map[rec.agentType] = rec.recommendation ?? undefined;
    for (const agent of gameAgents) if (!map[agent.id]) map[agent.id] = agent.signal.includes("Risk") ? "HOLD" : undefined;
    return map;
  }, [latest]);

  const activePosition = useMemo(
    () => portfolio?.positions.find((p) => p.ticker === ticker.toUpperCase()) ?? null,
    [portfolio?.positions, ticker]
  );

  const tradeEstimate = useMemo(() => {
    const px = quote?.price ?? 0;
    const qty = Math.max(1, quantity);
    const gross = px * qty;
    return {
      qty,
      gross,
      projectedCashBuy: (portfolio?.cash ?? 0) - gross,
      projectedCashSell: (portfolio?.cash ?? 0) + gross
    };
  }, [quote?.price, quantity, portfolio?.cash]);

  async function selectTicker(symbol: string) {
    const normalized = symbol.toUpperCase();
    setTicker(normalized);
    setSearchResults([]);
    await refresh(normalized);
  }

  async function placeTrade(side: "BUY" | "SELL") {
    try {
      const updated = await api("/trades", portfolioSchema, {
        method: "POST",
        body: JSON.stringify({ ticker, side, quantity: tradeEstimate.qty })
      });
      setPortfolio(updated);
      await refresh(ticker);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    }
  }

  async function runAnalysis(targetTicker = tickerRef.current) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    setTicker(normalized);
    setIsAnalyzing(true);
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

  async function runBacktest() {
    const normalized = tickerRef.current.trim().toUpperCase() || "AAPL";
    setIsBacktesting(true);
    try {
      const to = new Date();
      const from = new Date(to.getTime() - 1000 * 60 * 60 * 24 * 365);
      const result = await api("/backtests", backtestResultSchema, {
        method: "POST",
        body: JSON.stringify({
          ticker: normalized,
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          strategy: "PORTFOLIO_MANAGER_REPLAY"
        })
      });
      setBacktest(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setIsBacktesting(false);
    }
  }

  function askSelectedAgent() {
    const agent = selectedGameAgent;
    setAgentUiStatuses((statuses) => ({ ...statuses, [agent.id]: "THINKING" }));
    window.setTimeout(() => {
      const marketTone = quoteChangePositive ? "price action is constructive" : "price action is under pressure";
      const qualityTone = dataQualityStatus === "LIVE" ? "live evidence" : `${dataQualityStatus.toLowerCase()} evidence`;
      setAgentMockAnalysis((analysis) => ({
        ...analysis,
        [agent.id]: `${agent.name}: ${agent.mockAnalysis} For ${ticker.toUpperCase()}, ${marketTone}, and I am weighting this against ${qualityTone}.`
      }));
      setAgentUiStatuses((statuses) => ({ ...statuses, [agent.id]: "COMPLETED" }));
    }, 900);
  }

  function pinSelectedInsight() {
    const agent = selectedGameAgent;
    const insight = agentMockAnalysis[agent.id] ?? selected?.summary ?? agent.mockAnalysis;
    setPinnedInsights((items) => [`${agent.role}: ${insight}`, ...items].slice(0, 5));
  }

  function startTeamMeeting() {
    if (isMeetingRunning) return;
    setIsMeetingRunning(true);
    setMeetingLog([]);
    setAgentUiStatuses((statuses) => {
      const next = { ...statuses };
      for (const step of meetingSteps) next[step.agentId] = "IDLE";
      return next;
    });

    meetingSteps.forEach((step, idx) => {
      window.setTimeout(() => {
        setSelectedAgent(step.agentId);
        setAgentUiStatuses((statuses) => ({ ...statuses, [step.agentId]: "THINKING" }));
        setMeetingLog((items) => [...items, step.log]);
      }, idx * 650);

      window.setTimeout(() => {
        setAgentUiStatuses((statuses) => ({ ...statuses, [step.agentId]: "COMPLETED" }));
        if (idx === meetingSteps.length - 1) {
          setMeetingLog((items) => [...items, "Team Lead: final desk summary is ready for review."]);
          setIsMeetingRunning(false);
        }
      }, idx * 650 + 480);
    });
  }

  async function addWatchlist() {
    const item = await api("/watchlist", watchlistItemSchema, {
      method: "POST",
      body: JSON.stringify({ ticker })
    });
    setWatchlist((items) => [item, ...items.filter((x) => x.ticker !== item.ticker)]);
    scheduleRefresh(ticker);
  }

  async function removeWatchlist(symbol: string) {
    await api(`/watchlist/${encodeURIComponent(symbol)}`, z.object({ ticker: z.string() }), { method: "DELETE" });
    setWatchlist((items) => items.filter((x) => x.ticker !== symbol));
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

  const quoteChangePositive = (quote?.changePercent ?? 0) >= 0;
  const finalRec = latest?.finalRec ?? portfolioManager?.recommendation ?? "PENDING";
  const dataQuality = marketContext?.dataQuality.score ?? 0;
  const dataQualityStatus = marketContext?.dataQuality.status ?? "DEMO";
  const accountValue = portfolio?.totalValue ?? 0;
  const pnlPercent = portfolio && portfolio.totalValue > 0 ? (portfolio.totalPnl / Math.max(1, portfolio.totalValue - portfolio.totalPnl)) * 100 : 0;
  const hitRate = backtest ? Math.round(backtest.winRate * 100) : 70;
  const terminalStatus = agentStatuses[selectedGameAgent.id] ?? selected?.status ?? "IDLE";
  const terminalSignal = selected?.recommendation ?? selectedGameAgent.signal;
  const terminalConfidence =
    typeof selected?.confidence === "number" ? Math.round(selected.confidence * 100) : selectedGameAgent.confidence;
  const terminalAnalysis = agentMockAnalysis[selectedGameAgent.id] ?? selected?.summary ?? selectedGameAgent.mockAnalysis;

  return (
    <main className="min-h-screen bg-[#edf6f9] text-slate-950" aria-label="pixelFund AI trading simulation">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 pb-32 pt-3 sm:px-4 md:px-6 md:pb-8 md:pt-5">
        <header className="grid gap-3 rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-pixel text-base md:text-xl">PixelTrade AI</h1>
              <span className={badgeClass(finalRec)} aria-label={`Final recommendation ${finalRec}`}>
                Final Rec: {finalRec}
              </span>
              <span className={`border-2 border-slate-950 px-2 py-1 text-xs font-semibold ${socketConnected ? "bg-emerald-200" : "bg-red-200"}`}>
                {socketConnected ? "Live socket" : "Reconnecting"}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-5">
              <HudChip label="Cash" value={formatMoney(portfolio?.cash ?? 10000)} />
              <HudChip label="Portfolio" value={formatMoney(accountValue || 12430)} />
              <HudChip label="P/L" value={formatSignedPercent(pnlPercent || 4.2)} tone={(pnlPercent || 4.2) >= 0 ? "good" : "bad"} />
              <HudChip label="Hit Rate" value={`${hitRate}%`} />
              <HudChip label="Desk" value={selectedGameAgent.label} />
            </div>
            <p className="mt-2 max-w-3xl text-xs text-slate-700 sm:text-sm">{APP_DISCLAIMER}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <label className="mb-1 block text-xs font-semibold text-slate-700" htmlFor="ticker-input">
                Ticker
              </label>
              <input
                id="ticker-input"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="h-12 w-full border-2 border-black bg-[#f7fff7] px-3 text-base font-semibold"
                aria-label="Ticker"
              />
              {searchResults.length > 0 ? (
                <div className="absolute z-20 mt-2 grid w-full gap-1 border-2 border-black bg-white p-2 shadow-[4px_4px_0_#111]">
                  {searchResults.map((item) => (
                    <button
                      key={item.symbol}
                      className="grid grid-cols-[74px_1fr] items-center gap-2 border border-black px-2 py-1 text-left text-xs hover:bg-[#d9f0e8]"
                      onClick={() => void selectTicker(item.symbol)}
                    >
                      <span className="font-semibold">{item.symbol}</span>
                      <span className="truncate text-slate-600">{item.description}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              className="h-12 self-end border-2 border-black bg-[#0c7c59] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-500"
              onClick={() => void runAnalysis()}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing" : "Run Analysis"}
            </button>
          </div>
        </header>

        {error ? (
          <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.85fr]" aria-label="Trading desk">
           <PixelOffice
             onSelect={(agentId) => setSelectedAgent(agentId)}
             selectedAgent={selectedAgent}
             agentStatuses={agentStatuses}
             agentRecommendations={agentRecommendations}
             agentPerformance={{}}
           />

          <div className="grid gap-4">
            <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-pixel text-[10px] sm:text-xs">Market Tape</h2>
                  <p className="mt-2 text-3xl font-bold leading-none">{quote ? formatMoney(quote.price) : "$0.00"}</p>
                </div>
                <span className={`border-2 border-black px-2 py-1 text-sm font-semibold ${quoteChangePositive ? "bg-emerald-200" : "bg-red-200"}`}>
                  {quote ? formatSignedPercent(quote.changePercent) : "0.0%"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Metric label="Ticker" value={quote?.ticker ?? ticker} />
                <Metric label="Source" value={quote?.source ?? "loading"} />
                <Metric label="Quality" value={`${dataQualityStatus} ${Math.round(dataQuality * 100)}%`} tone={dataQualityStatus === "LIVE" ? "good" : dataQualityStatus === "UNSUPPORTED" ? "bad" : undefined} />
                <Metric label="Feed" value={quoteStale ? "Stale" : "Live"} tone={quoteStale ? "bad" : "good"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase">
                <span className={qualityBadgeClass(dataQualityStatus)}>{dataQualityStatus}</span>
                <span className="border-2 border-black bg-[#f7fff7] px-2 py-1">Provider: {marketContext?.dataQuality.provider ?? "loading"}</span>
              </div>
              {(marketContext?.dataQuality.messages ?? []).length > 0 ? (
                <div className="mt-3 grid gap-1">
                  {marketContext?.dataQuality.messages.slice(0, 3).map((message) => (
                    <p key={message} className="border border-slate-900 bg-[#edf6f9] px-2 py-1 text-xs text-slate-900">
                      {message}
                    </p>
                  ))}
                </div>
              ) : null}
              {(marketContext?.dataQuality.warnings ?? []).length > 0 ? (
                <div className="mt-3 grid gap-1">
                  {marketContext?.dataQuality.warnings.map((warning) => (
                    <p key={warning} className="border border-amber-900 bg-amber-100 px-2 py-1 text-xs text-amber-950">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card">
              <h2 className="font-pixel text-[10px] sm:text-xs">Trade Ticket</h2>
              <p className="mt-2 text-xs text-slate-700">
                Holding {activePosition?.quantity ?? 0} shares of {ticker.toUpperCase()}
              </p>
              <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-2">
                <label className="text-xs font-semibold" htmlFor="quantity-input">
                  Qty
                </label>
                <input
                  id="quantity-input"
                  type="number"
                  min={1}
                  value={tradeEstimate.qty}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || "1")))}
                  className="h-10 w-full border-2 border-black px-2 text-sm"
                />
              </div>
              <div className="mt-3 grid gap-1 text-xs">
                <p>Estimated cost/proceeds: {formatMoney(tradeEstimate.gross)}</p>
                <p>Projected cash after buy: {formatMoney(tradeEstimate.projectedCashBuy)}</p>
                <p>Projected cash after sell: {formatMoney(tradeEstimate.projectedCashSell)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="h-11 border-2 border-black bg-[#1b4332] px-3 text-xs font-semibold text-white" onClick={() => void placeTrade("BUY")}>
                  Buy {tradeEstimate.qty}
                </button>
                <button className="h-11 border-2 border-black bg-[#2f4858] px-3 text-xs font-semibold text-white" onClick={() => void placeTrade("SELL")}>
                  Sell {tradeEstimate.qty}
                </button>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]" aria-label="Agent and portfolio panels">
          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-pixel text-[10px] sm:text-xs">Agent Terminal</h2>
              <span className={badgeClass(String(terminalSignal))}>{terminalSignal}</span>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <Metric label="Agent" value={selectedGameAgent.name} />
              <Metric label="Role" value={selectedGameAgent.role} />
              <Metric label="Personality" value={selectedGameAgent.personality} />
              <Metric label="Current Status" value={terminalStatus} tone={terminalStatus === "FAILED" ? "bad" : terminalStatus === "COMPLETED" ? "good" : undefined} />
              <Metric label="Current Signal" value={String(terminalSignal)} />
              <Metric label="Confidence" value={`${terminalConfidence}%`} />
            </div>
            <p className="mt-3 min-h-20 border-2 border-black bg-[#0f172a] p-3 font-mono text-xs leading-6 text-[#bbf7d0]">
              {terminalAnalysis}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="h-10 border-2 border-black bg-[#0c7c59] px-3 text-xs font-semibold text-white disabled:bg-slate-500"
                onClick={askSelectedAgent}
                disabled={terminalStatus === "THINKING"}
              >
                Ask this agent
              </button>
              <button
                className="h-10 border-2 border-black bg-[#2f4858] px-3 text-xs font-semibold text-white"
                onClick={pinSelectedInsight}
              >
                Pin insight
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {(selected?.reasons ?? []).map((reason, idx) => (
                <EvidenceReason key={`${selected?.id ?? "agent"}-r-${idx}`} reason={reason} />
              ))}
              {(selected?.reasons?.length ?? 0) === 0 ? <p className="text-xs text-slate-600">No structured reasons available yet.</p> : null}
            </div>
            <div className="mt-3 grid gap-2 border-2 border-black bg-[#edf6f9] p-2 text-xs">
              <p className="font-semibold">Evidence Quality</p>
              <p>Status: {dataQualityStatus} | Provider: {marketContext?.dataQuality.provider ?? "loading"} | Score: {Math.round(dataQuality * 100)}%</p>
              <p>{marketContext?.dataQuality.messages[0] ?? "Evidence status will appear after market data loads."}</p>
            </div>
          </section>

          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <h2 className="font-pixel text-[10px] sm:text-xs">Portfolio</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Metric label="Cash" value={formatMoney(portfolio?.cash ?? 0)} />
              <Metric label="Total Value" value={formatMoney(portfolio?.totalValue ?? 0)} />
              <Metric label="Realized P&L" value={formatMoney(portfolio?.realizedPnl ?? 0)} tone={(portfolio?.realizedPnl ?? 0) >= 0 ? "good" : "bad"} />
              <Metric label="Unrealized P&L" value={formatMoney(portfolio?.totalUnrealizedPnl ?? 0)} tone={(portfolio?.totalUnrealizedPnl ?? 0) >= 0 ? "good" : "bad"} />
            </div>
            <div className="mt-3 max-h-52 overflow-auto border-2 border-black">
              {(portfolio?.positions ?? []).map((p) => {
                const costBasis = p.averageCost * p.quantity;
                const ret = costBasis > 0 ? (p.unrealizedPnl / costBasis) * 100 : 0;
                return (
                  <div key={p.ticker} className="grid grid-cols-[70px_1fr_auto] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                    <button className="text-left font-semibold" onClick={() => void selectTicker(p.ticker)}>
                      {p.ticker}
                    </button>
                    <span>{p.quantity} sh @ {formatMoney(p.averageCost)}</span>
                    <span className={ret >= 0 ? "text-emerald-800" : "text-red-800"}>{formatSignedPercent(ret)}</span>
                  </div>
                );
              })}
              {(portfolio?.positions.length ?? 0) === 0 ? <p className="p-2 text-xs text-slate-600">No simulated positions yet.</p> : null}
            </div>
          </section>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]" aria-label="Team meeting and pinned insights">
          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-pixel text-[10px] sm:text-xs">Team Meeting</h2>
              <button
                className="h-10 border-2 border-black bg-[#7c3aed] px-3 text-xs font-semibold text-white disabled:bg-slate-500"
                onClick={startTeamMeeting}
                disabled={isMeetingRunning}
              >
                {isMeetingRunning ? "Meeting running" : "Start Team Meeting"}
              </button>
            </div>
            <div className="mt-3 max-h-56 overflow-auto border-2 border-black bg-[#0f172a] p-2 font-mono text-xs text-[#bbf7d0]">
              {meetingLog.length === 0 ? (
                <p>Waiting for the desk captain to call the room...</p>
              ) : (
                meetingLog.map((item, idx) => (
                  <p key={`${item}-${idx}`} className="border-b border-[#14532d] py-1 last:border-b-0">
                    {idx + 1}. {item}
                  </p>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <h2 className="font-pixel text-[10px] sm:text-xs">Pinned Insights</h2>
            <div className="mt-3 grid gap-2">
              {pinnedInsights.length === 0 ? (
                <p className="border-2 border-black bg-[#f7fff7] p-2 text-xs text-slate-700">Pinned agent insights will appear here.</p>
              ) : (
                pinnedInsights.map((item, idx) => (
                  <p key={`${item}-${idx}`} className="border-2 border-black bg-[#f7fff7] p-2 text-xs leading-5">
                    {item}
                  </p>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4" aria-label="Debate Floor">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-pixel text-[10px] sm:text-xs">Debate Floor</h2>
            <span className="border-2 border-black bg-[#edf6f9] px-2 py-1 text-xs font-semibold">
              Bull vs Bear | Trader Plan | Risk Council
            </span>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1fr]">
          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-pixel text-[10px] sm:text-xs">Watchlist</h2>
              <button className="h-9 border-2 border-black bg-[#0c7c59] px-2 text-xs font-semibold text-white" onClick={() => void addWatchlist()}>
                Add {ticker.toUpperCase()}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {watchlist.length === 0 ? <p className="text-xs text-slate-700">No watchlist items yet.</p> : null}
              {watchlist.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-1 border-2 border-black bg-[#f7fff7] px-2 py-1">
                  <button className="text-xs font-semibold" onClick={() => void selectTicker(item.ticker)}>
                    {item.ticker}
                  </button>
                  <button className="border-l border-black pl-2 text-xs text-red-800" onClick={() => void removeWatchlist(item.ticker)} aria-label={`Remove ${item.ticker}`}>
                    x
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <h2 className="font-pixel text-[10px] sm:text-xs">Recommendation History</h2>
            <div className="mt-3 max-h-56 overflow-auto border-2 border-black">
              {runs.map((run) => (
                <button
                  key={run.id}
                  className="grid w-full grid-cols-[70px_1fr_82px] gap-2 border-b border-slate-200 px-2 py-2 text-left text-xs last:border-b-0 hover:bg-[#d9f0e8]"
                  onClick={() => void selectTicker(run.ticker)}
                >
                  <span className="font-semibold">{run.ticker}</span>
                  <span className="truncate">{run.finalSummary ?? "Analysis in progress"}</span>
                  <span className="text-right font-semibold">{run.finalRec ?? run.status}</span>
                </button>
              ))}
              {runs.length === 0 ? <p className="p-2 text-xs text-slate-600">No prior recommendations yet.</p> : null}
            </div>
          </section>

          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <h2 className="font-pixel text-[10px] sm:text-xs">Trade History</h2>
            <div className="mt-3 max-h-56 overflow-auto border-2 border-black">
              {trades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-[52px_58px_1fr] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                  <span className={trade.side === "BUY" ? "font-semibold text-emerald-800" : "font-semibold text-slate-800"}>{trade.side}</span>
                  <span>{trade.ticker}</span>
                  <span className="text-right">{trade.quantity} @ {formatMoney(trade.price)}</span>
                </div>
              ))}
              {trades.length === 0 ? <p className="p-2 text-xs text-slate-600">No trades yet.</p> : null}
            </div>
          </section>
        </section>

        <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-pixel text-[10px] sm:text-xs">Backtest Lab</h2>
            <button
              className="h-9 border-2 border-black bg-[#2f4858] px-3 text-xs font-semibold text-white disabled:bg-slate-500"
              onClick={() => void runBacktest()}
              disabled={isBacktesting}
            >
              {isBacktesting ? "Running" : `Backtest ${ticker.toUpperCase()}`}
            </button>
          </div>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
            <Metric label="P&L" value={formatMoney(backtest?.simulatedPnl ?? 0)} tone={(backtest?.simulatedPnl ?? 0) >= 0 ? "good" : "bad"} />
            <Metric label="Win Rate" value={`${Math.round((backtest?.winRate ?? 0) * 100)}%`} />
            <Metric label="Max Drawdown" value={`${Math.round((backtest?.maxDrawdown ?? 0) * 100)}%`} tone={(backtest?.maxDrawdown ?? 0) > 0.2 ? "bad" : undefined} />
            <Metric label="Accuracy" value={`${Math.round((backtest?.recommendationAccuracy ?? 0) * 100)}%`} />
          </div>
          <p className="mt-3 text-xs text-slate-700">
            {backtest
              ? `${backtest.strategy} ran ${backtest.trades} simulated trades from ${backtest.from} to ${backtest.to}. ${backtest.dataQuality.messages[0] ?? ""}`
              : "Run a one-year replay of the Portfolio Manager style signal against historical closes."}
          </p>
        </section>

        <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
          <h2 className="font-pixel text-[10px] sm:text-xs">Evidence Snapshot</h2>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="P/E" value={displayNumber(marketContext?.fundamentals.peRatio)} />
            <Metric label="Revenue Growth" value={displayPercent(marketContext?.fundamentals.revenueGrowth)} />
            <Metric label="EPS Growth" value={displayPercent(marketContext?.fundamentals.epsGrowth)} />
            <Metric label="Beta" value={displayNumber(marketContext?.fundamentals.beta)} />
            <Metric label="52w High" value={displayMoney(marketContext?.fundamentals.week52High)} />
            <Metric label="52w Low" value={displayMoney(marketContext?.fundamentals.week52Low)} />
            <Metric label="52w Return" value={displayPercent(marketContext?.fundamentals.week52Return)} />
            <Metric label="Analyst Trend" value={marketContext?.analystTrend?.consensus ?? "N/A"} />
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {(marketContext?.news ?? []).slice(0, 4).map((item) => (
              <p key={`${item.source}-${item.headline}`} className="border-2 border-black bg-[#f7fff7] px-2 py-2 text-xs leading-5">
                <span className="font-semibold">{item.sentiment.toUpperCase()}</span> {item.headline}
              </p>
            ))}
            {(marketContext?.news.length ?? 0) === 0 ? <p className="text-xs text-slate-600">No news evidence loaded.</p> : null}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-black bg-white p-2 md:hidden" role="toolbar" aria-label="Quick trade controls">
        <div className="grid grid-cols-3 gap-2">
          <button className="h-12 border-2 border-black bg-[#0c7c59] px-2 text-[11px] font-semibold text-white" onClick={() => void runAnalysis()}>
            Analyze
          </button>
          <button className="h-12 border-2 border-black bg-[#1b4332] px-2 text-[11px] font-semibold text-white" onClick={() => void placeTrade("BUY")}>
            Buy {tradeEstimate.qty}
          </button>
          <button className="h-12 border-2 border-black bg-[#2f4858] px-2 text-[11px] font-semibold text-white" onClick={() => void placeTrade("SELL")}>
            Sell {tradeEstimate.qty}
          </button>
        </div>
      </div>
    </main>
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

function HudChip({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-950" : tone === "bad" ? "text-red-950" : "text-slate-950";
  const bgClass = tone === "good" ? "bg-emerald-200" : tone === "bad" ? "bg-red-200" : "bg-[#f7fff7]";
  return (
    <div className={`border-2 border-black px-2 py-1 ${bgClass}`}>
      <p className="text-[9px] uppercase text-slate-600">{label}</p>
      <p className={`truncate font-pixel text-[10px] ${toneClass}`}>{value}</p>
    </div>
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
  const toneClass =
    tone === "good" ? "bg-emerald-100" : tone === "bad" ? "bg-red-100" : "bg-[#edf6f9]";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-40 border-2 border-black p-3 text-left shadow-[3px_3px_0_#111] motion-safe:transition-transform motion-safe:active:scale-[0.99] ${toneClass}`}
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

function qualityBadgeClass(value: string) {
  const base = "border-2 border-black px-2 py-1";
  if (value === "LIVE") return `${base} bg-emerald-200 text-emerald-950`;
  if (value === "UNSUPPORTED") return `${base} bg-red-200 text-red-950`;
  if (value === "PARTIAL" || value === "DELAYED") return `${base} bg-amber-200 text-amber-950`;
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
