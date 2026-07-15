# GSE Frontier Recovery Execution Ledger

Last updated: 2026-07-15
Executor branch: `codex/gse-frontier-recovery-2026-07-13`
Current-main base: `3ce5c4a198df7f9baac37888de4f28297e24f581`
Production deployment identity: `UNVERIFIED` — repository and public runtime evidence must be correlated before a deployment claim.

This file is the execution control plane. It is not a readiness claim.

## Protected zones

- Billing, Stripe checkout/webhooks, subscription reconciliation, and price IDs.
- Auth, OAuth callbacks, role checks, and entitlement persistence.
- Legal copy and static legal dates.
- Canonical URL construction in `apps/web/lib/seo/site-url.ts`.
- Settlement immutability, grade-once semantics, CLV history, and proof receipts.
- Rights snapshots, source clearance, and draft-only/no-auto-publish gates.
- Production migrations, secrets, DNS, OAuth consoles, paid vendors, and destructive production data operations remain owner-gated.

## Current-main findings

| ID | Severity | Current-main status | Evidence / next decisive check |
|---|---:|---|---|
| P0-1 Game Room entitlement leak | P0 | `FIX_VALIDATED` | #109 withheld pre-mortem and line movement but the shared node still serialized raw confidence, premium pick rows, entitlement-blind lens capabilities, and unpublished loss-autopsy drafts. The loader now filters at query and projection boundaries, defaults every capability closed, and exposes only published public autopsy copy. Nineteen focused loader/graph/route tests pass; production-build browser/RSC proof remains in the final matrix. |
| P0-2 market units / false precision | P0 | `FIX_VALIDATED` | American prices are canonicalized before scoring/display, MLS moneyline uses full three-way de-vigging, pregame picks and receipts are immutable, CLV closes on an observed executable quote, and proof verification binds stored columns plus game/sport relations. Fresh evidence: 36 normalizer, 153 engine, 43 pipeline, and 134 web market/proof tests pass; all three package typechecks pass. |
| P0-3 stub DB / false health / client boundary | P0 | `FIX_VALIDATED_LOCAL` | Production import rejects stub DB, health reports stub mode as 503, DB tests run from the root suite, and no direct client-component DB imports were found. Production deployment identity and live Postgres behavior remain explicitly unverified until the final runtime matrix. |
| P0-4 performance / calibration / pricing contradiction | P0 | `FIX_VALIDATED` | Raw confidence is now a rank score only and never enters Brier/reliability math. Public probability requires a frozen `modelProb` in the pregame proof receipt plus the runtime gate. Calibration, API, policy, and page summaries use one learning-eligible canonical population; the page derives live summaries instead of reading the unwritten summary table. 143 focused tests and web typecheck pass. |
| P0-5 stale current-price surfaces | P0 | `FIX_VALIDATED` | The public gate defaults on, freshness-query errors fail closed, empty odds runs do not refresh the clock, and every pick/board/slate query is limited to sports with an odds-inserting run inside the shared SLA. Twenty focused web tests and five engine config tests pass. |
| P0-6 fictional newsroom framed as live | P0 | `FIX_VALIDATED` | The public wire accepts only explicitly approved feed IDs, rejects future-dated and unapproved items, preserves rights/review provenance, and renders an honest unavailable state when no approved feed exists. The demo ledger cannot inhabit the live page. 42 focused newsroom tests pass. |

## Open PR #76-#101 reconciliation

`PENDING_EVIDENCE` means no disposition has been executed. Each row will be updated from current GitHub state, current-main ancestry, diffs, checks, and unresolved review evidence.

