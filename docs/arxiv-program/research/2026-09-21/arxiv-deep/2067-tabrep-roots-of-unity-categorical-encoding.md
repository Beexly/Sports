# [2067] TabRep: Roots-of-Unity Categorical Encoding for Unified Tabular Diffusion (arXiv:2504.04798)

**Citation:** Jacob Si, Zijing Ou, Zhengrui Xiang, Yingzhen Li (2025). *TabRep: Training Tabular Diffusion Models with a Simple and Effective Continuous Representation*. arXiv:2504.04798 (Imperial College London / Columbia). URL: https://arxiv.org/abs/2504.04798
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, 2504.04798, §§1–6 + Appendices A–B; all equations, Tables 1–9, Figure 5 verified).
**Verdict:** ADAPT — CatConverter is the simplest dense categorical encoding in the lane (parameter-free, no VAE, no learned embeddings) with the deepest geometric justification: it provably collapses one-hot's combinatorial singular-hyperplane structure, beats all baselines including TabSYN on MLE (first method to beat Real-trained performance on 3 datasets), and is the cheapest to train/sample. The ordering-sensitivity finding (Table 7) is directly exploitable for NFL: order teams by prior strength to inject ordinal signal for free.

## 1. Research question
Tabular diffusion faces a representation dilemma: separate continuous/discrete diffusion (TabDDPM, CoDi, TabDiff) complicates joint optimization; unified continuous representations rely on sparse one-hot (STaSy) or an expensive learned VAE latent (TabSYN). What dense, separable, order-preserving continuous representation makes unified diffusion (DDPM *or* Flow Matching) work without extra machinery? The paper adds geometric theory: one-hot encodings create combinatorial "singular hyperplanes" where score-function variance explodes — what encoding removes them?

## 2. Dataset / schema
Seven UCI tabular datasets: Adult, Default, Shoppers, Stroke, Diabetes, Beijing, News — mixed continuous/discrete; classification (AUC) and regression (RMSE) targets. 20 sampling seeds; best-validated model.

## 3. Method / model
**CatConverter** (Eq. 12): inspired by DFT roots of unity, a categorical c with K values maps to a point on the unit circle: CatConverter(c,K) = [cos(2πc/K), sin(2πc/K)]. Dense 2-dim representation for ANY cardinality (Table 1: 2·Dcat dims vs ΣK for one-hot, Σ⌈log2K⌉ for analog bits, demb·Dcat for learned embeddings). Decoding: inverse = nearest of the K circle points; out-of-index impossible by construction (continuous→nearest valid point; residual "casting" of OOI to index 0 at 5–20% rates, Table 8). Continuous features: QuantileTransformer (matches ledgers 2062/2065). Then a **unified** continuous diffusion — either DDPM (Eq. 13) or Flow Matching (Eq. 14, target field u_t = ε − z_0^{CC}, Euler ODE sampling) — trained on concat[quantile numerics, CatConverter categoricals]. Denoising MLP: FC+sinusoidal time emb, hidden [1024,2048,2048,1024], ReLU, dropout 0.0; 100k iters, lr 1e−4, wd 5e−4; 50 (Flow) / 1000 (DDPM) sampling steps. Code: https://github.com/jacobyhsi/TabRep.

