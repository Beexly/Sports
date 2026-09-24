# [0350] Silent Impact: Tracking Tennis Shots from the Passive Arm (arXiv:2507.23215v1)

**Citation:** Junyong Park, Saelyne Yang, Sungho Jo (2024). *Silent Impact: Tracking Tennis Shots from the Passive Arm*. Proc. UIST 2024. arXiv:2507.23215v1. URL: https://arxiv.org/abs/2507.23215
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1245 lines).
**Verdict:** REJECT — tennis recreational-wearable shot tracking from a non-dominant wrist has no transfer path to NFL prediction or analytics; the GSE overlap is nil and the transferable idea (frequency-band attention on IMU signals) belongs to wearable products GSE doesn't build.

## 1. Research question
Can tennis shots be detected and classified from IMU data on the *passive* (non-dominant) arm — where there is no impact jerk to key on — at accuracy comparable to dominant-arm sensing, so users can use the smartwatch they already wear instead of a dedicated sensor on the racket hand? The paper builds an end-to-end prototype (smartwatch → cloud server → phone app shot timeline) and validates it with a user study (N=10) showing reduced mental/physical burden vs dominant-arm wear.

## 2. Dataset / schema
- **Source:** 20 recreational tennis players (min 6 months experience; diverse age/gender/skill), tennis clubs at KAIST; preliminary survey of 40 players; user study of 10 participants.
- **Sensors:** Xsens DOT IMUs on both wrists, synchronized, 120 Hz, 3-axis linear acceleration (m/s²) + 3-axis angular velocity (deg/s); left-handed participants' Y-axis accel and X/Z gyro inverted by ×(−1).
- **Shot classification dataset:** 6,000 shot sequences (= 50 × 6 shots × 20 participants); 6 classes: serve, smash, forehand stroke, backhand stroke, forehand volley, backhand volley (ball-feeding setup, one-hand/two-hand backhands merged; serves from a box of balls). Windows: 1.5 s (180 frames) = 1.0 s before impact + 0.5 s after; impact time labeled via dominant-arm acceleration jerk threshold + video verification.
- **Shot detection dataset:** 368 minutes of rallies/casual matches from 10 participants, 2,259 shots; frame-wise labels (1 = inside a shot window, 0 = otherwise). Incidental racket actions (picking up balls, stopping balls) included as non-shot frames.
- **Access:** "The models and dataset collected in this work are available at https://github.com/jyp0802/Silent-Impact."

## 3. Method / model
- **Shot classification:** 1D-convolutional backbone (inspired by Ganser et al. 2021 FCN): three 1D conv blocks (kernel 11, channels 128 → 256 → 128), each with batch norm + Mish activation; global average pooling; fully connected + softmax. Modification for the passive arm: Fourier transform decomposes the input into three frequency bands (low 0–4 Hz = whole-body motion; medium 5–20 Hz = upper-body/arm swing; high >20 Hz = impact vibration; bands chosen per Ji & Pachi 2005; Khusainov et al. 2013). First conv block partitioned into four reduced-channel blocks; each frequency band passes through an **Attention Block** (1D conv kernel 11 + sigmoid → temporal attention vector of channel size 1), multiplied into corresponding conv outputs. Each attention feature also goes through an **Attention Classifier block** (conv re-expand to 16 channels + ReLU + FC + softmax) producing auxiliary class predictions. Cross-entropy loss on all outputs.
- **Shot detection:** MS-TCN (Farha & Gall 2019) action-segmentation model: 3 stages × 4 layers, hidden dim 64; frame-wise binary classification (shot vs non-shot); cross-entropy with 5:1 class weighting (shot frames scarce). Trained 500 epochs, batch 1, LR 1e-3, Adam. Post-processing refinement: ≥k consecutive "true" frames → 180-frame window centered at midpoint; overlapping windows merged at mean of centers (F1 gain from refinement only ~0.2%).
- **Classification training:** 100 epochs, batch 64, LR 1e-4, Adam; inputs normalized to [0,1] with separate scalers for accel/gyro; trained on NVIDIA RTX 3090 (PyTorch).
- **Prototype:** Samsung Galaxy Watch 4 (accelerometer + gyroscope at max 100 Hz, up-sampled to 120 Hz via linear interpolation, axes aligned to Xsens DOT), data streamed to Amazon S3 in real time; server-side detection + classification; results displayed on a phone app (shot timeline + per-type counts).