| PR | Head / base | Changed files | Review findings | Current-main reproduction / overlap | Disposition | Validation | Rollback |
|---:|---|---|---|---|---|---|---|
| 76 | `claude/nfl-pbp-expected-metrics-xb069r` -> `main` | 41 / 6 commits | Closed; six review threads resolved on the stale branch | Current main already owns governed resource intelligence and a live Claude router; replay still risked invalid hard-risk labels, score/risk divergence, a pinned stale snapshot, negative license verification, erased license gaps, and inactive memory counted as live | `SUPERSEDED_CLOSED`; no merge and no unsafe architecture extraction | GitHub metadata + resolved-thread audit + current-source overlap check | Reopen only as small current-main slices with persisted source/license evidence |
| 77 | `claude/frontier-agent-foundry-2026-07-11` -> `claude/nfl-pbp-expected-metrics-xb069r` | 23 / 7 commits | Closed; three review threads resolved, including persisted-hash defect | Module-load hash recomputation made the advertised tamper seal self-fulfilling; initial assurance evidence also denied the existing router | `REJECTED_CLOSED`; no execution/approval path merged | GitHub metadata + resolved-thread audit + current router inspection | Reopen only with separately persisted/versioned hashes and scanner-enforced execution decisions |
| 78 | `claude/frontier-model-router-shadow-2026-07-11` -> `claude/frontier-agent-foundry-2026-07-11` | 13 / 5 commits | Closed; no review threads | Current calls already use `lib/claude-api/model-router.ts` through `provider-dispatch.ts`; this stacked, disconnected router would create a second policy plane | `SUPERSEDED_CLOSED`; no merge | GitHub metadata + current call-site/router tests | Extend the live router in a new current-main PR |
| 79 | `claude/hotfix-clv-settlement-billing-integrity` -> `main` | 11 / 33 commits | Closed; no review threads | Probability-space American-price averaging, audit withholding, unsupported-type failure, and stronger delayed/superseded Stripe handling are all present on the recovery branch | `SUPERSEDED_CLOSED`; protected billing code was not replayed | Existing 36 normalizer, 153 engine, 134 web market/proof tests plus Stripe source/test inspection | Reopen only for a newly reproduced gap on current main |
| 80 | `claude/hotfix-slate-freeze-frontrun` -> `main` | 3 / 1 commit | Open; no review threads | The 07:00 settlement freeze could seal today's partial population before the 10:00 mint; current external and Vercel schedules preserve that race | `EXTRACTED_REBUILT`; pre-mint deferral with early-kickoff exception; stale PR must not merge | 13 freeze tests + pipeline typecheck | Revert extraction commit |
| 81 | `claude/guardrail-hardening` -> `main` | 10 / 4 commits | Open; no review threads | Current CI checked only PRs targeting `main`; public copy scanners covered a narrow route subset; staged secret scanning read worktree bytes; tracked artifact directories and multi-commit deploy diffs remained blind | `EXTRACTED_REBUILT`; all PR targets run, fork-safe branch concurrency deduplicates runs, scanners normalize and sweep every rendered public route, staged secrets come from index blobs, and Vercel uses the last successful deployment SHA with fail-safe build behavior | 13 behavioral guardrail + 10 deploy-gate + 23 integration assertions; full guardrails, web typecheck, changed-test lint | Revert extraction commit |
| 82 | `claude/hotfix-prod-db-fail-closed` -> `main` | 10 / 2 commits | Closed; two review threads resolved | Recovery commit `3c8df41e` is stronger: every `NODE_ENV=production` runtime fails closed, including workers; health is 503; DB tests run from root CI | `SUPERSEDED_CLOSED`; no merge | 14 DB + 10 health tests, root test wiring, worker Dockerfile inspection | Revert `3c8df41e` only on regression |
| 83 | `claude/stress-property-suite` -> `claude/hotfix-clv-settlement-billing-integrity` | 11 / 2 commits | Open; mandatory-away-team review resolved on stale head | Prefix-overlapping team names reproduced side inversion; stale branch left free settlement and historical replay on the unsafe optional path | `EXTRACTED_REBUILT`; mandatory two-team identity across settlement, CLV, replay, and free settlement plus compact seeded properties | 75 engine + 26 pipeline + 17 web assertions; all three typechecks | Revert extraction commit |
| 84 | `claude/hotfix-clv-regrade-orphans` -> `main` | 2 / 1 commit | Open; prior review threads resolved | Current settlement already carried the observed-market receipt contract; missing grade-once orphan replay was reproduced | `EXTRACTED_REBUILT`; stale PR must not merge | 21 settlement tests + pipeline typecheck | Revert extraction commit |
| 85 | `claude/hotfix-fabricated-record` -> `main` | 3 / 1 commit | Open; no unresolved review thread | Reproduced hard-coded public 0-0-0; rebuilt on shared canonical settled population with empty/error withholding | `EXTRACTED_REBUILT`; stale PR must not merge | 26 slate/gate assertions + web typecheck | Revert extraction commit |
| 86 | `claude/hotfix-void-stale-picks` -> `main` | 8 / 2 commits | Open; prior review threads resolved | Three-day feed horizon, recorded-FINAL replay, stale VOID, outage-independent sweep, and no-action downstream semantics remained missing | `EXTRACTED_REBUILT`; stale PR must not merge | 26 settlement + 35 ROI/outbox tests; web/pipeline typechecks | Revert extraction commit |
| 87 | `claude/hotfix-picks-outage-state` -> `main` | 9 / 3 commits | Open; stale-data probe scoping review resolved | Picks and CLV primary-read failures still masqueraded as deliberate bootstrap gating; current picks page already had a designed generic outage state | `EXTRACTED_REBUILT`; shared honest `backend_outage` response and picks-scoped probe diagnostics; stale PR must not merge | 41 focused web assertions + web typecheck | Revert extraction commit |
| 88 | `claude/hotfix-fantasy-upsell-price` -> `main` | 8 / 1 commit | Closed; no review threads | Price plumbing would make the sales path accurate while public tools still use fictional/illustrative pools, contrary to the no-fake-data rebuild constraint | `REJECTED_CLOSED`; replace the public tool surface with a truthful real-data gate instead | GitHub metadata + current fantasy route/component source audit | Reopen pricing work only after a rights-cleared projection feed is live |
| 89 | `claude/hotfix-outage-sweep` -> `claude/hotfix-picks-outage-state` | 10 / 1 commit | Open; stacked on #87 | Calibration, daily slate, promotions, and game-room reads still converted database failure into deliberate empty/missing states; proof-of-record already had the stronger `ledgerUnreachable` contract | `EXTRACTED_REBUILT`; four missing outage boundaries plus status-aware calibration probe; stale stacked PR must not merge | 134 focused outage/surface assertions + web typecheck | Revert extraction commit |
| 90 | `claude/fantasy-engine-foundation` -> `main` | 50 / 9 commits | Closed; five numeric/input review threads resolved | The 7,228-line package framed bundled golden fixtures as live 2026 output without a production provider, rights proof, freshness contract, or ingestion path | `REJECTED_CLOSED`; retain concepts only, no wholesale merge | GitHub metadata + resolved-thread audit + current provider/rights search | Reintroduce only as small rights-cleared adapters with real source snapshots |
| 91 | `claude/hotfix-stripe-event-ordering` -> `main` | 2 / 2 commits | Closed; two review threads resolved | Current main re-retrieves lifecycle state and has stronger superseded-id, PAST_DUE, terminal-cancellation, deletion-order, and retry protections | `SUPERSEDED_CLOSED`; protected billing code was not replayed | Current Stripe route + regression-suite source inspection | Reopen only for a current-main reproduction in the protected billing lane |
| 92 | `claude/hotfix-settle-refresh-races` -> `main` | 5 / 2 commits | Open; prior review threads resolved | Current create-once policy superseded refresh mutation, but concurrent upsert losers could still mint a mismatched immutable sidecar | `EXTRACTED_REBUILT`; create-only P2002 adoption, no loser sidecars | 25 process-sport tests + pipeline typecheck | Revert extraction commit |
| 93 | `claude/hotfix-cockpit-page-auth` -> `main` | 34 / 1 commit | Open; owner-gated on stale branch | All 32 current Cockpit pages lacked a page-boundary ADMIN check and relied on the parent layout | `EXTRACTED_REBUILT`; shared guard runs before page data loads and recursive CI scan covers the complete tree; stale PR must not merge | 36/36 guard and complete-tree assertions; zero missing pages | Revert extraction commit |
| 94 | `claude/hotfix-proof-count-utc-bounds` -> `main` | 8 / 2 commits | Open; prior review threads resolved | Local-midnight helpers ignored injected time; bare Merkle root retained duplicate-last ambiguity | `EXTRACTED_REBUILT`; shared request time + UTC bounds + count-bound digest | 22 proof/board tests; web/engine typechecks | Revert extraction commit |
| 95 | `claude/hotfix-vacuous-stub-tests` -> `main` | 3 / 2 commits | Open; no unresolved review thread | Strict populated demo mock reproduced mixed DB/sample totals; board query predicates lacked exact UTC filter pins | `EXTRACTED_REBUILT`; non-vacuous fixtures retained | 16 populated/slate/board tests + web typecheck | Revert extraction commit |
| 96 | `claude/model-accuracy-leaderboard` -> `claude/fantasy-engine-foundation` | 4 / 2 commits | Closed; three review threads resolved | Stacked on rejected #90; final design still inferred a probability from moneyline confidence, while current doctrine requires frozen receipt `modelProb` and withholds missing probability | `REJECTED_CLOSED`; no merge | GitHub metadata + current calibration/proof-receipt contract inspection | Rebuild only after real frozen pregame probabilities exist |
| 97 | `claude/picks-states-conversion` -> `main` | 2 / 1 commit | Closed and merged | Ancestry/patch state confirms merged; P0 stale/gate work is additive | `MERGED_IN_MAIN` | GitHub merged state + local ancestry comparison | Revert merged commit only on regression |
| 98 | `claude/add-ladder-events-migration` -> `main` | 1 / 1 commit | Closed and merged | Missing migration repair is present in current main; no migration executed by this lane | `MERGED_IN_MAIN` | GitHub merged state + local ancestry comparison | Owner-controlled migration rollback |
| 99 | `claude/picks-paywall-copy-truth` -> `main` | 3 / 2 commits | Closed and merged | Paywall copy repair present; current entitlement projection is stronger | `MERGED_IN_MAIN` | GitHub merged state + local ancestry comparison | Revert merged commits only on regression |
| 100 | `claude/honest-degraded-states` -> `main` | 6 / 2 commits | Closed and merged | Honest outage/suppression state present; current stale fail-closed work extends it | `MERGED_IN_MAIN` | GitHub merged state + local ancestry comparison | Revert merged commits only on regression |
| 101 | `claude/clv-decomposition-reland` -> `main` | 11 / 2 commits | Open; selected-side moneyline review resolved | Four schema fields and two migrations remain absent on current main; pure decomposition/dispersion code exists, but persistence requires exact drift-safe reconciliation | `OWNER_GATED_HOLD`; no merge and no migration until rebase, Prisma regeneration, and shadow-DB diff prove only four additive columns | GitHub metadata + current schema/source search; hold receipt posted | Revert code if later extracted; production migration remains owner-controlled |

