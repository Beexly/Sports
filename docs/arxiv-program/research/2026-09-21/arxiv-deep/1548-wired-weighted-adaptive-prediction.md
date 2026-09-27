# [1548] WIRED: Weighted Adaptive Prediction with Structured Dependence for Probabilistic Multiseries Forecasting (arXiv:2608.12998)

**Citation:** Vercellino, G. (2026). *WIRED: Weighted Adaptive Prediction with Structured Dependence for Probabilistic Multiseries Forecasting*. arXiv:2608.12998v1 [stat.ME]. URL: https://arxiv.org/abs/2608.12998
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 14 pages, all sections incl. Tables 1–6, Figures 1–3, refs).
**Verdict:** ADAPT — the modular architecture (CRPS-weighted marginal expert mixture + separately estimated copula dependence) ports directly to combining GSE's model ensemble into calibrated joint scenarios, with the paper's honest negative result dictating stronger weight regularization.

## 1. Research question
How to produce joint probabilistic forecasts over several related time series by separating two sub-problems — (a) adaptively combining a library of simple marginal predictive distributions via recent scoring evidence, and (b) reconstructing cross-series dependence with an adaptive copula — and whether each layer earns its complexity in an honest benchmark. The paper's design question is pragmatic: preserve the robustness of simple forecasters while emitting simulation draws usable directly for scenario analysis.

## 2. Dataset / schema
(a) Synthetic: 4 multiplicative-growth DGPs (regime heavy tail; static gaussian; break correlation; independent series), p = 4 series, 240 training observations per replicate, 30 replicates per DGP-horizon pair, horizons 1/3/6. Growth law yt,j = yt-1,j(1 + gt,j), gt clipped below at −0.20. (b) Real: built-in R EuStockMarkets (daily DAX, SMI, CAC, FTSE levels), 8 rolling origins, horizons 1/5/20. All public/replicable (R built-in data + published DGP equations). 384 evaluation draws, 512 forecast draws.

## 3. Method / model
Pipeline: forecast experts → marginal mixture → adaptive copula → joint scenarios.
1. Transform levels to horizon-aligned moves (additive / multiplicative / log-multiplicative).
2. Fit an 8-expert marginal library per series×horizon: naive PERT, automatic ARIMA, EWMA Gaussian, historical bootstrap, drift + residual bootstrap, volatility-scaled naive Gaussian, robust median/MAD (Laplace or Gaussian), shrunk quantile regression. Each exposes sampler r(·), density f(·), CDF F(·), quantile Q(·).
3. Expanding-window backtests produce recent CRPS histories per expert; a robust Theil–Sen-style slope extrapolates the next-window score ŝ1:K; temperature-scaled softmax converts predicted scores to mixture weights (same exponential-weight form as finite-expert prediction, Cesa-Bianchi & Lugosi 2006, but on *predicted* proper scores rather than accumulated realized losses).
4. Dependence: Pearson or rank correlations mapped to the elliptical-copula scale; adaptation modes static / rolling / EWMA / regime (blends calm and stress correlation matrices via a smooth stress score); shrinkage toward identity + eigenvalue repair; Gaussian or Student-t copula; uniforms mapped through mixture quantile functions (monotone numerical inversion of mixture CDF) to joint scenarios on transformed and level scales.

