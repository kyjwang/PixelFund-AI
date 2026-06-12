import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { CoinGeckoProvider } from "../src/market/coingecko.provider";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("CoinGecko provider public fallbacks", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("uses coins markets fallback when simple price is unavailable without an API key", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/simple/price")) return jsonResponse({ error: "rate limited" }, 429);
      if (href.includes("/coins/markets")) {
        return jsonResponse([
          {
            id: "bitcoin",
            symbol: "btc",
            current_price: 101000,
            price_change_percentage_24h: 2.4,
            market_cap: 2_000_000_000_000,
            total_volume: 42_000_000_000,
            last_updated: "2026-06-12T14:55:00.000Z"
          }
        ]);
      }
      throw new Error(`Unexpected URL ${href}`);
    }) as any;

    const context = await new CoinGeckoProvider().cryptoContext("BTC");

    expect(context).toEqual(
      expect.objectContaining({
        asset: "bitcoin",
        priceUsd: 101000,
        change24hPercent: 2.4,
        source: "coingecko"
      })
    );
    expect(context?.updatedAt).toBe("2026-06-12T14:55:00.000Z");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  test("uses coin detail market data when simple price and markets fallback are unavailable", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/simple/price")) return jsonResponse({ error: "rate limited" }, 429);
      if (href.includes("/coins/markets")) return jsonResponse({ error: "blocked" }, 403);
      if (href.includes("/coins/bitcoin")) {
        return jsonResponse({
          id: "bitcoin",
          market_data: {
            current_price: { usd: 102500 },
            price_change_percentage_24h: -1.2,
            market_cap: { usd: 2_020_000_000_000 },
            total_volume: { usd: 39_000_000_000 }
          },
          last_updated: "2026-06-12T15:05:00.000Z"
        });
      }
      throw new Error(`Unexpected URL ${href}`);
    }) as any;

    const context = await new CoinGeckoProvider().cryptoContext("BTC");

    expect(context).toEqual(
      expect.objectContaining({
        asset: "bitcoin",
        priceUsd: 102500,
        change24hPercent: -1.2,
        source: "coingecko-coin-details"
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  test("uses market chart fallback when OHLC candles are unavailable without an API key", async () => {
    const start = Date.UTC(2026, 5, 12, 12);
    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const href = String(url);
      if (href.includes("/ohlc")) return jsonResponse({ error: "rate limited" }, 429);
      if (href.includes("/market_chart")) {
        return jsonResponse({
          prices: [
            [start, 100],
            [start + 30 * 60 * 1000, 104],
            [start + 60 * 60 * 1000, 102]
          ],
          total_volumes: [
            [start, 10],
            [start + 30 * 60 * 1000, 12],
            [start + 60 * 60 * 1000, 14]
          ]
        });
      }
      throw new Error(`Unexpected URL ${href}`);
    }) as any;

    const candles = await new CoinGeckoProvider().cryptoHistory("BTC", 1);

    expect(candles).toHaveLength(3);
    expect(candles?.at(-1)).toEqual(
      expect.objectContaining({
        ticker: "BTC",
        close: 102,
        source: "coingecko-market-chart"
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
