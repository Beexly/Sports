GSE VISION TEST REPORT — Pre-Week-6 2026 Computer Vision Validation
==================================================================
Generated: 2026-10-17 (Canada/Central CDT)
Pipeline reviewed: ByteTrack-style tracklets, DLT Hartley homography, pocket depth,
pass-rush separation, coverage shell (man/Cover 2/Cover 3/Cover 4/press/zone), SOE.
Scope: pre-Week-6 2026 only. Real frames/tracklets only — no synthetic data.
Constraint honored: no code changes, no deploys, no writes to production tables.

EXECUTIVE SUMMARY
-----------------
- Plays reviewed: 0 pre-Week-6 2026 plays have any coupled frame/tracklet/homography data.
- Frames processed: 0 real broadcast frames exist on disk for any pre-Week-6 2026 play.
- Pass/fail by component: every component = 0 measurable / 0 pass / N/A (no real data to validate).
- Defects found: 17 (see Defect List). All are data-acquisition or integrity gaps, not
  pipeline bugs, because no pipeline output exists against real 2026 data.
- Bottom line: the CV pipeline cannot be validated on pre-Week-6 2026 data because the
  required inputs (2026 tracking frames/tracklets, 2D landmarks, charting coverage,
  broadcast frames) do not exist anywhere on disk. Existing homography/coverage/SOE
  artifacts are synthetic, hardcoded, or circularly validated and assert results they
  do not measure.

1. SCOPE & PATHS SEARCHED
-------------------------
Roots searched (exhaustive, real files only):
  C:/Users/Garrett (home root)
  C:/Users/Garrett/.cagent/Sports
  C:/Users/Garrett/.sports-scrub-20261003

Terms searched: tracklet, bytetrack, byte_track, kalman, homography, DLT, Hartley,
perspective transform, yard_line, hash_mark, sideline, calibration, separation,
pocket_depth, SOE, separation_over_expected, coverage, Cover 2/3/4, press, zone,
man, playId, gameId, nflId, x, y coordinates.

Key negative findings:
  - No 2026 play is coupled to frames or per-frame coordinates anywhere on disk.
  - No CSV header contains both playId and nflId; no parquet carries x/y.
  - ~/data/cv was never created; Roboflow image pulls in docs/dataset-pull-commands.md never ran.
  - No football video in any root (all .mp4 are brand/design assets).
  - BDB 2025 tracking (Downloads/nfl-big-data-bowl-2027.zip, 513 MB) is 2023–2025 only — no 2026,
    already field-projected, so cannot test DLT.
  - play_by_play_2026.parquet: real Weeks 1–4 (8,497 rows, 372 cols) but zero spatial/coverage/
    pressure/separation fields.
  - gse-ml-service holds only ETKF/TDA prediction models — no CV code.

2. FRAME-LEVEL VISION VALIDATION (Task 1)
-----------------------------------------
Verdict: blocked at data acquisition — 0 of 6 checks runnable. Per-play table: 0 rows.
Nothing fabricated.

Checks attempted vs available:
  Player tracklet identity (ByteTrack): NOT RUNNABLE — no tracklets exist.
  DLT Hartley homography to field coords: NOT RUNNABLE — no 2D landmarks/frames.
  Pocket depth: NOT RUNNABLE.
  Pass-rush separation: NOT RUNNABLE.
  Coverage shell label: NOT RUNNABLE — no frames, no classifier.
  Separation Over Expected (SOE): NOT RUNNABLE — truth sample absent.

The only real frame-level run found:
  docs/research/2026-10-01/cv-detector-eval-2026-10-01.md — 251 frames, 640x360, 5 fps.
  P 1.00 / R 0.74 on 57 people; 52–65 tracklets for ~6 players; DLT FAILED — "singular
  normal equations", correspondences collinear on frame edges. Clips deleted after eval;
  no tracklet file persisted.

Producer code (cv-homography.ts, cv-tracklet-association.ts, cv-pipeline.ts) is exercised
only by synthetic 64x40 procedural fixtures and a scripted FixtureDetector — no real data.

