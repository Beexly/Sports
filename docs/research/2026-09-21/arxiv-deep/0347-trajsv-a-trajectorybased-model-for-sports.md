# [0347] TrajSV: A Trajectory-based Model for Sports Video Representations and Applications (arXiv:2508.11569v1)

**Citation:** Zheng Wang, Shihao Xu, Wei Shi (2026). *TrajSV: A Trajectory-based Model for Sports Video Representations and Applications*. arXiv:2508.11569v1. URL: https://arxiv.org/abs/2508.11569v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,387 lines).
**Verdict:** ADAPT — the trajectory+visual fusion representation (CRNet/VRNet + triple contrastive loss) is a strong design pattern for a "find plays like this one" retrieval layer over NFL film, but rebuild it on NGS tracking data GSE already has rather than the paper's broadcast-MOT pipeline, and do not trust the synthetic-noise retrieval numbers as real-world performance.

## 1. Research question
Can raw broadcast sports videos be converted into task-agnostic clip/video representations — without labels — that support sports video retrieval, action spotting, and video captioning? TrajSV builds representations from player/ball trajectories (via a Clip Representation Network, CRNet) fused with visual features, aggregates clips into video representations (via a Video Representation Network, VRNet), and trains everything with a triple contrastive loss. The system is deployed as a sports video search engine with an HNSW approximate-nearest-neighbor index.

## 2. Dataset / schema
- **YouTube:** 3,261 soccer videos crawled from YouTube sports channels, durations 13–962 s (retrieval + qualitative).
- **SoccerNet:** 550 complete broadcast soccer games from major European leagues; 17 action classes for spotting; average 78.33 temporally localized comments per game, 36,894 captions total (retrieval, action spotting, captioning).
- **SportsMOT:** 240 videos across soccer, basketball, volleyball (Olympics, NCAA Championship, NBA) — retrieval and qualitative only (lacks spotting/captioning labels).
- Trajectory schema: field coordinates in [-52.5, +52.5] m (x) × [-34, +34] m (y) — the soccer setting from play2vec, applied unchanged to basketball and volleyball data.
- Access: all three datasets are public; code links given for preprocessing components (sn-spotting, tvcalib, FairMOT, play2vec, X-CLIP).

## 3. Method / model
Three stages. **Preprocessing:** (1) ResNet-based camera-shot classification/segmentation (1D CNN, 3 layers, 21-frame kernel, ResNet 512-d PCA features; clips <0.4 s removed; morphological opening/closing, kernel 3); (2) camera calibration via TVCalib — DeepLabV3 segment localization, AdamW lr 0.05, weight decay 0.01, 2000 steps, one-cycle schedule (pct_start=0.5), batch 512, 5 fps; (3) MOT with FairMOT (DLA-34 variant) fine-tuned 40 epochs on SoccerNet-Tracking (Adam, lr 1e-4 → 1e-5 after 20 epochs, batch 12), small-object (bbox <500 px) weight 10 for ball tracking; tracks mapped to field coordinates, off-field objects filtered. **CRNet:** clips divided into fixed-duration non-overlapping segments; player/ball paths rasterized into binary field-grid "segment matrices" (3 m cells, 1 s segments); tokens derived via Jaccard dissimilarity (threshold 0.3); token + learnable positional embedding \(x_i = s_i + p_i\); Transformer encoder (2 layers, 2 heads, d1=d2=d3=128, dropout 0.3); m=16 segments per clip (zero-padded), n=16 consecutive clips per video; position-wise FFN → trajectory vector t (d3=128); concatenated with X-CLIP visual vector y (d4=512, Kinetics-600 pretrained) → clip representation \(c = \text{Concat}(t, y)\), d5=640. **VRNet:** encoder = two MSB blocks (640→1280); decoder = rFF(MSB(MAB(s, E))) with trainable seed vector s → video vector v (d6=128), 2 attention heads. **Triple contrastive loss:** intra-clip variant V^(2) (trajectories replaced at noise rate δ), inter-clip variant V^(3) (clips replaced at δ), symmetric InfoNCE per pair, weighted by α=0.5, β=0.3; training noise δ sampled U(0, 0.2); 100 epochs, SGD lr 0.01, momentum 0.7, temperature τ=0.1, early stopping patience 10; 80/20 train/test split.

