# [0340] Biomechanical-phase based Temporal Segmentation in Sports Videos: a Demonstration on Javelin-Throw (arXiv:2509.24606v1)

**Citation:** Bikash Kumar Badatya, Vipul Baghel, Jyotirmoy Amin, Ravi Hegde (2026). *Biomechanical-phase based Temporal Segmentation in Sports Videos: a Demonstration on Javelin-Throw*. arXiv:2509.24606v1. URL: https://arxiv.org/abs/2509.24606v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 411 lines).
**Verdict:** ADAPT — the ASTGCN-denoise + structured-OT temporal segmentation pipeline is a transferable recipe for unsupervised play-phase segmentation in NFL film, but it must be rebuilt without the paper's phase-count oracle (K) and validated on NFL play segments rather than adopted as-is.

## 1. Research question
Can biomechanically meaningful phases of a sports movement (here: javelin throw — steps, drive, throw, recovery) be segmented temporally from video without frame-level labels? The paper proposes a two-stage unsupervised method: (1) an Adaptive ST-GCN denoising autoencoder that learns a latent pose representation, and (2) structured unbalanced optimal transport (OT) over latent "phase prototypes" that assigns each frame to a phase, with a pseudo-label cross-entropy loop closing the unsupervised training.

## 2. Dataset / schema
- **New javelin dataset:** 211 videos (111 men / 100 women) sourced from major competitions. Poses extracted with MMPose as 16-joint MPII skeletons. Four manually annotated phases for evaluation only: steps, drive, throw, recovery. Dataset released at https://github.com/Bikudebug/Javelin_Throw_Dataset.
- No frame counts or per-phase duration statistics stated in the paper. Train/test split sizes not stated (the paper reports test metrics; split proportions absent).

## 3. Method / model
Stage 1 — ASTGCN denoising encoder: 3 Adaptive ST-GCN blocks with Chebyshev filters of order 7 and 64-d features, followed by an MLP projecting to a 40-d latent space. Trained with Gaussian noise (σ=0.1) injected as a denoising objective: Adam, lr 1e-4 (encoder), MLP lr 1e-3, weight decay 1e-4; temporal window 30; training samples one frame from each of five temporal bins per video.
Stage 2 — Structured unbalanced OT: visual cost is cosine distance between latent embeddings; the OT objective combines (i) a fused Gromov-Wasserstein temporal-structure term, (ii) a Kantorovich appearance-cost term, and (iii) a KL relaxation toward a prior class distribution. The final frame label is the rowwise argmax of the transport plan. A pseudo-label cross-entropy loss (labels from the transport plan) closes the unsupervised loop. K (number of phases) is fixed to the known ground-truth phase count. Global Hungarian alignment across the entire dataset is used for evaluation mapping.

## 4. Equations & assumptions
- Denoising objective: \(L_{\text{total}} = L_{\text{MSE}} + \lambda_{\text{vel}} L_{\text{vel}}\), where \(L_{\text{MSE}}\) is pose reconstruction MSE and \(L_{\text{vel}}\) is a velocity-consistency loss on the latent/pose sequence (exact λ_vel value not stated in the extracted text).
- Visual cost: cosine distance between latent embeddings.
- OT objective (described qualitatively): fused Gromov-Wasserstein temporal structure + Kantorovich appearance cost + KL relaxation to a prior class distribution; final labels = rowwise argmax of the transport plan.
- Assumptions: (1) K, the number of biomechanical phases, is known in advance; (2) phases are temporally ordered and contiguous (GW temporal structure); (3) a KL prior over class proportions is approximately correct; (4) MMPose skeleton quality is sufficient — pose errors are treated as noise the denoiser can absorb.

## 5. Features / target
Input features: 16-joint MPII 2D skeleton sequences from MMPose (joint coordinates over a 30-frame window), embedded to 40-d latent vectors by the ASTGCN encoder. Target: per-frame phase label among K phases (steps / drive / throw / recovery in the javelin demo) — learned without frame labels; evaluation uses manual phase annotations.

## 6. Validation design
Unsupervised: no frame labels used in training. Test metrics reported on the javelin dataset against manual phase annotations: mAP, F1, mIoU, MoF. Baselines: TOT, TOT+TCL, CTE, ASOT. Split sizes/proportions not stated; whether splits are subject-disjoint (no athlete appearing in both train and test) not stated. Global Hungarian alignment across the entire dataset is applied at evaluation — an offline, whole-dataset operation that inflates operational realism.

