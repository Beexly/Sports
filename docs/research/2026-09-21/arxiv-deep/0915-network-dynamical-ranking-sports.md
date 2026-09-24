# [0915] A network-based dynamical ranking system for competitive sports (arXiv:1203.2228v2)

## Citation / full-text source

- arXiv:1203.2228v2 — full text: https://arxiv.org/pdf/1203.2228
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Shun Motegi, Naoki Masuda (2012). *A network-based dynamical ranking system for competitive sports*. arXiv:1203.2228v2 [physics.soc-ph]. URL: https://arxiv.org/abs/1203.2228v2
**Ledger completed:** 2026-09-21. **Read:** full text (cached corpus copy, 399 wrapped lines incl. Results, Methods, Discussion).
## Verdict

**ADAPT** — a dynamic network power-rating with closed-form online updates that fixes the exact flaw in static ratings: over-crediting wins over teams that were weak at game time but strong later (or vice versa).

## 1. Research question
Can a temporal-network extension of the win-lose score — crediting wins by the opponent's strength *at game time* with exponential decay — predict future outcomes better than static network ratings?

## 2. Dataset / schema
137,842 ATP men's singles matches, Dec 1972–May 2010, 5,039 players (main analysis); 330,796 matches Jul 1984–Aug 2011 for the ATP-rankings comparison.

## 3. Method / model
- Extends Park & Newman win-lose score (W = A(I−αA)⁻¹, w = Wᵀ1, ℓ from Aᵀ, s = w−ℓ).
- Dynamic version: score increments depend on opponent's score **at that moment**; scores decay exponentially at rate β. Closed online updates:
  - w_{t_n} = A_{t_n}ᵀ1 + e^{−β(t_n−t_{n−1})}(I + αA_{t_n}ᵀ) w_{t_{n−1}}
  - ℓ symmetric with A_{t_n}; s = w − ℓ.
- Because game links only point backward in time, the temporal network is acyclic — α has no convergence upper bound (unlike the static case, capped at 1/λ_max ≈ 0.0048).

## 4. Equations & assumptions
- (1) full temporal expansion; (5–8) online update equations for w, ℓ, s.
- (9–10) generalized Kendall tau for top-k list comparison.
- (11–15) Park & Newman static score; (16–17) prestige score + dynamic variant.
- Assumptions: exponential decay of relevance; indirect-win weight α constant; order of games carries the signal (decay rate itself barely matters).

## 5. Features / target
Win/loss directed edges with timestamps only. Target: next-game winner (violation frequency).

## 6. Validation design
Walk-forward: scores computed from games up to t_n predict game at t_{n+1}; accuracy = (N′−e−v)/(N′−e) over violations v and ties e. Parameter robustness via top-300 Kendall K.

## 7. Numerical results / baselines
- Dynamic win-lose accuracy: **0.659–0.661** (α 0.08–0.20, β = 1/365) vs static win-lose **0.623** vs prestige **0.631**.
- Beats official ATP rankings **0.637** over α ∈ [0.11, 0.39] (dynamic 0.646–0.650).
- Dynamic prestige slightly best at **0.668** but lacks closed-form online updates.
- Robust: top-300 lists K ≥ 0.85 for all α ≥ 0.06; β ∈ [0, 2/365] nearly identical — **game order matters more than the decay rate**.
- Caveat: Σs grows exponentially for large α — normalize by instantaneous sum before comparing across time.

## 8. Code / data availability
No code; ATP data from atpworldtour.com (public at the time).

## 9. Leakage
None — strictly walk-forward; scores at t_n use only games ≤ t_n.

## Limitations
- Tennis singles only; team-sport dynamics (lineup changes, home advantage) untested.
- Binary win/loss edges ignore margin — blowouts and squeakers count equally (authors note A could carry importance, but don't test it).
- Exponential decay assumed, not derived; β barely mattered in their data, which may not hold for the NFL's short seasons.
- Σs normalization required before cross-time comparison; unnormalized scores inflate for recent teams via indirect-win compounding.
- No comparison against betting markets or Elo-family baselines.

## 10. GSE overlap
Garrett's benchmark lane tracks Elo/Glicko/TrueSkill; the corpus has no temporal-network rating with online updates. **Zero duplication.**

## 11. GSE implementation spec
1. **NFL dynamic win-lose power rating:** 32 nodes, weekly A matrices (optionally margin-weighted: A_ij = scaled margin instead of 0/1 — the authors explicitly bless folding game importance into A). Online update each week; α ≈ 0.13, β = 1/365 (weekly games: try β = 1/52 per-game equivalent).
2. **Fixes a real GSE problem:** static ratings over-credit September wins over teams that got good late (and under-credit losses to teams that were good then, bad now) — the dynamic score prices strength *at game time*.
3. **Cheap to run:** O(32²) per week, closed form, no MCMC — a fast challenger to Elo in the engine-benchmark lane.
4. **Dynamic prestige variant:** implement their Eq. 17 time-weighted PageRank too, since it won outright (0.668) — batch recompute weekly is fine at 32 teams.

## 12. Reproducible test
Dataset: NFL games 2015–2025. Protocol: walk-forward weekly ratings (2015–2019 burn-in, 2020–2025 test); predict SU winner and ATS cover vs Elo baseline and the market spread; compare accuracy and log-loss.

## 13. Acceptance / rejection gate
**Numeric gate:** ADOPT as a GSE power-rating input iff the dynamic win-lose (or dynamic prestige) beats Elo on 2020–2025 by ≥ 1pp SU accuracy or ≥ 2% log-loss improvement (paired bootstrap p < 0.05). Otherwise REJECT.

## 14. Improvement experiment
Fold margin of victory and rest/situational edges into A_{t_n} entries (score-differential-scaled weights with diminishing returns, e.g., log(1+margin)) and test whether the margin-aware dynamic score beats the binary version — the paper's framework allows it but never tests it.

**Verdict: ADAPT** — a temporally honest network power rating with online updates, gated against Elo on a decade of NFL walk-forward predictions.
