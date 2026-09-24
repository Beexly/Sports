# [2189] Collaborative Multi-Agent RL for Automated Feature Transformation with Graph-Driven Path Optimization (TCTO) (arXiv:2504.17355v1)

**Citation:** Xiaohan Huang, Dongjie Wang, Zhiyuan Ning, Ziyue Qiao, Qingqing Long, Haowei Zhu, Yi Du, Min Wu, Yuanchun Zhou, and Meng Xiao (2025, CAS / Univ. of Kansas / Tsinghua / A*STAR). *Collaborative Multi-Agent Reinforcement Learning for Automated Feature Transformation with Graph-Driven Path Optimization*. arXiv:2504.17355v1. URL: https://arxiv.org/abs/2504.17355
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* TCTO automates discovery of high-value feature crosses with full traceability of every transformation path, beating 10 baselines on all 20 benchmark datasets. Adapt the roadmap + multi-agent architecture to systematically mine the gse-lab metric corpus for interaction features (the exact "statistical engineering" of new metrics the program targets), with the pruning/backtracking machinery guarding against combinatorial blowup.

## 1. Research question
Existing automated feature transformation (AFT) methods treat transformations as isolated operations: expansion-reduction is stochastic and unstable; iterative-feedback RL discards historical sub-transformation experience; AutoML approaches depend on pre-collected transformation quality. Can a collaborative multi-agent RL framework organized around an evolving, prunable, backtrackable **transformation roadmap graph** (nodes = features, edges = operations) discover higher-value feature spaces while staying stable and traceable?

## 2. Dataset / schema
20 tabular datasets (Table I): 9 regression (Housing Boston 506×13, Airfoil 1503×5, 7 OpenML sets) and 11 classification (Higgs 50k×28, Amazon Employee 32769×9, PimaIndian 768×8, SpectF 267×44, SVMGuide3, German Credit, Credit Default 30k×25, Messidor 1150×19, Wine Red/White). Scalability sets: ALBERT (425,240×78, large-sample), Newsgroups (13,142×61,188, high-dimensional). Code/data via Dropbox link in paper.

## 3. Method / model
**TCTO** — four-step iterative loop:
1. **Roadmap clustering:** similarity matrix Ã[i,j] = cosine(v_i, v_j) on node embeddings; enhanced Laplacian S = D − (A + Ã) (A = structural adjacency); hierarchical spectral clustering to k clusters.
2. **State representation:** 2-layer Relational GCN over the roadmap, relations = operation types: v_i^{(l+1)} = φ(Σ_r Σ_{j∈N_i^r} (1/c_{i,r}) W_r^{(l)} v_j^{(l)}); cluster state Rep(c_i) = mean of node embeddings.
3. **Collaborative multi-agent decisions** (sequential): Head Cluster Agent (π_h: Rep(c_i) ⊕ Rep(V) → score), Operation Agent (π_o: Rep(c_h) ⊕ Rep(V) → o ∈ O), Operand Cluster Agent (π_t: Rep(c_h) ⊕ Rep(V) ⊕ Rep(o) ⊕ Rep(c_i) → tail cluster for binary ops).
4. **Reward + policy update:** value-based RL with prediction/target Q-networks.
**Operation set O:** unary x², x³, √x, sin, cos, ln, eˣ, tanh, sigmoid, 1/x, standard scaler, min-max, quantile transform; binary +, −, ×, ÷.
**Pruning:** node-wise (top-K by mutual information I(v,Y)) at 30% ratio; step-wise backtracking when a path underperforms.

## 4. Equations & assumptions
- Downstream objective (Eq. 1): maximize V(M(F*), Y) − V(M(F), Y).
- Dual reward: R_p = V(M(F_{t+1}),Y) − V(M(F_t),Y) (Eq. 5); R_c = (1/n)Σ_j 1/e^{h(v_j)} (Eq. 6, penalizes roadmap depth); R = R_p + R_c, weights 1:1 (ablation: either alone is worse).
- Q-loss: L = (Q_p^π(s_t,a_t) − (R_t + γ·max Q_t^π(s_{t+1},a_{t+1})))² (Eq. 7).
- MI pruning score: I(v,Y) = ΣΣ p(f,y) log[p(f,y)/(p(f)p(y))] (Eq. 8).
- Assumptions: (i) downstream model performance is a faithful proxy for feature quality; (ii) features clusterable by spectral + cosine similarity; (iii) reward estimation (full downstream retrain per step) is affordable — it dominates runtime.

## 5. Features / target
Generated: mathematical crosses of raw features (e.g. √( |v₁₇| ), sta(v₁₆), 1/(sin v₁₂ − v₀), quantile transforms). Targets: dataset labels (regression 1−RAE, classification F1).

## 6. Validation design
Table I: TCTO vs 10 baselines (RDG, ERG, AFAT, NFS, TTG, GRFG, DIFER, FETCH, OpenFE, FastFT) on all 20 datasets; mean ± std reported for TCTO. Robustness: same features evaluated across 7 downstream models each (Table II). Ablations: pruning-ratio sweep (Fig. 9), reward-weight sweep (Fig. 11), runtime bottleneck analysis (Fig. 10), scalability sets.

