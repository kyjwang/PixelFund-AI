import { describe, expect, test } from "@jest/globals";
import { HealthController } from "../src/health/health.controller";

describe("health controller", () => {
  test("returns an ok payload for host health checks", () => {
    expect(new HealthController().health()).toEqual({ ok: true });
  });
});

