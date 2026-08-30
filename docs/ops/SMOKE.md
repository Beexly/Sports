# SMOKE — post-deploy / post-env commands

**Law:** no secret echo · refuse-default · measure before claim

## 0. Repo root

```bash
cd /path/to/Sports
node scripts/guardrails/trust-gate.mjs
node scripts/guardrails/em-dash-scan.mjs
npm run guard:ai-council
```

## 1. Credentials presence (no values printed)

```bash
node scripts/ops/credentials-smoke.mjs
# optional fail-hard if prod critical missing:
# EXPECT_PROD=1 node scripts/ops/credentials-smoke.mjs
```

## 2. Gamma cron 401 → 200 (Production or Preview HOST)

```bash
export HOST=https://YOUR_DEPLOYMENT.vercel.app
export CRON_SECRET='…'   # from Vercel Production env — never commit
./scripts/ops/gamma-cron-smoke.sh
```

Expect: unauthorized → **401**; Bearer primary → **200** (body may still report empty markets honestly).

## 3. Dual-secret rotation check

```bash
# garbage
curl -sS -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer wrong' "$HOST/api/cron/gamma"
# → 401

# previous (during rotation window)
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $CRON_SECRET_PREVIOUS" "$HOST/api/cron/gamma"
# → 200 if PREVIOUS set and valid

# primary
curl -sS -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $CRON_SECRET" "$HOST/api/cron/gamma"
# → 200
```

## 4. Public law probes (no auth)

```bash
# board should render without lying "all green" under LIVE_BOARD off
curl -sS -o /dev/null -w '%{http_code}\n' "$HOST/board"

# own-values without asOf should refuse (not invent zeros)
curl -sS -o /dev/null -w '%{http_code}\n' "$HOST/api/gse/v1/own/values"
```

## 5. CI truth (agent/founder)

Green PR merge on MAIN already ran monorepo test + build + trust-gate + AI Council DESTROY.  
Local full `npm run typecheck && npm run lint && npm test` is optional if CI is green on tip.

## 6. Do not run

- Do not set LIVE_BOARD / PUBLISH_LEDGER / reveal without explicit founder YES
- Do not put `THE_ODDS_API_KEY` on free critical path as required
- Do not smoke-print secrets into chat logs
