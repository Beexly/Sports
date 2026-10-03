# 0002 Prices, Probabilities, and Parlays: Systematic Bias in Sports Prediction Markets (arXiv:2607.14430v1)

**Citation:** Niusha Moshrefi (2026). *Prices, Probabilities, and Parlays: Systematic Bias in Sports Prediction Markets*. arXiv:2607.14430v1. URL: https://arxiv.org/abs/2607.14430v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the time-to-expiry–conditional calibration curves and the parlay mispricing evidence are directly usable, but the parlay sample is 15 days thin and the "admit computational correction" claim is never actually backtested, so treat it as a measurement study, not a strategy.

## 1. Research question

Do sports prediction-market prices equal true win probabilities? The paper asks two linked questions on Kalshi data: (1) how does the calibration of binary moneyline contract prices to realized outcomes vary with time-to-expiry (TTE) — i.e., are near-expiry prices systematically distorted relative to far-from-expiry prices, and with what functional form; and (2) are multi-leg parlay prices consistent with the product of their legs' individual prices, and are parlay prices calibrated to realized parlay hit rates? The underlying economic question is whether observed distortions reflect behavioral bias (e.g., insurance-like demand for longshots) and whether they are large and stable enough to be computationally corrected.

## 2. Dataset / schema

- **Moneyline (calibration) sample:** Kalshi binary sports contracts, early March through mid-May 2026:
  - NBA: 13,009,643 trades, 11 weeks
  - MLB: 7,148,254 trades, 7 weeks
  - NHL: 2,819,289 trades, 10 weeks
  - ≈ 23 million trades total.
- **Schema (per trade):** contract ID, execution timestamp, executed price, executed size, binary settlement outcome. Prices exclude exchange fees.
- **TTE buckets (minutes):** [0,10), [10,30), [30,90), [90,240), [240,∞); plot midpoints 5, 20, 60, 165, 360.
- **Parlay sample:** April 29 through May 13, 2026 (15 days). Starting base 153,173 parlay trades; final filtered cross-game sample 12,639 trades with 2–11 legs. Filters: every leg must have TTE 30–240 minutes; leg execution must be within 300 seconds of the parlay execution. Ratio R = P_exec / P_ind with P_ind = ∏ p_j.
- **Access:** Kalshi trade data — the paper does not state a public download URL; Kalshi market data is available via Kalshi's API/feeds but the exact extraction used here is not published as a dataset. Effectively proprietary/reconstructable, not downloadable as a file.

## 3. Method / model

(1) **TTE-conditional calibration:** within each TTE bucket and league, bin executed prices and compare against empirical settlement frequencies. Fit three parametric calibration maps: power-logit Ĉ(p) = p^γ / [p^γ + (1−p)^γ]; Platt scaling Ĉ(p) = σ(a·logit(p) + b); and Prelec-II weighting w(p) = exp{−β(−ln p)^α}. Then fit each model's parameter trajectory as a quadratic function of log τ (τ = time to expiry); AIC/BIC prefer the quadratic over linear for all leagues and all models. (2) **Parlay consistency:** compute R = P_exec / P_ind per parlay trade, summarize mean/median/SD/CI by leg count; regress median inflation on leg count (β̂_1 ≈ 0.029, R² ≈ 0.94, ≈ 3% per additional leg). (3) **Parlay calibration:** bin parlay execution prices against realized parlay hit rates (empirical rate runs 2–10 percentage points below price; price 0.30 wins about 24%; price 0.40 wins about 30%; the price range below 0.6 contains 98% of trades). No out-of-sample correction strategy is actually implemented or backtested despite the paper's framing.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- Power-logit: Ĉ(p) = p^γ / [p^γ + (1−p)^γ]
- Platt: Ĉ(p) = σ(a·logit(p) + b)
- Prelec-II: w(p) = exp{−β(−ln p)^α}
- Parlay ratio: R = P_exec / P_ind, with P_ind = ∏ p_j
- Median-inflation regression: β̂_1 ≈ 0.029, R² ≈ 0.94

Assumptions stated in the paper: executed trade prices are the market's probability estimate (prices exclude exchange fees); settlement labels from Kalshi are accepted as ground truth (not independently verified); "cross-game" legs are treated as independent under the null (the paper notes shared league/day/news factors could violate this); trade-level weighting (each trade is an observation) is used throughout; the quadratic-in-log-τ metamodel is selected by AIC/BIC, not derived from theory; the insurance-demand interpretation of parlay inflation is speculative (no order-book or trader-identity data).

## 5. Features / target

Inputs per observation: executed price p, time-to-expiry τ (bucketed), league (NBA/MLB/NHL), and for parlays the leg count (2–11) and the leg prices p_j. Target: binary settlement outcome (moneyline) or parlay hit indicator. Derived quantities: calibration map Ĉ(p; τ), parlay ratio R. Prediction horizon: from execution time to event settlement (intraday, since TTE buckets top out at [240,∞) minutes).

