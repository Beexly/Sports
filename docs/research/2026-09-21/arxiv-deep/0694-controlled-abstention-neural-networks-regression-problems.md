# [0694] Controlled Abstention Neural Networks for Identifying Skillful Predictions for Regression Problems (arXiv:2104.08236v1)

**Citation:** Elizabeth A. Barnes, Randal J. Barnes (2021). *Controlled Abstention Neural Networks for Identifying Skillful Predictions for Regression Problems*. arXiv:2104.08236v1. URL: https://arxiv.org/abs/2104.08236v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2104.08236.txt`, ar5iv-converted HTML text; complete paper §§1–6 plus references, read in full).
**Verdict:** ADAPT — the μ/σ regression head with the abstention loss and PID-controlled abstention setpoint adapts directly to GSE's totals/margin regression head: predict (μ, σ) per game and abstain (don't publish) when σ exceeds a calibrated threshold. Climate domain only; all experiments are synthetic.

## 1. Research question
Can a neural network for regression learn during training to identify "forecasts of opportunity" (confident, skillful predictions) and abstain on the rest — outperforming the standard approach of training a Gaussian-uncertainty network and thresholding σ post-hoc? A companion classification paper (2104.08281, ledger 0695) does the same for classification.

## 2. Dataset / schema
- Synthetic climate benchmark (Mamalakis et al. 2021): input maps of monthly SST anomalies (900 grid points: 60 lon × 15 lat, spatially correlated); target y_i = Σ_g F_g(x_i), sum of local piecewise-linear nonlinear responses. 8,000 train / 5,000 validation / 5,000 test. Public.
- Synthetic 1D example: 30% of samples on a clean line (y_l = 0.7x_l + 0.6 + N(0, 0.05²)), 70% in a noisy cloud (y_c = x_c − 2 + N(0, 0.5²)); 3,000/1,000/1,000 split.
- Forecasts-of-opportunity variant: ENSO-box average > 0.5 (29% of samples) kept; other samples' y shuffled (no input–output relationship).
- Corrupt-inputs variant: 30% of samples with 66% of pixels set to −4.0.
- All synthetic; no real or sports data.

## 3. Method / model
Network: FC 50→25 hidden units, ReLU, outputs μ_i (prediction) and σ_i > 0 (uncertainty). Two-stage training: (1) spin-up N_spin epochs with baseline NLL loss; (2) abstention loss ℒ(x_i) = −q_i log p_i − α log q_i with q_i = min(1.0, (κ/σ_i)²), κ = P_90% (90th percentile of validation σ at end of spin-up), abstention declared when σ_i > τ (τ = coverage-setpoint percentile of validation σ, fixed). α either constant (user picks; network then discovers optimal coverage) or PID-controlled (velocity algorithm, evaluated over 6 consecutive batches = 192 samples) to hit a user-specified abstention setpoint in {0.1, …, 0.9}. Early stopping with 60-epoch patience; model selection restricted to epochs where validation abstention fraction is within 0.1 of setpoint. 20 random-init runs per configuration. Baselines: same net with NLL loss ℒ = −log N(y_i; μ_i, σ_i) + post-hoc σ thresholding; and a single-output MAE net.

## 4. Equations & assumptions
- Baseline NLL: ℒ(x_i) = −log p_i, p_i = N(y_i; μ_i, σ_i).
- Abstention loss (Eq. 4): ℒ(x_i) = −q_i log p_i − α log q_i; q_i = min(1.0, (κ/σ_i)²).
- Abstention rule: abstain iff σ_i > τ, τ = P_m (validation σ percentile at end of spin-up); κ = P_90%.
- Standardized error: z_i = (y_i − μ_i)/σ_i — empirically ≈ N(0,1) for the baseline, justifying the (μ, σ) probabilistic interpretation.
- Coverage = fraction predicted = 1 − abstention.
- Assumptions: samples independent; input standardized if (μ, σ) are to be read as a conditional distribution; abstention percentile thresholds transfer from validation to test.

