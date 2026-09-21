# [0507] How a Losing Team like the Canadiens can Steal a Stanley Cup: A Quantitative Intransitive Hockey Analysis (arXiv:2105.13472v2)

**Citation:** C. J. Barrett, S. Koumarianos, and O. Mermut (2021). *How a Losing Team like the Canadiens can Steal a Stanley Cup: A Quantitative Intransitive Hockey Analysis*. arXiv:2105.13472v2. URL: https://arxiv.org/abs/2105.13472v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 106 lines).
**Verdict:** REJECT — a two-page conceptual note with a toy 3×3 matchup-counting model, no data, no estimation, and no validation; the intransitivity intuition is correct but contributes nothing implementable to GSE.

## 1. Research question
Can a weaker hockey team overcome a stronger opponent in a playoff series by concentrating a fixed salary cap into a few dimensions (e.g., an elite goaltender) rather than spreading it evenly? The paper frames this as competitive intransitivity: under a uniform cap, for any allocation of resources across Offence/Defence/Goalie there exists a counter-allocation that beats it head-to-head, like intransitive dice.

## 2. Dataset / schema
No data. The paper is purely theoretical — no games, seasons, player statistics, or salary figures are used. References: Wikipedia "Intransitive dice", Gardner (1970), Leonard (2010), Ekhad & Zeilberger (2017).

## 3. Method / model
Three hypothetical teams split $6M across Offence/Defence/Goalie:
- Montreal: 1 / 1 / 4 (goalie-heavy).
- Boston: 2 / 2 / 2 (balanced).
- New York: 3 / 3 / 0 (offence/defence-heavy).

Each pair plays a long series; the winner is decided by 9 head-to-head matchups of the three spending categories (each team's three numbers vs the opponent's three). Majority of the 9 matchups wins the series. Results: Boston beats Montreal 6–3; New York beats Boston 6–3; Montreal beats New York 5–4 — an intransitive cycle (NY > BOS > MTL > NY).

## 4. Equations & assumptions
No equations stated — the "model" is arithmetic counting of pairwise comparisons (e.g., Montreal's 4 beats New York's 3, 3, and 0; loses to nothing... as tabulated). Assumptions: (a) team strength decomposes into three independent, equally weighted dimensions; (b) each dimension's dollar spend maps monotonically to matchup wins; (c) all 9 cross-dimension matchups count equally; (d) series are long enough that majority-of-9 is the outcome. None are empirically grounded.

## 5. Features / target
- Inputs: hypothetical salary allocations (three integers summing to 6).
- Target: series winner by majority of 9 matchup comparisons. Horizon: a playoff series of indefinite length.

## 6. Validation design
None. No data, no calibration, no comparison to real playoff outcomes, no sensitivity analysis on the $6M cap or the three-category decomposition.

## 7. Numerical results / baselines
The only numbers are the matchup tallies: BOS over MTL 6–3, NY over BOS 6–3, MTL over NY 5–4. There are no baselines, no confidence intervals, no empirical results of any kind. The paper's conclusion — that for any strategy a counter-strategy exists within the same cap — is asserted from the constructed example, not estimated.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **No empirical content whatsoever.** Nothing is estimated or tested; the example is constructed to produce the cycle.
- The 9-matchup counting scheme is arbitrary: why should Offence-vs-Goalie count the same as Defence-vs-Defence? Real hockey has no such symmetric cross-dimension contest.
- Salary-cap allocations in the example ($6M total) are toy-scale and unrelated to actual NHL cap structure.
- Intransitive dice are a known mathematical curiosity (Gardner 1970); the paper adds no new result — it is an exposition with hockey team names.
- External validity to NFL: the *intuition* (matchups are not transitive; stylistic advantages exist) is valid, but the paper provides no method to detect, measure, or exploit it.

## 10. GSE overlap
Per the existing-research map (2026-09-21): gap list item 11 notes non-NFL sports depth is thin, but this paper has no data or method to absorb — it is not "NHL research," it is a math note. GSE's matchup-modeling work (unit matchups in gse-lab, coverage/run-type matchup tables from Statyx, WR coverage upgrades) already operationalizes the *substance* of this paper's intuition — that specific unit-vs-unit matchups matter beyond aggregate strength — with real data. **No new capability; the intuition is already implemented better.**

## 11. GSE implementation spec
None — verdict is REJECT. The actionable version of "nontransitive matchups" already exists in GSE as unit-level matchup features.

## 12. Reproducible test
Not applicable — REJECT. There is nothing to reproduce; the tallies are arithmetic.

## 13. Acceptance / rejection gate
REJECT. Criteria: (a) zero empirical content — no data, no estimation, no validation; (b) no transferable method (the counting scheme is ad hoc and sport-specific to a toy); (c) the underlying intuition is already covered by GSE's existing matchup-feature work. Any empirical paper on matchup nontransitivity would be welcome; this is not one.

## 14. Improvement experiment
The experiment worth running instead: test for *real* intransitivity in NFL unit matchups — e.g., does team A's pass offense vs team B's pass defense, conditioned on B's pass defense vs C's pass offense, systematically violate transitivity in out-of-sample EPA? Fit pairwise unit-strength Bradley-Terry models and test whether adding explicit matchup-interaction terms beats the transitive baseline on held-out seasons. That would be the empirical version of this paper's claim.
