# [0789] On the Efficacy of the Wisdom of Crowds to Forecast Economic Indicators (arXiv:2207.08924v2)

**Citation:** Nilton S. Siqueira Neto, José F. Fontanari (2022). *On the efficacy of the wisdom of crowds to forecast economic indicators*. arXiv:2207.08924v2. URL: https://arxiv.org/abs/2207.08924v2
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, /tmp/arxiv750-cache/fulltext/2207.08924.txt — complete paper: abstract, sections I–VI, all equations, figures, references; read all ~326 wrapped lines).
**Verdict:** ADAPT — the median-vs-mean aggregation findings (median beats the majority by construction; ~2× better odds of beating ALL forecasters) transfer directly to how GSE aggregates market/expert lines and model outputs: prefer median-based consensus over means to blunt outlier-model drag; adapt because the paper studies economic-indicator point forecasts, not probability/calibration quality.

## 1. Research question
Does the "wisdom of crowds" really work, and is the median or the mean the better aggregation method? Using 15,455 forecasting contests from the FRBP Survey of Professional Forecasters (Vox Expertorum, not Vox Populi), the authors compare mean vs median aggregation on two criteria — rank among participants and absolute accuracy — benchmark against ARIMA, and test the popular "unbiased estimates / error cancellation" explanation for crowd accuracy.

## 2. Dataset / schema
- Federal Reserve Bank of Philadelphia Survey of Professional Forecasters (FRBP-SPF), 20 economic indicators (NGDP, PGDP, CPI, UNEMP, RGDP, etc.), entry dates 1968:Q4–2007:Q1 through 2020:Q4; 5 forecast horizons per survey; mean 35 participants per contest (min 8, max 87); 15,455 forecasting contests total (10 eliminated due to zero true values). Public: https://www.philadelphiafed.org/research-and-data/real-time-center/survey-of-professional-forecasters.
- ARIMA comparison on a reduced 13,893 contests (12-quarter training window consumed early history).
- Public, fully replicable.

## 3. Method / model
- For each contest: compute collective estimate via mean ⟨g⟩_n (Eq. 1) and median F_n^{−1}(1/2) (Eqs. 6–7); relative errors γ_mean/|G|, γ_median/|G| (Eqs. 2, 8).
- Rank analysis: fraction ξ of participants beaten by the collective estimate; probability crowd beats ALL participants (ξ=0).
- Accuracy benchmarks: mean relative error of winners (0.15), random forecaster (0.22), ARIMA (0.31, 12-quarter rolling fit).
- Debunking test: Pearson correlation between unsigned skewness |μ₃| of the forecast distribution and collective error (expectation under error-cancellation theory: strong correlation).

## 4. Equations & assumptions
- Page's diversity prediction theorem: γ_mean² = ε_quad − δ (Eq. 5) — with the caveat (their own) that δ and ε_quad can't be varied independently, so the "more diversity = better" reading is wrong.
- Skewness μ₃ = (1/n)Σ((g_i − ⟨g⟩_n)/δ^{1/2})³ (Eq. 9); empirical CDF F_n(g) and median definition (Eqs. 6–7).
- Mean individual error ε = (1/n)Σ|g_i − G| (Eq. 10) = expected error of a random forecaster.
- Assumes forecasters' predictions are independent (acknowledged as "not too far-fetched"); contests treated as independent experiments though participants repeat across quarters.

## 5. Features / target
- Inputs: individual forecasters' point estimates per contest. Target: realized historical value of the economic indicator.
- No engineered features; the "feature" is the distribution of expert estimates.

## 6. Validation design
- 15,455 contests = massive natural replication; no train/test split (descriptive statistics, not model fitting — no fitting, so no leakage from fitting).
- Comparisons are head-to-head on identical contests: median vs mean (r=0.98 correlation of errors; median beats mean in 50.4% of contests); crowd vs winners; crowd vs ARIMA (13,893 contests).
- ARIMA trained on 12 quarters before each prediction — no lookahead.

