import { Controller, Get } from "@nestjs/common";
import Redis from "ioredis";
import { PrismaService } from "../common/prisma.service";

type ComponentStatus = "OK" | "DEGRADED" | "DOWN";

type HealthComponent = {
  name: string;
  status: ComponentStatus;
  message: string;
  checkedAt: string;
};

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async health() {
    const checkedAt = new Date().toISOString();
    const [database, redis] = await Promise.all([this.checkDatabase(checkedAt), this.checkRedis(checkedAt)]);
    const marketData = configuredComponent("marketData", "Finnhub", "FINNHUB_API_KEY", checkedAt);
    const ai = aiComponent(checkedAt);
    const components = {
      api: component("api", "OK", "Nest API is responding.", checkedAt),
      database,
      redis,
      marketData,
      ai
    };
    const statuses = Object.values(components).map((item) => item.status);
    const status: ComponentStatus = statuses.includes("DOWN") ? "DOWN" : statuses.includes("DEGRADED") ? "DEGRADED" : "OK";

    return {
      ok: status !== "DOWN",
      status,
      service: "pixelfund-api",
      version: process.env.npm_package_version ?? "1.0.0",
      uptimeSeconds: Math.round(process.uptime()),
      checkedAt,
      components
    };
  }

  private async checkDatabase(checkedAt: string): Promise<HealthComponent> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return component("database", "OK", "PostgreSQL query succeeded.", checkedAt);
    } catch {
      return component("database", "DOWN", "PostgreSQL query failed.", checkedAt);
    }
  }

  private async checkRedis(checkedAt: string): Promise<HealthComponent> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return component("redis", "DOWN", "REDIS_URL is missing.", checkedAt);

    const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 0, enableReadyCheck: false });
    try {
      await redis.connect();
      await redis.ping();
      return component("redis", "OK", "Redis ping succeeded.", checkedAt);
    } catch {
      return component("redis", "DOWN", "Redis ping failed.", checkedAt);
    } finally {
      redis.disconnect();
    }
  }
}

function component(name: string, status: ComponentStatus, message: string, checkedAt: string): HealthComponent {
  return { name, status, message, checkedAt };
}

function configuredComponent(name: string, label: string, envKey: string, checkedAt: string): HealthComponent {
  const value = process.env[envKey];
  if (!value || value.startsWith("your_")) return component(name, "DEGRADED", `${label} is not configured; fallback data may be used.`, checkedAt);
  return component(name, "OK", `${label} configuration is present.`, checkedAt);
}

function aiComponent(checkedAt: string): HealthComponent {
  const provider = process.env.AI_PROVIDER === "nvidia" ? "NVIDIA" : "OpenAI";
  const envKey = process.env.AI_PROVIDER === "nvidia" ? "NVIDIA_API_KEY" : "OPENAI_API_KEY";
  const value = process.env[envKey] ?? (envKey === "NVIDIA_API_KEY" ? process.env.OPENAI_API_KEY : undefined);
  if (!value || value.startsWith("your_")) return component("ai", "DEGRADED", `${provider} key is not configured; agent output may use fallback behavior.`, checkedAt);
  return component("ai", "OK", `${provider} configuration is present.`, checkedAt);
}