## 4. Equations & assumptions
CatConverter (Eq. 12): CatConverter(c_j,K_j) = [cos(2πc_j/K_j), sin(2πc_j/K_j)] ∈ ℝ^{2·Dcat}.
Singular-point theory (§4.1): one-hot minimal n-singular point x_S^{(n)} = (1/n)Σ_{k∈S}e_k (Eq. 8); singular hyperplane H_S = {x : d_k(x)=d_{k'}(x)} of dim K−|S|+1 (Eq. 9); number of minimal singular points scales combinatorially: Σ_{n=2}^{K}(K choose n) = 2^K − (K+1). Conditional score variance at a minimal n-singular point (Eq. 10, proved Appendix A.1): Var(g|x) = (α_t²/σ_t⁴)·(n−1)/n — strictly positive and asymptotically increasing in n; at non-singular points variance → 0. Generalized to arbitrary categorical priors (Eqs. 48–57). CatConverter collapses this: only ONE minimal K-singular point (the circle center), K 2-singular points, and NO n-singular hyperplanes for 2<n<K.
DDPM loss (Eq. 13): E‖∇_{z_t}log q(z_t|z_0^{CC}) − ∇_{z_t}log p_θ(z_t)‖². Flow loss (Eq. 14): E‖v_θ(z_t) − (ε − z_0^{CC})‖².
Assumptions: (1) category indices carry meaningful order — lexicographic by default; Table 7 shows ordering is load-bearing (ordinal/cyclical features); (2) separability suffices for nominal features (small MLP distinguishes up to 128 circle points, Fig. 3); (3) nearest-point decoding is faithful despite OOI casting bias.

## 5. Features / target
Per-dataset UCI columns; targets: classification AUC / regression RMSE via XGBoost MLE. NFL translation (my inference): team/opponent IDs (K=32) → 32nd roots of unity; **order categories by preseason Elo** (Table 7 says ordering matters — lexicographic is arbitrary, Elo-ordered injects real signal); periodic features (week, month) are natively circular; weather-bin/weather-severity ordinal features get order for free.

## 6. Validation design
Baselines: STaSy, CoDi, TabDDPM, TabSYN, TabDiff (the SOTA diffusion set). Benchmarks: MLE (XGBoost AUC/RMSE, primary), membership-inference-attack recall/precision (privacy; 50% = random), CWD, PCC, α-precision/β-recall, C2ST, training/sampling wall-clock, NFEs-vs-quality. Ablations: (Table 2) unified vs separate representation — TabRep-DDPM/Flow beat TabDDPM/TabFlow (discrete flow matching) everywhere; (Table 3) categorical representation bake-off under unified diffusion — OneHot-DDPM collapses on Adult (0.476 AUC), Learned1D/2D-DDPM collapse on several sets, i2b and Dictionary competitive, TabRep best; (Table 7) lexicographic vs random ordering — lexicographic wins hugely (Adult AUC 0.913 vs 0.776; Beijing RMSE 0.508 vs 1.050).

## 7. Numerical results / baselines
Table 4 (MLE; TabRep best on all 7): Adult AUC 0.913/0.912 (Real 0.927); Default 0.764/0.782 (Real 0.770 — **beats Real**); Shoppers 0.926 (Real 0.926 — ties); Stroke 0.869 (Real 0.852 — **beats Real**); Diabetes RMSE 0.373/0.377 (Real 0.384); Beijing RMSE 0.508/0.536 (Real 0.423); News RMSE 0.836/0.814 (Real 0.842 — **beats Real**). Paper's headline: first method to exceed Real-trained downstream quality while preserving privacy. TabDDPM News RMSE 3.46 (collapse again); CoDi News 1.21.
Table 5 (MIA recall, 50% = private): TabRep-DDPM 48–52 on 6/7 sets (News 40.10); TabDDPM News 9.88 (memorization leak); CoDi ~0–3 on several sets (total privacy failure).
Table 6 (Adult wall-clock): TabRep-Flow total 2031s (train 2028 + sample 3.07) — cheapest of all; TabRep-DDPM 2131s; TabDDPM 3179s; TabDiff 5655s; CoDi 24049s. Figure 5: TabRep-Flow attains best quality at 8 NFEs; converges earliest in training.
All numbers are the paper's claims. Caveat (my inference): beating Real on MLE is partly a denoising/regularization artifact (synthetic data smooths label noise) — the same effect FinDiff reported (2065). The representation bake-off (Table 3) is the most trustworthy table: same diffusion, different encodings, TabRep wins.
Appendix D (from this audit's tail read): high-cardinality toy regression (1,000-category feature, Table 13) — TabRep-Flow RMSE 0.4812 ≈ TabSYN 0.4775 vs TabDDPM 0.8253; DDPM variants (including TabRep-DDPM) fail on CDE/PWC/C2ST at high cardinality while Flow stays intact, so the NFL build should use TabRep-Flow, not TabRep-DDPM, for any high-cardinality field. Imbalanced toy (95/5 binary, Table 14): TabRep-DDPM/Flow best on all six metrics (RMSE 0.1688/0.1689, C2ST 99.42/99.06, β-recall 50.96/51.30). Diabetes timing (Table 12, 99,473 rows): TabRep-DDPM total 2094s vs TabDDPM 3723s vs TabSYN 6903s. MIA precision also ≈50% (random) across sets — privacy holds, not just recall.

## 8. Code / data availability
Code: https://github.com/jacobyhsi/TabRep. Data: seven UCI datasets (public). Fully reproducible.

## 9. Leakage & limitations
Adversarial notes: (1) CatConverter imposes an ARBITRARY circular order on nominal features — lexicographic worked, random failed (Table 7), so the encoding's success is order-dependent and the "right" order is dataset-specific voodoo; for NFL this is actually an opportunity (Elo ordering) but also a tuning surface. (2) High-cardinality categories crowd the circle — Fig. 3 shows separability to 128, but NFL has no K>32 categoricals, so fine; still, nearest-point decoding with 5–20% OOI casting (Table 8) injects systematic bias toward index 0. (3) "Beats Real" MLE claims need the denoising-artifact caveat — synthetic smoothing ≠ better data. (4) No conditional generation; no temporal structure; Beijing RMSE still far from Real (0.508 vs 0.423). (5) The singular-point theory assumes Gaussian diffusion with one-hot — elegant, but the empirical win could equally come from density (2 dims vs ΣK) rather than singular-hyperplane removal; the ablation doesn't disentangle them. External validity to NFL: very high — 32 teams on a circle is the natural cardinality, and Elo-ordering gives the order semantics the paper shows are load-bearing.

## 10. GSE overlap
Checked /home/hatch/workspace/arxiv-sweep/existing-research-map.md: no overlap — new capability. Within-lane position: TabRep is the *minimalist* answer to the same problem TabSyn (2066) solves with a Transformer VAE — no learned representation at all, just roots of unity + quantile transform, and it still beats TabSYN head-to-head (Table 4: TabRep-DDPM 0.913/0.764/0.926 vs TabSYN 0.906/0.755/0.918). The lane now has a clean bake-off axis: learned latent (TabSyn) vs learned embedding (FinDiff) vs fixed geometric encoding (TabRep) vs native discrete diffusion (TabDDPM/CoDi).

## 11. GSE implementation spec
Build plan (effort: ~2 engineer-days — simplest in the lane):
1. Data: nflverse team-game table 2015–2025; numerics → QuantileTransformer.
2. Categoricals → CatConverter: team/opponent IDs K=32 ordered by **preseason Elo** (not lexicographic — Table 7); venue type/surface/weather bins ordered by physical severity; rest category ordered by days; week number is natively circular.
3. Model: unified DDPM on concat representation (the paper's exact denoising MLP; start from their repo). Also train TabRep-Flow (8-NFE sampling → near-instant season generation).
4. Decode: nearest circle point per categorical; monitor OOI-cast rate toward index 0 (rebalance if biased).
5. Compare against lexicographic ordering (ablation of Table 7's finding) — Elo ordering should win on pair-correlation metrics.

## 12. Reproducible test
Dataset: nflverse team-game rows 2018–2023 train, 2024 held-out. Generators: TabRep-DDPM (Elo-ordered), TabRep-DDPM (lexicographic), TabRep-Flow, TabDDPM (2062 baseline), TabSyn (2066). Downstream GBDT spread model real+synthetic. Metrics: (a) log-loss on 2024; (b) Table 3-style MLE gap to Real; (c) OOI-cast rate per categorical + index-0 bias check; (d) wall-clock train/sample per season. Key comparison: Elo-ordered vs lexicographic (replicates Table 7 on NFL data).

## 13. Acceptance / rejection gate
ADOPT TabRep (Flow variant) as the fast-sampling backbone if: (a) log-loss gain ≥0.003 on held-out 2024 (standard bar), AND (b) Elo-ordered beats lexicographic on pair-correlation fidelity by ≥10% relative (validating the order-semantics bet), AND (c) OOI-cast index-0 bias ≤ 25% relative overrepresentation vs uniform (else the casting bias contaminates team frequencies). REJECT (keep TabSyn/TabDDPM) if nearest-point decoding aliases adjacent Elo-ordered teams (confusion between neighboring circle points >5% — the crowding failure mode) or if Flow's 8-NFE samples degrade fidelity vs 1000-step DDPM by >15%. Gate set before running; 3 seeds.

## 14. Improvement experiment
Prior-ordered + residual circle: CatConverter fixes category k at angle 2πk/K — the absolute position is arbitrary. Instead, learn a per-category *residual rotation* δ_k (small, regularized) on top of the Elo-ordered base angles, optimized jointly with the diffusion model: θ_k = 2π·rank_Elo(k)/K + δ_k, ‖δ‖₂ penalized. This keeps the order semantics and separability guarantees while letting the model fine-tune angular positions to actual team-similarity structure (e.g., dome teams cluster, rival schemes cluster). Test: does residual-rotation beat fixed angles on pair-correlation fidelity and the §13 gate — effectively a learned-embedding (FinDiff-style) correction on top of the geometric prior, at negligible extra cost.

**Verdict:** ADAPT
