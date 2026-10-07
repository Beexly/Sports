# TEST_GAP_MAP.md

Revenue-core source files vs. test coverage (billing/Stripe/entitlements/
scraping/claude-api). Sorted by test mentions ascending, line count
descending — biggest untested files first.

> A mention is a weak signal: a test file naming a module is not proof it
> covers it; zero mentions is proof nothing does.

| File | Lines | Mentions | Test files (≤3) |
|---|---:|---:|---|
| apps/web/lib/scraping/extraction-modes.ts | 166 | COVERED | apps/web/__tests__/extraction-modes.test.ts (2026-09-28, 31 tests) |
| apps/web/lib/claude-api/jynx-complete.ts | 41 | COVERED | apps/web/__tests__/jynx-complete.test.ts (2026-09-28, 12 tests) |
| apps/web/lib/scraping/sports-data-candidates.ts | 547 | COVERED | accessors: 2026-09-29, 21 tests |
| apps/web/lib/billing/reconcile-entitlements.ts | 884 | COVERED | 41 tests in a 42KB file |
| apps/web/lib/scraping/data-rules.ts | 208 | COVERED | 84 tests (scraping-clearance) |
| apps/web/lib/scraping/tool-registry.ts | 162 | COVERED | 94 tests (scraping-clearance) |
| apps/web/lib/billing/price-ids.ts | 248 | COVERED | 58 tests across 3 files |
| apps/web/lib/claude-api/response-cache.ts | 238 | COVERED | 24 tests across 2 files |
| apps/web/lib/billing/notice.ts | 69 | COVERED | 110 tests across 15 files |
| apps/web/lib/claude-api/open-weight-catalog.ts | 182 | DEAD | 0 product consumers (SO-1e) — test-only, see note below |
| apps/web/lib/billing/stripe-outcome.ts | 126 | COVERED | accessors: 2026-10-02, 50 invariant tests |
| apps/web/lib/billing/stripe-outcome.ts | 126 | COVERED | labels: 12 tests (billing money path) |
| apps/web/lib/billing/checkout-repair-owner-queue.ts | 84 | 1 | apps/web/__tests__/checkout-repair-owner-queue.test.ts |
| apps/web/lib/claude-api/budget-store.ts | 75 | 1 | apps/web/__tests__/claude-api-budget-store.test.ts |
| apps/web/lib/claude-api/jynx-errors.ts | 75 | 1 | apps/web/lib/claude-api/jynx-errors.test.ts |
| apps/web/lib/claude-api/credit-pool-store.ts | 71 | 1 | apps/web/lib/claude-api/credit-pool-store.test.ts |
| apps/web/lib/claude-api/numeric-guard.ts | 67 | 1 | apps/web/__tests__/numeric-guard.test.ts |
| apps/web/lib/claude-api/free-lane-policy.ts | 26 | 1 | apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/claude-api/openai-compat.ts | 123 | 2 | apps/web/lib/claude-api/jynx-errors.test.ts; apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/billing/canonical-json.ts | 86 | 2 | apps/web/__tests__/canonical-json.test.ts; packages/genesis-kernel/src/__tests__/planner.test.ts |
| apps/web/lib/billing/checkout-attempt-repair.ts | 388 | 3 | apps/web/__tests__/checkout-attempt-repair.test.ts; apps/web/__tests__/checkout-repair-owner-queue.test.ts; apps/web/__tests__/repair-checkout-attempts-cron-route.test.ts |
| apps/web/lib/claude-api/providers/azure-foundry.ts | 213 | 3 | apps/web/lib/claude-api/credit-pool.test.ts; apps/web/lib/claude-api/provider-dispatch.test.ts; apps/web/lib/claude-api/providers/azure-foundry.test.ts |
| apps/web/lib/claude-api/credit-pool.ts | 142 | 3 | apps/web/lib/claude-api/credit-pool-store.test.ts; apps/web/lib/claude-api/credit-pool.test.ts; apps/web/lib/claude-api/openai-compat.test.ts |
| apps/web/lib/scraping/source-rights-registry.ts | 860 | 4 | apps/web/__tests__/affiliate-structural-separation-guard.test.ts; apps/web/__tests__/scraping-clearance.test.ts; packages/genesis-kernel/src/__tests__/twin.test.ts |
| apps/web/lib/claude-api/model-router.ts | 94 | 4 | apps/web/__tests__/ai-provider-registry.test.ts; apps/web/__tests__/cockpit-api-costs-routing.test.tsx; apps/web/__tests__/model-router.test.ts |
| apps/web/lib/scraping/clearance-engine.ts | 434 | 6 | apps/web/__tests__/ingest-pfr-adv-stats.test.ts; apps/web/__tests__/ingest-player-stats.test.ts; apps/web/__tests__/pressure-coverage.test.ts |
| apps/web/lib/claude-api/jynx.ts | 218 | 6 | apps/web/__tests__/credit-stack-posture.test.ts; apps/web/__tests__/founder-next-steps.test.ts; apps/web/__tests__/ops-public-surface-truth-rate-limit.test.ts |
| apps/web/lib/claude-api/cost-monitor.ts | 185 | 7 | apps/web/__tests__/calibration-insight-claude.test.ts; apps/web/__tests__/claude-api-budget-migration.test.ts; apps/web/__tests__/claude-api-cost-monitor.test.ts |
| apps/web/lib/billing/checkout-attempt.ts | 622 | 8 | apps/web/__tests__/checkout-attempt-db.integration.test.ts; apps/web/__tests__/checkout-attempt-repair.test.ts; apps/web/__tests__/checkout-attempt.test.ts |
| apps/web/lib/billing/notice.ts | 59 | 10 | apps/web/__tests__/aws-case-study-page.test.ts; apps/web/__tests__/billing-notice.test.ts; apps/web/__tests__/board-gate-flag-policy.test.ts |
| apps/web/lib/claude-api/messages.ts | 115 | 12 | apps/web/__tests__/claude-api-cerebras.test.ts; apps/web/__tests__/claude-api-free-lane.test.ts; apps/web/__tests__/claude-api-messages.test.ts |
| apps/web/lib/claude-api/free-lane.ts | 100 | 12 | apps/web/__tests__/ai-provider-registry.test.ts; apps/web/__tests__/claude-api-free-lane.test.ts; apps/web/__tests__/cockpit-api-costs-routing.test.tsx |
| apps/web/lib/claude-api/providers/cerebras.ts | 138 | 14 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts |
| apps/web/lib/claude-api/providers/bedrock.ts | 213 | 15 | apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts; apps/web/__tests__/ai-control-plane-credit-admission.test.ts |
| apps/web/lib/claude-api/providers/vertex.ts | 206 | 15 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-budget-pg.test.ts; apps/web/__tests__/ai-control-plane-budget.test.ts |
| apps/web/lib/api-entitlement.ts | 185 | 23 | apps/web/__tests__/api-entitlement.test.ts; apps/web/__tests__/birthday-usage-trend.test.ts; apps/web/__tests__/combine.test.ts |
| apps/web/lib/entitlements.ts | 112 | 26 | apps/web/__tests__/api-entitlement.test.ts; apps/web/__tests__/api-p9-05-rate-limit.test.ts; apps/web/__tests__/audit-drawer-shape.test.ts |
| apps/web/lib/stripe.ts | 456 | 31 | apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/analytics-instrumentation.test.tsx; apps/web/__tests__/billing-money-posture.test.ts |
| apps/web/lib/claude-api/dashboard.ts | 120 | 47 | apps/web/__tests__/api-v1-shadow-route-harness.test.ts; apps/web/__tests__/api-v1-shadow-route-replay.test.ts; apps/web/__tests__/billing-notice.test.ts |
| apps/web/lib/scraping/index.ts | 12 | 138 | apps/web/__tests__/affiliate-structural-separation-guard.test.ts; apps/web/__tests__/ai-control-plane-authority.test.ts; apps/web/__tests__/ai-control-plane-claim-pg.test.ts |

