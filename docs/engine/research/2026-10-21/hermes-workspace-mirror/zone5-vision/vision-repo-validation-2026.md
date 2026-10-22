GSE VISION REPO VALIDATION REPORT — Pre-Week-6 2026
===================================================
Generated: 2026-10-17 (Canada/Central CDT)
Repo: Beexly/Sports, data workspace C:/Users/Garrett/Sports
Vision path: intelligence/vision/ (data + shadow + code)
Scope: pre-Week-6 2026 only. Real extracts only — no synthetic data.
Constraint honored: no code changes, no deploys, no production writes.

This report corrects the earlier disk-sweep conclusion ("no data") — the vision
assets DO exist under C:/Users/Garrett/Sports/intelligence/vision/. The earlier
subagents searched .cagent/Sports and .sports-scrub-20261003 but not this root.

================================================================
1. ENRICHMENT PARQUET STATS
================================================================
File: intelligence/vision/data/tracklet_outcome_enrichment_2026.parquet

Shape: 17,312 rows x 39 columns
Unique play_id: 725
Weeks present: [1, 2, 3, 4, 5]  (all pre-Week-6 ✓)
Plays per week (nunique play_id): {1:164, 2:135, 3:150, 4:170, 5:152}
  NOTE: weekly nuniques sum to 771 > 725 total unique — play_ids should not span
  multiple weeks; either cross-week duplication or a groupby artifact. Flagged for
  investigation, not a measured defect in this report.

Column categories present:
  Identifiers: game_id ([PHONE] redacted), nflverse_game_id (e.g. "2026_01_NE_SEA"),
               play_id, week, gsis_id, nfl_id, display_name, position, jersey_number
  Role flags: is_offense_play, is_defense_play, was_running_route, was_blitzing,
              is_passer, is_targeted_receiver, is_rusher, is_tackler_or_sacker
  Tracking quality: frames_tracked, single_view/jacobian/multi_view_kalman_rmse_m,
                    single_view/jacobian/multi_view_ci90_coverage,
                    peak_kalman_speed_ms
  Game context: game_offense/defense_snaps, snap_pct, injury_report_status,
                injury_practice_status, weight
  Outcome linkage: play_epa, play_wpa, play_success, play_yards_gained,
                   play_air_yards, play_yards_after_catch, play_cpoe

Non-null rates (100% on all key fields): game_id, play_id, nfl_id,
single_view_ci90_coverage, jacobian_ci90_coverage, multi_view_ci90_coverage all
17,312/17,312. nfl_id range 29,851-63,904 (valid, no placeholders).

CRITICAL GAP — spatial/label columns ABSENT:
  The enrichment parquet does NOT contain x, y, separation, pocket_depth, SOE,
  or coverage_shell columns. The only columns matching those tokens are the
  ci90_coverage fields (Kalman confidence coverage, not field coverage). Therefore
  separation, pocket depth, SOE, and coverage shell CANNOT be read from this file.
  A column search for ['x','y','sep','pocket','soe','coverage'] returns only
  play_id, display_name, jersey_number, is_*_play, *_ci90_coverage, injury_*,
  play_*_outcome — no spatial coordinates.

Shadow play_id presence:
  play_id 4579: 22 rows, week 5 (PRESENT — matches proof play)
  play_id 1820: 0 rows (ABSENT — not in 2026 enrichment)
  play_id 2740: 0 rows (ABSENT — not in 2026 enrichment)

Outcome linkage (from validation summary): pbp join rate 1.0 (17,312/17,312),
snap-counts join 0.9964 (17,249 rows), injury-report-tagged rows 2,719,
targeted-receiver tracklets 530, targeted-receiver peak_speed vs EPA corr 0.2838.

================================================================
2. PROOF-PLAY CONTENTS (proof_play_2026101200_4579)
================================================================
File: intelligence/vision/data/proof_play_2026101200_4579.parquet

Shape: 6,791 rows x 16 columns
play_id: 4579, week: 5, season: 2026, season_type: REG
game_id: [PHONE] (redacted)
Unique frames (frame_id): 303 (frames 1-303, 10 Hz)
Columns: season, season_type, week, game_id, play_id, frame_id, time, side,
         team_abbr, gsis_id, esb_id, jersey_number, position, x, y, display_name

