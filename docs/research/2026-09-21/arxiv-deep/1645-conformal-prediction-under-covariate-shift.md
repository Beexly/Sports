# [1645] Conformal Prediction Under Covariate Shift (arXiv:1904.06019)

**Citation:** Ryan J. Tibshirani, Rina Foygel Barber, Emmanuel J. Candès, Aaditya K. Ramdas (2019). *Conformal Prediction Under Covariate Shift*. arXiv:1904.06019. NeurIPS 2019. URL: https://arxiv.org/abs/1904.06019
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: weighted exchangeability, weighted quantile lemma, Theorem/Corollary, airfoil experiment, discussion).
**Verdict:** ADAPT — the likelihood-ratio-weighted conformal recipe is the principled fix for GSE's regime-shift problem (early-season vs late-season game distributions, QB-injury weeks, weather regimes): when the covariate distribution shifts but the conditional outcome law is stable, weighting calibration scores by w(x) = dP̃_X/dP_X restores coverage. The airfoil demo (82.2% → 90.8% under shift) is the proof of concept. Note ledger [0745] covers weighted conformal PREDICTIVE SYSTEMS (2404.15018) — this is the distinct foundational paper (weighted EXCHANGEABILITY theory + split-conformal recipe).

## 1. Research question
Training data comes from P_X × P_{Y|X} but test data from P̃_X × P_{Y|X}: the covariate distribution shifts while the conditional label law stays fixed (e.g., calibrate on all games, predict playoff games where the covariate mix differs). Standard conformal undercovers. Can we reweight the conformal quantile by the likelihood ratio w(x) = dP̃_X/dP_X and recover a finite-sample coverage guarantee?

## 2. Dataset / schema
**Airfoil self-noise** (UCI): 1,503 observations, 5 covariates (frequency, angle of attack, chord length, free-stream velocity, suction-side displacement thickness), target = sound pressure level. Protocol: 5,000 trials; each trial randomly splits data, constructs a SHIFTED test set by resampling with probabilities ∝ w(x) = exp(xᵀβ), β = (−1,0,0,0,1) (exponential tilting of the 1st and 5th covariates — shown heteroskedastic in Figure 1). Nominal coverage 90%. Compares: split conformal (9) vs weighted split conformal (10), with ORACLE weights and ESTIMATED weights.

