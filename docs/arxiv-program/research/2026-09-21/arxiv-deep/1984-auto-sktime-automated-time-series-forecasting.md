# [1984] auto-sktime: Automated Time Series Forecasting (arXiv:2312.08528)

**Citation:** Marc-André Zöller, Marius Lindauer, Marco F. Huber (2023). *auto-sktime: Automated Time Series Forecasting*. arXiv:2312.08528. URL: https://arxiv.org/abs/2312.08528
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — its time-aware multi-fidelity budget (expanding lookback window) and prior-run warm-starting are directly portable to GSE's forecaster search, even though the system as a whole is weaker than AutoGluon-TimeSeries on probabilistic output.

## 1. Research question
How must AutoML be adapted so it works end-to-end for time series forecasting? Three gaps are attacked: (1) a single fixed pipeline can't cover statistical/ML/DNN forecasters (different preprocessing needs); (2) multi-fidelity budgets (random data subsets, training iterations) break temporal structure; (3) optimizations are not warm-started from prior runs.

## 2. Dataset / schema
64 diverse real-world univariate/multivariate/panel time series (list in supplementary material). 5-minute compute budget per evaluation (pruned after +60s grace with worst-result penalty); each evaluation repeated 5 times with different seeds. Metric: MASE; horizon not stated in extracted text (per-dataset). Public datasets; exact list in supplement.

## 3. Method / model
Three contributions:
1. **Pipeline templates:** instead of one fixed pipeline, template i defines search space Λ_i = Λ_i^1 ∪ ... ∪ Λ_i^n ∪ {λ_{i,r}} aggregating algorithm set A_i with per-algorithm hyperparameter spaces — one template per forecaster family (statistical / ML / DNN), each encoding family-specific preprocessing best practices. Formalizes the CASH problem per-template (Thornton et al. notation).
2. **Time-aware multi-fidelity budget:** since random subsets distort temporal relations and many forecasters don't support iterative fitting, the fidelity budget b ∈ [b_min, b_max] maps to a **lookback window** y_{i, T_i − l_b : T_i}: low budget = short recent window; increasing budgets expand the window backward in time until the full series is included at b_max. Successive halving (Jamieson & Talwalkar) allocates budgets.
3. **Warm-starting from prior optimizations:** meta-learning initialization of Bayesian optimization from previous optimization runs (designed for TS, claimed transferable to classification).

## 4. Equations & assumptions
- CASH per template: given dataset D and loss L, find λ* minimizing validation loss within Λ_i.
- Multi-fidelity proxy: f̃_D(·, b) with b ∈ [b_min, b_max], 0 < b_min < b_max ≤ 1; f̃(·, b_max) = f(·). Budget → lookback-window mapping as above.
- Assumption: short-window performance is predictive of full-window performance (successive halving validity); prior runs' optima transfer across datasets (warm-start validity).

## 5. Features / target
Input: raw time series (univariate/multivariate/panel). Pipeline templates include automated data cleaning + feature engineering (lag features, datetime features per family). Target: H-step-ahead forecast; evaluated with MASE (point only — no probabilistic/quantile output claimed).

## 6. Validation design
64 datasets; 5-min budget; 5 seeds; MASE; t-test α=0.05 with Bonferroni correction for significance vs best. Baselines: APT-TS, AutoTS, HyperTS, PyAF, pmdarima, ETS, DeepAR, TFT, and AutoGluon (TimeSeries). Timeouts enforced with failure penalty. Not time-ordered in the cross-dataset sense (each series evaluated with its own temporal split internally).

