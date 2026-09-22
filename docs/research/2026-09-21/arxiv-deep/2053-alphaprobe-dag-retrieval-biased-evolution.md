# [2053] AlphaPROBE: Alpha Mining via Principled Retrieval and On-graph Biased Evolution (arXiv:2602.11917)

**Citation:** Taian Guo, Haiyang Shen et al. (2026). *AlphaPROBE: Alpha Mining via Principled Retrieval and On-graph Biased Evolution*. arXiv:2602.11917v1. URL: https://arxiv.org/abs/2602.11917
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, ~11,100 words).
**Verdict:** ADAPT

*Why:* reframing the signal zoo as a navigable DAG (nodes = factors, edges = evolutionary links) with a Bayesian retriever balancing exploitation/exploration is the missing global-view layer over GSE's local chain-based mining; it directly attacks redundant search.

## 1. Research question
Existing automated mining follows two paradigms: Decoupled Factor Generation (each factor an isolated event — weak implicit relations) and Iterative Factor Evolution (local parent-child refinements — no global view). Both lack a global structural view of the factor pool, causing redundant search and limited diversity. Can alpha mining be reframed as strategic navigation of a DAG — factors as nodes, evolutionary links as edges — with principled retrieval and DAG-aware generation?

## 2. Dataset / schema
CSI 300 / CSI 500 / CSI 1000 (Qlib). Train 2010-01–2020-12, validation 2021-01–2022-06, test 2022-07–2025-06. Metrics: IC/ICIR/RIC/RICIR vs. 20-day forward returns; portfolio AR/MDD/SR. Factor pool capacity 50, factor length threshold 40 (same as baselines); when full, lowest-quality factor evicted but retained in graph 𝒢 for topology completeness. Quality measure: |ICIR| on training period (Eq. 5). Depth penalty γ=0.05, retrieval penalty ω=0.10. Baselines: Alpha158 (expert pool), DFG methods (AlphaGen, AlphaForge, AlphaQCM, AlphaSAGE), IFE methods (GP, AlphaAgent, R&D-Agent(Q)). All use the same dynamic factor integrator (§4.3) for fairness.

## 3. Method / model
Closed loop, two components:
1. **Bayesian Factor Retriever**: selects seed factors via a posterior probability model balancing exploitation (high |ICIR| quality) and exploration, with priors, likelihood, topology penalty, and a natural-language feedback (NLF) term; embedding model Qwen3-Embedding-4B (Eq. 8).
2. **DAG-aware Factor Generator**: LLM (DeepSeek V3.1 backbone) generates 5 candidates per step (Eq. 14–15), conditioned on the *full ancestral trace* of the seed in the DAG — context-aware, non-redundant refinements instead of single-parent local edits.
The graph 𝒢 grows with every generation; evicted factors stay as topology. On-graph biased evolution = the generator is biased by graph position (depth, neighborhood quality, unexplored regions).

## 4. Equations & assumptions
- Seed quality = |ICIR| on train (Eq. 5).
- Posterior retrieval with prior/likelihood/topology-penalty/NLF decomposition (Eq. 8 uses embeddings).
- Generation count 5/iteration (Eq. 14–15); γ=0.05, ω=0.10.
- Assumptions: evolutionary topology carries transferable information; ancestor traces fit in LLM context usefully; |ICIR| is the right node-quality proxy; evicted-but-retained nodes don't poison retrieval.

## 5. Features / target
Inputs: Qlib OHLCV-derived features. Target: 20-day forward returns. Factor expressions length ≤ 40.

## 6. Validation design
Three datasets × 8 baselines (Table 1): predictive metrics + backtest AR/MDD/SR. Stress episodes called out: late-2023–early-2024 bear market, April 2025 tariff turmoil (Fig. 3 CSI300 backtest). Ablation (Table 2): retriever variants (random / heuristic / MCTS / w/o prior / w/o topology penalty / w/o likelihood / w/o NLF) and generator variant (CoT).

