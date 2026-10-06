# [0744] Bayesian Neural Network Versus Ex-Post Calibration For Prediction Uncertainty (arXiv:2209.14594)

**Citation:** Satya Borgohain, Klaus Ackermann, Ruben Loaiza-Maya (2022). *Bayesian Neural Network Versus Ex-Post Calibration For Prediction Uncertainty*. arXiv:2209.14594. URL: https://arxiv.org/abs/2209.14594
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — a variational BNN ranked best on average across 20 tabular datasets vs. beta/isotonic/logistic calibration and is cheap to try as an uncertainty head on GSE's tabular pick models; but the paper's own tests show the edge is NOT statistically significant against most competitors, so adapt as a benchmarked experiment, not a replacement. Calibrated.

## 1. Research question
For binary classification on tabular data, does a variational Bayesian neural network (intrinsic uncertainty) beat a standard neural network plus ex-post calibration (beta, isotonic, logistic/Platt) on log-loss — i.e., is it worth being Bayesian, or is post-hoc calibration of a point network enough?

## 2. Dataset / schema
**20 UCI binary-classification datasets** (the paper binarizes multi-class ones): sizes from small (hundreds) to large; classic tabular sets including Image Segmentation, Landsat Satellite, Mushroom, Spambase, Waveform variants. Standard 80/20 train/test with validation and calibration subsets carved from training.

## 3. Method / model
**BNN**: two hidden layers × 4 ReLU units (tiny), variational inference (mean-field Gaussian posteriors), ADAM. Competitors: same-architecture standard NN, uncalibrated; plus ex-post calibrators on the NN's outputs — **beta calibration**, **isotonic regression**, **logistic (Platt)**. Metric: test log-loss. Statistics: average ranks + Friedman test + Wilcoxon signed-rank with Holm correction.

## 4. Equations & assumptions
Variational objective: ELBO = E_q[log p(y|w,x)] − KL(q(w)‖p(w)) with factorized Gaussian q. Beta calibration: p_cal = 1/(1 + exp(−c)·(p/(1−p))^{−a}·... ) (3-parameter family). Assumptions: mean-field VI approximates the true posterior adequately; binarized UCI tasks proxy real tabular problems; log-loss is the right uncertainty metric.

## 5. Features / target
Tabular features per UCI dataset; binary targets (binarized where needed). No temporal structure.

## 6. Validation design
80/20 train/test; validation + calibration subsets from train; same architecture across methods; rank-based comparison across the 20 datasets with Friedman + post-hoc Wilcoxon-Holm.

## 7. Numerical results / baselines
Average ranks (lower better): **BNN 2.0952**, beta 2.6667, uncalibrated NN 2.7619, logistic 3.1905, isotonic 4.2857. Friedman statistic **23.13, p = 0.000119** — methods differ significantly overall. BUT post-hoc Wilcoxon-Holm: only **BNN vs. isotonic** is significant; BNN vs. beta, BNN vs. uncalibrated, BNN vs. logistic are NOT significant. Headline dataset-level log-losses: Image Segmentation — BNN **0.012053** vs. uncalibrated 0.410117; Landsat — BNN **0.065981** vs. 0.549391; Morphological Mfeat — BNN **0.000206** vs. 0.325083. So the BNN wins big on some datasets and the average-rank lead is real, but the statistical support for "BNN beats calibrated NNs" is weak.

## 8. Code / data availability
None stated. UCI datasets are public.

## 9. Leakage & limitations
(a) The abstract-level claim ("BNN outperforms") overstates the statistics — pairwise significance only vs. isotonic, the weakest competitor. (b) Tiny networks (2×4) — unclear if the VI advantage persists at realistic model sizes. (c) Binarized multi-class datasets distort the original tasks. (d) No time structure — all iid splits. (e) VI is mean-field; no comparison to MCMC or deep ensembles. (f) Log-loss only — no calibration curves, no decision-value metrics. (g) Calibration subsets are small on small datasets, handicapping isotonic in particular.

## 10. GSE overlap
Existing-research-map.md covers isotonic/Platt/beta-adjacent calibration and has a "bayesian" keyword lane; the 15-area ML brief mentions uncertainty topics but **no BNN-vs-calibration horse race** is in the map. The map's standing question "is post-hoc calibration enough?" is exactly this paper's question — new evidence for it, not a duplicate.

## 11. GSE implementation spec
(1) Build a small VI-BNN head (2 hidden layers, mean-field Gaussian, ADAM) on GSE's tabular game features for win probability; (2) horse-race it against the current NN + Platt/isotonic/beta-calibration pipeline on rolling time-ordered backtests (train ≤2023, calibrate 2024-H1, test 2024-H2/2025); (3) metric: log-loss + Brier + reliability diagrams. Effort: ~3–4 days (Pyro or PyMC for VI).

## 12. Reproducible test
Dataset: GSE tabular features + moneyline outcomes, 2022–2025, time-ordered splits. Baselines: production NN uncalibrated + Platt + isotonic. Success = BNN mean log-loss rank-best across the test windows AND passes a paired Diebold-Mariano-style test at 5% vs. the best calibrator (the paper failed this bar — GSE should require it).

## 13. Acceptance / rejection gate
ADOPT the BNN head only if it beats the best ex-post calibrator with statistical significance on time-ordered GSE data (the paper's own standard, which the paper itself did not meet); otherwise REJECT and keep the cheaper post-hoc calibration stack — the paper's honest result is "calibration is usually enough."

## 14. Improvement experiment
**BNN + post-hoc calibration stacking**: the paper pits BNN against calibrated NNs but never calibrates the BNN's own outputs — test whether beta/isotonic calibration of the VI-BNN's predictive mean gives the best of both (intrinsic uncertainty + empirical recalibration), which neither the paper nor GSE's current stack tries.
