export type CryptoSymbol = "BTC" | "ETH" | "SOL";
export type CryptoSignalAction = "BUY" | "SELL" | "HOLD";
export type CryptoStrategyMode = "BALANCED" | "AGGRESSIVE";

export type CryptoCandle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type CryptoSignalInput = {
  symbol: CryptoSymbol;
  price: number;
  candles: CryptoCandle[];
  btcCandles: CryptoCandle[];
  heldQuantity: number;
  averageCost: number;
  portfolioValue: number;
  coinExposurePercent: number;
  cash: number;
  stopLossPercent: number;
  maxPortfolioPercent: number;
  tradesToday: number;
  maxTradesPerDay: number;
  lastTradeAt: Date | null;
  now: Date;
  strategyMode: CryptoStrategyMode;
};

export type CryptoSignal = {
  action: CryptoSignalAction;
  score: number;
  reason: string;
  reasons: string[];
  notional: number;
};

export type CryptoMarketDataBundle = {
  symbol: CryptoSymbol;
  price: number;
  candles: CryptoCandle[];
  source: string;
  asOf: string | null;
  warnings: string[];
  isFallback: boolean;
};