## Ordered work queue

1. Verify #109 entitlement behavior across every projection; repair only proven gaps.
2. Make production DB and health fail closed without weakening deliberate local demo behavior.
3. Establish canonical market-unit parsing/aggregation/display invariants without changing settlement truth.
4. Fail closed on stale current prices per pick and sport while retaining labeled historical evidence.
5. Establish one confidence-readiness and eligible-population contract across performance, calibration, pricing, capability registry, cards, and rooms.
6. Prevent fictional newsroom objects from inhabiting live-news framing.
7. Reconcile PR #76-#101 and extract only non-superseded invariants into current-main slices.
8. Build the additive `PickEvidenceEnvelope`, canonical `IntelligenceEvent` stream, and a real `/room/[gameId]` playback slice.
9. Feed the same stream to transcript/table, selected-game Twin/Observatory, postgame autopsy, draft-only Media Studio, and deterministic cockpit explanation.
10. Complete accessibility, performance, browser, visual, trust, and full-workspace validation.

## Validation ledger

| Command / evidence | Exit | Result | Limitation |
|---|---:|---|---|
| `git fetch origin main --prune` | 0 | Live `origin/main` resolved to `3ce5c4a1` | Does not identify production deployment. |
| `git status --short --branch` | 0 | Clean isolated execution branch | Local debug journal is excluded per clone. |
| `npm.cmd run test --workspace=packages/db` | 0 | 14/14 tests passed, including production-stub fail-closed behavior | Pure package boundary; no real Postgres required. |
| `npm.cmd run test --workspace=apps/web -- --run __tests__/health-route.test.ts` | 0 | 10/10 tests passed, including stub-mode 503 behavior | Uses the real health handler with a mocked DB boundary. |
| `npm.cmd run typecheck --workspace=packages/db` | 0 | TypeScript passed | — |
| `npm.cmd run typecheck --workspace=apps/web` | 0 | TypeScript passed | — |
| `npm run test --workspace=packages/prediction-engine -- --run src/__tests__/platform-config-stale-gate.test.ts` | 0 | 5/5 tests passed; stale gate defaults on and remains explicitly overrideable | Pure config boundary. |
| `npm run test --workspace=apps/web -- --run __tests__/public-freshness-gate.test.ts __tests__/picks-stale-kill-switch.test.ts __tests__/daily-slate-stale-kill-switch.test.ts __tests__/board-stale-kill-switch.test.ts` | 0 | 20/20 tests passed; global, per-sport, never-succeeded, empty-ingestion, and DB-error suppression paths covered | Handler tests use mocked persistence; browser proof remains in the final matrix. |
| `npm run typecheck --workspace=packages/prediction-engine` | 0 | TypeScript passed after the safe-default flip | — |
| `git diff --check` | 0 | Current stale-gate patch has no whitespace errors | — |
| `npm run test --workspace=apps/web -- --run __tests__/game-room-paywall.test.ts __tests__/intelligence-graph.test.ts __tests__/game-room-route.test.ts __tests__/model-court-route.test.ts` | 0 | 19/19 tests passed; planted raw confidence, premium-pick, lens-capability, line-movement, factor-trail, and draft-autopsy leaks are withheld for default/FREE/FANTASY and preserved for PRO/ELITE | Browser/RSC flight verification remains in the final production-build matrix. |
| `npm run typecheck --workspace=apps/web` | 0 | TypeScript passed after nullable public confidence and entitlement-aware projections | — |
| `npm.cmd run test --workspace=packages/data-ingestion -- src/__tests__/normalizer.test.ts` | 0 | 36/36 tests passed; canonical moneyline normalization includes draw quotes | Provider HTTP and live database are mocked. |
| `npm.cmd run test --workspace=packages/prediction-engine -- src/__tests__/scoring.test.ts src/__tests__/clv-capture.test.ts src/__tests__/pick-proof-receipt.test.ts src/__tests__/slate-commitment.test.ts` | 0 | 153/153 tests passed; market units, three-way de-vigging, executable CLV, receipt compatibility, and slate commitment are pinned | Pure engine boundary. |
| `npm.cmd run test --workspace=packages/ingestion-pipeline -- src/__tests__/process-sport.test.ts src/__tests__/settle-sport.test.ts` | 0 | 43/43 tests passed; pre-kickoff minting, immutable publication, proof capture, settlement, and CLV failure isolation are pinned | Persistence and providers are mocked. |
| Market/proof web matrix (12 files) | 0 | 134/134 tests passed across public projection, line movement, best line, CLV formatting, audit entitlement, proof ledger, and verifier relations | Handler/component tests; production browser proof remains. |
| Calibration/performance/copy matrix (14 files) | 0 | 143/143 tests passed; raw strength never substitutes for probability and copy scanners remain green | No production settled-history query executed. |
| Newsroom public-wire matrix (6 files) | 0 | 42/42 tests passed; unapproved, future-dated, fictional, and unavailable states are pinned | No live feed is configured in test. |
| PR #84/#85/#86/#92/#94/#95 extraction matrix | 0 | 25 process, 26 settlement, 35 ROI/outbox, 22 proof/UTC-board, and 16 populated slate/board assertions passed | Persistence/providers are mocked; no production cron or settlement write executed. |
| PR #80/#83/#87 extraction matrix | 0 | 13 freeze, 75 engine money-truth, 26 settlement-pipeline, 17 free-settlement, and 41 outage/probe assertions passed; web/engine/pipeline typechecks passed | Deterministic and mocked boundaries; no production cron, database write, or outage was induced. |
| PR #89 outage-sweep extraction matrix | 0 | 134/134 focused assertions passed across calibration, daily slate, promotions, game-room/model-court, proof, and production-probe contracts; web typecheck passed | Database and outage boundaries are mocked; no production incident was induced. |
| PR #93 Cockpit page-auth matrix | 0 | 36/36 assertions passed; all 32 current Cockpit pages import and await the shared ADMIN guard before loading page data | Source-scan and mocked-session evidence; production OAuth/session behavior remains part of browser QA. |
| PR #81 guardrail-hardening matrix | 0 | 13 behavioral scanner/CI assertions, 10 deploy-gate assertions, and 23 legacy/new integration assertions passed; full guardrails, web typecheck, changed-test lint, and diff check passed | Scanner fixtures use isolated temporary repositories; GitHub/Vercel configuration is repository-validated but not yet observed in a live workflow/deployment. |
| GitHub PR #76-#101 final reconciliation | 0 | Live connector metadata and resolved-thread evidence refreshed for every remaining pending PR; #76/#77/#78/#79/#82/#88/#90/#91/#96 closed with disposition receipts; #101 remains open under an owner-gated migration hold | No PR was merged, no branch was deleted, and no migration was applied. |
| Package typechecks: data ingestion, prediction engine, ingestion pipeline | 0 | TypeScript passed for all three market-integrity packages | — |
| `npm.cmd run lint` | 0 | All workspace lint scripts passed with zero warnings | Browser runtime is separate. |
| `npm.cmd run typecheck` | 0 | All workspace TypeScript projects passed | — |
| `npm.cmd test` | 0 | 9,155/9,155 assertions passed across 737 test files in web, crypto, data ingestion, DB, ingestion pipeline, prediction engine, shared types, and the content-publishing worker | Test persistence and external providers remain mocked or stubbed; no production writes were executed. |
| Local real-client production build (`DATABASE_URL` set to an unreachable non-secret PostgreSQL URL) | 0 | Next.js compiled, validated types, generated all 205 routes, and emitted the production route/bundle manifest | Sentry/OpenTelemetry emits the known dynamic-require bundling warning. Several legacy prerender loaders attempted DB reads, logged authentication failures, and rendered degraded states; no real database or production secret was used. |
| `npm.cmd run guardrails` | 0 | Trust, model freeze, draft-only, secret, commercial-claim, rights, OpenAPI, ZK, AWS compatibility, and eval-contract guards passed | Guardrails validate repository artifacts, not production configuration. |
| Browser / console / visual matrix | PENDING | — | Requires a current production-equivalent build. |

