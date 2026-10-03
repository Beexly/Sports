# [0787] Bayesian Forecast Combination Using Time-Varying Features (arXiv:2108.02082v3)

**Citation:** Li Li, Yanfei Kang, Feng Li (2021). *Bayesian forecast combination using time-varying features*. arXiv:2108.02082v3. URL: https://arxiv.org/abs/2108.02082v3
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, /tmp/arxiv750-cache/fulltext/2108.02082.txt — complete paper: abstract, sections 1–7, all tables 1–9, figures, references; read all ~619 wrapped lines).
**Verdict:** ADAPT — FEBAMA's softmax-over-time-series-features weighting is a principled, interpretable scheme for regime-dependent ensemble weights directly relevant to GSE model blending (e.g., shift weight toward trend models in high-volatility weeks); modification needed: GSE needs weights driven by market-regime/sports features (spread size, rest, weather), not generic tsfeatures statistics, and the R/package stack must be reimplemented.

## 1. Research question
Can time-varying combination weights for density forecasts be made interpretable by tying them to time series features of the target series? The authors propose FEBAMA (FEature-based BAyesian forecasting Model Averaging): weights = softmax of a linear function of time-varying series features, estimated by maximizing the Bayesian log predictive score (MAP), with an automatic Bayesian variable selection variant (FEBAMA+VS) that ranks feature importance per model. They argue this improves on optimal prediction pools (constant weights), generalized pools, and black-box FFORMA (XGBoost-based, uninterpretable).

## 2. Dataset / schema
- S&P 500 daily percent log returns, 2010-01-04 to 2019-09-18 (2,443 trading days). Rolling estimation samples of 1,250 trading days (~5 years); evaluation 2014-12-19 to 2019-09-18 = 1,193 one-step density forecasts. Public data (Yahoo Finance-class; not linked by authors).
- M3 competition monthly data: 1,428 monthly series, lengths 48–126, 18-step forecast horizon. Public (Makridakis & Hibon 2000).
- All public, replicable.

## 3. Method / model
- Pool m predictive densities; combined density p(y_t|Y_{t−1},ℳ) = Σ_i w_{i,t} p(y_t|Y_{t−1},M_i).
- Weights via modified softmax of linear features: w_{i,t} = exp(x_t'β_i) / (1 + Σ_{j=1}^{m−1} exp(x_t'β_j)), x_t from a sliding window of history (standardized), features from R tsfeatures package, ReliefF pre-screening, CV for feature count.
- Bayesian formulation: posterior p(β|Y_T,X_T,ℳ) ∝ ∏_t p(y_t|…)p(β); estimate β by MAP with BFGS (priors: β_i elements N(0, σ²=10³); FEBAMA+VS adds Bernoulli(p), p~Beta(1,1) selection indicators sampled via Gibbs/Metropolis).
- Multi-step: recursively treat forecasts as observations, recompute features including forecasted values.
- Benchmarks: SA, OP (Geweke–Amisano constant optimal weights), GP (Kapetanios piecewise-linear weights), FFORMA (M3 point forecasts only).

## 4. Equations & assumptions
- Log score LS(Y_T,M) = Σ_t log p(y_t|Y_{t−1},M) (Eq. 2); pool LS(Y_T,ℳ) = Σ_t log[Σ_i w_{i,t} p(y_t|Y_{t−1},M_i)] (Eq. 5); OP is the special case β=0.
- Weight equation (Eq. 4) above; FEBAMA+VS variant (Eq. 8): w_{i,t} = exp(x_t'β_{ℐ_i}) / (1 + Σ exp(x_t'β_{ℐ_i})).
- Log posterior (Eq. 7): log p(β|Y_T,X_T,ℳ) = const + Σ_t log[Σ_i w_{i,t} p(y_t|Y_{t−1},M_i)] + log p(β).
- Metropolis acceptance (Eq. 10): α = min(1, p(ℐ^propose,β|…)/p(ℐ^current,β|…)).
- MASE (Eq. 11) for point forecasts.
- ABC-style criterion not used here; assumption: predictive densities approximately Gaussian where needed; noise priors sub-Gaussian-like (Gelman-style non-informative priors); features standardized; minimum series length s for feature generation.

## 5. Features / target
- Inputs: 15 features (S&P experiment) from tsfeatures after ReliefF: alpha/beta (ETS), arch_acf, arch_r2, crossing_points, diff1x_pacf5, diff2_acf1, diff2_acf10, entropy (spectral), garch_acf, garch_r2, nonlinearity, trend, unitroot_kpss, x_acf1; M3 experiment uses 6 features per series (CV-chosen).
- Target: one-step density p(y_{t+1}|Y_t) for S&P returns; 18-step point+density forecasts for M3 monthly.

## 6. Validation design
- In-sample: optimize weights once on 1,193 obs, evaluate LS (with DM tests vs best benchmark).
- Out-of-sample: recursive weights, 1,193 one-step density forecasts; MCB (Multiple Comparisons with the Best) rank tests at 95%.
- M3: traverse all 11 model compounds (2,3,4-model combos of ETS/naive/RW-drift/auto.arima), average LS (density) and MASE (point) over 18-step horizons; DM tests vs best benchmark.
- Baselines: individual models, SA, OP, GP, FFORMA (point only). Time-ordered; expanding-window for out-of-sample.

