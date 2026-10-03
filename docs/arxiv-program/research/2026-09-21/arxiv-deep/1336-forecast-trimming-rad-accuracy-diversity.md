# 1336 Another look at forecast trimming for combinations: robustness, accuracy and diversity (arXiv:2208.00139)

**Citation:** Xiaoqian Wang, Yanfei Kang, Feng Li (2024). *Another look at forecast trimming for combinations: robustness, accuracy and diversity*. arXiv:2208.00139v2 [stat.ME], 14 Jun 2024. URL: https://arxiv.org/abs/2208.00139
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v2, 31 pp, via arxiv.org/pdf; read through Section 6 and references to EOF).
**Verdict:** ADAPT

Adapt this as GSE's standing protocol for trimming its component-model pool before any combination: (1) a Tukey's-fences robustness screen on per-model error variance; (2) backward elimination with the ADT criterion (κ=1, δ=0.05 stop); (3) the RelDiv diagnostic to decide whether diversity is even worth addressing (RelDiv<0.2 → accuracy-only screen; >0.5 → full RAD). This is the practical answer to 1172's weight-estimation-error diagnosis: trimming attacks the puzzle at the pool, where the paper shows trimming-for-diversity-alone is actively harmful (D ranked worst) but accuracy+diversity joint trimming beats all alternatives with MCB significance.

## 1. Research question
When building a forecast pool for combination, which forecasters should be kept? Existing trimming algorithms address accuracy, robustness, and diversity in isolation or in sequence. This paper proposes the first algorithm addressing all three simultaneously (RAD) with a criterion (ADT) that trades off accuracy against diversity instead of pursuing either alone, plus five benchmark algorithms (None, R, A, D, AutoRAD) and practical guidelines for which to use.

## 2. Dataset / schema
103,826 time series from the M (Makridakis et al. 1982), M3 (Makridakis & Hibon 2000), and M4 (Makridakis et al. 2020) competitions across yearly/quarterly/monthly/weekly/daily/hourly frequencies. In-sample split into training + validation (validation length = test horizon H); series with <2 training observations or constant training sets excluded. Horizons H = 6/8/18/13/14/48; seasonal cycle s = 1/4/12/52/7/168 for yearly→hourly. Two pool settings: (a) ETS family — 6 models non-seasonal, 15 seasonal (no multiplicative trend or additive-error/multiplicative-seasonality models); (b) cross-family pool of 9 methods: NAIVE, SNAIVE, RW-DRIFT, THETA, ARIMA (auto.arima), ETS, TBATS, STLM-AR, NNET-AR (1,000-simulation intervals).

## 3. Method / model
- Diversity metric MSEC (Thomson et al. 2019; "Div" in Kang et al. 2022): MSEC_{i,j} = (1/H)Σ_{h=1}^{H}(f_{i,h} − f_{j,h})²; averaged over all pairs for pool-level diversity. Justified because MSEC is a decomposed component of the combined forecast's MSE, and because correlation coefficients cannot be averaged across pairs (Achen 1977).
- ADT criterion (Accuracy-Diversity Trade-off): ADT = AvgMSE − κ·AvgMSEC = (1/M)Σ_{i=1}^{M}MSE_i − κ·(2/M²)Σ_{i=1}^{M−1}Σ_{j>i}MSEC_{i,j}, κ∈[0,1]. κ=1 → ADT = MSE of the equally-combined forecast; κ=0 → accuracy only. Grounded in the ambiguity-decomposition-style identity (Kang et al. 2022): MSE_comb = Σ_i w_i MSE_i − Σ_{i<j} w_i w_j MSEC_{i,j} (equal weights), i.e., diversity directly subtracts from combined error.
- RAD algorithm (backward selection): Step 1: S = full pool. Step 2: Tukey's-fences robustness screen — drop forecasters whose variance of absolute errors on the validation set exceeds Q3+1.5(Q3−Q1). Step 3: ADT₀ with κ=1 on remaining S. Steps 4–6: for each i compute ADT(S\{i}); drop the forecaster(s) achieving min_i ADT(S\{i}); recompute ADT. Step 7: repeat until the percentage ADT decrease < δ (recommended δ=0.05) or |S|=2.
- Benchmarks (Table 1): None (no trim); R (only Step 2); A (Steps 3–7 with AvgMSE criterion — accuracy only); D (Steps 3–7 with −AvgMSEC — diversity only); AutoRAD (RAD with κ chosen from {0,0.1,…,1} minimizing validation-set simple-average MSE).