Players detected (frame 1 sample): Khalil Shakir (WR), Dalton Kincaid (TE),
Josh Allen (QB), Dawson Knox (TE), Connor McGovern (C), Tylan Grable (T),
Alec Anderson (G), O'Cyrus Torrence (G), Dion Dawkins (T), James Cook (RB) —
BUF offense; this is the Allen -> Shakir 57-yd completion play.

Coordinate ranges:
  x: 14.45 to 103.46 (inside [0,120] ✓; 0 rows outside)
  y: -0.82 to 45.97  (**37 rows with y OUTSIDE [0,53.33]** — impossible lateral
     coordinate; y=-0.82 is 0.82 yd beyond the sideline)
  null x: 0, null y: 0

QB (Josh Allen): 303 rows; x range 85.35-98.25, y range 23.22-30.40
  Frame 1 (snap): x=93.44, y=23.22
  Max dropback (snap x - min x) = 93.44 - 85.35 = 8.09 yd

Frame-1 offensive line (positions C/G/T): 5 linemen detected, x range
92.14-92.56 (clustered), y range 22.53-25.58. QB x=93.44, so max OL x (92.56)
is 0.88 yd IN FRONT of (lower x than) the QB at snap — the 5 linemen are tightly
clustered directly behind the QB, consistent with a clean pocket at snap.

Claimed defects vs measured (from shadow derived metrics, section 3C):
  pocket_depth_yards claimed 4.15: QB max dropback measured 8.09 yd. Pocket
     depth at throw time cannot be isolated from x/y alone (throw frame and
     rusher IDs not in this parquet). 4.15 is not falsifiable from this extract
     but 8.09 max dropback is the ceiling; 4.15 is plausible at throw time.
  pass_rush_separation_yards claimed 0.85: NOT computable from x/y alone (no
     rusher/defender IDs or separation column in this extract). Unverifiable here.
  coverage_shell claimed "Cover 0 Blitz": NOT in parquet (no coverage column).
     Shadow hardcodes it; see coverage section below.

CONFIRMED impossible value: 37 rows with y < 0 (min -0.82). This is an
out-of-bounds lateral coordinate — a real geometry defect in this extract.

================================================================
3. SHADOW LOG COUNTS AND CLAIMED RESULTS
================================================================
Directory: intelligence/vision/shadow/

3.1 validation_2026_highlights.jsonl — 788 lines
  787 play_validation records + 1 summary record.
  Weeks present: [1,2,3,4,5]; play_types: kickoff, pass, punt, rush, sack.
  Claimed: total_2026_reg_highlight_plays 787, overlapping_plays_evaluated 787,
           total_player_play_tracklets 17,312 (matches enrichment row count ✓),
           total_player_frame_observations 1,181,625.
  Homography: correspondences 22, reproj_err_m 0.0394.
  Jacobian single-view control: mean_rmse_m 0.0974, median 0.0988,
      mean_ci90_coverage 0.9818, plays in 85-95 CI90 band 75/787 (9.5%),
      plays flagged outside band 712. Mid zone mean_coverage 0.9999 but
      0/787 plays in band (all above 95 — systematically overconfident).
  Isotropic baseline: mean_rmse_m 0.0955, 278/787 in band.
  Multi-view synthetic triangulation: mean_rmse_m 0.0691, 652/787 in band (82.9%).
  Identity robustness: 17,312 player plays, jersey-only unmatched rate 0.0777,
      shadow jersey-color-embedding unmatched rate 0.0, false matches 0.
  multi_view_availability_audit finding: 0/787 plays have real broadcast MP4 in
      repo; 0/787 have real second camera or All-22 video on free surfaces.
      NGS publishes single canonical 10 Hz Zebra UWB field-coordinate stream per
      play, NOT multi-angle broadcast video. NFL+ Pro All-22 is paywalled/DRM-gated.
  weight: 0.0, validation_spec_met: false.

