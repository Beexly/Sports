# [0063] MambaTrack: A Simple Baseline for Multiple Object Tracking with State Space Model (arXiv:2408.09178v1)

**Citation:** Changcheng Xiao, Qiong Cao, Zhigang Luo, Long Lan (2024). *MambaTrack: A Simple Baseline for Multiple Object Tracking with State Space Model*. In Proc. 32nd ACM Intl. Conf. on Multimedia (MM '24). arXiv:2408.09178v1. URL: https://arxiv.org/abs/2408.09178v1. DOI: 10.1145/3664647.3680944
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 1443 lines).
**Verdict:** ADAPT — bi-Mamba trajectory predictor beats the Kalman filter by 9 HOTA points on sports footage; directly testable on NFL Next Gen Stats tracking data.

## 1. Research question
Can a learned state-space motion predictor (Mamba) replace the Kalman filter as the motion model inside online tracking-by-detection multi-object tracking, specifically for nonlinear, heavily-occluded sports motion (dancers, athletes) where Kalman filters and appearance cues fail? And can the same predictor be run autoregressively to "patch" lost tracklets (occluded athletes) and reestablish their identities?

## 2. Dataset / schema
- **DanceTrack** (Sun et al. 2022): 40 train / 25 val / 35 test videos; uniform-appearance dancers with complex, varied motion. Easy to detect, hard to associate.
- **SportsMOT** (Cui et al. 2023, ICCV): sports scenarios — **basketball, football, volleyball** — 45 train / 45 val / **150 test** sequences from high-level sports events. Fast, diverse athlete motion.
- Detector: YOLOX pretrained weights supplied by the benchmarks (fair-comparison protocol). Access: public benchmarks.
- Note: reference [19] of this paper is **MambaMOT (arXiv:2403.10826)** — batch sibling ledger 0066.

## 3. Method / model
1. **MTP (Mamba Motion Predictor):** input = historical bounding-box dynamics. Temporal tokenization layer builds O_in = [o_{t−q}, …, o_{t−1}] ∈ ℝ^{q×4}, where o = [δcx, δcy, δw, δh] (normalized changes of bbox center, width, height between consecutive frames), q = 10 lookback window; single linear layer → tokens X ∈ ℝ^{q×d_model}, d_model = 512 (eq. 4–5).
2. **Bi-Mamba encoding layer:** L = 3 bi-Mamba blocks; each block has forward + backward Mamba modules (input-dependent selective SSM: B̄, C̄, Δ are dynamic) to fix Mamba's unidirectional limitation; residual: Ŷ = X̂_fwd + X̂_bwd; X = Ŷ + LN(MLP(Ŷ)) (eq. 6).
3. **Prediction head:** average pooling over tokens → two fully-connected layers predicting inter-frame offsets Ô; trained with smooth L1 loss (eq. 7).
4. **TPM (Tracklet Patching Module):** for lost tracklets, autoregressively compensate missing observations: p̂_{t+1} = MTP(T, p̂_t) (eq. 8), feeding its own predictions forward frame by frame; patched boxes P̂ get a second IoU+Hungarian matching pass against leftover detections. Active tracklets matched first (their boxes are more reliable).
5. **Inference (Algorithm 1):** (i) predict active-tracklet boxes B̂ = MTP(T_active); IoU cost matrix C, Hungarian assignment; (ii) second pass for T_lost with patched P̂; (iii) init new tracklets from unmatched detections with confidence > τ_h = 0.6; (iv) terminate tracks with no update for terminate = 30 consecutive frames.
- Training: Adam (β1 = 0.9, β2 = 0.98, ε = 1e−8), batch 64, LR schedule (eq. 9): lr = d_model^{−0.5} · min(step^{−0.5}, step · warmup^{−1.5}), warmup = 4000; samples built in sliding-window fashion from the (q+2)-th frame of each video.
- Inference cost (RTX 4060 laptop, DanceTrack val): 67 ms/frame (17 FPS); tracking component 11.37 ms (19%), detection 48.41 ms (81%).

