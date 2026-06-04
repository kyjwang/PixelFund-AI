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
  mockAnalysis: string;
  x: string;
  y: string;
  outfit: string;
  accent: string;
  skin: string;
  hair: string;
  prop:
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
    | "lock";
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
    mockAnalysis: "Price action is holding above the short moving average while volume is stable. I want confirmation before calling it a clean breakout.",
    x: "9%",
    y: "72%",
    outfit: "#2563eb",
    accent: "#93c5fd",
    skin: "#f2c7a4",
    hair: "#1e293b",
    prop: "glasses"
  },
  {
    id: "FUNDAMENTALS_ANALYST",
    label: "FA",
    name: "Felix Ledger",
    role: "Fundamentals Analyst",
    personality: "Patient, skeptical, loves ratios.",
    signal: "Valuation check",
    confidence: 68,
    mockAnalysis: "Margins and growth quality look constructive, but valuation needs to be compared against forward earnings before sizing up.",
    x: "23%",
    y: "76%",
    outfit: "#ca8a04",
    accent: "#fde68a",
    skin: "#c98b61",
    hair: "#3f2a1d",
    prop: "book"
  },
  {
    id: "NEWS_ANALYST",
    label: "NA",
    name: "Nia Wire",
    role: "News Analyst",
    personality: "Curious, quick, headline-sensitive.",
    signal: "Headline scan",
    confidence: 64,
    mockAnalysis: "Recent headlines are mixed but not alarming. I am watching for management commentary or sector news that changes the tone.",
    x: "37%",
    y: "72%",
    outfit: "#059669",
    accent: "#a7f3d0",
    skin: "#d9a476",
    hair: "#111827",
    prop: "paper"
  },
  {
    id: "RISK_ANALYST",
    label: "RM",
    name: "Rhea Guard",
    role: "Risk Manager",
    personality: "Calm, blunt, downside-first.",
    signal: "Risk cap",
    confidence: 75,
    mockAnalysis: "Downside risk is acceptable only with controlled sizing. If volatility expands, this trade should be reduced quickly.",
    x: "51%",
    y: "76%",
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
    mockAnalysis: "The trade can fit the portfolio if exposure remains measured. I am waiting for the team meeting before final approval.",
    x: "79%",
    y: "72%",
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
    mockAnalysis: "Macro backdrop is not hostile, but rates and dollar strength could pressure high-multiple names if risk appetite fades.",
    x: "8%",
    y: "22%",
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
    mockAnalysis: "Crowd tone is leaning optimistic, but not euphoric. That supports a watchful bullish stance rather than chasing.",
    x: "20%",
    y: "22%",
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
    mockAnalysis: "The factor blend is slightly positive. Momentum contributes most, while volatility prevents a stronger score.",
    x: "32%",
    y: "22%",
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
    mockAnalysis: "Crypto beta is quiet but can still spill into risk assets. I would not use crypto strength alone as confirmation here.",
    x: "44%",
    y: "22%",
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
    mockAnalysis: "I am collecting each desk's strongest point, then I will turn the meeting into one clean trade summary.",
    x: "91%",
    y: "72%",
    outfit: "#475569",
    accent: "#e2e8f0",
    skin: "#f2c7a4",
    hair: "#78350f",
    prop: "badge"
  },
  {
    id: "BULL_RESEARCHER",
    label: "BU",
    name: "Basil Breakout",
    role: "Bull Researcher",
    personality: "Optimistic, strategic, always hunting upside.",
    signal: "Bull thesis",
    confidence: 71,
    mockAnalysis: "The upside case is forming around momentum, improving evidence quality, and specialist agreement. I want the team to focus on what can go right.",
    x: "56%",
    y: "22%",
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
    mockAnalysis: "The downside case centers on valuation, missing data, and whether the setup already prices in too much optimism.",
    x: "68%",
    y: "22%",
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
    mockAnalysis: "I translate the debate into an entry, size, invalidation level, and holding window. A good thesis still needs a clean trade plan.",
    x: "80%",
    y: "22%",
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
    mockAnalysis: "I will accept volatility when the reward profile is strong, but I still want a clear stop and a reason for urgency.",
    x: "58%",
    y: "49%",
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
    mockAnalysis: "The trade needs balanced sizing. I am checking whether the expected reward is enough for the uncertainty in the evidence.",
    x: "72%",
    y: "49%",
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
    mockAnalysis: "I need proof before approving size. If the data is partial or volatility is elevated, the safest trade may be no trade.",
    x: "86%",
    y: "49%",
    outfit: "#7f1d1d",
    accent: "#fecaca",
    skin: "#8d5524",
    hair: "#1f2937",
    prop: "lock"
  }
];

