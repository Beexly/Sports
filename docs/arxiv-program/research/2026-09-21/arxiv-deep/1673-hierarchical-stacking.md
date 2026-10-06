# Hierarchical stacking for Bayesian model averaging (Yao, Pirš, Vehtari, Gelman, 2021)

## 1. Citation and full-text verification
- **arXiv ID:** 2101.08954 (full text fetched from ar5iv on 2026-09-22 — Yao, Pirš, Vehtari, Gelman, "Hierarchical stacking for Bayesian model averaging", in review/inference literature 2021)
- **Full text read:** complete, 2,494 extracted lines (Abstract → §1 Introduction → §2 Hierarchical stacking (discrete/continuous/GP/time-series extensions) → §3 Theory (Theorems 1–4) → §4 Related literature → §5 Examples (Bangladesh well-switching, GP-regression weighted by GP, 2016 US presidential election forecast) → §6 Discussion → References → Appendices)
- **Cross-reference check:** not present in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits). Sequel to 1704.02030 (Yao et al. 2018, "Using stacking to average Bayesian predictive distributions").

## 2. Problem and method
**Problem:** Complete-pooling stacking (Yao et al. 2018) assigns one weight vector w ∈ simplex to all inputs x. But "different models can be good at explaining different regions in the input-response space" — an overall-good model can be conditionally bad at a given location, and covariate shift between training and target populations breaks average-fit weights.

**Method — hierarchical stacking:** generalize to a pointwise weight function w(x) = (w₁(x),…,w_K(x)): 𝒳 → 𝒮_K and combine p(ỹ|x̃, w(·)) = Σₖ wₖ(x̃) p(ỹ|x̃, Mₖ) (eq. 4). The LOO objective log p(w(·)|𝒟) = Σᵢ log(Σₖ wₖ(xᵢ) p_{k,−i}) + log p^prior(w) (eq. 5) converts stacking from optimization to formal Bayesian inference (two-stage argument avoids double-use of data: LOO densities p_{k,−i} estimate the predictive density under hypothetical holdout data). With a discrete input (J cells), weights are parameterized via softmax w_{jk} = exp(α_{jk})/Σₖ exp(α_{jk}) with hierarchical prior α_{jk}|μₖ,σₖ ~ Normal(μₖ,σₖ), μₖ ~ Normal(μ₀,τ_μ), σₖ ~ Normal⁺(0,τ_σ) (eqs. 8–10) — partial pooling shrinks cell weights toward a shared mean, with small cells shrunk most. Special cases: σₖ→∞ → no-pooling stacking; σₖ→0 → complete-pooling stacking. Extensions: additive features w*_k(x) = μₖ + Σₘ α_{mk} fₘ(x) with ReLU-type rectified continuous features (eqs. 13, 16); grouped/state-correlated priors (MVN with prior correlation Ω, eq. 15); GP priors on αₖ(x); time-series via one-step-ahead p_{k,−i} with recency reweighting πᵢ = 1+γ−(1−tᵢ/T)². Final weights = posterior mean w̄; final predictive density (12). Model-check: PSIS post-processing gives leave-one-out elpd of the *stacking model itself* almost for free (eq. 28) — avoiding the double-CV cost of optimization-based stacking.

## 3. Core equations
- **Hierarchical stacking posterior (discrete inputs, eq. 11):** log p(α,μ,σ|𝒟) = Σᵢ log(Σₖ wₖ(xᵢ) p_{k,−i}) + Σ_{k,j} log p^prior(α_{jk}|μₖ,σₖ) + Σₖ log p^hyperprior(μₖ,σₖ), with softmax link (8). Note: posterior MAP is degenerate (mode at σ=0), so inference must be MCMC/posterior-mean, not optimization.
- **Theorem 1 (probabilistic interpretation):** under local separability (19), w^{stacking,cp} ≈ w^{approx}_k = Pr(𝒥ₖ), the probability that model k is the *locally best* fit, with elpd error O(ε + exp(−L)). Stacking weights are "how often model k wins", not "probability model k is true" (BMA).
- **Theorem 2:** a model gets zero stacking weight only if Pr(𝒥ₖ) ≤ (1 + (exp(L)−1)(1−ε) + ε)⁻¹ — stacking ignores a model only if it rarely wins anywhere.
- **Theorem 3 (gain over selection):** elpd_stacking,cp − supₖ elpdₖ ≥ max(L(1−ρ)(1−ε) − log K + O(exp(−L)+ε), 0): stacking beats selection most when models are *locally separated* and no single model dominates (small ρ).
- **Theorem 4 (gain over complete-pooling stacking):** if input regions ℐₖ where each model wins were known, pointwise selection beats stacking by ≥ −log ρ𝒳 + O(exp(−L)+ε) — the theoretical headroom hierarchical stacking chases.
- **Covariate-shift immunity (§3.3):** if p_X^train ≠ p_X^pop but p(z|x), p(y|x,z) invariant, hierarchical stacking needs no reweighting because it already targets pointwise fit; reweighted complete-pooling stacking has inflated/infinite variance and discards non-target data.

