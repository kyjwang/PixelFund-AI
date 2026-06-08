"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearDemoUser, getDemoUser, type DemoUser } from "../lib/auth";
import { PixelButton } from "./GameUI";

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
        <div className="pixel-panel rounded-[8px] border-[3px] border-black bg-[#fffdf4] p-4 text-center shadow-[6px_6px_0_#101827]">
          <p className="font-pixel text-xs">Loading desk...</p>
        </div>
      </main>
    );
  }

  if (isLogin) return children;
  if (!user) return null;

  return (
    <div className="min-h-[100dvh] text-slate-950">
      <header className="sticky top-0 z-40 border-b-[3px] border-black bg-[#fff8e7]/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-2 lg:flex-nowrap lg:gap-3">
          <Link href="/" className="shrink-0 font-pixel text-xs leading-6 text-slate-950">
            PixelFund
          </Link>

          <nav className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto px-1 lg:order-none lg:flex-1 lg:justify-center" aria-label="Game rooms">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-[5px] border-2 border-black px-2.5 py-2 text-center text-[10px] font-black uppercase shadow-[2px_2px_0_#101827] transition-transform hover:-translate-y-0.5 ${
                    active ? "bg-[#0c7c59] text-white" : "bg-white text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-[180px] truncate rounded-[5px] border-2 border-black bg-[#f7fff7] px-3 py-1 font-pixel text-[10px] text-slate-950 shadow-[2px_2px_0_#101827] md:inline-flex">
              {user.name}
            </span>
            <PixelButton
              className="min-h-8 px-2 py-1 text-[10px]"
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
