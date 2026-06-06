# Product Spec (V1)

## Experience Goals
- First screen is the interactive pixel office app (not a landing page).
- User can select a ticker, trigger agent analysis, and receive final recommendation.
- User can simulate buying/selling using virtual funds only.

## Agents
- Technical Analyst
- News Analyst
- Fundamentals Analyst
- Risk Analyst
- Macro Analyst
- Sentiment Analyst
- Quant Analyst
- Crypto Specialist
- Bull Researcher
- Bear Researcher
- Trader Agent
- Aggressive Risk
- Neutral Risk
- Conservative Risk
- Portfolio Manager
- Team Lead

## Core Flows
1. Ticker selection and quote visibility.
2. Analysis run creation and agent lifecycle updates.
3. Portfolio Manager summary recommendation (`BUY|HOLD|AVOID`).
4. Order preview with order type, trigger status, projected cash/shares, warnings, live-data tradability, and sizing hint.
5. Durable simulator order creation with immediate market fills only on fresh live provider data.
6. Recommendation and portfolio state persistence.
7. Manager explainability with backend-computed committee vote mix, coverage, confidence, weights, contributions, top contributors, reasons, and data-quality caveats.

## Constraints
- Educational simulation only; not financial advice.
- Browser-isolated simulation accounts for portfolio, watchlist, orders, and fill history; not production auth.
- Market data provider abstraction must support future provider swap.
- Trading execution fails closed when market data is demo, fallback, unsupported, or stale.
- Limit/stop orders remain pending until fresh live quotes cross their triggers.

## Domain Invariants
- Order and trade validation errors:
  - `MARKET_DATA_NOT_TRADABLE`
  - `ORDER_REJECTED`
  - `INSUFFICIENT_FUNDS`
  - `INSUFFICIENT_SHARES`
  - `ORDER_NOT_TRIGGERED`
- Recommendation aggregation must tolerate missing/failed specialist outputs and still produce deterministic fallback.
- UI agent roster must derive agent order, labels, stages, and weights from the shared domain profile source.
