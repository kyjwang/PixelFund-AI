import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const ci = !!process.env.CI;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000"
  },
  webServer: [
    {
      command: "npm --workspace @pixelfund/api run dev",
      port: 4000,
      timeout: 120_000,
      reuseExistingServer: !ci,
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/pixelfund",
        REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379"
      }
    },
    {
      command: "npm --workspace @pixelfund/web run dev",
      port: 3000,
      timeout: 120_000,
      reuseExistingServer: !ci,
      env: {
        ...process.env,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
        NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000"
      }
    }
  ],
  projects: [
    { name: "desktop-chromium", use: { browserName: "chromium" } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } }
  ]
});
