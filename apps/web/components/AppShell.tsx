"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { clearDemoUser, getDemoUser, type DemoUser } from "../lib/auth";
import { PixelButton } from "./GameUI";

const navItems = [
  { href: "/", label: "Desk" },
  { href: "/trading", label: "Trading" },
  { href: "/research", label: "Research" },
  { href: "/history", label: "History" },
  { href: "/backtest", label: "Backtest" },
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

  const activeLabel = useMemo(
    () => navItems.find((item) => item.href === pathname)?.label ?? "Desk",
    [pathname]
  );

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-slate-950">
        <div className="pixel-panel border-4 border-black bg-[#fffdf4] p-4 text-center shadow-[6px_6px_0_#111]">
          <p className="font-pixel text-xs">Loading desk...</p>
        </div>
      </main>
    );
  }

  if (isLogin) return children;
  if (!user) return null;

  return (
    <div className="min-h-screen text-slate-950">
      <header className="sticky top-0 z-40 border-b-4 border-black bg-[#fff8e7]/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <Link href="/" className="font-pixel text-xs leading-6 text-slate-950">
            PixelTrade AI
          </Link>

          <nav className="order-3 grid w-full grid-cols-3 gap-1 sm:order-none sm:w-auto sm:flex" aria-label="Game rooms">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-2 border-black px-2 py-2 text-center text-[10px] font-black uppercase shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 ${
                    active ? "bg-[#7c3aed] text-white" : "bg-white text-slate-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden border-2 border-black bg-[#f7fff7] px-2 py-1 text-[10px] font-bold uppercase sm:inline-flex">
              {activeLabel}: {user.name}
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
