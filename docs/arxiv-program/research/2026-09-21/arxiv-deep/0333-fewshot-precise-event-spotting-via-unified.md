# [0333] Few-Shot Precise Event Spotting via Unified Multi-Entity Graph and Distillation (arXiv:2511.14186v1)

**Citation:** Zhaoyu Liu, Kan Jiang, Murong Ma, Zhe Hou, Yun Lin, and Jin Song Dong (2025). *Few-Shot Precise Event Spotting via Unified Multi-Entity Graph and Distillation*. arXiv:2511.14186v1. URL: https://arxiv.org/abs/2511.14186v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 843 lines + appendix).
**Verdict:** ADAPT — port UMEG-Net's unified multi-entity graph (players + ball + field landmarks) and its graph→RGB distillation to NFL broadcast event spotting, where GSE's labeled data will be scarce; this is the few-shot answer to the FOOTPASS (0332) pipeline.

## 1. Research question
Precise event spotting (PES) — recognizing fine-grained sports events at exact moments (1–2 frame tolerance) — currently demands large, densely labeled datasets that are impractical to obtain. Can a model spot frame-accurate events in the few-shot regime by (a) representing each frame as a unified multi-entity graph integrating human skeletons, sport objects (ball), and contextual landmarks (court corners), (b) encoding it with a parameter-efficient graph network (spatial GCN + parameter-free multi-scale temporal shift), and (c) distilling that structured knowledge into an RGB-only student robust to pose-detection failures?

## 2. Dataset / schema
Five sports PES datasets; keypoint pipelines per sport (HRNet 2D poses; YOLOv8 fine-tuned on Roboflow datasets for balls/players; court-corner detectors; TrackNetV3 for shuttlecock):
- **F3 Set-Tennis** (Liu et al. 2025c): 11,584 clips from 114 professional tennis matches, 1–34 shots per clip, exact racket–ball contact frames; 8 sub-classes (near/far, deuce/ad/middle, forehand/backhand, serve/return/stroke, placement, stroke type, approach, outcome) × 1,108 event types; ~42,829 events.
- **ShuttleSet** (Wang et al. 2023b): 104 sets, 3,685 rallies (clips), 36,492 strokes / 24,072 annotated events across 44 matches (2018–2021), 27 top players, 36 stroke categories, avg 10.9 s and 10.5 shots per rally.
- **FineGym-BB** (Shao et al. 2020): 1,112 balance-beam routines from 142 matches, 27,632 events (start/end of 5 skill types), avg 92 s and 24.8 events per clip.
- **Figure Skating** (Hong et al. 2021): 11 videos, 371 short programs, 3,670 events — take-off/landing frames of 10 jump/spin classes (20 event types).
- **SoccerNet-BAS** (Cioppa et al. 2024): 7 full broadcast videos segmented to ball-action clips, 12,357 events in 12 classes (Pass 4,955; Drive 4,274; Head 707; High Pass 756; Out 550; Cross 260; Throw In 359; Shot 168; Ball Player Block 222; Player Successful Tackle 74; Free Kick 19; Goal 13).

