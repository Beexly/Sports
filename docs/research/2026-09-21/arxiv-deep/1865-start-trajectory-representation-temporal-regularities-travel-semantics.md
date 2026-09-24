# [1865] Self-supervised Trajectory Representation Learning with Temporal Regularities and Travel Semantics (START) (arXiv:2211.09510)

**Citation:** Jiawei Jiang, Dayan Pan, Houxing Ren, Xiaohan Jiang, Chao Li, Jingyuan Wang (2022). *Self-supervised Trajectory Representation Learning with Temporal Regularities and Travel Semantics*. arXiv:2211.09510. URL: https://arxiv.org/abs/2211.09510
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Its time-aware self-attention (irregular-interval decay) and span-mask + contrastive dual pretraining transfer directly to NFL tracking; the road-network GAT stage must be replaced with a football-field graph.

## 1. Research question
How to inject spatiotemporal domain structure — travel semantics (road features + visit frequencies) and temporal regularities (periodic rush-hour patterns + irregular sampling intervals) — into self-supervised trajectory representation learning, instead of treating trajectories as generic sequences?

## 2. Dataset / schema
- **BJ**: Beijing taxi trajectories, November 2015; split chronologically 18/5/7 days (train/val/test); map-matched to OSM road network of Beijing; loop/short (<6 segments) trajectories removed, max length 128.
- **Porto** (PKDD'15, Kaggle): 15 s sampling; each month split chronologically 6:2:2 then combined; map-matched to OSM Porto road network.
- **GeoLife** (transfer test): 5,760 trajectories (4 modes) after map-matching; 882 Car/Taxi-mode used for travel-time transfer test.
Schema: road-network-constrained trajectories T = [⟨v_i, t_i⟩]_{i=1}^m (road segment + visit timestamp); road features F_V: road type, length, lanes, max speed, in-degree, out-degree.

## 3. Method / model
**Stage 1 — TPE-GAT** (Trajectory Pattern-Enhanced Graph Attention Network): L1=3 layers, heads [8,16,1]. Attention e_ij = (h_i W_1 + h_j W_2 + p^trans_ij W_3) W_4ᵀ, α_ij = softmax(LeakyReLU(e_ij)) over neighborhood N_i; transfer probability p^trans_ij = count(v_i→v_j)/count(v_i) from trajectory corpus; node update h̃_i^(l+1) = ELU(Σ_j α_ij h_j^(l) W_5); multi-head concat. Output road representations r_i ∈ R^d, d=256. Trained jointly with stage 2.
**Stage 2 — TAT-Enc** (Time-Aware Trajectory Encoder): L2=6 layers, H2=8 heads. (a) Time Pattern Extraction: x_i = r_i + t_{mi(t_i)} + t_{di(t_i)} + pe_i, where t_m = minute-of-day embedding (1–1440), t_d = day-of-week embedding (1–7). (b) Time-Interval-Aware Self-Attention: TA_h = softmax(Q_h K_hᵀ/√d' + Δ̃) V_h, with Δ̃ learned from pairwise |t_i − t_j| via decay δ'_{ij} = 1/log(e + δ_ij) then δ̃_ij = LeakyReLU(δ'_ij ω_1) ω_2ᵀ. (c) [CLS]-style placeholder at position 0 → whole-trajectory vector p_i ∈ R^d.
**SSL tasks:** (1) *Span-masked trajectory recovery* — mask consecutive spans of length l_m=2, total p_m=15%; replace road with [MASK], time indices with [MASKT]; linear head over |V| classes; cross-entropy L^mask. (2) *Trajectory contrastive learning* — NT-Xent with in-batch negatives, τ=0.05; augmentations: trajectory trimming (r1 ∈ 0.05–0.15 at origin/destination only), temporal shifting (r2=0.15 of roads, t_aug = t_cur − (t_cur − t_his)·r3, r3 ∈ 0.15–0.30), road-segment masking, dropout-as-augmentation.
**Pretraining:** L^pre = λ L^mask + (1−λ) L^con, λ=0.6. AdamW, lr 2e-4 with 5-epoch warm-up + cosine annealing, batch 64, 30 epochs, dropout 0.1, NVIDIA 3090. Default augmentation pair: trimming + temporal shifting.
**Downstream:** FC heads for travel-time regression (MSE, no time input except departure time), classification (cross-entropy), similarity search directly on frozen embeddings (Euclidean distance, no fine-tune).

## 4. Equations & assumptions
- p^trans_ij = count(v_i→v_j)/count(v_i); α_ij = exp(LeakyReLU(e_ij))/Σ_{k∈N_i} exp(LeakyReLU(e_ik)).
- x_i = r_i + t_{mi(t_i)} + t_{di(t_i)} + pe_i.
- TA_h(Q_h,K_h,V_h) = softmax(Q_h K_hᵀ/√d' + Δ̃) V_h; δ'_{ij} = 1/log(e + |t_i − t_j|); δ̃_ij = LeakyReLU(δ'_ij ω_1) ω_2ᵀ.
- L^mask_T = −(1/|M|) Σ_{v_i∈M} log(exp(Ẑ_{v_i})/Σ_{v_j∈V} exp(Ẑ_{v_j})); L^con_{i,j} = −log(exp(sim(p_i,p_j)/τ)/Σ_{k≠i} exp(sim(p_i,p_k)/τ)), sim = cosine.
- Assumptions: map-matched road-constrained trajectories (requires accurate map matching); transfer probabilities estimated from the training corpus generalize; periodic (minute/day) embeddings capture urban rhythm; detour-based synthetic ground truth (top-k detour replacing a ≤p_d=0.2 sub-trajectory, time threshold t_d=0.2) is a valid similarity label.

## 5. Features / target
Inputs: road segment IDs + visit timestamps (+ road features at stage 1). SSL targets: (a) identities of span-masked road segments (classification over |V| segments); (b) contrastive pairing of augmented trajectory views. Downstream targets: travel time (regression), passenger-carrying/driver-ID labels (classification), detour-based similarity ground truth (retrieval).

## 6. Validation design
Three tasks × two datasets (BJ, Porto): (1) travel-time estimation — MAE/MAPE/RMSE, fine-tuned with MSE, departure time only (no leakage); scenario slices by departure hour (incl. 16:00–21:00 peak), weekday/weekend, hop count 20–100. (2) Classification — BJ: carrying-passengers binary (ACC/F1/AUC); Porto: driver ID 435-class (Micro/Macro-F1, Recall@5). (3) Similarity — most-similar search (N_q=10,000 queries, N_neg=100,000 negatives; MR, HR@1, HR@5) and k-NN (k=5, p_d ∈ 0.1–0.5; precision), frozen embeddings, Euclidean distance. Splits chronological (BJ 18/5/7 days; Porto per-month 6:2:2). Baselines (8): traj2vec, t2vec, Trembr, PIM, PIM-TF, Toast, Transformer+MLM, BERT. Ablations: w/o TPE-GAT, w/ node2vec, w/o TransProb; w/o TimeEmb, w/o TimeInterval, w/ Hop-distance, w/o Log-decay, w/o Adaptive; w/o Mask, w/o Contra; 4×4 augmentation pairs. Transfer: BJ/Porto-pretrained → GeoLife fine-tune (vs Geolife-pretrained, vs Trembr transfer). Scalability: encode time for 100–400k trajectories; query time vs DTW/LCSS/Fréchet/EDR.

## 7. Numerical results / baselines
- All three tasks: START best on ALL metrics on both datasets (Table II; exact table values not recoverable from HTML text — figures rendered as images). Beats 8 baselines incl. Trembr (best baseline, only prior work using timestamps).
- Travel-time scenarios: START beats no-temporal variant and Trembr in every slice, largest gaps in 16:00–21:00 peak and 20–100-hop trajectories.
- Similarity: START best mean rank; k-NN precision degrades slowest as detour proportion p_d goes 0.1→0.5.
- Small-data: 100k–400k training — START beats no-pretrain variant at every size, gap widens with more pretraining data.
- Transfer: BJ-pretrained START → GeoLife fine-tune beats Geolife-pretrained START; Porto-pretrained also transfers (TPE-GAT params road-count-independent). Trembr transfer to GeoLife is WORSE than its baseline — seq2seq does not transfer.
- Ablations: dropping TPE-GAT hurts most; w/o TransProb worse than full but better than node2vec; w/o TimeEmb and w/o TimeInterval both "significant" degradations; hop-distance worse than no-interval; fixed (non-adaptive) interval matrix worse than adaptive; dropping either SSL loss hurts; temporal shifting + road mask best augmentation pair.
- Efficiency: 25.8 s to encode 100,000 trajectories (RTX 3090); deep-model similarity is O(d) vs O(L²) traditional — ≥10× faster per query than DTW/LCSS/Fréchet/EDR; linear scaling verified.

## 8. Code / data availability
"Codes and processed datasets are available here" (footnote link in paper; URL not extracted from HTML text). BJ via Beijing taxi data + OSM; Porto Kaggle.

## 9. Leakage & limitations
- Detour-based similarity ground truth is synthetic: the model family is evaluated on its ability to re-identify algorithmically generated detours — circular if detour semantics favor learned embeddings.
- Transfer-probability matrix p^trans_ij estimated from the same training corpus used for SSL — mild in-sample advantage over baselines that don't use corpus statistics.
- Map-matching prerequisite: BJ/Porto results depend on high-quality map matching; failures silently become trajectory noise.
- BJ split is chronological 18/5/7 days but from a single November — no seasonal coverage; Porto handled better via monthly splits.
- Table II exact numbers not recoverable from the HTML (rendered figures); claims verified only at the "best on all metrics" level.
- Road-network stage is inapplicable to free-space tracking without re-engineering (no roads on a football field).

## 10. GSE overlap
GSE has no learned tracking embeddings (existing-research map: metrics only). START's transferable-pretraining result (BJ→GeoLife across heterogeneous road networks) is the closest published evidence that trajectory pretraining transfers across domains — directly supporting a pretrain-on-college/NFL-tracking → fine-tune-on-NFL-props strategy. The temporal-shifting augmentation (perturb toward historical average travel time) is a template for NFL-specific augmentations (perturb a route toward the route-tree average). Complements 1862–1864 (JEPA/MAE SSL): START adds the hybrid mask+contrastive recipe and the only explicit irregular-interval attention (Δ̃).

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking, per-play per-agent sequences (nflverse/BDB), features (x, y, speed, accel, orientation), snap-relative coordinates.
2. Replace TPE-GAT with a field-graph GNN: discretize field into 1-yd cells as graph nodes; node features = field region (end zone/red zone/midfield/sideline), distance to line of scrimmage/goal; transfer probability p^trans_ij from 7 seasons of tracking corpus (player cell-transition frequencies) — the analog of road visit frequencies, capturing "route-tree semantics."
3. TAT-Enc adaptation: minute/day embeddings → play-clock + game-clock + down/distance embeddings (temporal regularities of football); time-interval-aware attention over frame gaps (handles tracking dropouts).
4. Pretrain: span-mask (mask consecutive 0.2–0.5 s windows, l_m equivalent) + contrastive (trimming at snap/whistle, temporal shifting toward route-average timing, dropout). L^pre = 0.6 L^mask + 0.4 L^con, d=256, AdamW.
5. Downstream heads: play-outcome regression, route-family classification (FTN charting labels), frozen-embedding play retrieval.
6. Effort: ~3–4 engineer-weeks (field-graph GNN is the novel piece).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking; train weeks 1–12, test weeks 13–18 (time-ordered). Tests: (a) route-family classification with frozen embeddings + linear head vs from-scratch Transformer; (b) play-outcome regression MAE vs no-embedding baseline; (c) same-play-concept retrieval top-1 (protocol of 1862). Run target: <48h on one 3090-class GPU.

## 13. Acceptance / rejection gate
ADOPT if: (a) frozen-embedding route-family classification accuracy ≥ 15pp above the from-scratch Transformer on held-out weeks, OR (b) same-play-concept top-1 retrieval ≥ 40% (≥10pp over raw-DTW), OR (c) play-outcome regression MAE ≥ 5% below the no-embedding baseline. REJECT if none hold.

## 14. Improvement experiment
Beyond the paper: (1) multi-agent START — run TAT-Enc jointly over all 22 agents with a role embedding (QB/RB/WR/DB/…) added alongside the temporal embeddings; the paper is single-agent. (2) Replace the generic contrastive negatives with "same play, different coverage" hard negatives drawn from FTN charting — the paper notes large batches create false hard negatives; football gives us true semantic negatives for free. Hypothesis: coverage-contrastive negatives make the embedding space organize by defensive concept, directly usable as a coverage classifier for prop matchup analysis.
