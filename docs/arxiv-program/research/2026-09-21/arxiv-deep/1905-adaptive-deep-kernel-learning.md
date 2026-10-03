# [1905] Adaptive Deep Kernel Learning (arXiv:1905.12131v2)

**Citation:** Tossou, P., Dura, B., Marchand, M., Laviolette, F., Lacoste, A. (2019). *Adaptive Deep Kernel Learning*. arXiv:1905.12131v2. URL: https://arxiv.org/abs/1905.12131v2
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** learns a *family* of task-conditioned kernels (not one fixed kernel), the exact missing piece for regime-aware few-shot prediction; InfoNCE meta-regularization on task embeddings is directly portable.

## 1. Research question
Prior deep kernel learning (DKL) learns a *single* kernel for large datasets; metric-learning few-shot methods don't adapt their covariance at test time; MAML adapts but is slow/memory-heavy. For few-shot *regression* on complex task distributions (real-world, not just sinusoids), can a deep kernel family — selected per-task at inference via a permutation-invariant task embedding — deliver test-time kernel adaptation while staying sample-efficient?

## 2. Dataset / schema
- **Sinusoids** (Kim et al. 2018 variant): 5,000 tasks, y = A·sin(wx+b)+ε, A∈[0.1,5.0], b∈[0,2π], w∈[0.5,2.0], ε∼N(0,(0.01A)²); x∈[−5,5]; feature extractor = 2-layer FC(120); meta split 56.25/18.75/25%.
- **Binding** (BindingDB-derived, drug discovery): 7,620 tasks (one protein each), 7–9,000 samples per task; predict binding affinity from SMILES.
- **Antibacterial** (PubChem-derived): 3,842 tasks (bacterium × experimental setting), 5–225 samples per task; predict antimicrobial activity from SMILES.
- Molecules: SMILES strings, 1-D CNN(2×128, kernel 5) extractor; targets linearly scaled to [0,1]. Pre-processed versions stated available "with this work" (URL present in paper but I did not verify it). Support/query sizes m=10 (train); meta-test support m=10, query = rest (or 50/50 split for small tasks); task MSE averaged over 20 random support/query partitions.

## 3. Method / model
**ADKL.** Adaptive kernel **k_ADKL(x,x′;z_t) := k_ρ(φ_θ(x;z_t), φ_θ(x′;z_t))** where task embedding **z^t = ψ_η(D^t_trn) = w(Concat(μ^t_xy, σ^t_xy))** — a DeepSets-style permutation-invariant encoder: each input-target pair → xy_i = r(Concat(u(x_i), v(y_i))), then empirical mean and std pooled, passed through w. Conditional input embedding **φ_θ(x;z_t) = o(Concat(u′(x), z_t))**. Base kernel k_ρ = linear (best) or RBF. Task-level regressors: **ADKL-GP** (GP NLL loss, Eq. 5–7) and **ADKL-KRR** (squared loss, Eq. 3–4); both differentiable so θ, η, ρ train end-to-end over b=32 tasks × m=10 (λ fixed = 1/|D_trn|). **Meta-regularization**: InfoNCE contrastive loss (Eq. 12) pulling ψ(D^t_trn) and ψ(D^t_val) of the *same* task together vs other tasks, weighted by γ.

