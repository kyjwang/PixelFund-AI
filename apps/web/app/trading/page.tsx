"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  analysisExplanationSchema,
  analysisRunSchema,
  marketContextSchema,
  portfolioSchema,
  tradePreviewSchema,
  tradeSchema
} from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile, StatusBadge } from "../../components/GameUI";
import { api } from "../../lib/api";

type Portfolio = z.infer<typeof portfolioSchema>;
type AnalysisRun = z.infer<typeof analysisRunSchema>;
type AnalysisExplanation = z.infer<typeof analysisExplanationSchema>;
type MarketContext = z.infer<typeof marketContextSchema>;
type Trade = z.infer<typeof tradeSchema>;
type TradePreview = z.infer<typeof tradePreviewSchema>;

export default function TradingPage() {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get("ticker")?.toUpperCase() ?? "AAPL");
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [explanation, setExplanation] = useState<AnalysisExplanation | null>(null);
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">("MARKET");
  const [previewSide, setPreviewSide] = useState<"BUY" | "SELL">("BUY");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [stopPrice, setStopPrice] = useState<number | "">("");
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedTicker = ticker.trim().toUpperCase() || "AAPL";

  async function refresh(targetTicker = normalizedTicker) {
    const normalized = targetTicker.trim().toUpperCase() || "AAPL";
    try {
      const [p, r, c, t] = await Promise.all([
        api("/portfolio", portfolioSchema),
        api("/analysis-runs", z.array(analysisRunSchema)),
        api(`/stocks/${encodeURIComponent(normalized)}/context`, marketContextSchema),
        api("/trades?limit=30", z.array(tradeSchema))
      ]);
      setPortfolio(p);
      setRuns(r);
      setMarketContext(c);
      setTrades(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load trading data");
    }
  }

  useEffect(() => {
    void refresh(normalizedTicker);
  }, []);

  const latest = useMemo(
    () => runs.find((run) => run.ticker === normalizedTicker) ?? runs[0],
    [runs, normalizedTicker]
  );

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
  }, [portfolio?.cash, quantity, quote?.price, tradePreview?.estimatedPrice]);

  useEffect(() => {
    if (!quote) return;
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
  }, [normalizedTicker, quantity, orderType, limitPrice, stopPrice, previewSide, quote?.price, portfolio?.cash]);

  function tradePayload(side: "BUY" | "SELL") {
    return {
      ticker: normalizedTicker,
      side,
      quantity: tradeEstimate.qty,
      orderType,
      ...(orderType === "LIMIT" && typeof limitPrice === "number" ? { limitPrice } : {}),
      ...(orderType === "STOP" && typeof stopPrice === "number" ? { stopPrice } : {})
    };
  }

  async function placeTrade() {
    setIsExecuting(true);
    try {
      const updated = await api("/trades", portfolioSchema, {
        method: "POST",
        body: JSON.stringify(tradePayload(previewSide))
      });
      setPortfolio(updated);
      await refresh(normalizedTicker);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Trade failed");
    } finally {
      setIsExecuting(false);
    }
  }

  const blockingWarning = (tradePreview?.warnings ?? []).some((warning) =>
    warning.toLowerCase().includes("insufficient") || warning.toLowerCase().includes("unsupported")
  );
  const canExecute = Boolean(tradePreview?.executableNow && !blockingWarning && quote && !isExecuting);
  const finalRec = latest?.finalRec ?? portfolioManager?.recommendation ?? "PENDING";

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="Trading Room" eyebrow="virtual execution" className="bg-[#fff8e7]">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="trading-ticker">
              Stock
              <input
                id="trading-ticker"
                value={ticker}
                onChange={(event) => setTicker(event.target.value.toUpperCase())}
                className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Virtual Cash" value={formatMoney(portfolio?.cash ?? 0)} />
              <StatTile label="Portfolio" value={formatMoney(portfolio?.totalValue ?? 0)} />
              <StatTile label="P&L" value={`${formatMoney(portfolio?.totalPnl ?? 0)} (${formatSignedPercent(portfolio?.totalPnlPercent ?? 0)})`} tone={(portfolio?.totalPnl ?? 0) >= 0 ? "good" : "bad"} />
              <StatTile label="Final Rec" value={finalRec} tone={finalRec === "BUY" ? "good" : finalRec === "AVOID" ? "bad" : "warn"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PixelButton tone="magic" onClick={() => void refresh(normalizedTicker)}>
              Load Stock
            </PixelButton>
            <Link
              href={`/?ticker=${encodeURIComponent(normalizedTicker)}`}
              className="pixel-button min-h-10 border-2 border-black bg-[#fff8e7] px-3 py-2 text-center text-xs font-black uppercase text-slate-950 shadow-[4px_4px_0_#111]"
            >
              Desk
            </Link>
          </div>
        </div>
      </PixelCard>

      {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-4">
          <PixelCard title="Stock Tape" eyebrow={normalizedTicker}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-4xl font-bold leading-none">{quote ? formatMoney(quote.price) : "$0.00"}</p>
                <p className="mt-2 text-xs text-slate-600">Provider: {marketContext?.dataQuality.provider ?? "loading"}</p>
              </div>
              <StatusBadge value={quote ? formatSignedPercent(quote.changePercent) : "0.0%"} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <StatTile label="Quality" value={`${marketContext?.dataQuality.status ?? "loading"} ${Math.round((marketContext?.dataQuality.score ?? 0) * 100)}%`} />
              <StatTile label="Held Shares" value={`${activePosition?.quantity ?? 0}`} />
              <StatTile label="Avg Cost" value={formatMoney(activePosition?.averageCost ?? 0)} />
              <StatTile label="Exposure" value={formatSignedPercent(activePosition?.portfolioWeight ?? 0)} />
            </div>
          </PixelCard>

          <PixelCard title="Manager Guidance" eyebrow="portfolio manager + team lead">
            <div className="grid gap-2 text-xs">
              <p className="border-2 border-black bg-[#f7fff7] p-2 leading-5">
                <span className="font-bold">Portfolio Manager:</span>{" "}
                {portfolioManager?.summary ?? latest?.finalSummary ?? "Run an analysis from the Desk to get manager guidance before trading."}
              </p>
              <p className="border-2 border-black bg-[#fff8e7] p-2 leading-5">
                <span className="font-bold">Team Lead:</span>{" "}
                {teamLead?.summary ?? "The Team Lead will summarize the committee once specialist analysis exists."}
              </p>
              {explanation ? (
                <p className="border-2 border-black bg-white p-2 font-semibold">
                  Coverage {explanation.coverage.completed}/{explanation.coverage.total} | {explanation.voteMix.BUY} BUY | {explanation.voteMix.HOLD} HOLD | {explanation.voteMix.AVOID} AVOID
                </p>
              ) : null}
            </div>
          </PixelCard>

          <PixelCard title="Positions" eyebrow="portfolio">
            <div className="max-h-72 overflow-auto border-2 border-black">
              {(portfolio?.positions ?? []).map((p) => (
                <div key={p.ticker} className="grid grid-cols-[64px_1fr_auto] gap-2 border-b border-slate-200 px-2 py-2 text-xs last:border-b-0">
                  <button className="text-left font-semibold" onClick={() => { setTicker(p.ticker); void refresh(p.ticker); }}>
                    {p.ticker}
                  </button>
                  <span>{p.quantity} sh @ {formatMoney(p.averageCost)}</span>
                  <span className={(p.unrealizedPnl ?? 0) >= 0 ? "text-emerald-800" : "text-red-800"}>{formatSignedPercent(p.unrealizedPnlPercent)}</span>
                </div>
              ))}
              {(portfolio?.positions.length ?? 0) === 0 ? <p className="p-2 text-xs text-slate-600">No simulated positions yet.</p> : null}
            </div>
          </PixelCard>
        </div>

        <div className="grid gap-4">
          <PixelCard title="Trade Ticket" eyebrow="preview first">
            <p className="text-xs text-slate-700">
              Holding {activePosition?.quantity ?? 0} shares of {normalizedTicker}. All orders are virtual simulation orders.
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
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || "1")))}
                className="h-10 w-full border-2 border-black px-2 text-sm"
              />
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <label className="grid gap-1 font-semibold" htmlFor="order-type-input">
                Order
                <select
                  id="order-type-input"
                  value={orderType}
                  onChange={(event) => setOrderType(event.target.value as "MARKET" | "LIMIT" | "STOP")}
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
                    onChange={(event) => setLimitPrice(event.target.value === "" ? "" : Number(event.target.value))}
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
                    onChange={(event) => setStopPrice(event.target.value === "" ? "" : Number(event.target.value))}
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
            <PixelButton tone={previewSide === "BUY" ? "good" : "warn"} className="mt-3 w-full" onClick={() => void placeTrade()} disabled={!canExecute}>
              {isExecuting ? "Executing" : `Execute ${previewSide} ${tradeEstimate.qty}`}
            </PixelButton>
          </PixelCard>

          <PixelCard title="Recent Trades" eyebrow="fake order tape">
            <div className="max-h-72 overflow-auto border-2 border-black">
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
        </div>
      </section>
    </main>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
