# [0450] A Critical Perspective on Finite Sample Conformal Prediction Theory in Medical Applications (arXiv:2512.14727v1)

**Citation:** Kladny, K.-R., Schölkopf, B., Koch, L., Baumgartner, C.F., Muehlebach, M. (2025). *A Critical Perspective on Finite Sample Conformal Prediction Theory in Medical Applications*. arXiv:2512.14727v1. URL: https://arxiv.org/abs/2512.14727v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1019 lines).
**Verdict:** ADAPT — port the paper's calibration-set-conditional critique into GSE's conformal/CQR calibration QC: report conditional-coverage distributions over calibration resamples and enforce minimum calibration-set sizing plus scheduled recalibration, instead of trusting marginal coverage claims.

## 1. Research question
Does the widely-cited finite-sample coverage guarantee of conformal prediction (CP) — valid for calibration sets of arbitrary size — actually deliver practically meaningful uncertainty in a realistic deployment where a model is calibrated once (or infrequently) and then applied to many new cases? The paper argues no: the classical guarantee is marginal (unconditional) over calibration sets, while real workflows need coverage conditional on the single realized calibration set. With small calibration sets, conditional coverage can fall far below nominal with high probability, creating an unjustified sense of safety.

## 2. Dataset / schema
- **NCT-CRC-HE-100K** (Kather et al. 2019; Yang et al. 2023 MedMNIST v2): 9-class histological tissue classification from non-overlapping H&E-stained colon-tissue patches; two of nine classes associated with colorectal cancer. 10,000 examples used for training; remainder split into a calibration pool (further chunked into sub-splits of sizes m ∈ {10, 50, 200}) and a held-out split for assessing calibration-set-conditional coverage.
- No sports or finance data. Medical imaging domain.

## 3. Method / model
Analytical critique + empirical demonstration. Two CP theory variants contrasted:
1. **Calibration-set-unconditional (marginal) theory** (Angelopoulos et al. 2023; Vovk & Shafer 2005): P(Y∈C(X;D_cal))≥1−α over the joint distribution of test point and calibration set — holds irrespective of model quality and calibration-set size.
2. **Calibration-set-conditional theory** (Vovk 2012): a lesser-known bound on the probability (over calibration-set draws) that the conditional coverage P(Y∈C|D_cal) clears 1−α̃, via a Binomial tail.
Practical workflow formalized (§4): (1) train once, (2) calibrate once on a possibly small set, (3) infer on many new patients without re-calibration. The paper shows the marginal guarantee's operational meaning (eq. 2) requires re-calibrating with a fresh calibration set before each inference round (M large AND K large) — infeasible in practice; the single-calibration regime needs the conditional statement (eq. 3), for which marginal theory gives no implication.
Empirical protocol: split conformal prediction (Papadopoulos 2002; Lei 2015), α=0.1 (nominal 90%), histograms of conditional coverage over independent calibration sets of each size.

## 4. Equations & assumptions
- Marginal guarantee: P_{Y,X,D_cal}(Y ∈ C_M(X; D_cal)) ≥ 1−α, α∈(0,1). (eq. 1)
- Operational form of marginal guarantee: (1/(M·K)) Σ_{j=1}^M Σ_{i=1}^K 1{y^(i)∈C_M(X^(i); D_cal^(j))} ≈ 1−α — requires both K and M large, i.e., repeated fresh calibration sets. (eq. 2)
- Single-calibration target: (1/K) Σ_{i=1}^K 1{y^(i)∈C_M(X^(i); D_cal)} ≈ 1−α for one realized D_cal. (eq. 3) — marginal theory has no implication for this.
- Calibration-set-conditional bound (Vovk 2012): P_{D_cal}(P_{Y,X}(Y∈C_M(X;D_cal)|D_cal) ≥ 1−α̃) ≥ 1−δ, with α̃=α+ε (ε>0), δ ≥ Binomial_{m,α̃}(⌊α(m+1)−1⌋), Binomial = binomial CDF with m trials, success prob α̃.
Assumptions: exchangeability of calibration and test data (standard CP); the critique itself assumes the realistic single-calibration deployment workflow.

## 5. Features / target
Not applicable in the standard sense — a theory/validation paper. Empirical demo: input features = histology image patches; target = 9 tissue classes; output = conformal prediction set; metric = calibration-set-conditional coverage at nominal 90%.

## 6. Validation design
Empirical demonstration only (no train/val/test split methodology beyond the above): 10,000 training examples; calibration pool chunked into sub-splits m∈{10,50,200}; separate held-out split for coverage assessment. Histograms of conditional coverage across many independent calibration-set draws at each size. No baselines compared (the "baseline" is the nominal 90% line and the marginal mean coverage); no cross-validation.

## 7. Numerical results / baselines
- With calibration-set size **m=10**: **19% of calibration sets deliver <85% calibration-set-conditional coverage** (red histogram area, Fig. 3), vs. nominal 90% — the unconditional mean coverage (green line) still exceeds 90% as theory requires.
- With **m=50**: spread narrows (intermediate histogram).
- With **m=200**: shortfall below nominal essentially disappears; distribution centers on the desired level.
- The calibration-set-conditional bound (Vovk 2012, yellow in Fig. 3) is "only expressive for large data sets" — vacuous at small m.
- Paper's interpretation (not a number): the often-cited size-invariant guarantee "may encourage inexperienced clinicians to rely on undersized calibration sets."

