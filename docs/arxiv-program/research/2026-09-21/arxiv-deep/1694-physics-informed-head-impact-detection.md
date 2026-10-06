# 1694 Physics-informed ML for head impact detection (arXiv:2108.08797)

**Citation:** Samuel J. Raymond, Nicholas J. Cecchi, Hossein Vahid Alizadeh, Ashlyn A. Callan, Eli Rice, Yuzhe Liu, Zhou Zhou, Michael Zeineh, David B. Camarillo (2021). *Physics-informed machine learning improves detection of head impacts*. arXiv:2108.08797. URL: https://arxiv.org/abs/2108.08797
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections through references).
**Verdict:** ADAPT — the synthetic-data pretraining + balanced-training recipe for rare-event impact detection is directly portable to GSE's rare-event problems (concussion detection, injury-event classification from sensor/tracking data); the manual-vs-automated workflow economics are a template for replacing manual video review.

## 1. Research question

Monitoring head impacts via instrumented mouthguards requires distinguishing true head impacts from false triggers (chewing, handling) — currently done by laborious manual video review. Can a physics-informed ML classifier, trained on video-verified field data augmented with finite-element synthetic impacts, match or replace manual review?

## 2. Method / model

- **Sensor:** Stanford MiG2.0 mouthguard — triaxial accelerometer (±400 g @ 1000 Hz) + triaxial gyroscope (±4000 °/s @ 8000 Hz); triggers at 10 g; 200 ms windows (−50 ms pre, +150 ms post).
- **Data:** 1,024 video-confirmed true impacts + 10,990 confirmed false impacts from Stanford college football (n=12 players, 17 practices) + three Bay Area high schools; 70/15/15 train/val/test split.
- **Model (MiGNet 2.0):** deep 1D CNN (per Domel et al.): 2× [1D conv (64/128 filters, 5×1/10×1), maxpool 2, batchnorm, dropout 40%], reshape to 2D, 2D conv (64 filters, 3×15, stride 3×1), global average pooling, batchnorm, dropout 40%, softmax. Input: 6 channels (ax, ay, az, αx, αy, αz).
- **Physics-informed component:** synthetic true impacts from a finite-element head-neck model, generated to match mouthguard output style.
- **Training strategies:** (1) field only; (2) field + 25% synthetic; (3) field + 100% synthetic; (4) pretrain on synthetic (+verified falses) then fine-tune on field; time-shift augmentation (1–5 ms, up to 5×); class-weighted loss for the 1:10 imbalance.
- **Metrics:** PPV, NPV, F1, F2 (F2 emphasized — missing true impacts is costlier); replacement bar: F2 ≥ 0.90.

## 3. Mathematics / equations / assumptions

- Fβ = (1+β²)·(precision·recall)/(β²·precision + recall); F1 (β=1) balanced, F2 (β=2) recall-weighted.
- Class-weighted cross-entropy to handle 1:10 imbalance.
- Synthetic impacts assumed to match real mouthguard signal style (FE head-neck model → sensor-space signals).
- Assumptions: video review is ground truth; trigger threshold 10 g captures all true impacts (no sub-threshold concussions in scope).

## 4. Dataset / schema

- **Source:** Stanford MiG2.0 deployments — 12 Stanford football players (5 OLB, 1 ILB, 1 RB, 2 WR, 1 DE, 1 OT, 1 C), 17 practices + games, plus 3 high schools.
- **Schema per event:** 6-channel 200 ms kinematic time series, video-verified true/false label.
- **Access:** not stated (no public release).

## 5. Features / target

- **Features:** 6-channel head kinematics (3 linear + 3 angular acceleration components), 200 ms windows.
- **Target:** true vs false head impact (binary).

## 6. Validation design

- **Design:** fixed 70/15/15 split; no synthetic data in val/test (tests real-world generalization); strategy comparison on identical test set; literature benchmark table (same task, different datasets — acknowledged as imperfect); real-world workflow trial (6 participants, spring 2021, 88 mouthguard events, video as ground truth).

## 7. Exact results and baselines (numbers)

