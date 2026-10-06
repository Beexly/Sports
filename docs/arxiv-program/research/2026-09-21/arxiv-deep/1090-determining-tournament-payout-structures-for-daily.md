# [1090] Determining Tournament Payout Structures for Daily Fantasy Sports (arXiv:1601.04203v2)

**Citation:** Jain, S. & Saha, B. (2016). *Determining Tournament Payout Structures for Daily Fantasy Sports*. arXiv:1601.04203v2. URL: https://arxiv.org/abs/1601.04203
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the power-law ideal + constrained bucketing framework is directly reusable for GSE contest/product design; the player-performance prediction problem is untouched.

## 1. Research question
How should a DFS operator choose a payout structure (prize per finishing place) for a tournament so that prizes satisfy real-world constraints — fixed total prize pool, monotone decreasing payouts, minimum payout to every winner, "nice" round prize amounts, and contiguous buckets of equal payout — while staying as close as possible to a "natural" ideal payout curve? The paper argues the ideal shape follows a power law (validated against real tournaments) and develops exact and heuristic algorithms to convert the ideal into a legal, operator-acceptable structure.

## 2. Dataset / schema
Real tournament payout data scraped/analyzed by the authors: Figure 3 fits power laws to payouts of several real DFS tournaments (average p-value .237 across the fits — i.e., cannot reject the power-law fit). Experimental contest set includes Yahoo contests of various sizes and one DraftKings contest with 125,000 winners. No player-performance data; the "data" are operator payout tables. Not a public dataset; derived from observed contest pages.

## 3. Method / model
Two-stage method:
1. **Ideal payouts via power law:** place i receives `π_i = E + (P1 − E)/i^α`, where E = entry fee (minimum payout), P1 = first prize. The exponent α is chosen so the ideal payouts exactly exhaust the budget: `B − N·E = Σ_{i=1..N} (P1 − E)/i^α` (B = total prize pool, N = number of paid places). Because the RHS is strictly decreasing in α, a binary search finds α.
2. **Bucketing/rounding to satisfy constraints:** partition the N places into r contiguous buckets; every place in a bucket gets the same "nice" (round) payout; bucket payouts must be non-increasing, each ≥ E, and total must equal B. The objective minimized is the squared Euclidean distance between the final payouts and the ideal payouts.
Three algorithms are given: (a) an exact dynamic program over bucket boundaries and payout values; (b) an integer linear program; (c) a four-stage production heuristic used at Yahoo (greedy bucket formation + local adjustments + extra-winner redistribution).

## 4. Equations & assumptions
- Ideal payout: `π_i = E + (P1 − E)/i^α`; budget identity `B − N·E = Σ_i (P1−E)/i^α`.
- Optimization: minimize `Σ_i (p_i − π_i)²` subject to: `Σ_i p_i = B` (prize pool), `p_1 ≥ p_2 ≥ … ≥ p_N` (monotonicity), `p_i ≥ E` (minimum payout), `p_i` belongs to a set of nice numbers, and payouts are constant within each of r contiguous buckets.
- Exact DP complexity: time `O(rN³B log²B)`, space `O(rN²B logB)` — impractical at scale, which motivates the heuristic.
- Assumptions: the power law is the correct "natural" shape (empirically validated on real tournaments, avg p-value .237); entry fee E is a sensible minimum payout; nice-number payouts are preferred by players; the operator fixes N and B in advance.

## 5. Features / target
Inputs: prize pool B, number of paid places N, entry fee E, first prize P1, allowed nice-number set, number of buckets r. Target: the payout vector (p_1,…,p_N). No ML features; this is a constrained optimization problem, not a learning problem.

## 6. Validation design
No train/test split (not a learning paper). Validation is algorithmic: (a) goodness-of-fit of the power law to real tournament payout curves (Figure 3, average p-value .237); (b) the heuristic's solution cost vs the exact optimum (DP/ILP) on small contests where the exact solution is computable; (c) runtime benchmarks — the production heuristic ran in under 1.5 seconds even for the most challenging contests; on a DraftKings contest with 125,000 winners the heuristic cost was 78.7k with runtime 1.7k ms and zero extra winners added.

## 7. Numerical results / baselines
- Power-law fit across Figure 3 tournaments: average p-value .237 (paper's claim — fit not rejected).
- Experimental hardware: 2.6 GHz Intel Core i7, 16 GB RAM.
- Heuristic runtime: under 1.5 seconds on the hardest contests tested.
- DraftKings 125,000-winner contest: heuristic solution cost 78.7k, runtime 1,700 ms, zero extra winners (i.e., no places added beyond N).
- Exact DP is exponential-scale impractical (`O(rN³B log²B)`); the ILP works on small instances; the four-stage heuristic is what Yahoo deployed.

## 8. Code / data availability
None stated in paper. (No public code or dataset link given.)

## 9. Leakage & limitations
No leakage concept applies (optimization, not prediction). Limitations: the power-law ideal is validated on a small set of observed tournaments — if operator conventions change, the "ideal" may not hold; the nice-number set is hand-chosen; the objective (squared distance to ideal) is a modeling choice, not derived from player-behavior data (no A/B or elasticity evidence that this payout shape maximizes entries or revenue); the paper optimizes a fixed contest, not the portfolio of contests an operator runs; nothing about player skill distributions or payout-driven entry behavior.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 10 in the map: "DFS-specific optimization literature — repo has deep DFS practice work; academic contest-theory / ownership-game equilibrium papers are absent." This paper sits exactly in that gap. The repo's DFS work (`2026-09-13-dfs/`, weekly DFS packets) is player-selection/strategy focused; nothing in the map covers payout-structure theory. Overlap: none — new capability in the contest-economics lane, not player prediction.

## 11. GSE implementation spec
GSE relevance is product-side, not engine-side: if/when GSE runs contests, promotions, or payout-structured leaderboards (weekly DFS packet contests, pick'em pools, subscriber tournaments), use the two-stage framework: (1) fit the power-law ideal to GSE's chosen pool/entry/first-prize parameters via binary search on α; (2) implement the bucketing heuristic (the paper's four-stage procedure is specified precisely enough to reimplement) with GSE's own nice-number preferences. Data source: GSE's own contest parameters (no external data needed). Effort: 1–2 days to implement and unit-test the heuristic; validation = exact DP comparison on small pools.

## 12. Reproducible test
Reimplement the heuristic on a synthetic contest (e.g., B=$10,000, N=1,000, E=$10 entry, P1=$2,000): verify (a) total equals B exactly, (b) monotonicity and minimum-payout constraints hold, (c) solution cost is within the paper's reported regime of the exact DP on small instances (N≤200 where DP is tractable), and (d) runtime is sub-second. Pass = all constraints satisfied and cost within 5% of exact optimum on the small instances.

## 13. Acceptance / rejection gate
ADAPT if the reimplementation reproduces the paper's qualitative claims (power-law ideal via binary search; heuristic within 5% of exact optimum on small contests; sub-second runtime at N=100k scale). This gate is about the method's soundness, not predictive accuracy — there is no prediction to validate. The adaptation is banked as contest-design IP, not engine IP.

## 14. Improvement experiment
Go beyond the paper: replace the squared-distance objective with a player-behavior objective — model entry volume as a function of payout shape (top-heaviness vs flatness) using a discrete-choice or elasticity model fit to historical contest fill rates, then optimize the bucketed structure for expected revenue/entries rather than fidelity to a power law. The paper assumes the ideal; the experiment would learn it.
