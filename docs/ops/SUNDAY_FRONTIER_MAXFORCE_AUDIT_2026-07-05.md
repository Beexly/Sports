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
- `docs/aws/*`
- `infra/aws-shadow/*`
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
| G. Proprietary metric/math layer | COMPLETE FOR CURRENT SLICES | Metric birth certificates, metric assets, graduation controls, DRI, MGI, Stale Line Risk Score, xCOMP-GSE, QB Burden Index, Role Volatility Index, Playable Window Score, GSS, Receiver Difficulty Index, Expected YAC, YAC Creation, Rush Environment Index, Expected Rush Yards, Rush Over Expected, receiver/rusher residual rollups, model/drift-card generators, SLRS/QBI/RVI/PWS evidence-card fixture coverage, generated source policies, source-rights, payload-rights, package-owned payload-envelope filtering, and tests exist. Full metric backlog remains future work. |
| H. Market intelligence / no-bet / GSE Signal Score | COMPLETE FOR SHADOW GOVERNOR AND PUBLIC-SAFE EXAMPLES, PARTIAL FOR PRODUCT WIRING | GSS, market gravity, Stale Line Risk Score, Playable Window Score, DRI, action score, and no-bet strength exist. This slice added integration proof that high model interest cannot override missing evidence, stale market gravity, unclear source rights, calibration drift, or calibration debt. SLRS now separately hard-blocks stale market snapshots from market-signal use. PWS composes stale-line, source-rights, no-bet, drift, calibration, QBI, and RVI pressure into a `SHADOW` decision-window readiness gate without claiming playable edge. Public-safe no-bet methodology examples now exist under `apps/web/lib/gse/no-bet-methodology.ts` and `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md`. Full market intelligence product wiring remains future work. |
| I. AWS shadow architecture / cloud R&D | COMPLETE FOR LOCAL PATHS | Extensive no-cost AWS docs and fixtures exist under `docs/fable/aws` and `infrastructure/aws`. Exact `docs/aws` and `infra/aws-shadow` compatibility paths now point to canonical local artifacts and are guarded against live AWS language. |
| J. Fence/workflow plugin system | COMPLETE FOR PURE DRAFT HARNESS | `apps/web/lib/workflows` exists. This continuation added pure `apps/web/lib/fences/*` plugins plus `runDraftFenceWorkflow()` for content/API draft workflows. Manual review remains required and no publish/send/API exposure terminal state exists. |
| K. Guardrails | IMPROVED THIS SESSION | Added and wired commercial-copy, unsupported-performance-claim, raw-NGS-export, partner-offer-compliance, API-payload-rights, OpenAPI-security, and AWS-compatibility scanners. Existing trust/model/draft/Claude/API/secret/eval guards preserved. |
| L. Tests | IMPROVED THIS SESSION | Extended `apps/web/__tests__/guardrails.test.ts` and added `apps/web/__tests__/fences-and-adapters.test.ts` plus `apps/web/__tests__/aws-compatibility-index.test.ts`; added receiving/rushing metric and residual-rollup tests in prediction-engine. |
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
- `scripts/guardrails/aws-compatibility-index-scan.mjs`
- `scripts/guardrails/fixtures/aws-compatibility-index.json`

Guardrail wiring:

- `package.json`
  - added `guard:commercial-copy`
  - added `guard:performance-claims`
  - added `guard:no-raw-ngs`
  - added `guard:partner-offers`
  - added `guard:api-payload-rights`
  - added `guard:openapi-security`
  - added `guard:aws-compatibility-index`
  - added all seven frontier checks to the composite `guardrails` chain

Tests updated:

- `apps/web/__tests__/guardrails.test.ts`
  - executes all six new guardrail scripts
  - asserts root package scripts include the new checks
- `apps/web/__tests__/fences-and-adapters.test.ts`
  - proves fence plugins, source-rights/IP adapters, API-auth helpers, API-v1 payload filtering, and metric payload-envelope delegation fail closed where required
- `apps/web/__tests__/aws-compatibility-index.test.ts`
  - proves exact AWS compatibility paths stay local-only and point to existing canonical artifacts
- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
  - proves Receiver Difficulty increases for harder, deeper, tighter, more contested targets
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
  - proves Expected YAC rises with space and falls with leverage/depth constraints
- `packages/prediction-engine/src/metrics/__tests__/playable-window-score.test.ts`
  - proves stale/blocked market signals, blocked source posture, high no-bet pressure, drift, calibration debt, role volatility, and QB burden close or narrow the decision window without returning probability or protected weights
- `packages/prediction-engine/src/metrics/__tests__/metric-evidence-cards.test.ts`
  - proves SLRS, QBI, RVI, and PWS fixture-generated cards remain draft-first, preserve `SHADOW` lifecycle and API/licensing locks, carry caveats, and keep role-stability / decision-window splits in active drift review

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

API v1 idempotency replay simulation added in the continuation:

- `apps/web/lib/api/v1/shadow-route-replay.ts`
  - wraps the shadow route harness with a local in-memory replay store for successful idempotent responses
  - computes replay keys from method, endpoint path, hashed payload, parsed key id, and external idempotency key
  - stores no raw API keys or raw request payloads
  - keeps `routeExposed=false` and durable persistence disabled
- `apps/web/__tests__/api-v1-shadow-route-replay.test.ts`
  - proves duplicate successful requests return the same envelope without double-counting usage, denied requests create no success records, payload changes do not replay, and malformed idempotency keys create no replay record
- `docs/api/API_V1_SHADOW_ROUTE_REPLAY.md`
  - records the replay contract and boundaries

AWS compatibility indexes added in the continuation:

- `docs/aws/*`
  - provides exact-path AWS index, compatibility map, six-pillar GSE Well-Architected lens, and shadow boundary
  - points to canonical `docs/fable/aws` and `infrastructure/aws` artifacts without claiming live AWS
- `infra/aws-shadow/*`
  - provides local-only fixture aliases for Shadow Control Tower, Step Functions, EventBridge, SageMaker, Bedrock Guardrails, AgentCore, and Clean Rooms patterns
  - keeps `live_aws_action=false`, `deploy_allowed=false`, `credentials_required=false`, and `paid_resource_required=false`
- `scripts/guardrails/aws-compatibility-index-scan.mjs`
  - validates exact paths, canonical targets, required local-only fragments, fixture flags, and forbidden activation phrases

Draft workflow harness added in the continuation:

