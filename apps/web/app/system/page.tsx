"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { providerCapabilitiesSchema, systemHealthSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatusBadge } from "../../components/GameUI";
import { api } from "../../lib/api";

type SystemHealth = z.infer<typeof systemHealthSchema>;
type ProviderCapabilities = z.infer<typeof providerCapabilitiesSchema>;

const checkOrder = ["api", "database", "redis", "marketData", "ai"] as const;

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [providers, setProviders] = useState<ProviderCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [nextHealth, nextProviders] = await Promise.all([
        api("/health", systemHealthSchema),
        api("/market/providers/capabilities", providerCapabilitiesSchema)
      ]);
      setHealth(nextHealth);
      setProviders(nextProviders);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load system state");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const readyCount = useMemo(() => {
    if (!health) return 0;
    return checkOrder.filter((key) => health.components[key].status === "OK").length;
  }, [health]);

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="System Console" eyebrow="fullstack readiness">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={health?.status ?? "LOADING"} tone={health?.status === "OK" ? "good" : health?.status === "DOWN" ? "bad" : undefined} />
              <span className="glass-chip rounded-full px-2.5 py-1 text-xs font-bold">
                {readyCount}/{checkOrder.length} ready
              </span>
              <span className="glass-chip rounded-full px-2.5 py-1 text-xs font-bold">
                API uptime {health ? formatDuration(health.uptimeSeconds) : "--"}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">
              Last check: {health ? new Date(health.checkedAt).toLocaleString() : "pending"}
            </p>
          </div>
          <PixelButton onClick={() => void refresh()} disabled={loading} tone="magic">
            {loading ? "Checking" : "Refresh"}
          </PixelButton>
        </div>
      </PixelCard>

      {error ? <p className="glass-panel rounded-[8px] border-red-200/80 bg-red-100/80 p-3 text-sm text-red-950">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PixelCard title="Stack Components" eyebrow="api / data / providers">
          <div className="grid gap-2">
            {checkOrder.map((key) => {
              const item = health?.components[key];
              return (
                <div key={key} className="glass-chip grid gap-2 rounded-[8px] p-3 sm:grid-cols-[140px_110px_1fr] sm:items-center">
                  <p className="font-pixel text-[10px] uppercase">{labelFor(key)}</p>
                  <StatusBadge value={item?.status ?? "LOADING"} tone={item?.status === "OK" ? "good" : item?.status === "DOWN" ? "bad" : undefined} />
                  <p className="text-xs leading-5 text-slate-700">{item?.message ?? "Waiting for backend response."}</p>
                </div>
              );
            })}
          </div>
        </PixelCard>

        <PixelCard title="Runtime Checklist" eyebrow="project surface">
          <div className="grid gap-2 text-xs">
            <CheckLine label="Web app" done={Boolean(health)} detail="Next.js app renders authenticated simulation routes." />
            <CheckLine label="API envelope" done={Boolean(health?.components.api.status === "OK")} detail="Nest API returns shared-schema payloads." />
            <CheckLine label="Database" done={Boolean(health?.components.database.status === "OK")} detail="Portfolio, orders, trades, watchlists, and analyses persist." />
            <CheckLine label="Realtime" done={Boolean(health?.components.redis.status === "OK")} detail="Redis-backed jobs and websocket flows are available." />
            <CheckLine label="Trading gate" done={Boolean(health?.components.marketData.status === "OK")} detail="Order execution can require live provider data." />
          </div>
        </PixelCard>
      </section>

      <PixelCard title="Market Providers" eyebrow="capabilities">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(providers?.providers ?? []).map((provider) => (
            <div key={provider.name} className="glass-chip rounded-[8px] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-pixel text-[10px] uppercase">{provider.name}</p>
                  <p className="mt-1 text-xs text-slate-600">Priority {provider.priority} / poll {provider.minPollMs}ms</p>
                </div>
                <StatusBadge value={provider.status} tone={provider.status === "ENABLED" ? "good" : provider.status === "DISABLED" ? "bad" : undefined} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1 text-[10px] font-bold uppercase">
                <Capability label="Quotes" value={provider.supportsQuotes} />
                <Capability label="History" value={provider.supportsHistory} />
                <Capability label="News" value={provider.supportsNews} />
                <Capability label="Search" value={provider.supportsSearch} />
              </div>
              {provider.notes.length ? <p className="mt-3 rounded-[8px] border border-white/60 bg-white/54 p-2 text-xs leading-5">{provider.notes[0]}</p> : null}
            </div>
          ))}
          {!providers?.providers.length ? <p className="glass-chip rounded-[8px] p-3 text-xs text-slate-600">Provider capability data is loading.</p> : null}
        </div>
      </PixelCard>
    </main>
  );
}

function CheckLine({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className="glass-chip grid grid-cols-[18px_110px_1fr] gap-2 rounded-[8px] p-2">
      <span className={`mt-0.5 h-3 w-3 rounded-full ${done ? "bg-emerald-400" : "bg-amber-300"}`} aria-hidden="true" />
      <span className="font-black uppercase">{label}</span>
      <span className="text-slate-700">{detail}</span>
    </div>
  );
}

function Capability({ label, value }: { label: string; value: boolean }) {
  return <span className={`rounded-full border px-2 py-1 ${value ? "border-emerald-200/80 bg-emerald-100/80 text-emerald-950" : "border-slate-200 bg-slate-100/70 text-slate-500"}`}>{label}</span>;
}

function labelFor(key: (typeof checkOrder)[number]) {
  const labels = {
    api: "API",
    database: "Database",
    redis: "Redis",
    marketData: "Market data",
    ai: "AI provider"
  };
  return labels[key];
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 1) return `${secs}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 1) return `${mins}m ${secs}s`;
  return `${hours}h ${mins % 60}m`;
}