## 7. Numerical results / baselines
- Odds crowd beats ALL participants: mean 0.015, median 0.026 (median ~1.7× better).
- Median beats the majority by construction (no contest with ξ_median > 0.5); mean beats the majority in only 67% of contests.
- Both aggregations: ~20% mean relative error (mean 0.20 ± 0.01; median 0.19 ± 0.01); winners 0.15 ± 0.01; random forecaster 0.22 ± 0.01; ARIMA 0.31 ± 0.01.
- ARIMA beats a random expert in 35% of contests; ARIMA beats the crowd in 28% of contests.
- 58% of contests have crowd error ≤5%; 28% have error >10% — accuracy is good but "hardly miraculous."
- Skewness vs collective error: Pearson r = 0.03 — no meaningful correlation → debunks the error-cancellation (unbiased estimates) explanation.

## 8. Code / data availability
No code stated. FRBP-SPF data public via Philadelphia Fed.

## 9. Leakage & limitations
- Descriptive, not predictive: no out-of-sample aggregation rule is proposed or tested; the median advantage is partly definitional (median always beats ≥half by construction).
- Contests are not independent (same forecasters across quarters) — standard errors/correlations assume independence; authors acknowledge p-values are tiny but magnitude is what matters.
- ARIMA is a weak strawman: fixed 12-quarter window, no automatic order selection described, univariate — a modern forecaster would do better.
- Economic indicators ≠ sports outcomes: continuous low-noise macro series vs binary/high-variance sports; transferability of the 20%-vs-15% gap is analogical only.
- Selective-attention conclusion is interpretive, not derived from a test.
- Percent errors on levels near zero excluded only for 10 contests; percentage error is unstable near zero for other variables too (unaddressed).

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: no existing ledger on crowd aggregation, median-vs-mean consensus, or expert-panel combination in the map. GSE does aggregate multiple model outputs and market lines — but no recorded doctrine on the aggregation function itself (mean vs median vs weighted). This is new, narrowly scoped guidance, not a duplicate.

## 11. GSE implementation spec
- Change GSE's consensus computation: wherever multiple probability estimates are blended (model outputs per game, cross-book market-implied probabilities, expert/pundit panels), compute both the mean and the median; default the published edge to the median-based blend.
- Add a "consensus disagreement" diagnostic: report |mean − median| as an outlier-sensitivity flag; when it exceeds a threshold (e.g., 3 percentage points of probability), surface the dissenting source for analyst review.
- Track a "beat-all" statistic per model: fraction of weeks each constituent model's probability beats the median consensus in log-loss — the paper's ξ-statistic repurposed as a model-health monitor.
- Effort: ~2 days (aggregation swap + logging).

## 12. Reproducible test
Dataset: GSE picks 2024 NFL, per-game per-model probabilities + outcomes. Compute median-consensus and mean-consensus probabilities. Metric: mean log-loss and Brier score, full season. Also compute the fraction of games where each aggregation beats every constituent model (the paper's 0.015/0.026 odds analogue) and the fraction where median beats mean head-to-head.

## 13. Acceptance / rejection gate
ADAPT accepted if median consensus achieves log-loss no worse than mean consensus (within 0.5%) AND beats all constituent models in ≥2% of games (matching the paper's 0.026 for median); reject if median consensus log-loss is >1% worse than mean — the median's rank guarantee doesn't pay for itself in GSE's data.

## 14. Improvement experiment
Test trimmed-mean and winsorized aggregations (5%, 10%, 20% trim) against pure median and mean on the same 2024 data: the hypothesis is that a lightly-trimmed mean keeps the median's outlier robustness while retaining efficiency from the full panel. If a 10% trimmed mean beats both, adopt it as the consensus default and report the "effective panel size" per game. This goes beyond the paper's binary mean/median choice.
