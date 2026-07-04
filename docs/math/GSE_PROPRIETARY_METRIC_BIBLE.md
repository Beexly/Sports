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

## Metric Asset Backlog

Build in this order for proprietary football metrics:

1. Receiver Difficulty Index
2. Expected YAC
3. YAC Creation
4. Rush Environment Index
5. Expected Rush Yards
6. Rush Over Expected
7. QB Burden Index
8. Role Volatility Index
9. Calibration Integrity Grade
10. No-Bet Pressure
11. Playable Window Score
12. Market Mirage Score
13. Portfolio Fit Score
14. Drift Pressure Index
15. Conformal Uncertainty Width

Product/governance backlog from the doctrine and competitive map:

1. Source Rights Layer for allowed use, validation-only use, display rights, storage rights, training rights, derived exposure, and raw API exposure.
2. Payload Rights Engine so every public/API field can prove it is allowed before exposure.
3. Market Intelligence v2: stale-line risk, consensus fragility, move quality, book dispersion, market mirage, and playable window.
4. No-Bet/Decision Intelligence: no-bet strength, refusal reasons, calibration sufficiency, model disagreement, volatility pressure, and responsible-gaming warnings.
5. Evidence API contracts: board, game evidence, calibration summary, slate intelligence, player expected metrics, and signed webhooks.
6. Content claim governance: evidence refs, risk level, disclosure status, responsible-gaming status, publish status, and manual review.
7. Model-card/drift-card generation for every promoted metric.
8. API security spine: auth, scopes, field-level rights filtering, rate limits, response envelopes, request IDs, usage logs, signed webhooks, and OpenAPI.

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
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-birth-certificate.test.ts src/metrics/__tests__/data-reliability-index.test.ts src/metrics/__tests__/market-gravity-index.test.ts src/metrics/__tests__/expected-completion.test.ts src/metrics/__tests__/gse-signal-score.test.ts src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 6 files, 19 tests. |
| `npm run test --workspace=packages/prediction-engine -- src/metrics/__tests__/metric-asset-graduation.test.ts` | PASS - 1 file, 6 tests. |
| `npm run typecheck --workspace=packages/prediction-engine` | PASS. |
| `npm run test --workspace=packages/prediction-engine` | PASS - 81 files, 773 tests. |
| `npm run typecheck` | PASS on earlier full root run. Final rerun reached web/crypto/data-ingestion/db/ingestion-pipeline/prediction-engine/types before the wrapper timed; all four remaining worker typechecks were then run individually and passed. |
| `npm run lint` | PASS. |
| `npm run guardrails` | PASS - trust-gate, model-freeze, draft-only, Claude API usage, secret scan, eval contracts. Latest scan covered 1137 trust-gate files and 3142 tracked files for secrets. |
| `npm run test --workspaces --if-present` | COMPLETE PACKAGE SUMMARIES LOGGED - web 500 files/6658 tests, crypto 1/13, data-ingestion 16/131, ingestion-pipeline 6/60, prediction-engine 80/767, types 1/31. The MCP wrapper still hit its 300s capture limit before returning process status, so this row is log-evidence rather than a clean wrapper exit. |
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
| `metric-asset.ts` | 105 |
| `metric-graduation.ts` | 80 |

## Next Slice Recommendation

Next slice should build the concrete Source Rights Layer and Payload Rights Engine that feed the metric asset cards:

1. Add source-rights envelopes for nflverse, open football sources, odds inputs, and benchmark-only sources.
2. Add payload-rights evaluation for metric API fields.
3. Add model-card and drift-card generators that can turn validation outputs into asset evidence.
4. Then implement Receiver Difficulty Index and Expected YAC on the same governed foundation.
