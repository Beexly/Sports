# 1630 Generalizing the Kelly Strategy (arXiv:1611.09130)

**Citation:** Authors as listed on arXiv (2016). *Generalizing the Kelly Strategy*. arXiv:1611.09130. URL: https://arxiv.org/abs/1611.09130
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** ADAPT — finite-horizon Kelly with outside wealth and general concave utility, plus a recombining-binomial implementation that cuts the complexity from exponential to O(f²); gives GSE bankroll sizing that accounts for reserves held outside the betting account.

## 1. Research question
How does the Kelly prescription change when (a) the horizon is finite, (b) the bettor holds wealth outside the betting account, and (c) utility is a general concave function rather than log? The paper generalizes Kelly along all three axes with a tractable binomial implementation.

## 2. Dataset / schema
No external dataset. Worked example: p=.6 coin-flip bet, outside wealth w=1000, horizon of 25 flips, first-bet fraction ≈.659 under the generalized rule.

## 3. Method / model
Dynamic-program the finite-horizon problem: at each step choose the stake maximizing expected utility of total (inside + outside) wealth at the horizon. For one-step log utility the optimal fraction has closed form (2p−1)(1+w/g), where w is outside wealth and g is the current gambling bankroll — i.e. outside wealth scales up the bet. The multi-step problem is solved on a recombining binomial lattice, reducing complexity from exponential in the horizon to O(f²).

## 4. Equations & assumptions
- One-step log-utility optimal fraction: f* = (2p−1)(1 + w/g).
- Example: p=.6, w=1000, 25 flips → first bet ≈.659 of the gambling bankroll (versus .2 for plain Kelly without outside wealth).
- Recombining-binomial implementation: O(f²) complexity instead of exponential.
- Assumptions: binomial (binary) outcomes per step; known p; outside wealth w is fixed and accessible; general concave utility specified by the user.

## 5. Features / target
Input: per-bet edge p, current bankroll g, outside wealth w, horizon, utility function. Target: optimal stake fraction per step. A sizing rule, not a predictor.

## 6. Validation design
Analytical derivation plus the worked 25-flip example contrasting the generalized fraction (.659) with plain Kelly (.2). No empirical backtest.

## 7. Numerical results / baselines
- p=.6, w=1000, horizon 25: first-bet fraction ≈.659 vs .2 for standard Kelly — outside wealth dramatically raises the optimal fraction under log utility.
- Paper's claim: the recombining lattice makes finite-horizon general-utility Kelly computationally trivial.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Binary-outcome only; the (2p−1)(1+w/g) closed form is one-step log-utility — multi-step and non-log utilities need the lattice. The .659 first bet shows how aggressively outside wealth inflates stakes: if w is not truly available to cover losses, this is a ruin machine. No miscalibrated-p analysis. Assumes w is constant over the horizon.

## 10. GSE overlap
Existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md): Kelly sizing is a known GSE topic with zero prior reads — new capability. No GSE module accounts for outside reserves or finite-horizon utility shaping.

## 11. GSE implementation spec
(1) Add an "outside reserves" parameter to GSE's staking config (default 0 = current behavior); (2) implement the recombining-binomial finite-horizon solver for binary picks (spread/total/ML as win/loss) with log and power-utility options; (3) cap the (1+w/g) inflation factor (e.g. max 2×) as a safety rail; (4) use the finite-horizon solution for fixed-length campaigns (e.g. a 17-week NFL season) instead of infinite-horizon Kelly. Effort: 3–4 days.

## 12. Reproducible test
Dataset: GSE 2025–2026 NFL season picks as binary outcomes. Test: 17-week season replay — generalized Kelly (w = 1× starting bankroll, capped 2× inflation) vs plain Kelly vs half-Kelly. Metrics: final bankroll, max drawdown, ruin events (bankroll <20% of start). Baseline to beat: half-Kelly on max drawdown.

## 13. Acceptance / rejection gate
ADOPT if the capped generalized-Kelly replay beats half-Kelly's final bankroll with max drawdown no more than 10% worse; otherwise REJECT.

## 14. Improvement experiment
Make w stochastic (reserves with uncertain availability — model w as a random variable with a haircut) and test whether the uncertainty-aware fraction beats the fixed-w fraction on drawdown-adjusted bankroll — this addresses the paper's most dangerous assumption.
