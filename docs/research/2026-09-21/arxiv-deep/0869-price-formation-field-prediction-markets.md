# [0869] Price Formation in Field Prediction Markets: the Wisdom in the Crowd (arXiv:2209.07581→2209.08778)

**Citation:** Bossaerts, F., Yadav, N., Bossaerts, P., Nash, C., Todd, T., Rudolf, T., Hutchins, R., Ponsonby, A.-L. & Mattingly, K. (2022). *Price Formation in Field Prediction Markets: the Wisdom in the Crowd*. arXiv:2209.08778 [econ.GN]. Dysrupt Labs / University of Melbourne / Cambridge. URL: https://arxiv.org/abs/2209.08778
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2209.08778.txt (complete incl. SI appendix). Cross-checked against https://arxiv.org/abs/2209.08778.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — the "wisdom IN the crowd" result: prices become informative through the amplification of a few informed traders' price-sensitive flow, not through averaging. The per-trader price-sensitivity regression (eq. 2) is a portable informed-flow detector for GSE's line-movement/CLV work.

## Citation / full-text source
Dysrupt Labs (Almanis platform) + Brain, Mind, and Markets Lab, Univ. of Melbourne. Builds on Kyle (1985), Asparouhova et al. (2015), Bossaerts–Frydman–Ledyard (2014), Plott & Sunder (1988).

## Research question
How does information actually enter prediction-market prices in the field — averaging of dispersed beliefs ("wisdom of the crowd") or amplification of a few informed traders ("wisdom in the crowd")?

## Dataset / schema
- **Almanis field market, Dec 1 2015 – May 2 2017**: 2,770 unique traders, LMSR market maker (liquidity factor B = 150, endowment 1,000 points), ~£70,000 (~$105k) real-money incentives. Markets on geopolitical/macro/medical/tech topics; full trade-level data (offer price p_0, final marginal price p_m per trade, settlement).
- **Replication datasets:** four external LMSR experiments (Dreber et al. 2015 PNAS; Camerer et al. 2016 Science; Camerer et al. 2018 Nat Hum Behav; Forsell et al. 2019) on scientific-replication prediction — domain-expert crowds, tighter budget constraints. Analysis developed *before* accessing external data.

## Method
1. **Price-sensitivity regression per trader** (eq. 2): Δp_i(t_i+1) = α_i + β_i(p_0(t_i+1) − p_{m,i}(t_i)) + ε(t_i). Logic: a trader's last final marginal price p_{m,i}(t_i) reveals their belief; the gap to the current offer price measures their incentive to trade. Kyle (1985) predicts informed traders show **negative** (reverting) price sensitivity; positive sensitivity is momentum, not informedness. Traders with t-stat < −1.65 on β_i are "price-sensitive" (informed).
2. **Informativeness test:** ΔAUC from offer price p_0 to final marginal price p_m vs settlement, stratified by minimum price impact (KL divergence, cumulative filtration to avoid derivative assumptions); 95% CIs via bootstrap.
3. **Convergence test:** 152 truncated markets (low-activity tails dropped; <2 trades/24h → drop closest to settlement; markets with <25 trades dropped) grouped by # price-sensitive traders; daily ROC/AUC 14→1 days before end-of-active-period; temporally averaged ROCs via threshold method; 10,000 bootstrap subsamples.

## Equations / math / assumptions
- eq. 1/3/4: LMSR price p_i(q) = e^{q_i/B}/Σ_j e^{q_j/B}; cost function C = B·ln(Σ e^{q/B}).
- eq. 2/6: price-sensitivity regression. Assumes (approx.) risk-neutral, myopic traders; belief ≈ last final marginal price.
- eq. 5: AUC integral. eq. 7–10: errors-in-variables → **Total Least Squares** via SVD (needed on external data where budget constraints attenuate price impact; IV approaches invalid here).
- LMSR market maker is explicitly not Kyle's Bayesian zero-profit maker — a subsidizer/noise-trader hybrid.

## Features / target
Per-trade: offer price, final marginal price, KL-divergence price impact. Target: settlement (0/1); AUC vs settlement.

