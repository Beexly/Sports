# [0066] MambaMOT: State-Space Model as Motion Predictor for Multi-Object Tracking (arXiv:2403.10826v2)

**Citation:** Hsiang-Wei Huang, Cheng-Yen Yang, Wenhao Chai, Zhongyu Jiang, Jeng-Neng Hwang (2026). *MambaMOT: State-Space Model as Motion Predictor for Multi-Object Tracking*. arXiv:2403.10826v2 (v2, 2026-03). URL: https://arxiv.org/abs/2403.10826v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 868 lines).
**Verdict:** ADAPT — validates the Mamba-for-Kalman swap at real-time speed, but it is the weaker sibling in-batch: take the MambaMOT+ O(N) trajectory-embedding tracklet merger as the marginal contribution and defer to 0063's bidirectional predictor for the motion model itself.

## 1. Research question
Can a **learned Mamba (selective SSM) motion model replace the Kalman filter** inside tracking-by-detection MOT pipelines? The Kalman filter's linear-motion assumption breaks on dancers/athletes (nonlinear motion, frequent occlusions). Two variants are proposed: (1) **MambaMOT:** Mamba block motion predictor plugged into the ByteTrack (BYTE) association pipeline, replacing Kalman; (2) **MambaMOT+:** adds a **trajectory embedding head** — reuses the same Mamba forward pass to emit a per-tracklet motion embedding, then merges fragmented tracklets via cosine similarity + hierarchical clustering, at O(N) cost instead of the O(N²) of Siamese tracklet-merging networks.

## 2. Dataset / schema
- **Datasets:** **DanceTrack** (dancers, uniform appearance + diverse motion) and **SportsMOT** (multi-sport scenes, similar appearance + diverse motion). No NFL/NGS data.
- **Detectors:** DanceTrack uses ByteTrack's YOLOX detections (fair comparison); SportsMOT trains its own YOLOX on the SportsMOT train set with the ByteTrack recipe. SportsMOT results marked * = same YOLOX detections for all methods.

## 3. Method / model
- **Task (§III-A):** given tracklet boxes over past n frames {B_{t−n},…,B_{t−1}} ∈ R^{n×[x,y,w,h]}, predict the box B_T at the next timestamp; the prediction is associated with next-frame detections via Hungarian algorithm (BYTE association from ByteTrack).
- **Motion model (§III-B/C):** a Mamba block preceded by a linear projection lifting [x,y,w,h] to a higher dimension, then a local MLP prediction head emitting Y_t = MLP_pred(y_t) (Eq. 6). Losses: **L_pred = L_giou + L_mse** (GIoU + MSE against the ground-truth next box).
- **MambaMOT+ (§III-D):**
  - *Trajectory representation:* a second MLP head f_t = MLP_emb(y_t) (Eq. 7) on the same Mamba output; trained with cosine embedding loss L_cos (Eq. 8) — minimize 1−cos(f_i,f_j) for same-tracklet pairs, maximize separation via max(0, cos(f_i,f_j)) for different-tracklet pairs. Joint loss L_total = L_pred + L_cos.
  - *Tracklet merging:* after tracking, compare per-tracklet features with cosine similarity and run **hierarchical clustering** to merge fragments. Temporal threshold **50 frames**, spatial threshold **50 pixels** to veto unreasonable merges. Operates per-tracklet forward pass — O(N) vs O(N²) Siamese.
- **Training (§IV-A):** Adam, lr 0.0001, **500 epochs, batch 32**; **2 Mamba blocks, hidden dim 64, expansion factor 2**; tracklets sampled with random lengths in (2, n) with padding to n. Training data pooled from MOT17, DanceTrack, and SportsMOT trajectories. One NVIDIA RTX 4080.
- **Inference:** **28.8 FPS** on a single GPU — real-time, vs. <10 FPS for transformer trackers like MOTR.

