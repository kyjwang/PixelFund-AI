"use client";

import { AGENT_PROFILES } from "@pixelfund/domain";

export type GameAgent = {
  id: string;
  label: string;
  name: string;
  role: string;
  personality: string;
  signal: string;
  confidence: number;
  x: string;
  y: string;
  outfit: string;
  accent: string;
  skin: string;
  hair: string;
  prop:
    | "chart"
    | "ledger"
    | "newspaper"
    | "glasses"
    | "book"
    | "paper"
    | "shield"
    | "clipboard"
    | "globe"
    | "chat"
    | "matrix"
    | "coin"
    | "badge"
    | "up"
    | "down"
    | "ticket"
    | "flame"
    | "balance"
    | "lock"
    | "whiteboard";
};

const visualAgents: GameAgent[] = [
  {
    id: "TECHNICAL_ANALYST",
    label: "TA",
    name: "Tessa Trend",
    role: "Technical Analyst",
    personality: "Fast, visual, pattern-obsessed.",
    signal: "Momentum watch",
    confidence: 72,
    x: "10%",
    y: "28%",
    outfit: "#2563eb",
    accent: "#93c5fd",
    skin: "#f2c7a4",
    hair: "#1e293b",
    prop: "chart"
  },
  {
    id: "FUNDAMENTALS_ANALYST",
    label: "FA",
    name: "Felix Ledger",
    role: "Fundamentals Analyst",
    personality: "Patient, skeptical, loves ratios.",
    signal: "Valuation check",
    confidence: 68,
    x: "23%",
    y: "28%",
    outfit: "#ca8a04",
    accent: "#fde68a",
    skin: "#c98b61",
    hair: "#3f2a1d",
    prop: "ledger"
  },
  {
    id: "NEWS_ANALYST",
    label: "NA",
    name: "Nia Wire",
    role: "News Analyst",
    personality: "Curious, quick, headline-sensitive.",
    signal: "Headline scan",
    confidence: 64,
    x: "36%",
    y: "28%",
    outfit: "#059669",
    accent: "#a7f3d0",
    skin: "#d9a476",
    hair: "#111827",
    prop: "newspaper"
  },
  {
    id: "RISK_ANALYST",
    label: "RM",
    name: "Rhea Guard",
    role: "Risk Manager",
    personality: "Calm, blunt, downside-first.",
    signal: "Risk cap",
    confidence: 75,
    x: "56%",
    y: "68%",
    outfit: "#dc2626",
    accent: "#fecaca",
    skin: "#8d5524",
    hair: "#111827",
    prop: "shield"
  },
  {
    id: "PORTFOLIO_MANAGER",
    label: "PM",
    name: "Parker Alloc",
    role: "Portfolio Manager",
    personality: "Balanced, decisive, allocation-focused.",
    signal: "Position review",
    confidence: 70,
    x: "88%",
    y: "85%",
    outfit: "#7c3aed",
    accent: "#ddd6fe",
    skin: "#f0b98d",
    hair: "#4b5563",
    prop: "clipboard"
  },
  {
    id: "MACRO_ANALYST",
    label: "MA",
    name: "Mara Globe",
    role: "Macro Analyst",
    personality: "Big-picture, cycle-aware, cautious.",
    signal: "Rates watch",
    confidence: 61,
    x: "49%",
    y: "28%",
    outfit: "#0f766e",
    accent: "#99f6e4",
    skin: "#b77952",
    hair: "#262626",
    prop: "globe"
  },
  {
    id: "SENTIMENT_ANALYST",
    label: "SA",
    name: "Sami Signal",
    role: "Sentiment Analyst",
    personality: "Social, contrarian, crowd-aware.",
    signal: "Crowd pulse",
    confidence: 66,
    x: "62%",
    y: "28%",
    outfit: "#db2777",
    accent: "#fbcfe8",
    skin: "#e0ac69",
    hair: "#581c87",
    prop: "chat"
  },
  {
    id: "QUANT_ANALYST",
    label: "QA",
    name: "Quinn Matrix",
    role: "Quant Analyst",
    personality: "Precise, numerical, signal-ranked.",
    signal: "Factor model",
    confidence: 69,
    x: "75%",
    y: "28%",
    outfit: "#111827",
    accent: "#22c55e",
    skin: "#ddb892",
    hair: "#020617",
    prop: "matrix"
  },
  {
    id: "CRYPTO_SPECIALIST",
    label: "CS",
    name: "Cora Chain",
    role: "Crypto Specialist",
    personality: "Volatility-native, liquidity-focused.",
    signal: "Liquidity read",
    confidence: 58,
    x: "88%",
    y: "28%",
    outfit: "#f97316",
    accent: "#fed7aa",
    skin: "#c68642",
    hair: "#1f2937",
    prop: "coin"
  },
  {
    id: "TEAM_LEAD",
    label: "TL",
    name: "Lena Lead",
    role: "Team Lead",
    personality: "Organized, direct, turns debate into action.",
    signal: "Final summary",
    confidence: 73,
    x: "74%",
    y: "85%",
    outfit: "#475569",
    accent: "#e2e8f0",
    skin: "#f2c7a4",
    hair: "#78350f",
    prop: "whiteboard"
  },
  {
    id: "BULL_RESEARCHER",
    label: "BU",
    name: "Basil Breakout",
    role: "Bull Researcher",
    personality: "Optimistic, strategic, always hunting upside.",
    signal: "Bull thesis",
    confidence: 71,
    x: "34%",
    y: "48%",
    outfit: "#16a34a",
    accent: "#bbf7d0",
    skin: "#e0ac69",
    hair: "#064e3b",
    prop: "up"
  },
  {
    id: "BEAR_RESEARCHER",
    label: "BE",
    name: "Bryn Redline",
    role: "Bear Researcher",
    personality: "Skeptical, sharp, allergic to weak evidence.",
    signal: "Bear thesis",
    confidence: 69,
    x: "48%",
    y: "48%",
    outfit: "#991b1b",
    accent: "#fecaca",
    skin: "#c68642",
    hair: "#111827",
    prop: "down"
  },
  {
    id: "TRADER_AGENT",
    label: "TR",
    name: "Theo Ticket",
    role: "Trader Agent",
    personality: "Execution-focused, practical, timing-aware.",
    signal: "Trade plan",
    confidence: 67,
    x: "18%",
    y: "68%",
    outfit: "#0f766e",
    accent: "#99f6e4",
    skin: "#f0b98d",
    hair: "#134e4a",
    prop: "ticket"
  },
  {
    id: "AGGRESSIVE_RISK",
    label: "AR",
    name: "Axel Heat",
    role: "Aggressive Risk",
    personality: "High-conviction, opportunity-first, volatility-tolerant.",
    signal: "Upside risk",
    confidence: 63,
    x: "43%",
    y: "68%",
    outfit: "#f97316",
    accent: "#fed7aa",
    skin: "#b77952",
    hair: "#7c2d12",
    prop: "flame"
  },
  {
    id: "NEUTRAL_RISK",
    label: "NR",
    name: "Nora Balance",
    role: "Neutral Risk",
    personality: "Measured, even-handed, scenario-based.",
    signal: "Risk balance",
    confidence: 66,
    x: "69%",
    y: "68%",
    outfit: "#64748b",
    accent: "#e2e8f0",
    skin: "#d9a476",
    hair: "#334155",
    prop: "balance"
  },
  {
    id: "CONSERVATIVE_RISK",
    label: "CR",
    name: "Celia Lock",
    role: "Conservative Risk",
    personality: "Capital-preserving, strict, drawdown-sensitive.",
    signal: "Capital guard",
    confidence: 74,
    x: "82%",
    y: "68%",
    outfit: "#7f1d1d",
    accent: "#fecaca",
    skin: "#8d5524",
    hair: "#1f2937",
    prop: "lock"
  }
];

