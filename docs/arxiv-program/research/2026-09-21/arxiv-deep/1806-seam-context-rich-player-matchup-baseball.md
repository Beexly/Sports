# Ledger 1806 — SEAM Methodology for Context-Rich Player Matchup Evaluations in Baseball

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2005.07742
- **Title:** SEAM methodology for context-rich player matchup evaluations in baseball
- **Authors:** Julia Wapner, David Dalpiaz, Daniel J. Eck (University of Illinois)
- **Full-text-read statement:** I read the complete paper full text (abstract, introduction, SEAM convex-combination estimator, similarity-weight construction from pitch characteristics and contact tendencies, Statcast data description, conditional and fixed-region coverage validation, results tables, limitations, and references) from the ar5iv HTML full-text rendering, saved to `/tmp/wave4b-dfs2/papers/2005.07742.html` with extracted text at `/tmp/wave4b-dfs2/txt/2005.07742.txt`. Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

For a specific batter–pitcher matchup with very few direct observations, can we estimate the batted-ball location distribution better than batter-only or pitcher-only estimates by shrinking the direct matchup KDE toward *synthetic comparable* matchups — batter vs. similar pitchers and similar batters vs. pitcher?

## 3. Method/model

- **SEAM** (Synthetic-Estimation-Adjusted Matchup): estimates the batter–pitcher batted-ball location density as a **convex combination** of three KDEs:
  1. direct batter-vs-pitcher KDE,
  2. batter vs. *synthetic similar pitchers*,
  3. *synthetic similar batters* vs. pitcher.
- Player similarity weights are built from pitch characteristics (for pitchers) and batter contact tendencies (for batters).
- Combination weights are MSE-motivated: as the direct matchup sample size grows, weight collapses toward the direct KDE.

## 4. Mathematics, equations, assumptions

- Density estimate: f̂_BP = w₁f̂_direct + w₂f̂_batter-vs-synth-pitchers + w₃f̂_synth-batters-vs-pitcher, with wᵢ ≥ 0, Σwᵢ = 1; w₁ increasing in n_direct.
- Similarity kernels: Gaussian-type weights on standardized pitch-characteristic vectors (velocity, movement, spin) and batter contact-profile vectors.
- **Assumptions:** (a) the selected covariates (pitch characteristics, contact tendencies) sufficiently describe a player's relevant style; (b) KDE bandwidth choices are adequate for the spray-chart domain; (c) the pitch-mix metagame is stationary (not modeled).

## 5. Dataset/schema

- **Statcast data, 2017 onward**; trained through 2020, **2021 held out** as the evaluation season.
- Schema per batted ball: batter id, pitcher id, launch location coordinates, pitch characteristics, game context.

## 6. Features and target

- **Features:** batter identity, pitcher identity, pitch-characteristic similarity vectors, batter contact-tendency similarity vectors.
- **Target:** the batted-ball location probability density for the matchup (evaluated via coverage of held-out balls in play).

## 7. Validation design

- Train on 2017–2020, evaluate on 2021 (temporal holdout).
- **Conditional coverage:** for matchups with ≥ 10 balls in play in the holdout, check empirical coverage of nominal 0.50/0.75/0.90 highest-density regions.
- **Fixed-size region coverage:** coverage of fixed-cell-count regions (e.g., 2,000 cells).
- Baselines: batter-only KDE, pitcher-only KDE.

## 8. Exact results and baselines with numbers

Conditional coverage (nominal → empirical):

| Model | 0.50 | 0.75 | 0.90 |
|---|---|---|---|
| SEAM | **0.579** | **0.641** | **0.779** |
| Batter-only | 0.513 | 0.574 | 0.662 |
| Pitcher-only | 0.549 | 0.595 | 0.713 |

- Fixed-size (2,000-cell) region coverage: SEAM **0.758** vs. batter **0.741** vs. pitcher **0.750**.
- SEAM wins on every reported metric; the gains are largest at the 0.90 nominal level (+0.117 over batter-only, +0.066 over pitcher-only).

## 9. Code/data availability

- No public code URL was given in the extracted text.
- Data: Statcast (public via Baseball Savant).

## 10. Leakage and limitations

- Conditional validation only covers matchups with ≥ 10 holdout balls in play — the sparsest (and most common) matchups are excluded from the headline metric.
- Assumes selected covariates fully capture player style; unmeasured style dimensions leak into the residual.
- Pitch-mix metagame (league-wide approach changes) is not modeled; temporal drift between train and holdout is a risk.
- Larger-region coverage results favor SEAM partly by construction of the convex combination.

## 11. GSE overlap

- This is GSE's **sparse-matchup shrinkage template**: any player-vs-player (or player-vs-defense, pitcher-vs-umpire, receiver-vs-cornerback) projection with thin direct history should shrink toward synthetic comparables rather than toward a flat prior.
- Directly applicable to MLB prop projections (batter vs. pitcher hit/launch props) and, by analogy, to NFL receiver-vs-coverage matchup adjustments.

## 12. Implementation specification

1. **Inputs:** GSE's play-level data with both matchup parties identified; a player-similarity feature store (pitch characteristics / coverage tendencies / route profiles depending on sport).
2. **Build** similarity weights: standardized Euclidean/Gaussian kernel on the style vectors.
3. **Estimator:** for each matchup, compute the three KDEs (or distributional equivalents for the target stat) and the MSE-motivated convex weights with w_direct = n_direct/(n_direct + c), c tuned on validation.
4. **Output:** matchup-adjusted distribution for the prop target (e.g., batted-ball outcome probabilities, or yards-per-target vs. a coverage).
5. **Guardrail:** when n_direct = 0, the estimator must reduce exactly to the synthetic-comparable blend (no hard failure).

## 13. Reproducible test

- Replicate on one MLB season of GSE/Statcast data: train through year T−1, hold out year T; confirm SEAM-style convex blend beats batter-only and pitcher-only on 0.90-nominal conditional coverage for matchups with ≥ 10 holdout balls in play.
- Unit test: as n_direct → large, w₁ → 1 (estimator collapses to direct); as n_direct → 0, w₁ → 0.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** SEAM beats both baselines at all three nominal levels (0.579/0.641/0.779 vs. next-best 0.549/0.595/0.713) and on fixed-region coverage (0.758 vs. 0.750). Accept as ADAPT.
- **Improvement experiment:** learn the similarity metric (Mahalanobis/embedding distance) jointly with the convex weights by minimizing holdout negative log-likelihood instead of using fixed covariate weights; add a temporal-decay kernel on the direct sample. Success = 0.90-nominal conditional coverage ≥ 0.80 (vs. paper's 0.779) with calibration error not worse than the paper's.

**Verdict:** ADAPT — Synthetic-comparable convex shrinkage for sparse player matchups; adopt the three-way KDE blend with sample-size-driven weights as GSE's matchup-adjustment template for MLB and NFL coverage matchups, with a learned similarity metric as the improvement path.