- `apps/web/lib/workflows/draft-fence-workflow.ts`
  - composes content fences: source rights, commercial copy, restricted tracking data, affiliate disclosure, and responsible gaming
  - composes API fences: source rights, API payload rights, and restricted tracking data
  - returns `BLOCKED` or `NEEDS_MANUAL_REVIEW`; it never returns publish/live success
  - hard-codes `publishAllowed`, `routeExposureAllowed`, `externalSendAllowed`, and `liveIntegrationAllowed` to `false`
  - serializes local review packets with checklist fields through `createDraftFenceReviewPacket()`
  - renders review packets to markdown through `renderDraftFenceReviewPacketMarkdown()`
  - stores packets in an append-only in-memory ledger through `createMemoryDraftFenceReviewPacketLedger()`
  - filters packets by `BLOCKED` / `NEEDS_MANUAL_REVIEW` and summarizes queue counts without granting live actions
- `apps/web/__tests__/draft-fence-workflow.test.ts`
  - proves blocked commercial claims, missing disclosures, responsible-gaming failures, unsafe API payloads, manual-review gating, non-automatic checklist serialization, protected-payload omission in markdown, append-only ledger behavior, and queue summary locks
- `docs/ops/DRAFT_FENCE_WORKFLOW_HARNESS.md`
  - records the draft-only workflow contract

Draft review fixtures added in the continuation:

- `apps/web/lib/workflows/draft-review-fixtures.ts`
  - defines representative content/API packet fixtures
  - builds local review packets and markdown from those fixtures
  - builds a claim-safety batch report over fixture text without exposing protected payload values
- `apps/web/__tests__/draft-review-fixtures.test.ts`
  - proves expected workflow statuses, closed live-action locks, protected payload omission, and claim-safety counts

First-month media queue fixtures added in the continuation:

- `apps/web/lib/media-revenue/first-month-content-seeds.ts`
  - preserves the first-week exact content titles from the media plan
  - defines four weekly content seeds and daily watch topics
- `apps/web/lib/media-revenue/first-month-content-queue.ts`
  - builds 90 local draft content items across daily watch posts, long videos, short clips, newsletters, founder build logs, and board meetings
  - builds 30 manual partner-outreach batches at 10 targets per day
  - builds a claim-safety batch report over generated titles, hooks, script beats, and CTAs
  - keeps `DRAFT_ONLY`, `manualReviewRequired`, `publishAllowed=false`, and `externalSendAllowed=false`
- `apps/web/__tests__/first-month-content-queue.test.ts`
  - proves first-week exact titles, 30-day coverage, weekly cadence minimums, 300 outreach targets, claim-safety pass, and closed live-action locks
- `docs/media/FIRST_MONTH_CONTENT_QUEUE_FIXTURES.md`
  - records the local-only fixture contract and boundaries

First-month review queue export added in the continuation:

- `apps/web/lib/media-revenue/first-month-review-queue.ts`
  - converts first-month queue items into local review packet summaries
  - attaches workflow status, content score, claim-safety result, script-beat count, cadence summary, blockers, warnings, fix hints, and live-action locks
  - renders bounded markdown without printing full script bodies
- `apps/web/__tests__/first-month-review-queue.test.ts`
  - proves 90 default review packets, closed live-action locks, bounded markdown, and blocked unsafe custom drafts
- `docs/media/FIRST_MONTH_REVIEW_QUEUE_EXPORT.md`
  - records the export contract and boundaries

Metric slice added in the continuation:

- `packages/prediction-engine/src/metrics/receiving/receiver-difficulty.ts`
- `packages/prediction-engine/src/metrics/receiving/expected-yac.ts`
- birth certificates, asset graduation coverage, package exports, and tests for both metrics

Stale Line Risk Score continuation added in the continuation:

- `packages/prediction-engine/src/metrics/market/stale-line-risk-score.ts`
  - adds a governed `SHADOW` market-risk metric for line freshness, source coverage, contradiction pressure, source-rights cleanliness, book dispersion, and movement audit pressure
  - hard-blocks stale market snapshots from market-signal use with `band: "BLOCK"` and `marketSignalAllowed: false`
  - returns public drivers only and keeps thresholds, component weights, and market-type dispersion scales protected
- `packages/prediction-engine/src/metrics/__tests__/stale-line-risk-score.test.ts`
  - proves fresh/well-sourced lines stay low risk
  - proves stale snapshots hard-block even when movement looks meaningful
  - proves low source count, source contradiction, and unclear/blocked rights increase risk
- metric birth certificate/export/test updates for `stale-line-risk-score`

QB Burden Index continuation added in the continuation:

- `packages/prediction-engine/src/metrics/passing/qb-burden-index.ts`
  - adds a governed `SHADOW` passing-context burden metric separate from the older compatibility `nfl/qb-burden.ts` export
  - keeps burden separate from quarterback quality, evidence confidence, win probability, and pick actionability
  - raises burden with pressure, depth, down-distance friction, weather/context penalty, line disruption, and source review pressure
  - returns public drivers only and keeps component weights, proxy transforms, and source-posture scaling protected
- `packages/prediction-engine/src/metrics/__tests__/qb-burden-index.test.ts`
  - proves easy clean contexts stay low burden
  - proves pressure, depth, late/down-distance friction, and weather increase burden
  - proves manual-review source posture raises uncertainty while blocked modeling posture fails high-uncertainty/blocked
  - proves confidence is evidence quality, not QB quality or win probability
- metric birth certificate/export/test updates for `qb-burden-index`

Role Volatility Index continuation added in the continuation:

- `packages/prediction-engine/src/metrics/role/role-volatility-index.ts`
  - adds a governed `SHADOW` role-instability metric over snap-share movement, target/carry/route opportunity movement, depth-chart shock, injury/return uncertainty, teammate role shock, sample size, usage freshness, and source-policy posture
  - keeps role volatility separate from player quality, win probability, model confidence, and pick actionability
  - hard-blocks stale usage evidence from role-signal use with `volatilityBand: "BLOCK"`, high uncertainty, and `roleSignalAllowed: false`
  - blocks role-signal use when source policies are not allowed for modeling, even if usage evidence is fresh
  - returns public drivers only and keeps weights, freshness thresholds, proxy transforms, and source-posture scaling protected
- `packages/prediction-engine/src/metrics/__tests__/role-volatility-index.test.ts`
  - proves stable fresh usage stays low volatility
  - proves snap, opportunity, depth-chart, injury/return, and teammate shocks increase volatility
  - proves stale usage fails closed
  - proves unclear/blocked source posture raises uncertainty and blocked posture disables role-signal use
  - proves confidence is evidence quality, not player quality or win probability
