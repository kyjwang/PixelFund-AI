# Known Limitations and Next Steps

## Current limitations
- Browser-isolated simulation accounts with scoped portfolio, watchlist, and trade history, but no production auth provider yet.
- Market data near-realtime polling, not exchange-grade stream.
- Limit/stop orders are durable simulator orders, but fills still depend on quote polling cadence rather than exchange-grade routing.
- Provider resilience currently uses cache fallback; no secondary live provider is wired yet.
- Trading execution fails closed when live provider market data is stale, unsupported, or unavailable.
- Integration tests require Postgres/Redis services available.

## Next steps
- Add production auth and server-side user management.
- Add provider failover strategy and rate-limit backpressure with durable quote snapshots.
- Add richer order analytics such as time-in-force, expiration handling, and provider-backed depth when real data exists.
- Expand observability dashboards and alerting.
