import { Injectable } from "@nestjs/common";
import { CoinGeckoProvider } from "../market/coingecko.provider";
import { YahooCryptoProvider } from "./yahoo-crypto.provider";
import type { CryptoMarketDataBundle, CryptoSymbol } from "./crypto-trader.types";

@Injectable()
export class CryptoMarketDataService {
  constructor(
    private readonly coinGecko: CoinGeckoProvider,
    private readonly yahoo: YahooCryptoProvider
  ) {}

  async resolve(symbol: CryptoSymbol): Promise<CryptoMarketDataBundle> {
    const coinGecko = await this.fromCoinGecko(symbol);
    if (isUsable(coinGecko)) return coinGecko;

    const yahoo = await this.yahoo.cryptoMarketData(symbol);
    if (yahoo && isUsable(yahoo)) {
      return {
        ...yahoo,
        warnings: [...(coinGecko?.warnings ?? ["CoinGecko returned no usable crypto price/candles."]), "CoinGecko unavailable; used Yahoo/yfinance fallback data.", ...yahoo.warnings]
      };
    }

    return {
      symbol,
      price: 0,
      candles: [],
      source: "unavailable",
      asOf: null,
      warnings: [
        ...(coinGecko?.warnings ?? ["CoinGecko returned no usable crypto price/candles."]),
        "Yahoo/yfinance fallback returned no usable crypto price/candles."
      ],
      isFallback: false
    };
  }

  private async fromCoinGecko(symbol: CryptoSymbol): Promise<CryptoMarketDataBundle> {
    const [context, candles] = await Promise.all([this.coinGecko.cryptoContext(symbol), this.coinGeckoCandles(symbol)]);
    const price = context?.priceUsd ?? candles.at(-1)?.close ?? 0;
    const warnings: string[] = [];
    if (!context?.priceUsd) warnings.push("CoinGecko live price unavailable; latest CoinGecko candle close was used when possible.");
    if (candles.length === 0) warnings.push("CoinGecko candles unavailable.");

    return {
      symbol,
      price,
      candles,
      source: "coingecko",
      asOf: context?.updatedAt ?? candles.at(-1)?.timestamp ?? null,
      warnings,
      isFallback: false
    };
  }

  private async coinGeckoCandles(symbol: CryptoSymbol) {
    const candles = (await this.coinGecko.cryptoHistory(symbol, 1)) ?? (await this.coinGecko.cryptoHistory(symbol, 7));
    return (candles ?? []).map((candle) => ({
      timestamp: candle.date,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));
  }
}

function isUsable(bundle: CryptoMarketDataBundle | null | undefined) {
  return Boolean(bundle && bundle.price > 0 && bundle.candles.length >= 12);
}
