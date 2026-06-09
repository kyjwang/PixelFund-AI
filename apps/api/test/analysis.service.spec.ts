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

  test("creates and reuses analysis runs inside the requested owner scope", async () => {
    const created = { id: "run-owner-a", ticker: "NVDA", status: "PENDING", recommendations: [] };
    const prisma = {
      analysisRun: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => created),
        update: jest.fn()
      }
    };
    const queue = {
      getJob: jest.fn(async () => ({ id: "run-owner-a" })),
      add: jest.fn()
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, queue as any);

    await expect(service.createRun("NVDA", "idem-1", "account-a")).resolves.toBe(created);

    expect(prisma.analysisRun.findFirst).toHaveBeenNthCalledWith(1, {
      where: { idempotencyKey: "idem-1", ticker: "NVDA", ownerKey: "account-a" },
      include: { recommendations: true },
      orderBy: { createdAt: "desc" }
    });
    expect(prisma.analysisRun.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        ticker: "NVDA",
        ownerKey: "account-a",
        createdAt: { gte: expect.any(Date) }
      },
      include: { recommendations: true },
      orderBy: { createdAt: "desc" }
    });
    expect(prisma.analysisRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerKey: "account-a", ticker: "NVDA" })
      })
    );
  });

  test("lists analysis runs inside the requested owner scope", async () => {
    const prisma = {
      analysisRun: {
        findMany: jest.fn(async () => [])
      }
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, {} as any);

    await expect(service.listRuns("account-b")).resolves.toEqual([]);

    expect(prisma.analysisRun.findMany).toHaveBeenCalledWith({
      where: { ownerKey: "account-b" },
      orderBy: { createdAt: "desc" },
      include: { recommendations: true },
      take: 20
    });
  });

  test("clears only analysis runs and agent results for the requested owner scope", async () => {
    const prisma = {
      $transaction: jest.fn(async (callback: any) =>
        callback({
          analysisRun: {
            findMany: jest.fn(async () => [{ id: "run-a" }, { id: "run-b" }]),
            deleteMany: jest.fn(async () => ({ count: 2 }))
          },
          agentResult: {
            deleteMany: jest.fn(async () => ({ count: 30 }))
          }
        })
      )
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, {} as any);

    await expect(service.clearRuns("account-a")).resolves.toEqual({
      deletedAnalysisRuns: 2,
      deletedAgentResults: 30
    });

    const tx = (prisma.$transaction as jest.Mock).mock.calls[0][0] as (client: unknown) => Promise<unknown>;
    const txClient = {
      analysisRun: {
        findMany: jest.fn(async () => [{ id: "run-a" }, { id: "run-b" }]),
        deleteMany: jest.fn(async () => ({ count: 2 }))
      },
      agentResult: {
        deleteMany: jest.fn(async () => ({ count: 30 }))
      }
    };
    await tx(txClient);
    expect(txClient.analysisRun.findMany).toHaveBeenCalledWith({
      where: { ownerKey: "account-a" },
      select: { id: true }
    });
    expect(txClient.agentResult.deleteMany).toHaveBeenCalledWith({
      where: { analysisRunId: { in: ["run-a", "run-b"] } }
    });
    expect(txClient.analysisRun.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["run-a", "run-b"] } }
    });
  });

  test("clears visible legacy demo analysis rows without deleting other owners", async () => {
    const txClient = {
      analysisRun: {
        findMany: jest.fn(async () => [{ id: "current-run" }, { id: "legacy-demo-run" }]),
        deleteMany: jest.fn(async () => ({ count: 2 }))
      },
      agentResult: {
        deleteMany: jest.fn(async () => ({ count: 32 }))
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(txClient))
    };
    const service = new AnalysisService(prisma as any, { emit: jest.fn() } as any, {} as any);

    await expect(service.clearRuns("account-a", ["legacy-demo-run", "other-owner-run"])).resolves.toEqual({
      deletedAnalysisRuns: 2,
      deletedAgentResults: 32
    });

    expect(txClient.analysisRun.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { ownerKey: "account-a" },
          { ownerKey: "demo", id: { in: ["legacy-demo-run", "other-owner-run"] } }
        ]
      },
      select: { id: true }
    });
    expect(txClient.analysisRun.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["current-run", "legacy-demo-run"] } }
    });
  });
});
