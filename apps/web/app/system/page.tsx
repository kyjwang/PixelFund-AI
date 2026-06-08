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
      <PixelCard title="System Console" eyebrow="fullstack readiness" className="bg-[#fff8e7]">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={health?.status ?? "LOADING"} tone={health?.status === "OK" ? "good" : health?.status === "DOWN" ? "bad" : undefined} />
              <span className="border-2 border-black bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#111]">
                {readyCount}/{checkOrder.length} ready
              </span>
              <span className="border-2 border-black bg-white px-2 py-1 text-xs font-bold shadow-[2px_2px_0_#111]">
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

      {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <PixelCard title="Stack Components" eyebrow="api / data / providers">
          <div className="grid gap-2">
            {checkOrder.map((key) => {
              const item = health?.components[key];
              return (
                <div key={key} className="grid gap-2 border-2 border-black bg-[#f7fff7] p-3 sm:grid-cols-[140px_110px_1fr] sm:items-center">
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
            <div key={provider.name} className="border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111]">
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
              {provider.notes.length ? <p className="mt-3 border-2 border-black bg-[#fff8e7] p-2 text-xs leading-5">{provider.notes[0]}</p> : null}
            </div>
          ))}
          {!providers?.providers.length ? <p className="border-2 border-black bg-white p-3 text-xs text-slate-600">Provider capability data is loading.</p> : null}
        </div>
      </PixelCard>
    </main>
  );
}

function CheckLine({ label, done, detail }: { label: string; done: boolean; detail: string }) {
  return (
    <div className="grid grid-cols-[18px_110px_1fr] gap-2 border-2 border-black bg-white p-2">
      <span className={`mt-0.5 h-3 w-3 border-2 border-black ${done ? "bg-emerald-300" : "bg-amber-200"}`} aria-hidden="true" />
      <span className="font-black uppercase">{label}</span>
      <span className="text-slate-700">{detail}</span>
    </div>
  );
}

function Capability({ label, value }: { label: string; value: boolean }) {
  return <span className={`border border-black px-2 py-1 ${value ? "bg-emerald-100 text-emerald-950" : "bg-slate-100 text-slate-500"}`}>{label}</span>;
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
