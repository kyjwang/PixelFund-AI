export type MlClientSettings = {
  enabled: boolean;
  shadowMode: boolean;
  baseURL: string;
  timeoutMs: number;
};

export const ML_CLIENT_SETTINGS = Symbol("ML_CLIENT_SETTINGS");
export const ML_FETCH = Symbol("ML_FETCH");

export function resolveMlClientSettings(env: NodeJS.ProcessEnv = process.env): MlClientSettings {
  return {
    enabled: env.ML_SERVICE_ENABLED === "true",
    shadowMode: env.ML_SHADOW_MODE !== "false",
    baseURL: (env.ML_SERVICE_URL ?? "http://localhost:4100").replace(/\/+$/, ""),
    timeoutMs: Number(env.ML_SERVICE_TIMEOUT_MS ?? "2500")
  };
}