## 4. Equations & assumptions
- DKL regressor: **h\*^t(x) = Σ α^t_i k_ρ(φ_θ(x), φ_θ(x_i))**, **α = (K_trn,trn + λI)⁻¹ y_trn** (Eqs. 2–3).
- Task loss (KRR): **L^t = E_{x,y∼D^t_val}(αK_{x,trn} − y)²** (Eq. 4); (GP): **L^t = −ln N(y_val; E[h\*^t], cov(h\*^t))** (Eqs. 5–7) with **E[h\*^t] = K_val,trn(K_trn,trn+λI)⁻¹y_trn**.
- Adaptive kernel + embedding: **k_ADKL(x,x′;z_t)** (Eq. 9), **z^t = w(Concat(μ^t_xy, σ^t_xy))** (Eq. 10), **φ_θ(x;z_t) = o(Concat(u′(x), z_t))** (Eq. 11).
- InfoNCE meta-regularizer (Eq. 12): **Ĩ_η = (1/b)Σ_j ψ_η(D^{t_j}_trn)·ψ_η(D^{t_j}_val) − ln[(1/b(b−1)) Σ_{j≠i} exp(ψ_η(D^{t_j}_trn)·ψ_η(D^{t_i}_val))]**; total objective **argmin E_{t_j}[L^{t_j}] − γĨ_η** (Eq. 13).
Assumptions: (i) first two moments of nonlinear pair-embeddings suffice to identify the task's similarity structure; (ii) linear base kernel + deep conditional embedding is expressive enough (RBF's shared length-scale hurts adaptation — shown empirically); (iii) InfoNCE over mini-batches approximates true task-discrimination; (iv) meta-train tasks cover the similarity-structure space of meta-test tasks.

## 5. Features / target
Features: scalar x (sinusoids); SMILES-derived 1-D CNN embeddings (drug tasks). Target: scalar regression value (function value, binding affinity, antimicrobial activity ∈ [0,1]). Horizon: point prediction on query set.

## 6. Validation design
Episodic meta-learning; meta-test = unseen tasks; 20 random support/query partitions per task, averaged task MSE. Baselines: R2-D2 (linear KRR, no adaptation — clean ablation of the kernel-adaptation contribution), CNP, MAML. Controlled experiments: T∈{100,1000} training tasks × support m∈{5,…,30} (sinusoids). Active learning: pool-based max-predictive-entropy selection up to 20 queries, ADKL-GP vs CNP, random vs entropy querying. Kernel ablation: linear vs RBF vs normalized variants; γ∈{0,0.1,0.01}. Time ordering: none (task collections are cross-sectional).

