# [0030] TrackNetV5: Residual-Driven Spatio-Temporal Refinement and Motion Direction Decoupling for Fast Object Tracking (arXiv:2512.02789v4)

**Citation:** Haonan Tang, Yanjun Chen, Lezhi Jiang, Qianfei Li, Xinyu Guo (2026). *TrackNetV5: Residual-Driven Spatio-Temporal Refinement and Motion Direction Decoupling for Fast Object Tracking*. arXiv:2512.02789v4. URL: https://arxiv.org/abs/2512.02789v4
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF; published version dated 13 Jan 2026).
**Verdict:** REJECT — tennis/badminton ball-tracking computer vision; no sports-analytics modeling, no predictive component, no NFL applicability.

## 1. Research question
How to fix TrackNet's two structural limitations — (1) V4's *directional ambiguity* from absolute frame differences discarding motion polarity, and (2) unexploited spatio-temporal consistency among MIMO heatmap outputs — with a real-time architecture for high-speed small object (ball) tracking? (Paper: Abstract, §1.)

## 2. Dataset / schema
- **TrackNetV2 Dataset (public):** tennis broadcast video, 1280×720; 17,682 frames in evaluation; train/val split 7:3. All frames resized to 512×288 for training/inference.
- **Loveall Dataset (internal, proprietary):** 1920×1080, low-angle baseline views, more occlusions; 11,313 frames in evaluation.
- Inputs: sequences of 3 consecutive RGB frames (I_{t−1}, I_t, I_{t+1}) → trajectory heatmaps.

## 3. Method / model
- **MDD module (Motion Direction Decoupling):** decomposes raw frame-difference maps D into signed polarity channels P⁺(Δ)=ReLU(Δ), P⁻(Δ)=ReLU(−Δ) (eq. 1), then maps polarity intensities through a learnable sigmoid attention A = 1/(1+exp(−k(α)(|x|−m(β)))) (eq. 2) with k(α)=5.0/(0.45|tanh(α)|+ε), m(β)=0.6·tanh(β) (eq. 3); concatenated attention maps interleaved with RGB frames into a 13-channel encoder input X_in = Concat(I_{t−1}, A_{t−1,t}, I_t, A_{t,t+1}, I_{t+1}) (eq. 4). V2 U-Net-like Encoder-Decoder backbone unchanged.
- **R-STR head (Residual-Driven Spatio-Temporal Refinement):** coarse-to-fine Transformer head on the MIMO heatmap drafts; 1×1 conv compresses decoder features to drafts, fused with MDD attention maps → Draft_MDD; TSATTHhead (patch embedding + factorized spatial/temporal self-attention à la TimeSformer + PixelShuffle decoding) estimates a residual correction Δ; final heatmap H_final = σ(Draft_MDD + Δ). Stochastic Context Masking: dropout ρ=0.1 applied to Draft_MDD *only during training* to force residual learning.
- Ground-truth supervision: Gaussian-guided *binary* masking Y(x,y)=1 if (x,y)∈ROI_r (eq. 5), r=30 (TrackNetV2) / r=40 (Loveall); loss = Weighted BCE: L = −(1/N)Σ_i[(1−p_i)² y_i log p_i + p_i²(1−y_i) log(1−p_i)] (eq. 6).
- Training: PyTorch, single NVIDIA RTX 4090, AdamW, batch size 2, lr 1e−4, 30 epochs, multi-step decay γ=0.1 at epochs 20/25. Speed tests on NVIDIA T4.

## 4. Equations & assumptions
- Polarity decomposition: P⁺(Δ)=ReLU(Δ), P⁻(Δ)=ReLU(−Δ) (eq. 1).
- Learnable attention: A=f(x;α,β)=1/(1+exp(−k(α)·(|x|−m(β)))) (eq. 2); k(α)=5.0/(0.45|tanh(α)|+ε), m(β)=0.6·tanh(β) (eq. 3).
- Input fusion: X_in = Concat(I_{t−1}, A_{t−1,t}, I_t, A_{t,t+1}, I_{t+1}) (eq. 4).
- Refinement: H_final^train = σ(Draft′_MDD + Δ^train), Δ^train = TSATTHhead(Draft′_MDD); H_final^inference = σ(Draft_MDD + Δ^inference).
- GT mask: Y(x,y)=1 iff (x,y)∈ROI_r (eq. 5). WBCE loss (eq. 6).
- **Assumptions:** (i) 3-frame temporal window sufficient for direction cues; (ii) TP criterion: predicted center within 4 px of ground truth at original resolution; (iii) residual learning converges better than reconstruction; (iv) dropout-on-draft trains robustness to occlusion.

