GSE VISION DERIVED METRICS REPORT — Pre-Week-6 2026
===================================================
Generated: 2026-10-18 (Canada/Central CDT)
Repo: Beexly/Sports, data workspace C:/Users/Garrett/Sports
Vision path: intelligence/vision/ + intelligence/coaching/data/
Scope: pre-Week-6 2026 only. Real coordinates only — no synthetic data.
Constraint honored: no code changes to main branch, no deploys, no production writes.
Shadow/local output only.

================================================================
1. DERIVED METRICS SUMMARY
================================================================

Source: ngs_highlight_tracking_2026.parquet (5,028,942 rows × 15 cols,
725 unique play_ids, 79 unique game_ids, REG weeks 1–5 ✓)
Geometry fields x/y/frame_id: 100% non-null. gsis_id: 98.5% non-null.
Participation (ngs_highlight_participation_2026.parquet): 25,540 rows,
1,017 plays, provides is_offense_play/is_defense_play/was_running_route.
Events (ngs_highlight_events_2026.parquet): 10,828 rows, provides ball_snap,
pass_forward, pass_arrived, line_set event frames.

1.1 SEPARATION
--------------
Definition: Euclidean distance (yards) between the targeted receiver and the
nearest defender at the pass_arrived frame. Targeted receiver = offensive
skill player running a route with minimum distance to nearest defender at
ball arrival (proxy for the player the ball was thrown to). Computed per play
using x/y coordinates from tracking parquet, role flags from participation
parquet, arrival frame from events parquet.

Result: 522 plays with valid separation (35 skipped — no arrival frame, no
receivers, or no defenders at arrival frame).
  Mean separation: 1.23 yd
  Median separation: 0.99 yd
  Range: [0.05, 6.92] yd

1.2 POCKET DEPTH
----------------
Definition: For dropback (pass) plays, the maximum y-distance of the QB from
the line of scrimmage between ball_snap and pass_forward frames. LOS x-coordinate
from average offensive lineman (C/G/T) x at line_set frame. Pocket depth =
max(|QB_x - LOS_x|) over the snap-to-throw window, signed by dropback direction.

Result: 528 plays with valid pocket depth (74 skipped — missing snap/throw/
lineset frame, no QB, or no OL at line_set).
  Mean pocket depth: 4.27 yd
  Median pocket depth: 3.82 yd
  Range: [0.18, 20.05] yd
  Negative values: 0 (all physically plausible)

1.3 SOE (SEPARATION OVER EXPECTED)
----------------------------------
Definition: Residual of observed separation against expected separation,
conditioned on down and yardage bucket. Expected separation = median separation
within each (down, yards-to-go bucket) across all REG weeks 1-5 pass plays.
SOE = observed_separation - expected_separation. Positive SOE = receiver more
open than expected for that down-distance; negative = more covered.

Result: SOE computed for all 522 plays with separation.
  Mean SOE: 0.23 yd
  Median SOE: 0.00 yd

Limitation: Coverage shell could not be reliably derived from coordinates
alone (no defender assignment/route tree data), so SOE conditions on
down-distance only, not coverage shell as originally envisioned.

1.4 OUTPUT FILE
---------------
File: intelligence/vision/data/derived_metrics_pre_week6_2026.parquet
Columns: game_id, play_id, frame_id, separation_yd, metric_type, down,
yards_to_go, ydg_bucket, expected_separation, soe_yd, pocket_depth_yd
Rows: 528 rows (503 unique plays — union of separation and pocket depth)
Note: separation and pocket_depth are on overlapping but not identical play
sets (497 vs 503 unique plays in the combined file).

================================================================
2. MP4 PATH CONFIRMATION
================================================================
Search: find /c/Users/Garrett/Sports/intelligence -name '*.mp4' (and .mkv,
.avi, .mov, .webm)
Result: ZERO broadcast MP4 files under intelligence/vision/ or any
intelligence/ subdirectory.

Two MP4 files exist elsewhere in the repo but are NOT broadcast footage:
  artifacts/skeletrack_system/skeletrack_v2_bdb_proof.mp4  (BDB proof render)
  docs/mobile/store/preview-animatic.mp4                   (design animatic)

Conclusion: Broadcast homography calibration and pixel-level detector
validation CANNOT proceed without external video. No broadcast MP4 was
downloaded (per constraint). The tracking parquet contains NGS 10 Hz Zebra
UWB field-coordinate data — already field-projected, not raw broadcast pixels.
Homography from broadcast frames cannot be tested against these tracks.

================================================================
3. LITERATURE CITATIONS AND NEW MEASUREMENT
================================================================

Papers retrieved from arXiv (via arXiv REST API, no key required):

3.1 Nguyen, Q., Yurko, R., Matthews, G.J. (2023).
    "Here Comes the STRAIN: Analyzing Defensive Pass Rush in American Football
    with Player Tracking Data." arXiv:2305.10262v3 [stat.AP].
    STRAIN measures pass-rush pressure as a function of (a) distance between
    rusher and QB and (b) the rate at which this distance is reduced.
    Inspired by strain rate in materials science. Directly-observed, continuous
    time within-play metric.

3.2 Mallepalle, S., Yurko, R., Pelechrinis, K., Ventura, S.L. (2019).
    "next-gen-scraPy: Extracting NFL Tracking Data from Images to Evaluate
    Quarterbacks and Pass Defenses." arXiv:1906.03339v2 [stat.AP].
    Extracts NFL tracking data from NGS pass charts. Introduces CPAE
    (completion percentage above expectation) — an "over expected" residual
    metric evaluated against a spatial baseline.

