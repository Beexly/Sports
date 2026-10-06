# [1552] Forecast with Forecasts: Diversity Matters (arXiv:2012.01643)

**Citation:** Li, X., Kang, Y., Li, F., Zhang, J. and Petropoulos, F. (2021). *Forecast with Forecasts: Diversity Matters*. arXiv:2012.01643. URL: https://arxiv.org/abs/2012.01643
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 25 pages, all sections incl. Tables 1–3, Figures 1–4, Appendices — no appendices beyond references; Equations 1–6 read in full).
**Verdict:** ADAPT — forecast diversity (pairwise disagreement among ensemble members' forecasts) is a cheap, interpretable, horizon-side meta-feature for learning combination weights, and maps directly onto GSE's ensemble: compute diversity from our models' actual forecast distributions rather than hand-building time-series features.

## 1. Research question
Can the pairwise diversity among the forecasts produced by a pool of methods serve as the *only* meta-feature for learning optimal forecast combination weights, replacing FFORMA's 42 hand-crafted historical time-series features? The paper frames this as "forecasting with forecasts": instead of linking weights to in-sample characteristics of the series, weights are learned as a function of how much the candidate methods *disagree with each other* on the out-of-sample forecast horizon, motivated by the ambiguity decomposition of ensemble MSE (Krogh & Vedelsby, 1994): MSE_comb = Σ wᵢ MSEᵢ − Σ_{i<j} wᵢwⱼ Div_{i,j}.

## 2. Dataset / schema
- **M4 competition dataset** (Makridakis et al., 2020): 100,000 time series across yearly (23,000), quarterly (24,000), monthly (48,000), weekly (359), daily (4,227), hourly (414) frequencies, from demographics, finance, industry domains. Series lengths range: yearly [13, 835], quarterly [16, 866], monthly [42, 2794], weekly [80, 2597], daily [93, 9919], hourly [700, 960]. Horizons: 6 / 8 / 18 / 13 / 14 / 48. Publicly available in the M4comp2018 R package.
- **FMCG case study**: monthly sales of SKUs for a major North American food manufacturer in USA + Canada, 51 periods (April 2013 – June 2017). After trimming leading zeros and dropping series with <24 months training history, 955 unique SKU×location combinations. Forecast horizon 12; training periods 1–27, validation 28–39 (used to train the combination model), test 40–51.
- No GSE/NFL data used; all series are economic/business, not sports.

## 3. Method / model
Two-phase framework ("Forecast with Forecasts", FwF), per Figure 2 and Algorithm 1:
- **Phase 1 – Model training.** For each reference series, split into training/testing periods (test length = forecast horizon). Fit the M=8 method pool on training, produce forecasts on testing. Extract the diversity vector Divₙ (see §4): 28 pairwise diversities among the 8 methods' *upper* 95% prediction intervals + 28 among the *lower* intervals = 56 features per series. (Point-forecast diversity is deliberately omitted: all point forecasts are midpoints of the intervals and "do not contain more information than the upper and lower intervals.") Compute each method's error on the test period with a joint cost (see §6).
- **Weight model.** Train XGBoost to output per-method scores y(Divₙ)ᵢ, then softmax-transform: w(Divₙ)ᵢ = exp{y(Divₙ)ᵢ} / Σᵢ exp{y(Divₙ)ᵢ}. Optimization: argmin_w Σₙ Σᵢ w(Divₙ)ᵢ · Errₙᵢ (Equation 4). Combination weights are optimized **separately per frequency**, using that frequency's M4 series as reference data.
- **Phase 2 – Forecasting.** For a new series: produce the 8 pool forecasts, extract the 56 diversity features, feed through the trained XGBoost to get weights, combine: fₙ = (1/M)Σᵢ wₙᵢ fₙᵢ (point), fⁿᵘ = (1/M)Σᵢ wₙᵢ fⁿᵘᵢ (upper), fⁿˡ = (1/M)Σᵢ wₙᵢ fⁿˡᵢ (lower) — Equation 5. (Note: the paper's Equation 5 carries a 1/M factor that contradicts the softmax weights summing to 1; implementation would use Σ wᵢ fᵢ directly.)
- **Pool (Table 1):** auto.arima, ets, tbats, stlm with AR modeling, random walk with drift, thetaf, naïve, snaïve — all from R `forecast` package v8.12. Explicitly excludes the neural network nnetar because it does not produce prediction intervals.
- **FD variant:** combines the 42 FFORMA statistical features + 56 diversity features as inputs to XGBoost (tests complementarity).

## 4. Equations & assumptions
- Ambiguity decomposition (Krogh & Vedelsby): MSE_comb = Σᵢ wᵢ MSEᵢ − Σ_{i<j} wᵢ wⱼ Div_{i,j}, where Div_{i,j} = (1/H) Σ_h (f_{ih} − f_{jh})², pairwise squared forecast disagreement.
- Scale-normalized diversity, Equation (3): Div_{i,j} = [Σ_h (f_{ih} − f_{jh})²] / [Σ_{p<q} Σ_h (f_{ph} − f_{qh})²] — normalizes so diversities sum to 1 across pairs, making series comparable across scales.
- Weight optimization: argmin_w Σₙ₌₁ᴺ Σᵢ₌₁ᴹ w(Divₙ)ᵢ · Errₙᵢ (Eq. 4); softmax parameterization w(Divₙ)ᵢ = exp{y(Divₙ)ᵢ}/Σᵢ exp{y(Divₙ)ᵢ}.
- Combination: fₙ = (1/M)Σᵢ wₙᵢ fₙᵢ, plus upper/lower variants (Eq. 5).
- Joint cost function, Equation (6): Err = ½ (MASE/MASEnaive2 + MSIS/MSISnaive2), where naive2 = naïve on seasonally adjusted data (M4 convention). Same weights used for point and interval forecasts.
- **Assumptions:** (a) the reference set's diversity→weight mapping transfers to new series; (b) out-of-sample diversity computed on the *forecast horizon itself* is available (it is — diversity needs only the forecasts, not the actuals); (c) weights sum to 1 via softmax (non-negative, convex combination); (d) XGBoost meta-learner generalizes across series within a frequency.

## 5. Features / target
- **Features:** 56 diversity features per series = 28 pairwise diversities from upper prediction intervals + 28 from lower prediction intervals, over the 8-method pool (C(8,2)=28). Scale-normalized per Equation 3. No historical time-series features used (in the Diversity-only variant).
- **Target (training):** per-method weighted error Errₙᵢ (Eq. 6, joint MASE+MSIS cost), minimized via XGBoost → weights.
- **Prediction target:** future values y_{T+h}, h=1..H, as point forecasts and 95% prediction intervals; horizon per frequency (M4: 6/8/18/13/14/48).

## 6. Validation design
- **M4 evaluation:** For each frequency, the paper's own method-pool forecasts are generated on each series' test window (length = horizon); the meta-model is trained on reference data = that frequency's M4 series, then applied to produce final forecasts. Baselines: **FFORMA** (Montero-Manso et al. 2020, same pool/cost for comparability), **Simple Average (SA)** of the 8 pool forecasts, and **FD** (FFORMA+Diversity features). Metrics: MASE for point forecasts, MSIS for 95% intervals. Statistical significance: Multiple Comparisons from the Best (MCB, Koning et al. 2005) on MASE ranks, per frequency and overall.
- **Trade-off curves:** 60%–99% confidence-level intervals; upper coverage (proxy for inventory service level) vs. scaled upper PI (proxy for holding cost), by frequency.
- **FMCG case study:** combination model trained on validation forecasts (periods 28–39) only — 955 series — then applied to test (periods 40–51). Splits are time-ordered.
- **Leakage caveat (stated by authors):** M4 results are "not directly comparable with any of the original contestants" — postsample data enables experimentation/tuning unavailable to M4 entrants.

## 7. Numerical results / baselines
Table 2 (mean MASE, overall and per frequency — Overall / Yearly / Quarterly / Monthly / Weekly / Daily / Hourly):
- **SA:** MASE 1.9040 / 3.6907 / 1.2432 / 0.9813 / 6.3826 / 5.8921 / 3.3319; MSIS 17.5077 / 42.0776 / 9.9248 / 8.3012 / 22.4778 / 31.5910 / 11.4214
- **FFORMA:** MASE 1.5586 / 3.0842 / 1.1220 / 0.8980 / 2.2309 / 3.2464 / 0.8822; MSIS 14.5934 / 32.0185 / 9.2388 / 7.8189 / 16.0496 / 27.7694 / 6.6161
- **Diversity:** MASE **1.5478** / **3.0670** / **1.1095** / **0.8915** / 2.2744 / **3.2296** / **0.8540**; MSIS **14.0197** / **30.3312** / **8.7805** / **7.6385** / 16.4015 / 28.0220 / **6.3587**
- **FD:** MASE 1.5507 / **3.0615** / 1.1096 / 0.8997 / **2.2639** / 3.2345 / 0.8574; MSIS 14.0254 / 30.3980 / 8.7995 / **7.6248** / **16.0936** / **27.8723** / **6.3145**
- Bold = Diversity beats FFORMA. Overall: Diversity MASE 1.5478 vs FFORMA 1.5586 vs SA 1.9040; Diversity MSIS 14.0197 vs FFORMA 14.5934 vs SA 17.5077. Paper states Diversity's mean MASE is 18.71% lower and MSIS 19.92% lower than SA overall. Diversity beats FFORMA in most frequencies except weekly and daily (MASE).
- **MCB tests:** Diversity vs FFORMA difference not statistically significant (overall mean ranks: FD 2.36, Diversity 2.40, FFORMA 2.40, SA 2.85). But **FD significantly better than Diversity, FFORMA, and SA overall** — diversity (future information) and historical features complement each other.
- **Trade-off curves:** Diversity offers the best upper-coverage vs. scaled-upper-PI trade-off in all frequencies except yearly (where Theta has lower holding cost but cannot reach high coverage).
- **FMCG case (Table 3):** Diversity MASE 0.9365 / MSIS 8.0066; FD MASE 0.9367 / MSIS 7.9189; FFORMA 0.9599 / 8.1254; SA 0.9555 / 8.5085. Diversity beats FFORMA on both metrics with only 955 training series — no massive reference set needed.

## 8. Code / data availability
None stated. No code repository link in the paper. Data: M4 dataset is public (M4comp2018 R package); FMCG sales data is proprietary to a "major North American food manufacturer" (not shared). Method pool implemented in R `forecast` package v8.12.

## 9. Leakage & limitations
- **Authors' own admission:** M4 results benefit from postsample experimentation/tuning; cannot claim it would have beaten FFORMA in the live M4 competition.
- **Horizon-side features:** diversity is computed from forecasts on the forecast horizon itself — legitimate (no actuals needed) but means the "meta-features" are a function of the current pool's outputs, which drift as the pool is updated; the trained XGBoost weight map must be retrained when pool members change.
- **Equation 5 anomaly:** the paper's combination formula carries a 1/M factor that contradicts the softmax weights (which sum to 1) — likely a typographical error; reimplementation must use Σ wᵢfᵢ.
- **Limitation stated:** uses *all* pool forecasts without selection; weights near zero still included; no pooling of the most heterogeneous subset (selection-pooling-combination extension left as future work). Impact of adding/removing pool members untested.
- **Low-diversity regime:** if all models agree, the method degenerates to near-equal weights — safe but uninformative.
- **No probabilistic-density combination** — only point + intervals; extension to full predictive densities (e.g., via KL-divergence-based diversity) is future work.
- External validity to NFL: M4 series are smooth economic/demographic series, nothing like sports; the FMCG case shows transfer to short retail series but nothing adversarial or market-driven. Sports forecasts have heavy tails and regime shifts that could break the learned diversity→weight map.
- XGBoost hyperparameters for the meta-learner are not reported.

## 10. GSE overlap
Existing-research map (docs/research/2026-09-21/arxiv-program/state/existing-research-map.md): no GSE work currently learns ensemble combination weights from forecast diversity — HONEST_CEPT is sequential causal-skill testing, unrelated. GSE's engine (model v5.2.7, per MEMORY) generates picks from an ensemble of sub-models; how those sub-model forecasts are weighted today is not documented as diversity-driven, so this is a **new capability**, not a duplicate. It complements ledger [1548] WIRED (which weights experts by past CRPS and models dependence separately): WIRED weights on *historical* skill; this paper weights on *current-horizon disagreement*. Ledger [1551] BPS (outcome-dependent pools) is Bayesian and orthogonal.

## 11. GSE implementation spec
- **Data sources:** GSE engine's existing sub-model forecast archive (need per-model game-level forecasts + prediction intervals for spread/total/moneyline or team-strength outputs; if intervals aren't stored, approximate disagreement from point forecasts as a v1). Backtest window: 2023–2025 NFL seasons from nflverse + engine logs.
- **Feature engineering:** For each game slate (or week), compute the pairwise diversity matrix among the K engine sub-models' forecast vectors over the slate horizon: Div_{i,j} = Σ_h (f_{ih}−f_{jh})² / Σ_{p<q} Σ_h (f_{ph}−f_{qh})² (Eq. 3, adapted to game outcomes — e.g., predicted cover probabilities or point differentials per game). C(K,2) features per slate. No historical series features needed.
- **Model:** gradient-boosted trees (XGBoost/LightGBM) mapping slate diversity vector → per-model softmax weights, trained by minimizing weighted realized error (Eq. 4) with a joint cost: scaled log-loss (calibration) + scaled Brier (accuracy), mirroring Eq. 6's dual-cost design.
- **Serving:** weekly pipeline — after sub-models emit slate forecasts, compute diversity, predict weights, publish weighted consensus + intervals. Retrain meta-learner each offseason and refresh mid-season if a pool member is added/retired.
- **Effort:** 1–2 engineer-weeks for v1 (point-forecast diversity only), plus interval storage work if upper/lower diversity is wanted.

## 12. Reproducible test
Backtest on GSE's 2023–2025 NFL regular-season slates (n=~800 games): (a) baseline = simple average of sub-model cover probabilities; (b) challenger = diversity-weighted combination via the XGBoost meta-learner trained on 2023–2024 slates, applied to 2025 slates (strictly time-ordered). Metrics: mean log-loss and Brier score on ATS outcomes vs. closing lines, plus calibration slope. Also compare vs. a static skill-weighted average (WIRED-style) to isolate the diversity signal.

## 13. Acceptance / rejection gate
ADOPT the diversity-weighted combiner if, on the held-out 2025 season, it beats the simple-average baseline by ≥2% relative log-loss (e.g., 0.680 → ≤0.666) **and** beats the static skill-weighted baseline by ≥1% relative, with calibration slope within [0.9, 1.1]. REJECT (keep SA) if it fails either gate or the meta-learner's feature importances concentrate on <3 pairs (degenerate map).

## 14. Improvement experiment
**Quantile-level diversity for CLV-weighted combination.** Extend diversity to per-quantile disagreement (τ = 0.1…0.9 of each sub-model's predictive distribution) and train the meta-learner with a cost that weights recent games by closing-line-value capture (beat-the-close indicator). Hypothesis: disagreement in the *tails* (not the mean) is where models carry orthogonal signal about upsets and blowouts — exactly the games where GSE's edge over the market is largest. This goes beyond the paper (which uses only upper/lower interval diversity) by making the weight map tail-aware and market-relative.
