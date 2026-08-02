---
name: max-leverage
description: Founder max-leverage unlock for GSE money recovery and free capacity. Use when asked to unlock, free path, or maximize orbit.
---

# Max leverage (GSE)

## Order of operations
1. Blank Production `THE_ODDS_API_KEY` → free settle path
2. Stripe `checkout.session.expired` on www + secret match
3. Credits claims (founder portals only)
4. Smoke: `npm run orbit:unlock-smoke` then `--prod` with CRON_SECRET

## Laws
- Free only when key **ABSENT**
- Never invent secrets or grant amounts
- Never re-enable gamma without counsel
- Never flip LIVE_BOARD without founder YES
- Prefer free nflverse / ESPN / henrygd capacity already scheduled

## Code
- Path law: `apps/web/lib/settlement/path-select.ts`
- Unlock smoke: `scripts/ops/orbit-unlock-smoke.mjs`
- Doc: `docs/ops/MAX_LEVERAGE.md`