## 4. Datasets and empirical results
- **Bangladesh well-switching (n=3020, 5 logistic/spline models; 50 random 2000/1020 train-test splits):** hierarchical stacking best on all three metrics — (a) highest test log predictive density, (b) lowest L₁ calibration error (20 bins), (c) best on the 10–200 *worst* test points (robust tail performance). No-pooling stacking has the *highest* calibration error despite beating model selection on elpd — pure overconfidence. As training size grows 100→1200, model selection plateaus early, no-pooling collapses at small n, hierarchical stacking dominates everywhere. Cell-weight analysis: small cells (e.g. 7% high-school-educated) get shrunk toward the mean; no-pooling collapses to 0/1 weights.
- **GP regression with bimodal posterior hyper-parameters (Neal 1998 data):** hierarchical stacking (weight as a GP on x over two posterior modes) beats complete-pooling stacking, mode-height, and importance weighting on mean test log predictive density under all three approximate inferences (MAP, Laplace, importance resampling). Under covariate shift (test x̃ ~ Uniform(−3,3)): hierarchical stacking matches exact-MCMC Bayes in the bulk and *beats* it in the tails — more reliable extrapolation.
- **2016 US presidential election polling (8 candidate models, one-week-ahead expanding-window backtest):** hierarchical stacking best, then complete-pooling stacking, then no-pooling, then model selection. Advantage largest early in the cycle when polls are scarce (mirrors GSE's early-season data-scarcity). State-correlated prior (Ω from historical state demographics) adds a further small gain in scarce-data regimes. State-level weight analysis: fewer polls ⇒ more shrinkage toward nationwide mean; hierarchical weights interpolate between no-pooling (data-rich) and pooled (data-poor).

## 5. GSE application
This is the natural second stage after plain log-score stacking (1704.02030, ledger 1672). GSE's ensemble has exactly the heterogeneity the theory targets: some models are locally better (e.g. a weather model wins outdoor games; a QB-form model wins high-total games; market-implied models win efficiently-priced games). Instead of one global weight vector, GSE can learn **input-dependent stacking weights**: weight per regime — dome vs outdoor, spread bucket, total bucket, week (early vs late season), QB tier, team pace. The discrete-cell hierarchical prior with partial pooling solves the NFL's small-n problem: early season (few games) weights shrink toward the global mean automatically; by week 17, cells with many games get near-no-pooling weights. The covariate-shift immunity (§3.3) is directly relevant to GSE's "population of interest": this week's slate ≠ the training distribution. Also gives a *smoothed diagnostic* of local model fit (w(x) with Bayesian uncertainty) for finding where a model systematically fails — e.g. "Model 1 fits poorly at high arsenic" → "model X degrades in divisional games" — guiding model improvement, not just weighting.

## 6. Implementation notes
- Everything still runs off the **n × K LOO log-predictive-density matrix** — same input as 1704.02030's stacking; the hierarchical part is a second-stage Stan model over weights.
- Stan code provided in Appendix C (additive model); default hyperprior τ_μ = τ_σ = 1 after standardizing features to Var=1; scale τ_σ = O(1/√M) or horseshoe when M (features/cells) is large.
- Continuous-feature recommendation: coordinate-wise ReLU features f_{2d−1}(x) = (xᵈ − med(xᵈ))₊, f_{2d}(x) = (med(xᵈ) − xᵈ)₋ — a crude proxy for local training density.
- MUST use MCMC/posterior mean, not MAP (posterior mode is degenerate at complete pooling, eq. 11).
- elpd of the stacking model itself via PSIS importance ratios r_{is} ≈ (Σₖ w_{ks}(xᵢ) p_{k,−i})⁻¹ (eq. 28) — one stacking fit only, no refits.
- EDA guide: scatter Δ_{ki} = log p_{k,−i} − log p_{K,−i} against x to pick weight features before fitting.
- Warning: fully flexible no-pooling w(x) degenerates to pointwise selection (overfit to single yᵢ realizations); keep the feature space small and additive.

## 7. Tests and evaluation
Build a discrete-cell hierarchical stacker on GSE backtests: fit candidate models once per rolling window, compute PSIS-LOO pointwise log predictive densities, fit the hierarchical weight model (cells: outdoor/dome × week-half × spread bucket; Stan, ~1000 draws), evaluate on held-out weeks with (i) mean test log predictive density vs complete-pooling stacking / no-pooling / selection, (ii) binned calibration error, (iii) worst-10%-games performance (tail robustness). Then simulate covariate shift: train weights on weeks 1–12, evaluate on playoff slate (different distribution) vs a reweighted global stack — the paper predicts hierarchical stacking degrades less. Inspect the posterior mean w(x) curves per cell as the model-diagnostic readout.

## 8. Strengths
- Rigorous, bound-backed answer to "when does stacking win and can we do better" (Theorems 1–4): stacking weights ≈ local-win probabilities; gain largest with locally-separated models — directly actionable for model-set design (add models that win *somewhere*, not models that are better everywhere).
- Hierarchical shrinkage gives automatic small-data handling: cells interpolate between pooled and unpooled by sample size — ideal for NFL's 18-week season.
- Covariate-shift immunity without importance-weighting; principled conditional prediction at rare x₀.
- Converts stacking into a formal Bayesian model (MCMC, diagnostics, PSIS-LOO of the stacker itself), enabling the whole Bayesian workflow on top.
- w(x) doubles as an interpretable, uncertainty-quantified diagnostic of local model failure.

## 9. Limitations and risks
- MCMC on the weight model is heavier than one-shot stacking optimization; with J cells × K models the weight space can be big (authors keep it additive and low-dimensional).
- MAP is degenerate — a fresh implementer optimizing eq. 11 will silently get complete pooling; posterior mean is mandatory.
- Risk of overfitting to noise when many weight features are included; authors' discipline (few additive features, ReLU forms, τ_σ scaling) must be followed.
- Theorems are oracle statements (need true ℐₖ/𝒥ₖ); practical gains depend on features actually capturing the heterogeneity.
- Log-score stacking inherits outlier sensitivity; the hierarchical extension does not fix that.

## 10. Comparison to prior art
vs **complete-pooling stacking (Yao et al. 2018, ledger 1672):** hierarchical stacking is its generalization (σₖ→0 recovers it); strictly better on overall and conditional elpd in every example, largest gains under heterogeneity and data scarcity.
vs **feature-weighted linear stacking (Sill et al. 2009):** same idea of input-dependent weights but L₂ point-prediction loss without Bayesian regularization; authors show the no-pooling MLE degenerates to 0/1 weights and the worst calibration.
vs **mixture-of-experts (Jacobs et al. 1991):** joint training of gates and experts is heavier and LOO-free (overfit-prone); hierarchical stacking fits experts separately (parallelizable, cheap) and the LOO likelihood is built-in.
vs **Dirichlet-prior stacking (Yao et al. 2020) / L₁/L₂-penalized stacking (Reid & Grudic 2009):** those regularize one global vector; hierarchical stacking learns the pooling strength per model and per cell via MCMC — no grid tuning.
vs **covariate-shift importance weighting (Shimodaira 2000; Sugiyama & Müller 2005):** hierarchical stacking avoids modeling the density ratio entirely and keeps full effective sample size.

## 11. Novelty
First formal Bayesian treatment of stacking (likelihood construction via two-stage/holdout argument + profile likelihood) and first hierarchical extension with input-dependent weights, partial pooling, GP/correlated-prior and time-series variants, plus the elpd bounds (Thms 1–4) linking stacking weights to local-win probabilities and quantifying the heterogeneity dividend.

## 12. Reading difficulty
High: hierarchical Bayesian modeling, PSIS-LOO, proper scoring rules, asymptotic theory. Stan code appendix helps implementers; examples are worked and the election/well-switching narratives are concrete.

## 13. Related papers
- Yao, Vehtari, Simpson & Gelman (2018): stacking of predictive distributions (ledger 1672) — the foundation.
- Vehtari, Gelman & Gabry (2017/2019): PSIS-LOO.
- Le & Clarke (2017): asymptotic Bayes-optimality of stacking.
- Sill et al. (2009): feature-weighted linear stacking.
- Jacobs et al. (1991) / Jordan & Jacobs (1994): mixture / hierarchical mixture of experts.
- Shimodaira (2000); Sugiyama & Müller (2005): covariate shift.
- Piironen & Vehtari (2017): projection predictive selection (for sparsifying the stack after fitting).

## 14. GSE value
Upgrades GSE's ensemble from static to **regime-dependent**: learn input-varying stacking weights with automatic small-cell shrinkage (critical for the short NFL season), gain robustness to slate-distribution shift, and obtain a smoothed local-fit diagnostic pointing at which model fails where. This is the ensemble architecture paper to implement after plain log-score stacking.

**Verdict:** ADAPT
