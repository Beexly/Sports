# [0044] KASportsFormer: Kinematic Anatomy Enhanced Transformer for 3D Human Pose Estimation on Short Sports Scene Video (arXiv:2507.20763v1)

**Citation:** Zhuoer Yin, Calvin Yeung, Tomohiro Suzuki, Ryota Tanaka, Keisuke Fujii (2025). *KASportsFormer: Kinematic Anatomy Enhanced Transformer for 3D Human Pose Estimation on Short Sports Scene Video*. arXiv:2507.20763v1 [cs.CV]. URL: https://arxiv.org/abs/2507.20763v1. Nagoya University, 28 Jul 2025 (v1; only version as of read date).
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF v1) on 2026-09-21 (1,613 extracted lines, §§1–5). PDF math extraction is heavily garbled (subscripts, Greek letters, matrix symbols); equations below are reconstructed from numbered equations, prose, and figure captions — numbers from Tables 1–5 are unambiguous and quoted exactly.
**Verdict:** REJECT — legitimate, well-evaluated 3D pose-estimation advance (SOTA on two sports datasets with released code), but CV infrastructure with no path to game-outcome, player-performance, or betting-market predictions in GSE's current stack.

## 1. Research question
Transformer-based 3D human pose estimation (HPE) degrades in sports scenes because sports motions are faster/complex (motion blur, self-occlusion in spins, domain shift), and critical actions finish within a few frames while methods are fitted for long clips (243 frames) and suffer "rapid accuracy decline when processing short videos" (§1). The paper introduces KASportsFormer, a monocular single-person 2D→3D lifting transformer that adds an explicit kinematic-anatomy stream — bone vectors and fused limb representations — to improve 3D HPE on short (27-frame) sports clips.

## 2. Dataset / schema
- **SportsPose** (§4.1): 1.5M video frames, 7 cameras, 24 subjects, 5 activities (Throw, Soccer, Tennis, Jump, Volley). Test = subjects S2, S4, S7, S10, S16, S21, S22 (7 subjects), rest train. 2D inputs from an *un-finetuned* HRNet detector on 27-frame clips. 17-joint Human3.6M-format skeletons (pelvis at origin); horizontal-flip augmentation.
- **WorldPose**: broadcast footage from 8 games of the 2022 FIFA World Cup; "1.5K footage frames … amounting 2.5M annotated players' SMPL poses in total." Authors project 3D keypoints to 2D with the dataset's camera parameters, crop players by projected bounding boxes, apply the same HRNet (cropped resolutions lower → "more anomalies than usual"). Clips split into train/test per game, 26 clip sources for validation; 27-frame clips.
- Access: public datasets; official implementation released at https://github.com/jw0r1n/KASportsFormer (train/eval scripts for both datasets, model checkpoints, in-the-wild demo on YOLOv3 + HRNet + trained checkpoint).