## 4. Equations & assumptions
- Movement transform: xt+h,j = yt+h,j − yt,j (additive); yt+h,j/yt,j − 1 (multiplicative); log(yt+h,j/yt,j) (log-multiplicative). (1)
- Joint predictive target: Fh(x1,…,xp | y1:T). (2)
- Sample CRPS for forecast draws X1..m and realization z: CRPS(X, z) = (1/m)Σ|Xi − z| − (1/2m²)ΣΣ|Xi − Xk|. (3)
- Mixture weights: wk = exp(−ŝk/τ) / Σℓ exp(−ŝℓ/τ), τ defaulting to the empirical SD of predicted scores. (4)
- Entropy-regularized reading: w = argmin over simplex of Σ vk ŝk + τ Σ vk log vk. (5)
- Marginal predictive: Fj(x) = Σk wk Fjk(x). (6)
- Rank→copula mappings: Rij = ρ̂P (Pearson); sin(π τ̂/2) (Kendall); 2 sin(π ρ̂S/6) (Spearman). (7)
- Regime blend: Rreg = (1−ωT)Rcalm + ωT Rstress, ωT = {1 + exp[−k(sT − c)]}−¹. (8)
- Shrinkage: Rα = (1−α)R̂ + αIp. (9)
- Scenario draws: Xj = Qj(Uj), j=1..p, U from copula. (10)
- Sample energy score: ES = (1/m)Σ‖Xi−y‖₂ − (1/2m²)ΣΣ‖Xi−Xk‖₂. (12)
- Variogram score (order r=1/2): VS = Σa<b (|ya−yb|^r − (1/m)Σ|Xi,a−Xi,b|^r)². (13)
Assumptions: positive level process; marginal calibration and dependence are separable (copula premise); recent CRPS is extrapolable (Theil–Sen trend); rank correlations map validly to elliptical-copula parameters.

## 5. Features / target
Inputs: p-variate level panel y1:T (no exogenous features — purely autoregressive library). Target: joint predictive distribution over horizon-h transformed movements (and level scenarios) for all p series. Prediction horizons: 1, 3, 6 (synthetic); 1, 5, 20 (real).

## 6. Validation design
Nine variants ablated (WIRED-full; no tail copula; static/rolling dependence; independent marginals; equal weights; ARIMA independent; bootstrap independent; Gaussian-copula bootstrap). Synthetic: means ± SD across 360 paired cases (4 DGPs × 3 horizons × 30 replicates), plus paired-difference Table 4 with ~95% SE intervals. Real: 8 rolling origins. Metrics: marginal CRPS, energy score, variogram score (dependence-sensitive proper scores), empirical 80% interval coverage + width. All comparisons time-ordered expanding-window / rolling-origin.

## 7. Numerical results / baselines
Paper's headline (their words): "WIRED-full is not the overall winner in this benchmark. The Gaussian-copula bootstrap baseline has the best average CRPS, energy score, and variogram score."
- Table 3 (synthetic means ± SD): WIRED-full CRPS 0.00650±0.00334, Energy 0.01497±0.00755, Variogram 0.00955±0.00631, 80% cov 0.757±0.086, width 0.0251±0.0107. Gaussian-copula bootstrap: CRPS 0.00599±0.00266, Energy 0.01367±0.00587, Variogram 0.00833±0.00336, 80% cov 0.734±0.113.
- Table 4 (paired Δ vs WIRED-full, negative = better): independent marginals ΔVariogram +0.00186±0.00030 (dependence layer earns its keep); equal weights ΔCRPS −0.00039±0.00015, ΔEnergy −0.00093±0.00034 (adaptive CRPS weighting loses to uniform weights); bootstrap independent ΔCRPS −0.00051±0.00017.
- Table 6 (EuStockMarkets): WIRED-full CRPS 0.01647±0.02070, Energy 0.03571±0.04146, Variogram 0.01384±0.01175, 80% cov 0.792±0.335; Gaussian-copula bootstrap again best (CRPS 0.01427, Energy 0.03101, Variogram 0.01288).
- All variants under-cover the nominal 80% (0.73–0.82 synthetic; 0.77–0.82 real). Average adaptive weights ~0.11–0.15 per expert — mixture does not collapse.
Paper's interpretation (distinguished from mine): dependence layer useful; current CRPS-extrapolated softmax "not yet robust enough"; fix via stronger weight regularization (regularize toward equal weights / bootstrap prior), better expert-skill forecasting, explicit bootstrap-copula fallback.

