# Run 2 Summary — 2026-05-30

## What Changed

**REPAIR**
- None needed — run 1 eliminated all active breakage. All 170 test files and both test suites were passing at session start.

**IMPROVE**
- Fixed `checkout/route.ts` and `portal/route.ts`: raw Stripe `err.message` was being returned in 500 responses to authenticated users. Replaced with static user-facing messages; full error string still logs server-side via `console.error`.
- Added `cron-route-auth-contract.test.ts` (23 tests) + wired into brand-safety CI: guards CRON_SECRET auth gate on all three cron routes. Auth-check ordering is also verified (gate BEFORE the success path). Catches accidental auth removal in <6 seconds.
- Added `admin-api-routes-gating.test.ts` (13 tests) + wired into brand-safety CI: guards `/api/admin/*` routes for auth(), role !== "ADMIN", force-dynamic, and no raw error messages in response bodies. Accepts 401 or 403 (both are valid HTTP access-control responses).

**GROW**
- `pre-mortem-compare.test.ts` (12 tests): CALLED/MISSED classification, perBullet shape, empty-bullets edge case, summarizeComparison narratives, custom friendlyFactorName. First coverage for `lib/pre-mortem/compare.ts`.
- `pre-mortem-compose.test.ts` (17 tests): thin-coverage warning, bullet ordering by severityRank, MAX_BULLETS cap (4), pick-kind variant text (SPREAD/TOTAL threshold), consensus drop-threshold derivation, generatedAt/modelVersion passthrough. First coverage for `lib/pre-mortem/compose.ts`.
- `signal-snapshot.test.ts` (30 tests) in `packages/prediction-engine`: covers signal-presence flags (line movement, rest, schedule, ATS form, H2H, venue — all gated correctly on `usedDerivedHistory`), lineMovementDelta (SPREAD/TOTAL), restAdvantageNet, atsFormSampleSize (max of home/away), shadow evidence mapping, and provenance fields. First coverage for `buildPickSignalSnapshot` — the calibration learning foundation.

## Baseline → End State
| Metric | Before (run 1 end) | After (run 2 end) |
|---|---|---|
| Web test files | 165 | 170 |
| Web tests | 1876 | 1951 |
| Prediction-engine tests | 196 | 227 |
| Type errors | 0 | 0 |
| Brand-safety CI tests | 2 (compliance-scanner-rules) | 4 (+cron-auth, +admin-api-gating) |
| Raw error exposure in subscription routes | Present | Fixed |

## Synthesis Finding
The highest-leverage GROW work this session was `signal-snapshot.test.ts` — `buildPickSignalSnapshot` is the calibration learning foundation and captures prediction-time signal state for future outcome-anchored learning queries. It has non-trivial logic (gating ATS/H2H/venue signals on `usedDerivedHistory`, shadow evidence category mapping, lineMovementDelta computation, atsFormSampleSize as max of home/away) and zero prior coverage.

The highest-leverage IMPROVE work was the cron auth contract tests — the CRON_SECRET gate is a security-critical check that, if accidentally removed, would expose cron triggers to anonymous callers. The tests now catch this in <6 seconds in CI.

## Red-Team
The admin-api-routes-gating test discovered that two of three admin API routes return 403 (not 401). This is technically more correct HTTP semantics for "authenticated but unauthorized," but creates inconsistency. The test was updated to accept either, and a note was added. A future cleanup pass could standardize on 403.

The subscription error message fix is a behavioral change to user-facing error copy. The new messages are more generic ("Checkout failed. Please try again.") which is safer but slightly less actionable. Operators retain full error details via server logs.

## Calibration Invariant Check
All four platform gates remain at their defaults (false). No picks, stats, or content gates were modified.
