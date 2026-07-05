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
- `apps/web/lib/ingestion/next-gen-stats.ts`
- `apps/web/__tests__/guardrails.test.ts`
- `apps/web/__tests__/media-revenue-claim-safety.test.ts`
- `apps/web/__tests__/sponsor-copy-scan.test.ts`
- `apps/web/__tests__/next-gen-stats.test.ts`
- `packages/prediction-engine/src/metrics/**/*`
- `scripts/guardrails/*`

## Reality Map

| Area | Status | Current repo truth |
| --- | --- | --- |
| A. Repo hygiene | PARTIAL | Scratch files remain untracked and untouched. No generated cleanup was attempted in this slice. |
| B. Media Revenue Studio | COMPLETE | Docs, typed media utilities, five public-safe pages, and tests already exist. This slice added stronger guardrails around launch-facing commercial copy. |
| C. Partnership/Affiliate/Sponsorship layer | COMPLETE FOR PURE SEAM | `docs/commercial`, `docs/revenue`, and `apps/web/lib/revenue` exist with approval, disclosure, responsible-gaming, copy, scoring, pipeline, and audit primitives. No live affiliate links were added. |
| D. Public commercial pages | COMPLETE | `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`, and `/pricing` exist. Pricing copy was tightened to avoid unsupported proof language. |
| E. B2B Evidence API | PARTIAL | Strong docs and disposable rehearsal packets exist under `docs/api`. Exact `apps/web/lib/api-auth`, `apps/web/lib/api-v1`, and live `app/api/v1` routes are not present in this checkout and remain a shadow/API slice. |
| F. Source rights / NGS / IP | PARTIAL | Existing source-rights and NGS ingestion surfaces exist, plus metric source/payload rights in prediction-engine. Exact `apps/web/lib/source-rights` and `apps/web/lib/ip` adapters are still missing. |
| G. Proprietary metric/math layer | COMPLETE FOR CURRENT SLICES | Metric birth certificates, metric assets, graduation controls, DRI, MGI, xCOMP-GSE, GSS, source-rights, payload-rights, and tests exist. Full metric backlog remains future work. |
| H. Market intelligence / no-bet / GSE Signal Score | PARTIAL | GSS and market gravity exist. Full no-bet governor and market intelligence product wiring remain future work. |
| I. AWS shadow architecture / cloud R&D | COMPLETE UNDER FABLE PATHS, PARTIAL UNDER EXACT PATHS | Extensive no-cost AWS docs and fixtures exist under `docs/fable/aws` and `infrastructure/aws`. Exact `docs/aws` and `infra/aws-shadow` path families are not present. |
| J. Fence/workflow plugin system | PARTIAL | `apps/web/lib/workflows` exists. Exact `apps/web/lib/fences/*` plugin files are not present. |
| K. Guardrails | IMPROVED THIS SESSION | Added and wired commercial-copy, unsupported-performance-claim, and raw-NGS-export scanners. Existing trust/model/draft/Claude/API/secret/eval guards preserved. |
| L. Tests | IMPROVED THIS SESSION | Extended `apps/web/__tests__/guardrails.test.ts` to execute and assert the new guardrails and package script wiring. |
| M. Handoffs | IMPROVED THIS SESSION | Added this audit plus Sunday handoff and R&D map. Existing stale handoff remains historical, not current. |

## Session Patches

Guardrails added:

- `scripts/guardrails/commercial-copy-scan.mjs`
- `scripts/guardrails/no-unsupported-performance-claims.mjs`
- `scripts/guardrails/no-raw-ngs-export.mjs`

Guardrail wiring:

- `package.json`
  - added `guard:commercial-copy`
  - added `guard:performance-claims`
  - added `guard:no-raw-ngs`
  - added all three checks to the composite `guardrails` chain

Tests updated:

- `apps/web/__tests__/guardrails.test.ts`
  - executes all three new guardrail scripts
  - asserts root package scripts include the new checks

Public copy tightened:

- `apps/web/app/pricing/page.tsx`
  - replaced unsupported launch-facing "verified record" language with "public record" and "calibration status"
  - replaced public "CLV Ledger" sales copy with "line-value tracker"
  - removed "proves your own edge" from the Elite plan description

Docs added:

