# 1764 Robust Tournaments (arXiv:2507.16348v1)

**Citation:** Mikhail Drugov, Dmitry Ryvkin (2026). *Robust Tournaments*. arXiv:2507.16348v1. URL: https://arxiv.org/abs/2507.16348
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).

## 1. Research question

What prize structure maximizes the minimum effort in a rank-order tournament when the designer knows NOTHING about the noise distribution except an upper bound on its Shannon entropy? The paper characterizes the robust-optimal scheme: positive prizes to all ranks except last, a distinct top prize, asymptotically harmonic prize differentials, inducing an exponential noise distribution; Gini coefficient → 1/2 as participants grow.

## 2. Dataset / schema

No dataset — pure economic theory. Motivation: innovation races, firm bonuses, sales contests, sports prize inequality (cites tennis/poker prize profiles as empirical context, but uses no sports data).

## 3. Method / model

Max-min: choose the prize vector maximizing the worst-case (over noise distributions with entropy ≤ H̄) minimum effort. Solution via the dual: the robust scheme makes the designer indifferent across noise distributions by inducing an exponential distribution. Asymptotic characterization via harmonic numbers.

## 4. Equations & assumptions

- Robust prize: p_k − p_{k+1} ∝ 1/k (harmonic differentials); p_n = 0 (last place gets nothing); p_1 distinct top prize.
- Induced worst-case noise: exponential with rate e^{−H̄}.
- Gini → 1/2 as n → ∞.
- Assumptions: rank-order tournament; effort is costly and unobservable; noise entropy bounded; designers maximize minimum effort (not total output or participation).

## 5. Features / target

No features — theoretical. Output is the prize-schedule characterization.

## 6. Validation design

Mathematical proofs only. No empirical validation.

## 7. Numerical results / baselines

No numerical results. The harmonic schedule and Gini→1/2 are asymptotic theoretical results.

## 8. Code / data availability

No code or data. Proofs self-contained.

## 9. Leakage & limitations

- **Designer-side:** the entire paper is about how a principal SHOULD set prizes. GSE doesn't design contests; it plays/advises on them.
- **No "exploitation" content:** the lane's "payout-structure exploitation" means a PLAYER extracting edge from payout structures. This paper tells designers how to make structures unexploitable (robust) — the opposite direction, and not actionable for a player.
- **No sports data:** the sports mentions (tennis, poker prize inequality) are literature citations, not analysis.
- **Max-min effort objective:** DFS players don't maximize "effort"; the objective doesn't map to lineup construction.

## 10. GSE overlap

The corpus has DFS payout-structure work (1601.04203). This paper's harmonic schedule could theoretically serve as a benchmark for "is this contest's payout structure standard or anomalous," but that diagnostic is too thin to support a ledger's implementation spec, and the paper provides no player-side exploitation method.

## 11. GSE implementation spec

None implementable. The harmonic-schedule benchmark (flag contests whose payouts deviate sharply from harmonic as potentially mispriced) was considered and rejected: deviation from a robust-design benchmark does not imply player-exploitable edge, and the paper gives no method to convert deviation into a lineup decision.

## 12. Reproducible test

Not applicable — no empirical claims.

## 13. Acceptance / rejection gate

**Reject** because the paper is principal-side prize-design theory with no player-side exploitation method, no sports data, and no implementable artifact for DFS lineup construction or contest selection.

## 14. Improvement experiment

None — designer-side theory with no player-side transfer.

**Verdict:** REJECT — Robust prize-design theory for contest operators (max-min effort). No player-side payout-exploitation method, no sports data, nothing implementable for GSE's DFS operation.