## 7. Numerical results / baselines
Test results (paper's table): **Ours: 71.02 mAP, 74.61 F1, 48.01 mIoU, 64.04 MoF**. Baselines: TOT 33.32/33.70/20.21/34.90; TOT+TCL 39.30/50.03/41.32/50.87; CTE 54.82/62.74/50.58/63.42; ASOT 60.20/57.55/41.80/61.19 (same metric order). Note the mIoU (48.01) is markedly lower than F1 (74.61), indicating boundary-localization weakness even where frame-level classification is strong. No confidence intervals or significance tests stated.

## 8. Code / data availability
Dataset: https://github.com/Bikudebug/Javelin_Throw_Dataset (stated). Code link: not stated in paper (None stated for model code).

## 9. Leakage & limitations
- **K oracle:** the method requires the true number of phases as input — in a real deployment on NFL film (where the phase inventory of a play is unknown), this is a hard blocker; the paper never tests unknown-K.
- **Global Hungarian alignment** across the entire dataset at evaluation is an offline, transductive step that cannot be replicated in streaming/online use; reported numbers likely overstate per-video operational accuracy.
- Split sizes and subject-disjointness not stated — same athletes may appear in train and test, which would inflate results on a 211-video dataset.
- Pose pipeline dependency: MMPose errors on occluded/fast-motion frames propagate directly; the "denoising" claim is not ablated against pose quality.
- Only one sport, one movement, 211 videos — no quantitative test of cross-sport transfer (the claimed generality is asserted, not shown).
- mIoU of 48.01 vs F1 of 74.61 suggests the method gets frames right but boundaries wrong — problematic for timing-sensitive NFL applications (snap timing, release time).
- NFL external validity: javelin is a single-athlete, fixed-camera, closed-skill movement; NFL plays are 22-player, multi-camera, open-skill — the temporal-structure prior may not transfer.

## 10. GSE overlap
Per the existing-research map: GSE's tracking/NGS lane has the 27-family NGS taxonomy (2026-09-21 inventory), the NGS replacement spec (`docs/research/2026-09-18-ngs-replacement-spec.md`), and a deep read of STRAIN. None covers unsupervised temporal segmentation of play phases from pose sequences — this is a **new capability** (phase segmentation as a preprocessing step for play-level feature extraction). It is an extension of the tracking-data toolkit rather than a duplicate.

## 11. GSE implementation spec
- **Purpose:** unsupervised segmentation of NFL plays into biomechanical/tactical phases (e.g., presnap → dropback → throw → catch/run-after-catch; or pass-rush phases) from tracking data, to generate phase-conditioned features for the GSE engine.
- Data: NFL NGS tracking (or nflverse play data where tracking is unavailable) — 22-player (x, y, speed) sequences per play; define the phase inventory empirically rather than assuming K (address the K-oracle with a BIC/elbow model-selection step over K).
- Model: replace MMPose skeletons with NGS tracking coordinates; keep the two-stage recipe — (1) ST-GCN-style denoising encoder on the tracking graph (players as nodes), (2) structured unbalanced OT with the temporal GW term; estimate K per play type via model selection.
- Training: per play-type (pass vs run) unsupervised training; pseudo-label loop as in the paper.
- Serving: offline batch over historical seasons to produce phase labels as new features in the research corpus; online use deferred until boundary accuracy is proven.
- Estimated effort: 4–6 engineer-weeks (encoder + OT solver + K-selection + eval harness on labeled play phases).

## 12. Reproducible test
Dataset: 2024 NFL season NGS tracking (or Big Data Bowl tracking sample), pass plays only, with manually annotated phase boundaries (snap, dropback end/release, catch, tackle) on a 500-play validation set. Metric: boundary F1 at ±3-frame tolerance and phase mIoU vs. a supervised BiLSTM baseline trained on the same annotations. Window: one season, offline batch.

## 13. Acceptance / rejection gate
**Adopt** the OT-segmentation layer if, with K selected automatically (no oracle), it matches or beats the supervised BiLSTM baseline on boundary F1 (±3 frames) on the 500-play validation set AND phase mIoU ≥ 0.55. **Reject** if automatic-K selection degrades boundary F1 by >10 points relative to oracle-K, or if mIoU < 0.55 — the paper's own 48.01 mIoU suggests this bar is demanding and the method may fail it on NFL data.

## 14. Improvement experiment
Replace the fixed-K assumption with a nonparametric extension: fit the OT segmentation for K in {2..8}, select K per play type with a penalized likelihood (BIC on the transport cost), and compare phase purity against the oracle-K version. Then test whether phase-conditioned features (e.g., receiver separation at phase boundaries) add predictive signal to GSE's EPA/dropback models beyond raw tracking features — the direct NFL value proposition the paper never tests.
