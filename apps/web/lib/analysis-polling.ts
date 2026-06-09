export function shouldPollAnalysisRun(status: string | null | undefined) {
  return status === "PENDING" || status === "RUNNING";
}
