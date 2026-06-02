"use client";

type Agent = {
  id: string;
  label: string;
  x: string;
  y: string;
  role: string;
  color: string;
  icon: string;
  image: string;
  animation?: string;
};

const agents: Agent[] = [
  { 
    id: "TECHNICAL_ANALYST", 
    label: "TA", 
    x: "12%", 
    y: "62%", 
    role: "Technical Analyst",
    color: "#3b82f6", // Blue
    icon: "📈",
    image: "/pixel-art/characters/technical-analyst.png"
  },
  { 
    id: "NEWS_ANALYST", 
    label: "NW", 
    x: "30%", 
    y: "44%", 
    role: "News Analyst",
    color: "#10b981", // Green
    icon: "📰",
    image: "/pixel-art/characters/news-analyst.png"
  },
  { 
    id: "FUNDAMENTALS_ANALYST", 
    label: "FD", 
    x: "50%", 
    y: "62%", 
    role: "Fundamentals Analyst",
    color: "#f59e0b", // Yellow/Amber
    icon: "📊",
    image: "/pixel-art/characters/fundamentals-analyst.png"
  },
  { 
    id: "RISK_ANALYST", 
    label: "RK", 
    x: "68%", 
    y: "44%", 
    role: "Risk Analyst",
    color: "#ef4444", // Red
    icon: "⚠️",
    image: "/pixel-art/characters/risk-analyst.png"
  },
  { 
    id: "PORTFOLIO_MANAGER", 
    label: "PM", 
    x: "84%", 
    y: "62%", 
    role: "Portfolio Manager",
    color: "#8b5cf6", // Purple
    icon: "🎯",
    image: "/pixel-art/characters/portfolio-manager.png",
    animation: "/pixel-art/animations/portfolio-manager-idle.webp"
  }
];

const statusColor: Record<string, string> = {
  PENDING: "bg-slate-300",
  RUNNING: "bg-cyan-300",
  COMPLETED: "bg-emerald-300",
  FAILED: "bg-red-300",
  IDLE: "bg-slate-300"
};

const recommendationColor: Record<string, string> = {
  BUY: "bg-emerald-300 text-slate-950",
  HOLD: "bg-amber-200 text-slate-950",
  AVOID: "bg-red-300 text-slate-950"
};

function visualState(status: string, recommendation?: string) {
  if (status === "RUNNING") return "thinking";
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
  return active ? "bg-white" : "bg-[#5bc0be] hover:bg-[#7bdff2]";
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
  const selectedRole = agents.find((a) => a.id === selectedAgent)?.role ?? "Specialist";
  const selectedStatus = agentStatuses[selectedAgent] ?? "IDLE";
  const selectedAgentConfig = agents.find((a) => a.id === selectedAgent);
  const selectedPerformance = agentPerformance?.[selectedAgent];

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-[6px] border-4 border-slate-950 bg-[#d9f0e8] pixel-card sm:h-[360px] md:h-[410px]">
      <div className="absolute inset-x-0 top-0 h-20 bg-[#8bd3dd]" />
      <div className="absolute inset-x-0 top-20 h-20 bg-[#f4d06f]" />
      <div className="absolute bottom-0 h-28 w-full bg-[#5a3e34] sm:h-32" />
      <div className="absolute bottom-20 left-0 right-0 h-4 bg-[#2f4858] sm:bottom-24" />
      <div className="absolute left-[8%] top-[28%] h-16 w-[18%] border-4 border-slate-950 bg-[#f7fff7]" />
      <div className="absolute left-[41%] top-[26%] h-14 w-[18%] border-4 border-slate-950 bg-[#f7fff7]" />
      <div className="absolute right-[9%] top-[28%] h-16 w-[18%] border-4 border-slate-950 bg-[#f7fff7]" />
      <div className="absolute inset-x-0 top-3 flex justify-center px-2">
        <p className="max-w-full truncate border-2 border-black bg-white px-2 py-1 font-pixel text-[10px] text-slate-900 sm:text-xs">
          {selectedRole}: {selectedStatus}
        </p>
      </div>

      {agents.map((agent) => {
        const active = selectedAgent === agent.id;
        const agentStatus = agentStatuses[agent.id] ?? "IDLE";
        const rec = agentRecommendations[agent.id];
        const performance = agentPerformance?.[agent.id];
        const state = visualState(agentStatus, rec);
        const agentImage = agentStatus === "RUNNING" && agent.animation ? agent.animation : agent.image;
        
        return (
          <button
            key={agent.id}
            onClick={() => onSelect(agent.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-none border-4 border-black font-pixel text-[10px] leading-none shadow-[4px_4px_0_#111] motion-safe:transition-colors motion-safe:active:scale-95 sm:text-xs ${stateClass(state, active)} h-16 w-16 sm:h-[74px] sm:w-[74px] md:h-20 md:w-20`}
            style={{ left: agent.x, top: agent.y }}
            title={`${agent.role} (${agentStatus})`}
            aria-label={agent.role}
          >
            <div className="flex flex-col items-center">
              <img
                src={agentImage}
                alt={`${agent.role} pixel art`}
                className="mx-auto mt-1 h-11 w-11 object-contain [image-rendering:pixelated] sm:h-12 sm:w-12 md:h-14 md:w-14"
              />
              <div className="flex items-center space-x-1 text-[8px]">
                <span className="font-bold">{agent.label}</span>
                <span className="text-[{agent.color}]">{agent.icon}</span>
              </div>
              <span className="mt-0.5 max-w-[54px] truncate text-[6px] uppercase">{state}</span>
            </div>
            
            {rec ? (
              <span className={`mx-auto mt-1 block max-w-[48px] truncate border border-black px-1 py-0.5 text-[7px] sm:max-w-[56px] ${recommendationColor[rec] ?? "bg-white"}`}>
                {rec}
              </span>
            ) : null}
          </button>
        );
      })}
      
      {/* Performance Panel for Selected Agent */}
      {selectedPerformance && selectedAgentConfig && (
        <div className="absolute bottom-4 left-4 right-4 text-[9px] text-slate-900 bg-white/90 backdrop-blur-sm rounded-[4px] border-2 border-black p-2">
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between">
              <span className="font-pixel">{selectedAgentConfig.label}</span>
              <span className="font-pixel text-[{selectedAgentConfig.color}]">{selectedAgentConfig.icon}</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span>Hit Rate:</span>
              <span className="font-mono">{selectedPerformance.hitRate.toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-[8px]">
              <span>P&L:</span>
              <span className={`font-mono ${selectedPerformance.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                ${selectedPerformance.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
