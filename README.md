# PixelFund AI

PixelFund AI is a pixel-art themed stock trading simulation web app with specialist AI agents, realtime quote streaming, and virtual portfolio trading.

## Quickstart

### Recommended (Docker path)
```bash
cp .env.example .env
npm install
npm run dev:all
```

Open:
- Web app: `http://localhost:3000`
- API: `http://localhost:4000`

### Non-Docker path
Run local PostgreSQL + Redis first, then:
```bash
npm install
npm run db:setup
npm run dev
```

## Current Status
### Working now
- Pixel office UI and mobile-responsive experience
- Browser-isolated simulation accounts with scoped portfolio, watchlist, orders, and fill history via `x-demo-user-id`
- Durable order lifecycle with market, limit, stop, cancel, fill, and fail-closed live-data gating
- Full investment committee lifecycle with specialist, debate, risk council, team lead, and manager outputs
- Realtime websocket quote and lifecycle events
- System Console for API/database/Redis/provider readiness
- Trade sizing hints, richer P&L analytics, and recommendation explainability
- Market-data cache fallback for degraded provider moments
- Shared schema and domain packages
- CI workflow and test suite foundation

### Planned hardening
- Expanded true integration tests against live DB/Redis in CI
- Deeper observability/monitoring and deployment readiness
- Production auth provider and server-side user management
- Continuous docs-to-code drift prevention improvements

## Documentation Index
- [Product + Implementation Plan](docs/PRODUCT_IMPLEMENTATION_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Setup](docs/SETUP.md)
- [API Contracts](docs/API_CONTRACTS.md)
- [Realtime Events](docs/REALTIME_EVENTS.md)
- [Product Spec (V1)](docs/PRODUCT_SPEC.md)
- [Testing](docs/TESTING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)
- [Incident Runbook](docs/INCIDENT_RUNBOOK.md)
- [Data Provider Comparison](docs/DATA_PROVIDER_COMPARISON.md)
- [Changelog](docs/CHANGELOG.md)
- [Demo Script](docs/showcase/DEMO_SCRIPT.md)
- [Limitations & Next Steps](docs/showcase/LIMITATIONS_AND_NEXT_STEPS.md)
- [Performance Playbook](docs/showcase/PERFORMANCE.md)

## Canonical Paths
- Canonical frontend: `apps/web`
- Canonical backend: `apps/api`
- Canonical shared packages: `packages/*`

## Documentation Quality Standard
- Public API and websocket contracts must reference shared schema source (`packages/schemas/src/index.ts`).
- Roadmap phases must include explicit “Done Means” acceptance criteria.
- Setup docs must include exact commands and expected verification output.
- Update docs in the same PR as behavior/interface changes.

## Validation Commands
```bash
npm run docs:check-links
npm run health:check
npm run typecheck
npm test
```

## Disclaimer
Educational simulation only. Not financial advice.
