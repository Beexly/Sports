---
name: coding-agent
description: Minimal-diff coding on GSE money path. Use when editing webhooks, settlement, outbox, or clearance. Prefer reuse over rewrite.
---

# Coding agent (GSE)

## Laws
1. Prefer minimal diffs; do not rebuild settlement/Stripe/outbox that already work.
2. Before editing webhooks, read the existing handler; reuse idempotency (`stripeEventId`).
3. Adding `checkout.session.expired` must mirror completed-event idempotency.
4. Polymarket = compliance hold — refuse feature work.
5. Clearance honesty: unregistered sources must be `cleared: false`.
6. Free-path gate: free only if `THE_ODDS_API_KEY` is **absent**.
7. Calibration/Kelly changes stay behind R&D gates unless founder enables.

## Touchpoints
- Webhook: `apps/web/app/api/webhooks/stripe/route.ts`
- Settle cron: `apps/web/app/api/cron/settle-picks/route.ts`
- Router: `apps/web/lib/data-sources/source-router.ts`
- Outbox: existing lease + `claimVersion` only
- Eval after change: `npm run agent:eval`

## Do not
- Invent new locking
- Soften free-path law
- Wire CIR into live scoring without `CALIBRATION_ADJUSTMENTS_ENABLED`