## Priority ranking (RE-MEASURED 2026-09-29, SO-1c — read this first)

**The "1 mention" counts in the original table were stale and the ranking built on
them was wrong.** Measured against the working tree on 2026-09-29:
`reconcile-entitlements.ts` was listed at 1 mention but has **41 tests in a 42KB
file**; `data-rules.ts` 84, `tool-registry.ts` 94, `price-ids.ts` 58,
`response-cache.ts` 24, `notice.ts` 110. A "mention" also undercounts by design —
a test file naming a module is not proof it covers it.

**Re-measure before ranking.** A quick pass that counts `it(` in the test files
naming each module is enough to avoid spending a cycle on a 41-test file.

Remaining genuinely thin files, by measured test count:

1. ~~`apps/web/lib/claude-api/open-weight-catalog.ts`~~ — **DEAD, not a gap.** SO-1e
   measured ZERO product consumers (grep across `apps/web` and `packages`,
   tests excluded: the only hit is its own test file). Its 4 tests are not a
   live risk because nothing reads it. Adding tests here would be effort spent
   on unreachable code — the finding is the dead export, not the coverage.
2. ~~`apps/web/lib/billing/stripe-outcome.ts`~~ — DONE 2026-10-02 (SO-1e): 50
   invariant tests + the 12 existing label tests. Money path.
