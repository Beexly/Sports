# [2043] AlphaForge: A Framework to Mine and Dynamically Combine Formulaic Alpha Factors (arXiv:2406.18394)

**Citation:** Hao Duly et al. (2024). *AlphaForge: A Framework to Mine and Dynamically Combine Formulaic Alpha Factors*. arXiv:2406.18394v5. URL: https://arxiv.org/abs/2406.18394
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~9,400 words).
**Verdict:** ADAPT

*Why:* the generative-predictive miner + dynamic factor-timing combination is the best end-to-end alpha-mining pipeline in this lane; adapt from stock panel to team-game panel, and replace fixed annual retraining with per-week re-selection.

## 1. Research question
Can deep learning mine formulaic alpha factors better than genetic programming (GP), deep symbolic optimization (DSO), or RL — and can a factor-timing combination model fix the "inconsistent performance of fixed-weight factor combos" by dynamically re-weighting factors on recent performance? Two-stage answer: a generative-predictive network mines a diverse "factor zoo"; a dynamic combination model re-selects/re-weights the top-N factors at each time step using their recent IC/ICIR/RankIC.

## 2. Dataset / schema
CSI 300 and CSI 500 constituent daily stock panels, downloaded via Qlib (public data). Train: 2010-01-01–2016-12-31; validation: 2017; test: 2018; then the whole procedure rolled annually with the year before each test year as validation, five training sessions covering test years 2018–2022. Label: Ref(VWAP,−21)/Ref(VWAP,−1) − 1 (a 20-day forward VWAP return, "more closely reflecting real-world scenarios"). Raw features: daily OHLCV + VWAP (6 fields) feeding ts_* operators.

## 3. Method / model
**Stage 1 — mining:** A predictor network P(x) (MLP-style) learns the mapping from a formula's one-hot encoding x ∈ {0,1}^{D×S} (D = operator/feature count, S = max formula length) to its fitness score; trained with MSE-ish loss L_P = sqrt(1/n Σ (P(x_i) − fitness(x_i))²) on a library of random factors evaluated by fitness function π. Then a generator network G is trained to maximize predicted fitness: sample z_1, z_2 ~ N(0,1)^Q, produce one-hot matrices x_i = M(G(z_i)) via a masking/differentiable-sampling M, loss L_G combining predicted fitness maximization and a diversity penalty between the two sampled formulas. Parsed formulas passing qualification (IC/validity thresholds) and not already in the zoo are added; loop until TargetFactorNum (100) reached → "factor zoo" Z = {f_1,…,f_k}.
**Stage 2 — dynamic combination:** at each time t, using the preceding n days, re-score every zoo factor on recent metrics (IC, ICIR, RankIC), re-rank and select top-N (best N=10 of 100 in their setting), then fit a fresh linear model on the latest data to predict current combined weights; the linear "Mega-Alpha" is the day's signal. The zoo itself is frozen after stage 1; only selection/weights move. Explicitly argues linear (not nonlinear) combination for overfitting control and explainability, and cites the factor-performance momentum effect (Ehsani & Linnaimaa 2022) as justification for recency weighting.

## 4. Equations & assumptions
- Predictor loss: L_P = sqrt( (1/n) Σ_{i=1}^n (P(x_i) − fitness(x_i))² ).
- Generator: x_1 = M(G(z_1)), x_2 = M(G(z_2)), z ~ N(0,1)^Q; L(θ_G) = L_G(z_1, z_2, x_1, x_2, θ_P) = −predicted fitness + diversity penalty (exact diversity term in supplement).
- Fitness π(x, Z, X, Y): IC of the factor vs. label with a penalty for correlation against the existing zoo Z (novelty requirement).
- Combination: Mega-Alpha_t = Σ_{j∈top-N_t} w_{j,t} f_j, weights from OLS on trailing window; selection metrics: IC, RankIC, ICIR.
- Assumptions: formula space {0,1}^{D×S} covers useful signals; predictor generalizes fitness to unseen formulas; factor-performance momentum holds (recent winners keep winning short-term); linear combination avoids overfitting; label choice (forward VWAP return) is the right trading target.

## 5. Features / target
Input features: 6 raw price/volume fields (open, high, low, close, volume, VWAP) + ts_* time-series operators (ts_corr, ts_cov, ts_min/max/std/mad/var, S_log1p, Inv, Ref, decay-style) with lookback windows up to 50 days. Target: Ref(VWAP,−21)/Ref(VWAP,−1)−1 (20-trading-day forward return from VWAP). Evaluation metrics: IC, RankIC (stock-selection ability), ICIR.

## 6. Validation design
Time-ordered rolling protocol designed to mimic live investment: initial train 2010–2016 / val 2017 / test 2018, then retrained annually so test covers 2018–2022 with one-year validation immediately before each test year (5 sessions). Baselines: formulaic miners (GP with IC objective, DSO symbolic regression, RL factor-mining of Yu et al. 2023, plus a "Static" ablation = their miner with the RL-style fixed combination), and ML models (XGBoost, LightGBM, MLP). Each run repeated 5 times (reported with std). Ablation on pool size ∈ {1,10,20,50,100}. Plus a 5-year simulated-trading backtest (Q4) and an industry-professional user survey (supplement).

