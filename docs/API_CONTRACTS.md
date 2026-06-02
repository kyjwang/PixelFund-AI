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
- Response: `{ data: Portfolio }`
- Portfolio fields: `cash`, `totalValue`, `totalUnrealizedPnl`, `positions[]`

### `POST /trades`
- Purpose: place virtual trade
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1 }
```
- Response: `{ data: Portfolio }` (updated)
- Domain error codes:
  - `INSUFFICIENT_FUNDS`
  - `INSUFFICIENT_SHARES`

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

## Request Correlation
- Response header includes `x-request-id`.
- Error envelope includes `requestId`.
