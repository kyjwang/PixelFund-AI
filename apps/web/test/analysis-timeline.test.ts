{
const assert = require("node:assert/strict");
const nodeTest = require("node:test");
const {
  buildAnalysisTimelineRows
} = require("../lib/analysis-timeline") as typeof import("../lib/analysis-timeline");

nodeTest("builds timeline rows from real agent recommendation statuses", () => {
  const rows = buildAnalysisTimelineRows([
    {
      agentType: "TECHNICAL_ANALYST",
      status: "COMPLETED",
      recommendation: "BUY",
      confidence: 0.82,
      summary: "Technical Analyst sees price strength.",
      updatedAt: "2026-06-10T12:01:00.000Z"
    },
    {
      agentType: "TRADER_AGENT",
      status: "RUNNING",
      recommendation: null,
      confidence: null,
      summary: null,
      updatedAt: "2026-06-10T12:02:00.000Z"
    },
    {
      agentType: "PORTFOLIO_MANAGER",
      status: "PENDING",
      recommendation: null,
      confidence: null,
      summary: null,
      updatedAt: null
    }
  ]);

  assert.deepEqual(
    rows.map((row: {
      agentType: string;
      label: string;
      status: string;
      recommendation: string | null;
      confidenceLabel: string | null;
      detail: string;
    }) => ({
      agentType: row.agentType,
      label: row.label,
      status: row.status,
      recommendation: row.recommendation,
      confidenceLabel: row.confidenceLabel,
      detail: row.detail
    })),
    [
      {
        agentType: "TECHNICAL_ANALYST",
        label: "Technical Analyst",
        status: "COMPLETED",
        recommendation: "BUY",
        confidenceLabel: "82%",
        detail: "Technical Analyst sees price strength."
      },
      {
        agentType: "TRADER_AGENT",
        label: "Trader Agent",
        status: "RUNNING",
        recommendation: null,
        confidenceLabel: null,
        detail: "Trader Agent is working now."
      },
      {
        agentType: "PORTFOLIO_MANAGER",
        label: "Portfolio Manager",
        status: "PENDING",
        recommendation: null,
        confidenceLabel: null,
        detail: "Portfolio Manager is waiting for earlier agents."
      }
    ]
  );
});

nodeTest("returns an empty timeline before an analysis run has agent records", () => {
  assert.deepEqual(buildAnalysisTimelineRows(undefined), []);
  assert.deepEqual(buildAnalysisTimelineRows([]), []);
});
}
