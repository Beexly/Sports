# Commercial Execution Ledger

Updated: 2026-07-04

| Work item | Status | Evidence | Next gate |
| --- | --- | --- | --- |
| Media Revenue Studio docs | complete | `docs/media/*` | owner review |
| Media public pages | complete with local source/render QA | `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`, `apps/web/__tests__/commercial-pages-launch-qa.test.ts`, `reports/launch-page-visual-qa/2026-07-05/*` | production preview QA before live push |
| Media revenue utilities | complete with first-month queue and review export fixtures | `apps/web/lib/media-revenue/*` | production preview QA before live push |
| Commercial revenue core | complete for pure seam | `apps/web/lib/revenue/*` | owner review and future route/UI decisions |
| Partner/offer live registry | not live | no DB schema or provider integration added | owner product decision |
| Affiliate links | not live | no real links added | owner/compliance approval |
| B2B Evidence API | shadow with route harness, replay simulation, and live-route promotion packet | existing B2B governance, closeout docs, API v1 shadow seam, route-level shadow harness, idempotency replay wrapper, and `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md` | owner route review remains blocked until durable persistence, route exposure, abuse-response, payload-envelope, OpenAPI/security, rate-limit, rollback, boundary, and raw-key evidence are reviewed |
| AWS live resources | not live; exact local indexes complete | `docs/aws/*`, `infra/aws-shadow/*`, no credentials or deploy actions | owner/AWS approval before any live AWS step |
| AWS public case-study route | complete with local source/render QA | `/case-studies/aws-governed-sports-intelligence`, `apps/web/lib/aws-case-study/public-case-study.ts`, `docs/aws/AWS_PUBLIC_CASE_STUDY_ROUTE.md`, `apps/web/__tests__/aws-case-study-page.test.ts`, `reports/launch-page-visual-qa/2026-07-06/*` | production preview QA only after owner review |
| Sunday frontier safety guardrails | complete for current slice | `commercial-copy-scan`, `no-unsupported-performance-claims`, `no-raw-ngs-export`, `partner-offer-compliance-scan`, `api-payload-rights-scan`, `openapi-security-scan`, pricing copy hardening | route-level API harness |
| Fence and policy seams | complete for pure seam, draft harness, local review packet, renderer, memory ledger, queue filters, and summary counts | `apps/web/lib/fences/*`, `apps/web/lib/source-rights/*`, `apps/web/lib/ip/*`, `apps/web/lib/api-auth/*`, `apps/web/lib/api-v1/*`, `apps/web/lib/api/v1/shadow-route-harness.ts`, `apps/web/lib/workflows/draft-fence-workflow.ts` | representative packet fixtures and claim-safety batch report |
| Review packet fixtures | complete for local content/API and partner/sponsor samples | `apps/web/lib/workflows/draft-review-fixtures.ts`, `apps/web/lib/workflows/partner-sponsor-review-fixtures.ts`, `apps/web/__tests__/draft-review-fixtures.test.ts`, `apps/web/__tests__/partner-sponsor-review-fixtures.test.ts` | local review queue persistence simulator |
| Local review queue persistence simulator | complete for memory-shadow persistence | `apps/web/lib/workflows/local-review-queue-persistence.ts`, `apps/web/__tests__/local-review-queue-persistence.test.ts`, `docs/ops/LOCAL_REVIEW_QUEUE_PERSISTENCE_SIMULATOR.md` | API abuse-response fixture report |
| API abuse-response and promotion-conflict fixtures | complete for local shadow report | `apps/web/lib/api/v1/abuse-response-fixtures.ts`, `apps/web/__tests__/api-v1-abuse-response-fixtures.test.ts`, `docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md` | owner-reviewed route design remains blocked; next safe work is public-safe AWS case-study route or Stale Line Risk Score |
| First-month media queue fixtures | complete for local draft queue and review export | `apps/web/lib/media-revenue/first-month-content-queue.ts`, `apps/web/lib/media-revenue/first-month-review-queue.ts`, `apps/web/__tests__/first-month-review-queue.test.ts`, `docs/media/FIRST_MONTH_CONTENT_QUEUE_FIXTURES.md`, `docs/media/FIRST_MONTH_REVIEW_QUEUE_EXPORT.md` | production preview QA before live push |
| API idempotency replay simulation | complete for local shadow harness | `apps/web/lib/api/v1/shadow-route-replay.ts`, `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`, `docs/api/API_V1_SHADOW_ROUTE_REPLAY.md` | owner-gated live-route promotion packet after durable persistence review |
| API live-route promotion packet | complete for non-executable owner-review seam | `apps/web/lib/api/v1/live-route-promotion-packet.ts`, `apps/web/__tests__/api-v1-live-route-promotion-packet.test.ts`, `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md` | owner-reviewed route design only; no route creation |
| AWS compatibility indexes | complete for exact local paths | `docs/aws/*`, `infra/aws-shadow/*`, `scripts/guardrails/aws-compatibility-index-scan.mjs`, `apps/web/__tests__/aws-compatibility-index.test.ts` | owner/AWS approval before any live AWS step |
| No-bet governor integration hardening | complete for shadow decision seam and public-safe methodology examples | `packages/prediction-engine/src/gse-score/gse-action-score.ts`, `packages/prediction-engine/src/gse-score/calibration-action-policy.ts`, `packages/prediction-engine/src/gse-score/__tests__/no-bet-governor-integration.test.ts`, `apps/web/lib/gse/no-bet-methodology.ts`, `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md` | owner-approved live-route promotion packet |
| Launch page visual/copy QA | complete for local source and screenshot evidence | `apps/web/__tests__/commercial-pages-launch-qa.test.ts`, `reports/launch-page-visual-qa/2026-07-05/*` | production preview QA before live push |
| Metric backlog YAC/Rush continuation | complete for four shadow primitives, residual rollups, evidence-card generators, generated source policies, and package-owned payload-envelope filtering | `yac-creation-gse`, `rush-environment-index`, `expected-rush-yards-gse`, `rush-over-expected-gse`, `buildMetricResidualRollups`, `generateMetricModelCard`, `generateMetricDriftCard`, generated source policies, `filterProprietaryMetricPayloadEnvelope`, tests, metric bible | owner-approved live-route promotion packet |

