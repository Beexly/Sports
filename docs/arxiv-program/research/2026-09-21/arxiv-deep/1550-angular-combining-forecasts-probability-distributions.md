# [1550] Angular Combining of Forecasts of Probability Distributions (arXiv:2305.16735)

**Citation:** Taylor, J. W. and Meng, X. (2025). *Angular Combining of Forecasts of Probability Distributions*. arXiv:2305.16735v2 [stat.ME]. Saïd Business School, University of Oxford / School of Management, University of Bath. URL: https://arxiv.org/abs/2305.16735
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v2, 41 pages; all sections, Tables 1–7, Figures 1–16; theorem statements and proof sketches in main text). **Audit note (2026-09-21):** the paper's proofs live in Online Appendices A–G, which are journal-only supplementary material for the published version (Management Science 72(3), 2026, DOI 10.1287/mnsc.2024.05558) — verified that the arXiv source tarball contains NO ancillary files or appendix PDFs (tex + figures only). The appendices were not re-read; proof claims rest on the main text's theorem statements. The simulation algorithm (Online Appendix C) is implemented in the author's R package, cited in §8. The main-paper read is complete.
**Verdict:** ADAPT — a one-parameter generalization of the linear opinion pool that lets GSE tune combined-forecast dispersion with a single angle θ optimized on historical CRPS, directly applicable to pooling GSE's margin/total predictive distributions.

## 1. Research question
When combining distributional forecasts, should one average probabilities (vertical combining = the linear opinion pool) or average quantiles (horizontal combining)? Vertical averaging of calibrated forecasts tends to produce overdispersed (too-wide) distributions; horizontal averaging tends to produce underdispersed (too-narrow) ones, and the empirical literature is mixed. The paper proposes *angular combining*: average at an angle θ between the horizontal and vertical extremes, with θ estimated from past data via a proper scoring rule — a pragmatic continuum that encompasses both as special cases.

## 2. Dataset / schema
Three empirical studies, all public:
(a) COVID-19 Forecast Hub: weekly US Covid mortality forecasts, 84 forecast origins (6 Jun 2020 – 8 Jan 2022), 52 series (national + 50 states + DC), 23 quantile levels (1%–99%), varying teams per origin (compartmental, statistical, ML, agent-based); CDFs built from quantiles by linear interpolation with tail extrapolation.
(b) Survey of Professional Forecasters: US SPF (Philadelphia Fed) GDP growth 1982Q1–2023Q4 (168 quarters, median 32 forecasters) and inflation 1968Q4–2023Q4 (221 quarters, median 34); ECB SPF growth/inflation/unemployment 1999Q1–2023Q4 (100 quarters, median ~51 forecasters). Bin-probability forecasts → piecewise-linear CDFs.
(c) Nord Pool day-ahead electricity prices: hourly, 6×365 days from 1 Jan 2013, 24 hourly series; 4 individual methods (historical simulation, ARX, AR1-GARCH, ARX-GARCH).

## 3. Method / model
Parameterize each CDF F by the intersection of the angled line y = −tanθ(x − c) with the curve y = F(x), for θ ∈ (0°, 90°), c ∈ (−∞, ∞). Average the k intersection points:
FA,θ( (1/k)Σ xi(c) ) = (1/k)Σ Fi(xi(c)). (3)
θ = 0° recovers horizontal (quantile) averaging; θ = 90° recovers vertical (probability) averaging (the linear opinion pool). Weighted version: FA,w,θ(Σ wi xi(c)) = Σ wi Fi(xi(c)). (4)
Also developed: angular median aggregation, angular trimming (Jose et al. 2014 style), angular recalibration. Two implementations: pragmatic numerical (1001 angled lines, linear interpolation of midpoints) and a simulation sampler avoiding implicit-equation solving. Reinterpretable as generalized linear combining (Gneiting & Ranjan 2013) with quantile link hθ: hθ(F)⁻¹(α) = F⁻¹(α) + α/tanθ. (6)–(7)

