---
name: max-leverage
description: Owner max-leverage checklist for GSE settlement recovery, Stripe checkout reconciliation, and free data capacity.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Max leverage (GSE)

## Order of operations
1. Verify free-first settlement path (`apps/web/lib/settlement/path-select.ts`): since 2026-09-02 the free ESPN/consensus grader runs **primary on every cycle**. When `THE_ODDS_API_KEY` is **ABSENT**, settle runs free pass only (`path: "free"`); when **PRESENT**, free runs first and a paid supplement runs on remaining PENDING rows without ever failing the free pass.
2. Verify Stripe webhook handles `checkout.session.completed` + `checkout.session.expired` on `www` with matching signing secret (`STRIPE_WEBHOOK_SECRET`).
3. Audit owner-portal cloud/telemetry credits (`docs/ops/CREDITS.md`) without inventing grant amounts or secrets.
4. Prefer already-cleared free feeds (`nflverse`, `espn-public-api`, `open-meteo`) and scheduled crons (`apps/web/vercel.json`).

## Guardrails
- Never invent secrets, credit balances, or grant amounts.
- Never re-enable `/api/cron/gamma` without counsel-approved registry clearance.
- Never flip `LIVE_BOARD` / `PUBLIC_PICKS_ENABLED` / `PUBLISH_LEDGER` without explicit owner approval.

## Verification & Done
- Doc & smoke: `docs/ops/MAX_LEVERAGE.md`, `scripts/ops/orbit-unlock-smoke.mjs`.
- Done when `npm run orbit:unlock-smoke`, `npm run agent:eval`, and `npm run guard:model-freeze` exit `0`.
