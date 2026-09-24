# [0520] A Bayesian Variable Selection Approach to Major League Baseball Hitting Metrics (arXiv:0911.4503v1)

**Citation:** McShane, B.B., Braunstein, A., Piette, J., and Jensen, S.T. (2009). *A Bayesian Variable Selection Approach to Major League Baseball Hitting Metrics*. arXiv:0911.4503v1. URL: https://arxiv.org/abs/0911.4503v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~43,132 chars).
**Verdict:** ADAPT — the spike-and-slab consistency framework (proportion-of-signal players p₁ + negative-entropy separability) ports directly to GSE as a metric-reliability screen for NFL advanced stats, but must be re-fit per metric with NFL opportunity weights, not copied as-is.

## 1. Research question
Which of 50 proposed MLB offensive (hitting) metrics are genuinely consistent measures of player ability — i.e., carry predictive power for a player's future seasons — versus being dominated by noise? The authors build a Bayesian hierarchical variable-selection model that partitions players into "zeroed" (indistinguishable from league mean) vs. "non-zeroed" groups per metric, giving both player-level posterior means and a global signal measure per metric, with automatic multiple-testing control (per Scott & Berger 2006).

## 2. Dataset / schema
- Kappelman 2009 database (Fangraphs.com), public. 8,596 player-seasons from 1,575 unique players, 1974–2008 seasons. 50 offensive metrics (Appendix A: simple totals/rates e.g. 1B/PA, BB/PA, K/PA; composite rates e.g. OBP, SLG, OPS, ISO, wOBA; batted-ball splits e.g. GB/BIP, HR/FB, BABIP; baserunning e.g. SB/OB, Spd). For 10 metrics unavailable pre-2002 (BUH, BUH/H, FB/BIP, GB/BIP, GB/FB, HR/FB, IFFB/FB, IFH, IFH/H, LD/BIP), fit on 1,935 player-seasons / 585 players. Schema: y_ij = metric value for player i in season j; weights w_ij = inverse opportunities (1/PA, 1/PA⋆, 1/AB, 1/BIP, 1/H, 1/GB, 1/FB, 1/OB, 1/(SB+CS) per metric; see Appendix A table).

## 3. Method / model
- Hierarchical Bayesian mixture ("spike-and-slab", George & McCulloch 1997 style): y_ij ~ Normal(μ + α_i, w_ij·σ²); μ ~ Normal(0, K²=10000), σ² ~ Inv-Gamma(0.01, 0.01) (non-informative); α_i | γ_i=1 ~ Normal(0, τ²), α_i | γ_i=0 ~ Normal(0, v_0·τ²) with v_0=0.01 approximating the point mass; τ² ~ Inv-Gamma(0.01, 0.01) (robustness check: Gelman 2006 uniform prior on τ — results "nearly identical"); p₁ ~ Uniform(0,1), the mixing proportion = fraction of players with player-specific means. Data-driven p₁ gives automatic multiple-testing control (Scott & Berger 2006).
- Gibbs sampler: full analytic conditionals for μ, α, σ², τ², γ_i (Bernoulli), p₁ (Beta); 60,000 iterations, 10,000 burn-in, thinning every 50th draw.
- Signal proxies per metric: posterior mean p̂₁ (fraction of signal players) and negative entropy −H = (1/m)Σ[γ̂_i log γ̂_i + (1−γ̂_i)log(1−γ̂_i)] (0 = perfect separation).
- Comparison: Lasso on player-indicator regression (L1 penalty, fraction parameter f ∈ [0,1] chosen by 10× repeated 5-fold CV on player-seasons minimizing RMSE); outcome = Lasso% = % players with nonzero coefficients. PCA on 49 metrics (SBPA excluded: many zero denominators), null bands via within-column permutation, bootstrap bands on PCs.

