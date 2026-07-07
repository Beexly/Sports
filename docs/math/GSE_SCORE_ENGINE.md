# GSE Score Engine

Updated: 2026-07-04

The GSE Score Engine is a shadow-only decision-quality layer. It is not wired into live pick generation, does not change production scoring, and does not claim calibrated win probability by itself.

## Purpose

The engine separates five concepts that should not be collapsed:

- modeled probability: the model parliament's estimate for the side under review.
- confidence score: decision quality from model agreement, vote quality, and evidence health.
- feature contract: whether required inputs, source policy, and freshness survive.
- calibration contract: whether probability language is earned.
- no-bet strength: how strongly the system should refuse action.

The final GSE Action Score is a 0-100 decision-quality index, not a win probability.

## Files

- `packages/prediction-engine/src/gse-score/feature-contract.ts`
- `packages/prediction-engine/src/gse-score/model-parliament.ts`
- `packages/prediction-engine/src/gse-score/no-bet-strength.ts`
- `packages/prediction-engine/src/gse-score/calibration-contract.ts`
- `packages/prediction-engine/src/gse-score/gse-action-score.ts`

## Guardrails

- Missing required data can force `HARD_PASS`.
- Stale required data can force `HARD_PASS`; stale optional data remains a warning.
- Source-rights blocks can force `HARD_PASS`.
- High expected value cannot override hard-pass data gaps.
- Model disagreement reduces confidence and increases no-bet pressure.
- Stale data increases no-bet pressure.
- Calibration claims are blocked unless the calibration contract is validated.
- Outputs expose drivers, not internal protected weights.

## Decisions

| Decision | Meaning |
| --- | --- |
| `PLAY` | Shadow score clears the local quality gates. |
| `LEAN` | Positive but not strong enough for a hard action recommendation. |
| `WATCH` | Needs monitoring; evidence is incomplete or not yet strong. |
| `PASS` | No-bet pressure or low score suppresses action. |
| `HARD_PASS` | Missing data, source rights, responsible-gaming, or other hard block prevents action. |

## Verification

```bash
npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/gse-action-score.test.ts src/gse-score/__tests__/model-parliament.test.ts src/gse-score/__tests__/no-bet-strength.test.ts
npm run typecheck --workspace=packages/prediction-engine
npm run test --workspace=packages/prediction-engine
```

Verified locally on 2026-07-04:

- Focused GSE score tests: 3 files passed, 10 tests passed.
- Prediction-engine typecheck: passed.
- Full prediction-engine tests: 74 files passed, 748 tests passed.
- Dashboard no-fake-percentage guard: 1 file passed, 284 tests passed after removing hardcoded outcome-percentage copy.
- Workspace typecheck, lint, guardrails, and `git diff --check`: passed.
- `npm run test --workspaces --if-present` exceeded the tool capture window, but the captured temp log reported no failure markers after the dashboard copy fix and included passing summaries for web, data-ingestion, prediction-engine, and types workspaces.

## Next Slice

NFL proprietary metrics v0 can use this engine as a consumer of validated, source-rights-aware features. It should remain shadow-only until metric cards, source policies, drift cards, and validation reports exist.
