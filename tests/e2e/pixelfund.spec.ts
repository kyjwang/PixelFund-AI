import { test, expect, devices } from "@playwright/test";

test("@smoke desktop user journey", async ({ page }) => {
  await page.goto("/");
  await page.fill("input[aria-label='Ticker']", "AAPL");
  await page.click("text=Run Analysis");
  await page.click('button[title="Technical Analyst"]');
  await expect(page.locator("text=Agent Terminal")).toBeVisible();
  await expect(page.locator("text=Team Meeting")).toBeVisible();
  await page.click("text=Buy 1");
  await expect(page.locator("text=Portfolio")).toBeVisible();
  await expect(page.locator("text=Final Rec:")).toBeVisible();
  await expect(page.locator("text=Debate Floor")).toBeVisible();
  await expect(page.locator("text=Backtest Lab")).toBeVisible();
});

test.describe("full mobile flow", () => {
  test.use({ ...devices["iPhone 13"] });

  test("@full iphone flow shows sticky actions and supports trading", async ({ page }) => {
    await page.goto("/");
    await page.fill("input[aria-label='Ticker']", "MSFT");
    await expect(page.locator("text=Analyze")).toBeVisible();
    await page.click('button[title="News Analyst"]');
    await page.click("text=Buy 1");
    await expect(page.locator("text=Portfolio")).toBeVisible();
  });
});