## 7. Numerical results / baselines
Table 1 (IC %, RankIC %; means over 5 runs, std in parens):
- CSI 300: XGB 0.41/1.63; MLP 1.22(0.16)/1.75(0.28); LGBM 0.84/1.85; GP 1.29(0.44)/2.72(0.58); DSO 2.55(0.69)/3.88(1.12); RL 2.09(0.26)/2.72(0.42); Static 2.43(0.57)/3.67(0.46); **Ours (AlphaForge) 4.40(0.56)/5.89(0.69)**.
- CSI 500: Ours 2.84(0.58)/5.57(0.58), besting all baselines (LGBM 1.75/3.81 next best; DSO 1.38/4.56).
- Pool size: non-monotonic, peak at 10 of {1,10,20,50,100} — "at any given time, approximately 10 factors capture the most relevant price information."
- Ablation: Dynamic beats Static (their miner + fixed combo), and their miner beats RL/DSO/GP miners.
- Case study: Mega-Alpha composition changes day to day (only 5 of 10 factors carried from Day 1 to Day 2; factor #3 flipped weight from −0.00014 to +0.00168), demonstrating timing. Simulated 5-year trading outperformed (details in paper); code at https://github.com/DulyHao/AlphaForge.

## 8. Code / data availability
Implementation published: https://github.com/DulyHao/AlphaForge (stated in paper). Data: Qlib public A-share data; hyperparameters in supplementary materials.

## 9. Leakage & limitations
- The label Ref(VWAP,−21)/Ref(VWAP,−1)−1 uses VWAP at t−1, which is known only at/after that day's close — tradability of "delay" assumptions is unclear (they note the label "may lead to changes in the metrics").
- Predictor P trained on fitness of random factors, then generator maximizes P — classic surrogate-exploitation risk: G can find adversarial formulas that fool P without real IC (they mitigate via diversity penalty and zoo qualification, but no explicit adversarial check).
- 5-run stds are large relative to gaps (e.g., CSI500: ours 2.84(0.58) vs LGBM 1.75 — gap 1.09 ≈ 1.9σ).
- Annual retraining is coarse; "real money" results mentioned but not numerically detailed in the main text.
- A-share market quirks (T+1, retail-driven) may not transfer; fitness–IC objective is cross-sectional, ignoring transaction/impact costs.

## 10. GSE overlap
New capability; no alpha-mining pipeline in the existing research map. Complements the 101-Alphas ledger (2042): 101 Alphas gives the grammar, AlphaForge gives the full mine-then-time pipeline. Distinct from any existing GSE ensemble work because the combination is re-fit per time step on trailing factor performance rather than trained once.

## 11. GSE implementation spec
Adapt AlphaForge to NFL weekly panel:
1. **Stage 1:** replace 6 price fields with team-game features (off/def EPA per play, success rate, explosiveness, pressure rate, turnover margin, pace, rest, travel, weather); operator set from 101 Alphas; label = ATS cover or margin-vs-spread; mine a zoo of ~100 formulas maximizing IC with correlation penalty (max pairwise |ρ| = 0.5), min trailing IC gate.
2. **Stage 2 (factor timing, the key adaptation):** weekly re-selection of top-N=8–12 signals by trailing-season IC/IR (captures "coaching-scheme regime" momentum — e.g., blitz-heavy signals working in a given season stretch), then fit weekly logistic/OLS weights on trailing 4–8 weeks to form the Mega-Signal; feed into the calibrated spread/total model as an additive feature.
3. Serving: recompute zoo values weekly from nflverse; re-fit combination weights each Tuesday (before lines settle); monitor weight churn.
4. Effort: ~3–4 weeks; generator/predictor can start as random-search + XGBoost surrogate before full DL.

## 12. Reproducible test
nflverse team-game panel 2009–2025. Miner trained on 2009–2019, zoo frozen; dynamic combination validated 2020–2022, tested 2023–2025 (strictly time-ordered, weekly re-fit). Baselines: (a) static equal-weight zoo, (b) best single mined factor, (c) hand-built signal set. Metric: IC vs. ATS cover + Brier improvement of calibrated spread model with Mega-Signal as feature.

## 13. Acceptance / rejection gate
ADAPT→build if on 2023–2025 test: dynamic combination beats static zoo by ≥ 0.002 Brier AND top-decile weekly signals show hit-rate ≥ 55% ATS (n ≥ 200 games) with deflated-Sharpe > 1.5 under White's reality check across the zoo search. REJECT if dynamic ≤ static (no timing value) or the zoo fails the multiple-testing gate.

## 14. Improvement experiment
Beyond the paper: replace the linear per-step re-fit with a **regime-aware** combination — cluster weeks by market regime (public-heavy vs sharp line movement, weather season, playoff race) and fit separate combination weights per regime, selected by a small gating model. The paper's recency-momentum timing assumes smooth drift; sports regimes shift abruptly (injuries, QB changes), so regime gating should beat pure recency. Also mine formulas directly on the *residual* of the closing line (market-adjusted target) rather than raw cover — the paper mines against raw forward return, which in sports is mostly the market itself.
