import { z } from "zod";
import { errorEnvelopeSchema } from "@pixelfund/schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const successEnvelopeSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({ data: schema });

export async function api<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const demoUserId = demoAccountKey();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-demo-user-id": demoUserId, ...(init?.headers ?? {}) },
      cache: "no-store"
    });
  } catch {
    throw new Error("Backend offline. Start the API stack to load live portfolio and agent data.");
  }

  const json = await res.json();
  if (!res.ok) {
    const parsed = errorEnvelopeSchema.safeParse(json);
    throw new Error(parsed.success ? parsed.data.error.message : "Request failed");
  }

  const parsed = successEnvelopeSchema(schema).parse(json);
  return parsed.data as T;
}

function demoAccountKey() {
  if (typeof window === "undefined") return "demo";
  const existing = window.localStorage.getItem("pixelfund.demoUserId");
  if (existing) return existing;
  const created = `demo-${crypto.randomUUID()}`;
  window.localStorage.setItem("pixelfund.demoUserId", created);
  return created;
}