## 4. Equations & assumptions
- **Eqs. 1–2 (continuous SSM):** y(t) = C·h(t); h(t) = A·h(t−1) + B·x(t). (Note: Eq. 2 as printed mixes discrete/continuous notation — h(t) = A·h(t−1) + B·x(t) — flagged as the paper's own loose notation.)
- **Eqs. 3–4 (selective discretization), extracted verbatim:** Ā_t = exp(ΔA) = 1 − σ(Linear(x_t)); B̄_t = (exp(ΔA) − I)·ΔB = σ(Linear(x_t)). **UNCERTAIN** — this is the paper's own simplification of the selective parameterization (compare the standard Mamba Δ = softplus(Linear(x))); extraction is legible but the algebra as printed is the authors' shorthand, not the canonical Mamba discretization. Do not treat as a citable discretization formula. Reimplementation should follow the mamba-ssm reference, not the printed formulas.
- **Eq. 5:** y_t = C·h_t and h_t = Ā_t·h_{t−1} + B̄_t·x_t.
- **Eq. 6:** Y_t = MLP_pred(y_t).
- **Eq. 7:** f_t = MLP_emb(y_t).
- **Eq. 8 (cosine embedding loss):** L_cos(i,j) = 1 − cos(f_i, f_j) if i = j; max(0, cos(f_i,f_j)) if i ≠ j.
- **Losses:** L_pred = L_giou + L_mse; L_total = L_pred + L_cos.
- **Assumptions:** merge gates of 50 frames / 50 pixels veto unreasonable merges; fixed-size box state [x,y,w,h].

## 5. Features / target
- **Inputs:** tracklet box history over past n frames {B_{t−n},…,B_{t−1}} ∈ R^{n×[x,y,w,h]} (box center-x, center-y, width, height).
- **Targets:** (1) next-frame box B_T (box regression, GIoU + MSE loss); (2) same-tracklet vs. different-tracklet pairing for the embedding head (cosine embedding loss).
- **Prediction horizon:** one frame ahead per predict step (autoregressive association).

## 6. Validation design
- **Benchmarks:** DanceTrack test and SportsMOT test (SportsMOT with identical * detections for all methods).
- **Baselines:** Kalman-based: FairMOT, SORT, DeepSORT, ByteTrack, OC-SORT. Learning-based: CenterTrack, TraDes, QDTrack, TransTrack, MOTR, GTR, MotionTrack.
- **Metrics:** HOTA (primary), DetA, AssA, IDF1, MOTA (CLEAR).
- **Speed benchmark:** inference FPS on a single GPU (§IV-C).

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper; all are the paper's claims, not this ledger's.
- **Table I — DanceTrack test:** MambaMOT **HOTA 55.5**, DetA 80.8, AssA 38.3, IDF1 53.9, MOTA 90.1. MambaMOT+ **56.1 / 80.8 / 39.0 / 54.9 / 90.3**. Key comparisons (same detections): ByteTrack 47.3 (**+8.2 HOTA** for MambaMOT); OC-SORT 54.6 (MambaMOT +0.9); MOTR 54.2. MambaMOT+ adds +0.6 HOTA / +1.0 IDF1 over MambaMOT.
- **Table II — SportsMOT test (same * detections):** MambaMOT* **70.4 / 86.7 / 57.2 / 69.5 / 94.7**; MambaMOT+* **71.3 / 86.7 / 58.6 / 71.1 / 94.9**. ByteTrack* 62.0 (**+8.4 HOTA**), OC-SORT* 70.2, TransTrack 68.9. Claimed: outperforms ByteTrack by 8.2% HOTA and 7.3% AssA under identical association/detector.
- **Inference speed (§IV-C):** 28.8 FPS single GPU, real-time; vs. MOTR-class < 10 FPS.
- **No predictive modeling of game outcomes; no NFL data; no held-out forecasting.**

## 8. Code / data availability
- **Code:** Not stated in paper — no GitHub link given in the extracted text. (The sibling MambaTrack paper's code was not stated either; both come from the UW Hwang lab.)
- **Checkpoints/datasets:** Not stated in paper.
- **Hyperparameters fully stated** (§IV-A): Adam lr 1e-4, 500 epochs, batch 32, 2 Mamba blocks, hidden 64, expansion 2, merge thresholds 50 frames / 50 px, RTX 4080.
- **Datasets:** DanceTrack and SportsMOT are public; ByteTrack YOLOX detections referenced.

## 9. Leakage & limitations
- **Stated:** none beyond the conclusion's scope note; the paper is a straightforward methods benchmark.
- **Reviewer view (adversarial):**
  - **Superseded within the batch:** MambaTrack (0063, ACM MM 2024, ADAPT) reports SportsMOT test HOTA **72.6** vs. MambaMOT+'s 71.3 — MambaTrack's bidirectional MTP is the stronger sports-motion model from the same lab lineage. MambaMOT's marginal value is the MambaMOT+ trajectory-embedding tracklet merger.
  - **No appearance model:** pure motion-based; in NFL All-22/broadcast footage, jersey numbers give strong appearance cues that this paper doesn't exploit — GSE would want a hybrid.
  - **Short paper, thin ablations:** no ablation of the embedding head's merge thresholds, no analysis of failure under long occlusions, no FPS/latency vs. accuracy curve.
  - **Eq. 3–4 shorthand** (flagged above) means reimplementation should follow the mamba-ssm reference, not the printed formulas.
  - Training pools MOT17+DanceTrack+SportsMOT trajectories; domain shift to American football (helmets, pile-ups, broadcast camera motion) is untested.

## 10. GSE overlap
- **This batch:** 0063 MambaTrack (ADAPT) — same lab lineage (UW Hwang group; MambaMOT cites MambaTrack as [33]); MambaTrack's bi-Mamba motion predictor is strictly stronger on sports data. Treat as one lane: 0063 for prediction, 0066 for the merging head.
- **0065 UniTraj (ADOPT):** complementary — UniTraj does offline generative trajectory modeling/imputation; MambaMOT does online tracklet association. Pipeline order: detect → MambaMOT associate → UniTraj generate/impute.
- **Existing GSE stack:** Kalman/particle filters (tracking) — MambaMOT is the candidate replacement validated at real-time speed.
- Assessment: extension (trajectory-embedding merger) layered on an existing lane, not a duplicate of the motion-model work.

## 11. GSE implementation spec
- **Lane:** same tracking-upgrade lane as 0063 (MambaTrack): replace/augment Kalman motion prediction in any player-tracking pipeline built on broadcast or All-22 video (e.g., GSE's own tracking-data QA, opponent-formation extraction from video).
- **MambaMOT+'s specific add:** cheap O(N) tracklet merging via trajectory embeddings — directly useful for stitching fragmented player tracklets across broadcast camera cuts and occlusion-heavy pile-ups, where GSE's current association breaks.
- **Defer to 0063 for the motion model itself:** MambaTrack's bidirectional predictor beats MambaMOT on SportsMOT (72.6 vs 71.3 HOTA). The ADAPT here is for the *merging head* and the real-time (28.8 FPS) BYTE-pipeline drop-in pattern.
- **Build plan:**
  1. Implement Mamba motion predictor per the mamba-ssm reference (not the paper's Eq. 3–4 shorthand): input [x,y,w,h] box history → linear lift → 2 Mamba blocks (hidden 64, expansion 2) → MLP heads for box prediction and trajectory embedding.
  2. Train on GSE-labeled broadcast tracking (or SportsMOT as a warm start): Adam 1e-4, L_pred = GIoU + MSE; joint-train L_cos for the embedding head.
  3. Plug into a ByteTrack-style association loop replacing the Kalman predict step; add the post-hoc hierarchical-clustering merge (cosine on embeddings, 50-frame/50-pixel veto gates tuned to football).
  4. Benchmark IDF1/HOTA against the current Kalman baseline on a held-out game set before any production use.

## 12. Reproducible test
- **Reproduction gate:** on SportsMOT test with the paper's YOLOX detections, reach HOTA ≥ 70.0 (MambaMOT) / ≥ 70.9 (MambaMOT+).
- **GSE gate:** on GSE's own labeled NFL broadcast-tracking set, measure tracklet fragmentation rate and IDF1 vs. the Kalman baseline; **adopt the merging head if fragmentation drops ≥ 20% at equal or better IDF1**; adopt the motion predictor only if it beats the MambaTrack (0063) implementation head-to-head — otherwise keep 0063's.
- **Latency check:** confirm ≥ 25 FPS on GSE inference hardware for the motion predictor alone.

## 13. Acceptance / rejection gate
Verdict rationale: MambaMOT validates the Mamba-for-Kalman swap at real-time speed (+8.2 HOTA over ByteTrack), but within this batch it is the weaker sibling — the marginal contribution worth taking is the MambaMOT+ trajectory-embedding merger, with 0063's bidirectional predictor retained for the motion model itself.
1. **Reproduction criterion:** on SportsMOT test with the paper's YOLOX detections, recover Table II: HOTA ≥ 70.0 for MambaMOT (paper: 70.4) and ≥ 70.9 for MambaMOT+ (paper: 71.3).
2. **Comparison to run:** (a) head-to-head vs. GSE's Kalman baseline on GSE-labeled NFL broadcast tracking — metrics = tracklet fragmentation rate and IDF1; (b) head-to-head vs. the MambaTrack (0063) implementation on the same set (paper: MambaTrack 72.6 vs. MambaMOT+ 71.3 HOTA on SportsMOT); (c) motion-predictor latency on GSE inference hardware.
3. **Decision rule:** ADOPT the merging head only if tracklet fragmentation drops ≥ 20% at equal-or-better IDF1 vs. Kalman; ADOPT the motion predictor only if it beats 0063 head-to-head on HOTA; latency must clear ≥ 25 FPS (paper: 28.8). If none hold, REJECT and defer to 0063.

## 14. Improvement experiment
- Fuse the trajectory embedding with an appearance (jersey-number) embedding — the paper's motion-only design leaves GSE's strongest broadcast cue unused.
- Tune merge thresholds (50 frames/50 px) to football: camera cuts are hard discontinuities, not gradual drift; a shot-boundary-aware merge gate would cut false merges.
- Extend the predictor input from [x,y,w,h] to full NGS-style state (velocity, orientation) where available.
- Distill the 2-block Mamba predictor for edge deployment if broadcast-pipeline latency matters.