## 8. Code / data availability
CRAN R package `wired` v1.0.1 (https://CRAN.R-project.org/package=wired, GPL-3); experiment driver + precomputed CSVs as arXiv ancillary files (anc/paper/, WIRED_BENCH_MODE=quick|paper). R 4.5.1. EuStockMarkets is R built-in.

## 9. Leakage & limitations
- Synthetic-only DGPs are simple multiplicative-growth; heavy-tail regime is Markov but still iid within state — understates real-world structural breaks (e.g., NFL injuries, line moves).
- Only 2 expanding-window CRPS points and 64 CRPS Monte Carlo draws — weight inputs are noisy by construction; the negative adaptive-weighting result may partly reflect underpowered skill estimation rather than a fundamental flaw.
- Real-data check is one equity dataset, 8 origins — thin external validity.
- 80% coverage under-nominal across ALL variants (incl. baselines) suggests systematic overconfidence in the library, not diagnosed.
- Capped simulation settings (reduced ARIMA draws, bootstrap sizes) — benchmarked implementation ≠ full package.
- Relevance caveat for GSE: paper combines time-series marginal experts for continuous moves, not discrete game outcomes; mapping to NFL requires a discrete-outcome or latent-score analogue.
- My adversarial note: equal weights winning is a small-margin, noisy result (ΔCRPS −0.00039 vs SD 0.00269) — not a refutation of adaptive weighting, but a warning that predicted-score extrapolation needs regularization.

## 10. GSE overlap
Extension, not duplicate. Garrett's `docs/research/cept/` (Baxley Causal E-Process Theory, v2.2) is his ensemble-adjacent lane but is a sequential causal-skill testing framework — it does not combine forecasts into mixtures, so no overlap. The 2026-09-18 ML research brief lists "ensembling" as a commissioned topic with results not yet in repo — this paper slots directly into that open slot. GSE's engine produces daily picks (v5.2.7, Neon `picks` table) but memory shows no existing CRPS-weighted multi-model mixture or copula dependence layer — GSE publishes singles, so cross-game dependence (correlated parlay legs, DFS stacks) is an unbuilt capability. The existing-research-map's "already covered" list has no forecast-combination method entries.

## 11. GSE implementation spec
Build "GSE-WIRED" as a post-engine combination layer, not a replacement:
1. Marginal experts (per game/market): engine v5.2.7 win-prob, market-implied prob (de-vigged), Elo-spread model, simple bootstrap over historical margin distribution, quantile-regression margin model — each emitting a full predictive distribution over margin/total.
2. CRPS weighting: rolling backtest over trailing N weeks; predict next-week CRPS per expert via Theil–Sen slope (paper's method); temperature softmax with τ floored at the SD of predicted scores; shrinkage of weights toward uniform (paper's own recommended fix).
3. Dependence: Gaussian/Student-t copula over game margins within a slate (correlations from aligned historical margin residuals), enabling coherent multi-leg parlay probability and DFS stack covariance.
4. Serve: precompute per-game mixture CDFs + slate copula; emit joint draws for parlay/DFS simulation.
Effort: ~2–3 weeks for marginal library + CRPS backtest harness; +1 week for copula layer. R package is reference-only; reimplement in Python (scipy/numpy).

## 12. Reproducible test
Dataset: 2024–2025 NFL regular seasons (nflverse play-by-play + closing lines from Odds API archive). Experts: GSE engine win prob, de-vigged market prob, Elo. Protocol: trailing-4-week expanding CRPS backtest, predict week-5 weights via Theil–Sen, compare CRPS-weighted mixture vs equal-weight mixture vs best single expert on weeks 5–18 (2024) and 1–18 (2025), moneyline and spread margins. Metric: mean CRPS + calibration (80% interval coverage) + Brier on binary outcomes. Baselines: equal weights, best-single-expert, market.

## 13. Acceptance / rejection gate
ADOPT the CRPS-weighted mixture layer if, over the two-season test window, it beats equal-weight mixture by ≥2% mean CRPS AND holds 80% interval coverage within [0.76, 0.84]; REJECT adaptive weighting (keep equal weights + copula) if it fails to beat equal weights or coverage falls below 0.74. Copula layer accepted separately if variogram/energy score on slate-level joint draws improves vs independent marginals at p<0.05 paired.

## 14. Improvement experiment
Replace Theil–Sen CRPS extrapolation with a direct expert-skill forecasting model: train gradient boosting on expert disagreement features (spread of the 8 CDFs, recent CRPS momentum, regime indicators like injury/news flags) to predict next-window CRPS per expert, then softmax with learned temperature. Hypothesis: the paper's bottleneck is noisy skill extrapolation, not the mixture idea; a supervised skill-forecaster should beat both the paper's adaptive weights and equal weights.
