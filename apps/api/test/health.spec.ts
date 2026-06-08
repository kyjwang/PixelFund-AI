import { describe, expect, jest, test } from "@jest/globals";
import { HealthController } from "../src/health/health.controller";

describe("health controller", () => {
  test("returns a component readiness payload for host health checks", async () => {
    const redisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    const prisma = { $queryRaw: jest.fn(async () => [{ "?column?": 1 }]) } as any;
    const payload = await new HealthController(prisma).health();
    process.env.REDIS_URL = redisUrl;

    expect(payload.service).toBe("pixelfund-api");
    expect(payload.components.api.status).toBe("OK");
    expect(payload.components.database.status).toBe("OK");
    expect(payload.components.redis.status).toBe("DOWN");
  });
});
