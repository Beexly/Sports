# Kats Deep-Dive: Multi-Sport Engine Evaluation

**Repo:** https://github.com/facebookresearch/Kats · **Docs:** https://facebookresearch.github.io/Kats · MIT · community-maintained (commits as recent as Oct 1, 2026). Integration constraint stands: hostile dependency pins (numpy<1.22, pandas<=1.3.5) → vendor modules, never `pip install`.

**Correction vs. prior eval:** the engine covers NFL, NBA, MLB, NHL, soccer (minimum). This brief maps Kats per sport. All technical claims verified against the live repo today.

---

## 1. Per-sport time-series problems

### NFL (17 games/season — short series, detection-heavy)
- Team rolling form: 17-point efficiency series (short; features degrade — see §3)
- Player prop series: max 17 points; per-game stats, highly volatile
- Line movement per game: opener → close intraday series (hundreds of points — the LONG series in NFL)
- Injury/news shocks → changepoints (QB injury, weather shifts)
- Rest effects: Thursday short weeks, bye weeks (regressors)
- Outdoor weather series (wind/temp as regressors)

### NBA (82 games — the sweet spot)
- Team form: 82-point series, full Kats suite works
- Player props: long series BUT load management/rest creates structural breaks → changepoint detection is core, not optional
- Back-to-back scheduling: rest-days as regressor (huge edge in NBA)
- Line movement per game; in-season tournament effects (regime breaks)

### MLB (162 games — Kats' best sport)
- Full-length series: everything works, including STL/Hurst/long-window features
- Pitcher form: every-5-days starts → ~30 irregularly-spaced points per season (timestamp-based models win)
- Park factors drifting over seasons (slow changepoints)
- Weather as regressor (wind, temperature — Prophet extra_regressors / SARIMAX exog)
- Line movement is moneyline-centric (different dynamics than spreads)
- xwOBA / expected-metric series per team and player

### NHL (82 games — irregular sub-series)
- Team rolling xG: 82 points, works well
- Goalie form: irregular starts (not every game) → gappy sub-series
- Back-to-backs: bigger effect than NBA (travel + physical toll)
- Line movement: moneyline/puck-line
- Goalie changes mid-game → in-play changepoints

### Soccer (38-game league seasons + cups — multi-competition, irregular)
- Multiple competitions interleaved (league, domestic cup, continental) → irregular spacing AND varying opponent strength within one series
- xG series per team (good length across a full season)
- Fixture congestion: rest-days regressor (critical in Dec/Apr)
- Transfer windows → structural breaks (squad changes overnight; textbook changepoint use)
- Line movement: 1X2 + totals; lower limits, sharper early moves

---

## 2. Kats component → per-sport mapping

| Component | NFL | NBA | MLB | NHL | Soccer |
|---|---|---|---|---|---|
| **TSFeatures (65)** | Short-safe subset only (statistics, time, trend); level_shift/hurst/lumpiness NaN at 17 pts | Full suite on team series; short-safe on player sub-series | Full suite — ideal length | Full suite on team xG; short-safe on goalie sub-series | Full suite per competition; timestamp-based time features across comps |
| **BOCPD changepoint** | Steam moves, injury shocks (intraday line series) | Load-management breaks, rotation changes | Pitcher injury, park-factor drift | Goalie changes, coaching/system changes | Transfer windows, managerial changes |
| **CUSUM** | Level shifts in rolling efficiency | Mean shifts after trades | Regime shifts in team wOBA | xG mean shifts | xG regime shifts post-window |
| **StatSig / robust-stat** | Line-move significance | Prop-line move significance | Moneyline move significance | Puck-line moves | 1X2 move significance |
| **OutlierDetector** | Anomalous line moves (auto-regularizes to daily — see §3 warning) | Same | Same | Same | Same |
| **MultivariateAnomaly (VAR)** | Cross-book line divergence | Correlated prop portfolios | — | — | Correlated markets |
| **ProphetModel** | Weekly seasonality on line series; regressors (weather, rest) | Back-to-back regressor; weekly rhythm | Weather regressors; yearly seasonality | Rest regressor | Fixture-congestion regressor; custom seasonalities |
| **SARIMA** | Short series — weak; use ARIMA(1,0,0)-style only | (1,0,1)×seasonal on 82-pt series | Full seasonal fits | Full seasonal fits | Per-competition fits |
| **HoltWinters** | Weak at 17 pts | Decent baselines | Good baselines | Good baselines | Decent |
| **HarmonicRegression** | Timestamp-based seasonality on line series | Weekly rhythm | Yearly + weekly | Weekly rhythm | Multi-comp seasonality (timestamp-based) |
| **VAR / BayesianVAR** | Cross-book line movement (books move together) | Team efficiency + pace jointly | — | Team xG + shot metrics jointly | xG for/against jointly |
| **Ensemble** | Combine short-series baselines | Combine per-team models | Combine per-pitcher models | Combine | Combine per-league models |
| **Backtesters + emp. intervals** | Walk-forward on line series | Walk-forward, season-aware | Walk-forward, 162-pt folds | Walk-forward | Walk-forward per competition |
| **Simulators** | Synthetic steam-move injection (detector testing) | Synthetic rest-break injection | Synthetic injury injection | Synthetic goalie-change injection | Synthetic transfer-window injection |
| **Meta-learner** | Cross-series detector/model recommendation (build corpus) | Same | Same | Same | Same |

