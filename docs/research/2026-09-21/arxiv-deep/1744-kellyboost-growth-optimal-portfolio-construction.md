# [1744] KellyBoost: Growth-Optimal Portfolio Construction with Gradient-Boosted Trees (arXiv:2608.23393)

## 1. Citation and full-text-read statement
**Citation:** Jiayu Li (2026). *KellyBoost: Growth-Optimal Portfolio Construction with Gradient-Boosted Trees*. arXiv:2608.23393. URL: https://arxiv.org/abs/2608.23393
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections including appendices A–B, references).
**Verdict:** ADAPT — one sentence: the exact growth-optimal (Kelly) training objective for tree ensembles is directly portable to GSE's multi-pick portfolio sizing, but the paper's own finding (estimated full-Kelly concentrates too aggressively) means GSE must deploy it with the CRRA/fractional-Kelly dial the paper ships, not raw full-Kelly.

## 2. Research question
Can gradient-boosted decision trees — the workhorse of tabular ML, shut out of end-to-end portfolio learning because they don't train by backpropagation — be trained directly on the growth-optimal (Kelly) decision objective instead of a prediction/classification surrogate, and does the exact decision objective beat the surrogates a practitioner would otherwise use?

## 3. Method / model
One multi-output XGBoost model producing a logit vector z(x_t) ∈ R^K per row; portfolio weights w_t = softmax(z(x_t)) on the simplex Δ^{K-1} (long-only, fully invested; a cash leg makes full investment unrestrictive). Per-row loss ℓ_t = −log(1 + w_t^T y_t); the sample mean is the negative log growth rate — the Kelly criterion as a training objective. Closed-form gradient and analytic diagonal Hessian derived and verified by finite differences; shipped with a dependency-free reference engine. Two deployment stabilizers: (a) a leave-one-out ensemble (K_ens=4 members, each fit on data minus one row, hyperparameters unchanged) because single tree fits are unstable to one-row perturbations (near-tied split flips); (b) a CRRA risk-aversion dial γ (γ→1 recovers log) tunable on the selection protocol. Comparison design 2×2: {boosted trees, MLP} × {growth objective, classification surrogate (cross-entropy on argmax label)}, in both feature pipelines, plus a two-stage predict-then-optimize pipeline (LGBM squared-error forecasts + optimizer) and an unconditional-Kelly baseline.

## 4. Mathematics / equations / assumptions
- Portfolio: w_t = σ(z(x_t)), σ_k(z) = e^{z_k}/Σ_j e^{z_j} ∈ Δ^{K-1}.
- Loss (Eq. 1): ℓ_t = −log(1+S_t), S_t = w_t^T y_t; (1/n)Σ_t ℓ_t = −Ê[log(1+S)]. Population proposition: any minimizer of E[−log(1+σ(z(x))^T y)] satisfies σ(z(x)) ∈ argmax_{w} E[log(1+w^T y) | x] a.e. — the conditional Kelly portfolio on the simplex.
- Gradient: asset k's logit pushed up when y_k > S (outperforms the competing portfolio), force ∝ current weight σ_k and ∝ 1/(1+S) compounding term.
- Hessian: diagonal h_k can be negative (loss not convex in z); safeguard uses |h_k| since XGBoost leaf weights divide by aggregated Hessian.
- CRRA dial: φ_γ(S) = ((1+S)^{1−γ} − 1)/(γ−1), γ→1 recovers −log(1+S); gradient φ'_γ(S)·a_k, diagonal Hessian φ''_γ(S)·a_k^2 + g_k(1−2σ_k), a_k = σ_k(y_k − S). Training with γ>1 tempers the growth-optimal policy inside the objective — "the utility-side analogue of fractional Kelly."
- Assumptions: E|log(1+w^T y)| < ∞ for all w on simplex; long-only fully-invested simplex constraint; i.i.d.-ish rows for the pointwise-decoupling proposition.

