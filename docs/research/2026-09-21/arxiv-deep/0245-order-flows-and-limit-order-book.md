# [0245] Order Flows and Limit Order Book Resiliency on the Meso-Scale (arXiv:1708.02715v1)

**Citation:** Bechler, K., & Ludkovski, M. (2017). *Order Flows and Limit Order Book Resiliency on the Meso-Scale*. UCSB. arXiv:1708.02715v1. URL: https://arxiv.org/abs/1708.02715
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~6,780 lines; substantive §§1–6 fully read, remainder is appendices with bucketing/predictor tables).
**Verdict:** ADAPT — equities market-microstructure, but it is the cleanest measurement framework in this wave for the sports-betting market-microstructure lane, which the map flags as thin (gap #3: "only 1211.4000 + PLOS ONE 2023; order flow, steam-move predictability, limit-order-book analogues: thin"). Adapt the volume-bucketing + order-flow decomposition methodology to prediction-market order books (Kalshi/Polymarket NFL contracts); do NOT adopt the equities-specific parameters (β̂, hockey-stick shapes, scarce-liquidity thresholds).

## 1. Research question
How do limit order books behave on the "meso-scale" (minutes — between tick-level microstructure and daily diffusion), motivated by order-execution scheduling? Specifically: what is the empirical relationship between trade imbalance and price change; what role do limit order flows (provision/cancellation) play; and can we identify predictors of "scarce liquidity" (outsized price moves on low volume)?

## 2. Dataset / schema
- **Source:** Nasdaq ITCH TotalView (Level-2) order-book data — direction/size of market executions, limit-order additions/modifications/cancellations for i ≤ 30 levels; Nasdaq messages only; 10:00am–3:45pm; hidden-order executions removed (<10% of volume).
- **Assets:** 6 liquid large-tick stocks: MSFT, TEVA, BBBY (first 100 trading days of 2011); INTC, ORCL, NTAP (last 100 days of 2013).
- **Schema per bucket:** market buy/sell volumes VM^{A,B}_k (Eq. 6), top-level limit flows VL^{j,(1)}_k signed (adds +, cancels −) (Eq. 7), mid-price change ΔP_k (Eq. 8), trade imbalance TI_k = (VM^B_k − VM^A_k)/V_k (Eq. 9), static LOB metrics at bucket start (spread, BI, D^j_k, PI^j_N, slope S^j), lagged flows (ℓ ∈ 1,5,10,20), TIMA (Eq. 14).
- **Bucketing:** VOLUME-based (not time-based): V ∈ {0.25%, 1%, 2%} of ADV → ~400/100/50 buckets/day. E.g., ORCL V=20K (~1% ADV): 9,229 buckets, ~25 trades + ~500 limit orders per bucket, median duration ~170s (longest 29 min). ~5.5% of ORCL buckets had negative net VL (range 2–10% across assets). Market orders are only 2–4% of total messages.

## 3. Method / model
1. **Volume bucketing** (§2.4): aggregate tick data into buckets of fixed executed market volume V; stabilizes LOB data, removes activity-clustering artifacts, reduces intraday seasonality, normalizes limit activity as VL_k/V_k.
2. **Nonparametric price-formation:** ΔP = g(TI) + ε (Eq. 10), GAM penalized spline via R mgcv → documents the S-shape.
3. **Net liquidity regression:** ΔP = α₀ + α₁TI + α₂(VL^B − VL^A) + ε (Eq. 11); NetLiq := TI + β·VL with β = α₂/α₁ (Eq. 12). GAM vs linear fit of ΔP on NetLiq nearly identical → linearity restored.
4. **Liquidity-predictor horse race (§4):** LM (stepwise), LASSO (CV), MARS (hinge basis + interactions), Random Forest — Eq. 13: ΔP = Σ_r φ_r(X) + ε; variable importance via RF importance + LASSO/MARS cross-check; static (D^j_1, D_2, PI_N, S, BI, time-of-day) + dynamic (contemporaneous/lagged VL, TI, ΔP, TIMA, cancellation proportion PC^j = VL^{j,−}/VL^j).
5. **Scarce-liquidity model (§4.1):** SL^j_k = I{ε̂_k ≥ 1.5·StDev} (ask) / I{ε̂_k ≤ −1.5·StDev} (bid) (Eq. 15) — ~6% of buckets per side; logistic regression logit π^j = Σ φ^{SL,j}_r(X) (Eq. 16); holdout evaluation (Table 7).
6. **Time-series diagnostics (§5):** ACF of TI, VL^j, SL; co-movement ρ^j_t = corr(VM^j, VL^j) over sliding windows (Eq. 17) — tried, too unstable; toxicity measures VPIN-style |TĪ| (Eq. 18) and ρ^Tox (Eq. 19) — weak predictive power.

## 4. Equations & assumptions
- Mid-price/spread: P(t) = (p^A_1 + p^B_1)/2, Spr = p^A_1 − p^B_1 (Eq. 1).
- Book imbalance: BI = (v^A_1 − v^B_1)/(v^A_1 + v^B_1) ∈ (−1,1) (Eq. 2).
- Cumulative depth: D^j_k = Σ_{i=1}^k v^j_i (Eq. 3); execution-cost curve PI^j_N(t) (Eq. 4); impact slope from PI^j_n = S^j·n + ε (Eq. 5); e.g., hypothetical book → Ŝ = 0.0611 ticks/1000 shares, v̄ = 0.5/Ŝ = 8176.
- Bucket flows: VM^{A,B}_k (Eq. 6), VL^{j,(1)}_k (Eq. 7), ΔP_k (Eq. 8), TI_k (Eq. 9).
- TIMA: TIMA^{(β)}_{i+1} = e^{−β|O^M_i|}TIMA^{(β)}_i + (1−e^{−β|O^M_i|})sgn(O^M_i), β = 0.5/V (Eq. 14).
**Assumptions:** large-tick liquid LOBs (spread ≈ 1 tick; top-level events carry the signal); volume-time is the right meso-scale clock; touch limit orders are the relevant provision measure; contemporaneous regression is descriptive (causality between VM and VL explicitly not claimed — "whether HFT market-makers are predicting one-sided market flow or reacting to it" is left open).

## 5. Features / target
Target: bucket mid-price change ΔP_k; secondary target: scarce-liquidity indicator SL^j_k. Features: trade imbalance, one-sided limit flows, cancellation proportions, LOB depth/shape (D_1, D_2, PI_N, S, BI), lags, TIMA, time-of-day, bucket duration. Horizon: within-bucket (contemporaneous) for price formation; next-bucket for scheduling use-case (authors note TI_{k+1} is partially controlled by the execution scheduler).

## 6. Validation design
No train/test split for the main regressions (descriptive phenomenology; GAM fit via CV for the smoothing parameter only). The scarce-liquidity logistic model IS evaluated on a hold-out test set (Table 7). Cross-asset consistency (6 tickers × 3 bucket sizes) serves as the robustness check — effects described as "generic stylized facts" because ask/bid regressions were run independently yet symmetric. Daily-split models tested: R² only marginally better (MSFT 46.9% → 53.3%), so noise is intraday-stochastic, not inter-day.

## 7. Numerical results / baselines
- **S-shape:** ΔP vs TI is nonlinear (S-shaped; price response saturates/declines at |TI|→1) — persistent across all 6 tickers and 10 bucket sizes (Fig. 5). Conditional on TI_k=0.5, ΔP_k ranges −0.08 to 0.16 — TI alone has low predictive power.
- **Net liquidity restores linearity:** ΔP = α₀ + α₁TI + α₂(VL^B−VL^A) fits excellently; α̂₀ ≈ 0; GAM ≈ linear on NetLiq. R² jumps from ~0.4 (TI only) to ~0.7 (Table 3; e.g., MSFT 1% ADV: 0.469 → 0.785; ORCL: 0.314 → 0.708; INTC 2%: 0.421 → 0.767). Limit flows "at least as significant" as market trades.
- **β̂ (limit vs market impact, Table 4):** highly stable, ≈ 0.5–0.7 at 1–2% ADV (0.2–0.49 at 0.25%); a limit order moves price ~50–70% as much as a market order. Additions vs cancellations have statistically the SAME impact (decomposition tested, minimal fit gain).
- **Hockey-stick asymmetry:** one-sided VL^j = g^j(TI) — baseline provision until |TI| ≈ 0.3, then active-side provision declines (makers avoid adverse selection); some stocks show inverted-V (ask "hibernates" under sell pressure too). Resilience is driven by ONE-SIDED flows, not netted aggregates.
- **R² ladder (§4):** TI only ~30% → +VL^A,VL^B ~70% → +LOB shape (PI, D_2, S) ~80% → +all lags ~81–82%. Top-level depth D₁ INSIGNIFICANT; deeper metrics (D_2, PI_N over ~3–5 levels, S over ~4 levels) matter. RF interactions TI×PI, VL^j×PI^j, TI×S significant (LOB shape MODULATES flow impact). TIMA consistently negative (retracement: trend-aligned TI moves price less).
- **Scarce liquidity:** logistic model — major predictors: VL^B (+), TI (−), VL^A (−), D^{A,B}_2 (−), cancellation proportion (high); same-side PI^j_N ≈ as important as VL^j; morning/slow buckets (large Δτ_k) more prone. Holdout: when the model fires, correct 70–80% of the time; but predicts <half of all occurrences (more false negatives than true positives).
- **Correlations:** ρ(VL^A,VL^B) ≈ −0.4 (one-sided activity); ρ(VL, PC other side) ≈ +0.45; ρ(D^A,D^B) > 0 (book deep/shallow together); ρ(PC^A,PC^B) ≈ +0.2.
- **Time series:** minimal autocorrelation at short scales; some persistence at longer scales/less-liquid assets (long memory, hours); SL indicator: no ACF in one-sided residuals but combined SL positively autocorrelated (clustering); "whiplash" — large +ΔP often followed by large −ΔP. VPIN/toxicity measures: weak.
- **Baselines compared:** Cont et al. [12,13] (top-level only, postulated linearity, β=1 imposed) — this paper's data-driven correction: β<1, deeper book, asymmetries.

## 8. Code / data availability
No code links. Analysis in R (mgcv, randomForest). Data: Nasdaq ITCH TotalView (proprietary, expensive).

## 9. Leakage & limitations
- **Contemporaneous regression:** VL and ΔP measured in the same bucket — descriptive, not a trading signal; the paper is explicit that causality is unresolved.
- **Large-tick liquid equities only** (spread ≈ 1 tick); authors flag small-tick (AAPL/GOOG) and illiquid assets as open — the β̂ and hockey-stick numbers do not transfer.
- **No predictive (t+1) model built:** the stated next step ("predictive models that can statistically forecast book characteristics going forward") is not done — §4 predicts contemporaneous ΔP.
- **ρ^j_t co-movement measure failed** (unstable, dropped); toxicity/VPIN weak — honest negatives.
- **Transfer to betting markets is analogical, not validated:** prediction-market books are thinner, have discrete outcomes, and market-maker structure differs; the S-shape/β values are equities-specific.

## 10. GSE overlap
- **Fills gap #3 (market microstructure):** the map lists only 1211.4000 + PLOS ONE 2023 here. This paper contributes the measurement toolkit the gap asks for: order-flow decomposition, steam-move analogues (one-sided flow + maker fade → outsized moves), and a scarce-liquidity detector.
- **Adjacent:** prediction-market tooling (Polymarket/Kalshi) is inventoried in the map; CLV/beat-the-close and de-vigged consensus are covered — but nothing on the ORDER-FLOW side of those markets. This paper supplies exactly that missing half.
- No duplication: no LOB/order-flow paper is in the read list.

## 11. GSE implementation spec
Adapt to prediction-market order books (Kalshi/Polymarket NFL contracts):
1. **Volume bucketing:** replace time bars with volume buckets (fixed contracts-traded per bucket) for any Kalshi/Polymarket NFL market with visible depth; removes activity-clustering artifacts around news/line moves.
2. **Flow decomposition:** per bucket compute taker imbalance TI (aggressive buys−sells) and maker net flow VL (limit adds − cancels) per side; regress price change on TI + β·VL to estimate the market's β (how much maker flow moves price vs taker flow).
3. **Steam detector:** hockey-stick logic — when taker flow goes one-sided AND maker flow on the active side fades (cancellations dominate), flag an imminent outsized move; the paper's SL logistic specification (VL asymmetry + depth + cancellation rate) is the template.
4. **Scarce-liquidity regime flag:** residual-based SL indicator (>1.5 SD price move given flow) → in live betting, treat SL regimes as "do not bet into the move / good liquidity-provision regimes."
5. **Depth > touch:** use cumulative depth / impact-slope analogues, not just best bid/ask sizes, when sizing into prediction-market positions.
Estimated effort: medium — needs LOB-level data capture (Kalshi/Polymarket APIs; map says tooling exists) plus a bucketing/regression pipeline; no equities data needed.

## 12. Reproducible test
- **Data:** Kalshi or Polymarket NFL game/total contract order-book snapshots + trade tape (any 2024–2025 week with visible depth).
- **Test 1 (S-shape + NetLiq):** volume-bucket the tape; GAM ΔP on TI → check for saturation at extremes; then linear ΔP on TI + β·VL → report R² lift and β̂. Success: R² lift ≥ 15 points and β̂ ∈ (0,1).
- **Test 2 (steam prediction):** logistic SL model with (VL asymmetry, depth, cancellation rate); holdout precision/recall on outsized-move buckets. Success: precision ≥ 60% when it fires.
- **Test 3 (economic):** does avoiding taker bets during flagged SL regimes improve realized CLV vs a naive baseline? Paper-profit backtest.

## 13. Acceptance / rejection gate
ADAPT gate: (a) Test 1 must replicate the qualitative pattern (flow decomposition adds explanatory power) on prediction-market data — if betting-market price moves are fully explained by taker flow alone (β̂ ≈ 0), the maker-flow machinery is unnecessary; (b) the SL detector must beat a volume-only baseline out-of-sample. If both fail, drop to REJECT (equities curiosity). The equities β̂ ≈ 0.5–0.7 and hockey-stick thresholds are NOT adopted under any gate — re-estimate everything on betting data.

## 14. Improvement experiment
- Replace the contemporaneous regression with a proper t+1 forecasting model (the paper's stated open step): predict next-bucket ΔP from current-bucket flows + LOB state; compare against a martingale baseline — this is the version that would actually trade.
- Test the toxicity/VPIN measures the authors found weak in equities on prediction markets, where informed flow (steam) is the central phenomenon — they may work where the paper's setting didn't.
- Cross-venue: compare β̂ and fade behavior between Kalshi (regulated, market makers) and Polymarket (crypto, retail-heavy) — structural difference in adverse-selection avoidance is itself a tradable insight.
