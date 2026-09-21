# 0623 Load Management and the Healthy-Worker Survivor Effect in the NBA (arXiv:2603.26935v1)

**Citation:** Authors. *Load management and the healthy-worker survivor effect: causal inference for injury risk in the NBA* (arXiv:2603.26935v1). URL: https://arxiv.org/abs/2603.26935
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the MS-PEM (propensity-weighted piecewise-exponential) machinery is the honest way to answer "does load cause injuries" when healthy players self-select into heavy minutes; GSE should port the design to NFL snap/load data before trusting any naive load→injury coefficient.

## 1. Research question
Does recent playing load causally increase injury hazard in the NBA, or does the naive association (heavy recent minutes look *protective*) merely reflect the healthy-worker survivor effect — injured/fragile players getting rested, so that only durable players accumulate load?

## 2. Dataset / schema
- **78,594 player-game records, 771 players, 2,439 injuries**, NBA seasons 2022–23 through 2024–25; overall event rate **3.10%**.
- Public box-score-derived load measures (minutes), injury reports, player/team/game covariates.
- Access: public sources (box scores, injury reports); the paper's assembled panel is not linked as a download.

## 3. Method / model
- **MS-PEM** (marginal structural piecewise-exponential model): (1) logistic participation propensity model → stabilized inverse-probability weights (IPW); (2) piecewise-exponential (Poisson) outcome model on a discretized time grid; (3) spline-based weighted cumulative exposure (WCE) for lagged load effects.
- Design choices: **20 time intervals**, **10-game lag** structure, **5-fold player-grouped cross-validation**, weights **truncated at the 1st/99th percentiles**.
- Comparators: naive Cox model on recent 7-day load; propensity variants (logistic IPW, GBM IPW, ensemble, overlap weights).

## 4. Equations & assumptions
The paper works in the marginal-structural-model framework (Robins): potential-outcome injury hazards under hypothetical load trajectories, identified by IPW under the standard causal assumptions — **consistency, conditional exchangeability (no unmeasured confounding given the public covariates), and positivity**. The weighted cumulative exposure is a spline over the 10 lagged load values. Key stated limitation: with public covariates, latent fitness remains an unmeasured confounder — exchangeability is not fully credible (the authors say this explicitly).

## 5. Features / target
- Exposure: lagged game load (minutes) over the past 10 games, entering via spline WCE.
- Target: injury occurrence (binary event per player-game), modeled as a piecewise-constant hazard.
- Confounders adjusted via propensity: player age, tenure, position, team, rest days, back-to-back indicators, recent injury history (public-covariate set).

## 6. Validation design
- Simulation study with a known true lag-one weight (**+0.004**): naive HWSE-contaminated estimate **−0.023** (wrong sign), the no-selection estimator **+0.0039** (recovers truth) — the method is validated against ground truth in silico.
- Empirical: 5-fold player-grouped CV (no player appears in both train and validation folds); weight truncation diagnostics; propensity-method sensitivity (logistic/GBM/ensemble/overlap).

## 7. Numerical results / baselines
- **Naive Cox on recent 7-day load: HR 0.993, p < 0.001** — falsely implying each extra minute *lowers* injury hazard by 0.7%. This is the healthy-worker survivor effect in one number.
- Empirical naive lag weights: lag 1 **−0.096**, lag 5 **−0.134**, lag 10 **−0.089** (all negative — all misleading).
- Table 5 lag-one weights: naive **−0.094**; logistic IPW **−0.023**; GBM IPW **−0.035**; ensemble **−0.028**; overlap **−0.021**. IPW attenuates the bias toward zero but does not flip the sign with public covariates.
- Penalty sensitivity: cross-validated penalty choice attenuated the naive estimate by only **1–2%**; a lighter α = 0.1 gave **62.8–78.0% attenuation** depending on propensity method — the "causal" answer is sensitive to the penalty.
- Authors' bottom line: with public covariates, latent-fitness confounding cannot be removed; the sign of the true effect remains uncertain.

## 8. Code / data availability
None stated in the extracted text (no repository or data URL). Methods are standard enough to reimplement from the description.

## 9. Leakage & limitations
- The central honest limitation is the authors': **public covariates cannot remove latent-fitness confounding**. The IPW-corrected estimates stay negative; whether that's residual bias or a true protective effect of load (fitness) is unidentified.
- The penalty-sensitivity result (1–2% vs. 62.8–78.0% attenuation) means the headline causal number is fragile — a different regularization choice substantially moves the answer.
- 10-game lag with splines on 2,439 events is a richly parameterized model for the event count; weight truncation at 1st/99th percentiles is doing real work to keep it stable.
- Player-grouped CV is good, but within-player autocorrelation across the 10 lags remains; standard errors likely understate uncertainty.
- External validity to NFL: the mechanism (rest decisions by teams observing private fitness signals) is *stronger* in the NFL (practice reports, load management is less formalized), so the bias direction transfers, but the lag structure and load metric need rebuilding around snaps/contacts.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. The map lists **causal inference** as one of the 15 commissioned ML-brief areas (2026-09-18-ml-research-brief.md, results not yet in repo) — no causal machinery is currently built. The luck layer (turnover luck etc.) is associational, not causal. This is a **new capability** (causal injury-load estimation) that guards the injury-forecasting work in ledgers 0619–0622 against the exact bias this paper names: any GSE load→injury coefficient estimated naively will inherit the survivor effect.

## 11. GSE implementation spec
- Data: nflverse (snaps, touches, routes as load), public injury reports and practice participation (the participation/selection mechanism), player/team/week covariates.
- Build: replicate MS-PEM — (1) participation propensity (did the player practice fully / play?) via gradient boosting on observables; (2) stabilized IPW, truncated 1st/99th; (3) piecewise-exponential injury-hazard model with spline weighted cumulative exposure over lagged weekly loads (4–8 week lags for football).
- Use the causal estimates as *sanity bounds* on the injury-forecasting features in ledgers 0619/0622: any load feature whose naive coefficient flips sign under IPW gets flagged as survivor-contaminated.
- Effort: ~1–2 weeks (panel construction + propensity + WCE plumbing).

## 12. Reproducible test
Dataset: nflverse 2020–2025 player-week panel with snap-load lags and injury-report events. Protocol: (a) naive Cox/logistic of injury on lagged load — expect the HWSE signature (negative or null coefficients); (b) MS-PEM as specified. Success criterion: replicate the paper's *pattern* — naive estimates negative near-zero, IPW attenuates them by ≥ 50% toward zero — on NFL data. This validates the bias mechanism transfers before any causal claim is made.

## 13. Acceptance / rejection gate
ADOPT the MS-PEM design as GSE's causal check iff the replication reproduces the attenuation pattern (IPW moves naive lag weights ≥ 40% toward zero) on 2020–2024 data with player-grouped CV. If naive and IPW estimates coincide (no detectable survivor effect in NFL data), the machinery is unnecessary — reject the build but keep the diagnostic. Gate set before running the test.

## 14. Improvement experiment
Instrument the propensity model with **team-level rest-policy instruments** (e.g., a team's historical tendency to rest veterans in meaningless late-season games, Thursday-night short-rest scheduling quirks) as an instrumental-variable check on the IPW answer. Why it might win: the paper's IPW rests on untestable exchangeability; a team-policy instrument varies the *selection mechanism* exogenously, giving a second, differently-biased estimate — if IPW and IV agree on sign, the causal claim is far more credible than either alone.
