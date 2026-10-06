# [2009] Black-Box Batch Active Learning for Regression (arXiv:2302.08981)

**Citation:** Kirsch, A. (2023). *Black-Box Batch Active Learning for Regression*. OATML, University of Oxford. arXiv:2302.08981. Code: https://github.com/BlackHC/2302.08981. URL: https://arxiv.org/abs/2302.08981
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
**Verdict rationale:** Regression-native black-box batch AL: the empirical predictive-covariance kernel turns BADGE/BAIT/BatchBALD/Core-Set into prediction-only methods that work with non-differentiable models (random forests, GBDTs) and beat their white-box counterparts on average across 15 regression datasets; the most directly deployable paper in this wave for GSE's regression heads, though limited to regression (classification needs Laplace/MC/EP extensions) and to homoscedastic noise.

## 1. Research question
Can state-of-the-art batch active learning (BADGE, BAIT, BatchBALD, Core-Set, LCMD) — normally white-box methods requiring gradients/last-layer embeddings of differentiable models — be ported to black-box and non-differentiable models (random forests, gradient-boosted trees, API-only foundation models) using only model predictions, for regression tasks?

## 2. Dataset / schema
15 large tabular regression datasets from UCI ML Repository + OpenML: sgemm, wec_sydney, ct_slices, kegg_undir, online_video, query, poker, road, mlr_knn_rng, fried, diamonds, methane, stock, protein, sarcos. No sports data; schema is generic (x → real y).

## 3. Method / model
B³AL: replace the gradient kernel with the **empirical predictive covariance kernel** computed from K sampled predictions (ensemble members / bootstrapped trees / MC samples):
k_pred^(x_i,x_j) = (1/K)Σ_k (μ(x_i;ω_k) − μ̄(x_i))(μ(x_j;ω_k) − μ̄(x_j)), equivalently an inner product of centered K-vectors (valid PSD kernel).
Plug this kernel into the kernel-based formulations of Holzmüller et al. 2022 to get black-box BADGE, BAIT, BALD, BatchBALD, LCMD, ACS-FW, Core-Set.
Theory: Prop 3.1 — posterior gradient kernel k_grad→post (first-order Taylor around the BMA + GGN approximation) ≈ predictive covariance kernel k_pred, so white-box gradient kernels are just an approximation of the prediction-covariance kernel. Prop 3.2 — for non-differentiable models, a Bayesian hypothesis-space view with latent hypothesis index Ψ ~ Multinomial(q,1) over the fixed ensemble gives predictive covariance kernel = "posterior" gradient kernel w.r.t. Ψ *exactly*; a Dirichlet/BMC mixture variant gives the same up to a constant factor of 2. Acquisition-score log-determinants of the kernel Gram matrix are upper bounds on expected information gain (multivariate normal = max-entropy for a given covariance).
Models tested: DNN ensembles (10 members), random forests (100 trees as virtual ensemble / 10 bagged forests), CatBoost virtual ensembles (up to 20 members). Scales in #drawn predictions K, not in #parameters.

## 4. Equations & assumptions
- Regression model: Y|x,ω ~ N(μ(x;ω), σ_N²), homoscedastic.
- Gradient kernel: k_grad(x;x′|ω*) = ∇μ(x;ω*)·[∇²(−log p(ω*))]⁻¹·∇μ(x′;ω*)ᵀ (Eq. 6–7); posterior version conditioning on D_train (Eq. 8).
- Entropy bound: H[Y₁:ₙ|x₁:ₙ] = ½log det(Cov[μ(x₁)…μ(xₙ)] + σ²I) + C_n (Eq. 9).
- Empirical predictive covariance kernel (Eq. 12–13); non-differentiable latent model μ̃(x;Ψ) = ⟨μ(x;·),Ψ⟩ (Eq. 24–25), Cov[Ψ] = diag(q) − qqᵀ.
- Assumptions: homoscedastic Gaussian noise; K diverse enough to estimate predictive covariance; prediction queries cheap relative to labels; BALD-style MI upper bounds via max-entropy.

## 5. Features / target
Generic tabular features → real-valued regression targets (15 datasets).

## 6. Validation design
Holzmüller et al. 2022 benchmark protocol: log-RMSE averaged over ≥5 trials per dataset/method; per-member evaluation for ensembles (fair, isolates acquisition effect); uniform (random) baseline; ablations on ensemble size K and acquisition batch size B; A100 40GB GPUs.

