# Neon pool monitoring (GSE)

## App-side probe
`probeNeonPool(db)` in `neon-pool-monitor.ts`:
- `SELECT clock_timestamp()` latency
- optional `pg_stat_activity` counts
- process-local success/fail counters

Wire into `/api/health` live probes or a cron log line. Do not flip LIVE_BOARD from DB latency.

## Neon-side (console)
- **Connections** / monitoring charts on the Neon project
- Pooler vs direct endpoint metrics
- Compute status (idle/active), restarts

## Env
- `DATABASE_URL` — pooled for runtime
- `DIRECT_URL` — migrations
- `NEON_SERVERLESS_DRIVER=true` — WebSocket driver when TCP flakes
