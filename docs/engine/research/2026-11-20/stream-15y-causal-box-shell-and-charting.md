# Stream 15Y: Causal FTN Box-Count, Blitz & Charting Engine

- **Date:** 2026-11-20
- **Module:** `intelligence/coaching/causal_box_shell_and_charting_engine.py`
- **Data Sources (CC-BY-4.0 nflverse / FTN Charting):**
  - `data/nflverse/pbp_2026_w1_w10.parquet` inner-joined with `data/nflverse/ftn_charting_2026_w1_w10.parquet` (`25,310` REG play rows across Weeks 1–10).
  - `intelligence/coaching/data/play_by_play_2025.parquet` inner-joined with `data/nflverse/ftn_charting_2025.parquet` (`45,064` REG play rows for 2025 prior expectations and box-count baselines).
- **Critical Data Hygiene Finding:** Raw FTN `2026` `n_blitzers` contains extreme charting outlier typos (`52` and `63` extra blitzers on 2 plays). Clipping `n_blitzers` strictly to `[0, 7]`, `n_pass_rushers` to `[1, 10]`, and `n_defense_box` to `[4, 11]` prevents outlier distortion.

## Walk-Forward Out-of-Sample Results (`2026 Weeks 4..10`, `week < as_of_week`, `n = 202` Team-Games)

| Component | Decision | Empirical Bayes Config | Baseline MSE | Raw MSE | Causal EB MSE | OOS `r` | Weight |
|---|---|---|---|---|---|---|---|
| `off_rush_box_res` (`box_grp x rz x ydstogo<=2` residual) | **PROMOTED** | `b25=0.45, k=12` | `0.028238` | `0.028874` | **`0.026033`** | `+0.2696` | `1.0` |
| `off_catchable` (`is_catchable_ball` rate) | **PROMOTED** | `b25=0.45, k=12` | `0.009667` | `0.010600` | **`0.009066`** | `+0.2486` | `1.0` |
| `def_catchable_allowed` | **PROMOTED** | `b25=0.45, k=12` | `0.009667` | `0.011279` | **`0.009483`** | `+0.1425` | `1.0` |
| `def_blitz_rate` (`clip(n_blitzers,0,7)>=1`) | **PROMOTED** | `b25=0.45, k=3` | `0.018051` | `0.012768` | **`0.012223`** | **`+0.5710`** | `1.0` |
| `def_light_box_rate` (`n_defense_box<=6`) | **PROMOTED** | `b25=0.00, k=6` | `0.034581` | `0.034345` | **`0.032511`** | `+0.2378` | `1.0` |
| `off_iwt` (`is_interception_worthy`) | **NULL HOLD** | `b25=0.00, k=12` | `0.000908` | `0.001078` | `0.000916` | `+0.0130` | **`0.0`** |
| `def_box_res` (def rush box-res allowed) | **NULL HOLD** | `b25=0.00, k=12` | `0.028238` | `0.035613` | `0.029537` | `-0.1893` | **`0.0`** |

## Modeling Invariants
- Goal-line and short-yardage carries distort raw box-count rushing EPA because stacked boxes (`>=8`) cluster at short yardage/goal line. Conditioning expected rushing EPA on `(box_grp, redzone <=20, ydstogo <=2)` fitted strictly on 2025 isolates true offensive box-adjusted rushing skill (`0.028238 -> 0.026033`).
- Both interception-worthy throw rate (`off_iwt`) and defensive box-adjusted rush EPA allowed (`def_box_res`) fail OOS league baselines and are held strictly at `0.0` weight.
