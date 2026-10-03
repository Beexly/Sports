# CALIBRATION_ADJUSTMENTS enable runbook (default OFF)

**Do not enable while eligibility is RED.**

## Preconditions (all required)
1. Live ops truth eligibility **GREEN×K** (default K=3) on frequentist maps.
2. Offline time-holdout bake-off on **canonical WIN/LOSS** learning-eligible rows:
   - Methods: Raw · Temperature · MAP Platt IRLS · hierarchical EB-τ
   - Holdout Brier ≤ 0.22, ECE ≤ 0.05, Murphy R ≤ 0.05
3. Founder sets **`CALIBRATION_ADJUSTMENTS_ENABLED=true`** once (not auto).
4. MODEL_VERSION / map artifact versioned; no silent swap without deploy note.

## If holdout fails
Do **not** enable. See `BAKEOFF_FLOOR_STRESS.md` / resolution diagnosis.
Recalibration alone will not invent ranking power.
