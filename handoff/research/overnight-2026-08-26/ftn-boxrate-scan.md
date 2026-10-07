FTN Box-Count Scan — 2024 Only
================================
Dataset: data/nflverse/ftn_boxrate_2024.jsonl (570 team-game rows)
Source: FTN charting 2024 (1 vendor) joined to pbp 2024 via nflverse_game_id==game_id + nflverse_play_id==play_id.
Caveats: single season (2024), single charting vendor (FTN), no falsifier-run edge claim.

CORRELATIONS (team-game level)
-------------------------------
Avg defensive box count (mean n_defense_box over rush plays) vs:
  - Offensive rush EPA/game: Pearson r=0.0185  Spearman ρ=0.0323  (n=570)
  - Offensive rush success rate/game: Pearson r=-0.0369  Spearman ρ=-0.0520  (n=570)

Interpretation: correlation alone does NOT establish predictive edge. No falsifier-run claim made.

SPLIT-HALF STABILITY (team avgBoxCount, weeks 1-8 vs 9-17)
------------------------------------------------------------
Teams with data in both halves: 32
Pearson r (early vs late team avg): 0.1536
Spearman ρ (early vs late team avg): 0.1716

HONEST CAVEATS
--------------
- 2024 single-season; season-level variance unmeasured.
- FTN is ONE charting vendor; no cross-vendor validation.
- Correlation ≠ causation; no out-of-sample predictive test performed.
- Box count aggregated per-game; situational down/distance/context not fully controlled.
- No falsifier-run edge claim; this is a SCAN only.

OUTPUT FILES
-------------
- Script: scripts/ops/build-ftn-boxrate-harness.py
- Data: data/nflverse/ftn_boxrate_2024.jsonl
- Report: handoff/research/overnight-2026-08-26/ftn-boxrate-scan.md

MULTI-SEASON BOX-NULL REPLICATION (2022-2024) — CORRELATION DISCLAIMERS MANDATORY
===================================================================================
Method: same harness logic (ftn charting joined to pbp rush plays via game+play id) extended to 2022 and 2023 using nflverse pbp downloads. Per-season team-game aggregation; correlation ≠ predictive edge; no falsifier-run claim.

PER-SEASON RESULTS (avg defensive box count vs rush EPA / success rate)
---------------------------------------------------------------------------
2022 — n_team_games=568, matched_rush_plays=15010
  EPA: Pearson r=-0.0066  Spearman ρ=-0.0083  (n=568 pairs)
  Success: Pearson r=0.0079  Spearman ρ=0.0003  (n=568)
2023 — n_team_games=570, matched_rush_plays=14877
  EPA: Pearson r=0.0407  Spearman ρ=0.0400  (n=570)
  Success: Pearson r=0.0375  Spearman ρ=0.0393  (n=570)
2024 — n_team_games=570, matched_rush_plays=15043 (matches prior single-season scan)
  EPA: Pearson r=0.0186  Spearman ρ=0.0323  (n=570)
  Success: Pearson r=-0.0368  Spearman ρ=-0.0519  (n=570)

POOLED 2022-24 — n_epa_pairs=1708
  EPA: Pearson r=0.0009  Spearman ρ=0.0128

INTERPRETATION (HONEST)
------------------------
- The ~r≈0.02 null holds across all three seasons individually and is even closer to zero pooled (r≈0.001).
- No season shows a meaningful predictive correlation; 2023 is the highest (r≈0.041) but still near-null.
- Season-level variance is small relative to noise; split-half stability remains weak.
- Caveats: single vendor (FTN), no cross-vendor validation, correlation ≠ causation, no out-of-sample predictive test, no falsifier-run claim. SCAN ONLY.

OUTPUT FILES (new)
------------------
- Script: scripts/ops/multi-season-boxnull.py
- Downloaded pbp: data/nflverse/pbp/play_by_play_2022.csv (unzipped from .gz), 2023.csv (same)
