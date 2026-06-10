# Data Provider Comparison

This note compares the TradingAgents data approach with the proposed PixelFund provider stack for trustworthy free-data analysis.

## TradingAgents vs Proposed PixelFund Stack

| Area | TradingAgents | Proposed PixelFund Stack | Better |
| --- | --- | --- | --- |
| Price/history/technicals | yfinance default, Alpha Vantage optional | Finnhub + Alpha Vantage backup | Similar. TradingAgents has broader global Yahoo ticker coverage. |
| Fundamentals | yfinance / Alpha Vantage | SEC EDGAR + Alpha Vantage/Finnhub | Proposed stack is more trustworthy for US companies because SEC filings are official. |
| Macro | Global news queries | FRED structured macro data | Proposed stack is better. |
| Sentiment | Yahoo news + StockTwits + Reddit | Currently news only; proposed can add StockTwits/Reddit | TradingAgents is better unless PixelFund adds StockTwits/Reddit. |
| Crypto | Yahoo tickers like BTC-USD | CoinGecko crypto market data | Proposed stack is better for crypto. |
| Missing data handling | No-data safeguards and fallback vendors | Source audit + per-agent missing-data caveats | Proposed stack is better if implemented. |
| Agent workflow | LangGraph, tool-calling, debates, memory | Lighter deterministic pipeline | TradingAgents is deeper; PixelFund is faster and cheaper. |

## Provider Comparison

| Provider | Best For | Weakness |
| --- | --- | --- |
| yfinance | Easy, broad ticker coverage, Yahoo news, global tickers | Unofficial, not endorsed by Yahoo, intended for personal/research use only. |
| Finnhub | Cleaner official API, quotes/news/fundamentals, already in PixelFund | Free/plan coverage can be limited; missing data can fall back. |
| Alpha Vantage | Best free-key all-in-one backup: stocks, fundamentals, news sentiment, macro, crypto, commodities, indicators | Strict free rate limits; some realtime/intraday features are premium. |
| SEC EDGAR | Best official fundamentals for US companies | US filings only; needs mapping and normalization. |
| FRED | Best free macro data | Macro only, not company-specific. |
| CoinGecko | Best free crypto context | Crypto only. |

## Recommendation

Use **Finnhub + Alpha Vantage + SEC EDGAR + FRED + CoinGecko** for a trusted free-data stack.

Use **StockTwits/Reddit** only as clearly labeled social sentiment, not factual company evidence.

Avoid treating **yfinance** as the main trusted production data provider. It can still be useful as a research fallback or optional global ticker coverage layer.
