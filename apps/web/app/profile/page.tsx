"use client";

import { FormEvent, useEffect, useState } from "react";
import { z } from "zod";
import { analysisRunSchema, portfolioSchema, tradeSchema, watchlistItemSchema } from "@pixelfund/schemas";
import { PixelButton, PixelCard, StatTile } from "../../components/GameUI";
import { getDemoUser, updateDemoUser, type DemoUser } from "../../lib/auth";
import { api } from "../../lib/api";

type Portfolio = z.infer<typeof portfolioSchema>;

const avatarColors = ["#7c3aed", "#0c7c59", "#2563eb", "#db2777", "#f97316", "#475569"];

export default function ProfilePage() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [completedAnalyses, setCompletedAnalyses] = useState(0);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [tradeCount, setTradeCount] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [preferredTicker, setPreferredTicker] = useState("AAPL");
  const [avatarColor, setAvatarColor] = useState("#7c3aed");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [p, runs, watchlist, trades] = await Promise.all([
        api("/portfolio", portfolioSchema),
        api("/analysis-runs", z.array(analysisRunSchema)),
        api("/watchlist", z.array(watchlistItemSchema)),
        api("/trades?limit=100", z.array(tradeSchema))
      ]);
      setPortfolio(p);
      setCompletedAnalyses(runs.filter((run) => run.status === "COMPLETED").length);
      setWatchlistCount(watchlist.length);
      setTradeCount(trades.length);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load profile stats");
    }
  }

  useEffect(() => {
    const nextUser = getDemoUser();
    setUser(nextUser);
    setName(nextUser?.name ?? "Pixel Trader");
    setTitle(nextUser?.title ?? "Demo Portfolio Captain");
    setPreferredTicker(nextUser?.preferredTicker ?? "AAPL");
    setAvatarColor(nextUser?.avatarColor ?? "#7c3aed");
    void refresh();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = updateDemoUser({ name, title, preferredTicker, avatarColor });
    setUser(updated);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  const initials = initialsFor(name || user?.name || "Pixel Trader");
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Today";

  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-4 md:px-6">
      <PixelCard title="Trader Profile" eyebrow="local identity" className="bg-[#fff8e7]">
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="grid justify-items-center gap-3">
            <div className="relative h-36 w-32 border-4 border-black bg-[#d9f0e8] shadow-[6px_6px_0_#111]" aria-label="Profile picture">
              <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 border-4 border-black bg-[#f0b98d]" />
              <div className="absolute left-1/2 top-1 h-8 w-20 -translate-x-1/2 border-4 border-black" style={{ backgroundColor: avatarColor }} />
              <div className="absolute bottom-4 left-1/2 grid h-14 w-24 -translate-x-1/2 place-items-center border-4 border-black font-pixel text-xl text-white" style={{ backgroundColor: avatarColor }}>
                {initials}
              </div>
            </div>
            <p className="font-pixel text-xs">{user?.name ?? "Pixel Trader"}</p>
            <p className="text-xs font-semibold uppercase text-slate-600">{title}</p>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-4">
              <StatTile label="Virtual Cash" value={formatMoney(portfolio?.cash ?? 0)} />
              <StatTile label="Portfolio" value={formatMoney(portfolio?.totalValue ?? 0)} />
              <StatTile label="Analyses" value={`${completedAnalyses}`} />
              <StatTile label="Trades" value={`${tradeCount}`} />
              <StatTile label="Watchlist" value={`${watchlistCount}`} />
              <StatTile label="Preferred" value={preferredTicker.toUpperCase()} />
              <StatTile label="Joined" value={joined} />
              <StatTile label="P&L" value={`${formatMoney(portfolio?.totalPnl ?? 0)} (${formatSignedPercent(portfolio?.totalPnlPercent ?? 0)})`} tone={(portfolio?.totalPnl ?? 0) >= 0 ? "good" : "bad"} />
            </div>

            {error ? <p className="rounded-[6px] border-4 border-red-900 bg-red-100 p-3 text-sm text-red-950 pixel-card">{error}</p> : null}
          </div>
        </div>
      </PixelCard>

      <PixelCard title="Edit Profile" eyebrow="simulation settings">
        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="profile-name">
              Name
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="profile-title">
              Title
              <input
                id="profile-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12 border-4 border-black bg-[#f7fff7] px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs font-black uppercase" htmlFor="profile-ticker">
              Preferred ticker
              <input
                id="profile-ticker"
                value={preferredTicker}
                onChange={(event) => setPreferredTicker(event.target.value.toUpperCase())}
                className="h-12 border-4 border-black bg-[#f7fff7] px-3 font-pixel text-sm"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase text-slate-700">Profile picture color</p>
            <div className="flex flex-wrap gap-2">
              {avatarColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-10 w-10 border-4 border-black shadow-[3px_3px_0_#111] ${avatarColor === color ? "ring-4 ring-white" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAvatarColor(color)}
                  aria-label={`Use avatar color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PixelButton type="submit" tone="magic" glow>
              Save Profile
            </PixelButton>
            {saved ? <p className="border-2 border-black bg-emerald-200 px-2 py-1 text-xs font-bold text-emerald-950">Profile saved</p> : null}
          </div>
        </form>
      </PixelCard>
    </main>
  );
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "PT";
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
