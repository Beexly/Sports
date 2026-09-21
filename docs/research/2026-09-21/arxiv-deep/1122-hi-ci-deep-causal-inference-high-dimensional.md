# [1122] Hi-CI: Deep Causal Inference with High-Dimensional and Highly Correlated Variables (arXiv:2008.09858v3)

**Citation:** Anoop Damera (2020). *Hi-CI: Deep Causal Inference with High-Dimensional and Highly Correlated Variables*. arXiv:2008.09858v3. URL: https://arxiv.org/abs/2008.09858
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; method, equations, architecture, datasets, metrics, experiments, tables, comparative results, conclusion, and references read).
**Verdict:** ADAPT — the autoencoder + mixed L₂,₁ mean-difference regularization architecture is a genuine contribution to GSE's causal toolkit for high-dimensional covariates with continuous treatments; the counterfactual validation is synthetic-only, so adopt the architecture with the paper's metrics, not its claims.

## 1. Research question
How do we estimate individual and average treatment effects when covariates are **high-dimensional** (thousands of features) and treatments are **high-cardinality discrete or continuous** — regimes where matching-based methods (PM) and multi-branch networks (MultiMBNN) break down? Hi-CI learns a decorrelated representation via an autoencoder whose loss mixes treatment-distribution cross-entropy, reconstruction loss, and a mixed L₂,₁ mean-difference penalty.

## 2. Dataset / schema
- **Synthetic** datasets (fully described DGP) and **semi-synthetic NEWS** datasets (NEWS2 / NEWS4 / NEWS100), NEWS with **2,870 covariates**.
- Access: simulated data **available on request**; no public release.

## 3. Method / model
- Autoencoder representation learning combining: (a) **treatment-distribution cross-entropy** (predict treatment from representation); (b) **reconstruction loss**; (c) **mixed L₂,₁ mean-difference regularization** across treatment groups (the decorrelation penalty).
- Overall objective = decorrelation loss + outcome RMSE. Outcome head predicts dose-response surfaces for continuous treatments.

## 4. Equations & assumptions
- Objective: L = L_CE(treatment | representation) + L_recon + λ·‖mean-difference‖_{2,1} + L_RMSE(outcome). (Component weights as stated in paper.)
- Assumptions: (a) causal sufficiency / unconfoundedness given observed covariates; (b) the representation can be made treatment-independent without destroying outcome signal; (c) positivity over continuous doses.

## 5. Features / target
- Features: high-dimensional covariates (e.g., 2,870 in NEWS). Treatments: high-cardinality discrete or continuous doses. Targets: individual treatment effects (ITE), average treatment effect (ATE), dosage-effect curves.

## 6. Validation design
- Metrics: **PEHE** (precision in estimation of heterogeneous effects), **MAPE over ATE**, **MISE** (dosage), dosage-effect MAPE.
- Baselines: **PM** (perfect match / matching) and **MultiMBNN** (multi-branch neural net); multiple runs with reported standard deviations.

## 7. Numerical results / baselines
- NEWS100 PEHE: Hi-CI **8.1432 ± 0.0476** vs PM **48.3878 ± 0.5620** vs MultiMBNN **49.6386 ± 0.8520** (~6× better).
- NEWS100 MAPE-ATE: Hi-CI **0.507 ± 0.0171** vs PM **1.9850 ± 0.1824** vs MultiMBNN **2.2014 ± 0.2350**.
- Paper's claim: dominant across all metrics on synthetic and NEWS; small standard deviations suggest stability.

## 8. Code / data availability
- Simulated data on request; **no code link stated** in the extracted text.

## 9. Leakage & limitations
- **Counterfactual validation is entirely synthetic/semi-synthetic** — ground truth ITE exists only because the DGP was invented; real-world performance (including any NFL application) is untested. (b) Causal sufficiency is assumed, not defended. (c) The margins (~6× on PEHE) partly reflect baselines (PM, MultiMBNN) that are known-weak in high dimensions — a stronger modern baseline (e.g., X-learner, R-learner, causal forest) is missing. (d) No NFL test; no prospective evaluation. (e) No code.

## 10. GSE overlap
- Existing-research map: causal inference is an ML-brief commissioned topic (results pending); **Garrett's CEPT is WIP — cite, do not duplicate.** Related ledgers: `0142-the-counterfactual-combine-a-causal-framework.md`, `0265-framing-causal-questions-in-sports-analytics.md`, `0272-causal-mediation-analysis-for-stochastic-interventions.md`, `0771-transfer-learning-for-causal-effect-estimation.md`. None cover high-dimensional-covariate deep ITE estimation with continuous doses. **Extension**, not a duplicate — and note the natural pairing with ledger 1121 (PPTA handles limited overlap; Hi-CI handles high-dimensional confounding).

## 11. GSE implementation spec
- **Use case:** heterogeneous treatment effects of continuous football exposures — e.g., dose-response of target share / snap share / practice load on player fantasy output, with hundreds of covariates (tracking + matchup + weather + line features).
- **Implementation:** PyTorch; encoder → representation with the three-part loss (treatment CE + reconstruction + mixed L₂,₁ mean difference); outcome head per dose level. Reuse GSE's feature store for covariates.
- **Data:** nflverse + tracking + odds features, 2018–2024.
- **Effort:** ~3 engineer-weeks (loss plumbing + hyperparameter search over λ).

## 12. Reproducible test
- **Semi-synthetic NFL:** real covariates from 2019–2023, simulated heterogeneous dose effects with known ITE; compute PEHE, MAPE-ATE, MISE vs PM, MultiMBNN, and a modern baseline (X-learner/R-learner). Metric gates on PEHE and MAPE-ATE.

## 13. Acceptance / rejection gate
- **Adopt** if Hi-CI beats the best modern baseline (not just PM/MultiMBNN) on PEHE by ≥20% with comparable or better MAPE-ATE on the semi-synthetic NFL test; **reject** if it only beats the paper's weak baselines (then it's a baseline-selection artifact, not a method win).

## 14. Improvement experiment
- **Combine with 1121 (PPTA):** run Hi-CI's representation learning inside PPTA's stochastic-inclusion design — Hi-CI handles the high-dimensional confounding, PPTA handles the limited overlap. Test on the semi-synthetic NFL DGP with both problems present (many covariates + few treated units): hypothesis is the combination beats either alone on PEHE under poor overlap, which neither paper tests.
