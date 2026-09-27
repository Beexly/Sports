# [0020] A Prior Information Informed Learning Architecture for Flying Trajectory Prediction (arXiv:2603.06863)

**Citation:** Xianda Huang, Zidong Han, Ruibo Jin, Zhenyu Wang, Wenyu Li, Xiaoyang Li, Yi Gong (2026). *A Prior Information Informed Learning Architecture for Flying Trajectory Prediction*. arXiv:2603.06863. URL: https://arxiv.org/abs/2603.06863
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2531 lines — §I–VI, all equations, tables II–VI, references, read in full).
**Verdict:** REJECT — a competent tennis landing-point CV pipeline (single industrial camera + Hough-line court-boundary priors + classify-then-regress Transformer cascade), but the domain has no transfer path to GSE: GSE does not predict ball trajectories, and every portable piece (Hough line detection, BCE/MSE two-stage training, sinusoidal positional encoding) is standard computer vision, not a GSE capability gap.

## 1. Research question
Trajectory prediction for flying objects, with emphasis on critical trajectory events (landing points) that prior data-driven methods neglect. The paper proposes a hardware-efficient framework fusing environmental priors with a Dual-Transformer-Cascaded (DTC) architecture, demonstrated on tennis-ball landing-point prediction on real outdoor courts with a single industrial camera.

## 2. Dataset / schema
Private, collected by the authors; not stated as public. Acquisition system (§III-A): Jbotsports JW-05 ball launch machine at baseline center; one Basler acA1920-155um industrial camera (5 mm wide-angle lens) on a 5-meter tripod at the court corner; 164 fps, 1280×650 px; collection only under clear, calm weather; ball impacts a target sand layer that is smoothed after each valid recording. Because of launch-machine variance, fewer than 20% of launches landed in the sand area: final curated set = **350 highly qualified trajectories from an initial pool of more than 2,000 recordings**. Preprocessing (§III-B): YOLOv10 trained on 5,000 annotated images (4:1 train/val split, 300 epochs, batch size 16; >98% recognition under the experimental lighting); the ball's initial bounce serves as ground-truth landing indicator; 25 flight frames before the bounce extracted per sample → 25 2D trajectory points + 1 landing point per sequence; coordinates saved to text files; all outputs manually verified. No schema beyond 2D pixel coordinates + landing label; no public URL.

## 3. Method / model
**PIDTC** (Prior-Information-informed Dual-Transformer-Cascaded), three sub-modules (§IV):
1. **Prior information extraction module (§IV-A):** on the grayscale trajectory image — Gaussian filtering, Canny edge detection (Sobel gradients, non-maximum suppression, dual high/low thresholds keeping strong + connected weak edges), Hough line detection to fit court-boundary line equations, merging of parallel/proximate edges, then two sideline corner points selected as the prior information B_prior.
2. **Trajectory classification module (§IV-B, Fig. 4a):** Transformer encoder–decoder. Input = Concat(T_ball, B_prior): 25 trajectory points + 2 prior points (Eq. 8). A Feature Encoding Network (FEN) splits the concatenated input back into trajectory and prior sequences to preserve temporal dynamics; each stream gets token embedding + positional encoding, independent multi-head attention, then cross-attention fusion. Outputs a binary label: landing point "in" (label 1) or "out" (label 0) of court. Trained with BCE loss (Eq. 9). Output = Concat(T_ball, Label) (Eq. 10) feeds the next module.
3. **Landing point prediction module (§IV-C, Fig. 4b):** input = 25 trajectory points + classification label; output = 2D landing coordinates. Input flattened 2D→1D via FEN (two linear layers + ReLU), split back into trajectory sequence and label, token embedding (d_model = 512), standard sinusoidal positional encoding (Eqs. 11–12), encoder MHA (Eqs. 13–16) → E; decoder does self-attention on the label (→ MH(L)), then cross-attention with Q_c from MH(L) and K_c/V_c from encoder output E (the label conditions the "prediction area", the encoder features the precise position); feedforward; final 2D coordinates from Feature Decoding Network-2 (FDN-2: two linear layers, ReLU, no normalization — vs FDN-1 with Sigmoid + normalization). Trained with MSE loss (Eq. 17).
**Training hyperparameters (Table II):** PyTorch, RTX 3080, Adam, batch 10, lr 0.0001, dataset split 4:1 train/test, checkpoint = lowest validation loss. Classification: 500 epochs, embedding 128, d_model 64, dropout 0.1, 1 encoder/decoder layer, 2 heads, FFN 256. Prediction: 1000 epochs, embedding 500, d_model 512, dropout 0.1, 1 layer, 2 heads, FFN 2048. **5.53M parameters total** (0.15M classification + 5.38M prediction).

