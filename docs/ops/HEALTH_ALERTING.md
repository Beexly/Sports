# Health alerting

**Updated:** 2026-07-31  
**Related:** Launch Readiness Audit — 5-day silent ingestion outage

## Route

`GET /api/cron/health-alert` (Bearer `CRON_SECRET`)

Schedule in `vercel.json`: `*/15 * * * *`

## When it alerts

Unhealthy if any of:
- Any live check status ≠ `ok`
- Ingestion last-success age > 90 minutes
- Settlement capability is `unavailable` / critically behind

Alert fires on:
- Transition healthy → unhealthy, **or**
- Every 4 hours while still unhealthy

## Notification

Set in Vercel production:

```
HEALTH_ALERT_WEBHOOK_URL=https://hooks.slack.com/...   # or Discord / generic webhook
```

Payload includes status, reason, ingestion age, deployment sha, link to `/api/health`.

If unset, the cron still runs and logs `[health-alert] ALERT: ...` (visible in Vercel logs).

## Zero-code backup

Point UptimeRobot / Better Stack / Cronitor at:

`https://www.galaxysportsedge.com/api/health`

Alert when HTTP status ≠ 200 (or body `ok === false`). This does not require any app change.

## State limitation

Alert dedupe state is process-local (same pattern as free-spine cache). A new serverless isolate may re-alert within the quiet window once — acceptable for v1.
