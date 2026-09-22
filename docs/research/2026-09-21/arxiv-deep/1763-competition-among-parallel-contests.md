# 1763 Competition among Parallel Contests (arXiv:2210.06866v1)

**Citation:** Xiaotie Deng, Ningyuan Li, Weian Li, Qi Qi (2022). *Competition among Parallel Contests*. arXiv:2210.06866v1. URL: https://arxiv.org/abs/2210.06866
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

When multiple contests run in parallel (crowdsourcing platforms, conferences), how do contestants strategically choose which contest to enter, and how should contest DESIGNERS set prize structures to compete for participants? The paper characterizes the symmetric Bayesian Nash equilibrium of contestant choice, proves designer best-response is NP-hard (with an FPTAS), and gives worst-case guarantees for designer strategies under unknown competition.

## 2. Dataset / schema

No dataset — pure mechanism-design theory. Motivating examples: Amazon Mechanical Turk, TopCoder, academic conferences. Contestants have private skill types; designers have budgets and choose prize structures.

## 3. Method / model

Two games: (1) contestants choose one contest to maximize expected prize given their skill type and the prize structures (symmetric BNE characterized via cumulative equilibrium behavior / quantile functions); (2) designers choose prize structures to maximize total participant value (best-response NP-hard; FPTAS for ε-approximate best response; constant-ratio worst-case guarantee when competitors' strategies are unknown).

## 4. Equations & assumptions

- Contestant BNE: characterized by H*_j(q) = x_j^{-1}(X) for quantile functions (Theorem 3.1) — highly technical, quantile-based.
- Designer best-response: NP-hard; FPTAS achieves (1−ε)-approximation.
- Assumptions: contestants participate in exactly one contest; skill types are private but distributionally known; designers maximize total participant value (not profit).

## 5. Features / target

No features — theoretical. The "target" is the equilibrium characterization and approximation algorithms.

## 6. Validation design

Mathematical proofs only. No empirical validation, no simulations reported.

## 7. Numerical results / baselines

No numerical results. Theoretical guarantees only (NP-hardness, FPTAS ratio, constant-factor worst-case bound).

## 8. Code / data availability

No code or data. Proofs are self-contained.

## 9. Leakage & limitations

- **Designer-side, not player-side:** the paper's actionable results (FPTAS, worst-case guarantees) are for contest DESIGNERS (platforms). GSE is a player/advisor, not a contest operator.
- **No sports, no data:** crowdsourcing/conference motivation; the contestant model is about skill-signaling effort, not DFS field selection.
- **Contestant model too abstract:** the BNE characterization is in quantile-function terms with no computable prescription for "which DFS contest should I enter."
- **"Contest selection" mismatch:** the lane's "contest selection" means a DFS player picking soft fields/good payouts. This paper's contestant-choice model doesn't estimate field softness or provide a selection rule.

## 10. GSE overlap

The corpus has contest-recommendation work (1093, personalized contest recommendation) which is the applied version of contest selection. This paper adds only abstract equilibrium theory with no implementable selection rule. No overlap, but no value either.

## 11. GSE implementation spec

None — there is no implementable artifact for GSE's DFS operation. The FPTAS is for prize-structure design (operator-side); the BNE is not computable into a contest-picking rule without the paper's distributional assumptions, which don't match DFS.

## 12. Reproducible test

Not applicable — no empirical claims to reproduce.

## 13. Acceptance / rejection gate

**Reject** because the paper's results are operator-side mechanism design with no player-side contest-selection rule, no sports content, and no data. The quantile-function equilibrium cannot be operationalized for DFS contest picking.

## 14. Improvement experiment

None — no foundation to build on for GSE's lane.

**Verdict:** REJECT — Contest-designer mechanism design (crowdsourcing/conferences) with no implementable DFS contest-selection rule, no sports content, and no data. The "contest selection" in the lane brief means player-side field/payout picking; this paper is the other side of the market.
