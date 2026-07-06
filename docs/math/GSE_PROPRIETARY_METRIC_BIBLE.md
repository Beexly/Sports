# GSE Proprietary Metric Bible

Updated: 2026-07-06

This document defines Slice 1 of the GSE proprietary metric system. It is a shadow-only math grammar and first metric layer, not a production scoring hookup, public probability claim, or live data product.

## Operating Law

No number enters GSE unless it can survive cross-examination:

- grounded in a target question
- source-rights-clean
- deterministic in code
- validated before promotion
- exposed through public drivers, not protected weights
- blocked or downgraded when freshness, rights, calibration, drift, or no-bet pressure fails

## Prompt Coverage And Formula Authority

Inputs reviewed for this slice:

| Prompt | Lines | SHA-256 | How it was used |
| --- | ---: | --- | --- |
| First Build Slice: Metric Birth Certificate + Core Utilities | 2087 | `951273a7efeffb3a97238d6b1aea2f6ee93a0c2f697f14e668459d72f153dce8` | Implementation authority for Slice 1 files, DRI weights, required tests, and hard rules. |
| GSE Proprietary Metric Doctrine | 2019 | `87f4c209fffe5a1e877a8c8e988c11b6fee7a0c773038f3d8ac6db6feb21e813` | Doctrine authority for the seven gates, metric hierarchy, historical precedent, source-rights discipline, and long backlog. |
| Competitive/product attack map | 3672 | `5c98eaf932b5462ccda5c7e9b5a31884bd5fc6217fa5d9c5476475d82d2fa34c` | Product authority for evidence API, model cards, drift cards, payload rights, content claim governance, and API/security backlog. |
| Duplicate competitive/product attack map | 3672 | `5c98eaf932b5462ccda5c7e9b5a31884bd5fc6217fa5d9c5476475d82d2fa34c` | Same content as above; not duplicated in backlog. |

Formula conflict resolved:

- The doctrine contains an earlier DRI sketch using `0.40/0.25/0.20/0.15` weights plus a separate rights penalty.
- The First Build Slice contains the newer DRI contract using `0.38/0.22/0.20/0.20` weights and `rights_cleanliness` as a direct term.
- Code implements the First Build Slice formula because it is the explicit build prompt for this slice.
- The older doctrine formula is retained as calibration history; future validation can compare both variants against settled data before promotion.

## Files

Core grammar:

- `packages/prediction-engine/src/metrics/core/metric-birth-certificate.ts`
- `packages/prediction-engine/src/metrics/core/driver.ts`
- `packages/prediction-engine/src/metrics/core/math.ts`
- `packages/prediction-engine/src/metrics/core/shrinkage.ts`
- `packages/prediction-engine/src/metrics/core/validation.ts`
- `packages/prediction-engine/src/metrics/core/source-rights.ts`
- `packages/prediction-engine/src/metrics/core/payload-rights.ts`

Grounded metrics and governed continuations:

- `packages/prediction-engine/src/metrics/source/data-reliability-index.ts`
- `packages/prediction-engine/src/metrics/market/market-gravity-index.ts`
- `packages/prediction-engine/src/metrics/market/stale-line-risk-score.ts`
- `packages/prediction-engine/src/metrics/passing/expected-completion.ts`
- `packages/prediction-engine/src/metrics/passing/qb-burden-index.ts`
- `packages/prediction-engine/src/metrics/role/role-volatility-index.ts`
- `packages/prediction-engine/src/metrics/receiving/receiver-difficulty.ts`
- `packages/prediction-engine/src/metrics/receiving/expected-yac.ts`
- `packages/prediction-engine/src/metrics/receiving/yac-creation.ts`
- `packages/prediction-engine/src/metrics/rushing/rush-environment-index.ts`
- `packages/prediction-engine/src/metrics/rushing/expected-rush-yards.ts`
- `packages/prediction-engine/src/metrics/rushing/rush-over-expected.ts`
- `packages/prediction-engine/src/metrics/decision/gse-signal-score.ts`

Root package exports:

- `GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES`
- `proprietaryMetricBirthCertificate`
- `requireProprietaryMetricBirthCertificate`
- `GSE_PROPRIETARY_METRIC_ASSETS`
- `proprietaryMetricAsset`
- `requireProprietaryMetricAsset`
- `evaluateMetricGraduation`
- `GSE_PROPRIETARY_METRIC_SOURCE_RIGHTS_POLICIES`
- `evaluateProprietaryMetricSourceRights`
- `evaluateProprietaryMetricPayloadRights`
- `proprietaryMetricSourceRightsPolicy`
- `proprietarySourceRightsEnvelopeFromPolicy`
- `dataReliabilityIndex`
- `gseMarketGravityIndex`
- `gseStaleLineRiskScore`
- `expectedCompletionGse`
- `qbBurdenIndex`
- `roleVolatilityIndex`
- `receiverDifficultyIndex`
- `expectedYacGse`
- `yacCreationGse`
- `rushEnvironmentIndex`
- `expectedRushYardsGse`
- `rushOverExpectedGse`
- `gseSignalScore`

Existing NFL-specific exports remain available under their prior names. The new market gravity metric is exported as `gseMarketGravityIndex` from the package root to avoid colliding with the pre-existing `marketGravityIndex` from `market-read.ts`.

