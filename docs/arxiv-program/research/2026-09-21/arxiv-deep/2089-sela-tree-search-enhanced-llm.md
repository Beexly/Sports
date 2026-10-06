# [2089] SELA: Tree-Search Enhanced LLM Agents for Automated Machine Learning (arXiv:2410.17238)

**Citation:** Authors (2025). *SELA: Tree-Search Enhanced LLM Agents for Automated Machine Learning*. arXiv:2410.17238 (version verified via export API; v1 current). URL: https://arxiv.org/abs/2410.17238
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–4 + Table 2/Figure 3).
**Verdict:** ADAPT — MCTS over the experiment-configuration tree (selection → expansion → simulation → backpropagation with per-node visit counts and cumulative scores) is the principled search policy for allocating the discovery loop's nightly compute budget across competing signal hypotheses.

## 1. Research question
LLM-based AutoML agents generate low-diversity, suboptimal code even after multiple iterations. Can Monte Carlo Tree Search — with its exploration/exploitation balance — structure the agent's search over ML pipeline configurations (preprocessing → feature engineering → model training) so that experimental feedback intelligently guides which configuration to try next?

## 2. Dataset / schema
20 tabular datasets: 13 classification + 7 regression from the AutoML Benchmark (AMLB, OpenML-sourced) and Kaggle competitions (Table 4). Split 6:2:2 train/valid/test. Metrics: RMSE (regression), F1 (binary), weighted-F1 (multiclass); a Normalized Score (NS) maps RMSE to [0,1] for cross-dataset comparison. Baselines: traditional AutoML (AutoGluon et al.) and agent-based AutoML frameworks; comparison metrics = average NS, average rank, average best rank, per-dataset Wins/Losses/Top-1 counts.

## 3. Method / model
Three components (Figure 2, Algorithm 1):
1. **Insight proposer:** LLM reads the problem description + dataset info and generates a search space of candidate insights (preprocessing, feature engineering, model choices).
2. **MCTS search module:** the space is organized as a tree; each node x stores: value v(x) = cumulative score from simulations of the node and all descendants; visit count n_visits(x); stage/depth; solution code σ_sol(x) from the node's simulation. Standard MCTS cycle per rollout: **selection** (descend the tree balancing exploration/exploitation), **expansion** (add child configuration), **simulation** (the LLM executor agent plans, codes, and runs the pipeline for the selected configuration), **backpropagation** (feed the experimental score back up, updating v(x) and n_visits(x) along the path). k rollouts per problem; final solution = best-scoring simulated node.
3. **LLM executor agent:** translates the selected tree path into executable code, runs it, returns the score.

## 4. Equations & assumptions
Node statistics stated faithfully: v(x) = cumulative simulation score of node + descendants; n_visits(x) = total simulations for node + descendants; σ_sol(x) = final code after node simulation. (Selection uses the standard exploration/exploitation tradeoff; the paper cites Coulom 2007 MCTS without restating UCB — I do not invent the formula.) Assumptions: pipeline configurations factor into a tree; simulation scores are comparable across branches; LLM-generated insights cover the relevant space; k rollouts suffice.

## 5. Features / target
Inputs: problem description + dataset metadata; tree of pipeline configurations. Target: test-set metric (RMSE/F1) of the final selected pipeline; reported as NS, rank, win rate vs baselines.

## 6. Validation design
- 20 datasets × all frameworks; 6:2:2 splits; NS/rank/best-rank/Wins/Losses/Top-1.
- No time-ordered splits (tabular benchmarks, i.i.d. assumption standard for AMLB).
- Appendix C: per-dataset detail.

## 7. Numerical results / baselines
(Exact quotes.)
- SELA achieves a **win rate of 65–80% against each baseline** across all datasets ("Losses" column: each competing method loses to SELA on 65–80% of datasets); highest average NS and average best rank; most Top-1 finishes.
- Nuance: AutoGluon has a **marginally higher average rank** than SELA — but SELA's higher average NS means "it performs strongly in the datasets where it excels, while its losses in other datasets are relatively minor."
- The insight-proposer + MCTS combination is credited for escaping the "low-diversity code" trap of plain iterative LLM agents.

