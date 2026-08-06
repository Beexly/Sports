# CRON_SECRET verification steps

Production crons (`settle-picks`, `health-alert`, free-spine, etc.) only run
when Vercel sends `Authorization: Bearer <CRON_SECRET>` and the app accepts it.

Without a correct secret: settlement drain stalls, health alerts never page,
and ops detail endpoints stay public-summary-only.

## 1. Confirm the secret exists on Vercel Production

1. Vercel → Project **sports-web** (or monorepo web app) → **Settings → Environment Variables**
2. Production must include:
   - `CRON_SECRET` — long random string (32+ chars)
   - Optional: `CRON_SECRET_PREVIOUS` during rotation only
3. After any change: **Redeploy** (env injects at build/runtime).

Generate (local, do not commit):

```bash
openssl rand -hex 32
```

## 2. Negative check (must 401)

```bash
curl -sS -o /tmp/cron-noauth.json -w "%{http_code}" \
  "https://www.galaxysportsedge.com/api/cron/health-alert"
# expect: 401
cat /tmp/cron-noauth.json
# expect: {"error":"Unauthorized"}  OR  {"error":"CRON_SECRET not configured"} if unset
```

| HTTP | Meaning |
|------|---------|
| **401** | Secret is configured; request unauthorized — good baseline |
| **500** + `CRON_SECRET not configured` | **Set CRON_SECRET and redeploy** |
| **200** without Bearer | Misconfiguration — auth not enforced (investigate) |

## 3. Positive check (must 200 with Bearer)

```bash
export CRON_SECRET='…paste Production value…'

curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/health-alert" | head -c 400
# expect HTTP 200 and JSON body (not Unauthorized)
```

## 4. Settlement drain (P0 when overdue > 0)

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/settle-picks" | python3 -m json.tool | head -80
```

Look for:

- `path: "free"` when Odds API key absent (correct free-first mode)
- `picksSettled` > 0 when backlog exists and scores match
- `clvRepair` — pending CLV grades drained this cycle
- `rca` / `stp` for root-cause if still overdue

## 5. Ops truth detail (Bearer)

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/ops/public-surface-truth" | python3 -m json.tool
```

- Without Bearer: `detail: "public"`, settlement counts only
- With Bearer: `detail: "operator"`, includes `bySport` + `operatorNext`

## 6. Automated smoke (repo script)

```bash
# From monorepo root — never commit the secret
CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com \
  node scripts/ops/verify-cron-secret.mjs
```

Exit 0 = negative 401 + positive 200 both pass.

## 7. Rotation

1. Set `CRON_SECRET_PREVIOUS` = old primary
2. Set `CRON_SECRET` = new primary
3. Redeploy
4. Run positive check with **new** secret
5. Remove `CRON_SECRET_PREVIOUS` after one stable day

## Law

- Never put CRON_SECRET in git, chat, or client bundles
- Never log the secret value
- Dual-secret only during rotation (`authorizeCronSecret` in `@sports/util`)
