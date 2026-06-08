# Testing

## Strategy
- Unit (`npm test`): fast local confidence for domain and API unit-level specs.
- API integration (`npm --workspace @pixelfund/api run test:integration`): boots real Nest app and validates HTTP + WebSocket flows against Postgres/Redis.
- E2E (`npx playwright test`): boots API + web, validates user journey across desktop/mobile.

## Commands
```bash
npm run docs:check-links
npm run typecheck
npm test
npm --workspace @pixelfund/api run test:integration
npx playwright test --project=desktop-chromium --grep @smoke
npx playwright test
```

## Integration Test Coverage
- Health/readiness contract for API, database, Redis, market-data config, and AI-provider config
- REST envelope invariants and error envelopes with `requestId`
- Portfolio route contract and quote route schema validation
- Trade flows: buy/sell accounting and insufficient funds path
- Analysis run idempotency and terminal state validation
- WebSocket contracts:
  - `quote.updated`
  - `analysis.agent.started|completed|failed`
  - `analysis.portfolioRecommendation.completed|failed`
  - `portfolio.updated`

## E2E Coverage
- `@smoke` desktop scenario for PRs
- Full desktop + mobile flow for main/nightly
- System Console route verifies visible fullstack readiness in manual smoke passes
- Playwright config auto-starts API and web servers for deterministic CI runs

## Determinism Rules
- Integration tests reset DB state before each test.
- Integration tests run single-worker for reduced race/flakiness.
- CI seeds data before integration and E2E runs.

## Acceptance Targets
- Contract regressions fail fast in CI.
- PR pipeline remains fast via smoke E2E.
- Main/nightly pipeline enforces full matrix coverage.
