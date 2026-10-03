# Using stacking to average Bayesian predictive distributions (with discussion)

## 1. Citation and full-text verification
- **arXiv ID:** 1704.02030 (version not specified in fetch; full text fetched from ar5iv on 2026-09-22 — Yao, Vehtari, Simpson, Gelman, "Using stacking to average Bayesian predictive distributions (with discussion)", Bayesian Analysis, 2018)
- **Full text read:** complete, 1,463 extracted lines (Abstract → §1 Introduction → §2 Theory and methods → §3 Simulation examples (Gaussian mixture, linear subset regressions, mixture-model comparison, variational inference averaging, US Senate voting, Bangladesh well-switching) → §4 Discussion → Appendix A Stan/R implementation → References)
- **Cross-reference check:** Yao/Vehtari/Gelman stacking not yet in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, and existing `arxiv-deep` headers: zero hits)

## 2. Problem and method
Classical Bayesian model averaging is "flawed in the ℳ-open setting in which the true data-generating process is not one of the candidate models being fit" — BMA asymptotically collapses to the single KL-closest model and its Bayes factors depend on arbitrary non-informative priors. The paper extends stacking (Wolpert 1992; Breiman 1996) from point-prediction averaging to **stacking of predictive distributions**: choose simplex weights ŵ = argmax_w (1/n)Σᵢ S(Σₖ wₖ p̂_{k,−i}, yᵢ) over any proper scoring rule S, where p̂_{k,−i} are leave-one-out posterior predictive densities computed cheaply via Pareto-smoothed importance sampling (PSIS-LOO; exact refit for points with Pareto k̂>0.7). The headline recommendation is **log-score stacking** (maximizing Σᵢ log Σₖ wₖ p(yᵢ|y_{−i},Mₖ), i.e. KL-optimal convex projection) plus a cheaper alternative, **Pseudo-BMA+**: softmax weights over PSIS-LOO elpd regularized with a Bayesian-bootstrap (Dirichlet(1,…,1)) uncertainty adjustment, also usable as the stacking optimizer's starting point. This is the theoretical foundation of Stan's `loo::stacking_weights()`.

## 3. Core equations
- **Log-score stacking weights:** ŵ = argmax_w (1/n)Σᵢ₌₁ⁿ log Σₖ₌₁ᴷ wₖ p(yᵢ|y_{−i}, Mₖ), s.t. wₖ ≥ 0, Σₖ wₖ = 1. General form (2.2): argmax_w (1/n)Σᵢ S(Σₖ wₖ p̂_{k,−i}, yᵢ). Combined predictive density: p̂(ỹ|y) = Σₖ ŵₖ p(ỹ|y, Mₖ) (2.3).
- **Asymptotic consistency (M-estimation, via Le & Clarke 2017):** (1/n)Σᵢ S(Σₖ wₖ p̂_{k,−i}, yᵢ) − E_{ỹ|y}[S(Σₖ wₖ p(ỹ|y,Mₖ), ỹ)] → 0 in L₂, so the LOO score consistently estimates the posterior score and stacking is the optimal convex combination asymptotically.
- **PSIS-LOO predictive density:** r_{i,k}^s = 1/p(yᵢ|θ^s,Mₖ) ∝ p(θ^s|y_{−i},Mₖ)/p(θ^s|y,Mₖ); fit generalized Pareto to the largest 20% of ratios, smooth, truncate → w_{i,k}^s; p(yᵢ|y_{−i},Mₖ) ≈ 1/((1/S)Σ_s w_{i,k}^s). Model elpd: Σᵢ log(Σ_s w_{i,k}^s p(yᵢ|θ^s,Mₖ)/Σ_s w_{i,k}^s).
- **Pseudo-BMA:** wₖ = exp(elpd̂_{loo}^k)/Σ_{k'} exp(elpd̂_{loo}^{k'}) (2.5). **Pseudo-BMA+ (2.6):** draw B Bayesian-bootstrap Dirichlet weight vectors α_{·,b} over the n pointwise elpd values, w_{k,b} = exp(n z̄_b^k)/Σ_{k'} exp(n z̄_b^{k'}), then wₖ = (1/B)Σ_b w_{k,b} — accounts for finite-sample uncertainty in elpd, regularizing weights away from 0/1.

