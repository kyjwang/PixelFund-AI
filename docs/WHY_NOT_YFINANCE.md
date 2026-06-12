# Why Not yfinance

PixelFund does not use **yfinance** as a primary market-data provider.

The decision is not because yfinance is useless. It is useful for research, broad ticker discovery, and quick historical-data experiments. PixelFund's core analysis stack should still prefer official or API-backed sources that can be audited clearly in the app.

See also: [Data Provider Comparison](DATA_PROVIDER_COMPARISON.md).

## Decision

PixelFund keeps yfinance out of the trusted provider stack for now.

The preferred stack is:

| Area | Preferred Source |
| --- | --- |
| Quotes, news, analyst trend | Finnhub |
| Backup quotes, history, indicators, fundamentals, news sentiment | Alpha Vantage |
| Official US company filings and fundamentals | SEC EDGAR |
| Macro data | FRED |
| Crypto context | CoinGecko, with Yahoo/yfinance-style fallback only when CoinGecko is unavailable |
| Social sentiment | Optional labeled social sentiment only |

## Why Not Primary

yfinance is not an official Yahoo Finance product. The project describes itself as not affiliated, endorsed, or vetted by Yahoo, and says it is intended for research and educational purposes. Yahoo Finance API usage is also described around personal use. Source: [yfinance on PyPI](https://pypi.org/project/yfinance/).

That makes yfinance a poor fit as PixelFund's main trusted source for professional-grade analysis because:

- It is an unofficial access layer over Yahoo Finance data.
- Availability and response shape can change outside PixelFund's control.
- It is better suited to personal research than production-grade provider guarantees.
- It should not replace official company evidence from SEC EDGAR.
- It should not replace structured macro evidence from FRED.
- It would make source-audit labels less clear if treated as official evidence.

## Where It Could Help Later

yfinance could still be useful as an optional research fallback:

- Crypto fake-money auto-trading fallback for `BTC-USD`, `ETH-USD`, and `SOL-USD` when CoinGecko public endpoints are unavailable.
- Broader international ticker coverage.
- ETF, index, currency, and unusual symbol context.
- Historical price enrichment for backtesting experiments.
- Quick comparison against benchmarks such as SPY, QQQ, or sector ETFs.
- A fallback when Finnhub or Alpha Vantage free tiers are missing a non-core symbol.

## Limited Crypto Fallback Exception

PixelFund may use Yahoo/yfinance-style chart data as a clearly labeled crypto fallback for fake-money auto-trading when CoinGecko public endpoints are blocked, rate-limited, timed out, or otherwise unavailable.

This exception is intentionally narrow:

- It only applies to simulator crypto trading for `BTC`, `ETH`, and `SOL`.
- It is labeled as `Yahoo/yfinance research fallback`.
- It must not override healthy CoinGecko data.
- It must not be treated as official evidence.
- It should appear as fallback or partial data in logs and data-coverage messaging.

## Future Rule

If PixelFund adds yfinance later, label it as:

`Yahoo/yfinance research fallback`

It should be shown as partial or fallback evidence in Data Coverage, never as official evidence. It should not override SEC EDGAR fundamentals, FRED macro data, or stronger configured provider data.