---

## 3. Hard technical answers (repo-verified)

### Q1: Irregular timestamps and missing data (offsasons, breaks, postponements)?

**Container accepts; algorithms differ.** `TimeSeriesData` (kats/consts.py) validates with `validate_frequency=False` — irregular timestamps are accepted at the data layer, and there is a dedicated `DataIrregularGranularityError` raised only by algorithms that need regular spacing.

Per-component behavior (verified in source):
- **STL-based features** (`stl_features`, `seasonalities` groups in tsfeatures.py): use statsmodels `STL(x, period=7)` on the raw value array — assumes fixed-period index spacing. On gappy sports data these fail or mislead. **Do not use across offseasons.**
- **OutlierDetector** (kats/detectors/outlier.py): if `pd.infer_freq` fails it silently does `asfreq("D")` + polynomial interpolation. **Danger:** across a 4-month offseason this fabricates daily values between seasons. Feed it per-season or game-indexed series only.
- **MultivariateAnomalyDetector**: hard-fails with `RuntimeError("Frequency of metrics is not constant...")` on irregular data. Requires pre-regularized input.
- **CUSUM / BOCPD**: operate on the value array by index — they run on any spacing but treat observations as equally spaced. An offseason gap becomes "adjacent indices." Model in game-index space deliberately.
- **Prophet**: timestamp-based (`ds` column), handles missing dates natively. Best choice for gappy series.
- **HarmonicRegression**: Fourier features computed from absolute time since epoch (`fourier_series(dates, ...)` uses `(dates - 1970-01-01)` in hours) — inherently robust to gaps.
- **The `time` feature group** in TSFeatures (time_years, time_daysofyear, weekday frequencies, etc.) uses raw timestamps — works on irregular data.

**Practical rule:** never interpolate across offseasons. Model per-season in game-index space for index-based algorithms; use timestamp-based models (Prophet, harmonic) when cross-season continuity matters.

### Q2: Short series — 17-game NFL vs 162-game MLB vs 82-game NBA/NHL?

Verified in tsfeatures.py:
- `transform()` raises ValueError if `len < 5`.
- `level_shift` features return NaN when `len < window_size + 2` (default window 20 → **needs 22+ points; a 17-game NFL season yields NaN**).
- `flat_spots` returns NaN when `len <= nbins` (default 10).
- `hurst` defaults to `lag_size=30` — degenerate on 17-point series.
- `lumpiness`/`stability` default `window_size=20` — meaningless chunks on short series.
- STL with default `period=7` wants multiple full periods.

**Consequence:** on NFL-length series use `selected_features` to pick short-safe groups (`statistics`, `time`, `trend_detector`, `seasonalities` with care) and reduce window sizes. NBA/NHL (82) support most of the suite with slightly reduced windows. MLB (162) supports everything at defaults. Forecasting models: SARIMA/HoltWinters on 17 points are noise — NFL forecasting value is in the **intraday line-movement series** (hundreds of points), not the 17-game series.

### Q3: Multiple seasonality (weekly rhythm + yearly)?