export const gameAgents: GameAgent[] = AGENT_PROFILES.map((profile) => {
  const visual = visualAgents.find((agent) => agent.id === profile.id) ?? visualAgents[0];
  return {
    ...visual,
    id: profile.id,
    label: profile.label,
    role: profile.role
  };
});

const recommendationColor: Record<string, string> = {
  BUY: "bg-emerald-300 text-slate-950",
  HOLD: "bg-amber-200 text-slate-950",
  AVOID: "bg-red-300 text-slate-950"
};

function visualState(status: string, recommendation?: string) {
  if (status === "THINKING" || status === "RUNNING") return "thinking";
  if (status === "FAILED") return "failed";
  if (recommendation === "BUY") return "bullish";
  if (recommendation === "AVOID") return "cautious";
  return "idle";
}

function stateClass(state: string, active: boolean) {
  if (state === "thinking") return "bg-cyan-200 motion-safe:animate-pulse";
  if (state === "failed") return "bg-red-200";
  if (state === "bullish") return "bg-emerald-200";
  if (state === "cautious") return "bg-amber-200";
  return active ? "bg-white" : "bg-[#8bd3dd] hover:bg-[#b8f3ff]";
}

function propPixels(agent: GameAgent) {
  const common = "absolute border border-black";
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
  return <span className={`${common} right-[8px] top-[31px] h-6 w-5 bg-[#cbd5e1]`} />;
}

