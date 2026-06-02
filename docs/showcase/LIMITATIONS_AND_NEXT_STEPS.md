# Known Limitations and Next Steps

## Current limitations
- Single demo account (no full auth/multi-user isolation).
- Market data near-realtime polling, not exchange-grade stream.
- Integration tests require Postgres/Redis services available.

## Next steps
- Add auth and per-user portfolios.
- Add provider failover strategy and rate-limit backpressure.
- Add richer trade types (limit/stop simulation).
- Expand observability dashboards and alerting.
