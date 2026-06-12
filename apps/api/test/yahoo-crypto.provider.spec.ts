import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { YahooCryptoProvider } from "../src/crypto-trader/yahoo-crypto.provider";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("Yahoo crypto provider", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("maps BTC to BTC-USD and parses chart candles", async () => {
    const start = Date.UTC(2026, 5, 12, 12) / 1000;
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const href = String(url);
      expect(href).toContain("BTC-USD");
      return jsonResponse({
        chart: {
          result: [
            {
              meta: {
                regularMarketPrice: 103,
                regularMarketTime: start + 3600
              },
              timestamp: [start, start + 1800, start + 3600],
              indicators: {
                quote: [
                  {
                    open: [100, 101, 102],
                    high: [102, 103, 104],
                    low: [99, 100, 101],
                    close: [101, 102, 103],
                    volume: [10, 11, 12]
                  }
                ]
              }
            }
          ]
        }
      });
    }) as any;

    const bundle = await new YahooCryptoProvider().cryptoMarketData("BTC");

    expect(bundle).toEqual(
      expect.objectContaining({
        symbol: "BTC",
        price: 103,
        source: "Yahoo/yfinance research fallback",
        isFallback: true
      })
    );
    expect(bundle?.candles).toHaveLength(3);
    expect(bundle?.candles.at(-1)?.close).toBe(103);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
