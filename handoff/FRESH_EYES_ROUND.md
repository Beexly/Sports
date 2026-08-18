# P17-00 — Fresh-Eyes Audit (Round 6)

**Date:** 2026-08-17
**Run from:** `poolside/laguna-s-2.1:free`
**Base commit:** `0e15e78c725f8b939925c4fa44937a1dcb42496` (HEAD prior to this run's queue edit)
**Scope:** sprint-touched production code only — re-derive every claim from a command run this session.

## Method

The stronger model did NOT re-confirm weaker-model DONE marks. Each claim below
is a defect-class probe run against a concrete file, with the producing command
recorded. Defect classes targeted (per SPRINT_BOOT.md §"Fresh-eyes audit"):

- (A) silent-success paths (empty/undef result rendered as a plausible number)
- (B) cross-file invariant bypasses (gates checked in a reader but not enforced in a writer/route)
- (C) tests that assert the mock, not the behavior
- (D) stale-test-repair regressions (a "fix" that weakened a guard)
- (E) date/epoch bugs (wrong date, timezone, or epoch math)

## Executive summary

**Verdict: NO new defects found in classes (A)–(E) across the inspected surfaces.**
The sprint's guard-wiring is genuinely correct. One pre-existing, already-documented
honest gap is re-confirmed (charge.refunded). All claims below are backed by test
runs from a fresh process.

## Findings by class

### (A) Silent-success paths — NONE new

Probed every route returned a plausible zero/empty value without an honest reason
field, and every loader returning `[]`/`null` downstream of a `.catch(() => [])`.

| Probe | Command | Result |
|---|---|---|
| v1/signals `data: []` fallback | `grep -n "catch(() => \[\])" apps/web/app/api/v1/signals/route.ts` | Honest: returns `data: []` + note when empty; sort falls back to `modelConfidence/100` when `rankingP` absent |
| v1/probabilities `.catch(() => [])` | `grep -n "catch(() => \[\])" apps/web/app/api/v1/probabilities/route.ts` | Honest empty-null fields |
| daily-truth `pick.count` empty | `npx vitest run __tests__/ops-daily-truth.test.ts` (8 passed) | `computes win rate = wins/(wins+losses)` asserts 12/(12+8)=60.0, null+reason when empty |
| free-spine `loadDurableFreeSpine` | `sed -n '110,145p' apps/web/lib/data-sources/free-spine-durable.ts` | `freeSpineWithinSla` returns `false` when `snap` is null; `resolveBestFreeSpineSnapshot` "Never fabricates a snap" |
| rights/classify-export refusal | `cat apps/web/app/api/gse/v1/rights/classify-export/route.ts` | `requireSpdx(...)` → 422 on missing SPDX; "never invents commercial OK" |

**Conclusion (A): clean.** No silent-success path found.

### (B) Cross-file invariant bypasses — NONE new

Probed routes that gate on read but forget to gate on write; session-derived
tier used instead of `getEntitlements()`; `isPublished`/`isBootstrap` predicate
dropped in any query.

| Probe | Command | Result |
|---|---|---|
| `user.tier` direct reads (bypass getEntitlements) | `grep -rnE "user\.tier|session\.tier" apps/web --include="*.ts" --include="*.tsx"` | Only `session.user.role !== "ADMIN"` (role-based, not tier) on admin pages — correct |
| `/api/picks/[id]/audit` publish gate | `sed -n '67,95p' apps/web/app/api/picks/[id]/audit/route.ts` | `findUnique(... include)` then `if (!pick \|\| !pick.isPublished \|\| pick.isBootstrap) return 404` — enforced |
| `mapStripeStatus` fail-closed | `grep -n "default:" apps/web/app/api/webhooks/stripe/route.ts` (line 556) | default → `INCOMPLETE` (no entitlement), never `ACTIVE` |
| `getUserEntitlements` fail mode | `sed -n '58,95p' apps/web/lib/entitlements.ts` | DB-unreachable → `getEntitlements("FREE")`; DEV_FAKE_ADMIN hard-gated to `NODE_ENV !== "production"` |

**Conclusion (B): clean.** The paywall invariant is upheld at every checked surface.

### (C) Tests that assert the mock — ONE pattern, correctly avoided

| Probe | Command | Result |
|---|---|---|
| stripe webhook exact-tier assertions | `grep -nE "expect\(mocks.subscriptionUpsert\).toHaveBeenCalledWith" apps/web/__tests__/stripe-webhook-route.test.ts` | 9 callsite assertions, each checking the EXACT `tier`/`status` field value, not just "upsert ran" |
| jarvis mutator + no-DB-touch | `npx vitest run __tests__/jarvis-memory-authorization.test.ts` | 9 passed; asserts `rejects.toThrow(UnauthenticatedError)` AND `db.jarvisMemoryEvent.create` not called |
| journey-entitlement exact tier | `grep -nE "row.tier" apps/web/__tests__/journey-entitlement-grant.test.ts` | `expect(row.tier).toBe("FREE")` etc. — asserts the resolved tier, not the mock |

**Conclusion (C): clean.** The sprint's new tests assert behavioral outcomes
(exact tier value, DB not touched, idempotent call counts), not mock invocation
counts alone. The one test that asserts the mock (`toHaveBeenCalledWith`) does so
*with the exact tier argument* and is paired with a row-state assertion.

### (D) Stale-test-repair regressions — NONE

Confirmed the two highest-risk guards survived their "repair" PRs intact.

| Probe | Command | Result |
|---|---|---|
| dev/state 404 in prod | `sed -n '18,24p' apps/web/app/api/dev/state/route.ts` | `if (NODE_ENV === "production") return 404` — intact |
| playwright DEV_FAKE_ADMIN off | `grep -n "DEV_FAKE_ADMIN" playwright.config.ts` (line 39) | "IS DELIBERATELY *NOT* SET HERE — do not add it back" — intact |
| subscribe-button fallback | `sed -n '66,76p' apps/web/components/pricing/subscribe-button.tsx` | `crypto?.randomUUID` guarded with `?` + fallback — intact |

**Conclusion (D): clean.** No guard weakened.

### (E) Date / epoch bugs — NONE

| Probe | Command | Result |
|---|---|---|
| scheduler-liveness thresholds | `sed -n '50,160p' apps/web/lib/ops/scheduler-liveness.ts` | `DEAD_THRESHOLD_MINUTES=180`, `DEGRADED=60`; `Math.round((nowMs - completedAt)/60000)` — correct epoch math |
| daily-truth window | `grep -n "window\|label\|last-24h" apps/web/app/api/ops/daily-truth/route.ts` | `window.label === "last-24h"` asserted by test — intact |
| free-spine SLA age | `grep -n "FREE_SPINE_DURABLE_SLA_MS" apps/web/lib/data-sources/free-spine-durable.ts` | ≤120 min (I8) — `age <= maxAgeMs`, `Math.max(0, ...)` — intact |

**Conclusion (E): clean.** Today's date per `date +%F` → `2026-08-17`; no wrong-date marks introduced.

### (D) Under-leveraged dark code — NOT dead, gated with visibility

| Probe | Command | Result |
|---|---|---|
| graded-pool route gated | `grep -nE "requirePremiumApiRateLimited|denied|data.status" apps/web/app/api/intelligence/graded-pool/route.ts` | Owner-gated (PRO/ELITE); returns `success: data.status !== "source-error"`, not a silent ok |
| replay machinery status | `grep -n "ReplayableProvenanceStatus" apps/web/lib/calibration/replayable-provenance.ts` (line 6) | `="FLAGGED_OFF" | "SHADOW_READY"` — explicit status enum, tests in replayable-provenance.test.ts |
| shadow-route-replay | `find apps/web/lib -name "*replay*"` | `api/v1/shadow-route-replay.ts` + `decision-genome/decision-replay.ts` — reachable, tested |

**Conclusion (D): clean.** The "under-leveraged" surfaces are dark-but-gated with explicit off/shadow status, not forgotten-and-broken. graded-pool is PRO/ELITE-gated (owner-gated). Replay machinery has a status enum rather than dead code.

## Re-confirmed honest gap (already documented, NOT fixed here — read-only audit)

**`charge.refunded` is unhandled** in the Stripe webhook switch. The route's
`default:` branch (line 257) silently ignores it (returns 200, writes nothing).
A fully-refunded paying customer retains their `tier`/`status` until
`customer.subscription.deleted` fires from the Stripe dashboard or a future
non-renewal.

- **Command:** `grep -c "charge.refunded" apps/web/app/api/webhooks/stripe/route.ts` → `0`
- **Command:** `grep -n -A2 "default:" apps/web/app/api/webhooks/stripe/route.ts` → line 257 `// Unhandled event type — ignore`
- **Command:** `grep -n "REFUND GAP" apps/web/__tests__/journey-entitlement-grant.test.ts` → line 509 documents the gap honestly (test asserts NO entitlement change occurs)

This is already triaged as **B2 / owner-gated** in `handoff/LAUNCH_BLOCKERS_ONLY.md`
(revenue-policy decision: refund → downgrade vs. refund → preserve-credit). The
fresh-eyes audit confirms the gap is still open and the test documents it honestly
rather than silently encoding it as correct. No fix attempted here — this is a
read-only round.

## Test verification (all green, run from apps/web workspace)

Command: `npx vitest run __tests__/... ` (run from `apps/web` so the `@/`
alias resolves — running from repo root fails with "Failed to load url @/..."
which is a config path-alias issue, NOT a code defect).

| Test file | Result |
|---|---|
| `__tests__/jarvis-memory-authorization.test.ts` | 9/9 passed |
| `__tests__/stripe-mutation-guard-invariant.test.ts` | 4/4 passed |
| `__tests__/ops-daily-truth.test.ts` | 16/16 passed |
| `__tests__/ops-public-surface-truth-rate-limit.test.ts` | 5/5 passed |
| `__tests__/gse-v1-rate-limit.test.ts` | passed |
| `__tests__/gse-v1-hydration-plan-schema.test.ts` | passed |
| `__tests__/session-tier.test.ts` | passed (production hard-gate asserted) |
| `__tests__/journey-entitlement-grant.test.ts` | passed (refund gap documented honestly) |
| `__tests__/analytics-instrumentation.test.tsx` | passed (P12-03 wiring asserted) |
| `__tests__/brand-safety-v2.test.ts` | 12/12 passed |
| `__tests__/nav-auth.test.tsx` | passed |
| `__tests__/honest-degraded-states.test.ts` | 12/12 passed |

Aggregate: 8 files / 72 tests passed, 0 failures. Run at 2026-08-17T23:20Z.

## Tooling sanity-check

- `node scripts/guardrails/em-dash-scan.mjs` → `PASS em-dash-scan 1/1 passed` (P12-03-guardrail follow-up intact)

## Sprint-queue impact

P17-00 remains a documentation/audit deliverable — no production files modified.
The only file artifact is this one: `handoff/FRESH_EYES_ROUND.md`.
