# [1517] Expectation of the Largest bet size in Labouchere System (arXiv:1807.11729)

**Citation:** Yanjun Han, Guanyang Wang (2019). *Expectation of the Largest bet size in Labouchere System*. arXiv:1807.11729v3 [math.PR]. URL: https://arxiv.org/abs/1807.11729
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 10 pages, converted via pdftotext; 4,341 words).
**Verdict:** ADAPT — adopt the phase-transition result (expected maximum bet is finite iff the player has an edge, p > 1/2) as a formal guardrail against loss-recovery staking in GSE's sizing module, and reuse the change-of-measure/maximal-inequality proof machinery for bounding GSE's own staking rules.

## 1. Research question
In the Labouchere (cancellation) betting system, does the expected largest bet size E[B⋆] stay finite? The paper resolves a decade-old open conjecture of Grimmett & Stirzaker ([GS01, Problem 12.9.15], whose claimed proof Ethier showed was incomplete): E[B⋆] = ∞ whenever the player has no edge (p ≤ 1/2), for any initial list — and characterizes the same phenomenon for a general family of list-based betting systems.

## 2. Dataset / schema
Pure probability theory — no empirical dataset, no simulations. All results are theorems with full proofs. Illustrative example (Table 1): initial list L0 = (1,2,3,4), 8 coups with bet sizes 5, 5, 7, 9, 11, 10, 13, 12, terminating with the empty list and target profit 0.

## 3. Method / model
Mechanics: at each coup, bet size = first + last list numbers (the single number if length 1); after a win cancel first and last; after a loss append the amount lost. N = stopping time of first empty list; B⋆ = max bet size; Tn = remaining target profit. The paper embeds Labouchere in the general (a,b)-list system family: integers a < 0 ≤ b; T0 > 0, l0 ≥ 1; bet Bn ∈ [0, Tn−1] history-dependent; win → Tn = Tn−1 − Bn, ln = (ln−1 + a)+; loss → Tn = Tn−1 + Bn, ln = ln−1 + b; termination forces Tn = ln = 0 and no further bets. Martingale = (−1,0)-list; Labouchere and Fibonacci = (−2,1)-list. Proofs use: Doob's maximal inequality on the target martingale {Tn} (under p = 1/2), the Fenchel–Young inequality, a change of measure between win-probability-p and win-probability-1/2 path measures, and a recursive "optimal list system" representation f(x,l) = x·a_l for the p = 1/2 case.

## 4. Equations & assumptions
- List-system dynamics: Bn ∈ [0, Tn−1]; Tn = Tn−1 − Bn (win) / Tn−1 + Bn (loss); ln = (ln−1 + a)+ (win) / ln−1 + b (loss); N = inf{n : ln = 0}.
- **Theorem 1:** for any (−2,1)-list system: E[B⋆] < ∞ if p > 1/2; E[B⋆] = ∞ if 1/3 < p < 1/2; E[B⋆] = ∞ if p ≤ 1/3 and Bn ≥ c1·ln−1 + c2 a.s. (c1 > 0).
- **Corollary 1:** Labouchere, any initial list: E[B⋆] < ∞ if p > 1/2; E[B⋆] = ∞ if p < 1/2 (Bn ≥ a·(ln−1 − l0)+ with a = minimum initial-list entry).
- **Theorem 2 (fair game p = 1/2):** if bet proportions satisfy bounds with lim bl = 0 or inf bl > 0, then E[B⋆] = ∞.
- **Corollary 2:** Labouchere at p = 1/2: E[B⋆] = ∞. Combined: **E[B⋆] = ∞ iff p ≤ 1/2** — the conjecture, solved.
- **Theorem 3 (moment phase transition at p = 1/2):** for any ε > 0, E[B⋆(1 ∨ log B⋆)] = ∞ but E[B⋆(1 ∨ log B⋆)^{−(1+ε)}] < ∞. Conjecture 1 (open): E[B⋆] = ∞ for *any* (−2,1)-list system at p = 1/2.
- Lemma 1 (Ethier [Eth08]): for p > 1/3, Pl0(N ≥ n+1) ∼ Dl0(n)·n^{−3/2}·κ^n with κ := 27p(1−p)²/4 < 1 (the exponent ² reconstructed from the likelihood-ratio proof, which uses p(1−p)² — the PDF text extraction mangled the formula).
- Change of measure: for a path with N = n, wins = n/3 + c, losses = 2n/3 − c: dP/dQ = (p/(1−p))^c · (p(1−p)²/(1/2·(1/2)²))^{n/3} ≤ Cρ^n (ρ < 1) when p > 1/2; ≥ Cρ^n (ρ > 1) when p < 1/2. B⋆ ≤ T0·2^N.
- Optimal-list recursion (Lemma 2): al ≥ min_{b∈[0,b̄l]} [max{b,(1−b)al−2} + max{b,(1+b)al+1}]/2 (l ≥ 3); a1 ≥ a2 + 1/2 ≥ a3 + 1.
- Good-list bound (Lemma 5): for Labouchere with good lists, Bn/Tn−1 = O(1/√l) (paper states 2√2/√l + 2/l up to extraction ambiguity).
- Assumptions: independent coups with fixed win probability p; bet sizes bounded by remaining target; termination condition enforced. No empirical assumptions.
- Side results recovered: Fibonacci system E[B⋆] = ∞ iff p ≤ 1/2 (matches Ethier [Eth10]); martingale (−1,0)-list at p = 1/2 gives the St. Petersburg paradox (E[B⋆] = ∞).

