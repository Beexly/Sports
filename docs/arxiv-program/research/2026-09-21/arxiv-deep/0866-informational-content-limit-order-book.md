# [0866] The Informational Content of the Limit Order Book: An Empirical Study of Prediction Markets (arXiv:1609.03471)

**Citation:** Groeger, J. R. (2016). *The Informational Content of the Limit Order Book: An Empirical Study of Prediction Markets*. arXiv:1609.03471 [econ.EM]. Tepper School of Business, Carnegie Mellon University. URL: https://arxiv.org/abs/1609.03471
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/1609.03471.txt (59,470 bytes, complete incl. appendices). Cross-checked against https://arxiv.org/abs/1609.03471.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — a cautionary paper GSE needs: in limit-order prediction markets, execution prices are NOT reliable consensus beliefs (noise traders + anonymity let informed traders hide). The consensus diagnostics and the incomplete-model belief-bounding method discipline how much weight GSE puts on market-implied probabilities.

## Citation / full-text source
Joachim R. Groeger, CMU Tepper. Data shared by Blair Richards and Christopher Chidzik at PredictIt. Builds on Haile & Tamer (2003), Sutton (2001), Ostrovsky (2012), Manski (2006), Gillen et al. (2016).

## Research question
Do limit-order-book prediction markets aggregate private information into a consensus belief? And can an econometrician with full order-book data (including unexecuted limit orders) act as a surrogate aggregator when the market itself doesn't?

## Dataset / schema
- **PredictIt** (real money; Victoria University of Wellington / Aristotle International): two political markets — **Republican Iowa Caucus** (14 candidates; Trump, Cruz, Rubio favorites; Cruz eventual winner) and **Supreme Court marriage-equality decision**.
- Complete order-level data: all orders, trades, modifications, trader IDs — full order-book reconstruction (advantage over Rothschild & Sethi 2015 Intrade data, which lacked unexecuted limit orders).
- **4,452 unique traders**; daily active 11–30 (rising near resolution); daily volumes 858–1,195 securities. Avg prices: Cruz 0.45, Rubio 0.07, Trump 0.62 (aligned with polls).

## Method
1. **Descriptive consensus tests:** (a) execution volume near resolution (should fall under consensus); (b) one-sided accumulation of open orders (Figs. 6–8); (c) per-trader portfolio transition matrices — probability of shifting from asset to asset (Figs. 9–10); (d) profits by entry time with K-sample Kolmogorov–Smirnov test (Kiefer 1959, subsampled critical values per Politis et al. 1999) — late entrants should profit more if public history is informative.
2. **Noise-trader identification:** split trading vs prediction profits; "day traders" (exit with zero holdings); benchmark against a simple algorithm (copy day-trader buys, sell at first profitable limit order — avoids negative profits by construction).
3. **Incomplete model** (Haile–Tamer/Sutton partial identification): Assumption 1: informed traders take only positive-expected-profit prices, q_it ≥ p_t (eq. 1) → upper-bound estimator G(s|h)^u = (1/|N_t^a|)Σ 1{p_it ≤ s}1{h_it = h} (eq. 2). Assumption 2: beliefs not updated from the book, q_it(h_t) = q_i (eq. 3). Assumption 3: execution probabilities depend only on current best bid/ask (Markovian), estimated by Nadaraya–Watson kernel (eqs. A-9–A-10, Silverman bandwidths). Limit-vs-market choice: φ(p_t,y_i)(q_i − p_t) ≥ (q_i − m_t) (eq. 4) → bound q_i ≤ (m_t − φ(p_t,y_i)p_t)/(1 − φ(p_t,y_i)) (eq. 7); walk-up-the-book variant (eqs. 5–6).

## Equations / math / assumptions
- Motivating example: informed all believe state 1 (will occur); noise traders buy state 0 above 0.75 → all executions in (0, 0.25], falsely suggesting state 1 is unlikely. Execution prices need not reflect beliefs.
- Eqs. 1–8, A-9–A-17 as above; subsampling CI procedure (500 subsamples, convergence-rate estimation via eqs. A-12–A-17).

## Features / target
No prediction target; the estimated objects are bounds on the belief distribution G(s|h) and intervals for mean beliefs.

