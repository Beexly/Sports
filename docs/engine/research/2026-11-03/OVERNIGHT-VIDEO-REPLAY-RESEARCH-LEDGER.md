# Overnight Video Replay & Research-Mindset Ledger — 2026-11-03/04

**Lane:** Phase 7 — Continuous NFL Video Replay & Research-Mindset Feature Extraction
**Window:** 2026-11-04 05:16 CT onward (inside 22:00–08:00 overnight mandate)
**Branch:** `hermes/overnight-2026-11-03-corpus`
**Status:** IN PROGRESS

## What this lane is for

The corpus and retriever are built. This lane turns broadcast frames into
falsifiable football features: does a disguise actually collapse, is a route
actually directional, is a QB actually loaded, do route clusters actually
separate concepts. Every candidate is gated through BH-FDR at q <= 0.10
before it is allowed to influence anything.

## Assets verified on disk

| Asset | Path | State |
|---|---|---|
| Broadcast CV | `intelligence/vision/broadcast_cv.py` | 248 lines + crop-pose pipeline (new) |
| Zone breach | `intelligence/vision/polygon_zone_breach.py` | `compute_zone_void_breach` |
| Route geometry | `intelligence/vision/route_geometry.py` | Bernstein/Bezier + EM |
| Hazard engine | `packages/galaxy-conformal-ot/.../schrodinger_bridge_hazard.py` | `AdversarialSchrodingerActiveHazardEngine` |
| VL harvester | `intelligence/vision/nfl_video_vl_harvester.py` | `harvest_local`, `harvest_window` |
| 2026 harvester | `intelligence/vision/nfl_video_2026_harvester.py` | `crawl_index` |
| Calibration gate | `tests/verify_out_of_sample_calibration.py` | `--enforce-gate` |
| Film room | `C:/Users/Garrett/Sports/data/film_room_2026/_bootstrap/` | 14 dirs, 36,328 frames |

## Task 1 — Crop-pose pipeline (DONE)

**Commit:** `f3a247a0c`

`broadcast_cv.py` gained:
- `pose_on_crop` — YOLO11n-pose on per-player crops, keypoints mapped back to
  full-image coordinates. Whole-frame pose fails on 40–90 px broadcast players.
- `assign_poses_to_players` — footpoint-to-tracklet correspondence; a pose
  whose ankle midpoint is >60 px from every box is dropped (spectator).
- `repair_foreshortened_limbs` — anthropometric priors (segment length as a
  fraction of shoulder width); limbs below 0.45× prior are extrapolated along
  the visible direction, or mirrored from the contralateral twin when
  degenerate.
- `filter_sideline` — drops no-pose, off-field, and implausibly-small poses.
- `analyse_frame_with_pose` — full detect → crop-pose → correspond → repair →
  filter pipeline.

**Ruling:** the skill names `gridiron-ai` and `YOLO11n-pose.onnx`. `gridiron-ai`
is not on PyPI and no `.onnx` exists on disk. Substituted `ultralytics`
YOLO11n-pose (installed, auto-downloads `yolo11n-pose.pt`, 17 COCO keypoints).
Cost if wrong: the detector's role labels differ from the skill's assumed
package, but `detect_players` already handles role-based filtering.

**Tests:** 15, no network. Full suite 343 passed, exit 0.

## Task 1b — Crop-pose on real frames: BLOCKED BY RESOLUTION

The pipeline runs end-to-end on a real frame (`baldal_1001.jpg`, 10 players
detected by the gridiron-ai detector with correct role labels: `defense`,
`oline`, `qb`, `ref`, `running_back`, `tight_end`, `wide_receiver`), but
**0 poses are assigned**.

Root cause: every film-room frame is **360×640**. Player boxes are 26–43 px
wide and 45–66 px tall. YOLO11n-pose returns 0 persons even after upscaling
the crop to 256 px tall — interpolation cannot add the information the model
needs. This is a data limitation, not a code defect.