## Metric Birth Certificate

Every metric must declare:

- purpose through `targetQuestion`
- `targetVariable`
- historical precedent
- allowed inputs
- forbidden inputs
- formula class and summary
- protected components
- validation methods
- failure modes
- source-rights requirements
- public exposure level
- lifecycle status

Current governed metric certificates:

| Metric ID | Family | Status | Public Exposure |
| --- | --- | --- | --- |
| `data-reliability-index` | source | SHADOW | grade_only |
| `market-gravity-index` | market | SHADOW | score_band |
| `stale-line-risk-score` | market | SHADOW | score_band |
| `expected-completion-gse` | passing | SHADOW | score_band |
| `qb-burden-index` | passing | SHADOW | score_band |
| `role-volatility-index` | role | SHADOW | score_band |
| `receiver-difficulty-index` | receiving | SHADOW | score_band |
| `expected-yac-gse` | receiving | SHADOW | score_band |
| `yac-creation-gse` | receiving | SHADOW | score_band |
| `rush-environment-index` | rushing | SHADOW | score_band |
| `expected-rush-yards-gse` | rushing | SHADOW | score_band |
| `rush-over-expected-gse` | rushing | SHADOW | score_band |
| `gse-signal-score` | decision | SHADOW | score_band |

## Core Math Grammar

The core math layer includes:

- bounded clamps and score clamps
- `sigmoid`, `logit`, `softplus`
- z-scores
- weighted means
- empirical Bayes shrinkage
- protected nonlinear basis expansion
- source-policy validation
- evidence uncertainty bands
- public driver ordering

Protected basis expansion makes raw features harder to reverse-engineer:

```text
phi(x) = [
  x,
  x^2,
  x^3,
  max(0, x-k1)^3,
  max(0, x-k2)^3,
  max(0, x-k3)^3,
  log(1 + abs(x)),
  sigmoid(a*x)
]
```

## First Metrics

### Data Reliability Index

Target question: is this data reliable enough to influence a decision?

Inputs:

- source age
- TTL
- source count
- expected source count
- provider trust score
- rights status
- contradiction count
- missing required fields

Implemented Slice 1 formula:

```text
freshness_score =
  1.00 if age <= 0.5TTL
  0.65 if 0.5TTL < age <= TTL
  0.15 if age > TTL
  0.00 if missing

coverage_score = min(1, source_count / expected_source_count)

rights_cleanliness =
  1.00 if approved/allowed
  0.60 if benchmark_only/manual_review/restricted
  0.00 if permission_required/blocked/excluded/unknown

contradiction_penalty = min(0.50, 0.20 * contradiction_count)
missing_penalty = min(0.40, 0.08 * missing_required_fields)

DRI =
  100 * clamp(
    0.38*freshness_score
  + 0.22*coverage_score
  + 0.20*provider_trust_score
  + 0.20*rights_cleanliness
  - contradiction_penalty
  - missing_penalty,
  0, 1)
```

Output grades:

- `HIGH`
- `MEDIUM`
- `LOW`
- `BLOCKED`

DRI feeds no-bet pressure, API warnings, and content approval.

### Market Gravity Index

Target question: is the market meaningfully pulling toward a side, total, or prop?

MGI uses line movement, book consensus, timing, injury explainability, key-number crossing, staleness, and dispersion. Stale data cannot be classified as a clean market signal; it returns `NO_SIGNAL`.

Implementation boundary:

- It is derived market interpretation, not raw odds resale.
- It exposes score, stale flag, signal band, and drivers.
- It does not expose market-normalization weights, timing decay calibration, key-number table, or injury explainability logic.
- It is not an edge claim; injury-explained movement and key-number crossings can support classification but never prove value.

### Stale Line Risk Score

Target question: is this line too stale, thin, contradictory, or rights-unclear to support market interpretation?

SLRS is a market-risk score, not a playable-edge score. Higher is worse. It uses line age, freshness TTL, source coverage, contradiction pressure, source-rights cleanliness, book dispersion, and movement audit pressure. A line snapshot at or beyond the freshness TTL is forced to `BLOCK`; `marketSignalAllowed` becomes false even when the line moved sharply.

Implementation boundary:

- It is derived market-risk interpretation, not raw odds resale.
- It exposes score, stale flag, risk band, `marketSignalAllowed`, and public drivers.
- It does not expose freshness hard-block thresholds, component weights, market-type dispersion scales, private book order flow, or paid steam-feed logic.
- It complements Market Gravity: MGI asks whether the market is pulling; SLRS asks whether the line snapshot is trustworthy enough to interpret.
- It does not classify any stale line as a clean market signal.

### GSE Expected Completion

Target question: how likely should this pass have been completed?

The metric uses cleared football context and protected transforms:

- air yards
- yards to go
- red-zone flag
- sideline proxy
- pressure proxy
- weather penalty
- time-to-throw proxy
- shrunk quarterback, receiver, and defense priors

It returns completion probability and a separate evidence confidence score. Confidence is not completion probability.

Implementation boundary:

- Probability estimates completion likelihood only.
- `confidenceScore` measures evidence quality and uncertainty, not probability.
- Public drivers report directional effects; protected basis transforms and coefficients are not returned.
- Source policy is carried with the output so downstream gates can reject weak rights.

