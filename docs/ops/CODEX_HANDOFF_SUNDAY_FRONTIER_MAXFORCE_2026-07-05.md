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
- `npx vitest run apps/web/__tests__/guardrails.test.ts`
- `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web`
- `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts`
- `npm run typecheck --workspace=@sports/web`
- `npm run typecheck --workspace=packages/prediction-engine`
- `npm run typecheck`
- `npm run lint`
- `npm run test --workspaces --if-present`
- `npm run guardrails`
- `git diff --check`

Broad test result:

- `npm run test --workspaces --if-present`: 631 test files and 8020 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types.

## Complete

- Media Revenue Studio docs/utilities/pages exist.
- Commercial and revenue docs/utilities exist.
- Proprietary metric Slice 1 plus asset/graduation/source/payload controls exist.
- Receiver Difficulty Index and Expected YAC exist as governed `SHADOW` metrics with birth certificates and directional tests.
- Partner-offer compliance guardrail exists and is wired into `npm run guardrails`.
- API payload-rights and OpenAPI security guardrails exist and are wired into `npm run guardrails`.
- Fence, source-rights/IP, API-auth, and API-v1 pure seams exist with tests.
- FABLE/AWS shadow architecture exists under `docs/fable/aws` and `infrastructure/aws`.
- New commercial/performance/raw-NGS/partner-offer/API-payload/OpenAPI guardrails pass and are wired into root scripts.

## Partial

- B2B Evidence API has strong docs, rehearsal packets, pure `apps/web/lib/api-auth` / `apps/web/lib/api-v1` seams, and payload/OpenAPI guardrails. Live `app/api/v1` routes are still intentionally deferred.
- Source-rights/IP adapters under `apps/web/lib/source-rights` and `apps/web/lib/ip` exist, but they are policy gates and not legal clearance.
- Fence plugin path family under `apps/web/lib/fences` exists as pure plugins, but workflow wiring remains manual/draft-only.
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

1. Add draft-only API v1 route handlers after auth, scope, rate-limit, envelope, usage, payload-rights, and abuse-response tests are green.
2. Wire `apps/web/lib/fences/*` into a draft-only workflow runtime harness and keep manual review as the final gate.
3. Add `docs/aws` and `infra/aws-shadow` compatibility indexes pointing to existing FABLE/AWS docs and fixtures.
4. Create a 30-day media content fixture and scanner-backed claim-safety report for first-month posts.
5. Build no-bet governor integration tests proving high EV cannot override missing data, stale markets, drift, or calibration debt.
6. Continue proprietary metric backlog with YAC Creation and Rush Environment Index.
7. Add model-card and drift-card generators that consume metric validation outputs.
8. Generate prediction-engine metric source policies from the web source-rights registry instead of maintaining mirrored policy tables by hand.
9. Add API abuse-response fixtures for malformed keys, replayed idempotency keys, overscoped consumers, and unsafe payload attempts.
10. Add route-level visual QA and accessibility checks for the five media pages plus pricing.

## Next Prompt

Continue the Sunday frontier implementation by building the draft-only API route harness:

1. Add route-level tests for API v1 auth, scope, rate-limit, request ID, response envelope, usage event, payload rights, and abuse responses.
2. Add only shadow/draft API v1 route handlers after those tests fail for the right reason.
3. Keep `api-v1-boundary`, `api-payload-rights-scan`, and `openapi-security-scan` green; do not expose live routes or persistence.
4. Record every route as shadow-only in the Sunday audit and API docs.