## 8. Code / data availability
Stated as released with the paper (standard); AMLB/OpenML datasets public.

## 9. Leakage & limitations
AMLB datasets are public and likely in LLM pretraining (insight proposer may recall rather than reason — unmeasured); 6:2:2 random splits ignore temporal structure (fine for AMLB, wrong for sports); LLM stochasticity acknowledged as a rank-vs-NS discrepancy source; no cost-per-dataset reported; MCTS hyperparameters (k rollouts, exploration constant) not ablated in the main text. For GSE: random-split validation is disqualifying — the tree's simulation scores must come from time-ordered backtests, and the "insight proposer" must be barred from proposing features computed with future information (the leakage risk the paper never faces).

## 10. GSE overlap
**MOVE-37 FLAG:** SELA's MCTS is the compute-allocation policy the MOVE-37 execution lab needs: given N candidate signal hypotheses and a nightly backtest budget, selection/expansion/simulation/backpropagation decides which hypotheses get more rollouts — formalizing "spend compute where uncertainty × promise is highest" instead of the current implicit equal-split. Existing-map check: no search-policy-over-experiments anywhere in the corpus; the 2085 Experiment Manager picks best nodes but has no exploration/exploitation rule for what to try next. **New capability** (budget allocation); complements 2085's manager and 2086's archive.

## 11. GSE implementation spec
Adapt SELA's MCTS as the **nightly scheduler** over the discovery loop's hypothesis portfolio:
1. **Tree:** root = current production feature set; level-1 children = signal hypotheses (from the idea generator); level-2 = implementation variants (from the 2085 tree search); leaves = backtest simulations. Node stats: v(x) = cumulative ΔBrier (2025 holdout) of simulations in subtree; n_visits(x); σ_sol(x) = the code.
2. **Simulation:** one executor run (2082/2084 loop, ≤5 iterations) = one MCTS simulation; score = holdout ΔBrier (negative if gate missed).
3. **Nightly budget:** k = 12 rollouts/night; selection balances exploring untested hypotheses vs refining promising ones; backpropagation updates ancestors so the portfolio learns across nights (persistent tree in SQLite — the tree IS the 2086 archive, indexed by node).
4. **Leakage guard:** the insight proposer prompt includes a hard constraint list (no future-dated features; no target leakage); every proposed insight is checked against a blocklist before expansion.
5. **Effort:** 2–3 days (tree store + MCTS policy + scheduler cron) reusing the 2082/2085 executor.

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** 20 fixed signal hypotheses. Arm A: round-robin allocation (each hypothesis gets equal executor rollouts — the naive scheduler). Arm B: MCTS scheduler, same total rollout budget (e.g., 60 simulations over 5 nights). **Metrics:** total gate-passing signals found; cumulative best ΔBrier; and "wasted rollouts" (simulations on hypotheses that never exceed ΔBrier > 0).

## 13. Acceptance / rejection gate
**ADOPT if:** MCTS arm finds ≥1.5× the gate-passing signals of round-robin at equal budget, wasted rollouts drop by ≥30%, and the tree's value estimates correlate (Spearman ≥ 0.5) with final holdout scores (the search is actually learning, not random). **REJECT if** MCTS ≈ round-robin within 20% (hypotheses too independent for tree structure to help — fall back to the 2085 manager), or the proposer generates >25% leakage-blocked insights (the tree is searching a contaminated space), or selection collapses to a single branch within 2 nights (exploration constant mis-set → retune before any production use).

## 14. Improvement experiment
Beyond the paper: make the tree **hierarchical over signal families** (matchup / weather / rest / market / special-teams as level-1 branches, hypotheses as level-2) with progressive widening — new family branches open only when existing families' UCB bounds stagnate. Hypothesis: family-level MCTS discovers thin-lane winners (special teams, referees) that hypothesis-level search starves, because early family-level exploration is explicitly budgeted. Test: lane-coverage of winners after 30 nights, flat vs hierarchical tree.