## 7. Numerical results / baselines
- S&P in-sample LS (avg; Table 2): individuals M1 −1.3395, M2 −1.2867, M3 −1.2911. Three-model combo M1,2,3: SA −1.3065, OP −1.2827, GP −1.2716, FEBAMA −1.2626, DM p=0.0075 (vs best benchmark). FEBAMA highest LS for all 4 combinations; DM significant at 90% in 3/4 cases (p = 0.1749, 0.0326, 0.0821, 0.0075).
- S&P out-of-sample LS (Table 4, total avg): SA −1.3067, OP −1.3036, GP −1.2950, FEBAMA −1.2770, FEBAMA+VS −1.2740. FEBAMA(+VS) top-two in all 4 combos; MCB ranks statistically better than all benchmarks at 95%.
- M3 monthly 18-step (Table 7, totals): LS — SA −3.529, OP −3.542, GP −3.546, FEBAMA −3.377, FEBAMA+VS −3.320; MASE — SA 2.249, OP 2.224, GP 2.233, FFORMA 2.217, FEBAMA 2.206, FEBAMA+VS 2.192. FEBAMA+VS best LS in 9/11 combos. DM tests (Table 8): FEBAMA beats best benchmark at 95% in 3/11 (LS) and 4/11 (MASE) combos; FEBAMA+VS in 7/11 both metrics.
- Interpretability example: garch_r2 feature coefficient +12.96 for GARCH model drives GARCH weight peaks; entropy high → SV weight high in volatile 2015 period.

## 8. Code / data availability
R package "febama" at https://github.com/lily940703/febama. Data: S&P 500 public; M3 competition public. tsfeatures R package (Hyndman et al. 2020a). No pinned code version in paper.

## 9. Leakage & limitations
- In-sample evaluation (weights optimized once on full period, then scored) is data-snooping-adjacent; the authors' main claims rest on out-of-sample which is cleaner, but feature-count and window-size (100) were tuned on the same in-sample LS (Figure 6) — hyperparameter leakage into the out-of-sample run.
- S&P models all in-sample fitted via rolling windows with look-ahead-free design; but realized-volatility models use realized variance computed from intraday data — not lookahead for daily close, acceptable.
- M3 18-step: OP/GP were designed for one-step and jury-rigged with constant one-step weights — unfair to those baselines; FFORMA comparison is point-only while FEBAMA optimizes LS (different objectives).
- 1,193 one-step forecasts evaluated with DM tests — financial returns are heavy-tailed; log scores on a few tail events can dominate; no tail-robustness check reported.
- Feature window 100 days chosen by "smaller window with large LS" heuristic — ad hoc.
- MAP via BFGS on a mixture likelihood is non-convex; no discussion of local optima/restarts.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: the 2026-09-18 15-area ML research brief lists ensembling as a commissioned topic (results not yet in repo); CEPT is Garrett's own ensemble-theory lane (cept/). Neither covers feature-conditioned (regime-dependent) ensemble weights — no FEBAMA-style implementation in the map, so this is new capability, not duplicate. Partial overlap with GSE's existing conformal/CQR uncertainty work (2026-09-21 drive-deep notes) only in that both target predictive distributions, not in method.

## 11. GSE implementation spec
- Build a regime-dependent ensemble blender for GSE pick probabilities:
  - Feature layer: per-game "regime features" computed from data available at bet time: spread magnitude bucket, total, days rest, weather flags, market disagreement (max line move across books), recent ATS volatility of the two teams, home/road, primetime flag. Standardize.
  - Weight layer: softmax weights over GSE's constituent models (v5.2.7 engine + any auxiliary models) as a linear function of regime features; fit by maximizing log-loss on historical picks via L-BFGS (MAP with N(0,10³) priors, matching the paper).
  - Variable selection: Gibbs-sampled inclusion indicators (or L1 penalty as a pragmatic substitute) to rank which regime features drive each model's weight.
  - Data: picks table (3,411+ picks) + outcomes; features recomputed on rolling windows to stay online.
- Effort: ~2 weeks (feature pipeline 3–4 days, MAP optimizer 2–3 days, backtest harness + variable-selection ranking 3–4 days).

## 12. Reproducible test
Dataset: GSE picks table, NFL 2024 season, spread+moneyline+total, per-model probabilities per pick + outcomes. Features computed strictly from pre-game data. Baselines: SA of model probs; constant OP-style log-loss-optimal weights. Candidate: FEBAMA-style feature-conditioned softmax weights fit on weeks 1–9 (2024), evaluated on weeks 10–18 walk-forward. Metric: mean log-loss on outcomes. Include DM-style significance check vs best baseline.

## 13. Acceptance / rejection gate
ADAPT accepted if feature-conditioned weights achieve ≥2% relative log-loss improvement over BOTH SA and constant OP weights on the 2024 weeks-10–18 walk-forward, with ≥3 regime features selected in >50% of Gibbs draws (interpretability requirement); otherwise reject. Hard fail: if the best feature-conditioned weights collapse to near-constant weights (max weight range < 0.05 across games), reject — the regime structure adds nothing.

## 14. Improvement experiment
Replace the paper's generic tsfeatures with a sports-native regime feature set and add a CLV-aware objective: maximize log predictive score of the model-average minus a penalty for disagreement with closing-line-implied probability (shrinkage toward the market). Test whether market-shrunk regime weights beat pure log-score FEBAMA weights on out-of-sample Brier score AND on simulated CLV (probability × market odds edge). This tests the paper's core idea — feature-driven weights — against GSE's actual decision criterion, which is edge over the market, not raw calibration.
