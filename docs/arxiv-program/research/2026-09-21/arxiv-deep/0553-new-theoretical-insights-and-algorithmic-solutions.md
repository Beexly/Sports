# [0553] New Theoretical Insights and Algorithmic Solutions for Reconstructing Score Sequences from Tournament Score Sets (arXiv:2512.16961v1)

**Citation:** Bowen Liu (2026). *New Theoretical Insights and Algorithmic Solutions for Reconstructing Score Sequences from Tournament Score Sets*. arXiv:2512.16961v1. URL: https://arxiv.org/abs/2512.16961v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 11978 lines).
**Verdict:** REJECT — pure graph-theoretic combinatorics on tournament score sequences (Reid's conjecture, Landau's theorem); no data, no predictive model, no path to any GSE product.

## 1. Research question
Given only the *score set* of a tournament (the set of distinct out-degrees, not the full score sequence), when can a valid score sequence be reconstructed, and can it be done in polynomial time? The paper proves a new necessary-and-sufficient condition and a separate necessary condition (built on Landau's theorem, with a group-theoretic structured-set formulation), and derives three algorithms: a polynomial-time DP reconstruction algorithm, a scalable heuristic algorithm, and a polynomial-time network/flow method that enumerates *all* valid score sequences for a score set.

## 2. Dataset / schema
No empirical dataset. The only "experiments" are runtime demonstrations of the algorithms on hand-constructed integer score sets (e.g., a 7-element set {351, 991, 1136, 1254, 1749, 1886, 2062, 2088, ...}) run on a ThinkPad T14 (i5-10210U, Visual Studio C++) — synthetic inputs, not data.

## 3. Method / model
Combinatorial theory: reformulations of Landau's theorem (Theorems 1–2: a nondecreasing integer sequence S = s_1,…,s_m is a tournament score sequence iff Σ_{i=1}^k s_i ≥ C(k,2) for all k and Σ s_i = C(m,2)); new necessary-and-sufficient condition (Theorem 3) generalizing Lemma 6 of the prior literature; a group-theoretic necessary condition via a structured solution-space set; three constructive algorithms (DP polynomial-time reconstruction, scalable Hole-Shift-related heuristic, and a network-construction enumerator). Reid's 1978 conjecture (every set of nonnegative integers is the score set of some tournament; proved non-constructively by Yao 1989) is verified constructively for the tested cases.

## 4. Equations & assumptions
Landau's theorem (Theorem 1): S = s_1 ≤ … ≤ s_m is a tournament score sequence iff Σ_{i=1}^k s_i ≥ binomial(k,2) for 1 ≤ k ≤ m and Σ_{i=1}^m s_i = binomial(m,2). The paper's new conditions (Theorems 3–5) are stated as inequality systems extending these; full statements are long combinatorial bounds, not statistical models — no equations invented here, and no probabilistic assumptions at all. Core assumptions: complete round-robin tournament (every pair of vertices plays exactly once, one directed edge each) — i.e., no draws, no missing games.

## 5. Features / target
Not applicable — no features, no prediction target. Input: an integer set D (candidate score set). Output: one or all valid tournament score sequences consistent with D.

## 6. Validation design
No validation in the statistical sense. Correctness is proved mathematically; "experimental results" are runtime comparisons of Algorithm 1 vs a control algorithm on varying max-element sizes (figures) and 9 reconstructed sequences with timings (Table 3). No baselines from prior constructive methods are benchmarked quantitatively.

## 7. Numerical results / baselines
No numerical performance results beyond algorithm runtimes on synthetic integer sets (runtimes stated in seconds on the author's laptop; exact values are demonstration-scale and not decision-relevant — not quoted here). No predictive accuracy, no sports data, no comparisons.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Be adversarial: (a) The round-robin, no-draw, complete-tournament model does not describe the NFL (unbalanced schedule, no team plays every other team; ties possible). (b) Reconstructing a score sequence from a score set is an inverse-combinatorics curiosity with no demonstrated sports-analytics use — the claimed applications (ranking prediction, schedule fairness) are asserted, not shown. (c) Landau score sequences encode only win counts, discarding margin, schedule strength, and time order — strictly less informative than any rating system GSE uses. (d) Reid's conjecture was already proved (Yao 1989); the constructive polynomial algorithm is a genuine theoretical contribution but solves no GSE problem.

## 10. GSE overlap
No overlap and no extension path. The existing-research-map contains no tournament-graph combinatorics; GSE's rating work (Elo-family, Massey/Colley mentions) operates on real game outcomes with margins and schedules. This paper is not in the 64-ID dedup list. It is neither duplicate nor useful extension — it is a different discipline (discrete math) with no GSE surface.

## 11. GSE implementation spec
None — no implementation warranted. (If a theoretical curiosity were ever needed: the DP reconstruction could generate "what-if" round-robin-consistent win-total profiles, but GSE has no round-robin league to apply it to.)

## 12. Reproducible test
Not applicable — no GSE-relevant claim to test.

## 13. Acceptance / rejection gate
REJECT: no test to pass. Revisit only if GSE ever needs to reason about complete round-robin outcome spaces (it does not — the NFL schedule is fixed and unbalanced).

## 14. Improvement experiment
None for GSE. Within the paper's own frame, the natural follow-up would be extending the reconstruction conditions to tournaments with draws (football-style 3/1/0 scoring) — still without GSE application.