### QB Burden Index

Target question: how much contextual burden was placed on the quarterback independent of quarterback quality?

QBI is a passing-context burden score, not a quarterback talent score, not win probability, and not a pick signal. It uses expected-completion difficulty, pressure, throw depth, down-distance friction, offensive-line disruption proxy, receiver separation deficit proxy, time-to-throw stress proxy, weather penalty, pass-rate pressure, and source-policy posture.

Implementation boundary:

- It returns `burdenIndex`, `burdenBand`, evidence confidence, uncertainty, source posture, and public drivers.
- `confidenceScore` measures evidence quality, not quarterback quality or win probability.
- Manual-review source posture raises uncertainty; blocked modeling posture forces `sourcePosture: "BLOCKED"` and high uncertainty.
- It does not expose burden component weights, proxy transforms, source posture scaling, raw private tracking rows, or proprietary pass-rush feeds.
- Poor source posture increases review pressure without pretending the metric is precise.

### Role Volatility Index

Target question: how unstable is a player's role signal before the model or content layer treats it as reliable?

RVI is a role-instability score, not player quality, win probability, model confidence, or pick actionability. It uses snap-share movement, target/carry/route opportunity movement, depth-chart shock, injury or return uncertainty, teammate role shock, sample size, usage freshness, and source-policy posture.

Implementation boundary:

- It returns `volatilityIndex`, `volatilityBand`, `staleUsage`, `roleSignalAllowed`, evidence confidence, uncertainty, source posture, and public drivers.
- `confidenceScore` measures evidence quality, not player quality, role certainty, or win probability.
- Usage evidence at or beyond the freshness TTL forces `volatilityBand: "BLOCK"`, high uncertainty, and `roleSignalAllowed: false`.
- Blocked source-policy posture also forces `roleSignalAllowed: false`; clean usage is not enough when modeling rights fail.
- It exposes role volatility drivers only and keeps weights, freshness thresholds, proxy transforms, and source-posture scaling protected.

### GSE Signal Score

Target question: is this signal high-quality enough to act on?

GSE Signal Score is a decision-quality score, not win probability. It returns `probability: null`.

It combines:

- edge quality
- signal integrity
- market gravity
- proprietary player signal
- calibration integrity
- portfolio fit
- no-bet pressure
- drift pressure
- calibration debt
- interaction penalties

Implementation boundary:

- `probability` is always `null`.
- `confidenceMeaning` is `DECISION_QUALITY_NOT_WIN_PROBABILITY`.
- No-bet pressure, drift pressure, and calibration debt are suppressors, not decorative drivers.
- Public output includes grade, score, confidence score, and sorted drivers, not protected weights or interaction coefficients.

Public grades:

- `HARD_PASS`
- `PASS`
- `WATCH`
- `LEAN`
- `SPEAK`
- `STRONG`

## Validation Ladder

1. Directional unit test
2. Synthetic fixture test
3. Historical walk-forward
4. Segment calibration
5. Baseline comparison
6. Drift report
7. Shadow board impact
8. Public/API approval

No metric leaves `SHADOW` without model card, source card, validation card, and drift card.

## Metric Asset And Graduation Layer

Implemented from the competitive/product attack-map prompt:

- `packages/prediction-engine/src/metrics/core/metric-asset.ts`
- `packages/prediction-engine/src/metrics/core/metric-graduation.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-asset-graduation.test.ts`

Every Slice 1 metric now has a `GseMetricAsset` wrapper with:

- birth certificate
- source-rights envelopes
- model card status
- validation report status
- drift card status
- API exposure level
- licensing status
- evidence references

Default Slice 1 asset cards are deliberately conservative:

- `apiExposure: INTERNAL`
- `licensingStatus: NOT_READY`
- `modelCard.status: MISSING`
- `validationReport.status: MISSING`
- `driftCard.status: MISSING`
- source rights allow modeling as an internal requirement but block derived/raw API exposure until a real source-rights envelope is attached

Graduation statuses:

- `BLOCKED_SOURCE_RIGHTS`
- `BLOCKED_MODEL_CARD`
- `BLOCKED_SAMPLE`
- `BLOCKED_VALIDATION`
- `BLOCKED_DRIFT`
- `REVIEW_READY`
- `APPROVED_FOR_CONTENT`
- `APPROVED_FOR_API`

Graduation rules now enforced in pure TypeScript:

- missing source-rights envelope blocks
- source with `mayUseForModeling=false` blocks all graduation
- API exposure blocks when any source has `mayExposeDerived=false`
- sample size below threshold blocks
- missing model card blocks
- validation status other than `PASS` blocks
- missing or severe drift blocks
- `SHADOW` metrics can reach content aggregate approval only after gates pass
- `SHADOW` metrics cannot be exposed through API routes
- full API exposure requires all gates and a non-shadow approved metric asset

## Source Rights And Payload Rights Layer

Implemented from the competitive/product attack-map prompt:

- `packages/prediction-engine/src/metrics/core/source-rights.ts`
- `packages/prediction-engine/src/metrics/core/payload-rights.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-source-payload-rights.test.ts`

The metric package now has pure source-policy primitives that mirror, but do not import from, the web registry in `apps/web/lib/scraping/source-rights-registry.ts`.

Initial policies:

