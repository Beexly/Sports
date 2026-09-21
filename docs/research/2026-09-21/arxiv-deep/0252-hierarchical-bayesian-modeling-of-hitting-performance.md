# [0252] Hierarchical Bayesian Modeling of Hitting Performance in Baseball (arXiv:0902.1360v1)

**Citation:** Jensen, S. T., McShane, B. & Wyner, A. J. (2009). *Hierarchical Bayesian Modeling of Hitting Performance in Baseball*. arXiv:0902.1360v1. URL: https://arxiv.org/abs/0902.1360
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3284 lines).
**Verdict:** REJECT — an MLB home-run projection paper; its hierarchical-shrinkage and elite-mixture machinery is statistically sound but has no NFL transfer path (baseball is individual, discrete-event, and career-long; GSE's player-projection needs are play-level EPA/CPOE models already in the inventory) and its portable ideas (empirical-Bayes shrinkage, age curves) are already standard.

## 1. Research question
Can a fully parametric Bayesian hierarchical model — sharing information across players and across time via a position-specific age trajectory plus a hidden-Markov "elite vs non-elite" mixture that controls shrinkage — predict next-season MLB home-run performance better than existing sabermetric systems (PECOTA, MARCEL), while also producing honest predictive intervals?

## 2. Dataset / schema
Lahman Baseball Database v5.5 (public), 1871–present; model fit on 1990–2005: 10,280 player-years. Per player-year: home-run total Y_ij, at-bats M_ij, age A_ij (20–49), home ballpark B_ij (46 ballparks), position R_ij (9 positions; pitchers excluded). Validation holdout: 2006 season. External comparison subset: 118 top home-run hitters (≥1 HR per 40 AB in some season through 2005 with ≥300 AB). Predictions of 2006 HR totals are made using the *true* 2006 at-bat totals (acknowledged as unrealistic for real forecasting).

## 3. Method / model
- Likelihood: Y_ij ~ Binomial(M_ij, θ_ij) (Eq. 1); M_ij treated as fixed/known.
- Link: logit(θ_ij) = α_k + β_b + f_k(A_ij) (Eq. 2), with position intercept α_k, ballpark/team coefficient β_b, and a position-specific cubic B-spline age trajectory f_k (4 spline coefficients × 9 positions = 36 parameters).
- Elite mixture: α_k ∈ {α_k0, α_k1} (α_k0 < α_k1) selected by latent elite indicator E_ij per player-year; E_ij initialized at 0 for career starts.
- Temporal dependence: hidden Markov model on elite status, p(E_{i,j+1}=b | E_{ij}=a, R_{ij}=k) = ν_abk (Eq. 3), position-specific 2×2 transition matrices shared across players; young players need multiple elite years to flip to elite.
- Priors (all non-informative): β_l ~ N(0, τ²), γ_kl ~ N(0, τ²), τ² = 10,000 (Eqs. 4–5); α_k ~ MVNormal(0, τ²I₂) truncated to α_k0 < α_k1 (Eq. 6); (ν_00k, ν_01k), (ν_11k, ν_10k) ~ Dirichlet(ω, ω), ω = 1 (Eq. 7).
- Inference: Gibbs sampler — Metropolis-Hastings for (α, β, γ) logistic-regression coefficients (Normal proposals centered at MLE, adaptively tuned); conjugate Dirichlet updates for ν (Eq. 9 with transition counts N_abk); forward-summing backward-sampling (Chib 1996) for the E_ij chain (Eq. 10).
- Extension tested: player-specific transition parameters ν^i (rejected — no improvement).

## 4. Equations & assumptions
- Y_ij ~ Binomial(M_ij, θ_ij) (Eq. 1)
- logit(θ_ij) = α_k + β_b + f_k(A_ij) (Eq. 2)
- p(E_{i,j+1}=b | E_{ij}=a, R_{ij}=k) = ν_abk (Eq. 3)
- Priors Eqs. 4–7 as above; full posterior Eq. 8; Dirichlet posterior updates Eq. 9; forward-backward recursion Eq. 10.
- Assumptions: i.i.d. binomial within player-season (citing Brown 2008); at-bats fixed/known; ballpark coefficients confounded with team quality (acknowledged — seasonal data cannot separate park from roster); age trajectory conditional on "player stays in MLB" (survivorship; no dropout/censoring model); elite status is binary; one shared age-trajectory shape per position with only an additive elite offset.

## 5. Features / target
Inputs per player-year: age, position, home ballpark, at-bats, and career history (via the HMM elite chain). Target: home-run total Y_ij (rate θ_ij); reported as predicted HR totals and 80% predictive intervals. No other hitting events modeled (walks, singles excluded by using at-bats as the opportunity base).

## 6. Validation design
Honest holdout: fit on 1990–2005, predict 2006. Internal comparison (559 players): full model vs no-position/no-elite vs naive strawman (Ŷ_2006 = Y_2005) vs player-specific-transition extension, on RMSE, 80%-interval empirical coverage, and mean interval width. External comparison (118 hitters with PECOTA/MARCEL projections available): RMSE, median absolute error (MAE), and "% BEST" (share of players for whom the method's prediction is closest), split all / young (≤26) / older (>26). PECOTA and MARCEL projections rescaled by true 2006 AB for fairness. No k-fold CV; a single holdout year.

## 7. Numerical results / baselines
Internal (559 players, 2006): Full model RMSE 5.30, 80%-interval coverage 0.855, mean width 9.81; No Position or Elite Indicators RMSE 6.87, coverage 0.644, width 6.56; strawman (last year's HR) RMSE 8.24; Player-Specific Transitions RMSE 5.45, coverage 0.871, width 10.36 (extension rejected). The mixture component dominates position information for accuracy.
External (118 hitters): Our model RMSE 7.33, MAE 4.40, %BEST 41%; PECOTA RMSE 7.11, MAE 4.68, %BEST 28%; MARCEL RMSE 7.82, MAE 4.41, %BEST 31%. Young players (≤26): ours RMSE 2.62, MAE 1.93, %BEST 62%; PECOTA 4.62/3.44/0%; MARCEL 4.15/2.17/38%. Older players: ours RMSE 7.56, MAE 4.48, %BEST 39% vs PECOTA 7.26/4.79/30% — the model's overall RMSE loss comes from large errors on a few DH-position players (over-shrinkage of a unique role).
Dynamics findings: 74% of eventual elite hitters need >1 year of data to be classified elite (P(E_ij=1) ≥ 0.5); 46% need >2 years. For players ≥35, the model's adjustment vs the naive previous-year prediction is equally driven by age and by past consistency (SD of past HR rates). All numbers are the paper's claims on Lahman data.

## 8. Code / data availability
None stated (no code link). Data: public Lahman database (v5.5). Model code not shared.

## 9. Leakage & limitations
- Predictions use the *true* future at-bat totals — acknowledged as unrealistic; real forecasting must model M_ij too (named as future work), so reported RMSEs are optimistic vs a deployable system.
- Single holdout year (2006): no assessment of year-to-year stability of the advantage; the PECOTA-beating result could be a 2006-specific draw.
- Survivorship bias: age trajectories are conditional on staying in MLB, so they do not represent true career aging; the authors flag this explicitly.
- Ballpark coefficients confound park and team quality; no game-level data to separate them.
- Binary elite status is crude; the DH-position failure shows the mixture over-shrinks atypical roles.
- MCMC details (chain length, convergence diagnostics) not reported in the extract.
- External validity to NFL: none. Baseball hitting is individual, discrete, and career-stationary; NFL performance is 11-on-11, scheme-dependent, and non-stationary. GSE's player-level work (props) uses play-level charting/EPA models, not career-trajectory mixtures. The portable lesson — hierarchical shrinkage with an elite mixture beats naive regression-to-mean — is already standard practice in GSE's calibration/ML lanes (ML brief topics: hierarchical pooling).

## 10. GSE overlap
New domain (MLB career projection), duplicate methodology. The existing-research map's ML brief already commissions hierarchical pooling and the calibration lane covers shrinkage; no repo file needs a career-trajectory mixture model. Garrett's NFL lanes (engine picks, props, DFS) project season/game outcomes, not multi-year player aging curves, and nflverse careers are too short for an elite-mixture HMM to be identified. No overlap worth building on.

## 11. GSE implementation spec
None — REJECT, no build.

## 12. Reproducible test
Not applicable — REJECT. (Reproduction would re-fit the Gibbs sampler on Lahman 1990–2005 and re-predict 2006; the data is public but the exercise serves no GSE lane.)

## 13. Acceptance / rejection gate
REJECT stands. Reconsider only if GSE opens a multi-season player-valuation lane (e.g., contract-value modeling for content) — not on any current roadmap.

## 14. Improvement experiment
Within the paper's own frame: model the at-bat totals M_ij jointly (the paper's stated future work) with a playing-time model (age, position, recent performance, team depth), and re-run the 2006 holdout with *predicted* rather than true at-bats — this closes the acknowledged leakage and tests whether the RMSE advantage over PECOTA survives under realistic forecasting conditions.
