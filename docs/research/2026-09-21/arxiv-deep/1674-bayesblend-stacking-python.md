# BayesBlend: Bayesian Model Averaging and Stacking in Python

## 1. Citation and full-text verification
- **arXiv ID:** 2405.00158 (full text fetched from ar5iv on 2026-09-22 — Allen, Gabry, Goodrich, Ledger Investing team; "BayesBlend: Bayesian Model Averaging and Stacking in Python")
- **Full text read:** complete, 2,295 extracted lines (Abstract → §1 Introduction → §2 Background and scope → §3 Existing software → §4 BayesBlend (Draws class, MleStacking, BayesStacking, HierarchicalBayesStacking, PseudoBma) → §5 Real-world examples (insurance loss development, loss forecasting on Meyers 2015 data) → §6 Conclusion → References)
- **Cross-reference check:** not in the ledger corpus (dedup vs `ledger-tracker-750.jsonl`, `wave4b-dedup-baseids.txt`, existing `arxiv-deep` headers: zero hits)

## 2. Problem and method
**Problem:** Model averaging outperforms winner-takes-all, yet applied literature rarely uses it — the authors blame the lack of off-the-shelf software. **BayesBlend** is a Python package (pip-installable; CmdStan/CmdStanPy backend) giving a production-oriented API for weighting and blending Bayesian model ensembles. Core design: a `Draws` dataclass (log posterior predictive densities + posterior predictions from any sampler — CmdStanPy, ArviZ integrations, backend-agnostic) feeds four `BayesBlendModel` subclasses:
- **MleStacking** — complete-pooling log-score stacking by optimization (eq. 6);
- **BayesStacking** — same objective with full Bayesian weight inference (MCMC), allowing informative priors; tends to regularize weights toward uniform relative to MLE;
- **HierarchicalBayesStacking** — input-dependent weights via softmax-multinomial regression w_{ik} = softmax(w*_{ik}), w*_{ik} = αₖ + βₖxᵢ, with partial pooling of (β₁…βₖ) ~ Normal(μ,σ) (eqs. 7–8; implements Yao et al. 2022a hierarchical stacking);
- **PseudoBma** — pseudo-BMA / pseudo-BMA+ from PSIS-LOO elpd (eq. 5).
The killer feature: `.fit` estimates weights, `.predict` returns a new `Draws` that blends predictions — including training on one dataset and blending on out-of-sample data, which no existing package (loo, ArviZ) supports.

## 3. Core equations
- **Pseudo-BMA:** wₖ = exp(elpd̂^k_{psis-loo}) / Σ_{k'} exp(elpd̂^{k'}_{psis-loo}) (5), with elpd̂^k_{loo} = Σᵢ log p(yᵢ|y_{−i},Mₖ) estimated by PSIS importance-weighted posterior draws (4).
- **Complete-pooling stacking:** ŵ = argmax_w Σᵢ log Σₖ wₖ p(yᵢ|y_{−i},Mₖ) (6) — unit-simplex constrained in the applied variant.
- **Hierarchical (covariate-dependent) stacking:** p(yᵢ|y_{−i}) = Σₖ w_{ik} p(yᵢ|y_{−i},Mₖ); w_{ik} = softmax(w*_{i1:K}); w*_{ik} = αₖ + βₖxᵢ; (β₁…β_K) ~ Normal(μ,σ) (7–8). Identifiability: fix one model's weights to zero (reference model).

## 4. Datasets and empirical results
- **Toy Bernoulli (success probability drifting over trials):** hierarchical stacking achieves the highest blended ELPD (expected — the only blend modeling the time trend); all blended distributions beat either candidate in isolation.
- **Insurance loss development (Meyers 2015, 50 programs, paid-loss triangles; candidate parametric development curves):** Bayesian stacking models perform best, hierarchical stacking slightly better than non-hierarchical Bayesian stacking; blended ELPD practically indistinguishable from the best single candidate (Exp 1+); pseudo-BMA performed *worse* than the best candidate.
- **Insurance loss forecasting (leave-future-out over accident years):** only pseudo-BMA+ and MLE stacking beat the best single candidate (AR(1)); SSM model wins on LFO test data but AR(1) wins on validation — illustrating that test-data winners don't generalize, and blending lands remarkably close to the out-of-sample best without knowing it in advance. Bayesian/hierarchical stacking spread weight to Linear-Hk and GP models (less aggressive sparsification); MLE/pseudo-BMA+ concentrated on SSM + AR(1).
- **Software gap documented:** `loo` (R) and `arviz.compare` give weights only — no Bayesian weight inference, no hierarchical stacking, no blending/prediction step; BayesBlend is the only implementation with all three.

## 5. GSE application
This is the **reference implementation candidate** for GSE's stacking lane. GSE already fits candidate models across multiple frameworks; the `Draws` abstraction (log-likelihood matrix + posterior predictions, first dim = posterior samples) is exactly the artifact to standardize across the model zoo, with ArviZ/CmdStanPy integrations ready. The concrete workflow: collect per-model LOO log-predictive densities → `BayesStacking` (Bayesian weights with informed priors, e.g. prior preference for the production incumbent) or `MleStacking` for speed → `.predict` produces the blended posterior-predictive `Draws` consumed downstream by calibration (CQR/conformal) and Kelly sizing. `HierarchicalBayesStacking` implements the regime-dependent weights from ledger 1673 (Yao et al. 2021) — e.g. weights varying with spread bucket, dome/outdoor, week — as a turnkey Stan-backed fit rather than custom code. The paper's insurance time-series example maps directly onto GSE's season structure: train blending on early accident years/weeks, apply to future weeks (leave-future-out), with hierarchical weights on a time covariate.

