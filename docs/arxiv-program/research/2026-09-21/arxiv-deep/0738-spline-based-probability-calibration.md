# [0738] Spline-Based Probability Calibration (arXiv:1809.07751)

**Citation:** Brian Lucena (2018). *Spline-Based Probability Calibration*. arXiv:1809.07751. URL: https://arxiv.org/abs/1809.07751
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — non-parametric spline calibration with the compact-logit transform and cross-validated calibration scheme is a direct, proven upgrade over Platt/isotonic for GSE's probability outputs; adapt as a post-hoc layer on win-probability/spread/total models.

## 1. Research question
How to post-hoc calibrate classifier scores into well-calibrated probabilities — particularly for overconfident models (Naive Bayes, deep nets) and multi-class problems where Platt scaling (too rigid) and isotonic regression (too coarse, no direct multi-class extension) fail — while conserving training data by avoiding a dedicated calibration set.

## 2. Dataset / schema
Three experiments, all public:
- **MIMIC-III ICU mortality**: 59,726 hospital stays; 51 features (lab values/vital signs over first 24h, e.g., max WBC, min respiration rate); binary target in-hospital mortality. Random split: 60% train / 20% calibration / 20% test.
- **Adult (Census Income, UCI)**: 32,561 train / 16,281 test; 6 features (work-class, education-num, marital-status, relationship, race, sex); binary target income > $50k. Naive Bayes model (deliberately overconfident).
- **CIFAR-10**: 50,000 train / 10,000 test images, 10 classes. Keras example CNN (`cifar10_cnn.py`), trained 800 epochs. Calibration set = 10,000 of the 50,000 training images (or 5-fold CV in Algorithm 4 variant).

## 3. Method / model
**SplineCalib (binary, Algorithm 1):** non-parametric logistic regression of calibration-set outcomes on calibration-set scores. Steps: (1) sample 200 knots from unique score values; (2) expand scores into the natural cubic spline basis (n×k matrix X); (3) cross-validated L2-regularized logistic regression over λ, choosing λ* by CV log-loss; (4) refit at λ*; (5) calibration function f(z) = logistic(X_natural(z) · β̂). **Compact logit transform (Algorithm 2)** for overconfident models: pre-transform scores with G_ε (scaled/shifted logit on [ε,1−ε], identity outside), then run Algorithm 1; ε = 10^(r−1) with r = ⌊log10(min(1−p_i))⌋. **Multi-class (Algorithm 3):** fit Algorithm 1/2 separately on each of the m one-vs-rest columns, then renormalize f(x) = f_i(x_i)/Σ_j f_j(x_j). **Cross-validated calibration (Algorithm 4):** train k-fold models (5-fold, 40k/10k on CIFAR), stack out-of-fold predictions into a 50k calibration set, fit multi-class calibrator, train final model on full 50k, compose.

## 4. Equations & assumptions
Loss minimized (non-parametric logistic regression):
J(f) = −Σ_i [y_i log f(x_i) + (1−y_i) log(1−f(x_i))] + ½ λ ∫ f''(t) dt. (Eq. 1 in paper)
Natural cubic spline basis on knots {φ_1,...,φ_K}: N_1(x)=1, N_2(x)=x, N_{k+2}(x)=d_k(x)−d_{K−1}(x), k=1..K−2, where d_k(x)=[(x−φ_k)_+^3 − (x−φ_K)_+^3]/(φ_K−φ_k). Multi-class combination: f(x)=f_i(x_i)/Σ_j f_j(x_j). Compact logit:
G_ε(x) = ((1−2ε)/(2 log((1−ε)/ε)))·log(x/(1−x)) + ½ for x∈[ε,1−ε]; x otherwise. Assumptions: scores are (re-normalizable) probabilities; the multi-class step assumes each class's calibration is independent of how remaining probability is distributed; cross-validated variant assumes out-of-fold models approximate the final model well enough.

## 5. Features / target
Input features: one-dimensional model score (binary) or score vector on the probability simplex (multi-class); target: binary outcome indicator or one-vs-rest indicators. Prediction horizon: none (static classification).

## 6. Validation design
Random train/calibration/test splits as above; CIFAR trained 800 epochs with log-loss/accuracy computed every 25 epochs; cross-validated variant uses 5-fold out-of-fold stacking. Baselines: uncalibrated, Platt scaling, isotonic regression, and "clipping" (best of p_min ∈ {0.01, 0.001, 0.0001, 0.00001}) for the multi-class CNN. Metric: log-loss (primary) and accuracy.

