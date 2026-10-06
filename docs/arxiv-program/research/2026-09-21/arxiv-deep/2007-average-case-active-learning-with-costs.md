# [2007] Average-Case Active Learning with Costs (arXiv:0905.2997)

**Citation:** Guillory, A., Bilmes, J. (2009). *Average-Case Active Learning with Costs*. arXiv:0905.2997 (UWEE Technical Report UWEETR-2009-0005). URL: https://arxiv.org/abs/0905.2997
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** the theoretical foundation for cost-aware acquisition: greedy max-(shrinkage/cost) with logarithmic approximation guarantees; justifies GSE's value-per-dollar acquisition rules, but pure theory with no experiments, no code, and no deep-learning instantiation.

## 1. Research question
Can the greedy active learning analysis (Dasgupta 2004: greedy shrinkage-maximization is near-optimal for binary, unit-cost, uniform-ish settings) be extended to the general setting where queries have different costs, more than two possible responses, and the hypothesis prior is non-uniform — with the expected cost (not label count) as the objective?

## 2. Dataset / schema
None — pure theory paper (technical report). No datasets, no experiments, no empirical validation. The "twenty questions" motivation covers label costs (e.g., document length ∝ labeling time), multiclass/partial label queries (e.g., parse-tree fragments), and batch mode (parallel labelers, fixed per-question overhead).

## 3. Method / model
Cost-sensitive greedy (Algorithm 1): maintain version space S; at each step ask the question maximizing the shrinkage-cost ratio Δ_i(S,π_S)/c_i, where shrinkage Δ_i(S,π) = Σ_j [π(S^j)/π(S)]·(Σ_{k≠j} π(S^k)) = π(S) − Σ_j π(S^j)²/π(S) (expected version-space mass eliminated). Then restrict to hypotheses consistent with the answer; repeat until |S|=1.
Analysis machinery: tree cost C(T,π) = Σ_h π(h)c_T(h) (expected path cost); cost decomposition Lemma 1; shrinkage monotonicity under version-space restriction (Lemma 2, Corollary 1); collision probability CP(v) = Σ_z v(z)²; key lower bound (Lemma 3): if no question has large shrinkage-cost ratio and CP is low, any tree is expensive — C(T,v_R) ≥ (c/Δ)·v(R)·(1−CP(v_R)); Corollary 2 converts this into "some question always has shrinkage-cost ratio ≥ (1−CP(π_S))/C(T,π_S)". Special case CP(π_S) > 1/2 (one hypothesis holds >half mass): Lemmas 4–5 show greedy removes mass-per-cost at ≥half the rate of any question (δ_i/c_i ≥ 1/(2C*(h₀))).
ε-approximate greedy (Algorithm 2): when argmax over questions is infeasible (e.g., batch AL has a question per subset — exponentially many), accept any question within (1−ε) of the max shrinkage-cost ratio; costs only a 1/(1−ε) factor.

