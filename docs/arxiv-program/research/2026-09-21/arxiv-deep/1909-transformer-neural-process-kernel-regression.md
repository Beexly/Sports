# [1909] Transformer Neural Process — Kernel Regression (arXiv:2411.12502v4)

**Citation:** Jenson, D., Navott, J., Zhang, M., Sharma, M., Semenova, E., Flaxman, S. (2024). *Transformer Neural Process — Kernel Regression*. arXiv:2411.12502v4. URL: https://arxiv.org/abs/2411.12502v4
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

**Why:** a scalable neural-process meta-regressor with kernel-biased attention and translation invariance; the natural few-shot regression engine for weekly GSE predictions, with the index set (game week, season) carrying the temporal structure the other ledgers hand-wave.

## 1. Research question
Neural Processes (NPs) directly model posterior predictive distributions but suffer an O(n²) attention bottleneck; inducing-point approximations scale but are "bounded above" in accuracy by full-attention models. Can a simple, parameter-efficient transformer block (KRBlock, O(n_c² + n_c n_t)), a kernel-based attention bias, and two new attention variants — Scan Attention (constant-memory, translation-invariant) and Deep Kernel Attention (Performer-style, O(n_c), with implicit distance bias) — deliver state-of-the-art meta-regression accuracy at scale (100K context points on 1M+ test points in <1 min on a 24GB GPU)?

## 2. Dataset / schema
Meta-regression benchmarks: 1D GPs (RBF, periodic, Matérn 3/2; lengthscales ℓ∼Beta(3,7), mean/median ≈0.3 — deliberately hard; 3–50 context points per function, observation noise 0.1); 2D GPs (RBF on [−2,2]², 12–128 context points); 1D Bayesian optimization (regret via Expected Improvement); image completion (MNIST, CelebA, CIFAR-10; 16–128 context pixels); epidemiology (SIR model on 64×64 grids: β∼Beta(2,8), γ∼InvGamma(5,0.4), ω∼randint(1,5)). All models scaled to ≈0.5M params, same output head, 5 seeds, 100K batches of 32. Baselines: NP, CNP, BNP, ANP, CANP, BANP, ConvCNP, TNP-D, TNP-KR:PERF (Performer baseline).

## 3. Method / model
**TNP-KR.** Embedding: observation status (context/test), index **s**, function value **f** → co-embedded token. Core = stack of 6 **KRBlocks** (Nadaraya–Watson kernel regression view: **v′_i = Σ_j 𝒦(q_i,k_j)/Σ_m 𝒦(q_i,k_m) v_j**, Eq. 3), with shared query/key update weights, pre-norm residuals, meta-information (index sets) conditioning. **Kernel-based attention bias**: **𝒦(q,k,s_q,s_k) = SM(qᵀk/√d_k + Σ_i α_i 𝒦_i(s_q,s_k))** (Eq. 4) — RBF network with 5 learnable basis functions K(s,s′)=Σ_k a_k exp(−|b_k|(‖s−s′‖₂−c_k)²); different kernels act on different index-set components (spatial + temporal). **Scan Attention (SA)**: Flash-Attention-2-style scan tiling with gradient checkpointing, constant memory O(n_b²), computes arbitrary bias on the fly (Eqs. 6–8). **Deep Kernel Attention (DKA)**: shared MLP query-key projection with co-embedded index sets, layer-norm instead of softmax, O(n_c) (Eq. 9). Temporal causality can be enforced via the bias itself: 𝒦_t = −∞ when s_k(t) > s_q(t) (Eq. 5) — no masking needed (flagged as future work).

## 4. Equations & assumptions
- KRBlock forward (Algorithm 1); attention with bias (Eq. 4); DKA update (Eq. 9).
- Translation invariance: if token embeddings exclude **s** and bias kernels are translation-invariant, attention is fully translation invariant — train on 64×64, test on 1024×1024 with "almost no degradation."
Assumptions: (i) context/test points factorize as a conditional NP (test outputs conditionally independent given the context encoding); (ii) translation-invariant phenomena where the bias is used; (iii) standardized data (σ² factored out of kernels); (iv) bounded σ output (softplus) to prevent collapse on noiseless data; (v) temporal causality via Eq. 5 not actually explored — "left for future research."

## 5. Features / target
Features: index set **s** (location/time), function values at context points. Target: regression values (NLL) or categorical. Horizon: arbitrary test locations.

## 6. Validation design
Paired t-tests on NLL (all models 0.5M params, same head, 5 seeds). BO regret under Expected Improvement (and UCB in appendix). Extrapolation tests: train 64×64, test 128/256/1024. Scale test: 100K context + 1M test points timing.