## 4. Equations & assumptions
(1) Gaussian kernel: Kernel(x,y) = (1/(2πσ²))·exp(−(x²+y²)/(2σ²)).
(2) Normalized kernel: Kernel_n(x,y) = Kernel(x,y) / Σ_{x=0}^{1279} Σ_{y=0}^{649} Kernel(x,y).
(3) Denoised image: I_p(i,j) = Σ_{u=0}^{1279} Σ_{v=0}^{649} I_0(u,v)·Kernel_n(i−u, j−v).
(4) Sobel gradients: g_x = S_x ∗ I_p; g_y = S_y ∗ I_p (∗ = cross-correlation).
(5) Gradient magnitude: G(x,y) = √(g_x²(x,y) + g_y²(x,y)).
(6) Gradient direction: θ(x,y) = arctan(g_y(x,y)/g_x(x,y)).
(7) Hough line: P_A: b = −m_0·a + n_0 (a = slope axis, b = intercept axis of parameter space).
(8) Classification input: Input = Concat(T_ball, B_prior).
(9) BCE = −(1/N) Σ_i [q_i·log(p_i) + (1−q_i)·log(1−p_i)], q_i ∈ {0,1} out-of-bounds label, p_i prediction.
(10) Classification output: Output = Concat(T_ball, Label).
(11–12) Positional encoding: PE(pos,2i) = sin(pos/10000^{2i/d_model}); PE(pos,2i+1) = cos(pos/10000^{2i/d_model}).
(13) Q = D W_Q; K = D W_K; V = D W_V.
(14) Attention(Q,K,V) = softmax(QK^T/√d_k)·V.
(15) head_i = Attention(QW^Q_i, KW^K_i, VW^V_i).
(16) MH(D) = Concat(head_1,…,head_h)·W^0.
(17) MSE = (1/N) Σ_i (truth_i − prediction_i)².
(18–20) Accuracy = (TP+TN)/(TP+FP+TN+FN)·100%; Precision = TP/(TP+FP)·100%; Recall = TP/(TP+FN)·100%.
(21) RMSE = √(MSE). (22) Bias = (1/N) Σ_i (truth_i − prediction_i) (signed mean error).
(23) Homography: [x_img, y_img, 1]^T = H·[x_phy, y_phy, 1]^T (z_phy = 0, H estimated from 10 known court points).
(24) Physical bias: PhyBias = (1/N) Σ_i √((x_i − x̂_i)² + (y_i − ŷ_i)²).
**Assumptions stated:** landing points lie on the court surface (z_phy = 0); calm, clear weather (no wind/turbulence); balls machine-launched (no spin/racket-contact variation); the ball's initial bounce is the landing indicator; sideline corner points fully capture the usable environmental prior.

## 5. Features / target
Inputs: 25 2D ball coordinates (pre-bounce frames) + 2 prior corner points (classification stage); 25 trajectory points + binary label (prediction stage). Target: binary in/out-of-court label (classification); 2D landing-point coordinates (prediction). Prediction horizon: the final landing point of the observed trajectory segment.

## 6. Validation design
Train/test split 4:1 (280 train / 70 test), checkpoint selected by lowest validation loss (validation set construction not detailed). Metrics: classification — BCE, Accuracy, Precision, Recall; prediction — MSE, RMSE, Bias (signed, pixel), PhyBias (cm via homography). Baselines: (a) ablations over prior-information type — CMN/CMP (classification, null vs prior points), PMN/PMP/PMC (prediction, null vs prior points vs classification labels); (b) cross-model comparison — RNN [13], GRU [38], LSTM [11], vanilla Transformer [35]; (c) training-set-size sweep (20/40/60/80% of N_t = 350). No time-ordered split stated (single-session collection); baselines were not re-tuned by the authors (hyperparameters of the comparison models not stated).

