---
name: deploy-readiness
description: Pre-ship guards, smoke tests, and env readiness checks without inventing secrets.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Deploy readiness

## Purpose
Ship to production only after guardrails, contracts, pricing smoke, and cron verification pass with zero fabricated secrets.

## Verification Sequence
```powershell
npm run guardrails
npm run evals:contracts
npm run agent:eval
node scripts/e2e/pricing-smoke.mjs
npm run free:doctor
```
Operator cron check (requires real `CRON_SECRET`, bash/WSL): `bash scripts/ops/gamma-cron-smoke.sh` (verifies 401 unauthenticated then 200 authenticated).

## Related Docs & Guardrails
- `docs/ops/OPERATOR.md`, `docs/ops/SMOKE.md`, `docs/ops/CREDENTIALS_CHECKLIST.md`
- Never invent `DATABASE_URL`, `CRON_SECRET`, `STRIPE_*`, or `THE_ODDS_API_KEY`.
- Never flip `LIVE_BOARD` / `PUBLISH_LEDGER` without explicit owner approval, and never claim production green without direct HTTP probe evidence.

## Completion Criteria
Done when `npm run guardrails`, `npm run evals:contracts`, `npm run agent:eval`, `npm run free:doctor`, and `@sports/web` production build + ESLint exit `0`.