## 5. Features / target
Not applicable — theoretical paper. The "parameters" are the win probability p and the initial list L0; the object of study is the distribution (specifically the expectation) of the largest bet B⋆ over the run.

## 6. Validation design
Mathematical proof, not empirical validation. Relies on cited prior results: asymmetric random-walk absorption theory (N < ∞ a.s. iff p ≥ 1/3; E[N] < ∞ iff p > 1/3; Ethier [Eth08] k-th-moment characterization), Grimmett & Stirzaker [GS01] (max target and cumulative-bet infinite expectations at p = 1/2), Downton [Dow80] and Ethier [Eth08] stopping-time recursions. No simulations are reported; the proofs are self-contained given the cited lemmas.

## 7. Numerical results / baselines
Theorem-level results, quoted exactly:
- Phase transition: E[B⋆] < ∞ iff p > 1/2 (Labouchere, any initial list).
- Moment boundary at p = 1/2: E[B⋆(1 ∨ log B⋆)] = ∞; E[B⋆(1 ∨ log B⋆)^{−(1+ε)}] < ∞ for every ε > 0.
- Stopping-time tail: Pl0(N ≥ n+1) ∼ Dl0(n) n^{−3/2} κ^n, κ < 1 for p > 1/3.
- Worked example: list (1,2,3,4) clears in 8 coups, maximum bet 13, total target 10.
No empirical numbers; the "baselines" are the prior partial results (Fibonacci, martingale) that the theorems subsume.

## 8. Code / data availability
None stated. No simulations to reproduce; proofs are the artifact.