- metric birth certificate/export/test updates for `role-volatility-index`

Rushing metric continuation added in the continuation:

- `packages/prediction-engine/src/metrics/rushing/expected-rush-yards.ts`
  - derives expected rushing yards from Rush Environment Index, down-distance/field constraints, and shrunk rusher/defense priors
  - keeps confidence as evidence quality, not rush-outcome certainty
- `packages/prediction-engine/src/metrics/rushing/rush-over-expected.ts`
  - derives rushing yards over expectation from actual rush yards versus GSE expected rush yards
  - exposes public drivers for residual/prior/contact proxies without protected weights
- `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts`
  - splits the growing birth-certificate data registry out of the core contract/lookup module
- `packages/prediction-engine/src/metrics/__tests__/expected-rush-yards.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/rush-over-expected.test.ts`
- metric birth certificate/export/test updates for both metrics

Residual rollup continuation added in the continuation:

- `packages/prediction-engine/src/metrics/core/residual-rollup.ts`
  - rolls `yac-creation-gse` and `rush-over-expected-gse` play residuals into player-season summaries
  - rejects mixed metric/player/season direct rollups
  - keeps summaries `SHADOW` / `INTERNAL` and carries source-policy validation forward
  - fails source posture closed when any input source blocks modeling
  - keeps residual totals/per-play values separate from evidence confidence
- `packages/prediction-engine/src/metrics/__tests__/residual-rollup.test.ts`
- metric core and package export updates

Metric evidence-card continuation added in the continuation:

- `packages/prediction-engine/src/metrics/core/metric-evidence-cards.ts`
  - generates draft-first model cards from assets, validation reports, residual rollups, limitations, and evidence refs
  - generates drift cards from explicit drift checks and residual-rollup risk signals
  - leaves metric lifecycle, exposure, licensing, source-clearance, and production status unchanged
- `packages/prediction-engine/src/metrics/__tests__/metric-evidence-cards.test.ts`
- metric core and package export updates

Metric source-policy generation continuation added in the continuation:

- `packages/prediction-engine/src/metrics/core/source-rights-registry-adapter.ts`
  - maps registry-shaped source entries into metric source-rights policies
  - keeps raw API exposure blocked for every generated source
  - fail-closes non-approved paths for modeling, validation, storage, display, and derived/API use
- `packages/prediction-engine/src/metrics/core/source-rights-registry-fixtures.ts`
  - fixture snapshot of current canonical web registry source IDs and rights flags
- `packages/prediction-engine/src/metrics/__tests__/metric-source-payload-rights.test.ts`
  - verifies fixture source IDs match `apps/web/lib/scraping/source-rights-registry.ts`
  - verifies generated permissions stay conservative
- metric core and package export updates

Metric payload-envelope filtering continuation added in the continuation:

- `packages/prediction-engine/src/metrics/core/payload-envelope.ts`
  - calls proprietary metric payload-rights before constructing an API-facing metric payload
  - includes only approved fields in the payload map
  - carries blocked fields, violations, and required source attribution
  - defaults to generated metric source policies and API exposure
- `packages/prediction-engine/src/metrics/__tests__/metric-payload-envelope.test.ts`
  - proves derived/public metric fields pass with attribution
  - proves raw source values and protected weights are excluded from API payloads
  - proves ESPN public fallback remains blocked for derived API exposure
- `apps/web/lib/api-v1/payload-filter.ts`
  - adds `filterApiV1MetricPayloadFields()` as a thin app bridge into `@sports/prediction-engine`
- metric core, package, and app export/test updates

No-bet governor hardening added in the continuation:

- `packages/prediction-engine/src/gse-score/__tests__/no-bet-governor-integration.test.ts`
  - proves high modeled edge cannot override missing required evidence, stale market gravity, unclear source rights, calibration drift, or calibration debt
  - first red run failed because drift and calibration debt still produced `PLAY`
- `packages/prediction-engine/src/gse-score/calibration-action-policy.ts`
  - caps action quality when probability claims are unearned
  - hard-passes DRIFTING/BLOCKED calibration
- `packages/prediction-engine/src/gse-score/gse-action-score.ts`
  - applies the calibration cap, hard-pass policy, and public `probability_claim_cap` driver without exposing protected weights

Public no-bet methodology examples added in the continuation:

- `apps/web/lib/gse/no-bet-methodology.ts`
  - provides public-safe reason-code examples for missing required data, stale market context, source-rights blockers, calibration drift, calibration debt, model disagreement, and responsible-gaming overrides
  - exposes copy strings for tests without revealing protected formula details or raw provider payloads
- `apps/web/__tests__/no-bet-methodology.test.ts`
  - scans every public copy string and the methodology doc through media claim safety, no-claim guard, and performance-claim guard
- `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md`
  - records doctrine, public reason codes, reopen gates, copy rules, implementation notes, and live-action boundaries

API live-route promotion packet added in the continuation:

- `apps/web/lib/api/v1/live-route-promotion-packet.ts`
  - adds a non-executable owner-review packet for future live route promotion gates
  - requires owner approval, durable persistence review, route exposure approval, abuse-response review, metric payload-envelope consumption, OpenAPI/security review, rate-limit policy review, rollback plan review, boundary exception review, and raw-key absence review
  - keeps `liveRouteCreationAllowed=false` and `commandsExecutableNow=false` in every state
- `apps/web/__tests__/api-v1-live-route-promotion-packet.test.ts`
  - proves the packet fails closed on missing owner gates, payload-envelope absence, and repo-boundary violations
  - proves all command intents remain non-executable and forbid production databases, raw API key material, live cloud resources, and unreviewed route trees
- `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md`
  - records the packet contract, status rules, required evidence, forbidden targets, expected current state, and non-approval statement
- `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PR_BODY.md`
  - provides copy-paste-ready PR language without claiming live route approval

Partner/sponsor review fixtures added in the continuation:

- `apps/web/lib/workflows/partner-sponsor-review-fixtures.ts`
  - adds local partner/sponsor review fixture definitions and report generation on top of the existing draft workflow and revenue policy seams
  - proves low-risk disclosed affiliate/sponsor copy only reaches manual review
  - blocks sponsor-control attempts, regulated unknown-state offers, expired offers, and unsafe ROI/proven claim copy
  - keeps publish, route, external send, live integration, affiliate activation, and automatic sponsor approval locks closed
