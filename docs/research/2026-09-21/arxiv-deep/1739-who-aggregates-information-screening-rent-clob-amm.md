# [1739] Who Aggregates Information? Screening, Rent, and the Coexistence of CLOB and AMM Prediction Markets (arXiv:2609.20017)

**Citation:** Chengqi Zang, Gabriel P. Andrade, Tomoyuki Nakajima (2026; Gensyn AI / University of Tokyo). *Who Aggregates Information? Screening, Rent, and the Coexistence of CLOB and AMM Prediction Markets*. arXiv:2609.20017. URL: https://arxiv.org/abs/2609.20017
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF converted to text, 29,801 words).
**Verdict:** ADAPT — the screening-rent model of CLOB market making (Lemma 1 no-pickoff floor; 91.4% of persistent-maker profit at settlement on 588M Polymarket trades; one-sided edge +$70K buying vs +$2.6K selling; regime-flipping mispricing +0.225/−0.071; multi-outcome set premium +0.060 per log n, p<0.001) gives GSE the sharpest available empirical map of where informed flow lives (LMSR/AMM venues) vs where retail tail demand subsidizes makers (CLOB books); adapt the screening-band logic to identify which sportsbook lines are maker-screened (informative) vs tail-subsidized (fadeable).

## 1. Research question
In prediction markets, who actually aggregates information — the central limit order book (CLOB) or the automated market maker (AMM)? Classical market-microstructure theory says competitive CLOB market making is financed by payoff-uninformative noise flow, but prediction-market shares have no outside utility, so that financing channel is absent. The paper asks: (a) how do CLOB makers actually profit (empirics on Polymarket transaction data)? (b) what equilibrium model explains CLOB/AMM coexistence — with informed flow routing to the LMSR and the CLOB earning "screening rent" by carrying the under-priced side to settlement? (c) what does the model predict for multi-outcome books (per-leg committed markups)?

## 2. Dataset / schema
- **Akey et al. (2026) full Polymarket record:** 588 million trades, $67 billion volume, all market categories; account-by-account P&L.
- **Authors' transaction-level sample:** Polymarket Bitcoin 5-minute up/down contract — 738,393 trades across 275 markets in ~24 hours, $10.38M notional, 15,134 accounts sorted into makers vs retail by quoting behavior. Fees: takers 1.8%, makers 0%, no rebates; maker profit measured after fees.
- **Multi-outcome reconstruction:** 16,036 validated multi-outcome events (2–10 outcomes) rebuilt from component binary Yes/No books; per-leg prices from last taker-buy (ask) and last maker-buy (bid); time-weighted by price duration; 8.4M consecutive-trade pairs used for the price-drift staleness correction.
- Access: on-chain Polymarket data (public); Akey et al. (2026) is a companion working paper.

## 3. Method / model
- **Stylized facts (3):** (1) makers earn at resolution, not on the spread — 91.4% of persistent makers' profit arrives at settlement (<9% from pre-settlement trading); makers +$45.3K, retail −$66.7K; (2) the edge is one-sided — profit from buying (≈+$70K) not selling (≈+$2.6K), concentrated +$52.4K in [0.50,0.80] and +$24.8K in [0.80,1.00]; positions resolve favorably 56.8% of the time; (3) the mispricing flips sign with the volatility regime — pooled mid-band gaps +0.043 (longshot) / −0.037 (favorite), but +0.225/−0.071 in trending markets vs −0.205/+0.066 in flippy ones (a $0.29 side wins ~7% when trending, ~37% when flippy).
- **Model:** replace the absent noise trader with behavioral tail demand (p-traders with state-dependent tail functions H_F, H_U); a common shock σ displaces the price; c-mass informed traders pick off stale quotes at t=1 (Stage 1).
- **Lemma 1 (No-pickoff Screening Floor):** a two-sided YES quote is pickoff-proof iff YES ask ≥ 1/2 + σ and YES bid ≤ 1/2 − σ; executable premium s_D ≥ s_D^floor ≡ μ_F − μ_D; screening band s_D ∈ [s_D^floor, s̄_D).
- **LMSR side (Lemma 2):** binary LMSR cost with liquidity L, fee-adjusted marginal price P_X = p_X/(1−τ); informed traders buy below posterior → adverse selection for the LP.
- **Proposition 1 (Convention-A equilibrium):** for 0 < σ < 1/2, unique state-contingent continuation policy (s*, y_F(L), y_U(L), α*_F(L), α*_U(L)); screening binds (every c-trader screened out of the CLOB); favored-direction mass retained; routing share α*_F increasing in L.
- **Proposition 5 (multi-outcome):** a leg-by-leg book cannot sell the complete set at par — each leg carries a committed markup (Eq. 12); a single cost-function potential prices the basket at par.
- Empirical test of the multi-outcome prediction: set premium (cost of buying YES on every outcome minus $1) = book-center term Σ(mid_j) − 1 + committed-markup term Σ(ask_j − mid_j).