function PixelAvatar({ agent, thinking }: { agent: GameAgent; thinking: boolean }) {
  return (
    <div className={`relative mx-auto h-[66px] w-[58px] ${thinking ? "motion-safe:animate-bounce" : "motion-safe:animate-[pixel-idle_2.8s_ease-in-out_infinite]"}`} style={{ imageRendering: "pixelated" }}>
      <span className="absolute left-[18px] top-0 h-3 w-6 border-2 border-black" style={{ backgroundColor: agent.hair }} />
      <span className="absolute left-[14px] top-[10px] h-8 w-8 border-2 border-black" style={{ backgroundColor: agent.skin }} />
      <span className="absolute left-[18px] top-[14px] h-1.5 w-2 bg-black" />
      <span className="absolute left-[32px] top-[14px] h-1.5 w-2 bg-black" />
      <span className="absolute left-[24px] top-[25px] h-1.5 w-8 bg-[#7f1d1d]" />
      <span className="absolute left-[12px] top-[38px] h-20 max-h-6 w-10 border-2 border-black" style={{ backgroundColor: agent.outfit }} />
      <span className="absolute left-[18px] top-[42px] h-3 w-6 border border-black" style={{ backgroundColor: agent.accent }} />
      <span className="absolute left-[6px] top-[41px] h-4 w-6 border-2 border-black" style={{ backgroundColor: agent.outfit }} />
      {propPixels(agent)}
    </div>
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
    <div className="relative h-[620px] w-full overflow-hidden rounded-[6px] border-4 border-slate-950 bg-[#d9f0e8] pixel-card sm:h-[720px] lg:h-[660px]">
      <div className="absolute inset-x-0 top-0 h-28 bg-[#8bd3dd]" />
      <div className="absolute inset-x-0 top-28 h-24 bg-[#f4d06f]" />
      <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="absolute bottom-0 h-52 w-full bg-[#5a3e34]" />
      <div className="absolute bottom-44 left-0 right-0 h-5 bg-[#2f4858]" />
      <div className="absolute bottom-12 left-[8%] h-10 w-[84%] border-4 border-black bg-[#3d2b24] shadow-[6px_6px_0_#111]" />
      <div className="absolute left-2 top-[15%] z-20 max-w-[88px] border-2 border-black bg-white px-1.5 py-1 font-pixel text-[7px] shadow-[2px_2px_0_#111] sm:left-3 sm:max-w-none sm:px-2 sm:text-[8px]">macro + crowd</div>
      <div className="absolute left-[53%] top-[15%] z-20 border-2 border-black bg-white px-2 py-1 font-pixel text-[8px] shadow-[2px_2px_0_#111]">debate desk</div>
      <div className="absolute right-2 top-[42%] z-20 max-w-[80px] border-2 border-black bg-white px-1.5 py-1 font-pixel text-[7px] shadow-[2px_2px_0_#111] sm:right-3 sm:max-w-none sm:px-2 sm:text-[8px]">risk council</div>
      <div className="absolute left-2 bottom-[31%] z-20 max-w-[84px] border-2 border-black bg-white px-1.5 py-1 font-pixel text-[7px] shadow-[2px_2px_0_#111] sm:left-3 sm:max-w-none sm:px-2 sm:text-[8px]">analyst floor</div>
      <div className="absolute left-[5%] top-[19%] h-16 w-[24%] border-4 border-slate-950 bg-[#f7fff7] shadow-[4px_4px_0_#111]" />
      <div className="absolute left-[38%] top-[17%] h-16 w-[24%] border-4 border-slate-950 bg-[#0f172a] shadow-[4px_4px_0_#111]" />
      <div className="absolute right-[5%] top-[19%] h-16 w-[24%] border-4 border-slate-950 bg-[#f7fff7] shadow-[4px_4px_0_#111]" />
      <div className="absolute left-[11%] top-[22%] h-2 w-[12%] bg-[#2563eb]" />
      <div className="absolute left-[43%] top-[20%] h-2 w-[3%] bg-[#22c55e]" />
      <div className="absolute left-[48%] top-[23%] h-2 w-[3%] bg-[#22c55e]" />
      <div className="absolute left-[53%] top-[26%] h-2 w-[3%] bg-[#22c55e]" />
      <div className="absolute right-[11%] top-[23%] h-2 w-[12%] bg-[#dc2626]" />
      <div className="absolute inset-x-0 top-3 flex justify-center px-2">
        <p className="max-w-full truncate border-2 border-black bg-white px-2 py-1 font-pixel text-[10px] text-slate-900 sm:text-xs">
          {selected.role}: {selectedStatus}
        </p>
      </div>

      {gameAgents.map((agent) => {
        const active = selectedAgent === agent.id;
        const agentStatus = agentStatuses[agent.id] ?? "IDLE";
        const rec = agentRecommendations[agent.id];
        const state = visualState(agentStatus, rec);

        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-none border-4 border-black font-pixel text-[7px] leading-none shadow-[4px_4px_0_#111] motion-safe:transition-all hover:brightness-105 hover:shadow-[5px_5px_0_#111] motion-safe:active:scale-95 sm:text-[8px] ${stateClass(state, active)} h-[98px] w-[68px] sm:h-[104px] sm:w-[74px]`}
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
              <span className={`mx-auto mt-1 block max-w-[56px] truncate border border-black px-1 py-0.5 text-[7px] ${recommendationColor[rec] ?? "bg-white"}`}>
                {rec}
              </span>
            ) : null}
          </button>
        );
      })}

      {selectedPerformance ? (
        <div className="absolute bottom-4 left-4 right-4 border-2 border-black bg-white/95 p-2 text-[9px] text-slate-900">
          <div className="grid grid-cols-3 gap-2">
            <span className="font-pixel">{selected.label}</span>
            <span>Hit {selectedPerformance.hitRate.toFixed(0)}%</span>
            <span>P/L ${selectedPerformance.pnl.toFixed(2)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