## 4. Equations & assumptions
- y_ij ~ Normal(μ + α_i, w_ij·σ²) (Eq. 1)
- μ ~ Normal(0, K²), σ² ~ Inv-Gamma(α₀, β₀) (Eq. 2)
- α_i ~ Normal(0, τ²) if γ_i=1; Normal(0, v₀·τ²) if γ_i=0; v₀=0.01 (Eq. 3)
- τ² ~ Inv-Gamma(ψ₀, δ₀) (Eq. 4); robustness prior p(τ) ∝ 1 ⟹ p(τ²) ∝ 1/τ (Eq. 5)
- p₁ ~ Uniform(0, 1) (Eq. 6)
- Negative entropy: −H = (1/m)Σᵢ[γ̂_i log(γ̂_i) + (1−γ̂_i) log(1−γ̂_i)] (Eq. for signal measure)
- Lasso: β̂_Lasso = argmin_β̂ [Σᵢⱼ(y_ij − X_i β̂)² + λΣᵢ|β̂_i|], λ ≥ 0 (Eq. 7), with L1-fraction constraint Σ|β̂_i|/Σ|β̂_i^OLS| ≤ f
- Gibbs conditionals for μ, α_i, σ², τ², γ_i (Bernoulli probability given in §2.2), p₁ | γ ~ Beta(1+Σγ_i, 1+Σ(1−γ_i)).
- Stated assumptions: per-metric normality of y_ij (36/50 approximately normal; 14/50 skewed — 3B, 3B/PA, BUH, BUH/H, CS, CS/OB, HBP, HDP/PA, IBB, IBB/PA, SB, SB/OB, SBPA, SH); variance proportional to inverse opportunities (w_ij); conjugate/non-informative priors; point-mass approximated by v₀=0.01 narrow normal; players exchangeable.

## 5. Features / target
- No covariates: model is per-metric (each metric analyzed separately); "features" are just player identity indicators (fixed/random player effects).
- Target: the same metric's value y_ij per player-season — the question is within-player consistency (does a player's own past predict his future better than the league mean?), not cross-metric prediction. Prediction horizon: season-to-season.

## 6. Validation design
- No held-out future prediction in the Bayesian model itself (retrospective consistency analysis, 1974–2008); external validation via (a) agreement of p̂₁ with Lasso% (independent variable-selection method, CV-tuned), (b) PCA consistency: ~8 PCs above permutation null bands on all 49 metrics; ~6–7 significant PCs among the 32 high-signal metrics vs. much weaker structure in the 17 noisy ones. Cross-method corroboration is the validation; no time-ordered train/test split.

## 7. Numerical results / baselines
- 33/50 metrics demonstrate signal (high p̂₁ and high negative entropy); 17 essentially no signal.
- Best metrics: K/PA, Spd, ISO, BB/PA, GB/BIP — spanning plate discipline (K/PA, BB/PA), speed (Spd), power (ISO), ground-ball tendency (GB/BIP). BABIP lands in high-signal group, contradicting Studeman (2007a) who found it noisy (paper notes the discrepancy).
- Table 1 top-player posteriors: ISO population μ̂=0.142 vs. McGwire 0.320 (SD 0.010), Bonds 0.304; BB-rate μ̂=0.087 vs. Bonds 0.204 (SD 0.004, ~2pp above next player Gene Tenace 0.186); Spd μ̂=4.11 vs. Coleman 8.55; K-rate μ̂=0.166 vs. Jack Cust 0.388; all with γ̂_i=1.00.
- Lasso% vs. p̂₁ agree well on normal metrics; disagree on skewed (black) metrics where Lasso attributes more signal (Lasso% high, p̂₁ low) — the authors argue their model is more cautious on non-normal data.
- PCA: only ~8 PCs exceed permutation null bands (49 metrics); ~6–7 significant PCs among the 32 high-signal metrics — "only about six or seven truly different [metrics] among those 32"; 17 noisy metrics contain substantially less signal.

## 8. Code / data availability
None stated (no code repository; data source cited as Kappelman 2009 Fangraphs database).

