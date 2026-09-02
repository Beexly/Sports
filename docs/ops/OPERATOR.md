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

LIVE_BOARD · PUBLISH_LEDGER · PERFORMANCE_STATS · Phase C · HEOS #226 · gamma schedule

State check (observed 2026-09-02 on `/api/ops/public-surface-truth`): `PUBLIC_PICKS_ENABLED`
is **already ON** in production (`gates.canExposePublicPicks: true`, the board serves 55
picks/day); `PERFORMANCE_STATS`, `LIVE_BOARD` and `PUBLISH_LEDGER` are off. Publishing a
pick is not a track-record claim; the record gates above stay closed until calibration
eligibility is GREEN ×3.

## 5. Environment variables (moved here from CLAUDE.md on 2026-09-02)

Every value is set in the deploy environment (Vercel → Project → Settings → Environment Variables), never in code. Agent sessions cannot read `.env*` files; this list is the reference.

```
DATABASE_URL=
DIRECT_URL=
NEXTAUTH_SECRET=
# Must be the exact live canonical host WITH www: https://www.galaxysportsedge.com
# (identical to NEXT_PUBLIC_APP_URL). See canonical-host note below.
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# Per-interval price IDs are what checkout reads. The monthly vars fall back to
# the legacy STRIPE_PRO_PRICE_ID / STRIPE_ELITE_PRICE_ID when unset.
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_ANNUAL_PRICE_ID=
STRIPE_ELITE_MONTHLY_PRICE_ID=
STRIPE_ELITE_ANNUAL_PRICE_ID=
STRIPE_FANTASY_MONTHLY_PRICE_ID=
STRIPE_FANTASY_ANNUAL_PRICE_ID=
# Point-of-sale Terms consent at Stripe Checkout. DEFAULT OFF. Order matters:
# set the Stripe Dashboard Terms-of-Service URL FIRST, THEN flip this to "true"
# (otherwise Stripe rejects every Checkout Session and new subscriptions 500).
# Unset/"false" = checkout omits consent_collection and behaves exactly as before.
STRIPE_TERMS_CONSENT_ENABLED=
THE_ODDS_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=
# Canonical public base URL. The single source of truth is
# apps/web/lib/seo/site-url.ts, which resolves to NEXT_PUBLIC_APP_URL when set,
# else defaults to the WWW host https://www.galaxysportsedge.com (never the apex).
NEXT_PUBLIC_APP_URL=
```

### 5a. Canonical host (single source of truth)

The one canonical base URL lives in `apps/web/lib/seo/site-url.ts` (`SITE_URL`):
`NEXT_PUBLIC_APP_URL` when set, else `https://www.galaxysportsedge.com` (the **www**
host — never the apex). All absolute-URL construction — `metadataBase`, `sitemap.ts`,
`robots.ts`, canonical tags, JSON-LD, RSS, bot-post links — resolves off it.

**OPERATOR (owner's env/console step — not code):**

- Set `NEXT_PUBLIC_APP_URL=https://www.galaxysportsedge.com` in the deploy env.
- Set `NEXTAUTH_URL=https://www.galaxysportsedge.com` (identical host).
- In the Google Cloud Console OAuth client, add
  `https://www.galaxysportsedge.com/api/auth/callback/google` to the Authorized
  redirect URIs.

The apex (`https://galaxysportsedge.com`) should redirect to www at the DNS/platform
layer (not in app code).

## 6. Launch readiness in one command

```bash
npm run launch:ready            # production, read-only, no secrets; exit 1 on any FAIL
npm run launch:ready -- --json  # machine-readable
```

`scripts/check-launch-readiness.mjs` reads the platform's own truth surfaces
(`/api/health?strict=1`, `/api/ops/public-surface-truth`, the proof API, the picks API)
plus the repo (cron config mirror, operator tasks, nflverse currency) and applies the
platform's own gates: settlement HEALTHY with 0 overdue, calibration eligibility, the
record gate (PERFORMANCE_STATS never on while eligibility is not GREEN), odds freshness,
free score spine, money path, founder P0 queue. It never invents a number; anything the
endpoint does not report prints as unknown. Run it the morning of every slate and after
every production deploy; a FAIL is a stop.

## Related
- Skills: `.claude/skills/`
- Credits: `docs/ops/CREDITS.md` + `GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`
- Stripe detail: `STRIPE_GO_LIVE_CHECKLIST.md`
- Credentials: `CREDENTIALS_CHECKLIST.md`