## 7. Numerical results / baselines
**Classification (Table III):** CMN — Accuracy 52.86%, Precision 52.85%, Recall 100%; CMP — Accuracy 85.71%, Precision 81.40%, Recall 94.59%. (My reading: CMN's 100% recall at ~53% accuracy means it predicts nearly everything as one class — it effectively fails to converge, as the authors state.)
**Prediction ablation (Table IV):** PMN — MSE 1183.39, RMSE 34.40, Bias 23.06 px, PhyBias 29.58 cm; PMP — MSE 690.16, RMSE 26.27, Bias 18.02 px, PhyBias 23.16 cm; PMC — MSE 372.39, RMSE 19.30, Bias 13.35 px, PhyBias 17.07 cm. Paper claims PMC vs PMN reductions of **68.53% (MSE), 43.90% (RMSE), 42.11% (Bias)**; PMC beats PMP on all criteria (classification label more useful than raw prior points).
**Cross-model (Table V):** RNN — MSE 1064.99, RMSE 32.63, Bias 26.71, PhyBias 34.16; GRU — 3417.77, 58.46, 49.24, 63.98; LSTM — 866.72, 29.44, 23.96, 30.55; Transformer — 1170.42, 34.21, 22.48, 27.74; **PIDTC — 372.39, 19.30, 13.35, 17.07** (lowest on all four).
**Training-set size (Table VI):** 20%/40%/60%/80% of N_t = 350 → MSE 499.41 / 547.52 / 542.15 / 372.39; RMSE 22.35 / 23.40 / 23.28 / 19.30; Bias 15.65 / 17.10 / 16.22 / 13.35 px; PhyBias 19.98 / 21.57 / 20.65 / 17.07 cm (loss generally decreases with more data; the 40/60% blip shows noise from tiny samples).
All numbers are the paper's claims; MSE/RMSE/Bias are in pixels unless PhyBias (cm).

## 8. Code / data availability
None stated. No code link, no dataset URL (private collection).

## 9. Leakage & limitations
No formal leakage analysis. Adversarial notes: (1) **Domain mismatch is fatal for any sports-analytics transfer:** machine-launched balls, empty court, calm weather — no players, no racket contact, no spin variation, no wind; generalization to real match play is untested. (2) Tiny dataset (350 trajectories, 70 test) — the 20–80% size sweep is noisy (MSE 499→547→542→372) and error bars/confidence intervals are never reported; the claimed 68.53% MSE reduction has unknown significance. (3) The "significant outperformance" vs baselines is unfair-by-construction: RNN/GRU/LSTM/Transformer baselines receive only raw trajectory coordinates, while PIDTC gets court-boundary priors — the comparison confounds architecture with information. The fair comparison is PMP vs PMC (prior points vs classification labels), which the ablation does cover. (4) No cross-validation, no held-out court/scene — the homography H and prior extraction are fit to the same single camera setup, so deployment to a new court is unvalidated. (5) Comparison-model hyperparameters not stated — possibly under-tuned. (6) External validity to NFL: zero — this is tennis landing-point prediction; nothing about team strength, player performance, or markets.

## 10. GSE overlap
No duplication, but no overlap either — the wrong domain. GSE's tracking/computer-vision coverage is the NGS taxonomy (27 metric families inventoried 2026-09-21) plus STRAIN (2305.10262) for pass rush and the diffusion trajectory paper (2503.18589); none involve predicting ball landing points from broadcast/camera data, and GSE has no ball-trajectory-prediction lane. The per-paper map lists no trajectory-prediction method GSE would be duplicating here — this is simply not a GSE capability. The only portable pattern is classify-then-regress (coarse in/out gate feeding precise regression), which is generic ML, not a gap.

## 11. GSE implementation spec
Not applicable — REJECT. The paper's method cannot be ported to GSE's product surface (picks, props, fantasy, calibration, market microstructure). The one remotely portable idea — geometric field priors (court/sideline detection via Hough lines) fused with tracking data — would only matter if GSE built a broadcast-video ball-tracking lane, which it has not (the NGS replacement spec targets reproducing NGS metrics from public tracking/charting data, not landing-point regression). If that lane ever opened: (a) extract field boundary/court lines per frame via Hough detection; (b) train an in/out (or catch/no-catch) classifier on tracking sequences + boundary priors; (c) feed the class label into a coordinate-regression Transformer for the catch/landing point. Estimated effort if ever needed: 3–5 days (tracking data wrangling dominates).

## 12. Reproducible test
Not applicable — REJECT. (For completeness: the paper's own ablation is self-contained and replicable in principle — CMN vs CMP, PMN vs PMP vs PMC on their private 350-trajectory set — but the data is not public, so even the paper's result cannot be independently reproduced.)

## 13. Acceptance / rejection gate
REJECT — no test needed. The paper answers a question GSE does not ask (tennis ball landing-point prediction from a fixed industrial camera). Criterion met: wrong domain with no transfer path.

## 14. Improvement experiment
If GSE ever built a tracking lane: test whether the environmental-prior fusion survives real match conditions — replace machine-launched, calm-weather trajectories with real match-play tracking (racket contact, spin, wind) and check whether Hough-extracted boundary priors still reduce landing-point MSE vs a prior-free Transformer. A second experiment: swap the fixed two-corner-point prior for a learned field-boundary embedding (segmentation-based) and measure whether classification accuracy holds when the camera moves.