## 4. Equations & assumptions
- MSEComb decomposition: MSE_comb = Σ_{i=1}^{M} w_i MSE_i − Σ_{i=1}^{M−1}Σ_{j=2,j>i}^{M} w_i w_j MSEC_{i,j} (eq. 1).
- ADT: ADT = AvgMSE − κ·AvgMSEC (eq. 2), κ∈[0,1] (κ>1 would make the criterion unbounded below).
- RelDiv diagnostic: RelDiv = AvgMSEC/AvgMSE (eq. 3); sample quantiles Q1=0.23, Q3=0.53 define low/moderate/high diversity bands.
- Evaluation metrics: MASE = [H^{−1}Σ_{t=T+1}^{T+H}|y_t−f_t|] / [(T−s)^{−1}Σ_{t=s+1}^{T}|y_t−y_{t−s}|]; sMAPE = (200/H)Σ|y_t−f_t|/(|y_t|+|f_t|); Bias = [H^{−1}Σ(y_t−f_t)] / [T^{−1}Σy_t]; MSIS = [H^{−1}Σ((u_t−l_t) + (2/α)(l_t−y_t)𝟙{y_t<l_t} + (2/α)(y_t−u_t)𝟙{y_t>u_t})] / [(T−s)^{−1}Σ|y_t−y_{t−s}|] at α=0.05, with coverage/upper-coverage targets 0.95/0.975 and spread.
- δ sensitivity: δ∈[0.04,0.06] works well for seasonal series; larger δ better for small pools (yearly).

## 5. Features / target
Point forecasts (MASE, sMAPE, bias) and 95% prediction intervals (MSIS, coverage, upper coverage, spread) on held-out test sets; trimmed subsets combined with simple (equal-weight) averaging only, to keep algorithm comparisons fair given the forecast-combination puzzle.

## 6. Validation design
(1) ETS-family pools on all six frequencies, all six algorithms, point + interval metrics (Table 2). (2) Multiple Comparisons with the Best (MCB, Koning et al. 2005) significance tests on MASE ranks per frequency and overall (Fig. 2). (3) δ sensitivity curves 0.00–0.10 per frequency (Fig. 4). (4) RelDiv-conditional analysis: percentage of series where RAD/AutoRAD beats A at low/moderate/high RelDiv (Table 3) + MCB within RelDiv bands (Fig. 5). (5) Cross-family 9-method pools (Table 5). Series selection for pool identification uses validation data only; test data used solely to score the trimmed combination.

## 7. Numerical results / baselines
- Overall (ETS pools): RAD's MASE, sMAPE, MSIS are 3.31%, 1.12%, and 41.44% lower than None (no trimming); RAD/AutoRAD are the top two on mean errors for both point forecasts and intervals; MCB: RAD and AutoRAD significantly outperform None, R, A, D overall and in most frequencies.
- R (robustness only): improves point accuracy vs None but WORSENS interval accuracy — the cautionary result for GSE's interval lane.
- D (diversity only): consistently worst (ranked last in most frequencies, only exception daily) — unilateral diversity pursuit retains very poor forecasters.
- Subset sizes (Fig. 3): RAD/AutoRAD retain relatively few forecasters → improved computational efficiency.
- δ: values 0.04–0.06 recommended; larger δ for yearly (pool of 6).
- RelDiv guidelines: RelDiv<0.2 → A preferred (diversity unnecessary); 0.2–0.5 → A≈RAD≈AutoRAD; >0.5 → RAD/AutoRAD preferred, with RAD significantly better than A at high RelDiv (MCB, Fig. 5). Overall, RAD or AutoRAD beats A in 56.2%/53.8% of differing-subset series at moderate/high RelDiv.
- Cross-family pools: RAD/AutoRAD still best on mean errors; None's overall performance is worse under the cross-family pool than under ETS pools, but the gap shrinks or disappears under RAD/AutoRAD — direct evidence the joint approach pays when the pool is genuinely diverse.
- Standing reminder: "the simple average of the selected optimal subset poses a tough benchmark to beat."

## 8. Code / data availability
No code stated. Data: R packages Mcomp 2.8 and M4comp2018 0.2.0 (public); models via forecast 8.16 (ets) and smooth 3.1.5 (es). Algorithms are simple enough to reimplement from the paper.

