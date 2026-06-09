const assert = require("node:assert/strict");
const nodeTest = require("node:test");
const { shouldPollAnalysisRun } = require("../lib/analysis-polling") as typeof import("../lib/analysis-polling");

nodeTest("continues polling while an analysis run can still change", () => {
  assert.equal(shouldPollAnalysisRun("PENDING"), true);
  assert.equal(shouldPollAnalysisRun("RUNNING"), true);
  assert.equal(shouldPollAnalysisRun("COMPLETED"), false);
  assert.equal(shouldPollAnalysisRun("FAILED"), false);
});
