# Stream 15Q: Causal FTN x PBP Non-QB-Fault Pressure Survival Hazard & Scheme Interaction (`2026-11-20`)

## 1. Architecture & Literature Grounding
- Adapts early-pressure survival decomposition (Pipping-Gamón pass-rush vs. protection rating) and Big Data Bowl coverage/motion vulnerability insights strictly onto cleared CC-BY-4.0 nflverse parquets (`pbp_2026_w1_w10.parquet` inner-joined on `(game_id, play_id) == (nflverse_game_id, nflverse_play_id)` with `ftn_charting_2026_w1_w10.parquet`: `25,310` total plays, `10,584` pass attempts).
- Isolates **Non-QB-Fault OL Pressure** (`(sack == 1 | qb_hit == 1) & ~is_qb_fault_sack`) from `is_qb_fault_sack`, fitting a 4-iteration Ridge IRLS logistic survival model over 32 offensive protections, 32 defensive rushes, and 6 FTN covariates (`is_blitz`, `heavy_rush`, `pa_f`, `motion_f`, `screen_f`, `blitz_pa`) strictly with `week < as_of_week` and catalytic shrinkage ($n / (n + 90)$).
- Computes Empirical-Bayes Motion/Play-Action EPA interaction differentials (`K0 = 55` plays) and `snap_counts_2026_w1_w10.parquet` recent-3-week starter snap continuity (`K0 = 8` starters).

## 2. Observed Walk-Forward OOS Results (`eval_weeks = 4..10`, Strictly `week < w`)
| Sub-Component | OOS Unit (`n`) | Baseline | Unadjusted Raw | Stream 15Q | Verdict & Simulator Weight |
|---|---|---:|---:|---:|---|
| **Non-QB-Fault Pressure Hazard** (IRLS Logistic) | `7,241` pass plays | Brier `0.127723` / LL `0.423324` | Brier `0.128201` / LL `0.425845` | Brier **`0.125471`** / LL **`0.413310`** | **PROMOTED** (`+0.40` logit weight; beats baseline & raw in `7/7` weeks) |
| **Motion & Play-Action Scheme Lift** | `202` team-offense games | Pass EPA MSE `0.076864` | — | MSE `0.078256` | **NULL / HOLD (`0.0` logit weight)** — logged in conditioners only |
| **EB Recent-3W Snap Continuity** | `202` team-offense games | Pass EPA MSE `0.076864` | — | MSE `0.077460` | **NULL / HOLD (`0.0` logit weight)** — logged in conditioners only |

## 3. Pre-Sim Gate Invariants
- 32 teams covered across `as_of_week=4..11`; all z-scores clamped in `[-3.0, 3.0]`.
- Exact swap symmetry (`|edge_ab - edge_ba| < 1e-6`) and net antisymmetry (`stream_15q_net_scheme_hazard_diff`) enforced fail-closed in `scripts/ops/verify_and_wire_all_layers_before_sim.py`.
