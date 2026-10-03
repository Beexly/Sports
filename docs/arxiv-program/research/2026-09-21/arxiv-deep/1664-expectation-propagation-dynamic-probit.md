# 1664 Expectation propagation for the smoothing distribution in dynamic probit (arXiv:2309.01641)

**Citation:** (authors as listed on arXiv). *Expectation propagation for the smoothing distribution in dynamic probit*. arXiv:2309.01641 (2023). URL: https://arxiv.org/abs/2309.01641
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; abstract, EP derivation, simulation/CAC40 evaluation, runtime comparison, and conclusion read in full). Not an abstract-only read.
**Verdict:** ADAPT — expectation propagation is a legitimate third backend (alongside 1661's PFM-VB and exact MCMC) for GSE's dynamic binary-outcome inference, but the single-series evaluation and weaker convergence theory mean it must win a head-to-head bake-off rather than being adopted on paper claims.

## 1. Research question

Can expectation propagation (EP) approximate the unified skew-normal smoothing distribution of a dynamic probit model more accurately than mean-field VB variants, while staying nearly as fast — and how does it compare to the partially-factorized VB of Durante/Fasano?

## 2. Method/model

Same dynamic probit setup as 1661: y_t ∈ {0,1}, P(y_t=1)=Φ(x_t'θ_t), θ_t = θ_{t-1}+η_t. EP approximates the SUN smoothing distribution by a Gaussian, iteratively refining site approximations: each likelihood factor's contribution is matched by moment-matching (mean and covariance) against the tilted distribution. Benchmark: 10,000 exact i.i.d. smoothing draws; competitors: PFM-VB and MF-VB (same as 1661). Same CAC40 data: daily opening direction, 2018-01-04–2018-12-28, n=241, intercept + Nikkei direction.

## 3. Mathematics/equations/assumptions

- Target: p(θ_{1:T} | y_{1:T}) — SUN; EP approximates with q(θ) = N(m, V).
- Site updates: for each t, cavity q_{\t}(θ_t) ∝ q(θ_t)/q̃_t(θ_t); tilted p̂ ∝ q_{\t} · p(y_t|θ_t); moment-match E_{p̂}[θ_t], Cov_{p̂}[θ_t] to update site q̃_t.
- Probit likelihood gives closed-form tilted moments via univariate truncated-normal formulas.
- State dynamics handled by Kalman-smoother-style forward-backward passes within each EP sweep.
- Assumptions: Gaussian approximation adequate (unimodal posterior); EP fixed-point convergence (not guaranteed); W, P_0 fixed.

## 4. Dataset/schema

- Identical to 1661: CAC40 daily opening direction, n=241 trading days in 2018; covariates intercept + Nikkei 225 direction.

## 5. Features and target

- Same as 1661: binary opening direction from lagged Nikkei direction.

## 6. Validation design

- Accuracy vs 10,000 exact i.i.d. smoothing samples: posterior means and SDs.
- Runtime on a 2023 MacBook Pro: EP vs PFM-VB vs MF-VB vs exact sampler.
- No predictive evaluation; no hyperparameter learning.

## 7. Exact results and baselines with numbers

- Accuracy: EP slightly more accurate than PFM-VB on posterior means/SDs; MF-VB visibly over-shrinks moments (consistent with 1661).
- Runtime (2023 MacBook Pro): EP 0.43 s, PFM-VB 0.27 s, MF-VB 0.20 s, exact SUN sampler 36.28 s — all approximations are ~100× faster than exact; EP costs ~60% more than PFM-VB for a small accuracy gain.
- Practical takeaway: EP ≈ PFM-VB in accuracy, both far better than MF-VB.

## 8. Code/data availability

No public code link found in the paper text. CAC40/Nikkei data are public.

## 9. Leakage and limitations

- Same single-series limitation as 1661 (n=241, one financial series).
- EP has no convergence guarantee; damping/double-loop needed in hard cases — not stress-tested here.
- No code published — reproducibility rests on reimplementation.
- Fixed W, P_0; no predictive calibration.
- The accuracy edge over PFM-VB is small and may not generalize.

## 10. GSE overlap

Direct companion to 1661: two approximate-inference backends for the same dynamic-probit models GSE needs (in-play binary events, availability dynamics). GSE's state-space stack gains a fast Gaussian-approximation option with moment-matching instead of ELBO optimization. Frame as backend candidate B in the 1661 bake-off, not a separate project.

## 11. Implementation specification

- Implement `gse.statespace.EPProbit` alongside `PFMVBProbit` (1661): shared dynamic-probit interface, Kalman-smoother inner loop, EP site updates with damping; same hyperparameter M-step for W.
- Bake-off harness: both backends + exact MCMC on identical NFL drive-level binary tasks; log accuracy (vs MCMC), runtime, and predictive calibration.

## 12. Reproducible test

- Same nflverse drive-TD dynamic-probit task as 1661 (train 2015–2021, test 2022–2024).
- Compare EP vs PFM-VB vs exact MCMC: posterior-mean MAE vs MCMC, runtime, and holdout predictive log-loss.
- Convergence stress: run both on 32 team-seasons; record EP non-convergence rate (must be < 5%).

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** EP converges in ≥95% of team-season fits AND matches or beats PFM-VB on both posterior-mean MAE (vs MCMC) and holdout log-loss. If EP loses the bake-off, REJECT it and standardize on the winner (likely PFM-VB).
- **Improvement experiment:** (i) EP with learned W (M-step) — expect calibration gains; (ii) hybrid: PFM-VB initialization then EP refinement — expect EP convergence failures → ~0; (iii) extend winning backend to multinomial drive outcomes.

**Verdict:** ADAPT — EP earns a slot in GSE's dynamic-probit backend bake-off against PFM-VB, but adoption is conditional on winning head-to-head on NFL data; the paper alone does not justify choosing it.
