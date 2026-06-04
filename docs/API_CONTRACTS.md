# API Contracts

## Source of Truth
- Shared schema definitions: `packages/schemas/src/index.ts`
- Controller entry points: `apps/api/src/*/*.controller.ts`

## Envelopes
### Success
```json
{ "data": "..." }
```

### Error
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message",
    "details": {},
    "requestId": "uuid"
  }
}
```

## Endpoints
### `GET /stocks/search?q={query}`
- Purpose: symbol search
- Response: `{ data: Array<{ symbol, description }> }`

### `GET /stocks/:ticker/quote`
- Purpose: current quote
- Response: `{ data: Quote }`
- Quote fields: `ticker`, `price`, `change`, `changePercent`, `updatedAt`, `source`

### `GET /stocks/:ticker/context`
- Purpose: quote, fundamentals, news, analyst trend, and data-quality evidence snapshot
- Response: `{ data: MarketContext }`

### `GET /portfolio`
- Purpose: current demo account state
- Header: optional `x-demo-user-id` isolates a browser/demo portfolio
- Response: `{ data: Portfolio }`
- Portfolio fields: `accountKey`, `cash`, `totalValue`, `totalPnl`, `totalPnlPercent`, `realizedPnl`, `totalUnrealizedPnl`, `positions[]`

### `POST /trades/preview`
- Purpose: validate a virtual trade before execution
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1, "orderType": "MARKET|LIMIT|STOP", "limitPrice": 200, "stopPrice": 180 }
```
- Response: `{ data: TradePreview }`
- Preview fields: `currentPrice`, `estimatedPrice`, `estimatedGross`, `projectedCash`, `projectedShares`, `executableNow`, `sizingHint`, `warnings[]`

### `POST /trades`
- Purpose: place virtual trade
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1, "orderType": "MARKET|LIMIT|STOP", "limitPrice": 200, "stopPrice": 180 }
```
- Response: `{ data: Portfolio }` (updated)
- Domain error codes:
  - `INSUFFICIENT_FUNDS`
  - `INSUFFICIENT_SHARES`
  - `ORDER_NOT_TRIGGERED`
  - `STALE_QUOTE`
  - `UNSUPPORTED_MARKET_DATA`

### `GET /trades?limit={n}`
- Purpose: recent virtual trade history
- Response: `{ data: Trade[] }`

### `POST /analysis-runs`
- Purpose: create/reuse analysis run
- Request body:
```json
{ "ticker": "AAPL", "idempotencyKey": "optional-string" }
```
- Response: `{ data: AnalysisRun }`

### `GET /analysis-runs`
- Purpose: list recent runs
- Response: `{ data: AnalysisRun[] }`

### `GET /analysis-runs/:id/explain`
- Purpose: structured manager explainability for a run
- Response: `{ data: AnalysisExplanation }`
- Explanation fields: `managerScore`, `managerConfidence`, `voteMix`, `coverage`, `topContributors`, `caveats[]`, `agents[]`
- Agent explanation fields: `agentType`, `role`, `stage`, `status`, `recommendation`, `confidence`, `baseWeight`, `effectiveWeight`, `contribution`, `summary`, `reasons[]`

## Request Correlation
- Response header includes `x-request-id`.
- Error envelope includes `requestId`.