| Source | Registry status | Modeling | Validation | Derived API | Raw API | Attribution |
| --- | --- | --- | --- | --- | --- | --- |
| `nflverse` | `approved_open_license` | allowed | allowed | allowed | blocked by default | required |
| `the-odds-api` | `approved_api` | blocked | allowed | allowed | blocked | not required by current registry entry |

The boundary is deliberate:

- `nflverse` can train, validate, and support derived metrics with attribution.
- The Odds API can support derived market intelligence where the payload does not expose raw provider values.
- The Odds API remains blocked for model training because the current web registry sets `model_training_allowed: false`.
- Raw odds fields, protected weights, and unknown-source fields fail closed for API payloads.
- Public drivers and aggregate derived scores are allowed only when every referenced source permits the requested exposure.

Payload field kinds:

- `DERIVED_METRIC`
- `PUBLIC_DRIVER`
- `AGGREGATE_SUMMARY`
- `RAW_SOURCE_VALUE`
- `PROTECTED_WEIGHT`
- `PROVIDER_IDENTIFIER`

This layer is not a legal clearance claim. It is a code-level policy gate that encodes the current repo evidence and blocks unsafe exposure until a stronger source-rights record exists.

## Receiving and Rushing Metric Slices

Implemented on 2026-07-05:

- `receiver-difficulty-index`
- `expected-yac-gse`
- `yac-creation-gse`
- `rush-environment-index`
- `expected-rush-yards-gse`
- `rush-over-expected-gse`

All six metrics follow the same foundation rules as Slice 1:

- lifecycle status defaults to `SHADOW`
- each metric has a birth certificate
- each metric returns public drivers, not protected weights
- confidence remains evidence quality, not probability or certainty
- source-policy evidence is carried through the result
- uncertainty is derived from available proxy count, sample size, and source-policy posture

Receiver Difficulty Index behavior:

- increases when expected completion probability falls
- increases when air yards rise
- increases when separation/cushion proxies worsen
- increases when contested-catch and sideline proxies rise
- shrinks receiver prior difficulty toward neutral when sample size is low

Expected YAC behavior:

- increases with space, separation, cushion, and a shrunk receiver YAC prior
- decreases with defender leverage, deeper target depth, and red-zone constraint
- uses protected basis expansion for depth so callers see public drivers without protected transform weights

YAC Creation behavior:

- starts from the residual between actual YAC and `expected-yac-gse`
- rises when actual YAC clears the expected YAC baseline
- falls when actual YAC underperforms the expected YAC baseline
- uses receiver YAC-over-expected prior as a shrinkage stabilizer, not as a public weight
- can include source-cleared broken-tackle/contact-balance proxies as public drivers

Rush Environment Index behavior:

- rises with lighter box pressure, stronger offensive-line continuity, favorable run-direction leverage, and run-friendly game script
- falls with heavy box/front pressure, worse down-distance stress, and weather penalty
- describes the rushing context before crediting or blaming the ball carrier
- confidence remains evidence quality, not rush-success probability

Expected Rush Yards behavior:

- starts from `rush-environment-index` rather than copying any private expected-rush output
- rises with favorable rush environment, stronger shrunk rusher prior, weaker defensive rush allowance, and designed-rush context
- falls with long-distance stress and red-zone compression
- keeps confidence tied to evidence quality and source posture, not certainty about a carry outcome

Rush Over Expected behavior:

- starts from the residual between actual rushing yards and `expected-rush-yards-gse`
- rises when actual rushing yards clear the GSE expected-rush baseline
- falls when actual rushing yards underperform the GSE expected-rush baseline
- uses rusher RYOE prior as a shrinkage stabilizer, not as a public weight
- can include source-cleared broken-tackle and yards-after-contact proxies as public drivers

Player Residual Rollup helper behavior:

- rolls `yac-creation-gse` and `rush-over-expected-gse` play-level residuals into player-season summaries
- groups only by metric, player, and season; direct mixed rollups are rejected instead of blended
- returns `SHADOW` / `INTERNAL` summaries only
- carries source-policy validation forward and fails source posture closed when any input source blocks modeling
- keeps residual totals/per-play values separate from evidence confidence
- returns public drivers for residual per play, sample size, evidence confidence, uncertainty, and source-policy posture
- does not expose protected weights, raw tracking rows, public/API eligibility, model cards, drift cards, or validation claims

Metric Evidence Card generator behavior:

- generates draft-first model cards from metric assets, validation reports, residual rollups, limitations, and evidence refs
- does not change metric lifecycle, API exposure, licensing status, or public approval
- returns `DRAFT` by default even when validation passes; `READY` requires explicit `allowReadyStatus` and passing evidence gates
- keeps model cards `DRAFT` when residual rollups fail source posture or validation/sample gates do not pass
- generates drift cards from explicit drift checks and residual-rollup risk signals
- classifies drift checks as `STABLE`, `WATCH`, or `SEVERE` based on supplied thresholds
- treats high-uncertainty or fail-closed residual rollup evidence as review pressure, not stable proof
- returns `MISSING` drift cards when no checks or rollup risk are supplied

Metric Source-Policy generation behavior:

