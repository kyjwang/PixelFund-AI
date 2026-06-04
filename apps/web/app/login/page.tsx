"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_DISCLAIMER } from "@pixelfund/config";
import { PixelButton, PixelCard } from "../../components/GameUI";
import { setDemoUser } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDemoUser(name);
    router.replace("/");
  }

  return (
    <main className="grid min-h-screen place-items-center px-3 py-8 text-slate-950">
      <div className="grid w-full max-w-5xl gap-4 lg:grid-cols-[1fr_380px] lg:items-center">
        <section className="pixel-panel relative min-h-[420px] overflow-hidden rounded-[6px] border-4 border-black bg-[#101827] p-4 shadow-[8px_8px_0_#111]">
          <div className="absolute inset-x-0 bottom-0 h-28 border-t-4 border-black bg-[#4f3422]" />
          <div className="absolute bottom-16 left-8 h-32 w-44 border-4 border-black bg-[#0c7c59] shadow-[5px_5px_0_#050505]">
            <div className="grid h-full grid-cols-3 gap-2 p-3">
              <span className="border-2 border-black bg-emerald-200" />
              <span className="border-2 border-black bg-amber-200" />
              <span className="border-2 border-black bg-red-200" />
              <span className="col-span-3 border-2 border-black bg-[#bbf7d0]" />
            </div>
          </div>
          <div className="absolute bottom-16 right-10 h-40 w-40 border-4 border-black bg-[#fff8e7] shadow-[5px_5px_0_#050505]">
            <div className="mx-auto mt-8 h-14 w-14 border-4 border-black bg-[#7c3aed]" />
            <div className="mx-auto mt-3 h-10 w-24 border-4 border-black bg-[#d9f0e8]" />
          </div>
          <div className="relative z-10 max-w-xl">
            <p className="mb-3 inline-flex border-2 border-black bg-[#fef3c7] px-2 py-1 text-[10px] font-black uppercase">
              Fake-money simulator
            </p>
            <h1 className="font-pixel text-2xl leading-10 text-[#fef3c7] sm:text-4xl sm:leading-[3.5rem]">
              PixelTrade AI
            </h1>
            <p className="mt-4 max-w-md border-4 border-black bg-[#fffdf4] p-3 text-sm leading-6 shadow-[5px_5px_0_#050505]">
              Enter the retro trading office, manage a demo portfolio, and ask your AI committee for simulated analysis.
            </p>
          </div>
        </section>

        <PixelCard title="Desk Login" eyebrow="demo account" className="bg-[#fff8e7]">
          <form className="grid gap-3" onSubmit={submit}>
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="callsign">
              Trader name
              <input
                id="callsign"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Pixel Trader"
                className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm outline-none focus:bg-white"
              />
            </label>
            <PixelButton type="submit" tone="magic" glow>
              Start Shift
            </PixelButton>
          </form>
          <p className="mt-4 border-2 border-black bg-white p-2 text-xs leading-5 text-slate-700">
            {APP_DISCLAIMER}
          </p>
        </PixelCard>
      </div>
    </main>
  );
}

