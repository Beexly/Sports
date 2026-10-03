# [1521] Calibrated Predictive Distributions from Sample-Based Generators (arXiv:2609.19035)

**Citation:** Wen-Ting Wang, ShengLi Tzeng, Yu-Ting Fan, Hsin-Cheng Huang (2026). *Calibrated Predictive Distributions from Sample-Based Generators*. arXiv:2609.19035v1 [stat.ME] 20 Jul 2026. URL: https://arxiv.org/abs/2609.19035
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; all sections: method, theory, simulations, WeatherBench-2 experiments, discussion; appendix proofs read through final lines — the tail is the DKW/summation-by-parts proof of Theorem 3's uniform bound, no new empirical claims).
**Verdict:** ADAPT — GSE's engine already emits Monte-Carlo game samples; CPIT is a drop-in post-processing layer that converts those samples into a calibrated predictive distribution for margin of victory with threshold-coherent exceedance probabilities.

## 1. Research question
How to turn a sample-only generative forecaster (m predictive draws per x, no tractable likelihood) into a calibrated *predictive distribution* — not just a fixed-level conformal interval — so downstream users can query arbitrary exceedance probabilities, quantiles, highest-density intervals, and tail losses coherently?

## 2. Dataset / schema
Simulations: 3 misspecification designs (global location-scale distortion; covariate-dependent location-scale distortion; Gaussian-shape generator vs. skewed exponential-minus-1 truth), nbias=1000, ncal=1000, ntest=5000, m=100 generator draws, 100 replications. Real: WeatherBench-2, 50-member ECMWF IFS-ENS 24h precipitation forecasts vs. ERA5, n=3,649 cases (nbias=1204, ncal=1204, ntest=1241), 2018–2022, Europe regional mean + p95 targets and 4 Taiwan grid cells; log-mm transform g(y)=log(y+0.1); GAM features (day-of-year cyclic spline, ensemble mean/log-sd, u/v850 winds, TCWV).

## 3. Method / model
Bias-Corrected Conformal PIT calibration (CPIT). (1) Optional monotone transform T. (2) Affine location-scale bias correction on a held-out bias split: global (a0,b0) via heteroskedastic Gaussian quasi-likelihood, or covariate-dependent µ_adj(x), h(x) via alternating weighted-GAM / Gamma-GAM fits. (3) Randomized PIT ui=(Ni+Vi(Ni*+1))/(m+1) on the calibration split; conformal calibration map Ĉ(t)=(1+Σ1{ui≤t})/(N+1); finite-support map Ĉ_m; calibrated predictive CDF F̃^e_x(y)=Ĉ_m(F̃^adj_x(y)), represented as weighted empirical distribution Σ_j w_j δ_{Y_{adj,(j)}} with rank-cell weights w_j=Ĉ_m(j/m)−Ĉ_m((j−1)/m). Optional: Gaussian smoothing (τ_x=4^{1/3}s_x m^{−1/3}), and a PIT-centrality split-conformal wrapper (score 2F̃^e_x(y)−1) for nested fixed-level intervals with exact marginal coverage.

## 4. Equations & assumptions
- Randomized PIT ui=(Ni+Vi(Ni*+1))/(m+1) (Eq. 8); calibration map Ĉ(t)=(1+Σ_i 1{ui≤t})/(N+1) (Eq. 9); F̃^e_x=Ĉ_m∘F̃^adj_x (Eq. 11); weights (Eq. 12); smoothed CDF with N(0,τx²) kernel (Eq. 18).
- Theorem 1: under exchangeability of calibration/test forecast-response objects given fitted generator and bias rule, Ĉ(u_{n+1}) is super-uniform, exactly uniform on {1/(N+1),…,1} — finite-sample calibration in probability.
- Theorem 2: PIT-centrality wrapper gives marginal coverage ≥1−α (upper bound 1−α+1/(N_int+1) if scores distinct) and nesting across α.
- Proposition 1: W1(P̃^eτ_x, P̃^e_x) ≤ τ_x√(2/π) — smoothing perturbs any L-Lipschitz summary by ≤Lτ_x√(2/π).
- Theorem 3: uniform calibration-map error controls the weighted CDF sup-norm: sup|F̃^eτ−F^⋆| bound with probability ≤2exp(−2Nε²), uniform over covariates.
- Assumptions: exchangeability of calibration and test (Oi,Vi) objects; bias-correction rule fixed before calibration; global recalibration Fx^0=C^⋆∘Hx must hold for closeness to the true conditional law (oracle approximation error acknowledged, Eq. after Thm. 3); no conditional coverage (cites Barber et al. 2021 impossibility); m limits tail support.

## 5. Features / target
Ensemble/sample generators producing m draws per covariate; scalar continuous response. In the paper: precipitation; the method is response-agnostic.

## 6. Validation design
100-rep Monte Carlo on three known-misspecification designs; PIT histograms, Cramér–von Mises distance of PIT from uniformity, quantile calibration error QErr (mean |empirical−nominal| coverage over {0.05,…,0.95}), mean CRPS, central-90% coverage/length, five X-bin local diagnostics, upper-tail QErr at τ∈{0.96,…,0.99}. WeatherBench-2: same global metrics plus Brier skill scores vs. climatology at thresholds (Europe: 2.5–4.0 mm; Taiwan: 10/20/40/80 mm). Baselines: raw ensemble, global/GAM affine correction alone, and three interval-only split-conformal scores (quantile-residual, scaled-residual, empirical-CRPS).

