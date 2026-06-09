"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_DISCLAIMER } from "@pixelfund/config";
import { PixelButton, PixelCard } from "../../components/GameUI";
import { setDemoUser } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const displayName = name.trim() || "Pixel Trader";
  const initials = useMemo(() => initialsFor(displayName), [displayName]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDemoUser(name);
    router.replace("/");
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden px-3 py-5 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100dvh-40px)] max-w-[1400px] gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
        <section className="glass-panel pixel-panel relative min-h-[560px] overflow-hidden rounded-[8px]">
          <LoginOfficeScene displayName={displayName} initials={initials} />
          <div className="absolute left-4 top-24 z-20 max-w-[calc(100%-32px)] sm:left-8 sm:top-28">
            <p className="glass-chip inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase text-slate-700">
              Simulation floor
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-[0.98] tracking-normal text-slate-950 sm:text-7xl">
              PixelFund AI
            </h1>
            <p className="mt-4 max-w-md rounded-[8px] border border-white/60 bg-white/62 p-3 text-sm font-medium leading-6 text-slate-700 shadow-[0_16px_36px_rgba(15,23,42,0.1)] backdrop-blur">
              Research stocks, test orders, and manage a browser-isolated portfolio without real brokerage risk.
            </p>
          </div>
        </section>

        <section className="grid content-center gap-4">
          <PixelCard title="Simulator Login" eyebrow="browser account">
            <div className="mb-4 grid grid-cols-[86px_1fr] items-center gap-3 rounded-[8px] border border-white/60 bg-white/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <div className="relative h-20 w-20 rounded-[8px] border border-slate-950/10 bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                <span className="absolute left-1/2 top-2 h-5 w-9 -translate-x-1/2 border-2 border-slate-950 bg-[#1e293b]" />
                <span className="absolute left-1/2 top-6 grid h-10 w-12 -translate-x-1/2 place-items-center border-2 border-slate-950 bg-[#f0b98d] font-pixel text-xs">
                  {initials}
                </span>
                <span className="absolute bottom-1 left-1/2 h-5 w-14 -translate-x-1/2 border-2 border-slate-950 bg-[color:var(--pf-accent)]" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-pixel text-sm leading-7">{displayName}</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">Your local simulation account stays isolated in this browser.</p>
                <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
                  <span className="h-2 rounded-full bg-emerald-400" />
                  <span className="h-2 rounded-full bg-amber-300" />
                  <span className="h-2 rounded-full bg-sky-400" />
                  <span className="h-2 rounded-full bg-rose-400" />
                  <span className="h-2 rounded-full bg-orange-400" />
                </div>
              </div>
            </div>
            <form className="grid gap-3" onSubmit={submit}>
              <label className="grid gap-1 text-xs font-black uppercase" htmlFor="callsign">
                Trader name
                <input
                  id="callsign"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pixel Trader"
                  className="h-12 rounded-[8px] border border-white/70 bg-white/70 px-3 font-pixel text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_28px_rgba(15,23,42,0.08)] outline-none backdrop-blur focus:bg-white/95"
                />
              </label>
              <PixelButton type="submit" tone="magic" glow>
                Enter Office
              </PixelButton>
            </form>
            <p className="mt-4 rounded-[8px] border border-white/60 bg-white/50 p-2.5 text-xs leading-5 text-slate-700">
              {APP_DISCLAIMER}
            </p>
          </PixelCard>
        </section>
      </div>
    </main>
  );
}

function LoginOfficeScene({ displayName, initials }: { displayName: string; initials: string }) {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.52),rgba(255,255,255,0.08))]" />
      <div className="absolute inset-x-0 top-0 h-32 border-b border-white/45 bg-sky-200/38 backdrop-blur" />
      <div className="absolute inset-x-0 top-32 h-16 bg-amber-200/28" />
      <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[length:24px_24px]" />
      <div className="absolute left-[8%] top-10 grid h-20 w-[34%] grid-cols-4 gap-2 rounded-[8px] border border-white/65 bg-white/42 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
        <span className="rounded-[4px] bg-amber-100" />
        <span className="rounded-[4px] bg-emerald-100" />
        <span className="rounded-[4px] bg-rose-100" />
        <span className="rounded-[4px] bg-white/80" />
        <span className="col-span-4 rounded-[4px] bg-slate-950 shadow-[inset_8px_0_0_#22c55e,inset_18px_0_0_#facc15,inset_32px_0_0_#ef4444]" />
      </div>
      <div className="absolute right-[7%] top-10 h-20 w-[26%] rounded-[8px] border border-white/65 bg-white/46 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
        <span className="block h-3.5 w-[76%] rounded-full bg-emerald-400" />
        <span className="mt-2 block h-3.5 w-[58%] rounded-full bg-sky-400" />
        <span className="mt-2 block h-3.5 w-[88%] rounded-full bg-amber-300" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[45%] border-t border-slate-950/10 bg-[#8c6a55]" />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:34px_28px]" />
      <div className="absolute bottom-[34%] left-[8%] h-24 w-[84%] rounded-[8px] border border-white/58 bg-white/48 shadow-[0_20px_46px_rgba(15,23,42,0.13)] backdrop-blur" />
      <div className="absolute bottom-[39%] left-[12%] h-10 w-[18%] border-2 border-slate-950 bg-sky-100 shadow-[inset_0_-8px_0_#2563eb]" />
      <div className="absolute bottom-[39%] left-[34%] h-10 w-[18%] border-2 border-slate-950 bg-amber-100 shadow-[inset_0_-8px_0_#ca8a04]" />
      <div className="absolute bottom-[39%] left-[56%] h-10 w-[18%] border-2 border-slate-950 bg-emerald-100 shadow-[inset_0_-8px_0_#16a34a]" />
      <div className="absolute bottom-[39%] left-[78%] h-10 w-[10%] border-2 border-slate-950 bg-rose-100 shadow-[inset_0_-8px_0_#db2777]" />
      <div className="absolute bottom-[15%] left-[18%] h-28 w-[64%] rounded-[8px] border border-slate-950/10 bg-[#4b372f] shadow-[0_18px_40px_rgba(15,23,42,0.18)]" />
      <div className="absolute bottom-[23%] left-1/2 h-20 w-24 -translate-x-1/2 border-[3px] border-slate-950 bg-[color:var(--pf-accent)] shadow-[4px_4px_0_rgba(15,23,42,0.8)]">
        <span className="absolute left-1/2 top-[-48px] h-12 w-14 -translate-x-1/2 border-[3px] border-slate-950 bg-[#f0b98d]" />
        <span className="absolute left-1/2 top-[-62px] h-5 w-16 -translate-x-1/2 border-[3px] border-slate-950 bg-[#1e293b]" />
        <span className="absolute left-1/2 top-[-34px] -translate-x-1/2 font-pixel text-[10px] text-slate-950">{initials}</span>
      </div>
      <div className="glass-chip absolute bottom-[10%] left-1/2 max-w-[72%] -translate-x-1/2 truncate rounded-full px-4 py-3 text-center font-pixel text-xs">
        {displayName}
      </div>
    </div>
  );
}

function initialsFor(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PT";
}