- `apps/web/__tests__/partner-sponsor-review-fixtures.test.ts`
  - verifies expected review statuses, sponsor independence boundaries, unknown-state fail-closed behavior, expired-offer blocking, unsafe claim blocking, and live-action locks
- `docs/revenue/PARTNER_SPONSOR_REVIEW_FIXTURES.md`
  - records fixture purpose, fixture set, live-action locks, sponsor independence boundary, verification, and non-approval statement

Local review queue persistence simulator added in the continuation:

- `apps/web/lib/workflows/local-review-queue-persistence.ts`
  - adds a memory-shadow queue simulator for draft-review, first-month media, and partner/sponsor packets
  - stores append-only local events, replays snapshots deterministically, rejects duplicate packets/events, detects stale packets, blocks stale version updates, and blocks approval while blockers remain unresolved
  - keeps publish, route, external send, live integration, affiliate activation, sponsor approval automation, durable persistence, and database write locks closed
- `apps/web/__tests__/local-review-queue-persistence.test.ts`
  - verifies mixed packet ingestion, duplicate rejection, stale reporting, markdown rendering, version conflicts, unresolved blocker approval blocking, and deterministic replay
- `docs/ops/LOCAL_REVIEW_QUEUE_PERSISTENCE_SIMULATOR.md`
  - records purpose, event types, locks, failure behavior, verification, and non-approval boundaries

API abuse-response and promotion-conflict fixtures added in the continuation:

- `apps/web/lib/api/v1/abuse-response-fixtures.ts`
  - adds a local abuse-response fixture report for malformed keys, conflicting keys, overscope, quota exhaustion, unsafe payload rights, and malformed route controls
  - detects replay promotion conflicts, unresolved local review packets, stale review packets, and duplicate route-promotion request IDs
  - feeds `abuseResponseReviewed` into the non-executable live-route promotion packet without enabling route creation or command execution
- `apps/web/__tests__/api-v1-abuse-response-fixtures.test.ts`
  - verifies denial coverage, no payload leaks, no quota debit on denied cases, replay conflict blocking, review queue blocker/stale blocking, duplicate promotion request blocking, and live-route packet integration
- `docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md`
  - records purpose, fixture coverage, promotion conflict checks, locks, verification, and non-approval statement
- `docs/api/API_V1_SHADOW_SEAM.md`
  - links the abuse fixture report into the API v1 shadow seam navigation

AWS public case-study route added in the continuation:

- `apps/web/lib/aws-case-study/public-case-study.ts`
  - defines the public-safe case-study data, six Well-Architected pillar mappings, repo evidence paths, proof points, and closed live-action locks
  - keeps cloud resource creation, paid resources, credentials, deployment approval, funding approval claim, and release-readiness claim false
- `apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx`
  - adds a launch-facing route explaining AWS-style governance as local GSE operating discipline
  - reuses existing public page chrome, keeps copy evidence-based, and avoids provider hooks, env reads, or external fetches
- `apps/web/__tests__/aws-case-study-page.test.ts`
  - verifies canonical metadata, navigation/footer chrome, six-pillar coverage, closed locks, no provider hooks, no unsupported AWS claims, and media claim-safety scan coverage
- `apps/web/__tests__/commercial-pages-launch-qa.test.ts`
  - adds the case-study route to launch-page source QA
- `docs/aws/AWS_PUBLIC_CASE_STUDY_ROUTE.md`
  - records the route purpose, boundaries, Well-Architected mapping, live-action locks, verification commands, and follow-up visual QA gate