## 7. Numerical results / baselines
- Sim 1 (global bias): BC(Global) CvM 474.56→0.59, QErr 0.2745→0.0098, CRPS 0.1915→0.0854; CPIT matches CRPS, 90% coverage 0.890/0.891 vs. 0.883/0.885 for BC alone.
- Sim 2 (x-dependent bias): BC(GAM) CvM 47.35→0.695, coverage 0.885; CPIT(GAM) CvM ~0.95, coverage 0.891, CRPS 0.1002; CPIT(Global) covers unevenly across X bins — marginal diagnostics mask residual local miscalibration.
- Sim 3 (shape misspecification): affine correction inert (CvM stays >31); CPIT CvM→~1.02, QErr 0.0757→0.0120, CRPS 0.1066→0.1023; upper-tail QErr 0.033→0.013.
- Europe mean: raw CvM 2.83; BC(GAM) 0.33 but undercovers (0.867); CPIT CvM 0.71–0.91, coverage 0.879–0.892 (smoothed: 0.919–0.927); CPIT(GAM) best BSS at 2.5/3.0/3.5 mm. Europe p95: CPIT(GAM) smallest CvM (0.466) and best high-threshold BSS.
- Taiwan (harder, single cells): raw undercovers (0.763/0.737/0.734/0.820), CvM up to 12.67; CPIT(GAM) average CvM 0.154 (98% reduction), QErr 0.012, coverage 0.886 unsmoothed / 0.928 smoothed; BSS improves at 10/20 mm; 80 mm threshold unstable (~4–7 events per cell).
- Interval-only baselines hit nominal 90% coverage with slightly shorter intervals, but output only level-specific intervals — CPIT's single CDF yields threshold-coherent monotone exceedance probabilities π̂(10)≥π̂(20)≥π̂(40)≥π̂(80), HDIs, tail expectations, and calibrated resamples.

## 8. Code / data availability
Implementation: https://github.com/egpivo/bc-cpit and PyPI `bc-cpit`. Data: public WeatherBench-2 archive.

## 9. Leakage & limitations
- No leakage; splits disjoint (bias/calibration/test/interval). Exchangeability across splits required — time-ordered deployment (e.g., seasons) may violate it; authors flag covariate-shift extensions as future work.
- Marginal, not conditional, calibration; the oracle-gap decomposition shows the true conditional law is recovered only if Fx^0=C^⋆∘Hx.
- Cannot invent missing modes or tail support beyond the m draws; smoothing is regularization, not extrapolation. Favorable marginal diagnostics can mask local miscalibration (Sim 2 caveat — same warning class as the CQR audit).
- Affine bias correction can *worsen* things when misspecified (Taiwan NW: BC(Global) CvM 7.40→10.26) — GAM correction is the safe default.

## 10. GSE overlap
Existing research map (~/workspace/arxiv-sweep/existing-research-map.md) calibration cluster: binned ECE, reliability diagrams, CQR intervals, conformal NCAA win probs (ledger 1518). None of them converts the engine's Monte Carlo game samples into a coherent calibrated predictive distribution — CPIT fills exactly that slot. Pairs naturally with ledger 1520 (rankECE as the *measure* of whether the CPIT output is calibrated) and ledger 1523 (tail calibration; CPIT's tail weakness is precisely what 1523 targets).

## 11. GSE implementation spec
- Adapt the reference `bc-cpit` implementation (or reimplement ~200 lines in the engine's Python post-processing): inputs = engine's m Monte Carlo margin-of-victory draws per game + actual outcomes; splits = prior seasons (bias) / recent season (calibration) / holdout.
- Use identity T on margin of victory (bounded, roughly symmetric); GAM affine correction on features {engine spread, total, home-field flag, week-of-season}.
- Output per game: weighted predictive distribution over margin → read off P(margin>spread), P(total>line), HDR intervals, expected tail loss (blowout risk) — all mutually consistent from one CDF.
- Effort: 2–3 days including backtest harness.

## 12. Reproducible test
Dataset: engine's stored Monte Carlo margin draws for 2022–2024 NFL games + realized margins. Run raw → BC(GAM) → CPIT pipeline; compute PIT CvM, QErr over deciles, CRPS, and Brier skill for exceedance at {3, 7, 10} points vs. raw ensemble and vs. a single fixed-level conformal interval baseline. Check threshold coherence (monotone exceedance probs) on 50 sampled games.

## 13. Acceptance / rejection gate
ADOPT CPIT as the engine's post-processing layer if on the 2022–2024 holdout it reduces PIT CvM ≥50% vs. raw samples AND improves mean CRPS ≥3% AND 90% central coverage lands in [0.87, 0.93]; otherwise keep it as a diagnostic-only tool (PIT histograms over the existing samples).

## 14. Improvement experiment
Go beyond the paper: extend CPIT to the bivariate (margin, total) joint predictive law via a PIT-centrality ordering in 2D, so spread/total/total-points derivative probabilities come from one coherent calibrated law instead of two independent CPIT fits — the paper is strictly univariate, and GSE's parlay/derivative pricing needs the joint law.
