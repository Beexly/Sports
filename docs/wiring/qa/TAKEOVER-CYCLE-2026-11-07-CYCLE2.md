# Takeover build-loop cycle — 2026-11-07, cycle 2 (timeout + CI import fixes)

Cycle: `takeover-build-loop` continue. Previous cycle (`TAKEOVER-CYCLE-2026-11-07.md`)
fixed public-surface honesty (verified 36-13-1 banners, 95.93 withdrawn). This cycle
took the named-still-red list and closed the two items that are code-side fixable:

## What changed this cycle

1. **Epistemic gate collection errors fixed.** CI `Epistemic Calibration & Sanity
   Gate` failed with `ModuleNotFoundError: tests.verify_out_of_sample_calibration`
   and `tests.test_stage0_zero_hallucination_gate` during pytest collection. Both
   modules exist at HEAD and import fine under `python -m pytest` on the dev host
   (where CWD lands on `sys.path` as a namespace package) but fail in CI's import
   mode. Fix: `tests/__init__.py` (empty, with explanatory comment) makes `tests`
   a real package so pytest prepend-mode inserts the repo root deterministically.
   Verified locally: both failing modules now collect (10 + 15 tests). No test
   renamed, no assertion touched.
2. **`/api/ops/public-surface-truth` timeout — parallelized the handler.** Live curl
   still timed out at 35s (HTTP 000, exit 28) while `/` and `/benchmarks` return
   200 in <0.5s. The handler ran ~21 awaits serially. This cycle:
   - Hoisted `assessSchedulerLiveness`, `resolveBestFreeSpineSnapshot`, and
     `isMarketBoardOddsStale` to start immediately after `getReadinessGates()`,
     awaited at their original use sites (same values, same catch→null semantics).
   - Collapsed the post-`buildFounderNextSteps` section (CLV policy, stale pending
     count, market coverage, confidence tail, ranking census, line-archive
     freshness, line integrity) into one `Promise.all`. Every entry is
     independently fail-closed (`safeRead`/stub/detail-gated) and read-only; the
     consumers (`clvBeatCloseRate`, `pricingPhaseReadiness`, `revenueLadder`)
     read the destructured values unchanged.
   - `maxDuration` stays 120. Brace balance 181/181 verified; duplicate-declaration
     grep clean; rate-limit branch untouched. Local `vitest`/`tsc` cannot run
     (apps/web/node_modules is a 5KB stub) — CI is the gate. Expect the anonymous
     surface to drop well under the watchdog's 30s client cap once deployed.

## Deliberately NOT touched this cycle

- **`api-route-boundary` `/api/ask-edge` guard.** Read the route: GET returns only
  static spine metadata; POST reads `getViewerEntitlements()` and serves an
  environment brief + ledger only — it never leaks paid sides/totals/props.
  A hard requireApiKey/entitlement gate is a product decision (it would break
  the anonymous demo contract), so it stays named/founder-gated rather than
  being papered over with a fake guard.
- **CI "Test, type-check, lint, Prisma" red** is a wide, pre-existing surface:
  dozens of contract tests across storefront paywall, freshness-truth, calibration
  class, board class, disclosure helpline/refund copy, compliance scanner, and
  CLAUDE.md env docs have been failing through waves of executor commits that
  change pages without updating the honesty tests in lockstep. Fixing those
  properly means either fixing each product surface or editing the guard
  assertions — the latter is exactly the cheating pattern this takeover exists
  to stop. Left red and named (see below), not silenced.
- **JAX @ BAL (Week 9 TNF)** still ungraded; ledger still as_of 2026-11-02.
  Grading needs the full 5-stage + fresh PBP pass — out of scope.
- **Working tree still carries ~60 executor-churn files** (DFS packets, dossier
  rewrites, native-kernel binaries, continuous_run ledgers). Not staged this
  cycle; they would reintroduce the signal-family regression (259→223) and
  binary artifacts from the previous cycle's rejected set.
- Epistemic authorization note: the two `-k "not test_stage0..."` deselections
  in `epistemic_gate.yml` remain in place (Travis Etienne Stage-0 contamination
  in the TNF master bundle is a producer/data decision, not a test fix).

## Verified this cycle

- Live: `/` 200 (0.42s), `/benchmarks` 200 (0.38s), `/api/ops/public-surface-truth`
  timeout at 35s pre-fix (curl exit 28) — the watchdog-red symptom reproduced.
- `HEAD == origin/main` (7b4ad7861) before the cycle's commit.
- Both previously-failing pytest modules collect cleanly with the new
  `tests/__init__.py` (10 + 15 collected, 0 errors, local).

## Named, NOT fixed (carried forward)

- CI suite red (Test/typecheck/lint/Prisma job) — executor-commit/test-lockstep
  drift across ~10 contract test files; needs per-surface founder decisions.
- `/api/ask-edge` route-boundary guard — product decision (no paid leak today).
- JAX @ BAL TNF ungraded; ledger stale at 2026-11-02.
- Spine frontier model names remain unverified routing labels (disclaimed).
- `charge-regression` 10/10 (HEAD) vs 8/10 (adjudicated env) — env-dependent.
