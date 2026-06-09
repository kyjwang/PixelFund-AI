import { describe, expect, test } from "@jest/globals";
import { resolveAiClientSettings } from "../src/ai/ai.config";

describe("AI provider configuration", () => {
  test("does not send an OpenAI key to NVIDIA when NVIDIA_API_KEY is missing", () => {
    const settings = resolveAiClientSettings({
      AI_PROVIDER: "nvidia",
      NVIDIA_BASE_URL: "https://integrate.api.nvidia.com/v1",
      NVIDIA_MODEL: "openai/gpt-oss-20b",
      OPENAI_API_KEY: "sk-openai-test-key"
    });

    expect(settings.enabled).toBe(false);
    expect(settings.provider).toBe("nvidia");
    expect(settings.warning).toContain("NVIDIA_API_KEY");
  });

  test("accepts NVIDIA keys passed through the OpenAI-compatible key slot", () => {
    const settings = resolveAiClientSettings({
      AI_PROVIDER: "nvidia",
      OPENAI_API_KEY: "nvapi-test-key"
    });

    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBe("nvidia");
    expect(settings.apiKey).toBe("nvapi-test-key");
  });
});
