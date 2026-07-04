# GSE Metric IP Ledger

Updated: 2026-07-04

This ledger tracks the first local NFL proprietary metric slice. These metrics are shadow-only primitives in `packages/prediction-engine/src/nfl/`; they do not publish picks, do not use live feeds, and do not claim production readiness.

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

## Next Review Gates

- Add fixture-backed season splits before any review-ready claim.
- Add source-rights adapters from the web source registry before any customer surface.
- Add drift cards from real historical distributions before any public metric card.
- Keep protected components out of public API payloads.