## 7. Numerical results / baselines
- DNNs (10-member ensembles): black-box ■ competitive with white-box □ for BALD, BatchBALD, BAIT, BADGE, Core-Set; **on average black-box beats white-box for all but ACS-FW and BAIT** (Fig. 3; hypothesis: white-box implicit Fisher-information approximation is poor in the low-data regime where ensembles capture multimodality).
- Random forests (per-tree virtual ensemble): all black-box methods except BALD (top-k) beat uniform; bagged RFs and CatBoost virtual ensembles: only LCMD, BADGE, CoreSet beat uniform — attributed to low disagreement among virtual/bagged members (single RF's trees disagree more than bagged forests do).
- Ensemble-size ablation: increasing K improves acquisition for NNs and RFs (except LCMD, which first improves then degrades); for CatBoost virtual ensembles, K ∈ [5,160] gives no boost.
- Batch-size ablation: performance degrades with larger acquisition batches for all methods; at the largest batch (4096) white-box catches up to black-box.
- Black-box also matches/beats the best-performing white-box kernel variants from Holzmüller et al. (App. B.1).

## 8. Code / data availability
Code: https://github.com/BlackHC/2302.08981. Datasets are public (UCI/OpenML); benchmark protocol from Holzmüller et al. 2022.

## 9. Leakage & limitations
- Acknowledged: regression only (classification needs Laplace/MC/EP — nontrivial); homoscedastic noise; needs *enough diverse* empirical predictions — the failure mode on bagged RFs/CatBoost (low disagreement → no gain over uniform) is exactly what to monitor.
- Per-member evaluation is fair but real deployments use the full ensemble; low-data-regime advantage claim rests on one hypothesis (multimodality) without direct evidence.
- No cost-awareness, no batch-diversity guarantee beyond the inherited method's; acquisition-batch-size degradation confirms greedy/kernel methods still suffer at large B.
- Black-box methods inherit each white-box method's weaknesses (e.g., top-k BALD still bad).

## 10. GSE overlap
New and filling the biggest gap in this wave: ledgers 2002/2003/2006 are classification-built and need regression adaptations; this paper is regression-native and additionally removes the differentiability requirement — it runs on the gradient-boosted tree stacks that actually power GSE's yardage/total/spread-margin heads. Directly generalizes ledgers 2002 (BADGE), 2003 (BatchBALD), 2006 (Core-Set) to GSE's real models. Cost-awareness is absent (compose with ledgers 2007/2008's knapsack rules instead).

## 11. GSE implementation spec
- For each regression head (spread margin, total, team yardage): maintain a small ensemble K=10 (or reuse existing GBM bagged folds as the virtual ensemble — free), compute centered prediction vectors per pool game, build the empirical predictive covariance Gram matrix, and run black-box BADGE (k-means++ on prediction-disagreement "embeddings") and black-box Core-Set for weekly charting queues.
- Because it needs only predictions, this works unchanged across GSE's heterogeneous stack (GBMs, linear baselines, any API model) — one acquisition pipeline for all heads.
- Monitor the paper's failure signal: if inter-member disagreement (mean pairwise |μ_k − μ̄|) on the pool collapses (e.g., late season when models agree), fall back to uniform/geometric sampling — their CatBoost result says AL adds nothing there.
- Compose with ledger 2008: divide the black-box acquisition score by charting cost c(game) for the knapsack rule.
- Effort: ~2 days (Gram matrix + k-means++ selection; no gradient plumbing at all).

## 12. Reproducible test
2023–2024 nflverse: pool = weekly games, K=10 GBM bagged ensemble predicting spread margin; batch B=16 games/week for charting; compare black-box BADGE vs. black-box Core-Set vs. white-box BADGE (ledger 2002 regression adaptation) vs. uniform on 2024 held-out RMSE of the margin model per charting dollar. Baseline to beat: the white-box BADGE regression adaptation from ledger 2002's test.

## 13. Acceptance / rejection gate
ADOPT black-box BADGE iff it matches or beats white-box BADGE on 2024 held-out margin RMSE at equal batch size (ΔRMSE ≤ 0, i.e., no accuracy cost for dropping gradient access) AND runs ≥ 3× faster per acquisition round (the engineering payoff: no autograd/last-layer plumbing), with the win replicated on a second head (totals). REJECT if black-box underperforms white-box by > 0.05 RMSE points (the Fisher-kernel approximation is carrying real signal), or if pool disagreement collapses to the point that black-box ≈ uniform (their CatBoost failure mode).

## 14. Improvement experiment
Disagreement-weighted virtual ensembles: weight each ensemble member's contribution to k_pred^ by its validation-set skill (Prop 3.2's footnote suggests informing q with validation losses) instead of uniform q_k = 1/K. Test whether skill-weighted predictive covariance beats uniform-weighted on margin RMSE per dollar — hypothesis: down-weighting the ensemble's weak modes sharpens the kernel on the hypotheses that actually disagree about informative games, and the paper's exact-equivalence proof already covers non-uniform q.