- `docs/aws/README.md`, `docs/aws/COMPATIBILITY_INDEX.md`, `scripts/guardrails/fixtures/aws-compatibility-index.json`
  - register the route in the exact AWS compatibility layer and local-only guard fixture

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
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-payload-envelope.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts` | PASS | 2 files, 12 tests; metric payload-envelope and source/payload rights passed together |
| `npm run test --workspace=@sports/web -- __tests__/fences-and-adapters.test.ts` | PASS | 1 file, 9 tests; app bridge delegates metric payload fields through prediction-engine rights |
| `npm run test --workspace=@sports/web -- __tests__/no-bet-methodology.test.ts` | PASS | 1 file, 5 tests; public no-bet examples and doc passed claim-safety scans |
| `npm run test --workspace=@sports/web -- __tests__/no-bet-methodology.test.ts media-revenue-claim-safety.test.ts` | PASS | 2 files, 10 tests; no-bet methodology and media claim-safety passed together |
| `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/no-bet-governor-integration.test.ts src/gse-score/__tests__/gse-action-score.test.ts src/gse-score/__tests__/no-bet-strength.test.ts` | PASS | 3 files, 13 tests; adjacent no-bet governor seams passed |
| `npm run typecheck --workspace=@sports/web` after no-bet methodology examples | PASS | web TypeScript checked after no-bet methodology additions |
| `npm run test --workspace=apps/web -- api-v1-live-route-promotion-packet.test.ts api-v1-boundary-guard.test.ts api-v1-promotion-readiness.test.ts api-v1-disposable-rehearsal-packet.test.ts` | PASS | 4 files, 19 tests; live-route promotion packet and adjacent API readiness guards passed |
| `npm run typecheck --workspace=@sports/web` after live-route promotion packet | FAIL then PASS | first run caught `(string \| undefined)[]` blockers; after explicit blocker filtering, web TypeScript passed |
| `npm run test --workspace=apps/web -- partner-sponsor-review-fixtures.test.ts draft-review-fixtures.test.ts affiliate-compliance.test.ts sponsor-copy-scan.test.ts partner-risk-engine.test.ts partner-opportunity.test.ts` | FAIL then PASS | first run treated disclosure warnings as blockers and expected uppercase `ROI`; after repair, 6 files and 32 tests passed |
| `npm run typecheck --workspace=@sports/web` after partner/sponsor fixtures | PASS | web TypeScript checked after fixture/report additions |
| `npm run test --workspace=apps/web -- local-review-queue-persistence.test.ts first-month-review-queue.test.ts draft-review-fixtures.test.ts partner-sponsor-review-fixtures.test.ts` | PASS | 4 files, 19 tests; local queue persistence simulator and source fixture adapters passed |
| `npm run typecheck --workspace=@sports/web` after local queue persistence simulator | FAIL then PASS | first run caught queue record status narrowed to raw draft workflow status; after splitting initial workflow status from mutable queue status, app TypeScript passed |
| `npm run test --workspace=apps/web -- api-v1-abuse-response-fixtures.test.ts api-v1-shadow-route-harness.test.ts api-v1-shadow-route-replay.test.ts api-v1-live-route-promotion-packet.test.ts local-review-queue-persistence.test.ts` | PASS | 5 files, 25 tests; API abuse fixture report, route harness, replay, live-route packet, and local review queue passed together |
| `npm run typecheck --workspace=@sports/web` after API abuse fixtures | FAIL then PASS | first run caught nullable replay-conflict map/filter typing; after explicit conflict collection loop, app TypeScript passed |
| `npm run test --workspace=apps/web -- aws-case-study-page.test.ts commercial-pages-launch-qa.test.ts media-kit-page.test.ts partners-page.test.ts --reporter=dot --silent` | FAIL then PASS | first run caught unsafe `live AWS` wording and an evidence-required `ROI` reference; after wording repair, 4 files and 16 tests passed |
| `npm run typecheck --workspace=@sports/web` after AWS public case-study route | PASS | app TypeScript checked after route, data module, and launch QA additions |
| `npm run guard:aws-compatibility-index` after AWS public case-study route | PASS | 14 compatibility paths and 8 local fixtures passed after registering the route doc |
| `npm run typecheck` after AWS public case-study route | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after AWS public case-study route | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after AWS public case-study route | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run test --workspaces --if-present` after AWS public case-study route | PASS | 653 test files and 8152 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types |
| `git diff --check` after AWS public case-study route | PASS | no whitespace errors |
| `npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3066` plus route probe | PASS | local dev server served `/case-studies/aws-governed-sports-intelligence` with HTTP 200 after restart; expected Sentry/OpenTelemetry and image-domain warnings observed |
| desktop/mobile screenshots for AWS case-study route | PASS | screenshots captured under `reports/launch-page-visual-qa/2026-07-06/*` and visually reviewed |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/stale-line-risk-score.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS | 4 files, 16 tests; SLRS, market gravity, birth certificates, and asset graduation passed together |
| `npm run typecheck --workspace=packages/prediction-engine` after Stale Line Risk Score | FAIL then PASS | first run caught strict indexed driver access in the new test; after replacing it with `.some(...)`, prediction-engine TypeScript passed |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Stale Line Risk Score | PASS | 93 files, 817 tests |
| `npm run typecheck` after Stale Line Risk Score | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after Stale Line Risk Score | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after Stale Line Risk Score | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run test --workspaces --if-present` after Stale Line Risk Score | PASS | command exited 0; tool transcript truncated before final aggregate summary, so segmented workspace receipts below provide exact counts |
| segmented workspace tests after Stale Line Risk Score | PASS | apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 93 / 817; types 1 / 31; aggregate segmented receipt 654 files / 8157 tests |
| `git diff --check` after Stale Line Risk Score | PASS | no whitespace errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/qb-burden-index.test.ts src/metrics/__tests__/expected-completion.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | FAIL then PASS | first run caught low-uncertainty expectation with proxy-heavy input; second run caught manual-review posture expected as HIGH instead of MEDIUM. After fixture corrections, 4 files and 15 tests passed |
| `npm run typecheck --workspace=packages/prediction-engine` after QB Burden Index | PASS | prediction-engine TypeScript checked after QBI implementation and exports |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after QB Burden Index | PASS | 94 files, 821 tests |
| `npm run typecheck` after QB Burden Index | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after QB Burden Index | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after QB Burden Index | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| segmented workspace tests after QB Burden Index | PASS | apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 94 / 821; types 1 / 31; aggregate segmented receipt 655 files / 8161 tests |
| `git diff --check` after QB Burden Index | PASS | no whitespace errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/role-volatility-index.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/nfl/__tests__/gse-nfl-metrics.test.ts` | PASS | 4 files, 20 tests after adding blocked-source fail-closed coverage |
| `npm run typecheck --workspace=packages/prediction-engine` after Role Volatility Index | PASS | prediction-engine TypeScript checked after RVI implementation and stricter source-policy gate |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Role Volatility Index | PASS | 95 files, 826 tests |
| `npm run typecheck` after Role Volatility Index | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after Role Volatility Index | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after Role Volatility Index | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| segmented workspace tests after Role Volatility Index | PASS | apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 95 / 826; types 1 / 31; aggregate segmented receipt 656 files / 8166 tests |
| `git diff --check` after Role Volatility Index | PASS | no whitespace errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/playable-window-score.test.ts src/metrics/__tests__/gse-signal-score.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS | 4 files, 17 tests; PWS, adjacent decision-quality seam, birth certificates, and asset graduation passed together |
| `npm run typecheck --workspace=packages/prediction-engine` after Playable Window Score | FAIL then PASS | first run caught non-canonical `abstention_audit` validation method; after replacing it with existing validation vocabulary, prediction-engine TypeScript passed |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Playable Window Score | PASS | 96 files, 832 tests |
| `npm run typecheck` after Playable Window Score | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after Playable Window Score | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after Playable Window Score | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| segmented workspace tests after Playable Window Score | PASS | apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 96 / 832; types 1 / 31; aggregate segmented receipt 657 files / 8172 tests |
| `git diff --check` after Playable Window Score | PASS | no whitespace errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-evidence-cards.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/playable-window-score.test.ts src/metrics/__tests__/role-volatility-index.test.ts` | PASS | 4 files, 26 tests; evidence-card fixtures, asset graduation, PWS, and RVI passed together |
| `npm run typecheck --workspace=packages/prediction-engine` after evidence-card fixture coverage | PASS | prediction-engine TypeScript checked after fixture library, core exports, and root proprietary aliases |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after evidence-card fixture coverage | PASS | 96 files, 835 tests |
| evidence-card fixture LOC and escape-hatch scan | PASS | fixture module 149 lines, updated evidence-card test 192 lines; no TS escape hatches or non-null property access found |
| `npm run typecheck` after evidence-card fixture coverage | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after evidence-card fixture coverage | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after evidence-card fixture coverage | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| segmented workspace tests after evidence-card fixture coverage | PASS | apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 96 / 835; types 1 / 31; aggregate segmented receipt 657 files / 8175 tests |
| `git diff --check` after evidence-card fixture coverage | PASS | no whitespace errors |
| `npm run typecheck` after no-bet methodology examples | PASS | all workspaces with typecheck scripts completed |
| `npm run guardrails` after no-bet methodology examples | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run lint && git diff --check` after no-bet methodology examples | PASS | root lint and whitespace check completed without errors |
| `npm run typecheck` after live-route promotion packet | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after live-route promotion packet | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after live-route promotion packet | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run test --workspaces --if-present` after live-route promotion packet | TIMEOUT | root wrapper hit the 300s tool ceiling and is not counted as a pass |
| `npm run test --workspace=apps/web -- --reporter=dot --silent` after live-route promotion packet | PASS | 533 files, 7072 tests |
| remaining segmented workspace tests after live-route promotion packet | PASS | crypto 1/13, data-ingestion 16/131, ingestion-pipeline 6/60, prediction-engine 92/812, types 1/31 |
| `npm run typecheck --workspace=packages/prediction-engine` after payload-envelope filter | PASS | prediction-engine TypeScript checked after payload-envelope/export additions |
| `npm run typecheck --workspace=@sports/web` after payload-envelope bridge | PASS | web TypeScript checked after app API-v1 bridge additions |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after payload-envelope filter | PASS | 92 files, 812 tests |
| `npm run typecheck` after payload-envelope filter | PASS | all workspaces with typecheck scripts completed |
| `npm run guardrails` after payload-envelope filter | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run lint && git diff --check` after payload-envelope filter | PASS | root lint and whitespace check completed without errors |
| `npm run guard:aws-compatibility-index` | PASS | first run failed on two deployment-shaped phrases; after wording repair, 13 compatibility paths and 8 local fixtures passed |
| `npm run test --workspace=apps/web -- aws-compatibility-index.test.ts` | PASS | 1 file, 3 tests; exact AWS compatibility path guard, package wiring, and canonical references passed |
| `npm run fable:aws-gates` | PASS | local AWS gate evidence passed |
| `npm run fable:aws-fixtures` | PASS | local AWS fixture library evidence passed |
| `npm run fable:aws-governance` | PASS | local Shadow Control Tower/governance evidence passed |
| `npm run fable:aws-intel` | PASS | 19 required AWS docs present; live_aws_action=false; paid_resource_used=false; all six Well-Architected pillars covered in fixtures |
| `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-boundary-guard.test.ts` | PASS | 5 files, 40 tests; API v1 route harness, seam, registry, persistence, and boundary guard all passed together |
| `npm run test --workspace=apps/web -- api-v1-shadow-route-replay.test.ts api-v1-shadow-route-harness.test.ts api-v1-persistence.test.ts` | PASS | 3 files, 19 tests; API replay simulation, route harness, and persistence seam passed |
| `npm run test --workspace=apps/web -- draft-fence-workflow.test.ts fences-and-adapters.test.ts` | PASS | 2 files, 13 tests; workflow harness and fence/plugin seams passed together |
| `npm run test --workspace=apps/web -- draft-fence-workflow.test.ts` | PASS | 1 file, 9 tests; review packet serialization, markdown rendering, append-only ledger, queue filters, summary counts, and live-action locks passed |
| `npm run test --workspace=apps/web -- draft-review-fixtures.test.ts draft-fence-workflow.test.ts` | PASS | 2 files, 12 tests; representative packet fixtures and batch report passed |
| `npm run test --workspace=apps/web -- first-month-content-queue.test.ts media-revenue-claim-safety.test.ts` | PASS | 2 files, 9 tests; first-month queue fixtures and claim-safety report passed |
| `npm run test --workspace=apps/web -- first-month-review-queue.test.ts first-month-content-queue.test.ts draft-fence-workflow.test.ts` | PASS | 3 files, 16 tests; first-month review export, queue fixtures, and draft workflow passed |
| `npm run guard:commercial-copy` | PASS | npm entry point works |
| `npm run guard:performance-claims` | PASS | npm entry point works |
| `npm run guard:no-raw-ngs` | PASS | npm entry point works |
| `npx vitest run apps/web/__tests__/guardrails.test.ts` | PASS | 15 tests passed across current file and mirrored worktree file discovered by Vitest |
| `npx vitest run __tests__/guardrails.test.ts __tests__/fences-and-adapters.test.ts` from `apps/web` | PASS | 2 files, 21 tests |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts` | PASS | 4 files, 11 tests |
| `npm run test --workspace=apps/web -- api-v1-shadow-route-harness.test.ts` | PASS | 1 file, 6 tests; proves route-level shadow auth/scope/rate/envelope/usage/payload/abuse behavior |
| `npm run typecheck --workspace=@sports/web` | PASS | app TypeScript checked after fence/API adapter and route-harness additions |
| `npm run typecheck --workspace=packages/prediction-engine` | PASS | prediction-engine TypeScript checked after receiving metric additions |
| `npm run guardrails` | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, and eval contracts |
| `npm run typecheck` | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` | PASS | `@sports/web` ESLint completed with max warnings 0 |
| `npm run test --workspaces --if-present` | PASS | 635 test files and 8052 tests passed across web, crypto, data-ingestion, ingestion-pipeline, prediction-engine, and types |
| `npm run test --workspaces --if-present` | TIMEOUT | current AWS slice rerun exceeded the 300s tool ceiling and is not counted as a pass |
| `npm run test --workspace=apps/web -- --reporter=dot --silent` | PASS | 530 files, 7051 tests |
| `npm run test --workspace=packages/crypto -- --reporter=dot --silent` | PASS | 1 file, 13 tests |
| `npm run test --workspace=packages/data-ingestion -- --reporter=dot --silent` | PASS | 16 files, 131 tests |
| `npm run test --workspace=packages/ingestion-pipeline -- --reporter=dot --silent` | PASS | 6 files, 60 tests |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` | PASS | 84 files, 781 tests |
| `npm run test --workspace=packages/types -- --reporter=dot --silent` | PASS | 1 file, 31 tests |
| `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/no-bet-governor-integration.test.ts` | FAIL then PASS | first run failed on drift/debt producing `PLAY`; after hardening, 1 file and 5 tests passed |
| `npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/gse-action-score.test.ts src/gse-score/__tests__/no-bet-strength.test.ts src/gse-score/__tests__/model-parliament.test.ts src/gse-score/__tests__/no-bet-governor-integration.test.ts src/metrics/__tests__/gse-signal-score.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/data-reliability-index.test.ts` | PASS | 7 files, 23 tests; adjacent no-bet/GSS/MGI/DRI suite passed |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` | PASS | 85 files, 786 tests after no-bet governor hardening |
| `npm run typecheck --workspace=packages/prediction-engine` | FAIL then PASS | first run caught uppercase `UNKNOWN` fixture literal; corrected to lowercase `unknown`, then typecheck passed |
| `npm run test --workspace=apps/web -- __tests__/commercial-pages-launch-qa.test.ts __tests__/media-kit-page.test.ts __tests__/partners-page.test.ts __tests__/pricing-honesty.test.ts __tests__/pricing-value-architecture.test.ts` | PASS | 5 files, 40 tests; launch commercial source QA passed |
| `npm run dev --workspace=apps/web -- --hostname 127.0.0.1 --port 3065` | PASS | local-only Next dev server rendered all six launch commercial routes; stopped after screenshot pass |
| `MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/desktop WIDTH=1440 HEIGHT=1100 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing` | PASS | desktop screenshots captured for all six routes; final route responses were HTTP 200 |
| `MSYS_NO_PATHCONV=1 BASE_URL=http://127.0.0.1:3065 OUT_DIR=reports/launch-page-visual-qa/2026-07-05/mobile WIDTH=390 HEIGHT=844 FULL_PAGE=1 node scripts/screenshot.mjs /media-kit /partners /newsletter /content-lab /podcast /pricing` | PASS | mobile screenshots captured for all six routes; final route responses were HTTP 200 |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/expected-yac.test.ts src/metrics/__tests__/yac-creation.test.ts src/metrics/__tests__/rush-environment-index.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts` | FAIL then PASS | first run failed because asset graduation still pinned the old six-metric order; after updating expected ids, 6 files and 20 tests passed |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/rush-environment-index.test.ts src/metrics/__tests__/expected-rush-yards.test.ts src/metrics/__tests__/rush-over-expected.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS | 5 files, 15 tests after splitting the certificate registry |
| `npm run typecheck --workspace=packages/prediction-engine` after Expected Rush Yards/Rush Over Expected | PASS | prediction-engine TypeScript checked after registry split and rushing metric additions |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Expected Rush Yards/Rush Over Expected | PASS | 89 files, 794 tests |
| `npm run typecheck` after Expected Rush Yards/Rush Over Expected | PASS | all workspaces with typecheck scripts completed |
| `npm run lint` after Expected Rush Yards/Rush Over Expected | PASS | root lint completed through `@sports/web` ESLint with max warnings 0 |
| `npm run guardrails` after Expected Rush Yards/Rush Over Expected | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| `npm run test --workspaces --if-present` after Expected Rush Yards/Rush Over Expected | TIMEOUT | full wrapper hit the 300s tool ceiling and is not counted as a pass |
| apps/web segmented Vitest after Expected Rush Yards/Rush Over Expected | PASS | six chunks covered 531 files and 7056 tests |
| remaining segmented workspace tests after Expected Rush Yards/Rush Over Expected | PASS | crypto 1/13, data-ingestion 16/131, ingestion-pipeline 6/60, prediction-engine 89/794, types 1/31 |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/residual-rollup.test.ts src/metrics/__tests__/yac-creation.test.ts src/metrics/__tests__/rush-over-expected.test.ts` | PASS | 3 files, 9 tests; residual rollup plus adjacent residual metrics passed |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/residual-rollup.test.ts` | PASS | 1 file, 6 tests after adding direct mixed-rollup guard |
| `npm run typecheck --workspace=packages/prediction-engine` after residual rollup helper | PASS | prediction-engine TypeScript checked after rollup/export additions |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after residual rollup helper | PASS | 90 files, 800 tests |
| `npm run typecheck` after residual rollup helper | PASS | all workspaces with typecheck scripts completed |
| `npm run guardrails` after residual rollup helper | PASS | trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed |
| residual rollup escape-hatch scan | PASS | no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, enums, or remaining type assertions in the new rollup files |
| `npm run lint && git diff --check` after residual rollup helper | PASS | root lint and whitespace check completed without errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-evidence-cards.test.ts src/metrics/__tests__/residual-rollup.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS | 3 files, 18 tests; evidence-card, residual-rollup, and graduation seams passed together |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-evidence-cards.test.ts` | PASS | 1 file, 6 tests after evidence-card cleanup |
| `npm run typecheck --workspace=packages/prediction-engine` after evidence-card generators | PASS | prediction-engine TypeScript checked after generator/export additions |
| metric evidence-card LOC and escape-hatch scan | PASS | `metric-evidence-cards.ts` 197 lines, `metric-evidence-cards.test.ts` 131 lines; no TS escape hatches or type assertions found |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after evidence-card generators | PASS | 91 files, 806 tests |
| `npm run typecheck && npm run guardrails && npm run lint && git diff --check` after evidence-card generators | PASS | root typecheck, guardrails, lint, and whitespace check completed without errors |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-source-payload-rights.test.ts` after source-policy adapter | PASS | 1 file, 8 tests; fixture alignment and conservative generated permissions passed |
| `npm run typecheck --workspace=packages/prediction-engine` after source-policy adapter | PASS | prediction-engine TypeScript checked after generated policy wiring |
| source-policy adapter LOC and escape-hatch scan | PASS | adapter 71 lines, fixtures 180 lines, updated source/payload-rights test 159 lines; no TS escape hatches or type assertions found |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after source-policy adapter | PASS | 91 files, 808 tests |
| `npm run typecheck && npm run guardrails && npm run lint && git diff --check` after source-policy adapter | PASS | root typecheck, guardrails, lint, and whitespace check completed without errors |
| `npm run typecheck --workspace=packages/prediction-engine` | PASS | prediction-engine TypeScript checked after YAC Creation and Rush Environment additions |
| metric LOC and escape-hatch scan | PASS | `yac-creation.ts` 88 pure LOC, `rush-environment-index.ts` 108, `metric-birth-certificate.ts` 226; no TS escape hatches found |
| metric registry split LOC check | PASS | `metric-birth-certificate.ts` 74 pure LOC, `metric-birth-certificate-registry.ts` 193, `expected-rush-yards.ts` 95, `rush-over-expected.ts` 88 |
| `npx prettier --check ...` | BLOCKED | npm attempted a network fetch for Prettier and failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; no install or dependency change attempted |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` | PASS | 87 files, 790 tests after metric additions |
| `git diff --check` | PASS | no whitespace errors |

