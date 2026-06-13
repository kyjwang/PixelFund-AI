import { describe, expect, jest, test } from "@jest/globals";
import { CryptoTraderService } from "../src/crypto-trader/crypto-trader.service";

const baseSettings = {
  id: "settings-1",
  ownerKey: "account-a",
  enabled: true,
  selectedCoins: ["BTC"],
  maxTradesPerDay: 4,
  stopLossPercent: 4,
  maxPortfolioPercent: 20,
  strategyMode: "BALANCED",
  aggressiveStartedAt: null,
  aggressiveExpiresAt: null,
  lastCheckedAt: null,
  createdAt: new Date("2026-06-12T10:00:00.000Z"),
  updatedAt: new Date("2026-06-12T10:00:00.000Z")
};

describe("crypto trader service aggressive settings", () => {
  test("starting aggressive mode stores a one hour session window", async () => {
    const now = new Date("2026-06-12T12:00:00.000Z");
    const prisma = {
      cryptoTraderSettings: {
        findUnique: jest.fn(async () => baseSettings),
        update: jest.fn(async ({ data }: any) => ({ ...baseSettings, ...data }))
      }
    };
    const service = new CryptoTraderService(prisma as any, {} as any, {} as any, {} as any);

    const updated = await service.updateSettings({ strategyMode: "AGGRESSIVE" }, "account-a", now);

    expect(updated.strategyMode).toBe("AGGRESSIVE");
    expect(updated.aggressiveStartedAt?.toISOString()).toBe("2026-06-12T12:00:00.000Z");
    expect(updated.aggressiveExpiresAt?.toISOString()).toBe("2026-06-12T13:00:00.000Z");
  });

  test("expired aggressive mode normalizes back to balanced", async () => {
    const now = new Date("2026-06-12T13:01:00.000Z");
    const expired = {
      ...baseSettings,
      strategyMode: "AGGRESSIVE",
      aggressiveStartedAt: new Date("2026-06-12T12:00:00.000Z"),
      aggressiveExpiresAt: new Date("2026-06-12T13:00:00.000Z")
    };
    const prisma = {
      cryptoTraderSettings: {
        findUnique: jest.fn(async () => expired),
        update: jest.fn(async ({ data }: any) => ({ ...expired, ...data }))
      }
    };
    const service = new CryptoTraderService(prisma as any, {} as any, {} as any, {} as any);

    const settings = await service.getSettings("account-a", now);

    expect(settings.strategyMode).toBe("BALANCED");
    expect(settings.aggressiveStartedAt).toBeNull();
    expect(settings.aggressiveExpiresAt).toBeNull();
    expect(prisma.cryptoTraderSettings.update).toHaveBeenCalledWith({
      where: { ownerKey: "account-a" },
      data: {
        strategyMode: "BALANCED",
        aggressiveStartedAt: null,
        aggressiveExpiresAt: null
      }
    });
  });
});
