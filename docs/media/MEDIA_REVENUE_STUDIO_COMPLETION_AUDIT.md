# Media Revenue Studio Completion Audit

Audit date: 2026-07-04

Repository: `C:/Users/Garrett/Sports`

Branch: `codex/media-revenue-metric-api-closeout`

Starting branch: `codex/media-revenue-studio`

Starting implementation commit: `21eaad4c feat(web): add media revenue studio foundation`

Primary closeout rule: this audit improves repo-visible truth without creating live publishing, live AWS, live API customers, affiliate tracking, paid-service calls, dependency churn, or unsupported claims.

## Executive Result

The Media Revenue Studio slice is implemented and verified. The wider commercial intelligence system is partially present: FABLE/AWS and metric foundations exist under repo-native paths, while exact revenue/API/source-rights/fence path families requested in the continuation prompt are mostly not present and are marked below as deferred unless they already have equivalent repo surfaces.

This audit adds the missing closeout visibility layer and `.gitignore` hygiene rules. It does not create fake API/auth/AWS functionality to satisfy filenames.

## Requirement-by-requirement Status Key

- COMPLETE: actual repo files exist and verification passed.
- PARTIAL: repo-visible equivalent work exists, but exact requested path family or full product scope is not complete.
- NOT PRESENT: requested files are absent and no equivalent surface was found.
- INTENTIONALLY DEFERRED: adding the surface now would create false readiness, duplicate existing logic, require owner product decisions, or imply live infrastructure.

## Safety Statement

- No app prediction logic was modified.
- No model math was modified.
- No dependencies were changed.
- No package files or lockfiles were changed.
- No secrets were added.
- No live AWS resources were touched.
- No auto-publish, auto-send, or auto-upload path was added.
- No real affiliate links, sponsor claims, audience numbers, revenue numbers, win rates, ROI claims, or calibration status claims were added.
- No restricted scraping path was added.

## Repo Hygiene

Status: COMPLETE

Actions:

- Audited `.gitignore`.
- Added missing local-runtime ignore rules for `.agent/logs/`, `scrapes/`, `tmp/`, and `.cache/`.
- Confirmed required generated-artifact ignore rules already existed for `node_modules/`, `.next/`, `out/`, `build/`, `dist/`, `.env*` with examples re-included, `coverage/`, `.vercel`, screenshots, `test-results/`, and `playwright-report/`.

Tracked generated artifact audit:

- `git ls-files node_modules .next out dist build coverage .vercel .cache tmp scrapes .agent/logs screenshots test-results playwright-report` returned no tracked generated artifacts.
- `git ls-files '*.log'` returned no tracked log files.

Untracked files intentionally left alone:

- `dashfiles.json`
- `scratch_audit_err.txt`
- `scratch_audit_full.json`
- `scratch_audit_prod.json`

## Media Revenue Studio

Status: COMPLETE

Repo-visible docs:

- `docs/media/GSE_MEDIA_REVENUE_OS.md`
- `docs/media/CONTENT_PILLAR_MAP.md`
- `docs/media/PLATFORM_PLAYBOOK.md`
- `docs/media/FOUNDER_MEDIA_STRATEGY.md`
- `docs/media/PARTNERSHIP_REVENUE_PLAYBOOK.md`
- `docs/media/SPONSORSHIP_RATE_CARD.md`
- `docs/media/CONTENT_COMPLIANCE_POLICY.md`
- `docs/media/FIRST_90_DAYS_MEDIA_PLAN.md`
- `docs/media/CODEX_MEDIA_REVENUE_STUDIO_AUDIT.md`
- `docs/media/MEDIA_REVENUE_STUDIO_COMPLETION_AUDIT.md`

Repo-visible typed utilities:

- `apps/web/lib/media-revenue/content-pillars.ts`
- `apps/web/lib/media-revenue/content-idea-score.ts`
- `apps/web/lib/media-revenue/platform-strategy.ts`
- `apps/web/lib/media-revenue/seo-pack.ts`
- `apps/web/lib/media-revenue/script-templates.ts`
- `apps/web/lib/media-revenue/repurposing-plan.ts`
- `apps/web/lib/media-revenue/claim-safety.ts`
- `apps/web/lib/media-revenue/creator-identity.ts`
- `apps/web/lib/media-revenue/partner-fit.ts`
- `apps/web/lib/media-revenue/sponsorship-packages.ts`
- `apps/web/lib/media-revenue/media-calendar.ts`
- `apps/web/lib/media-revenue/content-kpi.ts`

Public-safe routes:

- `/media-kit`
- `/partners`
- `/newsletter`
- `/content-lab`
- `/podcast`

Observed route smoke:

- Prior local smoke against `http://127.0.0.1:3002` returned HTTP 200 for all five new routes.

Prompt conflict resolved:

