# Ledger 1088 — arXiv:2002.12860v1 — Quantile Regularization: Towards Implicit Calibration of Regression Models

## Citation / full-text source

- arXiv:2002.12860v1 — full text: https://arxiv.org/pdf/2002.12860
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- Full-text URL: https://arxiv.org/pdf/2002.12860v1
- Verdict: **ADAPT**
- Lane: calibration_uncertainty
- Assigned paper 11 of 12 (reader 20), ledger sequence 1088

## Research question

How can regression predictive distributions be recalibrated end-to-end during training — rather than post-hoc — via quantile regularization, without a separate calibration set?

## The idea in plain English

Regression models (Dropout VI, deep ensembles) produce predictive distributions
that are usually miscalibrated: the nominal 90% credible interval does not contain
90% of outcomes. Post-hoc isotonic recalibration fixes this on a separate
calibration set, but it overfits (it can pass through its own training points
exactly), yields non-smooth piecewise-linear calibrated CDFs with discontinuous
PDFs, and needs extra labeled data. This paper makes calibration a *trainable*
term in the training loss instead: a quantile regularizer that penalizes the
deviation of the model's PIT values `F(x)(y)` from Uniform[0,1], measured by the
cumulative KL divergence between two CDFs.

## Key definitions and equations

- Quantile calibration: `P[ [F(X)](Y) ≤ p ] = p ∀ p ∈ [0,1]`, i.e. the model's
  own predictive CDF values at the realized outcomes are uniform. (Sufficient
  condition for complete probabilistic calibration, per Kuleshov et al.)
- Cumulative residual entropy: `ε(S) = −∫₀^∞ F̄_S(s) log F̄_S(s) ds`.
- Cumulative KL divergence between CDFs:
  `CKL(F_S‖G_T) = ∫ F̄_S(x) ln(F̄_S(x)/Ḡ_T(x)) dx − E[S] + E[T]`,
  non-negative and zero iff `F_S = G_T`.
- Closed form vs Uniform[0,1] (Proposition 2):
  `CKL(F_S‖G_T) = −ε(S) + E[(1−S) ln(1−S)] + 0.5`.
- Consistent sample estimator from ordered PIT samples `s_(1) ≤ … ≤ s_(n)`
  (Proposition 3):
  `CKL̄ = Σ_{i=1}^{n−1} (n−i)/n · ln((n−i)/n) · (s_(i+1) − s_(i))
       + (1/n) Σ_i (1−s_i) ln(1−s_i) + 0.5`.
- Algorithm 1 (the loss): per minibatch, compute predictive CDFs
  `Φ(μ_k, σ_k)`, PIT values `c_k = Φ_k[y_k]`, differentiable sort (`diffsort`
  = NeuralSort) to get ordered `s`, evaluate the estimator above as the
  calibration loss `CL`.
- Full objective: `L = NLL(y, μ_w, σ_w) + λ · CL(y, μ_w, σ_w)`.
  NLL drives sharpness, the regularizer drives calibration; `λ` controls the
  trade-off (experiments use `λ = 20` with no significant RMSE/NLL degradation).

## Experiments in the paper

- 10 UCI regression datasets (Air Foil, Boston Housing, Concrete Strength, Fish
  Toxicity, Kin8nm, Protein Structure, Red/White Wine, Yacht Hydrodynamics, Year
  Prediction MSD), metric = L2 quantile calibration error
  `CE(F) = ∫₀¹ (P[[F(X)](Y) ≤ p] − p)² dp` plus RMSE and NLL.
- Heteroscedastic MC Dropout (dropout 0.25, T=10 passes): QR reduces calibration
  error on all 10/10 datasets (e.g. Concrete 58.75→35.42, Yacht 55.21→40.08, Year MSD
  8.52→3.89); NLL better in 7/10 cases; RMSE drops negligible.
- Deep Ensembles (5 members + adversarial training): calibration error reduced
  in 9/10 cases (e.g. Concrete 81.34→65.48, Yacht 84.38→54.23, Year MSD
  6.57→2.41).
- Key negative result for post-hoc methods: isotonic recalibration *increases*
  calibration error on small datasets — 5/10 with Dropout-VI, 7/10 with deep
  ensembles (e.g. ensembles on Air Foil: 45.04 → 79.00 after isotonic). It only
  helps on very large datasets (Kin8nm, Protein Structure, Year MSD). This is the
  isotonic-overfitting pathology the theory predicts.

## GSE overlap

GSE's engine outputs predictive distributions for spreads/totals and the FAM
pipeline consumes prediction intervals. Two direct adaptations:

1. **In-training calibration of the projection models.** If any GSE regression
   head emits `(μ, σ)` (Gaussian spread/total forecasts), adding the CKL
   regularizer costs one extra loss term per batch — no held-out calibration set,
   no post-hoc isotonic map, smooth calibrated CDFs preserved. It complements
   ledger 1082 (post-hoc GP PIT recalibration): QR trains it in, GP recalibration
   cleans up what remains.