const officeWorkflowOrder = [
  "TECHNICAL_ANALYST",
  "FUNDAMENTALS_ANALYST",
  "NEWS_ANALYST",
  "MACRO_ANALYST",
  "SENTIMENT_ANALYST",
  "QUANT_ANALYST",
  "CRYPTO_SPECIALIST",
  "BULL_RESEARCHER",
  "BEAR_RESEARCHER",
  "TRADER_AGENT",
  "AGGRESSIVE_RISK",
  "RISK_ANALYST",
  "NEUTRAL_RISK",
  "CONSERVATIVE_RISK",
  "TEAM_LEAD",
  "PORTFOLIO_MANAGER"
];

const desktopAgentPositions: Record<string, { x: string; y: string }> = {
  PORTFOLIO_MANAGER: { x: "72%", y: "18%" },
  TEAM_LEAD: { x: "87%", y: "18%" },
  TECHNICAL_ANALYST: { x: "9%", y: "38%" },
  FUNDAMENTALS_ANALYST: { x: "22%", y: "38%" },
  NEWS_ANALYST: { x: "35%", y: "38%" },
  MACRO_ANALYST: { x: "48%", y: "38%" },
  SENTIMENT_ANALYST: { x: "61%", y: "38%" },
  QUANT_ANALYST: { x: "74%", y: "38%" },
  CRYPTO_SPECIALIST: { x: "87%", y: "38%" },
  BULL_RESEARCHER: { x: "39%", y: "58%" },
  BEAR_RESEARCHER: { x: "55%", y: "58%" },
  TRADER_AGENT: { x: "21%", y: "78%" },
  RISK_ANALYST: { x: "42%", y: "78%" },
  AGGRESSIVE_RISK: { x: "56%", y: "78%" },
  NEUTRAL_RISK: { x: "70%", y: "78%" },
  CONSERVATIVE_RISK: { x: "84%", y: "78%" }
};

