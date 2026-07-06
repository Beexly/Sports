# GSE Metric IP Ledger

Updated: 2026-07-06

This ledger tracks local NFL proprietary metric slices. The original compatibility primitives live in `packages/prediction-engine/src/nfl/`; the governed foundation metrics live in `packages/prediction-engine/src/metrics/`. They do not publish picks, do not use live feeds, and do not claim production readiness.

## Doctrine

No number enters GSE unless it is grounded, testable, source-rights-clean, commercially useful, and able to explain its drivers without exposing protected weights.

## Implemented Birth Certificates

| Metric ID | Public Name | Family | Status | Public Exposure |
| --- | --- | --- | --- | --- |
| `gse-xcomp` | GSE xCOMP | passing | SHADOW | score_band |
| `gse-receiver-difficulty` | GSE Receiver Difficulty | receiving | SHADOW | grade_only |
| `gse-xyac` | GSE xYAC | receiving | SHADOW | score_band |
| `gse-rush-environment` | GSE Rush Environment | rushing | SHADOW | score_band |
| `gse-qb-burden` | GSE QB Burden | passing | SHADOW | grade_only |
| `gse-role-volatility` | GSE Role Volatility | role | SHADOW | driver_only |
| `stale-line-risk-score` | Stale Line Risk Score | market | SHADOW | score_band |
| `market-mirage-score` | Market Mirage Score | market | SHADOW | score_band |
| `qb-burden-index` | QB Burden Index | passing | SHADOW | score_band |
| `role-volatility-index` | Role Volatility Index | role | SHADOW | score_band |
| `playable-window-score` | Playable Window Score | decision | SHADOW | score_band |

## Guardrails

- Every metric has a birth certificate.
- Every metric returns drivers and source-policy metadata.
- Source policy blocks fail closed through `validateGseMetric`.
- Validation methods are explicit before a metric can become review-ready.
- Drift is evaluated locally with PSI thresholds.
- Private tracking outputs and unlicensed model outputs are forbidden inputs.
- The metrics are deterministic and pure TypeScript.

## Verification

Run:

```bash
npm run test --workspace=packages/prediction-engine -- src/nfl/__tests__/gse-nfl-metrics.test.ts
npm run typecheck --workspace=packages/prediction-engine
npm run test --workspace=packages/prediction-engine
```

Verified locally on 2026-07-04:

- Focused NFL metric tests: 1 file passed, 6 tests passed.
- Prediction-engine typecheck: passed.
- Full prediction-engine tests: 75 files passed, 754 tests passed.
- 2026-07-06 governed RVI focused tests: 4 files passed, 20 tests passed after adding blocked-source fail-closed coverage.
- 2026-07-06 governed PWS focused tests: 4 files passed, 17 tests passed; first package typecheck caught a non-canonical validation method name before passing after repair.
- 2026-07-06 governed PWS broad checks: prediction-engine tests passed (96 files, 832 tests); root typecheck, lint, and guardrails passed; segmented workspace tests passed across 657 files and 8172 tests.
- 2026-07-06 evidence-card fixture coverage: SLRS, QBI, RVI, and PWS fixture cards preserve `SHADOW` lifecycle, `INTERNAL` API exposure, `NOT_READY` licensing, draft-first model cards, and active drift review; focused tests passed (4 files, 26 tests), prediction-engine tests passed (96 files, 835 tests), root typecheck/lint/guardrails passed, and segmented workspace tests passed across 657 files and 8175 tests.
- 2026-07-06 validation split fixture coverage: synthetic/local RVI role-stability and PWS decision-window split fixtures preserve `SHADOW` lifecycle, `INTERNAL` API exposure, `NOT_READY` licensing, and `publicApiAllowed: false`; first focused run caught dirty clean fixtures, first typecheck caught missing `signalIntegrityIndex`, focused tests passed after repair (3 files, 16 tests), prediction-engine tests passed (97 files, 840 tests), root typecheck/lint/guardrails passed, segmented workspace tests passed across 658 files and 8180 tests, and no TS escape hatches were found in the new split files.
- 2026-07-06 composed payload-envelope fixture coverage: synthetic/local PWS, GSS, SLRS, QBI, RVI, and MMS payload fixtures approve only derived scores, bands, summaries, confidence meaning, market-interpretation allowance, and public drivers while blocking protected weights, raw values, provider IDs, unsupported probability claims, and uncleared fallback source fields; focused tests passed before MMS (3 files, 17 tests), MMS payload integration passed (prediction-engine 6 files, 31 tests; app bridge 1 file, 4 tests), prediction-engine typecheck passed, prediction-engine tests passed after MMS (99 files, 850 tests), full app tests passed (538 files, 7111 tests), segmented workspace tests passed across 661 files and 8196 tests, and no TS escape hatches were found in the new payload fixture files.
- 2026-07-06 app payload bridge coverage: the app API-v1 bridge consumes package-owned composed metric payload fixtures through `filterApiV1MetricPayloadFields`, preserves safe field approvals and unsafe field blocks, and records `liveRouteCreated: false`; focused app tests passed (2 files, 13 tests), app typecheck passed, full app tests passed (538 files, 7111 tests), root typecheck/lint/guardrails passed, `git diff --check` passed, and no TS escape hatches were found in the bridge/test files.
- 2026-07-06 governed MMS focused coverage: Market Mirage Score is a `SHADOW` market-integrity risk metric, not win probability, expected value, confidence, betting advice, or a pick trigger. It fail-closes stale/blocked market signals, blocked source posture, high no-bet pressure, high drift pressure, and high calibration debt before downstream review. The first focused run caught a noisy fixture under the intended `WATCH` threshold; after repair, focused MMS tests passed (6 files, 27 tests), prediction-engine typecheck passed, and prediction-engine tests passed (99 files, 850 tests).
- 2026-07-06 generated evidence report coverage: the shadow metric fixture set now includes SLRS, QBI, RVI, PWS, and MMS; `metric-evidence-report-markdown.ts` renders synthetic/local markdown reports with lifecycle, API, licensing, public API, and live-route locks; `docs/math/GSE_SHADOW_METRIC_EVIDENCE_REPORTS.md` is test-linked to the generated report list. Focused tests passed (2 files, 11 tests), prediction-engine typecheck passed, file length review stayed below the local warning band for new files, and no TS escape hatches were found.
- 2026-07-06 historical validation adapter coverage: the adapter reviews source rights before adapting historical-shaped RVI, PWS, and MMS records into local shadow validation inputs. Fully cleared sources adapt; manual-review sources remain manual review; permission-required/missing sources block before metric execution. Focused adapter/split/source-rights tests passed (3 files, 18 tests), prediction-engine typecheck passed, and no TS escape hatches were found.

## Next Review Gates

- Keep validation split fixtures and adapter fixtures local until real historical inputs have source-rights and payload-rights evidence.
- Add source-rights adapters from the web source registry before any customer surface.
- Add drift cards from real historical distributions before any public metric card.
- Keep app-level composed payload bridge route-free before any public/API route exposure.
- Keep protected components out of public API payloads.
- Add source-rights-reviewed historical market-mirage validation before any MMS public/API exposure or lifecycle promotion.
- Keep generated markdown reports synthetic/local until source-rights-reviewed historical evidence is added.
- Do not treat adapter success as promotion evidence; it only proves source-rights-gated adaptation behavior.