## Validation
- **Price-sensitive traders' trades add information; others' trades destroy it.** Table 2 (ΔAUC p_m vs p_0): PS +0.0394 [+0.0196,+0.0592] vs non-PS −0.0026 (days-to-EOS [0,5)); PS +0.0376 [+0.0244,+0.0508] vs non-PS −0.0119 [−0.0208,−0.0030] ([30,∞)). Larger minimum price impact → larger PS gains, larger non-PS losses — exactly Kyle's noise-trader prediction. Reproduced on all four external datasets (with TLS).
- **More informed traders → faster, better convergence:** markets with 2–3 or 4+ PS traders have significantly higher AUCs earlier than 0/1-PS markets (two-sample z, p < 0.001). Mean 3.06 PS traders/market (7.3% of traders; median 33.3% among traders with ≥3 trades).
- **Informedness is NOT a persistent trait:** 75% of traders are PS in fewer markets than the mean; the max trader was PS in 64 markets but non-PS in 42. On domain-concentrated replication markets, assuming transitivity of informedness across markets *strengthens* separation — i.e., expertise is topic-specific.
- **Detection blind spot (honest):** when prices are already good, informed traders have no opportunities to trade, so no price sensitivity is detectable — "no PS traders" can mean "no informed" OR "too many informed". The Figure-4 result failed to reproduce on external data for exactly this reason.

## Exact results with baselines
- ΔAUC PS vs non-PS differences of ~+0.04 to +0.05 (Table 2), with bootstrap CIs excluding zero for PS and including/excluding zero appropriately for non-PS.
- AUC convergence: 2–3 and 4+ PS-trader markets dominate 0/1 at every horizon 14→1 days pre-settlement (p < 0.001).
- Baseline comparison: non-PS trades' price impact is statistically consistent with pure noise trading.

## Code / data availability
Almanis data: restricted (Dysrupt Labs license; available on request). Replication datasets public via R package PooledMarketR (github.com/MichaelbGordon/PooledMarketR). Full method specified incl. TLS derivation and truncation protocol — reproducible on any trade-level market data.

## Leakage
None structural; truncation protocol and no-further-selection criteria stated explicitly.

## Limitations
- Primary dataset is private; incentives (leaderboard payouts) may distort motives vs real-money sportsbooks.
- The blind-spot caveat cuts both ways: absence of detected informed flow ≠ efficient market.
- Noise-trader discussion is speculative (diversification motives, joint-measure arbitrageurs — flagged as future work).
- LMSR-specific mechanics; sportsbooks are quote-driven too but with very different market-maker behavior.

## GSE overlap vs existing-research-map
- Pairs with ledger 0866 (PredictIt: consensus failure → down-weight noisy prices) and 0863 (herding estimator): this paper tells you *which* flow is signal vs noise. With 0868 (regime breaks): informed flow should be re-estimated per regime.
- GSE's CLV work currently treats all line moves equally; this paper says weight moves by the informedness of the flow behind them.

## Implementation spec (GSE adaptation)
1. **Informed-flow detector on line moves:** adapt eq. 2 to sportsbook/exchange data — regress a market participant segment's price impact (line move caused) on (current line − line they last bet into). Segments with significantly negative β are informed flow; their subsequent moves get up-weighted in GSE's market-implied features, others down-weighted (noise). Where account-level data is unavailable (most books), apply at the book level: which books' moves are price-sensitive vs noise (Pinnacle vs recreational books is the natural first test).
2. **AUC-gain-by-impact test for GSE's own signals:** for each candidate market-implied feature, compute ΔAUC (pre-move vs post-move price vs outcome) stratified by move size — keep features whose large moves add information, discard features whose moves degrade it (the paper's non-PS signature).
3. **Topic-specificity → league-specificity:** do not assume a sharp flow in NFL is sharp in NBA; estimate informedness per league × market, and re-estimate after regime breaks (0868).

## Reproducible test
1. On one season of Pinnacle closing-line history + outcomes: compute ΔAUC of opening vs closing lines stratified by move size (the paper's Figure 2g analog). Gate: closing lines must show positive ΔAUC increasing in move size — if not, the market's moves are noise by this paper's definition and GSE should fade, not follow, steam.
2. Book-level price-sensitivity regression across 3+ books. Gate: at least one book shows significant negative β (informed); if none do, GSE's market-implied inputs need rebuilding, not reweighting.

## Numeric gate
**PS trades: ΔAUC ≈ +0.037–0.041 (95% CI above zero); non-PS: −0.003 to −0.012 (at/below zero); 2–3/4+ PS-trader markets beat 0/1 at p < 0.001 across all horizons; mean 3.06 PS traders/market (7.3%).** For GSE: gate is a statistically positive ΔAUC from line moves (pre→post) stratified by move size — the paper's +0.04 on PS flow is the reference magnitude for "informed".

## Improvement experiment
Combine with 0868: run the informed-flow detector in rolling windows and test whether detected-informed-flow share predicts the α efficiency metric — i.e., does the market become efficient (α → negative) exactly when informed flow dominates? That closes the loop between this paper's microstructure and 0868's regime detection, and neither paper tests it.

## Verdict
**ADAPT.** The price-sensitivity regression is a concrete, implementable informed-flow detector; the ΔAUC-by-impact test is a ready-made filter for GSE's market-implied features; and the "wisdom in the crowd" finding reframes ensemble design — amplify the informed few, don't average the noisy many.
