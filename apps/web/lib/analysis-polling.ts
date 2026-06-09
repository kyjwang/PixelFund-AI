export function shouldPollAnalysisRun(status: string | null | undefined) {
  return status === "PENDING" || status === "RUNNING";
}

type AnalysisStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | string;

type ProgressRecommendation = {
  agentType?: string | null;
  status?: AnalysisStatus | null;
};

export type AnalysisProgressInput = {
  status?: AnalysisStatus | null;
  createdAt?: string | Date | null;
  recommendations?: ProgressRecommendation[] | null;
};

export type AnalysisProgress = {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  percent: number;
  currentLabel: string;
  etaLabel: string;
  isActive: boolean;
};

export function getAnalysisProgress(run: AnalysisProgressInput | null | undefined, now = Date.now()): AnalysisProgress {
  const recommendations = run?.recommendations ?? [];
  const total = Math.max(recommendations.length, 1);
  const completed = recommendations.filter((rec) => rec.status === "COMPLETED").length;
  const failed = recommendations.filter((rec) => rec.status === "FAILED").length;
  const running = recommendations.filter((rec) => rec.status === "RUNNING").length;
  const pending = recommendations.filter((rec) => rec.status === "PENDING").length;
  const isActive = shouldPollAnalysisRun(run?.status);
  const rawPercent = run?.status === "COMPLETED" ? 100 : Math.round((completed / total) * 100);
  const percent = isActive ? clamp(rawPercent || 5, 5, 99) : clamp(rawPercent, 0, 100);
  const current = recommendations.find((rec) => rec.status === "RUNNING") ?? recommendations.find((rec) => rec.status === "PENDING");

  return {
    total,
    completed,
    failed,
    running,
    pending,
    percent,
    currentLabel: currentLabel(run?.status, current),
    etaLabel: etaLabel(run, completed, total, now),
    isActive
  };
}

function currentLabel(status: AnalysisStatus | null | undefined, current: ProgressRecommendation | undefined) {
  if (status === "COMPLETED") return "Finished";
  if (status === "FAILED") return "Analysis failed";
  if (current?.status === "RUNNING") return agentLabel(current.agentType);
  if (current?.status === "PENDING") return "Waiting for analysis worker";
  return "Ready to ask AI team";
}

function etaLabel(run: AnalysisProgressInput | null | undefined, completed: number, total: number, now: number) {
  if (run?.status === "COMPLETED") return "Complete";
  if (run?.status === "FAILED") return "Needs attention";
  if (!shouldPollAnalysisRun(run?.status)) return "Not started";

  const createdAt = run?.createdAt ? new Date(run.createdAt).getTime() : Number.NaN;
  const elapsedMs = Number.isFinite(createdAt) ? Math.max(0, now - createdAt) : 0;
  if (elapsedMs > 120_000 && completed === 0) return "Taking longer than usual";
  if (completed <= 0) return elapsedMs > 15_000 ? "Waiting for worker" : "Starting";

  const remaining = Math.max(total - completed, 0);
  if (remaining === 0) return "Finalizing";

  const estimatedRemainingMs = Math.min(180_000, Math.max(8_000, (elapsedMs / completed) * remaining));
  const seconds = Math.max(5, Math.round(estimatedRemainingMs / 5000) * 5);
  if (seconds < 60) return `About ${seconds}s left`;
  return `About ${Math.ceil(seconds / 60)}m left`;
}

function agentLabel(agentType: string | null | undefined) {
  if (!agentType) return "Agent running";
  return agentType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
