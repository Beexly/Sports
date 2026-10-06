# 0840 How many independent bets are there? (arXiv:physics/0601166v3)

**Citation:** Daniel Polakow, Tim Gebbie (2006). *How many independent bets are there?* arXiv:physics/0601166v3. URL: https://arxiv.org/abs/physics/0601166v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org).
**Verdict:** ADAPT — a 20-year-old but still sharp heuristic: SVD the return/correlation matrix, count eigenvalues ≥ 1 (Kaiser–Gutman), and set effective breadth ≈ √(effective dimensions) instead of √(N); on 41 JSE equities this cut apparent breadth from ~6 to ~3. GSE should apply it to correlated pick portfolios before aggregate Kelly sizing.

## 1. Research question

When sizing across many simultaneous positions (or bets), the naive diversification credit assumes N independent bets (breadth = √N). How many *effectively independent* bets are there really, given the correlation structure? The paper uses random matrix theory / PCA to estimate the effective dimensionality of a return universe.

## 2. Dataset / schema

- **Assets:** 41 liquid equities on the Johannesburg Stock Exchange (JSE); extended universe adds South African government bonds and 13 international assets.
- **Period:** 4.3 years of daily data from March 2003.
- **Schema:** daily return series per asset; correlation/return matrix for SVD.
- **Access:** historical JSE data; replicable in principle, exact sample not provided.

## 3. Method / model

- Compute the SVD (equivalently eigendecomposition) of the return/correlation matrix.
- Apply the Kaiser–Gutman rule: count eigenvalues ≥ 1 as the number of effective dimensions (signal factors); the rest is noise.
- Effective breadth = √(effective dimensions), replacing the naive √N.
- Interpretation: with correlated assets, the portfolio's true independent-bet count is far below N, so Kelly-style aggregate sizing must be scaled down accordingly.

## 4. Equations & assumptions

- Eigendecomposition of the correlation matrix; Kaiser–Gutman threshold: retain factors with eigenvalue ≥ 1.
- Effective breadth ≈ √(N_effective).
- Assumptions: the correlation matrix estimated over the window is stable; eigenvalue ≥ 1 cleanly separates signal from noise (a heuristic, not a theorem); returns are approximately stationary over 4.3 years.

## 5. Features / target

- **Inputs:** asset return matrix (assets × days).
- **Target:** effective dimension count and effective breadth — a diagnostic, not a prediction.

## 6. Validation design

- Demonstrative, not predictive: applies the decomposition to the JSE universe, then to the extended universe (equities + bonds + international assets).
- No baselines, no out-of-sample test; the "result" is the dimensionality estimate itself.

## 7. Numerical results / baselines

- 41 JSE equities: 8 effective dimensions → breadth ≈ 3, vs conventional √41 ≈ 6.
- Equities + bonds: 9 dimensions → breadth 3 vs conventional ≈ 7.
- Mixed universe (equities + bonds + 13 international): 13 dimensions → breadth ≈ 4 vs conventional ≈ 8.
- The consistent message: true independent-bet count is roughly half the naive count.

## 8. Code / data availability

MATLAB code and graph data available from the author by request — not openly hosted.

## 9. Leakage & limitations

- Old paper (2006), one emerging market, one arbitrary 4.3-year window; no out-of-sample validation of any kind.
- Kaiser–Gutman ≥ 1 threshold is arbitrary; random-matrix-theory (Marchenko–Pastur) edge would be the modern replacement.
- No transaction costs or portfolio construction — pure diagnostic.
- Correlation estimated on daily stock returns; bet-outcome correlations (binary, heavy-tailed) need a different estimator (e.g., tetrachoric or bootstrap).

## 10. GSE overlap

Per the existing-research map: no existing effective-breadth / independent-bet-count work in the repo. Kelly papers 0834–0836 assume either independence or a supplied covariance; this paper supplies the missing diagnostic for *how much* diversification credit a correlated slate deserves. New capability; pairs with 0835's joint-outcome Kelly.

## 11. GSE implementation spec

- Build the "breadth diagnostic": take the engine's historical pick PnL series (weekly), compute the correlation matrix, eigendecompose, apply Kaiser–Gutman and Marchenko–Pastur thresholds; report effective breadth per week/slate.
- Feed N_effective into aggregate Kelly: scale total stake exposure by √(N_effective/N) instead of sizing each pick independently.
- Effort: 1 day.

## 12. Reproducible test

Dataset: GSE engine picks 2023–2024 weekly PnL. Metric: compare realized portfolio volatility vs the volatility implied by (a) naive √N scaling and (b) effective-breadth scaling. Pass if effective-breadth scaling predicts realized volatility within 20% (vs naive overshooting diversification).

## 13. Acceptance / rejection gate

ADOPT as a pre-sizing diagnostic if effective breadth is consistently < 70% of √N on real GSE slates (confirming the paper's halving); REJECT if GSE pick correlations are near-zero (then N_effective ≈ N and the diagnostic is unnecessary).

## 14. Improvement experiment

Replace Kaiser–Gutman with a Marchenko–Pastur upper-edge test on the pick-PnL correlation matrix, and make the breadth estimate time-varying (rolling 12-week windows). Hypothesis: effective breadth collapses in high-correlation weeks (e.g., heavy-favorite slates) — a dynamic breadth scaler would automatically de-risk exactly when diversification is illusory.
