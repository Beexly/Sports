# [1966] DAG Learning on the Permutahedron (DAGuerreotype) (arXiv:2301.11898)

**Citation:** Valentina Zantedeschi, Jean Kaddour, Matt J. Kusner, Vlad Niculae (2023). *DAG Learning on the Permutahedron*. arXiv:2301.11898. URL: https://arxiv.org/abs/2301.11898
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML; abstract, §§1–4 method, Theorem on SHD bound, experiments §5, Appendix D referenced).
**Verdict:** ADAPT

## 1. Research question
Continuous DAG-learning relaxations (NOTEARS-style) optimize over approximate DAGs and entangle ordering with edge estimation. Can we instead learn a topological ordering by continuous optimization over the permutahedron (the polytope of permutation vectors), keeping the learned graph always a *valid* DAG, and learn edges jointly or conditionally via any — even non-differentiable — estimator?

## 2. Dataset / schema
- Real: Sachs (2005) protein signaling — d=11 nodes, 853 observations (subset used), 17-edge ground-truth DAG; SynTReN — 10 pseudo-real transcriptional networks (Lachapelle et al. 2020), d=20 nodes, e ∈ {20,…,25} edges, 500 observations each.
- Synthetic (Appendix D): linear/nonlinear SEMs with known ground truth, used to isolate ordering-learning quality from edge-estimator quality.
- Access: public (Sachs benchmark; SynTReN via Lachapelle et al.).

## 3. Method / model
DAGuerreotype:
- Key decomposition: any DAG = (i) a topological ordering (permutation of nodes) + (ii) edges only from lower to higher nodes in the order. Learn the ordering via sparse relaxations over the permutahedron (sparse operators: sparsemax/sparseMAP-style; connects to Gumbel-Sinkhorn approximations over the Birkhoff polytope).
- Structure parameters θ learn a sparse distribution over orderings; edge parameters Φ (functional parameters per node f_j^{φ_j}) learned jointly end-to-end or alternately, or conditionally via any black-box subroutine (differentiability not required).
- Three claimed advantages: (1) validity — optimizes over exact DAGs, not approximate ones; (2) modularity — any edge-optimization procedure, structural parameterization, loss; (3) end-to-end — alternate or joint optimization of ordering and edges.
- Edge estimators tested: masked linear (Gaussian equal-variance likelihood per Ng et al. 2020), masked MLP (as in NoTears-nonlinear), and LARS (Efron et al. 2004); ℓ2 regularization on {θ, Φ}; datasets standardized.
- Theory: global sensitivity bound relating SHD between orderings induced by θ and θ′ to an integral over Hamming-type disagreement (Theorem, eq. with SHD(R^{σ(θ)}, R^{σ(θ′)}) ≤ ∫ ΣΣ δ_{H_ij} dt); space complexity at least order of the edge-masking matrix.
- Code: https://github.com/vzantedeschi/DAGuerreotype. Hyperparameters tuned by Bayesian optimization on synthetic problems.

## 4. Equations & assumptions
- Objective: data likelihood under Gaussian equal-variance errors (Ng et al. 2020 derivation); sparse permutation-vector formulation over the permutahedron.
- Frank-Wolfe-style updates for the sparse operators (r − B^⊤α^{(t)})^⊤ B α iteration shown).
- Assumptions: observational data; Gaussian equal-variance error model for the likelihood variant; DAG ground truth; standardized variables.

## 5. Features / target
Unsupervised: raw d-variate observations in; learned topological ordering + per-node functional parameters (edge weights/structure) out. No feature engineering — variables are the nodes.

## 6. Validation design
- Real-data: SHD (edge correctness) vs SID (structural intervention distance — preservation of causal orderings/paths) on Sachs and SynTReN. Baselines: NOTEARS (linear), GOLEM, DAGMA (matrix-exponential regularized), sortnregress (Reisach et al.), NPVAR, CAM, VI-DP-DAG, LARS variants. Full comparison in Appendix D.
- Synthetic: ordering quality isolated by fixing the edge estimator to the true SEM class.
- Metrics rationale stated: SHD favors sparse solutions (true DAGs sparse → rewards empty graphs); SID favors dense solutions (complete DAGs preserve paths). Pareto analysis across both.

