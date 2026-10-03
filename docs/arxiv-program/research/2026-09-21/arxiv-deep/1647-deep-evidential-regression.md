# [1647] Deep Evidential Regression (arXiv:1910.02600)

**Citation:** Alexander Amini, Wilko Schwarting, Ava Soleimany, Daniela Rus (2020). *Deep Evidential Regression*. arXiv:1910.02600. NeurIPS 2020. MIT CSAIL. URL: https://arxiv.org/abs/1910.02600
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: NIG formulation, loss derivation, benchmark regression, NYU depth, OOD/adversarial experiments, conclusions/limitations).
**Verdict:** ADAPT — evidential regression gives GSE single-forward-pass aleatoric + epistemic uncertainty for continuous targets (margins, totals) with NO sampling at inference and NO OOD training data — the cheapest possible uncertainty head for the engine. The NLL loss + evidence regularizer is directly portable as an auxiliary head on GSE's margin/total models; the OOD-entropy inflation is the mechanism for an "engine doesn't trust this game" abstention signal.

## 1. Research question
Bayesian NNs, dropout, and ensembles estimate epistemic uncertainty but need sampling at inference (slow) or OOD training data (unavailable). Can a deterministic network learn BOTH aleatoric (data) and epistemic (model) uncertainty for regression in ONE forward pass — by predicting the hyperparameters of a higher-order evidential distribution, with a regularizer that inflates uncertainty exactly where predictions are wrong?

## 2. Dataset / schema
(1) **Benchmark regression**: standard UCI-style suite (Boston, Concrete, Energy, Kin8nm, Naval, Power, Protein, Wine, Yacht), RMSE + NLL + inference-speed comparison vs MC-dropout and deep ensembles (n=5 sampling for baselines). (2) **Monocular depth estimation**: NYU Depth v2, **>27k RGB-to-depth pairs** (indoor scenes), U-Net backbone; evidential head outputs 4 maps (γ, ν, α, β) vs 1 map for baselines. (3) **OOD**: ApolloScape outdoor-driving images (never seen in training); uncertainty measured as predictive entropy, OOD detection via AUC-ROC. (4) Adversarial perturbations on depth inputs.

## 3. Method / model
Place a Normal-Inverse-Gamma prior over the Gaussian likelihood: y ~ N(μ, σ²), μ ~ N(γ, σ²/ν), σ² ~ IG(α, β). The network outputs m = (γ, ν, α, β). Prediction = E[μ] = γ; aleatoric = E[σ²] = β/(α−1); epistemic = Var[μ] = β/(ν(α−1)). Training = multi-task: (1) maximize model evidence → closed-form NLL of the Student-t marginal p(y|m) = St(y; γ, β(1+ν)/(να), 2α); (2) evidence regularizer L^R = |y − γ|·(2ν + α) that strips evidence (inflates uncertainty) proportional to error. Total: L = L^NLL + λ·L^R.

## 4. Equations & assumptions
- Evidential prior (NIG): `p(μ,σ²|γ,ν,α,β) = β^α √ν / (Γ(α)√(2πσ²)) · (1/σ²)^{α+1} · exp(−(2β + ν(γ−μ)²)/(2σ²))`
- Prediction/uncertainties: `E[μ] = γ`, `E[σ²] = β/(α−1)` (aleatoric), `Var[μ] = β/(ν(α−1))` (epistemic)
- Model evidence (Student-t): `p(y|m) = St(y; γ, β(1+ν)/(να), 2α)`
- NLL loss: `L^NLL = ½log(π/ν) − α·log(Ω) + (α+½)·log((y−γ)²ν + Ω) + log(Γ(α)/Γ(α+½))`, `Ω = 2β(1+ν)`
- Regularizer: `L^R = |y − γ|·(2ν + α)`; total `L = L^NLL + λ·L^R`
- Assumptions: Gaussian likelihood; α > 1 (finite variance); λ tuned (paper sweeps λ); no coverage guarantee — uncertainty is learned, not calibrated.

## 5. Features / target
Tabular features → continuous targets (benchmarks); RGB → per-pixel depth (NYU). Transfer: GSE game features → margin/total, with the 4-parameter head replacing the point head.

## 6. Validation design
Benchmarks: RMSE, NLL, inference speed vs dropout and ensembles (5 runs each). Depth: prediction-vs-error inverse relationship (strong inverse trend desired), calibration curves (ideal y=x) with calibration-error insets. OOD: entropy CDFs on ID vs ApolloScape; AUC-ROC for OOD detection. Adversarial: predicted uncertainty vs perturbation magnitude, spatial correspondence of uncertainty with error.

