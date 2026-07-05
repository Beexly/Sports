# Sunday Frontier Maxforce Audit - 2026-07-05

Repository: `C:/Users/Garrett/Sports`

Branch: `codex/sunday-frontier-maxforce-2026-07-05`

Starting SHA: `6f193b5dc09541c2490a1b2212eccda8ca7894ba`

Audit mode: autonomous local implementation, no live services, no paid resources, no secrets, no auto-publish.

## Starting State

Current branch was created from `codex/api-v1-disposable-rehearsal-packet`.

Starting dirty status contained only pre-existing scratch files, intentionally left untouched:

- `dashfiles.json`
- `scratch_audit_err.txt`
- `scratch_audit_full.json`
- `scratch_audit_prod.json`

No application code, docs, package scripts, or guardrails were dirty before this slice.

## Files Inspected

- `package.json`
- `README.md`
- `CLAUDE.md`
- `AGENT_HANDOFF.md`
- `docs/media/*`
- `docs/commercial/*`
- `docs/revenue/*`
- `docs/api/*`
- `docs/fable/aws/*`
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/media-kit/page.tsx`
- `apps/web/app/partners/page.tsx`
- `apps/web/app/newsletter/page.tsx`
- `apps/web/app/content-lab/page.tsx`
- `apps/web/app/podcast/page.tsx`
- `apps/web/lib/media-revenue/*`
- `apps/web/lib/revenue/*`
- `apps/web/lib/workflows/*`
- `apps/web/lib/fences/*`
- `apps/web/lib/source-rights/*`
- `apps/web/lib/ip/*`
- `apps/web/lib/api-auth/*`
- `apps/web/lib/api-v1/*`
- `apps/web/lib/ingestion/next-gen-stats.ts`
- `apps/web/__tests__/guardrails.test.ts`
- `apps/web/__tests__/media-revenue-claim-safety.test.ts`
- `apps/web/__tests__/sponsor-copy-scan.test.ts`
- `apps/web/__tests__/next-gen-stats.test.ts`
- `packages/prediction-engine/src/metrics/**/*`
- `scripts/guardrails/*`
- `scripts/guardrails/fixtures/*`

## Reality Map

| Area | Status | Current repo truth |
| --- | --- | --- |
| A. Repo hygiene | PARTIAL | Scratch files remain untracked and untouched. No generated cleanup was attempted in this slice. |
| B. Media Revenue Studio | COMPLETE | Docs, typed media utilities, five public-safe pages, and tests already exist. This slice added stronger guardrails around launch-facing commercial copy. |
| C. Partnership/Affiliate/Sponsorship layer | COMPLETE FOR PURE SEAM | `docs/commercial`, `docs/revenue`, and `apps/web/lib/revenue` exist with approval, disclosure, responsible-gaming, copy, scoring, pipeline, and audit primitives. No live affiliate links were added. |
| D. Public commercial pages | COMPLETE | `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`, and `/pricing` exist. Pricing copy was tightened to avoid unsupported proof language. |
| E. B2B Evidence API | PARTIAL WITH ROUTE-LEVEL SHADOW HARNESS | Strong docs and disposable rehearsal packets exist under `docs/api`. This continuation added pure `apps/web/lib/api-auth/*` and `apps/web/lib/api-v1/*` compatibility seams for keys, hashing, scopes, quotas, rate-limit re-exports, webhook signatures, idempotency, response envelopes, payload filtering, OpenAPI access, and a route-level shadow harness. Live `app/api/v1` routes remain intentionally deferred by the API v1 boundary guard. |
| F. Source rights / NGS / IP | PARTIAL WITH ADAPTERS | Existing source-rights and NGS ingestion surfaces exist, plus metric source/payload rights in prediction-engine. This continuation added `apps/web/lib/source-rights/*` adapters that reuse the canonical scraping registry and `apps/web/lib/ip/*` envelope, payload-rights, model-card, drift-card, metric-card, and licensing-readiness helpers. |
| G. Proprietary metric/math layer | COMPLETE FOR CURRENT SLICES | Metric birth certificates, metric assets, graduation controls, DRI, MGI, xCOMP-GSE, GSS, Receiver Difficulty Index, Expected YAC, source-rights, payload-rights, and tests exist. Full metric backlog remains future work. |
| H. Market intelligence / no-bet / GSE Signal Score | PARTIAL | GSS and market gravity exist. Full no-bet governor and market intelligence product wiring remain future work. |
| I. AWS shadow architecture / cloud R&D | COMPLETE UNDER FABLE PATHS, PARTIAL UNDER EXACT PATHS | Extensive no-cost AWS docs and fixtures exist under `docs/fable/aws` and `infrastructure/aws`. Exact `docs/aws` and `infra/aws-shadow` path families are not present. |
| J. Fence/workflow plugin system | PARTIAL WITH PURE FENCES | `apps/web/lib/workflows` exists. This continuation added pure `apps/web/lib/fences/*` plugins for commercial copy, affiliate disclosure, responsible gaming, source rights, API payload rights, and raw tracking-data export language. Workflow wiring remains manual/draft-only. |
| K. Guardrails | IMPROVED THIS SESSION | Added and wired commercial-copy, unsupported-performance-claim, raw-NGS-export, partner-offer-compliance, API-payload-rights, and OpenAPI-security scanners. Existing trust/model/draft/Claude/API/secret/eval guards preserved. |
| L. Tests | IMPROVED THIS SESSION | Extended `apps/web/__tests__/guardrails.test.ts` and added `apps/web/__tests__/fences-and-adapters.test.ts`; added receiving metric tests in prediction-engine. |
| M. Handoffs | IMPROVED THIS SESSION | Added this audit plus Sunday handoff and R&D map. Existing stale handoff remains historical, not current. |

## Session Patches

Guardrails added:

- `scripts/guardrails/commercial-copy-scan.mjs`
- `scripts/guardrails/no-unsupported-performance-claims.mjs`
- `scripts/guardrails/no-raw-ngs-export.mjs`
- `scripts/guardrails/partner-offer-compliance-scan.mjs`
- `scripts/guardrails/fixtures/partner-offer-compliance.json`
- `scripts/guardrails/api-payload-rights-scan.mjs`
- `scripts/guardrails/openapi-security-scan.mjs`
- `scripts/guardrails/fixtures/api-payload-rights.json`
- `scripts/guardrails/fixtures/openapi-security.json`

Guardrail wiring:

- `package.json`
  - added `guard:commercial-copy`
  - added `guard:performance-claims`
  - added `guard:no-raw-ngs`
  - added `guard:partner-offers`
  - added `guard:api-payload-rights`
  - added `guard:openapi-security`
  - added all six frontier checks to the composite `guardrails` chain

Tests updated:

- `apps/web/__tests__/guardrails.test.ts`
  - executes all six new guardrail scripts
  - asserts root package scripts include the new checks
- `apps/web/__tests__/fences-and-adapters.test.ts`
  - proves fence plugins, source-rights/IP adapters, API-auth helpers, and API-v1 payload filtering fail closed where required
- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
  - proves Receiver Difficulty increases for harder, deeper, tighter, more contested targets
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
  - proves Expected YAC rises with space and falls with leverage/depth constraints

Public copy tightened:

- `apps/web/app/pricing/page.tsx`
  - replaced unsupported launch-facing "verified record" language with "public record" and "calibration status"
  - replaced public "CLV Ledger" sales copy with "line-value tracker"
  - removed "proves your own edge" from the Elite plan description

Docs added:

- `docs/ops/SUNDAY_FRONTIER_MAXFORCE_AUDIT_2026-07-05.md`
- `docs/research/SUNDAY_FRONTIER_R_AND_D_MAP_2026-07-05.md`
- `docs/ops/CODEX_HANDOFF_SUNDAY_FRONTIER_MAXFORCE_2026-07-05.md`

Pure app seams added in the continuation:

- `apps/web/lib/fences/*`
- `apps/web/lib/source-rights/*`
- `apps/web/lib/ip/*`
- `apps/web/lib/api-auth/*`
- `apps/web/lib/api-v1/*`

Route-level API shadow harness added in the continuation:

- `apps/web/lib/api/v1/shadow-route-harness.ts`
  - composes auth, consumer registry resolution, scope/origin checks, rate/quota, request ID, response envelope, usage audit event, payload rights, and abuse responses
  - keeps `routeExposed: false`
  - records denials without quota debit
  - blocks malformed request IDs, malformed idempotency keys, method abuse, missing auth, missing scope, exhausted quota, and unsafe payload rights
- `apps/web/__tests__/api-v1-shadow-route-harness.test.ts`
  - proves allow and deny behavior before any live route implementation
- `docs/api/API_V1_SHADOW_ROUTE_HARNESS.md`
  - records the harness contract and the live-route boundary

Metric slice added in the continuation:

- `packages/prediction-engine/src/metrics/receiving/receiver-difficulty.ts`
- `packages/prediction-engine/src/metrics/receiving/expected-yac.ts`
- birth certificates, asset graduation coverage, package exports, and tests for both metrics

## Verification Log

Completed so far:

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/guardrails/commercial-copy-scan.mjs` | PASS | scanned 32 launch/commercial files |
| `node scripts/guardrails/no-unsupported-performance-claims.mjs` | PASS | scanned 32 launch/commercial files |
| `node scripts/guardrails/no-raw-ngs-export.mjs` | PASS | scanned 1207 files |
| `node scripts/guardrails/partner-offer-compliance-scan.mjs` | PASS | 8 fixture cases passed; high-risk offers fail closed |
| `node scripts/guardrails/api-payload-rights-scan.mjs` | PASS | 8 fixture cases passed; unsafe API fields fail closed |
| `node scripts/guardrails/openapi-security-scan.mjs` | PASS | 3 contract files passed shadow OpenAPI security checks |
| `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-boundary-guard.test.ts` | PASS | 5 files, 40 tests; API v1 route harness, seam, registry, persistence, and boundary guard all passed together |
| `npm run guard:commercial-copy` | PASS | npm entry point works |
| `npm run guard:performance-claims` | PASS | npm entry point works |
| `npm run guard:no-raw-ngs` | PASS | npm entry point works |
| `npx vitest run apps/web/__tests__/guardrails.test.ts` | PASS | 15 tests passed across current file and mirrored worktree file discovered by Vitest |
| `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web` | PASS | 2 files, 21 tests |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts` | PASS | 4 files, 11 tests |
| `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts` | PASS | 1 file, 6 tests; proves route-level shadow auth/scope/rate/envelope/usage/payload/abuse behavior |
| `npm run typecheck --workspace=@sports/web` | PASS | app TypeScript checked after fence/API adapter and route-harness additions |
| `npm run typecheck --workspace=packages/prediction-engine` | PASS | prediction-engine TypeScript checked after receiving metric additions |
| `npm run guardrails` | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, three new guards, and eval contracts |
| `npm run typecheck` | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` | PASS | `@sports/web` ESLint completed with max warnings 0 |
| `npm run test --workspaces --if-present` | PASS | 632 test files and 8028 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types |
| `git diff --check` | PASS | no whitespace errors |

PowerShell syntax caveat:

- `npm run guard:commercial-copy && npm run guard:performance-claims && npm run guard:no-raw-ngs` failed before execution because this shell version rejected `&&`.
- The same npm scripts were rerun separately and passed.

Final broad validation completed in this slice.

## Remaining Risks

- The new commercial/performance scanners intentionally focus on launch and monetization surfaces. They do not scan every internal calibration, academy, admin, cockpit, or performance file because those surfaces legitimately discuss CLV, ROI, calibration, and verified receipts in policy/proof contexts.
- API auth, API v1 pure seams, API payload/OpenAPI guardrails, and a route-level shadow harness now exist. Live `app/api/v1` routes remain intentionally deferred until the owner approves route exposure plus durable persistence.
- Source-rights/IP adapter paths now exist and reuse the canonical scraping registry. They are code-level policy gates, not legal clearance.
- Fence plugin files now exist as pure plugins. Workflow wiring remains manual/draft-only until content/API workflow tests are added.
- Exact `docs/aws` and `infra/aws-shadow` paths remain missing, but equivalent AWS/FABLE artifacts exist elsewhere. Add compatibility indexes only if path visibility matters.
- Startup funding and cloud credit program terms were not live-refreshed in this slice. Verify official pages before any application.

## Next Highest-Leverage Tasks

1. Wire fence plugins into draft-only content/API workflow harnesses with manual-review gates.
2. Add replay/idempotency storage simulation to the API v1 route harness without exposing live routes.
3. Add `docs/aws` and `infra/aws-shadow` compatibility indexes to point to the existing FABLE/AWS work.
4. Build no-bet governor integration tests proving high EV cannot override missing data, stale markets, drift, or calibration debt.
5. Add media content queue fixtures for the first 30 days and a claim-safety batch scanner for generated titles/scripts.
6. Create a route-level visual QA pass for the five media pages plus pricing after copy changes.
7. Continue the metric backlog with YAC Creation and Rush Environment Index on the governed foundation.
8. Add model-card and drift-card generators for every promoted metric.
9. Add source-policy generation from the web registry into prediction-engine metric fixtures.
10. Add owner-approved live-route promotion packet only after durable persistence, route exposure, and abuse-response gates are reviewed.

## Safety Statement

- No secrets added.
- No dependencies changed.
- No package install was run.
- No live AWS, cloud, database, email, affiliate, sponsor, betting, or publishing action was taken.
- No production gates were flipped.
- No raw NGS export was added.
- No fake traffic, users, sponsors, revenue, win rate, ROI, calibration status, or partnership claims were added.