Vision checks performed on the only 2026 images:
  coverage-defenders-week1-2026.png — CONFIRMED DEFECT. Frame shows handle @hawkblogger;
  AGENTS.md:1966 says @hawkbledger. Date 2026-09-17 in doc is not in image (only a 5:05 clock).
  Image is a season-to-date leaderboard — supports NO coverage-shell, pocket-depth, or
  per-play separation claim.
  air-yards-week1-2026.png — PASS. Jameson Williams row matches doc exactly
  (9 TGT, 128 AY, 85 incomplete, 112 catchable, 16 not catchable, 47 dropped);
  catchable + not-catchable reconciles to AY totals on every row checked. No account
  attribution visible (matches doc "UNVERIFIED").

separation-reconstruct.ts correctly sits in its UNCALIBRATED branch because the "NGS
Highlights coordinate sample" it expects as truth is absent — no per-play SOE number
exists to validate.

Gap log (Task 1): C:/Users/Garrett/frame-vision-validation-2026-wk1-5-gap.md
Unblock requirements: 2026 tracking feed, frames keyed to playId, 2D landmarks, charting
for coverage shell.

3. HOMOGRAPHY & GEOMETRY INTEGRITY (Task 2)
-------------------------------------------
Verdict: no measured homography exists anywhere in pre-Week-6 2026 corpus. The only
homography artifact is built from 8 hand-typed pixel coordinates that are not projections
of any real camera and fail their own yard-line/hash/sideline consistency checks.

Artifacts found:
  CV_HOMOGRAPHY_PROOF.json — only stored 3x3 matrix (H_px_to_yd, H_px_to_m), 8 landmarks — synthetic.
  intelligence/vision/validate_2026_highlights_all.py:259-297 — renders green frame, calibrates on it — synthetic.
  intelligence/vision/skeletrack_bdb_validation.py:108-161 — same render-and-calibrate trick for BDB play 1766 — synthetic.
  packages/prediction-engine/src/tracking/cv-homography.ts — real Hartley DLT implementation, NO stored output — code only.
  cv-field-landmarks.ts, cv-template.ts, src/perception/cv-field-model.ts — field model / hash constants.

Homography proof fails geometry:
  - Reports verdict HOMOGRAPHY_CALIBRATED on mean reprojection RMSE 4.4261 m / 4.8405 yd, max 13.535 yd.
  - Citing report (CV_PIPELINE_VERIFICATION_AND_CALIBRATION_REPORT.md:17) claims 0.0974 m / 0.182 m max — 45x understatement of its own artifact.
  - Far sideline off by 13.54 yd: landmark 50yd_far_sideline at px (640,230) projects to y=39.795 yd vs 53.33 actual.
  - Four x=50 landmarks (v=680,480,395.2,230) are collinear — no camera satisfies a 1D projective map; three points force far sideline to v=-324.5 px (off 720-px frame); recorded at 230. Best 3-point fit misses 4th by 3.89 yd.
  - Local scale non-monotonic (8.48 -> 13.74 -> 7.01 px/yd) — impossible for a real lens.
  - Yard lines split: 40-yd line -> 39.157 and 41.018 yd (1.86 yd spread); 60-yd line -> 60.843 and 58.982 yd. Every point on a yard line must map to constant x.
  - Plain DLT over all 8 points gives RMSE 6.28 yd; stored matrix is a 4-point RANSAC inlier fit that discarded the failure.
  - 787-play run projects NGS ground truth -> synthetic pixels -> back through same H, so H cancels; 0.0947 m "RMSE" measures injected 0.9/sqrt(2) px noise, not calibration. Synthetic frame spans y=4.0-44.768 m — neither sideline is in it; sideline distance never tested.

