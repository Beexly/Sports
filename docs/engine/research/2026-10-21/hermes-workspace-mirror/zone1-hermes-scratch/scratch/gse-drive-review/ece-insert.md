# ECE insert — bakeoff raw-ECE audit (read-only)

Scope: `C:\Users\Garrett` repo (primary). No repo files modified.
Reference implementations verified present:
- `apps/web/lib/calibration/ece-debiased.ts:104` — `export function debiasedExpectedCalibrationError(...)`
- `packages/prediction-engine/src/calibration-map.ts:373` — `export function equalMassEce(...)`

## 1. identical-row-bakeoff.ts

- File: `apps/web/lib/calibration/identical-row-bakeoff.ts`
- Raw-ECE function: `scoreIdenticalRows` (exported, line 320)
- Raw ECE line: line 386:
  `ece: expectedCalibrationError(samples),`
  inside the `IDENTICAL_ROW_SCORE_KINDS.map(...)` return (lines 371–395). Import lines 53–57 from `@sports/prediction-engine`.
- Wrapper: `buildScoreBakeoffIdenticalRows` (line 426) calls `scoreIdenticalRows` for pooled (line 438), bySport (line 442), byModelVersion (line 448), and sensitivity table (line 458).
- Callers found:
  - `apps/web/lib/calibration/proven-path-engine.ts:243` — `? buildScoreBakeoffIdenticalRows(options.identicalRows)` inside `buildProvenPathPlan`
  - `apps/web/lib/ops/proven-path-seed.ts:109` — `selectIdenticalRows(...)` (selection only, not the ECE scorer); plan built via `buildProvenPathPlan(rows, identicalRows ? { identicalRows } : undefined)` line 128
  - tests only otherwise (`apps/web/__tests__/identical-row-bakeoff.test.ts`)
- Publish-path check: no caller writes a pick. `buildProvenPathPlan` persists the plan to `jarvisMemoryEvent` via `persistProvenPathPlan` (`apps/web/lib/ops/proven-path-durable.ts:40`), not `db.pick.create`. The identical-rows slice is explicitly excluded from publish decisions:
  - `identical-row-bakeoff.ts:49-50`: `"This is MEASUREMENT ONLY. No floor, threshold, delta, pause group, gate or MODEL_VERSION reads this module; nothing here changes what publishes."`
  - `proven-path-engine.ts:232-234`: `"When supplied the plan carries scoreBakeoffIdenticalRows; it never influences bestScore, the sweep, or the pause list."`
  - Return embeds it passively at `proven-path-engine.ts:365`: `...(scoreBakeoffIdenticalRows ? { scoreBakeoffIdenticalRows } : {})`
- Verdict: **diagnostic-only**. Adding a second field (e.g. `eceDebiased`) with `ece` left unchanged would not change any published pick.

## 2. calibration-map-bakeoff.ts

- File: `apps/web/lib/calibration/calibration-map-bakeoff.ts`
- Raw-ECE function: `decomp` (local helper, line 48) — actual computation at line 66:
  `ece: expectedCalibrationError(samples),`
  Import lines 10–13 from `@sports/prediction-engine`. Public entry `runCalibrationMapBakeoff` (line 158) calls `decomp("raw", test)` (line 221) and for each map (`temperature_nll`, `platt_map_irls`, `beta_calibration`, `res_aware_beta`, `isotonic_pava`, `isotonic_cir`).
- Callers found:
  - `apps/web/app/api/cron/calibration-metrics/route.ts:512` — `const mapBake = runCalibrationMapBakeoff(samples.slice().reverse());`
  - tests only otherwise (`apps/web/lib/calibration/calibration-map-bakeoff.test.ts`, `apps/web/__tests__/calibration-map-kelly.test.ts`)
- Publish-path check: no caller writes a pick. The route handler writes diagnostics only:
  - `route.ts:512-517`: writes `calibration-map-bakeoff.json` via `writeFile`
  - `route.ts:519-520`: `await import("@/lib/ops/map-bakeoff-durable"); await persistMapBakeoff(mapBake);`
  - `apps/web/lib/ops/map-bakeoff-durable.ts:1-3`: `"Persist offline map bake-off ... Apply remains OFF — this is diagnostics only."` and `db.jarvisMemoryEvent.create` (line 14), never `db.pick.*`
  - `calibration-map-bakeoff.ts:1-2`: `"Offline map bake-off ... Apply OFF."`; return carries `applyOff: true` (line 405); `note` (lines 344–348): `"Offline only. Apply CALIBRATION_ADJUSTMENTS only after Res improves and holdout floors pass."`
- Verdict: **diagnostic-only**. Adding a second field (e.g. `eceDebiased`) with `ece` left unchanged would not change any published pick.

## Conclusion

Both bakeoffs report raw ECE beside Brier/Murphy terms and are consumed only by JSON / `jarvisMemoryEvent` diagnostics. No `db.pick.create/update/upsert` caller exists in either call chain. A purely additive `debiased` field that leaves the existing `ece` value byte-identical is publish-safe for both files.