PowerShell syntax caveat:

- `npm run guard:commercial-copy && npm run guard:performance-claims && npm run guard:no-raw-ngs` failed before execution because this shell version rejected `&&`.
- The same npm scripts were rerun separately and passed.

Final broad validation for the current API live-route promotion packet slice completed through segmented workspace test commands because the root all-workspaces test command exceeded the 300s tool ceiling. The segmented commands covered all workspaces that define test scripts.

## Remaining Risks

- The new commercial/performance scanners intentionally focus on launch and monetization surfaces. They do not scan every internal calibration, academy, admin, cockpit, or performance file because those surfaces legitimately discuss CLV, ROI, calibration, and verified receipts in policy/proof contexts.
- API auth, API v1 pure seams, API payload/OpenAPI guardrails, route-level shadow harness, idempotency replay simulation, and live-route promotion packet now exist. Live `app/api/v1` routes remain intentionally deferred until the owner approves route exposure plus durable persistence, abuse-response behavior, payload-envelope consumption, OpenAPI/security review, rate-limit policy, rollback, boundary exception, and raw-key absence evidence.
- Source-rights/IP adapter paths now exist and reuse the canonical scraping registry. They are code-level policy gates, not legal clearance.
- Fence plugin files, a pure draft workflow harness, local review packet serialization, packet markdown rendering, in-memory packet ledger, queue status filters, review summary counts, representative content/API packet fixtures, partner/sponsor review fixtures, first-month media queue fixtures, first-month review queue export, and claim-safety batch reports now exist.
- Local review queue persistence simulation now exists for media, content/API, and partner/sponsor packets. It is memory-shadow only, with duplicate rejection, stale packet reporting, deterministic replay, version conflict checks, unresolved blocker approval blocking, and no database writes.
- API abuse-response and promotion-conflict fixture reporting now exists. It proves denied API cases do not debit quota or leak protected response data, and it blocks abuse-response promotion evidence when replay conflicts, unresolved/stale queue packets, or duplicate route-promotion IDs exist.
- The AWS public case-study route now exists and is registered in the exact `docs/aws` compatibility lane. It passed focused source QA, app typecheck, AWS compatibility guard, root typecheck, root lint, root guardrails, full all-workspaces tests, and local desktop/mobile screenshot QA.
- Partner/sponsor review fixtures now exist and are local-only. They prove low-risk disclosed copy reaches manual review while sponsor-control attempts, regulated unknown-state offers, expired offers, and unsafe ROI/proven language block before any live action.
- No-bet governor integration is complete for the shadow decision seam. Full product wiring and public explanations remain future work and must not expose protected weights or imply legal/performance clearance.
- Public no-bet methodology examples now exist and are claim-scanned, but they remain local copy governance only. They do not publish picks, expose routes, or approve model promotion.
- Launch-facing commercial pages now have local source QA plus desktop/mobile screenshot artifacts under `reports/launch-page-visual-qa/2026-07-05`. This is local render evidence, not a production preview approval.
- Stale Line Risk Score now exists as a governed `SHADOW` market-risk metric. It blocks stale market snapshots from market-signal use, but it is not a playable-edge claim and has no model card, drift card, public/API exposure, or promotion approval.
- QB Burden Index now exists as a governed `SHADOW` passing-context metric. It is not quarterback quality, win probability, confidence, or a pick signal, and it still has no model card, drift card, public/API exposure, or promotion approval.
- Role Volatility Index now exists as a governed `SHADOW` role-instability metric. It is not player quality, win probability, confidence, or a pick signal; stale usage and blocked source posture disable role-signal use; it still has no model card, drift card, public/API exposure, or promotion approval.
- Playable Window Score now exists as a governed `SHADOW` decision-window readiness metric. It is not win probability, expected value, confidence, betting advice, or a pick trigger; stale or blocked market signals, blocked source posture, high no-bet pressure, drift, or calibration debt close the window; it still has no model card, drift card, public/API exposure, or promotion approval.
- YAC Creation, Rush Environment Index, Expected Rush Yards, and Rush Over Expected now exist as governed `SHADOW` metrics with birth certificates, package exports, directional tests, public drivers, source-policy passthrough, confidence/evidence separation, and no protected weights in outputs.
- Receiver/rusher residual rollups now exist as governed `SHADOW` / `INTERNAL` player-season summaries. They are aggregation helpers only, not public/API leaderboards, and they do not create validation, drift, model-card, or source-clearance claims.
- Metric model/drift-card generators now exist as local evidence helpers. Model cards remain draft-first by default, and generated cards do not approve lifecycle, public/API exposure, licensing, validation, source clearance, or production promotion.
- SLRS/QBI/RVI/PWS model-card and drift-card fixture coverage now exists. The fixture generator is synthetic/local, preserves `SHADOW` lifecycle, `INTERNAL` API exposure, `NOT_READY` licensing, draft-first model cards, metric-specific caveats, and active drift review; it does not create public/API exposure or promotion evidence.
- Metric source-policy generation now exists from registry-shaped fixtures aligned to the canonical web source-rights registry. This is code-level governance only, not legal clearance.
- Metric payload-envelope filtering now exists before app API-v1 metric payload exposure. This is local shadow filtering, not a live route or legal clearance.
- `metric-birth-certificate.ts` was split into a compact contract/lookup file plus a dedicated registry data file before commit, avoiding continued growth in the core contract module.
- Exact `docs/aws` and `infra/aws-shadow` paths now exist as compatibility indexes. They are local visibility paths, not live AWS infrastructure.
- Startup funding and cloud credit program terms were not live-refreshed in this slice. Verify official pages before any application.

