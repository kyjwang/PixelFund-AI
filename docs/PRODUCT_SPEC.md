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
- Portfolio Manager

## Core Flows
1. Ticker selection and quote visibility.
2. Analysis run creation and agent lifecycle updates.
3. Portfolio Manager summary recommendation (`BUY|HOLD|AVOID`).
4. Virtual buy/sell trade execution with immediate portfolio update.
5. Recommendation and portfolio state persistence.

## Constraints
- Educational simulation only; not financial advice.
- Single demo account (no multi-user auth in V1).
- Market data provider abstraction must support future provider swap.

## Domain Invariants
- Trade validation errors:
  - `INSUFFICIENT_FUNDS`
  - `INSUFFICIENT_SHARES`
- Recommendation aggregation must tolerate missing/failed specialist outputs and still produce deterministic fallback.