- `docs/ops/SUNDAY_FRONTIER_MAXFORCE_AUDIT_2026-07-05.md`
- `docs/research/SUNDAY_FRONTIER_R_AND_D_MAP_2026-07-05.md`
- `docs/ops/CODEX_HANDOFF_SUNDAY_FRONTIER_MAXFORCE_2026-07-05.md`

## Verification Log

Completed so far:

| Command | Result | Notes |
| --- | --- | --- |
| `node scripts/guardrails/commercial-copy-scan.mjs` | PASS | scanned 32 launch/commercial files |
| `node scripts/guardrails/no-unsupported-performance-claims.mjs` | PASS | scanned 32 launch/commercial files |
| `node scripts/guardrails/no-raw-ngs-export.mjs` | PASS | scanned 1166 files |
| `npm run guard:commercial-copy` | PASS | npm entry point works |
| `npm run guard:performance-claims` | PASS | npm entry point works |
| `npm run guard:no-raw-ngs` | PASS | npm entry point works |
| `npx vitest run apps/web/__tests__/guardrails.test.ts` | PASS | 15 tests passed across current file and mirrored worktree file discovered by Vitest |
| `npm run guardrails` | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, three new guards, and eval contracts |
| `npm run typecheck` | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` | PASS | `@sports/web` ESLint completed with max warnings 0 |
| `npm run test --workspaces --if-present` | PASS | 628 test files and 7922 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types |
| `git diff --check` | PASS | no whitespace errors |

PowerShell syntax caveat:

- `npm run guard:commercial-copy && npm run guard:performance-claims && npm run guard:no-raw-ngs` failed before execution because this shell version rejected `&&`.
- The same npm scripts were rerun separately and passed.

Final broad validation completed in this slice.

## Remaining Risks

- The new commercial/performance scanners intentionally focus on launch and monetization surfaces. They do not scan every internal calibration, academy, admin, cockpit, or performance file because those surfaces legitimately discuss CLV, ROI, calibration, and verified receipts in policy/proof contexts.
- Exact API auth and API v1 libraries remain missing. Do not expose `app/api/v1` routes until pure auth, rights, envelope, usage, and rate-limit tests exist.
- Exact source-rights adapter paths remain missing. Current rights logic should be reused through adapters rather than forked.
- Exact fence plugin files remain missing. Build them as pure plugins with tests before wiring workflows.
- Exact `docs/aws` and `infra/aws-shadow` paths remain missing, but equivalent AWS/FABLE artifacts exist elsewhere. Add compatibility indexes only if path visibility matters.
- Startup funding and cloud credit program terms were not live-refreshed in this slice. Verify official pages before any application.

## Next Highest-Leverage Tasks

1. Add `partner-offer-compliance-scan.mjs` for high-risk offer metadata, disclosure, responsible-gaming text, age/state handling, expiry, and approval separation.
2. Add `api-payload-rights-scan.mjs` and `openapi-security-scan.mjs` after the API v1 pure seam lands.
3. Add `apps/web/lib/fences/*` as pure fence plugins and tests, reusing existing claim, revenue, and rights utilities.
4. Add source-rights adapter exports under `apps/web/lib/source-rights` and `apps/web/lib/ip` without duplicating the existing registry.
5. Build API auth/payload-rights pure seams under `apps/web/lib/api-auth` and `apps/web/lib/api-v1`; keep routes dormant until tests pass.
6. Add `docs/aws` and `infra/aws-shadow` compatibility indexes to point to the existing FABLE/AWS work.
7. Continue metric backlog with Receiver Difficulty and Expected YAC after preserving birth certificate, source-rights, payload-rights, and graduation controls.
8. Build no-bet governor integration tests proving high EV cannot override missing data, stale markets, drift, or calibration debt.
9. Add media content queue fixtures for the first 30 days and a claim-safety batch scanner for generated titles/scripts.
10. Create a route-level visual QA pass for the five media pages plus pricing after copy changes.

## Safety Statement

- No secrets added.
- No dependencies changed.
- No package install was run.
- No live AWS, cloud, database, email, affiliate, sponsor, betting, or publishing action was taken.
- No production gates were flipped.
- No raw NGS export was added.
- No fake traffic, users, sponsors, revenue, win rate, ROI, calibration status, or partnership claims were added.
