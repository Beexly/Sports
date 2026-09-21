# [1210] On Kelly Betting: Some Limitations (arXiv:1710.01787)

**Citation:** Chung-Han Hsieh, B. Ross Barmish (2017). *On Kelly Betting: Some Limitations*. arXiv:1710.01787. URL: https://arxiv.org/abs/1710.01787
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — adopt exact convex optimization with explicit drawdown constraints and fractional sizing; never use the Taylor/GBM sizing approximations the paper shows can be catastrophically wrong.

## 1. Research question
The paper asks what can go wrong when the Kelly criterion is applied in practice: specifically, whether the common closed-form approximations to the Kelly fraction (second-order Taylor expansion of expected log growth, and the geometric-Brownian-motion formula μ/σ²) can produce badly wrong — even sign-wrong — stake sizes, and how severe the drawdown exposure of full Kelly betting is. It answers with worked counterexamples where both approximations recommend a saturated full stake while the true optimum is far smaller, and quantifies the ruin-adjacent drawdown behavior of exact Kelly.

## 2. Dataset / schema
No empirical dataset. All analysis is on stylized gambles specified in closed form:
- Gamble A: X = 0.15 with probability 0.95, X = −0.95 with probability 0.05 (Section on approximations).
- Coin-flip gamble: even-money ±1 outcomes with win probability p = 0.99, horizon N = 252 (Sections on drawdown).
The paper is theoretical/numerical; there is no train/test data.

## 3. Method / model
Kelly objective: choose K to maximize g(K) = E[log(1 + K^T X)] with wealth recursion V(k+1) = (1 + K^T X(k))V(k). The authors (a) compute the exact optimum numerically for Gamble A, (b) compute two popular approximations — the Taylor quadratic approximation κTaylor and the GBM formula κGBM = μ/σ² — and compare the resulting exact expected growth, and (c) simulate the coin-flip gamble to estimate drawdown distributions, then re-solve the Kelly problem under an expected-maximum-drawdown constraint E[D(K)] ≤ d.

## 4. Equations & assumptions
- g(K) = E[log(1 + K^T X)]
- V(k+1) = (1 + K^T X(k))V(k)
- Taylor approximation: maximize K·E[X] − (1/2)K²·E[X²], optimum κTaylor = E[X]/E[X²]
- GBM approximation: κGBM = μ/σ²
- Annualized growth rate r(K) used for comparison (their computed mapping, 252 periods)
Assumptions: i.i.d. returns, known distribution, log utility, no transaction costs. Assumptions are as stated; the paper's point is that the *approximations* add unstated error beyond these.

## 5. Features / target
Not a prediction paper. "Features" are the known gamble parameters (win probability, payoff magnitudes); the target is the stake fraction K and its expected logarithmic growth g(K).

## 6. Validation design
Numerical verification on the stylized gambles; drawdown statistics estimated by Monte Carlo on the coin gamble (N = 252 stages, p = 0.99). No train/test split; no baselines beyond the approximations themselves. Comparison metric is exact expected log growth of the approximate solutions vs. the true optimum.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- Gamble A (X = 0.15 w.p. 0.95, −0.95 w.p. 0.05): κTaylor = 1.4286 → saturated KTaylor = 1, exact expected growth ≈ −0.017; κGBM = 1.6529 → saturated at 1, exact expected growth ≈ −0.017; true optimum K* = 0.6667 with g(K*) ≈ 0.0404. (Approximations turn a +4% growth opportunity into −1.7% expected growth.)
- Annualized: true r(K*) ≈ 10.384 vs. ≈ −3.443 for both approximations.
- Coin gamble (N = 252, p = 0.99, K* = 0.98): 92% chance the maximum drawdown exceeds 98%.
- Expected maximum drawdown of the Kelly bettor: E[D(K*)] ≈ 0.903; for the approximation at K = 1 it is ≈ 1.0.
- Imposing E[D(K)] ≤ 0.2 reduces the optimal fraction to ≈ 0.1.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No empirical data, so no leakage — but also no external validity evidence for sports. Gamble A is deliberately adversarial; real sports edges rarely have the extreme asymmetry (5% tail at −95%) that breaks the approximations worst. The drawdown analysis is for a single repeated gamble, not a portfolio of simultaneous bets. The annualized rate r(K) mapping is their internal construct; I treat the numbers as reported, not re-derived.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, Kelly sizing is an identified product gap: "Kelly criterion / optimal bet sizing under uncertainty," fractional Kelly, estimation error, and portfolio-of-bets sizing had zero paper deep reads. GSE's current sizing code is `apps/web/lib/staking/kelly-investigation.ts` (educational single-bet Kelly, default fraction ≤ 0.25, refuses stake when no edge) on top of `apps/web/lib/tracker/staking.ts`. That module does exact single-bet Kelly — so this paper is an *extension*, not a duplicate: it warns against any future move to Taylor/GBM-style closed-form sizing (e.g., μ/σ² heuristics on multi-leg or portfolio staking) and supplies the drawdown-constraint machinery GSE lacks.

## 11. GSE implementation spec
1. Keep the exact objective: for any candidate stake vector, maximize E[log(1 + stakeᵀX)] via convex optimization on the empirical/simulated return distribution, never via Taylor or μ/σ² shortcuts. Owner: staking lib. Effort: S (already the current design; codify the ban in code comments/tests).
2. Add an expected-maximum-drawdown constraint: E[D(f)] ≤ d (e.g., d = 0.2 per paper) to the fractional-Kelly sizing path; tune d against bankroll-simulation on GSE backtest picks. Effort: M.
3. Add a unit test replicating Gamble A: assert that the sizer returns K ≈ 0.667 and never the saturated approximations' K = 1. Effort: S.

## 12. Reproducible test
Dataset: GSE engine backtest picks (SPREAD/MONEYLINE/TOTAL, v5.2.7) with realized outcomes, 2025–2026 NFL seasons. Metric: realized log-bankroll growth and empirical max drawdown over the season. Baseline: current `kelly-investigation` sizing (fraction 0.25, no drawdown constraint). Test: constrained sizer (E[D] ≤ 0.2, tuned fraction) must match or beat baseline log growth while reducing realized max drawdown; window fixed before running.

## 13. Acceptance / rejection gate
ADOPT the drawdown-constrained sizer if, on the held-out 2025–2026 backtest, it delivers realized max drawdown ≤ 0.8× baseline drawdown with log growth ≥ 0.95× baseline growth. REJECT (keep current sizer) otherwise.

## 14. Improvement experiment
Beyond the paper: replace the paper's single-gamble drawdown constraint with a *portfolio* drawdown constraint over GSE's simultaneous-pick slate (correlated outcomes), solved as a convex program with CVaR-of-drawdown. Hypothesis: correlation-aware drawdown control beats per-bet fractional Kelly on realized Sharpe of the bankroll curve.
