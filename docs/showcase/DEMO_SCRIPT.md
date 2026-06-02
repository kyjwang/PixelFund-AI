# Demo Script (5-7 minutes)

## 1. Product identity (45s)
- Show pixel-office interface as first screen.
- Explain specialist agents and portfolio manager flow.

## 2. Realtime + analysis (2m)
- Select ticker via search.
- Run analysis and show agent status updates in office + timeline.
- Open agent output and explain confidence, sourced reasons, and evidence quality.
- Show a live US ticker such as `AAPL` or `NVDA` with `LIVE` data quality.

## 3. Unsupported market handling (45s)
- Search for `sivers` and select `SIVE.ST`.
- Point out that the company is found, but the current provider may mark live data as `UNSUPPORTED`.
- Explain why the app shows visible fallback messaging instead of silently pretending unsupported data is live.

## 4. Trading engine (1m 30s)
- Use trade ticket quantity input.
- Show preview impact and execute buy/sell.
- Highlight realized/unrealized/total P&L updates.

## 5. Backtest lab (1m)
- Run the one-year Portfolio Manager replay backtest for the selected ticker.
- Explain P&L, win rate, drawdown, and recommendation accuracy.
- Note that deterministic scoring is the source of truth while NVIDIA/OpenAI-compatible AI polishes explanations.

## 6. Reliability signal (1m)
- Mention contract-validated API/websocket schemas.
- Show CI strategy: PR smoke vs full main/nightly matrix.

## 7. Engineering quality close (45s)
- Call out docs, runbook, roadmap, and deterministic tests.
