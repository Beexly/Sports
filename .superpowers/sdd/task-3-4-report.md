# Tasks 3 & 4 Implementation Report: Market Pricing Kernel, FTN Scheme Effects, Effective-Competitor Scaling, Injury Overlay v2, and Rolling Film-Review Cadence

**Timestamp:** 2026-10-28T22:45:00Z  
**Branch:** `engine/public-baseline-2026-10-24` (`C:\Users\Garrett\Sports`)  
**Status:** COMPLETE — All tests verified passing (28/28 Pytest, 12/12 Vitest)

---

## 1. Executive Summary

Tasks 3 and 4 operationalize the empirical market pricing kernel, FTN scheme effects, effective-competitor concentration scaling, sealed Sinkhorn injury overlays, and the 5-phase per-game rolling simulation cadence across Sunday 4:00 PM CT autopsies through T-48h early-morning 10,000-run simulation ticks.

All files have been integrated into `scripts/ops/`, `data/market/`, and `packages/prediction-engine/` with zero regressions on existing baseline suites.

---

## 2. Task 3 Deliverables

### A. Market Kernel Database: `data/market/circa_observations.db`
- Copied from `C:\Users\Garrett\Downloads\circa_observations.db`.
- Contains 6 observable tables: `odds_snapshots` (448 rows), `openings` (336 rows), `sharp_moves`, `injuries`, `weather`, and `limits`.

### B. Circa Collector: `scripts/ops/collect_circa.py`
- Passive collector parsing SBR `__NEXT_DATA__` envelopes, VegasInsider Schema.org `ld+json`, and Open-Meteo.
- Writes raw observations directly to SQLite.

### C. GSE Injury Overlay v2: `scripts/ops/gse_injury_overlay_v2.py`
- Solves entropy-regularized optimal transport (Sinkhorn) between pre-injury shares and post-injury shares under a sealed role-cost matrix.
- Multiplies feasible shares by the sealed Tuesday 04:00 CT EPA dropoff table (`EPA_DROPOFF_SHA256`).
- Verified via `scripts/ops/tests/test_gse_injury_overlay_v2.py` (19/19 passing).

### D. FTN Scheme Effects: `scripts/ops/scheme_effects.py`
- Joins FTN charting (box counts, rushers, motion, play-action, RPO, screens, QB-fault sacks) with play-by-play EPA.
- Estimates empirical scheme deltas and QB decision quality.

### E. Effective-Competitor Scaling: `scripts/ops/load_scaling.py`
- Preserves existing `effective_n`, `load_multiplier`, and `scale_dropoff`.
- Implements and exports:
  - `effective_competitors(shares: list[float]) -> float`:
    Computes $N_{\text{eff}} = 1.0 / \sum_i s_i^2$ on normalized positive shares.
    If all shares are `<= 0` or empty, returns `1.0` (clamped to `[1.0, max(1.0, float(len(shares)))]`).
    Returns exactly `5.0` on `[0.2]*5`.
  - `scale_concentration_n_eff(shares: list[float], target_n_eff: float) -> list[float]`:
    Scales concentration in effective-count space $N_{\text{eff}} = 1/\text{HHI}$ (Davies 2025, `FOUR_ASKS_2026-10-27.md`).
    Returns a valid probability vector summing to `1.0` across all regimes (uniform blend for dispersion, power/peak blend for concentration, and uniform `1.0/len(shares)` on all-zero degeneracy).

### F. Pricing Kernel Inversion: `scripts/ops/engine_reverse.py`
- Preserves existing `fit_local`, `prob`, `phi`, and `main()`.
- Implements and exports:
  - `fit_book_pricing_kernel(alt_rungs: list[tuple[float, int, int]]) -> dict[str, float]`:
    Takes `(line, over_or_home_american_odds, under_or_away_american_odds)` rungs.
    Multiplicatively de-vigs each rung to obtain fair implied probabilities.
    Inverts to standard normal quantiles via $z_i = \Phi^{-1}(y_i) = \sqrt{2} \text{erfinv}(2y_i - 1)$.
    Solves linear slope $\sigma = 1 / |b|$ and fair line $\mu = \bar{x} - \bar{z}/b$.
    Returns `{"mu": float, "sigma": float, "rmse": float}`.
    Verified on synthetic NFL ladders (RMSE < 0.0002).

