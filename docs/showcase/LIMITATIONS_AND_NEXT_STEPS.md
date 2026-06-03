# Known Limitations and Next Steps

## Current limitations
- Browser-isolated demo accounts, but no production auth provider yet.
- Market data near-realtime polling, not exchange-grade stream.
- Limit/stop orders are immediate trigger simulations, not durable pending orders.
- Provider resilience currently uses cache fallback; no secondary live provider is wired yet.
- Integration tests require Postgres/Redis services available.

## Next steps
- Add production auth and server-side user management.
- Add provider failover strategy and rate-limit backpressure with durable quote snapshots.
- Add durable pending orders, fills, cancellations, and order history.
- Expand observability dashboards and alerting.
