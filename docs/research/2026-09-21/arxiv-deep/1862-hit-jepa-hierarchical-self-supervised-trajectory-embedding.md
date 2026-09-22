# [1862] HiT-JEPA: A Hierarchical Self-supervised Trajectory Embedding Framework for Similarity Computation (arXiv:2507.00028)

**Citation:** Lihuan Li, Hao Xue, Shuang Ao, Yang Song, Flora D. Salim (2025). *HiT-JEPA: A Hierarchical Self-supervised Trajectory Embedding Framework for Similarity Computation*. arXiv:2507.00028. URL: https://arxiv.org/abs/2507.00028
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Hierarchical multi-scale self-supervised trajectory embeddings transfer directly to NFL play/trajectory embeddings from 10Hz tracking, but must be re-engineered for multi-agent (22-player) tracking and play-structure semantics.

## 1. Research question
How to learn trajectory representations that capture BOTH fine-grained point-level detail and high-level route semantics in one self-supervised model? Existing contrastive/JEPA trajectory embeddings are single-scale; the paper proposes a three-layer hierarchy (point → segment → trajectory) learned jointly via a Joint-Embedding Predictive Architecture with top-down attention interaction between levels, evaluated on trajectory similarity computation across heterogeneous datasets.

## 2. Dataset / schema
Six datasets (all public except as noted):
- **Porto** (PKDD'15 taxi trajectory prediction, Kaggle): 1.7M trajectories from 442 taxis, Porto, Portugal, Jul 2013–Jun 2014. Training: 200,000; test DB 100,000; query 1,000.
- **T-Drive** (Microsoft Research, Beijing taxis): 10,357 taxis, Feb 2–8, 2008, avg sampling interval 3.1 min. Training: 70,000; test DB 10,000; query 1,000.
- **GeoLife** (Microsoft Research, 182 users): Apr 2007–Aug 2012, 17,6212 trajectories [sic — paper prints "17,6212"], 1–5 s sampling. Training: 35,000; test DB 10,000; query 1,000.
- **FourSquare-TKY / FourSquare-NYC**: check-in sequences, Apr 2012–Feb 2013, 573,703 / 227,428 check-ins. Zero-shot test only (all trajectories used for testing; queries 600 / 140).
- **AIS(AU)** (Australian Maritime Safety Authority, public): vessel traffic records, February 2025. Zero-shot test only (query 1,400, DB 7,000).
Schema: sequences of (lon, lat) GPS points, 20–200 points retained after preprocessing; 10% of training used for validation.

## 3. Method / model
**Input encoding:** continuous GPS space partitioned into Uber H3 hexagonal cells; spatial region as graph G=(V,E); node2vec pretraining gives spatial node embeddings H = {h_i ∈ R^d}. Each GPS point mapped via δ: R² → {1,…,|V|} then looked up.
**Hierarchy:** three consecutive Conv1D + MaxPool1D layers produce T^(1) ∈ (R^d)^{n1}, n1=n; T^(2) ∈ (R^{2d})^{n2}, n2=⌊n1/2⌋; T^(3) ∈ (R^{4d})^{n3}, n3=⌊n2/2⌋ (channel doubles, length halves each level).
**Per-level JEPA:** context encoder E_θ^(l) and target encoder E_{θ̄}^(l) (1-layer Transformers, 8 heads, hidden 1024, embedding dim d=256), target params = EMA of context params. Target sampling: M=4 masks per trajectory, masking ratios drawn uniformly from r={10%,15%,20%,25%,30%}, successive masking with prob p=50%, context sampling ratio p_γ ∈ [85%,100%], context minus target-overlap (no leakage). Predictor D_φ^(l) (1-layer Transformer decoder) predicts target from context + masked positional embeddings + mask tokens z^(l).
**Hierarchical interaction:** top-down attention spotlight — attention coefficients A^(l) of level l upsampled via ConvTranspose1d to Ã^(l) ∈ [0,1]^{n^(l-1)×n^(l-1)}, then fused: A^(l-1) = (A^(l-1) + σ Ã^(l)), σ learnable.
**Loss:** L = λL^(1) + μL^(2) + νL^(3), λ=0.05, μ=0.15, ν=0.8. Per-level loss = SmoothL1 JEPA prediction loss + VICReg (variance + covariance) on MLP-expanded context/target reps to prevent collapse. Inference uses context encoder level-1 output S'^(1) as final representation. Optimizer Adam, lr 1e-4 halving every 5 epochs, 20 epochs max, batch 64, Nvidia A5000.

## 4. Equations & assumptions
- Abstraction: T^(1)=Conv1D(T); T^(2)=MaxPool1D(Conv1D(T^(1))); T^(3)=MaxPool1D(Conv1D(T^(2))).
- A_i^(l) = softmax(Q_i^(l) K_i^(l)ᵀ / √d_k), d_k = d^(l)/H, H heads; A^(l) = Concat(A_1^(l),…,A_H^(l)) W^{O,(l)}; S^(l) = A^(l) V^(l).
- Ã^(l) = ConvTranspose1d(A^(l), W_deconv^(l), b_deconv^(l)); A^(l-1) ← (A^(l-1) + σ Ã^(l)).
- L^(l) = (1/MB)Σ SmoothL1(pred, target) + VarLoss(z_tar^(l)) + VarLoss(z_ctx^(l)) + CovLoss(z_tar^(l)) + CovLoss(z_ctx^(l)).
- Assumptions: spatial discretization via H3 hexagons is an acceptable substitute for raw continuous coordinates; node2vec spatial embeddings transfer; masked latent prediction captures the semantics needed for similarity; a single moving object (not interacting agents).

## 5. Features / target
Inputs: sequence of GPS points (lon/lat) → H3 hex cell IDs → node2vec embeddings. Self-supervised: context = randomly masked trajectory representation; target = latent representations of masked portions at three scales. No labels anywhere; targets generated from EMA target encoder.

## 6. Validation design
Self-similarity retrieval: query set Q built from odd-indexed points of test trajectories, DB D contains even-indexed halves + random fillers; metric = mean rank of true match (lower better). Robustness: downsampling ρ_s ∈ {0.1..0.5}, distortion ρ_d ∈ {0.1..0.5}; meta ratios R1–R5 combining DB size fraction {20%..100%}, ρ_s, ρ_d. Zero-shot: Porto-trained model evaluated on TKY/NYC/AIS(AU) (different domains/granularities). Downstream fine-tune: freeze encoder + 2-layer MLP decoder trained to approximate 4 heuristic similarities (EDR, LCSS, Hausdorff, discrete Fréchet); metrics HR@5, HR@20, R5@20; splits 7:1:2. Baselines: TrajCL, CLEAR, T-JEPA (run from open-source repos, default params). Ablations: no-interaction, concat-embeddings variant, single-layer-only.

## 7. Numerical results / baselines
- Self-similarity: HiT-JEPA achieves lowest mean rank across five of six datasets (Table 1). On T-Drive, mean rank across DB sizes 20%–100% stays 1.040–1.041 and across distortion rates 0.1–0.5 stays 1.031–1.038 (near-perfect retrieval). On GeoLife, mean ranks 2.8% higher (worse) than T-JEPA; second-best overall on Porto (paper attributes Porto gap to TrajCL exploiting speed/orientation cues in the dense Porto region).
- Zero-shot: lowest mean ranks on TKY, NYC, AIS(AU) across all DB sizes/downsampling/distortion — including cross-domain transfer from dense Porto taxi data to sparse check-ins and ocean-wide vessel data.
- Fine-tuning: average of HR@5/HR@20/R5@20 across 4 heuristics — HiT-JEPA outperforms T-JEPA on T-Drive by 12.6% and GeoLife by 6.4%, 3.7% lower on Porto; Hausdorff +14.7%, discrete Fréchet +19.9% relative average improvement on T-Drive vs T-JEPA.
- Ablation (Porto): all variants degrade; direct-concat variant collapses representations; single-layer-only and no-interaction variants both worse than full model.
- Hyperparams: 1 encoder layer per level best (2–3 layers overfit); batch 64–128 stable, 16 degrades.

## 8. Code / data availability
Code: https://anonymous.4open.science/r/HiT-JEPA (anonymous review link). Data: all datasets public (Kaggle Porto; Microsoft T-Drive/GeoLife; FourSquare; AMSA AIS). Baselines from their open-source repos.

## 9. Leakage & limitations
- Self-similarity query construction (odd/even split of the same trajectory) makes query and DB items near-identical siblings; mean ranks ~1.0 are inflated relative to true "find similar play" retrieval.
- Fine-tuning targets are heuristic measures (EDR/LCSS/Hausdorff/Fréchet) computed from the same coordinates — approximating a known formula, not a held-out semantic label.
- All trajectories are single-agent (one taxi/person/vessel); NO multi-agent interaction modeling — NFL tracking is 22 interacting agents plus ball.
- H3 discretization throws away sub-cell geometry; resolution must be tuned per study area.
- Code link is anonymous/temporary; may not be durable. Temporal splits: training 2008/2013–2014 vs zero-shot 2025 AIS — no concern for SSL, but fine-tune decoder splits are random (7:1:2), not time-ordered.

## 10. GSE overlap
GSE's benchmark lane catalogs public metrics (EPAM, CPOE, Next Gen Stats), and the Sports repo holds the 48-post @NextGenStats inventory and metric glossary — no learned trajectory-embedding capability exists in GSE's engine per the existing-research map (/home/hatch/workspace/arxiv-sweep/existing-research-map.md). This is a NEW capability: self-supervised multi-scale embeddings of raw 10Hz NFL tracking sequences, usable as drop-in features for the v5.2.7 engine and for play-concept retrieval. Complements rather than duplicates the tracking_ngs metric lane (saturated). Note: the tracking lane reader in wave 5 will likely take T-JEPA-style single-scale ideas; HiT-JEPA's hierarchical interaction is the distinct contribution here.

## 11. GSE implementation spec
1. Data: NFL Big Data Bowl / nflverse tracking — raw 10Hz (x, y, speed, accel, orientation) for all 22 players + ball per play, 2018–2024 seasons. Chunk by play (snap to whistle), ~40–80 frames per play per agent.
2. Input adaptation: replace H3/node2vec with learned field-coordinate embedding (continuous (x,y) → MLP embedding, or fine grid ~1-yd cells + node2vec on field graph). Multi-agent: encode each player's sequence at level structure, then pool across agents with a permutation-invariant set attention before the hierarchy, or train per-role (QB/RB/WR trajectories separately).
3. Pretrain HiT-JEPA (3-level, d=256, λ/μ/ν as above) on ~500K+ play-agent trajectories, no labels. 20 epochs on a single A5000-class GPU is feasible.
4. Downstream: (a) play-embedding retrieval — nearest-neighbor play-concept search for coaching/materials; (b) frozen embeddings as features concatenated into GSE's existing prop/win-probability models.
5. Serving: precompute per-play embeddings nightly (batch), store in vector DB for retrieval; features joined at model-train time. Effort: ~2–3 engineer-weeks for the single-agent-to-multi-agent adaptation + training harness.

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking (nflverse), plays split by game-date: train on weeks 1–12 2023 + weeks 1–12 2024, test on weeks 13–18 2024. (a) Retrieval test: embed all test plays; for each play query, retrieve k=1 nearest neighbor by cosine; check whether retrieved play shares the same play-concept label (pass/run, route-family from FTN charting) — baseline = raw-DTW nearest neighbor and random. (b) Downstream test: add frozen embeddings as features to GSE's existing spread/total model; metric log-loss on the same test window; baseline = model without embeddings. Run must complete in <48h on one GPU box.

## 13. Acceptance / rejection gate
ADOPT the hierarchical embedding approach if EITHER: (a) top-1 retrieval same-play-concept accuracy ≥ 40% on held-out weeks 13–18 2024 (vs ≤15% random baseline, and ≥10pp above raw-DTW), OR (b) downstream model log-loss improves by ≥ 0.002 versus the no-embedding baseline on the same test window. REJECT if neither holds.

## 14. Improvement experiment
Beyond the paper: (1) add a ball-trajectory co-embedding branch with cross-attention between ball and player levels — the paper is single-object; the ball is the strongest play-semantics signal in football. (2) Replace fixed λ/μ/ν (0.05/0.15/0.8) with learned level weights gated by play phase (pre-snap vs post-snap), since fine-grained detail matters more post-snap. Hypothesis: ball-aware hierarchy raises same-play-concept retrieval accuracy by focusing the top-down spotlight on routes that interact with the ball's path.
