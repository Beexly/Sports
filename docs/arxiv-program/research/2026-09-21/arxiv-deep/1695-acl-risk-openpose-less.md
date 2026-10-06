# 1695 Automated ACL injury-risk scoring from 2D video (arXiv:2305.14612)

**Citation:** Ziyu Gong, Xiong Zhao, Chen Yang (2023). *Assessment of Anterior Cruciate Ligament Injury Risk Based on Human Key Points Detection Algorithm*. arXiv:2305.14612. URL: https://arxiv.org/abs/2305.14612
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, all sections through references).
**Verdict:** ADAPT — the first automated 2D-video implementation of the clinical LESS screen, with public code and edge-device deployment; the pipeline (pose keypoints → biomechanical features → threshold scoring → AHP-weighted composite) is a reusable template for automated movement-quality scoring from broadcast or combine video.

## 1. Research question

The Landing Error Scoring System (LESS, Padua 2009) is a validated clinical screen for ACL injury risk during jump landing, but it's scored manually from video — subjective and slow. Kinect-based automation exists; 2D-camera automation does not. Can OpenPose keypoints from a single 2D camera drive an automated LESS-based ACL risk score?

## 2. Method / model

- **Pipeline:** 2D video → OpenPose keypoints per frame → missing-value preprocessing → 5 ACL-risk features: (1) knee flexion angle (sagittal), (2) trunk/hip flexion angle (sagittal), (3) lateral trunk angle (frontal), (4) ankle–knee horizontal distance, (5) ankle–shoulder horizontal distance.
- **Scoring:** each feature scored 9 (excellent) / 5 (good) / 1 (poor) via threshold intervals; final composite via **Analytic Hierarchy Process (AHP)** weighted scoring reflecting each feature's relative importance.
- **Takeoff checks:** knee varus/valgus from |knee–ankle distance|: < 30° = stable/correct; 30–50 = varus error; > 50 = valgus error (both ACL-tear-prone; larger varus displacement = more severe).
- **Deployment:** runs on Jetson Nano (quad-core ARM, 4 GB) — edge-deployable.
- **Experiment:** 30 participants — 10 basketball players (#1–10), 10 active (#11–20), 10 less active (#21–30); platform landing / drop vertical jump test.

## 3. Mathematics / equations / assumptions

- Joint angles from keypoint vectors (cosine rule on sagittal/frontal projections); e.g., max knee flexion ≈ 65° read from cosine peak in [0, −0.5].
- Segmented threshold scoring functions per feature; AHP pairwise-comparison weight matrix → normalized weights → weighted sum composite.
- OpenPose confidence threshold > 0.4 selected (PCKh@0.5 = 91.3% at 18.5% keypoint loss; 88.9% at 0.2 with 7.1% loss; 93.5% at 0.8 with 76.2% loss).
- Assumptions: LESS criteria valid for ACL risk (from Padua 2009); 2D projections suffice for the 5 features; OpenPose keypoints accurate enough at the chosen threshold.

## 4. Dataset / schema

- **Source:** authors' own lab collection — 30 subjects, landing-test videos (sagittal + frontal).
- **Schema per frame:** OpenPose keypoints (x, y, confidence) → per-trial feature values → 9/5/1 scores → AHP composite.
- **Access:** code at https://github.com/ZiyuGong-proj/Assessment-of-ACL-Injury-Risk-Based-on-Openpose ; subject data not released.

## 5. Features / target

- **Features:** 5 LESS-derived kinematic features (knee flexion, trunk flexion, lateral trunk angle, ankle–knee distance, ankle–shoulder distance) + varus/valgus takeoff check.
- **Target:** ACL injury-risk score (composite), validated against group membership rather than future injury.

## 6. Validation design

- **Design:** known-groups validation — the composite score should separate basketball players > active > less active participants (athletic populations have better landing mechanics).
- **Stats:** pairwise group comparisons with p-values; OpenPose accuracy analysis (PCKh@0.5 across confidence thresholds).

## 7. Exact results and baselines (numbers)

- **Group separation:** basketball players scored significantly higher than active participants (p = 0.0193), active higher than less active (p = 0.0486), basketball vs less active p = 3.59×10⁻⁸.
- **OpenPose:** PCKh@0.5 = 88.9% (conf 0.2, 7.1% loss) / 91.3% (conf 0.4, 18.5% loss) / 90.9% (conf 0.6, 36.7% loss) / 93.5% (conf 0.8, 76.2% loss); analysis used conf > 0.4.
- **Example kinematics:** max knee flexion ≈ 65° (excellent); max hip flexion ≈ 70° (excellent); frontal thigh–trunk cosine ≈ −1 (parallel); peak frontal flexion cosine ≈ −0.75 (30–60°, good).
- **No prospective injury outcomes** — validation is group discrimination only.

## 8. Code / data availability

**Stated:** code at https://github.com/ZiyuGong-proj/Assessment-of-ACL-Injury-Risk-Based-on-Openpose. Subject videos not released.

## 9. Leakage and limitations

- **No prospective injury validation** — the score separates athletic groups, not future ACL tears; basketball players landing well is expected, so the "validation" is partly circular.
- **n = 30**, single lab setting, controlled landing test — far from broadcast video conditions (occlusion, camera angles, multiple athletes).
- **AHP weights are expert-subjective** — the pairwise comparisons embed the authors' judgments, not data-driven optimization.
- **2D projection errors** — frontal/sagittal angles from a single camera assume ideal camera placement; broadcast angles would degrade features.
- **LESS itself is a screening tool**, not a validated injury predictor at the individual level.

## 10. GSE overlap

GSE has no movement-screening capability. The NFL Combine produces broadcast video of exactly the movements LESS-style screens assess (vertical jump landing, change-of-direction drills). An automated landing-mechanics score for draft prospects would be novel GSE content and a potential injury-risk feature for the engine's rookie models. No existing GSE doc implements pose-based movement scoring.

## 11. GSE implementation spec

- **Target:** automated landing/cutting-mechanics scores for NFL draft prospects from Combine drill video.
- **Data:** NFL Combine broadcast footage (vertical jump, broad jump landings; 3-cone / shuttle cuts); run OpenPose or a modern equivalent (e.g., RTMPose) per frame.
- **Method:** replicate the 5-feature extraction + threshold scoring; replace AHP weights with **data-driven weights** fit to actual NFL lower-body injury outcomes (rookie-contract IR data) via logistic regression on the 9/5/1 feature scores; validate prospectively.
- **Serving:** draft-content series ("landing mechanics red flags") + an injury-risk feature in GSE's rookie/fantasy models.
- **Effort:** 3–4 weeks.

## 12. Reproducible test

- **Dataset:** public jump-landing video dataset with OpenPose keypoints (or collect 50 landing trials across athletic levels); the authors' GitHub code as the starting implementation.
- **Metric:** known-groups separation (athletes vs non-athletes) + test–retest reliability (ICC) of the composite score across two trials of the same subject.
- **Baseline to beat:** manual LESS scoring by a trained rater on the same videos; the automated system passes if (a) it reproduces the group ordering with all pairwise p < 0.05 and (b) automated-vs-manual composite ICC ≥ 0.75.
- **Window:** single replication study.

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT if the replication achieves automated-vs-manual ICC ≥ 0.75 on the composite score. REJECT if ICC < 0.6 (2D pose noise swamps the clinical signal) or if the AHP-weighted composite fails to separate known groups (p > 0.05 for any pair).
- **Improvement experiment:** replace the subjective AHP weights with **supervised weights**: fit a penalized logistic regression of actual prospect lower-body injuries (first-2-season IR) on the five feature scores using 3+ draft classes — turning a screening score into a calibrated injury-probability model. Second: extend from landing to **cutting mechanics** (shuttle/3-cone), the more football-relevant ACL mechanism, adding knee-valgus-at-plant as a sixth feature.

**Verdict:** ADAPT — automated 2D-video LESS scoring with public code is a real, buildable movement-screening capability; the honest next step is replacing AHP weights with injury-calibrated ones.
