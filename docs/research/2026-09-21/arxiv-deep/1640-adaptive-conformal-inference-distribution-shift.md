# [1640] Adaptive Conformal Inference Under Distribution Shift (arXiv:2106.00170)

**Citation:** Isaac Gibbs, Emmanuel J. Candès (2021). *Adaptive Conformal Inference Under Distribution Shift*. arXiv:2106.00170. NeurIPS 2021. URL: https://arxiv.org/abs/2106.00170
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: method, Theorem 2, stock-volatility application, US-election application, discussion).
**Verdict:** ADAPT — the α_t feedback controller is the right online layer for GSE's weekly publishing loop: it restores nominal coverage when the market/engine regime drifts, with a clean distribution-free long-run guarantee. GSE already has `apps/web/lib/calibration/aci-durable.ts` + `aci-state.ts`; this paper supplies the theory and tuning protocol (γ selection) to validate or fix that implementation.

## 1. Research question
Standard conformal prediction assumes exchangeability, which fails under distribution shift (market regime changes, election reporting order, volatility clustering). Can we adaptively choose the miscoverage level α_t at each time step — expanding intervals when we've been missing, shrinking when we've been covering — so that long-run empirical coverage converges to the nominal level, with NO assumptions on the data-generating process?

## 2. Dataset / schema
(1) **Stock volatility**: daily returns of 12 S&P-500 stocks; GARCH(1,1) fitted on a rolling 1,250-trading-day window; forecast target = next-day absolute return (volatility proxy). (2) **2020 US presidential election**: ~3,000 counties; features = demographics (ethnicity, age, sex, median income, education); target = two-party vote share; counties ordered by timezone to simulate the real election-night reporting shift (early East-coast returns → later West-coast). Both are real, non-exchangeable sequences.

## 3. Method / model
**Adaptive Conformal Inference (ACI)**: at time t, form the conformal interval at level α_t, observe whether it missed (err_t = 1{Y_t ∉ C_t}), then update α_{t+1} = α_t + γ(α − err_t). Missing pushes α_t down (wider intervals); covering pushes it up (narrower). This is online gradient descent on the pinball/quantile loss. Initialization α_1 = α, step size γ > 0 (experiments use γ = 0.005). The paper also discusses an ACI-DF variant and connections to quantile tracking.

## 4. Equations & assumptions
- Update: `α_{t+1} = α_t + γ(α − err_t)`, `err_t = 1{Y_t ∉ C_{α_t}(X_t)}`
- Long-run guarantee (Theorem 2, NO distributional assumptions — holds for ANY sequence): `|(1/T) Σ_{t=1}^T err_t − α| ≤ (max(α_1, 1−α_1) + γ) / (Tγ)`
- Intuition: the controller is a discrete integrator; average miscoverage converges to α at rate O(1/(Tγ)).
- Only requirement: the response Y_t must be revealed after each prediction (full feedback).

## 5. Features / target
Volatility app: GARCH(1,1) fitted forecasts; score = relative absolute residual |Y_t − f̂_t| / σ̂_t. Election app: demographic features → predicted Dem vote share; nonconformity = absolute residual. Transfer: GSE engine point forecasts → margin/total residuals.

## 6. Validation design
Sequential (online) protocol — no train/test split; the method is evaluated on its running coverage. Volatility: local coverage computed over trailing 500 observations, plotted over time for the 4 of 12 stocks where fixed-α conformal visibly failed. Election: running coverage of 90% intervals as counties report in timezone order. Metric: time-averaged empirical coverage vs nominal, plus interval-width behavior.

## 7. Numerical results / baselines
- Volatility (4 shown stocks, nominal 90%): fixed-α conformal's local coverage oscillates and sags well below 90% during volatility regimes; **ACI tracks ~90% throughout**, widening intervals exactly when volatility spikes.
- Election (nominal 90%): fixed conformal coverage troughs at timezone transitions (reporting-order shift); **ACI maintains ≈90% coverage across the whole sequence**, expanding intervals as the electorate composition shifts.
- Guarantee is tight in the right sense: the O(1/(Tγ)) bound is deterministic and assumption-free; γ = 0.005 is the empirical sweet spot in both applications (larger γ adapts faster but intervals oscillate; smaller γ is sluggish).

