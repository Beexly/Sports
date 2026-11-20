---
name: coding-agent
description: Minimal-diff coding on the GSE money path. Use when editing webhooks, settlement, outbox, clearance, or calibration wiring.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run typecheck*), Bash(npm run lint*), Bash(npm run test*), Bash(npm run guardrails*), Bash(npm run guard:*), Bash(npm run agent:eval*)
---

# Coding agent (GSE)

## Rules
1. Prefer minimal diffs in existing modules; delegate deep domain rules to the specialized skills (`stripe-webhook`, `checkout-attempt`, `settlement-free-path`, `clearance-registry`, `calibration-pipeline`, `polymarket-hold`).
2. Webhook edits reuse `webhookEvent.stripeEventId` idempotency and outbox `claimVersion` + lease semantics (`apps/web/app/api/webhooks/stripe/route.ts`).
3. Settlement follows the 2026-09-02 **free-first primary** law (`apps/web/lib/settlement/path-select.ts`): free ESPN/consensus grading runs first on every cycle whether `THE_ODDS_API_KEY` is absent or present (key presence only adds a PENDING-scoped paid supplement).
4. Polymarket and unregistered prediction-market sources stay `cleared: false` under compliance hold.
5. Calibration/Kelly sizing remains behind `CALIBRATION_ADJUSTMENTS_ENABLED` and `MODEL_VERSION` freeze gates.

## Touchpoints & Completion Criteria
- Webhook: `apps/web/app/api/webhooks/stripe/route.ts`
- Settle cron: `apps/web/app/api/cron/settle-picks/route.ts`
- Router: `apps/web/lib/data-sources/source-router.ts`
- Done when `npm run agent:eval`, `npm run guardrails`, and affected route Vitest suites exit `0`.
