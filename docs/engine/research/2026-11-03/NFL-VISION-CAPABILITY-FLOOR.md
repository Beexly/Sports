# NFL Vision Capability Floor — what everyone else has, verified

Date: 2026-11-03
Purpose: establish the floor before innovating. Every number below was produced by
a command run on this machine on 2026-11-03, or by a delegated reconnaissance pass
whose claims were spot-checked. Anything unverified is marked UNVERIFIED.

---

## 1. What we already have (do not rebuild)

Verified by filesystem inventory of `C:/Users/Garrett/Sports` and
`C:/c/wt-week8-forensic`.

### Code
| Path | What it does |
|---|---|
| `intelligence/vision/bytetrack_associator.py` | ByteTrack two-stage association + per-class KF in field meters |
| `intelligence/vision/kalman_track.py` | Covariance/innovation layer above the associator |
| `intelligence/vision/tracklet_adapter.py` | KF on field meters, ball filter bank, shadow JSONL |
| `intelligence/vision/ngs_coordinates.py` | NGS field frame (x 0-120, y 0-53.3), 10 Hz |
| `intelligence/vision/polygon_zone_breach.py` | Point-in-polygon zone void accounting in yards |
| `intelligence/vision/pinhole_jacobian.py` | 3D pinhole projection + Jacobian with conditioning gate |
| `packages/prediction-engine/src/tracking/` | 49 TS files: homography, field landmarks (31.8 KB), field lines, camera compensation, deskew, jersey OCR, tracklet association, eval stratification |
| `packages/prediction-engine/src/tracking/stabilize.py` | ORB+RANSAC stabilization (fixed 52.5 px median jitter) |

### Data on disk
| Path | Size | Content |
|---|---|---|
| `intelligence/vision/data/tracking_week_{1,7,8}.csv` | 2.7 GB | 10 Hz player+ball tracking |
| `intelligence/vision/data/ngs_highlight_tracking_2026.parquet` | 60 MB | x/y, frame_id, gsis_id, team, jersey, position; 1,017 plays |
| `intelligence/vision/data/player_play.csv` | 52 MB | participation/alignment |
| `data/film_room_2026/_bootstrap/frames_*` | 1.72 GB | 36,328 frames, 640x360, 10 games |
| `data/film_room_2026/_bootstrap/*.mp4` | 7.11 GB | 12 full games (archived to Drive 2026-11-03) |

### Weights
No NFL-specific model weights exist in either repo (verified: zero `.pt/.onnx/.pth`).
Two American-football detectors were sourced 2026-11-03 and work:
`Removesurgery/american-football_player_detection` (classes player/referee) and
`Removesurgery/american-football_field_segmentation` (Field-Segmentation).

---

## 2. Labeled coverage data — the training substrate

| Source | Plays | Classes | Notes |
|---|---|---|---|
| BDB 2021 `coverage.parquet` | 1,028 | 8 | Cover 3 352, Cover 1 296, Cover 4 152, Cover 2Z 113, Cover 6 69, Cover 2M 32, Cover 0 13, Prevent 1 |
| BDB 2023 (`mkdc761/nfl-big-data-bowl-2023`) | 8,557 | pff_passCoverage + pff_passCoverageType | 8.31M tracking rows, 8 weeks |
| BDB 2025 (`nathanawright24/bigdatabowl25dataset`) | 16,124 | pff_passCoverage + pff_manZone | plus player-level `pff_defensiveCoverageAssignment` (354,727 rows) and 857,693 per-frame assignment rows |

**This is 15.7x the 1,028-play corpus we had been training on.**

### Critical defect found in the convenient file
`robikscube/nfl-big-data-bowl-2021-pp` tracking contains **14-15 players per frame,
not 22**. Measured: rows-per-frame mode = 14 (652,288 frames), then 15 (322,954).
Consequence: any defence-geometry feature built on it sees a median of **7 defenders**
and 523 of 1,028 plays fall below 8 defenders. A shell baseline trained on it is
invalid regardless of its accuracy. Use a full 22-player tracking source.

---

## 3. NGS metric surface (nflverse `nextgen_stats`)

Downloaded 2026-11-03: `ngs_passing` (6,213 rows), `ngs_rushing` (6,347),
`ngs_receiving` (15,426); seasons 2016-2026.

| File | Metrics |
|---|---|
| passing | avg_time_to_throw, avg_completed_air_yards, avg_intended_air_yards, aggressiveness, max_completed_air_distance, avg_air_yards_to_sticks, expected_completion_percentage, completion_percentage_above_expectation, passer_rating, avg_air_distance |
| rushing | efficiency, percent_attempts_gte_eight_defenders, avg_time_to_los, expected_rush_yards, rush_yards_over_expected, rush_pct_over_expected |
| receiving | avg_cushion, avg_separation, percent_share_of_intended_air_yards, avg_yac, avg_expected_yac, avg_yac_above_expectation |

## 4. FTN charting (nflverse `ftn_charting`)

2024: 48,031 plays · 2025: 47,316 · 2026: 20,404 → **115,751 charted plays**.

Available flags: `is_motion`, `is_play_action`, `is_screen_pass`, `is_rpo`,
`n_blitzers` (plus 24 other charting columns).

