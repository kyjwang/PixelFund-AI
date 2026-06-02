const required = ["DATABASE_URL", "REDIS_URL"] as const;
const optionalDemoKeys = ["FINNHUB_API_KEY", "OPENAI_API_KEY", "NVIDIA_API_KEY"] as const;

export function validateEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  for (const key of optionalDemoKeys) {
    if (
      key === "NVIDIA_API_KEY" &&
      process.env.AI_PROVIDER === "nvidia" &&
      process.env.OPENAI_API_KEY &&
      !process.env.OPENAI_API_KEY.startsWith("your_")
    ) {
      continue;
    }
    const value = process.env[key];
    if (!value || value.startsWith("your_")) {
      console.warn(`${key} is not configured; related features will use visible demo/fallback behavior.`);
    }
  }
}
