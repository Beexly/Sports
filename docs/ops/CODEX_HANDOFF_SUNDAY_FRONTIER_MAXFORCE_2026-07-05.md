# Codex Handoff - Sunday Frontier Maxforce - 2026-07-05

Repository: `C:/Users/Garrett/Sports`

Branch: `codex/sunday-frontier-maxforce-2026-07-05`

Starting SHA: `6f193b5dc09541c2490a1b2212eccda8ca7894ba`

## What Was Done

This slice prioritized safety gates and claim discipline before adding new product surfaces.

Implemented:

- commercial copy guardrail for launch-facing revenue and media surfaces
- unsupported performance claim guardrail for public monetization copy
- raw Next Gen Stats export/language guardrail
- partner-offer compliance guardrail with fail-closed sportsbook/DFS fixtures
- API payload-rights guardrail with fail-closed raw/protected/provider/unknown-source fixtures
- OpenAPI security guardrail for the shadow API v1 contract
- npm scripts for all six frontier guardrails
- composite `npm run guardrails` wiring for all six frontier guardrails
- guardrail integration tests
- pricing page copy hardening around public record, calibration status, and line-value tracker language
- Sunday audit and R&D handoff docs
- pure fence plugins for commercial copy, affiliate disclosure, responsible gaming, source rights, API payload rights, and restricted tracking-data export language
- source-rights/IP adapters that reuse the canonical scraping registry and expose source envelopes, payload rights, metric cards, model cards, drift cards, and licensing readiness helpers
- API-auth/API-v1 pure seams for key shape, hashing, scopes, plans, quotas, rate-limit re-exports, usage records, audit logs, webhook signatures, idempotency, response envelopes, schemas, payload filtering, and OpenAPI access
- API v1 route-level shadow harness for auth, consumer resolution, scope/origin, rate/quota, request ID, response envelope, usage event, payload rights, and abuse-response coverage without live route exposure
- API v1 idempotency replay simulation for duplicate successful shadow requests without double-counting usage
- exact `docs/aws` and `infra/aws-shadow` compatibility indexes with local-only AWS fixture aliases and guardrail coverage
- draft fence workflow harness for content/API drafts with source-rights, commercial-copy, disclosure, responsible-gaming, API payload-rights, restricted-tracking-data, manual-review gates, local review packet serialization, markdown rendering, an in-memory packet ledger, queue filters, and summary counts
- representative content/API review packet fixtures and a local claim-safety batch report
- first-month media content queue fixtures and local claim-safety batch report
- first-month media review queue export with bounded markdown packets and closed live-action locks
- partner/sponsor review packet fixtures with local-only locks, disclosure/responsible-gaming checks, sponsor-independence blockers, claim-safety blockers, and no affiliate activation
- local review queue persistence simulator for media, content/API, and partner/sponsor packets with append-only replay, duplicate rejection, stale packet reporting, version conflict checks, unresolved blocker approval blocking, and no DB writes
- local review queue blocker report grouped by queue source, workflow surface, and source ID, with a local priority queue and markdown renderer
- API abuse-response and promotion-conflict fixture report for malformed keys, conflicting keys, overscope, quota exhaustion, unsafe payloads, malformed route controls, replay conflicts, unresolved/stale review packets, and duplicate promotion request IDs
- public-safe AWS-governed sports intelligence case-study route with six Well-Architected pillar mappings, exact `docs/aws` route record, launch-page source QA, and closed live-action locks
- Receiver Difficulty Index and Expected YAC metric slice with birth certificates, exports, asset coverage, and directional tests
- Role Volatility Index metric slice with birth certificate, exports, asset coverage, source-policy fail-closed behavior, and directional tests
- Playable Window Score metric slice with birth certificate, exports, asset coverage, stale/source/no-bet/drift/calibration fail-closed behavior, and directional tests
- Market Mirage Score metric slice with birth certificate, exports, asset coverage, stale/source/no-bet/drift/calibration fail-closed behavior, composed payload fixture integration, app bridge expectation coverage, and directional tests
- SLRS/QBI/RVI/PWS evidence-card fixture library with draft-first model cards, active drift cards, role-stability split coverage, decision-window split coverage, and package-root proprietary aliases
- generated shadow metric evidence markdown reports for SLRS, QBI, RVI, PWS, and MMS, plus package-root proprietary aliases
- source-rights-reviewed historical validation adapters for RVI, PWS, and MMS, plus package-root proprietary aliases
- local blocker-report docs and tests for unresolved commercial review queue repair work
- RVI/PWS validation split fixture runner with synthetic/local clean, watch, stale, calibration-debt, and blocked-source cases, plus package-root proprietary aliases
- Composed decision metric payload-envelope fixture runner for PWS, GSS, SLRS, QBI, RVI, and MMS, plus unsupported probability claim fail-closed field kind and package-root proprietary aliases
- App API-v1 composed metric payload bridge that consumes package-owned fixtures through `filterApiV1MetricPayloadFields` while keeping route creation locked off