## 7. Numerical results / baselines
- Sachs + SynTReN (Fig. 2): DAGuerreotype lies on the Pareto front of SHD vs SID. NOTEARS/GOLEM/NPVAR: best SHD, worst SID (too sparse). VI-DP-DAG: best SID, worst SHD (paper: "among the best in terms of SID and the worst in terms of SHD" — too dense). sortnregress predicts too few edges; VI-DP-DAG too many. DAGuerreotype "strikes a good balance".
- Performance "strongly depends on the choice of edge estimator": linear better on Sachs, MLP needed for SynTReN.
- No single numeric table quoted in the main text beyond the Pareto plots; exact SHD/SID values live in Appendix D tables.

## 8. Code / data availability
Code: https://github.com/vzantedeschi/DAGuerreotype (stated). Data: Sachs public; SynTReN networks via Lachapelle et al. 2020.

## 9. Leakage & limitations
Adversarial notes: (1) The paper itself cites the Reisach et al. critique: synthetic linear-DAG benchmarks are *flawed* because marginal variance grows with DAG depth — sort-by-variance + sparse regression matches SOTA. This indicts a whole evaluation paradigm; GSE must standardize variables (the paper does) and validate orderings against domain knowledge, not variance. (2) Validity claim is about the *ordering* — edge quality still hinges entirely on the chosen estimator ("inevitably its performance strongly depends on the choice of edge estimator"). (3) Gaussian equal-variance likelihood assumption is strong for sports indicators. (4) Space complexity ≥ order of edge-mask matrix — O(d²) fine at d=35. (5) Only observational; interventional extension is future work. (6) Exact Pareto numbers in Appendix D — main text is plot-only, so the "Pareto front" claim is visual.

## 10. GSE overlap
Extension of ledger 1962 (NOTEARS), not a duplicate: it replaces NOTEARS' approximate-DAG relaxation with exact-DAG ordering learning, and its modularity is the differentiator — GSE can plug its *own* edge estimators (e.g. the game-outcome logistic model, gradient boosters) as the non-differentiable subroutine, learning a causal ordering over indicators scored by GSE's actual predictive machinery. The existing-research map (~/workspace/arxiv-sweep/existing-research-map.md) has nothing on permutation-based structure learning. Complements 1963 (PCMCI+, time) and 1965 (RCD, confounders).

## 11. GSE implementation spec
- Data: nflverse team-season aggregates (cross-sectional, like ledger 1965) to isolate ordering from time effects; ~35 indicators, standardized.
- Model: DAGuerreotype from the public repo; edge estimator = GSE's own per-target gradient-boosted regressor (each indicator predicted from its candidate parents under the current ordering) — this is the modularity payoff: ordering optimized against GSE's real predictive loss, not least squares.
- Training: Bayesian optimization over sparsity/regularization hyperparameters on 2015–2023; ordering learned per season-block, aggregated by rank-stability.
- Output: consensus topological ordering of indicators → constrains downstream NOTEARS/PCMCI+ runs (edges must respect the learned order), shrinking their search space and stabilizing graphs.
- Effort: ~3 engineer-days (public code; main work is wiring a custom edge estimator).

## 12. Reproducible test
Dataset: team-season panel 2015–2023 (learn ordering), 2024–2025 (evaluate). Test: (a) ordering stability — Kendall's τ between orderings learned on odd vs even seasons ≥ 0.6; (b) constrained NOTEARS (edges must follow the DAGuerreotype ordering) vs unconstrained NOTEARS on 2024–2025 Brier — parity within 0.002 with fewer edges required; (c) domain sanity: ≥80% of high-confidence order pairs respect football directionality (pressure before sacks before defensive EPA).

## 13. Acceptance / rejection gate
ADOPT the learned ordering as a constraint layer if: (a) Kendall's τ ≥ 0.6 across season splits; (b) order-constrained NOTEARS matches unconstrained Brier within 0.002 while using ≤70% of edges; (c) ≥80% domain-directionality agreement. Reject if τ < 0.5 (no stable causal ordering in the indicators) or if the Gaussian equal-variance likelihood variant is the only one that converges (estimator-dependence failure).

## 14. Improvement experiment
Beyond the paper: learn the ordering *jointly* with GSE's actual game-outcome loss as the edge subroutine — i.e., ordering θ optimized so that the outcome model trained on parents-respecting features minimizes held-out log-loss. This turns causal ordering discovery into a feature-selection objective end-to-end. Hypothesis: outcome-loss-driven orderings will rank market features (spread/total) late (they aggregate information) and efficiency fundamentals early — a testable, domain-meaningful prediction the paper's likelihood-based variant cannot make.
