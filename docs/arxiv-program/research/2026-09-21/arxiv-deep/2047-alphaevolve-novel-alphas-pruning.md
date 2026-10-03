# [2047] AlphaEvolve: A Learning Framework to Discover Novel Alphas in Quantitative Investment (arXiv:2103.16196)

**Citation:** Cui et al. (2021). *AlphaEvolve: A Learning Framework to Discover Novel Alphas in Quantitative Investment*. arXiv:2103.16196v2. URL: https://arxiv.org/abs/2103.16196
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~11,000 words).
**Verdict:** ADAPT

*Why:* the redundancy-pruning + fingerprint-caching search accelerator and the "new alpha" class (scalar/vector/matrix operands with selective relational injection) are both portable; the 15%-correlation weak-correlation mining protocol is the cleanest set-construction rule in the lane.

## 1. Research question
Formulaic alphas (scalar expressions) generalize well and can be mined into weakly correlated sets but underfit; ML alphas (vector/matrix models) predict better but can't be mined into weakly correlated sets. Can a new alpha class — modeling scalar, vector, AND matrix features, evolved by an AutoML-style search (inspired by AutoML-Zero) with selective relational domain knowledge — beat both, and can a redundancy-pruning + fingerprinting technique make that large search tractable?

## 2. Dataset / schema
NASDAQ 5-year daily data 2013–2017: 1,220 days total → 988 train / 116 validation / 116 test days; after filtering (insufficient samples; too-low prices) 1,026 stocks remain. 13 features: close-price moving averages (5/10/20/30d), close volatilities (5/10/20/30d), open/high/low/close/volume; each normalized by its per-stock max. Target: next-day stock return. Sector labels used for relational injection.

## 3. Method / model
**New alpha class:** an alpha is a program with three components — Setup(), Predict(), Learn() — operating on scalar, vector, and matrix operands (max allowed: 10 scalar, 16 vector, 4 matrix operands; ops per function capped at 21/21/45). Operators include arithmetic plus ML-ish ops; relational domain knowledge (same-sector stocks move together) is *selectively* injected — only where it helps, because the authors note the blanket sector assumption fails in volatile markets (critique of RSR/Feng et al. 2019).
**Search:** evolutionary (population 100, tournament 10, per-op mutation prob 0.9), AutoML-Zero-style; during evolution each candidate trained 1 epoch for fast fitness eval.
**Redundancy pruning (Sec. 4.2):** represent alpha as a graph (operators=edges, operands=nodes; prediction s_1 = root). From root, recursively mark nodes redundant unless a leaf is the input feature matrix m_0; prune ops with redundant output operands (e.g., overwritten assignments like s_1^{(4)} superseded by s_1^{(8)}, dead branches like s_8 not feeding the prediction, alphas never reading m_0). **Fingerprinting without evaluation:** hash the pruned op-string → number; cache hit → reuse stored fitness; miss → evaluate once and store. Two efficiency wins: early evolution is full of redundant ops (pruned, not evaluated); late evolution's fragile mutants often become redundant (pruned).
**Weak-correlation mining:** hedge-fund standard 15% sample Pearson correlation cutoff (Kakushadze 2016): evolve in rounds; after each round keep the best-SR alpha into set A; in later rounds discard candidates correlating >15% with any alpha in A (correlation of portfolio returns on validation). 60-hour time budget per round.

## 4. Equations & assumptions
- Return: R = (P_t − P_{t−1})/P_{t−1}.
- Portfolio: long top-50 predicted returns (V_l), short bottom-50 (V_s), cash-balanced; NAV^t = V_l^t + V_s^t − C^t; R_p^t = (NAV^t − NAV^{t−1})/NAV^{t−1}; SR = (R̄_p − R_r)/σ_p, R_r = 0, annualized over 252 days.
- Weak correlation: |Pearson(portfolio returns)| ≤ 15%.
- Assumptions: 15% cutoff is the right diversification bar; one-epoch fitness approximates converged fitness (rank-preserving); pruned-op fingerprint equality implies fitness equality (true for deterministic eval); selective relational injection chosen by the search, not by hand; 116-day validation/test windows are representative.

## 5. Features / target
Inputs: 13 features (4 MAs, 4 volatilities, OHLCV), per-stock max-normalized; sector labels for relational ops. Target: next-day return. Fitness: validation Sharpe ratio of the long-short portfolio (and IC).