## 3. Method / model
- **Pipeline (§3.1):** input X ∈ ℝ^{F×J×3} (2D coords + detection confidence; F = 27, J = 17) mapped to d-dimensional features H ∈ ℝ^{F×J×d}, simultaneously passed through anatomy extraction/fusion to tokenize bone and limb features H_bone ∈ ℝ^{F×N_b×d}, H_limb ∈ ℝ^{F×N_l×d} (N_b, N_l set equal to J in practice). All streams add positional encodings, pass through a multi-stream spatiotemporal transformer + MLP regression head estimating 3D pose sequence P̂.
- **BoneExt (§3.2):** 2D pose as graph, pelvis root v_0, joints ordered by closeness to root; adjacent nodes form (J−1) directed bones. Bone feature = horizontal component of unit bone vector, vertical component, edge length l = ‖v‖₂ (Eq. 3). Directions collected B' = [b_1 … b_{J−1}] ∈ ℝ^{(J−1)×2} (Eq. 1), lengths likewise (Eq. 4). All bones averaged into an "ultrabone" (mean length, mean direction) concatenated per frame → X_bone ∈ ℝ^{F×J×3}, linearized to H_bone ∈ ℝ^{F×J×d}.
- **LimbFus (§3.2):** instead of naive vector-summing bones (which "fails to preserve intermediate turning point geometry information … vital for accurately interpolating kinematic variations in limb movements, such as the bending of an elbow or knee"), limbs composed with dimension-wise-separated encoding. Manually defined limb types (arms, legs) plus *imaginary "hyperlimb" connections* (e.g., left shoulder → right hip, right arm → left leg) "to study the holistic kinematic motion harmony in sports actions." Each limb fused via composer L = P(B), P an MLP with hidden dim h_d (Eq. 5, reconstructed) → X_limb ∈ ℝ^{F×N_l×3}, H_limb ∈ ℝ^{F×J×d}.
- **Transformer (§3.3):** MetaFormer skeleton like MotionAGFormer: X' = TokenMixer(Norm(X)) + X (Eq. 6). **Anatomy Mixer:** MHCA cross-attention between bone/limb modalities — spatial MHCA then temporal MHCA, A = softmax(QKᵀ/√d)V (Eq. 7, reconstructed). **Joint Mixer:** S-MHSA then T-MHSA, plus GCN stream (S-GCN self-connected adjacency; T-GCN connecting highest-reaction nodes across frames via similarity). **Token Blending:** per layer i, H^i = α^i_AC ⊙ H^i_AC + α^i_AS ⊙ H^i_AS + α^i_G ⊙ H^i_G (Eq. 9), α a softmax over mixer output with learnable weight matrix, α_AC = softmax(W_C(H^i_AC)) (Eq. 10), ⊙ elementwise.
- **Loss (§3.1/3.2):** L_pos = Σ_t Σ_j ‖P̂_t − P_t‖₂ and L_vel = Σ_t Σ_j ‖ΔP̂_t − ΔP_t‖₂ (Eqs. 1–2, reconstructed), ΔP_t = P_t − P_{t−1}; overall L = L_pos + λL_vel, **λ = Not stated in paper**.
- **Training (§4.2):** PyTorch on NVIDIA A6000; 120 epochs, batch 32; AdamW lr 5e−4, weight decay 0.01, 10-epoch warmup from 5e−6, ×0.9 decay with 2-epoch patience, early stopping at 10 epochs; N = 26 layers, d = 128, h = 8 heads, GCN neighbors k = 2, LimbFus h_d = 16. **29.3M parameters.**

## 4. Equations & assumptions
- Anatomy: l = ‖v‖₂ (Eq. 3); B' ∈ ℝ^{(J−1)×2} (Eq. 1); limb composer L = P(B) (Eq. 5).
- Transformer: X' = TokenMixer(Norm(X)) + X (Eq. 6); A = softmax(QKᵀ/√d)V (Eq. 7); H^i = α^i_AC ⊙ H^i_AC + α^i_AS ⊙ H^i_AS + α^i_G ⊙ H^i_G (Eq. 9); α_AC = softmax(W_C(H^i_AC)) (Eq. 10).
- Losses: L_pos = Σ_tΣ_j‖P̂_t − P_t‖₂; L_vel = Σ_tΣ_j‖ΔP̂_t − ΔP_t‖₂; L = L_pos + λL_vel, **λ = Not stated in paper**.
- **FLAG:** math glyphs are reconstructed, not quoted verbatim — verify against the PDF before reusing.
- Assumptions (stated): monocular single-person lifting; pelvis fixed at origin (translation removed); 2D detector front-end assumed given; 27-frame clips; human skeleton topology for bone extraction.

## 5. Features / target
- **Features:** 2D joint coordinates + detection confidence per frame (F=27 × J=17 × 3); derived bone direction/length vectors; fused limb tokens (biological + hyperlimb).
- **Target:** 3D pose sequence P (17-joint Human3.6M format); training objective additionally matches frame-to-frame velocity ΔP_t.
- Not betting-relevant quantities: the target is joint positions in millimeters.

## 6. Validation design
- Datasets and subject/game-based splits as in §2; DET (estimated 2D via HRNet) and GT (ground-truth 2D) input conditions reported separately.
- Metrics: MPJPE and P-MPJPE (mm, lower better).
- Baselines: MixSTE (33.6M), MotionAGFormer-L (18.9M), D3DP (34.7M), KTPFormer (34.7M) on SportsPose; MotionAGFormer-B, D3DP, MotionBERT on WorldPose.
- Ablations (Tables 4–5): w/o bone, w/o limb, softmax-blending, and LimbFus hidden dim h_d ∈ {128, 64, 32, 16, 8}.

