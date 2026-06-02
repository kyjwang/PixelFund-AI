# Deployment

## Target Topology
- Frontend (`apps/web`): Vercel
- Backend (`apps/api`): hosted Node service
- Database: hosted PostgreSQL
- Queue/cache: hosted Redis

## Environment Matrix
### Frontend
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

### Backend
- `DATABASE_URL`
- `REDIS_URL`
- `FINNHUB_API_KEY` (optional/demo fallback)
- `OPENAI_API_KEY` (optional/demo fallback)
- `QUOTE_POLL_MS`
- `QUOTE_STALE_MS`

## CI Verification Modes
### Pull Request (fast path)
- `docs:check-links`
- `typecheck`
- `test` (unit)
- API integration test suite against service containers
- Playwright smoke (`@smoke`, desktop chromium)

### Main / Nightly (deep path)
- Same checks as PR
- Full Playwright matrix (desktop + mobile projects)

## Pre-Deploy Checklist
- All CI jobs green in applicable mode
- Prisma migrations applied successfully
- Seed strategy for target environment confirmed
- WebSocket connectivity verified end-to-end
- Integration + E2E contract checks passing

## Operational Checklist
- Monitor API uptime and websocket disconnect rates.
- Monitor queue health and analysis job retries/failures.
- Monitor market provider failures/rate limits.
