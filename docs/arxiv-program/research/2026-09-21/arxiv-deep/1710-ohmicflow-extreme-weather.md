# [1710] OhmicFlow: Forecasting transit passenger flow under extreme weather disruptions via Ohm's law (arXiv:2608.28598)

**Citation:** Li, T., Liu, X. & Zhao, Z. (Univ. of Hong Kong, 2026). *OhmicFlow: Forecasting transit passenger flow under extreme weather disruptions via Ohm's law*. arXiv:2608.28598. URL: https://arxiv.org/abs/2608.28598
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv source, Sections 1–7, ~140k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the counterfactual "voltmeter" trick — re-running a model with disrupted inputs swapped for normal-weather references to infer latent demand — is a directly implementable recipe for GSE's weather-neutral team-strength estimation, and the future-aware attention over forecast weather plus the Ohmic demand/impedance/flow decomposition are portable patterns, but the transit-circuit analogy itself doesn't transfer.

## 1. Research question
How to forecast transit OD passenger flow under extreme weather events (typhoons, rainstorms) when purely data-driven models overfit normal patterns and fail on rare disruptions?

## 2. Dataset / schema
10 years of Shenzhen Metro data covering **17 extreme weather events**; per OD pair: historical flow, anticipated weather state W_t, anticipated disrupted travel time τ, expected normal flow (same weekday/hour from most recent undisrupted week), static station/OD features; chronological train/test splits over three event periods (Events 1–5, 6–10, 11–14).

## 3. Method / model
OhmicFlow: (a) **Ammeter** — future-aware TFT-GAT spatiotemporal backbone predicting disrupted flow Î (quantiles 0.1/0.5/0.9); (b) **Voltmeter** — weight-shared replica with disrupted travel time replaced by normal reference (10th percentile of historical same-hour travel time) to **counterfactually infer latent demand Û**; (c) **PTC thermistor** — dynamic impedance R̂ from supply contraction (base impedance) × congestion amplification [1 + α(I_in/η)²]; joint training with Ohmic consistency loss Î ≈ Û/R̂ + KCL inflow-conservation supervision + soft physical priors (U ≥ I).

## 4. Equations & assumptions
- Quasi-steady per time window: I = U/R; normal operation R = 1 (minimum impedance), R ≥ 1.
- R_k,t = R^b_k,t [1 + α_i,t (I^in_i,t/η_i,p)²] + 1; travel time → bounded efficiency e = ω/τ, relative efficiency Δe = max(ω/τ̃⁻¹ − ω/τ⁻¹, 0).
- Forward-looking attention over Ω = T_h ∪ T_f (no causal masking) so predictions use anticipated warnings.
- Assumes latent demand realizable as flow under normal impedance; congestion felt at origin station.

## 5. Features / target
Inputs: historical flow/weather/travel-time, forward-looking weather + anticipated travel time + expected normal flow, static infrastructure features, OD-centered 10-nearest-neighbor graphs. Targets: future flow Î, latent demand Û, impedance R̂ jointly.

## 6. Validation design
Three chronological training settings; 9 baselines (LSTM, Transformer, STGCN, DCRNN, GWN, GMAN, STTN, PI-MPN, PAG-STAN) with unified embeddings/quantile heads; metrics MAE/RMSE/sMAPE + MPIW/PICP; ablation of Ohmic and KCL constraints; OD-group robustness (5×5 volume×volatility); perturbation of forward weather inputs (mutation + temporal shift).

## 7. Numerical results / baselines
- OhmicFlow beats all baselines on **all three** settings: MAE gains **38.6% / 18.0% / 17.1%**, RMSE 38.2%/13.1%/16.3%, sMAPE 31.8%/22.9%/19.0% over best baseline.
- Uncertainty: narrowest intervals (MPIW 13.40/12.12/12.82) with highest/near-highest coverage (PICP 93.6%/93.4%/94.8%) — best upper-left frontier.
- Ablation: Ohmic constraint is the main driver (removing it collapses calibration); gains **scale with disruption severity** (slopes < 1 vs vanilla — bigger wins on harder events).
- Transplanting the Ohmic modules onto other backbones improves most of them (except already-strong PAG-STAN on accuracy, though its uncertainty still improves).
- Robustness: positive gains in nearly all 25 OD volume×volatility groups; worst forward-input perturbation degrades RMSE only **2.30%** (weather timing) / 0.31% (travel time).
- Case studies (Typhoons Nida 2016, Saola 2023): captures anticipatory demand shifts before landfall warnings that baselines miss.

## 8. Code / data availability
No code/data links in text; method fully specified; Shenzhen Metro data proprietary.

## 9. Leakage & limitations
"Anticipated" travel times approximated from historical analogs (not true forecasts); no public code; transit-specific congestion mechanics; 17 events is small; expected-normal-flow reference leaks some post-event information by construction.

## 10. GSE overlap
New to the corpus: no other ledger does **counterfactual weather-neutral inference** (re-running with neutral inputs). Complements 1702/1708 (decision-oriented forecast evaluation — this adds the inference-side trick) and 1703 (mixed-effects weather modeling — this is the nonlinear/counterfactual counterpart). The TFT future-aware attention pattern is new; the circuit analogy is not transferred.

## 11. GSE implementation spec
Build `weather/counterfactual.py`: (a) train GSE's game-outcome model with weather features included; (b) at inference, run each game **twice** — factual (actual forecast weather) and counterfactual with weather features replaced by neutral references (70°F, wind 5 mph, no precip; the paper's voltmeter trick); (c) the counterfactual output = **weather-neutral team strength** for ratings, the factual output = game prediction; (d) their difference = the model's estimated weather edge per game, usable as a betting-signal diagnostic and for weather-line shopping. Effort: ~2–3 days on top of the existing engine.

## 12. Reproducible test
Dataset: 2022–2024 NFL games with weather. Model: gradient boosting on team-strength + weather features. Test: correlation of counterfactual (neutral-weather) ratings with next-game performance vs factual ratings; weather-edge (factual − counterfactual) vs actual weather-game residuals. Expectation per the paper: counterfactual ratings are more stable week-to-week; the weather-edge term explains residual variance on extreme-weather games.

## 13. Acceptance / rejection gate
ADOPT weather-neutral ratings if counterfactual ratings predict next-game margin with ≥ 0.3 points lower MAE than factual ratings on 2024 holdout (stability wins), AND the weather-edge term has the correct sign on ≥ 60% of extreme-weather games. REJECT if the counterfactual pass just reproduces the no-weather model (then it's a complicated way to drop features — verify the counterfactual differs from a weather-blind model by construction check first).

## 14. Improvement experiment
Fuse with 1708's vendor blending: run the counterfactual pass under **each** weather vendor's feed and under the blended feed; the spread of counterfactual ratings across vendors = weather-data uncertainty in team strength. Hypothesis: games where vendors disagree on the counterfactual rating are games where GSE's edge is least trustworthy — use disagreement as an abstention/pick-sizing signal (links to the pick-selection lane). Success = positive correlation between vendor-disagreement and GSE prediction error on 2024 holdout; that turns a weather-data diagnostic into a staking input, which is exactly the kind of cross-paper synthesis the program is for.

**Verdict:** ADAPT — the counterfactual voltmeter trick for weather-neutral strength estimation plus future-aware weather attention port directly to GSE's engine; the transit-circuit framing stays behind.
