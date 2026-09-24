# [0032] Skating System Unveiled: Exploring Preference Aggregation in Ballroom Tournaments (arXiv:2511.22384v1)

**Citation:** Laryssa Horn, Paul Nüsken, Jörg Rothe, and Tessa Seeger (2025). *Skating System Unveiled: Exploring Preference Aggregation in Ballroom Tournaments*. arXiv:2511.22384v1. URL: https://arxiv.org/abs/2511.22384v1
**Ledger completed:** 2026-09-21. **Read:** full local text (5,423-line extract, all sections, both examples, Definitions 1, Theorems 1–6, Lemma 1, Tables 1–4, full proofs, references). All quotes below are taken verbatim from the local text.
**Verdict:** REJECT — pure computational-social-choice theory (formalization + axiom profile + complexity results for a ballroom-dance voting rule) with no data, no empirical results, and no predictive modeling; nothing transfers to GSE.

## 1. Research question
The Skating System — the scrutineering rule set of dance-sport tournaments (used since the British Championship in Blackpool in 1937; paper notes it is used by the World DanceSport Federation and the International Olympic Committee) — can be formulated as a voting system but has barely been studied in computational social choice (COMSOC). The paper introduces and formalizes **Skating System Single (SkS)**, the winner-determination rule for each dance of a final round, as a social choice function, and asks: what axiomatic properties does SkS satisfy, how does it compare to the closely related Bucklin voting rule, and how vulnerable is it to manipulation and electoral control? (Abstract; §1)

## 2. Dataset / schema
None. This is a theoretical paper: no datasets, no observations, no time range. The only "data" are hand-constructed motivating examples: a dance final with six couples (31–36) and five adjudicators (A–E) with a given rank matrix, in which the Skating System counterintuitively crowns couple 33 while couple 31 (most first-place marks) finishes last; plus illustrative election examples (Examples 2 and 3) and the axiom counterexample tables (Table 2).

## 3. Method / model
Formal definition of SkS as a staged voting rule (§3, Definition 1), axiomatic analysis against standard social-choice criteria (§4, Theorem 2), and computational-complexity analysis of manipulation (§5, Theorems 3–4) and electoral control (§6, Theorems 5–6), by reductions/adaptations of existing Bucklin results (Faliszewski et al. [15] for manipulation; Erdélyi et al. [12] for control). No experiments, no ML.