## Files Changed

Application and test files:

- `apps/web/app/pricing/page.tsx`
- `apps/web/__tests__/guardrails.test.ts`
- `apps/web/__tests__/fences-and-adapters.test.ts`
- `apps/web/lib/fences/*`
- `apps/web/lib/source-rights/*`
- `apps/web/lib/ip/*`
- `apps/web/lib/api-auth/*`
- `apps/web/lib/api-v1/*`
- `apps/web/lib/api-v1/composed-metric-payload-fixture-bridge.ts`
- `apps/web/__tests__/api-v1-composed-metric-payload-bridge.test.ts`
- `apps/web/lib/api/v1/shadow-route-harness.ts`
- `apps/web/__tests__/api-v1-shadow-route-harness.test.ts`
- `apps/web/lib/api/v1/shadow-route-replay.ts`
- `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`
- `apps/web/lib/api/v1/abuse-response-fixtures.ts`
- `apps/web/__tests__/api-v1-abuse-response-fixtures.test.ts`
- `apps/web/lib/aws-case-study/public-case-study.ts`
- `apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx`
- `apps/web/__tests__/aws-case-study-page.test.ts`
- `apps/web/__tests__/commercial-pages-launch-qa.test.ts`
- `apps/web/lib/workflows/draft-fence-workflow.ts`
- `apps/web/__tests__/draft-fence-workflow.test.ts`
- `apps/web/lib/workflows/draft-review-fixtures.ts`
- `apps/web/__tests__/draft-review-fixtures.test.ts`
- `apps/web/lib/workflows/partner-sponsor-review-fixtures.ts`
- `apps/web/__tests__/partner-sponsor-review-fixtures.test.ts`
- `apps/web/lib/workflows/local-review-queue-persistence.ts`
- `apps/web/__tests__/local-review-queue-persistence.test.ts`
- `apps/web/lib/workflows/local-review-queue-report.ts`
- `apps/web/lib/workflows/local-review-queue-report-markdown.ts`
- `apps/web/__tests__/local-review-queue-report.test.ts`
- `apps/web/lib/media-revenue/first-month-content-seeds.ts`
- `apps/web/lib/media-revenue/first-month-content-queue.ts`
- `apps/web/__tests__/first-month-content-queue.test.ts`
- `apps/web/lib/media-revenue/first-month-review-queue.ts`
- `apps/web/__tests__/first-month-review-queue.test.ts`
- `packages/prediction-engine/src/metrics/receiving/*`
- `packages/prediction-engine/src/metrics/role/role-volatility-index.ts`
- `packages/prediction-engine/src/metrics/decision/playable-window-score.ts`
- `packages/prediction-engine/src/metrics/core/metric-evidence-card-fixtures.ts`
- `packages/prediction-engine/src/metrics/core/metric-validation-split-fixture-data.ts`
- `packages/prediction-engine/src/metrics/core/metric-validation-split-fixtures.ts`
- `packages/prediction-engine/src/metrics/core/metric-payload-envelope-fixture-data.ts`
- `packages/prediction-engine/src/metrics/core/metric-payload-envelope-fixtures.ts`
- `packages/prediction-engine/src/metrics/core/payload-rights.ts`
- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/role-volatility-index.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/playable-window-score.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-evidence-cards.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-validation-split-fixtures.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-payload-envelope-fixtures.test.ts`
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate.ts`
- `packages/prediction-engine/src/metrics/core/index.ts`
- `packages/prediction-engine/src/index.ts`
- `apps/web/__tests__/aws-compatibility-index.test.ts`
- `packages/prediction-engine/src/gse-score/calibration-action-policy.ts`
- `packages/prediction-engine/src/gse-score/gse-action-score.ts`
- `packages/prediction-engine/src/gse-score/__tests__/no-bet-governor-integration.test.ts`

Guardrails:

- `scripts/guardrails/commercial-copy-scan.mjs`
- `scripts/guardrails/no-unsupported-performance-claims.mjs`
- `scripts/guardrails/no-raw-ngs-export.mjs`
- `scripts/guardrails/partner-offer-compliance-scan.mjs`
- `scripts/guardrails/fixtures/partner-offer-compliance.json`
- `scripts/guardrails/api-payload-rights-scan.mjs`
- `scripts/guardrails/openapi-security-scan.mjs`
- `scripts/guardrails/fixtures/api-payload-rights.json`
- `scripts/guardrails/fixtures/openapi-security.json`
- `scripts/guardrails/aws-compatibility-index-scan.mjs`
- `scripts/guardrails/fixtures/aws-compatibility-index.json`

