# Stream 15Z: Causal OL Snap Continuity, Sack Resilience & 1H/2H Split Engine

- **Date:** 2026-11-20
- **Module:** `intelligence/coaching/causal_ol_continuity_and_half_splits_engine.py`
- **Data Sources (CC-BY-4.0 nflverse):**
  - `data/nflverse/snap_counts_2026_w1_w10.parquet` (`14,004` player-week snap records across 2026 Weeks 1–10; `252` OL continuity records)
  - `data/nflverse/pbp_2026_w1_w10.parquet` (`season_type == 'REG'`)
  - `intelligence/coaching/data/play_by_play_2024.parquet` & `play_by_play_2025.parquet` (`0.35 / 0.65` multi-season priors)

## Walk-Forward Out-of-Sample Results (`2026 Weeks 4..10`, `week < as_of_week`)

| Component | Decision | Config | Baseline MSE | Raw MSE | Causal EB MSE | OOS `r` | Weight |
|---|---|---|---|---|---|---|---|
| `ol_shared_prev_wk` (`5-man OL snap overlap`) | **PROMOTED** | `b_prior=0.0, k=6` | `0.014405` | `0.015748` | **`0.013986`** | `+0.1776` | `1.0` |
| `off_sack_rate` (dropback sack avoidance) | **PROMOTED** | `b_prior=0.45, k=12` | `0.002311` | `0.002337` | **`0.002160`** | `+0.2533` | `1.0` |
| `def_sack_rate` (pass-rush sack creation) | **PROMOTED** | `b_prior=0.45, k=20` | `0.002311` | `0.002601` | **`0.002249`** | `+0.1519` | `1.0` |
| `off_h1_epa` (`1H` competitive `WP 0.15..0.85`) | **PROMOTED** | `b_prior=0.45, k=12` | `0.059306` | `0.063344` | **`0.056227`** | `+0.2151` | `1.0` |
| `def_h2_comp_epa` (`2H` competitive hold) | **PROMOTED** | `b_prior=0.45, k=6` | `0.287870` | `0.284583` | **`0.270085`** | `+0.2478` | `1.0` |
| `raw_halftime_swing` (`off_h2_raw - off_h1`) | **NULL HOLD** | `b_prior=0.0, k=12` | `0.095087` | `0.112529` | `0.096334` | `-0.0289` | **`0.0`** |
| `def_expl_allowed` (`>=15yd` allowed rate) | **NULL HOLD** | `b_prior=0.0, k=20` | `0.001617` | `0.001985` | `0.001620` | `+0.0231` | **`0.0`** |

## Key Literature & Empirical Validation
- **OL Continuity Effect:** Every promoted component strictly beats BOTH the league baseline MSE and unshrunk raw MSE out-of-sample across 2026 Weeks 4–10 (`n = 166..204`).
- **1H Signal vs. Halftime Adjustment Noise:** Clean competitive 1st-half EPA persists (`+0.2151`), whereas raw unadjusted `2H - 1H` halftime swings fail the league baseline (`0.096334 > 0.095087`, `r = -0.0289`) and remain strictly zero-weighted (`0.0`).