**Gap, verified:** the nflverse FTN release contains **no coverage column**. Coverage
labels must come from BDB 2023/2025, not FTN.

---

## 5. Public-data limits

- No Kaggle dataset publicly ships **labeled broadcast video**. Both candidate
  sources (NFL helmet assignment, player contact detection) are rules-gated.
- Helmet boxes exist publicly in exactly one place: 3,783,616 rows in
  `deepak0905/nfl-player-contact-detection`, 240 plays x 2 views. Video not shipped.
- Formation labels are coarse everywhere: `offenseFormation`
  (SHOTGUN/SINGLEBACK/EMPTY/I_FORM/PISTOL/JUMBO/WILDCAT), `personnelO`,
  `defendersInTheBox`, `numberOfPassRushers`. No route-level or alignment-level
  formation labels found publicly.
- College football: zero public tracking or CV datasets on Kaggle. Every
  "football video" hit is soccer.

---

## 6. Method frontier (verified arXiv IDs)

| arXiv | Title | Transferable technique |
|---|---|---|
| 2603.25901 | Decoding Defensive Coverage Responsibilities in American Football Using Factorized Attention Based Transformer Models (2026-03-26) | Factorized attention over temporal x agent axes; ~89% on per-defender coverage assignment, matchup and targeted-defender tasks |
| 2602.10784 | Integrating Unsupervised and Supervised Learning for the Prediction of Defensive Schemes in American Football (2026-02-11) | Elastic-net + GBDT with trajectory and HMM features; models pre-snap disguise — closest published analogue to the shell problem |
| 2511.09455 | Hand Held Multi-Object Tracking Dataset in American Football | First dedicated NFL MOT benchmark; fine-tuned detector + ReID beats off-the-shelf trackers |
| 2207.11709 / 2404.08401 | TVCalib / PnLCalib | 3D camera calibration from field lines — recovers metric space without a 2D homography fit |
| 2304.04437 | Monocular 3D pose via partial field registration | Handles close-ups where markings are hidden — our end-zone framing case |
| 1906.11373 | Unsupervised pass-coverage identification (2019) | GMM clustering to bootstrap coverage labels and quantify label noise |
| 1908.02423 | Route identification in the NFL | Bernstein basis + EM curve clustering over 34,698 routes |

Correction on the record: 2603.25901 was earlier mischaracterised in this session as
category theory about lattice paths. It is the coverage-responsibility transformer.
Verified directly against the arXiv API on 2026-11-03.

---

## 7. Measured state of our own pipeline

| Claim | Value | Status |
|---|---|---|
| VL replay harvester resolves OK.ru asset from nfl-video.com chain | 2:35:14 runtime, 8 formats to 1080p60 | VERIFIED |
| Frames audited by Nemotron VL, CHI@SEA Q1 | 149 audited, 116 live | VERIFIED |
| Coverage shell from single broadcast frame | 3/20 evaluable (15%), no discrimination | FAILED — do not ship |
| Shell from snap geometry, GBDT, BDB 2021 | 71.7% family / 43.2% 8-class | INVALID — source has 15 players/frame |
| Prior `vl_analysis_*.json` usefulness | 533 of 24,619 records non-empty (2.2%) | VERIFIED |

---

## 8. Detector stack — benchmarked, not assumed

Head-to-head on 10 live-play frames from `frames_chi_vs_car`, conf 0.25. A live
pre-snap broadcast shot has 22 players on the field.

| Model | Classes | Counts | mean abs err vs 22 | Max |
|---|---|---|---|---|
| Removesurgery player detection | player, referee | 2,24,25,25,20,5,42,47,39,24 | 11.1 | 47 |
| lmarte17 gridiron-ai (MIT) | defense, oline, qb, ref, running_back, tight_end, wide_receiver | 5,22,19,14,3,1,23,22,17,10 | 8.6 | 23 |

Removesurgery has better recall on clean frames but explodes to 39-47 on wide
shots (crowd and sideline personnel) - that is what forced the field-mask and
plausibility gates in `broadcast_cv.py`. Gridiron never exceeds 23, is
**role-labelled** (separates oline from defense from wide_receiver - exactly the
signal a formation model needs), and is **MIT-licensed**, so it is usable
commercially where the Removesurgery weights are not.

Decision: gridiron-ai primary, Removesurgery a field-mask-gated recall backup.
Working stack: detection 49.6 MB + field segmentation 22.8 MB + pose ONNX
11.3 MB + jersey OCR 20.8 MB = **~104 MB**.

Caveat: measured at library defaults on 640x360 sources. Re-run at higher
`imgsz` before treating these as final rankings.

## 9. Next actions (ordered by leverage)

1. Retrain the shell model on BDB 2025 (16,124 plays) with game-grouped CV; report
   per-class recall, especially Cover 4 and Cover 6 where the rule-based version
   scored 41-45%.
2. Route shell features through the existing `bytetrack_associator` +
   `cv-homography.ts` rather than new modules.
3. Build the NGS-equivalent metric library from tracking we already own, validating
   computed separation/cushion/time-to-throw against published NGS values.
4. Use FTN charting flags (115,751 plays) as auxiliaries for situational priors.
5. Implement factorized-attention coverage assignment (2603.25901) once (1) is solid.
