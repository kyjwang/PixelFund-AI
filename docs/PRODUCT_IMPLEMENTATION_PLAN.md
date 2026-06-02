# pixelFund AI — Product + Implementation Plan

## 1) Product Requirements Document (PRD)

### Product Vision
pixelFund AI is a playful, pixel-art stock trading simulation where users interact with a living pixel office full of specialist AI trading agents. Instead of static charts-first UX, users investigate a ticker by talking to animated characters, then receive a final portfolio recommendation from a Portfolio Manager.

### Problem Statement
Most trading simulators feel either too dry (spreadsheet dashboards) or too gamified without technical depth. We need a product that is:
- Fun and memorable to use
- Technically rigorous in architecture and data contracts
- Explainable enough for interview demos and engineering discussion

### Goals
- Deliver an engaging pixel-office-first workflow
- Provide structured, multi-agent analysis for each ticker
- Let users execute virtual trades and track portfolio performance
- Be reliable, testable, and deployable as a fullstack production-style app

### Non-Goals (MVP)
- Real-money trading
- Multi-user authentication/permissions
- Brokerage integrations
- Exchange-grade streaming latency guarantees

### Primary Personas
- Learner Trader: wants to practice decisions with clear AI explanations
- Portfolio Experimenter: wants quick scenario testing and P&L tracking
- Interview Reviewer: evaluates architecture, quality, and reliability

### Core Success Metrics
- Time-to-first-analysis < 60 seconds from app load
- Analysis completion success rate > 95% (with graceful partial fallback)
- Trade execution API success > 99% for valid requests
- New contributor can run app from clone in < 10 minutes

## 2) MVP Feature List

### Pixel Office Experience
- Office scene is the first screen (no landing page)
- Clickable pixel-art agents with stateful animation
- Ticker input + submission command center

### Multi-Agent Analysis
- Technical Analyst output
- Fundamentals Analyst output
- News & Sentiment Analyst output
- Risk Analyst output
- Portfolio Manager aggregation and final recommendation

### Portfolio Simulation
- Single demo account with virtual cash
- Buy/sell virtual shares
- Holdings, average cost, realized/unrealized P&L
- Trade history and recommendation history

### Data + Realtime
- Quote fetch via provider abstraction (Finnhub default)
- WebSocket quote updates + stale state indicators
- Background job processing for analysis workflows

### Reliability + Compliance
- Structured AI outputs (schema validated)
- REST and WebSocket contract schemas shared across frontend/backend
- Persistent educational disclaimer in primary UI

## 3) User Flow

1. User opens app directly into pixel office.
2. User enters ticker (e.g., AAPL) and submits.
3. Office transitions to active mode; agents animate into working states.
4. Backend creates analysis run and emits lifecycle updates.
5. User clicks each agent character to inspect report details.
6. Portfolio Manager waits for available specialist outputs.
7. Manager publishes final recommendation (Strong Buy/Buy/Hold/Sell/Strong Sell).
8. User places simulated trade (buy/sell).
9. Portfolio updates with cash, positions, and P&L.
10. User reviews recommendation/trade history and continues with another ticker.

## 4) Screen-by-Screen UI Description

### Screen A: Pixel Office (Primary Surface)
- Full viewport pixel office scene
- Character placement: analysts at dedicated desks; Portfolio Manager central/raised position
- Left/top HUD: ticker search and submit
- Right panel: quote snapshot, live/stale indicator
- Bottom/sticky trade bar (mobile-friendly)

### Screen B: Agent Report Drawer/Modal
- Opens when character is clicked
- Shows stance, score, confidence, summary, key points, and risks
- Includes run timestamp and data freshness state
- Visual expression badge maps to animation state

### Screen C: Portfolio + Trade Ticket Panel
- Current cash, buying power, holdings table, P&L blocks
- Trade ticket with side (buy/sell), quantity, estimated impact
- Validation messaging for insufficient funds/shares

### Screen D: Recommendation Timeline
- Historical list of analysis runs and PM recommendations
- Quick compare view: where agents agreed/disagreed per run

### Screen E: Mobile Optimized Office
- Same office identity with responsive layout
- Tap-friendly agent hit targets
- Sticky action bar for ticker/trade controls
- Reduced motion mode support

## 5) Agent Architecture

### Agents
- Technical Analyst: trends, RSI, moving averages, volume, momentum
- Fundamentals Analyst: valuation, growth, profitability, leverage, quality
- News & Sentiment Analyst: headlines, events, sentiment, analyst signals
- Risk Analyst: volatility, drawdown, uncertainty, downside scenarios
- Portfolio Manager: deterministic aggregation + final recommendation

### Analysis Pipeline
- Input: `ticker`, run context, cached quote/data snapshots
- Execution: one BullMQ run job fan-out to per-agent jobs
- Persistence: per-agent result rows, run status updates, PM recommendation row
- Output: structured JSON validated by shared Zod schemas

### Output Shape (canonical)
```json
{
  "agent": "Risk Analyst",
  "ticker": "AAPL",
  "stance": "cautious",
  "score": 42,
  "confidence": 0.71,
  "summary": "The stock has strong fundamentals but elevated volatility.",
  "key_points": [
    "Volatility is above average",
    "Recent drawdown is higher than sector peers",
    "Risk/reward is mixed"
  ],
  "risks": ["High valuation", "Market uncertainty"],
  "animation_state": "worried"
}
```

## 6) Data Model

