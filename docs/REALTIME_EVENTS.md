# Realtime Events

## Source of Truth
- Shared websocket schema payloads: `packages/schemas/src/index.ts`
- Gateway and emitters: `apps/api/src/ws/events.gateway.ts`, quote/analysis services

## Client -> Server
### `quote.subscribe`
Request payload:
```json
{ "ticker": "AAPL" }
```

Behavior:
- Server deduplicates subscriptions across connected clients.
- Server starts/stops provider polling based on active subscriber set.

## Server -> Client
### `quote.updated`
```json
{
  "ticker": "AAPL",
  "price": 123.45,
  "change": 1.23,
  "changePercent": 1.01,
  "updatedAt": "ISO timestamp",
  "source": "finnhub|demo"
}
```

### `quote.stale`
```json
{ "ticker": "AAPL", "lastUpdatedAt": "ISO timestamp" }
```

### `analysis.agent.started`
```json
{ "analysisRunId": "...", "agentType": "TECHNICAL_ANALYST", "status": "RUNNING" }
```

### `analysis.agent.completed`
- Payload shape: `AgentResult`

### `analysis.agent.failed`
```json
{
  "analysisRunId": "...",
  "agentType": "NEWS_ANALYST",
  "status": "FAILED",
  "errorReason": "..."
}
```

### `analysis.portfolioRecommendation.completed`
- Payload shape: `AgentResult` (Portfolio Manager result)

### `analysis.portfolioRecommendation.failed`
```json
{ "analysisRunId": "...", "status": "FAILED", "errorReason": "..." }
```

### `portfolio.updated`
- Payload shape: `Portfolio`

## Ordering Notes
- Agent lifecycle is emitted per-agent in execution order.
- Portfolio manager completion/failure occurs after specialist attempts finish.