- generates prediction-engine metric source-rights policies from registry-shaped fixtures aligned to `apps/web/lib/scraping/source-rights-registry.ts`
- covers every current canonical web registry source ID with a fixture alignment test
- maps canonical source flags into metric permissions for model training, validation, derived metrics, content display, storage, raw API, and derived API
- keeps raw API exposure blocked for every generated policy
- treats approved open/license/written-permission sources as the only paths that can support derived API exposure when derived analytics is also allowed
- keeps public logged-off, permission-required, vendor-candidate, manual-research-only, blocked-technical-control, and excluded sources conservative by default
- remains a code-level rights gate and does not claim legal clearance

Tests added:

- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/yac-creation.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/rush-environment-index.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-rush-yards.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/rush-over-expected.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/stale-line-risk-score.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/role-volatility-index.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/residual-rollup.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/metric-evidence-cards.test.ts`
- source-policy generation coverage in `packages/prediction-engine/src/metrics/__tests__/metric-source-payload-rights.test.ts`

This is not a claim that any metric is validated for public/API exposure. The metrics are usable as governed shadow primitives until model cards, drift cards, validation reports, and source-rights envelopes support promotion.

## Metric Asset Backlog

Build in this order for proprietary football metrics:

1. API response-envelope filtering with proprietary metric payload-rights checks
2. QB Burden Index - implemented as `SHADOW`; validation, model/drift cards, and promotion remain future gates.
3. Role Volatility Index - implemented as `SHADOW`; validation, model/drift cards, and promotion remain future gates.
4. Calibration Integrity Grade
5. No-Bet Pressure
6. Playable Window Score
7. Market Mirage Score
8. Portfolio Fit Score
9. Drift Pressure Index
10. Conformal Uncertainty Width
11. Source Trust Score
12. Stale Line Risk Score - implemented as `SHADOW`; validation, model/drift cards, and promotion remain future gates.

Product/governance backlog from the doctrine and competitive map:

1. Keep source-policy fixture alignment green whenever the canonical web source-rights registry changes.
2. Apply generated model/drift cards to owner-approved promoted metric evidence packets after source-policy generation.
3. Market Intelligence v2: stale-line risk now has a shadow primitive; consensus fragility, move quality, book dispersion, market mirage, and playable window remain future work.
4. No-Bet/Decision Intelligence: no-bet strength, refusal reasons, calibration sufficiency, model disagreement, volatility pressure, and responsible-gaming warnings.
5. Evidence API contracts: board, game evidence, calibration summary, slate intelligence, player expected metrics, and signed webhooks.
6. Content claim governance: evidence refs, risk level, disclosure status, responsible-gaming status, publish status, and manual review.
7. API security spine: auth, scopes, field-level rights filtering, rate limits, response envelopes, request IDs, usage logs, signed webhooks, and OpenAPI.

Competitive positioning encoded by the backlog:

- Do not sell raw odds as the product.
- Do sell derived decision intelligence with freshness, source-rights, calibration, uncertainty, and no-bet context.
- Do not copy competitor datasets or restricted APIs.
- Do build independently derived metrics from cleared data and expose evidence summaries, not protected machinery.

## Verification

Commands and current results:

```bash
npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/data-reliability-index.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/expected-completion.test.ts src/metrics/__tests__/gse-signal-score.test.ts
npm run typecheck --workspace=packages/prediction-engine
npm run test --workspace=packages/prediction-engine
npm run typecheck --workspaces --if-present
npm run lint --workspaces --if-present
npm run guardrails
```

Recorded run on 2026-07-04:

| Command | Result |
| --- | --- |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/data-reliability-index.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/expected-completion.test.ts src/metrics/__tests__/gse-signal-score.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts` | PASS - 7 files, 25 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/metrics/__tests__/receiver-difficulty.test.ts src/metrics/__tests__/expected-yac.test.ts` | PASS - 4 files, 11 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/stale-line-risk-score.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 4 files, 16 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` after Stale Line Risk Score | FAIL then PASS - first run caught strict indexed driver access in the new test; after replacing it with a `.some(...)` assertion, package typecheck passed. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Stale Line Risk Score | PASS - 93 files, 817 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/qb-burden-index.test.ts src/metrics/__tests__/expected-completion.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | FAIL then PASS - first run caught low-uncertainty expectation with proxy-heavy input; second run caught manual-review posture expected as HIGH instead of MEDIUM. After fixture corrections, 4 files and 15 tests passed. |
| `npm run typecheck --workspace=packages/prediction-engine` after QB Burden Index | PASS - prediction-engine TypeScript checked after QBI implementation and exports. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after QB Burden Index | PASS - 94 files, 821 tests. |
| `npm run typecheck` after QB Burden Index | PASS - all workspaces with typecheck scripts completed. |
| `npm run lint` after QB Burden Index | PASS - root lint completed through `@sports/web` ESLint with max warnings 0. |
| `npm run guardrails` after QB Burden Index | PASS - trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed. |
| segmented workspace tests after QB Burden Index | PASS - apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 94 / 821; types 1 / 31. Aggregate segmented receipt: 655 files / 8161 tests. |
| `git diff --check` after QB Burden Index | PASS - no whitespace errors. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/role-volatility-index.test.ts src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts src/nfl/__tests__/gse-nfl-metrics.test.ts` | PASS - 4 files, 20 tests after adding blocked-source fail-closed coverage. |
| `npm run typecheck --workspace=packages/prediction-engine` after Role Volatility Index | PASS - prediction-engine TypeScript checked after RVI implementation and stricter source-policy gate. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Role Volatility Index | PASS - 95 files, 826 tests. |
| `npm run typecheck` after Role Volatility Index | PASS - all workspaces with typecheck scripts completed. |
| `npm run lint` after Role Volatility Index | PASS - root lint completed through `@sports/web` ESLint with max warnings 0. |
| `npm run guardrails` after Role Volatility Index | PASS - trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed. |
| segmented workspace tests after Role Volatility Index | PASS - apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 95 / 826; types 1 / 31. Aggregate segmented receipt: 656 files / 8166 tests. |
| `git diff --check` after Role Volatility Index | PASS - no whitespace errors. |
| `npm run typecheck` after Stale Line Risk Score | PASS - all workspaces with typecheck scripts completed. |
| `npm run lint` after Stale Line Risk Score | PASS - root lint completed through `@sports/web` ESLint with max warnings 0. |
| `npm run guardrails` after Stale Line Risk Score | PASS - trust, model-freeze, draft-only, Claude API, secret scan, API v1 boundary, frontier guards, AWS compatibility, and eval contracts passed. |
| `npm run test --workspaces --if-present` after Stale Line Risk Score | PASS - command exited 0. Tool transcript was truncated before the final aggregate summary, so segmented workspace summaries below provide the counted receipt. |
| segmented workspace tests after Stale Line Risk Score | PASS - apps/web 537 files / 7105 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 93 / 817; types 1 / 31. Aggregate segmented receipt: 654 files / 8157 tests. |
| `git diff --check` after Stale Line Risk Score | PASS - no whitespace errors. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/rush-environment-index.test.ts src/metrics/__tests__/expected-rush-yards.test.ts src/metrics/__tests__/rush-over-expected.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 5 files, 15 tests after registry split. |
| `npm run typecheck --workspace=packages/prediction-engine` after Expected Rush Yards/Rush Over Expected | PASS. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after Expected Rush Yards/Rush Over Expected | PASS - 89 files, 794 tests. |
| `npm run typecheck` after Expected Rush Yards/Rush Over Expected | PASS. |
| `npm run lint` after Expected Rush Yards/Rush Over Expected | PASS. |
| `npm run guardrails` after Expected Rush Yards/Rush Over Expected | PASS. |
| `npm run test --workspaces --if-present` after Expected Rush Yards/Rush Over Expected | WRAPPER TIMEOUT - hit the 300s tool ceiling; decomposed into segmented workspace runs. |
| segmented workspace tests after Expected Rush Yards/Rush Over Expected | PASS - apps/web six chunks covered 531 files / 7056 tests; crypto 1 / 13; data-ingestion 16 / 131; ingestion-pipeline 6 / 60; prediction-engine 89 / 794; types 1 / 31. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/residual-rollup.test.ts src/metrics/__tests__/yac-creation.test.ts src/metrics/__tests__/rush-over-expected.test.ts` | PASS - 3 files, 9 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/residual-rollup.test.ts` after direct mixed-rollup guard | PASS - 1 file, 6 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` after residual rollup helper | PASS. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after residual rollup helper | PASS - 90 files, 800 tests. |
| `npm run typecheck` after residual rollup helper | PASS. |
| `npm run guardrails` after residual rollup helper | PASS. |
| `npm run lint && git diff --check` after residual rollup helper | PASS. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-evidence-cards.test.ts src/metrics/__tests__/residual-rollup.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 3 files, 18 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-evidence-cards.test.ts` after evidence-card cleanup | PASS - 1 file, 6 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` after evidence-card generators | PASS. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after evidence-card generators | PASS - 91 files, 806 tests. |
| `npm run typecheck && npm run guardrails && npm run lint && git diff --check` after evidence-card generators | PASS. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-source-payload-rights.test.ts` after source-policy adapter | PASS - 1 file, 8 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` after source-policy adapter | PASS. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after source-policy adapter | PASS - 91 files, 808 tests. |
| `npm run typecheck && npm run guardrails && npm run lint && git diff --check` after source-policy adapter | PASS. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-payload-envelope.test.ts src/metrics/__tests__/metric-source-payload-rights.test.ts` after payload-envelope filter | PASS - 2 files, 12 tests. |
| `npm run test --workspace=@sports/web -- __tests__/fences-and-adapters.test.ts` after app metric payload bridge | PASS - 1 file, 9 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` after payload-envelope filter | PASS. |
| `npm run typecheck --workspace=@sports/web` after app metric payload bridge | PASS. |
| `npm run test --workspace=packages/prediction-engine -- --reporter=dot --silent` after payload-envelope filter | PASS - 92 files, 812 tests. |
| `npm run typecheck` after payload-envelope filter | PASS. |
| `npm run guardrails` after payload-envelope filter | PASS. |
| `npm run lint && git diff --check` after payload-envelope filter | PASS. |
| `npm run typecheck --workspace=packages/prediction-engine` on 2026-07-05 receiving slice | PASS. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 1 file, 6 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-source-payload-rights.test.ts` | PASS - 1 file, 6 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` | PASS. |
| `npm run test --workspace=packages/prediction-engine` | PASS - 82 files, 779 tests. |
| `npm run typecheck --workspaces --if-present` | PASS - web, crypto, data-ingestion, db, ingestion-pipeline, prediction-engine, types, and all four worker packages. |
| `npm run lint --workspaces --if-present` | PASS - web lint completed with `--max-warnings=0`. |
| `npm run guardrails` | PASS - trust-gate, model-freeze, draft-only, Claude API usage, secret scan, eval contracts. Latest scan covered 1139 trust-gate files and 3145 tracked files for secrets. |
| `npm run test --workspaces --if-present` | WRAPPER TIMEOUT - the single workspace wrapper exceeded the 300s MCP capture ceiling before returning output. It was decomposed into package runs below. |
| `npm run test --workspace=apps/web` split into five 100-file chunks with `--reporter=dot` | PASS - 500 files, 6658 tests. |
| `npm run test --workspace=packages/crypto` | PASS - 1 file, 13 tests. |
| `npm run test --workspace=packages/data-ingestion` | PASS - 16 files, 131 tests. |
| `npm run test --workspace=packages/ingestion-pipeline` | PASS - 6 files, 60 tests. |
| `npm run test --workspace=packages/types` | PASS - 1 file, 31 tests. |
| `git diff --check` | PASS. |
| OMO TypeScript no-excuse checker | NOT COMPLETED - host has no `bun`; `npm exec tsx` fallback found `tsx` but the plugin-local checker could not resolve its `typescript` package from the plugin directory. Repo typecheck/lint/tests were used as enforceable gates. |

