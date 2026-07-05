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
- draft fence workflow harness for content/API drafts with source-rights, commercial-copy, disclosure, responsible-gaming, API payload-rights, restricted-tracking-data, manual-review gates, local review packet serialization, markdown rendering, an in-memory packet ledger, queue filters, and summary counts
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
- `apps/web/lib/workflows/draft-fence-workflow.ts`
- `apps/web/__tests__/draft-fence-workflow.test.ts`
- `packages/prediction-engine/src/metrics/receiving/*`
- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate.ts`
- `packages/prediction-engine/src/metrics/core/index.ts`
- `packages/prediction-engine/src/index.ts`

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
- `docs/api/API_V1_SHADOW_SEAM.md`
- `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`

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
- `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-boundary-guard.test.ts`
- `npm run test --workspace=apps/web -- draft-fence-workflow.test.ts fences-and-adapters.test.ts`
- `npx vitest run apps/web/__tests__/guardrails.test.ts`
- `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web`
- `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts`
- `npm run typecheck --workspace=@sports/web`
- `npm run typecheck --workspace=packages/prediction-engine`
- `npm run typecheck`
- `npm run lint`
- `npm run test --workspaces --if-present`
- `npm run guardrails`
- `git diff --check`

Broad test result:

- `npm run test --workspaces --if-present`: 632 test files and 8028 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types.

## Complete

- Media Revenue Studio docs/utilities/pages exist.
- Commercial and revenue docs/utilities exist.
- Proprietary metric Slice 1 plus asset/graduation/source/payload controls exist.
- Receiver Difficulty Index and Expected YAC exist as governed `SHADOW` metrics with birth certificates and directional tests.
- Partner-offer compliance guardrail exists and is wired into `npm run guardrails`.
- API payload-rights and OpenAPI security guardrails exist and are wired into `npm run guardrails`.
- Fence, source-rights/IP, API-auth, API-v1 pure seams, the route-level API shadow harness, and the draft workflow harness exist with tests.
- FABLE/AWS shadow architecture exists under `docs/fable/aws` and `infrastructure/aws`.
- New commercial/performance/raw-NGS/partner-offer/API-payload/OpenAPI guardrails pass and are wired into root scripts.

## Partial

- B2B Evidence API has strong docs, rehearsal packets, pure `apps/web/lib/api-auth` / `apps/web/lib/api-v1` seams, payload/OpenAPI guardrails, and a route-level shadow harness. Live `app/api/v1` routes are still intentionally deferred by boundary guard.
- Source-rights/IP adapters under `apps/web/lib/source-rights` and `apps/web/lib/ip` exist, but they are policy gates and not legal clearance.
- Fence plugin path family under `apps/web/lib/fences`, the draft workflow harness, local review packet serialization, markdown rendering, in-memory packet ledger, queue status filters, and review summary counts exist as pure manual-review gates. Representative content/API packet fixtures remain future work.
- AWS exact paths `docs/aws` and `infra/aws-shadow` are not present, even though equivalent FABLE/AWS artifacts exist.
- Full proprietary metric backlog remains future work.

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

1. Add representative content/API packet fixtures and a claim-safety batch report over those fixtures.
2. Add replay/idempotency storage simulation to the API v1 route harness without exposing live routes.
3. Add `docs/aws` and `infra/aws-shadow` compatibility indexes pointing to existing FABLE/AWS docs and fixtures.
4. Create a 30-day media content fixture and scanner-backed claim-safety report for first-month posts.
5. Build no-bet governor integration tests proving high EV cannot override missing data, stale markets, drift, or calibration debt.
6. Continue proprietary metric backlog with YAC Creation and Rush Environment Index.
7. Add model-card and drift-card generators that consume metric validation outputs.
8. Generate prediction-engine metric source policies from the web source-rights registry instead of maintaining mirrored policy tables by hand.
9. Add owner-approved live-route promotion packet only after durable persistence, route exposure, and abuse-response gates are reviewed.
10. Add route-level visual QA and accessibility checks for the five media pages plus pricing.

## Next Prompt

Continue the Sunday frontier implementation by adding local review packet fixtures:

1. Add representative content and API packet fixtures.
2. Add a claim-safety batch report over those fixtures.
3. Add tests proving fixture packets remain local and cannot publish, send, or expose routes.
4. Do not publish content, expose API routes, create partner links, or flip any production gates.
