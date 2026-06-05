"use client";

export type DemoUser = {
  id: string;
  name: string;
  title?: string;
  avatarColor?: string;
  preferredTicker?: string;
  createdAt: string;
};

export const DEMO_AUTH_KEY = "pixelfund.demoUser";
export const DEMO_USER_ID_KEY = "pixelfund.demoUserId";

export function getDemoUser(): DemoUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(DEMO_AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    window.localStorage.removeItem(DEMO_AUTH_KEY);
    return null;
  }
}

export function setDemoUser(name: string) {
  const cleanName = name.trim() || "Pixel Trader";
  const existing = getDemoUser();
  const existingId = window.localStorage.getItem(DEMO_USER_ID_KEY);
  const user: DemoUser = {
    id: existingId ?? `demo-${crypto.randomUUID()}`,
    name: cleanName,
    title: existing?.title ?? "Demo Portfolio Captain",
    avatarColor: existing?.avatarColor ?? "#7c3aed",
    preferredTicker: existing?.preferredTicker ?? "AAPL",
    createdAt: new Date().toISOString()
  };

  // The API already keys demo accounts from this local id.
  window.localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(user));
  window.localStorage.setItem(DEMO_USER_ID_KEY, user.id);
  return user;
}

export function updateDemoUser(update: Partial<Pick<DemoUser, "name" | "title" | "avatarColor" | "preferredTicker">>) {
  if (typeof window === "undefined") return null;
  const existing = getDemoUser();
  const user: DemoUser = {
    id: existing?.id ?? window.localStorage.getItem(DEMO_USER_ID_KEY) ?? `demo-${crypto.randomUUID()}`,
    name: update.name?.trim() || existing?.name || "Pixel Trader",
    title: update.title?.trim() || existing?.title || "Demo Portfolio Captain",
    avatarColor: update.avatarColor || existing?.avatarColor || "#7c3aed",
    preferredTicker: update.preferredTicker?.trim().toUpperCase() || existing?.preferredTicker || "AAPL",
    createdAt: existing?.createdAt ?? new Date().toISOString()
  };

  window.localStorage.setItem(DEMO_AUTH_KEY, JSON.stringify(user));
  window.localStorage.setItem(DEMO_USER_ID_KEY, user.id);
  return user;
}

export function clearDemoUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_AUTH_KEY);
}