## 4. Equations & assumptions
- Token+position: \(x_i = s_i + p_i\).
- Multi-head (eq 2–4): \(\text{Multi-head}(\mathbf{X,X,X}) = \text{Concat}(O_1,\dots,O_h)\mathbf{W}^O\); \(O_i = \text{Attention}(\mathbf{X}\mathbf{W}^Q_i,\mathbf{X}\mathbf{W}^K_i,\mathbf{X}\mathbf{W}^V_i) = \delta\big(\frac{(\mathbf{X}\mathbf{W}^Q_i)(\mathbf{X}\mathbf{W}^K_i)^\top}{\sqrt{d_1/h}}\big)\mathbf{X}\mathbf{W}^V_i\), with \(\delta(\cdot)\) = softmax.
- Position-wise FFN (eq 5): \(\mathbf{t} = \Phi(\mathbf{Z}\mathbf{W}_1+\mathbf{b}_1)\mathbf{W}_2+\mathbf{b}_2\), \(\Phi\) = ReLU.
- Fusion (eq 6): \(\mathbf{c} = \text{Concat}(\mathbf{t},\mathbf{y})\), \(d_5 = d_3+d_4 = 640\).
- MAB/MSB (eq 7–9): \(\text{MAB}(\mathbf{X},\mathbf{Y}) = \text{LayerNorm}(\mathbf{H}+\text{rFF}(\mathbf{H}))\); \(\mathbf{H} = \text{LayerNorm}(\mathbf{X}+\text{Multi-head}(\mathbf{X},\mathbf{Y},\mathbf{Y}))\); \(\text{MSB}(\mathbf{X}) = \text{MAB}(\mathbf{X},\mathbf{X})\).
- Encoder (eq 10): \(\mathbf{E} = \text{Encoder}(\mathbf{C}) = \text{MSB}(\text{MSB}(\mathbf{C}))\).
- Decoder (eq 11): \(\mathbf{v} = \text{Decoder}(\mathbf{E}) = \text{rFF}(\text{MSB}(\text{MAB}(\mathbf{s},\mathbf{E})))\).
- Symmetric InfoNCE (eq 12–13): \(\mathcal{L}_{1,2} = \sum_{V_i^{(1)}} -\log \frac{\exp(\mathbf{v}_i^{(1)}\cdot\mathbf{v}_i^{(2)}/\tau)}{\sum_{j \ne i}\exp(\mathbf{v}_i^{(1)}\cdot\mathbf{v}_j^{(2)}/\tau)}\); \(\mathcal{L}(V^{(1)},V^{(2)}) = \mathcal{L}_{1,2}+\mathcal{L}_{2,1}\).
- Triple loss (eq 14): \(\mathcal{L} = \alpha\mathcal{L}(V^{(1)},V^{(2)}) + \beta\mathcal{L}(V^{(1)},V^{(3)}) + (1-\alpha-\beta)\mathcal{L}(V^{(2)},V^{(3)})\), \(0 \le \alpha,\beta \le 1\).
- Assumptions: (1) in-batch negatives are "generally quite dissimilar to the query" (random shuffling); (2) replacing trajectories/clips at rate δ creates valid positive variants; (3) the soccer field coordinate frame transfers to basketball/volleyball.

## 5. Features / target
Input features: rasterized trajectory segment matrices (Jaccard-tokenized, 128-d embeddings) + X-CLIP 512-d visual vectors per clip. Target: none (unsupervised) — the contrastive objective learns video-level (128-d) and clip-level (640-d) representations used downstream for retrieval (video vector), action spotting and captioning (clip vectors concatenated into Baidu-AS/Baidu-VC embeddings and fine-tuned).

## 6. Validation design
80/20 train/test split (not stated to be time-ordered). Retrieval: queries are synthetic noise-corrupted variants (δ = 0.5–0.6) of database videos; HR@1/MRR measure recovery of the original — a closed-world corruption-robustness test, not open-world similarity search. Action spotting: Avg-mAP (δ 5–60 s) on SoccerNet with Baidu-AS backbone. Captioning: METEOR/BLEU/ROUGE/CIDEr/SODA_c on SoccerNet. Baselines: play2vec, Chalkboard, SimScene, ResNet, X-CLIP (retrieval); CALF, NetVLAD++, Baidu-AS (spotting); Baidu-VC (captioning). Table II caption claims "All results are statistically significant (t-test with p<0.05)". Transferability: SoccerNet→YouTube zero-shot and fine-tuned. Scalability: HNSW retrieval timing for 500–3,000 videos.

