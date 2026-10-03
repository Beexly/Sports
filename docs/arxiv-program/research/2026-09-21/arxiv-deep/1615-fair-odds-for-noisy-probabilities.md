# [1615] Fair Odds for Noisy Probabilities (arXiv:1811.12516)

**Citation:** Ulrik W. Nash (2018). *Fair Odds for Noisy Probabilities*. arXiv:1811.12516. URL: https://arxiv.org/abs/1811.12516
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 13,193 words; Appendices I–II symbolic derivations scanned after reading the full body).
**Verdict:** ADAPT — the noise-wedge theory of the favorite-longshot bias gives GSE a third, structural explanation (beyond risk-love and probability misperception) with a concrete adjustment: zero-expectation odds must be longer than 1/P_C when P_C > 0.5 and shorter when P_C < 0.5. GSE can estimate the noise level ε from its own ensemble's probability dispersion and apply the wedge to de-bias model-vs-market comparisons, especially on longshots.

## 1. Research question
What are the implications of "noisy probabilities" — an individual holding a distribution of degrees of belief about an outcome, rather than a single probability, due to stochastic evidence accumulation — for the odds agreed between a buyer and seller of binary options? The paper derives that zero-expectation (fair) odds must systematically deviate from 1/P_C, producing the favorite-longshot bias as an equilibrium foundation of a fair market.

## 2. Dataset / schema
No empirical dataset — a formal game-theoretic model with simulation-implied figures. All results are analytic/numerical derivations from the stated noise assumptions. This is theory, not a backtest.

## 3. Method / model
Two players (buyer, seller) with linear utility, no market power, wager only when subjective expected margin ≥ 0. Each forms probability via Turing's weight-of-evidence map: P_{h1} = 1/(10^(−WOE_{h1}) + 1) (Eq. 1). Noisy probabilities: P_B, P_S ∼ U(L, H) with L = P_T − E, H = P_T + E, E = ε·min(1−P_T, P_T), 0 ≤ ε ≤ 1 (Eq. 5) — unbiased estimates of the true relative frequency P_T. Role allocation: whoever's probability is higher buys (backs), the other sells (bookmakes); stake $1; either side may abandon after odds/roles are known (the abandon clause).

## 4. Equations & assumptions
- Baseline (noiseless): π_B = (1/P_C − 1)P_B − (1−P_B) (Eq. 2); π_S = (1−P_S) − (1/P_C − 1)P_S (Eq. 3); equating ⇒ P_C = ½(P_B + P_S) (Eq. 4) — the wisdom-of-crowds consensus.
- Noise model: P_B, P_S ∼ U(L, H), L = P_T − E, H = P_T + E, E = ε·min(1−P_T, P_T) (Eq. 5).
- Seller's expected margin: π_{So} = (1−P_T) − P_T(1/(P_B(1−w_S) + P_S w_S) − 1) (Eq. 11).
- Origin of unfairness: Δ = −2ιP_T/(ι² − P_T²) (Eq. 18), which never enters the positive region — the cost to the seller of P_C underestimating P_T exceeds the benefit of symmetric overestimation.
- Distribution of P_T given observed P_C: Eq. 19 (2εP_T < ε) and Eq. 20 (2εP_T ≥ ε) — P_C follows a triangular distribution, so each observed consensus P_C is compatible with a range of unobserved P_T.
- Assumptions: linear-in-money utility, no market power, uniform unbiased noise, independent mechanisms, zero-sum game, players gamble indiscriminately at agreed odds unless abandoning.

## 5. Features / target
Features: buyer probability P_B, seller probability P_S, noise level ε, true frequency P_T, consensus P_C. Target: the odds adjustment m such that π̄_{So} = 0 across the spectrum of P_C (zero-expectation odds), and the sign regions of the optimal abandon strategy.

## 6. Validation design
Analytic derivations with numerical evaluation of the mean seller margin across P_T ∈ [0,1] and ε ∈ [0,1] (Figures 3, 4, 7–9). Candidate A (unequal belief weighting w_1*) computed numerically but rejected: indiscriminate gambling at w_1* odds is exploitable (discriminating wagers have positive expectation). Candidate B (odds wedge m) derived by setting π̄_{So} = 0 and solving for m per P_C. No empirical validation.