## Validation
- **Consensus rejected on all four descriptive tests:** volume SPIKES at the end (Fig. 5); no one-sided open-order accumulation; transition matrices concentrated on the diagonal (traders add to existing positions; even 10 days out, many trade against eventual winner Cruz); entry-time profit distributions not statistically different at 95% (KS test).
- **Noise traders:** <1% of traders make profits >$400; ~5% lose >$400; day-trader mean trading profits −$214.71; the trivial algorithm beats day traders.
- **Belief bounds (Table 3):** mean-belief intervals — CRUZ [0.41, 0.50] (95% CIs 0.54/0.65, avg tx price 0.52); TRUMP [0.26, 0.38] (CIs 0.46/0.56, price 0.39); RUBIO [0.06, 0.10] (CIs 0.13/0.19, price 0.12). For Cruz and Trump the intervals straddle 0.5 — **cannot reject mean beliefs = 0.5**; only Rubio is firmly below. "The market did not provide any more information than what was public at the time."

## Exact results with baselines
- Baselines: transaction prices themselves (Cruz 0.52, Trump 0.39) — the belief-bound intervals are far wider and uninformative by comparison; the simple algorithmic trader benchmark beats human day traders.

## Code / data availability
No code or data link; PredictIt data shared privately; estimation procedures fully specified.

## Leakage
N/A — retrospective market study.

## Limitations
- Two political markets on one platform; PredictIt trader pool is amateur-heavy (noise-trader prevalence may not generalize to sharp sportsbooks).
- Assumption 2 (no belief updating) is motivated by the descriptive evidence but is strong; Assumption 3 (Markovian execution) is a simplification.
- Wide, noisy bounds — the incomplete model delivers a negative result (can't reject 0.5), not a precise estimate.

## GSE overlap vs existing-research-map
- **Gap #3 (market microstructure)**: this is the skeptical counterweight to ledgers 0862–0864 — those papers show how markets aggregate; this one shows a real market failing to, and why (noise + anonymity + unravelable positions).
- Directly relevant to GSE's market-implied probability inputs: de-vigged lines are marginal-trade prices, not consensus beliefs. The paper's example (executions at (0,0.25] while informed all believe state 1) is the nightmare case for "trust the market."
- Connects to ledger 0861 (WorldCupArena): supports the claim that betting-style mechanisms (committed positions, no unraveling — Gillen et al. 2016) aggregate better than trading platforms; relevant if GSE ever aggregates public picks.

## Implementation spec (GSE adaptation)
1. **Consensus diagnostics for market data:** before trusting market-implied probabilities, run the paper's four tests on the relevant market (for Betfair-style exchange data if obtained; adapted versions for fixed-odds: line-move vs ticket-count divergence as the "no one-sided accumulation" analog). If the market fails the tests, down-weight market-implied inputs in the GSE ensemble.
2. **Noise-trader discount:** the paper's profit-distribution evidence (<1% big winners, 5% big losers) justifies treating public betting splits as noise-contaminated; weight line moves by handle-concentration (sharp proxies) rather than raw ticket counts.
3. **Belief-bounding methodology:** if GSE acquires order-book-style data (Betfair), the Haile–Tamer incomplete-model approach (Assumptions 1–3, Nadaraya–Watson execution probabilities) extracts belief bounds without a full equilibrium model — a fallback when structural modeling is infeasible.

## Reproducible test
1. On any available sportsbook line/ticket time series, test the "volume spike at resolution" and "no one-sided accumulation" diagnostics around game time; test whether late line moves predict outcomes better than early ones (the entry-time-profit analog).
2. Gate: if late moves don't systematically beat early moves (KS test n.s., as in the paper), treat the market as non-aggregating for that sport/market and reduce ensemble weight on market-implied probabilities. If the diagnostics pass, the transfer's caution doesn't apply.

## Numeric gate
**4,452 traders; <1% profit >$400 vs ~5% losses >$400; day-trader mean trading profit −$214.71; KS test on entry-time profits n.s. at 95%; mean-belief intervals straddle 0.5 for Cruz and Trump (Table 3).** For GSE: the gate is the diagnostic outcome above — the paper's numbers are the warning, not a target.

## Improvement experiment
Apply the incomplete-model belief-bounding to a sports prediction exchange (e.g., Betfair) where the trader pool is sharper: if bounds tighten and exclude 0.5 in the direction of outcomes, the paper's negative result is platform-specific (amateur noise traders) rather than mechanism-general — which would rehabilitate exchange-implied probabilities as a GSE input while keeping the diagnostic discipline.

## Verdict
**ADAPT.** Not for a model to copy but for a discipline to adopt: market prices ≠ consensus beliefs, noise traders contaminate the book, and the four consensus diagnostics plus the belief-bounding method give GSE a principled way to decide when market-implied probabilities deserve ensemble weight — and when they don't.