Package scripts:

- `package.json`

Docs:

- `docs/ops/SUNDAY_FRONTIER_MAXFORCE_AUDIT_2026-07-05.md`
- `docs/research/SUNDAY_FRONTIER_R_AND_D_MAP_2026-07-05.md`
- `docs/ops/CODEX_HANDOFF_SUNDAY_FRONTIER_MAXFORCE_2026-07-05.md`
- `docs/EXECUTION_LEDGER.md`
- `docs/commercial/COMMERCIAL_EXECUTION_LEDGER.md`
- `docs/media/MEDIA_REVENUE_STUDIO_COMPLETION_AUDIT.md`
- `docs/api/API_V1_SHADOW_ROUTE_HARNESS.md`
- `docs/api/API_V1_SHADOW_ROUTE_REPLAY.md`
- `docs/api/API_V1_SHADOW_SEAM.md`
- `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md`
- `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PR_BODY.md`
- `docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md`
- `docs/aws/AWS_PUBLIC_CASE_STUDY_ROUTE.md`
- `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`
- `docs/ops/LOCAL_REVIEW_QUEUE_PERSISTENCE_SIMULATOR.md`
- `docs/ops/LOCAL_REVIEW_QUEUE_BLOCKER_REPORT.md`
- `docs/revenue/PARTNER_SPONSOR_REVIEW_FIXTURES.md`
- `docs/media/FIRST_MONTH_CONTENT_QUEUE_FIXTURES.md`
- `docs/media/FIRST_MONTH_REVIEW_QUEUE_EXPORT.md`
- `docs/aws/*`
- `infra/aws-shadow/*`

## Verification Run

Passed:

