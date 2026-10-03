# [1643] Conformal PID Control for Time Series Prediction (arXiv:2307.16895)

**Citation:** Anastasios N. Angelopoulos, Ryan J. Tibshirani, Emmanuel J. Candès (2023). *Conformal PID Control for Time Series Prediction*. arXiv:2307.16895. URL: https://arxiv.org/abs/2307.16895
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: quantile tracker, general controller, Theorem, COVID application, electricity experiment).
**Verdict:** ADAPT — the PID framing subsumes ACI (ledger [1640]) as the "I-only" special case and adds the two missing pieces GSE needs: a PROPORTIONAL term for fast reaction to coverage shocks and a SCORECASTER that anticipates predictable miscoverage (e.g., December weather, post-bye chaos) from observable features. The COVID result (base model 20% coverage → PID 70% at nominal 80% during a 10-week shock stretch) is the template for GSE's December/regime-shift problem.

## 1. Research question
ACI adapts the miscoverage level with a pure integrator — slow to react to sudden distribution shift and blind to predictable structure in upcoming errors. Can we get long-run coverage control with a full PID controller — proportional (react to today's miss), integral (correct persistent bias), derivative/scorecaster (anticipate predictable errors from features) — with a deterministic coverage guarantee for ANY score sequence?

## 2. Dataset / schema
(1) **COVID-19 forecasting**: 4-week-ahead US state-level COVID death forecasts, late 2020 – late 2022; base model = the COVID-19 Forecast Hub ensemble (the model behind CDC communications); scorecaster uses previous forecasts, cases, and deaths from all 50 states. (2) **Electricity**: half-hourly NSW (Australia) demand, May 7 1996 – Dec 5 1998; base = Transformer forecaster; scorecaster = Theta method. Nominal levels: 80% (COVID), 90% (electricity).

## 3. Method / model
**Conformal PID control**: maintain a quantile q_t of the nonconformity score. Basic quantile tracker: q_{t+1} = q_t + η(err_t − α) (this is ACI in score space). General controller: q_{t+1} = q̂_{t+1} + r_t(Σ_i (err_i − α)), where q̂_{t+1} is the **scorecaster** (any forecaster predicting the next score from observable features — e.g., Theta, or a model on cases/deaths) and r_t is a **saturating integrator** (e.g., tan-based saturation) applied to cumulative errors. The P term reacts instantly to misses; the I term kills persistent bias; the scorecaster anticipates.

## 4. Equations & assumptions
- Quantile tracker: `q_{t+1} = q_t + η(err_t − α)`
- General controller: `q_{t+1} = q̂_{t+1} + r_t( Σ_{i=1}^t (err_i − α) )`, r_t saturating (bounded, e.g. tan)
- Long-run error bound (bounded scores |s| ≤ b): `| (1/T) Σ_{t=1}^T (err_t − α) | ≤ (b + η)/(ηT)`
- Theorem: DETERMINISTIC long-run coverage for any score sequence and any scorecaster satisfying boundedness/saturation conditions — no stochastic assumptions at all.
- Assumptions: scores bounded (b < ∞); the saturation function must be increasing, odd-ish, and bounded; feedback (Y_t revealed) still required.

## 5. Features / target
COVID: 50-state cases/deaths/previous forecasts → predicted 4-week-ahead death-forecast score. Electricity: demand history → Theta scorecast. Transfer: GSE weekly features (weather forecasts, injury reports, rest, lookahead/letdown spots) → predicted engine error score.

## 6. Validation design
Online sequential protocol on both datasets. Metrics: running empirical coverage vs nominal, interval width, and behavior during shock periods. Baseline: the base forecaster's own (uncalibrated) intervals.

## 7. Numerical results / baselines
- COVID (nominal 80%): during a 10-week winter shock stretch the base Forecast Hub ensemble missed 8 of 10 — **20% coverage**. The PID controller missed 3 of 10 — **70% coverage**, with intervals that visibly widened as the scorecaster (trained on rising cases/deaths) anticipated the shock. Over the full 2020–2022 horizon, PID tracks nominal while the base model oscillates.
- Electricity (nominal 90%): PID maintains coverage through demand-regime changes where the Transformer's raw intervals fail; the Theta scorecaster adds anticipatory widening before known volatile periods.
- The P-term visibly reacts within 1–2 steps to a miss burst; the saturating integrator prevents the runaway interval explosion that a naive cumulative-error controller would cause.

## 8. Code / data availability
http://github.com/aangelopoulos/conformal-time-series. COVID data via the COVID-19 Forecast Hub (public); NSW electricity demand (public).

## 9. Leakage & limitations
(a) Still needs Y_t revealed each step — weekly games are fine; props/futures with delayed settlement are not. (b) The scorecaster is a free choice, which is also a burden: a bad scorecaster adds noise, and the paper gives limited guidance on scorecaster selection (Theta worked for electricity; 50-state regression for COVID). (c) The saturation function r_t and η are tuning knobs; the paper's defaults may not transfer. (d) Long-run guarantee again says nothing about any finite window — a 17-week NFL season is short for asymptotic comfort. (e) Asymmetric/widened intervals during shocks may look like the engine "panicking" to users — presentation matters.

## 10. GSE overlap
`aci-durable.ts`/`aci-state.ts` implement the I-only controller; NOTHING in GSE implements proportional control or a scorecaster. The engine has all the scorecaster inputs already (weather, injuries, rest) in its feature pipeline. This paper is the direct upgrade path for the ACI implementation audited in ledger [1640].

## 11. GSE implementation spec
(1) **Upgrade ACI → PID**: keep the α_t integrator from [1640]; add P-term η_P·(err_t − α) on the score quantile and a scorecaster q̂_{t+1} = regression of next-week residual-quantile on [weather bucket, QB-change flag, rest differential, December flag, trailing error]; (2) saturating integrator r_t = c·tanh(Σ errors / c) to bound runaway; (3) tune (η_P, η_I, c) on 2023–2024, validate on 2025. Effort: 3–5 days on top of the [1640] audit.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, weekly game margin/total intervals. Online protocol per [1640], now with PID controller. Metrics: long-run coverage error, trailing-4-week local coverage (min over season), mean width, and — the paper's signature — coverage during shock stretches (weeks with ≥2 starting-QB changes or major weather events). Baselines: I-only ACI ([1640]), fixed-α conformal.

## 13. Acceptance / rejection gate
ADAPT if: shock-stretch coverage improves ≥10pp over I-only ACI at ≤115% mean width (the COVID 20%→70% template, scaled to GSE). REJECT the scorecaster component if it adds width without coverage gain — keep the P+I controller (still strictly better than I-only).

## 14. Improvement experiment
**Learned saturation**: the paper hand-picks the saturating function; test learning r_t's scale c from data (larger c in stable regimes, smaller c when the scorecaster fires) — a meta-controller. Also test scorecaster features from the BETTING MARKET (line movement into the weekend predicts engine error — a market-aware scorecaster).

**Verdict:** ADAPT — upgrade GSE's ACI controller to the full PID design (proportional term + saturating integrator + feature-driven scorecaster on weather/injury/rest/December flags); accept on ≥10pp shock-stretch coverage improvement over I-only ACI in the 2023–2025 backtest.
