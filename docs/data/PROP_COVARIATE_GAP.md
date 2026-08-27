# PROP COVARIATE GAP — Handoff Map (covariate bus → 19 HB modules)

Status: WRITTEN + WIRED. PR per `DEEPSEEK-CONTINUE-BUS.md`.
Method tag contract: `COVARIATE_BUS_METHOD_TAG = "covariate_bus_v1"`.

## Files added/changed in this PR

| File | Role |
|------|------|
| `packages/prediction-engine/src/edge-lab/covariate-bus.ts` | Pure leak-safe NGS weekly-mean covariate extractor (pre-existing, completed). |
| `packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts` | SEP bind: bus → aDOT×SEP sample (`avgSeparation`). |
| `packages/prediction-engine/src/edge-lab/props-hb-air-yac-bind.ts` | YAC bind: bus → air+YAC sample (`avgYac`). |
| `packages/prediction-engine/src/edge-lab/covariate-pfeatures.ts` | **PFeatureSet**: slug root → HB module → file-anchored prior-input fields. |
| `packages/prediction-engine/src/edge-lab/covariate-frame-forecast.ts` | **FrameForecast**: composes p-side + `firePostedProp` (q-side COMPOSED, never replaced). |
| `…/__tests__/covariate-bus.test.ts` | Leak/fail-closed/q-contamination tests (pre-existing). |
| `…/__tests__/covariate-frame-forecast.test.ts` | PFeatureSet coverage, slug-miss fail-closed, one-sided honesty, q-compose. |

## 19 HB modules → prop slug roots → exact prior-input fields

Every `field` below is the property name in the module's exported Sample/Prior
type. Every `source` is the file that owns it. None are Odds inputs.

### 1. player_receptions — props-hb-adot-sep.ts (ADOT_SEP_METHOD_TAG) — fire-gated
- `targets` (PBP) — props-hb-catch.ts `CatchSample.targets`
- `receptions` (PBP) — props-hb-catch.ts `CatchSample.receptions`
- `airYards` (PBP) — props-hb-adot-catch.ts `AdotCatchSample.airYards`
- `avgSeparation` (BIND←NGS) — props-hb-adot-sep-bind.ts `SepBindRequest` → covariate-bus `sepForKickoff`

### 2. player_receiving_yards — props-hb-air-yac.ts (AIR_YAC_METHOD_TAG) — fire-gated
- `receptions` (PBP) — props-hb-air-yac.ts `AirYacSample.receptions`
- `airYards` (PBP) — props-hb-air-yac.ts `AirYacSample.airYards`
- `yac` (PBP) — props-hb-air-yac.ts `AirYacSample.yac`
- `avgYac` (BIND←NGS) — props-hb-air-yac-bind.ts `YacBindRequest` → covariate-bus `nextGameCovariate(receiving,avgYac)`

### 3. player_rush_yards — props-hb-rush.ts (RUSH_HB_METHOD_TAG) — fire-gated
- `attempts` (PBP) — props-hb-rush.ts `RushSample.attempts`
- `yards` (PBP) — props-hb-rush.ts `RushSample.yards`

### 4. player_rush_attempts — props-hb-rush-attempts.ts (RUSH_ATTEMPTS_HB_METHOD_TAG) — fire-gated
- `games` (PBP) — props-hb-rush-attempts.ts `RushAttemptsSample.games`
- `attempts` (PBP) — props-hb-rush-attempts.ts `RushAttemptsSample.attempts`

### 5. player_rush_tds — props-hb-rush-td.ts (RUSH_TD_HB_METHOD_TAG) — fire-gated
- `rushAtt` (PBP) — props-hb-rush-td.ts `RushTdSample.rushAtt`
- `rushTds` (PBP) — props-hb-rush-td.ts `RushTdSample.rushTds`

### 6. player_pass_yds — props-hb-pass-yards.ts (PASS_YARDS_HB_METHOD_TAG) — fire-gated
- `attempts` (PBP) — props-hb-pass-yards.ts `PassYardsSample.attempts`
- `yards` (PBP) — props-hb-pass-yards.ts `PassYardsSample.yards`

### 7. player_pass_tds — props-hb-pass-td.ts (PASS_TD_HB_METHOD_TAG) — fire-gated
- `attempts` (PBP) — props-hb-pass-td.ts `PassTdSample.attempts`
- `passTds` (PBP) — props-hb-pass-td.ts `PassTdSample.passTds`

### 8. player_completions — props-hb-comp.ts (COMP_HB_METHOD_TAG) — fire-gated
- `attempts` (PBP) — props-hb-comp.ts `CompSample.attempts`
- `completions` (PBP) — props-hb-comp.ts `CompSample.completions`

