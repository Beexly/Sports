# [1848] Feature Engineering for Predictive Modeling using Reinforcement Learning (arXiv:1709.07150)

**Citation:** Udayan Khurana, Horst Samulowitz, Deepak Turaga (2017). *Feature Engineering for Predictive Modeling using Reinforcement Learning*. arXiv:1709.07150v1. IBM T.J. Watson Research Center. AAAI 2018. URL: https://arxiv.org/abs/1709.07150
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv PDF, v1, lines 0–1320, all sections incl. transformation-graph formalism, MDP/RL derivation, Algorithm 1, Table 1, Figures 1–6; lines 1230–1320 verified 2026-09-22 as references only — complete).
**Verdict:** ADAPT

Rationale: the transformation graph gives the lane's cleanest formalism for *compositional* feature search (the gap the OpenFE/DIFER/autofeat papers leave: they generate flat feature sets, this one composes transforms into paths), and the transferable RL policy (trained on 48 datasets, applied to 24 unseen ones) is exactly the mechanism GSE needs to turn weekly analyst trial-and-error into a learned exploration strategy. Adapt with a sports-specific transform library and a learned policy trained on GSE's own season history.

## 1. Research question
Can the trial-and-error *strategy* of human feature engineering — which transform to try next, on which intermediate dataset, under a time budget — be learned from historical examples via reinforcement learning? The paper sits between two failed paradigms: expansion-reduction (apply all transforms at once, then select — scalability bottleneck, no composition) and evolution-centric (random/greedy single-feature construction — days of compute, no composition). The transformation graph (DAG of datasets × transforms) compactly enumerates the compositional space; RL learns a budget-aware exploration policy over it. Same first author as Cognito (Khurana et al. 2016); this paper generalizes it.

## 2. Dataset / schema
48 training datasets (policy learning; non-overlapping with test) + 24 test datasets from UCI, OpenML, LibSVM, Kaggle — mixed classification/regression, sizes 148–50,000 rows, 4–10,936 features (Table 1). Motivating example: Kaggle bike-sharing demand (hourly rentals). Time: 2017-era datasets.

## 3. Method / model
**Transformation graph G:** DAG. Nodes: (a) root D₀ (original dataset); (b) hierarchical nodes D_i with exactly one incoming edge = transform T ∈ T applied to parent (D_j = T(D_i)); (c) sum nodes D_{i,j} = D_i + D_j (feature-set union, row-order preserved). Every node keeps the same target and row count. Height h = max root distance; a height-h complete graph over t transforms has ~t^{h+1}−2 hierarchical nodes (3.2M nodes at t=20, h=5 — exhaustive search impossible).
**Budget exploration (Algorithm 1):** start G₀ = {D₀}; at step i, score all candidate actions ⟨n, t⟩ by estimated reward R(G_i, n, t, b_ratio), apply the argmax, i ← i+1 until B_max steps; output argmax-accuracy node. b_ratio = i/B_max is the budget-exhaustion signal (early = explore, late = exploit).
**MDP formulation:** state s_i = (G_i, b_ratio); action c = ⟨n, t⟩ with t not already applied at n. 9 state factors: (1) node accuracy, (2) transform's average immediate reward so far, (3) times t used on root→n path, (4) accuracy gain of n and of n's parent (recency of gains), (5) node depth (complexity penalty), (6) budget fraction exhausted, (7) feature-count ratio (bloat factor), (8) is-t-a-feature-selector, (9) data types present (numeric/datetime/string).
**Reward:** immediate r_i = max_{n0 ∈ θ(G_{i+1})} A(n₀) − max_{n ∈ θ(G_i)} A(n) (best-accuracy improvement); cumulative R(s_i) = Σ_j γ^j r_{i+j}, γ = 0.99.
**Q-learning with linear approximation:** Q(s,c) = w_c · f(s) (**RL1**, action-dependent weights) vs Q(s,c) = w · f(s) (**RL2**, shared weights — still action-aware via factor (2)); update w^{cj} ← w^{cj} + α(r_j + γ·max_{c0} Q − Q)·f, α = 0.05, ε-greedy ε = 0.15, weights init to 1. RL1 beats RL2 (learning a general bias per transform + datatype conditioning is worth the extra parameters).
**Transform library:** Log, Square, Square Root, Product, ZScore, Min-Max-Normalization, TimeBinning, Aggregation (Min/Max/Mean/Count/Std), Temporal window aggregate, Spatial/Spatio-temporal Aggregation, k-term frequency, Sum, Difference, Division, Sigmoid, BinningU, BinningD, NominalExpansion, Sin, Cos, TanH.

