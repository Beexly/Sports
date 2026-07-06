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
- Receiver Difficulty Index and Expected YAC metric slice with birth certificates, exports, asset coverage, and directional tests

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
- `apps/web/lib/api/v1/shadow-route-harness.ts`
- `apps/web/__tests__/api-v1-shadow-route-harness.test.ts`
- `apps/web/lib/api/v1/shadow-route-replay.ts`
- `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`
- `apps/web/lib/workflows/draft-fence-workflow.ts`
- `apps/web/__tests__/draft-fence-workflow.test.ts`
- `apps/web/lib/workflows/draft-review-fixtures.ts`
- `apps/web/__tests__/draft-review-fixtures.test.ts`
- `apps/web/lib/media-revenue/first-month-content-seeds.ts`
- `apps/web/lib/media-revenue/first-month-content-queue.ts`
- `apps/web/__tests__/first-month-content-queue.test.ts`
- `apps/web/lib/media-revenue/first-month-review-queue.ts`
- `apps/web/__tests__/first-month-review-queue.test.ts`
- `packages/prediction-engine/src/metrics/receiving/*`
- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
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
- `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`
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
- `npm run test --workspace=apps/web -- draft-fence-workflow.test.ts fences-and-adapters.test.ts`
- `npx vitest run apps/web/__tests__/guardrails.test.ts`
- `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web`
- `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts`
- `npm run test --workspace=apps/web -- first-month-content-queue.test.ts media-revenue-claim-safety.test.ts`
- `npm run test --workspace=apps/web -- first-month-review-queue.test.ts first-month-content-queue.test.ts draft-fence-workflow.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts`
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
- Equivalent segmented workspace tests passed across all test-script workspaces: 638 files and 8067 tests.
- No-bet governor integration red/green: first targeted run failed because drift and calibration debt still produced `PLAY`; after hardening, targeted test passed (1 file, 5 tests), adjacent governor/metric suite passed (7 files, 23 tests), prediction-engine suite passed (85 files, 786 tests), and prediction-engine typecheck passed after correcting one fixture literal from uppercase `UNKNOWN` to lowercase `unknown`.
- Launch commercial page source QA passed: 5 files and 40 tests.
- Local desktop/mobile screenshot pass rendered `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`, and `/pricing` with HTTP 200 after rerunning the screenshot helper with `MSYS_NO_PATHCONV=1` to avoid Git Bash path conversion. Evidence lives in `reports/launch-page-visual-qa/2026-07-05/*`.
- Metric continuation red/green: first targeted run failed because asset graduation still pinned the old six-metric order; after updating the expectation, targeted metric tests passed (6 files, 20 tests), prediction-engine typecheck passed, and full prediction-engine tests passed (87 files, 790 tests).
- `npx prettier --check ...` was attempted but blocked before execution by npm certificate verification while fetching Prettier; no install or dependency change was attempted.
- Rushing metric continuation passed targeted tests after splitting the metric birth-certificate registry: `metric-birth-certificate.test.ts`, `rush-environment-index.test.ts`, `expected-rush-yards.test.ts`, `rush-over-expected.test.ts`, and `metric-asset-graduation.test.ts` (5 files, 15 tests).
- Current rushing metric validation: prediction-engine typecheck passed; full prediction-engine tests passed (89 files, 794 tests); root typecheck passed; root lint passed; root guardrails passed; `git diff --check` passed.
- Current all-workspaces test wrapper hit the 300s tool ceiling and is not counted as a pass. Segmented fallback passed: apps/web in six chunks (531 files, 7056 tests), crypto (1 file, 13 tests), data-ingestion (16 files, 131 tests), ingestion-pipeline (6 files, 60 tests), prediction-engine (89 files, 794 tests), and types (1 file, 31 tests).

## Complete

