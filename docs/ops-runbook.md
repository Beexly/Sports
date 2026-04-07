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
