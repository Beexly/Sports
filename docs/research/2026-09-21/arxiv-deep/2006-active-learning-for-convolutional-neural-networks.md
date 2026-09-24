# [2006] Active Learning for Convolutional Neural Networks: A Core-Set Approach (arXiv:1708.00489)

**Citation:** Sener, O., Savarese, S. (2018). *Active Learning for Convolutional Neural Networks: A Core-Set Approach*. arXiv:1708.00489 (ICLR 2018). URL: https://arxiv.org/abs/1708.00489
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** pure-geometric batch AL with a covering-radius loss bound and a greedy 2-OPT k-center solver; the standard diversity workhorse (already the subroutine inside ledgers 2002/2005), valuable for covering GSE's game archetypes, but uncertainty-free by design and cost-blind.

## 1. Research question
Why do standard AL heuristics (uncertainty, Bayesian) fail for CNNs in the batch setting, and can batch AL be redefined as core-set selection — choosing points so a model trained on the labeled subset is competitive on the whole dataset — with a rigorous bound on the resulting loss in terms of the geometry of the selected points?

## 2. Dataset / schema
- CIFAR-10 (10 classes), CIFAR-100 (100 classes), SVHN (digit classification); standard splits (50k train images scale; exact N not restated).
- Model: VGG-16, He initialization, RMSProp lr 1e-3, TensorFlow, trained from scratch after each AL iteration.
- Two regimes: fully-supervised (labeled only) and weakly-supervised (Ladder networks, Rasmus et al. 2015, using unlabeled data too).
- 5 random initializations of the initial pool; metric = average classification accuracy vs. number of labeled points (std-dev error bars). Public benchmarks.

## 3. Method / model
1. Decomposition (Eq. 3): population risk ≤ generalization error + training error + core-set loss, where core-set loss = |avg loss over full set − avg loss over labeled subset|. Given CNNs' low training error and bounded generalization (Xu & Mannor 2012), the actionable term is the core-set loss (Eq. 4).
2. Theorem 1: if loss l(·,y,w) is λ^l-Lipschitz, regression functions η_c λ^η-Lipschitz, s is a δ-cover of the data, and training error on s is zero, then with probability ≥ 1−γ: core-set loss ≤ δ(λ^l + λ^ηLC) + √(L²log(1/γ)/(2n)). The bound does NOT depend on the number of labeled points — "a provided label does not help the core-set loss unless it decreases the covering radius."
3. Lemma 1: a CNN (ReLU, max-pool) with l₂ loss between class probabilities and softmax outputs is (√(C−1)/C · α^{n_c+n_fc})-Lipschitz in the input (α = max input-weight sum per neuron; can be made arbitrarily small without changing classifications). Theory uses l₂ loss; experiments use cross-entropy ("our theoretical study does not extend to cross-entropy loss, our experiments suggest that the resulting algorithm is very effective").
4. Minimizing the bound ⟺ k-center (minimax facility location, Wolf 2011): min_{s¹:|s¹|≤b} max_i min_{j∈s¹∪s⁰} Δ(x_i,x_j) (Eq. 5). Greedy furthest-first (Algorithm 1, k-Center-Greedy) gives a 2-OPT solution.
5. Robust k-center (Algorithm 2): MIP feasibility program (Eq. 6) with outlier allowance Ξ (up to Ξ points uncovered), binary-searched between the greedy radius and its half (Gurobi; LP relaxation + branch-and-bound).
6. Distance Δ: l₂ distance between activations of the final fully-connected layer. Ξ = 1e-4 × n.

## 4. Equations & assumptions
- (1)–(2): batch AL objective (single-round; multi-round myopic).
- (3)–(4): risk decomposition and core-set loss objective.
- Theorem 1 bound: δ(λ^l + λ^ηLC) + √(L²log(1/γ)/(2n)).
- Lemma 1 Lipschitz constant: (√(C−1)/C)α^{n_c+n_fc}.
- (5): k-center objective; 2-OPT guarantee: greedy radius ≤ 2×OPT.
- (6): robust k-center MIP with u_i (center), ω_{i,j} (covered-by), ξ_{i,j} (outlier) binary variables.
- Assumptions: λ-Lipschitz loss and regression functions; zero training error on the core-set; i.i.d. data; compact space. Cross-entropy not covered by theory.

## 5. Features / target
Features: raw pixels; distance computed in final-FC activation space (learned representation). Target: class label. The method uses NO uncertainty information — pure geometry ("incorporating uncertainty to our method in a principled way is an open problem").

## 6. Validation design
- Baselines: Random; Best Empirical Uncertainty (max-entropy/BALD/Variation Ratios on softmax, best reported); DBAL (MC dropout, Gal et al. 2017, best acquisition fn); Best Oracle Uncertainty (samples ∝ true loss l(x_i,y_i;A_{s⁰}) — uses labels, an upper bound); k-Median cluster centers; BMDR (Wang & Ye 2015, MMD+uncertainty); CEAL (weakly-supervised CNN baseline).
- Protocol: small random initial pool; iterative querying; accuracy vs. labeled count; 5 seeds; fully- and weakly-supervised.
- Diagnostics: t-SNE of selected vs. remaining points; greedy vs. MIP-optimal k-center on CIFAR-100 (Figure 6); runtime breakdown (Table 1).