## 6. Validation design
Time-ordered 988/116/116 day split. Baselines: alpha_G (standard GA, Lin et al. 2019b settings: crossover 0.4, subtree-mut 0.01, hoist 0, point-mut 0.01, point-replace 0.4), Rank_LSTM, RSR (graph + sector relations, best reported on this dataset), and four AlphaEvolve initializations (domain-expert alpha, no-op, random, 2-layer NN). 5 seeds for LSTM/RSR. Five mining rounds with tightening 15% correlation cutoffs, 60h/round. Metrics: Sharpe ratio, IC, correlation with existing set.

## 7. Numerical results / baselines
- Table 1 (round 0): domain alpha alpha_D_0: SR 4.111784, IC 0.013159 → evolved alpha_AE_D_0: **SR 21.323797, IC 0.067358**, correlation with existing 0.030301; GA alpha_G_0: SR 13.034052, IC 0.048853. (SRs are validation-set annualized; quoted exactly as in the paper.)
- Table 2 (weak-correlation rounds): AlphaEvolve stays positive every round (AE_D_1 SR 13.58, AE_D_2 15.07, AE_B0_4 9.50; ICs 0.028–0.067), while the GA collapses under correlation cutoffs: alpha_G_2 SR −1.936161 (IC 0.000779), alpha_G_3 SR −1.971355 — search stopped for round 4. Interpretation (paper's): GA's arithmetic-only small search space can't find novel weakly-correlated alphas.
- All four initializations (domain/no-op/random/NN) evolve to competitive alphas (round-0 SRs 10.7–21.3), showing low sensitivity to initialization.

## 8. Code / data availability
None stated (no repo URL in text). Builds on AutoML-Zero (Real et al. 2020) ideas.

## 9. Leakage & limitations
- Validation set (116 days) is used both for fitness during evolution AND for the 15% correlation cutoff — double-dipping on validation; test-set results are reported but the selection happened on validation.
- One-epoch fitness approximation is unvalidated for rank preservation.
- The 60h/round budget comparison favors the method with the pruning accelerator — wall-clock parity, not evaluation-count parity, vs. the GA.
- SR 21.3 on 116 validation days is an extreme in-sample-flavored number; annualized from ~5 months of data.
- No transaction costs in the long-short portfolio eval.

## 10. GSE overlap
New capability; the pruning+fingerprinting accelerator is the single most reusable engineering idea in the lane so far (applies to ANY program-based sports signal search, including the GP/RL miners of 2043/2044/2046). The 15% correlation round-protocol is a cleaner set-construction rule than ad-hoc zoo cutoffs. No overlap in the research map.

## 11. GSE implementation spec
1. Represent sports signals as small programs (Setup/Predict/Learn over team-game panel; operands: scalars like rest days, vectors like trailing EPA series, matrices like team×week panels).
2. Implement the redundancy pruner: build op-graph, drop dead/overwritten ops, fingerprint pruned program → cache evaluated fitness (Brier/IC). This directly accelerates the hierarchical GP (2046) or QFR (2044) miners — estimated 2–5× fewer wasted evaluations.
3. Mine in rounds with a 15% correlation cutoff on signal *PnL* (not raw values) to build the weakly-correlated set; cap set size at ~20.
4. Selective relational injection analogue: division/conference grouping ops available to the search but not forced — let evolution decide whether "division-mate" relations help.
5. Effort: ~2 weeks for pruner+cache; program representation ~1 week.

## 12. Reproducible test
nflverse team-game panel 2009–2025. Evolve programs on 2009–2019 (fitness = validation Brier on 2020–2021 with 15% PnL-correlation cutoff vs. accepted set), test 2022–2025. Baselines: same miner without pruning (measure eval-count and wall-clock to parity) and without correlation rounds. Metric: test Brier of the accepted set + count of accepted signals.

## 13. Acceptance / rejection gate
ADAPT→build if pruning cuts evaluations-to-target-fitness by ≥ 2× vs. no-prune control at equal final test Brier AND the 15%-cutoff set beats the unconstrained set by ≥ 0.002 Brier on 2022–2025. REJECT if one-epoch/fast fitness doesn't rank-preserve (top fast-eval candidates flop on full eval) or the correlation rounds produce no incremental lift.

## 14. Improvement experiment
Beyond the paper: fingerprint on *behavioral* equivalence, not syntactic — two programs with different ops but identical weekly signal vectors should share a cache entry (the paper hashes the pruned op-string, missing semantic duplicates). Implement by hashing the quantized signal vector on a fixed probe panel. Second: replace the fixed 15% cutoff with an adaptive cutoff derived from the deflated Sharpe of the marginal signal — accept a correlated signal only if its incremental Sharpe survives multiple-testing correction, unifying the paper's two ideas (correlation control + significance) into one gate.
