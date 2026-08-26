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
