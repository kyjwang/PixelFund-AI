"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearDemoUser, getDemoUser, type DemoUser } from "../lib/auth";
import { PixelButton, cx } from "./GameUI";

const navItems = [
  { href: "/", label: "Desk" },
  { href: "/trading", label: "Trading" },
  { href: "/research", label: "Research" },
  { href: "/history", label: "History" },
  { href: "/backtest", label: "Backtest" },
  { href: "/system", label: "System" },
  { href: "/profile", label: "Profile" }
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    const nextUser = getDemoUser();
    setUser(nextUser);
    setReady(true);

    if (!nextUser && !isLogin) router.replace("/login");
    if (nextUser && isLogin) router.replace("/");
  }, [isLogin, router]);

  if (!ready) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-slate-950">
        <div className="glass-panel pixel-panel rounded-[8px] p-4 text-center">
          <p className="font-pixel text-xs">Loading desk...</p>
        </div>
      </main>
    );
  }

  if (isLogin) return children;
  if (!user) return null;

  return (
    <div className="min-h-[100dvh] text-slate-950">
      <header className="sticky top-0 z-40 px-3 py-2 sm:px-4">
        <div className="glass-panel mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 rounded-[8px] px-2.5 py-2 lg:flex-nowrap lg:gap-3">
          <Link href="/" className="group flex shrink-0 items-center gap-2 pr-1 text-slate-950">
            <span className="grid h-8 w-8 place-items-center rounded-[7px] border border-slate-950/10 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <span className="h-3.5 w-3.5 bg-[color:var(--pf-accent)] shadow-[6px_0_0_#2f6df6,0_6px_0_#f2c14e,6px_6px_0_#07111f]" />
            </span>
            <span className="font-pixel text-xs leading-6">PixelFund</span>
          </Link>

          <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto px-1 lg:order-none lg:flex-1 lg:justify-center" aria-label="Game rooms">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "shrink-0 rounded-full border px-2.5 py-2 text-center text-[10px] font-black uppercase transition hover:-translate-y-0.5",
                    active
                      ? "border-emerald-300/70 bg-[linear-gradient(135deg,#0f8f78,#2f6df6)] text-white shadow-[0_10px_26px_rgba(15,143,120,0.18)]"
                      : "border-white/55 bg-white/45 text-slate-700 hover:bg-white/70 hover:text-slate-950"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="glass-chip hidden max-w-[180px] truncate rounded-full px-3 py-1.5 font-pixel text-[10px] text-slate-950 md:inline-flex">
              {user.name}
            </span>
            <PixelButton
              className="min-h-8 px-2.5 py-1 text-[10px]"
              onClick={() => {
                clearDemoUser();
                router.replace("/login");
              }}
            >
              Log out
            </PixelButton>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
