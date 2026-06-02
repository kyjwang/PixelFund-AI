# Incident Runbook

## API unavailable
1. Run `npm run health:check`.
2. Confirm `API listening on http://localhost:4000` in backend logs.
3. Validate `.env` `DATABASE_URL` and `REDIS_URL`.
4. Restart services and re-run `npm run db:setup`.

## Redis unavailable / job backlog
1. Check Redis reachability (`health:check`).
2. Inspect analysis runs for stuck `RUNNING`/`PENDING` states.
3. Restart API worker process.
4. Re-trigger analysis run via UI.

## Stale quote behavior
1. Confirm websocket connection and `quote.updated` events.
2. If stale persists, user should retry quote fetch and reattempt trade.
3. Validate provider key and external API rate limits.

## Contract mismatch
1. Run `npm run typecheck` and integration tests.
2. Compare payload schemas in `packages/schemas/src/index.ts`.
3. Update docs and tests in same change set.
