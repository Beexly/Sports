# VISION-CONTRACT — Physical State-Estimator & Pre-Week 6 Derived Metrics (v1.0, 2026-10-18)

`intelligence/vision/` is the home of the **State Estimator (Physical Layer)**: a posterior over
player/ball physical state updated from tracking frames and derived into pre-snap / post-snap
kinematic signals.

Status: **BUILT & WIRED TO LIVE NEON DB (`signals` + `game_signals`) — 2026-10-18 (Pre-Week 6)**

## Built & Committed Artifacts (2026 Pre-Week 6)

| File Path | Rows / Plays | Bytes | SHA-256 Prefix | Metric / Purpose |
|---|---:|---:|---|---|
| `intelligence/vision/data/derived_metrics_pre_week6_2026.parquet` | `528` | `25,342` | `a0dfab6ffea48552` | Unified pre-Week 6 `separation_yd`, `expected_separation`, `soe_yd` (Separation Over Expected), `pocket_depth_yd` |
| `intelligence/vision/data/sep_with_soe_pre_week6_2026.parquet` | `522` | `21,804` | `51d8e8a2c8a9171e` | Receiver separation at throw/arrival vs down-and-distance expected separation (`soe_yd` mean `+0.231 yd`) |
| `intelligence/vision/data/art_pre_week6_2026.parquet` | `528` | `23,370` | `8f1c7a49b5a0441c` | **Angular Rush Threat (`art_mean`)**: pass-rush closing velocity projected onto QB vector (`0.077` mean across `528` plays) |
| `intelligence/vision/data/pocket_pre_week6_2026.parquet` | `528` | `22,019` | `c91d4f6a82b1037e` | **QB Pocket Depth (`pocket_depth_yd`)**: `los_x - qb_throw_x` across `n_qb_frames` (`4.27 yd` mean) |
| `intelligence/vision/data/metrics_summary.json` | summary | `503` | `95b3bc9afb8e8e05` | Pre-Week 6 aggregate summary (`soe_mean = +0.231 yd`, `art_mean = 0.077`, `pocket_mean = 4.27 yd`) |
| `intelligence/vision/skeletrack_v2.py` | module | `78,598` | — | SkeleTrack v2 anisotropic Kalman state estimator |
| `intelligence/vision/bytetrack_associator.py` | module | `16,593` | — | ByteTrack multi-target frame associator |
| `intelligence/vision/kalman_track.py` | module | `9,740` | — | Constant-velocity / anisotropic Kalman filter |

## Live Database Signal Wiring (`scripts/ingest_week6_signals_db.py`)

Wired into Neon Postgres (`signals` table for `season = 2026, week = 6` with active non-zero weights, and `game_signals` table across all 14 Week 6 NFL games):

- `vision.soe_yd` (`category = 'TRACKING'`, `weight = 0.085`, `sourceId = 'ngs_vision_2026'`)
- `vision.pocket_depth_yd` (`category = 'TRACKING'`, `weight = 0.065`, `sourceId = 'ngs_vision_2026'`)
- `vision.art_mean` (`category = 'TRACKING'`, `weight = 0.075`, `sourceId = 'ngs_vision_2026'`, metric: `angular_rush_threat`)
- `ngs.avg_separation` (`weight = 0.085`), `ngs.ryoe_per_att` (`weight = 0.095`), `ngs.cpoe` (`weight = 0.105`)

## Inputs & Verification Tiers

| Input | Granularity | Tier | Availability |
|---|---|---|---|
| Player/ball tracking | 10 Hz NGS highlight & BDB tracking frames | `MEASURED` | Ingested (`ngs_highlight_tracking_2026.parquet`, `merged_pre_week6.parquet`) |
| Derived kinematics | `soe_yd`, `art_mean` (`angular_rush_threat`), `pocket_depth_yd` | `COMPUTED` | Committed in `intelligence/vision/data/*_pre_week6_2026.parquet` and wired into `signals` / `game_signals` |
| Field/environment calibration | Venue dimensions, surface type, wind field | `MEASURED` | Weather & venue geometry joined via `game_signals` |

## Falsifier & Calibration Gate

1. `state_posterior`: per-player, per-ball position/velocity distribution with explicit covariance, timestamped and source-stamped.
2. `uncertainty_budget`: residual variance compared against market implied uncertainty (`validate_2026_highlights_all.py`, `falsifier_third_criterion.py`).
