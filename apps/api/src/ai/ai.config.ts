export type AiProvider = "nvidia" | "openai" | "none";

export type AiClientSettings = {
  provider: AiProvider;
  enabled: boolean;
  model: string;
  apiKey?: string;
  baseURL?: string;
  warning?: string;
};

export function configured(value: string | undefined) {
  return Boolean(value && value.trim() && !value.startsWith("your_"));
}

export function looksLikeNvidiaApiKey(value: string | undefined) {
  return configured(value) && value!.trim().startsWith("nvapi-");
}

export function resolveAiClientSettings(env: NodeJS.ProcessEnv = process.env): AiClientSettings {
  const requestedModel = env.AI_MODEL ?? env.NVIDIA_MODEL ?? env.OPENAI_MODEL;
  const useNvidia =
    env.AI_PROVIDER === "nvidia" ||
    env.NVIDIA_BASE_URL !== undefined ||
    env.NVIDIA_MODEL !== undefined ||
    requestedModel === "openai/gpt-oss-20b";

  if (useNvidia) {
    const apiKey = configured(env.NVIDIA_API_KEY)
      ? env.NVIDIA_API_KEY
      : looksLikeNvidiaApiKey(env.OPENAI_API_KEY)
        ? env.OPENAI_API_KEY
        : undefined;

    return {
      provider: "nvidia",
      enabled: Boolean(apiKey),
      apiKey,
      baseURL: env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      model: requestedModel ?? "openai/gpt-oss-20b",
      warning: apiKey ? undefined : "NVIDIA_API_KEY is missing; deterministic agent output will be used."
    };
  }

  if (configured(env.OPENAI_API_KEY)) {
    return {
      provider: "openai",
      enabled: true,
      apiKey: env.OPENAI_API_KEY,
      model: requestedModel ?? "gpt-4.1-mini"
    };
  }

  return {
    provider: "none",
    enabled: false,
    model: requestedModel ?? "deterministic",
    warning: "No AI provider key is configured; deterministic agent output will be used."
  };
}