## 7. Numerical results / baselines
Quoted exactly as in the paper (MPJPE/P-MPJPE, mm, lower better):
- **SportsPose 27-frame (Table 1):** KASportsFormer DET **58.0 / 44.3** vs MotionAGFormer-L 59.5 / 47.1 (prior SOTA: −1.5mm MPJPE) and D3DP 60.0 / 45.1 (−0.8mm P-MPJPE); GT **30.9 / 27.9**. Others: MixSTE 65.2/49.1 (DET), KTPFormer 61.3/46.7 (DET). 29.3M params.
- **Action breakdown (Table 2), KASportsFormer vs prior best:** Throw 60.6 (−1.5), Soccer 57.0 (**+0.7, worse** — authors "attribute this phenomenon to our limited perception of limb acceleration in kicking movements"), Tennis 54.3 (−1.9), Jump 66.6 (−1.7), Volley 51.8 (−0.9); GT −0.3 to −0.7 across actions.
- **WorldPose (Table 3):** DET — KASportsFormer **34.2 / 22.0** vs MotionAGFormer-B 35.6 / 22.9 (−1.4/−0.9mm); GT — **8.5 / 6.2** vs MotionBERT 9.3 / 6.8 (second-best). **FLAG:** text says "we outperformed D3DP [33] by 0.8mm MPJPE and 0.4mm P-MPJPE" on WorldPose GT, but D3DP's GT row is 18.8/8.9 — the 0.8/0.4 gaps match MotionBERT (9.3−8.5=0.8), so "D3DP" there is very likely a typo for MotionBERT. Table numbers reported as primary.
- **Ablations (SportsPose DET MPJPE/P-MPJPE):** baseline 59.6/47.1; w/o bone 58.6/44.4; w/o limb 58.9/44.9; softmax-blending 59.0/45.0; **ours 58.0/44.3**. h_d: 128 → 59.0/45.1; 64 → 58.5/44.7; 32 → 58.7/45.3; 8 → 59.0/45.1; **16 → 58.0/44.3 (chosen)**.
- Qualitative Figure 3: better limb-junction matching on dynamic actions (soccer shooting, jumping) and hands/feet on fast actions (throwing, volleying).

## 8. Code / data availability
Code released: https://github.com/jw0r1n/KASportsFormer (train/eval scripts, checkpoints, in-the-wild demo). Datasets public (SportsPose, WorldPose). **λ (velocity-loss weight) not stated in paper** — check the repo config for exact reproduction.

## 9. Leakage & limitations
- Gains are small (1.5mm on SportsPose DET MPJPE vs prior SOTA); loses on Soccer DET (+0.7mm).
- Single-person monocular lifting only; multi-person broadcast scenes reduced to cropped single athletes; no occluder/interaction modeling.
- Requires HRNet 2D front-end; DET results bake in detector error; WorldPose crops low-resolution.
- No runtime/latency claims; 26 layers / 29.3M params heavier than MotionAGFormer-B (11.7M).
- Labels (mocap 3D joints) are legitimate — no circularity — but the output (poses, not risk) has no betting surface.
- Relation to 0041: both in the pose/injury-risk CV cluster; 0041 rejected for fatal label circularity.

## 10. GSE overlap
No overlap — no duplication. This is pure computer-vision infrastructure: reconstructs 3D skeletons from video; predicts no game outcomes, player performance, or betting-relevant quantities; needs a pose-estimation video pipeline GSE does not operate. Nothing in the existing-research map calls for pose estimation as an outcome model. Closest reusable idea: the "hyperlimb" trick — imaginary cross-body bone connections (left shoulder→right hip, arm→opposite leg) fused as kinematic features — is a general feature-engineering pattern that could port to any joint-coordinate movement data (e.g., NGS-style tracking features or 0041's MediaPipe pipeline), but GSE has no skeletal-data feed today. Classification: **not duplicate, not extension — irrelevant to the engine.**

## 11. GSE implementation spec
Not recommended — rejected. No data source (no video pose pipeline), no product surface (GSE posts picks/props/DFS, not poses). Do not build. Implementation cost if ever wanted is low (released code + checkpoints), but there is no use case to justify it.

## 12. Reproducible test
N/A (rejected). Gate closed — there is no prediction task in GSE's stack that a pose estimator could serve.

## 13. Acceptance / rejection gate
Reject unconditionally: CV infrastructure with no route to game/player/market prediction. No test window could resurrect it.

## 14. Improvement experiment
None from this paper for GSE. If a kinematic-feature lane ever opens (e.g., NGS tracking-derived limb proxies), the hyperlimb fusion pattern (imaginary cross-body connections as engineered features) would be the speculative seed to test.