3. ~~`apps/web/lib/claude-api/numeric-guard.ts`~~ — DONE 2026-10-02 (SO-1d):
   25 invariant tests, 5 live consumers.

**The revenue-core list is now exhausted on reach.** No remaining row is both
thin AND reachable; the next work in this lane should come from a fresh
measurement over a different directory, not from re-walking this table.

**Pattern worth reusing:** the useful gaps in this list were not the biggest
files, they were the files whose accessors feed a CUSTOMER-FACING surface with
no test beneath them — `sports-data-candidates.ts` published its counts to the
Sources cockpit and the resource-intelligence API through five untested
functions. Prefer a file with live consumers over a file that is merely large.

## Fresh lane 2026-10-07 (SO-1f) — eight new directories, corrected corpus

Per the closeout above, the lane re-measured 1,330 source files over eight NEW
roots (`apps/web/lib/{ops,calibration,data-sources,picks,board,weather}`,
`packages/prediction-engine/src`, `packages/ingestion-pipeline/src`).

**Corpus correction (the SO-1c lesson, again):** the first pass walked only
`apps/web/__tests__` + `packages` for test mentions and reported the whole
calibration lane as zero-coverage. Walking the FULL repo (colocated
`*.test.ts` included) moved every calibration file with tests out of the zero
list — `ranking-power-control.ts`, `skill-metrics.ts`, `holdout-significance.ts`
all have colocated suites. **Zero mentions is only a finding after a corpus
that includes colocated tests.**

Live-consumer files measured at 0 test mentions, by size:

| File | Lines | Live consumers (verified by grep, non-test) |
|---|---:|---|
| `packages/ingestion-pipeline/src/settlement-snapshots.ts` | 151 | `settle-sport.ts`, `settlement-evidence.ts` — **DONE 2026-10-07 (SO-1f), 32 invariant tests** |
| `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts` | 737 | `metric-birth-certificate.ts` (single consumer) |
| `packages/prediction-engine/src/metrics/core/metric-historical-distribution-adapter.ts` | 345 | `metrics/core/index.ts` barrel |
| `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts` | 305 | cron route `/api/cron/backfill-independent-trueprob`, ops manifest |
| `apps/web/lib/ops/watch-ingest.ts` | 219 | `/api/ops/watch-ingest` route |
| `apps/web/lib/board/market-label.ts` | 61 | `app/board/page.tsx`, `app/page.tsx`, `lib/slate/slate.ts` — customer-facing board labels |

**Pre-existing failure recorded (NOT repaired here, one task one commit):**
`packages/ingestion-pipeline/src/__tests__/fixture-confirmation.test.ts` fails
6/23 on the current branch — the source resolves ESPN fixture externalIds as
`espn:americanfootball_ncaaf:<id>` while the assertions expect
`espn:ncaaf:<id>`. Proved unrelated to SO-1f (identical 6/23 with the new
settlement test file stashed). Stale-test repair candidate: confirm which key
namespace is correct at current main before touching the assertions.
