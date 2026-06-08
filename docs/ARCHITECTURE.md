# Architecture

## Purpose
pixelFund AI is a fullstack stock-trading simulation platform with a pixel-art UI, specialist agent analysis, and virtual portfolio management.

## Canonical Source Surfaces
- Canonical frontend: `apps/web`
- Canonical backend: `apps/api`
- Canonical shared contracts/domain: `packages/*`

## High-Level System
- Web: Next.js App Router (TypeScript, Tailwind) in `apps/web`
- API: NestJS (REST + WebSockets) in `apps/api`
- Database: PostgreSQL via Prisma
- Queue/Background jobs: Redis + BullMQ
- AI: OpenAI structured output workflow for agent results
- Shared contracts: Zod schemas in `packages/schemas`
- Shared portfolio logic: `packages/domain`

## Runtime Boundaries
- UI layer renders pixel office, handles ticker selection, subscribes to websocket events, and executes virtual trades.
- API layer validates payloads, executes domain logic, manages persistence, emits websocket events, and orchestrates analysis jobs.
- Data provider layer abstracts market data (`FinnhubProvider`) behind `MarketDataProvider`.
- Queue processor executes specialist analyses and final manager recommendation aggregation.

## Data Flow
1. User selects ticker in web app.
2. Web app requests quote/portfolio/runs via REST.
3. Web app subscribes to ticker updates over WebSocket (`quote.subscribe`).
4. API quote service deduplicates subscriptions and polls provider; emits `quote.updated` and `quote.stale`.
5. User triggers analysis run (`POST /analysis-runs`).
6. API enqueues BullMQ job.
7. Processor runs specialist agents, persists per-agent outputs, emits lifecycle events.
8. Portfolio manager aggregates specialist outputs into final recommendation.
9. User places virtual trade (`POST /trades`), backend updates cash/positions and emits `portfolio.updated`.

## Key Invariants
- Browser-isolated simulation accounts remain scoped by `x-demo-user-id`.
- Virtual-only trading; no live brokerage execution.
- All public contracts should be validated via shared Zod schemas.
- REST responses use envelope `{ data }` on success and `{ error }` on failure.