## 5. Features / target
SST anomaly maps → global climate response (regression). For GSE: game feature vector → (predicted total or margin μ, uncertainty σ); abstain (don't publish the pick) when σ > τ.

## 6. Validation design
Synthetic data where the ground-truth "opportunity" fraction is known (29% ENSO / 30% line / 30% corrupted), so correct abstention fractions are verifiable. Compared CAN vs baseline-ANN-σ-thresholding vs MAE via mean absolute error vs coverage curves over 20 seeds; constant-α and PID-α variants. No real-data validation — authors explicitly flag this as future work.

## 7. Numerical results / baselines
- 1D example (constant α=0.1, N_spin=225): CAN identifies optimal coverage ≈19% (line is the skillful sub-population); CAN error slightly below the best baseline ANN at every coverage; CAN "puts more energy into learning the confident samples" via the loss design. (Note: the paper states the line holds 30% of samples in §4.1 but says "20%" in the results discussion — an internal inconsistency; the CAN's identified 19% is reported verbatim.)
- Forecasts of opportunity (PID-controlled α, setpoints 0.1–0.9): CAN error decreases with coverage and the best CAN models beat the best baseline ANN at every coverage, especially below 30% coverage (the true 29% opportunity fraction); constant-α variant identifies ~24% coverage, "very close to the 29%"; PID slightly outperforms constant-α.
- Corrupt inputs (constant α=0.05): CAN correctly identifies 70% coverage (30% abstention = the corrupted fraction) and beats baseline ANN.
- z-score histograms (Eq. 7): baseline ANN standardized errors have mean ≈0, std ≈1 on train and test — σ is a calibrated uncertainty, not just a ranking score.
- Ridge (L2=0.1) + abstention combined beats either alone; regularization narrows the CAN-vs-baseline gap but CAN still wins at low coverages.

## 8. Code / data availability
Not stated with a link in the text ("code and data will be made available via the Mountain Scholar permanent data repository and Zenodo once published" — no DOI given in this version). Synthetic data generator is Mamalakis et al. 2021 (public).

## 9. Leakage & limitations
- Entirely synthetic data; zero real-world or sports validation. The "correct" abstention fractions are built into the data-generating process — a best case for the method.
- The baseline (post-hoc σ thresholding) is itself strong; CAN's edge over it is real but modest (curves, not tables, carry the comparison — no numeric deltas quoted in text).
- Percentile thresholds τ, κ are set on validation σ at end of spin-up and frozen — distribution shift between validation and test (or across NFL seasons) breaks the abstention fraction; no recalibration protocol given.
- PID controller needs ~192-sample evaluation windows — fine for batch training, awkward for small sports samples.
- The 30%-vs-20% inconsistency in the 1D example's described line fraction (§4.1 vs §4.2) suggests sloppy reporting; treat exact coverage numbers as approximate.

## 10. GSE overlap
Existing-research map: no regression-abstention entries — new capability. GSE's totals model is a regression head; it currently has no uncertainty output and no publish/don't-publish gate beyond the informal confidence filter.

## 11. GSE implementation spec
1. Add a σ output (softplus) to GSE's totals regression head; train with baseline NLL first (spin-up), then the abstention loss ℒ = −q log N(y; μ, σ) − α log q, q = min(1, (κ/σ)²).
2. Set κ = P_90% of σ on a validation season; use the PID controller to hold abstention at GSE's target non-publish fraction (e.g., 0.7 if only ~30% of leans are published).
3. Publish rule: publish the total pick iff σ ≤ τ, where τ is the coverage-setpoint percentile of validation σ; recalibrate τ each season.
4. Compare against the cheaper baseline the paper validates: plain NLL (μ, σ) training + post-hoc σ thresholding — if that matches CAN on GSE data, skip the PID machinery.
Effort: ~2–3 days (output-layer + loss change; PID controller ~30 lines).

## 12. Reproducible test
Dataset: nflverse 2010–2025, target = game total (or ATS margin). Train (a) CAN with PID abstention setpoint 0.7, (b) baseline NLL net + post-hoc σ threshold at 30% coverage, (c) MAE net. Time-ordered split: train ≤2023, validate 2024 (set τ, κ), test 2025. Metric: MAE and calibration of σ (z-score mean/std) on the covered 30% in the test window. Baseline to beat: (b).

## 13. Acceptance / rejection gate
ADAPT if (a) reduces test-window covered-set MAE vs (b) by ≥0.5 points of total (or ≥3% relative) with σ z-scores within [−0.2, 0.2] mean and [0.8, 1.2] std; reject if the MAE gap is smaller or σ is miscalibrated — then use the simpler (b) baseline, which the paper itself calls "a simple yet powerful method."

## 14. Improvement experiment
Couple the σ head with ledger 0690's SDR idea: use the second SAVE direction (variance-regime detector) as an extra input to the σ head. Hypothesis: games in high-variance regimes (weather, backup QBs) get larger σ from the regime feature rather than the network having to discover it — test whether σ calibration (z-score uniformity across weather/game-script bins) improves vs the plain CAN σ head.