## 8. Code / data availability
Method is ~5 lines on top of any conformal interval routine. No dedicated repo named in the paper; S&P data via standard sources, election data from public county returns. The algorithm is fully specified by the update rule.

## 9. Leakage & limitations
(a) Requires Y_t revealed at each step — GSE gets this weekly (game results), but mid-week props and futures have delayed/no feedback; the paper flags delayed and batched feedback as unresolved (Section: discussion of lagged feedback). (b) Guarantee is LONG-RUN average: any finite window can undercover badly; with γ=0.005 adaptation takes hundreds of steps — an NFL season is ~272 games, so per-team or per-slate tracking adapts within a season but slowly. (c) α_t can drift outside [0,1] in principle; clipping is used in practice but the theory needs the unclipped form — small mismatch. (d) Local coverage (the quantity GSE actually cares about week-to-week) has NO guarantee; only the time average is controlled. (e) No comparison to simply refitting/recalibrating on a rolling window (the practitioner's default).

## 10. GSE overlap
`apps/web/lib/calibration/aci-durable.ts` + `aci-state.ts` already implement an ACI-style controller in GSE. No ledger yet reads the source paper against that implementation — this ledger fills that gap. Related: ledger [1639] CQR gives the base intervals ACI would adapt; the RPCP bridge (`apps/web/lib/calibration/rpcp-conformal-bridge.ts`, `docs/ops/RPCP_AND_CONFORMAL_BRIDGE.md`) handles the selective-publishing side.

## 11. GSE implementation spec
(1) **Audit aci-durable.ts / aci-state.ts against the paper**: verify the update is exactly α_{t+1} = α_t + γ(α − err_t) with err_t computed on the interval the engine actually PUBLISHED (not a post-hoc interval); verify γ default and α-clipping match the paper's recommended practice. (2) **Weekly online loop**: after each slate resolves, update a per-market (spread/total/moneyline) α_t; publish next week's intervals at the adapted level. (3) **γ selection**: backtest γ ∈ {0.001, 0.005, 0.01, 0.02} on 2023–2025, scoring long-run coverage error + mean interval width. Effort: 2–3 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, game-level published intervals for margin and total. Online simulation: step through games chronologically, update α_t per market after each game, record err_t. Metrics: |mean(err) − α| over the full run (target ≤ the paper's bound), trailing-50-game local coverage min/max, mean interval width vs fixed-α baseline. Baselines: fixed-α conformal, rolling-window recalibration (recalibrate every 4 weeks on trailing 200 games).

## 13. Acceptance / rejection gate
ADAPT if: long-run coverage error ≤ 1.5× the paper's O(1/(Tγ)) bound AND mean interval width ≤ 110% of fixed-α baseline (adaptation shouldn't cost much width). REJECT pure-ACI in favor of the conformal-PID variant (ledger [1643]) if weekly local coverage sags >5pp below nominal for 4+ consecutive weeks (integrator-only control is too slow for GSE's short seasons).

## 14. Improvement experiment
**Regime-aware γ**: replicate the paper's election-ordering insight — GSE's shift isn't smooth, it's event-driven (QB injury, coaching change, weather regime). Test a two-γ controller: γ_small in calm weeks, γ_large for 3 weeks after a detected changepoint (compare vs ledger [1641] EnbPI's sliding-window approach). Score on post-changepoint local coverage recovery time.

**Verdict:** ADAPT — adopt ACI as GSE's online coverage controller for published intervals, starting with an audit of `aci-durable.ts`/`aci-state.ts` against the paper's exact update rule and a γ backtest on 2023–2025; prefer the conformal-PID extension (ledger [1643]) if weekly local coverage stays soft.
