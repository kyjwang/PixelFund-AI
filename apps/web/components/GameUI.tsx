"use client";

import type { ReactNode } from "react";
import type { AnalysisProgress } from "../lib/analysis-polling";

type Tone = "neutral" | "good" | "bad" | "warn" | "magic";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const toneStyles: Record<Tone, string> = {
  neutral: "border-white/60 bg-white/68 text-slate-950 hover:bg-white/85",
  good: "border-emerald-200/70 bg-emerald-100/72 text-emerald-950 hover:bg-emerald-100",
  bad: "border-red-200/75 bg-red-100/78 text-red-950 hover:bg-red-100",
  warn: "border-amber-200/80 bg-amber-100/76 text-amber-950 hover:bg-amber-100",
  magic: "border-emerald-300/60 bg-[linear-gradient(135deg,#0f8f78,#2f6df6)] text-white hover:brightness-105"
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
    <section className={cx("pixel-panel glass-panel relative overflow-hidden rounded-[8px] p-3 sm:p-4", className)}>
      {(title || action) ? (
        <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/55 pb-3">
          <div>
            {eyebrow ? <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[color:var(--pf-accent)]">{eyebrow}</p> : null}
            {title ? <h2 className="text-sm font-semibold leading-5 tracking-normal text-slate-950 sm:text-[15px]">{title}</h2> : null}
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
        "pixel-button min-h-10 rounded-full border px-3.5 py-2 text-xs font-black uppercase shadow-[0_12px_28px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200/70 disabled:text-slate-400 disabled:shadow-none",
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
    <span className={cx("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur", toneStyles[tone])}>
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
    { label: "Virtual Cash", value: cash, help: "Uninvested simulator money" },
    { label: "Portfolio", value: portfolioValue, help: "Cash plus open positions" },
    { label: "P/L", value: pnlPercent, help: "Total profit or loss" },
    { label: "Hit Rate", value: hitRate, help: "Completed ideas that worked" },
    { label: "Desk", value: selectedDesk, help: "Selected AI specialist" },
    { label: "XP Level", value: `Lv ${level}`, help: "Activity progress" },
    { label: "Streak", value: streak, help: "Recent result direction" },
    { label: "Mood", value: mood, help: "Portfolio state" }
  ];

  return (
    <div className="grid gap-2 text-xs sm:grid-cols-4 xl:grid-cols-8">
      {items.map((item) => (
        <div key={item.label} className="hud-chip glass-chip rounded-[8px] px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase text-slate-500">{item.label}</p>
          <p className="mt-1 truncate font-pixel text-[10px] text-slate-950">{item.value}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{item.help}</p>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  tone,
  help
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "warn";
  help?: string;
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
    <div className="glass-chip rounded-[8px] px-2.5 py-2">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${toneClass}`}>{value}</p>
      {help ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-500">{help}</p> : null}
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
        "glass-chip grid min-h-[74px] grid-cols-[1fr_auto] gap-2 rounded-[8px] p-2.5 text-left text-xs transition hover:-translate-y-0.5 hover:bg-white/82",
        selected && "ring-2 ring-[color:var(--pf-accent)]"
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
        <div className="pixel-portrait glass-chip mx-auto h-28 w-24 rounded-[8px]" aria-hidden="true">
          <span />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-pixel text-xs">{speaker}</p>
            <StatusBadge value={status} />
            <StatusBadge value={signal} />
            <StatusBadge value={confidence} />
          </div>
          <p className="mt-3 min-h-28 rounded-[8px] border border-slate-950/10 bg-slate-950/90 p-3 font-mono text-xs leading-6 text-emerald-100 shadow-inner">
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
    { label: "Completed AI analyses", done: Math.min(analyzedCount, 3), total: 3, help: "Archive depth for recent research" },
    { label: "Tracked symbols", done: Math.min(watchlistCount, 5), total: 5, help: "Market ideas followed by the desk" },
    { label: "Team request", done: askedTeam ? 1 : 0, total: 1, help: askedTeam ? "AI office has been convened" : "Ask the team to begin a live run" }
  ];

  return (
    <PixelCard title="Office Readiness" eyebrow="desk status">
      <div className="grid gap-2">
        {missions.map((mission) => (
          <div key={mission.label} className="glass-chip rounded-[8px] p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">{mission.label}</p>
              <p className="font-pixel text-[10px]">{mission.done}/{mission.total}</p>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{mission.help}</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-950/10">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#0f8f78,#2f6df6)]" style={{ width: `${(mission.done / mission.total) * 100}%` }} />
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
  analysisProgress,
  onTickerChange,
  onSelectTicker,
  onAnalyze,
  analyzeDisabled = false
}: {
  ticker: string;
  results: Array<{ symbol: string; description: string }>;
  isAnalyzing: boolean;
  analysisProgress?: AnalysisProgress | null;
  onTickerChange: (value: string) => void;
  onSelectTicker: (symbol: string) => void;
  onAnalyze: () => void;
  analyzeDisabled?: boolean;
}) {
  const showProgress = Boolean(analysisProgress && ticker.trim());
  const progressTone = analysisProgress?.failed ? "text-red-700" : analysisProgress?.isActive ? "text-[color:var(--pf-accent)]" : "text-slate-600";

  return (
    <PixelCard title="Stock Scanner" eyebrow="analysis control">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <label className="mb-1 block text-xs font-black uppercase text-slate-700" htmlFor="ticker-input">
            Ticker
          </label>
          <input
            id="ticker-input"
            value={ticker}
            onChange={(event) => onTickerChange(event.target.value.toUpperCase())}
            placeholder="Search ticker"
            className="h-12 w-full rounded-[8px] border border-white/65 bg-white/72 px-3 font-pixel text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur focus:bg-white/90"
            aria-label="Ticker"
          />
          {results.length > 0 ? (
            <div className="glass-panel absolute z-30 mt-2 grid w-full gap-1 rounded-[8px] p-2">
              {results.map((item) => (
                <button
                  key={item.symbol}
                  className="grid grid-cols-[74px_1fr] items-center gap-2 rounded-[7px] px-2 py-2 text-left text-xs hover:bg-white/72"
                  onClick={() => onSelectTicker(item.symbol)}
                >
                  <span className="font-pixel text-[10px]">{item.symbol}</span>
                  <span className="truncate text-slate-600">{item.description}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <PixelButton tone="magic" glow className="w-full self-end sm:w-auto sm:min-w-[156px]" onClick={onAnalyze} disabled={isAnalyzing || analyzeDisabled}>
          {isAnalyzing && analysisProgress ? `Analyzing ${analysisProgress.percent}%` : isAnalyzing ? "Analyzing..." : ticker.trim() ? "Ask AI Team" : "Choose Symbol"}
        </PixelButton>
      </div>
      {showProgress && analysisProgress ? (
        <div className="mt-3 rounded-[8px] border border-white/65 bg-white/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="font-bold uppercase text-slate-700">AI team progress</p>
            <p className={`font-pixel text-[10px] ${progressTone}`}>{analysisProgress.etaLabel}</p>
          </div>
          <div
            className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={analysisProgress.percent}
            aria-label={`AI team analysis ${analysisProgress.percent}% complete`}
          >
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#0f8f78,#2f6df6)] transition-[width] duration-500" style={{ width: `${analysisProgress.percent}%` }} />
          </div>
          <div className="mt-2 grid gap-1 text-xs leading-5 text-slate-600 sm:grid-cols-[1fr_auto]">
            <p>
              <span className="font-semibold text-slate-800">{analysisProgress.currentLabel}</span>
            </p>
            <p className="font-pixel text-[10px] text-slate-700">
              {analysisProgress.completed}/{analysisProgress.total} done
              {analysisProgress.failed > 0 ? `, ${analysisProgress.failed} failed` : ""}
            </p>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs leading-5 text-slate-600">
        Search a symbol, ask the AI team, then watch the office move from raw evidence to final manager decision.
      </p>
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
          <div className="glass-chip rounded-[8px] p-2"><span className="text-slate-500">Score</span><p className="font-pixel text-xs">{score ?? "--"}</p></div>
          <div className="glass-chip rounded-[8px] p-2"><span className="text-slate-500">Confidence</span><p className="font-pixel text-xs">{confidence ?? "--"}</p></div>
          <div className="glass-chip rounded-[8px] p-2"><span className="text-slate-500">Coverage</span><p className="font-pixel text-xs">{coverageText}</p></div>
        </div>
        <p className="glass-chip rounded-[8px] px-2 py-2 font-bold">{voteText}</p>
        {caveats.slice(0, 3).map((caveat) => (
          <p key={caveat} className="rounded-[8px] border border-amber-200/80 bg-amber-100/78 px-2 py-1 text-amber-950">{caveat}</p>
        ))}
        <div className="grid max-h-80 gap-2 overflow-auto pr-1 sm:grid-cols-2">
          {children}
        </div>
      </div>
    </PixelCard>
  );
}

export function AchievementToast({ show, title, detail }: { show: boolean; title: string; detail: string }) {
  if (!show) return null;
  return (
    <div className="achievement-toast glass-panel fixed right-3 top-3 z-50 max-w-[320px] rounded-[8px] p-3" role="status">
      <p className="font-pixel text-xs text-[color:var(--pf-accent)]">Achievement Unlocked</p>
      <p className="mt-1 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs text-slate-700">{detail}</p>
    </div>
  );
}