- **Literature comparison:** MiGNet 2.0 (this work): F1 0.95, F2 0.98 vs Wu et al. 2018 (SVM) 0.90/0.88; Gabler et al. 2020 (AdaBoost CART) 0.89/0.84; Domel et al. 2020 (CNN) 0.79/0.75.
- **Training strategies (test NPV/PPV):** field only: 0.69/0.97; +synthetic (max): 0.72/1.00; augmented + 25% synthetic: 0.76/0.97; balanced + 100% synthetic: 0.87/0.86; **pretrain-then-finetune: 0.89/0.86** (best NPV).
- **Workflow trial (88 events):** manual video review ~12 hours (20 events/hr, 2 hr analyst training) vs automated ~0 hours (>10⁶ events/hr, 5 hr training); both found all 61 true impacts; false impacts: manual 27, auto 20; auto: 7 false positives, **0 false negatives** — clears the F2 ≥ 0.90 replacement bar.

## 8. Code / data availability

**Stated:** none (no code or data release mentioned).

## 9. Leakage and limitations

- **Literature comparison is cross-dataset** — acknowledged as difficult; the F1/F2 table is indicative, not a controlled benchmark.
- **No public data or code** — the exact model can't be replicated; only the recipe transfers.
- **10 g trigger threshold** — sub-threshold impacts invisible by design; concussions below 10 g (if any) are out of scope.
- **Single-program data** (Stanford + 3 local high schools) — generalization to NFL-level impacts untested.
- **7 false positives** in the workflow trial — acceptable for triage, but a fully autonomous pipeline still needs a review step.

## 10. GSE overlap

GSE has no sensor-based event-detection capability, but the *recipe* — synthetic pretraining for rare events, class-weighted loss, Fβ with recall-weighted β for safety-critical detection, and the manual-vs-automated workflow economics — ports to GSE's rare-event classification problems (e.g., detecting injuries from tracking-data anomalies, classifying big hits from NGS data, or any low-base-rate event where manual labeling is the bottleneck). No existing GSE doc covers synthetic-data pretraining for class imbalance.

## 11. GSE implementation spec

- **Target:** rare-event detectors in GSE's data pipeline (e.g., injury-event flags from tracking data, anomalous-play detection).
- **Data:** GSE's NGS/tracking corpora with manual labels for the rare class.
- **Method:** (1) build a physics/simulation-based synthetic generator for the rare class (analogous to the FE head-neck model); (2) pretrain detector on synthetic + real negatives, fine-tune on real data; (3) time-shift augmentation; class-weighted loss; (4) report F2 (recall-weighted) with a pre-registered replacement bar.
- **Serving:** automated triage replacing manual video/charting review in GSE's data pipeline.
- **Effort:** 2–4 weeks per detector.

## 12. Reproducible test

- **Dataset:** any public imbalanced time-series classification task with a simulatable positive class (e.g., synthetic falls/impacts from an open biomechanics simulator + real negatives).
- **Metric:** F2 on a held-out real-only test set for (a) real-only training vs (b) synthetic-pretrain + fine-tune.
- **Baseline to beat:** real-only training; the recipe passes if synthetic pretraining improves F2 by ≥ 0.03 with zero additional real positives AND the false-negative count on the test set does not increase.
- **Window:** single replication study.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the synthetic-pretraining recipe if the replication shows F2 gain ≥ 0.03 with no increase in false negatives. REJECT if synthetic pretraining degrades real-data calibration (a known risk: the model learns simulator artifacts) — measured as PPV drop > 0.05 on real data.
- **Improvement experiment:** the paper's synthetic data is used only for pretraining/augmentation — extend to **uncertainty-aware triage**: use MC-dropout at inference to route low-confidence events to manual review, quantifying the residual manual workload (hours/season) rather than claiming full automation. Second: replace the fixed 10 g-style trigger with a **learned trigger** trained jointly with the classifier to catch sub-threshold events.

**Verdict:** ADAPT — the synthetic-pretraining recipe for rare-event detection with recall-weighted evaluation is portable to GSE's data-pipeline classification problems.