## 5. Dataset / schema
Eight-asset-leg public-data testbed, 23 years of history. Schema per training row: feature vector x_t (d dimensions) + realized simple returns y_t ∈ R^K over holding period [t, t+h], K=8 legs. Candidate feature set: 7,871 columns in the "searched" pipeline; a 174-column hand-built pipeline as second pipeline. Time segments: development/selection segment ending 2012; evaluation segment 2013-01 → 2026-07 with 163 monthly (20-trading-day) decisions. Deployment refits every 21 trading days on expanding windows. All data public; every number regenerable from one committed CSV with no API key.
## 6. Features and target
Features: 7,871-column candidate set (searched pipeline) and 174-column hand-built set — exact feature identities not enumerated in the extracted text beyond "independently built feature pipelines." Target: none in the prediction sense — the loss is the decision objective itself (−log growth); the model maps features directly to portfolio weights.

## 7. Validation design
Strictly separated selection/estimation protocol. Hyperparameters selected on the development segment (ending 2012) with a purged single-row-block walk-forward, score treated strictly as a selection signal. Performance measured once on the untouched evaluation segment (2013-01–2026-07) by a deployment walk-forward with frozen parameters, expanding windows, end-anchored decision grid, refits every 21 trading days, K_ens=4 leave-one-out ensemble. Moving-block bootstrap for pairwise differences. 163 monthly decisions.

## 8. Exact results and baselines with numbers
Table 1 (out-of-sample, 2013-01 → 2026-07, 163 monthly decisions, gross of costs; log G bar = mean realized log growth per 20-day decision ×100; Sharpe = daily, annualized, in excess of T-bills):
- KellyBoost: log G 0.47, ann. return 6.2%, ann. vol 23.9%, Sharpe 0.30, max DD −46.2%
- MLP same loss: 0.56, 7.1%, 20.5%, 0.35, −55.5%; Δ ann. log growth vs KellyBoost −0.9 [−9.2, +8.9]
- Two-stage LGBM + optimizer: 0.82, 8.2%, 20.9%, 0.40, −40.4%; Δ −1.9 [−12.3, +10.0]
- Multiclass surrogate: 0.35, 4.0%, 19.2%, 0.21, −42.7%; Δ +2.0 [−5.6, +9.4]
- MLP surrogate: 0.20, 2.0%, 21.8%, 0.12, −47.4%; Δ +4.0 [−5.1, +14.2]
- Unconditional Kelly: 0.42, 4.1%, 19.3%, 0.22, −50.9%; Δ +2.0 [−4.6, +9.3]
2×2 claim: growth objective beats the classification surrogate in all four cells (trees 0.47 vs 0.35 searched; 0.39 vs 0.32 hand-built; MLPs 0.56 vs 0.20; 0.67 vs 0.49). Pooled paired per-decision difference +0.18 with bootstrap Pr(Δ>0) = 0.89 (0.84–0.96 across block lengths); every pairwise interval straddles zero — 13.6 years of monthly decisions cannot separate any two methods at conventional significance, so the paper argues from consistency. Growth objective trades less in every cell, so transaction costs widen the gap. Boundary finding: end-to-end learners trail the two-stage pipeline (0.82 log G) because estimated full-Kelly concentrates aggressively while the two-stage's squared-error forecasts shrink toward zero; the exact Hessian beats first-order substitutes on the selection protocol by a factor of three but loses to them deployed — "the optimizer is not the problem; the estimated full-Kelly target is." Selection protocol committed γ=1.14 (essentially logarithmic).

## 9. Code / data availability
Code, data, and scripts stated available; "regenerate every number from one committed CSV without an API key"; dependency-free reference engine with finite-difference test suite for the derivatives.