## 4. Equations & assumptions
Equations: (1) F* = argmax_{F1,F2} A^L_m(F1 ∪ F2, y); (2) Π*(s) = argmax_c Q(s,c); (3) Q(s,c) = w_c·f(s); (4) weight update; (5) Q(s,c) = w·f(s); reward/cumulative-reward definitions; graph-size combinatorics. Assumptions (stated): the complete graph contains the optimum (via transform+selection compositions); CV performance is the true objective (no surrogates, unlike FICUS/FCTree); the 9 factors capture the exploration decision; linear Q-approximation suffices (nonlinear modeling left as future work); policy transfers across datasets.

## 5. Features / target
Inputs: raw tabular features. Generated: compositions of mathematical transforms along graph paths (e.g. bike-sharing: sin/cos of hour + binned temporal aggregates), human-readable by construction ("compositions of well-defined mathematical functions"). Targets: dataset-native (FScore for classification, 1 − relative absolute error for regression). No time horizon (static tabular).

## 6. Validation design
Policy trained on 48 datasets with B_max ∈ {25,50,75,100,150,200,300,500}; tested on 24 *non-overlapping* datasets, B_max = 100, RF (Weka defaults) + 5-fold stratified CV for all arms. Comparators: base (no FE), expansion-reduction (all transforms then select), random (100 random transform applications), Tree-Heur (Cognito global search, 100 nodes). Traversal-efficiency study: RL vs BFS/DFS/global on 10 datasets (Fig. 4), RL1 vs RL2 data-efficiency (Fig. 5), h_max sensitivity (Fig. 6). No significance tests.

## 7. Numerical results / baselines
- **23.8% median error reduction** (relative absolute error / 1 − mean unweighted FScore) over base across the 24 test datasets — "for a relatively small computational budget" (B_max = 100).
- RL policies **4–8× more efficient** than handcrafted BFS/DFS/global strategies at finding the optimal node in a 6-transform, h_max=4 graph (Fig. 4); RL1 more data-efficient than RL2 (Fig. 5).
- Table 1 standouts: Amazon Employee 0.712→0.806; Bikeshare DC 0.393→0.798 (Exp-Red 0.693, Tree-Heur 0.790); AP_Omentum_Ovary (10,936 features) 0.615→0.820; SpectF 0.686→0.788; OpenML 616 0.343→0.559. Beats all baselines on most datasets, ties Cognito-global on two, loses to expand-reduce on one.
- Ablations: feature selection as a graph transform improves final gain by **51%**; h_max = 4 optimal for the majority (h_max = 6 shows deterioration — over-composition); Bikeshare DC: 4 min 40 s for 100 nodes, single thread @ 2.8 GHz (Random/Cognito similar; Exp-Red 0.1–0.9× that time).
- Different learning algorithms yield *different* optimal engineered features for the same dataset — FE is model-dependent.

## 8. Code / data availability
None stated (no public code link; IBM Research). Datasets: public (UCI/OpenML/LibSVM/Kaggle).