## 3. Method / model
1. **Unified multi-entity graph** per frame: `Gt = (Vt, Et)`; nodes `Vt = {Vpt, Vbt, Vct}` (N persons × K joints, ball keypoints, court-corner keypoints), `|Vt| = N·K + |Vbt| + |Vct|`. Edges: `Et = Et^intra ∪ Et^{p–b} ∪ Et^{p–c} ∪ Et^{c–c}` — intra = standard skeletal topology; court corners connected as a rectangle; player joints → ball (wrist joints for racket sports; ankle+shoulder for soccer approximating lower/upper-body control); foot joints → court corners (positional context). All undirected.
2. **UMEG-Net encoder**: stacked UMEG Blocks = spatial GCN (unit GCN from Zhou et al. 2024) + **parameter-free temporal multi-scale shift** replacing temporal convolutions. Channels split into static/forward/backward parts with fraction α=1/8; bidirectional shift at offsets Δ ∈ {1,2,4} frames with zero-padding at boundaries; each shifted stream passes through the spatial GCN; multi-scale outputs fused via linear projections F1 (downscale to ⌊d/|Δ|⌋), concatenation, ReLU, residual add, and F2 (upscale to d). Preserves frame-level resolution, no extra parameters, expands temporal receptive field.
3. **Multimodal distillation**: frozen graph-teacher encoder ε_tch maps graph sequence → per-frame embeddings Ftch ∈ R^{T×d}; RGB student ε_stu (VideoMAEv2 transformer + bidirectional GRU) maps video → Fstu ∈ R^{T×d}; feature-matching loss `Lfeat = (1/T) Σ_t ‖Ftch^(t) − Fstu^(t)‖²₂` minimized on **all unlabeled clips**; then encoder frozen, event localizer + classifier (linear layers) fine-tuned on the labeled k-clip set. At inference the student alone does PES from RGB.
4. **Training details**: 96-frame sequences, stride 2, RGB 224×224, foreground class loss weight ×5 (event frames <3% of data), AdamW (lr 0.001 UMEG-Net / 0.0001 distillation), cosine annealing with 3 linear warm-up steps, RTX 4090, 50 epochs (30 for ShuttleSet); distillation stage 50 epochs then 10-epoch head fine-tune at lr 0.001. VideoMAEv2 backbone pretrained on Kinetics-710, slice length set to 2 frames for frame-level granularity.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- Graph: `Et = Et^intra ∪ Et^{p–b} ∪ Et^{p–c} ∪ Et^{c–c}`; `Vt = {Vpt, Vbt, Vct}`, `Vpt = {Pit | i=1..N}`, `Pit = (ji,1^t, ..., ji,K^t)`; `|Vt| = N∗K + |Vbt| + |Vct|`.
- (1) `H^(ℓ+1) = ReLU(A^(ℓ) H^(ℓ) W^(ℓ))`.
- (2) `Ht^(ℓ) = [Ht,static^(ℓ) ∥ Ht,fwd^(ℓ) ∥ Ht,bwd^(ℓ)]`, with `Ht,static ∈ R^{|V|×(1−2α)d}`, `Ht,fwd, Ht,bwd ∈ R^{|V|×αd}`, α=1/8.
- (3) `H̃t^(ℓ,Δ) = [Ht,static^(ℓ) ∥ Ht−Δ,fwd^(ℓ) ∥ Ht+Δ,bwd^(ℓ)]`, Δ ∈ {1,2,4}, zero padding at boundaries.
- (4) `Zt^(ℓ,Δ) = ReLU(A^(ℓ) H̃t^(ℓ,Δ) W^(ℓ))`, Δ ∈ {1,2,4}.
- (5) `Ut^(ℓ) = concat_{Δ∈{1,2,4}} F1(Zt^(ℓ,Δ))`; (6) `Ht^(ℓ+1) = F2(ReLU(Ut^(ℓ)) + Ht^(ℓ))`.
- (7) `Lfeat = (1/T) Σ_{t=1}^{T} ‖Ftch^(t) − Fstu^(t)‖²₂`.
Stated assumptions: (i) k-clip few-shot framing (k ∈ {15,25,50,100} labeled clips; 5 random splits averaged) — argued more practical than k-shot because events are 1–2 frames, rapidly successive, and strongly dependent; (ii) strict tolerance δ=1 frame (δ=1 second for SoccerNet-BAS per prior work); (iii) teacher frozen during distillation; (iv) event frames <3% justifies 5× foreground loss weighting; (v) entity edge rules (wrist↔ball for racket sports, ankle/shoulder↔ball for soccer) are heuristics from code; (vi) graph construction quality bounded by off-the-shelf detectors.

## 5. Features / target
Inputs: RGB video frames → keypoints (2D human poses, ball positions, court corners). Target: sequence of (event type, timestamp) pairs — M event-timestamp pairs per clip, C classes. Evaluation: mean F1 (F1evt) at δ=1 frame (δ=1 s for SoccerNet-BAS) + Edit score (Levenshtein-based structural similarity of predicted vs. ground-truth event sequences).

