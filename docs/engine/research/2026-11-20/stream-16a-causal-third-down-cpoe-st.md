# Stream 16A: Causal 3rd-Down Defense Survival, Play-Level CPOE & Special Teams Engine

- **Date:** 2026-11-20
- **Module:** `intelligence/coaching/causal_third_down_cpoe_st_engine.py`
- **Data Sources (CC-BY-4.0 nflverse):**
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`season_type == 'REG'`)
  - `intelligence/coaching/data/play_by_play_2024.parquet` & `play_by_play_2025.parquet` (`0.35 / 0.65` priors)

## Walk-Forward Out-of-Sample Results (`2026 Weeks 4..10`, `n = 204` Team-Games)

| Component | Decision | Config | Baseline MSE | Causal EB MSE | OOS `r` | Weight |
|---|---|---|---|---|---|---|
| `def_3d_res` (`3rd-down distance-adjusted stop`) | **PROMOTED** | `b_prior=0.45, k=20` | `0.016884` | **`0.016092`** | `+0.1770` | `1.0` |
| `off_cpoe` (offensive play-level CPOE) | **PROMOTED** | `b_prior=0.45, k=12` | `89.659295` | **`86.159098`** | `+0.2050` | `1.0` |
| `def_cpoe` (defensive CPOE suppressed) | **PROMOTED** | `b_prior=0.45, k=20` | `89.659295` | **`87.833337`** | `+0.1501` | `1.0` |
| `off_mid_rate` (middle-field pass share) | **PROMOTED** | `b_prior=0.45, k=6` | `0.008167` | **`0.007184`** | `+0.3500` | `1.0` |
| `off_st_epa` (punt/kickoff/FG/XP EPA) | **PROMOTED** | `b_prior=0.0, k=12` | `0.045202` | **`0.044172`** | `+0.1356` | `1.0` |
| `off_deep_rate` (`air_yards >= 15` share) | **NULL HOLD** | `b_prior=0.0, k=20` | `0.008487` | `0.008526` | `-0.0162` | **`0.0`** |
| `def_deep_rate` (`air_yards >= 15` allowed) | **NULL HOLD** | `b_prior=0.45, k=20` | `0.008487` | `0.008517` | `+0.0074` | **`0.0`** |

## Key Invariants & Sibling GSI Alignment
- **Asymmetry Confirmed:** Defensive distance-residualized 3rd-down survival persists out-of-sample (`r = +0.1770`), whereas deep-shot share (`air_yards >= 15`) fails baseline on both offense and defense and stays strictly zero-weighted (`0.0`).
- **GSI Benchmark Parity:** Mirrored `OpenResearch/gse-gsi/benchmarks/eval_gsi_tbi_ode.py` cleanly into isolated `evaluation/gsi/tbi_biomarker_clearance_ode.py` (ADR-0003 rule-in-only invariant preserved).