## 4. Equations & assumptions
- Staged majority threshold: `maj(V) = ⌊|V|/2⌋ + 1`.
- Per-stage components for candidate c: `score^i(c) = Σ_v 1{pos_v(c) ≤ i}` (top-i approval count — identical to Bucklin score), `sum_pos^i(c) = Σ_v pos_v(c)·1{pos_v(c) ≤ i}` (sum of positions among top-i rankings).
- Definition 1 (SkS): `i*_c = min{i ∈ [m] : score^i(c) ≥ maj(V)}` (first stage c reaches majority), `i* = min_c(i*_c)`; find smallest `j ∈ [i*, m]` with a single candidate at maximal score: `C_j = argmax_c(score^j(c))` — if `|C_j| = 1`, that candidate is the unique winner; otherwise `C'_j = argmin_{c' ∈ C_j}(sum_pos^j(c'))`, if `|C'_j| = 1` that candidate wins; else proceed to stage `j+1` with only `C'_j` (candidate set reduces to the sum-of-positions ties), repeating until a unique winner or stage `m` (all of `C'_m` are winners).
- Theorem 1 (SkS vs. Bucklin): (i) every unique Bucklin winner is a unique SkS winner; (ii) every SkS winner is a Bucklin winner; (iii) for all k ≥ 1 there is an election with the same k SkS and Bucklin winners (cyclic-permutation construction; majority threshold reached in stage `(k+1)/2` for odd k, `k/2 + 1` for even k); (iv) the difference in the sum of positions of Bucklin winners in the decisive stage can be arbitrarily large: with parameters i ≥ 3, n ≥ 0, `maj(V) = ⌊i − 1/2⌋ + 1 = i`, `sum_pos^{n+2}(a) = i − 1 + n + 2`, `sum_pos^{n+2}(b) = 1 + (i − 1)(n + 2)`.
- Lemma 1: once candidates tie on highest score and lowest sum of positions at the majority threshold and the candidate set reduces, any unique eventual winner beats all other remaining candidates by a strictly higher score at some later stage (`score^j(c) > score^j(d)` for some `i < j ≤ |C|`).
- Theorem 2 (Theorem 2's exact claims): SkS **satisfies** the majority criterion, positive responsiveness, monotonicity, nondictatorship, and citizens' sovereignty; it **violates** the Condorcet criterion, strong monotonicity, independence of irrelevant alternatives, independence of clones, consistency, participation, resoluteness, and strategy-proofness. The proofs for monotonicity and positive responsiveness are given in full; Condorcet/clones/IIA are refuted by a single Table 2 counterexample (7 voters, C={X,Y,Z}, maj=4: stage-2 scores X=3, Z=4, Y=7 → Y unique winner; after adding clone Z′ ranked immediately behind Z: score²(Y)=score²(Z)=4, sum_pos²(Z)=5 < 6 = sum_pos²(Y) → winner flips from Y to Z; Y remains a Condorcet winner in the second election yet loses). Table 3 compares axioms: Bucklin and SkS align on all axioms except positive responsiveness, which SkS satisfies and Bucklin does not.
- Weighted variants (for manipulation): `maj(V) = ⌊(Σ_v w_v)/2⌋ + 1`, `score^i(c) = Σ_v (1{pos_v(c) ≤ i}·w_v)`, `sum_pos^i(c) = Σ_v (pos_v(c)·1{pos_v(c) ≤ i}·w_v)`.
- Complexity results (paper's Table 4, exact): constructive CWM — resistant (Theorem 3, NP-complete **even for instances with only four candidates**, via Partition reduction); destructive CWM — vulnerable (Theorem 4, in P); constructive CDC — resistant (Theorem 5, NP-complete); destructive CDC — resistant (Theorem 5, NP-complete); constructive CAV — resistant (Theorem 5, NP-complete); destructive CAV — vulnerable (Theorem 6, in P, adapting the Bucklin DCAV algorithm with extra handling of the sum-of-positions cases). Note: complexity of SkS-CCM and SkS-CM (unweighted / single-manipulator variants) remains open.
- Assumptions: complete strict rankings from every adjudicator (no ties — matches the real rule); single-dance, single-winner scope (SkS formalizes only the final-round winner-determination part of the 11-rule system); unique-winner model used throughout.

## 5. Features / target
Not applicable — no features, no prediction target, no horizon. The "input" is a preference profile (adjudicators × ranked couples); the "output" is a winner under SkS.

## 6. Validation design
Proof-based validation only: axiomatic proofs and complexity reductions. No train/test splits, no empirical baselines. The comparator throughout is Bucklin voting. Complexity methodology: adapt the Bucklin CCWM NP-hardness proof (Faliszewski et al. [15], Partition reduction) with extra case handling for sum-of-positions tie-breaks; adapt the Bucklin DCWM polynomial algorithm [15] and the Bucklin DCAV algorithm (Erdélyi et al. [12]) with extra polynomial-time checks of sum-of-positions outcomes (Theorem 6's sketch). Acknowledgement: supported in part by Deutsche Forschungsgemeinschaft grant RO-1202/21-2 (project 438204498).

## 7. Numerical results / baselines
None. No metrics, no confidence intervals, no sample sizes, no experiments. The only numbers are the illustrative example tallies and the complexity classifications in §4 above (quoted exactly from the paper's Theorem 1–6 statements and Table 4). The authors note in conclusion that "the proofs for SkS are technically more complicated due to the tie-breaking rules involving not only scores but also the candidates' sums of positions in the votes."

## 8. Code / data availability
None stated. No code link, no dataset. References point to external Skating System study guides ([32] Williams 2018) and Mora's analyses ([23], [24]).

## 9. Leakage & limitations
Not applicable as an empirical paper, but as a candidate for GSE use: (a) SkS is a *winner-determination* rule for judged artistic competition, not a forecasting or estimation method — there is no probability, no calibration, no predictive target; (b) the formalization covers only single-dance finals, not the full 11-rule system; (c) the motivating example itself shows the rule produces "quite unintuitive results," which is a liability, not a feature, for any aggregation use; (d) zero external validity to NFL prediction.

## 10. GSE overlap
GSE's corpus covers rank-aggregation-adjacent methods (Plackett-Luce, Bradley-Terry, Elo/Glicko/TrueSkill — inventoried in the existing-research map) but nothing in voting theory, and nothing needs it: GSE aggregates *probabilistic forecasts*, not judge rankings. No overlap and no gap filled — this is a duplicate of nothing and an extension of nothing. New capability: none.

## 11. GSE implementation spec
None warranted (REJECT). The closest conceivable transplant — using SkS-style staged-majority aggregation to combine ensemble member *rankings* of teams — is strictly dominated by the probabilistic aggregation GSE already uses (de-vigged consensus, CLV-weighted blends) and by proper rank models (Plackett-Luce) already inventoried. Building it would add complexity for no predictive gain.

## 12. Reproducible test
Not applicable. If a future need for rank-aggregation of judge-like inputs ever arose, the test would be: implement SkS per Definition 1 on a set of analyst power-rating ballots and compare its top-1 pick against Borda/Plackett-Luce on a held-out season — but no such need exists in GSE's lanes.

## 13. Acceptance / rejection gate
**Rejected at screening:** the criterion for any voting-theory paper to enter GSE's backlog is a demonstrated predictive or calibration application; this paper has none. No test to run.

## 14. Improvement experiment
None for GSE. Within its own field, the natural follow-up the authors explicitly invite is: studying further axioms (e.g., the Smith criterion [30]), formalizing the remaining Skating System rules (multi-dance aggregation), expanding to other manipulation/control scenarios and bribery, and hunting for further SkS-vs-Bucklin differences — a COMSOC exercise with no sports-prediction payoff.