## 5. Features / target
- **Inputs:** 3 consecutive RGB video frames (512×288) + derived polarity attention maps.
- **Target:** per-frame ball-center heatmaps; detection = TP if within 4 px tolerance. Precision/Recall/F1 computed on this criterion.

## 6. Validation design
- **Datasets:** TrackNetV2 public benchmark (7:3 split), internal Loveall dataset (generalization/domain shift test).
- **Baselines:** TrackNetV2, TrackNetV4; ablations: V2+MDD, V2+R-STR (Table 5 shows V2+R-STR alone: F1 0.9866, but 65 more FPs than final V5 → combined V5 chosen for precision/robustness trade-off).
- No cross-validation details stated; no learned hyperparameter search reported.

## 7. Numerical results / baselines
(TrackNetV2 dataset, Tables 1/4/5; quoted exactly:)
- **TrackNetV5: Acc 0.9733, Precision 0.9923, Recall 0.9797, F1 0.9859** — new SOTA; beats V4 (F1 0.9581) by 2.78% in F1.
- **FN reduction: 1,317 (V4) → 344 (V5), a 73.9% drop**, while keeping Precision at 0.9923 (vs V4's 0.9965).
- Loveall: **F1 0.9878** (V5) vs 0.9731 (V4); FN 186 vs 523.
- Ablation: V2+MDD → F1 0.9677→0.9695, FN 937→861; V2+R-STR → F1 0.9866 (slightly above final V5's 0.9859, but Precision 0.9885 vs 0.9923 and 65 more FPs — final combined architecture chosen for precision).
- **Efficiency:** 3.7% FLOPs increase over V4 (117.09 G vs 112.89 G), params 14.77 M vs 11.33 M; real-time inference **114 FPS (38.12×3)** on NVIDIA T4 vs broadcast requirement 30/60 FPS.
- All paper claims on their own splits; public dataset so independently reproducible in principle.

## 8. Code / data availability
- None stated in the paper — no code link, no checkpoint URL. TrackNetV2 dataset is public (referenced protocol from [2]). Loveall is internal/proprietary.

## 9. Leakage & limitations
- No code released; training hyperparameters minimal (no LR schedule search, seed unstated).
- Evaluation tolerance (4 px) and dataset splits follow TrackNet convention; single-run numbers, no variance reported.
- Loveall dataset proprietary — generalization claim unverifiable.
- Tennis/badminton small-ball tracking only; nothing demonstrated on player tracking or team sports with large occluding objects.
- **External validity to GSE: nil.** Pure CV infrastructure; no analytics, prediction, or odds-relevant modeling.

## 10. GSE overlap
- None. Corpus CV entries are neural rendering / camera virtualization (0024, REJECT); no ball-tracking work exists. No overlap with engine-benchmark lanes, NGS lane, or any prediction task.

## 11. GSE implementation spec
- None warranted (REJECT). If GSE ever built an in-house video-analysis pipeline (out of scope of the betting engine), TrackNetV5 would be a candidate ball-tracker to evaluate against NGS-derived ball trajectories — but no such lane exists, and NGS already provides tracked trajectories for NFL.

## 12. Reproducible test
- Not applicable (REJECT). If needed: implement MDD+R-STR on public TrackNetV2 data and check F1 ≥ 0.985 on their split with TP@4px criterion — requires reimplementation since no code is released.

## 13. Acceptance / rejection gate
- **REJECT gate (pre-registered standard):** computer-vision object tracker for tennis/badminton balls; no sports prediction, no modeling of outcomes, no NFL applicability; correctly rejected from GSE's predictive research program.

## 14. Improvement experiment
- None for GSE (REJECT). Research-internal: test whether a larger temporal window (5–7 frames) further suppresses false positives in complex backgrounds (flagged by the authors as future work).

---
*Flags: (a) Equations extracted cleanly from the PDF (LaTeX source) — low transcription risk, but verify against the paper before implementation. (b) No code or weights released. (c) Out of scope — CV infrastructure, not sports analytics.*