## 7. Numerical results / baselines
Table 1 (mean MASE ± std, avg rank ± std, fit time s): auto-sktime 1.59±1.61, rank 3.22±1.94, 326s — significantly best on both MASE and rank. APT-TS 3.12±5.41 (rank 4.51); AutoTS 4.26±10.94 (5.38); HyperTS 2.88±5.03 (4.57); pmdarima 2.63±3.21 (5.42); ETS 2.57±2.78 (5.82); PyAF 3.23±5.33 (5.38); AutoGluon 6.00±18.17 (rank 6.74); DeepAR 11.54±51.51 (7.23); TFT 9.80±50.62 (6.73). Note: "ETS and pmdarima reached a better average MASE than [AutoML tools] on very few data sets... When considering the median performance, the AutoML tools outperform"; TFT/DeepAR "perform badly due to failures on many time series."
Tension with ledger 1983: under a 5-minute budget on these 64 datasets, AutoGluon-TS scores poorly (6.00 MASE) — its ensemble needs the 4h budget from its own paper. Budget-sensitivity of AutoML comparisons is the honest takeaway.

## 8. Code / data availability
Paper describes the framework; repository link not extracted from text ("Not stated in paper" for exact URL in the converted text — verify before building on it). Datasets listed in supplementary material.

## 9. Leakage & limitations
- Adversarial notes: (1) 5-minute budget handicaps ensemble methods (AutoGluon) — the headline "beats AutoGluon" is budget-conditional, and the authors acknowledge benchmark-size limitations. (2) Point forecasts only (MASE); GSE needs probabilistic outputs — auto-sktime as a system is a downgrade vs AG-TS for uncertainty. (3) Mean MASE can be dominated by a few explosive failures (note the huge stds: DeepAR 11.54±51.51); median-based claims are more honest. (4) Warm-start transferability across datasets is asserted more than ablated. (5) No sports data; short-series behavior (NFL's 17-game seasons) untested.

## 10. GSE overlap
No prior art in corpus on time-series multi-fidelity or warm-started HPO. The lookback-window fidelity idea is NEW vs everything GSE does (current engine does full-history refits). Connects to ledger 1983 (AG-TS) as the efficiency layer: auto-sktime's fidelity definition could accelerate AG-TS's own ensemble member selection.

## 11. GSE implementation spec
- **Adopt the two mechanisms, not the system:** (a) implement lookback-window successive halving as the fidelity schedule for GSE's forecaster/model selection — evaluate candidate configurations on the most recent 2 seasons (low fidelity), promote winners to 5 seasons, then full history; (b) warm-start each season's HPO from the previous season's optimization trace (store evaluated configs + scores in the feature store).
- **Where:** wraps the existing win-probability model HPO and the AG-TS panel forecaster (ledger 1983). Statistical/ML/DNN template idea maps to GSE's model families (Elo-like / GBM / neural).
- **Effort:** ~1 week for the fidelity scheduler + warm-start store; reuses existing HPO code.

## 12. Reproducible test
Dataset: nflverse weekly team EPA panel 2009–2025. Task: select the best forecaster config for next-week offensive EPA. Protocol: rolling-origin over 2023–2025; compare (a) full-history evaluation of all configs vs (b) lookback-window successive halving (2-season → 5-season → full) on total compute and selected-config wQL. Warm-start test: HPO for 2024 season initialized from 2023 trace vs from scratch — measure evaluations-to-target.

## 13. Acceptance / rejection gate
**ADOPT the mechanisms if:** successive halving selects a config within 2% wQL of the full-evaluation winner while using ≤40% of the compute, AND warm-starting reaches the from-scratch best within ≤50% of the evaluations on the 2024–2025 windows. **REJECT if:** the low-fidelity winner disagrees with the full-fidelity winner on >1 of 3 test seasons (fidelity not predictive), or warm-start shows no evaluation savings vs random init.

## 14. Improvement experiment
Make the fidelity budget *adaptive to regime change*: instead of a fixed 2→5→full season ladder, choose the low-fidelity window by detecting the most recent stable regime (e.g., post-coaching-change or post-QB-change break). Hypothesis: for NFL data with structural breaks, a regime-aware window beats a fixed recency window as a fidelity proxy. Test: compare selected-config wQL of regime-aware vs fixed-window halving on teams with mid-window coaching changes (2023–2025).