## Touched-file ownership

| Path | Owner | Purpose | Status |
|---|---|---|---|
| `reports/agent-handoffs/FRONTIER_RECOVERY_LEDGER.md` | Codex control plane | Execution evidence and decisions | ACTIVE |
| `packages/db/src/index.ts` | Production truth lane | Reject write-dropping stub clients in production | VALIDATED |
| `packages/db/src/__tests__/production-stub-fails-closed.test.ts` | Production truth lane | Failing-first production boundary regression | VALIDATED |
| `packages/db/package.json`, `package-lock.json` | Production truth lane | Ensure DB tests execute from root CI | VALIDATED |
| `apps/web/app/api/health/route.ts`, `apps/web/__tests__/health-route.test.ts` | Production truth lane | Non-vacuous stub-mode health contract | VALIDATED |
| `packages/prediction-engine/src/platform-config.ts`, `packages/prediction-engine/src/readiness.ts` | Public-price truth lane | Make stale suppression the safe default | VALIDATED |
| `apps/web/lib/data-reliability/public-freshness-gate.ts` | Public-price truth lane | Compute fresh sports from real odds-inserting ingestion runs | VALIDATED |
| `apps/web/app/api/picks/**`, `apps/web/lib/board/**` | Public-price truth lane | Fail closed and exclude stale sports from every actionable public query | VALIDATED |
| `apps/web/__tests__/*stale*`, `apps/web/__tests__/public-freshness-gate.test.ts` | Public-price truth lane | Failing-first global, per-sport, and DB-error regressions | VALIDATED |
| `apps/web/lib/game-room/load.ts`, `apps/web/lib/intelligence-graph/index.ts` | Entitlement lane | Filter premium picks and redact raw confidence, capabilities, and draft autopsies before serialization | VALIDATED |
| `apps/web/app/room/[gameId]/page.tsx`, `apps/web/app/api/room/[gameId]/model-court/route.ts` | Entitlement lane | Pass the complete entitlement contract into the shared loader | VALIDATED |
| `apps/web/__tests__/game-room-paywall.test.ts`, `apps/web/__tests__/intelligence-graph.test.ts` | Entitlement lane | Planted forbidden-field/value and fail-closed projection regressions | VALIDATED |
| `packages/types/src/market-values.ts`, `packages/data-ingestion/src/normalizer.ts`, `packages/prediction-engine/src/scoring.ts` | Market truth lane | Canonical price/line parsing and two-way versus three-way scoring invariants | VALIDATED |
| `packages/ingestion-pipeline/src/process-sport.ts`, `packages/prediction-engine/src/pick-proof-receipt.ts` | Publication integrity lane | Pregame-only create-once picks and relation-bound immutable receipts | VALIDATED |
| `packages/prediction-engine/src/clv-capture.ts`, `packages/ingestion-pipeline/src/settle-sport.ts` | CLV truth lane | Observed executable close and no mixed legacy/new semantics | VALIDATED |
| `apps/web/lib/performance/canonical-population.ts`, `apps/web/lib/calibration/**`, `apps/web/app/performance/**` | Calibration truth lane | Shared eligible population, rank/probability separation, and live-derived performance summaries | VALIDATED |
| `apps/web/lib/news/approved-feeds.ts`, `apps/web/lib/news/public-wire.ts`, `apps/web/app/the-beat/page.tsx` | Newsroom truth lane | Approved-source-only public wire with unavailable state instead of fictional live framing | VALIDATED |
| `apps/web/app/api/picks/daily-slate/route.ts`, `apps/web/lib/time/utc-day.ts`, `apps/web/lib/board/**` | Reconciled PR truth lane | Canonical real recent record, consistent demo totals, and one UTC request-day across co-rendered loaders | VALIDATED |
| `packages/ingestion-pipeline/src/process-sport.ts`, `packages/ingestion-pipeline/src/settle-sport.ts` | Reconciled integrity lane | Create-race sidecar ownership, grade-once CLV repair, catch-up settlement, and terminal VOID sweep | VALIDATED |
| `packages/prediction-engine/src/proof-of-record.ts`, `apps/web/lib/performance/public-roi-policy.ts`, `apps/web/lib/bot-outbox/**` | Reconciled proof/outcome lane | Count-bound commitment and VOID-as-no-action consistency | VALIDATED |
| `packages/ingestion-pipeline/src/freeze-slate-commitments.ts`, `apps/web/app/api/cron/settle-picks/route.ts` | Reconciled schedule-integrity lane | Prevent the pre-mint settlement run from freezing an incomplete daily population while preserving early-kickoff sealing | VALIDATED |
| `packages/prediction-engine/src/settlement.ts`, `packages/prediction-engine/src/clv-capture.ts`, `packages/prediction-engine/src/historical-replay.ts`, `apps/web/lib/data-sources/free-settlement.ts` | Reconciled team-identity lane | Resolve overlapping team identifiers consistently across settlement, CLV, replay, and free settlement | VALIDATED |
| `apps/web/lib/data-reliability/public-freshness-gate.ts`, `apps/web/app/api/picks/route.ts`, `apps/web/app/api/clv/route.ts`, `scripts/prod-probe.mjs` | Reconciled outage-truth lane | Distinguish backend failure from deliberate bootstrap/stale gates and fail the picks probe by incident name | VALIDATED |
| `apps/web/app/api/calibration/route.ts`, `apps/web/app/api/picks/daily-slate/route.ts`, `apps/web/app/api/promotions/route.ts`, `apps/web/lib/game-room/load.ts`, `apps/web/app/api/room/[gameId]/model-court/route.ts` | Reconciled outage-sweep lane | Preserve deliberate empty/missing states while returning uncached 503 responses for primary-read failure | VALIDATED |
| `apps/web/lib/cockpit/require-admin.ts`, `apps/web/app/cockpit/**/page.tsx`, `apps/web/__tests__/cockpit-page-auth.test.ts` | Reconciled Cockpit-auth lane | Enforce ADMIN authorization at every page boundary and make omissions fail CI | VALIDATED_FOCUSED |
| `.github/workflows/ci.yml`, `scripts/guardrails/**`, `scripts/vercel-skip-build*`, `apps/web/__tests__/frontier-guardrail-hardening.test.ts` | Reconciled CI/guardrail lane | Close stacked-PR, Unicode/copy, staged-secret, draft-comment, artifact, and multi-commit deploy-skip bypasses | VALIDATED |
| `apps/web/app/proof/page.tsx`, `apps/web/components/trust-ledger/pick-ledger-row.tsx` | Production-build boundary lane | Keep route-module exports Next-compatible while preserving direct proof-row testing and trust invariants | VALIDATED |

## Blockers and safe adjacent work

- Production secrets, database migrations, Stripe/DNS/OAuth/vendor configuration, and destructive production operations are not authorized. Code, tests, shadow validation, and exact owner steps remain in scope.
- Git transport, branch push permission, and authenticated GitHub PR reads are verified. PR closure/merge remains an explicit disposition step; no merge claim is implied by extracted code.
- Missing production credentials do not block local behavioral tests, pure-domain tests, bundle checks, docs, or current-main PR reconciliation.

## Decisions with evidence

1. Work occurs in an isolated writable clone under the Galaxy control workspace because the canonical `C:\Users\Garrett\Sports` checkout contained pre-existing user scratch files and was initially read-only to the session.
2. Base all fixes on live-fetched `origin/main` (`3ce5c4a1`), not the prompt's older audited baseline. Main already contains #109, so P0-1 begins in verification mode.
3. Do not replay older billing/auth/legal/canonical-host code from open branches; those zones are protected and current main is stronger.
4. No production migration or automatic publish action will be executed. Schema proposals, code, tests, and shadow validation may be completed.
