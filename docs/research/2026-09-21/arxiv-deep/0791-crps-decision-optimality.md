# 0791 — Does minimizing the CRPS lead to optimal decisions in day-ahead bidding? (2308.15443v1)

**Verdict:** ADAPT — ensembles lane.
**Source:** full text read in full (`/tmp/ledgers-read/2308.15443.txt`), 328 lines. Not from abstract.
**Authors:** Nitka & Weron (Wrocław University of Science and Technology) — arXiv 2308.15443v1 (Aug 2023). Domain: electricity price forecasting/trading, but the question is decision-utility vs scoring-rule optimization — central to GSE.

## Citation / full-text source
- arXiv ID: `2308.15443v1`, "Combining predictive distributions of electricity prices: Does minimizing the CRPS lead to optimal decisions in day-ahead bidding?"
- Full text read from local wrapped cache `/tmp/ledgers-read/2308.15443.txt` (lines 1–328). No code released by this paper; expert forecasts from github.com/gmarcjasz/distributionalnn; CRPS learning from the `profoc` R package.

## Question
Does minimizing CRPS (the standard proper scoring rule for probabilistic forecasts) when combining predictive distributions lead to optimal *decisions* — here, profits in day-ahead electricity bidding — or does the cheaper naive equal-weighted aggregation do as well?

## Dataset / schema
- Hourly day-ahead electricity prices, German EPEX market, 1 Jan 2015 – 31 Dec 2020; loads/RES day-ahead predictions from ENTSO-E Transparency; emission allowances + fuel prices.
- D = 1456 days initial calibration sample; +182 days to compute quantile-regression forecasts; **554-day out-of-sample test period** (27 Jun 2019 – 31 Dec 2020) covering the COVID-19 demand/prices crash.
- Rolling-window scheme: all 24 hourly prices of day d forecast together on morning of d−1.