Pure LOC review for new source files:

| File | Pure LOC |
| --- | ---: |
| `metric-birth-certificate.ts` | 150 |
| `driver.ts` | 25 |
| `math.ts` | 50 |
| `shrinkage.ts` | 39 |
| `validation.ts` | 63 |
| `data-reliability-index.ts` | 84 |
| `market-gravity-index.ts` | 98 |
| `stale-line-risk-score.ts` | 131 |
| `expected-completion.ts` | 110 |
| `qb-burden-index.ts` | 156 |
| `role-volatility-index.ts` | 166 |
| `gse-signal-score.ts` | 113 |
| `yac-creation.ts` | 88 |
| `rush-environment-index.ts` | 108 |
| `metric-asset.ts` | 105 |
| `metric-graduation.ts` | 80 |
| `source-rights.ts` | 205 |
| `payload-rights.ts` | 110 |
| `metric-source-payload-rights.test.ts` | 112 |

`source-rights.ts` is in the 200-250 warning band. Keep the next expansion split by responsibility: move policy data to a fixture/policy table file before adding more sources.

2026-07-05 receiving/rushing continuation check:

- `metric-birth-certificate.ts` measured 226 pure LOC after adding YAC Creation and Rush Environment Index.
- `yac-creation.test.ts` measured 52 pure LOC.
- `rush-environment-index.test.ts` measured 57 pure LOC.
- Escape-hatch scan over new metric code found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, or enums.
- `npx prettier --check ...` could not run because npm tried to fetch Prettier and failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; no package install or dependency change was attempted.