## 7. Numerical results / baselines
- **Table I: TCTO is best on all 20 datasets.** Selected exact margins vs runner-up: Housing Boston 0.495 ± 0.015 (vs 0.491 FastFT); Airfoil 0.622 ± 0.011 (vs 0.605 OpenFE); Openml_616 0.499 ± 0.052 (vs 0.467 GRFG); Openml_607 0.670 ± 0.008 (vs 0.640 GRFG); Openml_586 0.689 ± 0.004 (vs 0.650 GRFG); PimaIndian 0.850 ± 0.007 (vs 0.835 FastFT); SpectF 0.950 ± 0.012 (vs 0.927 FastFT); Messidor 0.742 ± 0.003 (vs 0.731 FastFT); German Credit 0.768 ± 0.008 (vs 0.749 FastFT); Higgs 0.709 ± 0.001 (vs 0.709 GRFG, tie broken at 3rd decimal); Amazon Employee 0.936 ± 0.001 (vs 0.935).
- **Table II (robustness):** TCTO features best or tied-best across all 7 downstream models on both Housing Boston (e.g. Lasso 0.370 vs 0.238 FastFT — a 56% relative lift) and Messidor (e.g. SVM-C 0.701 vs 0.681).
- **Case study (Table III):** Housing Boston 1-RAE 0.414 (raw) → 0.474 (TCTO-g) → **0.494** (TCTO); top-10 importance sum falls 0.993 → 0.527 — the model diversifies importance across deeper transforms and demonstrably **reuses** high-value intermediate nodes (v₁₇, v₃₀ highlighted). Wine White F1 0.536 → 0.559.
- **Costs:** reward estimation dominates runtime (16 min/step on ALBERT-425k with RF → switched to LightGBM); linear time scaling with dataset size; node-wise pruning ratio 30% optimal; on extremely large-sample sets all AFT methods show limited gains (networks already learn latent patterns — consistent with [28]).

## 8. Code / data availability
"Our codes and data are publicly accessible via Dropbox" — link given in paper (not verified live in this read).

## 9. Leakage & limitations
Adversarial read: (i) **reward = downstream validation performance** — if the downstream split isn't strictly held out, the RL loop overfits feature space to validation; paper doesn't detail nested-CV discipline; (ii) per-step full downstream retraining is brutally expensive (16 min/step × hundreds of steps on 425k rows) — infeasible without the LightGBM swap and aggressive pruning; (iii) operation set is generic math, no domain constraints — discovered features like 1/(sin v₁₂ − v₀) are uninterpretable and could be numerically unstable (division near zero); (iv) "best on all 20 datasets" with modest margins on large sets (Higgs tie at 3 decimals) suggests variance-hunting; only TCTO reports ± std, baselines appear point estimates; (v) traceability claim is real (the roadmap is auditable) but the final feature formulas are still opaque math-soup; (vi) all experiments tabular IID — no temporal/sequential validation.

## 10. GSE overlap
This is the **automated interaction-discovery engine** the auto_feature_eng lane exists for: GSE's 29 gse-lab CSVs contain dozens of hand-built metrics (EPA/play, success rate, pressure, CPOE-adjacent) with *zero* systematic crossing. TCTO's roadmap gives exactly what Garrett's "statistical engineering to invent stats humans never thought of" mandate needs — machine-discovered crosses (e.g. standardized EPA/play × explosive-play rate ÷ pressure rate) with a full provenance path per feature, unlike black-box expansion-reduction. No existing GSE component does automated transformation search; overlaps only as a consumer of the tsflex (2188) extraction layer. The complexity penalty R_c is directly aligned with GSE's need for deployable, explainable features for public pick cards.

## 11. GSE implementation spec
1. Simplify first: reimplement the paper's loop (cluster → 3 agents → reward → prune) on a manageable subset — game-level rows (~5k) × ~40 gse-lab metrics, LightGBM log-loss as V, operation set = paper's O plus sports-sane additions (z-score within season, rolling ranks).
2. Add domain guards the paper lacks: forbid division by near-zero-variance features, cap transform depth at 3, require every generated feature to beat its parents' univariate log-loss before entering the roadmap.
3. Run on 2015–2023 training folds, reward = held-out-season (2024) log-loss delta; node-wise MI pruning 30%.
4. Keep the full roadmap serialized — every discovered feature ships with its transformation path for the pick-card audit trail.
5. Effort: ~5 engineer-days (simplified reimplementation; the Dropbox code may shortcut this).

## 12. Reproducible test
Dataset: gse-lab team-game CSVs 2015–2024 (spread cover label). Protocol: train TCTO-transformed features on 2015–2022, validate reward on 2023, final eval on 2024. Baseline A: LightGBM on raw 40 metrics. Baseline B: LightGBM + exhaustive pairwise crosses (the naive expansion-reduction). Success: TCTO feature set beats both on 2024 log-loss with ≤ 60 features retained (complexity discipline), and every retained feature has a recorded roadmap path.

## 13. Acceptance / rejection gate
**Accept the adaptation iff** on the 2024 holdout TCTO's discovered feature set improves LightGBM log-loss by ≥ 0.003 over the raw-metric baseline AND matches-or-beats exhaustive pairwise crosses with ≤ half the feature count. Reject if (a) the RL loop fails to beat naive pairwise crosses (then the machinery isn't earning its compute), (b) runtime exceeds 48 h for one run (cost discipline), or (c) top discovered features are numerically unstable transforms (division artifacts) that can't be explained on a pick card.

## 14. Improvement experiment
Beyond the paper: make the roadmap **temporal**. The paper's graph is static/IID; GSE's features drift (2184, 2185). Weight roadmap edges by recency (recent seasons' MI scores count more in node-wise pruning) and re-run the agents each offseason — a "feature evolution" loop where last season's high-value subgraphs are the starting roadmap for next season. This converts TCTO from a one-shot search into a self-updating feature factory, and directly tests whether discovered interactions are stable across NFL seasons or regime-specific.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2504.17355 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