## 4. Equations & assumptions
- Vertical average: FV(x) = (1/k)Σ Fi(x); fV(x) = (1/k)Σ fi(x). (1)
- Horizontal average: FH⁻¹(α) = (1/k)Σ Fi⁻¹(α); fH(FH⁻¹(α)) = 1 / [(1/k)Σ 1/fi(Fi⁻¹(α))]. (2)
- Angular average CDF: FA,θ((1/k)Σxi(c)) = (1/k)ΣFi(xi(c)). (3)
- Prop. 1 (PDF): fA,θ((1/k)Σxi(c)) = [Σ fi(xi(c))]² / [(Σ fi(xi(c)) + tanθ)(Σ 1/(fi(xi(c)) + tanθ))⁻¹ …] — paper's stated form: ratio of squared sum of densities to product terms involving tanθ (reduces to harmonic-mean-of-PDFs at θ=0, arithmetic-mean-of-PDFs as θ→90°).
- Prop. 2: mean of horizontal/vertical/angular combination = (weighted) average of individual means — for any weights.
- Theorem 1: Var(FA,w,θ) < Var(FV,w) for any weights.
- Assumption 1: each Fi same scale, same location-scale family, standardized PDF symmetric about 0 and unimodal. Under it: Lemma 1 (angular PDF symmetric; CDF monotone in θ about the mean); Theorem 2: Var(FA,w,θ) increasing in θ ⇒ Var(horizontal) < Var(angular) < Var(vertical).
- Prop. 3/4: prediction intervals nest: horizontal ⊆ angular ⊆ vertical (under Assumption 1; Prop. 4 for two-CDF averaging, intervals widen monotonically in θ).
- Theorem 3: CRPS(FA,w,θ), CRPS(FH,w) ≤ Σ wi CRPS(Fi) — angular/horizontal averaging never worse than the weighted-average member CRPS ("accuracy no worse than the average crowd member"); implies CRPS weight optimization has no spurious local minima.
- Theorem 4: for odd k, median aggregation gives the same CDF whether taken horizontally, vertically, or at angle θ.
- CRPS: CRPS(F,z) = ∫₋∞^∞ (F(x) − 1(x>z))² dx. MQS (used empirically): (1/23)Σ 2·QS(F⁻¹(αi), z), QS = (αi − 1(z ≤ F⁻¹(αi)))(z − F⁻¹(αi)).
Assumptions: CDF forecasts strictly monotonic (for horizontal; angular works for any well-defined CDF when 0<θ<90); proper scoring rules; Assumption 1 for the variance-ordering results.

## 5. Features / target
Inputs: k distributional forecasts (CDFs or 23 quantiles) per origin×series×horizon. No covariates — pure combination. Target: one combined predictive CDF; evaluated via MQS/CRPS and quantile scores at 23 levels. θ optimized per series×origin by minimizing in-sample MQS/CRPS (expanding window; Covid: first 10 of 84 origins for init; SPF: ~12–13 quarters; electricity: rolling 365-day window).

## 6. Validation design
Expanding-window (Covid, SPF) or rolling-window (electricity) out-of-sample evaluation: Covid 74 origins × 52 series × 4 lead times (scores averaged over lead times); SPF out-of-sample from n−m origins; electricity final 4×365 days × 24 hourly series. Baselines: vertical avg (linear opinion pool), horizontal avg, horizontal/vertical switching (in-sample-selected), median aggregation, beta-transformed linear pool (Gneiting & Ranjan), exterior/interior trimming, recalibration (Han & Budescu), individual models. Statistical testing: Diebold–Mariano (5%) on electricity data. Calibration: reliability diagrams (appendix).

## 7. Numerical results / baselines
Covid (MQS, deaths; skill vs vertical avg benchmark):
- Averaging: angular 51.5 (skill +0.8%) vs vertical 52.6, horizontal 55.5 (−5.0%); angular best in 3 of 4 non-national categories.
- Weighted: angular 49.4 (skill +2.7%) vs vertical 50.5 (+2.0%), horizontal 52.5 (−1.0%); angular weighted lowest MQS in 4 of 5 categories. Each weighted form beats its averaging form.
- Fixed θ: θ=67.5° best no-optimization choice (skill +1.4% overall); optimized θ histogram peaks at 70°–90° but with mass near 0° (series-dependent; Florida ≈0°, Texas ≈90° across origins).
- Tails: angular combining "particularly strong results in the tails"; vertical more competitive at central quantiles (50% intervals) — angular preferred for 95% intervals.
- Other methods: exterior-trimmed vertical averaging slightly beat angular weighted on all-series skill (+2.8% vs +2.7%); beta-transformed linear pool strong only on US national (+14.6%) but uncompetitive elsewhere; recalibration did not help.
SPF (CRPS×100): angular avg beat vertical on US growth (37.8 vs 38.0) and US inflation (35.8 vs 36.4); tied on ECB growth/inflation (θ optimized to 90°); lost only on ECB unemployment (22.8 vs 22.6).
Electricity (CRPS×100, EUR/MWh): angular avg best of averaging methods in all three method selections (e.g., 177.7 vs vertical 178.9 / horizontal 181.1 for methods 1–3, skill +0.6%); angular avg of methods 1–3 and 1–4 beat the best individual method (ARX-GARCH 172.8). DM tests: angular avg significantly better than other averaging methods in >half of 24 series, significantly worse in none; angular weighted significantly better than other weighted methods in up to 24/24 comparisons, worse in none.

