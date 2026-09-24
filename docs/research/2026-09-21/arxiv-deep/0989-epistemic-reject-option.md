# 0989 — Epistemic reject option prediction (2511.04855v1)
**Ledger:** 0989 | **arXiv:** 2511.04855v1 (2025) | **Lane:** abstention
**Title:** "Epistemic Reject Option Prediction" — V. Franc, J. Paplham (Czech Technical U. in Prague)
**Replacement context:** Fresh-search replacement (`ti:"reject option" OR ti:"classification with abstention"`) for an original-assignment duplicate. Third abstention-lane paper; completes the lane's triad (0987: conformal guarantees; 0988: evidential mechanism; 0989: Bayesian epistemic principle).

---

## Citation / full-text source
Full citation: "Epistemic Reject Option Prediction" — V. Franc, J. Paplham (Czech Technical U. in Prague). Full text: arXiv 2511.04855v1 (2025), https://arxiv.org/abs/2511.04855v1.

## Research question
A theoretical framework for abstention based *solely on epistemic uncertainty* (uncertainty from limited data) rather than total or aleatoric uncertainty. Classical reject-option (Chow 1970) and even Bayesian reject-option predictors reject on total uncertainty — which conflates "the data is noisy" with "we haven't seen enough data." This paper redefines the objective: minimize expected **regret** — the performance gap between the learned predictor and the Bayes-optimal predictor with full knowledge of the data-generating distribution — and abstains when the regret for an input exceeds a rejection cost δ.

## Dataset / schema
Experiments are **entirely synthetic**: 1-D cubic-polynomial regression with heteroscedastic noise v(x)=0.1+0.04(x+8)², Gaussian prior (intercept var 1, others 0.1), 3000 trials, training sizes m varied. No real-world data, no sports data, no classification benchmark at all.