- Media Revenue Studio docs/utilities/pages exist.
- Commercial and revenue docs/utilities exist.
- Proprietary metric Slice 1 plus asset/graduation/source/payload controls exist.
- Receiver Difficulty Index and Expected YAC exist as governed `SHADOW` metrics with birth certificates and directional tests.
- Partner-offer compliance guardrail exists and is wired into `npm run guardrails`.
- API payload-rights and OpenAPI security guardrails exist and are wired into `npm run guardrails`.
- Fence, source-rights/IP, API-auth, API-v1 pure seams, the route-level API shadow harness, API replay simulation, and the draft workflow harness exist with tests.
- Representative content/API review packet fixtures, first-month media queue fixtures, and first-month review queue exports exist with claim-safety reports.
- FABLE/AWS shadow architecture exists under `docs/fable/aws` and `infrastructure/aws`.
- Exact `docs/aws` and `infra/aws-shadow` compatibility indexes exist and point to canonical FABLE/AWS artifacts.
- No-bet governor integration tests now prove high edge cannot override missing data, stale market gravity, unclear source rights, calibration drift, or calibration debt.
- `computeGseActionScore` now caps action quality when probability claims are unearned and hard-passes DRIFTING/BLOCKED calibration.
- Launch-facing commercial pages now have source-level QA plus local desktop/mobile screenshot artifacts for the five media pages and pricing.
- YAC Creation, Rush Environment Index, Expected Rush Yards, and Rush Over Expected now exist as governed `SHADOW` metrics with birth certificates, package exports, directional tests, public drivers, source-policy passthrough, and explicit confidence/evidence separation.
- `metric-birth-certificate.ts` was split into a compact contract/lookup module plus `metric-birth-certificate-registry.ts` to keep the growing metric registry maintainable.
- Receiver/rusher residual rollups now exist as governed `SHADOW` / `INTERNAL` player-season summaries for `yac-creation-gse` and `rush-over-expected-gse`, with source-policy validation and evidence-confidence separation.
- Metric model/drift-card generators now exist as local evidence helpers. Model cards are draft-first by default, and generated cards do not promote lifecycle, exposure, licensing, validation, or source clearance.
- Metric source-policy generation now exists from registry-shaped fixtures aligned to `apps/web/lib/scraping/source-rights-registry.ts`; raw API exposure stays blocked for every generated source.
- New commercial/performance/raw-NGS/partner-offer/API-payload/OpenAPI/AWS-compatibility guardrails pass and are wired into root scripts.

## Partial

- B2B Evidence API has strong docs, rehearsal packets, pure `apps/web/lib/api-auth` / `apps/web/lib/api-v1` seams, payload/OpenAPI guardrails, a route-level shadow harness, and local idempotency replay simulation. Live `app/api/v1` routes are still intentionally deferred by boundary guard.
- Source-rights/IP adapters under `apps/web/lib/source-rights` and `apps/web/lib/ip` exist, but they are policy gates and not legal clearance.
- Fence plugin path family under `apps/web/lib/fences`, the draft workflow harness, local review packet serialization, markdown rendering, in-memory packet ledger, queue status filters, review summary counts, representative content/API packet fixtures, first-month media queue fixtures, and first-month review queue export exist as pure manual-review gates.
- AWS exact paths `docs/aws` and `infra/aws-shadow` are compatibility indexes only; canonical AWS ownership remains under `docs/fable/aws` and `infrastructure/aws`.
- Launch-page visual QA is local render evidence only. Production preview QA remains required before live push.
- Full proprietary metric backlog remains future work, with payload-filter integration, QB Burden Index, and Stale Line Risk Score next.

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

1. Add API response-envelope filtering that calls proprietary metric payload-rights before any field leaves the package.
2. Add local no-bet governor docs/examples for public-safe methodology copy without exposing protected weights.
3. Add owner-approved live-route promotion packet only after durable persistence, route exposure, and abuse-response gates are reviewed.
4. Add packet fixtures for partner/sponsor review surfaces once owner-approved partner copy exists.
5. Add durable local queue persistence simulation for media review packets without DB writes.
6. Add API replay promotion checks for conflict detection after a durable adapter exists.
7. Add public-safe AWS portfolio/case-study route only if launch copy stays claim-safe and local-only.
8. Run production preview visual QA before live push.
9. Continue metric backlog with QB Burden Index only after passing-event source policy and validation plan are explicit.
10. Add Stale Line Risk Score on top of Market Gravity only if stale-data behavior remains fail-closed.

## Next Prompt

Continue the Sunday frontier implementation with the next proprietary metric payload-filter slice:

1. Inspect the governed metric foundation under `packages/prediction-engine/src/metrics`.
2. Add API response-envelope filtering that calls proprietary metric payload-rights before any metric field leaves the package.
3. Reuse existing validation, metric asset, source-rights, generated source policies, payload-rights, evidence-card, and graduation controls.
4. Run targeted prediction-engine tests, prediction-engine typecheck, guardrails, and `git diff --check`.
