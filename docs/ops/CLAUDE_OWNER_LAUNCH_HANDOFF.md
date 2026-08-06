# Claude Code — Owner / launch handoff (2026-08-06)

**Truth:** `github.com/Beexly/Sports` · **Live:** https://www.galaxysportsedge.com  
**Do not** re-ship #320–#339 · **Do not** flip LIVE_BOARD / PUBLIC_PICKS / STATS_PUBLIC  
**Do not** put CrewAI/Ollama/OpenClaw into this monorepo

## Start

```bash
git fetch origin main && git checkout main && git pull --ff-only
node scripts/ops/launch-preflight.mjs
# CRON_SECRET=… node scripts/ops/launch-preflight.mjs
```

Also open **Vercel → Production** and confirm deploy **READY** (not ERROR). #334 fixed cipher typecheck; if ERROR again, read build log only.

## Owner checklist (do all)

### P0 — Deploy green
- [ ] Production READY on main HEAD (includes revenueLadder on ops truth #339)
- [ ] `launch-preflight` shows revenueLadder + stripe-webhook-audit founder steps (not missing)

### P1 — Env (Vercel Production → redeploy)
```bash
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=...
# optional FREE_LANE_SECONDARY_*
CLAUDE_PROVIDER=auto
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true
# + BEDROCK and/or AZURE_FOUNDRY and/or VERTEX full *_MODEL_MAP
# optional WAITLIST_WELCOME_EMAIL=true + RESEND_* + ALERTS_EMAIL_FROM
# optional NEXT_PUBLIC_ANALYTICS_ENABLED + NEXT_PUBLIC_CLARITY_PROJECT_ID
```
- [ ] Ops: `freeLaneConfigured` and/or `jynx.attemptOrder` non-empty

### P1 — Stripe Dashboard
- [ ] Webhooks: only `galaxysportsedge.com/api/webhooks/stripe`
- [ ] Remove/justify foreign `lumeralabel.medusajs.app` if present
- [ ] Signing secret matches Vercel `STRIPE_WEBHOOK_SECRET`

### P1 — Settle proof (CRON_SECRET)
```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "$BASE/api/cron/settle-picks" | jq '{path, picksSettled, clvRepair, snapshotRepair, teamGameLogRepair, overdue: .free.rca}'
```
- [ ] 2xx · overdue still 0 · repair fields present

### P2 — Optional
- [ ] Clarity analytics keys only after privacy comfort
- [ ] Large open PRs #121 #226 #247 #248 #258 — VERIFY PREMISE + slim re-land only (do not bulk-merge)

## Forbidden
Gate flips · public ROI/lock · hive into Sports · settlement via LLM · rebuild free-lane adapters

## Done when
- Preflight !! only intentional dark gates / optional analytics  
- Stripe clean · free-lane or Jynx credits live if desired  
- Auth settle shows repairs · SHA matches main  

## Report (one block)
`mainSHA · prodSHA · match · overdue · freeLane · jynx · stripeClean · one next action`