## 9. Leakage & limitations
- Not applicable in the empirical sense, but: the κ formula's exponent had to be reconstructed from the proof because the PDF text extraction mangled "κ := 27p(1−p)²/4" — verify against the arXiv source before citing the exact constant.
- Conjecture 1 remains open: at p = 1/2, infinite expectation is proven only under the vanishing-or-bounded-below bet-proportion condition (covers Labouchere via the good-list bound, but not literally every (−2,1)-list system).
- Assumes independent coups with constant p — real betting markets have time-varying edges and stake limits, which truncate the infinite-expectation pathology in practice (the paper's result is about the idealized system).
- The "good list" machinery is Labouchere-specific; transferring the (−2,1)-list framework to a new staking rule requires re-deriving the analogue of Lemma 5.
- Be adversarial: the infinite-expectation result is sometimes misread as "Labouchere always bankrupts you." It doesn't say that — at p > 1/2 the expected maximum bet is finite, and even at p ≤ 1/2 the *median* maximum bet can be modest. The result is about the tail, not the typical run.

## 10. GSE overlap
Per the existing-research map: the Kelly/optimal-sizing gap is now heavily covered by ~30 repo ledgers (fractional Kelly, Kelly under uncertainty, drawdown-constrained Kelly, conformal Kelly). What is NEW here and not in the corpus: (a) a *rigorous anti-progression theorem* — any cancellation-system-style loss-recovery staking has infinite expected maximum bet without an edge, which is the formal counterpart to the repo's pro-Kelly results and a citable reason GSE's sizing module must never chase losses; (b) the (a,b)-list-system abstraction as a proof template for certifying *any* custom staking rule's worst-case behavior; (c) the change-of-measure + Doob-maximal-inequality technique for converting a fair-game bound into an edge/no-edge dichotomy — directly reusable for proving finite expected max-drawdown of fractional-Kelly staking on GSE's calibrated probabilities. Complements rather than duplicates the Kelly ledgers (those optimize growth; this bounds ruin-adjacent tail behavior of non-Kelly systems).

## 11. GSE implementation spec
- **Guardrail (policy):** encode the phase-transition lesson as a hard rule in the sizing module: no staking rule whose bet size is a function of cumulative recent losses (any loss-chasing progression) may be deployed; all sizing must be edge-conditioned (fractional Kelly on calibrated probabilities), where the paper's p > 1/2 regime is the analogue of positive expected value. Document with this citation.
- **Certification template:** adapt the (a,b)-list-system framework to GSE's actual staking rule: define target (bankroll goal), length (consecutive-loss counter or drawdown state), and bet-size bounds; use the Doob-maximal-inequality argument to prove a finite bound on expected maximum bet / max drawdown under GSE's backtested win probability. This turns the paper's technique into a pre-deployment certification checklist for any future sizing change.
- Effort: 2 days to formalize the checklist and run the bound on the current fractional-Kelly rule using backtest data; the policy rule is immediate.

## 12. Reproducible test
Dataset: GSE's own backtested bet history (or a simulated bettor with GSE's calibrated probabilities vs realized outcomes, 2022–2025). Test 1 (anti-progression): simulate a Labouchere bettor at unit stakes on the backtest outcomes; record the empirical distribution of maximum bet size and verify the heavy tail (e.g., 99th percentile ≫ median) consistent with the infinite-expectation theory. Test 2 (certification): compute the Doob-style bound on expected maximum bet for GSE's fractional-Kelly rule from the backtest win rate and stake cap; the rule passes if the bound is finite and the empirical 99.9th-percentile max bet sits below it. This is a logic/arithmetic test on existing data, not a model-training exercise.

## 13. Acceptance / rejection gate
ADOPT the no-progression guardrail immediately (it is a policy, not a model — the theorem is the justification). ADOPT the certification-checklist extension only if Test 2's bound is computable in closed form from backtest statistics without heroic assumptions; REJECT the checklist if the bound requires assuming constant p (the paper's load-bearing idealization) in a way that makes it vacuous on real varying-edge data.

## 14. Improvement experiment
The paper's open Conjecture 1 asks whether *every* (−2,1)-list system has infinite expected max bet at p = 1/2. The GSE-relevant version: characterize the *rate* at which E[max bet] diverges for edge-negative progressions — the paper gives only ∞ vs finite. Run large-scale simulations of Labouchere/Fibonacci/martingale at p = 0.47, 0.49, 0.5 (sportsbook-realistic win rates against −110 lines) and fit the tail index of B⋆; then compare against fractional-Kelly's max-bet tail on the same outcomes. Hypothesis: the progression tails are power-law (infinite mean) while Kelly's is exponential (finite mean) — quantifying exactly how much worse loss-chasing is, in units a bankroll manager can use (e.g., "Labouchere's 99.9th-percentile max bet is 40× Kelly's at the same edge"). That number, not ∞, is what goes in the risk documentation.