## 4. Equations & assumptions
No equations stated. Loss functions named but not written out: cross-entropy for classification outputs (including auxiliary attention-classifier outputs), class-weighted (5:1) cross-entropy for detection. **Assumptions:** impact instant recoverable from dominant-arm jerk during data labeling (labels themselves depend on the dominant arm); left/right-handed alignment via axis sign flips is sufficient; 1.5 s window (1 s pre / 0.5 s post impact) captures the shot; Fourier bands 0–4 / 5–20 / >20 Hz map cleanly onto body/limb/vibration components; ball-feed motions generalize to rally/match motions (tested, small drop).

## 5. Features / target
- Inputs: 6-channel IMU time series from the passive wrist (3-axis accel + 3-axis gyro), 120 Hz, 180-frame (1.5 s) windows; plus Fourier-derived low/medium/high frequency-band attention features (internal).
- Targets: classification = one of 6 shot classes (serve, smash, forehand stroke, backhand stroke, forehand volley, backhand volley); detection = per-frame binary label (inside shot window or not).
- Prediction horizon: retrospective — windows extracted around impact; detection runs on continuous sequences, classification on extracted windows.

## 6. Validation design
- **CV scheme:** 5-fold cross-validation over participants (inter-subject): classification — 20 participants in 5 groups of 4 (3 folds train / 1 val / 1 test), stratified to balance experience, gender, backhand type, dominant arm; detection — 10 participants in 5 groups of 2. Fold performances averaged.
- **Metrics:** classification = accuracy; detection = frame-wise accuracy + F1 for positive labels (class imbalance).
- **Baselines:** Ganser et al. 2021 FCN (backbone) for classification; threshold-based peak detection (Ganser et al. 2021, the dominant-arm standard) for detection.
- **Ablations:** ball-feed vs rally/match contexts; segment length (1 s vs 1.5 s vs 2 s); accel-only vs gyro-only; user fine-tuning; downsampling to 30/60 Hz; parameter-matched wider backbone (to test whether attention, not size, drives gains); user study (N=10, within-subject passive vs dominant arm, NASA-TLX load + perceived performance).
- Splits are by participant (no within-subject leakage), but note labels for the passive-arm model were generated using the dominant arm's impact jerk — the label pipeline depends on the sensor the paper is trying to eliminate.

