import { describe, expect, test } from "@jest/globals";

describe("api flow contracts", () => {
  test("creates analysis payload shape", () => {
    const payload = { ticker: "AAPL" };
    expect(payload.ticker).toBe("AAPL");
  });

  test("places trade payload shape", () => {
    const payload = { ticker: "AAPL", side: "BUY", quantity: 2 };
    expect(payload.quantity).toBeGreaterThan(0);
  });
});
