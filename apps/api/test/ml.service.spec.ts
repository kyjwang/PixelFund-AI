import { describe, expect, jest, test } from "@jest/globals";
import type { MlPredictRequest } from "@pixelfund/schemas";
import { MlService } from "../src/ml/ml.service";
import { resolveMlClientSettings } from "../src/ml/ml.config";

describe("ML client configuration", () => {
  test("defaults to shadow mode with the local ML service URL", () => {
    const settings = resolveMlClientSettings({});

    expect(settings.enabled).toBe(false);
    expect(settings.shadowMode).toBe(true);
    expect(settings.baseURL).toBe("http://localhost:4100");
  });

  test("can enable internal predictions without disabling shadow mode", () => {
    const settings = resolveMlClientSettings({
      ML_SERVICE_ENABLED: "true",
      ML_SERVICE_URL: "http://ml:4100",
      ML_SHADOW_MODE: "true"
    });

    expect(settings.enabled).toBe(true);
    expect(settings.shadowMode).toBe(true);
    expect(settings.baseURL).toBe("http://ml:4100");
  });
});

describe("ML service shadow predictions", () => {
  test("returns disabled shadow result without calling fetch when ML is off", async () => {
    const fetcher = jest.fn();
    const service = new MlService(
      {
        enabled: false,
        shadowMode: true,
        baseURL: "http://localhost:4100",
        timeoutMs: 1000
      },
      fetcher as any
    );

    await expect(service.predict(makePayload())).resolves.toEqual(
      expect.objectContaining({
        enabled: false,
        shadowMode: true,
        predictions: []
      })
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("fails closed when the ML service is unavailable", async () => {
    const fetcher = jest.fn(async () => {
      throw new Error("connection refused");
    });
    const service = new MlService(
      {
        enabled: true,
        shadowMode: true,
        baseURL: "http://localhost:4100",
        timeoutMs: 1000
      },
      fetcher as any
    );

    const result = await service.predict(makePayload());

    expect(result.enabled).toBe(true);
    expect(result.shadowMode).toBe(true);
    expect(result.predictions).toEqual([]);
    expect(result.errorReason).toContain("connection refused");
  });

  test("validates prediction responses from the Python service", async () => {
    const fetcher = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        modelVersion: "baseline-v1",
        generatedAt: "2026-06-15T10:00:00.000Z",
        predictions: [
          {
            horizon: "SWING_5_20D",
            probabilities: { BUY: 0.62, HOLD: 0.28, AVOID: 0.1 },
            recommendation: "BUY",
            calibratedConfidence: 0.62,
            expectedReturnBucket: "POSITIVE",
            topFeatures: [{ name: "trendUp", value: 1, contribution: 0.18 }]
          }
        ]
      })
    }));
    const service = new MlService(
      {
        enabled: true,
        shadowMode: true,
        baseURL: "http://localhost:4100",
        timeoutMs: 1000
      },
      fetcher as any
    );

    const result = await service.predict(makePayload());

    expect(result.predictions).toHaveLength(1);
    expect(result.predictions[0].horizon).toBe("SWING_5_20D");
    expect(fetcher).toHaveBeenCalledWith(
      "http://localhost:4100/predict",
      expect.objectContaining({ method: "POST" })
    );
  });
});

function makePayload(): MlPredictRequest {
  return {
    ticker: "AAPL",
    generatedAt: "2026-06-15T10:00:00.000Z",
    deterministicRecommendation: "BUY",
    deterministicConfidence: 0.7,
    horizons: ["SHORT_1_3D", "SWING_5_20D", "LONG_1_3M"],
    features: {
      quoteChangePercent: 1.2,
      dataQualityScore: 0.9
    }
  };
}