## 4. Equations & assumptions
- Shrinkage: Δ_i(S,π) = π(S) − Σ_j π(S^j)²/π(S); shrinkage-cost ratio Δ_i(S,π)/c_i.
- Tree cost: C(T,π) = Σ_{h∈H} π(h)c_T(h); π_S(s) = π(s)/π(S).
- Theorem 2 (cost-independent): C(T^g,π) ≤ 12C*·ln(1/min_h π(h)), C* = min_T C(T,π). "Surprising... the quality of approximation does not depend on the costs themselves."
- Theorem 4 (distribution-independent, via rounding π up at threshold c_min/(c_max·n³); Lemma 6: rounding changes any irreducible tree's cost by a factor in [1/2, 3/2]): C(T^g,π) ≤ O(C*·ln(n·c_max/c_min)) — "this rounding method introduces a dependence on the costs, so neither bound is strictly better."
- Theorem 5/6 (ε-approximate): C(T^ε,π) ≤ (12/(1−ε))C*·ln(1/min_h π(h)).
- Related-work table: this paper is the only one with k>2 answers AND non-uniform costs AND non-uniform prior (bounds: O(log(1/min π)) and O(log(n·c_max/c_min))).
- Assumptions: finite hypothesis set with a unique zero-error hypothesis; unambiguous questions (each maps each hypothesis to one answer); known π, questions, and costs; realizable/separable setting.

## 5. Features / target
n/a — decision-theoretic. "Features" are questions (label queries, batch queries, partial queries); target is identifying h* at minimum expected cost.

## 6. Validation design
None — no experiments, no baselines, no metrics. Validation is by proof (induction on |S|, two cases on collision probability).

## 7. Numerical results / baselines
No numerical results. The quantitative claims are the approximation factors: 12·ln(1/min π) (Theorem 2), O(ln(n·c_max/c_min)) (Theorem 4), 12/(1−ε)·ln(1/min π) (Theorem 5). Prior baseline restated: Dasgupta 2004's 4·ln(1/min π) for the binary unit-cost case.

## 8. Code / data availability
None stated. Technical report; no implementation.

## 9. Leakage & limitations
- No empirical validation whatsoever — the greedy rule's practical behavior (myopic, ignores batch diversity) is untested; the modern batch-AL literature (ledgers 2002–2006) shows pure greedy information-maximization correlates badly in batches, which this analysis doesn't address.
- Finite, realizable hypothesis class with known π and known costs — GSE's hypothesis space is effectively infinite and π is unknown; the bounds don't transfer directly.
- The version-space/shrinkage quantities are intractable for deep models (this is exactly why ledgers 2002–2004 use gradient/MC-dropout/projection approximations).
- Batch-mode treatment is brief: only helps "if the cost of querying for a batch of labels is in some cases less than the sum of the corresponding individual label costs" (parallel labelers, fixed overhead) — no batch-diversity analysis.
- Agnostic (non-realizable) extension stated as open ("Much work also remains").

## 10. GSE overlap
No cost-aware theory in the existing map. This paper is the theoretical license for the improvement experiments proposed in ledgers 2003/2004/2005 (value-per-dollar greedy acquisition): it proves that maximizing information-per-unit-cost greedily is within a logarithmic factor of optimal, that the guarantee does NOT degrade with cost heterogeneity (Theorem 2), and that approximate maximization (needed when the acquisition space is huge) costs only 1/(1−ε). It converts those proposals from heuristics into principled rules. New capability (cost-aware acquisition theory), not a duplicate.

## 11. GSE implementation spec
- Operationalize the shrinkage-cost ratio for charting acquisition: score(x) = Δ(x)/c(x), where Δ(x) = expected model-change (approximate via BADGE gradient norm, BatchBALD joint MI, or ACS-FW leverage score from ledgers 2002–2004) and c(x) = charting cost in dollars/minutes for that game (FTN per-game price, manual charting time, feed subscription amortized).
- Batch rule: greedy by Δ/c with the ε-approximate license (Theorem 5) — since exact joint optimization over batches is infeasible, a (1−ε)-approximate greedy over the pool is provably near-optimal; ε absorbs the MC-dropout/projection estimation noise from ledgers 2003–2004.
- Batch discount modeling: encode the paper's batch-cost condition explicitly — charting the 2nd game from the same team/week costs less (shared context); model c(batch) as subadditive and let greedy exploit it.
- Prior π: use market-implied game importance (handle/edge) as the non-uniform prior over "which games matter" — the paper's non-uniform π machinery justifies weighting by economic importance.
- Effort: ~1 week (cost model + Δ/c scorer on top of existing acquisition from ledgers 2002–2004; no new ML).

## 12. Reproducible test
Same charting-budget simulation as ledgers 2002–2004 (nflverse 2023–2024, binary cover head), but with heterogeneous costs: assign each game a cost c(x) ∈ {1, 2, 5} (cheap: nflverse-only; medium: FTN charting; expensive: manual all-22 charting), fixed total dollar budget. Compare greedy Δ/c vs. greedy Δ (cost-blind) vs. random on 2024 held-out log-loss per dollar spent. Baseline to beat: cost-blind greedy at equal dollar budget.

## 13. Acceptance / rejection gate
ADOPT the Δ/c rule iff it beats cost-blind greedy Δ at equal dollar budget by ≥ 0.005 held-out log-loss on the 2024 holdout (i.e., cost-awareness buys real efficiency, as the theory predicts), with the gain replicated when costs are re-randomized (not an artifact of one cost assignment). REJECT if Δ/c underperforms Δ at equal count budget by > 0.01 (cost-awareness distorting the information signal) or if cost heterogeneity in practice is too small to matter (c_max/c_min < 2 → Theorem 4's log factor is negligible; keep the simpler rule).

## 14. Improvement experiment
Learned cost model + adaptive ε: fit c(x) from actual charting invoices/labor logs (rather than the {1,2,5} tiers), and adapt the greedy approximation quality ε to the budget state — exact-ish (small ε) early in the week when budget is plentiful, coarse (large ε) when budget is nearly exhausted. Test whether adaptive-ε Δ/c beats fixed-ε on log-loss-per-dollar — hypothesis: the 1/(1−ε) penalty is cheapest to pay exactly when the remaining budget can't fund the marginal gain anyway, formalizing "don't over-optimize the last dollar."