## 7. Numerical results / baselines
- **Retrieval (Table II), noise δ=0.6, HR@1:** YouTube — TrajSV **0.475** vs ResNet(MLP) 0.231 (**+105.6%** as claimed); SoccerNet — TrajSV **0.250** vs X-CLIP(MLP) 0.141 (**+77.3%**); SportsMOT — TrajSV **0.614** vs ResNet(MLP) 0.347 (**+76.9%**). Full TrajSV rows: YouTube HR@1 0.791/0.802/0.475, MRR 0.881/0.887/0.680 (δ=0.5/0.55/0.6); SoccerNet HR@1 0.719/0.484/0.250, MRR 0.846/0.689/0.551; SportsMOT HR@1 0.748/0.810/0.614, MRR 0.712/0.650/0.475.
- **Action spotting (Table III), overall Avg-mAP:** CALF 40.7, NetVLAD++ 53.4, Baidu-AS **73.2**, Baidu-AS+play2vec 73.5, Baidu-AS+TrajSV **73.7** (+0.5% over Baidu-AS; authors note Baidu-AS is near the dataset bottleneck). SOTA in 9/17 categories; per-category gains: yellow→red cards **44.2 vs 39.8 (+11.1%)**, substitution **79.4 vs 76.3 (+4.1%)**, indirect free-kick **71.8 vs 70.9 (+1.3%)**.
- **Captioning (Table IV):** commentary spotting mAP@30 **53.07 vs 49.40 (+7.4%)**, mAP@60 **66.64 vs 63.10 (+5.6%)**; DVC/SDVC up to **+20.5% (R@30: 26.61 vs 22.09)**; SODA_c 7.90 vs 7.79.
- **Ablation (Table V, YouTube HR@1/MRR):** full **0.475/0.680**; w/o CRNet (BiLSTM) 0.419/0.641, (LSTM) 0.384/0.625; w/o VRNet (Mean) 0.239/0.147, (MLP) 0.335/0.197; trajectory-only+VRNet 0.344/0.444; X-CLIP+VRNet 0.242/0.461; ResNet+VRNet 0.386/0.603; dropping any of the three loss terms costs 0.027–0.042 HR@1.
- **Parameter studies:** batch 128 best (0.475/0.680, 25 min train); cell size 3 m best; embedding dim 256 → 0.564/0.738 (but paper uses 128).
- **Transfer (Table IX, HR@1 at δ=0.4–0.6):** SN→YT zero-shot TrajSV 0.956/0.886/0.591/0.248/0.139; fine-tuned 0.980/0.931/0.719/0.723/0.386; YT→YT 0.984/0.956/0.791/0.802/0.475. Zero-shot transfer notably weak at high noise.
- **Scalability (Table X):** HNSW retrieval 10.70 s (500 videos) → 13.75 s (3,000).
- **vs. StreamMind LLM model (Table XI):** TrajSV 0.250/0.551 vs StreamMind 0.223/0.514; w/o trajectory 0.208/0.489.
- **Scenario breakdown (Table XII, MRR at δ=0.6):** TrajSV beats X-CLIP(MLP) by ~39.98% across concrete events, abstract patterns, variable-length actions.

## 8. Code / data availability
Component code linked in footnotes: sn-spotting (shot segmentation), TVCalib (calibration), FairMOT (tracking), play2vec (tokenization reference), X-CLIP (visual backbone). Full TrajSV system code: not stated as released (None stated for the end-to-end repo). Datasets YouTube/SoccerNet/SportsMOT are public.

