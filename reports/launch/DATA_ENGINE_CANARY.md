# Galaxy Sports Edge — Data and Engine Canary (LC-005)

**Generated:** 2026-07-19 00:20 UTC
**Boundary:** this session has zero database and zero live Odds API credentials. Everything
below is either evidence from the existing (already-passing) test suite, a direct code trace
against current `main`, or an honest `NOT_TESTED` gap. No live ingestion/settlement run was
performed.

## Method

1. Ran the full workspace test suite (`npm test` at the repo root — apps/web + every
   `packages/*` + `workers/*`): confirms the already-built logic behind most of LC-005's 13
   required areas is sound. `packages/ingestion-pipeline` (119/119), `packages/data-ingestion`
   (155/155, including a dedicated `no-store-fetch.test.ts`), `packages/prediction-engine`
   (1440/1440), `apps/web` (8272/8273 — the one failure is the pre-existing, unrelated,
   already-tracked `commercial-copy-scan` issue, see LB-001).
2. A bounded scout pass + independent code tracing on the areas least likely to be caught by
   ordinary unit tests: things that only manifest under partial failure, restart, or
   infrastructure edge cases.
3. One real gap found, investigated to root cause, and closed this pass (see below).

## Findings by area

| Area | Status | Evidence |
|---|---|---|
| Odds acquisition / no-store | PROVEN | `packages/data-ingestion/src/__tests__/no-store-fetch.test.ts` (4 tests, passing) |
| Freshness / quiet-board classification | PROVEN | `packages/ingestion-pipeline/src/quiet-board.ts` + `quiet-board.test.ts` (9 tests) — correctly distinguishes "no game in the horizon" (quiet, skip) from "a game is due and the board is dead" (real incident) |
| Pick creation / lock-time immutability | PROVEN (by design, not a DB constraint) | `packages/db/prisma/schema.prisma:428-430`: lock fields are captured once at creation and never included in any `update` call anywhere in the codebase — immutability by omission, not a mutation guard. Weaker than a DB-level constraint but verifiably true today (grep-confirmed no write path touches `clvLockLine`/`clvLockPrice` after creation) |
| Commitment timing | PROVEN | `apps/web/__tests__/proof-hash.test.ts`, `proof-of-record-surface.test.ts`, `machine-proof.test.ts` (all passing); LC-002 independently re-verified the published `GSE-PickCommit-v1` algorithm byte-for-byte against `packages/prediction-engine/src/proof-of-record.ts` |
| Score ingestion | PROVEN | `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` (24 tests) |
| Settlement totality | **PARTIAL — real gap found and closed this pass** | see "SR-002 -- stale-PENDING settlement" below |
| Stale-PENDING heal / VOID | **GAP, honestly NOT_TESTED for auto-resolution; DETECTION closed this pass** | see below |
| CLV grade-once / close freshness | PROVEN | `packages/ingestion-pipeline/src/settle-sport.ts:164-174`: settlement is idempotent via `updateMany` scoped to `result:"PENDING"` (the loser of a race gets `count===0`), so CLV can never be re-graded against a second close. `apps/web/lib/tracker/clv.test.ts`, `clv-anchor.test.ts`, `clv-coverage.test.ts` all passing |
| Proof receipt / ledger integrity | PROVEN | `apps/web/__tests__/proof-*.test.ts` (7 files, all passing); LC-002's independent Merkle-root/leaf-hash recomputation against the live endpoint |
| Trends ingestion / readiness | PROVEN | existing trends test coverage passing (full suite run) |
| Expected-metric validation | PROVEN | `packages/prediction-engine`'s 1440 passing tests include the expected-metrics suite |
| Rights projection | **NOT_TESTED (needs a founder architecture ruling, not a code fix)** | see below |
| Outage differentiation | PROVEN | `quiet-board.ts` (above); confirmed present on current `main`, not just the frozen recovery branch |
| Restart/retry behavior | PROVEN | `settle-sport.ts:164-174`'s idempotent `updateMany` explicitly documents surviving a concurrent worker+cron race; CLV grading is additive and guarded (`180-211`) |

