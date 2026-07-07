# Model Calibration

Existing calibration surfaces:
- `packages/prediction-engine/src/probability-calibration.ts`
- `packages/prediction-engine/src/calibration-map.ts`
- `packages/prediction-engine/src/calibration-drift.ts`
- Tests under `packages/prediction-engine/src/__tests__/calibration-*.test.ts`

Calibration rules:
- Brier score and ECE claims require measured output.
- Calibration changes must record baseline window, recent window, sample size, metric definitions, and command output.
- Fixture-only demonstrations are acceptable only when labeled as fixture-only.

Blocked claim example:
- Do not write `.5+ Brier/ECE gain` unless a repo-data report proves the exact number.

Current implementation:
- No new model runtime was added.
- MC Dropout remains a documented contract idea unless the owner approves an ML runtime.
