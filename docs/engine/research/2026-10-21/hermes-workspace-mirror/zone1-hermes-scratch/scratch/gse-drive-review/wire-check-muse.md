# Wire check (Muse) — pass2-glm.md revised wires vs C:\Users\Garrett\Sports-wt-intel

Read-only. No checkout modified. No fit invented. Statuses: EXISTS / PARTIAL / ABSENT per file + behavior.

## 1. ECE bake-off trio (pass2-glm wire #4 re-scope)

### `identical-row-bakeoff.ts` — PARTIAL
- Path: `C:\Users\Garrett\Sports-wt-intel\apps\web\lib\calibration\identical-row-bakeoff.ts` — EXISTS.
- Test: `apps/web/__tests__/identical-row-bakeoff.test.ts` exists.
- Debiased or adaptive ECE in this file: ABSENT. It imports only `brierDecomposition, expectedCalibrationError` from `@sports/prediction-engine` and reports `ece: expectedCalibrationError(samples)` (`scoreIdenticalRows`, line 386). No import of `ece-debiased.ts`, no `debiased`, no adaptive binner.
- Function name quoted: `expectedCalibrationError`

### `ece-debiased.ts` — EXISTS
- Path: `C:\Users\Garrett\Sports-wt-intel\apps\web\lib\calibration\ece-debiased.ts` — EXISTS.
- Test: `apps/web/__tests__/ece-debiased.test.ts` exists.
- Debiased ECE: present. Reports both the Monte-Carlo null and the per-bin variance correction, returning `{ raw, noise, noiseAnalytic, debiased, reliability, reliabilityNoise, bins, replications }`.
- Function name quoted: `debiasedExpectedCalibrationError`
- Note: consumers exist outside the bake-off — `metric-slices.ts` (`eceDebiased: corrected.debiased`) and `skill-metrics.ts` call `debiasedExpectedCalibrationError`, but `identical-row-bakeoff.ts` itself does not.

### `calibration-map-bakeoff.ts` — PARTIAL
- Path: `C:\Users\Garrett\Sports-wt-intel\apps\web\lib\calibration\calibration-map-bakeoff.ts` — EXISTS.
- Test: `apps/web/lib/calibration/calibration-map-bakeoff.test.ts` exists.
- Main `decomp()` rows: plain `expectedCalibrationError(samples)` (line 66) — no debiased ECE on the rows.
- The file's `adaptive` hits are the Hedge adaptive-δ analysis (`analyzeAdaptiveDeltaHedge`), NOT an ECE binner. Partial credit only: `cvSelect` reports an OOF equal-mass (quantile/adaptive-bin) ECE via the package selector.
- Function names quoted: `expectedCalibrationError` (rows); `selectCalibrator` / `equalMassEce` (package `calibration-map.ts`, surfaced as `cvSelect.rawOofEce`)
- Net for wire #4's "adopt the adaptive/debiased ECE reading as the reported binner": the debiased function exists and is consumed by metric slices, but neither bake-off file reports it on its own rows, and no adaptive-bin ECE is the reported binner in either file. Agrees with pass2-glm.md's own line-39 caveat.

## 2. BT-UQ gate (pass2-glm wire #2 re-scope)

### `2110-03874-bradley-terry-uq.ts` — PARTIAL (file EXISTS, gate refusal ABSENT)
- Path: `C:\Users\Garrett\Sports-wt-intel\apps\web\lib\calibration\2110-03874-bradley-terry-uq.ts` — EXISTS.
- Test: `apps/web/lib/calibration/2110-03874-bradley-terry-uq.test.ts` exists.
- Connectivity (Condition 4.1) or sample-size gate refusal: ABSENT. No `throw`, no connectivity check, no sample gate in the module or its test (grep for `refus|gate|connect|throw|insufficient|sample` hits only the header comment and `ENABLED`).
- What IS there (quoted, not a new design):
  - Module-level kill switch: `export const ENABLED = false` with header "Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL)."
  - CI-covers-0.5 abstention policy, not a connectivity/sample refusal:
    - `shouldAbstain` — `return ci.lo <= 0.5 && ci.hi >= 0.5;`
  - Supporting machinery: `btFit`, `btStandardErrors`, `winProbWithCI`, `btFitDecayed`, `DECAY_LAMBDAS = [0.9, 0.95, 0.98]`.
- So the "evaluate/enable-gate the existing module" re-scope is directionally valid (the fit + CI + abstention exist), but the Condition-4.1 connectivity guardrail and any sample-gate refusal would be new code, not an existing refusal.

## 3. Holdout bridge premise (pass2-glm wire #1, unchanged)

### `from-bridge.ts` — EXISTS (refusal confirmed, quoted)
- Path: `C:\Users\Garrett\Sports-wt-intel\packages\ingestion-pipeline\src\reasoning-trace\from-bridge.ts` — EXISTS.
- Test: `packages/ingestion-pipeline/src/reasoning-trace/from-bridge.test.ts` exists.
- Already refuses a holdout row with no stored bridge premise — `traceHoldoutGame`, empty-premise branch:
  - `claim: "no bridge payload is stored on this holdout row"`
  - `refused: \`${row.game_id} has no bridge result\``
- Header confirms the policy: "This file does not invent a probability, and it does not pass scores or home_win into the trace." No made-up probability is stored or proposed here.
