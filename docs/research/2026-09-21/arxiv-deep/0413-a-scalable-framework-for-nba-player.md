# [0413] A Scalable Framework for NBA Player and Team Comparisons Using Player Tracking Data (arXiv:1511.04351v2)

**Citation:** Scott Bruce (2015). *A Scalable Framework for NBA Player and Team Comparisons Using Player Tracking Data*. arXiv:1511.04351v2. URL: https://arxiv.org/abs/1511.04351v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1164 lines).
**Verdict:** ADAPT — port the PCA + Statistical Diversity Index (SDI) similarity framework to build NFL player-role embeddings and replacement-comps from NGS season aggregates, but fit strictly within historical windows and validate stability out-of-sample instead of trusting the paper's descriptive in-sample analysis.

## 1. Research question
How can high-dimensional NBA player-tracking data be reduced to a small set of interpretable dimensions so that players and teams can be compared (who is similar to whom?) in a scalable framework that absorbs new statistics as they emerge?

## 2. Dataset / schema
- NBA player-tracking aggregates for the 2013–2014 regular season (stats.nba.com era SportVu aggregates).
- 482 players available; analysis retains 360 players who played ≥41 games (half the season), each with 66 tracking statistics.
- Schema: per-48-minute, per-touch, and per-shot statistics only — season totals and per-game stats deliberately dropped to avoid games/minutes confounding. The 66 stats span touches, passes, catch-and-shoot, pull-ups, drives, rebounding chances, defensive proximity, etc.
- Access: aggregates were public via stats.nba.com at the time; no raw tracking released.

## 3. Method / model
- Standardize all 66 statistics; run PCA; retain the first 4 principal components (68% of variance; elbow after PC4).
- Interpret components via highest-loading stats: PC1 = overall offensive involvement/usage; PC2 = ball movement vs isolation (catch-and-shoot vs passes); PC3/PC4 = rebounding/defensive dimensions (per the paper's loading tables).
- Statistical Diversity Index (SDI): SDI_{ij} = Σ_{k=1}^{4} (t_{k(i)} − t_{k(j)})² — squared Euclidean distance in the 4-PC space; lower = more similar.
- Team scores: minutes-weighted average t_{k(team)} = Σ_i m_i t_{k(i)} / Σ_i m_i.
- OLS regression of team winning percentage on the four team PC scores.

## 4. Equations & assumptions
- SDI_{ij} = Σ_{k=1}^{4} (t_{k(i)} − t_{k(j)})².
- Team component: t_{k(team)} = (Σ_i m_i t_{k(i)}) / (Σ_i m_i), m_i = minutes.
- Assumptions: (a) standardized Euclidean distance in truncated PC space measures true stylistic similarity; (b) the first 4 PCs (68%) retain everything relevant for comparison; (c) minutes-weighting correctly aggregates player styles to team style; (d) season aggregates are the right granularity (no within-season dynamics).

## 5. Features / target
- Input features: the 66 standardized tracking statistics per player.
- Targets: (a) nearest-neighbor similar-player rankings via SDI; (b) team winning percentage (regression).

## 6. Validation design
- Descriptive: no train/test split, no out-of-sample validation. The win% regression is in-sample OLS on 30 teams. Similar-player claims are illustrated with examples (Tony Parker). The traditional-vs-tracking comparison recomputes SDI on traditional stats only.

## 7. Numerical results / baselines
- Variance captured: PC1 42%, PC2 12%, PC3 9%, PC4 4% — first four total 68%.
- Win% regression: R² = 0.59 (paper's value; the "0.59" appears as the model R²). Coefficients (paper's table): PC2 0.17 (p=0.005), PC3 −0.20 (p<0.001), PC4 0.09 (p=0.013); PC1 not significant. Paper's interpretation: ball movement, rebounding and rim protection dimensions associate with winning; raw usage (PC1) does not.
- Tony Parker comp: with tracking stats, most similar player is J.J. Barea (SDI 0.7; salaries $12.5M vs $4,687,000 — the paper's value-play example). With traditional stats only, most similar is DeMar DeRozan, whose tracking-data SDI to Parker is 75, with 89 other players closer.
- Knicks illustration: extremely negative team PC2 attributed to catch-and-shoot offense (J.R. Smith, Bargnani, Hardaway Jr. top-50 in catch-and-shoot points/48) plus poor ball movement (8 of 12 players below the 58 passes/48-min average).

## 8. Code / data availability
None stated in the extracted text. Underlying aggregates were public on stats.nba.com (2013-14).

## 9. Leakage & limitations
- Purely descriptive and in-sample: the R²=0.59 win% regression has 4 predictors on 30 teams with no holdout — overfitting risk is real and untested.
- Euclidean distance in truncated PCA space discards 32% of variance that may contain task-relevant signal; standardization gives rare-but-important stats equal footing with noisy ones.
- Season aggregates hide role changes, injuries, and within-season evolution; a mid-season trade breaks the player-season vector.
- Minutes-weighting conflates "team style" with "who plays a lot."
- No temporal stability test: do PC scores / nearest neighbors persist across seasons? Unknown.
- External validity to NFL: the framework ports cleanly to NGS aggregates, but NFL positions are more role-fragmented than NBA roles — a single PCA across all positions may be less meaningful than position-specific embeddings.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE has the 27-family NGS/tracking taxonomy and the NGS replacement spec (docs/research/2026-09-18-ngs-replacement-spec.md) — metric inventories, not similarity infrastructure. No player-embedding or comp-finding system exists in the corpus. This is an **extension**: a role-embedding + nearest-neighbor replacement layer built on top of the existing NGS metric inventory, directly useful for WR/RB/TE comps and "find me a cheaper J.J. Barea" free-agency queries.

## 11. GSE implementation spec
- Data: NGS season aggregates 2019–2025 (nflverse + NGS): per-route/per-carry/per-target efficiency, alignment, speed, separation, cushion metrics — position-specific feature sets (WR, RB, TE separately).
- Feature engineering: standardize within position; PCA/SVD retaining ~70% variance; minutes→snap-weighted team aggregation.
- Model: SDI nearest neighbors per position; expose "similar players" API for comps; team-level PC scores as matchup features.
- Training protocol: fit PCA strictly on seasons ≤ t when producing comps for season t+1 (no peeking); recompute annually.
- Serving: batch (weekly) comp lists + embeddings table for downstream models.
- Estimated effort: 1–2 weeks for a single engineer.

## 12. Reproducible test
- Dataset: WR seasons 2020–2024 (≥300 routes), NGS aggregates.
- Procedure: fit position-specific PCA on 2020–2023; for each 2024 WR, retrieve 5 nearest 2023 comps by SDI; predict 2024 EPA/target as the snap-weighted comp average.
- Metric: out-of-sample R² on 2024.
- Baseline to beat: positional-average EPA/target forecast (no comps).

## 13. Acceptance / rejection gate
ADOPT the SDI comp system as a GSE feature IF comp-based EPA/target forecasts beat the positional-average baseline by ≥ 0.03 R² on the 2024 holdout AND nearest-neighbor lists show ≥50% overlap when refit on 2020–2022 vs 2021–2023 (stability check); otherwise REJECT as unstable descriptive artifact. Gate fixed before running.

## 14. Improvement experiment
Replace unsupervised PCA with a supervised contrastive embedding: train the embedding so that players with similar *future* production (next-season EPA/target) are near each other, rather than maximizing explained variance of current-season stats. The paper's PCA optimizes for variance, not predictive similarity — test whether the supervised embedding beats SDI comps by ≥0.02 R² on the same 2024 holdout.