## 9. Leakage & limitations
Adversarial read: (a) The policy is trained to maximize *CV accuracy on the training datasets* — the transfer claim (48→24 datasets) is real but the policy may encode dataset-type priors that don't cover sports time series; none of the 72 datasets is temporal-panel data with leakage structure. (b) The linear Q-approximation is a strong capacity limit the authors themselves flag ("complex nonlinear modeling of state variables" = future work); the 4–8× efficiency figure is against weak handcrafted baselines. (c) B_max = 100 steps × model retrain per step is the same per-evaluation cost as every other method — the efficiency is in *fewer* steps, not cheaper steps. (d) The 51%-from-feature-selection finding means half the gain is selection, not discovery — the "RL" headline overclaims relative to the selection component. (e) No equations for the sum-node explosion control: sum nodes grow combinatorially and the paper doesn't bound them. (f) IBM-internal, no code — GSE reimplements from the paper. (g) The "different models → different optimal features" finding cuts both ways: a policy learned with RF may not transfer to LightGBM.

## 10. GSE overlap
The compositional-search formalism the lane is missing. Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md, GSE's hand-built features are compositions (e.g. rolling EPA → z-scored vs opponent → binned) built by intuition; this paper's graph *is* that process formalized, with a learned policy replacing the analyst's hunches. It pairs with ledger 1847 (LLM-FE): LLM-FE searches *program* space with an LLM; this searches *transform-composition* space with a learned policy — the two compose (RL policy proposes the next composition step; LLM proposes the transform semantics). The budget-ratio state factor (b_ratio) is directly reusable: GSE's weekly compute budget becomes the MDP's budget. The 9 state factors are a ready-made feature set for the meta-policy (node accuracy → validation log-loss; transform avg reward → per-transform-type track record).

## 11. GSE implementation spec
Build "GSE-RLFE": (1) Transformation graph over the nflverse game-level table: root = base game features; transforms = sports library (rolling means/stds over k games, z-score vs league, opponent-adjusted differentials, binning, sigmoid of spreads, sin/cos of week-of-season, rest-day differentials, Elo-deltas); sum nodes = feature-set unions; feature selection as a first-class transform (the paper's 51% finding). (2) Policy: linear Q (RL1-style) over the 9 factors, trained on historical "analyst sessions" — reconstruct from git history of GSE's feature files 2020–2023 as (state, action, reward) trajectories; B_max = 40 steps/week (the weekly compute budget). (3) Reward: validation log-loss improvement on the 2023 season. (4) Output: the argmax node = that week's engineered feature set, with the path (transform composition) as the human-readable recipe. Effort: ~1 week (graph + transforms exist in spirit; the MDP harness is new).

## 12. Reproducible test
Dataset: nflverse 2020–2024, game-level; kickoff cutoffs enforced on all rolling transforms. Protocol: train policy on 2020–2022 analyst-session reconstructions; run B_max = 40 exploration on 2023 validation; freeze the winning feature set; LightGBM baseline vs + RLFE features on held-out 2024 (log-loss). Baselines: random-transform search (paper's Random arm) and BFS to depth 2 at the same B_max (paper's handcrafted arms) — the test must show the learned policy beats both, replicating Fig. 4's 4–8× efficiency claim in the sports domain.

## 13. Acceptance / rejection gate
ADAPT the policy layer iff (a) 2024 held-out log-loss improves ≥ 0.003, AND (b) the learned policy reaches the baseline+0.003 gain in ≤ 40 steps while BFS needs > 100 (efficiency replication), AND (c) zero leakage-audit failures on rolling transforms. REJECT if the policy can't beat random search at equal B_max (transfer failure — the paper's core claim not reproducing in sports data), or if h_max > 3 is needed for gains (over-composition risk per Fig. 6).

## 14. Improvement experiment
Beyond the paper: close its self-identified gap — replace the linear Q with a **gradient-boosted Q-function** over the 9 state factors (nonlinear state modeling, the paper's stated future work), trained with the same ε-greedy protocol. Hypothesis: the nonlinear policy finds the winning node in fewer steps and handles the feature-count-ratio × depth interaction the linear model can't express. Second: add a 10th state factor the paper lacks — *temporal leakage risk* (fraction of the candidate node's features whose lineage includes post-cutoff columns, from ledger 1845's provenance) — and penalize it in the reward. This bakes the sports leakage constraint into the exploration policy itself, so the agent learns to avoid leakage-prone paths rather than being audited after the fact.

---
*Lane: auto_feature_eng. Ledger 1848 of block 1842–1861.*
