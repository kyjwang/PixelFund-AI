# Setup

## Prerequisites
- Node.js 20+
- npm 10+
- Optional: Docker Desktop (recommended path)
- Non-Docker path requires local PostgreSQL and Redis running

## Environment Variables
Copy environment file:

```bash
cp .env.example .env
```

Expected keys:
- `DATABASE_URL`
- `REDIS_URL`
- `FINNHUB_API_KEY` (optional for demo fallback)
- `OPENAI_API_KEY` (optional for demo fallback)
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `QUOTE_POLL_MS`
- `QUOTE_STALE_MS`

## Path A: Docker (recommended)

```bash
npm install
npm run dev:all
```

This performs:
1. `infra:up` (Postgres + Redis)
2. `db:setup` (Prisma generate + migrate + seed)
3. `dev` (web + api)

### Verification Output
Expected logs include:
- `Connected to PostgreSQL`
- `Connected to Redis`
- `API listening on http://localhost:4000`
- Next dev server on `http://localhost:3000`

## Path B: Non-Docker
Ensure local services are available:
- PostgreSQL at `localhost:5432`
- Redis at `localhost:6379`

Then run:

```bash
npm install
npm run db:setup
npm run dev
```

## Useful Commands
- Start infra only: `npm run infra:up`
- Stop infra: `npm run infra:down`
- Stop + reset volumes: `npm run infra:down:volumes`
- Regenerate Prisma client: `npm run db:generate`
- Seed only: `npm run db:seed`

## Troubleshooting
- `docker: command not found`: install Docker Desktop or use non-Docker path.
- DB connection failures: verify `DATABASE_URL` and service availability.
- Redis connection failures: verify `REDIS_URL` and Redis health.
- Empty/failed AI output: app falls back to demo behavior when `OPENAI_API_KEY` is absent.
