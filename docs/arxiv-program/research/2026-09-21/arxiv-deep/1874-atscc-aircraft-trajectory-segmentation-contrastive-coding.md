# [1874] Aircraft Trajectory Segmentation-based Contrastive Coding (ATSCC) (arXiv:2407.20028)

**Citation:** Korea Advanced Institute of Science and Technology (KAIST) (2024). *Aircraft Trajectory Segmentation-based Contrastive Coding: A Framework for Self-supervised Trajectory Representation*. arXiv:2407.20028. Data: huggingface.co/datasets/petchthwr/ATFMTraj. Code: github.com/petchthwr/ATSCC. URL: https://arxiv.org/abs/2407.20028
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT
Segmentation-based contrastive coding defines positive pairs by geometric segmentation (iterative RDP) instead of data augmentation — a genuinely new positive-pair recipe that maps to football movement primitives (cuts, breaks, stems) and beats 8 established baselines on real trajectory data.

## 1. Research question
Contrastive trajectory learning needs a definition of "similar" — but data augmentation is unreliable for trajectories (unique temporal dynamics per dataset). Can geometric segmentation (significant points from the iterative Ramer–Douglas–Peucker algorithm) define positive pairs for contrastive coding, with a causal encoder that supports real-time monitoring of incomplete, variable-length trajectories?

## 2. Dataset / schema
**Four airport datasets, manually labeled from AIPs** (labels for evaluation only): Incheon (RKSI) arrivals + departures (ADS-B, Opensky, 2018–2023, south/southeast downsampled for balance), Stockholm Arlanda (ESSA) arrivals (SCAT surveillance + flight plans), Zurich (LSZH) arrivals. Preprocessing: cleaning, resampling every 5 s, smoothing, scaling. Schema: ENU positions (x,y,z) + derived features; variable-length multivariate time series.

## 3. Method / model
1. **Segment ID assignment:** iterative RDP: Υ_i = RDP(X_i, ε); marks significant points (beginning/end, then recursively the point with max perpendicular distance d(x_{i,k},x_{i,s},x_{i,e}) exceeding ε); each timestep gets a segment ID υ_{i,t}.
2. **Geometric feature extraction:** per step x_{i,t} = {x,y,z (ENU), u^x,u^y,u^z (directional unit vector = path angle), r, sinθ, cosθ (polar coords around airport, sin/cos to avoid 0/360 discontinuity)} — 9 features.
3. **Causal Transformer encoder** (GPT-2/3 style, NoPos — no explicit positional encoding, L2 norm after projections): 12 layers, d=768, FFN 3072 (GELU), 12 heads, dropout 0.35; binomial timestamp masking p=0.2 applied BEFORE input projection (mimics missing states from irregular transmissions); representation dim 320. Causal: each timestep aggregates all preceding information → real-time capable.
4. **Soft Nearest Neighbor loss:** batch flattened to Z_f (ΣT_i vectors); segment IDs remapped per batch; L_snn = −E[log Σ_{j:υ_i=υ_j} exp(z_iᵀz_j/τ) − log Σ_{k:υ_i≠υ_k} exp(z_iᵀz_k/τ)] — positives = same segment (within/across instances), negatives = different segments; positives excluded from the negative sum (modified form).

## 4. Equations & assumptions
- d(x_{i,k},x_{i,s},x_{i,e}) = ‖x_{i,k}−x_{i,s}‖ if x_{i,s}=x_{i,e}, else |(x_{i,e}−x_{i,s})×(x_{i,s}−x_{i,k})|/‖x_{i,e}−x_{i,s}‖.
- L_snn as above.
- Assumptions: RDP significant points correspond to operationally meaningful waypoints/instructions; states within one segment share operational context; geometric (not augmentation-based) similarity is the right inductive bias; causal encoding without positional encoding suffices (NoPos).

## 5. Features / target
Inputs: 9-dim geometric features per timestep. SSL targets: segment-ID agreement (contrastive). Evaluation: instance labels (runway/corridor classes) via SVM accuracy + K-Means NMI/ARI.