## 6. Validation design
Few-shot k-clip protocol: k ∈ {15, 25, 50, 100} labeled clips, 5 random splits per dataset, averaged. Baselines: RGB SOTA PES methods (E2E-Spot 200MF/800MF, T-DEED 200MF/800MF, F3 ED) + skeleton-based PES variants built by the authors (MSG3D, AAGCN, CTRGCN, STGCN++, ProtoGCN, BlockGCN with F3 ED heads, per-frame features averaged over persons). Also a contrastive self-supervision alternative to distillation, and a full-supervision comparison (E2E-Spot vs. UMEG-Net on all labeled data). Ablations: entity configurations (pose only / +court / +ball / +all) and temporal shift scales ({1} / {1,2} / {1,2,4}).

## 7. Numerical results / baselines
100-clip few-shot results (Table 1; F1evt / Edit; params):
- UMEG-Net (2.2M params, fewest of all): F3 Tennis 9.4/31.7; ShuttleSet 49.2/64.0; FineGym-BB 49.2/54.4; Figure Skating 39.2/49.6; SoccerNet-BAS 27.0/44.8 — best in all 10 cells.
- UMEG-Net distill (67.8M): 12.5/40.7; 59.1/69.0; 58.4/61.2; 45.9/56.2; 27.1/50.8 — average +5.8% F1evt / +6.7% Edit over the teacher.
- Gains over best baselines: F1evt +1.3% to +5.5%, Edit +1.3% to +16.4% across the five datasets. Vs. best skeleton variant BlockGCN on F3 Tennis: +2.5% F1evt, +13.4% Edit. Best RGB baseline F3 ED on F3 Tennis: only 3.9/15.3 — few-shot collapses RGB-only methods.
- Ablations (d): pose×N alone → +ball → +court → all: F3 Tennis F1evt 5.6 → 8.6 (ball) → 6.6 (court) → **9.4 (all)**; Edit 23.9 → 30.2 → 26.1 → 31.7. Ball is the highest-value entity; all entities together best.
- Temporal scales (e): Δ∈{1}: 8.8/30.4; Δ∈{1,2}: 9.6/33.2; Δ∈{1,2,4}: 9.4/31.7 (F3 Tennis) — multi-scale helps, larger scales not monotonic; on ShuttleSet {1,2,4} clearly best (49.2/64.0 vs 46.5/61.2).
- Distillation vs. contrastive self-supervision (f): distill wins decisively (e.g., FineGym-BB 58.4/61.2 vs 54.5/56.8; FigSkating 45.9/56.2 vs 34.6/41.3).
- Full supervision (g): UMEG-Net competitive with E2E-Spot — better on 3/5 datasets (F3 Tennis 47.5/71.2 vs 44.6/71.1; ShuttleSet 71.4/76.1 vs 71.2/76.1; FigSkating 61.8/71.8 vs 58.0/63.9); worse on FineGym-BB (59.8/64.8 vs 72.9/73.0) and SoccerNet-BAS (36.1/55.7 vs 46.2/72.9). Not a few-shot-only model.
- Trends across k (Figure 3): UMEG-Net leads at all supervision levels (15/25/50/100 clips).

## 8. Code / data availability
Code: https://github.com/LZYAndy/UMEG-Net. Datasets: F3 Set (arXiv:2504.08222), ShuttleSet (KDD 2023), FineGym, Figure Skating, SoccerNet-BAS — all public.

