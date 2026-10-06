# [1559] Smoothed Bernstein Online Aggregation for Day-Ahead Electricity Demand Forecasting (arXiv:2107.06268)

**Citation:** Ziel, F. (2021). *Smoothed Bernstein Online Aggregation for Day-Ahead Electricity Demand Forecasting*. arXiv:2107.06268v1 [cs.LG]. URL: https://arxiv.org/abs/2107.06268
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 9 pages, all sections incl. BOA update equations, holiday-adjustment model, Figs. 2–9, refs).
**Verdict:** ADAPT — a competition-winning (3rd place, IEEE DataPort Post-COVID load-forecasting) recipe whose two novel pieces transfer directly: (1) BOA weights *smoothed across forecast horizons* with P-splines, and (2) an event/holiday-adjustment front-end that strips structural shocks before the combiners ever see them. The diversity-of-calibration-windows expert pool is also a design GSE should copy.

## 1. Research question
Post-COVID electricity demand has structural breaks (lockdowns, persistent behavior change) that defeat static models. The paper asks: can an online aggregation scheme — Bernstein Online Aggregation (BOA) extended with horizon-smoothing — over a diverse pool of statistical experts (STL+ETS, AR(p), GAMs, lasso with different calibration windows), fronted by a novel holiday-adjustment procedure, adapt fast enough to win a real rolling day-ahead competition?

## 2. Dataset / schema
- **IEEE DataPort Competition "Day-Ahead Electricity Demand Forecasting: Post-COVID Paradigm"** (real data, undisclosed city; dx.doi.org/10.21227/67vy-bs34): hourly load 2017-03-18 → 2021-01-17; weather actuals + day-ahead forecasts (humidity, pressure, cloud cover, temperature, wind speed/direction; wind direction → NS/EW components; + rolling daily means). Test: rolling 30 days from 2021-01-18 (24 hourly values, 17–40h ahead). Metric: MAE (→ median forecasts required).
- Clear structural break at March 2020 lockdown (load level drop, weekly-profile disturbance; Fig. 2). Rolling study from 2020-06-01 (post hard-shutdown).

## 3. Method / model
- **Pipeline (Fig. 1):** data cleaning (tsrobprep) → holiday adjustment → expert training → smoothed BOA.
- **Holiday adjustment (§III):** high-dim lasso on log-load with (i) lagged log-loads ±168…510h, (ii) p-quantile ReLU-transformed weather, (iii) all weather interactions ("manual kernel trick"), (iv) daily/weekly standard + cumulative dummies, (v) annual periodic cubic B-splines, (vi) impact-adjusted holiday dummies scaled by (Q90−Q37 rolling quantile gap) to handle the COVID level shift. Fit by lasso (BIC-tuned), then zero the holiday coefficients → holiday-adjusted series (Fig. 4). ~30s on one core (glmnet, sparse matrices).
- **Expert pool (§IV):** STL+ETS, AR(p) (AIC, pmax=528), 2 GAM designs (mgcv; non-linear AR + weather smooths, tensor weekly profiles), lasso high-dim regressions — each trained on *8 calibration windows* C ∈ {28,…,1123} days (short windows adapt, long windows learn annual effects); applied to both holiday-adjusted log-load and load; horizons h=17…40 modeled per-horizon. GBM/neural nets tested and dropped (linear effects dominate).
- **Smoothed BOA (§V):** fully adaptive BOA with gradient trick (Eqs. 6–10; regret/instantaneous/range/learning-rate/weight updates) on absolute deviation loss; exponential update like EWA plus second-order refinement → near-optimal rates for both best-expert and best-convex-combination (Wintenberger 2017; Gaillard & Wintenberger 2018). **Smoothing:** P-spline smoothing of weights across horizons ŵ = B(B′B+λD′D)⁻¹B′w (Eq. 11), λ tuned by exponentially-discounted (ρ=0.01, ~100-day effective) past MAE on a grid; forward stepwise expert selection (30-day burn-in, 60-day calibration) picked 5 of 40 candidate experts.

## 4. Equations & assumptions
- Combiner: L̃_{d,h} = Σ_k w_{d,h,k} L̂_{d,h,k} (Eq. 5); AD loss |y−x|; gradient trick AD^∇; updates (6)–(10): r, E, η (Eq. 8: min(E/2, √(log K/Σr²))), R (second-order + indicator correction), w (Eq. 10) with w₀=1/K.
- Horizon smoothing (Eq. 11); dummies (1)–(4); GAM forms; lasso lag sets I_h = I_{h,day} ∪ I_{h,week} ∪ I_{h,year}.
- **Assumptions:** convex (simplex) weights; per-horizon weights exist but are smooth in h (the λ→∞/λ=0 endpoints bracket constant vs. pointwise); forgetting ρ=0.01 fixed ad hoc; experts' medians are the right target for MAE.

## 5. Features / target
- **Inputs:** 24 hourly expert forecasts per day (h=17…40), weather forecasts, calendar dummies.
- **Target:** next-day hourly load (24 values); MAE evaluation.

## 6. Validation design
- Real rolling competition: 30 test days; internal validation: 60-day calibration MAE for expert-count selection (Fig. 5), discounted-MAE for λ selection (Fig. 6); weight evolution plots (Figs. 7–8); final forecast vs. actuals (Fig. 9). Organizers' significance test: top-3 places not significantly different.