## 7. Numerical results / baselines
- Benchmark regression: "evidential models outperform baseline methods for NLL and inference speed on ALL datasets" (Table 1; top scores bolded within significance); RMSE competitive.
- Depth (NYU): strong inverse prediction-confidence vs error relationship (Fig 4B); calibration curve near y=x with small calibration error (Fig 4C); uncertainty maps tightly track actual error spatially.
- OOD (ApolloScape): distinct positive shift of the entropy CDF on OOD vs ID (Fig 5A); clear boxplot separation (Fig 5B); OOD-detection AUC-ROC competitive with baselines — WITHOUT any OOD training data (unlike Prior Networks).
- Adversarial: predicted uncertainty increases steadily with perturbation magnitude and stays spatially aligned with error (Fig 6D).

## 8. Code / data availability
https://github.com/aamini/evidential-deep-learning. Datasets: UCI benchmarks, NYU Depth v2, ApolloScape (public).

## 9. Leakage & limitations
(a) NO calibration guarantee — the uncertainties are learned heuristics; the paper's own §6 (conclusions/limitations) is explicit. GSE must conformalize or temperature-scale them before publishing. (b) λ (regularizer weight) is sensitive; mis-tuned λ collapses to over/under-confidence. (c) Gaussian likelihood assumption — heavy-tailed margins (blowouts) may need a Student-t likelihood extension. (d) α, ν, β need positivity constraints (softplus/exp) — training instability if unconstrained. (e) Epistemic uncertainty conflates "far from training data" with "hard region" — fine for abstention, imprecise for diagnosis.

## 10. GSE overlap
GSE's uncertainty stack is conformal + Platt/temperature/isotonic (`temperature-map.ts`, `platt-scaling.ts`, `isotonic-pava.ts`, `brier.ts`, `ece.ts`) — all POST-HOC calibrators of point forecasts. Nothing learns uncertainty END-TO-END in the model. Ledgers [0988]/[0989] touch evidential/abstention ideas at the classification level; no regression-evidential ledger exists. This is new territory: a train-time uncertainty head.

## 11. GSE implementation spec
(1) **Evidential head**: replace/augment the engine's margin and total point heads with 4-output (γ, ν, α, β) heads; loss = L^NLL + λ·L^R, sweep λ ∈ {0.01, 0.1, 1.0}; (2) **Abstention signal**: epistemic Var[μ] = β/(ν(α−1)) → per-game "engine trust" score; gate publishing when epistemic uncertainty exceeds a calibrated threshold (feeds `selective-publish.ts`); (3) **Calibration wrapper**: conformalize the evidential intervals (CQR on [γ ± k·σ_total]) so published numbers carry the [1639] guarantee. Effort: 1 week (model change + backtest).

## 12. Reproducible test
Dataset: GSE engine training data 2021–2024, test 2025. Train margin/total models with evidential heads. Metrics: NLL and RMSE vs current point models; Spearman correlation between epistemic uncertainty and absolute error (target: strong positive); abstention simulation — withholding the top-uncertainty-decile games improves posted-pick win rate; calibration of derived intervals before/after CQR wrapping.

## 13. Acceptance / rejection gate
ADAPT if: NLL improves vs the Gaussian-MLE baseline head AND epistemic uncertainty correlates with absolute error (Spearman ≥ 0.3) AND the top-uncertainty-decile abstention improves realized win-rate ≥ 2pp. REJECT the end-to-end head if λ-tuning proves unstable across seeds — fall back to post-hoc conformal only.

## 14. Improvement experiment
**Heavy-tailed evidential likelihood**: replace the Gaussian with a Student-t likelihood (NIG → Normal-Inverse-Gamma-Scale-mixture) to handle NFL blowout tails; test NLL and tail-interval calibration on high-total games. Also test distilling the evidential head's uncertainty into the existing post-hoc calibrators as an extra feature (uncertainty-as-feature for `temperature-map.ts`).

**Verdict:** ADAPT — add a 4-parameter evidential head (γ, ν, α, β; L^NLL + λ·L^R loss) to GSE's margin/total models for single-forward-pass aleatoric + epistemic uncertainty, use epistemic Var[μ] as the abstention/trust signal, and conformalize derived intervals via [1639]; accept on NLL improvement plus Spearman(epistemic, |error|) ≥ 0.3.
