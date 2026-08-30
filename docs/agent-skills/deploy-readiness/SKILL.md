---
name: deploy-readiness
description: Pre-ship guards, smoke, and env readiness without inventing secrets.
---

# Deploy readiness

## Purpose
Ship only when guards + smokes pass. Production secrets are founder-set.

## Commands
```bash
npm run guardrails
npm run evals:contracts
npm run agent:eval          # thin agent harness
node scripts/e2e/pricing-smoke.mjs   # optional HOST=
npm run free:doctor
# Production cron smoke (needs real CRON_SECRET — operator)
bash scripts/ops/gamma-cron-smoke.sh   # 401 then 200 pattern for dual secret
```

## Related
- `docs/ops/OPERATOR.md` — free-path key blank, Stripe Dashboard, settle curl
- `docs/ops/SMOKE.md`, `docs/ops/CREDENTIALS_CHECKLIST.md`

## Do-not-dos
- Do not invent DATABASE_URL / CRON_SECRET / STRIPE_* / THE_ODDS_API_KEY
- Do not flip LIVE_BOARD / PUBLISH_LEDGER without founder YES
- Do not claim prod green without smoke evidence