- `node scripts/guardrails/commercial-copy-scan.mjs`
- `node scripts/guardrails/no-unsupported-performance-claims.mjs`
- `node scripts/guardrails/no-raw-ngs-export.mjs`
- `node scripts/guardrails/partner-offer-compliance-scan.mjs`
- `node scripts/guardrails/api-payload-rights-scan.mjs`
- `node scripts/guardrails/openapi-security-scan.mjs`
- `npm run guard:commercial-copy`
- `npm run guard:performance-claims`
- `npm run guard:no-raw-ngs`
- `npm run guard:partner-offers`
- `npm run guard:api-payload-rights`
- `npm run guard:openapi-security`
- `npm run guard:aws-compatibility-index`
- `npm run fable:aws-gates`
- `npm run fable:aws-fixtures`
- `npm run fable:aws-governance`
- `npm run test --workspace=apps/web -- aws-compatibility-index.test.ts`
- `npm run fable:aws-intel`
- `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-boundary-guard.test.ts`
- `npm run test --workspace=apps/web -- api-v1-shadow-route-replay.test.ts api-v1-shadow-route-harness.test.ts api-v1-persistence.test.ts`
- `npm run test --workspace=apps/web -- api-v1-abuse-response-fixtures.test.ts api-v1-shadow-route-harness.test.ts api-v1-shadow-route-replay.test.ts api-v1-live-route-promotion-packet.test.ts local-review-queue-persistence.test.ts`
- `npm run test --workspace=apps/web -- local-review-queue-report.test.ts`
- `npm run test --workspace=apps/web -- draft-fence-workflow.test.ts fences-and-adapters.test.ts`
- `npx vitest run apps/web/__tests__/guardrails.test.ts`
- `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web`
- `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts`
- `npm run test --workspace=apps/web -- first-month-content-queue.test.ts media-revenue-claim-safety.test.ts`
- `npm run test --workspace=apps/web -- first-month-review-queue.test.ts first-month-content-queue.test.ts draft-fence-workflow.test.ts`
- `npm run test --workspace=apps/web -- partner-sponsor-review-fixtures.test.ts draft-review-fixtures.test.ts affiliate-compliance.test.ts sponsor-copy-scan.test.ts partner-risk-engine.test.ts partner-opportunity.test.ts`
- `npm run test --workspace=apps/web -- local-review-queue-persistence.test.ts first-month-review-queue.test.ts draft-review-fixtures.test.ts partner-sponsor-review-fixtures.test.ts`
- `npm run test --workspace=apps/web -- local-review-queue-report.test.ts local-review-queue-persistence.test.ts draft-review-fixtures.test.ts partner-sponsor-review-fixtures.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-payload-envelope.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts`
- `npm run test --workspace=@sports/web -- __tests__/fences-and-adapters.test.ts`
- `npm run test --workspace=@sports/web -- __tests__/no-bet-methodology.test.ts`
- `npm run test --workspace=@sports/web -- __tests__/no-bet-methodology.test.ts media-revenue-claim-safety.test.ts`
- `npm run test --workspace=apps/web -- api-v1-live-route-promotion-packet.test.ts api-v1-boundary-guard.test.ts api-v1-promotion-readiness.test.ts api-v1-disposable-rehearsal-packet.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/no-bet-governor-integration.test.ts src/gse-score/__tests__/gse-action-score.test.ts src/gse-score/__tests__/no-bet-strength.test.ts`
- `npm run typecheck --workspace=@sports/web`
- `npm run typecheck --workspace=packages/prediction-engine`
- `npm run typecheck`
- `npm run lint`
- `npm run test --workspaces --if-present`
- `npm run test --workspace=apps/web -- --reporter=dot --silent`
- `npm run test --workspace=packages/crypto -- --reporter=dot --silent`
- `npm run test --workspace=packages/data-ingestion -- --reporter=dot --silent`
- `npm run test --workspace=packages/ingestion-pipeline -- --reporter=dot --silent`
- `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent`
- `npm run test --workspace=packages/types -- --reporter=dot --silent`
- `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/no-bet-governor-integration.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/gse-action-score.test.ts src/gse-score/__tests__/no-bet-strength.test.ts src/gse-score/__tests__/model-parliament.test.ts src/gse-score/__tests__/no-bet-governor-integration.test.ts src/metrics/__tests__/gse-signal-score.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/data-reliability-index.test.ts`
- `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent`
- `npm run typecheck --workspace=packages/prediction-engine`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/role-volatility-index.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/nfl/__tests__/gse-nfl-metrics.test.ts`
- `npm run test --workspace=apps/web -- __tests__/commercial-pages-launch-qa.test.ts __tests__/media-kit-page.test.ts __tests__/partners-page.test.ts __tests__/pricing-honesty.test.ts __tests__/pricing-value-architecture.test.ts`
- `npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3065`
- `MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/desktop WIDTH=1440 HEIGHT=1100 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing`
- `MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/mobile WIDTH=390 HEIGHT=844 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/expected-yac.test.ts src/metrics/__tests__/yac-creation.test.ts src/metrics/__tests__/rush-environment-index.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts`
- `npm run typecheck --workspace=packages/prediction-engine`
- `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent`
- `npm run guardrails`
- `git diff --check`

Broad test result:

- `npm run test --workspaces --if-present`: 635 test files and 8052 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types.
- Current AWS compatibility slice rerun of `npm run test --workspaces --if-present` exceeded the 300s tool ceiling and is not counted as a pass.
- Current local review queue blocker-report slice reran `npm run test --workspaces --if-present` and `npm run test --workspaces --if-present -- --reporter=dot --silent`; both commands exited 0, but the tool transcript was too large for a reliable aggregate count, so no new all-workspaces total is claimed for that slice.
- Local review queue blocker-report focused validation passed: initial single-file test failed on an intentionally repaired stale-packet fixture, final single-file test passed (1 file, 4 tests), adjacent queue tests passed (4 files, 20 tests), app workspace typecheck passed, root typecheck/lint/guardrails passed, and `git diff --check` passed.
- Equivalent segmented workspace tests passed across all test-script workspaces: 638 files and 8067 tests.
- No-bet governor integration red/green: first targeted run failed because drift and calibration debt still produced `PLAY`; after hardening, targeted test passed (1 file, 5 tests), adjacent governor/metric suite passed (7 files, 23 tests), prediction-engine suite passed (85 files, 786 tests), and prediction-engine typecheck passed after correcting one fixture literal from uppercase `UNKNOWN` to lowercase `unknown`.
- Launch commercial page source QA passed: 5 files and 40 tests.
- Local desktop/mobile screenshot pass rendered `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`, and `/pricing` with HTTP 200 after rerunning the screenshot helper with `MSYS_NO_PATHCONV=1` to avoid Git Bash path conversion. Evidence lives in `reports/launch-page-visual-qa/2026-07-05/*`.
- Metric continuation red/green: first targeted run failed because asset graduation still pinned the old six-metric order; after updating the expectation, targeted metric tests passed (6 files, 20 tests), prediction-engine typecheck passed, and full prediction-engine tests passed (87 files, 790 tests).
- `npx prettier --check ...` was attempted but blocked before execution by npm certificate verification while fetching Prettier; no install or dependency change was attempted.
- Rushing metric continuation passed targeted tests after splitting the metric birth-certificate registry: `metric-birth-certificate.test.ts`, `rush-environment-index.test.ts`, `expected-rush-yards.test.ts`, `rush-over-expected.test.ts`, and `metric-asset-graduation.test.ts` (5 files, 15 tests).
- Current rushing metric validation: prediction-engine typecheck passed; full prediction-engine tests passed (89 files, 794 tests); root typecheck passed; root lint passed; root guardrails passed; `git diff --check` passed.
- Current all-workspaces test wrapper hit the 300s tool ceiling and is not counted as a pass. Segmented fallback passed: apps/web in six chunks (531 files, 7056 tests), crypto (1 file, 13 tests), data-ingestion (16 files, 131 tests), ingestion-pipeline (6 files, 60 tests), prediction-engine (89 files, 794 tests), and types (1 file, 31 tests).
- API live-route promotion packet validation: focused packet/readiness/boundary tests passed (4 files, 19 tests). First app typecheck caught a strict optional blocker-list issue; after explicit filtering, app workspace typecheck passed. Root typecheck, root lint, and root guardrails passed. The root all-workspaces test wrapper hit the 300s tool ceiling and is not counted as a pass; segmented workspace tests passed across every test-script workspace: web 533 files / 7072 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 92 / 812, and types 1 / 31. `git diff --check` passed.
- Partner/sponsor fixture validation: first targeted run failed because disclosure warnings were treated as hard blockers and the test expected uppercase `ROI`; after repair, targeted tests passed (6 files, 32 tests). App workspace typecheck passed.
- Local review queue persistence validation: targeted local queue, first-month review export, draft-review fixture, and partner/sponsor fixture tests passed (4 files, 19 tests). First app typecheck failed because mutable queue record status was still narrowed to raw draft workflow status; after splitting `initialWorkflowStatus` from mutable queue status, app workspace typecheck passed.
- API abuse-response fixture validation: targeted API abuse, route harness, replay, live-route promotion packet, and local review queue tests passed (5 files, 25 tests). First app typecheck failed on nullable replay-conflict map/filter typing; after replacing it with an explicit conflict collection loop, app workspace typecheck passed.
- AWS case-study route validation: first focused route test caught unsafe `live AWS` wording and an evidence-required `ROI` reference; after wording repair, AWS case-study, launch QA, media-kit, and partners tests passed (4 files, 16 tests). App workspace typecheck passed.
- Current AWS case-study root validation: AWS compatibility guard passed, root typecheck passed, root lint passed, root guardrails passed, full all-workspaces tests passed (653 files, 8152 tests), and `git diff --check` passed.
- Role Volatility Index validation: focused RVI/birth-certificate/asset/NFL compatibility tests passed after adding blocked-source fail-closed coverage (4 files, 20 tests); prediction-engine typecheck passed; full prediction-engine tests passed (95 files, 826 tests); root typecheck, root lint, and root guardrails passed; segmented workspace tests passed across apps/web 537 files / 7105 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 95 / 826, and types 1 / 31, for 656 files / 8166 tests.
- Playable Window Score validation: focused PWS/GSS/birth-certificate/asset tests passed (4 files, 17 tests); first prediction-engine typecheck caught a non-canonical `abstention_audit` validation method before passing after repair; full prediction-engine tests passed (96 files, 832 tests); root typecheck, root lint, root guardrails, and `git diff --check` passed; segmented workspace tests passed across apps/web 537 files / 7105 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 96 / 832, and types 1 / 31, for 657 files / 8172 tests.
- Evidence-card fixture validation: focused evidence-card/asset/PWS/RVI tests passed (4 files, 26 tests); prediction-engine typecheck passed after adding the fixture library, core exports, and package-root proprietary aliases; full prediction-engine tests passed (96 files, 835 tests); root typecheck, lint, guardrails, and `git diff --check` passed; segmented workspace tests passed across apps/web 537 files / 7105 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 96 / 835, and types 1 / 31, for 657 files / 8175 tests.
- Validation split fixture validation: first focused run caught clean fixtures carrying pressure proxies, and first prediction-engine typecheck caught missing `signalIntegrityIndex`; after repair, focused split/PWS/RVI tests passed (3 files, 16 tests), prediction-engine typecheck passed, full prediction-engine tests passed (97 files, 840 tests), root typecheck, lint, guardrails, and `git diff --check` passed, and segmented workspace tests passed across apps/web 537 files / 7105 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 97 / 840, and types 1 / 31, for 658 files / 8180 tests.
- Composed payload fixture validation: focused payload fixture, payload-envelope, and source-rights tests passed (3 files, 17 tests); prediction-engine typecheck passed after fixture exports and the unsupported probability claim field kind; full prediction-engine tests passed (98 files, 845 tests); root typecheck, lint, guardrails, and `git diff --check` passed; segmented workspace tests passed across apps/web 537 files / 7105 tests, crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, prediction-engine 98 / 845, and types 1 / 31, for 659 files / 8185 tests. LOC/escape-hatch scan passed with data fixture 170 lines, runner 61 lines, test 77 lines, and no TS escape hatches or non-null property access.
- App payload bridge validation: focused app bridge and fence/API adapter tests passed (2 files, 13 tests); app typecheck passed; full app tests passed (538 files, 7111 tests); root typecheck, lint, guardrails, and `git diff --check` passed. LOC/escape-hatch scan passed with bridge 72 lines, test 75 lines, and no TS escape hatches or non-null property access.
- Market Mirage Score validation: first focused MMS run caught a noisy fixture below the intended `WATCH` threshold; after repair, focused MMS tests passed (6 files, 27 tests). Focused MMS payload integration passed in prediction-engine (6 files, 31 tests) and app bridge coverage passed (1 file, 4 tests). Prediction-engine typecheck and app typecheck passed. Full prediction-engine tests passed (99 files, 850 tests), full app tests passed (538 files, 7111 tests), and remaining segmented workspace tests passed across crypto 1 / 13, data-ingestion 16 / 131, ingestion-pipeline 6 / 60, and types 1 / 31, for an aggregate segmented receipt of 661 files / 8196 tests.
- Generated report validation: focused evidence-card/report tests passed (2 files, 11 tests); prediction-engine typecheck passed; renderer 92 lines, fixture 166 lines, split tests 196 and 62 lines, report doc 164 lines; no TS escape hatches or non-null property access found.
- Historical adapter validation: focused adapter/split/source-rights tests passed (3 files, 18 tests); prediction-engine typecheck passed; adapter 210 lines, fixture 116 lines, test 79 lines; no TS escape hatches or non-null property access found.
- AWS case-study visual QA: first screenshot attempts hit `net::ERR_CONNECTION_RESET` during route compilation. After local dev-server restart and direct HTTP probe, the route returned 200, desktop and mobile screenshots were captured under `reports/launch-page-visual-qa/2026-07-06/*`, and both captures were visually reviewed.

## Complete

- Media Revenue Studio docs/utilities/pages exist.
- Commercial and revenue docs/utilities exist.
- Proprietary metric Slice 1 plus asset/graduation/source/payload controls exist.
- Receiver Difficulty Index and Expected YAC exist as governed `SHADOW` metrics with birth certificates and directional tests.
- Partner-offer compliance guardrail exists and is wired into `npm run guardrails`.
- API payload-rights and OpenAPI security guardrails exist and are wired into `npm run guardrails`.
- Fence, source-rights/IP, API-auth, API-v1 pure seams, the route-level API shadow harness, API replay simulation, and the draft workflow harness exist with tests.
- Representative content/API review packet fixtures, first-month media queue fixtures, and first-month review queue exports exist with claim-safety reports.
- Partner/sponsor review fixtures now exist for creator-tool affiliate review, board-meeting sponsor independence, sponsor-control blocking, regulated unknown-state blocking, expired-offer blocking, and unsafe-claim copy blocking.
- Local review queue persistence simulator now exists for draft-review, first-month media, and partner/sponsor packets with append-only memory-shadow events, deterministic replay, duplicate rejection, stale packet reporting, version conflict checks, unresolved blocker approval blocking, markdown snapshots, and no database writes.
- API abuse-response and promotion-conflict fixture reporting now exists. It proves denied API cases do not debit quota or leak protected response data, and it blocks live-route abuse-review evidence when replay conflicts, unresolved/stale review packets, or duplicate route-promotion IDs exist.
- FABLE/AWS shadow architecture exists under `docs/fable/aws` and `infrastructure/aws`.
- Exact `docs/aws` and `infra/aws-shadow` compatibility indexes exist and point to canonical FABLE/AWS artifacts.
- Public-safe AWS-governed sports intelligence case-study route now exists and is registered in `docs/aws/AWS_PUBLIC_CASE_STUDY_ROUTE.md`. It explains local AWS-style governance without claiming AWS approval, cloud setup, funding, audience, sponsors, legal clearance, or release readiness.
- Local desktop/mobile visual QA for the AWS case-study route now exists under `reports/launch-page-visual-qa/2026-07-06/*`.
- No-bet governor integration tests now prove high edge cannot override missing data, stale market gravity, unclear source rights, calibration drift, or calibration debt.
- `computeGseActionScore` now caps action quality when probability claims are unearned and hard-passes DRIFTING/BLOCKED calibration.
- Public-safe no-bet methodology examples now exist for seven refusal/review states, with copy scanned through media claim safety, no-claim guard, and performance-claim guard.
- Launch-facing commercial pages now have source-level QA plus local desktop/mobile screenshot artifacts for the five media pages and pricing.
- YAC Creation, Rush Environment Index, Expected Rush Yards, and Rush Over Expected now exist as governed `SHADOW` metrics with birth certificates, package exports, directional tests, public drivers, source-policy passthrough, and explicit confidence/evidence separation.
- `metric-birth-certificate.ts` was split into a compact contract/lookup module plus `metric-birth-certificate-registry.ts` to keep the growing metric registry maintainable.
- Receiver/rusher residual rollups now exist as governed `SHADOW` / `INTERNAL` player-season summaries for `yac-creation-gse` and `rush-over-expected-gse`, with source-policy validation and evidence-confidence separation.
- Metric model/drift-card generators now exist as local evidence helpers. Model cards are draft-first by default, and generated cards do not promote lifecycle, exposure, licensing, validation, or source clearance.
- Metric evidence-card fixtures now exist for SLRS, QBI, RVI, and PWS. They generate draft-first model cards and drift cards from synthetic/local evidence, preserve `SHADOW` lifecycle, `INTERNAL` API exposure, `NOT_READY` licensing, and `publicApiAllowed: false`, and keep role-stability plus decision-window split evidence in active drift review.
- Metric evidence-card fixtures now include MMS, and generated shadow metric evidence markdown reports now exist for SLRS, QBI, RVI, PWS, and MMS. The reports are synthetic/local, route-free, public-API-locked, and do not approve public content, API exposure, licensing, betting use, production promotion, legal clearance, probability claims, expected-value claims, or pick claims.
- Source-rights-reviewed historical validation adapters now exist for RVI, PWS, and MMS. They adapt fully cleared local historical-shaped records, return manual review for logged-off/manual-review source posture, and block permission-required or missing sources before metric execution.
- Local review queue blocker reporting now exists. It consumes the memory-shadow queue snapshot, groups unresolved blockers by queue source, workflow surface, and source ID, renders a local markdown report, and keeps publish/send/route/live/affiliate/sponsor/database locks closed.
- Metric validation split fixtures now exist for RVI role-stability and PWS decision-window seams. They are synthetic/local, preserve `SHADOW` lifecycle, `INTERNAL` API exposure, `NOT_READY` licensing, and `publicApiAllowed: false`, and classify clean/watch/fail-closed split cases without public/API exposure or promotion.
- Composed decision metric payload-envelope fixtures now exist for PWS, GSS, SLRS, QBI, and RVI. They are synthetic/local, approve only derived scores, bands, summaries, confidence meaning, and public drivers, and block protected weights, raw values, provider IDs, unsupported probability claims, and uncleared fallback source fields without route exposure.
- The app API-v1 composed metric payload bridge now exists. It consumes the package-owned payload fixtures through `filterApiV1MetricPayloadFields`, preserves approvals/blocks, and records `shadowOnly: true`, `liveRouteCreated: false`, and `routePath: null`.
- Metric source-policy generation now exists from registry-shaped fixtures aligned to `apps/web/lib/scraping/source-rights-registry.ts`; raw API exposure stays blocked for every generated source.
- Metric payload-envelope filtering now exists in `@sports/prediction-engine`, with an app API-v1 bridge that delegates metric-shaped payload fields through proprietary metric payload-rights before exposure.
- Stale Line Risk Score now exists as a governed `SHADOW` market-risk metric. It blocks stale line snapshots from market-signal use, exposes only public drivers, keeps protected thresholds/weights/scales private, and has directional tests for staleness, source coverage, contradiction, and rights status.
- QB Burden Index now exists as a governed `SHADOW` passing-context metric. It is separate from quarterback quality, win probability, model confidence, and pick actionability; it exposes public burden drivers only and keeps protected weights/proxy transforms/source-posture scaling private.
- Role Volatility Index now exists as a governed `SHADOW` role-instability metric. It is separate from player quality, win probability, model confidence, and pick actionability; stale usage and blocked source-policy posture both disable role-signal use, public drivers explain the volatility pressure, and protected weights/thresholds/proxy transforms remain private.
- Playable Window Score now exists as a governed `SHADOW` decision-window readiness metric. It is separate from win probability, expected value, confidence, betting advice, and pick triggers; stale or blocked market signals, blocked source-policy posture, high no-bet pressure, high drift pressure, or high calibration debt close the window before downstream action review.
- Market Mirage Score now exists as a governed `SHADOW` market-integrity risk metric. It is separate from win probability, expected value, confidence, betting advice, and pick triggers; stale or blocked market signals, blocked source-policy posture, high no-bet pressure, high drift pressure, or high calibration debt block market interpretation before downstream action review.
- New commercial/performance/raw-NGS/partner-offer/API-payload/OpenAPI/AWS-compatibility guardrails pass and are wired into root scripts.
- API live-route promotion packet now exists as a non-executable owner-review seam. It requires owner approval, durable persistence review, route exposure approval, abuse-response review, payload-envelope consumption, OpenAPI/security review, rate-limit policy review, rollback plan review, boundary exception review, and raw-key absence review while keeping live route creation and command execution disabled in every state.

## Partial

- B2B Evidence API has strong docs, rehearsal packets, pure `apps/web/lib/api-auth` / `apps/web/lib/api-v1` seams, payload/OpenAPI guardrails, a route-level shadow harness, local idempotency replay simulation, abuse-response fixture reporting, and a non-executable live-route promotion packet. Live `app/api/v1` routes are still intentionally deferred by boundary guard and owner-review gates.
- Source-rights/IP adapters under `apps/web/lib/source-rights` and `apps/web/lib/ip` exist, but they are policy gates and not legal clearance.
- Fence plugin path family under `apps/web/lib/fences`, the draft workflow harness, local review packet serialization, markdown rendering, in-memory packet ledger, queue status filters, review summary counts, representative content/API packet fixtures, first-month media queue fixtures, first-month review queue export, partner/sponsor review fixture reports, local review queue persistence simulator, and local blocker report exist as pure manual-review gates.
- AWS exact paths `docs/aws` and `infra/aws-shadow` are compatibility indexes only; canonical AWS ownership remains under `docs/fable/aws` and `infrastructure/aws`.
- Launch-page visual QA is local render evidence only. Production preview QA remains owner-reviewed and intentionally deferred.
- Full proprietary metric backlog remains future work, with owner-approved live-route promotion packet, app-level composed payload fixture bridge coverage, real historical distribution/drift adapters, and Portfolio Fit Score / Calibration Integrity Grade next.

## Intentionally Deferred

- No live AWS or cloud commands.
- No credentials or secrets.
- No package installs or dependency changes.
- No DB migrations.
- No public API route exposure.
- No affiliate links.
- No auto-email, auto-publish, or betting automation.
- No claim that pricing/performance pages have verified win rate, ROI, CLV, or calibrated public probability unless settled evidence supports it.

## Safety Gates Preserved

- no secrets added
- no paid resources touched
- no live AWS
- no dependencies changed
- no auto-publish
- no fake users, sponsors, traffic, revenue, win rate, ROI, calibration, or partnerships
- no raw NGS export
- no app prediction gate flipped

## Next 10 Codex Tasks Ranked By Leverage

1. Continue guarded metric backlog with Portfolio Fit Score or Calibration Integrity Grade only after no-bet, payload-envelope, and source-rights veto tests stay green.
2. Add historical distribution/drift adapters only after source rights and payload rights prove the inputs are cleared.
3. Add markdown export tests for any future metric report before allowing it into public/API route planning.
4. Add partner/sponsor markdown export docs only if generated copy remains claim-safe and sponsor-independent.
5. Run owner-reviewed production preview QA before live push.
6. Add public-safe no-bet examples to a future owner-approved product surface only after visual/copy QA.
7. Add route design paperwork only after owner approval; keep it non-executable and route-free.
8. Add visual QA for any new public-safe case-study route before production preview.
9. Add historical-data adapters for validation splits only after source-rights and payload-rights review confirms the inputs are cleared.
10. Add source-policy generation receipts for new metric families before any app/API bridge expansion.

## Next Prompt

Continue the Sunday frontier implementation with the next governed metric or draft evidence report:

1. Continue with Portfolio Fit Score / Calibration Integrity Grade after preserving all no-bet/source/payload vetoes.
2. Preserve source-policy posture, lifecycle locks, API locks, and no-bet/calibration/staleness veto semantics.
3. Keep all work separate from live `app/api/v1` route implementation.
4. Keep all validation outputs separate from legal clearance, production readiness, AWS deployment, public/API exposure, and betting advice.
5. Run focused prediction-engine tests plus root typecheck, lint, guardrails, segmented workspace tests, and `git diff --check`.
