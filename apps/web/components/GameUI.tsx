"use client";

import type { ReactNode } from "react";

type Tone = "neutral" | "good" | "bad" | "warn" | "magic";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<Tone, string> = {
  neutral: "bg-[#fff8e7] text-slate-950",
  good: "bg-emerald-200 text-emerald-950",
  bad: "bg-red-200 text-red-950",
  warn: "bg-amber-200 text-amber-950",
  magic: "bg-[#0c7c59] text-white"
};

export function PixelCard({
  title,
  eyebrow,
  children,
  className = "",
  action
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cx("pixel-panel relative overflow-hidden rounded-[8px] border-[3px] border-slate-950 bg-[#fffdf4] p-3 shadow-[5px_5px_0_#101827] sm:p-4", className)}>
      {(title || action) ? (
        <div className="mb-3 flex items-start justify-between gap-3 border-b-2 border-slate-950/15 pb-3">
          <div>
            {eyebrow ? <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#0c7c59]">{eyebrow}</p> : null}
            {title ? <h2 className="font-pixel text-[11px] leading-5 text-slate-950 sm:text-xs">{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PixelButton({
  children,
  onClick,
  disabled,
  type = "button",
  tone = "neutral",
  glow = false,
  className = ""
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  tone?: Tone;
  glow?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "pixel-button min-h-10 rounded-[5px] border-2 border-black px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_#101827] transition-transform hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#101827] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-100",
        toneStyles[tone],
        glow && "pixel-glow",
        className
      )}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ value, tone: explicitTone }: { value: string; tone?: Tone }) {
  const normalized = value.toLowerCase();
  const inferredTone =
    normalized.includes("bull") || normalized === "buy" || normalized === "completed" || normalized === "live"
      ? "good"
      : normalized.includes("bear") || normalized === "avoid" || normalized === "failed" || normalized === "stale"
        ? "bad"
        : normalized.includes("think") || normalized === "hold" || normalized === "pending"
          ? "warn"
          : "neutral";
  const tone = explicitTone ?? inferredTone;

  return (
    <span className={cx("inline-flex rounded-[4px] border-2 border-black px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_#101827]", toneStyles[tone])}>
      {value}
    </span>
  );
}

export function PortfolioHud({
  cash,
  portfolioValue,
  pnlPercent,
  hitRate,
  selectedDesk,
  level,
  streak,
  mood
}: {
  cash: string;
  portfolioValue: string;
  pnlPercent: string;
  hitRate: string;
  selectedDesk: string;
  level: number;
  streak: string;
  mood: string;
}) {
  const items = [
    { label: "Virtual Cash", value: cash },
    { label: "Portfolio", value: portfolioValue },
    { label: "P/L", value: pnlPercent },
    { label: "Hit Rate", value: hitRate },
    { label: "Desk", value: selectedDesk },
    { label: "XP Level", value: `Lv ${level}` },
    { label: "Streak", value: streak },
    { label: "Mood", value: mood }
  ];

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <div key={item.label} className="hud-chip rounded-[6px] border-2 border-black bg-[#f7fff7] px-2 py-2 shadow-[3px_3px_0_#101827]">
          <p className="text-[9px] font-bold uppercase text-slate-600">{item.label}</p>
          <p className="mt-1 truncate font-pixel text-[10px] text-slate-950">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-800"
      : tone === "bad"
        ? "text-red-800"
        : tone === "warn"
          ? "text-amber-800"
          : "text-slate-950";

  return (
    <div className="rounded-[5px] border-2 border-black bg-[#f7fff7] px-2 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function AgentCard({
  role,
  status,
  recommendation,
  confidence,
  selected,
  onSelect
}: {
  role: string;
  status: string;
  recommendation?: string | null;
  confidence?: number | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "grid min-h-[74px] grid-cols-[1fr_auto] gap-2 border-2 border-black bg-white p-2 text-left text-xs shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none",
        selected && "bg-[#fef3c7]"
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-bold">{role}</p>
        <p className="mt-1 text-[10px] uppercase text-slate-600">Weight trace ready</p>
      </div>
      <div className="text-right">
        <StatusBadge value={recommendation ?? status} />
        {typeof confidence === "number" ? <p className="mt-1 text-[10px] font-bold">{Math.round(confidence * 100)}%</p> : null}
      </div>
    </button>
  );
}

export function DialogueBox({
  speaker,
  role,
  status,
  signal,
  confidence,
  text,
  children
}: {
  speaker: string;
  role: string;
  status: string;
  signal: string;
  confidence: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <PixelCard title="Agent Dialogue" eyebrow={role}>
      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
        <div className="pixel-portrait mx-auto h-28 w-24 border-4 border-black bg-[#d9f0e8] shadow-[4px_4px_0_#111]" aria-hidden="true">
          <span />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-pixel text-xs">{speaker}</p>
            <StatusBadge value={status} />
            <StatusBadge value={signal} />
            <StatusBadge value={confidence} />
          </div>
          <p className="mt-3 min-h-28 border-2 border-black bg-[#101827] p-3 font-mono text-xs leading-6 text-[#c7f9cc] shadow-inner">
            {text}
          </p>
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </PixelCard>
  );
}

export function MissionPanel({
  analyzedCount,
  watchlistCount,
  askedTeam
}: {
  analyzedCount: number;
  watchlistCount: number;
  askedTeam: boolean;
}) {
  const missions = [
    { label: "Analyze 3 stocks today", done: Math.min(analyzedCount, 3), total: 3 },
    { label: "Build a 5 ticker watchlist", done: Math.min(watchlistCount, 5), total: 5 },
    { label: "Ask the AI team", done: askedTeam ? 1 : 0, total: 1 }
  ];

  return (
    <PixelCard title="Daily Missions" eyebrow="quest log">
      <div className="grid gap-2">
        {missions.map((mission) => (
          <div key={mission.label} className="border-2 border-black bg-[#f7fff7] p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{mission.label}</p>
              <p className="font-pixel text-[10px]">{mission.done}/{mission.total}</p>
            </div>
            <div className="mt-2 h-3 border-2 border-black bg-white">
              <div className="h-full bg-[#0c7c59]" style={{ width: `${(mission.done / mission.total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PixelCard>
  );
}

export function StockSearchPanel({
  ticker,
  results,
  isAnalyzing,
  onTickerChange,
  onSelectTicker,
  onAnalyze
}: {
  ticker: string;
  results: Array<{ symbol: string; description: string }>;
  isAnalyzing: boolean;
  onTickerChange: (value: string) => void;
  onSelectTicker: (symbol: string) => void;
  onAnalyze: () => void;
}) {
  return (
    <PixelCard title="Stock Scanner" eyebrow="mission control">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <label className="mb-1 block text-xs font-black uppercase text-slate-700" htmlFor="ticker-input">
            Ticker
          </label>
          <input
            id="ticker-input"
            value={ticker}
            onChange={(event) => onTickerChange(event.target.value.toUpperCase())}
            className="h-12 w-full border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm shadow-[3px_3px_0_#111] outline-none focus:bg-white"
            aria-label="Ticker"
          />
          {results.length > 0 ? (
            <div className="absolute z-30 mt-2 grid w-full gap-1 border-4 border-black bg-white p-2 shadow-[5px_5px_0_#111]">
              {results.map((item) => (
                <button
                  key={item.symbol}
                  className="grid grid-cols-[74px_1fr] items-center gap-2 border-2 border-black px-2 py-2 text-left text-xs hover:bg-[#d9f0e8]"
                  onClick={() => onSelectTicker(item.symbol)}
                >
                  <span className="font-pixel text-[10px]">{item.symbol}</span>
                  <span className="truncate text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <PixelButton tone="magic" glow className="self-end" onClick={onAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? "Thinking..." : "Ask AI Team"}
        </PixelButton>
      </div>
    </PixelCard>
  );
}

export function TeamDecisionPanel({
  score,
  confidence,
  voteText,
  coverageText,
  caveats,
  children
}: {
  score?: string;
  confidence?: string;
  voteText: string;
  coverageText: string;
  caveats: string[];
  children: ReactNode;
}) {
  return (
    <PixelCard title="Team Decision" eyebrow="manager explainability">
      <div className="grid gap-2 text-xs">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="border-2 border-black bg-[#f7fff7] p-2"><span className="text-slate-500">Score</span><p className="font-pixel text-xs">{score ?? "--"}</p></div>
          <div className="border-2 border-black bg-[#f7fff7] p-2"><span className="text-slate-500">Confidence</span><p className="font-pixel text-xs">{confidence ?? "--"}</p></div>
          <div className="border-2 border-black bg-[#f7fff7] p-2"><span className="text-slate-500">Coverage</span><p className="font-pixel text-xs">{coverageText}</p></div>
        </div>
        <p className="border-2 border-black bg-[#fff8e7] px-2 py-2 font-bold">{voteText}</p>
        {caveats.slice(0, 3).map((caveat) => (
          <p key={caveat} className="border-2 border-amber-900 bg-amber-100 px-2 py-1 text-amber-950">{caveat}</p>
        ))}
        <div className="grid max-h-72 gap-2 overflow-auto pr-1 sm:grid-cols-2">
          {children}
        </div>
      </div>
    </PixelCard>
  );
}

export function AchievementToast({ show, title, detail }: { show: boolean; title: string; detail: string }) {
  if (!show) return null;
  return (
    <div className="achievement-toast fixed right-3 top-3 z-50 max-w-[320px] border-4 border-black bg-[#fef3c7] p-3 shadow-[6px_6px_0_#111]" role="status">
      <p className="font-pixel text-xs">Achievement Unlocked</p>
      <p className="mt-1 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs text-slate-700">{detail}</p>
    </div>
  );
}