### G. Test Suites:
- `scripts/ops/tests/test_gse_injury_overlay_v2.py`: 19 passed.
- `scripts/ops/tests/test_scheme_and_load_scaling.py`: 9 passed.

---

## 3. Task 4 Deliverables

### A. Public Baseline Cadence: `packages/prediction-engine/src/public-baseline/cadence.ts`
- Retains existing `CADENCE` (`length === 6`), `CadenceEntry`, `CadenceVersion`, and `cadenceIndex`.
- Defines and exports:
  - `export type GameSlotWindow = 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SNF' | 'MNF'`
  - `export type RollingPhase = 'POST_GAME_FILM_AUTOPSY' | 'MON_TUE_FINE_TUNE_SEAL' | 'T_MINUS_48H_EARLY_SIM' | 'INJURY_WEATHER_OVERLAY' | 'T_MINUS_90M_FINAL_LOCK'`
  - `export interface RollingCadenceEntry extends CadenceEntry`
  - `export const ROLLING_GAME_WINDOW_CADENCE: ReadonlyArray<RollingCadenceEntry>`
  - `export function getTMinus48hSimWindow(slot: GameSlotWindow): RollingCadenceEntry`
  - `export function getPostGameFilmReviewWindow(slot: GameSlotWindow): RollingCadenceEntry`
- Configured windows:
  - **Post-Game Film Autopsies**:
    - `SUN_EARLY`: Sun 16:00 CT (right after 12:00 PM games end)
    - `SUN_LATE`: Sun 19:30 CT
    - `SNF`: Sun 22:45 CT
    - `TNF`: Thu 22:45 CT
    - `MNF`: Mon 22:45 CT
  - **T-48h Early-Morning 10,000-Run Simulations**:
    - `TNF`: Tue 04:00 CT (out by 06:00 CT)
    - `SUN_EARLY`, `SUN_LATE`, `SNF`: Fri 04:00 CT (2 days before Sunday)
    - `MNF`: Sat 04:00 CT (2 days before Monday)
  - **Supporting Rolling Locks**:
    - `MON_TUE_FINE_TUNE_SEAL`: Tue 04:00 CT
    - `INJURY_WEATHER_OVERLAY`: Wed 17:00, Thu 16:30, Fri 16:30 CT
    - `T_MINUS_90M_FINAL_LOCK`: Thu 17:45, Sun 10:30, Sun 13:35, Sun 17:50, Mon 17:45 CT

### B. Weekly Cadence Orchestrator: `packages/prediction-engine/src/coach-sim/weekly-cadence-orchestrator.ts`
- Added `PublishGateResult`, `WeeklyCadenceSnapshot`, and `buildWeeklyCadenceSnapshot`.
- Strict Publication Gate Invariant Enforced:
  `ticket: publishGate.passes ? rawTicket : null`
  When `publishGate.passes` is `false`, `ticket` is guaranteed to be `null`.

### C. Vitest Test Suites:
- `packages/prediction-engine/src/public-baseline/__tests__/rolling-cadence.test.ts`:
  Tests `CADENCE.length === 6`, `cadenceIndex`, `getPostGameFilmReviewWindow('SUN_EARLY')` (`Sun 16:00 CT`), all other autopsy slots, `getTMinus48hSimWindow` (`Tue 04:00`, `Fri 04:00`, `Sat 04:00`), and publication gate null-ticket gating.
- `packages/prediction-engine/src/public-baseline/__tests__/public-baseline.test.ts`:
  Tests official cadence slots, Chicago timezone conversions, kickoff minus 90m, deterministic Merkle seals, and multiplicative/additive de-vigging.