const mobileOfficeStages = [
  { title: "Manager", agentIds: ["PORTFOLIO_MANAGER"] },
  { title: "Evidence", agentIds: ["TECHNICAL_ANALYST", "FUNDAMENTALS_ANALYST", "NEWS_ANALYST", "MACRO_ANALYST", "SENTIMENT_ANALYST", "QUANT_ANALYST", "CRYPTO_SPECIALIST"] },
  { title: "Debate", agentIds: ["BULL_RESEARCHER", "BEAR_RESEARCHER"] },
  { title: "Trader", agentIds: ["TRADER_AGENT"] },
  { title: "Risk Council", agentIds: ["RISK_ANALYST", "AGGRESSIVE_RISK", "NEUTRAL_RISK", "CONSERVATIVE_RISK"] },
  { title: "Team Lead", agentIds: ["TEAM_LEAD"] }
];

export const gameAgents: GameAgent[] = AGENT_PROFILES.map((profile) => {
  const visual = visualAgents.find((agent) => agent.id === profile.id) ?? visualAgents[0];
  const desktopPosition = desktopAgentPositions[profile.id] ?? { x: visual.x, y: visual.y };
  return {
    ...visual,
    ...desktopPosition,
    id: profile.id,
    label: profile.label,
    role: profile.role
  };
}).sort((a, b) => officeWorkflowOrder.indexOf(a.id) - officeWorkflowOrder.indexOf(b.id));

const recommendationColor: Record<string, string> = {
  BUY: "border-emerald-300/70 bg-emerald-100/88 text-emerald-950",
  HOLD: "border-amber-300/80 bg-amber-100/88 text-amber-950",
  AVOID: "border-red-300/70 bg-red-100/88 text-red-950"
};

function visualState(status: string, recommendation?: string) {
  if (status === "THINKING" || status === "RUNNING") return "thinking";
  if (status === "FAILED") return "failed";
  if (recommendation === "BUY") return "bullish";
  if (recommendation === "AVOID") return "cautious";
  return "idle";
}

function stateClass(state: string, active: boolean) {
  if (state === "thinking") return "border-sky-300/80 bg-sky-100/86 motion-safe:animate-pulse";
  if (state === "failed") return "border-red-300/75 bg-red-100/86";
  if (state === "bullish") return "border-emerald-300/75 bg-emerald-100/86";
  if (state === "cautious") return "border-amber-300/80 bg-amber-100/86";
  return active ? "border-emerald-300/80 bg-white/88" : "border-white/60 bg-white/55 hover:bg-white/82";
}

function agentRuntimeState(agent: GameAgent, agentStatuses: Record<string, string | undefined>, agentRecommendations: Record<string, string | undefined>) {
  const status = agentStatuses[agent.id] ?? "IDLE";
  const recommendation = agentRecommendations[agent.id];
  const state = visualState(status, recommendation);
  return { status, recommendation, state };
}