**Ruling:** the crop-pose pipeline is correct and tested (15 unit tests), but
the on-disk film room cannot feed it. It needs ≥720p broadcast frames where
players are ≥80 px wide. Cost if wrong: the pipeline sits unused until
higher-resolution frames arrive; no fabricated poses enter the ledger.

## Task 2 — Re-harvest frames (IN PROGRESS)

- Local audit: 14 game dirs, 36,328 frames. `harvest_local` samples every 60th
  frame, audits 4 per dir via Nemotron VL.
- Validation run on `frames_bal_vs_dal`: 2,789 frames → 70 sampled → 6 audited,
  4 live_inplay, 2 graphic, 3 live frames, 1 quarantined.
- Full 14-dir run: **complete.** 36,328 frames across 14 dirs, 56 audited
  (4/dir), 26 live_inplay, 15 quarantined. Per-dir:

| Dir | Frames | Audited | Live | Quarantined |
|---|---|---|---|---|
| frames_bal_vs_dal | 2,789 | 4 | 2 | 0 |
| frames_bal_vs_dal_week3 | 81 | 2 | 0 | 2 |
| frames_bal_vs_ind | 2,659 | 4 | 3 | 0 |
| frames_bal_vs_ind_week1 | 2,659 | 4 | 0 | 3 |
| frames_buf_vs_lar | 2,975 | 4 | 1 | 0 |
| frames_chi_vs_car | 2,910 | 4 | 4 | 0 |
| frames_chi_vs_car_week1 | 2,910 | 4 | 0 | 4 |
| frames_dal_vs_nyg | 2,619 | 4 | 4 | 0 |
| frames_hou_vs_jax | 2,693 | 4 | 3 | 0 |
| frames_ind_vs_kc | 2,856 | 4 | 2 | 0 |
| frames_ind_vs_kc_week2 | 2,856 | 4 | 0 | 2 |
| frames_nyg_vs_hou | 2,551 | 4 | 4 | 0 |
| frames_pit_vs_cle | 2,937 | 4 | 0 | 4 |
| frames_sf_vs_sea | 2,486 | 4 | 3 | 0 |

**Finding:** the `_week1/2/3` suffixed dirs have 0 live frames and high
quarantine counts, while their unsuffixed twins have live frames. They are
duplicate frame sets with worse sampling — the unsuffixed dir is the one to
use. `frames_pit_vs_cle` is the exception: 0 live, 4 quarantined, no twin.
- Live crawl (`nfl-video.com/2026`, pages 0..8) for Week 8/9 priority games
  (`IND@JAX`, `BAL@BUF`, `CHI@SEA`, `ARI@DAL`, `NE@MIA`, `LV@NYJ`): **crawl
  works, streams do not exist.** 19 games discovered across weeks 5–8, all 6
  priority games present. But `embeddable_pages: 0` — every game page exposes
  7–8 "server" links that are spam redirects (`basketball-video.com`,
  `fullraces.com`, `guidedesgemmes.com`, `mlblive.net`, `nhlgamestoday.com`),
  no OK.ru embed, no `<video>`, no `.mp4`/`.m3u8`. The site is a link farm.
  **Ruling:** the live crawl cannot supply replay frames. The on-disk film
  room (36,328 frames) is the only viable source. Cost if wrong: we lose
  Week 8/9 games not already on disk, but no fabricated streams enter the
  pipeline.

## Task 3 — Research-mindset features (DONE, module + tests)

**Module:** `intelligence/vision/research_mindset_features.py`

| Feature | Method | Falsifier |
|---|---|---|
| Disguise collapse hazard | `AdversarialSchrodingerActiveHazardEngine` (CSD + Schrödinger bridge + EFE + conformal) | composite hazard vs conformal threshold |
| Trajectory irreversibility | Crooks/Seifert `ln[P_F(ω)/P_R(-ω)]` = `Σ(μ·dx)/σ²` | near-zero ⇒ reversible ⇒ no directional info |
| QB cognitive load | MOT load (defenders in scan radius, inverse-distance weighted) + zone void area | void area > 0 with no defender |
| Route EM clusters | Bernstein/Bézier control-point signatures + GMM EM | cluster purity |