## 6. Validation design
- Baselines: SPIRAL, TCN-AE, TF-AE, T-Loss, TNC, TS-TCC, TS2Vec, InfoTS — same geometric features, same protocol (SVM on frozen reps; K-Means on reps).
- 4 airport datasets; t-SNE visualization.
- Batch: 16 trajectories × ~500 steps ≈ 8,000 representation vectors per update.

## 7. Numerical results / baselines
- ATSCC outperforms ALL baselines in accuracy on all datasets; largest gains on Incheon arrivals (complex 4-parallel-runway configuration); departures slightly easier (straighter).
- Clustering (NMI/ARI): ATSCC best — representations are label-faithful without label supervision.
- Exact accuracy/NMI/ARI numbers are table-rendered (not text-recoverable); rankings and qualitative margins reported.

## 8. Code / data availability
Code: github.com/petchthwr/ATSCC. Data: huggingface.co/datasets/petchthwr/ATFMTraj. Both public — most reproducible paper in this lane.

## 9. Leakage & limitations
- Aircraft trajectories are smooth and waypoint-driven; football movement is adversarial and discontinuous — RDP ε needs careful tuning (too coarse merges cuts; too fine fragments).
- Manual AIP labels are airport-specific; the football analog (route concepts) is charted, not ground truth.
- 12-layer, d=768 transformer is heavy for the reported gains; no efficiency ablation vs smaller encoders.
- Exact numbers unrecoverable from HTML; binomial masking p=0.2 and ε values stated but not ablated in extracted text.

## 10. GSE overlap
GSE has no movement-primitive segmentation: routes are charted as whole labels, not segmented into stems/breaks. ATSCC's RDP segmentation gives an unsupervised primitive vocabulary — "significant points" of a WR's trajectory ARE the route breaks. NEW capability: segment-level contrastive embeddings of player movement, where same-segment states (within a stem, within a break) are positives. The causal encoder fits GSE's real-time in-game use (each frame's embedding uses only past frames). Distinct from 1862–1873: only method using geometric segmentation for positive-pair definition.

## 11. GSE implementation spec
1. Data: NFL 10Hz tracking; per-player trajectories with kinematic features (position, velocity, heading unit vector — the aircraft 9-feature analog at field scale).
2. Run iterative RDP per player-trajectory (ε tuned: start 0.5 yd) → segment IDs (stem, break, burst segments).
3. Train causal Transformer encoder with SNN loss: positives = same segment ID, negatives = different segments; binomial masking p=0.2 for robustness to missing frames.
4. Use segment embeddings for: route-break detection (unsupervised), play-concept clustering, segment-level similarity search ("find all corner routes run like this one").
5. Effort: ~2 engineer-weeks (ATSCC code is public and adaptable).

## 12. Reproducible test
Dataset: 2023–2024 NFL tracking, weeks 1–12 train, weeks 13–18 test. Tests: (a) segment-embedding clustering vs charted route concepts (NMI/ARI) vs TS2Vec baseline; (b) segment-boundary agreement with charted break points (precision/recall within 0.3 s); (c) causal-encoder incomplete-trajectory robustness (mask last 30% of frames, compare embedding drift). Run target: <72h on 1–2 GPUs.

## 13. Acceptance / rejection gate
ADOPT if: (a) ATSCC-style segment embeddings achieve NMI ≥ 0.40 against charted route concepts on held-out weeks (vs ≤ 0.30 for TS2Vec), AND (b) segment boundaries match charted break points with F1 ≥ 0.50. REJECT if (a) fails.

## 14. Improvement experiment
Beyond the paper: (1) hierarchical RDP — coarse ε for play phases (release/stem/break) + fine ε within segments (micro-adjustments), with separate contrastive losses per level, testing whether multi-scale primitives beat single-ε segmentation. (2) Cross-player segment contrast: positives = same segment type across different players (all "post breaks"), learning a position-agnostic break vocabulary. Hypothesis: cross-player segment contrast enables few-shot route classification for rarely-run concepts.