## 3. Method / model
**Weighted split conformal**: compute nonconformity scores on the calibration fold; form the weighted empirical distribution Σ_i p̃_i δ_{V_i} + p̃_{n+1} δ_∞ where p̃_i ∝ w(X_i) (normalized INCLUDING the test point's weight); interval = weighted (1−α)-quantile. Theory backbone: **weighted exchangeability** (Definition 1) — joint density factorizes as Π w_i(v_i)·g(v) with symmetric g — which covers covariate shift as a special case (Lemma 2) and yields the **weighted quantile lemma** (Lemma 3). Practical weight estimation: probabilistic classification (e.g., logistic regression) distinguishing calibration vs test covariates.

## 4. Equations & assumptions
- Weights: `w(x) = dP̃_X/dP_X(x)`; normalized `p̃_i = w(X_i)/(Σ_j w(X_j) + w(X_{n+1}))`
- Weighted quantile lemma: `P{ V_{n+1} ≤ Quantile(β; Σ_i p̃_i δ_{V_i} + p̃_{n+1} δ_∞) } ≥ β`
- Corollary: under covariate shift with CORRECT weights, target marginal coverage ≥ 1−α.
- Effective sample size heuristic: `n̂ = ‖w‖_1²/‖w‖_2²`
- Assumptions: (i) P_{Y|X} invariant between calibration and test (the load-bearing assumption); (ii) w(x) known or well-estimated; (iii) absolute continuity (weights finite).

## 5. Features / target
Airfoil: 5 aerodynamic covariates → sound pressure. Transfer: GSE game covariates (spread, total, weather, rest, QB status) → margin/total; shift = e.g. calibration on weeks 1–17 → test on playoffs, or pre- vs post-QB-injury.

## 6. Validation design
5,000 random trials; per trial: build train/calibration/test splits, tilt the test covariates via exp(xᵀβ), construct intervals with/without weighting, record empirical coverage over the test set. Also an effective-sample-size-matched comparison: unweighted conformal on a subsample sized to n̂, to isolate weighting's value from mere variance.

## 7. Numerical results / baselines
Average empirical coverage over 5,000 trials (nominal 90%):
- No shift, ordinary split conformal: **90.2%** (sanity check)
- Under shift, ordinary split conformal: **82.2%** — severe undercoverage
- Under shift, WEIGHTED with oracle weights: **90.8%** — coverage restored
- The weighted histogram is more dispersed (reduced effective sample size n̂); the n̂-matched unweighted comparison lines up closely, confirming the dispersion is the price of weighting, not a defect.
- Estimated weights (logistic classifier) perform close to oracle in the paper's follow-up discussion.

## 8. Code / data availability
R code to reproduce: http://www.github.com/ryantibs/conformal/. Airfoil data is UCI public.

## 9. Leakage & limitations
(a) P_{Y|X} invariance is the whole game — in the NFL the conditional law itself shifts (a backup QB changes P(margin|X), not just the covariate mix); the paper's guarantee says nothing then. (b) Weight estimation error propagates directly into coverage; high-dimensional X makes w(x) estimation fragile. (c) Effective sample size collapses under strong shift (n̂ ≪ n) — intervals get wide and unstable. (d) The δ_∞ mass point makes intervals occasionally infinite under extreme weights. (e) Needs unlabeled TEST covariates upfront (transductive-ish) — fine for GSE's weekly slate (games known in advance).

## 10. GSE overlap
Ledger [0745] (2404.15018) covers weighted conformal predictive SYSTEMS — same weighting idea, different formalism (predictive distributions + CRPS). This paper is the theoretical foundation (weighted exchangeability, quantile lemma) and the split-conformal recipe. GSE has no weight-estimation machinery (`temperature-map.ts`, `platt-scaling.ts` calibrate probabilities, not covariate weights). New territory as a foundation; complements [0745].

## 11. GSE implementation spec
(1) **Shift detector + weighter**: train a logistic classifier calibration-games vs upcoming-slate games on game covariates; w(x) = predicted odds ratio; (2) weighted split-conformal intervals for margin/total on the weekly slate; (3) monitor n̂ = ‖w‖₁²/‖w‖₂² — if n̂ < 100, widen via fallback to unweighted (flag the regime as "too shifted to trust"); (4) canonical GSE use case: calibrate on regular season, predict playoffs; calibrate pre-QB-injury, predict post-injury weeks. Effort: 2–4 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025. Construct shift experiments: (a) calibrate weeks 1–16 → test weeks 17–18 + playoffs; (b) calibrate with starting QBs → test QB-injury weeks. Metrics: empirical coverage (target 1−α ± 2pp), n̂, mean width vs unweighted baseline. Also test the estimated-weights (logistic) vs oracle-shift-indicator variants.

## 13. Acceptance / rejection gate
ADAPT if: weighted coverage lands within ±2pp of nominal on the playoff-shift experiment while unweighted undercovers by ≥4pp (replicating the 82.2% → 90.8% pattern), at mean width ≤ 130% of unweighted. REJECT the weighting if n̂ collapses below 50 in GSE shift experiments (intervals too unstable to publish) — use the shift as an abstention signal instead.

## 14. Improvement experiment
**Doubly-robust shift adaptation**: combine the likelihood-ratio weighting with the ACI/PID online controller ([1640]/[1643]) — weighting handles the known covariate shift, the controller mops up residual P_{Y|X} drift that violates assumption (i). Test whether the combination holds coverage in the QB-injury experiment where P_{Y|X} itself moves.

**Verdict:** ADAPT — implement likelihood-ratio-weighted split conformal for GSE's known-shift slates (playoffs, QB-injury weeks), with the n̂ effective-sample-size guardrail; accept on replicating the paper's undercoverage-repair pattern (unweighted ≥4pp under nominal → weighted within ±2pp).
