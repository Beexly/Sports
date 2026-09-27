# [0206] BasketHAR: A Multimodal Dataset for Human Activity Recognition and Sport Analysis in Basketball Training Scenarios (arXiv:2604.17065v1)

**Citation:** Gao, X., Zhang, H., Zhang, Z., Ruan, J., Liu, T., & Fu, Y.* (2026). *BasketHAR: A Multimodal Dataset for Human Activity Recognition and Sport Analysis in Basketball Training Scenarios*. arXiv:2604.17065v1. URL: https://arxiv.org/abs/2604.17065 (* = corresponding author)
**Ledger completed:** 2026-09-21. **Read:** full text (versioned PDF, https://arxiv.org/pdf/2604.17065v1, 926 lines).
**Verdict:** ADAPT — do not port the basketball dataset; instead adapt the two reusable mechanisms as a template for GSE's practice/training-analysis lane: (1) the LoRA-fine-tuned ImageBind multimodal alignment baseline for classifying on-field actions from wearable/sensor streams, and (2) the human-in-the-loop HAR→LLM pipeline that turns recognized action sequences plus physiological metrics into expert-revised performance reports.

## 1. Research question
Can a multimodal dataset covering real-world basketball training (motion signals + physiological metrics + synchronized video) close the gap left by HAR datasets that only cover basic daily activities, and does multimodal alignment (LoRA-fine-tuned ImageBind) plus LLM report generation enable credible automated analysis of training sessions? The paper claims three firsts: the first multimodal HAR dataset for basketball training, the first inclusion of heart rate and skin surface temperature in sports HAR, and a baseline multimodal alignment method.

## 2. Dataset / schema
- **BasketHAR**, publicly accessible at https://huggingface.co/datasets/Xian-Gao/BasketHAR, Apache License 2.0. 7 pages, 7 figures paper.
- Collection: 90-minute basketball training session on a standard basketball court, real-world (not lab), host computer courtside on the same LAN as sensors.
- Sensors: motion = MPU9250 9-axis (accelerometer, gyroscope, angle, magnetic field), embedded in WT901 SoC, mounted front-center of the volunteer's waist, sampled at 200 Hz, transmitted via UART; physiology = heart rate + skin surface temperature via nRF51822 SoC with Silicon Labs Si1141 sensor, worn on the dominant-hand wrist, sampled at 1 Hz via Bluetooth. Sensors calibrated in a stationary state pre-experiment (reference zero points and axis orientations).
- Video: synchronized full-length tracking footage, used for annotation; all faces blurred and manually reviewed (privacy).
- Annotation: activity labels derived from professional basketball coaches' technical movements; annotated by university students with proficient basketball skills; each label verified by ≥2 annotators; segment start/end = average of ≥2 annotations.
- 14 activity classes (class ID, description, # collected samples): 0 Sit 497; 1 Stand 2165; 2 Warmup Exercises 582; 3 Walk 931; 4 Run 65; 5 Dribble Run 230; 6 Hold Ball Standing 1882; 7 Bounce the Ball 3100; 8 Travel (with Ball) 626; 9 Shoot the Ball 621; 10 Pass on the Run 94; 11 Low Dribble (Alternating Hands) 83; 12 Low Dribble (Right Hand) 235; 13 Low Dribble (Left Hand) 124.
- Table 2 reports 14,044 total samples at 200 Hz; the per-class counts above sum to 11,235 — a discrepancy of 2,809 that the paper does not explain (flagged as an inconsistency, not resolved).
- Class imbalance is severe (Run 65 vs Bounce the Ball 3100, ~48:1).

## 3. Method / model
- Baseline multimodal alignment: LoRA fine-tuning [9] on ImageBind [7]. ImageBind aligns modalities through the visual modality during pretraining; the authors freeze the visual encoder and fine-tune only the textual and signal (IMU) encoders to maximize feature similarity across modalities. Inference: extract features from input signal, compute cosine similarity with textual label embeddings, assign the highest-similarity label.
- Equations (as rendered in the PDF extraction — garbled; see Sec. 4 uncertainty note): (1) L = 1 − CosSim(·,·); (2) overall loss L ≜ L_text_IMU + L_video_IMU + … (three loss terms, per-text "hyperparameters in equation 2 were set to 1"). The figure caption describes a video encoder, text encoder, and IMU encoder with LoRA adapters.
- Comparators: SVM (RBF kernel, C=1), Random Forest (100 trees), MLP (2-layer FC, 128 + 64 nodes), CNN (3 convolutional layers + 2 FC layers), LSTM (3 layers, 12 input features, hidden dim 128). All trained with Adam, learning rate decaying from 1×10⁻³ to 1×10⁻⁴.
- Train/test split 8:2; experiments on NVIDIA A100 GPUs; metrics = per-class precision/recall/F1 plus macro/weighted averages and overall accuracy.

## 4. Equations & assumptions
- Eq. (1): L = 1 − CosSim(·,·) — the right-hand side (explicit cosine-similarity denominator terms) was unreadable in the PDF extraction; structure is the standard 1-minus-cosine-similarity contrastive loss.
- Eq. (2): L ≜ sum of three modality-pair alignment losses with all hyperparameters set to 1 — term identities unreadable in extraction; inferred from the architecture figure as text↔IMU, video↔IMU, and a third pair (likely text↔video or an auxiliary regularization), but this is inference, not a paper claim.
- Stated assumptions: synchronized multi-sensor capture is feasible in real training environments; averaging two annotators' segment boundaries is ground truth; text labels are adequate proxies for action semantics in the alignment space.

## 5. Features / target
- Inputs: accelerometer (3 axes), gyroscope (3 axes), angle (orientation, 3 axes), magnetic field (3 axes) at 200 Hz from waist; heart rate and skin temperature at 1 Hz from wrist; synchronized video.
- Target: 14-class activity label (Table 1).
- Secondary use: physiological metrics + recognized action sequences → LLM-generated training reports (Sec. 6.2).

## 6. Validation design
- Single 90-minute session dataset, 8:2 train/test split. The paper does not state whether the split is by volunteer, by session segment, or random — flagged: if random windows from one session, leakage between adjacent windows is likely (consecutive frames of the same activity).
- Baselines: SVM, RF, MLP, CNN, LSTM, plus their multimodal alignment method.
- Metrics: per-class P/R/F1, macro avg, weighted avg, overall accuracy. No cross-validation, no confidence intervals, no leave-one-subject-out protocol stated.

## 7. Numerical results / baselines
Table 3 — overall accuracy: SVM 70.27%; Random Forest 71.91%; MLP 69.46%; CNN 72.91% ("a three-layer CNN achieves an accuracy of 73%"); LSTM 71.41%; **Ours (multimodal alignment) 78.11%** ("over 78%").
Macro avg P/R/F1: SVM 0.63/0.54/0.56; RF 0.65/0.57/0.60; MLP 0.60/0.57/0.59; CNN 0.71/0.54/0.57; LSTM 0.54/0.55/0.54; Ours **0.70/0.69/0.69**. Weighted avg F1: Ours 0.78 vs CNN 0.72.
Per-class F1 (Ours): Sit 0.96; Stand 0.88; Warmup 0.65; Walk 0.52; Run 0.00; Dribble Run 0.73; Hold Ball Standing 0.85; Bounce the Ball 0.79; Travel 0.63; Shoot 0.72; Pass on the Run 0.62; Low Dribble Alt 0.65; Low Dribble Right 0.84; Low Dribble Left 0.87.
- Hard classes: Run F1 = 0.00 for ALL methods except CNN (0.12) and MLP (0.21); the paper states "most methods yield less than 50% accuracy" on walking/running/dribble-run, attributing it to similarity and co-occurrence with dribbling/passing/bouncing.
- Training intensity findings (caution: these numbers appear in the paper's illustrative ChatGPT-4o *generated* expert report, Fig. 7 — average heart rate 142.77 bpm, peak 185 bpm, 90 abnormal heart-rate records, no abnormal temperature records — and are NOT independently confirmed as formal dataset statistics elsewhere in the text; treat as LLM-generated illustration, not measured cohort statistics).

## 8. Code / data availability
Dataset: https://huggingface.co/datasets/Xian-Gao/BasketHAR (Apache License 2.0). No code repository link stated in the text. Report generation used ChatGPT-4o with templated prompts (Fig. 7 excerpt shown).

## 9. Leakage & limitations
- Adversarial: (a) split methodology unstated — random 8:2 split on windows from a single 90-minute session almost certainly leaks near-duplicate adjacent windows between train and test, inflating accuracy; (b) the 11,235 vs 14,044 sample-count inconsistency; (c) Run class has 65 samples — the F1=0.00 everywhere suggests either annotation noise or extreme under-sampling, and the 78.11% headline accuracy is propped up by the huge easy classes (Stand 2165, Bounce 3100, Hold Ball 1882); (d) single session, unknown number of volunteers (not stated — flagged as missing), so no generalization claim is supported; (e) 1 Hz heart-rate/temperature vs 200 Hz motion is a severe rate mismatch the paper doesn't discuss; (f) equations (1)–(2) are unrecoverable from the PDF, so the baseline method is not reimplementable from the paper alone; (g) "first" claims are marketing — Hang-Time HAR (2023) already covers basketball with wrist IMU; the genuine novelty is the physiological + video modalities.

## 10. GSE overlap
- The existing-research map contains no wearable/HAR/IMU/activity-recognition research; GSE's sports data is broadcast video, tracking, charting, and odds. This is a new capability area, not a duplication.
- The dataset itself (basketball training, SJTU collection) has no direct NFL use. What transfers: the multimodal-alignment classifier recipe (LoRA-ImageBind on sensor streams) and the HAR→LLM report pipeline.

## 11. GSE implementation spec
- Data: if GSE ever ingests practice-wearable data (Catapult-style IMU/GPS vests used by NFL teams) or derives per-player motion features from NGS tracking, replicate the BasketHAR recipe: waist/torso-equivalent accel+gyro+mag streams, annotate action classes relevant to football (route stem, break, catch, block engagement, tackle), train a LoRA-ImageBind alignment classifier against text labels.
- Report pipeline: action sequence + physiological/load metrics → templated prompts → LLM (ChatGPT-class) draft → human expert revision loop (Fig. 6 framework) → weekly practice-load reports for the content operation (e.g., "Week 3 practice report" editorial products).
- Effort: method port ~2 weeks once sensor data exists; report pipeline ~1 week (prompt engineering + revision workflow). The blocker is data access, not modeling — NFL practice wearable data is proprietary to teams.

## 12. Reproducible test
- Dataset: the public BasketHAR HF repo itself (sanity check of the pipeline, not GSE data).
- Metric: macro-average F1 on the 14 classes, leave-one-session/chunk-out protocol (fixing the paper's split ambiguity).
- Baseline to beat: the paper's 0.69 macro F1 (Ours) — our reimplementation of LoRA-ImageBind alignment must reach ≥0.65 macro F1 before any GSE adaptation is credible.
- For the report pipeline: expert-rated quality of 10 generated reports on a 1–5 rubric vs. the paper's ChatGPT-4o outputs.

## 13. Acceptance / rejection gate
ADAPT the alignment method if a reimplementation on the public BasketHAR data reaches macro F1 ≥ 0.65 within a clean leave-one-chunk-out protocol (i.e., the method survives the leakage fix); reject the method (keep only the report-pipeline idea) if macro F1 falls below 0.55 once window leakage is removed, since the headline 78.11% accuracy would then be attributable to split contamination. The report-generation pipeline is accepted on its own merits regardless (low cost, editorial use) if expert revision rate is <30% of generated content.

## 14. Improvement experiment
Beyond the paper: fix the two design flaws and test whether the method survives — (1) replace the random 8:2 split with leave-one-volunteer-out cross-validation to measure true generalization, and (2) fuse the 1 Hz physiological signals as a conditioning branch (FiLM-style modulation of the motion encoder by heart-rate zone) rather than as unused side data. If heart-rate-conditioned classification beats motion-only on the hard classes (Walk/Run/Dribble Run), it would validate the paper's "first physiological signals" claim with an actual experiment the authors didn't run — and for GSE it would map directly to workload-aware practice analytics.
