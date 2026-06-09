import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, jest, test } from "@jest/globals";
import { AnalysisService } from "../src/analysis/analysis.service";

describe("analysis service queue handoff", () => {
  test("re-enqueues a recent pending run when no BullMQ job exists", async () => {
    const recent = { id: "run-1", ticker: "NVDA", status: "PENDING", recommendations: [] };
    const prisma = {
      analysisRun: {
        findFirst: jest.fn(async () => recent),
        update: jest.fn()
      }
    };
    const queue = {
      getJob: jest.fn(async () => null),
      add: jest.fn(async () => ({ id: "run-1" }))
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, queue as any);

    await expect(service.createRun("NVDA")).resolves.toBe(recent);

    expect(queue.getJob).toHaveBeenCalledWith("run-1");
    expect(queue.add).toHaveBeenCalledWith(
      "run-analysis",
      { analysisRunId: "run-1", ticker: "NVDA" },
      expect.objectContaining({ jobId: "run-1" })
    );
  });

  test("marks a newly created run failed when Redis enqueue fails", async () => {
    const created = { id: "run-2", ticker: "NVDA", status: "PENDING", recommendations: [] };
    const prisma = {
      analysisRun: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => created),
        update: jest.fn(async () => ({ ...created, status: "FAILED" }))
      }
    };
    const queue = {
      add: jest.fn(async () => {
        throw new Error("redis offline");
      })
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, queue as any);

    await expect(service.createRun("NVDA")).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(prisma.analysisRun.update).toHaveBeenCalledWith({
      where: { id: "run-2" },
      data: expect.objectContaining({
        status: "FAILED",
        errorReason: expect.stringContaining("Analysis queue unavailable")
      })
    });
  });
});