## Next Highest-Leverage Tasks

1. Add deeper local validation fixtures for role-stability and decision-window splits before any RVI/PWS public/API exposure.
2. Add API payload-envelope fixture coverage for newly composed decision metrics before route promotion paperwork changes.
3. Continue guarded metric backlog with Market Mirage Score only after PWS, SLRS, MGI, no-bet, and source-rights veto tests stay green.
4. Add local commercial review queue reporting for unresolved blockers by source and surface.
5. Add partner/sponsor markdown export docs only if generated copy remains claim-safe and sponsor-independent.
6. Run owner-reviewed production preview QA before live push.
7. Add public-safe no-bet examples to a future owner-approved product surface only after visual/copy QA.
8. Add route design paperwork only after owner approval; keep it non-executable and route-free.
9. Add visual QA for any new public-safe case-study route before production preview.
10. Add API payload-envelope fixture coverage for newly composed decision metrics before route promotion paperwork changes.

## Safety Statement

- No secrets added.
- No dependencies changed.
- No package install was run.
- No live AWS, cloud, database, email, affiliate, sponsor, betting, or publishing action was taken.
- No production gates were flipped.
- No raw NGS export was added.
- No fake traffic, users, sponsors, revenue, win rate, ROI, calibration status, or partnership claims were added.