- The prompt requested a media-kit hero using a banned betting slang term. The public page uses "not tout culture" instead, because the repo trust gate bans the original term in app/lib public surfaces and the prompt also requires existing trust gates to remain intact.

## Commercial And Revenue Layer

Status: PARTIAL

Complete/equivalent work:

- Media revenue docs cover sponsor packages, partner outreach, compliance, founding rate card, disclosure boundaries, and no fake audience/ROI claims.
- `apps/web/lib/media-revenue/partner-fit.ts` and `sponsorship-packages.ts` provide first-slice partner fit and sponsor package primitives.

Not present under exact requested paths:

- `docs/commercial/*`
- `docs/revenue/*`
- `apps/web/lib/revenue/*`

Reason deferred:

- Adding a second parallel revenue library during a closeout pass would duplicate the newly added `media-revenue` utilities and increase maintenance risk. The safe next slice is to extract shared commercial primitives from `media-revenue` into `apps/web/lib/revenue/` with dedicated tests, instead of creating thin duplicate modules now.

Required next implementation:

- `apps/web/lib/revenue/partner-types.ts`
- `apps/web/lib/revenue/offer-eligibility.ts`
- `apps/web/lib/revenue/partner-risk-engine.ts`
- `apps/web/lib/revenue/revenue-audit.ts`
- tests for partner approval versus offer approval, high-risk offer metadata, expired approvals, unknown-state fail-closed behavior, and no fake sponsor-copy claims.

## B2B Evidence API

Status: PARTIAL / INTENTIONALLY DEFERRED

Equivalent existing surface:

- `apps/web/lib/b2b/api-governance.ts` contains a pure governance seam for active keys, allow-listed domains, quota, and claim-safe payload checks.
- Existing docs include `docs/product/b2b-widgets-and-api-spec.md`.

Not present under exact requested paths:

- `docs/api/*`
- `apps/web/lib/api-auth/*`
- `apps/web/lib/api-v1/*`
- `apps/web/app/api/v1/*`
- `apps/web/app/developers/page.tsx`

Reason deferred:

- API v1 auth, hashing, usage metering, OpenAPI, route handlers, webhooks, and payload-rights filtering are a real product slice. Creating placeholder route handlers in a closeout pass would risk false readiness. The correct implementation must be designed as a deliberate shadow API slice with fail-closed tests before any public route is exposed.

Required next implementation:

- Pure API key parser/hash seam, scopes, plan/quota model, response envelope, payload-rights filter, OpenAPI generator, and 401/403/429 error semantics.
- Route handlers only after the pure seam tests pass.

## Source Rights / NGS / IP

Status: PARTIAL

Complete/equivalent work:

- `apps/web/lib/scraping/source-rights-registry.ts` exists and is already used as the current source-rights surface.
- `docs/ip/GSE_METRIC_IP_LEDGER.md` exists.
- Metric source-rights and payload-rights seams exist in `packages/prediction-engine/src/metrics/core/source-rights.ts` and `payload-rights.ts`.

Not present under exact requested paths:

- Most `docs/ip/*` templates from the continuation prompt.
- `apps/web/lib/source-rights/*`
- `apps/web/lib/ip/*`

Reason deferred:

- The repo has real source-rights logic in existing paths. A closeout pass should not fork that logic. The next slice should either migrate to the requested path with compatibility exports or add thin adapters that point to the existing registry and metric rights seams.

Hard boundary preserved:

- No raw NGS or proprietary benchmark data was exposed.
- No restricted source scraping path was added.
- Public language must remain "GSE-derived", "open-data-derived", and "validated against cleared benchmarks where available."

## Proprietary Metrics / Math

Status: COMPLETE FOR SLICE 1, PARTIAL FOR FULL BACKLOG

Complete:

