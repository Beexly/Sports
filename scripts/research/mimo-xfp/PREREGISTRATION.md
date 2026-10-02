# MIMO Program Unit 1 Pre-Registration

Written 2026-09-18 BEFORE any holdout score was computed.

Worktree: `C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18`
Branch: `mimo/mimo-xfp-2026-09-18` @ `f67631363`
Agent: mimo
Data license: nflverse (nflverse-data), CC BY 4.0. Attribution required.
Not DVOA. Not proprietary charting. MODEL_VERSION untouched.

## Definitions (fixed)

- **xFP** (expected fantasy points): what a player's opportunities were worth,
  independent of whether they converted. Opportunity inputs only.
- **FPOE**: actual fantasy points minus xFP. Conversion layer; substantially luck.
- **Buy pattern**: high xFP, negative FPOE. **Sell pattern**: low xFP, positive FPOE.
  These labels are only meaningful if the kill line below passes.

## Expectation model

Dependent variable on train seasons only: weekly PPR fantasy points.

Features (opportunity only; never realized yards, never realized TDs):
- `targets` (WR/TE/RB)
- `carries` (RB/QB/WR/TE)
- `pass_att` (QB)
- position intercept via separate rates by position group: QB, RB, WR, TE

Form per position group g, fitted on train player-weeks:

  xFP = intercept_g + b_targets,g * targets + b_carries,g * carries + b_pass,g * pass_att

(terms without support in a position group are fixed at 0, e.g. pass_att for WR)

Rates are league-average points per opportunity on train seasons. That is
role/usage expectation, not player-specific conversion.

## Fantasy scoring (one system only)

Standard PPR, as in `packages/prediction-engine/src/player-projection.ts` spirit:
- pass yard 0.04, pass TD 4, INT -2
- rush/receiving yard 0.1, TD 6, reception 1.0
- Prefer nflverse `fantasy_points_ppr` when present; else recompute from components
  with this scoring. Never mix scoring definitions across tables.

## Validation discipline

- Train / discover: seasons **<= 2019**
- Holdout (NFL-H2): seasons **2020-2025**
- 2026 is live weekly holdout; not used to fit or to claim Unit 1 passes
- Splits are by season and week groups, never random play splits
- Dependence: bootstrap over **weeks**, not over player-rows
- Population filter: player-week pairs with >= 8 opportunities in week t AND week t+1
- Same player_id, same season, consecutive weeks only

## Primary metric

Spearman rho between the week-t prediction and actual week-t+1 PPR fantasy points,
on holdout seasons 2020-2025.

- Model prediction: **xFP_t** (opportunity expectation in week t)
- Naive baseline: **raw FP_t** (actual fantasy points in week t)

Secondary (reported, not the kill): RMSE for both predictors; season-to-date
mean xFP vs mean raw FP as a second horizon if n allows.

## KILL LINE (binding)

If holdout Spearman rho(xFP) **<=** rho(raw prior FP), Unit 1 **FAILS**.
Report n, both rhos, and stop. Do not treat the FPOE stack as prop-edge support.

Inconclusive band: point estimate better but week-bootstrap 95% CI on
Delta_rho = rho(xFP) - rho(raw) includes 0. That is **not an edge**. No buy/sell
publication language.

FPOE noise rule: a weekly FPOE whose absolute value sits inside the week-bootstrap
95% interval for that player-week residual distribution is noise. No claim that
the player is "up N points" as actionable.

## Attribution string if any number ships

Data via nflverse (nflverse-data), CC BY 4.0.

## Frozen / forbidden

Do not touch: prisma schema/migrations, .github/workflows/**, scripts/guardrails/**,
.claude/**, .env*, package-lock.json. Do not bump MODEL_VERSION. Do not flip gates.
Never label anything DVOA.
