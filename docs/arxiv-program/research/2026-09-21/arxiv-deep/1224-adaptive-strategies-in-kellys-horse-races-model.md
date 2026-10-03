# Deep-Research Ledger 1224 — arXiv:2201.03387v2 (cond-mat.stat-mech, 29 Aug 2022)

**Title:** Adaptive strategies in Kelly's horse races model
**Authors:** A. Despons, L. Peliti, D. Lacoste
**Version read:** v2 (29 Aug 2022) — v1 was mistakenly fetched first and discarded; only v2 was read. Full read verified on 2026-09-21: main text (Kelly horse-race model, Laplace/adaptive strategies, regret, learning time, bookmaker-odds priors, Markov races) and all appendices A–E in full (Eqs. 30–56), references. Text source: `2201.03387v2.pdf` → `pdftotext -layout` (6,695 words).

## 1. Question asked

In Kelly's horse-race model (M horses, win probabilities p, bookmaker odds r), when p is unknown and must be learned online, what is the cost of learning — i.e., how does the cumulative regret of the Laplace/adaptive betting strategy grow, and how long until the learner's capital growth approaches the Kelly optimum?

## 2. Dataset / schema

No real data. Simulations in Python: Figure 3 averages 200 realizations for M = 10 horses with ε = 0.1 (bookmaker margin); correlated-race simulations for the Markov case. Validation is theoretical (Appendices A–E) plus these Monte Carlo checks.

## 3. Method

1. **Laplace strategy:** after t races with n_x^t wins by horse x, bet b_x^{LAPL,t+1} = (n_x^t+1)/(t+M) (Eq. 44/1).
2. **Regret:** ⟨Δ(t)⟩ = Σ_{i} ⟨log p_{x_i} − log b_{x_i}^{LAPL,i}⟩, additive; ensemble average ⟨·⟩ = Σ_x p_x E_Z[·].
3. **Derivation (App. A):** CLT expansion n_x^t ≈ p_x t + √(tσ_x) z_t (31); log-expansion of the Laplace estimate (32), valid for t > min_x p_x^{−1}; per-race KL gap ≈ (M−1)/(2t) (34); harmonic sum → logarithmic cumulative regret.
4. **Modified Laplace (App. B):** conjugate prior built from bookmaker odds (pseudo-count τ, prior a_x); shown asymptotically equivalent — same (M−1)/(2t) rate (40): "in the long run the information contained in the prior becomes negligible with respect to the information contained in the likelihood." The prior reduces *short-term* loss only.
5. **Universal portfolio equivalence (App. C):** explicit Dirichlet integration (41–43) shows Cover's universal portfolio *reduces exactly to the Laplace estimate*: b_x^{PORTF,t+1} = (n_x^t+1)/(t+M) = b_x^{LAPL,t+1} (44).
6. **Correlated races (Apps. D–E):** Markov races with conditionals p_{x|y}; per-step gap M(M−1)/(2t) (51); memory-n races: M^n(M−1)/(2t) (55).

## 4. Equations / assumptions

- Laplace: b_x^{LAPL,t+1} = (n_x^t+1)/(t+M).
- Regret: ⟨Δ(t)⟩ ≈ ⟨Δ(t₀)⟩ + (M−1)/2 · log(t/(t₀+1)) (37).
- KL link: D_KL(p‖b^{LAPL,t}) = ⟨log p_x − log b_x^{LAPL,t}⟩ (38) — regret is cumulative KL divergence of the estimate.
- Mean log-capital: ⟨log C_t⟩ ≈ D_KL(p‖r)·t − (M−1)/2·log(t/(t₀+1)) − ⟨Δ(t₀)⟩ — Kelly growth rate minus logarithmic learning penalty.
- Learning time: t⋆ = (M−1)/(2·D_KL(p‖r)) — races needed for cumulative learning loss to equal one race of Kelly edge.
- Markov: ⟨Δ(t)⟩ ≈ ⟨Δ(t₀)⟩ + M(M−1)/2·log(t/(t₀+1)) (52); memory n: M^n(M−1)/2·log(t/(t₀+1)) (56).
- **Assumptions:** i.i.d. races (or irreducible Markov chain for the correlated case); log-expansion requires t > min_x p_x^{−1} (rare horses need more data); bookmaker odds fixed with margin ε.

## 5. Features / target

