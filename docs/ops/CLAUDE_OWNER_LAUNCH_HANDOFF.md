# Claude Code — Owner launch handoff (refresh 2026-08-06)

**Truth:** github.com/Beexly/Sports · **Live:** https://www.galaxysportsedge.com  
**Do not re-ship:** #320–#341 (Jynx, free-lane, settle drains, trust chrome, grace DRY, preflight)  
**Do not flip:** LIVE_BOARD · PUBLIC_PICKS · STATS_PUBLIC · PERFORMANCE_STATS  
**Do not** put CrewAI / Ollama / OpenClaw into this monorepo (personal machine only)

---

## Concepts you may touch (do not rewrite)

### Settlement grace period
- Constant: `SETTLEMENT_DEFAULT_GRACE_HOURS = 6` in `apps/web/lib/performance/settlement-health.ts`
- A pick is **overdue** if published, non-seed, `result=PENDING`, and `commenceTime` older than **now − 6h**
- Used by: `loadSettlementHealth`, free settle, ops truth, health probes, health-alert, Jarvis
- Bands: 0 overdue = HEALTHY; 1–4 = DEGRADED; ≥5 = CRITICAL (default threshold)

### /api/health vs alert
- `ok` / HTTP 503 = **database + ingestion checks only**
- Settlement CRITICAL → `status: degraded` + capability unavailable; does **not** alone 503
- Health-alert pages on settlement **CRITICAL**, check errors, or ingestion age **>90m** (quiet 4h)
- Capability graph = observability only (never flips `ok`)

---

## START

```bash
git fetch origin main && git checkout main && git pull --ff-only
node scripts/ops/launch-preflight.mjs   # see docs/ops/LAUNCH_PREFLIGHT.md
# CRON_SECRET=… node scripts/ops/launch-preflight.mjs
```

Confirm **Vercel Production READY** on main HEAD (not ERROR).

---

## OWNER WORK (all of these)

### P0 — Deploy
- [ ] Production READY includes latest main (revenueLadder on ops, grace constant, free-path TEAM_GAME_LOG)
- [ ] Preflight: no unexpected 404s; settle overdue 0

### P1 — Env (Vercel Production → redeploy)
```
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=…
# optional FREE_LANE_SECONDARY_*
CLAUDE_PROVIDER=auto
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true
# + BEDROCK and/or AZURE_FOUNDRY and/or VERTEX full *_MODEL_MAP
# optional WAITLIST_WELCOME_EMAIL + RESEND + ALERTS_EMAIL_FROM
# optional HEALTH_ALERT_WEBHOOK_URL (or ALERT_WEBHOOK_URL)
# optional NEXT_PUBLIC_ANALYTICS_ENABLED + NEXT_PUBLIC_CLARITY_PROJECT_ID
```
- [ ] Ops: freeLaneConfigured and/or jynx.attemptOrder non-empty

### P1 — Stripe Dashboard
- [ ] Only webhook → galaxysportsedge.com `/api/webhooks/stripe`
- [ ] Remove/justify `lumeralabel.medusajs.app` if present
- [ ] Secret matches `STRIPE_WEBHOOK_SECRET`

### P1 — Settle proof
```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/settle-picks"
```
- [ ] 2xx · path free|paid · overdue still 0  
- [ ] Fields: `clvRepair`, `snapshotRepair`, `teamGameLogRepair`

### P2
- [ ] Clarity optional; PostHog only after privacy review  
- [ ] Open PRs #121 #226 #247 #248 #258 — VERIFY PREMISE + slim re-land only (no bulk merge)

---

## FORBIDDEN
Gate flips · public ROI / lock slang · hive into Sports · settlement via LLM · invent scores · change grace without product reason

---

## DONE WHEN
- Preflight !! only intentional (dark gates / optional analytics / cash path until env set)
- Stripe clean · desired free-lane/Jynx live · settle repairs OK · SHA ≈ main

## REPORT (one block)
`mainSHA · prodSHA · match · overdue · freeLane · jynx · stripeClean · webhookAlert · one next action`
