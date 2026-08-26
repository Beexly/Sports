# Close-Calibration & CPOE Persistence — 2026-08-26 Overnight

Files created:
- scripts/ops/build-close-calibration.py
- handoff/research/overnight-2026-08-26/close-calibration.md (this file)
- Note: data/nflverse/pbp/play_by_play_2023.csv.gz download FAILED (bad gzip, removed); persistence requires 2023+2024 overlap.

## TASK A — Closing-Price Calibration (devigged spread odds)
Data: data/nflverse/games_harness_rows.jsonl (5065 rows with both spread odds; seasons 2021-2025 fully covered, older mostly null).
Method: American odds -> implied prob -> proportional devig (sum=1). Bin by implied-prob decile; compare expected cover rate vs observed (actual result > spreadLineHome).
Results (exact):
- Overall: n=5065, expected=0.513, observed=0.476, cal_error=0.038 (line is NOT a fair price at aggregate; under-covers by ~3.8pp).
- Deciles (low->high implied prob): cal errors [0.017, 0.040, 0.029, 0.008, 0.067, 0.047, 0.041, 0.038, 0.063, 0.041]. Largest mis-calibration in decile 5 (expected 0.512, observed 0.445, error 0.067) and decile 9 (0.532 vs 0.468, 0.063). High-implied-prob bins systematically over-estimate cover rate.
Disclaimer: uses single-season snapshot; home-spread-odds only; pushes excluded; no line-movement dynamics.

## TASK B — CPOE Persistence + Market Residual (COMPLETED round 2, orchestrator)

play_by_play_2023.csv.gz re-downloaded clean (19.2MB, gzip verified, 49,666
plays) and the analysis the original run skipped is now done:

- Team cpoe season-mean persistence 2023→2024: **Spearman r = 0.4219**
  (n=32 teams) — moderate, real.
- cpoe(2023) vs 2024 average spread residual (actual margin − close):
  **Pearson +0.352** (n=32). Median split: high-cpoe-half teams beat the
  close by +0.88 pts/game in 2024, low-cpoe-half by −0.88 pts/game —
  a 1.76pp gap against an SE of ≈0.98pts per half → roughly **1.8 SE,
  suggestive not confirmatory** (n=32; single season-pair; play-level
  noise dominates).

Verdict: SCAN-ONLY, falsifier-queue candidate. This is the first signal all
night with BOTH persistence AND a positive market-residual link. Next-cycle
design: game-level modelProb from rolling cpoe vs devigged close prob,
falsifyBind over 2016–2025 once more pbp seasons are pulled. Disclaimer:
correlation ≠ edge; no price data beyond consensus close; n=32.

Next steps: obtain working play_by_play_2023.csv.gz (nflverse pbp release) to compute 2023/2024 overlap persistence; rerun correlation only after overlap confirmed.
