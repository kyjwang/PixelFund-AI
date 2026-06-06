import { test, expect, type Page } from "@playwright/test";

async function loginDemo(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: "demo-e2e",
      name: "E2E Trader",
      title: "Demo Portfolio Captain",
      avatarColor: "#7c3aed",
      preferredTicker: "AAPL",
      createdAt: new Date().toISOString()
    };
    window.localStorage.setItem("pixelfund.demoUser", JSON.stringify(user));
    window.localStorage.setItem("pixelfund.demoUserId", user.id);
  });
}

test.beforeEach(async ({ page }) => {
  await loginDemo(page);
});

test.describe("desktop flow", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Desktop smoke runs only in the Chromium project.");

  test("@smoke desktop office, trading, and profile journey", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AI Office" })).toBeVisible();
    await expect(page.getByText("Agent Introduction")).toBeVisible();
    await expect(page.getByText("Analysis Output")).toBeVisible();
    await expect(page.getByRole("button", { name: "News Analyst", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "News Analyst", exact: true }).click();
    await expect(page.getByText("Nia Wire")).toBeVisible();
    await expect(page.getByText("I scan headlines and company news")).toBeVisible();
    await expect(page.getByText("Run an analysis or ask this agent")).toBeVisible();

    await page.getByRole("link", { name: "Open Trading" }).click();
    await expect(page.getByRole("heading", { name: "AAPL", exact: true })).toBeVisible();
    await expect(page.getByText("Order Ticket")).toBeVisible();
    await expect(page.getByText("Blotter")).toBeVisible();
    await expect(page.getByText("buying power", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Buy/ })).toBeVisible();

    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page.getByRole("heading", { name: "Trader Profile" })).toBeVisible();
    await page.getByLabel("Name").fill("Pixel Pilot");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText("Profile saved")).toBeVisible();
  });
});

test.describe("full mobile flow", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "Mobile smoke runs only in the WebKit mobile project.");

  test("@full iphone flow shows office actions and trading room", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AI Office" })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Office quick actions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Trade", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Trade", exact: true }).click();
    await expect(page.getByRole("heading", { name: "AAPL", exact: true })).toBeVisible();
    await expect(page.getByText("Order Ticket")).toBeVisible();
  });
});