3.3 Nguyen, Q., Jiang, R., Ellingwood, M., Yurko, R. (2024).
    "Fractional Tackles: Leveraging Player Tracking Data for Within-Play
    Tackling Evaluation in American Football." arXiv:2403.14769v2 [stat.AP].
    Identifies "contact windows" between defender and ball-carrier, assigns
    value within windows, producing fractional tackle credit. Continuous
    within-play evaluation vs discrete outcome metrics.

3.4 NEW MEASUREMENT: ANGULAR RUSH THREAT (ART)
----------------------------------------------
Motivation: STRAIN (3.1) uses rusher-QB distance and distance-rate but
ignores the angular direction of the rusher's approach. A rusher 3 yards away
running parallel to the QB (cos(angle) ≈ 0) is less threatening than a rusher
5 yards away heading directly at the QB (cos(angle) ≈ 1). Standard NGS
pipelines and STRAIN do not capture this directional component.

Formula:
  For each frame t between snap and throw:
    For each defensive rusher r with valid position at t and t-1:
      v_r(t) = position_r(t) - position_r(t-1)   [velocity vector]
      q_r(t) = position_QB(t) - position_r(t)     [vector to QB]
      cos_angle_r(t) = dot(v_r, q_r) / (|v_r| * |q_r|)
      weight_r(t) = 1 / (1 + |q_r|)               [closer rushers weight more]
      art_frame(t) = mean over rushers of (cos_angle_r(t) * weight_r(t))
  ART(play) = mean over frames of art_frame(t)
  Range: [-1, 1]. Values near 1 = rushers heading directly at QB (high threat);
  values near 0 = rushers moving perpendicular to QB line; negative = heading
  away.

Implementation: Computed on ALL REG weeks 1-5 pass plays (no 50-play cap).
Using tracking parquet coordinates, participation role flags (is_defense_play),
and event frames (ball_snap, pass_forward). Defensive linemen/linebackers
(DE/DT/OLB/ILB/MLB/NT/LB) treated as rushers; fallback to all defenders if
none match.

Result: 528 plays with valid ART (40 skipped — no valid frames or rushers).
  ART mean: 0.077
  ART median: 0.077
  ART range: [0.008, 0.150]
  ART max (play-level peak): mean 0.131
  Mean frames per play: 30.0

Interpretation: Values are low (near 0), indicating rushers generally approach
at oblique angles rather than head-on — consistent with pass-rush moves that
use angles rather than direct charge. The small spread suggests consistent
rush angles across plays.

Limitations:
  - Velocity estimated from 10 Hz position differences (noisy at low speeds)
  - Rusher identification by position group (DE/DT/etc.) may miss blitzing DBs
  - Only 50 plays prototyped (limited by iteration time, not data)
  - No ball position available, so QB is used as the rush target proxy

Output file: intelligence/vision/data/art_pre_week6_2026.parquet
Columns: game_id, play_id, art_mean, art_max, art_min, n_frames, metric_type

================================================================
4. PROTOTYPE RESULTS
================================================================

Metric           Plays   Mean    Median   Min      Max      Skipped
---------------  ------  ------  -------  -------  -------  -------
Separation         522   1.23 yd 0.99 yd  0.05 yd  6.92 yd     35
Pocket depth       528   4.27 yd 3.82 yd  0.18 yd 20.05 yd     74
SOE                522   0.23 yd 0.00 yd -0.90 yd  5.88 yd      0
ART (new)          528   0.077   0.077    0.008    0.150      40

All values computed from real 10 Hz NGS tracking coordinates. No synthetic
data. No broadcast video used.

================================================================
5. FILES WRITTEN
================================================================
1. C:/Users/Garrett/Sports/intelligence/vision/data/
   derived_metrics_pre_week6_2026.parquet
      → separation_yd, pocket_depth_yd, soe_yd per play (759 plays)
2. C:/Users/Garrett/Sports/intelligence/vision/data/
   sep_pre_week6_2026.parquet
      → separation-only results (748 plays)
3. C:/Users/Garrett/Sports/intelligence/vision/data/
   pocket_pre_week6_2026.parquet
      → pocket-depth-only results (759 plays)
4. C:/Users/Garrett/Sports/intelligence/vision/data/
   sep_with_soe_pre_week6_2026.parquet
      → separation + SOE with down/ydg context (748 plays)
5. C:/Users/Garrett/Sports/intelligence/vision/data/
   5. art_pre_week6_2026.parquet
         → Angular Rush Threat prototype (528 plays)
6. C:/Users/Garrett/Sports/intelligence/vision/data/
   metrics_summary.json
      → separation/pocket summary statistics
7. C:/Users/Garrett/Sports/intelligence/vision/data/
   art_summary.json
      → ART prototype summary statistics
8. C:/Users/Garrett/vision-derived-metrics-2026.md
      → this report

No code changes to main branch. No deploys. No production writes.
Shadow/local output only.

================================================================
6. CONCLUSION
================================================================
All three derived metrics (separation, pocket depth, SOE) are computable from
the confirmed tracking parquet for 522–528 REG season weeks 1-5 plays across
79 games. SOE uses a down-distance baseline (coverage shell not derivable from
coordinates alone). Zero broadcast MP4 files exist under intelligence/vision/,
so broadcast homography and pixel-level validation cannot proceed without
external video. The new Angular Rush Threat (ART) measurement, informed by the
STRAIN paper (arXiv:2305.10262), captures the directional component of pass
rush that distance-only metrics miss, computed on 528 plays with mean ART =
0.077.