- **Prophet**: full support — yearly/weekly/daily seasonality (auto/True/False/Fourier terms) plus `custom_seasonalities` (name/period/fourier_order dicts) and holidays. The only Kats model with true multiple seasonality.
- **NeuralProphet**: multiple seasonalities natively (same family).
- **SARIMA**: single seasonal cycle `(P,D,Q,s)`. Univariate only.
- **HoltWinters**: single `seasonal_periods`.
- **Theta / STLF**: single seasonality at most.
- **HarmonicRegression**: single `period` (in hours), but timestamp-based; stack two instances (weekly + yearly) as regressors if needed.
- **VAR**: no seasonal handling — feed deseasonalized data or seasonal dummies.

**For sports:** weekly game rhythm + yearly season cycle is a Prophet-shaped problem. Everywhere else, model one dominant cycle.

### Q4: Can the meta-learner recommend across hundreds of series spanning sports?

**Architecture: yes. Out of the box: no — you build it.** `MetaDetectModelSelect` (kats/detectors/meta_learning/metalearning_detection_model.py) is a train-it-yourself classifier:
- You supply a metadata DataFrame with columns `hpt_res` (best hyperparams per candidate), `features` (TSFeatures dicts), `best_model` (labels) — minimum 30 rows (`MIN_EXAMPLES = 30`).
- It trains a RandomForest (`MetaLearnModelSelect`) mapping **TSFeatures vectors → best detector**.
- `predict(ts)` extracts TSFeatures from a new series and returns the recommended detector.

Because TSFeatures are sport-agnostic statistics (trend strength, entropy, lumpiness, ACF...), a classifier trained on a multi-sport labeled corpus genuinely generalizes across sports — the features don't know what sport they're from. Same pattern exists for forecasting in `kats/models/metalearner/` (`MetaLearnModelSelect`). **But:** Kats ships no pre-trained cross-sport model. Building the corpus means running hyperparameter search over candidate detectors/models per series to generate labels — real compute, real effort. This is a quarter-scale asset, not a week-one integration. Also note `get_ts_features` in the meta-learning module disables `hw_params` (a known slow group).

### Q5: Walk-forward backtesting with as-of discipline (no cross-season leakage)?

Verified in kats/utils/datapartition.py + backtesters.py:
- **SimpleTimestampDataPartition(train_end, test_start, ...)**: timestamp-fenced splits via `np.searchsorted` — exactly the as-of discipline. Train on data ≤ train_end, test on ≥ test_start.
- **RollingOriginDataParition**: rolling origin with `window_frac` gap between train and test — the gap naturally models embargoes (e.g., no bets after lineup lock). Supports expanding or constant train windows.
- **CrossValidation**: expanding and rolling variants.
- **GenericBacktester**: refits the model per fold (`kats_units_forecaster`: fit on train, predict len(test) steps), multiprocessing optional, per-fold and summarized error metrics.
- Splits preserve time order by construction — no future leakage possible from the splitter itself.

**Caveat:** the splitter doesn't know about seasons. You must supply season-aware partitions (never let a fold's train span an offseason without a gap, or add season indicators). The as-of discipline is yours to configure; the machinery supports it exactly.

---

## 4. Per-sport: where Kats wins vs. rivals

(Rivals: **Darts** — very active, unified API, global deep models, `historical_forecasts` backtesting; **sktime** — best-maintained unified forecaster API; **Nixtla statsforecast** — fastest statistical baselines at scale, minimal deps; **Merlion** — dead/archived with a published unsafe-deserialization vuln: do not touch.)

- **MLB:** Kats' best sport. 162-game series use the full TSFeatures suite, BOCPD on pitcher-form breaks, StatSig on moneyline moves. **Kats wins** on detection + features. **statsforecast wins** on raw baseline scale (hundreds of daily props — fastest AutoARIMA/ETS). **Darts wins** if you want one global model across all teams/pitchers.
- **NBA:** Strong Kats fit — 82 games, load-management changepoints, back-to-back regressors via Prophet extra_regressors. **Kats wins** on detection + regressors-in-one-API. **Darts wins** for global models across 30 teams (TFT/N-HiTS learn cross-team patterns Kats' per-series models can't).
- **NHL:** Same 82-game shape as NBA; goalie sub-series are irregular → Kats' timestamp-based Prophet/harmonic win over index-based rivals. **Kats wins** on mixed regular/irregular handling. **Darts** for global modeling.
- **Soccer:** Transfer windows + fixture congestion are changepoint/regressor problems Kats handles well; multi-competition irregularity favors Prophet/harmonic. **Kats wins** on detection + irregularity. **Darts wins** for cross-league global models (learn from 5 leagues at once).
- **NFL:** Weakest forecasting fit (17 points) — don't force it. **Kats wins decisively** on detection: intraday line-movement series are long, steam-move BOCPD/CUSUM is the core use. For the rare forecasting need (line projection), **statsforecast** (fast baselines) or **Darts**.

