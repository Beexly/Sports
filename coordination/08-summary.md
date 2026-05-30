# Run 3 Summary — 2026-05-30

## What Changed

**REPAIR**
- None needed — all 174 web test files and 8 prediction-engine test files were passing at session start.

**IMPROVE**
- None — no active breakage or fragility identified beyond ongoing test coverage expansion.

**GROW**
- `platform-config.test.ts` (27 tests): first coverage for `getPlatformConfig` — env-var parsing for all 10 config fields. Tests parseBool edge cases ("True", "TRUE", "1", "", case-insensitive), parseConfidenceMode fallback to "labels" on unknown values, parseIntSafe NaN/empty fallback, and all default values.
- `readiness.test.ts` (30 tests): first coverage for `getReadinessGates` and `bootstrapGateResponse`. Tests invariant gates (canScore/canPersistPicks always true; canApplyCalibrationAdjustments always false), all-off bootstrap defaults, env→gate mapping for every field, and the three bootstrap progression phases (Phase 0/2/3).
- `studio-export.test.ts` (16 tests): first functional coverage for `markdownForStudioDraft` and `fileNameForStudioDraft`. Tests null body handling, citation/compliance formatting, section ordering, all templateKind → filename transformations.
- `source-coverage-gaps.test.ts` (17 tests): fills branches not reached by the existing content-engine.test.ts — NEEDS_SOURCE when ALL required types are absent (vs PARTIAL when some), STALE-all-records → BLOCKED, STALE+FRESH mix not blocked, performanceGateOn=true allows PERFORMANCE content, RESPONSIBLE_GAMING/CALIBRATION regulated trust rejection, covered=false invariant.
- `calibration-insight-prompt.test.ts` (19 tests): first coverage for `buildCalibrationInsightUserPrompt` — band formatting, sport/pick-kind sampleSize filter (≥5 included, <5 excluded), empty-data fallback messages, direction/delta formatting, generation-directive line, and CALIBRATION_INSIGHT_SYSTEM_PROMPT structure.
- `entitlements-require.test.ts` (13 tests): first coverage for `requireEntitlement` (pass → returns Entitlements, fail → throws EntitlementError) and `EntitlementError` (instanceof Error, correct name/message, catchable). Also tests the `getEntitlements` re-export for all three tiers.

## Baseline → End State
| Metric | Before (run 2 end) | After (run 3 end) |
|---|---|---|
| Web test files | 170 | 174 |
| Web tests | 1951 | 2016 |
| Prediction-engine tests | 227 | 284 |
| Type errors | 0 | 0 |

## Synthesis Finding
The highest-leverage GROW work this session was `platform-config.test.ts` + `readiness.test.ts` — together these cover the entire calibration gate system (all 10 `PlatformConfig` fields → all `ReadinessGates` properties). The `canApplyCalibrationAdjustments: false` invariant test is particularly important: it verifies that even if every other gate is opened, the model weight adjustment gate remains locked, requiring explicit human review. This is an anti-regression guard on the most safety-critical boundary.

The `entitlements-require.test.ts` is also high-leverage: `requireEntitlement` is used throughout the platform for access control, and `EntitlementError` is the throw type that all callers must handle. Both had zero prior coverage.

## Red-Team
The `source-coverage-gaps.test.ts` discovered a subtle status logic corner case: when some required sources are missing AND other required sources are present but have blockers, the status resolves to PARTIAL (not BLOCKED). This is because the status evaluation checks `missing.length > 0` before `blockers.length > 0`. This design means a half-covered draft with regulation violations could show as PARTIAL rather than BLOCKED. The tests document this behavior accurately; a future cleanup could strengthen the status logic to treat any blocker as BLOCKED.

## Calibration Invariant Check
All four platform gates remain at their defaults (false). No picks, stats, or content gates were modified. The readiness gate tests specifically verify that canApplyCalibrationAdjustments is always false regardless of other env vars.