## 4. Datasets and empirical results
- **Gaussian-mixture simulation (ℳ-open, truth N(3.4,1), 8 candidates N(1..8,1)):** log-score stacking always beats BMA on expected log predictive density except at extremely small n (500 repeats × 200 test points); stacking of predictive distributions attains essentially the same optimal MSE as stacking of means (both beat BMA) — matching the distribution also matches moments, not vice versa.
- **Key robustness finding:** duplicating a candidate model (adding copies of N(4,1)) leaves stacking weights unchanged in theory while BMA/Pseudo-BMA concentrate weight on the duplicated model and get worse — critical when many correlated weak models compete.
- **Linear subset regression (Breiman's design, J=15, true coefficients non-zero over all 15, signal-to-noise 4:1):** log-score stacking outperforms all six competitors (stacking of means, Pseudo-BMA, Pseudo-BMA+, best-LOO selection, best-marginal-likelihood selection, BMA) across n = 5→200; asymptotically strictly better. Pseudo-BMA+ dominates naive Pseudo-BMA.
- **vs mixture models (30× slower):** log-score stacking and Pseudo-BMA+ beat a full mixture model on log predictive density at every (ρ, n) tested — and stacking/Pseudo-BMA+ are ~30× faster. Mixture models non-identify and degrade at small n without strong priors.
- **Variational-inference averaging (bimodal Cauchy posterior):** averaging two init-dependent VI approximations with stacking/Pseudo-BMA+ moves closer to the true posterior in KL.
- **US Senate voting 1988–92 (n=94):** stacking assigns near-zero weight to all subset models containing the "proximity advantage" variable vs BMA/Pseudo-BMA+, offering a more reliable way to arbitrate competing correlated predictors.
- **Bangladesh well-switching (n=3020, 8 logistic/B-spline models):** both methods assign the bulk of weight to Model 5 (5th-degree univariate splines) while refusing to overfit the most complex Model 8 (~0 weight); stacking's ~0.09 weight on the simple logistic Model 1 visibly smooths out boundary fluctuation of the high-order spline.
- **Caveat stated by authors:** LOO estimates degrade when n < 5 × effective number of parameters (elpd_loo/elpd_test biased); PSIS diagnostics with exact-LOO substitution at k̂>0.7 handle this.

## 5. GSE application
This is the canonical theory paper behind the exact tool the GSE stacking lane should be built on: Stan's `loo::stacking_weights()`. GSE fits several heterogeneous Bayesian predictive models (QB performance, EPA projections, market-implied blends, matchup-matchup regressions); BMA over those is both theoretically wrong (ℳ-open: no candidate is the true DGP) and fragile (duplicate/correlated weak models inflate weight). Log-score stacking gives a theoretically grounded, PSIS-cheap alternative that GSE can run every week: fit candidate models once, compute PSIS-LOO log-likelihood matrices from the generated-quantities block, optimize weights on the simplex, and emit the stacked predictive distribution for calibration and Kelly sizing. Pseudo-BMA+ is the free, deterministic fallback (no optimizer, no initialization dependence) and the warm start for stacking. The "duplicate model" robustness result directly protects GSE's ensemble from over-concentration when several sub-models share structure (e.g. multiple EPA-based models).

## 6. Implementation notes
- Stacking weights need only an **n × K log-likelihood matrix** (S posterior draws per model, or pointwise LOO log predictive densities) — computable from any sampler's draws, not Stan-specific; PSIS smoothing of importance ratios r^s = 1/p(yᵢ|θ^s) with generalized-Pareto fit on top 20%, truncated.
- Optimization: simplex-constrained maximization of a concave-in-w log score; cheap (K small); warm-start with Pseudo-BMA+ weights. Note log-sum-exp stabilization in Σᵢ log Σₖ wₖ pᵢₖ.
- Diagnostic gate: replace PSIS with exact LOO/k-fold for observations with Pareto k̂ > 0.7; distrust weighting when n < 5× effective parameters.
- Dirichlet-sparse priors on weights (Yang & Dunson 2014, cited §4.1) when K is large relative to n.
- Code exists: R/Stan `model_weights(log_lik_list, method="stacking")` in the `loo` package (example given with printed output: stacking [0.25, 0.06, 0.09, 0.25, 0.35, 0.00] vs Pseudo-BMA+ [0.28, 0.05, 0.08, 0.30, 0.28, 0.00] on six models).

## 7. Tests and evaluation
Evaluate log-score stacking vs BMA, Pseudo-BMA, Pseudo-BMA+ on GSE backtests: hold out rolling weekly windows, fit the candidate model set once per window, compute stacking weights from within-window PSIS-LOO, then score the stacked predictive density against held-out games with mean log predictive density, CRPS, and calibration (PIT) of the combined posterior. Include a "duplicate model" stress test (clone an EPA model with jittered priors) verifying weights don't concentrate on the duplicate — the paper predicts stacking stays flat while Pseudo-BMA degrades. Also A/B the stacked predictive intervals downstream: coverage of 50/80/95% intervals and Kelly-growth of a staking simulation driven by stacked vs BMA probabilities.

## 8. Strengths
- Theoretically principled fix for exactly GSE's situation: ℳ-open model sets where BMA is provably wrong; log-score stacking is the M*-optimal convex projection onto the model span.
- PSIS-LOO makes the method computationally cheap: one fit per model, no refits, with Pareto-k̂ diagnostics flagging the few points needing exact LOO.
- Immune to the model-duplication pathology that breaks BMA/Pseudo-BMA (matters for ensembles of similar sports models).
- Proper-distribution combination (not just point forecasts), with log score as the principled choice (the unique proper local score).
- Production code already exists (`loo::stacking_weights` in Stan ecosystem).

## 9. Limitations and risks
- Log-score (KL) stacking is sensitive to outliers — one extreme yᵢ can dominate weight choice; CRPS or quadratic-score stacking may be more robust and is supported by the same framework.
- Small-sample instability when n < ~5× effective parameters; GSE's early-season weeks (n=1–4 games) may need shrinkage toward equal weights or a Dirichlet prior.
- Stacking optimizes within the convex span — if all candidates miss a regime (e.g. weather games), the stack inherits the miss; it cannot invent what the models lack.
- Assumes posterior draws and pointwise log-likelihoods are available per model; black-box models that only emit point forecasts need the "stacking of means" variant, which ignores distributional shape.
- The pseudo-BMA+ Bayesian bootstrap over elpd is O(B·n·K) — cheap, but the Dirichlet resampling adds Monte Carlo noise unless B is large.

## 10. Comparison to prior art
vs **BMA**: BMA is optimal only in ℳ-closed with correct priors; asymptotically collapses to one model; sensitive to prior spread and duplicated models. Stacking wins in ℳ-open on every simulation.
vs **stacking of means (Wolpert/Breiman)**: matches first moments only; nonidentifiable weights in the Gaussian-mixture demo produced "unappealing" predictive distributions; log-score stacking matched its MSE while also matching the distribution.
vs **AIC weights / Pseudo-BMA (Geisser–Eddy pseudo-Bayes factors; Li & Dunson reference-model KL weights)**: Pseudo-BMA ignores finite-sample uncertainty in elpd; Pseudo-BMA+ fixes this via Bayesian bootstrap but still trails stacking.
vs **mixture models (joint fit)**: mixture is the "full Bayesian" continuous expansion but ~30× slower, nonidentifiable at small n, and empirically worse than stacking on log score at every tested setting.
vs **forecast-combination in econometrics (Geweke–Amisano log-score pooling)**: same objective but limited to time series by exact-LOO cost; PSIS makes it general.

## 11. Novelty
Novel at publication (2018): first generalization of stacking from point estimates to full predictive distributions via arbitrary proper scoring rules, with PSIS-LOO making leave-one-out densities practical; plus the Pseudo-BMA+ Bayesian-bootstrap regularization of elpd-based weights. Became the standard Bayesian model-combination method (`loo` package).

## 12. Reading difficulty
Medium-high: needs Bayesian model-comparison background (ℳ-open/closed, marginal likelihoods, LOO-CV), proper scoring rules, importance sampling. Stan/R code appendix lowers implementation barrier. Fully readable from the text alone.

## 13. Related papers
- Wolpert (1992) / Breiman (1996): original stacking for point estimates.
- Geisser & Eddy (1979): pseudo-Bayes factors (Pseudo-BMA lineage).
- Vehtari, Gelman & Gabry (2017): PSIS-LOO — the computational engine.
- Gneiting & Raftery (2007): proper scoring rules framework.
- Le & Clarke (2017): asymptotic Bayes-optimality of stacking.
- Li & Dunson (2016): reference-model KL weighting (ℳ-complete).
- Clyde & Iversen (2013): Bayesian decision-theoretic view of stacking.
- Yang & Dunson (2014): Dirichlet-aggregation priors for sparse high-dim stacking.

## 14. GSE value
The theoretical and computational backbone of GSE's Bayesian ensemble: replace BMA/BMA-like weighting over heterogeneous sports models with PSIS-based log-score stacking (warm-started with Pseudo-BMA+), gaining immunity to duplicate-model pathology and principled combination of full predictive distributions for calibration and staking. Implementation is one log-likelihood matrix away from production.

**Verdict:** ADAPT
