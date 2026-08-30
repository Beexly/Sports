# OPERATOR — production actions agents cannot perform

**Law:** never invent secrets. Code already implements free path, webhook expiry, outbox lease.

## 1. Free settlement recovery (highest leverage if settle stuck)

1. Vercel → Project → Settings → Environment Variables → Production  
2. **Blank** `THE_ODDS_API_KEY` (delete or empty). Present+deactivated does **not** free-path.  
3. Redeploy or wait for env sync.  
4. Manual settle:
   ```bash
   curl -sS -H "Authorization: Bearer $CRON_SECRET" \
     "https://www.galaxysportsedge.com/api/cron/settle-picks" | jq .
   ```
   Expect `"path":"free"`. Cron cadence: every 3h (`vercel.json`, #278).

## 2. Stripe Dashboard

Endpoint: `https://www.galaxysportsedge.com/api/webhooks/stripe` (www, not apex).

Ensure events include (code already handles):
- `checkout.session.completed`
- `checkout.session.expired` ← add if missing on endpoint
- subscription + invoice events per `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md`

**Secret match:** `STRIPE_WEBHOOK_SECRET` must match **this** endpoint’s signing secret (`we_…` / `whsec_…`). Sustained 400s = wrong secret.

## 3. CRON_SECRET

Primary `CRON_SECRET` on Production. Dual-secret rotation: `CRON_SECRET_PREVIOUS`. Smoke: 401 without Bearer, 200 with correct secret.

## 4. Do not flip without founder YES

LIVE_BOARD · PUBLISH_LEDGER · public picks · Phase C · HEOS #226 · gamma schedule

## Related
- Skills: `docs/agent-skills/`
- Credits: `docs/ops/CREDITS.md` + `GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`
- Stripe detail: `STRIPE_GO_LIVE_CHECKLIST.md`
- Credentials: `CREDENTIALS_CHECKLIST.md`
