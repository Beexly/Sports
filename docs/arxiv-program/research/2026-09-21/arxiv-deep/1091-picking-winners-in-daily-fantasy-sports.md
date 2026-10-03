# [1091] Picking Winners in Daily Fantasy Sports Using Integer Programming (arXiv:1604.01455v3)

**Citation:** Hunter, D. S., Vielma, J. P., Zaman, T. (2016). *Picking Winners in Daily Fantasy Sports Using Integer Programming*. arXiv:1604.01455v3. URL: https://arxiv.org/abs/1604.01455
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the portfolio-IP formulation (maximize P(at least one entry wins) via mean/variance/correlation decomposition) is the academically rigorous version of GSE's DFS stacking work; adapt the variance-floor + overlap-cap sequential IP to NFL.

## 1. Research question
In top-heavy DFS tournaments, expected value is a poor objective: the goal is to maximize the probability that *at least one* of your k entries wins (or finishes very high). How do you construct a portfolio of lineups that maximizes this probability under salary-cap and roster constraints? The paper decomposes the objective into entry means, variances, and pairwise correlations, and shows the optimal portfolio wants high-mean, high-variance, low-correlation entries — formalizing the folk wisdom of "stacking" and diversification.

## 2. Dataset / schema
- **NHL:** 38 DraftKings contests, 2015-10-21 through 2015-12-31. Player fantasy-point prediction models fit on 10,825 skater observations and 565 goalie observations (506 in models using win probability). DraftKings NHL lineup = 9 players, $50,000 salary cap.
- **MLB (baseball extension):** 10 contests, May–June 2016, 200 lineups per contest.
- Schema: player-level predicted fantasy points (mean), salary, position eligibility; contest-level slate of games. Projections came from the authors' own regression models (described in the paper's appendix), not a commercial provider.

## 3. Method / model
Core theory: for a set S of k entries, define `U(S) = P(∪_{i∈S} E_i)` where E_i = "entry i wins". U is nonnegative, monotone, submodular → greedy selection gives the classic `U(Sg)/U(S*) ≥ 1 − e^{−1}` guarantee. Since the union probability is intractable, they use the pairwise inclusion–exclusion approximation `U₂(S) = Σ_i P(E_i) − (1/2)Σ_{i≠j} P(E_i ∩ E_j)` and prove that under stated conditions `0 ≤ U(S) − U₂(S) ≤ 20c(kp)³` (the approximation error is bounded and small when per-entry win probabilities p are small).
Practical method: a Gaussian model of entry scores yields a lower bound implying good entries need high mean, high variance, low pairwise correlation. This is operationalized as a **sequential integer program**: generate lineup 1 by maximizing projected score; for each subsequent lineup, maximize projected score subject to (a) a minimum variance floor (forces upside), (b) a maximum covariance/overlap cap with all previously generated lineups (forces diversification), plus salary/position constraints. **Type 4 stacking** (correlated teammates, e.g., linemates in NHL) performed best; recommended maximum overlap varied from 7 players on very small slates down to 4 on slates with more than 9 games.

## 4. Equations & assumptions
- `U(S) = P(∪_{i∈S} E_i)`; submodularity proof; greedy `1 − e^{−1}` bound.
- `U₂(S) = Σ_i P(E_i) − (1/2)Σ_{i≠j} P(E_i ∩ E_j)`; error bound `0 ≤ U(S) − U₂(S) ≤ 20c(kp)³`.
- Gaussian lower-bound analysis → the mean/variance/correlation prescription.
- Sequential IP: max projected points s.t. variance ≥ threshold, pairwise covariance/overlap ≤ caps, salary ≤ 50k, position constraints.
- Assumptions: entry scores approximately Gaussian for the analysis; per-entry win probabilities small (for the U₂ error bound); player point predictions (mean, and a variance model) are available; contest payout is winner-take-all-ish (top-heavy); entries are exchangeable enough that the union-probability framing applies.