## 7. Numerical results / baselines
Numbers quoted exactly:
- **1D GP RBF NLL**: TNP-KR:DKA **−0.464 ± 0.002** (best), SA −0.462 ± 0.002, PERF −0.459 ± 0.002 vs ConvCNP/TNP-D −0.454 ± 0.002, BANP −0.335, ANP −0.298. All TNP-KR variants lower NLL than TNP-D and ConvCNP (paired p ≤ 0.039). **Regret**: ConvCNP 0.007 ± 0.002 (best, via better mean + wider bounds under EI); SA 0.013 ± 0.003; note: switching EI→UCB "erases" the gap (Appendix Table 14).
- **Periodic NLL**: SA **0.491 ± 0.001** vs TNP-D 0.536 ± 0.003, ConvCNP 0.551 ± 0.002 (p < 0.001). **Matérn 3/2**: SA **−0.027 ± 0.002** vs TNP-D −0.020 ± 0.003 (p ≤ 0.016). **2D GP**: SA **0.460 ± 0.002** vs ConvCNP 0.466 ± 0.003 (p ≤ 0.002).
- **CelebA**: SA **−0.917 ± 0.001** vs TNP-D −0.877 (p = 0.001). **CIFAR-10**: SA **−0.831 ± 0.001** vs ConvCNP −0.816 (p < 0.001).
- **SIR epidemiology**: SA **0.190 ± 0.001** vs TNP-D 0.191, ConvCNP 0.196 (p ≤ 0.025). **Extrapolation 1024×1024**: SA 0.307 ± 0.006 vs DKA 1.144, PERF 1.457, everything else OOM or 27.2 (NP/CNP collapse) — the headline translation-invariance result.
- **Scale**: SA processes a 1M+ pixel image in ≈50 s; DKA/PERF in ≈0.3 ms; 100K context on 1M+ test points in under a minute on one 24GB GPU.
*My inference:* SA is the accuracy variant, DKA the speed variant; DKA beats PERF on nearly every benchmark (paired p < 0.001 to 0.047), so it's the linear-time default if SA's O(n_c²) is too slow.

## 8. Code / data availability
Code: stated as provided ("Code: stated" — JAX implementation of SA; URL in paper). Data: synthetic GPs, public image sets, synthetic SIR.

## 9. Leakage & limitations
- Conditional-NP factorization: test points are conditionally independent given the context encoding — no joint predictive distribution over multiple future games (parlays/hedging correlations need an autoregressive extension, which the authors don't address).
- Temporal causality (Eq. 5) is proposed but not explored — GSE's weekly-causal constraint would need implementation + validation.
- BO results show a better-mean/worse-calibration trade-off: ConvCNP's higher uncertainty helped EI exploration; TNP-KR's edge is in NLL, and pick-engine value depends on calibration, not just sharpness.
- All comparisons at 0.5M params; GSE's tabular regime is far smaller than the paper's spatial grids — may need downsizing.
- The epidemiology benchmark is the closest to sports (spatiotemporal count process) but is synthetic SIR, not human-behavior data.

## 10. GSE overlap
No neural processes anywhere in Garrett's map; this is the first true *foundation-model-style* few-shot regressor in the lane. Relates to ledger 1904 (RFF kernels — DKA is a learned-kernel alternative to random features) and 1902 (NGGP — a GP whose non-Gaussianity the NP's flexible output head could absorb). **New capability**: a single meta-trained TNP-KR where the index set s = (season, week, team-embedding) and context = the season's observed games; query any future game and get a calibrated margin distribution without retraining. Translation invariance → train on historical seasons, extrapolate to future seasons and schedule quirks (17th game, new playoff format) without retraining.

## 11. GSE implementation spec
1. Data: nflverse weekly games 2015–2025; index set s = (season, week); token = (context/test flag, s, game features, margin if observed).
2. Kernel bias: RBF network over (week distance) + periodic over (season-week, capturing seasonality) — the paper's exact multi-kernel recipe (Eq. 4); enforce Eq. 5 causality so future games can't inform past predictions.
3. Context: all games up to current week (all teams — cross-team information is free in an NP); test: upcoming week's games. DKA for production (0.3 ms scale), SA for weekly batch recalibration.
4. Output head: Gaussian margin (start) → mixture or flow head (absorb 1902's non-Gaussianity later).
Effort: ~3 engineering weeks; JAX or PyTorch port of SA/DKA.

## 12. Reproducible test
nflverse 2018–2025; meta-train ≤2022, test 2023–2025. Weekly protocol: context = all games through week w, predict week w+1 margins. Baselines: (a) per-season kernel GP on the same context, (b) TNP-D, (c) GSE's current engine margin output. Metrics: NLL (primary), Brier on win, RMSE; report separately for early-season (w ≤ 4, the few-shot regime) vs late-season. Ablation: drop the kernel bias (vanilla attention) to verify the bias carries the gains; drop causality mask to check for leakage.

## 13. Acceptance / rejection gate
ADOPT iff TNP-KR:SA beats kernel-GP NLL on margin by **≥0.05 nats/game** in weeks 1–8 of 2023–2025 AND its win-probability Brier beats the league-average prior by **≥0.01** in the same window (the lane's standing gate). Reject if the causality ablation shows leakage, or if it can't beat a kernel GP early-season — then the complexity buys nothing over ledger 1902–1904 machinery.

## 14. Improvement experiment
**Autoregressive multi-game joint predictions**: the paper explicitly skips autoregressive sampling, but GSE's parlay/teaser and hedge logic needs joint distributions over multiple games. Extend TNP-KR with an autoregressive decoding head (per Bruinsma et al. 2023, cited by the authors) over the week's slate, trained with the same kernel-biased attention. Rationale: joint slate distributions unlock correlated-pick optimization that no conditional-independence NP can do. Test: same protocol; success = better joint log-likelihood on 2–3 game slates than independent-marginals product, with no degradation in marginal NLL. Pure regression paper — the strongest fit in this lane so far. The honest caveat is conditional independence across test games; the improvement experiment exists precisely to close that gap.