## 4. Equations & assumptions
- (1) ḣ(t) = A h(t) + B x(t); y(t) = C h(t) + D x(t) — continuous SSM (standard; PDF symbol extraction garbled, form verified from prose).
- (2) h_t = Ā h_{t−1} + B̄ x_t; y_t = C̄ h_t + D̄ x_t — discretized SSM.
- (3) Ā = (I − Δ/2·A)^{−1}(I + Δ/2·A); B̄ = (I − Δ/2·A)^{−1}ΔB; C̄ = C — **flag:** paper calls this ZOH discretization, but this is the bilinear/Tustin transform form; true ZOH is Ā = exp(ΔA). Math mislabeled in paper — treat (3) as uncertain.
- (4) O_in = [o_{t−q}, …, o_{t−1}] ∈ ℝ^{q×4}, o = [δcx, δcy, δw, δh].
- (5) X = Embedding(O_in).
- (6) X̂_fwd = Mamba(X_{ℓ−1}); X̂_bwd = Mamba(X_{ℓ−1}); Ŷ = X̂_fwd + X̂_bwd; X_ℓ = Ŷ + LN(MLP(Ŷ)).
- (7) L_smooth1(Ô, O*) = (1/4) Σ_{o∈{δcx,δcy,δw,δh}} smooth1(ô − o).
- (8) p̂_{t+1} = MTP(T, p̂_t) — autoregressive tracklet patching.
- (9) lr = d_model^{−0.5} · min(step^{−0.5}, step · warmup^{−1.5}), warmup = 4000.
**Assumptions:** motion is predictable from bbox-history alone (no appearance); IoU + Hungarian is sufficient for association; lost tracklets' true motion follows the learned predictor; 30-frame termination and 0.6 init threshold generalize.

## 5. Features / target
- Inputs: historical bbox delta sequences (4-dim per frame, 10-frame lookback).
- Target: next-frame bbox offset Ô (regression); association via IoU similarity between predicted and detected boxes. Horizon: 1 frame ahead (autoregressively extended for lost tracklets).

## 6. Validation design
- Train/val/test video splits from official benchmarks (DanceTrack, SportsMOT); model trained on DanceTrack train for ablations, evaluated on official test sets.
- Baselines: DeepSORT, MOTR, FairMOT, TransTrack, TraDes, QDTrack, CenterTrack, SORT, ByteTrack, OC-SORT, GTR, MixSort-Byte, MixSort-OC.
- Metrics: HOTA (primary), IDF1, AssA, MOTA, DetA, plus FP/FN/IDs. Detection quality held fixed (shared YOLOX weights) so MOTA/MOTA differences reflect association.

## 7. Numerical results / baselines
- **DanceTrack test** (Table 1): Ours — HOTA **56.8**, IDF1 **57.8**, AssA 39.8, MOTA 90.1, DetA 80.1. vs OC-SORT: 54.6/54.6/40.2/89.6/80.4 → **+2.2 HOTA**, +3.2 IDF1 ("highest IDF1 score of 57.8, surpassing the second-best method by 3.2 percentage points"). vs SORT: 47.9 HOTA.
- **SportsMOT test** (Table 2): Ours — HOTA **72.6**, IDF1 72.8, AssA 60.3, MOTA 95.3, DetA 87.6. vs OC-SORT: 71.9/72.2/59.8/94.5/86.4. vs ByteTrack: 62.8/69.8/51.2/94.1/77.1 → **+9.8 HOTA, +3.0 IDF1, +9.1 AssA** ("lead over ByteTrack, which utilizes Kalman Filter, by nearly 10 percentage points in the HOTA metric").
- **Ablations (DanceTrack val, Table 3):** baseline (KF) HOTA 45.9 → +MTP 54.9 (+9.0), IDF1 50.9→54.5 (+3.6), AssA 30.7→38.5 (+7.8); +TPM → 55.1/56.1/39.2 (+1.6 IDF1, +0.7 AssA on consistency metrics).
- **Motion-model shootout (Table 4):** None(IoU) 44.7 → KF 45.9 → LSTM 51.3 → Transformer 52.5 → **MTP 54.9** HOTA.
- **MTP plugged into other trackers (Table 5):** SORT +9.0, ByteTrack +6.8, MixSort +5.7 HOTA.
- **Bi-Mamba vs vanilla Mamba (Table 6):** 54.9 vs 52.4 HOTA (+2.5); 3 blocks optimal (Table 7).