## 6. Validation design

No train/test split and no out-of-sample evaluation. The calibration curves are fit in-sample on the full moneyline sample; the parlay statistics are descriptive on the 15-day sample. There is no held-out backtest of the claimed "computational correction" — the paper asserts distortions "admit computational correction" but never implements or validates a correction strategy. TTE buckets are fixed a priori (not tuned). The quadratic metamodel is selected by in-sample AIC/BIC. The parlay filters (TTE 30–240 min per leg, 300-second execution window) are author-chosen, not validated.

## 7. Numerical results / baselines

All numbers below are the paper's, quoted exactly:

**TTE-conditional calibration:**
- Five-minute-bucket γ̂ lies in [1.27, 1.31] (power-logit, near expiry).
- Platt slope near expiry: NBA 1.62, MLB 2.05, NHL 4.56. (Note: the manuscript also refers to the NHL value as 4.57 in a worked example; both values appear in the paper — preserved here rather than silently reconciled.)
- Worked example: a contract priced at 0.4 in the NHL final bucket has empirical win rate near zero.
- Quadratic metamodel R² > 0.92 across all six trajectories (3 models × ... as stated).

**Parlay consistency (Table I, exact):**
- 2 legs: N = 5,846, mean 0.994, median 0.991, SD 0.071, CI [0.992, 0.996]
- 3 legs: N = 3,111, mean 1.006, median 0.995, SD 0.173, CI [1.000, 1.012]
- 4 legs: N = 1,523, mean 1.022, median 0.999, SD 0.108, CI [1.016, 1.027]
- 5 legs: N = 928, mean 1.040, median 1.005, SD 0.134, CI [1.031, 1.049]
- 6 legs: N = 584, mean 1.120, median 1.013, SD 1.176, CI [1.024, 1.215]
- 7 legs: N = 371, mean 1.122, median 1.037, SD 0.299, CI [1.092, 1.153]
- 8 legs: N = 140, mean 1.353, median 1.066, SD 2.063, CI [1.010, 1.696]
- 9 legs: N = 67, mean 1.199, median 1.105, SD 0.305, CI [1.126, 1.273]
- 10 legs: N = 57, mean 3.078, median 1.223, SD 7.439, CI [1.130, 5.026]
- 11 legs: N = 12, mean 1.712, median 1.305, SD 1.050, CI [1.092, 2.332]
- All: N = 12,639, mean 1.028, median 0.996, SD 0.632, CI [1.017, 1.039]

**Parlay calibration:** empirical hit rate runs 2–10 percentage points below price; price 0.30 wins about 24%; price 0.40 wins about 30%; the price range below 0.6 contains 98% of trades. Median-inflation regression: β̂_1 ≈ 0.029, R² ≈ 0.94 (≈ 3% per additional leg).

## 8. Code / data availability

None stated. No code repository and no dataset download link. Kalshi data source described but the extraction is not published.

## 9. Leakage & limitations

- **Parlay sample is 15 days thin with tiny high-leg cells.** N = 12 for 11-leg, 57 for 10-leg (SD 7.439 — the mean of 3.078 is driven by outliers), 67 for 9-leg. The "≈3% per leg" regression (R² ≈ 0.94) is fit on 10 median points, several of which are extremely noisy; the headline regularity rests on the well-measured 2–5 leg cells.
- **Cross-game ≠ independent.** Same-day, same-league legs share news/injury/weather factors; the paper's null of R = 1 assumes independence it cannot verify. Correlated legs would push R above 1 mechanically without any behavioral bias.
- **Trade-level weighting.** Each trade is one observation, so heavily traded contracts dominate. A handful of popular games could drive the calibration curves; no contract-level or day-level clustering is reported.
- **Settlement labels unverified.** Kalshi's settlement is accepted as ground truth; any settlement errors or ambiguous resolutions flow straight into the calibration curves.
- **Fees excluded.** Kalshi charges exchange fees; any "correction" strategy's edge must survive fees, which the paper never nets out.
- **No out-of-sample correction test.** The paper's central applied claim — distortions "admit computational correction" — is never demonstrated: no correction rule is specified, no held-out backtest is run. This is a measurement paper wearing a strategy paper's framing.
- **Near-expiry distortion may be microstructure, not bias.** In the final minutes, wide spreads, thin books, and informed flow (someone who knows the game is decided) mechanically distort last-trade prices away from true probabilities. The paper fits the distortion but does not test microstructure vs behavioral explanations.
- **External validity to NFL/Kalshi NFL:** sample is NBA/MLB/NHL moneylines only, March–May 2026 (NBA/NHL playoffs, MLB early season — unusual informational regimes). NFL Sunday markets with deeper books may behave differently.
- **The NHL 4.56 vs 4.57 discrepancy** is trivial but worth noting: it suggests the worked example was computed from unrounded internals, i.e., quoted parameters are rounded.