Play-level metric failures (exact fields):
  play_4579_high_pressure:
    pocket_depth_yards: claimed 4.15; QB max dropback 8.17, deepest OL at throw 7.96 -> FAIL
    pass_rush_separation_yards: claimed 0.85; min rusher-QB distance 2.44 (never < 2.0) -> FAIL
    coverage_shell: claimed "Cover 0 Blitz"; 2 defenders at 9.3 and 12.9 yd depth at snap -> FAIL (deep help present)
    box_defender_count: claimed 8; 10 defenders within +/-5 yd of LOS -> FAIL (definition-sensitive)
    video_timestamp: claimed "Q2 3 & 8 @ LOS 35.0yd"; actual down 2, 16 to go, LOS BUF 21 / absolute 89 -> FAIL
    receiver_separation_at_break_yards: claimed 1.12; 0.59 at catch -> plausible, not flagged
    separation_over_expected_yards: claimed -0.88; no ghost model output stored -> unverifiable
  play_1820_clean_pocket: all metrics — 0 rows in 2026 tracking (any week) -> FAIL (play does not exist)
  play_2740_coverage_disguise: all metrics — 0 rows -> FAIL (play does not exist)
  2026100500_889, ..._1915, ..._2242, ..._2269, ..._2389 (5 "extreme plays"): all metrics — 0 rows; game_ids sequential 0500-0504 (five games 00:00-04:00 same day) -> FAIL (fabricated)

Real-data impossible values (787 REG plays / 5,028,942 rows):
  - 68,452 rows (1.361%) outside field (0<=x<=120, 0<=y<=53.33), all post-snap in worst plays.
    2026_03_NYJ_DET play 3817: 3,038 rows, y -8.51 to 63.13, x to 120.88 (y=63.13 is 9.8 yd beyond sideline).
    2026_05_DET_ARI play 4402: 2,434 rows, y -6.03 to 60.67.
  - 77 single-frame steps >12 yd/s across 14 plays; max 59.71 yd/s (122 mph): 2026_01_GB_MIN play 3963,
    gsis 00-0038398, frame 29; 2026_04_LAC_SEA play 2973 at 57.69.
  - QB ahead of LOS at snap: 2026_04_LA_PHI play 4067, snap depth -2.43 yd (rush).
  - Ball-at-snap vs LOS systematic bias: +1.09 yd (left, n=382) / -1.18 yd (right, n=372); 77/754 plays |Delta|>2 yd,
    max -5.18: 2026_02_GB_NYJ play 4039 (punt). Coordinate-origin/spot inconsistency — needs explanation before any x-based metric.

