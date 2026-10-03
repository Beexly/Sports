# 1623 Exact Finite-Horizon Quantile Kelly for Repeated Multi-Outcome Events (arXiv:2604.17577)

**Citation:** Long, C. D. (2026). *Exact Finite-Horizon Quantile Kelly for Repeated Multi-Outcome Events*. arXiv:2604.17577. URL: https://arxiv.org/abs/2604.17577
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — exact quantile-optimization machinery for finite-horizon Kelly; gives GSE a principled short-season / finite-slate stake optimizer that targets median wealth instead of asymptotic growth.

## 1. Research question
How should a Kelly bettor size stakes when the horizon is finite (n bets) and the goal is to maximize a quantile of terminal wealth (e.g. the median) rather than asymptotic log-growth? The paper answers this exactly for repeated multi-outcome events by exploiting the geometry of Arrow–Debreu wealth profiles.

## 2. Dataset / schema
No external dataset. Pure theory with two fully worked numerical examples: (a) binary event, p=(0.6,0.4), state prices q=(1,1), n=3 bets; (b) ternary event, p=(0.6,0.3,0.1), state prices q=(1/3,1/3,1/3), n=2 bets, quantile level α=1/2.

## 3. Method / model
Model terminal wealth after n i.i.d. bets as X_n(W)=∏ W_i^{N_i}, where N=(N_1,…,N_k) is the multinomial count vector of outcomes and W_i is the state-price wealth profile per outcome. Partition the space of count vectors into "chambers" — regions where the ordering of outcome wealths is fixed. Within each chamber, the α-quantile of terminal wealth is a single monomial in the count vector (the "active quantile monomial"), and maximizing it reduces to an ordinary Kelly problem on the empirical law k/n of the chamber (a "shadow-Kelly" problem). The global optimum is found by enumerating chambers and solving each shadow-Kelly problem exactly.

## 4. Equations & assumptions
- Terminal wealth: X_n(W) = ∏_{i} W_i^{N_i}, with N multinomial(n, p).
- Within a chamber, active quantile monomial maximized at the shadow-Kelly point: the Kelly-optimal wealth profile for the empirical distribution (k_1/n, …, k_k/n) derived from the chamber's count vector.
- Example (binary): p=(0.6,0.4), q=(1,1), n=3; median active count (2,1); shadow point (2/3,1/3).
- Example (ternary): p=(0.6,0.3,0.1), q=(1/3,1/3,1/3), n=2, α=1/2; optimizer (1.5,1.5,0); median wealth 2.25, versus ordinary Kelly profile (1.8,0.9,0.3).
- Assumptions: repeated i.i.d. multi-outcome events; bettor probabilities p and state prices q known exactly; fractional stakes allowed; no transaction costs.

## 5. Features / target
Input: bettor probability vector p, state-price vector q, horizon n, quantile level α. Target: the wealth profile W (and implied stakes) maximizing the α-quantile of terminal wealth X_n(W). Not a prediction model.

## 6. Validation design
Exact mathematical proofs plus two closed-form worked examples comparing quantile-Kelly optimizers against ordinary (infinite-horizon) Kelly profiles. No empirical backtest, no baselines beyond ordinary Kelly.

## 7. Numerical results / baselines
- Binary example (p=(0.6,0.4), q=(1,1), n=3): median-optimal shadow point (2/3,1/3) for the median count vector (2,1).
- Ternary example (p=(0.6,0.3,0.1), q=(1/3,1/3,1/3), n=2, α=1/2): quantile optimizer (1.5,1.5,0) yields median terminal wealth 2.25; the ordinary Kelly profile (1.8,0.9,0.3) differs materially (puts 0.3 on the third outcome the quantile optimizer zeroes out).
- Paper's claim: the chamber/shadow-Kelly construction gives the exact finite-horizon α-quantile optimizer.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Pure theory; no empirical validation. Requires exact p and q — with miscalibrated probabilities the shadow-Kelly point inherits full Kelly's fragility to edge misestimation. Chamber enumeration grows with the number of outcomes and horizon (combinatorial). Quantile objectives still accept large left-tail outcomes by construction (a median maximizer can have severe downside beyond the quantile). No treatment of correlated events.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): Kelly criterion is mentioned 12 times in GSE research but had zero prior paper reads — this is new capability, not a duplicate. No GSE module currently implements finite-horizon quantile optimization; GSE stakes come from the engine's calibrated probabilities via conventional sizing.

## 11. GSE implementation spec
Build a finite-slate optimizer for GSE's published daily/weekly slate: (1) take the engine's calibrated outcome probabilities p and market state prices q per event; (2) for the slate horizon n (e.g. number of games in a week), enumerate count chambers for the joint multinomial (tractable for 2–3 outcome events at small n; use dynamic programming for larger n); (3) solve each shadow-Kelly problem in closed form (ordinary Kelly on the empirical law); (4) select the chamber whose α-quantile wealth is maximal; (5) convert the winning wealth profile back to stakes. Effort: 2–3 days for the chamber enumeration + closed-form solvers, in the existing GSE TypeScript engine or a Python prototype.

## 12. Reproducible test
Dataset: GSE's own 2025–2026 season pick history (calibrated p from the engine, closing-line implied q). Test: simulate weekly slates of 5–16 games; compare the median terminal bankroll after a season of quantile-Kelly sizing (α=0.5) versus full-Kelly and half-Kelly sizing. Metric: realized median final bankroll and 5th-percentile bankroll. Baseline to beat: half-Kelly median final bankroll.

## 13. Acceptance / rejection gate
ADOPT for the slate optimizer if quantile-Kelly delivers ≥10% higher realized median final bankroll than half-Kelly on the 2025–2026 season replay with no worse 5th-percentile bankroll; otherwise REJECT.

## 14. Improvement experiment
Replace exact p with GSE's calibrated probabilities plus a shrinkage penalty on the shadow-Kelly step (blend the empirical law k/n toward the uniform distribution by a factor fit on validation), then re-run the median-wealth test — this should retain the finite-horizon advantage while dampening the edge-misestimation fragility that the paper ignores.
