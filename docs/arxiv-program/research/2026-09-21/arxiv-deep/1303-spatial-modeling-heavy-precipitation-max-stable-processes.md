# [1303] Spatial Modeling of Heavy Precipitation by Coupling Weather Station Recordings and Ensemble Forecasts with Max-Stable Processes (arXiv:2003.05854v1)

**Citation:** Oesting, M., & Naveau, P. (2020). *Spatial Modeling of Heavy Precipitation by Coupling Weather Station Recordings and Ensemble Forecasts with Max-Stable Processes*. arXiv:2003.05854v1 [stat.AP]. URL: https://arxiv.org/abs/2003.05854
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, main text + supplement).
**Verdict:** ADAPT — data-driven max-stable processes that fuse ensemble forecast fields with station extremes, reproducing nugget effects and spatial non-stationarity with a single fitted parameter; the tail-dependence machinery ports to correlated extreme-weather scenarios across stadium networks. (Replacement for REJECT 1097.)

## 1. Research question
How can ensemble rainfall forecasts (spatially coherent patterns, misrepresented intensities) be coupled with weather-station records (accurate local intensities, sparse coverage) inside a multivariate extreme-value framework to simulate coherent spatial fields of extreme precipitation?

## 2. Dataset / schema
110 Météo-France weather stations in the south of France; fall seasons 1980–2017, each season split into 5 blocks → 190 block maxima. Forecast side: PEARP ensemble forecast fields (Météo-France NWP) for fall seasons 2012–2017, identified spatially to the closest grid cell per station.

## 3. Method / model
Max-stable processes with unit Fréchet margins, using data-driven spectral (basis) functions built from the forecast fields. Five models: A — max-linear on all N forecast maps (normalized); B — max-linear on max-spectral functions above the empirical 90%-quantile threshold (N(u) = 1819 maps); C — Reich–Shaby (2012) construction with a nugget parameter α ∈ (0,1), spectral functions from B; D — max-linear mixture `Y(s) = max{a·Y_noise(s), (1−a)·Y_B(s)}` with mixture parameter a ∈ [0,1]; E — classical Brown–Resnick process with an anisotropic power variogram plus nugget (5 parameters: σ², b1, b2, θ, β).

## 4. Equations & assumptions
- Extremal coefficient (pairwise, Eq. 5): characterizes extremal dependence; triplewise extension in the supplement via the empirical multivariate weighted F-madogram.
- Model D: `Y(s) = max{a·Y_noise(s), (1−a)·Y_B(s)}, s ∈ S`, a ∈ [0,1].
- Model E variogram: `γ(h) = σ²·1{‖h‖=0} + (rotated anisotropic power term with b1, b2, θ ∈ (−π/4, π/4), β ∈ (0,2])`.
- Assumptions: unit Fréchet margins after transformation; threshold exceedances of forecast fields carry the extremal dependence structure (generalized Pareto process theory); semi-parametric max-linear combination of 1819 spectral functions.

## 5. Features / target
Features: ensemble forecast vector fields (normalized to spectral functions). Target: spatial fields of biweekly rainfall maxima matching observed extremal dependence.

## 6. Validation design
Fit = minimize RMSE of model-implied pairwise extremal coefficients vs empirical F-madogram estimates. Uncertainty: parametric bootstrap — 190 block maxima simulated from each fitted model 500 times; gray bands = 2.5–97.5% quantiles of the implied coefficients. Supplement validates triplewise extremal coefficients (not used in fitting).

## 7. Numerical results / baselines
- Model A fails: using all forecast maps misrepresents extremal dependence (dry days should not build basis functions).
- Model B overstates dependence for strongly dependent station pairs (missing nugget effect).
- Models C and D capture observed pairwise extremal coefficients well — with 0, 1, 1 fitted parameters for B, C, D respectively.
- Supplement (triplewise, out-of-fit validation): RMSE Model C = 0.154, Model D = 0.137, Model E = 0.167; C and D nearly identical, E deviates most.
- Model E (5 parameters) cannot capture non-stationarity by construction; the data-driven C/D beat it with one parameter each.

## 8. Code / data availability
Météo-France station data and PEARP forecasts (licensed/public research access). Code: not stated in paper.

## 9. Leakage & limitations
Fitting uses only pairwise coefficients; triplewise validation is out-of-fit. Limitations: single region (southern France), single season (fall), orography-driven non-stationarity may not transfer; 1819 spectral functions are data-hungry at fit time (though only one parameter is inferred).

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals): this is the tail-dependence complement to ledgers 1301 (calibration) and 1305 (forecasting) — it models how extremes co-move across space. No max-stable / multivariate-EVT material exists in the corpus. No duplicate.

## 11. GSE implementation spec
1. Adapt the data-driven max-stable recipe to NFL stadium networks: use ensemble forecast fields over stadium locations as spectral functions; fit pairwise extremal coefficients of game-day wind/gust maxima.
2. Use the fitted model to simulate joint extreme-weather scenarios across all stadiums in a slate week — feeding correlated tail weather into Monte Carlo totals/projection simulations.
3. Adopt the bootstrap-band diagnostic (2.5–97.5% bands on implied extremal coefficients) as the acceptance test for any spatial-extremes model before it touches the engine.

## 12. Reproducible test
Reimplement models B–D on the paper's public station data; confirm the triplewise RMSE ordering D < C < E (0.137 / 0.154 / 0.167); then fit the same pipeline on US mesonet gust data for NFL stadium coordinates and check that the fitted field reproduces observed joint exceedance days.

## 13. Acceptance / rejection gate
ADAPT: one-parameter models beating a five-parameter classical process on out-of-fit triplewise dependence is a strong, portable result — spatial tail-dependence modeling is a genuine gap in GSE's weather lane.

## 14. Improvement experiment
Learn the threshold u per model instead of fixing it at the 90%-quantile; replace the fixed spectral-function bank with a learned dictionary (sparse max-linear coding); extend to space–time max-stable processes for multi-day slate weather.
