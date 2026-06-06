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

### `POST /orders/preview`
- Purpose: validate simulator order intent before creation and report whether live market data is tradable
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1, "orderType": "MARKET|LIMIT|STOP", "limitPrice": 200, "stopPrice": 180 }
```
- Response: `{ data: OrderPreview }`
- Preview fields: `currentPrice`, `estimatedPrice`, `estimatedGross`, `projectedCash`, `projectedShares`, `executableNow`, `sizingHint`, `warnings[]`, `tradable`, `quoteSource`, `quoteUpdatedAt`, `dataQualityStatus`, `blockingReasons[]`

### `POST /orders`
- Purpose: create a durable simulator order
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1, "orderType": "MARKET|LIMIT|STOP", "limitPrice": 200, "stopPrice": 180 }
```
- Response: `{ data: Order }`
- Behavior:
  - Market orders fill immediately only when live provider quotes and history are available and fresh.
  - Limit/stop orders persist as `PENDING` until a future live quote crosses the trigger.
  - Demo, fallback, unsupported, or stale market data fails closed with no execution.
- Domain error codes:
  - `MARKET_DATA_NOT_TRADABLE`
  - `ORDER_REJECTED`

### `GET /orders?status={status}&limit={n}`
- Purpose: list durable simulator orders for the current account
- Header: optional `x-demo-user-id` isolates order history and open orders
- Response: `{ data: Order[] }`

### `POST /orders/:id/cancel`
- Purpose: cancel a pending or partially filled simulator order
- Header: optional `x-demo-user-id`
- Response: `{ data: Order }`
- Domain error codes:
  - `ORDER_NOT_CANCELABLE`

### `POST /trades/preview`
- Purpose: legacy virtual trade preview kept for compatibility
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL", "side": "BUY|SELL", "quantity": 1, "orderType": "MARKET|LIMIT|STOP", "limitPrice": 200, "stopPrice": 180 }
```
- Response: `{ data: TradePreview }`

### `POST /trades`
- Purpose: legacy immediate virtual trade placement kept for compatibility
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
- Purpose: recent simulator fill history
- Header: optional `x-demo-user-id` isolates the account fills
- Response: `{ data: Trade[] }`

### `GET /watchlist`
- Purpose: current simulation account watchlist
- Header: optional `x-demo-user-id` isolates saved tickers
- Response: `{ data: WatchlistItem[] }`

### `POST /watchlist`
- Purpose: add or reuse a ticker in the current simulation account watchlist
- Header: optional `x-demo-user-id`
- Request body:
```json
{ "ticker": "AAPL" }
```
- Response: `{ data: WatchlistItem }`

### `DELETE /watchlist/:ticker`
- Purpose: remove a ticker from the current simulation account watchlist
- Header: optional `x-demo-user-id`
- Response: `{ data: { "ticker": "AAPL" } }`

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