## 7. Numerical results / baselines
- "Our algorithm outperforms all other baselines in all experiments; for the case of weakly-supervised models, by a large margin" (Figures 3–4) — attributed to better feature spaces giving "accurate geometries" ("our method is geometric, it performs significantly better with better feature spaces").
- CIFAR-100 weaker than CIFAR-10/SVHN: bound scales with number of classes C.
- BMDR (SOTA batch baseline) "does not necessarily perform better than greedy ones" — still uses uncertainty via softmax, "not a good proxy for uncertainty."
- k-Medoids ineffective: "cluster centers are likely the points which are well covered with initial iid samples... fails to sample the tails of the data distribution."
- Oracle uncertainty and DBAL beat empirical uncertainty, but random still beats them in batch setting — "due to the correlation in the queried labels."
- t-SNE (Figure 5): coreset queries "evenly cover the space"; uncertainty-oracle queries "fail to cover the large portion of the space."
- Optimality of k-center: MIP solution gives "a small but important accuracy improvement" over greedy 2-OPT (Figure 6, CIFAR-100).
- Runtime (Table 1, b=5k, |s⁰|=10k, seconds on i7-5930K/64GB): distance matrix 104.2, greedy 2.0, MIP/iteration 7.5, MIP total 244.03, total 360.23 — "in practice it converges in a tractable amount of time for a dataset of 50k images" despite worst-case non-polynomial MIP.

## 8. Code / data availability
None stated in paper (no code URL). Data: public benchmarks.

## 9. Leakage & limitations
- No uncertainty: by design it can spend budget covering low-value regions of the manifold (the paper's own open problem); BADGE (ledger 2002) and ACS-FW (2004) dominate it in the modern literature precisely by adding uncertainty.
- Bound scales with C (classes) — weak for many-class settings; also assumes Lipschitz constants that are vacuous for large α in practice.
- Zero-training-error assumption is unrealistic; theory uses l₂ loss while experiments use cross-entropy.
- Greedy is 2-OPT; the MIP refinement is expensive (244s/iteration at 50k points) and needs Gurobi.
- Geometry depends on the representation: with weak features, k-center covers noise — the weakly-supervised gap cuts both ways.
- i.i.d. vision benchmarks; no temporal structure.

## 10. GSE overlap
No coreset acquisition in the existing map; this is the canonical diversity subroutine already referenced by ledgers 2002 (BADGE compares against Coreset/FF-k-center) and 2005 (ADS pre-filters for Coreset). As a standalone it is the weakest of the batch methods (no uncertainty), but as infrastructure it is the cheapest coverage guarantee: "chart a set of games such that every game archetype is within δ of a charted game." New capability (coverage), complement to the uncertainty-driven methods.

## 11. GSE implementation spec
- Setting: pool = season's games; representation = engine's game embedding (final-layer activations before the pick head — the paper's Δ analog); distance = l₂ in that space.
- Algorithm: k-Center-Greedy (furthest-first) from the already-charted set s⁰, budget b = weekly charting capacity; optional robust-k-center with Ξ = 1e-4·n to skip outlier games (e.g., weather-freak games that would waste a center).
- Upgrade path (the paper's open problem): uncertainty-weighted k-center — weight Δ by inverse predictive confidence so coverage prioritizes uncertain regions; this is exactly the BADGE/ACS-FW direction, implemented as a second phase.
- Serving: weekly greedy selection is O(b·n·d) — trivial; recompute embeddings after each retrain.
- Effort: ~3–5 days (embedding extraction, greedy solver, queue integration). MIP refinement not worth it (small gains, Gurobi dependency).

## 12. Reproducible test
Dataset: nflverse 2023–2024; game embeddings from the current engine. Start 2023 weeks 1–4 charted; select charting batches via k-center-greedy vs. random vs. BADGE (ledger 2002); train pick model per round; evaluate 2024 held-out log-loss. Baseline to beat: random at equal budget; target: match BADGE's efficiency at 1/10th the compute.

## 13. Acceptance / rejection gate
ADOPT as the coverage layer iff k-center-greedy at 20% charting budget beats random at 20% budget by ≥ 0.005 log-loss on the 2024 holdout (i.e., pure coverage has signal in game-embedding space) — deployed as a pre-filter inside the BADGE/ACS-FW pipeline, not standalone. REJECT standalone use if it underperforms random (meaning engine embeddings don't form a meaningful game manifold — then fix the representation first).

## 14. Improvement experiment
Uncertainty-weighted robust k-center: Δ'(x_i, x_j) = Δ(x_i, x_j) / (1 + U(x_i)) with U = predictive entropy, so the covering radius shrinks (denser coverage) in uncertain regions and expands in confident ones; keep the Ξ-outlier MIP. Test whether uncertainty-weighted k-center beats both vanilla k-center and BADGE at equal charting budget — hypothesis: it inherits the covering guarantee (Theorem 1 still applies with the reweighted metric) while spending centers where the model is actually unsure, closing the paper's stated open problem with a one-line change.
