type TimelineAgentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;

type TimelineAgentInput = {
  agentType?: string | null;
  status?: TimelineAgentStatus | null;
  recommendation?: string | null;
  confidence?: number | null;
  summary?: string | null;
  updatedAt?: string | Date | null;
};

export type AnalysisTimelineRow = {
  agentType: string;
  label: string;
  status: string;
  recommendation: string | null;
  confidenceLabel: string | null;
  detail: string;
  updatedAt: string | Date | null;
};

export function buildAnalysisTimelineRows(agents: TimelineAgentInput[] | null | undefined): AnalysisTimelineRow[] {
  return (agents ?? []).map((agent) => {
    const agentType = agent.agentType ?? "UNKNOWN_AGENT";
    const label = agentLabel(agentType);
    const status = agent.status ?? "PENDING";

    return {
      agentType,
      label,
      status,
      recommendation: agent.recommendation ?? null,
      confidenceLabel: typeof agent.confidence === "number" ? `${Math.round(agent.confidence * 100)}%` : null,
      detail: agent.summary?.trim() || fallbackDetail(label, status),
      updatedAt: agent.updatedAt ?? null
    };
  });
}

function fallbackDetail(label: string, status: TimelineAgentStatus) {
  if (status === "RUNNING") return `${label} is working now.`;
  if (status === "COMPLETED") return `${label} completed without a written summary.`;
  if (status === "FAILED") return `${label} could not finish this analysis.`;
  return `${label} is waiting for earlier agents.`;
}

function agentLabel(agentType: string) {
  return agentType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