## 8. Code / data availability
R package for angular combining: https://github.com/XiaochunMeng1/R-package-for-Angular-Combining (simulation algorithm + implementation). Data: COVID-19 Forecast Hub (public), SPF Philadelphia/ECB (public), Nord Pool prices (public).

## 9. Leakage & limitations
- θ optimized in-sample per series×origin: with only 10 initial Covid origins, early θ estimates are noisy (authors acknowledge); the switching benchmark shows part of the gain could come from adaptivity rather than angularity per se — though angular beat switching in most cells.
- Covid CDFs are constructed from 23 quantiles with ad-hoc tail bounds (1%/99% ± adjacent gap) — tail results (where angular shines) are sensitive to this construction; authors report alternative bounds give "very similar" results.
- Individual-method diversity is a precondition: electricity gains shrink as the best individual model (ARX-GARCH) dominates; when one expert dominates, weighted combination ≈ selection.
- Assumption 1 (same location-scale family) rarely holds exactly for GSE-type model ensembles — the variance-ordering theorems are guidance, not guarantees.
- The paper's framework is for continuous distributions; GSE moneyline probabilities are binary-event — the angular machinery maps to margin/total distributions, not directly to win probabilities.
- My adversarial note: skill gains are small in absolute terms (0.4–2.7%); the paper's strongest claim (never worse than average member, Thm 3) is about the average, not the best, member.

## 10. GSE overlap
New capability, no duplication. The existing-research-map has no distributional-combination entry; GSE's engine emits point picks + probabilities, and memory shows calibration work (CQR lane, grouping-loss paper 2210.16315, temperature scaling in competitor scrape) but no method for pooling full predictive distributions across models. This slots into the 2026-09-18 ML brief's open "ensembling" topic and complements ledger 1548 (WIRED): WIRED does CRPS-weighted probability mixtures; angular combining adds a dispersion-tuning knob orthogonal to the weights.

## 11. GSE implementation spec
1. For each game, collect predictive CDFs over margin (and total) from: engine v5.2.7 (bootstrap its historical margin errors), de-vigged market distribution (from spread/total + historical line-error distribution), Elo margin model.
2. Build combined CDF via angular averaging; optimize θ per market (spread vs total) by minimizing trailing-8-week CRPS on an expanding window; re-estimate weekly.
3. Weighted variant: weights ∝ 1/CRPS per expert (paper's pragmatic scheme), then θ tune.
4. Use the angular CDF's quantiles for 80%/95% interval publishes and tail-probability props (e.g., alt spreads).
5. Fallback per paper: if no history, θ = 67.5° (their best fixed angle) rather than 45°.
Effort: ~1 week Python prototype (scipy interpolation + grid search over θ ∈ {0°..90°}); the R package is reference.

## 12. Reproducible test
Dataset: 2024–2025 NFL regular season; per-game margin CDFs from engine, market, Elo (quantile grids at the 23 Hub-like levels or 99 percentiles). Protocol: expanding window, first 4 weeks init, then weekly θ re-optimization on trailing data; evaluate weeks 5–18 both seasons. Metric: mean CRPS + 80%/95% interval coverage + tail quantile scores (5%, 95%). Baselines: vertical average (linear opinion pool), horizontal average, best single expert.

## 13. Acceptance / rejection gate
ADOPT angular combining if optimized-θ angular averaging beats the linear opinion pool by ≥1% mean CRPS over the two-season window AND 95% interval coverage stays within [0.92, 0.97]; REJECT if it fails to beat vertical averaging or if θ optimization is unstable (optimized θ bouncing between <10° and >80° week-to-week, indicating noise-fitting). Fixed-θ=67.5° accepted as fallback only if it alone beats vertical averaging.

## 14. Improvement experiment
Make θ state-dependent: fit θ as a function of ensemble disagreement (e.g., θ = g(std of expert means, tail spread)) via gradient boosting on historical CRPS, instead of one θ per market. Hypothesis: disagreement predicts whether the crowd is over- or under-dispersed — high disagreement → horizontal-like (low θ) to avoid vertical blowup; low disagreement → vertical-like (high θ). This turns the paper's scalar knob into an adaptive dispersion controller and should beat static-θ angular combining on tail quantile scores.
