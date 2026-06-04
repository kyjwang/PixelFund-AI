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
4. Trade preview with order type, trigger status, projected cash/shares, warnings, and sizing hint.
5. Virtual buy/sell trade execution with immediate portfolio update when the order is executable.
6. Recommendation and portfolio state persistence.
7. Manager explainability with backend-computed committee vote mix, coverage, confidence, weights, contributions, top contributors, reasons, and data-quality caveats.

## Constraints
- Educational simulation only; not financial advice.
- Browser-isolated demo accounts, not production auth.
- Market data provider abstraction must support future provider swap.
- Limit/stop orders are trigger-checked immediate simulations, not durable pending orders.

## Domain Invariants
- Trade validation errors:
  - `INSUFFICIENT_FUNDS`
  - `INSUFFICIENT_SHARES`
  - `ORDER_NOT_TRIGGERED`
- Recommendation aggregation must tolerate missing/failed specialist outputs and still produce deterministic fallback.
- UI agent roster must derive agent order, labels, stages, and weights from the shared domain profile source.
