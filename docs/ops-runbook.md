# Ops Runbook

## Deployment

### Prerequisites
- PostgreSQL 15+
- Redis 7+
- Node.js 20+
- Stripe account with products configured
- The Odds API key
- Anthropic API key

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill all required values (see CLAUDE.md for list)
3. Run `npm run db:migrate` to apply schema
4. Run `npm run db:seed` to seed sports/leagues

### Docker Compose (Local)
```bash
docker-compose up -d postgres redis
npm run dev
```

### Production Deploy
```bash
npm run build
npm run db:migrate
npm start
# Workers: node workers/data-refresh/index.js
# Workers: node workers/pick-generation/index.js
# Workers: node workers/content-publishing/index.js
```

> **UPDATE 2026-06-30:** The self-hosted `npm start` + standalone-worker model
> documented above describes one deployment topology, but it is NOT how the
> platform currently runs in production. The following four corrections are each
> verified against the current code in this repo; the historical text is left in
> place for reference.
>
> 1. **Production deploy.** Prod runs on **Vercel** (`vercel.json` →
>    `"framework": "nextjs"`), not a long-lived `npm start` process plus a
>    standalone Node worker. The prod refresh/settlement cadence is governed by
>    **daily Vercel crons**, not the documented `*/30 * * * *`. Per `vercel.json`
>    `crons`: `/api/cron/refresh-odds` runs `0 10 * * *` and
>    `/api/cron/settle-picks` runs `0 7 * * *` (both daily). The 30-minute
>    `setInterval` (`REFRESH_INTERVAL_MS = 30 * 60 * 1000` in
>    `workers/data-refresh/src/index.ts`) applies ONLY to the optional
>    standalone long-running worker, not to the deployed Vercel cron path.
>
> 2. **Worker run command.** `node workers/data-refresh/index.js` is wrong —
>    no such file exists. The canonical entry is the npm script
>    `workers:refresh` → `node workers/data-refresh/dist/index.js` (run after a
>    build), per `package.json`. The TypeScript source lives at
>    `workers/data-refresh/src/index.ts` (run directly with `ts-node src/index.ts`
>    during development). The same pattern holds for `workers:picks` and
>    `workers:content`.
>
> 3. **Health checks.** `GET /api/health`
>    (`apps/web/app/api/health/route.ts`) checks ONLY two things: the database
>    (`SELECT 1` via `db.$queryRaw`) and the last **SUCCESS** ingestion run.
>    There is **no Redis connectivity check** in the health route — the "Redis
>    connectivity" probe listed below under *Health Checks* is **stale**.
>
> 4. **Alerts.** The "no ingestion run in > 2 hours → critical alert" line below
>    is **stale**. Staleness is now governed by the shared Refresh SLA:
>    `apps/web/lib/data-reliability/refresh-sla.ts` defines
>    `REFRESH_STALE_AFTER_MINUTES = 240` (4h, the `/api/health` 503 trigger) and
>    `REFRESH_WARN_AFTER_MINUTES = 120` (2h warn). The 2h boundary is now a WARN,
>    not a hard critical; the 503/critical threshold is 4h. The old hard-coded 2h
>    magic number caused false 503s once the cadence relaxed to a daily cron.

## Background Workers

### Data Refresh Worker
- **Schedule**: Every 30 minutes (cron: `*/30 * * * *`)
- **Function**: Fetches fresh odds from The Odds API
- **On failure**: Logs error, sends alert, retries next cycle
- **Monitoring**: Check `IngestionRun` table for status

### Pick Generation Worker
- **Trigger**: After successful data refresh
- **Function**: Runs prediction engine on new odds
- **On failure**: Logs error, skips cycle (no stale picks)

### Content Publishing Worker
- **Trigger**: After successful pick generation
- **Function**: Generates blog posts via Claude API
- **On failure**: Logs error, posts remain unpublished

## Monitoring

### Key Metrics to Watch
- `IngestionRun.status` — should all be 'SUCCESS'
- `Pick.count` by date — sudden drops indicate data issues
- `Subscription.status` counts — active vs churned
- API response times (target: < 500ms p95)

### Health Checks
- `GET /api/health` — returns system status
- Database connectivity
- Redis connectivity  
- Last ingestion run timestamp

### Alerts
- No ingestion run in > 2 hours → critical alert
- Error rate > 5% on any endpoint → warning
- Subscription webhook failures → immediate alert

## Stripe Webhook Setup
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `customer.subscription.*`, `invoice.payment_*`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Database Maintenance

### Backup
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Useful Queries
```sql
-- Check latest ingestion runs
SELECT * FROM ingestion_runs ORDER BY created_at DESC LIMIT 10;

-- Today's picks
SELECT * FROM picks WHERE DATE(generated_at) = CURRENT_DATE ORDER BY confidence DESC;

-- Active subscriptions by tier
SELECT tier, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY tier;

-- Win rate by sport
SELECT sport, 
  COUNT(*) FILTER (WHERE result = 'WIN') as wins,
  COUNT(*) FILTER (WHERE result = 'LOSS') as losses,
  ROUND(COUNT(*) FILTER (WHERE result = 'WIN')::numeric / NULLIF(COUNT(*) FILTER (WHERE result IN ('WIN','LOSS')), 0) * 100, 1) as win_pct
FROM picks 
WHERE result IS NOT NULL
GROUP BY sport;
```

## Incident Response

### Data Ingestion Failure
1. Check `IngestionRun` table for error message
2. Verify `THE_ODDS_API_KEY` is valid and not rate-limited
3. Check The Odds API status page
4. Manually trigger refresh: `POST /api/admin/trigger-refresh`

### Stripe Webhook Failure
1. Check Stripe Dashboard → Webhooks → Recent Events
2. Check server logs for verification errors
3. Re-deliver failed events from Stripe Dashboard

### Database Connection Issues
1. Check `DATABASE_URL` is correct
2. Verify PostgreSQL is running
3. Check connection pool limits