function propPixels(agent: GameAgent) {
  const common = "absolute border border-black";
  if (agent.prop === "chart") return <span className={`${common} right-[5px] top-[30px] h-7 w-7 bg-[#dbeafe] shadow-[inset_4px_-4px_0_#2563eb,inset_10px_-10px_0_#22c55e]`} />;
  if (agent.prop === "ledger") return <span className={`${common} right-[8px] top-[32px] h-6 w-5 bg-[#fef3c7] shadow-[inset_0_4px_0_#92400e,inset_0_9px_0_#fde68a]`} />;
  if (agent.prop === "newspaper") return <span className={`${common} right-[5px] top-[34px] h-5 w-8 bg-white shadow-[inset_0_4px_0_#cbd5e1,inset_10px_0_0_#e2e8f0]`} />;
  if (agent.prop === "glasses") return <><span className={`${common} left-[18px] top-[20px] h-2 w-3 bg-[#bfdbfe]`} /><span className={`${common} left-[31px] top-[20px] h-2 w-3 bg-[#bfdbfe]`} /></>;
  if (agent.prop === "book") return <span className={`${common} right-[8px] top-[37px] h-5 w-4 bg-[#fef3c7]`} />;
  if (agent.prop === "paper") return <span className={`${common} right-[8px] top-[35px] h-5 w-5 bg-white`} />;
  if (agent.prop === "shield") return <span className={`${common} right-[8px] top-[33px] h-6 w-5 bg-[#facc15]`} />;
  if (agent.prop === "clipboard") return <span className={`${common} right-[8px] top-[32px] h-6 w-5 bg-[#fefce8]`} />;
  if (agent.prop === "globe") return <span className={`${common} right-[7px] top-[32px] h-6 w-6 rounded-full bg-[#38bdf8]`} />;
  if (agent.prop === "chat") return <span className={`${common} right-[7px] top-[33px] h-5 w-6 bg-[#f9a8d4]`} />;
  if (agent.prop === "matrix") return <span className={`${common} right-[5px] top-[30px] h-7 w-7 bg-[#052e16] shadow-[inset_0_0_0_3px_#22c55e]`} />;
  if (agent.prop === "coin") return <span className={`${common} right-[8px] top-[33px] h-6 w-6 rounded-full bg-[#facc15]`} />;
  if (agent.prop === "up") return <span className={`${common} right-[8px] top-[30px] h-7 w-6 bg-[#22c55e] after:absolute after:left-[7px] after:top-[-7px] after:h-3 after:w-3 after:rotate-45 after:border-l after:border-t after:border-black after:bg-[#22c55e]`} />;
  if (agent.prop === "down") return <span className={`${common} right-[8px] top-[34px] h-7 w-6 bg-[#ef4444] after:absolute after:bottom-[-7px] after:left-[7px] after:h-3 after:w-3 after:rotate-45 after:border-b after:border-r after:border-black after:bg-[#ef4444]`} />;
  if (agent.prop === "ticket") return <span className={`${common} right-[6px] top-[34px] h-5 w-7 bg-[#fef3c7] shadow-[inset_0_-4px_0_#14b8a6]`} />;
  if (agent.prop === "flame") return <span className={`${common} right-[9px] top-[31px] h-7 w-5 bg-[#fb923c] shadow-[inset_4px_4px_0_#facc15]`} />;
  if (agent.prop === "balance") return <span className={`${common} right-[6px] top-[33px] h-5 w-7 bg-[#cbd5e1] before:absolute before:left-[12px] before:top-[-7px] before:h-7 before:w-1 before:bg-black after:absolute after:left-[4px] after:top-[6px] after:h-1 after:w-5 after:bg-black`} />;
  if (agent.prop === "lock") return <span className={`${common} right-[8px] top-[36px] h-5 w-6 bg-[#eab308] before:absolute before:left-[5px] before:top-[-8px] before:h-4 before:w-4 before:border-2 before:border-black`} />;
  if (agent.prop === "whiteboard") return <span className={`${common} right-[4px] top-[29px] h-7 w-8 bg-white shadow-[inset_0_-5px_0_#cbd5e1,inset_5px_5px_0_#bfdbfe]`} />;
  return <span className={`${common} right-[8px] top-[31px] h-6 w-5 bg-[#cbd5e1]`} />;
}