### Core Entities
- `Account` (single demo account)
- `Position` (ticker, quantity, avgCost)
- `Trade` (buy/sell fills, price, quantity, timestamps)
- `WatchlistItem` (ticker, createdAt)
- `QuoteCache` (ticker, lastPrice, change, updatedAt, source)
- `AnalysisRun` (ticker, status, idempotencyKey, startedAt, completedAt, error)
- `AgentResult` (runId, agentType, status, payload, error)
- `Recommendation` (runId, action, confidence, rationale)

### Invariants
- No negative cash after buy
- No negative shares after sell
- Average cost updates only on buys
- Realized P&L updates on sells; unrealized P&L from latest quote
- Run/agent status follows finite state machine

## 7) Animation + State System

### Agent Visual States
- `idle`
- `waiting_for_input`
- `thinking`
- `walking`
- `talking`
- `excited`
- `worried`
- `disagreeing`

### Triggers
- Ticker submit: all specialists `thinking` or `walking`
- Agent job start: that character `thinking`
- Bullish stance: `excited`
- Bearish/cautious stance: `worried`
- Cross-agent conflict: conflicting characters `disagreeing`
- PM completion: PM `talking`, others return `idle`

### UI State Layers
- Domain state (analysis/trades/portfolio)
- Realtime state (socket connected/reconnecting/stale)
- Presentation state (character animation + panel open/close)

## 8) Suggested Tech Stack

### Monorepo
- Turborepo

### Frontend
- Next.js App Router, TypeScript, React, Tailwind CSS
- Framer Motion or CSS keyframe sprite animations
- Zustand/React Query for client state + server state sync

### Backend
- NestJS + TypeScript
- Prisma + PostgreSQL
- Redis + BullMQ for background analysis
- Socket.IO/WebSocket gateway for realtime events

### AI + Data
- OpenAI API structured outputs (schema-constrained)
- Market provider abstraction (`getQuote`, `subscribeQuotes`)
- Finnhub provider first; extensible to Polygon

### Testing + Quality
- Unit: Vitest/Jest
- Integration: Nest app + real Postgres/Redis test instances
- E2E: Playwright (desktop + mobile)
- CI: GitHub Actions with fast PR path + full main/nightly matrix

## 9) Development Roadmap

### Phase 1: Runtime Reliability
- Deterministic setup paths (Docker + non-Docker)
- Env validation + health checks
- Seeded demo account + baseline data
- Done means: cold start to running app in under 10 minutes

### Phase 2: Contract Integrity
- Lock REST envelope and domain error taxonomy
- Lock WebSocket event schemas in shared package
- Add contract tests to fail on drift
- Done means: contract tests green in CI

### Phase 3: Analysis + Trading Hardening
- Durable run state machine + idempotency
- Retry/backoff and partial failure persistence
- Portfolio accounting edge-case coverage
- Done means: deterministic integration tests for analysis/trades

### Phase 4: Mobile + UX Excellence
- Responsive office interactions for phone/laptop/desktop
- Accessibility baseline (keyboard, contrast, reduced motion)
- Performance pass (bundle/render/network)
- Done means: stable and polished cross-device user journey

### Phase 5: Observability + Delivery
- Request correlation, structured logs, queue telemetry
- Deployment runbooks and incident procedures
- Public demo environment and interview-ready walkthrough
- Done means: reproducible demo + operational confidence

## 10) Monetization Ideas

- Freemium simulation tiers (basic agents free, premium deep reports)
- Pro learning mode (scenario drills, risk coaching, replay tools)
- Team/classroom workspace subscriptions
- White-label training module for finance education programs
- API access tier for recommendation and simulation endpoints

## 11) Risks + Compliance Notes

### Product/Technical Risks
- External API rate limits and outages
- AI output inconsistency if schema constraints are weak
- Realtime drift between cached and streamed data
- Test flakiness in async websocket/e2e paths

### Mitigations
- Provider abstraction + fallback cache strategy
- Strict schema validation with safe defaults
- Stale quote detection and explicit UX indicators
- Deterministic fixtures + retries + timeout discipline in tests

### Compliance/Legal
- Educational simulator only; no execution to real brokers
- Persistent “Not financial advice” disclaimer
- Clear labeling of simulated recommendations and confidence limits
- Maintain audit trail for generated recommendations and trade events

## 12) Future Expansion Ideas

- Multiplayer office mode with shared simulation rooms
- Agent personalities + user-configurable weighting profiles
- Backtesting mode on historical windows
- Strategy builder with rule-based trade automation (simulation only)
- Achievement system and seasonal challenges
- Voice interaction with agents and narrated recommendations
- International market support and multi-asset classes (ETF/crypto futures in simulation)

## Recommendation Scoring Model (V1)

### Base Weights
- Fundamentals Analyst: 30%
- Technical Analyst: 25%
- Risk Analyst: 20%
- News & Sentiment Analyst: 15%
- Portfolio Fit Modifier: 10%

### Aggregation Behavior
- Convert each agent stance/score to normalized contribution
- Apply confidence-adjusted weighting
- Penalize missing critical agents with deterministic fallback coefficients
- Map final score to recommendation band:
  - 80-100: Strong Buy
  - 65-79: Buy
  - 45-64: Hold
  - 30-44: Sell
  - 0-29: Strong Sell

## Notes for Contributors
- Canonical app surfaces: `apps/web`, `apps/api`, `packages/*`
- Shared contract authority: `packages/schemas/src/index.ts`
- Keep docs and code in sync in the same PR whenever behavior or interfaces change.