- `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md`
- `docs/math/GSE_SCORE_ENGINE.md`
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate.ts`
- `packages/prediction-engine/src/metrics/core/driver.ts`
- `packages/prediction-engine/src/metrics/core/math.ts`
- `packages/prediction-engine/src/metrics/core/shrinkage.ts`
- `packages/prediction-engine/src/metrics/core/validation.ts`
- `packages/prediction-engine/src/metrics/core/metric-asset.ts`
- `packages/prediction-engine/src/metrics/core/metric-graduation.ts`
- `packages/prediction-engine/src/metrics/core/source-rights.ts`
- `packages/prediction-engine/src/metrics/core/payload-rights.ts`
- `packages/prediction-engine/src/metrics/source/data-reliability-index.ts`
- `packages/prediction-engine/src/metrics/market/market-gravity-index.ts`
- `packages/prediction-engine/src/metrics/passing/expected-completion.ts`
- `packages/prediction-engine/src/metrics/decision/gse-signal-score.ts`

Tests present:

- `metric-birth-certificate.test.ts`
- `data-reliability-index.test.ts`
- `market-gravity-index.test.ts`
- `expected-completion.test.ts`
- `gse-signal-score.test.ts`
- `metric-asset-graduation.test.ts`
- `metric-source-payload-rights.test.ts`

Deferred:

- Full metric backlog across team, receiving, rushing, role, environment, narrative, calibration, and decision families remains planned.
- `spline.ts` and `protected-transform.ts` are not present as separate core files; protected basis helpers exist in `math.ts`.

Doctrine preserved:

- Confidence is not win probability.
- Modeled probability and confidence are separate.
- GSE Signal Score is decision quality, not win probability.
- Metrics start SHADOW unless explicitly approved.
- Public users see drivers/bands, not protected coefficients or weights.

## AWS Shadow Architecture

Status: PARTIAL / EQUIVALENT PRESENT

Equivalent repo-visible work:

- Extensive AWS/FABLE work exists under `docs/fable/aws/`.
- Local/no-cost fixtures exist under `docs/fable/aws/fixtures/`, `docs/fable/aws/governance-os/`, `infrastructure/aws/amplify/`, and `infrastructure/aws/cdk/`.

Not present under exact requested paths:

- `docs/aws/*`
- `infra/aws-shadow/*`

Reason deferred:

- The existing AWS work is already repo-visible under `docs/fable/aws/` and `infrastructure/aws/`. Creating another parallel AWS tree during closeout would make ownership unclear. The next slice should add a path-compatibility index from `docs/aws/` and `infra/aws-shadow/` to the existing FABLE/AWS artifacts if the owner wants exact paths.

Hard boundary preserved:

- No live AWS calls.
- No AWS credentials.
- No deploy.
- No paid AWS resources.

## Fence / Workflow Plugin System

Status: PARTIAL

Complete/equivalent work:

- Existing workflow runtime modules live under `apps/web/lib/workflows/`.
- `apps/web/lib/workflows/workflow-runtime.ts` exists.

Not present:

- Most exact `apps/web/lib/fences/*` plugin files requested in the continuation prompt.

Reason deferred:

- Fences should be implemented as a deliberate pure-plugin slice with tests for content, API, model, partner, source, and infrastructure surfaces. Adding placeholders without wiring tests would be trust theater.

## Guardrails

Status: PARTIAL

Existing guardrails:

- `trust-gate.mjs`
- `model-freeze.mjs`
- `draft-only.mjs`
- `claude-api-usage.mjs`
- `secret-scan.mjs`
- `em-dash-scan.mjs`
- `eval-contracts.mjs`

Not present:

- `commercial-copy-scan.mjs`
- `no-raw-ngs-export.mjs`
- `ip-metric-source-rights.mjs`
- `api-payload-rights-scan.mjs`
- `no-unsupported-performance-claims.mjs`
- `partner-offer-compliance-scan.mjs`
- `openapi-security-scan.mjs`

Reason deferred:

- These should be introduced with fixtures and a non-blocking evaluation mode first, then promoted into the `guardrails` chain only after they pass on the existing repo. This audit did not weaken or alter the current guardrail chain.

## Tests And Verification

Focused media verification already passed after the audit patch:

- `npm.cmd run test --workspace=apps/web -- media-revenue-content-score.test.ts media-revenue-platform-strategy.test.ts media-revenue-claim-safety.test.ts media-kit-page.test.ts partners-page.test.ts media-revenue-studio-audit.test.ts`
- Result: passed, 6 files, 22 tests.

Broad verification already passed after the audit patch:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run guardrails`
- `npm.cmd run test --workspaces --if-present`

Expected reruns after this completion-audit file:

- focused closeout/media tests
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run guardrails`
- `git diff --check`

## Owner Decisions Still Required

- Whether to keep commercial primitives under `apps/web/lib/media-revenue/` or extract shared primitives into `apps/web/lib/revenue/`.
- Whether API v1 should be added as shadow-only docs/pure seams first or route handlers behind strict auth from the start.
- Whether exact `docs/aws/` and `infra/aws-shadow/` path compatibility is preferred over the current `docs/fable/aws/` and `infrastructure/aws/` layout.
- Whether source-rights modules should be migrated from `apps/web/lib/scraping/` to `apps/web/lib/source-rights/` or re-exported through adapters.

## Next Recommended Coding Prompt

Build the Commercial Revenue Core slice:

1. Add `apps/web/lib/revenue/*` as pure adapters extracted from `media-revenue`, not duplicated logic.
2. Add tests for partner approval versus offer approval, high-risk offer metadata, unknown-state fail-closed behavior, expired approvals, sponsor-copy claim safety, and responsible-gaming disclosure.
3. Add `docs/revenue/*` and `docs/commercial/*` as the operating docs for that exact library.
4. Keep all outputs draft-only, manual-review, and no-live-integration.

Then build the Evidence API v1 shadow seam as a separate branch.