## Method
- Expert pool of 12 models: 8 distributional deep neural networks (DDNN_N_1–4, DDNN_JSU_1–4; output fitted parameters of normal or Johnson's SU distributions, percentiles from 10,000-element samples) + 4 quantile-regression experts (LEAR_QRA, LEAR_QRM, DNN_QRA, DNN_QRM via QRA/QRM).
- Ensemble = 4 DDNN forecasts + optionally 2 QR forecasts (diversification). Horizontal averaging of quantiles only (authors note it is sharper/robust; vertical averaging adds variance and multimodality).
- Two combination schemes: **qEns** (naive equal weights, horizontal quantile averaging) vs **CRPS learning** (Berrisch & Ziel 2021; online BOA weight updates, pointwise per quantile, penalized probabilistic smoothing λ=2^(−5…5), no forgetting past regret; `profoc` R package).
- Decision evaluation: battery-storage trading strategy (Uniejewski 2023) — buy low hour h₁, sell high hour h₂, 90% charge/discharge efficiency, B=2 MWh capacity, limit orders from selected quantiles of predictive distributions; risk appetite α ∈ {0.5…0.9}; linear programming when battery is at bounds.

## Equations / assumptions
- CRPS(F,x) = −∫(F(y) − 1{y≥x})² dy ≈ (2/M)Σᵢ QL_{pᵢ}(F⁻¹(pᵢ), x) — scaled integral of quantile (pinball) loss QL_p(q,x) = (1{x<q} − p)(q − x).
- Multivariate DM test on daily loss differentials: Δ_d^{A,B} = ‖L_d^A‖₁ − ‖L_d^B‖₁ with L_d^X the 24-dim hourly CRPS vector (corrects daily seasonality); two one-sided DM tests per pair.
- Trading profit for day d: Π_d = −(1/0.9)Ŷ^{0.5}_{d,h₁} + 0.9Ŷ^{0.5}_{d,h₂} + bound adjustments; buy limit Ŷ^{1−q}_{d,h₁}, sell limit Ŷ^q_{d,h₂}, q=(1−α)/2.
- Assumptions: battery efficiency 90%, fixed 2 MWh capacity, no transaction costs on exchange, risk appetite fixed once for whole test period.

## Features / target
- Features: price histories, day-ahead load/RES forecasts (ENTSO-E), emission allowances, fuel prices.
- Target: 24 hourly day-ahead electricity prices as full predictive distributions (99 percentiles per hour).

## Validation
- 554-day out-of-sample test; statistical metrics: MAE (median), RMSE (mean), CRPS (sum of pinball over 99 percentiles), pairwise DM tests; financial metric: total and per-trade profits over the whole test period at 5 risk appetites.
- Benchmarks: "crystal ball" (perfect foresight) = 13,587 EUR total; worst-case = −21,425 EUR; naive ex-post fixed-hours strategy (buy 3h, sell 19h) = 8,048 EUR (84% of max).

## Exact results / baselines
- **Statistical accuracy:** DDNN_JSU_CRPS_LEAR achieves the lowest CRPS; DM tests: significantly better than all competing models. CRPS learning slightly beats qEns for all ensembles. Expert diversity helps accuracy — even poor standalone QR forecasts (LEAR pair are the worst individuals) improve ensembles (avoids overfitting).
- **Profits:** The ranking reverses. The most accurate ensemble (DDNN_JSU_CRPS_LEAR) yields **lower profits** than its equal-weight qEns counterpart, especially at lower risk appetites. CRPS learning is much worse on the few lowest percentiles (the ones that matter during the COVID price crash) — see pinball-by-quantile plots.
- All ensembles earn 80–96% of crystal-ball profits; naive qEns ensembles routinely beat CRPS-learning ones financially despite slightly worse CRPS.
- **Compute cost:** CRPS learning ≈ 500× slower than qEns (still < 20 s total on an i7-9750H laptop) — the extra cost is not offset by higher profits.
- **Takeaway question answered:** No — minimizing CRPS does not lead to optimal decisions here.

## Code / data
- Paper itself: no code. Expert forecasts: github.com/gmarcjasz/distributionalnn (Marcjasz et al. 2023). CRPS learning: `profoc` R package (CRAN). Underlying prices/loads: ENTSO-E Transparency (public).

## Leakage
- None evident: rolling-window scheme, quantile forecasts unavailable outside test period, no burn-in discarded (deliberate, for consistency across ensembles). Corrected a bug from the earlier software that slightly changed qEns profits — disclosed honestly.

## GSE overlap
- Checked against `~/workspace/arxiv-sweep/existing-research-map.md`: no CRPS-learning or profit-vs-scoring-rule work documented in the map. The 2026-09-18 ML brief's ensembling topic and CEPT ensemble-theory lane cover accuracy metrics, not decision-utility alignment. No overlap.

## Implementation (GSE adaptation)
- **The core GSE lesson is the paper's headline result, inverted for betting:** GSE should not optimize ensemble weights purely on a statistical score (CRPS/log-loss/Brier) when the end product is a *betting decision* — weight combinations on the decision objective (CLV captured, Kelly-adjusted ROI, or P&L at a fixed risk appetite). The paper's empirical proof that the statistically-best ensemble can be the financially-worse one is the cleanest citation in this program for decision-objective weighting.
- Naive equal weighting (horizontal quantile averaging) is a strong, near-free baseline for combining GSE's predictive distributions — echoes the forecast combination puzzle (ledger 0786).
- Diversity helps: adding weaker-but-uncorrelated experts (analogous to GSE adding market-implied views alongside the engine) improves both accuracy and decision outcomes.

## Reproducible test
- On GSE historical pick set: combine engine spread/total probability distributions with market-implied distributions via (a) equal-weight horizontal averaging, (b) CRPS-learning weights, (c) weights optimized directly on backtested CLV.
- Expectation per paper: (a) ≈ (b) on log-loss, (b) wins on CRPS, but (c) wins on CLV/P&L — replicating the accuracy-vs-decision gap.

## Numeric gate
- Decision-weighted ensemble beats CRPS-optimized ensemble on out-of-sample CLV by a margin that survives a DM test on the decision-loss differential; equal-weight baseline must be beaten before any heavier scheme is justified (the 500× compute ratio is the reminder).

## Improvement experiment
- **Decision-CRPS learning:** run the Berrisch–Ziel online aggregation but with the quantile loss replaced by a decision-weighted loss (pinball loss weighted by expected betting edge per quantile region), so the low/high-tail quantiles that drive limit-order profitability get the weight the trading strategy needs.

## Verdict
**ADAPT** — ensembles lane. Not adoptable as-is (electricity market, battery trading), but the accuracy-vs-decision result is a load-bearing methodological finding for GSE: ensemble weights must be optimized on the decision metric (CLV/profit), not the proper score — and equal weighting is the free baseline to beat. CRPS learning itself (`profoc`) is a usable probabilistic-combination method to keep in the toolkit.

## Limitations

1. **No disentangled accuracy→profit link (authors' own caveat):** "The precise cause-and-effect relationships between the predictive accuracy and profits are difficult to disentangle." The paper establishes correlation between CRPS and trading profit, not the mechanism.
2. **CRPS learning's edge shrinks on the decision metric (authors' own finding):** "the benefits of using CRPS learning are not as pronounced in the trading scenario, especially considering the ca. 500 times higher computational burden" — the headline accuracy win does not fully carry into profits once compute cost is weighed.
3. **Arbitrary, narrow ensemble design (authors' own wording):** the CRPS-learning configuration was run "with the following *arbitrarily chosen set of parameters*" (Bernstein online aggregation, penalized probabilistic smoothing λ = 2^(−5,…,5), no forgetting past regret, profoc defaults otherwise), and "for the sake of clarity, only selected forecast sets were considered. Extending the pool of experts and ensembles could lead to a more comprehensive evaluation." No other weighting schemes or automated expert selection were compared.
4. **My observation — single market, single decision rule:** all results are German day-ahead power with one battery-trading strategy. The "accuracy-optimal ≠ decision-optimal" lesson is strategy-specific; whether it transfers to GSE's CLV/settlement decision rules requires re-running the comparison on GSE's own decision metric rather than assuming it.
