# GSE Proprietary Metric Bible

Updated: 2026-07-04

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

First grounded metrics:

- `packages/prediction-engine/src/metrics/source/data-reliability-index.ts`
- `packages/prediction-engine/src/metrics/market/market-gravity-index.ts`
- `packages/prediction-engine/src/metrics/passing/expected-completion.ts`
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
- `expectedCompletionGse`
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

Slice 1 certificates:

| Metric ID | Family | Status | Public Exposure |
| --- | --- | --- | --- |
| `data-reliability-index` | source | SHADOW | grade_only |
| `market-gravity-index` | market | SHADOW | score_band |
| `expected-completion-gse` | passing | SHADOW | score_band |
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

All four metrics follow the same foundation rules as Slice 1:

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

Tests added:

- `packages/prediction-engine/src/metrics/__tests__/receiver-difficulty.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/expected-yac.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/yac-creation.test.ts`
- `packages/prediction-engine/src/metrics/__tests__/rush-environment-index.test.ts`

This is not a claim that any metric is validated for public/API exposure. The metrics are usable as governed shadow primitives until model cards, drift cards, validation reports, and source-rights envelopes support promotion.

## Metric Asset Backlog

Build in this order for proprietary football metrics:

1. Expected Rush Yards
2. Rush Over Expected
3. YAC Creation aggregation and receiver-season rollups
4. QB Burden Index
5. Role Volatility Index
6. Calibration Integrity Grade
7. No-Bet Pressure
8. Playable Window Score
9. Market Mirage Score
10. Portfolio Fit Score
11. Drift Pressure Index
12. Conformal Uncertainty Width

Product/governance backlog from the doctrine and competitive map:

1. Wire `apps/web` source-rights registry entries into metric source-policy generation instead of maintaining a mirrored package policy table by hand.
2. Model-card/drift-card generation for every promoted metric.
3. Market Intelligence v2: stale-line risk, consensus fragility, move quality, book dispersion, market mirage, and playable window.
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
| `expected-completion.ts` | 110 |
| `gse-signal-score.ts` | 113 |
| `yac-creation.ts` | 88 |
| `rush-environment-index.ts` | 108 |
| `metric-asset.ts` | 105 |
| `metric-graduation.ts` | 80 |
| `source-rights.ts` | 205 |
| `payload-rights.ts` | 110 |
| `metric-source-payload-rights.test.ts` | 112 |

`source-rights.ts` is in the 200-250 warning band. Keep the next expansion split by responsibility: move policy data to a fixture/policy table file before adding more sources.

2026-07-05 metric continuation check:

- `metric-birth-certificate.ts` measured 226 pure LOC after adding YAC Creation and Rush Environment Index.
- `yac-creation.test.ts` measured 52 pure LOC.
- `rush-environment-index.test.ts` measured 57 pure LOC.
- Escape-hatch scan over new metric code found no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, `: any`, non-null property access, or enums.
- `npx prettier --check ...` could not run because npm tried to fetch Prettier and failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`; no package install or dependency change was attempted.

## Next Slice Recommendation

Next slice should build on the concrete Source Rights Layer, Payload Rights Engine, and receiving/rushing metric slices:

1. Add Expected Rush Yards on top of `rush-environment-index`.
2. Add Rush Over Expected as a residual over Expected Rush Yards.
3. Add receiver/rusher aggregation helpers that roll play-level residuals into season/player summaries without exposing protected weights.
4. Add a registry adapter that converts `apps/web/lib/scraping/source-rights-registry.ts` entries into metric source-policy fixtures.
5. Add model-card and drift-card generators that can turn validation outputs into asset evidence.
6. Add API response-envelope filtering that calls `evaluateProprietaryMetricPayloadRights` before any field leaves the package.
