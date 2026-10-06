# [1134] Player Similarity to Messi via Multi-Criteria Distance (WhoScored 2017–18) (arXiv:1802.00967)

**Citation:** Authors (2018). *Player Similarity to Messi*. arXiv:1802.00967v1. URL: https://arxiv.org/abs/1802.00967
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, incl. appendix data tables).
**Verdict:** ADAPT — the interpretable normalized-distance retrieval over per-90-style performance features is a solid template for GSE's player-comparison tooling (DFS matchup research, "players like X" content), provided the min-max scaling is replaced with robust scaling and role/position controls.

## 1. Research question
Which players in Europe's top five leagues (2017–18 season through Jan 31) are most similar to Lionel Messi across 17 WhoScored performance features, using a multi-criteria distance method?

## 2. Dataset / schema
- 29 players total: Messi + 28 hand-selected candidates; 2017–18 season through Jan 31 (~20–24 matches per player).
- 17 WhoScored features (goals, assists, shots, key passes, dribbles, dispossessions, fouls suffered, through balls, etc. — full list in paper's appendix tables).
- Data printed in the appendix; no code stated; WhoScored as source (scraped at the time).

## 3. Method / model
- Min-max normalization of all 17 features; four criteria treated as minimization (cost-type) criteria.
- Manhattan (L1) distance across the 17 normalized dimensions from Messi's vector; rank candidates by ascending distance.
- Pearson correlations reported among features (all marked p=0.01): passes/key passes 0.80; dispossessions/dribbles 0.78; dribbles/fouled 0.77; through balls/key passes 0.73.

## 4. Equations & assumptions
No equations stated (normalization and L1 distance described in words, not formulas). Assumptions: the 17 features capture playing style; min-max normalization makes features comparable; the 28 hand-selected candidates are the relevant comparison set; equal weighting of all 17 dimensions is appropriate.

## 5. Features / target
Inputs: 17 per-player season aggregate features. Target: distance-to-Messi ranking (descriptive, not predictive — no target variable in the ML sense).

## 6. Validation design
None — no train/test split, no predictive validation, no baseline comparison. This is a descriptive ranking.

## 7. Numerical results / baselines
- Closest to Messi by Manhattan distance: Coutinho 3.769, Hazard 4.069, Thauvin 4.140, Dybala 4.254.
- Feature correlations (p=0.01): passes–key passes 0.80; dispossessions–dribbles 0.78; dribbles–fouled 0.77; through balls–key passes 0.73.
- These are exact paper values; no baselines.

## 8. Code / data availability
None stated (data printed in appendix; no code link).

## 9. Leakage & limitations
- 28 hand-selected candidates — the ranking is conditional on the author's shortlist, not a search over all players.
- Min-max normalization is outlier-sensitive: one extreme player rescales every distance.
- Equal weighting of 17 correlated features double-counts (the paper's own 0.80 correlation shows redundancy — e.g., passes and key passes counted nearly twice).
- Season aggregates through Jan 31 with ~20–24 matches each; no per-90 normalization mentioned — playing-time differences contaminate the comparison.
- No validation that "similar to Messi" predicts anything (transfer success, fantasy output).
- WhoScored feature definitions are proprietary.

## 10. GSE overlap
Extension. The existing-research map has extensive player-comparison material (WR coverage upgrades, matchup grades, similarity-adjacent work in the 2026-09-20 thunderdandfs tables) but no formalized similarity-retrieval method. GSE's DFS content ("players like X this week") and matchup research would benefit from a principled version. Nothing in-repo implements normalized multi-feature player retrieval.

## 11. GSE implementation spec
- Build "players-like-X" retrieval for NFL: per-90 (per-route, per-snap) normalized features from nflverse + FTN charting (target share, aDOT, YPRR, YAC, contested-catch rate, alignment splits); robust scaling (median/IQR) instead of min-max; Mahalanobis or weighted-L1 distance with correlation-aware weighting (down-weight the redundant pairs the paper's correlation analysis warns about); position/role controls (only compare WRs to WRs, slot to slot).
- Serve: weekly "closest comps" for every fantasy-relevant player, with distance + the 3 most similar historical player-seasons.
- Effort: 3–4 days for the feature pipeline + retrieval API.

## 12. Reproducible test
Dataset: nflverse 2022–2025 WR/TE/RB receiving features. Metric: do the retrieved comps predict next-4-week fantasy output better than position-average? Test: for each player-week, predict next-4-week PPR/game as the distance-weighted mean of the 5 nearest historical comps; baseline: trailing 4-week average. Gate: comp-based prediction must beat the trailing-average baseline on MAE by ≥5% on the 2025 holdout.

## 13. Acceptance / rejection gate
ADAPT the retrieval method if: comp-based forecasts beat the trailing-average baseline by ≥5% MAE on the 2025 holdout AND the top-5 comps pass a sanity check (same position/role in ≥4/5 for a 20-player sample). REJECT the paper's exact recipe (min-max + equal-weight L1 on aggregates) — keep the template, fix the scaling, weighting, and per-rate normalization.

## 14. Improvement experiment
Learn the weights: fit the feature weights by optimizing comp-based forecast accuracy (the §12 test) rather than using equal weights — a supervised similarity metric. Hypothesis: learned weights cut comp-forecast MAE further and reveal which features actually carry forward-predictive signal (likely YPRR/aDOT over raw totals).