### 9. player_interceptions — props-hb-int.ts (INT_HB_METHOD_TAG) — fire-gated
- `attempts` (PBP) — props-hb-int.ts `IntSample.attempts`
- `ints` (PBP) — props-hb-int.ts `IntSample.ints`

### 10. player_sacks — props-hb-sacks.ts (SACK_HB_METHOD_TAG) — fire-gated
- `dropbacks` (PBP) — props-hb-sacks.ts `SackSample.dropbacks`
- `sacks` (PBP) — props-hb-sacks.ts `SackSample.sacks`

### 11. player_reception_tds — props-hb-rec-td.ts (REC_TD_HB_METHOD_TAG) — fire-gated
- `targets` (PBP) — props-hb-rec-td.ts `RecTdSample.targets`
- `recTds` (PBP) — props-hb-rec-td.ts `RecTdSample.recTds`

### 12. player_air_yards — props-hb-air-yac.ts (AIR_YAC_METHOD_TAG) — fire-gated
- `receptions` (PBP) — props-hb-air-yac.ts `AirYacSample.receptions`
- `airYards` (PBP) — props-hb-air-yac.ts `AirYacSample.airYards`

### 13. player_longest_reception — props-hb.ts (Gamma-Poisson base) — NOT fire-gated
- `games` (PBP) — props-hb.ts `RateSample.games`
- `total` (PBP) — props-hb.ts `RateSample.total`

### 14. player_first_td — props-hb.ts (Gamma-Poisson base) — NOT fire-gated
- `games` (PBP) — props-hb.ts `RateSample.games`
- `total` (PBP) — props-hb.ts `RateSample.total`

### 15. player_anytime_td — props-hb.ts (Gamma-Poisson base) — NOT fire-gated
- `games` (PBP) — props-hb.ts `RateSample.games`
- `total` (PBP) — props-hb.ts `RateSample.total`

## Supporting modules (not standalone slug roots, but part of the 19)

| Module | Role | Prior-input fields |
|--------|------|-------------------|
| props-hb-catch.ts (CATCH_HB_METHOD_TAG) | Beta-Binomial catch core | `targets`,`receptions` (CatchSample) |
| props-hb.ts | Gamma-Poisson base (`fitGroupPrior`,`posteriorRate`,`probOver`) | `games`,`total` (RateSample) |
| props-hb-adot-catch.ts (ADOT_CATCH_METHOD_TAG) | aDOT split | `targets`,`receptions`,`airYards` (AdotCatchSample) |
| props-hb-atd.ts (ATD_HB_METHOD_TAG) | Anytime TD (touches) | `touches`,`tds` (TouchTdSample) |
| props-hb-obs.ts | Observability / mean-variance fit | `RateSample` aggregates |
| props-hb-nested.ts | Nested-group shrinkage prior | `GroupedRateSample` |
| props-hb-snap-exposure.ts (SNAP_EXPOSURE_METHOD_TAG) | Exposure from snaps/injury | `playerSnaps`,`teamOffSnaps` (SnapSample) |

## Honesty guarantees (tested, not conventional)

- **Leak-safe**: `week=0` (NGS full-season aggregate) never selected as a
  next-game covariate; only `1..kickoffWeek-1` rows used. (`covariate-bus.ts`)
- **Fail-closed**: no prior history → `null`, never imputed; 3.0 yards never emitted.
- **q-contamination**: `P_SIDE_COVARIATE_REGISTRY` contains no `MARKET_PROP`; CI
  throws if added. (`assertPSideHasNoMarketProp`)
- **One-sided honesty**: a book posting one side is stored as one row; FrameForecast
  never invents the missing side (`prop-line-rows.ts` + `composeFrameForecast`).
- **q-compose, not q-replace**: `firePostedProp` verdict is threaded through
  FrameForecast unchanged; a no-fire gate yields `fire:false`, never a fake fire.
- **Vendor y-axis excluded**: `avgExpectedYac`, `expectedRushYards`, `ryoe`, `cpoe`
  are never emitted as p. (`CovariateField` omits them.)

## DONE_IF check

- [x] No I/O inside `CovariateRow` (type) — pure extractor
- [x] Every field in PFeatureSet file-anchored (module + symbol + schema model)
- [x] Bind map covers catch/adot-sep, air+yac, rec TD, rush, rush-att, rush-TD,
     pass-yds, pass-TD, comp, int, sacks, snap-exposure
- [x] Pregame FrameForecast object + q-compose spec (`firePostedProp` composed)
- [x] Tests fail on main today: slug-miss (`pFeatureSetFor(unknown)===null`),
     one-sided (`composeFrameForecast` honest), leak + fail-closed (pre-existing)
- [x] Wired into repo, branch, commit, PR opened