## 10. Leakage and limitations
Author-stated: all pairwise bootstrap intervals include zero (small effective sample: 163 monthly decisions); the two-stage pipeline beats the end-to-end Kelly objective deployed; full-Kelly estimation error pushes toward over-betting (cites [19]); surrogate tree pair confound (LightGBM vs XGBoost); per-round cost linear in K — cross-sectional scale to hundreds of assets untested. My adversarial notes: no shorting (simplex constraint) — for GSE picks (bet/no-bet per game) the natural analogue is a simplex over simultaneous picks plus a cash leg, which fits; the "no API key" CSV is equities, not sports, so the sports transfer is untested; monthly-horizon evidence is weak for weekly NFL cadence.

## 11. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE's "Bet sizing / decision" lane has "Kelly criterion (mentioned 12×, no paper read)" plus the Wang Transform in the prediction-market lane — i.e., no deployed Kelly sizing machinery in the engine. The engine emits picks (SPREAD/MONEYLINE/TOTAL, model v5.2.7) and the 2026-09-19/20 DFS work uses an optimizer for lineups, but there is no bankroll/portfolio layer mapping simultaneous edges to stake sizes. This paper is the first candidate for that layer. Complements (not duplicates) the already-read 2107.08827 (Uhrín et al. experimental review of betting strategies) and wave-4's quantile-Kelly / risk-constrained-Kelly ledgers, which are single-bet or mutually-exclusive-outcome formulations — KellyBoost is the simultaneous multi-asset (multi-pick) formulation.

## 12. Implementation specification
Build "GSE KellyBoost" for Sunday simultaneous pick portfolios: (a) training rows = historical slates, x_t = engine features per pick (edge, model prob, market price, CLV history, matchup features from gse-lab CSVs), y_t = realized net-profit-per-unit-staked vector across the slate's K picks; (b) multi-output XGBoost (or LightGBM custom objective) with softmax outputs over K picks + cash leg, loss = −mean log(1 + w^T y); (c) CRRA dial γ tuned on walk-forward selection (start grid {1.0, 1.5, 2.0, 3.0}); (d) deploy K_ens=4 leave-one-out ensemble as in paper; (e) stake = w_cash-complement × bankroll × fractional-Kelly overlay (e.g., half-Kelly on the deployed weights). Effort: ~2–3 days (custom objective + walk-forward harness + backtest on 2023–2025 NFL seasons from nflverse + Odds API history).

## 13. Reproducible test
Dataset: GSE engine pick history (or reconstructed 2023–2025 NFL SPREAD/MONEYLINE/TOTAL picks with closing lines). Rows = weekly slates; y = realized ROI per unit per pick. Baseline 1: flat staking. Baseline 2: independent per-pick fractional-Kelly (1/4 Kelly) normalized to the same weekly risk budget. Baseline 3: two-stage pipeline (engine edge → mean-variance optimizer). Metric: realized log growth per week and max drawdown over 2023–2025 walk-forward (frozen params, expanding window, purged). Run the paper's reference engine first on its own CSV to verify the derivative implementation reproduces their Table 1 within tolerance.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the CRRA-dialed KellyBoost portfolio layer if, on the 2023–2025 NFL walk-forward, it beats independent 1/4-Kelly staking by ≥ +0.05 mean log-growth per week (≈ +2.6%/yr log) with max drawdown no worse than 1.2× the baseline's, and the paired weekly difference has bootstrap Pr(Δ>0) ≥ 0.80; REJECT (keep flat/independent Kelly) otherwise. Improvement experiment: replace the point-estimate y_t with a posterior over pick outcomes (engine's calibrated win probs) and train on E[log(1+w^T y)] under that posterior — a Bayes-KellyBoost that internalizes probability uncertainty instead of relying on the γ dial alone; then test whether the learned γ→1 (i.e., the Bayes averaging removes the need for tempering).

**Verdict:** ADAPT — the exact growth-optimal training objective for tree ensembles ports directly to GSE's simultaneous-pick portfolio, but only with the CRRA/fractional-Kelly tempering dial engaged, per the paper's own boundary finding.
