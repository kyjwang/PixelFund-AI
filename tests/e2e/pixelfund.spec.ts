import { test, expect, devices, type Page } from "@playwright/test";

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

test("@smoke desktop office, trading, and profile journey", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI Office" })).toBeVisible();
  await expect(page.getByText("Agent Introduction")).toBeVisible();
  await expect(page.getByText("Analysis Output")).toBeVisible();
  await expect(page.getByRole("button", { name: "News Analyst" })).toBeVisible();
  await page.getByRole("button", { name: "News Analyst" }).click();
  await expect(page.getByText("Nia Wire")).toBeVisible();
  await expect(page.getByText("I scan headlines and company news")).toBeVisible();
  await expect(page.getByText("Run an analysis or ask this agent")).toBeVisible();

  await page.getByRole("link", { name: "Open Trading" }).click();
  await expect(page.getByRole("heading", { name: "Trading Room" })).toBeVisible();
  await expect(page.getByText("Virtual Cash")).toBeVisible();
  await expect(page.getByText("Trade Ticket")).toBeVisible();
  await expect(page.getByText("Manager Guidance")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview Buy" })).toBeVisible();

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("heading", { name: "Trader Profile" })).toBeVisible();
  await page.getByLabel("Name").fill("Pixel Pilot");
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByText("Profile saved")).toBeVisible();
});

test.describe("full mobile flow", () => {
  test.use({ ...devices["iPhone 13"] });

  test("@full iphone flow shows office actions and trading room", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AI Office" })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Office quick actions" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Trade" })).toBeVisible();
    await page.getByRole("link", { name: "Trade" }).click();
    await expect(page.getByRole("heading", { name: "Trading Room" })).toBeVisible();
    await expect(page.getByText("Trade Ticket")).toBeVisible();
  });
});