2026-07-05 rushing continuation check:

- `metric-birth-certificate.ts` was split into a 74 pure LOC contract/lookup file plus a 193 pure LOC `metric-birth-certificate-registry.ts` data registry before commit.
- `expected-rush-yards.ts` measured 95 pure LOC.
- `rush-over-expected.ts` measured 88 pure LOC.
- `expected-rush-yards.test.ts` measured 53 pure LOC.
- `rush-over-expected.test.ts` measured 52 pure LOC.
- Targeted metric tests passed after the registry split: `metric-birth-certificate.test.ts`, `rush-environment-index.test.ts`, `expected-rush-yards.test.ts`, `rush-over-expected.test.ts`, and `metric-asset-graduation.test.ts` (5 files, 15 tests).

2026-07-05 residual rollup continuation check:

- `residual-rollup.ts` measured 220 source lines after removing an unnecessary type assertion.
- `residual-rollup.test.ts` measured 142 source lines.
- Escape-hatch scan over the new rollup files found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, enums, or remaining type assertions.
- Targeted rollup tests passed: `residual-rollup.test.ts`, `yac-creation.test.ts`, and `rush-over-expected.test.ts` (3 files, 9 tests).
- Direct mixed-rollup guard test passed after adding a same metric/player/season assertion (1 file, 6 tests).
- Prediction-engine typecheck passed after adding rollup exports.
- Full prediction-engine Vitest passed after adding residual rollups (90 files, 800 tests).
- Root typecheck, root lint, root guardrails, and `git diff --check` passed after adding residual rollups.

2026-07-05 metric evidence-card continuation check:

- `metric-evidence-cards.ts` measured 197 source lines after import cleanup.
- `metric-evidence-cards.test.ts` measured 131 source lines.
- Escape-hatch scan over the new evidence-card files found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, enums, or type assertions.
- Targeted evidence-card tests passed with residual-rollup and metric-asset graduation tests (3 files, 18 tests).
- Evidence-card cleanup tests and prediction-engine typecheck passed.
- Full prediction-engine Vitest passed after evidence-card generators (91 files, 806 tests).
- Root typecheck, root guardrails, root lint, and `git diff --check` passed after evidence-card generators.