function PixelAvatar({ agent, thinking }: { agent: GameAgent; thinking: boolean }) {
  return (
    <div className={`relative mx-auto h-[76px] w-[64px] drop-shadow-[2px_3px_0_rgba(16,24,39,0.35)] ${thinking ? "motion-safe:animate-bounce" : "motion-safe:animate-[pixel-idle_2.8s_ease-in-out_infinite]"}`} style={{ imageRendering: "pixelated" }}>
      <span className="absolute left-[14px] top-[7px] h-8 w-9 border-2 border-black" style={{ backgroundColor: agent.skin }} />
      <span className="absolute left-[12px] top-[1px] h-4 w-11 border-2 border-black" style={{ backgroundColor: agent.hair }} />
      <span className="absolute left-[16px] top-[5px] h-3 w-7 border-l-2 border-black" style={{ backgroundColor: agent.hair }} />
      <span className="absolute left-[10px] top-[16px] h-3 w-3 border-2 border-black" style={{ backgroundColor: agent.skin }} />
      <span className="absolute left-[52px] top-[16px] h-3 w-3 border-2 border-black" style={{ backgroundColor: agent.skin }} />
      <span className="absolute left-[20px] top-[16px] h-1.5 w-2 bg-black" />
      <span className="absolute left-[39px] top-[16px] h-1.5 w-2 bg-black" />
      <span className="absolute left-[31px] top-[20px] h-2 w-2 border border-black bg-[#d9a476]" />
      <span className="absolute left-[25px] top-[28px] h-1.5 w-[18px] bg-[#7f1d1d]" />
      <span className="absolute left-[13px] top-[36px] h-7 w-11 border-2 border-black" style={{ backgroundColor: agent.outfit }} />
      <span className="absolute left-[20px] top-[40px] h-4 w-7 border border-black" style={{ backgroundColor: agent.accent }} />
      <span className="absolute left-[5px] top-[39px] h-5 w-7 border-2 border-black" style={{ backgroundColor: agent.outfit }} />
      <span className="absolute right-[4px] top-[39px] h-5 w-7 border-2 border-black" style={{ backgroundColor: agent.outfit }} />
      <span className="absolute left-[19px] bottom-[4px] h-5 w-3 border-2 border-black bg-[#1f2937]" />
      <span className="absolute left-[39px] bottom-[4px] h-5 w-3 border-2 border-black bg-[#1f2937]" />
      <span className="absolute left-[14px] bottom-0 h-2 w-10 border-2 border-black bg-black" />
      {propPixels(agent)}
    </div>
  );
}