## 4. Equations & assumptions
- No-pickoff floor: ask ≥ 1/2 + σ, bid ≤ 1/2 − σ; s_D ≥ s_D^floor = μ_F − μ_D; s_F = 0 (favored), s_U = 2σ (unfavored).
- Screening band: s_D ∈ [s_D^floor, s̄_D); quoting inside the pre-shock common-signal band gets picked off.
- LMSR: marginal prices from the logistic cost form; fee-adjusted P_X = p_X/(1−τ); finite-trade cost from Lemma 2.
- Equilibrium: s* = s_FE (free-entry root); capacity β*_F(L) = Lλ_F ∈ (0,1); routing α*_F(L) = 1 − H_F(s*)/H_F(y_F(L)).
- Set premium decomposition: premium = [Σ_j mid_j − 1] + Σ_j (ask_j − mid_j).
- Assumptions: binary contracts (maker-rent facts); tail demand is structural to retail-facing markets; common shock σ; informed c-mass observes the shock; maker Convention I (committed quoting); no AMM in the transaction samples (venue-choice tested via the multi-outcome reconstruction).

## 5. Features / target
Features: per-trade price/side/account, quoting behavior (maker vs retail classification), price-path regime (trending vs flippy), outcome count n per event, per-leg bid/ask/mid, time-to-resolution. Targets: (a) maker P&L decomposition (settlement vs pre-settlement, buy vs sell, price band); (b) mid-band gap by regime; (c) set-premium slope on log n. Horizon: 5-minute binary contracts (intraday) + lifetime of multi-outcome books.

## 6. Validation design
- Descriptive: full-population P&L splits (no sampling); regime split (trending vs flippy, §B.1) with cluster-bootstrap at market level; keying on wallet vs display label (robust).
- Multi-outcome: one vote per event regression of set premium on log n; NO-side replication (+0.048); placebo "events" from k unrelated binaries matched on week/horizon/liquidity; small-execution filter (≥100 shares/leg → slope to zero); three staleness checks (equal price-age regression; 8.4M-pair drift correction moves slope ≤0.006; deliberate mis-repricing gives wrong-sign, <1/10-size slope).
- No predictive backtest; the model is validated by the match between its comparative statics and the measured splits.

## 7. Numerical results / baselines
- 91.4% of persistent makers' profit at settlement; makers +$45.3K vs retail −$66.7K (BTC 5-min sample).
- One-sided edge: ≈+$70K buying vs ≈+$2.6K selling; +$52.4K in [0.50,0.80], +$24.8K in [0.80,1.00], −$0.5K selling above 0.80; 56.8% favorable resolution.
- Regime flip: pooled gaps +0.043/−0.037; trending +0.225/−0.071; flippy −0.205/+0.066.
- Set premium: coefficient on log n = +0.060 (p<0.001), 96% in the markup term; NO-side replication +0.048 (~105% markup); placebo reproduces ~half; book-center lifetime average flat (slope +0.002, p=0.52) but +0.02 to +0.08 per log n at fixed age/horizon (widest at 7–30 days).
- Fees: 1.8% taker, 0% maker — profits are after fees.