### D. CLI Operational Scripts:
- `scripts/ops/post_game_film_autopsy.py`:
  CLI script supporting `--slot SUN_EARLY|SUN_LATE|SNF|TNF|MNF`. Produces film grades (EPA/play, success rate, pressure rate, explosive play rate) and pace of play metrics.
- `scripts/ops/run_weekly_cadence_tick.py`:
  CLI orchestrator running any rolling window phase (autopsies, T-48h 10,000-run sims, fine-tune seals, overlays, final locks) and enforcing publication gate tickets.
- Reports written to `docs/predictions/research/2026-10-28/`:
  - `film_autopsy_sun_early_w8.json`
  - `cadence_tick_t_minus_48h_early_sim_tnf_w8.json`
  - `cadence_tick_post_game_film_autopsy_sun_early_w8.json`
  - `cadence_tick_t_minus_48h_early_sim_sun_early_w8.json` (testing `--fail-gate` -> `ticket: null`)

---

## 4. Verification Results

### Python Verification
```
Command: pytest scripts/ops/tests/test_scheme_and_load_scaling.py scripts/ops/tests/test_gse_injury_overlay_v2.py -v
Output: 28 passed in 1.11s
```

### TypeScript / Vitest Verification
```
Command: npx vitest run packages/prediction-engine/src/public-baseline/__tests__/rolling-cadence.test.ts packages/prediction-engine/src/public-baseline/__tests__/public-baseline.test.ts
Output:
 ✓ packages/prediction-engine/src/public-baseline/__tests__/public-baseline.test.ts (6 tests)
 ✓ packages/prediction-engine/src/public-baseline/__tests__/rolling-cadence.test.ts (6 tests)
 Test Files  2 passed (2)
      Tests  12 passed (12)
   Duration  846ms
```

### Regression Verification
- `packages/prediction-engine/src/coach-sim/weekly-cadence-orchestrator.test.ts`: 6 passed
- `packages/prediction-engine/src/public-baseline/public-path.test.ts`: 10 passed

---

## 5. Standalone Execution Demonstration

```powershell
# Post-Game Film Autopsy (Sunday 4:00 PM CT)
python scripts/ops/post_game_film_autopsy.py --slot SUN_EARLY
# Output: Post-game film autopsy written to docs\predictions\research\2026-10-28\film_autopsy_sun_early_w8.json
# Slot: SUN_EARLY (Sun 16:00 CT), Games reviewed: 3, Merkle: 16ee10a44d241631...

# T-48h Early-Morning Simulation (Tuesday 04:00 CT for TNF)
python scripts/ops/run_weekly_cadence_tick.py --slot TNF --phase T_MINUS_48H_EARLY_SIM
# Output: Cadence tick report written to docs\predictions\research\2026-10-28\cadence_tick_t_minus_48h_early_sim_tnf_w8.json
# Phase: T_MINUS_48H_EARLY_SIM | Slot: TNF (Tue 04:00 CT) | Publish Gate: PASS | Ticket: True

# Gate Failure Simulation Verification
python scripts/ops/run_weekly_cadence_tick.py --slot SUN_EARLY --phase T_MINUS_48H_EARLY_SIM --fail-gate
# Output: Cadence tick report written to docs\predictions\research\2026-10-28\cadence_tick_t_minus_48h_early_sim_sun_early_w8.json
# Phase: T_MINUS_48H_EARLY_SIM | Slot: SUN_EARLY (Fri 04:00 CT) | Publish Gate: FAIL | Ticket: False
```

---

## 6. Operational Invariants Verified
1. **Zero Subagents:** All actions performed directly by implementer.
2. **Git Hygiene:** No `git add` or `git commit` run; working tree left unstaged for controller review.
3. **Strict Scoping:** Only touched designated Task 3 and Task 4 paths.