## 7. Numerical results / baselines
Reported as task-MSE distributions (Figure 2; exact means printed under algorithm names in the figure — values not transcribed in text, so I report the paper's stated comparisons):
- ADKL-KRR and ADKL-GP **consistently outperform R2-D2 and CNP** on all three collections (sinusoids, Binding, Antibacterial); ADKL vs R2-D2 gap = pure effect of test-time kernel adaptation (only architectural difference).
- ADKL-GP **outperforms CNP** — GP framework beats conditional neural processes at the same task.
- ADKL-KRR ≈ ADKL-GP overall; **ADKL-KRR better than ADKL-GP for small support sets** (attributed to larger GP predictive uncertainty with few samples).
- Generalization: all DKL methods beat non-DKL with as few as 15 support samples; non-DKL methods need more samples for the same MSE; DKL methods generalize better across tasks at T=100.
- **Active learning**: ADKL-GP beats CNP throughout the 20-query budget; entropy-based querying beats random for ADKL-GP (GP uncertainty is informative); CNP degrades after 10 queries while ADKL-GP stays consistent.
- Meta-regularization: γ ∈ {0.1, 0.01} helps in most configurations vs γ=0.
- Kernel: **linear kernel generalizes better than RBF** (RBF's shared length-scale resists task adaptation); normalized variants tested.
*My inference:* the linear-kernel win is a genuinely useful negative result for GSE — with a deep conditional embedding, fancy stationary kernels underperform.

## 8. Code / data availability
Pre-processed datasets stated available "with this work" (link in paper, unverified). No code URL stated ("None stated" for code).

## 9. Leakage & limitations
- Real-world task collections are drug discovery, not sports — binding-affinity task structure (protein = task) is a loose analogy to (team-season = task).
- 7,620 Binding tasks but 5–9,000 samples each; sports gives ~32 teams × 10 seasons with 17 games — far fewer tasks and far smaller support sets; the regime where ADKL-KRR wins (m≤15) is exactly ours, but the cross-task diversity is much lower.
- Task embedding uses only mean/std of pair embeddings — may be too coarse to distinguish e.g. "rookie QB" from "backup QB" regimes with 2-game supports.
- No probabilistic calibration analysis for ADKL-GP beyond active-learning utility; no NLL numbers reported.
- RBF's shared length-scale is a strawman — a per-task length-scale would be the fair comparison (authors flag this as future work).
- Transformers tried for task encoding and "underperformed" (attributed to overfitting) — no numbers shown.

## 10. GSE overlap
First formal few-shot-regression DKL treatment; complements ledgers 1902 (non-Gaussian marginals), 1903 (IB compression), 1904 (learned spectral kernels). No DKL/task-embedding machinery exists in Garrett's map or GSE stack. **New capability**: a task-conditioned kernel that *selects the similarity metric per regime at inference* — e.g., similarity for rookie-QB team-seasons should weight college/projection priors, while veteran teams weight recent EPA. The DeepSets task encoder ψ_η is the portable piece: it turns a 2–4 game support set into a regime embedding z^t.

## 11. GSE implementation spec
1. Data: nflverse team-game pairs (x = game context vector, y = EPA margin) grouped by team-season; rookie-QB/new-HC seasons upweighted in meta-training.
2. Task encoder ψ_η: DeepSets over (game-context, margin) pairs → z^t (regime embedding); InfoNCE meta-regularizer over mini-batches of team-seasons so "same regime" (e.g. all rookie-QB starts) clusters.
3. Conditional embedding φ_θ(x; z^t) via concatenation + MLP; linear base kernel; ADKL-KRR head for margin, ADKL-GP head for win-prob calibration (run both, paper shows both win in different sample regimes).
4. Regime-shift detection as a free byproduct: monitor z^t drift week to week — a large jump in task embedding = scheme/coaching change detected from data, no manual regime labels needed.
5. Serving: per-team kernel adaptation at inference = closed-form KRR solve on ≤4 support games; z^t recomputed weekly.
Effort: ~3 engineering weeks; no public code, implement from equations.

## 12. Reproducible test
Same meta-protocol as ledgers 1902–1904 (nflverse, LOSO, support = first K∈{2,4} games of new-regime teams). Baselines: (a) fixed-kernel DKL (R2-D2 equivalent — ablation of adaptation), (b) ADKL with γ=0 (ablation of meta-regularization), (c) league-average prior. Metrics: MSE on margin + Brier on win prob. The ADKL-vs-fixed-kernel gap is the paper's core claim and must replicate on sports tasks.

## 13. Acceptance / rejection gate
ADOPT iff ADKL-KRR/GP beats the league-average prior by **≥0.01 Brier** on new-regime first-4-game predictions (2023–2025 LOSO) AND beats fixed-kernel DKL by ≥0.005 Brier (proves the task-conditioning, not just the deep kernel, transfers). Reject if the adaptation gap vanishes on sports data — then fall back to ledger 1904's fixed-spectral MetaVRF.

## 14. Improvement experiment
**Regime-prototype memory**: maintain a bank of learned regime prototypes (running means of z^t for archetypes: rookie-QB, new-HC, backup-QB, post-bye) and initialize a new team's task embedding as an attention-weighted blend of prototypes instead of from its 2-game support alone — a DeepSets + prototypical-network hybrid. Rationale: 2 games is too few for a stable z^t; anchoring on historical regime archetypes stabilizes it. Test: same meta-protocol; expect the prototype-anchored variant to beat pure-support z^t on K=2, with the gap closing by K=8. If prototypes collapse (all teams map to one), the InfoNCE γ was too low. This paper's z^t task embedding is the most sports-interpretable artifact in the lane so far — it doubles as an unsupervised regime-shift detector, which GSE currently does by hand.