## 8. Code / data availability
No code artifact stated. Data: Polymarket on-chain history (public); Akey et al. (2026) companion paper for the full-record cuts.

## 9. Leakage & limitations
- The transaction-level sample is one contract type (BTC 5-minute binaries) over ~24 hours — the regime-flip fact is documented there, not across all sports.
- Neither transaction sample contains an AMM — the venue-routing claim rests on the model + the multi-outcome reconstruction, not on observed cross-venue flow.
- Maker/retail classification is by quoting behavior (heuristic); P&L attribution to "screening" vs "informed" is interpretive (though Akey et al. argue against the insider explanation).
- Polymarket crypto microstructure (1.8% taker fees, retail-heavy) may not transfer to NFL sportsbooks with different fee/limit structures.
- The multi-outcome premium is partly mechanical (placebos reproduce ~half); the "committed markup" interpretation is model-dependent.

## 10. GSE overlap
Existing map: market microstructure lane (CLV, steam, de-vigged consensus); the repo treats line moves as informative by default. This paper says: *where* the move happens matters — CLOB/book quotes inside the signal band get picked off (informed flow), while posted book lines that persist are screened (the book is earning rent off tail demand, i.e., recreational flow). That distinction is new: GSE currently has no maker-vs-taker, screening-vs-pickoff lens on book lines. Directly actionable for line-shopping (which books' lines to trust) and for CLV weighting.

## 11. GSE implementation spec
- **Screening-band line classifier:** for each NFL game, compute each book's "signal band" from recent volatility (σ̂ from the paper's Lemma 1 logic: band half-width from the cross-book move distribution); classify books quoting inside the band pre-news as pickoff-exposed (their subsequent moves are informative — follow) vs books quoting outside with persistent lines as screening (their lines reflect recreational positioning — fade or down-weight in consensus).
- **Regime-conditional FLB:** replicate the trending/flippy split on NFL price paths; apply the paper's sign-flipping mispricing (+0.225 trending longshot vs −0.071 flippy) as a regime-dependent favorite-longshot adjustment to GSE's fair prices.
- **Set-premium monitor:** track Σ mid_j − 1 and Σ(ask_j − mid_j) proxies on GSE's multi-book NFL snapshots as a market-tightness index.
- Effort: ~2 weeks (band estimation + classifier + regime backtest).

## 12. Reproducible test
Dataset: The Odds API NFL snapshots 2024 season with timestamps (intraday if available). Metric: do "inside-band" book moves predict the consensus close direction better than "screened" book moves? Baseline: 50%. Pass if inside-band moves predict close direction at ≥56% (n ≥ 500 moves) while screened-book lines show no predictive edge (≤52%).

## 13. Acceptance / rejection gate
ADAPT is confirmed if inside-band book moves beat screened-book moves on close-direction prediction by ≥4pp (p < 0.05) on the 2024 sample — i.e., the screening/pickoff distinction is real in sportsbook data. REJECT the classifier if both move types predict equally well (or equally poorly) — then book lines don't separate into informed vs recreational venues the way Polymarket's CLOB does, and GSE should keep treating all line moves symmetrically.

## 14. Improvement experiment
Add the adverse-selection *direction*: the paper's makers profit by *buying* the under-priced side (+$70K vs +$2.6K selling). Test on NFL data whether the *side* of the line move matters — do moves caused by buy-side (back) pressure predict outcomes better than moves caused by sell-side (lay) pressure? Use cross-book order-flow proxies (which side moved first / sharp-book vs public-book taxonomy). Hypothesis: buy-pressure moves carry the informed signal; sell-pressure moves are more noise — a refinement the paper's one-sided edge finding directly motivates.

**Verdict:** ADAPT — the screening-rent model with its 588M-trade empirical base (91.4% of maker profit at settlement; regime-flipping mispricing; +0.060/log n set premium) gives GSE a venue-aware lens on which line moves are informed; implement the screening-band classifier on multi-book NFL data.
