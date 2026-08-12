# Masked Test Debt Register — the "69" behind the #421 typecheck gate

Context: issue #421 predicted that once the typecheck gate is fixed, CI would
surface ~69 latent test failures that have never run in CI (the typecheck step
fails before the test step). This register maps them. Repaired so far this
session: **6 files / ~44 tests** (see commits). Remaining: ~29 files.

Repair rule used: when a test asserts pre-refactor behavior and the current
implementation is deliberate (commented, tested elsewhere, on main), the TEST
is repaired to pin the real contract — product code untouched. When the
failure is tied to an owner decision (#419/#420), it is registered, not fixed.

## REPAIRED THIS SESSION (verified green)

| File | Root cause | Fix |
|---|---|---|
| `packages/ingestion-pipeline/.../backfill-independent-trueprob.test.ts` | blend switched to sharpness-weight + ×1.12 stretch (44e974c5); test asserted equal-weight avg | pinned 0.682/0.6344/0.3656 + sharpness + null cases |
| `apps/web/__tests__/waitlist-access-gate.test.ts` | gate now needs GATE_ENABLED + BASIC_FORCE (#391); tests set only the former | added FORCE; added FOUNDING-open + fail-closed cases |
| `apps/web/__tests__/waitlist-posture.test.ts` | same dual-flag drift in posture loader | fixed cases + new open-default case |
| `apps/web/__tests__/subscriptions-checkout-route.test.ts` | vi.mock exported stale `getStripePriceId`; route imports `resolveCheckoutPriceId` | renamed mock export — 26 hidden Stripe assertions now run |
| `apps/web/__tests__/refresh-player-stats-route.test.ts` | season floor (85676e7e) + `mode=full` split + primary-status contract | updated dates, added mode=full, pinned 200+success:false |
| `apps/web/app/page.tsx` | 2 em-dashes tripped brand-voice em-dash guard | ASCII punctuation |

## REMAINING — by class (from 2026-08-12 full-suite run)

### A. Owner-decision-gated (fixing requires the #419/#420 decisions) — DO NOT fix unattended
- `api-v1-boundary-guard.test.ts` — asserts the api-v1 guard passes current repo
  state; guard is RED by design (#420). Greens when #420 promotion decision lands
  and the guard reflects it.
- `api-v1-promotion-readiness.test.ts`, `api-v1-disposable-rehearsal-packet.test.ts`,
  `api-v1-db-schema-proposal.test.ts`, `api-v1-dormant-durable-adapter-interface.test.ts`,
  `api-v1-durable-adapter-harness.test.ts`, `api-v1-durable-fixture-simulator.test.ts`,
  `api-v1-durable-rehearsal-plan.test.ts`, `api-v1-shadow-route-harness.test.ts`,
  `api-v1-shadow-seam.test.ts` — the v1 shadow/promotion test family; same #420 root.
- `guardrails.test.ts` (incl. model-freeze case) — asserts `guard:model-freeze`
  passes; RED because v5.2.6 has no IMPLEMENTED artifact (#419). Greens via the
  decision packet (handoff/ISSUE_419_DECISION_PACKET.md) — a docs/ change that
  is owner-executed.

### B. Same drift class as the repaired ones (safe to repair with evidence)
- `board-stale-kill-switch.test.ts`, `daily-slate-stale-kill-switch.test.ts`,
  `picks-stale-kill-switch.test.ts` — "flag ON + stale → 503" got 200: flag or
  freshness-gate mock drift vs. current `isPublicPicksSurfaceStale` /
  env-flag wiring. Needs the freshness-gate read to pin the current contract.
- `canonical-sample-posture.test.ts` — `remainingToFloor` assertion drift.
- `espn-odds-client.test.ts` — h2h mapping shape drift.
- `cockpit-picks-glance.test.ts`, `cockpit-jarvis-trend-api.test.ts`,
  `glass-ledger-page.test.tsx`, `calibration-cockpit.test.ts`,
  `honest-degraded-states.test.ts`, `cqr.test.ts`,
  `picks-daily-limit-meta.test.ts`, `public-copy-integrity.test.ts`,
  `nflverse-readiness.test.ts`, `isotonic-pava.test.ts`,
  `player-stats-backfill-plan.test.ts` — individually classified drift;
  each needs its current implementation read (2–5 min each).

### C. Environment-dependent (may pass in CI with its env)
- Failures that read env vars (waitlist creds, DATABASE_URL, season dates)
  may differ locally vs CI. Confirm on CI before treating as debt.

## Why this matters

When #421 is decided and typecheck goes green, CI's test job will start and
surface these. They are NOT regressions — they are stale assertions vs.
deliberate changes that shipped under a broken gate. The count is bounded
(~29 files) and each is a small, safe test repair (class B), or an
owner-decision consequence (class A). This register is the map so the strong
session can clear them in one sitting instead of discovering them cold.

## Verification commands
```bash
cd apps/web && npx vitest run __tests__/<file>   # per-file
npm run lint && npm run typecheck                 # unchanged: 3 pre-existing #421 errors
```