## 8. Code / data availability
None stated in paper (no GitHub URL found in the PDF text). Benchmarks are public (DanceTrack, SportsMOT).

## 9. Leakage & limitations
- Benchmark video splits are standard; no stated leakage. However: DanceTrack/SportsMOT are broadcast-view tracking, not NFL all-22/NGS top-down tracking — domain gap.
- Inference is on a 4060 laptop; fine for offline analysis, not necessarily real-time on GSE hardware.
- TPM autoregression can drift: patched boxes compound predictor error (30-frame termination is the only guard).
- Eq. (3) mislabels bilinear as ZOH — sloppy but inconsequential to results.
- NFL applicability: NGS tracking gives (x, y) player positions at 10 Hz — the analog of bbox histories; but football has 22 interacting agents with role structure, not independent objects. Still, single-agent trajectory prediction is exactly what MTP does.

## 10. GSE overlap
- NGS/tracking lane: Garrett's corpus has STRAIN (2305.10262, tracking-data pass-rush metric) and the 27-family NGS taxonomy (2026-09-21) — both use tracking data descriptively. MTP is the first **generative** trajectory model in Garrett's intake: predicting where each player will be next, rather than summarizing where they were.
- No existing paper in the corpus does learned player-trajectory prediction (diffusion trajectory modeling 2503.18589 is covered in the 58-paper dossiers — consult that dossier before adopting; it may subsume this). Batch sibling MambaMOT (0066) is the same idea's twin — compare the two before building.
- State-space/dynamics lane (Kalman, AR(1) team strength) — MTP is a direct learned replacement for Kalman-style motion in tracking contexts.

## 11. GSE implementation spec
- Data: NFL Next Gen Stats tracking (Big Data Bowl-style CSVs): per-play, per-frame (x, y, speed, accel, dir) for all 22 players; replicate O_in with [δx, δy, δspeed, δdir] over 10-frame (1 s) lookback.
- Model: MTP as specified — embedding dim 512, 3 bi-Mamba blocks, smooth-L1 on 1-frame-ahead deltas; per-role (QB/RB/WR/DB) MTP heads or a shared model with role embeddings (novel extension).
- Training: Adam with eq. (9) schedule; warmup 4000; sliding-window samples from frame 12 of each play.
- Serving: offline batch over NGS weeks; inference 11 ms/frame on 4060-class GPU — trivially cheap for GSE.
- Effort: ~2–3 weeks for one engineer (data plumbing + Mamba blocks via mamba-ssm) if the diffusion-trajectory dossier doesn't already cover it.
- Applications: route-extrapolation for receiver separation-at-catch forecasts, QB pressure-arrival prediction (complement to STRAIN), play-outcome simulation from partial trajectories.

## 12. Reproducible test
- Dataset: 2023–2024 NGS tracking (public Big Data Bowl sample or Garrett's NGS files); predict (x, y) 10 frames (1 s) ahead for all ball-carrier/receiver trajectories in 2024 regular-season games.
- Metric: mean displacement error (MDE) vs a Kalman-filter baseline and a constant-velocity baseline on a held-out 4-week window.
- Gate: adopt only if MTP beats Kalman by ≥15% MDE (paper's own margin on sports data was far larger).

## 13. Acceptance / rejection gate
ADAPT if MTP (or its per-role variant) beats the Kalman baseline by ≥15% mean displacement error on held-out NFL tracking frames AND inference stays <50 ms/frame on GSE hardware; otherwise REJECT (Kalman remains the cheaper choice). Cross-check against the 2503.18589 diffusion-trajectory dossier first — if the dossier already covers learned trajectory prediction with comparable results, de-duplicate rather than re-implement.

## 14. Improvement experiment
**Per-role hierarchical MTP:** train a shared bi-Mamba encoder with role-specific (QB/RB/WR/TE/DB/LB) prediction heads, plus an interaction term — football trajectories are co-determined by assignments (a WR's route depends on coverage). Compare per-role vs single-model MDE; hypothesis: per-role cuts error another 10–20% and yields role-aware trajectory embeddings usable as features for the EPA/play-prediction stack. Second experiment: feed MTP's predicted 1-s-ahead positions into the existing pressure/STRAIN calculations to see if *anticipated* pressure predicts sacks better than *realized* pressure.