Features = race outcome counts n_x^t (sufficient statistics). Target = the unknown win-probability vector p, estimated by the Laplace-smoothed empirical frequency; the betting strategy is the plug-in Kelly rule b = p̂.

## 6. Validation

- Fig. 3 (200 realizations, M=10, ε=0.1): simulated regret and log-capital match the (M−1)/2·log t predictions; modified-Laplace prior reduces early losses, converges to the same asymptote.
- App. D/E simulations confirm the M(M−1)/2 scaling for Markov races.
- Analytical: regret identities hold under the stated CLT regime; universal-portfolio equivalence is exact (no asymptotics).

## 7. Exact results

- Uncorrelated: per-race learning penalty (M−1)/(2t); cumulative regret (M−1)/2·log(t/(t₀+1)).
- Learning time t⋆ = (M−1)/(2·D_KL(p‖r)).
- Correlated (Markov, order 1): M(M−1)/2·log t; memory-n: M^n(M−1)/2·log t — exponential blowup in memory length.
- Universal portfolio ≡ Laplace in this model (exact).
- Bookmaker-odds prior: short-term gain only, zero asymptotic effect.

## 8. Code / data availability

None stated. Simulations described as Python with specified parameters (M=10, ε=0.1, 200 realizations); no repository link. Results are reproducible from the formulas.

## 9. Leakage / limitations

- Assumes fixed true p and fixed bookmaker odds — no non-stationarity, no odds movement, no market efficiency response. Real sports: probabilities drift and lines move against you.
- CLT regime t > min_x p_x^{−1} fails for longshots early — exactly when Laplace shrinkage matters most.
- Markov/memory-n results assume known memory structure; learning the structure itself is not addressed.
- ε = 0.1 margin is a single simulation setting; no sensitivity analysis.
- No connection to fractional Kelly or bankroll constraints — full-Kelly plug-in only.

## 10. GSE overlap

Directly relevant to the estimation-error theme in GSE's Kelly lane:

- `docs/research/2026-09-21/arxiv-deep/0171-optimal-sports-betting-strategies-in-practice.md` — estimation error in staking strategies; this paper quantifies *exactly* how estimation error compounds: logarithmic regret with (M−1)/2 coefficient.
- `docs/research/2026-09-21/arxiv-deep/0276-kellybench-a-benchmark-for-longhorizon-sequential.md` — sequential Kelly benchmark; the t⋆ formula gives a principled "burn-in" for walk-forward Kelly evaluation.
- Wave-3: 2508.18868 (Kelly under estimation risk) is the natural companion; 2607.09505 (KL growth-gap identities) shares the KL-regret language.

## 11. Implementation spec (GSE)

**Kelly burn-in + Laplace-smoothed edges.** When GSE's model produces win probabilities for a slate:
1. Shrink raw model probabilities toward the market-implied probabilities (the paper's "bookmaker prior" idea): p̂ = (n·p_model + τ·p_market)/(n + τ), where n = effective sample size of the backtest behind p_model and τ is a tuned prior strength (paper: prior helps short-term, harmless asymptotically).
2. Gate full-Kelly staking on t > t⋆ = (M−1)/(2·D_KL(p̂‖r)): before the learning-time threshold, use fractional Kelly (¼, per existing calibration tests); after, allow the standard fraction. This operationalizes "don't bet full Kelly on fresh estimates."
3. For correlated outcomes (same-game parlays / correlated props), inflate the penalty by the App. D/E factors — treat the effective M as larger and require proportionally more evidence.

## 12. Reproducible test

Simulate M=10 horses, true p uniform, bookmaker odds with ε=0.1 margin, Laplace strategy over t=1…10,000, 200 realizations; fit cumulative regret to a·log t + b and verify a ≈ (M−1)/2 = 4.5.

## 13. Numeric gate

The fitted logarithmic coefficient must satisfy |a − 4.5| ≤ 0.5 and the mean log-capital must track D_KL(p‖r)·t − 4.5·log t within Monte Carlo error (±1 std over the 200 runs) for t ≥ 1,000.

## 14. Improvement experiment

On GSE's backtest set: compare (a) raw model probabilities → Kelly vs (b) market-shrunk probabilities (τ tuned on a validation fold) → Kelly, scoring realized log-wealth. Expectation from App. B: (b) wins early in a team's season (small n) and ties asymptotically — measure the crossover point in games and use it to set the τ schedule (larger τ early season, decaying as n grows).

**Verdict:** ADAPT
