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
| `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts` | 305 | cron route `/api/cron/backfill-independent-trueprob`, ops manifest — **DONE 2026-10-07 (SO-1h), 45 orchestrator tests** |
| `apps/web/lib/ops/watch-ingest.ts` | 219 | `/api/ops/watch-ingest` route |
| `apps/web/lib/board/market-label.ts` | 61 | `app/board/page.tsx`, `app/page.tsx`, `lib/slate/slate.ts` — customer-facing board labels — **DONE 2026-10-07 (SO-1g), 29 invariant tests** |

**Pre-existing failure recorded (NOT repaired here, one task one commit):**
`packages/ingestion-pipeline/src/__tests__/fixture-confirmation.test.ts` fails
6/23 on the current branch — the source resolves ESPN fixture externalIds as
`espn:americanfootball_ncaaf:<id>` while the assertions expect
`espn:ncaaf:<id>`. Proved unrelated to SO-1f (identical 6/23 with the new
settlement test file stashed). Stale-test repair candidate: confirm which key
namespace is correct at current main before touching the assertions.

**SO-1h re-proof + delta (2026-10-07):** the 6/23 re-proven identical on the
pre-merge tree (25c4623eb, junction-farm worktree run, same six externalId
assertion failures). The merge surfaced TWO MORE failures in the same file
(now 8/23): "fetches once per ESPN group per sport per run (CFB: 80 and 81)"
and "treats a full page (events at the ESPN limit) as not confirmable:
fetch_failed, never not_listed" — both FixtureConfirmer batch tests, with the
test file unchanged by the merge. Classified merge-surfaced-untriaged in the
SO-1h section below.

## SO-1h notes (2026-10-07) — orchestrator tests, main syntax repair, 44-failure provenance classification

Suite: `packages/ingestion-pipeline/src/__tests__/backfill-independent-trueprob-orchestrator.test.ts`
(45 tests, first coverage of the 272-line orchestrator body). Decision-rule
pins written against the real rule (line 237: `trueProb >= 0.58 ? "LEAN" :
"PASS"`); red-checked by mutating the threshold to 0.99 — exactly the two LEAN
pins fail, source restored byte-identical.

