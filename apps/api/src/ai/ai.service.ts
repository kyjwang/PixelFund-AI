import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { z } from "zod";
import type { AgentAnalysisOutput } from "@pixelfund/domain";
import type { MarketContext } from "@pixelfund/schemas";

const narrationSchema = z.object({
  summary: z.string(),
  reasons: z.array(z.string()).min(1)
});

type Narration = z.infer<typeof narrationSchema>;

function configured(value: string | undefined) {
  return Boolean(value && value.trim() && !value.startsWith("your_"));
}

function extractNarration(value: unknown): Narration | null {
  const direct = narrationSchema.safeParse(value);
  if (direct.success) return direct.data;

  if (!value || typeof value !== "object") return null;
  for (const child of Object.values(value)) {
    const nested = extractNarration(child);
    if (nested) return nested;
  }
  return null;
}

function parseNarration(content: string): Narration | null {
  try {
    return extractNarration(JSON.parse(content));
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return extractNarration(JSON.parse(match[0]));
    } catch {
      return null;
    }
  }
}

@Injectable()
export class AiService {
  private client: OpenAI | null = null;
  private model: string = "";

  constructor() {
    const requestedModel = process.env.AI_MODEL ?? process.env.NVIDIA_MODEL ?? process.env.OPENAI_MODEL;
    const useNvidia =
      process.env.AI_PROVIDER === "nvidia" ||
      process.env.NVIDIA_BASE_URL !== undefined ||
      process.env.NVIDIA_MODEL !== undefined ||
      requestedModel === "openai/gpt-oss-20b";

    const nvidiaApiKey = configured(process.env.NVIDIA_API_KEY)
      ? process.env.NVIDIA_API_KEY
      : useNvidia && configured(process.env.OPENAI_API_KEY)
        ? process.env.OPENAI_API_KEY
        : undefined;
    const nvidiaBaseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

    if (nvidiaApiKey) {
      this.client = new OpenAI({
        baseURL: nvidiaBaseUrl,
        apiKey: nvidiaApiKey
      });
      this.model = requestedModel ?? "openai/gpt-oss-20b";
    } else if (configured(process.env.OPENAI_API_KEY)) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.model = requestedModel ?? "gpt-4.1-mini";
    }
  }

  async analyze(agent: string, ticker: string, context: MarketContext, base: AgentAnalysisOutput): Promise<AgentAnalysisOutput> {
    if (!this.client) {
      return {
        ...base,
        reasons: [
          ...base.reasons,
          "Deterministic agent engine used; configure NVIDIA_API_KEY or OPENAI_API_KEY for narrative polishing."
        ].slice(0, 6)
      };
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You polish explanations for an educational stock simulator. Preserve the supplied recommendation, score, and confidence. Do not introduce facts that are not in the supplied market context. Return strict JSON only."
          },
          {
            role: "user",
            content:
              "Return exactly one JSON object with this TypeScript shape: " +
              '{"summary": string, "reasons": string[]}. ' +
              "Do not include the input payload, markdown, explanations, or extra top-level keys.\n\n" +
              JSON.stringify({
                agent,
                ticker,
                fixedDecision: {
                  recommendation: base.recommendation,
                  confidence: base.confidence,
                  score: base.score,
                  summary: base.summary,
                  reasons: base.reasons
                },
                marketContext: context,
                instruction:
                  "Rewrite only the summary and reasons for clarity. Mention data gaps when dataQuality warnings exist. Keep reasons evidence-based and concise."
              })
          }
        ],
        temperature: 1,
        top_p: 1,
        max_tokens: 4096,
        stream: false,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from AI service");

      const parsed = parseNarration(content);
      if (!parsed) {
        return {
          ...base,
          reasons: [...base.reasons, "AI narration format was invalid; deterministic agent output retained."].slice(0, 6)
        };
      }

      return {
        ...base,
        summary: parsed.summary,
        reasons: [...parsed.reasons, ...context.dataQuality.warnings].slice(0, 6)
      };
    } catch (error) {
      console.error("AI analysis error:", error);
      return {
        ...base,
        reasons: [...base.reasons, "AI narration failed; deterministic agent output retained."].slice(0, 6)
      };
    }
  }
}