Calibration-file defects:
  cv-template.ts:25 — HASH_OFFSET_M = 5.64: this is the 18'6" separation BETWEEN hash rows, used as offset FROM sideline.
    Correct near-hash y is 21.5646 m (70'9"); error ~15.92 m (~17.4 yd), compressing lateral scale ~3.8x in every fit from landmarksToCorrespondences.
    Python's NEAR_HASH_Y_M = 21.5646 is correct — the two paths disagree.
  Coordinate origin mismatch: Python Homography emits 0-120 yd from back of end zone; cv-field-model.ts expects 0-91.44 m from goal line with negatives in near end zone. Direct feed = 10-yd (9.14 m) x-shift.
  Positional yard-line labelling: skeletrack_v2.py:665-669 assigns visible_yard_lines_yd left-to-right with no handedness/yard-number check; validate labels 10-yd spacing onto a detector that finds real 5-yd lines — systematic 2x label error. No sideline/hash sanity check (hash rows must be 6.17 yd apart).
  FIELD_WIDTH_YD = 53.3 vs 53.333 (minor).

Gap log: CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json — 79 games / 787 plays, measured: false on all 79;
mean_pocket_depth_yd, min_pass_rush_separation_yd, mean_strain, mean_soe_yd, primary_coverage_shell are null for every game.
No venue/hash/sideline calibration data files exist.
Report MD carries a 2026-10-17 RETRACTION NOTICE but JSON artifacts still assert HOMOGRAPHY_CALIBRATED / ALL_THREE_PLAYS_COMPLETED_CLEANLY.

4. COVERAGE SHELL vs VISUAL EVIDENCE (Task 3)
---------------------------------------------
Verdict: agreement test cannot run — zero plays carry both a charting coverage label and a vision label.
Charting coverage does not exist for 2026 at all (0/13,842 plays).

What exists (schema-verified):
  Charting: pbp_participation_2016-2025 has defense_coverage_type / defense_man_zone_type (2025: 22,055/45,184 plays, 48.8%).
  The 2026 reconstructed participation, ftn_charting_2026, play_by_play_2026, ngs_highlight_participation_2026 all lack any coverage field — 0/13,842 plays. 2026 only has pressure charting (box, rushers, blitzers: 13,438 plays).
  Vision: 3 unique labels / 6 ledger rows, all hardcoded literals in scripts/verify_and_calibrate_cv_pipeline.py:347,372,397
  (Cover 0 Blitz, Cover 2 Zone, Two-High Disguise -> Cover 3 Buzz), written at weight 0.0, validation_spec_met false.
  No shell classifier exists in the pipeline.

Per-play result:
  2026101200_4579 (2026_05_BUF_LA 4579, Allen->Shakir 57 yd): charting ABSENT; vision "Cover 0 Blitz"; 303 frames, 11 defenders, exact NGS match (6791/6791, 0.0 delta) -> NOT SUPPORTED: 2 safeties 12.4/9.9 yd deep at snap, 20.6/25.0 by frame 241; 0 of 100 post-snap frames with zero deep defenders; 6 rushers cross LOS. Blitz yes, Cover 0 no.
  2026092200_1820: charting ABSENT; vision "Cover 2 Zone"; no frames -> UNVERIFIABLE: game id in no 2026 dataset; 2026-09-22 is a Tuesday with no games.
  2026092900_2740: charting ABSENT; vision "Two-High -> Cover 3 Buzz"; no frames -> UNVERIFIABLE: same; 2026-09-29 Tuesday.

Integrity finding: CV_CALIBRATION_WEEKS_1_TO_5.json claims TARGET_2_MET for coverage-shell distribution (chi2 p=0.54).
Code is np.random.multinomial(n, shell_priors) twice, then chi-square against those same priors (verify_and_calibrate_cv_pipeline.py:739-742) — circular RNG, not measurement. Its "five extreme plays" cite nonexistent game ids.

Gaps: no 2026 coverage charting (0/13,842); no vision shell classifier; 2/3 vision ids unresolvable; no raw broadcast pixels (tracking is broadcast_projected_from_ngs_10hz); 2026 roster contains impossible assignments (Aaron Donald on LA, McDuffie/Watson on LA) — corpus is simulated/regenerated.
Report: C:/Users/Garrett/Sports/docs/predictions/research/2026-10-17/COVERAGE_SHELL_VS_FRAME_EVIDENCE.md (143 lines).

5. CONTINUITY VISUAL CROSS-CHECK (Task 4) — read-only
-----------------------------------------------------
All 30 current picks (11 NFL + 19 NCAAF, Week-7 games Oct 17-18 2026) read only; nothing written or modified.

Finding: no pick has a missing continuity delta; all 30 carry a complete ol/dl/dbContinuityDelta triple. No pick has genuine visual/charting evidence to compare against (no film exists for future games).

The one flag:
  #4 NFL — Chicago Bears @ Atlanta Falcons, TOTAL OVER 52.5 (cmvcqdlkm00cl45ukzx9b4kpy, conf 70):
    Availability text names Cameron Thomas (DE, ATL) while dlContinuityDelta = 0.
    Strength: weak/PLAUSIBLE — Thomas's status field is blank (no designation), unlike C.J. Henderson (CB, ATL) — Out (Groin).
    So a named DL body is in the availability surface, not a confirmed DL injury carrying zero weight.

Systemic finding: deltas are a constant, not a measure:
  - 2 distinct triples across 30 picks: (-0.08, 0, -0.05) x 25 and (0, 0, 0) x 5. Zero missing values.
  - All 11 NFL picks get identical (-0.08, 0, -0.05) across 11 different matchups.
  - The 5 zero triples are exactly the 5 NCAAF bootstrap picks whose evidence says "no confirmed ESPN injury report; neutral baseline retained." Zero there means NO DATA, not measured continuity.
  - Split is clean by league, not by team: PLAY_CHARTING weight 18.7-35.2 (322-374 observations) on 11/11 NFL picks; 0 weight (4 observations) on 19/19 NCAAF. Whatever drives the delta tracks the league branch, not the personnel listed.

Secondary integrity issues (bear on whether evidence can support a delta):
  - 25 picks carry injuryEvidence.status "VERIFIED" ("Official 90-minute pregame report processed against depth charts") while the paired factorBreakdown evidence object reads sourceName "not-configured", trustLevel 0, freshnessStatus "MISSING", activationStatus "BLOCKED_MISSING_SOURCE", sampleSize null — "VERIFIED" contradicts its own evidence block.
  - Impossible pregame-report timestamps: all 11 NFL picks claim a 90-minute pregame report at fetchedAt 14.25-49.00 h before kickoff (49ers game: fetched Oct 17 23:15Z, kicks Oct 20 00:15Z). 14 picks exceed 2 h.
  - Availability simultaneously weighted and blocked: intelligence.familyWeights.INJURY_AVAILABILITY 81-94 on 11 NFL picks ("Availability is material and helps this side ~16.3 pts") while Shadow PLAYER AVAILABILITY factor is weight 0, trustLevel 0, BLOCKED_MISSING_SOURCE, "cannot affect confidence."
  - Personnel list is alphabetical, not unit-selected: exactly 3 players per NFL pick sorted by first name; 23 of 33 names have blank status. It's a truncated injury table, so absence of a DL name is not evidence of DL health.
  - 5 NCAAF traces self-contradict: print "Trench/secondary continuity: OL delta 0, DL delta 0, DB delta 0" (echo of values, not charting) and label pick "Trench & Altitude Correlated Under SGP" while stating "0 signal(s), 0 pair(s) on a shared outcome."
  - NCAAF traces templated: identical "rest home 41, rest away 35" and "weather Sunny, 60°F, wind 3 mph" across five different venues; 3 of 5 totals picks cite a spread line (-6, -3, 7.5) instead of the total.

6. PASS/FAIL COUNTS BY COMPONENT
--------------------------------
Component                  Measurable   Pass   Fail   N/A (no real data)
-------------------------  ----------   ----   ----   ------------------
Tracklet identity          0            0      0      20 target plays
Homography                 0            0      0      20 target plays
Pocket depth               0            0      0      20 target plays
Separation                 0            0      0      20 target plays
SOE                        0            0      0      20 target plays
Coverage shell             0            0      0      20 target plays

(0 measurable because no real frames/tracklets exist for pre-Week-6 2026. The 15-20 play target
could not be approached — gap logged, not fabricated.)

7. DEFECT LIST (play_id, field, measured value, visual observation)
-------------------------------------------------------------------
D1  coverage-defenders-week1-2026.png | attribution | frame shows @hawkblogger; AGENTS.md:1966 says @hawkbledger | Doc/frame mismatch; image is a leaderboard, supports no coverage/pocket/separation claim.
D2  coverage-defenders-week1-2026.png | date | doc says 2026-09-17; image shows only 5:05 clock | Date claim unverifiable from frame.
D3  CV_HOMOGRAPHY_PROOF.json | reprojection RMSE | stored artifact: 4.4261 m mean / 13.535 yd max | Citing report claims 0.0974 m — 45x understatement of own artifact.
D4  CV_HOMOGRAPHY_PROOF.json | far sideline | projects to y=39.795 yd vs 53.33 actual (13.54 yd off) | Sideline placed 13.5 yd inbounds.
D5  CV_HOMOGRAPHY_PROOF.json | correspondences | four x=50 landmarks collinear (v=680,480,395.2,230) | No camera satisfies; forces far sideline to v=-324.5 px (off frame); recorded at 230.
D6  CV_HOMOGRAPHY_PROOF.json | local scale | non-monotonic 8.48 -> 13.74 -> 7.01 px/yd | Impossible for a real lens.
D7  CV_HOMOGRAPHY_PROOF.json | yard lines | 40-yd line -> 39.157 and 41.018 yd (1.86 yd spread) | Every point on a yard line must map to constant x.
D8  cv-template.ts:25 | HASH_OFFSET_M | 5.64 (hash-to-hash separation) used as sideline offset; correct near-hash y=21.5646 m | ~17.4 yd error; compresses lateral scale ~3.8x.
D9  cv-field-model.ts | coordinate origin | Python 0-120 yd from back of end zone vs TS 0-91.44 m from goal line with negatives in near end zone | 10-yd (9.14 m) x-shift on direct feed.
D10 skeletrack_v2.py:665-669 | yard-line labelling | left-to-right, no handedness/yard-number check; 10-yd spacing onto 5-yd detector | Systematic 2x label error; no hash/sideline sanity check (hash rows must be 6.17 yd apart).
D11 play_4579_high_pressure | pocket_depth_yards | claimed 4.15; QB max dropback 8.17, deepest OL at throw 7.96 | Claim contradicts tracking.
D12 play_4579_high_pressure | pass_rush_separation_yards | claimed 0.85; min rusher-QB distance 2.44 (never < 2.0) | Claim contradicts tracking.
D13 play_4579_high_pressure | coverage_shell | claimed "Cover 0 Blitz"; 2 defenders at 9.3/12.9 yd depth at snap | Deep help present — not Cover 0.
D14 play_4579_high_pressure | box_defender_count | claimed 8; 10 defenders within +/-5 yd of LOS | Definition-sensitive mismatch.
D15 play_4579_high_pressure | video_timestamp | claimed "Q2 3 & 8 @ LOS 35.0yd"; actual down 2, 16 to go, LOS BUF 21/abs 89 | Timestamp wrong.
D16 play_1820_clean_pocket / play_2740_coverage_disguise / 5 extreme plays | all metrics | 0 rows in 2026 tracking; game ids sequential 0500-0504 | Plays do not exist / fabricated.
D17 cv-homography.ts output claim | homography calibrated | asserts HOMOGRAPHY_CALIBRATED / ALL_THREE_PLAYS_COMPLETED_CLEANLY | JSON artifacts still assert calibrated despite 2026-10-17 RETRACTION NOTICE in MD; no measured output exists.

8. GAPS LOGGED (not fabricated)
-------------------------------
- No 2026 tracking feed on disk (BDB zip is 2023-2025 only).
- No frames keyed to playId for any 2026 play.
- No 2D landmarks for homography calibration on real frames.
- No 2026 coverage charting (0/13,842 plays).
- No vision coverage-shell classifier exists.
- No raw broadcast MP4 clips (tracking is broadcast_projected_from_ngs_10hz).
- separation-reconstruct.ts truth sample (NGS Highlights coordinate sample) absent.
- 2026 roster contains impossible assignments (Aaron Donald on LA, McDuffie/Watson on LA) — corpus appears simulated/regenerated.

9. CONCLUSION
-------------
The CV pipeline cannot be validated against real pre-Week-6 2026 data: 0 plays reviewed, 0 frames processed,
0 measurable results across all six components. Existing artifacts (homography proof, coverage labels, SOE
values) are synthetic, hardcoded, circularly validated, or assert calibration they do not measure. The 17
defects above are concrete, field-verified integrity failures. To unblock vision validation, the following
are required: a 2026 tracking feed, frames keyed to playId, 2D landmarks for homography, real broadcast
pixels, and 2026 coverage charting. No code changes, deploys, or production-table writes were made.

Report file: C:/Users/Garrett/vision-test-report-2026-pre-week-6.md