## 10. GSE overlap

Extends, not duplicates, GSE's prediction-market lane. The existing-research map inventories: prediction-market ecosystem triage (docs/research/prediction-market-ecosystem-triage-2026-08-09.md), prediction-market tool bookmarks, Kalshi tooling, market-implied ratings, and a deep calibration stack (CQR, grouping loss, temperature/Platt/isotonic calibration, LRD, ECE-by-slice). What this paper adds: (1) **TTE-conditional calibration** — GSE's calibration work is not conditioned on time-to-expiry; the paper's finding that near-expiry prices need a much steeper correction (Platt slope up to ~4.5 in NHL) is a new conditioning axis for any GSE market-implied probability; (2) **parlay mispricing measurement** — GSE has no parlay-specific calibration; the paper's Table I gives a concrete prior (median inflation ≈ 3%/leg, empirical rate 2–10 pp below price) that GSE can test on its own books' SGP pricing. No duplication: none of GSE's inventoried work studies Kalshi microstructure or parlay consistency.

## 11. GSE implementation spec

1. **TTE-conditional calibration for GSE market-implied probabilities:** bucket GSE's historical market prices (Kalshi/NFL moneylines or spread-implied probs) into the paper's TTE buckets ([0,10), [10,30), [30,90), [90,240), [240,∞) minutes); fit power-logit/Platt per bucket per league; compare γ̂/â trajectories to the paper's ([1.27, 1.31] near expiry; Platt slopes 1.62/2.05/4.56). Output: a TTE-conditioned calibration map applied to any GSE market-implied probability before it enters the engine.
2. **Parlay/SGP audit:** for same-game parlays on GSE's tracked books, compute R = P_exec / ∏ p_j using the book's leg prices vs the parlay price; replicate Table I by leg count; then calibrate parlay price → realized hit rate on historical GSE-tracked slates. This tests whether the 2–10 pp overpricing transfers to retail SGPs (where correlation between legs makes it worse for the bettor).
3. **Correction backtest (the paper's missing piece):** define the correction rule explicitly (e.g., bet when |Ĉ(p;τ) − p| exceeds fee-adjusted threshold), backtest on held-out Kalshi/NFL data with fees netted. Effort: 3–5 days; data via Kalshi API or GSE's existing odds feeds. Do not trade real money on this until the backtest exists.

## 12. Reproducible test

Kalshi NFL moneyline trades (2025 season, via Kalshi API) or, if Kalshi NFL access is limited, GSE's existing pregame moneyline archive with timestamps. Reproduce: (a) TTE-bucketed calibration curves and the power-logit γ̂ in the [0,10) bucket — test passes if γ̂ > 1.15 (same direction as the paper's [1.27, 1.31]) with 95% CI excluding 1.0; (b) parlay/SGP table: for retail same-game parlays with 2–5 legs, test whether median R > 1.0 and whether realized hit rate sits below quoted price by ≥ 2 pp. Baselines: uncorrected price (identity calibration) and a TTE-pooled (non-conditional) calibration. Time window: one full NFL season of timestamped prices. Runnable with GSE's odds archive + Kalshi API; no new purchases.

## 13. Acceptance / rejection gate

ADAPT the TTE-conditional calibration into GSE's market-implied pipeline if, on one held-out NFL season: (a) the [0,10)-minute bucket γ̂ (or Platt slope) differs from the pooled estimate with p < 0.05 AND applying the TTE-conditional map improves log-loss over the pooled map by ≥ 0.005 nats on the held-out set; (b) for parlays, adopt the parlay-specific calibration only if median R deviates from 1.0 by ≥ 2% in the 2–5 leg cells with CIs excluding 1.0. REJECT the "computational correction as trading strategy" framing entirely unless a fee-netted, held-out backtest shows positive ROI — the paper provides no such test, so the strategy claim starts at zero evidence.

## 14. Improvement experiment

The paper's gap is the missing correction backtest combined with a confounded explanation (behavioral bias vs microstructure). Improvement: run a **horse race of explanations for the near-expiry distortion** — (1) fit the TTE-conditional calibration separately on high-spread vs low-spread minutes and on high-volume vs low-volume contracts; if the distortion concentrates in wide-spread/thin-book minutes, it is microstructure (informed flow + stale quotes), not a correctable bias, and the "correction" should be implemented as a *liquidity filter* (don't trust sub-10-minute prices) rather than a recalibration map; (2) test the parlay inflation against a correlation-aware null by simulating correlated legs (Gaussian copula with ρ estimated from same-day score correlations) instead of assuming independence — the residual inflation after correlation adjustment is the true behavioral component and the only part worth correcting.