**Falsification gate:** `bh_fdr(pvalues, q=0.10)` and
`falsify_feature_matrix(X, y, names, q=0.10)` — Welch t-test per feature,
BH step-up across features. A feature whose adjusted p-value exceeds q is
not allowed into the ledger.

**Tests:** 11, no network (hazard-engine test runs when the package is
importable). Full suite pending re-run.

## Rulings

1. **`gridiron-ai` unavailable** → substituted `ultralytics` YOLO11n-pose.
   Cost if wrong: role labels differ; `detect_players` already filters by role.
2. **Film room lives in the main repo, not the worktree** → read-only absolute
   paths; outputs written to the worktree. Cost if wrong: none, data is
   read-only.
3. **Hazard engine expects flattened state length** (22 = 11 players × 2 coords)
   for `observation_ambiguity_entropy`, not player count. Fixed in the wrapper.
4. **Zone breach returns `breached_zones` / `total_void_area_sq_yds`**, not
   `breached` / per-zone sum. Fixed in the wrapper.

## Open

- Full 14-dir harvest result (background).
- Live crawl of `nfl-video.com/2026` for Week 8/9 games.
- Real tracking data for the feature pipeline: the film room has frames, not
  trajectories. The features are built and tested on synthetic data; production
  needs Big Data Bowl tracking or pose-derived trajectories.
- `verify_out_of_sample_calibration.py --enforce-gate` has not been run against
  a real feature matrix yet.

## Calibration gate — run 2026-11-04 05:30 CT

`python tests/verify_out_of_sample_calibration.py --enforce-gate` → **exit 0**.

| Kernel | Status | Brier delta | n |
|---|---|---|---|
| `eager_split_pass_epa_and_poisson_td` | APPROVED | — | — |
| `veroulis_eager_weak_link_oline_sack_rate` | APPROVED | — | — |
| `congelio_per_carry_ryoe_deconfounding` | APPROVED | — | — |
| `davidson_pilon_empirical_bayes_receiving_props` | APPROVED | — | — |
| `alam_crosswind_drag_outdoor_15mph_plus` | APPROVED | +0.061 | 66 |
| `quarantined_pinn_navier_stokes_and_ocular_proxy` | **REJECTED** | −0.016 | 761 |

The speculative PINN/ocular-proxy kernel is correctly rejected: adding
uncalibrated PDE variance to the Empirical Bayes baseline makes Brier worse
by 0.016 on 761 samples. The gate is doing its job — it is not a rubber stamp.

## Feature pipeline demo — 2026-11-04 05:40 CT

`python scripts/research/feature_pipeline_demo_2026_11_04.py` → **PASS, exit 0**.

80 synthetic plays (40 "disguised": tight pre-snap spread, large post-snap
displacement; 40 "static": wide pre-snap spread, small displacement).

| Feature | t | p | adj_p | Survives q=0.10 |
|---|---|---|---|---|
| hazard | −9.069 | 0.0000 | 0.0000 | **yes** |
| irreversibility | −15.914 | 0.0000 | 0.0000 | **yes** |
| mot_load | 0.237 | 0.8136 | 0.8136 | no |
| noise | 1.030 | 0.3064 | 0.4086 | no |

2/4 features survive BH-FDR. The gate separates real signal from noise.

**Finding — hazard direction is inverted from naive expectation.** The
hazard t-stat is negative: the "static" group scores *higher* than the
"disguised" group. The engine's composite is a ratio (CSD vs baseline
variance, Schrödinger control energy, EFE), not "more movement = more
hazard". A tight pre-snap picture that explodes post-snap has a large
baseline variance, which suppresses the CSD term. This is a real property
of the engine, not a bug — but it means the feature must be interpreted as
"phase-transition proximity", not "disguise quality". A future version
should normalise by pre-snap spread before calling it a disguise metric.
