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
- npm scripts for all three guardrails
- composite `npm run guardrails` wiring for all three guardrails
- guardrail integration tests
- pricing page copy hardening around public record, calibration status, and line-value tracker language
- Sunday audit and R&D handoff docs

## Files Changed

Application and test files:

- `apps/web/app/pricing/page.tsx`
- `apps/web/__tests__/guardrails.test.ts`

Guardrails:

- `scripts/guardrails/commercial-copy-scan.mjs`
- `scripts/guardrails/no-unsupported-performance-claims.mjs`
- `scripts/guardrails/no-raw-ngs-export.mjs`

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
- `npm run guard:commercial-copy`
- `npm run guard:performance-claims`
- `npm run guard:no-raw-ngs`
- `npx vitest run apps/web/__tests__/guardrails.test.ts`
- `npm run typecheck`
- `npm run lint`
- `npm run test --workspaces --if-present`
- `npm run guardrails`
- `git diff --check`

Broad test result:

- `npm run test --workspaces --if-present`: 628 test files and 7922 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types.

## Complete

- Media Revenue Studio docs/utilities/pages exist.
- Commercial and revenue docs/utilities exist.
- Proprietary metric Slice 1 plus asset/graduation/source/payload controls exist.
- FABLE/AWS shadow architecture exists under `docs/fable/aws` and `infrastructure/aws`.
- New commercial/performance/raw-NGS guardrails pass and are wired into root scripts.

## Partial

- B2B Evidence API has strong docs and rehearsal packets, but exact `apps/web/lib/api-auth`, `apps/web/lib/api-v1`, and live `app/api/v1` routes are still not present.
- Source-rights/IP adapters under exact `apps/web/lib/source-rights` and `apps/web/lib/ip` paths are not present.
- Fence plugin path family under `apps/web/lib/fences` is not present.
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

1. Implement `scripts/guardrails/partner-offer-compliance-scan.mjs` and tests for high-risk offers.
2. Implement `scripts/guardrails/api-payload-rights-scan.mjs` after a minimal payload-rights fixture exists.
3. Implement `scripts/guardrails/openapi-security-scan.mjs` when API v1 OpenAPI contract exists.
4. Build `apps/web/lib/fences/*` pure plugins using existing claim, revenue, source-rights, and API payload utilities.
5. Build `apps/web/lib/source-rights/*` and `apps/web/lib/ip/*` adapters without duplicating existing rights logic.
6. Build `apps/web/lib/api-auth/*` pure auth/rate-limit/scope/hash/idempotency helpers with tests.
7. Build `apps/web/lib/api-v1/*` response-envelope, schemas, payload filter, and OpenAPI generator with tests.
8. Add `docs/aws` and `infra/aws-shadow` compatibility indexes pointing to existing FABLE/AWS docs and fixtures.
9. Continue proprietary metric backlog with Receiver Difficulty and Expected YAC.
10. Create a 30-day media content fixture and scanner-backed claim-safety report for first-month posts.

## Next Prompt

Continue the Sunday frontier implementation by building the partner-offer compliance scanner and fence plugin foundation:

1. Add `scripts/guardrails/partner-offer-compliance-scan.mjs`.
2. Add fixtures for approved, expired, missing-disclosure, missing-terms, unknown-state, and high-risk sportsbook/DFS offers.
3. Add `apps/web/lib/fences/fence-types.ts` and pure fences for commercial copy, affiliate disclosure, responsible gaming, source rights, and raw NGS.
4. Add tests proving fail-closed behavior.
5. Wire only passing checks into `npm run guardrails`.