## 9. Leakage & limitations
- **Detector dependence**: graph quality hinges on off-the-shelf pose/ball/court detectors; the distillation stage is explicitly motivated by detector failure under motion blur/occlusion — on NFL broadcast footage (fast cuts, low-res all-22), keypoint quality will be worse than the paper's curated clips.
- **Entity-rule heuristics**: wrist↔ball / ankle+shoulder↔ball edges are sport-specific hand rules; an NFL port needs its own entity grammar (hand↔ball for catches, body↔yard-line landmarks).
- **Weak events**: authors' own future work notes events with weak/non-entity cues (e.g., off-ball fouls) are unhandled — relevant for NFL penalties.
- **Full-supervision gaps**: loses to E2E-Spot on FineGym-BB and SoccerNet-BAS — the graph prior isn't universally dominant.
- **NFL transfer**: no football data; 22-player scenes far denser than the 1–2 athlete datasets where gains are largest (soccer BAS gains were the smallest: 27.0 vs 22.7 F1evt).
- **Compute**: distillation requires "large amounts of unlabeled videos" — fine for GSE's broadcast archive, but the 67.8M student is heavier than the 2.2M teacher.

## 10. GSE overlap
Extension of the video lane, and directly linked to ledger 0332 (FOOTPASS). Per the existing-research map: GSE's video work is the Recordly render engine + x-poster skill + real-footage rule — **no event-spotting models exist in the repo**. The 58-paper set has no few-shot PES work. Notable: the same author group published "Strategy Analysis in NFL Using Probabilistic Reasoning" (Liu et al. 2024b, cited in this paper's references) — the graph/tactical approach already has an NFL foothold in their research line. This is **new capability**: few-shot event spotting is exactly the annotation-economics answer GSE needs (Garrett can't label thousands of NFL plays).

## 11. GSE implementation spec
1. **Define the NFL entity grammar**: nodes = 22 player skeletons (pose via off-the-shelf estimator on broadcast/all-22) + ball keypoint + field landmarks (yard lines, hash marks, sidelines, end-zone corners as "court corners"). Edges: skeletal intra; hands↔ball; feet↔yard-line landmarks; ball↔nearest players.
2. **k-clip training set**: label ~100 broadcast clips (5–10 s each) for 6–8 NFL event classes (snap, handoff, pass release, catch, tackle, touchdown, turnover, penalty flag) — a one-time annotation sprint, feasible for a single annotator in days, not months.
3. **Model**: port UMEG-Net (2.2M params — trains on a single GPU) with the multi-scale shift Δ∈{1,2,4}; distill to a VideoMAEv2 RGB student on GSE's unlabeled broadcast archive so inference needs no pose pipeline.
4. **Integration**: stage-1 spotter in the 0332 two-stage pipeline — UMEG-Net replaces the generic detector, nflverse play-by-play remains the denoising prior.
5. **Effort**: 4–6 weeks (entity grammar + 100-clip labeling + port + distillation).

## 12. Reproducible test
Dataset: 100 labeled NFL broadcast clips (k-clip=100) for the 8 event classes + a held-out set of 3 full games with nflverse-aligned labels. Metric: F1evt at δ=2 frames and Edit score on held-out games. Baseline: E2E-Spot trained on the same 100 clips (the paper's own few-shot-collapsing baseline).

## 13. Acceptance / rejection gate
**Adopt** the UMEG-Net spotter as GSE's broadcast event-spotter only if, on held-out NFL games, it beats E2E-Spot trained on the same 100 clips by ≥3 percentage points F1evt AND achieves Edit score ≥50 (the paper's distilled model cleared 50+ on 4/5 datasets at 100 clips). **Reject** if gains vanish on 22-player NFL scenes (the paper's smallest gains were on the densest dataset, SoccerNet-BAS) or if broadcast pose quality makes the graph stage unusable — fall back to the detector+prior design of 0332 without the graph.

## 14. Improvement experiment
Go beyond the paper's fixed entity grammar: learn the NFL edge structure instead of hand-specifying it — initialize with the paper's edge types plus a learnable attention over candidate edges (hands↔ball, any-player↔ball, player↔yard-line), and let edge weights be supervised by the event labels. Then ablate: if learned edges concentrate on (QB hands↔ball at release, receiver hands↔ball at catch), the grammar is validated and can be frozen into a still-smaller model; if they don't, the hand rules were wrong for football and the learned version ships. Either outcome is publishable and directly improves the spotter.