## 6. Implementation notes
- Input contract is only posterior-draws-shaped arrays: `log_lik` and `post_pred` with first dim = posterior samples; any shape thereafter (2×n for tabular, n× chains×draws reshaped to 2D internally).
- Requires CmdStan (2.34.1) via CmdStanPy (1.2.2) for BayesStacking/HierarchicalBayesStacking; PSIS-LOO can come from ArviZ or loo.
- Bayesian stacking with weight priors (e.g. Dirichlet or simplex priors) regularizes toward uniform vs MLE — useful early season; hierarchical covariates are standardized as x̄ = (x − mean(x))/(2·sd(x)), with the reference model always the first in the dictionary.
- Time-varying weights example: intercept αₖ = average weight of model k, slope βₖ = change per 2SD of the covariate.
- Model comparison after blending: compute ELPD of blended `Draws` objects (utility shown in §4 examples).

## 7. Tests and evaluation
Prototype a GSE stacking pipeline on one backtest season: convert 3–5 existing models' outputs into `Draws` (log_lik from each model's generated quantities / held-out predictions; post_pred = posterior predictive draws of the target, e.g. margin of victory), fit MleStacking vs BayesStacking vs HierarchicalBayesStacking (covariate: week), and compare blended ELPD on leave-future-out weeks. Validate `.predict` on unseen future weeks (the paper's headline use-case — train blend, apply forward). Benchmark against the manual pipeline of ledgers 1672–1673: do weights agree; is hierarchical-over-time weight behavior sensible (e.g. weight migrates between models mid-season)? Also test non-Bayesian inputs (e.g. gradient-boosted point models wrapped with predictive distributions) since BayesBlend is backend-agnostic.

## 8. Strengths
- Only open-source software with Bayesian stacking, hierarchical stacking, AND the blend/predict step; fills a real gap (loo/ArviZ stop at weights).
- Backend-agnostic `Draws` container (CmdStanPy, ArviZ, NumPy) — drops into an existing multi-model zoo without re-fitting anything in a new framework.
- Train-on-one-dataset / blend-on-out-of-sample design matches production forecasting (leave-future-out over NFL weeks).
- Worked insurance examples validate on real time-series data with honest train/validation/test splits and ELPD comparisons; honest about limits (blending ≠ always the best; pseudo-BMA can lose to the best candidate).

## 9. Limitations and risks
- Primarily a software paper — theory is a faithful restatement of Yao et al. 2018/2022a, not new; novelty is packaging.
- CmdStan dependency (2.34.1 + CmdStanPy) for the Bayesian variants — heavier than a pure-Python/NumPy solution; compile times matter in CI.
- New package risk: API churn, maintenance by a single-company team (Ledger Investing), ecosystem smaller than loo/ArviZ.
- Hierarchical stacking needs the covariate story decided in advance (which x, identifiability via reference model) — same overfitting cautions as 2101.08954 apply.
- Evaluation on insurance data only; sports-scale categorical hierarchies (teams × weeks) not demonstrated.

## 10. Comparison to prior art
vs **R `loo::loo_model_weights`**: same weight estimators (pseudo-BMA/BMA+, stacking by optimization) but no Bayesian weight inference, no hierarchical stacking, no blending — weights-only output.
vs **ArviZ `compare`**: Python mirror of loo's weights; same three gaps BayesBlend fills.
vs **free-standing code (Yao et al. 2022a examples; NumPyro docs)**: adaptable snippets, not a tested package with integrations, docs, and a predict API.
vs **NumPyro hierarchical-stacking example**: pointwise weights only in docs form; BayesBlend extends and packages it.

## 11. Novelty
First (and, at writing, only) open-source software implementing full-Bayesian stacking, hierarchical Bayesian stacking, and end-to-end blend-into-predictions for Bayesian model ensembles.

## 12. Reading difficulty
Low-medium: clear tutorial paper with runnable code; the background section recaps stacking theory compactly. Accessible to anyone comfortable with LOO-CV basics.

## 13. Related papers
- Yao et al. (2018): stacking of predictive distributions (ledger 1672) — the method.
- Yao et al. (2022a): hierarchical stacking (ledger 1673) — the extension this packages.
- Vehtari et al. (2017): PSIS-LOO.
- loo R package; ArviZ (Kumar et al. 2019).
- Meyers (2015): insurance loss dataset used in examples.

## 14. GSE value
Direct tooling win: adopt (or vendor-inspire) BayesBlend's `Draws` + stacking-model pattern as GSE's ensemble plumbing — standardizing heterogeneous model outputs into one blending interface, with turnkey Bayesian and hierarchical (covariate-dependent) stacking and a blend-forward `.predict` for weekly production runs.

**Verdict:** ADAPT