## 5. Features / target
Features per player: predicted mean fantasy points, predicted variance (from the authors' models), salary, position, team/game (for stacking structure and slate-size-dependent overlap caps). Target: the portfolio's probability that at least one entry wins the tournament (optimized via the mean/variance/correlation surrogate).

## 6. Validation design
Backtest on real contests: 38 DraftKings NHL contests (Oct–Dec 2015) with the authors' own projection models; 10 MLB contests (May–June 2016), 200 lineups each. Baselines: alternative stacking types (Type 1–4) and overlap levels; the paper compares portfolio variants against each other rather than against a commercial optimizer. Time-ordered (contests in chronological order, models trained on prior data). Metric: actual contest ranks achieved by the generated portfolios.

## 7. Numerical results / baselines
- All solvers generated 100 lineups in under 4 minutes.
- NHL: Type 4 stacking best overall; max overlap recommendation: 7 on very small slates → 4 on slates with >9 games.
- MLB test (10 contests, 200 lineups each): best ranks included 1/47,916, 3/38,333, 7/38,333, 2/38,333 — i.e., outright wins and top-10 finishes in large-field GPPs.
- Prediction models: 10,825 skater / 565 goalie observations. (Exact accuracy metrics of the projection models are secondary in the paper; the portfolio construction is the contribution.)

## 8. Code / data availability
Code: https://github.com/dscotthunter/Fantasy-Hockey-IP-Code and https://github.com/zlisto/dailyfantasybaseball. Data: not public (DraftKings contest results + authors' projections).

## 9. Leakage & limitations
Projection models trained on data prior to each contest (time-ordered, no lookahead). Limitations: the Gaussian analysis is an approximation; the U₂ error bound requires small per-entry win probabilities; variance predictions for players are themselves noisy and the paper's variance model is simple; results are on NHL/MLB — NFL has different correlation structure (QB-WR stacking, bring-backs); the paper doesn't model ownership (duplicate lineups / prize splitting), which matters in large fields; no comparison against a modern commercial optimizer baseline.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 10: "DFS-specific optimization literature — repo has deep DFS practice work; academic contest-theory / ownership-game equilibrium papers are absent." The repo's DFS work (`2026-09-13-dfs/`, weekly DFS packets) covers matchup-scheme, stacks, environment, winning-lineup analysis from a practitioner angle. This paper is the academic formalization of the same portfolio logic — complementary, not duplicative. It does not overlap the calibration/EPA/tracking lanes. Extension of existing DFS practice into rigorous portfolio theory.

## 11. GSE implementation spec
Adapt to NFL DFS (DraftKings/FanDuel): (1) build player-level mean *and variance* projection models from GSE's existing projection inputs (nflverse, FTN charting, NGS); the variance model is the missing piece — fit per-player residual variance with shrinkage toward position priors. (2) Implement the sequential IP (PuLP/OR-Tools): maximize projected points subject to salary cap, roster slots, variance ≥ floor, and pairwise overlap ≤ cap with prior lineups (start with cap 4–6 for NFL main slates, tune by slate size per the paper's schedule). (3) Encode NFL stacking: QB+WR/TE primary stacks, bring-back opponent pass-catchers (the NFL analogue of Type 4 stacking). (4) Add an ownership model on top (the paper's gap): discount highly-owned combinations to avoid prize splits. Effort: ~1 week for the variance model + IP pipeline; ownership modeling is the follow-on.

## 12. Reproducible test
Backtest on 2025 NFL season DraftKings main slates (weeks 1–18): generate 150-lineup portfolios with the sequential IP vs a baseline of 150 independent max-projection lineups (greedy, no diversification constraints). Metric: distribution of best-entry percentile finishes and simulated GPP ROI using actual contest payouts. Pass = diversified portfolios achieve a higher top-0.1% hit rate than the baseline at equal mean projection.

## 13. Acceptance / rejection gate
ADAPT if the backtest shows the variance-floor + overlap-cap portfolios beat the independent-greedy baseline on top-tail hit rate (≥20% relative improvement in top-0.1% finishes) over the 18-week window. REJECT the adaptation if diversification only degrades mean finish without improving tail outcomes.

## 14. Improvement experiment
Add ownership-awareness to the objective: instead of capping raw player overlap, penalize expected duplicate lineups using projected ownership (the paper ignores ownership entirely). Formulate `max Σ mean − λ·Σ pairwise ownership-overlap` and tune λ on 2024 data. Hypothesis: in large-field NFL GPPs, ownership-adjusted diversification beats raw overlap caps because it directly targets prize-splitting.