**Net:** no rival bundles detection + features + backtesting + forecasting in one API the way Kats does. Kats' forecasting models are wrappers (no edge over statsmodels/Prophet underneath); its **detection suite, TSFeatures, and one-shop packaging** are the moat. For pure forecasting at scale or cross-team global models, Darts/statsforecast are better.

---

## 5. Revised ADOPT list (multi-sport, priority order)

1. **TSFeatures** — sport-agnostic feature vectors feeding the ML layer. Per-sport config: full suite MLB; short-safe subset + reduced windows for NFL (17 pts); standard for NBA/NHL (82); per-competition for soccer. Effort: small (days) — adapter from GSE series → TimeSeriesData → vectors.
2. **Changepoint suite (BOCPD + CUSUM + StatSig)** — the cross-sport regime engine: NFL steam moves/injury shocks, NBA load-management/trades, MLB pitcher injuries/park drift, NHL goalie/coaching changes, soccer transfer windows/managerial changes. Effort: small–medium — detector + per-sport threshold calibration on historical data.
3. **Backtesters + empirical prediction intervals** — walk-forward harness with as-of fencing (`SimpleTimestampDataPartition`); season-aware partitions per sport; calibration-friendly intervals matching the engine's calibration discipline. Effort: medium — wire into the test/benchmark lane.
4. **ProphetModel** — multiple seasonality + regressors (rest days, weather, fixture congestion, back-to-backs) + irregular-timestamp robustness. The only multi-seasonality model in Kats. Skip if prophet's heavy Stan build is a problem — the other components don't need it. Effort: small.
5. **VAR / BayesianVAR + multivariate anomaly detector** — cross-book line movement (books move together), correlated team/prop portfolios. Directly serves the SGP-correlation-mispricing edge (biggest structural hole per the reasoning doctrine). Note: multivariate detector hard-requires regular frequency — regularize inputs first. Effort: medium.
6. **HarmonicRegression** — timestamp-based seasonality for gappy series (soccer multi-comp, pitcher starts, goalie rotations). Effort: small.
7. **Simulators** — synthetic anomaly/steam-move injection for testing detectors before trusting them on real money. Effort: small.

**WATCH (not ADOPT):** `kats/models/globalmodel/` (neural net across series — matches the cross-sport "one model, hundreds of series" ambition, but experimental); the **meta-learner framework** (build the multi-sport labeled corpus as a quarter-scale asset; don't expect turnkey cross-sport recommendations).

**Gotchas (all verified):**
- Vendor, don't pip-install (numpy<1.22/pandas<=1.3.5 pins would nuke the engine env).
- Never interpolate across offseasons; OutlierDetector's silent `asfreq("D")` + polynomial interpolation will fabricate data across gaps — feed per-season series.
- TSFeatures on NFL-length series: select short-safe groups or accept NaNs in windowed features.
- Backtest partitions must be season-aware; the splitter enforces time order but doesn't know what a season is.
- Point-in-time discipline: backtesters won't enforce as-of fencing for exogenous regressors — your partition config does.

**Sources:** Kats repo (kats/consts.py — TimeSeriesData/validate_data; kats/tsfeatures/tsfeatures.py — transform/STL/level-shift/hurst guards; kats/detectors/outlier.py — asfreq("D") interpolation + multivariate RuntimeError; kats/detectors/cusum_detection.py — index-based CUSUM; kats/detectors/detector.py — base; kats/detectors/meta_learning/metalearning_detection_model.py — MetaDetectModelSelect, MIN_EXAMPLES=30; kats/models/prophet.py — seasonality/regressor params; kats/models/sarima.py — seasonal_order; kats/models/holtwinters.py — seasonal_periods; kats/models/harmonic_regression.py — epoch-based Fourier; kats/utils/datapartition.py — SimpleTimestampDataPartition/RollingOriginDataParition; kats/utils/backtesters.py — per-fold refit), Kats docs site, Darts/sktime/Nixtla/Merlion repos as cited in prior eval.