## 9. Leakage & limitations
- Adversarial: the model is descriptive/retrospective (1974–2008, all seasons fit jointly) — there is no forward prediction test, so "predictive power" is inferred from within-player consistency, not measured on held-out future seasons; a cleaner design would fit through year t and predict t+1.
- 14/50 metrics violate the normality assumption (long right tails, zero inflation: SB, 3B, IBB, HBP); posteriors on those are suspect — the paper proceeds anyway, flagging them (black points in Fig. 2).
- Era pooling (1974–2008): strike zone, expansion, DH, steroid era all shift metrics — player effects are estimated over non-stationary eras without era terms; 10 metrics only have 2002+ data (sample imbalance acknowledged).
- Correlation is only addressed post hoc via PCA; the metric-by-metric fits ignore cross-metric dependence (authors flag this as future work).
- Lasso comparison uses random player-season splits (not player-clustered CV) — potential within-player leakage into "held-out" folds (my inference; paper does not cluster folds by player).
- External validity to NFL: MLB has 150+ PA/player-season vs. NFL skill players with ~50–150 targets/carries; opportunity weighting helps but NFL metrics (EPA/play, CPOE) are far noisier per-opportunity — the signal/no-signal boundary will land differently.

## 10. GSE overlap
- New capability — no duplicate. Existing research map: GSE's metric inventory (26-metric catalog, gse-lab computed metrics) tracks *forward validity* of metrics (EPA forward-validity gap list item 6), and the 15-area ML brief covers hierarchical pooling, but no existing work applies a spike-and-slab consistency screen to rank NFL advanced metrics by within-player/team reliability. Extension of the metric-validation lane, not a duplicate.

## 11. GSE implementation spec
- Port to NFL: for each GSE candidate metric (EPA/play, success rate, CPOE, PRWR/PBWR, TPRR, YPRR, pressure rate, havoc rate, RYOE, ANY/A, QBR proxies), fit the two-component mixture on player- or team-season data 2000–2025 (nflverse): player-level for QBs/WRs/edges, team-level for unit stats. Weights w_ij = 1/opportunities (dropbacks, targets, snaps, plays). Output per metric: p̂₁ (fraction of consistent units) + negative entropy → rank metrics by reliability; feed the ranking into feature selection for the GSE engine (high-signal features get full weight, low-signal get shrunk/dropped).
- Then: PCA on the high-signal metric set to extract the orthogonal core (~analog of the paper's ~8 components) — a de-duplicated GSE feature basis.
- Effort: ~2 days (Gibbs sampler in NumPy/JAX, one script per level: QB, WR, team-offense, team-defense; doc page with the ranked table).

## 12. Reproducible test
- Dataset: nflverse 2010–2024, team-offense season EPA/play, success rate, explosive-play rate, turnover rate, pressure rate allowed; team-seasons with ≥500 plays.
- Test: fit the paper's model (60k iterations, 10k burn-in, thinning 50) on 2010–2019 per metric; compute p̂₁ and −H; then measure actual season-to-season autocorrelation (2010–2019 within-team year-over-year r²) and rank-correlation between the model-implied signal ranking and the observed year-over-year stability ranking.
- Baseline: year-over-year r² ranking alone (the naive stability screen).

## 13. Acceptance / rejection gate
- ADAPT-accept if Spearman rank correlation between (p̂₁, −H)-implied signal ranking and observed year-over-year r² ranking ≥ 0.7 on the 2010–2019 fit, AND the PCA on high-signal metrics yields ≤ 10 significant components (de-duplication value); REJECT if rank correlation < 0.4 (model's signal measure doesn't track real stability on NFL data).

## 14. Improvement experiment
- Forward-predictive version: fit the mixture on seasons ≤ t, then test whether classifying teams/players as "non-zeroed" on metric M improves next-season predictions of M vs. a pooled-mean baseline (true out-of-sample validation the paper lacks); and share information across correlated metrics (paper's stated future work) via a grouped spike-and-slab, which on NFL's small samples should increase effective degrees of freedom for the noisy per-opportunity metrics.
