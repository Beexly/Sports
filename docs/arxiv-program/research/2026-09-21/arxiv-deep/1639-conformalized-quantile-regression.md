# [1639] Conformalized Quantile Regression (arXiv:1905.03222)

**Citation:** Yaniv Romano, Evan Patterson, Emmanuel J. Candès (2019). *Conformalized Quantile Regression*. arXiv:1905.03222. NeurIPS 2019. URL: https://arxiv.org/abs/1905.03222
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: abstract through appendix experiments; equations, tables, figures, conclusion).
**Verdict:** ADAPT — CQR is the engine-room method for GSE's point-forecast intervals (margins, totals): it fuses quantile regression's adaptivity to heteroskedastic scoring with conformal finite-sample coverage. Direct action item: use the paper's conformity-score recipe as the reference spec to REPAIR GSE's existing `apps/web/lib/calibration/cqr.ts`, whose quantile-rank clamp currently falsely certifies 90% coverage at 83.33% (documented in `docs/research/2026-09-21/drive-deep/conformal-prediction-small-sample-calibration-audit.md`).

## 1. Research question
How do we get prediction intervals that (a) adapt locally to heteroskedasticity (wide where games are unpredictable, narrow where they're not), (b) carry finite-sample, distribution-free coverage guarantees, and (c) fix the two failure modes of plain quantile regression: under/over-coverage when the quantile model is misspecified (Sections 1–2, experiments in Section 5)?

## 2. Dataset / schema
Eleven real regression datasets (UCI-style, named in Appendix experiments; standard names include Boston housing, Diabetes, Concrete, Energy, Kin8nm, Naval, Power, Protein, Wine, Yacht, YearMSD-type benchmarks used across the conformal literature). Protocol: 20 independent train/test splits per dataset, 80% train / 20% test; training further split equally into proper-training and calibration halves. Nominal miscoverage α = 0.1. **2,200 experiments total** (11 datasets × 20 splits × 10 methods). Also a simulated heteroskedastic example (Y|X with variance growing in X) used in Figure 2.

## 3. Method / model
Split CQR, three steps: (1) fit lower/upper conditional quantile regressors q̂_{α/2}(x), q̂_{1−α/2}(x) on the proper-training set (instantiated with ridge regression, random forests, neural nets); (2) on the calibration set compute conformity scores E_i = max{ q̂_lo(X_i) − Y_i, Y_i − q̂_hi(X_i) } — the signed distance Y falls outside the quantile band; (3) return the interval Ĉ_{n,α}(x) = [q̂_lo(x) − Q_{1−α}(E;I_2), q̂_hi(x) + Q_{1−α}(E;I_2)], where Q is the (1−α)(1+1/|I_2|)-th empirical quantile of calibration scores. Also introduces CQR-r (rescaled) and locally-weighted variants for comparison.

## 4. Equations & assumptions
- Score: `E_i = max{ q̂_{α/2}(X_i) − Y_i, Y_i − q̂_{1−α/2}(X_i) }`
- Interval: `Ĉ(x) = [ q̂_lo(x) − Q_{1−α}(E, I_2), q̂_hi(x) + Q_{1−α}(E, I_2) ]`
- Theorem 1 (exchangeability ⇒ coverage): `P{ Y_{n+1} ∈ Ĉ(X_{n+1}) } ≥ 1 − α`; if the E_i are a.s. distinct, `P{ Y_{n+1} ∈ Ĉ(X_{n+1}) } ≤ 1 − α + 1/(|I_2|+1)`.
- Assumption: calibration + test points exchangeable (no drift). Quantile estimators need no consistency for coverage (validity is free); they only affect interval WIDTH/efficiency.

## 5. Features / target
Continuous targets (house prices, protein structure RMSD, etc.); features vary per dataset. Transferable abstraction: any point forecast f̂(x) for a continuous target plus quantile regressors q̂_lo/q̂_hi — for GSE, x = game feature vector (spreads, totals, injuries, weather), y = realized margin or total.

## 6. Validation design
20 random 80/20 splits per dataset, equal proper-train/calibration halves, α=0.1, metrics = mean interval length (efficiency) and empirical coverage (validity) averaged over the 20 splits. Baselines: split conformal with absolute residuals (non-adaptive), locally-weighted split conformal, and unconformalized quantile regression (QRF, QNN).

## 7. Numerical results / baselines
Table 1 (mean interval length / coverage, averaged over all 11 datasets and 20 splits):
- Ridge: length **3.06**, coverage 90.03; Ridge-Local: 2.94, 90.13
- RF: 2.24, 89.99; RF-Local: 1.82, 89.95
- NN: 2.16, 89.92; NN-Local: 1.81, 89.95
- **CQR-RF: 1.41, 90.33**; **CQR-NN: 1.40, 90.05**
- Unconformalized QRF: 2.23, 92.62; QNN: 1.49, 88.51
CQR intervals are ~30–40% shorter than split/absolute-residual conformal at equal coverage, and unlike raw quantile regression they actually hit 90% (QNN undercovers at 88.51). Simulated heteroskedastic example (Figure 2): split conformal length 2.91/coverage 91.4%; local 2.86/91.7%; **CQR 1.99/91.06%** — adaptivity visibly narrows intervals where variance is low.

## 8. Code / data availability
Authors' code: https://github.com/yromano/cqr. Datasets are standard UCI regression benchmarks. Reproducible from the repo.

## 9. Leakage & limitations
(a) Guarantee is MARGINAL — coverage averages over the whole test population; subgroups (e.g., primetime dogs) can undercover while the headline number is 90%. (b) Exchangeability assumed: regime shifts (QB injury, coaching change, weather) break it silently. (c) Split conformal halves the effective training data — quantile models fit on half the sample are weaker. (d) Intervals can cross (lower > upper) if quantile estimates cross; the paper's fix (sort/adjust) is ad hoc. (e) The (1−α)(1+1/|I_2|) quantile correction is conservative at small calibration sizes.

## 10. GSE overlap
Direct, heavy overlap: GSE already has `apps/web/lib/calibration/cqr.ts` + `apps/web/__tests__/cqr.test.ts` and the Drive deep read `docs/research/2026-09-21/drive-deep/cqr-research.md` (8,154 lines). The drive audit (`conformal-prediction-small-sample-calibration-audit.md`) already flagged the implementation bug: the rank is clamped to n−1 (`rank = Math.min(Math.max(rank, 0), n - 1)`), which falsely certifies 90% coverage at 83.33% — GSE's published intervals are 6.67 points tighter than the guarantee they claim. This paper is therefore not "new capability" but the **reference spec for a correctness repair**: the true recipe is E_i as defined above with the (1−α)(1+1/|I_2|) quantile and NO rank clamp.

## 11. GSE implementation spec
(1) **Repair cqr.ts**: implement the paper's exact recipe — quantile regressors at α/2, 1−α/2 on proper-train, calibration scores E_i = max(q̂_lo − y, y − q̂_hi), interval widened by the (1−α)(1+1/n_cal) empirical quantile with the ceiling rank `(1−α)(n+1)` (uncapped). (2) **Apply to engine point forecasts**: q̂_lo/q̂_hi on predicted margin and predicted total from the GSE engine's feature pipeline; weekly rolling calibration window. (3) **Report**: length (avg points) and empirical coverage on the trailing season; split by favorite/dog and total buckets to check marginal-vs-conditional. Effort: 1–2 days (repair) + backtest.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025 (game-level predicted vs realized margin/total). Trailing 2 seasons calibration, test on 2025 games; α ∈ {0.1, 0.2}. Metrics: empirical coverage (target within ±1pp of 1−α), mean interval length (points), length distribution by week/season-half. Baselines: current (buggy) cqr.ts, absolute-residual split conformal, and raw quantile intervals from the same quantile models.

## 13. Acceptance / rejection gate
ADOPT the repaired recipe if: empirical coverage on 2025 is within ±1.5pp of nominal AND mean interval length ≤ 90% of the absolute-residual split-conformal baseline (adaptivity payoff). REJECT the repair only if coverage lands >3pp off nominal (indicates a data-pipeline mismatch, not a paper problem).

## 14. Improvement experiment
**CQR-r (rescaled) for blowout games**: replicate the paper's Section-4 rescaled score variant on GSE data, where margin variance grows with total — test whether rescaling narrows intervals on low-total games without losing coverage. Also compare against the nested-CQR/QOOB variant from ledger [1650] on small early-season windows (weeks 1–4, n small).

**Verdict:** ADAPT — adopt CQR as the interval engine for GSE point forecasts, but the first deliverable is repairing `apps/web/lib/calibration/cqr.ts` to the paper's exact recipe (unclamped (1−α)(n+1) rank); validate with trailing-season coverage within ±1.5pp of nominal and ≥10% length reduction vs absolute-residual conformal.