## Method
**Main result (Theorem 1).** The minimizer of the Bayesian expected regret-based reject loss R_B^δ(Q) is:
- Q_E(x,D) = H_B(x,D) if E(x,D) ≤ δ, else reject, where the **conditional regret** E(x,D) = E_{(θ,y)~p(θ,y|x,D)}[ℓ(y,H_B(x,D)) − ℓ(y,h(x,θ))] — i.e., reject when the expected gap between our model and the true model is too large.
- Uncertainty decomposition: **T(x,D) = A(x,D) + E(x,D)** (total = aleatoric + epistemic), with A(x,D) = E[ℓ(y,h(x,θ))] the expected conditional risk under the posterior.
- Closed forms per loss:
  - Squared loss: E = Var_{θ~p(θ|D)}[E_{y~p(y|x,θ)}[y]] (variance of the conditional mean across the posterior); T = Var_{y~p(y|x,D)}[y].
  - 0/1 loss: E = E_θ[max_y p(y|x,θ)] − max_y p(y|x,D); T = 1 − max_y p(y|x,D).
  - Cross-entropy: E = E_θ[D_KL(p(y|x,θ) ∥ p(y|x,D))] — the mutual-information epistemic measure of Depeweg et al. (2018), here *derived as optimal* rather than postulated (also connects to Hofman et al. 2024 proper-scoring-rule framework; rebuts Wimmer et al. 2023's axiomatic critique as misaligned with this task).
- Key behavioral difference: the epistemic predictor *accepts high-aleatoric inputs* (noisy but well-modeled) and rejects inputs *not reliably supported by the training data* — exactly the "do we know enough to price this game?" question.

**Hyperparameters.** Rejection cost δ; prior; likelihood family. The framework itself is loss-agnostic (any ℓ).

## Equations / assumptions
- R_B(H), H_B(x,D) = argmin over p(y|x,D); Q_B (14) with T(x,D); R_B^δ(Q) (17) with regret-based loss ℓ^δ; E(x,D) (19); T=A+E (20); per-loss table above.
- Assumptions: Bayesian generative model with tractable posterior (all quantities analytic in the paper's setting); loss admits a Bayes predictor; factorization p(x,y|θ)=p(x)p(y|x,θ).

## Features / target
Features: the synthetic 1-D input x of the cubic-polynomial regression (x values over the experimental range); the posterior p(θ|D) over polynomial coefficients given m training observations. Target: the regression target y; the rejection decision is driven by the conditional regret E(x,D) against the rejection cost δ (metric: Area under the Regret–Coverage curve, AuReC, lower better).

## Validation
**Numerical example (synthetic, analytic).** Cubic-polynomial regression with heteroscedastic noise v(x)=0.1+0.04(x+8)², Gaussian prior (intercept var 1, others 0.1), 3000 trials, training sizes m varied. Metric: Area under the Regret–Coverage curve (AuReC, lower better). **The epistemic predictor achieves the lowest AuReC at every dataset size.** Small m: Bayesian (total-uncertainty) ≈ epistemic (epistemic dominates); large m: Bayesian converges to the aleatoric-only predictor as epistemic uncertainty vanishes. Plug-in ML rejector (θ̂, r(x,θ̂)) is consistently worst.
- **Baselines.** Aleatoric (Chow, full knowledge of p(x,y)); Bayesian reject-option (total uncertainty T, eq. 14); plug-in ML reject-option (point estimate θ̂). The paper positions its contribution as the missing third option.

## Exact results / baselines
- **Theorem 1:** the minimizer of R_B^δ(Q) is Q_E(x,D) = H_B(x,D) if E(x,D) ≤ δ, else reject, with E(x,D) = E_{(θ,y)~p(θ,y|x,D)}[ℓ(y,H_B(x,D)) − ℓ(y,h(x,θ))].
- Uncertainty decomposition: **T(x,D) = A(x,D) + E(x,D)**; A(x,D) = E[ℓ(y,h(x,θ))].
- Per-loss closed forms: squared loss — E = Var_{θ~p(θ|D)}[E_{y~p(y|x,θ)}[y]], T = Var_{y~p(y|x,D)}[y]; 0/1 loss — E = E_θ[max_y p(y|x,θ)] − max_y p(y|x,D), T = 1 − max_y p(y|x,D); cross-entropy — E = E_θ[D_KL(p(y|x,θ) ∥ p(y|x,D))] (the Depeweg et al. 2018 mutual-information measure, derived as optimal).
- Synthetic experiment (3000 trials, m varied): the epistemic predictor achieves the lowest AuReC at every dataset size; small m: Bayesian ≈ epistemic; large m: Bayesian → aleatoric-only behavior; plug-in ML rejector consistently worst.
- **Baselines.** Aleatoric (Chow, full knowledge of p(x,y)); Bayesian reject-option (total uncertainty T, eq. 14); plug-in ML reject-option (point estimate θ̂). The paper positions its contribution as the missing third option.

## Code / data
No code or data released; all quantities are analytic in the paper's synthetic setting (cubic-polynomial regression with Gaussian prior and known heteroscedastic noise).

## Leakage
No leakage discussion in the paper; the experiment is entirely synthetic with an analytic posterior, so no data-leakage structure arises. Small-m regime (where epistemic dominates) is where posteriors are hardest to trust — the predictor is most valuable exactly where its inputs are least reliable.

## Limitations
- Experiments are **entirely synthetic** (1-D cubic polynomial, analytic posterior) — no real-world data, no sports data, no classification benchmark at all.
- Deep-network deployment needs approximations (MC dropout, deep ensembles) that the paper leaves to future work; the exactness of the framework does not survive approximation.
- The epistemic predictor still needs a calibrated rejection cost δ — no guidance on setting it from data (unlike 0987's error-reject curves).
- No distribution-free guarantee: unlike 0987's conformal bound, E(x,D) is a model-dependent posterior quantity, only as good as the posterior approximation.
- Wimmer et al.'s axiomatic critique of the entropy decomposition is acknowledged but only rebutted by task-alignment, not resolved.
- Small-m regime (where epistemic dominates) is where posteriors are hardest to trust — the predictor is most valuable exactly where its inputs are least reliable.

## GSE overlap
- Explicitly positions against Chow (1970), Hendrickx et al. (2024) survey, Depeweg et al. (2018) (justifies rather than duplicates), Hofman et al. (2024), Wimmer et al. (2023). No overlap with the corpus; pairs with 0987/0988 as noted.
- The abstention triad is now complete: 0987 (conformal — distribution-free error *guarantee* on accepted predictions), 0988 (FERL — interpretable, single-pass evidential abstention + OOD), 0989 (Bayesian regret — the *principled justification* for epistemic abstention, and the only one of the three that says "accept noise you understand, reject data you don't"). It also rationalizes entropy/variance-based uncertainty scores commonly used in BNNs — directly relevant to any ensemble/Bayesian version of GSE's model.

## Implementation (GSE adaptation)
- **What to build:** an **epistemic abstention score for GSE's pick model**. Maintain a Bayesian view of GSE's win-probability model (posterior over parameters via Laplace approximation or a small deep ensemble over model checkpoints). For each candidate pick, compute the 0/1-loss epistemic score E = E_θ[max_y p(y|x,θ)] − max_y p(y|x,D) (or the CE mutual-information form E_θ[D_KL]) and **withhold picks with E > δ**. The δ threshold is set from the error-reject curve machinery of 0987 (this paper's missing piece is supplied by that paper).
- **The operational distinction this buys:** GSE currently conflates "close game" (high aleatoric — publishable, price it honestly) with "model is guessing" (high epistemic — withhold). This framework separates them: publish noisy-but-understood games, abstain from under-supported ones (new coaches, regime changes, thin-sample matchups). That is exactly the distinction a "most accurate and calibrated" company must make.
- **Triple-gate architecture:** 0989 (epistemic regret — *why* abstain: insufficient data) → 0988 (FERL — *what* is anomalous: attribute-level, auditable) → 0987 (conformal — *guarantee*: certified error rate on published picks). Each lane paper supplies one gate.

## Reproducible test
- Reproduce the synthetic cubic-polynomial experiment (3000 trials, m ∈ {10, 30, 100, 300}): confirm (a) epistemic predictor AuReC < Bayesian AuReC < plug-in AuReC at all m, (b) Bayesian ≈ epistemic at m=10 and Bayesian → aleatoric-only behavior at large m, (c) the closed-form variance decomposition E = Var_θ[E[y|x,θ]] matches the Monte-Carlo posterior estimate within 5%.

## Numeric gate
- In the reproduced synthetic experiment at m=30 (3000 trials): the epistemic predictor's AuReC must be **strictly lower than the Bayesian (total-uncertainty) predictor's AuReC** with the difference significant at **p < 0.01** (paired test across trials), and the Bayesian-vs-epistemic AuReC gap must **shrink monotonically** as m increases from 10 → 300 (convergence of total uncertainty to aleatoric dominance). If either fails, the implementation does not capture the paper's claimed behavior.

## Improvement experiment
- **Real-data validation (the paper's explicit gap):** implement the epistemic score via a deep ensemble (10 members) over GSE's actual pick model and evaluate on a full season of binary picks. Success: (a) picks in the top epistemic-uncertainty decile have realized error ≥8 points higher than the bottom decile (the score discriminates "model is guessing"), AND (b) withholding the top-decile-E picks reduces published-set error by ≥2 points at ≤10% rejection — proving the regret-based abstention transfers from the analytic 1-D setting to real sports data. Compare head-to-head against total-uncertainty (softmax entropy) abstention: epistemic must win on the published-set error at matched reject rates.

## Verdict
**ADAPT** — The abstention lane's theoretical capstone: the first principled epistemic-only reject-option framework, with a regret-minimization derivation that *justifies* the entropy/variance uncertainty scores practitioners already use. Synthetic-only experiments are the honest limit; the deep-ensemble sports validation is the improvement experiment and closes the loop with the other two lane papers into a triple-gate abstention architecture.
