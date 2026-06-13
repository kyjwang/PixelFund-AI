"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { z } from "zod";
import {
  analysisExplanationSchema,
  analysisRunSchema,
  cryptoCashAdjustmentSchema,
  cryptoTraderClearDataResultSchema,
  cryptoTraderCheckResultSchema,
  cryptoTraderLogSchema,
  cryptoTraderSettingsSchema,
  cryptoTraderSettingsUpdateSchema,
  marketContextSchema,
  orderPreviewSchema,
  orderSchema,
  portfolioSchema,
  stockHistorySchema,
  tradeSchema,
  watchlistItemSchema
} from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile, StatusBadge, cx } from "../../components/GameUI";
import { api } from "../../lib/api";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
const stockSearchSchema = z.array(z.object({ symbol: z.string(), description: z.string() }));
const orderStatusFilterSchema = z.enum(["PENDING", "PARTIALLY_FILLED", "FILLED", "CANCELED", "REJECTED", "EXPIRED"]);

type Portfolio = z.infer<typeof portfolioSchema>;
type AnalysisRun = z.infer<typeof analysisRunSchema>;
type AnalysisExplanation = z.infer<typeof analysisExplanationSchema>;
type MarketContext = z.infer<typeof marketContextSchema>;
type Trade = z.infer<typeof tradeSchema>;
type Order = z.infer<typeof orderSchema>;
type OrderPreview = z.infer<typeof orderPreviewSchema>;
type StockHistory = z.infer<typeof stockHistorySchema>;
type WatchlistItem = z.infer<typeof watchlistItemSchema>;
type CryptoTraderSettings = z.infer<typeof cryptoTraderSettingsSchema>;
type CryptoTraderSettingsUpdate = z.infer<typeof cryptoTraderSettingsUpdateSchema>;
type CryptoTraderLog = z.infer<typeof cryptoTraderLogSchema>;

type Tab = "positions" | "orders" | "fills" | "analysis";
type Range = "1d" | "1mo" | "6mo" | "1y";
type TradingMode = "stock" | "crypto";

const softInputClass = "h-12 rounded-[8px] border border-white/70 bg-white/70 px-3 font-pixel text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur focus:bg-white/95";
const compactInputClass = "h-11 rounded-[8px] border border-white/70 bg-white/70 px-2 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_24px_rgba(15,23,42,0.07)] outline-none backdrop-blur focus:bg-white/95";

