const assert = require("node:assert/strict");
const nodeTest = require("node:test");
const {
  getAnalysisProgress,
  shouldPollAnalysisRun
} = require("../lib/analysis-polling") as typeof import("../lib/analysis-polling");

nodeTest("continues polling while an analysis run can still change", () => {
  assert.equal(shouldPollAnalysisRun("PENDING"), true);
  assert.equal(shouldPollAnalysisRun("RUNNING"), true);
  assert.equal(shouldPollAnalysisRun("COMPLETED"), false);
  assert.equal(shouldPollAnalysisRun("FAILED"), false);
});

nodeTest("calculates visible analysis progress from live agent statuses", () => {
  const progress = getAnalysisProgress({
    status: "RUNNING",
    createdAt: new Date(Date.now() - 45_000).toISOString(),
    recommendations: [
      { agentType: "TECHNICAL_ANALYST", status: "COMPLETED" },
      { agentType: "NEWS_ANALYST", status: "COMPLETED" },
      { agentType: "FUNDAMENTALS_ANALYST", status: "RUNNING" },
      { agentType: "PORTFOLIO_MANAGER", status: "PENDING" }
    ]
  });

  assert.equal(progress.completed, 2);
  assert.equal(progress.total, 4);
  assert.equal(progress.percent, 50);
  assert.equal(progress.currentLabel, "Fundamentals Analyst");
  assert.match(progress.etaLabel, /left|Finalizing/);
});

nodeTest("explains stalled analysis runs instead of looking silently stuck", () => {
  const progress = getAnalysisProgress({
    status: "PENDING",
    createdAt: new Date(Date.now() - 130_000).toISOString(),
    recommendations: [
      { agentType: "TECHNICAL_ANALYST", status: "PENDING" },
      { agentType: "PORTFOLIO_MANAGER", status: "PENDING" }
    ]
  });

  assert.equal(progress.percent, 5);
  assert.equal(progress.currentLabel, "Waiting for analysis worker");
  assert.equal(progress.etaLabel, "Taking longer than usual");
});
