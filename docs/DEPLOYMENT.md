# Deployment

## Target Topology
- Frontend (`apps/web`): Vercel
- Backend (`apps/api`): Render free Node web service
- Database: Neon free PostgreSQL
- Queue/cache: Upstash Redis free tier

This is a free-first demo topology. Expect cold starts, quota limits, and occasional websocket reconnects on free hosting.

## Environment Matrix
### Frontend
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

### Backend
- `DATABASE_URL`
- `REDIS_URL`
- `PORT` (provided by Render; defaults to `4000` locally)
- `FINNHUB_API_KEY` (optional; demo fallback when missing)
- `OPENAI_API_KEY` (optional; demo fallback when missing)
- `NVIDIA_API_KEY` (optional; demo fallback when missing)
- `AI_PROVIDER` (optional; defaults can remain demo-oriented)
- `NVIDIA_BASE_URL` (optional)
- `NVIDIA_MODEL` (optional)
- `QUOTE_POLL_MS`
- `QUOTE_STALE_MS`

## Free Deploy Steps
### 1. Create storage
- Create a Neon Postgres database and copy its `DATABASE_URL`.
- Create an Upstash Redis database and copy its `REDIS_URL`.
- Run production migrations once with the hosted database URL:
  ```bash
  DATABASE_URL="postgresql://..." npm run db:deploy
  ```

### 2. Deploy the API on Render
- Create a Render Web Service from this repository, or use the included `render.yaml` blueprint.
- Build command:
  ```bash
  npm ci && npm run db:generate && npm run build --workspace @pixelfund/api
  ```
- Start command:
  ```bash
  npm run start --workspace @pixelfund/api
  ```
- Health check path: `/health`
- Required env vars: `DATABASE_URL`, `REDIS_URL`
- Optional env vars: `FINNHUB_API_KEY`, `OPENAI_API_KEY`, `NVIDIA_API_KEY`, `AI_PROVIDER`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `QUOTE_POLL_MS`, `QUOTE_STALE_MS`

### 3. Deploy the web app on Vercel
- Create a Vercel project for `apps/web`.
- The included `apps/web/vercel.json` sets monorepo install/build commands.
- Set frontend env vars:
  ```bash
  NEXT_PUBLIC_API_URL=https://your-render-api-host
  NEXT_PUBLIC_WS_URL=https://your-render-api-host
  ```
- Deploy to production after the API URL is available.

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
- `GET /health` returns HTTP 200 on the API host
- WebSocket connectivity verified end-to-end
- Integration + E2E contract checks passing

## Operational Checklist
- Monitor API uptime and websocket disconnect rates.
- Monitor queue health and analysis job retries/failures.
- Monitor market provider failures/rate limits.