export default function TradingPage() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get("ticker")?.trim().toUpperCase() ?? "");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [explanation, setExplanation] = useState<AnalysisExplanation | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [history, setHistory] = useState<StockHistory | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [cryptoSettings, setCryptoSettings] = useState<CryptoTraderSettings | null>(null);
  const [cryptoLogs, setCryptoLogs] = useState<CryptoTraderLog[]>([]);
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; description: string }>>([]);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [previewSide, setPreviewSide] = useState<"BUY" | "SELL">("BUY");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [orderPreview, setOrderPreview] = useState<OrderPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [range, setRange] = useState<Range>("1mo");
  const [activeTab, setActiveTab] = useState<Tab>("positions");
  const [tradingMode, setTradingMode] = useState<TradingMode>("stock");
  const [socketConnected, setSocketConnected] = useState(false);
  const [quoteStale, setQuoteStale] = useState(false);
  const [isCryptoChecking, setIsCryptoChecking] = useState(false);
  const [isCashAdjusting, setIsCashAdjusting] = useState(false);
  const [isCryptoClearing, setIsCryptoClearing] = useState(false);
  const [cryptoClearNotice, setCryptoClearNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const tickerRef = useRef(ticker);
  const watchlistRef = useRef(watchlist);

  const normalizedTicker = ticker.trim().toUpperCase();
  const hasTicker = normalizedTicker.length > 0;

  async function refresh(targetTicker = normalizedTicker, targetRange = range) {
    const normalized = targetTicker.trim().toUpperCase();
    try {
      const [p, r, o, t, w, cs, cl] = await Promise.all([
        api("/portfolio", portfolioSchema),
        api("/analysis-runs", z.array(analysisRunSchema)),
        api("/orders?limit=50", z.array(orderSchema)),
        api("/trades?limit=50", z.array(tradeSchema)),
        api("/watchlist", z.array(watchlistItemSchema)),
        api("/crypto-trader/settings", cryptoTraderSettingsSchema),
        api("/crypto-trader/logs?limit=50", z.array(cryptoTraderLogSchema))
      ]);
      const [c, h] = normalized
        ? await Promise.all([
            api(`/stocks/${encodeURIComponent(normalized)}/context`, marketContextSchema),
            api(`/stocks/${encodeURIComponent(normalized)}/history?range=${targetRange}`, stockHistorySchema)
          ])
        : [null, null];
      setPortfolio(p);
      setRuns(r);
      setMarketContext(c);
      setHistory(h);
      setOrders(o);
      setTrades(t);
      setWatchlist(w);
      setCryptoSettings(cs);
      setCryptoLogs(cl);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load trading terminal data");
    }
  }

  function subscribeTickers(socket: Socket, currentTicker: string, items: WatchlistItem[]) {
    if (currentTicker.trim()) socket.emit("quote.subscribe", { ticker: currentTicker.trim().toUpperCase() });
    for (const item of items.slice(0, 12)) socket.emit("quote.subscribe", { ticker: item.ticker });
  }

  useEffect(() => {
    tickerRef.current = normalizedTicker;
  }, [normalizedTicker]);

  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  useEffect(() => {
    void refresh(normalizedTicker, range);
  }, [range]);

  useEffect(() => {
    const socket = io(WS_URL, {
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      randomizationFactor: 0.4
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      setQuoteStale(false);
      subscribeTickers(socket, tickerRef.current, watchlistRef.current);
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
      setQuoteStale(true);
    });
    socket.on("quote.updated", (payload: unknown) => {
      const parsed = marketContextSchema.shape.quote.safeParse(payload);
      if (!parsed.success) return;
      if (parsed.data.ticker === tickerRef.current) void refresh(tickerRef.current, range);
    });
    socket.on("quote.stale", (payload: any) => {
      if (payload?.ticker === tickerRef.current) setQuoteStale(true);
    });
    socket.on("portfolio.updated", () => void refresh(tickerRef.current, range));
    socket.on("order.created", () => void refresh(tickerRef.current, range));
    socket.on("order.updated", () => void refresh(tickerRef.current, range));
    socket.on("order.filled", () => void refresh(tickerRef.current, range));

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socketRef.current?.connected) subscribeTickers(socketRef.current, normalizedTicker, watchlist);
  }, [normalizedTicker, watchlist]);

  useEffect(() => {
    if (normalizedTicker) return;
    setMarketContext(null);
    setHistory(null);
    setOrderPreview(null);
    setExplanation(null);
    setQuoteStale(false);
  }, [normalizedTicker]);

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

  const latest = useMemo(() => (normalizedTicker ? runs.find((run) => run.ticker === normalizedTicker) : undefined), [runs, normalizedTicker]);

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

  const quote = marketContext?.quote ?? null;
  const activePosition = portfolio?.positions.find((p) => p.ticker === normalizedTicker) ?? null;
  const portfolioManager = latest?.recommendations.find((r) => r.agentType === "PORTFOLIO_MANAGER");
  const teamLead = latest?.recommendations.find((r) => r.agentType === "TEAM_LEAD");
  const openOrders = orders.filter((order) => order.status === "PENDING" || order.status === "PARTIALLY_FILLED");
  const quoteAgeMs = quote ? Date.now() - new Date(quote.updatedAt).getTime() : Number.POSITIVE_INFINITY;
  const quoteIsLive = quote?.source === "finnhub";
  const historyIsLive = history?.dataQuality.status === "LIVE";
  const terminalTradable = Boolean(orderPreview?.tradable && quoteIsLive && historyIsLive && !quoteStale);
  const finalRec = latest?.finalRec ?? portfolioManager?.recommendation ?? "PENDING";
  const maxExposure = Math.max(0, ...(portfolio?.positions ?? []).map((position) => position.portfolioWeight));
  const concentration = portfolio?.positions.find((position) => position.portfolioWeight === maxExposure);

  const orderEstimate = useMemo(() => {
    const px = orderPreview?.estimatedPrice ?? quote?.price ?? 0;
    const qty = Math.max(1, quantity);
    const gross = px * qty;
    return {
      qty,
      gross,
      projectedCashBuy: (portfolio?.cash ?? 0) - gross,
      projectedCashSell: (portfolio?.cash ?? 0) + gross
    };
  }, [portfolio?.cash, quantity, quote?.price, orderPreview?.estimatedPrice]);

  useEffect(() => {
    if (!quote) return;
    const controller = new AbortController();
    const id = setTimeout(async () => {
      try {
        const preview = await api("/orders/preview", orderPreviewSchema, {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify(orderPayload(previewSide))
        });
        setOrderPreview(preview);
      } catch {
        setOrderPreview(null);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(id);
    };
  }, [normalizedTicker, quantity, orderType, limitPrice, stopPrice, previewSide, quote?.price, portfolio?.cash, history?.dataQuality.status]);

  function orderPayload(side: "BUY" | "SELL") {
    return {
      ticker: normalizedTicker,
      side,
      quantity: orderEstimate.qty,
      orderType,
      ...(orderType === "LIMIT" && typeof limitPrice === "number" ? { limitPrice } : {}),
      ...(orderType === "STOP" && typeof stopPrice === "number" ? { stopPrice } : {})
    };
  }

  async function selectTicker(symbol: string) {
    const normalized = symbol.toUpperCase();
    setTicker(normalized);
    setSearchResults([]);
    setQuoteStale(false);
    await refresh(normalized, range);
  }

  async function addWatchlist() {
    if (!normalizedTicker) {
      setError("Choose a ticker before adding it to your watchlist.");
      return;
    }
    const item = await api("/watchlist", watchlistItemSchema, {
      method: "POST",
      body: JSON.stringify({ ticker: normalizedTicker })
    });
    setWatchlist((items) => [item, ...items.filter((x) => x.ticker !== item.ticker)]);
  }

  async function removeWatchlist(symbol: string) {
    await api(`/watchlist/${encodeURIComponent(symbol)}`, z.object({ ticker: z.string() }), { method: "DELETE" });
    setWatchlist((items) => items.filter((x) => x.ticker !== symbol));
  }

  async function submitOrder() {
    if (!normalizedTicker) {
      setError("Choose a ticker before creating an order.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api("/orders", orderSchema, {
        method: "POST",
        body: JSON.stringify(orderPayload(previewSide))
      });
      await refresh(normalizedTicker, range);
      setActiveTab(orderType === "MARKET" ? "fills" : "orders");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Order rejected");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function cancelOrder(id: string) {
    await api(`/orders/${encodeURIComponent(id)}/cancel`, orderSchema, { method: "POST" });
    await refresh(normalizedTicker, range);
  }

  async function updateCryptoSettings(patch: CryptoTraderSettingsUpdate) {
    try {
      const updated = await api("/crypto-trader/settings", cryptoTraderSettingsSchema, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
      setCryptoSettings(updated);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update crypto bot settings");
    }
  }

  async function runCryptoCheck() {
    setIsCryptoChecking(true);
    try {
      const result = await api("/crypto-trader/check-now", cryptoTraderCheckResultSchema, { method: "POST" });
      setCryptoSettings(result.settings);
      setCryptoLogs((logs) => [...result.logs, ...logs].slice(0, 50));
      await refresh(normalizedTicker, range);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crypto bot check failed");
    } finally {
      setIsCryptoChecking(false);
    }
  }

  async function adjustCryptoCash(amount: z.infer<typeof cryptoCashAdjustmentSchema>["amount"]) {
    setIsCashAdjusting(true);
    try {
      const nextPortfolio = await api("/crypto-trader/cash-adjustment", portfolioSchema, {
        method: "POST",
        body: JSON.stringify({ amount })
      });
      setPortfolio(nextPortfolio);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to adjust virtual cash");
    } finally {
      setIsCashAdjusting(false);
    }
  }

  async function clearCryptoDemoData() {
    const ok = window.confirm("Clear this demo account's backend data? This deletes AI analyses, crypto bot logs/settings, watchlist, orders, fills, positions, and resets virtual cash. It does not delete other demo users.");
    if (!ok) return;
    setIsCryptoClearing(true);
    try {
      const result = await api("/crypto-trader/demo-data", cryptoTraderClearDataResultSchema, { method: "DELETE" });
      setCryptoClearNotice(`Cleared ${result.deletedAnalysisRuns} analyses, ${result.deletedCryptoLogs} bot logs, ${result.deletedTrades} fills, ${result.deletedOrders} orders, and ${result.deletedPositions} positions.`);
      setCryptoLogs([]);
      setCryptoSettings(null);
      setOrders([]);
      setTrades([]);
      setWatchlist([]);
      setRuns([]);
      await refresh(normalizedTicker, range);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to clear demo data");
    } finally {
      setIsCryptoClearing(false);
    }
  }

  const blockingWarning = (orderPreview?.warnings ?? []).some((warning) => warning.toLowerCase().includes("insufficient"));
  const canSubmit = Boolean(orderPreview && terminalTradable && !blockingWarning && !isSubmitting);

  return (
    <main className="mx-auto grid max-w-[1500px] gap-3 px-3 py-3 text-slate-950 sm:px-4 md:px-6">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[8px] p-2">
        <div>
          <p className="font-pixel text-[10px] uppercase tracking-[0.16em] text-emerald-700">Trading mode</p>
          <p className="text-xs text-slate-600">Stocks stay manual. Crypto mode can run the fake-money bot.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["stock", "crypto"] as TradingMode[]).map((mode) => (
            <button
              key={mode}
              className={cx("min-h-10 rounded-full border px-4 text-xs font-black uppercase transition hover:-translate-y-0.5", tradingMode === mode ? "border-slate-950/20 bg-slate-950 text-white" : "border-white/60 bg-white/64 text-slate-700 hover:bg-white/84")}
              onClick={() => setTradingMode(mode)}
            >
              {mode === "stock" ? "Stock" : "Crypto"}
            </button>
          ))}
        </div>
      </div>

      {tradingMode === "crypto" ? (
        <CryptoModePanel
          portfolio={portfolio}
          settings={cryptoSettings}
          logs={cryptoLogs}
          isChecking={isCryptoChecking}
          isCashAdjusting={isCashAdjusting}
          onUpdateSettings={(patch) => void updateCryptoSettings(patch)}
          onCheckNow={() => void runCryptoCheck()}
          onAdjustCash={(amount) => void adjustCryptoCash(amount)}
          onClearData={() => void clearCryptoDemoData()}
          isClearing={isCryptoClearing}
          clearNotice={cryptoClearNotice}
        />
      ) : (
      <section className="grid gap-3 xl:grid-cols-[320px_1fr_360px]">
        <div className="grid gap-3">
          <PixelCard title="Markets" eyebrow={socketConnected ? "live terminal" : "reconnecting"}>
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="trading-ticker">
              Symbol
              <input
                id="trading-ticker"
                value={ticker}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
                placeholder="Search ticker"
                className={softInputClass}
              />
            </label>
            {searchResults.length > 0 ? (
              <div className="glass-panel mt-2 grid gap-1 rounded-[8px] p-2">
                {searchResults.map((item) => (
                  <button
                    key={item.symbol}
                    className="grid grid-cols-[70px_1fr] gap-2 rounded-[7px] px-2 py-2 text-left text-xs hover:bg-white/72"
                    onClick={() => void selectTicker(item.symbol)}
                  >
                    <span className="font-pixel text-[10px]">{item.symbol}</span>
                    <span className="truncate text-slate-600">{item.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PixelButton tone="magic" onClick={() => void refresh(normalizedTicker, range)} disabled={!hasTicker}>
                Refresh
              </PixelButton>
              <PixelButton tone="good" onClick={() => void addWatchlist()} disabled={!hasTicker}>
                Watch
              </PixelButton>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              Pick a symbol first. The terminal does not load a default stock or execute against placeholder data.
            </p>
          </PixelCard>

          <PixelCard title="Watchlist" eyebrow="account scoped">
            <div className="grid max-h-[280px] gap-2 overflow-auto pr-1">
              {watchlist.map((item) => (
                <div key={item.id} className="glass-chip grid grid-cols-[1fr_auto] gap-2 rounded-[8px] px-2.5 py-2 text-xs">
                  <button className="text-left font-pixel text-[10px]" onClick={() => void selectTicker(item.ticker)}>
                    {item.ticker}
                  </button>
                  <button className="font-black text-red-800" aria-label={`Remove ${item.ticker}`} onClick={() => void removeWatchlist(item.ticker)}>
                    x
                  </button>
                </div>
              ))}
              {watchlist.length === 0 ? <p className="text-xs text-slate-600">No watchlist symbols yet.</p> : null}
            </div>
          </PixelCard>

          <PixelCard title="Account" eyebrow="buying power">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Cash" value={portfolio ? formatMoney(portfolio.cash) : "--"} help="Uninvested virtual money" />
              <StatTile label="Equity" value={portfolio ? formatMoney(portfolio.totalValue) : "--"} help="Cash plus positions" />
              <StatTile label="Realized" value={formatMoney(portfolio?.realizedPnl ?? 0)} tone={(portfolio?.realizedPnl ?? 0) >= 0 ? "good" : "bad"} help="Locked-in gains or losses" />
              <StatTile label="Unrealized" value={formatMoney(portfolio?.totalUnrealizedPnl ?? 0)} tone={(portfolio?.totalUnrealizedPnl ?? 0) >= 0 ? "good" : "bad"} help="Open position change" />
              <StatTile label="Total P&L" value={`${formatMoney(portfolio?.totalPnl ?? 0)} ${formatSignedPercent(portfolio?.totalPnlPercent ?? 0)}`} tone={(portfolio?.totalPnl ?? 0) >= 0 ? "good" : "bad"} help="Overall simulator result" />
              <StatTile label="Max Exposure" value={concentration ? `${concentration.ticker} ${formatSignedPercent(concentration.portfolioWeight)}` : "0.0%"} help="Largest position weight" />
            </div>
          </PixelCard>
        </div>

        <div className="grid gap-3">
          <PixelCard title={`${normalizedTicker || "No Symbol"} Terminal`} eyebrow="instrument">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold leading-8 tracking-normal">{normalizedTicker || "Choose a symbol"}</h1>
                  <StatusBadge value={hasTicker ? terminalTradable ? "tradable" : "not tradable" : "waiting"} />
                  <StatusBadge value={hasTicker ? quoteStale ? "stale" : quote?.source ?? "loading" : "no quote"} />
                  <StatusBadge value={hasTicker ? history?.dataQuality.status ?? "loading" : "no chart"} />
                </div>
                <p className="mt-2 text-4xl font-black leading-none">{quote ? formatMoney(quote.price) : "--"}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {quote ? `${formatSignedPercent(quote.changePercent)} today | updated ${formatTime(quote.updatedAt)} | age ${formatAge(quoteAgeMs)}` : "No live quote is loaded until you choose a ticker."}
                </p>
              </div>
              <Link href={normalizedTicker ? `/?ticker=${encodeURIComponent(normalizedTicker)}` : "/"} className="pixel-button rounded-full border border-white/60 bg-white/62 px-3.5 py-2 text-center text-xs font-black uppercase text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 hover:bg-white/82">
                Desk
              </Link>
            </div>
            {orderPreview?.blockingReasons.length ? (
              <div className="mt-3 grid gap-1">
                {orderPreview.blockingReasons.map((reason) => (
                  <p key={reason} className="rounded-[8px] border border-red-200/80 bg-red-100/85 px-2 py-1 text-xs font-semibold text-red-950">
                    {reason}
                  </p>
                ))}
              </div>
            ) : null}
          </PixelCard>

          <PixelCard title="Price Chart" eyebrow="historical candles">
            <div className="mb-3 flex flex-wrap gap-2">
              {(["1d", "1mo", "6mo", "1y"] as Range[]).map((nextRange) => (
                <button
                  key={nextRange}
                  className={cx("rounded-full border px-2.5 py-1 text-xs font-black uppercase transition hover:-translate-y-0.5", range === nextRange ? "border-emerald-300/70 bg-[linear-gradient(135deg,#0f8f78,#2f6df6)] text-white shadow-[0_10px_24px_rgba(15,143,120,0.16)]" : "border-white/60 bg-white/56 text-slate-700 hover:bg-white/80")}
                  onClick={() => setRange(nextRange)}
                >
                  {nextRange}
                </button>
              ))}
            </div>
            <PriceChart history={history} hasTicker={hasTicker} />
          </PixelCard>

          <PixelCard title="Blotter" eyebrow="positions / orders / fills / analysis">
            <div className="mb-3 grid grid-cols-4 gap-2">
              {([
                ["positions", "Positions"],
                ["orders", "Open Orders"],
                ["fills", "Fills"],
                ["analysis", "Analysis"]
              ] as Array<[Tab, string]>).map(([id, label]) => (
                <button
                  key={id}
                  className={cx("min-h-10 rounded-full border px-1 text-[10px] font-black uppercase transition hover:-translate-y-0.5", activeTab === id ? "border-slate-950/20 bg-slate-950 text-white" : "border-white/60 bg-white/56 text-slate-700 hover:bg-white/80")}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "positions" ? <PositionsPanel positions={portfolio?.positions ?? []} onSelect={(symbol) => void selectTicker(symbol)} /> : null}
            {activeTab === "orders" ? <OrdersPanel orders={openOrders} onCancel={(id) => void cancelOrder(id)} /> : null}
            {activeTab === "fills" ? <FillsPanel trades={trades} /> : null}
            {activeTab === "analysis" ? <AnalysisPanel finalRec={finalRec} portfolioManager={portfolioManager?.summary ?? latest?.finalSummary ?? null} teamLead={teamLead?.summary ?? null} explanation={explanation} /> : null}
          </PixelCard>
        </div>

        <div className="grid gap-3">
          <PixelCard title="Order Ticket" eyebrow="live data required">
            <div className="grid grid-cols-2 gap-2">
              <PixelButton tone={previewSide === "BUY" ? "good" : "neutral"} onClick={() => setPreviewSide("BUY")}>
                Buy
              </PixelButton>
              <PixelButton tone={previewSide === "SELL" ? "warn" : "neutral"} onClick={() => setPreviewSide("SELL")}>
                Sell
              </PixelButton>
            </div>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-xs font-black uppercase" htmlFor="order-type-input">
                Order Type
                <select
                  id="order-type-input"
                  value={orderType}
                  onChange={(event) => setOrderType(event.target.value as "MARKET" | "LIMIT" | "STOP")}
                  className={compactInputClass}
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                  <option value="STOP">Stop</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-black uppercase" htmlFor="quantity-input">
                Quantity
                <input
                  id="quantity-input"
                  type="number"
                  min={1}
                  value={orderEstimate.qty}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || "1")))}
                  className={compactInputClass}
                />
              </label>
              {orderType === "LIMIT" ? (
                <label className="grid gap-1 text-xs font-black uppercase" htmlFor="limit-price-input">
                  Limit Price
                  <input id="limit-price-input" type="number" min={0.01} step={0.01} value={limitPrice} placeholder={quote ? String(quote.price.toFixed(2)) : "0.00"} onChange={(event) => setLimitPrice(event.target.value === "" ? "" : Number(event.target.value))} className={compactInputClass} />
                </label>
              ) : null}
              {orderType === "STOP" ? (
                <label className="grid gap-1 text-xs font-black uppercase" htmlFor="stop-price-input">
                  Stop Price
                  <input id="stop-price-input" type="number" min={0.01} step={0.01} value={stopPrice} placeholder={quote ? String(quote.price.toFixed(2)) : "0.00"} onChange={(event) => setStopPrice(event.target.value === "" ? "" : Number(event.target.value))} className={compactInputClass} />
                </label>
              ) : null}
            </div>

            <div className="glass-chip mt-3 grid gap-1 rounded-[8px] p-2.5 text-xs">
              <p>Buying power: {formatMoney(portfolio?.cash ?? 0)}</p>
              <p>Held shares: {activePosition?.quantity ?? 0}</p>
              <p>Estimated cost/proceeds: {formatMoney(orderEstimate.gross)}</p>
              <p>Projected cash after buy: {formatMoney(orderEstimate.projectedCashBuy)}</p>
              <p>Projected cash after sell: {formatMoney(orderEstimate.projectedCashSell)}</p>
              {orderPreview ? (
                <>
                  <p>Trigger: {orderPreview.executableNow ? "fills now" : "rests open"}</p>
                  <p>Projected exposure: {formatSignedPercent(orderPreview.sizingHint.projectedExposurePercent)}</p>
                </>
              ) : null}
            </div>
            {(orderPreview?.warnings ?? []).length > 0 ? (
              <div className="mt-3 grid gap-1">
                {orderPreview?.warnings.map((warning) => (
                  <p key={warning} className="rounded-[8px] border border-amber-200/80 bg-amber-100/85 px-2 py-1 text-xs text-amber-950">
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
            <PixelButton tone={previewSide === "BUY" ? "good" : "warn"} className="mt-3 w-full" onClick={() => void submitOrder()} disabled={!canSubmit}>
              {isSubmitting ? "Submitting" : !hasTicker ? "Choose Symbol" : orderType === "MARKET" ? `${previewSide} at Market` : `Place ${previewSide} ${orderType}`}
            </PixelButton>
            {!terminalTradable ? <p className="mt-3 rounded-[8px] border border-red-200/80 bg-red-100/85 p-2 text-xs font-semibold text-red-950">{hasTicker ? "Order entry is disabled until quote and chart data are live and fresh." : "Choose a ticker to preview an order. The simulator will not use a default symbol."}</p> : null}
          </PixelCard>

          <PixelCard title="Open Risk" eyebrow="guardrails">
            <div className="grid gap-2 text-xs">
              <StatTile label="Open Orders" value={`${openOrders.length}`} />
              <StatTile label="Selected Exposure" value={formatSignedPercent(activePosition?.portfolioWeight ?? 0)} />
              <StatTile label="Final Rec" value={finalRec} tone={finalRec === "BUY" ? "good" : finalRec === "AVOID" ? "bad" : "warn"} />
              <p className="glass-chip rounded-[8px] p-2.5 leading-5">
                {orderPreview?.sizingHint.message ?? "Preview an order to see buying power, exposure, trigger, and concentration checks."}
              </p>
            </div>
          </PixelCard>
        </div>
      </section>
      )}

      {error ? <p className="glass-panel rounded-[8px] border-red-200/80 bg-red-100/80 p-3 text-sm text-red-950">{error}</p> : null}
    </main>
  );
}

function CryptoModePanel({
  portfolio,
  settings,
  logs,
  isChecking,
  isCashAdjusting,
  isClearing,
  clearNotice,
  onUpdateSettings,
  onCheckNow,
  onAdjustCash,
  onClearData
}: {
  portfolio: Portfolio | null;
  settings: CryptoTraderSettings | null;
  logs: CryptoTraderLog[];
  isChecking: boolean;
  isCashAdjusting: boolean;
  isClearing: boolean;
  clearNotice: string | null;
  onUpdateSettings: (patch: CryptoTraderSettingsUpdate) => void;
  onCheckNow: () => void;
  onAdjustCash: (amount: 10000 | -10000) => void;
  onClearData: () => void;
}) {
  const selected = settings?.selectedCoins ?? ["BTC"];
  const cryptoPositions = (portfolio?.positions ?? []).filter((position) => ["BTC", "ETH", "SOL"].includes(position.ticker));
  const autoRunOn = Boolean(settings?.enabled);
  const [clock, setClock] = useState(() => Date.now());
  const aggressiveExpiresAt = settings?.aggressiveExpiresAt ? new Date(settings.aggressiveExpiresAt).getTime() : 0;
  const aggressiveOn = settings?.strategyMode === "AGGRESSIVE" && aggressiveExpiresAt > clock;
  const aggressiveRemainingMs = Math.max(0, aggressiveExpiresAt - clock);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  function toggleCoin(symbol: "BTC" | "ETH" | "SOL") {
    const has = selected.includes(symbol);
    const next = has ? selected.filter((coin) => coin !== symbol) : [...selected, symbol];
    if (next.length < 1 || next.length > 2) return;
    onUpdateSettings({ selectedCoins: next });
  }

  return (
    <section className="grid gap-3 xl:grid-cols-[340px_1fr_380px]">
      <div className="grid gap-3">
        <PixelCard title="Crypto Bot" eyebrow={autoRunOn ? "auto run mode on" : "auto run mode off"}>
          <div className={cx("rounded-[8px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]", autoRunOn ? "border-emerald-300/80 bg-emerald-100/82" : "border-slate-200/80 bg-white/62")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={cx("font-pixel text-[10px] uppercase tracking-[0.14em]", autoRunOn ? "text-emerald-800" : "text-slate-500")}>
                  {autoRunOn ? "Auto run active" : "Auto run paused"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {autoRunOn ? aggressiveOn ? "Aggressive mode checks selected coins every 5 minutes." : "Backend checks selected coins every 30 minutes." : "No automatic crypto checks will run."}
                </p>
              </div>
              <StatusBadge value={autoRunOn ? "ON" : "OFF"} tone={autoRunOn ? "good" : "warn"} />
            </div>
            <button
              className={cx(
                "mt-3 min-h-14 w-full rounded-[8px] border px-4 text-sm font-black uppercase tracking-[0.08em] shadow-[0_14px_30px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60",
                autoRunOn
                  ? "border-emerald-400/80 bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border-slate-950/15 bg-slate-950 text-white hover:bg-slate-800"
              )}
              onClick={() => onUpdateSettings({ enabled: !autoRunOn })}
              disabled={!settings}
            >
              {autoRunOn ? "Auto Run Is On - Turn Off" : "Turn Auto Run On"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Auto run is fake-money only. A BUY/SELL only happens when real crypto data, strategy signal, exposure, cash, cooldown, and daily limits all pass.
          </p>
          <PixelButton tone="magic" className="mt-3 w-full" onClick={onCheckNow} disabled={!settings || isChecking}>
            {isChecking ? "Checking Crypto Data" : "Run One Check Now"}
          </PixelButton>
          <div className={cx("mt-3 rounded-[8px] border p-3", aggressiveOn ? "border-red-200/80 bg-red-100/78" : "border-white/65 bg-white/58")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={cx("font-pixel text-[10px] uppercase tracking-[0.14em]", aggressiveOn ? "text-red-800" : "text-slate-600")}>
                  {aggressiveOn ? "Aggressive active" : "Balanced strategy"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {aggressiveOn ? `Aggressive ends in ${formatCountdown(aggressiveRemainingMs)}. Cooldown is 5 minutes.` : "Balanced uses safer thresholds and a 60 minute cooldown."}
                </p>
              </div>
              <StatusBadge value={aggressiveOn ? "1H MODE" : "BALANCED"} tone={aggressiveOn ? "bad" : "neutral"} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <PixelButton tone={aggressiveOn ? "neutral" : "bad"} onClick={() => onUpdateSettings({ strategyMode: "AGGRESSIVE" })} disabled={!settings}>
                Start 1-Hour Aggressive Mode
              </PixelButton>
              <PixelButton tone="neutral" onClick={() => onUpdateSettings({ strategyMode: "BALANCED" })} disabled={!settings || !aggressiveOn}>
                Back to Balanced
              </PixelButton>
            </div>
          </div>
          <div className="mt-3 grid gap-2">
            <label className="grid gap-1 text-xs font-black uppercase">
              Max trades/day
              <select value={settings?.maxTradesPerDay ?? 4} onChange={(event) => onUpdateSettings({ maxTradesPerDay: Number(event.target.value) })} className={compactInputClass} disabled={!settings}>
                {Array.from({ length: 30 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-black uppercase">
              Stop-loss %
              <input type="number" min={1} max={25} value={settings?.stopLossPercent ?? 4} onChange={(event) => onUpdateSettings({ stopLossPercent: Number(event.target.value || 4) })} className={compactInputClass} disabled={!settings} />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase">
              Max per coin %
              <input type="number" min={1} max={20} value={settings?.maxPortfolioPercent ?? 20} onChange={(event) => onUpdateSettings({ maxPortfolioPercent: Number(event.target.value || 20) })} className={compactInputClass} disabled={!settings} />
            </label>
          </div>
        </PixelCard>

        <PixelCard title="Virtual Cash" eyebrow="same simulator wallet">
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Cash" value={portfolio ? formatMoney(portfolio.cash) : "--"} />
            <StatTile label="Equity" value={portfolio ? formatMoney(portfolio.totalValue) : "--"} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PixelButton tone="good" onClick={() => onAdjustCash(10000)} disabled={isCashAdjusting}>
              + $10,000
            </PixelButton>
            <PixelButton tone="warn" onClick={() => onAdjustCash(-10000)} disabled={isCashAdjusting || (portfolio?.cash ?? 0) < 10000}>
              - $10,000
            </PixelButton>
          </div>
        </PixelCard>

        <PixelCard title="Clear Demo Data" eyebrow="free database cleanup">
          <p className="text-xs leading-5 text-slate-600">
            Clears this browser demo account: AI analyses, crypto bot history/settings, watchlist, orders, fills, positions, and wallet account data.
          </p>
          <PixelButton tone="warn" className="mt-3 w-full" onClick={onClearData} disabled={isClearing}>
            {isClearing ? "Clearing" : "Clear Backend Data"}
          </PixelButton>
          {clearNotice ? <p className="mt-3 rounded-[8px] border border-emerald-200/80 bg-emerald-100/80 p-2 text-xs font-semibold text-emerald-950">{clearNotice}</p> : null}
        </PixelCard>
      </div>

      <div className="grid gap-3">
        <PixelCard title="Coins" eyebrow="choose one or two">
          <div className="grid gap-3 md:grid-cols-3">
            {(["BTC", "ETH", "SOL"] as const).map((symbol) => {
              const position = cryptoPositions.find((item) => item.ticker === symbol);
              const isSelected = selected.includes(symbol);
              return (
                <button
                  key={symbol}
                  className={cx("min-h-44 rounded-[8px] border p-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:-translate-y-0.5", isSelected ? "border-emerald-300 bg-emerald-50/86" : "border-white/65 bg-white/58 hover:bg-white/78")}
                  onClick={() => toggleCoin(symbol)}
                  disabled={!settings || (!isSelected && selected.length >= 2)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-pixel text-lg">{symbol}</span>
                    <span className={cx("rounded-full border px-2 py-1 text-[10px] font-black uppercase", isSelected ? "border-emerald-300 bg-emerald-100 text-emerald-950" : "border-slate-200 bg-white/70 text-slate-600")}>{isSelected ? "selected" : "idle"}</span>
                  </div>
                  <div className="mt-4 grid gap-1 text-xs text-slate-700">
                    <p>Held: {formatQuantity(position?.quantity ?? 0)}</p>
                    <p>Avg cost: {formatMoney(position?.averageCost ?? 0)}</p>
                    <p>Market value: {formatMoney(position?.marketValue ?? 0)}</p>
                    <p>Exposure: {formatSignedPercent(position?.portfolioWeight ?? 0)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </PixelCard>

        <PixelCard title="Crypto Positions" eyebrow="fake-money holdings">
          {cryptoPositions.length === 0 ? (
            <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No crypto positions yet. Enable the bot or run Check Now after selecting coins.</p>
          ) : (
            <PositionsPanel positions={cryptoPositions} onSelect={() => undefined} />
          )}
        </PixelCard>
      </div>

      <div className="grid gap-3">
        <PixelCard title="Bot Log" eyebrow="buy / sell / hold reasons">
          <div className="grid max-h-[620px] gap-2 overflow-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="rounded-[8px] border border-white/65 bg-white/58 p-3 text-xs shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[10px]">{log.ticker}</span>
                    <span className={recommendationPill(log.action === "SELL" ? "AVOID" : log.action)}>{log.action}</span>
                  </div>
                  <span className="text-slate-500">{formatDateTime(log.createdAt)}</span>
                </div>
                <p className="mt-2 leading-5 text-slate-800">{log.reason}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-slate-600">
                  <span>Score {Math.round(log.score)}</span>
                  <span>{log.price ? formatMoney(log.price) : "No price"}</span>
                  <span>{log.notional ? formatMoney(log.notional) : "No trade"}</span>
                  <span>{log.quantity ? formatQuantity(log.quantity) : "0 qty"}</span>
                </div>
              </div>
            ))}
            {logs.length === 0 ? <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No crypto bot logs yet.</p> : null}
          </div>
        </PixelCard>
      </div>
    </section>
  );
}

function PriceChart({ history, hasTicker }: { history: StockHistory | null; hasTicker: boolean }) {
  const candles = history?.candles ?? [];
  if (candles.length === 0) {
    return (
      <div className="glass-chip grid h-[320px] place-items-center rounded-[8px] px-4 text-center text-xs leading-5 text-slate-600">
        {hasTicker ? "No chart candles available for this symbol yet." : "Choose a ticker to load price history. No chart is preloaded by default."}
      </div>
    );
  }

  const width = 900;
  const height = 320;
  const pad = 24;
  const closes = candles.map((candle) => candle.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const spread = Math.max(1, max - min);
  const points = candles.map((candle, idx) => {
    const x = pad + (idx / Math.max(1, candles.length - 1)) * (width - pad * 2);
    const y = height - pad - ((candle.close - min) / spread) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const latest = candles.at(-1);

  return (
    <div className="overflow-hidden rounded-[8px] border border-slate-950/10 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[320px] w-full" role="img" aria-label={`${history?.ticker ?? "Stock"} price chart`}>
        {[0, 1, 2, 3].map((line) => {
          const y = pad + line * ((height - pad * 2) / 3);
          return <line key={line} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#334155" strokeWidth="1" />;
        })}
        <polyline fill="none" stroke="#22c55e" strokeWidth="4" points={points.join(" ")} />
        {latest ? <text x={pad} y={height - 8} fill="#c7f9cc" fontSize="14">{latest.date} close {formatMoney(latest.close)}</text> : null}
      </svg>
    </div>
  );
}

function PositionsPanel({ positions, onSelect }: { positions: Portfolio["positions"]; onSelect: (ticker: string) => void }) {
  if (positions.length === 0) return <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No positions yet.</p>;
  return (
    <div className="glass-chip max-h-[360px] overflow-auto rounded-[8px]">
      {positions.map((position) => (
        <div key={position.ticker} className="grid grid-cols-[70px_1fr_auto] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
          <button className="text-left font-pixel text-[10px]" onClick={() => onSelect(position.ticker)}>{position.ticker}</button>
          <span>{formatQuantity(position.quantity)} @ {formatMoney(position.averageCost)} | MV {formatMoney(position.marketValue)}</span>
          <span className={(position.unrealizedPnl ?? 0) >= 0 ? "font-semibold text-emerald-800" : "font-semibold text-red-800"}>{formatSignedPercent(position.unrealizedPnlPercent)}</span>
        </div>
      ))}
    </div>
  );
}

function OrdersPanel({ orders, onCancel }: { orders: Order[]; onCancel: (id: string) => void }) {
  if (orders.length === 0) return <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No open orders.</p>;
  return (
    <div className="glass-chip max-h-[360px] overflow-auto rounded-[8px]">
      {orders.map((order) => (
        <div key={order.id} className="grid grid-cols-[54px_54px_1fr_auto] items-center gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
          <span className={order.side === "BUY" ? "font-semibold text-emerald-800" : "font-semibold text-red-800"}>{order.side}</span>
          <span>{order.ticker}</span>
          <span>{formatQuantity(order.quantity - order.filledQuantity)} open / {formatQuantity(order.quantity)} {order.orderType} {order.limitPrice ? `LMT ${formatMoney(order.limitPrice)}` : ""}{order.stopPrice ? `STP ${formatMoney(order.stopPrice)}` : ""}</span>
          <button className="rounded-full border border-red-200/80 bg-red-100/85 px-2 py-1 font-black text-red-900" onClick={() => onCancel(order.id)}>Cancel</button>
        </div>
      ))}
    </div>
  );
}

function FillsPanel({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">No fills yet.</p>;
  return (
    <div className="glass-chip max-h-[360px] overflow-auto rounded-[8px]">
      {trades.map((trade) => (
        <div key={trade.id} className="grid grid-cols-[54px_60px_1fr_auto] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
          <span className={trade.side === "BUY" ? "font-semibold text-emerald-800" : "font-semibold text-red-800"}>{trade.side}</span>
          <span>{trade.ticker}</span>
          <span>{formatQuantity(trade.quantity)} @ {formatMoney(trade.price)} {trade.orderType ? `(${trade.orderType})` : ""}</span>
          <span>{formatTime(trade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

function AnalysisPanel({ finalRec, portfolioManager, teamLead, explanation }: { finalRec: string; portfolioManager: string | null; teamLead: string | null; explanation: AnalysisExplanation | null }) {
  return (
    <div className="grid gap-2 text-xs">
      <StatusBadge value={`Final ${finalRec}`} />
      <p className="glass-chip rounded-[8px] p-2.5 leading-5">{portfolioManager ?? "No manager analysis exists for this ticker yet."}</p>
      <p className="glass-chip rounded-[8px] p-2.5 leading-5">{teamLead ?? "No team-lead summary exists for this ticker yet."}</p>
      {explanation ? <p className="glass-chip rounded-[8px] p-2.5 font-semibold">Coverage {explanation.coverage.completed}/{explanation.coverage.total} | {explanation.voteMix.BUY} BUY | {explanation.voteMix.HOLD} HOLD | {explanation.voteMix.AVOID} AVOID</p> : null}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatQuantity(value: number) {
  if (Number.isInteger(value)) return String(value);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

function formatAge(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)}m`;
}

function formatCountdown(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0m";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function recommendationPill(value: string) {
  const base = "rounded-full border px-2 py-1 text-[10px] font-black uppercase";
  if (value === "BUY") return `${base} border-emerald-200/80 bg-emerald-100/80 text-emerald-950`;
  if (value === "AVOID") return `${base} border-red-200/80 bg-red-100/80 text-red-950`;
  return `${base} border-amber-200/80 bg-amber-100/80 text-amber-950`;
}