## 7. Numerical results / baselines
- Main: AlphaPROBE achieves the highest IC, RIC, and AR on all three datasets; significantly higher ICIR/RICIR/SR and lower MDD — "enhanced stability against market regime shifts."
- CSI300 backtest: leading cumulative returns through most of the test window; controlled drawdowns + faster recoveries in the 2023–2024 bear market and April 2025 tariff turmoil (Fig. 3).
- Ablation (Table 2, metrics in %; CSI300 IC/ICIR/RIC/RICIR): full AlphaPROBE **5.84/39.02/7.20/46.94** vs. random retriever 2.95/18.71/3.18/21.65, heuristic 4.54/35.15/5.92/35.71, MCTS 4.75/35.20/5.94/36.86, w/o prior 4.13/34.88/5.68/34.42, w/o topology penalty 5.06/36.37/6.27/40.05, w/o likelihood 4.09/34.99/5.66/34.39, w/o NLF 5.15/37.01/6.40/42.17, CoT generator 5.11/31.79/6.08/39.17. Every component contributes; likelihood and prior matter most.
- Same ordering holds on CSI500 (6.26/52.39/8.78/73.18) and CSI1000 (9.04/70.49/11.35/88.02).

## 8. Code / data availability
Open-sourced: https://github.com/gta0804/AlphaPROBE.

## 9. Leakage & limitations
- DeepSeek V3.1 trained past the test window — same acknowledged LLM-knowledge caveat as other agent papers.
- |ICIR| as node quality bakes in a train-period bias; nodes that were lucky in 2010–2020 anchor the graph.
- Pool cap 50 with eviction-by-quality can thrash: a factor evicted then re-retrieved via topology.
- No transaction-cost schedule quoted in the main text for the backtest (Appendix A.1.3, not read).
- Depth penalty γ and retrieval penalty ω set by hand (0.05/0.10), no sensitivity shown.

## 10. GSE overlap
New structural layer; complements 2045 (Chain-of-Alpha's local dual chains) and 2052 (FactorEngine's experience KB) — AlphaPROBE is the global topology view those lack. No overlap in the research map.

## 11. GSE implementation spec
1. Replace GSE's flat signal list with a DAG: node = signal version, edge = derivation (mutation, combination, re-fit); retain retired signals as graph nodes (the paper's eviction rule).
2. Bayesian retriever: score candidate seeds by posterior = quality(|RankICIR| on train) × novelty(topology penalty vs. graph neighborhood) × exploration bonus; priors from MinervaScore grades (2048).
3. DAG-aware generator: when refining a signal, feed the LLM the full ancestral trace (parent formulas, their validation curves, failure notes) — not just the parent.
4. 2-island analog: maintain two subgraphs (e.g., pre-game market signals vs. in-game/team-strength signals) with periodic cross-pollination.
5. Effort: ~2 weeks; builds on existing mining loop + the open-source AlphaPROBE repo as reference.

## 12. Reproducible test
nflverse 2009–2025. Mine 2009–2019 with DAG mining vs. flat-pool mining (same LLM, same budget); validate 2020–2021; test 2022–2025. Metrics: test RankIC, zoo redundancy (mean pairwise |corr|), compute per accepted signal, regime-robustness (per-season RankIC std).

## 13. Acceptance / rejection gate
ADAPT→build if DAG mining yields ≥ 20% more test-significant signals per 100 LLM calls than flat-pool mining AND mean pairwise |corr| ≤ 0.6 AND no test-season RankIC sign flips. REJECT if the DAG machinery adds complexity without beating the flat baseline on efficiency — the topology must pay for itself.

## 14. Improvement experiment
Beyond the paper: **graph-surgery pruning** — periodically identify "dead branches" (subgraphs whose descendants all failed validation for two seasons) and hard-prune them from retrieval, but keep them as negative examples ("this whole family of constructions is exhausted"). The paper retains everything for topology completeness; active pruning focuses compute. Second: **cross-lake edges** — link GSE's signal DAG to the *paper* DAG: when an arXiv-mined technique (e.g., a new operator from 2046) is tried, record it as a node so future retrievals can see which literature ideas actually survived contact with sports data.
