# [1180] Prior-Agnostic Robust Forecast Aggregation (arXiv:2604.24517v2)

**Citation:** Chen, Z., Peng, C., & Tang, W. (2026). *Prior-Agnostic Robust Forecast Aggregation*. arXiv:2604.24517v2 [cs.LG]. URL: https://arxiv.org/abs/2604.24517
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org; all sections read including the log-odds aggregator derivation, the conditionally-independent / Blackwell-ordered / unrestricted regimes, the known-marginals extension, and the numerical optimization protocol).
**Verdict:** ADAPT — a plug-and-play closed-form binary combiner, logit(f_α(x_1,x_2)) = α·logit(x_1) + α·logit(x_2) with α=0.585, that GSE can drop into the ensemble for any two-model sub-panel (or pairwise tournament) with a certified near-minimax regret of 0.025512; the known-marginals variant (α=0.656089, γ=0.498268) additionally corrects for market base rates.

## 1. Research question
What is the minimax-optimal aggregator of two experts' forecasts for a binary event when the prior is *unknown* (prior-agnostic), under squared loss — and does a simple parametric log-odds rule attain it across information-structure classes (conditionally independent, Blackwell-ordered, unrestricted)? (Abstract; Sec. 1)

## 2. Dataset / schema
No real data. Numerical experiments: global heuristic search over information structures followed by grid refinement at 10^-5 to estimate worst-case regrets of the parametric family; the paper is explicit that these are numerical (not fully analytic) guarantees. (Secs. 4–5)

## 3. Method / model
The paper studies the one-parameter family logit(f_α(x_1,x_2)) = α·logit(x_1) + α·logit(x_2) — a symmetric log-odds averaging with shrinkage α < 1 (extremizing/dampening). For each structure class it numerically optimizes α for minimax regret: conditionally independent signals → α=0.585; known {0,1} state → α=0.5168; Blackwell-ordered → exact minimax ≈0.022542 (attained near the same family); unrestricted structures → exact minimax 0.25 (aggregation is hopeless — a useful impossibility benchmark). Extension: with known marginal forecast distributions, the generalized rule subtracts γ·logit(μ) (a base-rate correction), optimized at α=0.656089, γ=0.498268. (Secs. 2–5)

## 4. Equations & assumptions
- Aggregator: logit(f_α(x_1,x_2)) = α·logit(x_1) + α·logit(x_2).
- Conditionally independent signals: α=0.585, reported worst-case regret 0.025512; lower bound 31/1326 ≈ 0.023379.
- Known {0,1} state: α=0.5168, reported regret 0.022599.
- Blackwell-ordered: exact minimax ≈ 0.022542.
- Unrestricted structures: exact minimax 0.25.
- Known marginals: rule subtracts γ·logit(μ); α=0.656089, γ=0.498268; reported regret 0.022763.
- Assumptions stated: binary state in [0,1] (unknown value), unknown prior, two experts, squared loss; experts' forecasts are their true posteriors. Numerical claims rest on heuristic global search + 10^-5 grid refinement — the paper flags these as numerical, not analytic, certificates.

## 5. Features / target
Inputs: two forecasts x_1, x_2 ∈ [0,1] (plus, in the extension, the known marginal mean forecast μ). Target: binary-event probability. One-shot.

## 6. Validation design
No real data; validation is the numerical minimax computation (heuristic search + fine grid) against the analytic lower bounds (31/1326, 0.022542, 0.25). The "test" is how close the parametric family's worst case comes to the lower bound. (Secs. 4–5)

## 7. Numerical results / baselines
- CI signals: α=0.585 → regret 0.025512 vs. lower bound 31/1326 ≈ 0.023379 (gap ≈ 0.0021).
- Known {0,1}: α=0.5168 → 0.022599.
- Blackwell-ordered: minimax ≈ 0.022542 (essentially the same floor as the level-one literature, cf. ledgers 1174/1175).
- Known marginals: α=0.656089, γ=0.498268 → 0.022763.
- Unrestricted: 0.25 exact — i.e., with adversarially correlated experts, no aggregator beats regret 1/4.
Distinguish: regrets are worst-case over structure families in the numerical game, not empirical forecast errors. The practical takeaway the paper supports: α≈0.5–0.6 log-odds dampening is near-minimax across all tractable regimes.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
(1) Two experts only — GSE panels are larger; pairwise application is a heuristic without theory; (2) regret numbers are numerical (heuristic search + grid), so the "near-minimax" claim has optimization-error caveats the authors acknowledge; (3) squared loss only; the log-loss/Kelly-relevant case is untouched; (4) the 0.25 unrestricted impossibility assumes a fully adversarial nature — real model panels are not adversarial, so it is a pessimistic bound; (5) no real-data validation.

## 10. GSE overlap
Complements the aggregation workstream (ledgers 1174/1175/1177/1178/1179) as its simplest deployable member: where 1174 gives a game-theoretic rule and 1177 gives a Bayesian one, this gives a *closed-form two-line* combiner with tuned constants. The known-marginals variant (subtract γ·logit(μ)) is conceptually the same move as the repo's market-relative modeling (de-vigged consensus as base rate; cf. market-microstructure lane and 1211.4000) but derived from minimax theory rather than heuristics — worth testing head-to-head against GSE's current market-adjustment. Not a duplicate of anything in the map.

## 11. GSE implementation spec
1. Implement f_α for the two strongest engine components (or best pair by validation log-loss) with α=0.585 as the challenger combiner. 2. Implement the marginal-corrected variant with μ = de-vigged market consensus, α=0.656089, γ=0.498268, as a market-aware challenger. 3. Backtest both walk-forward on `picks` 2025 vs. current combiner and vs. simple average (α=1) to isolate the dampening effect. 4. If it wins, generalize: round-robin pairwise f_α over all components, then average the pairwise outputs (heuristic n-expert extension). Effort: ~1–2 days; the rule is two lines.

## 12. Reproducible test
Dataset: GSE `picks` 2024 (pair selection) → 2025 (frozen test), per-component probabilities + market consensus. Metric: Brier and log-loss, walk-forward by week. Baselines: current combiner, simple average of the pair (α=1), logit-average without dampening. Window: 2025 regular season fixed in advance. Gate: adopt if α=0.585 beats simple average by ≥0.002 Brier (DM p<0.05).

## 13. Acceptance / rejection gate
ADOPT the dampened log-odds pair combiner if it beats the simple (α=1) average by ≥0.002 Brier on 2025 walk-forward (DM p<0.05) with no log-loss regression; separately ADOPT the marginal-corrected variant if it additionally beats the plain α=0.585 rule by ≥0.001 Brier. REJECT both otherwise — the theory is only worth shipping if the dampening constant transfers to real correlated panels.

## 14. Improvement experiment
Go beyond the paper: fit α (and γ) *empirically* on GSE data rather than using the paper's minimax constants — i.e., choose α to minimize walk-forward log-loss on 2024, then test on 2025, and compare the empirical α* to 0.585. If α* differs systematically (e.g., real panels need stronger dampening because of correlation the paper's CI analysis excludes), derive a correlation-adjusted α rule: α as a decreasing function of the components' forecast correlation. This converts the paper's worst-case constants into a data-adaptive combiner and tests the paper's core robustness claim where it matters.