function MobileOfficeBoard({
  selected,
  selectedStatus,
  selectedAgent,
  onSelect,
  agentStatuses,
  agentRecommendations
}: {
  selected: GameAgent;
  selectedStatus: string;
  selectedAgent: string;
  onSelect: (agentId: string) => void;
  agentStatuses: Record<string, string | undefined>;
  agentRecommendations: Record<string, string | undefined>;
}) {
  return (
    <div className="glass-panel pixel-card w-full rounded-[8px] p-3 md:hidden">
      <div className="glass-chip rounded-[8px] p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-pixel text-[10px] text-slate-900">{selected.name}</p>
            <p className="mt-1 text-[10px] font-black uppercase text-[color:var(--pf-accent)]">{selected.role}</p>
          </div>
          <span className="shrink-0 rounded-full border border-white/70 bg-white/70 px-2 py-1 text-[9px] font-black uppercase text-slate-700">
            {selectedStatus}
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-4 text-slate-600">Tap any tile to inspect its specialist view below the office.</p>
      </div>
      <div className="mt-3 grid gap-3">
        {mobileOfficeStages.map((stage) => (
          <section key={stage.title} aria-label={`${stage.title} agents`}>
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">{stage.title}</p>
            <div className={`grid gap-2 ${stage.agentIds.length === 1 ? "grid-cols-1" : "grid-cols-1 min-[420px]:grid-cols-2"}`}>
              {stage.agentIds.map((agentId) => {
                const agent = gameAgents.find((item) => item.id === agentId) ?? gameAgents[0];
                const runtime = agentRuntimeState(agent, agentStatuses, agentRecommendations);
                return (
                  <MobileAgentTile
                    key={agent.id}
                    agent={agent}
                    active={selectedAgent === agent.id}
                    status={runtime.status}
                    recommendation={runtime.recommendation}
                    state={runtime.state}
                    onSelect={() => onSelect(agent.id)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function MobileAgentTile({
  agent,
  active,
  status,
  recommendation,
  state,
  onSelect
}: {
  agent: GameAgent;
  active: boolean;
  status: string;
  recommendation?: string;
  state: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-h-[78px] rounded-[8px] border p-2 text-left shadow-[0_10px_22px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:-translate-y-0.5 ${active ? "ring-2 ring-[color:var(--pf-accent)]" : ""} ${stateClass(state, active)}`}
      title={`${agent.role} (${status})`}
      aria-label={agent.role}
    >
      <div className="flex items-start gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black font-pixel text-[10px] shadow-[2px_2px_0_#111]" style={{ backgroundColor: agent.accent }}>
          {agent.label}
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase leading-4 text-slate-950">{agent.role}</span>
          <span className="mt-0.5 block truncate font-pixel text-[8px] uppercase text-slate-600">{status}</span>
        </span>
      </div>
      {recommendation ? (
        <span className={`mt-2 inline-flex max-w-full rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase ${recommendationColor[recommendation] ?? "border-white/60 bg-white/80"}`}>
          {recommendation}
        </span>
      ) : null}
    </button>
  );
}

export function PixelOffice({
  onSelect,
  selectedAgent,
  agentStatuses,
  agentRecommendations = {},
  agentPerformance = {}
}: {
  onSelect: (agentId: string) => void;
  selectedAgent: string;
  agentStatuses: Record<string, string | undefined>;
  agentRecommendations?: Record<string, string | undefined>;
  agentPerformance?: Record<string, { hitRate: number; pnl: number } | undefined>;
}) {
  const selected = gameAgents.find((a) => a.id === selectedAgent) ?? gameAgents[0];
  const selectedStatus = agentStatuses[selected.id] ?? "IDLE";
  const selectedPerformance = agentPerformance?.[selected.id];

  return (
    <div className="w-full">
      <MobileOfficeBoard
        selected={selected}
        selectedStatus={selectedStatus}
        selectedAgent={selectedAgent}
        onSelect={onSelect}
        agentStatuses={agentStatuses}
        agentRecommendations={agentRecommendations}
      />
      <div className="glass-panel pixel-card relative hidden h-[620px] w-full overflow-hidden rounded-[8px] md:block lg:h-[650px] xl:h-[670px]">
      <div className="absolute inset-x-0 top-0 h-28 bg-sky-200/36" />
      <div className="absolute inset-x-0 top-28 h-24 bg-amber-200/24" />
      <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-white/32 to-transparent" />
      <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-slate-950/8 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="absolute left-[8%] top-8 h-20 w-[22%] rounded-[8px] border border-white/60 bg-white/48 shadow-[0_16px_38px_rgba(15,23,42,0.1)] backdrop-blur">
        <span className="absolute left-2 top-2 h-8 w-[35%] border-2 border-black bg-[#f7fff7]" />
        <span className="absolute right-2 top-2 h-8 w-[35%] border-2 border-black bg-[#fef3c7]" />
        <span className="absolute bottom-2 left-2 h-3 w-[70%] border border-black bg-[#38bdf8]" />
      </div>
      <div className="absolute left-[40%] top-8 h-20 w-[22%] rounded-[8px] border border-white/60 bg-white/48 shadow-[0_16px_38px_rgba(15,23,42,0.1)] backdrop-blur">
        <span className="absolute left-3 top-3 h-4 w-4 border-2 border-black bg-[#22c55e]" />
        <span className="absolute left-10 top-3 h-4 w-4 border-2 border-black bg-[#facc15]" />
        <span className="absolute left-3 top-10 h-4 w-16 border-2 border-black bg-white" />
      </div>
      <div className="absolute right-[7%] top-8 h-20 w-[22%] rounded-[8px] border border-white/60 bg-white/48 shadow-[0_16px_38px_rgba(15,23,42,0.1)] backdrop-blur">
        <span className="absolute left-3 top-3 h-4 w-[68%] border-2 border-black bg-[#ef4444]" />
        <span className="absolute left-3 top-9 h-4 w-[48%] border-2 border-black bg-[#22c55e]" />
        <span className="absolute left-3 top-[3.7rem] h-2 w-[76%] bg-black" />
      </div>
      <div className="absolute bottom-0 h-52 w-full bg-[#81624e]" />
      <div className="absolute bottom-0 h-52 w-full bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:32px_28px]" />
      <div className="absolute bottom-44 left-0 right-0 h-5 bg-slate-700/75" />
      <div className="absolute bottom-12 left-[8%] h-10 w-[84%] rounded-[8px] border border-slate-950/10 bg-[#4b372f] shadow-[0_18px_42px_rgba(15,23,42,0.22)]" />

      <div className="glass-chip absolute left-[4%] top-[24%] z-20 rounded-full px-2 py-1 font-pixel text-[7px] text-slate-700 sm:text-[8px]">evidence desks</div>
      <div className="glass-chip absolute left-[32%] top-[47%] z-20 rounded-full px-2 py-1 font-pixel text-[7px] text-slate-700 sm:text-[8px]">bull vs bear</div>
      <div className="glass-chip absolute left-[9%] top-[66%] z-20 rounded-full px-2 py-1 font-pixel text-[7px] text-slate-700 sm:text-[8px]">execution + risk</div>
      <div className="glass-chip absolute right-[4%] top-[6%] z-20 rounded-full px-2 py-1 font-pixel text-[7px] text-slate-700 sm:text-[8px]">manager desk</div>

      <div className="absolute left-[4%] top-[21%] h-16 w-[90%] rounded-[8px] border border-white/55 bg-white/46 shadow-[0_16px_36px_rgba(15,23,42,0.1)] backdrop-blur" />
      <div className="absolute left-[8%] top-[23%] h-7 w-[12%] border-2 border-black bg-[#dbeafe]" />
      <div className="absolute left-[22%] top-[23%] h-7 w-[12%] border-2 border-black bg-[#fef3c7]" />
      <div className="absolute left-[36%] top-[23%] h-7 w-[12%] border-2 border-black bg-white" />
      <div className="absolute left-[50%] top-[23%] h-7 w-[12%] border-2 border-black bg-[#bae6fd]" />
      <div className="absolute left-[64%] top-[23%] h-7 w-[12%] border-2 border-black bg-[#fbcfe8]" />
      <div className="absolute left-[78%] top-[23%] h-7 w-[12%] border-2 border-black bg-[#052e16] shadow-[inset_0_0_0_4px_#22c55e]" />

      <div className="absolute left-[30%] top-[45%] h-16 w-[26%] rounded-[8px] border border-slate-950/20 bg-[#0f172a] shadow-[0_16px_36px_rgba(15,23,42,0.16)]" />
      <div className="absolute left-[36%] top-[46%] h-2 w-[4%] bg-[#22c55e]" />
      <div className="absolute left-[42%] top-[49%] h-2 w-[4%] bg-[#ef4444]" />
      <div className="absolute left-[47%] top-[46%] h-2 w-[4%] bg-[#facc15]" />

      <div className="absolute left-[10%] top-[66%] h-16 w-[78%] rounded-[8px] border border-white/55 bg-white/46 shadow-[0_16px_36px_rgba(15,23,42,0.1)] backdrop-blur" />
      <div className="absolute left-[15%] top-[67%] h-8 w-10 border-2 border-black bg-[#fef3c7] shadow-[inset_0_-6px_0_#14b8a6]" />
      <div className="absolute left-[41%] top-[67%] h-8 w-10 border-2 border-black bg-[#fed7aa]" />
      <div className="absolute left-[55%] top-[67%] h-8 w-10 border-2 border-black bg-[#fecaca]" />
      <div className="absolute left-[69%] top-[67%] h-8 w-10 border-2 border-black bg-[#e2e8f0]" />
      <div className="absolute left-[82%] top-[67%] h-8 w-10 border-2 border-black bg-[#fef08a]" />

      <div className="absolute right-[6%] bottom-[13%] h-20 w-[24%] rounded-[8px] border border-white/55 bg-white/48 shadow-[0_16px_36px_rgba(15,23,42,0.1)] backdrop-blur" />
      <div className="absolute right-[10%] bottom-[22%] h-8 w-[15%] border-2 border-black bg-white shadow-[inset_0_-6px_0_#cbd5e1]" />
      <div className="absolute left-[4%] bottom-[18%] h-20 w-12 border-4 border-black bg-[#8b5e34] shadow-[3px_3px_0_#111]">
        <span className="absolute left-1 top-2 h-3 w-8 border border-black bg-[#fef3c7]" />
        <span className="absolute left-1 top-7 h-3 w-8 border border-black bg-[#fef3c7]" />
        <span className="absolute left-1 top-12 h-3 w-8 border border-black bg-[#fef3c7]" />
      </div>
      <div className="absolute right-[3%] top-[35%] h-16 w-10 border-4 border-black bg-[#0c7c59] shadow-[3px_3px_0_#111]">
        <span className="absolute left-3 top-[-18px] h-6 w-4 border-2 border-black bg-[#16a34a]" />
        <span className="absolute left-1 top-2 h-2 w-7 border border-black bg-[#bbf7d0]" />
      </div>
      <div className="absolute left-[5%] top-[38%] h-12 w-16 border-4 border-black bg-[#7c3aed] shadow-[3px_3px_0_#111]">
        <span className="absolute left-2 top-2 h-2 w-10 bg-[#facc15]" />
        <span className="absolute left-2 top-6 h-2 w-7 bg-[#22c55e]" />
      </div>
      <div className="absolute left-[13%] bottom-[12%] h-10 w-12 border-4 border-black bg-[#fff8e7] shadow-[3px_3px_0_#111]">
        <span className="absolute left-3 top-[-10px] h-3 w-6 border-2 border-black bg-white" />
        <span className="absolute left-5 top-2 h-4 w-3 bg-[#6b3f2a]" />
      </div>
      <div className="absolute left-[4%] top-3 z-20 flex max-w-[42%] justify-start px-2">
        <div className="glass-chip max-w-full rounded-full px-3 py-2 text-left">
          <p className="truncate font-pixel text-[10px] text-slate-900 sm:text-xs">{selected.name}</p>
          <p className="mt-1 truncate text-[9px] font-black uppercase text-[color:var(--pf-accent)]">{selected.role} / {selectedStatus}</p>
        </div>
      </div>

      {gameAgents.map((agent) => {
        const active = selectedAgent === agent.id;
        const { status: agentStatus, recommendation: rec, state } = agentRuntimeState(agent, agentStatuses, agentRecommendations);

        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`absolute z-30 h-[112px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border font-pixel text-[7px] leading-none shadow-[0_14px_30px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.66)] backdrop-blur motion-safe:transition-all hover:z-40 hover:-translate-y-[53%] hover:brightness-105 motion-safe:active:scale-95 lg:h-[116px] lg:w-[76px] ${active ? "z-40 ring-2 ring-[color:var(--pf-accent)]" : ""} ${stateClass(state, active)}`}
            style={{ left: agent.x, top: agent.y }}
            title={`${agent.role} (${agentStatus})`}
            aria-label={agent.role}
          >
            <PixelAvatar agent={agent} thinking={state === "thinking"} />
            <div className="mx-1 mt-1 flex items-center justify-center gap-1">
              <span className="font-bold">{agent.label}</span>
              <span className="h-2 w-2 border border-black" style={{ backgroundColor: agent.accent }} />
            </div>
            <span className="mx-auto mt-0.5 block max-w-[68px] truncate text-[6px] uppercase">{state}</span>
            {rec ? (
              <span className={`mx-auto mt-1 block max-w-[56px] truncate rounded-full border px-1 py-0.5 text-[7px] ${recommendationColor[rec] ?? "border-white/60 bg-white/80"}`}>
                {rec}
              </span>
            ) : null}
          </button>
        );
      })}

      {selectedPerformance ? (
        <div className="glass-chip absolute bottom-4 left-4 right-4 rounded-[8px] p-2 text-[9px] text-slate-900">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-pixel">{selected.label}</span>
            <span>Hit {selectedPerformance.hitRate.toFixed(0)}%</span>
            <span>P/L ${selectedPerformance.pnl.toFixed(2)}</span>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