**origin/main was syntactically broken** (sheriff rebase `68ba1c410`, PR #610):
`process-sport.ts` carried the ProcessSportResult interface declarations for
`lineSnapshotsPersisted`/`lineArchiveErrors` pasted INSIDE the return object
literal (~line 1751) — an esbuild parse error that blocked collection of every
suite in the package. Fixed at `58c7fa7aa` (value shorthand; the fields are
real locals accumulated at 1006-1007/1111/1115, consumed by refresh-odds.ts at
four `res.lineSnapshotsPersisted ?? 0` sites). STILL PRESENT on origin/main as
of this run (tip 021263a04).

**Full-package provenance classification (44 failed / 1567 passed / 6 skipped,
8 failing files), measured by running the same suites on two junction-farm
worktrees — origin/main tip 021263a04 and the pre-merge tree 25c4623eb —
both verified to resolve @sports/* inside the worktree (farm = root
node_modules junctions + packages/*/node_modules junctions; the nested farm is
REQUIRED because packages/db/node_modules holds @neondatabase/serverless — a
root-only farm fails collection with "Failed to load url
@neondatabase/serverless"). Probe worktrees removed after use.**

- **32 MAIN-INHERITED** (main's own red, merged in as-is; not introduced by
  the merge):
  - `settle-sport.test.ts` 21 — IDENTICAL failures on main's own tree: C-109
    spend-guard/credit-governor scope assertions read `[]` where
    `["ops.odds.paidScores","ops.odds.credits"]` is expected, getScores called
    when the guard says skip, preseason double-call, `resetPaidCallReservationWarning
    is not a function`, outbox payload without settledWith/settledAt-match.
  - `props-hb-bridge.test.ts` 1 — `fitIntPerAttemptPrior is not a function`,
    identical on main's tree.
  - `generate-signal-slate.test.ts` 4 — `gradeSignalPick is not a function`;
    grep proves gradeSignalPick appears in NO module of src (only in main's
    own test file). On main's tree the suite cannot even load (parse break).
  - `process-sport.test.ts` 5 + `process-sport-db-outage.test.ts` 1 — main's
    merged tests vs main's code; unloadable on main's own tree (parse break),
    so verified only on the fixed merge tree.
- **6 BRANCH-PRE-EXISTING** — fixture-confirmation 6 (espn:ncaaf convention,
  above; already recorded at SO-1f).
- **6 MERGE-SURFACED, UNTRIAGED** (passed pre-merge, fail post-merge, test
  files unchanged; the merge brought main's newer
  `packages/data-ingestion/src/kalshi-client.ts` + `espn-odds-client.ts`):
  fixture-confirmation +2 (named above), `exchange-tape-capture.test.ts` 1
  (C-396 KXNFL capture), `galaxy-two-book-acceptance.test.ts` 3 (C-104).
  Stale-test-repair candidates; do NOT repair in a test-writing lane.

## SO-1i notes (2026-10-08) — the "8 merge-surfaced" fixture failures + 2 runtime defects REPAIRED, not tests rewritten

**Root cause overturned.** The 6 merge-surfaced + 2 branch-pre-existing
fixture-confirmation failures were NOT all stale tests. Two real defects rode
in with the merge:

1. **The sheriff(pass2) rebase wave dropped the branch's entire data-ingestion
   barrel surface** (`packages/data-ingestion/src/index.ts`, 804 → 341 lines):
   34 modules lost ALL re-exports (galaxy-kalshi-book, kalshi-fee, all four
   oddspapi modules, odds-credit-governor/-ledger, paid-odds-governor,
   thesportsdb-client, calibration-weights, galaxy-devig,
   odds-api-circuit-breaker, the WIRE-40 client family, …) plus line-level
   losses (`fetchNflversePlayerStatsWeek`, `RegRowsProbe`,
   `createGalaxySecondBook`, `PredExonKalshiCatalog`,
   `parseKalshiSpreadLine/TotalLine`, `ESPN_ODDS_SPORT_MAP`, …). Verified
   absent from main at `021263a04` — the rebase silently discarded committed
   work; the merge then inherited main's short barrel. Restored as a verified
   union (341 → 814 lines): every restored symbol checked to exist in its
   target module, 0 missing; plus current-only additions (`impliedYesQuote`,
   `KalshiImpliedQuote`, `MlbStatsApiError`, `nflverse-pfr-def` block).
2. **A real runtime bug in main's newer `espn-odds-client.ts`**: the upstream
   no-`last_update` freshness policy removed `const lastUpdate` but left
   `eventFromInlineOdds(sportKey, meta.title, ev, lastUpdate)` referencing the
   deleted variable → `ReferenceError: lastUpdate is not defined` on every
   ESPN inline-odds fetch. Aligned with the policy (param + 4 emissions
   removed, 3-arg call site).

**Result:** exchange-tape-capture 1/1 (C-396), galaxy-two-book-acceptance 3/3
(C-104), fixture-confirmation **23/23** (was 6 failures branch-pre-existing +
2 merge-surfaced) — 29/29 green in BOTH the junction-farm worktree and the
Sports-live checkout itself. 8 of the 9 failures were real defects; only the
remaining 6 externalId assertions were genuinely stale tests: C-85
(`a666f0f8f`, #882) unified the schedule-seed externalId to the odds-key form
(`espn:${meta.key}` → `espn:americanfootball_ncaaf:<id>`, verified in source
at `espn-schedule-seed.ts:121`) while the test still asserted the pre-C-85
short form. Fixed as test expectations (`espn:ncaaf:` →
`espn:americanfootball_ncaaf:`, 8 sites).

**Provenance re-classification (supersedes part of the SO-1h 44-failure
classification):**
- The "32 MAIN-INHERITED" bucket shrinks. settle-sport's
  `resetPaidCallReservationWarning is not a function` was the SAME
  dropped-barrel class as the merge-surfaced failures — with the barrel
  restored, that crash class is ELIMINATED (0 "is not a function" errors in
  the suite) and 45/66 settle-sport tests now pass. The remaining 21
  settle-sport failures are pure behavioral main-inherited drift (C-109
  spend-guard spy/counter assertions: getScores called when the guard says
  skip, scopes read [] etc.) — no crash, different defect owner, still not
  repaired here.
- `props-hb-bridge.test.ts` 1 (`fitIntPerAttemptPrior is not a function`) is
  ALSO sheriff(pass2) rebase loss, but in prediction-engine, NOT the
  data-ingestion barrel: `9e2891ed2` (PR #1101) removed the old-name estimator
  API (`fitIntPerAttemptPrior`/`posteriorIntPerAttempt`/`probIntGivenAttempts`,
  added by `2bc911516` #543 with a 37-line index block) and shipped a renamed
  `props-hb-int.ts` (`fitIntPrior`/`intPosterior`/`probOverInt`), while
  main's `props-hb-bridge.ts` still imports the stale names. REPAIR CANDIDATE
  with an owner decision: which API version is canonical (the original
  old-name API vs the renamed one) before touching bridge or module.
- `generate-signal-slate.test.ts` 4 (`gradeSignalPick is not a function`)
  stands as recorded: the symbol exists in NO src module — real missing
  function, main's tests vs main's code.
- process-sport 5 + db-outage 1 stand as recorded (behavioral, verified
  post-parse-repair).

**NOT done here:** the 21 + 1 + 4 + 6 main-inherited behavioral failures; the
props-hb rename repair; the barrel smoke-test pin (optional, next lane).

## SO-1g notes (2026-10-07) — market-label.ts, 29 invariant tests

Three display functions keep the loader's ALL_MARKETS sentinel off three
customer surfaces (board page, homepage ticker, slate). Suite:
`apps/web/__tests__/market-label.test.ts`.

1. **Equivalent mutant exists and is unfixable by testing.** Removing
   `trimmed === ""` from the compound check is output-equivalent (both branches
   return the empty string), so no input-class test can detect that clause's
   removal. The 10/10 red-check covered the other mutation sites (sentinel
   literal, null guard, trim, both ticker copy strings, `?.trim()`, the ternary
   inversion); the empty-string half of the compound is intent-explicit code,
   and the whitespace-only test passes with or without it. Recorded so a future
   agent does not claim a false 11/11.
2. **Case-sensitivity pinned as-is.** `boardMarketLabel("all_markets")` returns
   the input verbatim: the sentinel match is byte-exact by construction, and a
   differently-cased emission from the loader would fail loudly at the labeler
   seam instead of silently leaking.
3. **"held" not "passed" pinned with its doc.** The FIELD copy doctrine's
   "passed" rule yields to pass-reason.ts on the fallback path (those rows were
   never evaluated); the test pins the wording with the citation so a copy
   sweep cannot flip it silently.
4. **tsc on apps/web is pre-existing red: 64 errors, proved unrelated.**
   Identical 64-error set with the test file present and removed (byte-equal
   erroring-file lists); all errors sit in `.next/types/**` (stale generated
   types) and `app/api/mobile/v1/**` routes. Not a regression from this lane;
   stale-generated-types repair candidate for whoever runs a Next build next.