## 7. Numerical results / baselines
MIMIC-III Random Forest log-loss (Table 1): uncalibrated 0.2525, isotonic 0.2592, Platt 0.2535, **SplineCalib-untransformed 0.2442** (best). Adult Naive Bayes log-loss: uncalibrated 0.7448, isotonic 0.3976, Platt 0.4287, SplineCalib-untransformed 0.4032, **SplineCalib-compact-logit 0.3934** (best calibrated). CIFAR-10 CNN at 800 epochs: uncalibrated log-loss 0.4361, clipped 0.4150, **SplineCalib 0.3633**; accuracy 87.64% → **87.88%** with calibration. Cross-validated variant (final model on full 50k): uncalibrated log-loss 0.3704, clipped 0.3586, **SplineCalib 0.3286**; accuracy 88.86% → **89.04%**. Key claim: the 40k-train + 10k-calibrate calibrated model beat the uncalibrated model trained on the full 50k, i.e., calibration can be "worth it" vs. more training data.

## 8. Code / data availability
`ml-insights` Python package (`pip install ml_insights`); tutorial notebooks at https://github.com/numeristical/introspective. Datasets: MIMIC-III, UCI Adult, CIFAR-10 — all public.

## 9. Leakage & limitations
Calibration-set scores come from the same model fit on the train set — standard, no leakage if sets are disjoint (random splits, fine for iid data). Adversarial notes: (a) reliability of CV λ selection depends on calibration-set size; with small calibration sets the spline can overfit curvature; (b) the multi-class "calibrate columns then renormalize" is a heuristic — joint calibration is not attempted, and renormalization can distort calibrated per-class probabilities; (c) the compact-logit ε heuristic is ad hoc; (d) symmetric-interval-style symmetry assumption is absent (this is fine for classification); (e) paper does not report confidence intervals on the log-loss gains — CIFAR accuracy gains (+0.24pp, +0.18pp) are small; (f) no time-series validation — NFL data is non-stationary, so iid random splits do not transfer directly.

## 10. GSE overlap
Existing-research-map.md (arxiv-program/state/) lists GSE calibration coverage: CQR (Drive doc), grouping loss (2210.16315), temperature scaling, **Platt scaling, isotonic regression**, Venn-Abers, Mondrian/cross-conformal, Clopper-Pearson, LRD calibration dashboard (2207.13770). SplineCalib itself is NOT in the map — Platt/isotonic are the exact baselines this paper beats. This is an extension, not a duplicate: a smoother, data-adaptive replacement for GSE's existing Platt/isotonic post-hoc calibrators, plus a usable multi-class scheme GSE lacks.

## 11. GSE implementation spec
Build a post-hoc calibration layer (Python, scipy/numpy + sklearn): (1) take GSE engine win probabilities (moneyline/spread-cover/total over-under) plus a calibration set of past games with outcomes (rolling 2–3 seasons, time-ordered); (2) fit per-market binary SplineCalib (sample 200 knots, CV L2 logistic on natural-spline basis) and the compact-logit variant for any overconfident sub-model; (3) multi-class extension for 3-way outcomes where relevant (e.g., spread buckets); (4) evaluate log-loss/Brier vs current Platt/isotonic baseline; (5) serve as a stateless function applied at inference. Effort: ~2–3 days including backtest harness.

## 12. Reproducible test
Dataset: GSE engine probabilities + outcomes for 2023–2025 NFL regular seasons (time-ordered; calibrate on 2023–2024, test on 2025). Metric: log-loss (primary) and Brier score on spread-cover and total over/under probabilities. Baselines: current production calibrator (Platt/isotonic per existing-research map). Report per-market log-loss and calibration reliability curves.

## 13. Acceptance / rejection gate
ADOPT if SplineCalib (or compact-logit variant) reduces test-window log-loss vs. the best current calibrator by ≥ 1% relative on BOTH spread and total markets with no accuracy/ROI regression on the posted-pick subset; REJECT if it fails to beat Platt/isotonic on either market or shows calibration-set-size instability (log-loss degrades when calibration window is halved).

## 14. Improvement experiment
Combine SplineCalib with Mondrian (conditional) calibration: fit separate spline calibrators per conditioning bin (favorite/underdog, home/away, high/low total) and compare against a single global spline — tests whether the miscalibration GSE sees is regime-dependent, which a single global calibrator (paper's setup) cannot fix.