## 9. Leakage & limitations
- **Synthetic retrieval ground truth:** queries are noise-corrupted copies of database videos, so HR@1 measures robustness to the authors' own corruption process — a closed-world test that cannot validate real "find similar plays" performance, where no ground truth exists. The "nearly 70% improvement" headline (abstract) rests on this synthetic protocol.
- **Wrong field geometry for non-soccer sports:** basketball/volleyball trajectories are embedded in a soccer-sized coordinate frame ([-52.5,52.5]×[-34,34] m) — the cross-sport claim is built on a geometrically wrong representation, yet it still "works," which suggests the retrieval task is easier than presented (or the visual branch carries it).
- **Action-spotting gain is negligible:** 73.2→73.7 overall; the authors themselves admit vision cues dominate and Baidu-AS is at the dataset bottleneck. The trajectory branch adds almost nothing where labels exist.
- **Heavy, fragile preprocessing:** the whole pipeline depends on FairMOT fine-tuned on SoccerNet-Tracking + TVCalib calibration + shot segmentation; tracking/calibration errors propagate into every representation, and none of this is evaluated for failure modes.
- 80/20 split not time-ordered; no discussion of near-duplicate videos across splits (YouTube crawls are rife with duplicates/rebroadcasts).
- HNSW "scalability": 10.70→13.75 s for 500→3,000 videos is slow for an ANN index and suggests the timing includes query embedding, not just search.
- Zero-shot cross-dataset transfer is weak at high noise (0.139 HR@1 at δ=0.6 SN→YT) — the representations are dataset-specific.
- NFL external validity: soccer broadcast pipeline; NFL would need field calibration for 100-yard fields, 22-player MOT, and broadcast/All-22 shot segmentation — none demonstrated.

## 10. GSE overlap
Per the existing-research map: GSE's tracking lane (27-family NGS taxonomy, NGS replacement spec `docs/research/2026-09-18-ngs-replacement-spec.md`, STRAIN read) works from NGS tracking coordinates — GSE already HAS the trajectory data TrajSV tries to extract from video. This is an **extension**: the portable asset is the CRNet/VRNet + triple-contrastive representation-learning design applied to play retrieval ("find plays like this one" for scouting, edge-sheet prep, matchup research), not the video-MOT pipeline. No duplication of existing GSE work.

## 11. GSE implementation spec
- **Purpose:** a "similar-play retrieval" layer over GSE's film/tracking archive — given a play, retrieve the K most tactically similar historical plays (for matchup prep, tendency research, edge-sheet content).
- Data: skip the paper's broadcast-MOT pipeline entirely — use NGS tracking (x, y, speed, 22 players + ball) that GSE already consumes. Rasterize to field-grid segment matrices per the paper (cell size tuned to football: ~2-yard cells, 0.5 s segments), Jaccard-tokenize, same Transformer CRNet; fuse with a lightweight visual branch only if film embeddings add signal (ablate first — the paper's own ablation shows trajectory+VRNet alone reaches 0.344/0.444 vs 0.475/0.680 fused).
- Model: CRNet (Transformer, d=128) + VRNet (MSB encoder + seed-vector decoder) + triple contrastive loss (α=0.5, β=0.3, τ=0.1, SGD lr 0.01, momentum 0.7) per paper; positives = same play with trajectory dropout/replacement at δ~U(0,0.2).
- Serving: offline batch embedding of the historical play archive into an HNSW index (proper ANN, not the paper's slow setup); online query = embed one play, retrieve top-K.
- Estimated effort: 5–7 engineer-weeks (tracking rasterizer + CRNet/VRNet reimplementation + contrastive training + HNSW index + retrieval UI hook).

## 12. Reproducible test
Dataset: 2022–2024 NFL NGS tracking, pass plays only. Ground truth for "similar": human-labeled — 200 query plays, each with 5 expert-judged similar plays from the same season (scout-labeled, blind to the model). Metric: Recall@10 / MRR of expert-similar plays vs. two baselines: (a) raw tracking-feature kNN (down/sample + Euclidean), (b) X-CLIP-style visual kNN on broadcast frames. Window: three seasons, offline. This replaces the paper's synthetic-corruption protocol with a real similarity judgment.

## 13. Acceptance / rejection gate
**Adopt** the TrajSV-style retrieval layer if on the 200-query expert set it beats BOTH baselines on MRR by ≥15% relative AND a blind scout review rates ≥60% of its top-5 retrievals "tactically similar." **Reject** if it fails to beat the raw-tracking kNN baseline (the paper's ablations suggest the visual branch may carry the gain, which won't transfer cleanly to NGS-only input), or if scout-rated similarity <60% — synthetic HR@1 numbers do not count toward this gate.

## 14. Improvement experiment
Go beyond the paper's three-way contrast by adding a fourth contrastive term: play-outcome-conditioned negatives — plays with similar trajectories but different outcomes (e.g., same route concept, completion vs. interception) are pushed apart, so the representation separates tactical similarity from outcome similarity. Test whether outcome-conditioned embeddings improve scout-rated "tactically similar" retrieval over the paper's pure trajectory-similarity objective — directly targeting the scouting use case the paper never evaluates.