2026-07-05 source-policy generation continuation check:

- `source-rights-registry-adapter.ts` measured 71 source lines.
- `source-rights-registry-fixtures.ts` measured 180 source lines.
- `metric-source-payload-rights.test.ts` measured 159 source lines after adding fixture alignment coverage.
- Escape-hatch scan over the adapter, fixtures, and source/payload-rights tests found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, enums, or type assertions.
- Targeted source/payload-rights tests passed after generated policy wiring (1 file, 8 tests).
- Prediction-engine typecheck passed after generated policy wiring.
- Full prediction-engine Vitest passed after generated policy wiring (91 files, 808 tests).
- Root typecheck, root guardrails, root lint, and `git diff --check` passed after generated policy wiring.

2026-07-05 payload-envelope continuation check:

- `payload-envelope.ts` adds a package-owned API/default envelope filter for metric fields.
- The helper calls proprietary metric payload-rights before adding any metric field to the output payload.
- API exposure keeps derived metrics and public drivers only when generated source policies allow derived API use.
- Raw source values and protected weights are excluded from API payloads and reported as blocked fields.
- The app API-v1 bridge delegates metric-shaped payload fields into `@sports/prediction-engine`; it does not duplicate the metric rights rules.
- Targeted prediction-engine payload-envelope/source-rights tests passed (2 files, 12 tests).
- Targeted app fence/API adapter tests passed (1 file, 9 tests).
- Prediction-engine and app workspace typechecks passed.
- Full prediction-engine Vitest passed (92 files, 812 tests).
- Root typecheck, root guardrails, root lint, and `git diff --check` passed.

2026-07-06 Stale Line Risk Score continuation check:

- `stale-line-risk-score.ts` adds a governed `SHADOW` market-risk metric over line age, freshness TTL, source coverage, contradiction pressure, source-rights cleanliness, book dispersion, and line movement audit pressure.
- The metric is a stale-market risk gate, not a playable-edge score and not win probability.
- Any stale line snapshot hard-blocks market-signal use with `band: "BLOCK"` and `marketSignalAllowed: false`.
- Outputs expose public drivers only; protected component weights, thresholds, and market-type dispersion scales stay in the birth certificate as protected components.
- Directional tests prove stale age, low source count, contradiction, and unclear/blocked rights increase risk.
- Focused SLRS tests passed (4 files, 16 tests), full prediction-engine tests passed (93 files, 817 tests), root typecheck/lint/guardrails passed, the all-workspaces test wrapper exited 0, segmented workspace summaries passed (654 files, 8157 tests), and `git diff --check` passed.

2026-07-06 QB Burden Index continuation check:

- `qb-burden-index.ts` adds a governed `SHADOW` passing metric on top of the proprietary metric foundation, separate from the older compatibility `nfl/qb-burden.ts` export.
- The metric is contextual burden, not quarterback quality, win probability, model confidence, or a pick signal.
- Pressure, throw depth, late/down-distance friction, weather, line disruption, and harder expected-completion context increase burden.
- Source posture is explicit: clean sources can support lower uncertainty, manual-review sources raise uncertainty, and blocked modeling posture returns `sourcePosture: "BLOCKED"` with high uncertainty.
- Focused tests passed after two red/green corrections; full prediction-engine tests passed (94 files, 821 tests), package typecheck passed, root typecheck/lint/guardrails passed, segmented workspace summaries passed (655 files, 8161 tests), and `git diff --check` passed.

2026-07-06 Role Volatility Index continuation check:

- `role-volatility-index.ts` adds a governed `SHADOW` role-instability metric over snap-share movement, target/carry/route opportunity movement, depth-chart shock, injury/return uncertainty, teammate role shock, sample size, usage freshness, and source-policy posture.
- The metric is role volatility, not player quality, win probability, model confidence, or a pick signal.
- Stale usage evidence hard-blocks role-signal use with `volatilityBand: "BLOCK"`, high uncertainty, and `roleSignalAllowed: false`.
- Blocked modeling source posture also disables role-signal use, even when usage evidence is fresh.
- Outputs expose public drivers only; protected weights, freshness thresholds, proxy transforms, and source-posture scaling stay private.
- `role-volatility-index.ts` measured 166 pure LOC and `role-volatility-index.test.ts` measured 94 pure LOC.
- Escape-hatch scan over the RVI source and test files found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, or non-null property access.
- Focused RVI tests passed after adding blocked-source fail-closed coverage (4 files, 20 tests). Package typecheck passed. Full prediction-engine tests passed (95 files, 826 tests). Root typecheck/lint/guardrails passed. Segmented workspace summaries passed (656 files, 8166 tests). `git diff --check` passed.

## Next Slice Recommendation

Next slice should build on the concrete Source Rights Layer, Payload Rights Engine, residual rollup helper, evidence-card generators, and generated source policies:

1. Add Playable Window Score only after Stale Line Risk Score, Market Gravity, QBI, RVI, and no-bet veto inputs can be composed without claiming playable edge.
2. Add model-card and drift-card generation coverage for every newly added market/passing/role metric family before any public/API exposure.
3. Add QBI/RVI model-card and drift-card fixture coverage without changing lifecycle or public/API exposure.
4. Add local validation fixtures for role-stability splits before any RVI public/API exposure.