## 7. Numerical results / baselines
- **Classification (Table 1, 5-fold mean ± SD):** our model — passive arm **88.2 ± 2.0%**, dominant arm 90.1 ± 3.0% (gap only **1.9%**). Ganser FCN baseline — passive 81.4%, dominant 90.5% (gap 9.1%). Frequency-band attention improved passive-arm performance by **+6.8%** vs the FCN; on the dominant arm the attention added nothing (−0.4%). Parameter-matched wider backbone gave only +0.4%, so the attention modules (53K of 340K params), not size, drive the gain.
- **Confusion matrix (Fig. 7):** forehand stroke: 98.9% from dominant arm vs 72.1% from passive arm (passive-arm motion varies); serve vs smash: passive arm 82.8% vs dominant 74.1% (passive arm catches the ball-toss before a serve, disambiguating the overhead swing).
- **Detection (Table 2):** our MS-TCN — passive arm accuracy 95.6%, **F1 86.0%**; dominant arm 98.5%, F1 94.8%. Threshold peak detection — passive arm accuracy 77.8%, F1 **37.6%**; dominant arm 97.2%, F1 90.1%. So the model beats the dominant-arm-specific threshold baseline by +48.4 F1 points on the passive arm, but trails the dominant-arm neural model by 8.8 F1 points. False negatives on the passive arm concentrate in volleys (subtle motion near the net).
- **Ball-feed → rally/match transfer:** 1,826 rally/match shots classified with the feed-trained model: 86.0% (only 2.2 pp below feed-data CV accuracy).
- **Segment length:** 1 s → 79.4%; 2 s (impact at 1.0 s) → 85.9%; 2 s (impact at 1.5 s) → 87.3%; chosen 1.5 s → 88.2%.
- **Accel-only vs gyro-only:** accel 81.8%, gyro 77.2%; forehand stroke much better from accel (72.2% vs 51.6%), volleys better from gyro (94.4% vs 87.2% avg).
- **Fine-tuning (10% of user's data, 5 shots per class, LR 1e-6):** +4.7% per user, ~94% overall.
- **Downsampling to 30/60 Hz:** < 0.5% degradation.
- **Inference cost:** 0.2 s for 100 classification instances (incl. FFT) and 0.3 s for 10 min of detection on Xeon 4310 + RTX 3090 — server-side, not on-device.
- **User study (N=10, Fig. 9):** passive arm felt significantly less mentally (U=79, p=0.02; during play U=83, p=0.01) and physically (setup U=78, p=0.03; play U=85, p=0.07) demanding vs dominant-arm wear; perceived performance difference not significant (U=31, p=0.12).

## 8. Code / data availability
GitHub: https://github.com/jyp0802/Silent-Impact (models + dataset, stated in paper). Prototype app for Galaxy Watch 4 described, not necessarily released.

## 9. Leakage & limitations
- **Tiny participant pool:** 20 participants for classification (4 per fold), 10 for detection (2 per fold); all recreational players from KAIST clubs; mean ages ~26; only one left-hander. Inter-subject generalization to other body types, ages, and skill levels is weakly supported.
- **Label dependency on the dominant arm:** the "automatic" shot-time labeling uses the dominant arm's impact jerk; the passive-arm pipeline's ground truth was produced by the sensor modality the paper argues against — and labeling required manual video filtering of false positives (picking up balls etc.).
- **Six coarse classes only:** no spin, power, direction, outcome (winner/error), no drop shots/slices/lobs (excluded from rally analysis).
- **Server-side computation:** RTX 3090 + Xeon pipeline streamed over S3; not on-watch inference; the paper's future-work acknowledges this gap (lighter nets / SVMs needed).
- **Confounding of comfort finding:** the user-study "passive is less burdensome" result conflates device *placement* with the baseline condition using a watch-sized device on the dominant wrist; comfort claim is unsurprising given the survey premise.
- **Detection false negatives cluster in volleys** (the shots least visible to passive-arm motion) — the exact shots that decide points at net.
- **External validity to NFL:** zero. Tennis stroke classification from a recreational wrist IMU has no mapping to NFL prediction, game modeling, or analytics; no betting-relevant signal; no transferable feature or equation. The one portable idea — Fourier frequency-band attention as a feature extractor for motion signals — applies to wearable products, a lane GSE does not operate in.

## 10. GSE overlap
Per the existing-research-map: Garrett's corpus has **no wearable-sensor lane at all** — the closest items are the NGS/tracking lane (27-family NGS taxonomy, STRAIN) and the athlete-load-adjacent efficiency/luck metrics, all derived from video/tracking or play-by-play, never from IMU wearables. No paper, dataset, or X-account inventory covers IMU-based action recognition, passive-arm sensing, or smartwatch sports analytics. This is not a duplicate — but it is a **new capability in a lane GSE has no reason to enter** (consumer wearable product, HCI/UX venue UIST, not sports modeling). No GSE repo file or Drive dossier covers it; nothing in the 15-area ML research brief maps to wearable IMU action recognition.

## 11. GSE implementation spec
None warranted — REJECT. For the record, if GSE ever entered the wearable-sports-product lane, the portable component would be the Fourier frequency-band attention head (0–4 / 5–20 / >20 Hz bands per Ji & Pachi 2005) atop a 1D-conv classifier, which closed a 9.1 pp passive/dominant gap to 1.9 pp at +53K params. There is no GSE data source (nflverse, FTN charting, odds APIs) that produces IMU signals, and no GSE product consumes shot-level tennis classifications. Effort is therefore not estimated — this is an explicit non-build.

## 12. Reproducible test
Clone https://github.com/jyp0802/Silent-Impact; retrain the classification model on the released dataset using the paper's 5-fold participant-grouped CV (3/1/1 folds, 100 epochs, batch 64, LR 1e-4, Adam). **Metric:** mean 5-fold accuracy on passive-arm data. **Baseline to beat:** the released model's passive-arm accuracy (expected 88.2 ± 2.0%) and the dominant-arm gap (≤ 1.9 pp). **Acceptance:** reproduced mean within ±3 pp of 88.2% with the same fold structure. This test is only a reproducibility check of the paper's own claim; it confers no GSE value.

## 13. Acceptance / rejection gate
- **Reject** — decided at triage: no mapping from recreational tennis wrist-IMU shot classification to any GSE lane (NFL prediction, DFS, props, NGS analytics, betting markets). No numeric gate can make it relevant; the verdict is REJECT regardless of reproducibility.
- The only conceivable adopt path would be GSE launching a consumer wearable product, which is outside the operating rule (traffic first, 1,000 visitors before new product) and outside every existing lane.

## 14. Improvement experiment
Since the paper is rejected for GSE, the natural follow-up within its own lane: replace the server-side MS-TCN + conv pipeline with a single on-device temporal model (quantized 1D-TCN with the same Fourier-band attention) to achieve watch-native inference, then test the fine-tuning result (94% with 10% user data) in a leave-one-user-out cold-start setting — the real deployment question is how fast a new user reaches ≥90% accuracy from zero labeled shots, not the warm-start fine-tune the paper reports. Second arm: fuse microphone audio (ball-strike transient) with the IMU, since the authors' own discussion flags audio as the missing impact signal on the passive arm; expect volley-class false negatives to drop.