## Verification Contract

Every commercial slice must record:

- files changed
- tests run
- guardrails run
- claim-safety boundary
- any live integration intentionally not added

## 2026-07-05 Update

- Added and wired local guardrails for public commercial copy, unsupported performance claims, and raw NGS export language.
- Tightened `/pricing` copy to avoid unsupported public proof language.
- No affiliate links, sponsor claims, traffic claims, revenue claims, win-rate claims, ROI claims, or live partner integrations were added.
- Added and wired partner-offer compliance scanner with explicit sportsbook/DFS fail-closed handling.
- Added pure commercial/source/API fence seams and tests; no live route or partner exposure was added.
- Added API payload rights scanner and OpenAPI security scanner.
- Added route-level API shadow harness with auth, scope, rate-limit/quota, request ID, envelope, usage event, payload-rights, and abuse-response tests.
- No live API routes, durable persistence, env vars, secrets, affiliate links, partner exposure, or production API promotion were added.
- Added draft fence workflow harness for content/API manual-review workflows. Safe drafts can only reach manual review; blocked drafts require repair.
- Added local draft review packet serialization with owner checklist fields. Checklist approval does not publish, send, expose routes, or activate integrations.
- Added packet markdown rendering and an in-memory append-only packet ledger. Rendering omits protected payload values and ledger append does not approve live actions.
- Added local packet queue status filters and review summary counts. Summaries keep publish/send/route/live locks false.
- Added representative content/API review packet fixtures and claim-safety batch report. Fixtures remain local and do not expose protected payload values.
- No content publish, external send, affiliate activation, API route exposure, or production workflow automation was added.
- Added first-month media queue fixtures and claim-safety report: 90 local content drafts, 30 manual partner-outreach batches, 300 outreach targets, and all publish/send locks closed.
- Added first-month review-queue export for local content drafts. Exported packets keep full script bodies bounded out of markdown and keep all publish/send/route/live locks closed.
- Added API v1 idempotency replay simulation. Duplicate successful requests return the stored envelope without a second quota debit, and denied requests do not create reusable success records.
- Added AWS compatibility indexes for exact `docs/aws` and `infra/aws-shadow` visibility paths, with a guardrail proving local-only boundaries.
- Added no-bet governor integration hardening. Initial targeted test failed because high modeled edge still produced `PLAY` under calibration drift and calibration debt; policy cap now prevents PLAY/LEAN when probability claims are unearned and hard-passes DRIFTING/BLOCKED calibration.
- No pick publication, probability claim activation, model-version promotion, pricing, betting, schema, route exposure, live API, paid service, or production gate was flipped.
- Added local launch-page visual/copy QA. Six commercial routes passed source-level launch safety tests and rendered HTTP 200 in desktop/mobile Playwright screenshots under a local Next dev server.
- No production preview was opened, no live provider was wired, and no publish/send/affiliate/sponsor/API/AWS action was taken.
- Added YAC Creation and Rush Environment Index as governed shadow metrics on the proprietary metric foundation.
- Added Expected Rush Yards and Rush Over Expected as governed shadow metrics on top of Rush Environment Index and expected-residual doctrine.
- Split the metric birth-certificate registry out of the core contract module to keep the growing proprietary metric registry maintainable.
- Added receiver/rusher residual rollup helper for play-level residuals and player-season summaries. Rollups stay `SHADOW` / `INTERNAL`, fail source posture closed, and do not expose protected weights.
- Added metric evidence-card generators. Model cards remain draft-first by default; drift cards require explicit checks or rollup risk and do not promote metrics.
- Added metric source-policy generator from registry-shaped fixtures aligned to the canonical web source-rights registry. Raw API exposure remains blocked for every generated source.
- Added package-owned metric payload-envelope filtering plus an app API-v1 bridge. Metric-shaped API payload fields now delegate through proprietary metric payload-rights before exposure, while raw values and protected weights stay blocked.
- Added public-safe no-bet governor methodology examples and doc. Examples cover seven refusal/review states and are scanned through media claim safety, no-claim guard, and performance-claim guard.
- Added non-executable API v1 live-route promotion packet. It requires owner approval, durable persistence review, route exposure approval, abuse-response review, metric payload-envelope consumption, OpenAPI/security review, rate-limit policy review, rollback plan review, boundary exception review, and raw-key absence review while keeping live route creation and command execution disabled.
- Added partner/sponsor review fixtures for local commercial review. Fixtures prove low-risk disclosed copy reaches manual review, sponsor-control attempts block, regulated offers fail closed on unknown state, expired offers block, and unsafe ROI/proven language blocks. No affiliate links, outreach sends, sponsor approvals, live integrations, or sponsor control were added.
- Added local review queue persistence simulator. It ingests media, content/API, and partner/sponsor review packets; stores append-only memory-shadow events; rejects duplicates; detects stale packets, version conflicts, unresolved blockers, and live-action unlock attempts; and renders a local queue snapshot without DB writes.
- Added API abuse-response and promotion-conflict fixture report. It proves malformed key, conflicting key, overscope, quota, unsafe payload, and route-control denials without payload leaks or quota debits, and blocks live-route promotion evidence when replay conflicts, unresolved/stale review packets, or duplicate promotion request IDs exist.
- Added public-safe AWS case-study route. The first focused route test caught unsafe `live AWS` wording and an evidence-required `ROI` reference; after wording repair, route/launch QA tests passed, root validation passed, full all-workspaces tests passed (653 files, 8152 tests), and every live-action lock remained closed.
- Added local desktop/mobile visual QA for the AWS case-study route. The first screenshot attempt hit a compile-window connection reset; after local dev-server restart and HTTP 200 probe, desktop and mobile screenshots were captured and reviewed.
- Next overall gate: owner-reviewed API route design remains blocked; next safe local work is Stale Line Risk Score or QB Burden Index, then owner-reviewed production preview QA before any live push.