## 9. Leakage & limitations
- Trimming uses validation-set forecasts only — clean; but intervals of NNET-AR via 1,000 simulations are computationally heavy and unrealistically-wide ETS intervals get a Tukey-fences pre-screen.
- All pools are univariate statistical methods; no multivariate, no ML-heavy pools (one NNET-AR), no judgmental forecasts despite the criterion being generic.
- Evaluation is equal-weight only; optimal subsets were selected with a simple-average lens, so weighted-combination follow-ups inherit that bias.
- Series-specific trimming (no cross-learning/global model version). δ=0.05 and κ-grid are heuristics; AutoRAD's κ selection costs a full extra search loop.

## 10. GSE overlap
This is the pool-selection machinery GSE's ensemble lane was missing: 1169 (OGD weights) and 1170 (per-quantile weights) both assume a fixed pool; 1171 (evidence-theory pool selection via performance+specialization+diversity) overlaps directly and RAD gives it a concrete, cheap, validated algorithm to benchmark against or replace. 1172's diagnosis (weight-estimation error from two-step estimation) is exactly what trimming mitigates at the pool level — and the paper's "many could be better than all" (Wang et al. 2022a) is the standing slogan. Caveat for GSE: ADT/MSEC are built on MSE and equal weights; GSE's targets are probabilistic (log loss, Brier, quantile loss), so the criterion needs a scoring-rule port (see §14), and 1170's per-quantile diversity may partially substitute for explicit trimming.

## 11. GSE implementation spec
1. RAD port for GSE model pools (~1–2 days): per season/week, build a validation window (e.g., trailing 4 weeks); compute per-model MSE-equivalent (or a chosen proper score) and pairwise MSEC on point forecasts; Step 2 Tukey's-fences screen on per-model absolute-error variance; backward ADT elimination (κ=1, δ=0.05) until the stop rule; combine the survivors with simple average or 1170's per-quantile weights. Track trimmed-pool size and realized log loss vs untrimmed.
2. RelDiv diagnostic (dashboard, ~2 hours): compute RelDiv = AvgMSEC/AvgMSE per pool each week; apply the paper's rule — RelDiv<0.2 → skip diversity handling (accuracy-only screen A); >0.5 → run full RAD; 0.2–0.5 → A only. Log which rule fired each week.
3. Interval caution: per the R-algorithm result, a robustness-only screen can worsen interval metrics — any GSE trimming step must be validated on BOTH point and interval scores (MSIS-style interval scores on quantile forecasts), not point scores alone.

## 12. Reproducible test
Dataset: 2024 NFL season, GSE component models, trailing-4-week validation window per game-week. (a) Run RAD (κ=1, δ=0.05) on the model pool each week, combine survivors with simple average; compare realized season log loss vs untrimmed average and vs accuracy-only trimming (A). Expectation per the paper: RAD ≥ A > None on point metrics, and no interval-score degradation vs None. (b) Compute RelDiv weekly and test whether weeks with RelDiv>0.5 are the weeks RAD beats A. Time-ordered, no leakage. Success = RAD beats A with the paper's RelDiv-conditional pattern replicated in GSE data.

## 13. Acceptance / rejection gate
ADAPT the RelDiv-conditional trimming protocol if the reproducible test replicates the paper's core ordering (RAD ≥ A > None on point scores, no interval degradation) on 2024 data. REJECT diversity-only trimming (D) as a design option outright — the paper's MCB results void it. If RelDiv stays <0.2 for GSE's pools in practice, downgrade to accuracy-only screening (A) per the paper's own guideline.

## 14. Improvement experiment
The paper's ADT is MSE/equal-weight-specific. GSE's combination targets are distributional: derive a scoring-rule ADT analog — e.g., ADT_log = (1/M)ΣLogLoss_i − κ·AvgPairwiseDivergence, where the diversity term is the mean pairwise KL or CRPS-based divergence (an actual decomposition of the combined log-loss analogous to eq. 1, per the logarithmic-pool literature). Test whether the scoring-rule ADT selects better subsets for 1169-style logarithmic pooling than the MSE-based ADT. If it does, GSE gets a version of RAD calibrated to its actual loss — the cross-learning/global-model extension the authors leave for future work.
