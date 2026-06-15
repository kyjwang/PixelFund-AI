import { Inject, Injectable, Optional } from "@nestjs/common";
import { mlPredictResponseSchema, type MlPredictRequest, type MlPredictResponse } from "@pixelfund/schemas";
import { ML_CLIENT_SETTINGS, ML_FETCH, resolveMlClientSettings, type MlClientSettings } from "./ml.config";

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status?: number;
  text?: () => Promise<string>;
  json: () => Promise<unknown>;
}>;

export type MlShadowPredictionResult = {
  enabled: boolean;
  shadowMode: boolean;
  predictions: MlPredictResponse["predictions"];
  modelVersion?: string;
  generatedAt?: string;
  errorReason?: string;
};

@Injectable()
export class MlService {
  private readonly settings: MlClientSettings;
  private readonly fetcher: FetchLike;

  constructor(
    @Optional() @Inject(ML_CLIENT_SETTINGS) settings: MlClientSettings = resolveMlClientSettings(),
    @Optional() @Inject(ML_FETCH) fetcher: FetchLike = fetch as FetchLike
  ) {
    this.settings = settings;
    this.fetcher = fetcher;
  }

  async predict(payload: MlPredictRequest): Promise<MlShadowPredictionResult> {
    if (!this.settings.enabled) {
      return {
        enabled: false,
        shadowMode: this.settings.shadowMode,
        predictions: []
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.settings.timeoutMs);

    try {
      const response = await this.fetcher(`${this.settings.baseURL}/predict`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const detail = response.text ? await response.text() : `HTTP ${response.status ?? "error"}`;
        throw new Error(`ML service rejected prediction: ${detail}`);
      }

      const parsed = mlPredictResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error(`ML service response failed validation: ${parsed.error.message}`);

      return {
        enabled: true,
        shadowMode: this.settings.shadowMode,
        modelVersion: parsed.data.modelVersion,
        generatedAt: parsed.data.generatedAt,
        predictions: parsed.data.predictions
      };
    } catch (error) {
      return {
        enabled: true,
        shadowMode: this.settings.shadowMode,
        predictions: [],
        errorReason: error instanceof Error ? error.message : "Unknown ML service error"
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