## 7. Numerical results / baselines
- **Competition: 3rd place** (top 3 not significantly different per organizers).
- **Expert selection (Fig. 5):** 5-model BOA combination ≈ 10% lower validation MAE than the best individual model (~11.4 vs ~12.4). Selected 5 are diverse: 3 lasso (two ≈3yr windows, one ≈3mo window), 1 GAM (7mo window), 1 STL+ETS — mixing short and long calibration windows.
- **Smoothing (Figs. 6, 8):** selected λ varies over time; burn-in favors high λ (conservative, low estimation risk); short-window models (lasso D=76, GAM D=209) get more weight at far horizons (h=40).
- GAM tends to underestimate, STL+ETS to overestimate (Fig. 9) — they act as bias correctors inside the mixture.
- No single final competition MAE number is published in the paper beyond the 3rd-place result.

## 8. Code / data availability
Method implemented in the R package **profoc** (Berrisch & Ziel): https://profoc.berrisch.biz/, https://github.com/BerriJ/profoc. Data: IEEE DataPort competition (doi link above). GAM via mgcv, lasso via glmnet, STL via forecast::stlf.

## 9. Leakage & limitations
- **Same BOA family as [1555]** (Bernstein Online Aggregation) — the aggregation core is not new; the novelty is the horizon-smoothing, the holiday front-end, and the competition proof. GSE value is in those deltas, not BOA itself.
- **Ad hoc tuning:** forgetting ρ=0.01, 60-day validation, 30-day burn-in all chosen by hand; author admits "some choices on parameter tuning were done ad hoc."
- **30-day test** is short for an adaptivity claim; the rolling internal study (from June 2020) is the stronger evidence but its aggregate numbers aren't tabulated.
- **Holiday adjustment needs known holiday dates** — here reverse-engineered by eyeballing (12Jan, 17Apr, …); in NFL the analogue (Thanksgiving/Christmas scheduling, bye weeks, international games) is known in advance, which is actually easier.
- **MAE/median objective** — transfers to spread/total point forecasts, not to probability calibration; pair with [1554]'s beta-pooling for the probabilistic side.
- Only 5 of 40 experts survived selection — most of the expert engineering was discarded; the lesson is that window-diversity in a few linear models beat model-class diversity.
- No comparison against plain (unsmoothed) BOA in the paper — the smoothing gain is asserted via the λ-selection curve, not isolated in a table.

## 10. GSE overlap
Existing-research map: BOA itself overlaps [1555] (financial BOA) — do not double-count the aggregation theory. What is **new** vs. the corpus: (a) horizon-smoothed weights — no ledger smooths combiner weights across a forecast dimension; (b) the structural-shock front-end — [1556] handles outlier propagation by dropping COVID, this paper *models* the shock (holiday dummies scaled by quantile gaps) so the data stays usable; (c) calibration-window diversity as the expert-diversity axis — GSE's sub-models all train on similar windows, an untried diversity dimension. Complements [1558]'s offline-online split: smoothed BOA is a strong candidate for the *online* stage.

## 11. GSE implementation spec
- **Data sources:** GSE sub-model weekly forecasts + actuals (nflverse), 2020–2025; schedule metadata (byes, holidays, international games).
- **Build:** (1) **Event-adjustment front-end:** regress historical margins on schedule-event dummies (Thanksgiving/Christmas/short-rest/byes) with team-strength controls; produce event-adjusted outcomes for combiner training, then add the event effect back at forecast time — the paper's holiday trick, but the events are known in advance so no eyeballing needed. (2) **Window-diverse experts:** train copies of GSE's core models on short (8wk), medium (1 season), long (3 season) windows. (3) **Smoothed BOA:** weekly BOA over experts with weights smoothed across the *market* dimension (spread/total) or across lookahead weeks via P-splines; λ by discounted past log-loss/MAE. profoc is R — port the 5 update equations to Python (a day's work).
- **Effort:** 1 week for the front-end + BOA port; window-diverse retraining piggybacks existing pipelines.

## 12. Reproducible test
2024 season, per market: (a) best single sub-model, (b) plain BOA (λ=0 equivalent, per-market weights), (c) horizon/market-smoothed BOA, each with and without the event-adjustment front-end. Metrics: margin MAE/RMSE, ATS Brier. The front-end's value is isolated on holiday/short-rest weeks specifically (the paper's Fig. 4 analogue: plot adjusted vs. raw around Thanksgiving).

## 13. Acceptance / rejection gate
ADOPT if smoothed BOA beats plain BOA by ≥1% on margin MAE **or** the event-adjustment front-end improves holiday/short-rest-week MAE by ≥5% without hurting normal weeks (the paper's core claim is shock-handling, so the front-end carries independent weight). REJECT if the smoother's selected λ collapses to ≈0 (no smoothing helps — markets are independent) *and* the front-end shows no holiday-week gain (NFL schedule effects already priced into sub-models).

## 14. Improvement experiment
**Two-dimensional smoothing: markets × time.** The paper smooths only across horizons h. In GSE, weights live on a grid of (market ∈ {spread, total, moneyline}, week). Smooth jointly with a tensor-product P-spline penalty: λ_market (spread and total weights share structure — a model good at spreads is often decent at totals) and λ_time (weights evolve slowly week to week, with the BOA updates providing the innovations). Tune (λ_market, λ_time) by discounted validation loss. Hypothesis: joint smoothing beats per-market BOA because it borrows strength across correlated markets while still adapting — the paper's λ→∞ vs λ=0 trade-off, now in two dimensions, with the optimum interior in both.