3.2 skeletrack_v2_shadow.jsonl — 68 lines (frames 0-67)
  Proof play: play_id 1766, TB vs DAL Week 1 2022 (Tom Brady 47-yd completion to
  Julio Jones) — HISTORICAL 2022 data, NOT 2026.
  22 players, identity_join_rate 1.0, homography_active true,
  Hartley DLT method ("Score-bug mask -> adaptive white gate -> Canny ->
  sign-normalized Hough -> yard-line x hash-mark intersections -> Hartley DLT"),
  correspondences_detected 18, landmark_reprojection_mean_err_m 0.0242.

3.3 bytetrack_shadow.jsonl — 1,780 lines
  Association-stage log; self-test scenarios (track-before/after occlusion
  identity preserved; background rejected; ball bank RMSE 0.7969 vs player 1.0678).
  weight 0.0, validation_spec_met false, honesty "synthetic route self-test".

3.4 kalman_shadow.jsonl — 9 lines
  Filter self-test (mean_raw_error 0.3707 m -> filtered 0.2871 m).
  weight 0.0, validation_spec_met false, honesty "synthetic_route_self_test".

3.5 film_shadow_ledger.jsonl — 14 lines
  Feature sep_at_break_yd value 2.3; applied_weight 0.0 -> 0.35;
  validation_spec_met false -> true; honesty "uncalibrated_weight_0" ->
  "calibrated_dry_run"; nflverse_join "no_join_attempted".

3.6 real_tracking_shadow.jsonl — 2 lines
  Play 1766 (2022 TB vs DAL), 68 frames, 10 Hz, 22 true players,
  per_frame_purity 1.0, per_frame_assignments 1,496, ball tracked 66/68 frames.
  Historical data, not 2026.

3.7 vision_shadow.jsonl — 20 lines
  Frames 0-2: detector "roboflow-sports", is_mock true, ModuleNotFoundError
  (roboflow absent), falling back to Mock. 22 players, 1 ball per frame,
  weight 0.0, validation_spec_met false.
  Lines 14-19: shadow_event "cv_play_derived_metrics" — 3 plays, DUPLICATED
  (each appears twice, identical):
    play_4579_high_pressure: pocket_depth 4.15, pass_rush_separation 0.85,
        strain 4.92, coverage "Cover 0 Blitz", receiver_separation 1.12,
        SOE -0.88, box 8 — weight 0.0, validation_spec_met false
    play_1820_clean_pocket: pocket_depth 7.65, separation 4.25, strain 0.42,
        coverage "Cover 2 Zone", separation 3.45, SOE 1.15, box 6
    play_2740_coverage_disguise: pocket_depth 6.1, separation 2.45, strain 1.78,
        coverage "Two-High Disguise -> Cover 3 Buzz", separation 3.8, SOE 1.52, box 7
  All derived metrics are hardcoded shadow literals, weight 0.0,
  validation_spec_met false, published_distribution_shift 0.0.

Cross-check of 787-play claim: validation_2026_highlights.jsonl summary reports
787 plays evaluated; enrichment parquet has 725 unique play_ids across weeks 1-5.
787 (shadow-claimed evaluated) vs 725 (enrichment unique) — the shadow evaluates
787 highlight plays but only 725 have enrichment rows. The 62-play gap is
unexplained (plays evaluated but not enriched, or enrichment deduped). Flagged.

================================================================
4. HOMOGRAPHY AND GEOMETRY CHECK ON REAL EXTRACTS
================================================================
Sample: proof_play_2026101200_4579 (303 frames, 22 players per frame).

Coordinate validity:
  x inside [0,120]: 6,791/6,791 rows ✓ (0 outside)
  y inside [0,53.33]: 6,754/6,791 rows; 37 rows OUTSIDE (y min -0.82) —
      IMPOSSIBLE lateral coordinate (beyond sideline).
  null x/y: 0 ✓

QB dropback: max 8.09 yd (snap x 93.44 -> min x 85.35). Consistent with a
real dropback; no negative or absurd values in x.

Pocket depth / separation / SOE: columns ABSENT from both parquets. The only
claimed values are hardcoded shadow literals (section 3.7), weight 0.0, not
measured from frames. Cannot be validated as real geometry.

Homography: the only Hartley DLT measurement (reproj_err 0.0242 m, 18
correspondences) is on historical 2022 play 1766 (skeletrack_v2 shadow), not a
2026 play. The validation summary reports homography_reproj_err_m 0.0394 with
22 correspondences across the 787-play audit, but 0/787 plays have real
broadcast frames, so this is single-view PnL/TVCalib calibration on projected
coordinates, not frame-based DLT.

Defects flagged (geometry):
  G1: proof_play_4579 — 37 rows with y outside [0,53.33] (min -0.82). Impossible
      lateral coordinate beyond sideline.
  G2: No x/y/separation/pocket/SOE columns in enrichment parquet — geometry
      metrics not derivable from tracked extract.

================================================================
5. COVERAGE AND CONTINUITY CROSS-CHECK
================================================================
5.1 Coverage shell
  The coverage_shell values ("Cover 0 Blitz", "Cover 2 Zone", "Two-High Disguise
  -> Cover 3 Buzz") appear ONLY in vision_shadow.jsonl as hardcoded
  cv_play_derived_metrics literals. The detector is a MOCK (rofoflow absent,
  ModuleNotFoundError). weight 0.0, validation_spec_met false on all three.
  Conclusion: coverage_shell is NOT a real label derived from frames; it is
  hardcoded shadow output. No frame supports or refutes any assigned shell.
  The 3 shadow play_ids: 4579 (present in enrichment), 1820 and 2740 (ABSENT —
  0 enrichment rows, not resolvable to real 2026 plays).

5.2 Continuity (live picks, read-only)
  Files: C:/Users/Garrett/nfl.json (11 picks), C:/Users/Garrett/ncaaf.json (19 picks).
  All 30 picks carry continuityDeltas {olContinuityDelta, dlContinuityDelta,
  dbContinuityDelta}. Distinct triples:
    NFL (11 picks): (-0.08, 0, -0.05) on ALL 11 — constant.
    NCAAF (19 picks): (0, 0, 0) on ALL 19 — constant.
  Conclusion: continuity deltas are league-level constants, NOT derived from any
  vision evidence (no frames exist for these Week-7 future games anyway).
  The 5 zero triples are exactly the 5 NCAAF bootstrap picks whose evidence
  states "no confirmed ESPN injury report; neutral baseline retained" — zero
  means NO DATA, not measured continuity.
  Flag: #4 NFL — Chicago Bears @ Atlanta Falcons, TOTAL OVER 52.5
  (cmvcqdlkm00cl45ukzx9b4kpy): availability text names Cameron Thomas (DE, ATL)
  while dlContinuityDelta = 0. Thomas's status field is blank (no designation),
  unlike C.J. Henderson (CB, ATL) — Out (Groin). Weak/PLAUSIBLE flag only;
  not a confirmed DL injury carrying zero weight.

================================================================
6. RE-DOWNLOAD PATH CONFIRMATION
================================================================
File: intelligence/vision/data/README.md (and ngs_highlight_tracking_loader.py)

Re-download command for full-season 10 Hz NGS highlight tracking (2026):
  python intelligence/vision/ngs_highlight_tracking_loader.py
    -> fetch_highlight_tracking(season=2026)
  Writes: intelligence/vision/data/ngs_highlight_tracking_2026.parquet
  Loader source: https://github.com/sportsdataverse/sportsdataverse-data/releases/download/
  (token-free, keyless). Also populates intelligence/coaching/data/ with
  ngs_highlights_{2018..2026}, ngs_highlight_participation_{2018..2026},
  ngs_highlight_events_{2018..2026}.

Already present on disk: ngs_highlight_tracking_2026.parquet (60 MB,
7,345,682 rows per validation spec [11], 1,161 plays in 2026).

BDB 2025 re-download (keyless, HuggingFace mirror):
  python -c "import urllib.request, shutil; base='https://huggingface.co/datasets/ameau01/Big-Data-Bowl-2025/resolve/main/big-data-bowl-data/';
  for f in ['tracking_week_1.csv','plays.csv','players.csv','games.csv','player_play.csv']:
      req=urllib.request.Request(base+f, headers={'User-Agent':'Mozilla/5.0'});
      with urllib.request.urlopen(req, timeout=120) as r, open('intelligence/vision/data/'+f,'wb') as out:
          shutil.copyfileobj(r, out, length=8*1048576)"
  tracking_week_1.csv = 926 MB.

Are the tracked extracts sufficient for a real validation pass?
  NO. Reasons:
    - 0/787 plays have real broadcast MP4 in repo (validation summary).
    - Detector is a MOCK (rofoflow absent); is_mock true on all frames.
    - Enrichment parquet lacks x/y/separation/pocket/coverage columns.
    - Coverage shell is hardcoded, weight 0.0.
    - The 3 shadow derived-metric plays include 2 non-existent 2026 play_ids
      (1820, 2740 have 0 enrichment rows).
  A real frame-level test CANNOT proceed yet. It requires actual broadcast
  frames/All-22 video (NFL+ Pro All-22 is paywalled/DRM-gated per the audit
  finding) plus a non-mock detector and spatial columns in the enrichment.

================================================================
7. CAN A REAL FRAME-LEVEL TEST NOW PROCEED?
================================================================
No. Not with tracked extracts alone.

Blockers:
  B1. Zero real broadcast frames for any 2026 play (0/787).
  B2. Vision detector mocked out (rofoflow package absent).
  B3. Enrichment parquet has no x/y/separation/pocket_depth/SOE/coverage_shell
      columns — geometry metrics are not derivable.
  B4. Coverage shell is hardcoded shadow literal at weight 0.0.
  B5. Two of three shadow derived-metric play_ids (1820, 2740) do not exist in
      2026 tracking/enrichment.

Unblock path (do not run download unless extracts insufficient — they are):
  Run `python intelligence/vision/ngs_highlight_tracking_loader.py` to ensure
  the full 2026 highlight tracking parquet is current, then obtain real broadcast
  frames (paywalled/DRM-gated — outside free zero-cost scope) and wire a real
  detector. Until then, validation remains at shadow/self-test level (weight 0.0,
  validation_spec_met false).

================================================================
8. CONSOLIDATED DEFECT LIST
================================================================
D1  proof_play_4579 | y coordinate | 37 rows with y outside [0,53.33], min y=-0.82 | Impossible lateral coordinate beyond sideline; out-of-bounds geometry.
D2  tracklet_outcome_enrichment_2026 | spatial columns | x, y, separation, pocket_depth, SOE, coverage_shell ABSENT | Geometry metrics not derivable from tracked extract; only ci90_coverage (Kalman confidence) present.
D3  validation_2026_highlights | broadcast frames | 0/787 plays have real MP4 in repo | No frame-level visual evidence exists for any 2026 play.
D4  vision_shadow | detector | rofoflow ModuleNotFoundError; Mock fallback on all frames | Detection is synthetic, not real.
D5  vision_shadow | coverage_shell | "Cover 0 Blitz"/"Cover 2 Zone"/"Two-High->Cover 3 Buzz" hardcoded | Not derived from frames; weight 0.0, validation_spec_met false.
D6  vision_shadow | play_id 1820, 2740 | 0 enrichment rows each | Not resolvable to real 2026 plays; derived metrics reference non-existent plays.
D7  validation_2026_highlights | play count | 787 evaluated vs 725 unique enrichment play_ids | 62-play gap unexplained (evaluated but not enriched, or dedup mismatch).
D8  skeletrack_v2_shadow | homography | Hartley DLT reproj_err 0.0242 m on 2022 play 1766 only | Homography validated on historical data, not a 2026 play.
D9  film_shadow_ledger | sep_at_break_yd | weight 0.0 -> 0.35, "uncalibrated_weight_0" -> "calibrated_dry_run" | Feature uncalibrated; geometric half pending footage.
D10 continuity | nfl.json/ncaaf.json | deltas constant by league (-0.08,0,-0.05 NFL; 0,0,0 NCAAF) | Not derived from vision evidence; no frames for future Week-7 games.
D11 proof_play_4579 | pocket_depth/separation | claimed 4.15 / 0.85 in shadow; not in parquet | Not falsifiable from extract (no throw frame, no rusher IDs, no separation column).
D12 validation_2026_highlights | CI90 coverage | Mid zone mean_coverage 0.9999, 0/787 plays in 85-95 band | Systematically overconfident coverage; calibration band not met.

================================================================
9. CONCLUSION
================================================================
The Beexly/Sports vision extracts are real and present (17,312 enrichment rows /
725 plays / weeks 1-5; 6,791-row proof play; 787-play validation shadow; skeleton-
track/byteTrack/kalman shadows). However, a real frame-level computer-vision
validation CANNOT proceed on these extracts alone: 0/787 plays have broadcast
frames, the detector is mocked, the enrichment lacks spatial/coverage columns,
coverage shell is hardcoded at weight 0.0, and two shadow play_ids don't exist in
2026 data. Twelve defects (D1-D12) are logged above, including one confirmed
impossible coordinate value (proof_play_4579 y=-0.82, 37 rows). The re-download
command is documented (section 6) but should not be run unless the extracts prove
insufficient — they are sufficient for shadow-level inspection but not for real
frame-level validation. No code changes, deploys, or production writes made.

Report file: C:/Users/Garrett/vision-repo-validation-2026.md
