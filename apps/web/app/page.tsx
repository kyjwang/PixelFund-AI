"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import { APP_DISCLAIMER } from "@pixelfund/config";
import {
  analysisRunSchema,
  analysisExplanationSchema,
  marketContextSchema,
  portfolioSchema,
  quoteSchema,
  tradePreviewSchema,
  tradeSchema,
  watchlistItemSchema,
  wsQuoteStaleSchema
} from "@pixelfund/schemas";
import {
  AchievementToast,
  AgentCard,
  DialogueBox,
  MissionPanel,
  PixelButton,
  PixelCard,
  PortfolioHud,
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
type TradePreview = z.infer<typeof tradePreviewSchema>;

export default function HomePage() {
  const [ticker, setTicker] = useState("AAPL");
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; description: string }>>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [analysisExplanation, setAnalysisExplanation] = useState<AnalysisExplanation | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("TECHNICAL_ANALYST");
  const [agentUiStatuses, setAgentUiStatuses] = useState<Record<string, string>>({});
  const [agentMockAnalysis, setAgentMockAnalysis] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [previewSide, setPreviewSide] = useState<"BUY" | "SELL">("BUY");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);
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

  useEffect(() => {
    const normalized = ticker.trim().toUpperCase();
    if (!normalized || !quote) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const preview = await api("/trades/preview", tradePreviewSchema, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify(tradePayload(previewSide))
        });
        setTradePreview(preview);
      } catch {
        setTradePreview(null);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [ticker, quantity, orderType, limitPrice, stopPrice, previewSide, quote?.price, portfolio?.cash]);

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

  const portfolioManager = useMemo(
    () => latest?.recommendations?.find((r) => r.agentType === "PORTFOLIO_MANAGER"),
    [latest]
  );

  const completedCommittee = useMemo(
    () => (latest?.recommendations ?? []).filter((r) => r.status === "COMPLETED" && r.agentType !== "PORTFOLIO_MANAGER"),
    [latest]
  );

  const voteMix = useMemo(() => {
    if (analysisExplanation) return analysisExplanation.voteMix;
    const mix = { BUY: 0, HOLD: 0, AVOID: 0 };
    for (const rec of completedCommittee) {
      if (rec.recommendation === "BUY" || rec.recommendation === "HOLD" || rec.recommendation === "AVOID") {
        mix[rec.recommendation] += 1;
      }
    }
    return mix;
  }, [analysisExplanation, completedCommittee]);

  const explanationAgents = analysisExplanation?.agents ?? [];
  const selectedExplanation = explanationAgents.find((agent) => agent.agentType === selectedAgent);

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
    const px = tradePreview?.estimatedPrice ?? quote?.price ?? 0;
    const qty = Math.max(1, quantity);
    const gross = px * qty;
    return {
      qty,
      gross,
      projectedCashBuy: (portfolio?.cash ?? 0) - gross,
      projectedCashSell: (portfolio?.cash ?? 0) + gross
    };
  }, [quote?.price, quantity, portfolio?.cash, tradePreview?.estimatedPrice]);

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
        body: JSON.stringify(tradePayload(side))
      });
      setPortfolio(updated);
      await refresh(ticker);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    }
  }

  function tradePayload(side: "BUY" | "SELL") {
    return {
      ticker,
      side,
      quantity: tradeEstimate.qty,
      orderType,
      ...(orderType === "LIMIT" && typeof limitPrice === "number" ? { limitPrice } : {}),
      ...(orderType === "STOP" && typeof stopPrice === "number" ? { stopPrice } : {})
    };
  }

  async function runAnalysis(targetTicker = tickerRef.current) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    setTicker(normalized);
    setIsAnalyzing(true);
    setHasAskedTeam(true);
    setAchievement({ title: "Committee Convened", detail: `${normalized} is now on the AI team's desk.` });
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

  function askSelectedAgent() {
    const agent = selectedGameAgent;
    setHasAskedTeam(true);
    setAchievement({ title: "Agent Consulted", detail: `${agent.name} added a new desk note.` });
    window.setTimeout(() => setAchievement(null), 3200);
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
  const hitRate = 70;
  const terminalStatus = agentStatuses[selectedGameAgent.id] ?? selected?.status ?? "IDLE";
  const terminalSignal = selected?.recommendation ?? selectedGameAgent.signal;
  const terminalConfidence =
    typeof selected?.confidence === "number" ? Math.round(selected.confidence * 100) : selectedGameAgent.confidence;
  const terminalAnalysis = agentMockAnalysis[selectedGameAgent.id] ?? selected?.summary ?? selectedGameAgent.mockAnalysis;
  const completedAnalyses = runs.filter((run) => run.status === "COMPLETED").length;
  const xpLevel = Math.max(1, Math.floor((completedAnalyses + (trades.length > 0 ? 1 : 0) + watchlist.length) / 3) + 1);
  const streak = (portfolio?.totalPnl ?? 0) >= 0 ? `W${Math.max(1, Math.min(9, completedAnalyses || 1))}` : "L1";
  const portfolioMood = (portfolio?.totalPnl ?? 0) > 0 ? "Bullish" : (portfolio?.totalPnl ?? 0) < 0 ? "Bruised" : "Curious";

  return (
    <main className="min-h-screen text-slate-950" aria-label="pixelFund AI trading simulation">
      <AchievementToast show={Boolean(achievement)} title={achievement?.title ?? ""} detail={achievement?.detail ?? ""} />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 pb-32 pt-3 sm:px-4 md:px-6 md:pb-8 md:pt-5">
        <header className="grid gap-4">
          <PixelCard className="bg-[#fff8e7]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-pixel text-lg leading-8 md:text-2xl">PixelTrade AI</h1>
                  <span className={badgeClass(finalRec)} aria-label={`Final recommendation ${finalRec}`}>
                    Final Rec: {finalRec}
                  </span>
                  <span className={`border-2 border-slate-950 px-2 py-1 text-xs font-semibold ${socketConnected ? "bg-emerald-200" : "bg-red-200"}`}>
                    {socketConnected ? "Live socket" : "Reconnecting"}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-700 sm:text-sm">{APP_DISCLAIMER}</p>
              </div>
            </div>
            <div className="mt-4">
              <PortfolioHud
                cash={formatMoney(portfolio?.cash ?? 10000)}
                portfolioValue={formatMoney(accountValue || 12430)}
                pnlPercent={formatSignedPercent(pnlPercent || 4.2)}
                hitRate={`${hitRate}%`}
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
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <label className="grid gap-1 font-semibold" htmlFor="order-type-input">
                  Order
                  <select
                    id="order-type-input"
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as "MARKET" | "LIMIT" | "STOP")}
                    className="h-10 border-2 border-black bg-white px-2 text-sm"
                  >
                    <option value="MARKET">Market</option>
                    <option value="LIMIT">Limit</option>
                    <option value="STOP">Stop</option>
                  </select>
                </label>
                {orderType === "LIMIT" ? (
                  <label className="grid gap-1 font-semibold" htmlFor="limit-price-input">
                    Limit
                    <input
                      id="limit-price-input"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={limitPrice}
                      placeholder={quote ? String(quote.price.toFixed(2)) : "0.00"}
                      onChange={(e) => setLimitPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 border-2 border-black px-2 text-sm"
                    />
                  </label>
                ) : null}
                {orderType === "STOP" ? (
                  <label className="grid gap-1 font-semibold" htmlFor="stop-price-input">
                    Stop
                    <input
                      id="stop-price-input"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={stopPrice}
                      placeholder={quote ? String(quote.price.toFixed(2)) : "0.00"}
                      onChange={(e) => setStopPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-10 border-2 border-black px-2 text-sm"
                    />
                  </label>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PixelButton tone={previewSide === "BUY" ? "good" : "neutral"} onClick={() => setPreviewSide("BUY")}>
                  Preview Buy
                </PixelButton>
                <PixelButton tone={previewSide === "SELL" ? "warn" : "neutral"} onClick={() => setPreviewSide("SELL")}>
                  Preview Sell
                </PixelButton>
              </div>
              <div className="mt-3 grid gap-1 text-xs">
                <p>Estimated cost/proceeds: {formatMoney(tradeEstimate.gross)}</p>
                <p>Projected cash after buy: {formatMoney(tradeEstimate.projectedCashBuy)}</p>
                <p>Projected cash after sell: {formatMoney(tradeEstimate.projectedCashSell)}</p>
                {tradePreview ? (
                  <>
                    <p>Trigger status: {tradePreview.executableNow ? "Executable now" : "Waiting for trigger"}</p>
                    <p>{tradePreview.sizingHint.message}</p>
                    <p>Projected exposure: {formatSignedPercent(tradePreview.sizingHint.projectedExposurePercent)}</p>
                  </>
                ) : null}
              </div>
              {(tradePreview?.warnings ?? []).length > 0 ? (
                <div className="mt-3 grid gap-1">
                  {tradePreview?.warnings.map((warning) => (
                    <p key={warning} className="border border-amber-900 bg-amber-100 px-2 py-1 text-xs text-amber-950">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PixelButton tone="good" onClick={() => { setPreviewSide("BUY"); void placeTrade("BUY"); }}>
                  Buy {tradeEstimate.qty}
                </PixelButton>
                <PixelButton tone="neutral" onClick={() => { setPreviewSide("SELL"); void placeTrade("SELL"); }}>
                  Sell {tradeEstimate.qty}
                </PixelButton>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]" aria-label="Agent and portfolio panels">
          <div className="grid gap-4">
            <DialogueBox
              speaker={selectedGameAgent.name}
              role={selectedGameAgent.role}
              status={terminalStatus.toLowerCase()}
              signal={String(terminalSignal).toLowerCase()}
              confidence={`${terminalConfidence}% confidence`}
              text={selectedExplanation?.description ? `${selectedExplanation.description} ${terminalAnalysis}` : terminalAnalysis}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <PixelButton tone="good" onClick={askSelectedAgent} disabled={terminalStatus === "THINKING"}>
                  Ask this agent
                </PixelButton>
                <Link
                  href="/research"
                  className="pixel-button min-h-10 border-2 border-black bg-[#fff8e7] px-3 py-2 text-center text-xs font-black uppercase text-slate-950 shadow-[4px_4px_0_#111] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#111] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Open Research
                </Link>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <Metric label="Personality" value={selectedGameAgent.personality} />
                <Metric label="Stage" value={selectedExplanation?.stage.replace("_", " ") ?? "LOCAL"} />
                <Metric label="Manager Weight" value={`${Math.round((selectedExplanation?.baseWeight ?? 0) * 100)}%`} />
                <Metric label="Evidence" value={`${dataQualityStatus} ${Math.round(dataQuality * 100)}%`} />
              </div>
              <div className="mt-3 grid gap-2">
                {(selected?.reasons ?? []).map((reason, idx) => (
                  <EvidenceReason key={`${selected?.id ?? "agent"}-r-${idx}`} reason={reason} />
                ))}
                {(selected?.reasons?.length ?? 0) === 0 ? <p className="text-xs text-slate-600">No structured reasons available yet.</p> : null}
              </div>
            </DialogueBox>

            <TeamDecisionPanel
              score={analysisExplanation ? String(Math.round(analysisExplanation.managerScore)) : undefined}
              confidence={analysisExplanation ? `${Math.round(analysisExplanation.managerConfidence * 100)}%` : undefined}
              coverageText={analysisExplanation ? `${analysisExplanation.coverage.completed}/${analysisExplanation.coverage.total}` : `${completedCommittee.length}/14`}
              voteText={`${voteMix.BUY} BUY | ${voteMix.HOLD} HOLD | ${voteMix.AVOID} AVOID`}
              caveats={analysisExplanation?.caveats ?? []}
            >
              {explanationAgents.length > 0 ? explanationAgents.filter((agent) => agent.agentType !== "PORTFOLIO_MANAGER").map((agent) => (
                <AgentCard
                  key={agent.agentType}
                  role={`${agent.role}${analysisExplanation?.topContributors.includes(agent.agentType) ? " *" : ""}`}
                  status={agent.status}
                  recommendation={agent.recommendation}
                  confidence={agent.confidence}
                  selected={selectedAgent === agent.agentType}
                  onSelect={() => setSelectedAgent(agent.agentType)}
                />
              )) : completedCommittee.slice(0, 6).map((rec) => (
                <AgentCard
                  key={rec.id}
                  role={agentLabel(rec.agentType)}
                  status={rec.status}
                  recommendation={rec.recommendation}
                  confidence={rec.confidence}
                  selected={selectedAgent === rec.agentType}
                  onSelect={() => setSelectedAgent(rec.agentType)}
                />
              ))}
            </TeamDecisionPanel>
          </div>

          <section className="rounded-[6px] border-4 border-slate-950 bg-white p-3 pixel-card sm:p-4">
            <h2 className="font-pixel text-[10px] sm:text-xs">Portfolio</h2>
            <p className="mt-2 truncate text-xs text-slate-600">Demo account: {portfolio?.accountKey ?? "loading"}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <Metric label="Cash" value={formatMoney(portfolio?.cash ?? 0)} />
              <Metric label="Total Value" value={formatMoney(portfolio?.totalValue ?? 0)} />
              <Metric label="Total P&L" value={`${formatMoney(portfolio?.totalPnl ?? 0)} (${formatSignedPercent(portfolio?.totalPnlPercent ?? 0)})`} tone={(portfolio?.totalPnl ?? 0) >= 0 ? "good" : "bad"} />
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
                    <span>{p.quantity} sh @ {formatMoney(p.averageCost)} | {formatSignedPercent(p.portfolioWeight)} weight</span>
                    <span className={ret >= 0 ? "text-emerald-800" : "text-red-800"}>{formatSignedPercent(p.unrealizedPnlPercent)}</span>
                  </div>
                );
              })}
              {(portfolio?.positions.length ?? 0) === 0 ? <p className="p-2 text-xs text-slate-600">No simulated positions yet.</p> : null}
            </div>
          </section>
        </section>

        <section className="grid gap-3 md:grid-cols-3" aria-label="More rooms">
          <RoomLink href="/research" title="Research Room" detail="Agent debate, evidence, caveats, and team-meeting notes." />
          <RoomLink href="/history" title="History Vault" detail="Watchlist, recommendations, and simulated trade log." />
          <RoomLink href="/backtest" title="Backtest Lab" detail="Replay the manager signal against historical closes." />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-4 border-black bg-white p-2 md:hidden" role="toolbar" aria-label="Quick trade controls">
        <div className="grid grid-cols-3 gap-2">
          <PixelButton tone="magic" glow className="px-1 text-[10px]" onClick={() => void runAnalysis()}>
            Analyze
          </PixelButton>
          <PixelButton tone="good" className="px-1 text-[10px]" onClick={() => void placeTrade("BUY")}>
            Buy {tradeEstimate.qty}
          </PixelButton>
          <PixelButton tone="neutral" className="px-1 text-[10px]" onClick={() => void placeTrade("SELL")}>
            Sell {tradeEstimate.qty}
          </PixelButton>
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

function RoomLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="pixel-panel rounded-[6px] border-4 border-black bg-[#fffdf4] p-3 shadow-[5px_5px_0_#111] transition-transform hover:-translate-y-1 hover:bg-[#f7fff7] active:translate-x-1 active:translate-y-1 active:shadow-none"
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
