# [0385] Pose2Trajectory: Using Transformers on Body Pose to Predict Tennis Player's Trajectory (arXiv:2411.04501)

**Citation:** Ali K. AlShami, Terrance Boult, Jugal Kalita (2024). *Pose2Trajectory: Using Transformers on Body Pose to Predict Tennis Player's Trajectory*. arXiv:2411.04501. URL: https://arxiv.org/abs/2411.04501
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1366 lines).
**Verdict:** REJECT — a tennis broadcast camera-automation paper (encoder-decoder Transformer predicting a player's image-plane centroid from pose + ball position). The one quantified transferable finding — pose features beat centroid-only inputs 2× at short horizons — is banked for the NGS-replacement video lane, but the paper itself solves a production-camera problem with no GSE product equivalent.

## 1. Research question
Can a broadcast close-up camera automatically track a tennis player (without a human operator) by predicting the player's future image-plane centroid trajectory from body-pose joints, past trajectory, and ball position? The paper builds Pose2Trajectory: Faster R-CNN (players) + TrackNet (ball) + ViTPose (2D joints) feeding an encoder-decoder Transformer with Time2Vec time encoding, LSTM smoothing, teacher forcing, and a causal decoder mask. Finding: joint features beat trajectory-only inputs, and adding ball position wins at long horizons (500 ms / 1 s).

## 2. Dataset / schema
Self-collected dataset from the **TennisTV YouTube channel** (Vienna Open, professional indoor hard-court tournament). Each video = one point (serve to miss). Videos converted to images at **60 fps**. Per frame: player bounding boxes (Faster R-CNN), 2D body joints (ViTPose), ball coordinates (TrackNet at 640×360). Data issues documented: (a) spectator/referee/ball-person detections filtered by class; (b) Faster R-CNN missed some player poses (COCO pre-training limit, Figure 2); (c) ball invisible for 100+ frames when hit upward out of frame — interpolated with **polynomial regression** using 10 points before and 10 after the gap. Dataset "available for research" (no URL in this extract). No train/test split details given in this extract.

## 3. Method / model
- **Pipeline (Figure 4):** (1) Faster R-CNN player detection; (2) TrackNet ball detection; (3) ViTPose 2D joints; (4) Transformer trajectory predictor.
- **Feature set:** 74 values/frame: both players' centroids + joint positions + ball position. Decoder predicts the target player's centroid (X, Y) sequence.
- **Model:** 2-layer Transformer encoder (self-attention + feed-forward, layer norm); decoder with 3 sub-layers (masked self-attention + encoder cross-attention + feed-forward); **Time2Vec** time encoding concatenated to encoder and decoder inputs (Eq. 1); **LSTM** after the Transformer for smoother camera-control outputs (Figure 5); **teacher forcing** during training; causal decoder mask; **MSE loss**, Adam (β1 = 0.9, β2 = 0.98, ε = 1e−9), dropout + weight decay, 30 epochs.
- **Four model families:** F1 = trajectory only; F2 = trajectory + joints (both players); F3 = F2 + decoder mask (occlusion handling); F4 = F3 + ball position. Example config: 30-frame encoder → 6-frame decoder; prediction horizons tested 50 ms → 1 s.

## 4. Equations & assumptions
- (1) Time2Vec: `t2v(τ)[i] = ω_i τ + φ_i if i = 0; F(ω_i τ + φ_i) if 1 ≤ i ≤ k`, F = periodic activation, ω_i, φ_i learnable.
- (2) MEDE: `MEDE = (1/T) Σ_{t=1}^{T} √((x_t − x̂_t)² + (y_t − ŷ_t)²)` — mean Euclidean distance error in pixels.

Assumptions: (a) image-plane centroid is the right prediction target (camera-following, not field coordinates); (b) a 224×224 bounding box around the predicted centroid keeps the player framed (48-px tolerance at 500 ms); (c) polynomial interpolation of missing ball positions doesn't corrupt training; (d) tennis movement patterns (open court, 2 players) — the attention patterns learned have no reason to transfer to 22-player football; (e) cameras respond within ~0.5–1 s, hence the horizon choices.

## 5. Features / target
Input features: per-frame 74-vector — 2 players' bounding-box centroids, ViTPose 2D joint coordinates, TrackNet ball (X, Y); plus Time2Vec time encoding. Target: future sequence of the target player's image-plane centroid (X, Y) at 50 ms–1 s horizons. Horizon: sub-second (camera control), not tactical forecasting.

## 6. Validation design
Metric: MEDE (pixels) vs. ground-truth centroids. Comparison is across the four model families (ablation by feature set), not against external baselines — no Kalman, no Social-LSTM, no SOTA trajectory model is benchmarked (Kalman is discussed and dismissed in §2 without being run). Train/test split not specified in this extract. Table 1 sweeps training sequence lengths (500 ms, 750 ms, 1 s) × prediction horizons (50 ms … 1 s).

## 7. Numerical results / baselines
Quoted exactly (Table 1, MEDE in pixels):

- **Model Family 1 (trajectory only), 500 ms training:** 79 / 95 / 110 / 90 / 91 / 102 / 93 px at 50/100/150/200/250/500 ms / 1 s — worst family.
- **Model Family 2 (+ joints), 500 ms training:** 36 / 50 / 47 / 71 / 84 / 91 / 109 — best at short horizons (50/100/150 ms), degrades at long.
- **Model Family 3 (+ mask), 500 ms training:** 46 / 52 / 57 / 53 / 64 / 83 / 86 — mask best at 200/250 ms (paper: "preventing information leakage during training" forces more robust representations).
- **Model Family 4 (+ ball), 500 ms training:** 58 / 46 / 60 / 66 / 77 / **48** / **67** — best at 500 ms (48) and 1 s (67). Paper: ball position "allowed the model to capture the relationship between the players' movements and the ball's position, leading to more accurate predictions, especially when the ball's position influenced the player's movement."
- Headline comparisons: joints beat trajectory-only 36 vs 79 px at 50 ms (2.2×); ball context wins long horizons 48 vs 91 px at 500 ms (F4 vs F2).

## 8. Code / data availability
Code: https://github.com/alshami52/Pose2Trajectory.git (stated on title page). Dataset: self-collected, "available for research" — no URL in this extract.

## 9. Leakage & limitations
- **No external baselines:** the only comparisons are the four internal model families; no Kalman, no Social-LSTM/Trajectron++, no published SOTA. The "impressive accuracy" claim is unanchored.
- **Train/test split unstated** in this extract — cannot rule out same-match leakage.
- **Interpolation leakage risk:** ball gaps filled with polynomial regression using 10 points *after* the gap — future information baked into inputs.
- **Pixel-space metric:** MEDE in pixels is camera-dependent and not comparable across setups; no field-coordinate or real-world error reported.
- **Tennis-only, 2-player, open-court:** attention patterns and joint-importance findings have no demonstrated transfer to 22-player contact football.
- **Camera automation, not analytics:** the product is a pan-tilt camera controller; there is no prediction-market, coaching, or fan product in GSE that needs image-plane centroid forecasting.
- **External validity to NFL:** GSE trajectory forecasting (if any) runs on NGS chip positions in field coordinates at 10 Hz — the paper's image-plane, 60 fps, pose-dependent setup doesn't plug in. The pose-beats-centroid finding would only matter if GSE had video-derived pose (see §10).

## 10. GSE overlap
Read `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Relevant: (a) **2026-09-21 existing-research-map / prior GNN sports-outcome work** — GSE's modeling runs on structured tracking (NGS), not video pose; (b) **2026-09-18 NGS replacement spec** — a future video-derived tracking lane *would* produce pose, and this paper's quantified result (joints 2.2× better than centroid-only at short horizons; ball context best at long) would inform feature design there; (c) **0383 DiffOpt** (this wave) is the pose source that could feed it. Status: **no direct overlap; one banked insight** — if the NGS-replacement video lane ever produces joint positions, include them (plus ball position) in trajectory forecasters rather than centroid-only inputs.

## 11. GSE implementation spec
No build recommended (REJECT). The banked insight for the future video-tracking lane: when forecasting player trajectories from video-derived features, use joint positions + ball position as encoder inputs (not just centroids), with a causal decoder mask — per this paper's ablations, joints dominate short-horizon accuracy and ball context dominates long-horizon. Revisit only inside the NGS-replacement lane.

## 12. Reproducible test
Not applicable — REJECT. There is no GSE product or decision that image-plane tennis-centroid forecasting would change.

## 13. Acceptance / rejection gate
**Reject** — pre-registered domain gate: the paper's product (broadcast camera automation for tennis) has no GSE counterpart, its metric (pixel MEDE) doesn't map to any GSE decision metric, and its inputs (video pose) don't exist in GSE's data stack. The pose-features insight is preserved in §10/§11 for the NGS-replacement lane without adopting the paper.

## 14. Improvement experiment
For the sports-vision community: **field-coordinate Pose2Trajectory with cross-sport transfer.** Convert the pipeline to field coordinates via court registration (removing the camera-dependent pixel metric), then test whether a model trained on tennis transfers few-shot to badminton/table tennis (same 1v1/2v2 open-court structure) vs. soccer (multi-agent) — measuring which horizon/feature (joints vs. ball) transfers where. This would turn a tennis camera trick into a real claim about pose-conditioned motion forecasting across sports. Not GSE's job.