2. **The isotonic-overfitting warning is load-bearing.** GSE slices backtests
   into small subsets (per-team, per-weather, playoff-only). The paper's tables
   are direct evidence that isotonic post-hoc recalibration on small slices can
   *compound* miscalibration (up to +34 points on Air Foil). Any GSE
   per-slice recalibration should either use QR-style implicit calibration or be
   gate-checked against making calibration worse — not assumed to help.

## Implementation

For each GSE probabilistic regression head producing `(μ, σ)`:

1. **Per-batch PIT values:** `c_k = Φ((y_k − μ_k)/σ_k)` using the Gaussian CDF.
2. **Differentiable sort:** implement a NeuralSort-style relaxation, or simpler —
   since the paper's estimator only needs ordered values for gradients, use the
   soft-sort of the batch PIT values (any differentiable argsort approximation;
   exact NeuralSort reference in the paper).
3. **Loss:** `L = NLL + λ·CKL̄(s)` with the estimator from Proposition 3.
   Start `λ = 20` (paper's value), tune on a calibration-error validation metric.
4. **Validation metric:** L2 quantile calibration error from the paper,
   M-bin estimator: `CE = (1/M) Σ_i [ (1/N) Σ_j 1[F_j(y_j) ≤ p_i] − p_i ]²`.
5. Applies to both MC-Dropout-style and ensemble-based GSE heads; for ensembles,
   fit `(μ, σ)` per instance from member predictions first (paper's §4.2.2).

## Leakage

The regularizer itself uses only in-batch training labels, so no extra data
leakage beyond standard supervised training — that is the paper's main selling
point versus post-hoc recalibration (which needs a held-out set that small GSE
slices don't have). The danger it *removes* rather than introduces: training the
calibration term on the training batch is honest; fitting isotonic maps on the
same data used to train is the overfitting pathology. Keep validation of the
calibration error strictly on held-out seasons.

## Limitations

- Gaussian predictive family assumed in the experiments (`Φ(μ,σ)`); GSE's
  heavy-tailed spread/total forecasts may need a different CDF or the
  empirical-distribution version — the theory (CDF vs CDF) is general, the
  implementation detail is not.
- Differentiable sorting (NeuralSort) is O(n²) in batch size and numerically
  delicate; batch-size 512 worked in the paper, larger GSE batches may need a
  cheaper soft-sort or per-shard ordering.
- Quantile calibration is the *marginal* notion; it does not imply distributional
  calibration (the paper's stated future work): conditional-on-(μ,σ) calibration
  is not guaranteed.
- Isotonic post-hoc still wins on very large datasets (Year MSD); QR is the
  small-to-medium-data play, not a universal replacement.
- Only 10 UCI datasets, no time-series or sports data; sports non-stationarity
  (rule changes, roster churn) is untested.
- `λ` is a free hyperparameter with no principled selection rule; the paper
  reports robustness but GSE must tune per head.

## Numeric gate

Adapt only if, on a held-out NFL season, adding the CKL regularizer to one GSE
regression head reduces the L2 quantile calibration error by **≥ 15% relative**
(e.g. 0.20 → 0.17 or better) with held-out NLL not materially worse. If the
isotonic-post-hoc baseline currently in use degrades calibration on any backtest
slice with n < 1,000, QR additionally replaces it there as a safety fix — the
paper's overfitting evidence stands regardless of the 15% bar.

## Improvement experiment

Ablate `λ ∈ {0, 5, 20, 50}` on two seasons of spread forecasts: track calibration
error, NLL, and interval coverage at 50%/80%/90%. Expectation from the paper: a
λ plateau where calibration keeps improving with flat NLL. If calibration
improves but 90% interval coverage overshoots (over-calibration), combine with
ledger 1082's GP PIT recalibration as a second stage and report which stage
contributes what.

## Reproducible test

- Reimplement Algorithm 1 + Proposition 3 estimator in the GSE training repo.
- Sanity check: on synthetic `y ~ N(μ,σ²)` data with a deliberately miscalibrated
  model (σ̂ = 0.5σ, i.e. overconfident), the CKL loss must be positive and its
  gradient w.r.t. σ̂ must push σ̂ upward (toward calibration).
- Then train the GSE head with and without QR on seasons 2021–2023, evaluate the
  gate metrics on 2024–2025, and log both the paper's L2 calibration error and
  interval coverage.

## Verdict

**ADAPT.** An end-to-end trainable calibration term for any `(μ,σ)` regression
head, with a closed-form CKL estimator, consistent ordered-sample formula, and
evidence across 10 datasets that it beats the post-hoc isotonic baseline — which
the paper shows can actively *worsen* small-slice calibration. Implement it on
one GSE projection head, gate on the 15% calibration-error reduction with flat
NLL, and treat the isotonic-on-small-slices finding as a standing safety rule
for the FAM pipeline.