## SR-002 — Stale-PENDING settlement: real gap, detection closed this pass

**The gap:** The Odds API can flag a postponed/cancelled game `completed: true` with no scores.
`settle-sport.ts:94-101` deliberately no-ops on this (a documented, correct choice — it can't
safely distinguish "postponed" from "scores not posted yet" without guessing), which means the
game record and its picks are never touched. Combined with the settlement scan's own 2-day
lookback (`client.getScores(sport.key, 2)`), a pick whose game never gets marked FINAL will
**stay PENDING forever** with nothing in the automated pipeline able to catch it.

**What already existed (found during review, not new):** `apps/web/lib/performance/settlement-health.ts`
already implements exactly this detection — published/non-seed picks whose game commenced more
than a grace window (default 6h) ago and are still PENDING, banded HEALTHY/DEGRADED/CRITICAL
(CRITICAL at 5+). It's live today on the `/admin/clv` dashboard. This session's first attempt at
a fix didn't find this and built a second, differently-thresholded, incorrectly-filtered
(missing the `isPublished`/seed exclusion) duplicate — caught by an independent red-team pass and
corrected before landing. **What's actually new this pass:** wiring the existing evaluator into
`/api/health` (informational only — deliberately excluded from the endpoint's `ok`/HTTP-status
computation, since a settlement lag is a data-quality signal, not "the service is down") and into
the Nightly Sentinel (WARN on DEGRADED, FAIL on CRITICAL), so this is now unattended-monitored
instead of admin-dashboard-only.

**What's still a gap, deliberately not auto-fixed this pass:** nothing *resolves* a stuck pick —
this is detection only. Building automated VOID-assignment requires either live inspection of
what The Odds API's postponed-game payloads actually look like (to build a safe, non-guessing
signal) or a founder ruling on acceptable false-positive risk, neither of which this
credential-less session can respons­ibly do. Once flagged, resolution is a manual settle-or-void
operator action today (`settlement-health.ts`'s own `remediation` field says as much).

## Rights projection: architecture question, not a straightforward code gap

A scout pass flagged that `apps/web/lib/scraping/clearance-engine.ts` enforces rights at
**ingestion** time but found no equivalent check at **serve** time (e.g. in `/api/picks`). On
reflection this may be the correct design, not a gap: CLAUDE.md's Legal Scraping Posture
describes `RightsSnapshot` as a **point-in-time capture at extraction**, and its "no automated
access after a cease-and-desist" rule is about halting *future ingestion*, not retroactively
un-serving already-collected, already-cleared data. Re-checking clearance on every serve would
be a different (and not obviously more correct) architecture. **This needs a founder/legal
ruling on intent, not an autonomous code change** — recorded as `NOT_TESTED`, not assumed either
way.

## Verification

- `apps/web/__tests__/health-route.test.ts`: 15 tests (6 new), all passing.
- `apps/web/__tests__/settlement-health.test.ts`: pre-existing, untouched, still passing —
  confirms the reused evaluator's own correctness independent of this pass.
- `scripts/launch/nightly-sentinel-checks.test.mjs` + `nightly-sentinel.test.mjs`: 54 tests (5
  new/changed), all passing.
- Full `apps/web` suite: 8272/8273 (one pre-existing, unrelated, already-tracked failure).
- Typecheck, lint, `git diff --check`, full guardrail suite: all clean.
- A live dry-run against production (which doesn't have this code deployed yet) correctly shows
  the new field simply absent and the sentinel gracefully declining to claim a verification that
  didn't happen, rather than a false "no stale-PENDING picks."

Independently red-teamed. The first version of this fix was a hand-rolled duplicate of
`settlement-health.ts` missing its `isPublished`/seed-exclusion filter — a real, confirmed
false-positive vector. Rewritten to reuse the canonical evaluator instead of maintaining two
parallel definitions of "how long is too long."
