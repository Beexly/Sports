# Session Handoff — Covariate Bus + SEP Bind + YAC Bind

## Identity
- **Session:** `stealth/ox-alpha` — Galaxy Sports Edge (independent `p` with process, then `e = p − q`).
- **Stance:** The site is a window. We do NOT build chrome. No Odds market ingestion. `priced: false` throughout.
- **Serving SHA:** `873f3151` (origin/main). #525 is on ancestor `544d0148` — slug/cap NOT redone.

## Worktrees
| Purpose | Path | Branch |
|---|---|---|
| PR 1 — covariate bus | `C:\Users\Garrett\Sports-bus` | `hermes/covariate-bus` |
| PR 2 — sep bind | `C:\Users\Garrett\Sports-bus-sep` | `hermes/ngs-sep-adot-catch` |
| PR 3 — yac bind | `C:\Users\Garrett\Sports-bus-yac` | `hermes/covariate-yac-bind` |

|`hermes/covariate-yac-bind` rebases on bus commit `5a1790dc` + sep bind.

## What shipped this turn

### PR 1 — Covariate Bus (IP): #547 ✅ (CI green, pushed, OPEN)
- **File:** `packages/prediction-engine/src/edge-lab/covariate-bus.ts`
- **Tests:** `__tests__/covariate-bus.test.ts` — 16/16 green
- **Commit:** `5a1790dc` on `origin/hermes/covariate-bus`

Contract:
- Row key: `gsisId | season | week | statType` (`receiving` | `passing` | `rushing`).
- `week=0` (season aggregate) dropped unconditionally — never a next-game covariate.
- Leak-safe: `sepForKickoff(rows, gsisId, season, kickoffWeek)` uses latest `1..kickoffWeek-1` row only. No same-week, no future. `null` → `null` (fail-closed, no impute).
- Returns `{ value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" }` — never a bare float pretending to be arrival sep.
- Exposes ONLY covariate fields. Never as `p`: `expectedCompletionPct`, `avgExpectedYac`, `expectedRushYards`, `cpoe`, `ryoe` — y-axis only.
- Added `avgYac` (L2 covariate, gap map §4) to `CovariateRow` + `CovariateField`; added `avgExpectedYac` + `expectedRushYards` as presence-only y-axis guard fields (NOT in `CovariateField`).
- Barrel exports in `index.ts`. `priced: false`. Pure, no I/O, no Prisma.

### PR 2 — SEP Bind: #548 ✅ (CI green, pushed, OPEN)
- **File:** `packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts`
- **Tests:** `__tests__/props-hb-adot-sep-bind.test.ts` — 6/6 green locally
- **Commits:** `7e966783` + `69ab88a7` on `origin/hermes/ngs-sep-adot-catch`

Contract:
- `bindSepSamples(rows, requests)` feeds `sepForKickoff` into `AdotSepCatchSample`.
- Honest header on the bind file: weekly mean ≠ catch frame. Grain forwarded verbatim.
- Fail-closed: bus returns `null` → sample DROPPED, never imputed, never 3.0 yards.
- `bindSepSamples` returns ok/no-prior-row results; `boundSepSamples` collects only bound samples.
- Barrel exports in `index.ts`: `SEP_BIND_METHOD_TAG`, `bindSepSamples`, `boundSepSamples`, `SepBindRequest`, `SepBindResult`. `priced: false`.

### PR 3 — YAC Bind: #549 ✅ (CI re-running after fix, OPEN)
- **File:** `packages/prediction-engine/src/edge-lab/props-hb-air-yac-bind.ts`
- **Tests:** `__tests__/props-hb-air-yac-bind.test.ts` — 7/7 green locally
- **Commits:** `7738dbfc` (feat) + `4d0b7781` (fix: add avgYac default to sep-bind test fixture for CovariateRow compat, pushed to origin)

Contract:
- `bindYacSamples(rows, requests)` feeds `avgYac` (weekly NGS mean per reception) from the covariate bus into `BoundAirYacSample` (extends `AirYacSample` with `avgYac: CovariateCell`).
- Honest header: weekly mean ≠ per-target arrival YAC. Grain/provenance labeled `week_t_for_tplus1` / `weekly_ngs_mean`.
- Fail-closed: bus returns `null` → sample DROPPED, never imputed, never a constant.
- `bindYacSamples` returns ok/no-prior-row results; `boundYacSamples` collects only bound samples.
- Barrel exports in `index.ts`: `YAC_BIND_METHOD_TAG`, `bindYacSamples`, `boundYacSamples`, `YacBindRequest`, `YacBindResult`, `BoundAirYacSample`. `priced: false`.

## Verification
- `npx vitest run` covariate-bus.test.ts: 16/16 pass
- `npx vitest run` props-hb-adot-sep-bind.test.ts: 6/6 pass + sep.test.ts 3/3
- `npx vitest run` props-hb-air-yac-bind.test.ts: 7/7 pass + air-yac.test.ts
- `tsc --noEmit` on `packages/prediction-engine`: clean

## Next priority — Bind #4: INT
|- Target: `props-hb-int.ts` — bind passing `aggressiveness` + `avgTimeToThrow` via the bus.
|- Fail-closed: null on either → drop sample.
|- Three fails on any file → BLOCKED that file, skip to next bind. Never idle.
|
## Completed this turn (17:21 CT)
|- Merged `hermes/h0-validation-harness` (PRs #555, #556, #557 — all green CI, all OPEN) into this branch @ `0e0cef25`.
|- H0.1 validation harness landed: `CovariateLayer`, `knownAtWeek`, `P_SIDE_COVARIATE_REGISTRY`, `assertPSideHasNoMarketProp` q-contamination guard. 19/19 + 16/16 tests green.
|- H0.2 kneel/garbage-time landed: `nfl-kneel-garbage.ts` `evaluateKneelGarbage` (C2.1 doctrine). 8/8 tests green.
|- H0.4 TPRR landed: `est-routes-tprr.ts` `estRoutesTprr` L1 exposure proxy. 5/5 tests green.
|- `props-hb-air-yac-bind.ts` now accepts `CovariateCell` from the bus (not a reconstructed object).
|- 39 affected tests green. `tsc --noEmit` clean. Push pending.
|
## Next
|- H0 top-down complete on this branch: #1 validation harness, #2 kneel/garbage-time, #4 TPRR — all landed, all green CI.
|- #553 CPOE-comp bind is already MERGED (H0 #3 / completions). Not a second covariate bus.
|- Push this branch to origin. No further work needed for H0 slices unless new branch from origin/main.
|- #525 serving SHA `544d0148` — slug/cap unchanged.

## Constraints (do not violate)
- Do NOT edit `C:\Users\Garrett\Sports` (main worktree) — work only in worktrees.
- Do NOT touch schema, `.github`, Odds, scrape.
- Gap map: `C:\Users\Garrett\Sports-p0\docs\data\PROP_COVARIATE_GAP.md` (read-only).
- #525 is on serving SHA `544d0148` — slug/cap not redone.