## 8. Code / data availability
None stated. (No code link in paper; NCT-CRC-HE-100K is public via MedMNIST v2.)

## 9. Leakage & limitations
- Domain is medical imaging classification — no direct NFL transfer; the argument is statistical, not domain-specific, so the critique transfers wherever CP/CQR is deployed (which is exactly GSE's calibration lane).
- No new method proposed — purely a critique plus a small empirical demo; the demo uses one dataset and one nominal level (α=0.1).
- Exchangeability still assumed throughout; the paper does not address distribution shift (Barber et al. 2023) or feature-conditional coverage (Vovk 2012 conditional; Mehrtens 2023), which are separate known CP gaps.
- Related methods explicitly excluded from the critique's scope: learn-then-test (Angelopoulos 2025), PAC confidence sets (Park 2019), risk-controlling prediction sets (Bates 2021) — the arguments "do not generally hold" for those.
- Small-m histograms reflect one task; the 19%-below-85% figure is illustrative, not a universal constant.

## 10. GSE overlap
**Extension of heavily covered ground — but with a concrete, actionable bite.** Per the existing-research map: GSE's corpus already covers CQR (Drive "CQR Research" + Deep Research report "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE"), grouping loss (2210.16315), temperature/Platt/isotonic/Venn-Abers, Mondrian/cross-conformal, Clopper-Pearson, LRD (2207.13770), ECE by slice, and conformal WP (2208.08598). None of the map's notes, however, record the marginal-vs-conditional calibration-set coverage distinction or a minimum-calibration-set sizing rule — the critique is a **new QC lens on an existing capability**: GSE's calibration windows are inherently small (weekly NFL slates, short seasons), which is precisely the regime where the paper shows marginal guarantees mislead. Does not duplicate Garrett's CEPT/MOVE-37 lanes. Related prior: the map's calibration stack is about methods; this paper is about how to *evaluate* those methods honestly.

## 11. GSE implementation spec
Concrete, low-cost build on GSE's existing conformal/CQR stack:
1. **Conditional-coverage audit**: for every deployed conformal/CQR interval (spreads, totals, props), bootstrap-resample the calibration window B=200 times (rolling weekly blocks to respect time order), recompute conditional coverage per resample at the deployed nominal level, and plot the histogram (paper's Fig. 3 analogue). Report P(conditional coverage < nominal − 5pp) alongside the marginal mean.
2. **Minimum calibration-set sizing rule**: choose calibration window size m such that the Vovk-2012 conditional bound δ ≥ Binomial_{m,α̃}(⌊α(m+1)−1⌋) is non-vacuous at the target δ (e.g., δ=0.1); document the implied m for α=0.1 and α=0.05. If GSE's weekly calibration pools can't reach m, pool across weeks with decay weighting — and say so explicitly instead of quoting marginal coverage.
3. **Scheduled recalibration**: replace "calibrate once per season" with recalibration cadence tied to the audit (e.g., weekly, before each slate); log calibration-set identity/date in the pick record so conditional coverage is auditable per deployment.
4. Data: nflverse play-by-play + odds API closes (existing GSE inputs); no new data needed. Effort: ~1–2 days (audit script + sizing calculator + docs).

## 12. Reproducible test
Dataset: GSE's existing CQR/conformal residuals on NFL spreads (or totals) from the 2024–2025 seasons, nflverse + archived closing lines. Procedure: fix nominal 90%; build calibration windows of m∈{10, 30, 100} games via rolling weekly blocks; for each of 200 bootstrap resamples compute conditional coverage on the next 4 weeks out-of-sample. Metric: fraction of resamples with conditional coverage <85%. Baseline (paper's prediction): at m=10 the fraction is large (>10%), shrinking toward ~0 by m=100. Success = the histogram reproduces the paper's spread pattern on GSE's own data, confirming the critique applies in the NFL regime.

## 13. Acceptance / rejection gate
Adopt the QC protocol (§11) if the reproducible test shows ≥10% of m=10 calibration resamples falling below 85% conditional coverage at nominal 90% (confirming the small-window hazard is real in GSE's data); then enforce the minimum-m rule and recalibration cadence in production. Reject only if conditional coverage is already tight (spread <3pp) at GSE's actual calibration-window sizes — i.e., the critique doesn't bite — in which case document the negative result and keep current practice.

## 14. Improvement experiment
Go beyond the paper: replace the fixed calibration window with an **adaptive calibration-set selector** — weight calibration examples by recency and regime similarity (e.g., same-week-type, similar market-volatility regime), choose effective m via the conditional-coverage audit (§12) as the objective, and compare adaptive vs. fixed-window conditional-coverage histograms. The paper diagnoses the disease (small/once-calibrated sets); the experiment tests whether regime-aware calibration pooling cures it without the cost of large fresh samples.