## 7. Numerical results / baselines
- With equal weighting (Eq. 4) and noisy probabilities, the seller's mean expected margin is negative for all 0 < P_T < 1 and all 0 < ε ≤ 1 (only fair at ε = 0 or P_T = 1).
- At w_1 = 1/2, ε = 1, P_T → 1/2: π̄_{So2} = ln(1−w_1)/w_1 + 1 = −0.39 — the maximum-unfairness point.
- For P_T < 1/2, ∂π̄_{So1}/∂P_T = 0 — the seller's loss is flat across the longshot region; for P_T > 1/2 the margin rises but never turns positive under equal weighting with 0 ≤ w_1 ≤ 1/2.
- Optimal abandon strategy (Figure 5): buyer bets when 1/P_C > 2, abandons when 1/P_C < 2; seller bets when 1/P_C < 2, abandons when 1/P_C > 2.
- Fair-odds wedge: agreed odds must be **higher** than 1/P_C when the averaged belief P_C > 0.5 (favorite: longer odds than reciprocal — favorite undervalued) and **lower** than 1/P_C when P_C < 0.5 (longshot: shorter odds — longshot overvalued). The adjustment m added to P_C below 0.5 mirrors the deduction above 0.5, keeping P_C + (1−P_C) = 1.
- As market size grows, the effective ε → 0 (beliefs near the median determine odds) and the bias vanishes — so the effect matters most in thin markets.

## 8. Code / data availability
None — pure theory paper. Figures are numerical evaluations of the derived equations; no replication package.

## 9. Leakage & limitations
- No empirical test of any kind; the favorite-longshot bias explanation is derived, not fitted to market data.
- Uniform-noise assumption is a convenience, not measured; real belief noise is almost certainly not uniform or symmetric.
- Linear utility and no market power are strong; real books have power and risk preferences that interact with the wedge.
- The abandon clause is a modeling device — real markets have take-it-or-leave-it posted odds, not negotiated consensus with free exit.
- The paper acknowledges the wedge coexists with risk-love/misperception effects rather than replacing them.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE has de-vigged consensus and beat-the-close lanes, and the map flags prediction-market calibration tooling as thin. This is **new** for the corpus: a structural, non-behavioral theory of the favorite-longshot bias with an actionable adjustment (the noise wedge m), as opposed to GSE's current empirical handling. It connects directly to 1614 (the Φ(p/13.588) baseline) and 1616/1617 (prediction-market making): it tells GSE *why* quoted odds should deviate from reciprocal probabilities and *how much*, as a function of measurable belief dispersion.

## 11. GSE implementation spec
1. **Estimate ε from GSE's own ensemble:** for each event, take the dispersion (std) of GSE's ensemble member win probabilities around the mean; normalize by min(1−P_C, P_C) to get an empirical ε per event — this is the "noise in GSE's probabilities" the paper theorizes.
2. **Wedge-adjusted fair odds:** solve π̄_{So} = 0 numerically (Appendix I procedure) at the event's (P_C, ε) to get m; quote fair odds as 1/(P_C − m) for P_C > 0.5 and 1/(P_C + m) for P_C < 0.5. Use these — not raw 1/P_C — when comparing GSE's price to market odds for value detection.
3. **Longshot filter:** since the wedge is largest for P_C far from 0.5 and the paper shows the seller's loss is flat across the longshot region, require a larger model-vs-market edge to take longshot positions; implement as an ε-dependent minimum-edge threshold.
4. **Thin-market amplifier:** the theory predicts the bias shrinks as market size grows; scale the wedge by 1/√(market volume) when moving between liquid NFL sides and thin props/futures.
5. **Effort:** ~3 days: ensemble dispersion logging (likely already in GSE), numerical m-solver, backtest harness.

## 12. Reproducible test
Dataset: GSE's 2022–2025 pick log with ensemble member probabilities + market closing odds. Metrics: (a) calibration (Brier) of wedge-adjusted fair odds vs. raw 1/P_C on favorites (P_C > 0.6) and longshots (P_C < 0.4) separately; (b) ROI of a value strategy that only bets when |GSE prob − wedge-adjusted fair| exceeds the ε-dependent threshold, vs. the raw-reciprocal rule. Baseline: favorite-longshot bias is a documented empirical regularity (Griffith 1949 onward). Pass if the wedge-adjusted rule improves longshot-ROI by ≥2pp or Brier by ≥0.002 on the longshot subset without degrading the favorite subset.

## 13. Acceptance / rejection gate
**Adapt** if the empirical ε (ensemble dispersion) correlates with realized favorite-longshot bias in GSE's log — i.e., events with higher ε show a larger gap between market odds and realized frequencies on longshots. If ε shows no relationship to realized bias (the wedge is pure theory with no footprint in GSE's data), **reject** the adjustment but keep the abandon-strategy insight (Section 14's asymmetric quoting) as a market-making heuristic.

## 14. Improvement experiment
The paper's uniform-noise assumption is its weakest point. GSE's improvement: replace U(L,H) with the *empirical* distribution of GSE's ensemble probability deviations (fit a beta or kernel density per sport/market), re-derive the zero-expectation wedge numerically via Monte Carlo instead of the paper's closed forms, and test whether the empirical wedge outperforms the uniform-ε wedge on the 2022–2025 log. If the empirical wedge wins, GSE owns a calibrated, data-driven favorite-longshot adjustment that no textbook formula provides — and it can be re-fit per market as the ensemble changes.
