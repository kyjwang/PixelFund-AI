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
    <main className="min-h-screen overflow-hidden px-3 py-6 text-slate-950 sm:px-5 lg:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-7xl gap-4 lg:grid-cols-[1fr_410px] lg:items-stretch">
        <section className="pixel-panel relative min-h-[560px] overflow-hidden rounded-[6px] border-4 border-black bg-[#9bd8d0] shadow-[8px_8px_0_#111]">
          <LoginOfficeScene displayName={displayName} initials={initials} />
          <div className="absolute left-4 top-36 z-20 max-w-[calc(100%-32px)] sm:left-8 sm:top-40">
            <p className="inline-flex border-2 border-black bg-[#fef3c7] px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0_#111]">
              Simulation floor
            </p>
            <h1 className="mt-3 max-w-xl font-pixel text-3xl leading-[3rem] text-slate-950 sm:text-5xl sm:leading-[4.25rem]">
              PixelFund AI
            </h1>
          </div>
        </section>

        <section className="grid gap-4 content-center">
          <PixelCard title="Desk Login" eyebrow="browser simulation account" className="bg-[#fff8e7]">
            <div className="mb-4 grid grid-cols-[86px_1fr] items-center gap-3 border-4 border-black bg-[#f7fff7] p-3 shadow-[4px_4px_0_#111]">
              <div className="relative h-20 w-20 border-4 border-black bg-[#d9f0e8]">
                <span className="absolute left-1/2 top-2 h-5 w-9 -translate-x-1/2 border-2 border-black bg-[#1e293b]" />
                <span className="absolute left-1/2 top-6 grid h-10 w-12 -translate-x-1/2 place-items-center border-2 border-black bg-[#f0b98d] font-pixel text-xs">
                  {initials}
                </span>
                <span className="absolute bottom-1 left-1/2 h-5 w-14 -translate-x-1/2 border-2 border-black bg-[#7c3aed]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-slate-600">Active desk</p>
                <p className="truncate font-pixel text-sm leading-7">{displayName}</p>
                <div className="mt-2 grid grid-cols-5 gap-1" aria-hidden="true">
                  <span className="h-3 border border-black bg-[#22c55e]" />
                  <span className="h-3 border border-black bg-[#facc15]" />
                  <span className="h-3 border border-black bg-[#38bdf8]" />
                  <span className="h-3 border border-black bg-[#f472b6]" />
                  <span className="h-3 border border-black bg-[#fb923c]" />
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
                  className="h-12 border-4 border-black bg-white px-3 font-pixel text-sm outline-none shadow-[3px_3px_0_#111] focus:bg-[#f7fff7]"
                />
              </label>
              <PixelButton type="submit" tone="magic" glow>
                Enter Office
              </PixelButton>
            </form>
            <p className="mt-4 border-2 border-black bg-white p-2 text-xs leading-5 text-slate-700">
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
      <div className="absolute inset-x-0 top-0 h-32 border-b-4 border-black bg-[#8bd3dd]" />
      <div className="absolute left-[8%] top-10 grid h-20 w-[34%] grid-cols-4 gap-2 border-4 border-black bg-[#dbeafe] p-2 shadow-[4px_4px_0_#111]">
        <span className="border-2 border-black bg-[#fef3c7]" />
        <span className="border-2 border-black bg-[#bbf7d0]" />
        <span className="border-2 border-black bg-[#fbcfe8]" />
        <span className="border-2 border-black bg-white" />
        <span className="col-span-4 border-2 border-black bg-[#0f172a] shadow-[inset_8px_0_0_#22c55e,inset_18px_0_0_#facc15,inset_32px_0_0_#ef4444]" />
      </div>
      <div className="absolute right-[7%] top-10 h-20 w-[26%] border-4 border-black bg-[#fff8e7] p-2 shadow-[4px_4px_0_#111]">
        <span className="block h-4 w-[76%] border-2 border-black bg-[#22c55e]" />
        <span className="mt-2 block h-4 w-[58%] border-2 border-black bg-[#38bdf8]" />
        <span className="mt-2 block h-4 w-[88%] border-2 border-black bg-[#facc15]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[45%] border-t-4 border-black bg-[#6b4634]" />
      <div className="absolute bottom-[34%] left-[8%] h-24 w-[84%] border-4 border-black bg-[#f7fff7] shadow-[6px_6px_0_#111]" />
      <div className="absolute bottom-[39%] left-[12%] h-10 w-[18%] border-2 border-black bg-[#dbeafe] shadow-[inset_0_-8px_0_#2563eb]" />
      <div className="absolute bottom-[39%] left-[34%] h-10 w-[18%] border-2 border-black bg-[#fef3c7] shadow-[inset_0_-8px_0_#ca8a04]" />
      <div className="absolute bottom-[39%] left-[56%] h-10 w-[18%] border-2 border-black bg-[#dcfce7] shadow-[inset_0_-8px_0_#16a34a]" />
      <div className="absolute bottom-[39%] left-[78%] h-10 w-[10%] border-2 border-black bg-[#fbcfe8] shadow-[inset_0_-8px_0_#db2777]" />
      <div className="absolute bottom-[15%] left-[18%] h-28 w-[64%] border-4 border-black bg-[#3d2b24] shadow-[6px_6px_0_#111]" />
      <div className="absolute bottom-[23%] left-1/2 h-20 w-24 -translate-x-1/2 border-4 border-black bg-[#7c3aed] shadow-[4px_4px_0_#111]">
        <span className="absolute left-1/2 top-[-48px] h-12 w-14 -translate-x-1/2 border-4 border-black bg-[#f0b98d]" />
        <span className="absolute left-1/2 top-[-62px] h-5 w-16 -translate-x-1/2 border-4 border-black bg-[#1e293b]" />
        <span className="absolute left-1/2 top-[-34px] -translate-x-1/2 font-pixel text-[10px] text-slate-950">{initials}</span>
      </div>
      <div className="absolute bottom-[10%] left-1/2 max-w-[72%] -translate-x-1/2 border-4 border-black bg-white px-4 py-3 text-center font-pixel text-xs shadow-[4px_4px_0_#111]">
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
