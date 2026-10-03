# [0432] Adaptive Feature Processing for Robust Human Activity Recognition on a Novel Multi-Modal Dataset (arXiv:1901.02858v1)

**Citation:** Möncks, De Silva, Roche, Kondoz (2019). *Adaptive Feature Processing for Robust Human Activity Recognition on a Novel Multi-Modal Dataset*. arXiv:1901.02858v1. URL: https://arxiv.org/abs/1901.02858v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 773 lines).
**Verdict:** REJECT — indoor human-activity recognition for autonomous vehicles/sensor systems; no mechanism transfers to NFL outcome, spread, total, or player-prop prediction.

## 1. Research question
Can human activity recognition (HAR) for indoor autonomous-vehicle scenarios be made robust using multiple sensor modalities (RGB-D, LiDAR, 360° camera), and which feature-processing/classifier combinations classify 9 indoor activities most accurately? Contributions: the LboroHAR multimodal dataset (16 participants × 9 activities × 3 sensors) and DAEFE, a preprocessing algorithm for flexible ("elastic") feature extraction (choice of body joints + coordinates/velocity/acceleration).

## 2. Dataset / schema
LboroHAR ("LboroLdnHAR"), collected 17–18 June 2018 at Loughborough University London. 16 participants × 9 activities × 3 sensors (RGB-D, VLP-16 LiDAR, 360° RGB camera). Activities: sitting on office chair, standing and texting, sitting on stool, lying on couch, walking, walking+texting, carrying objects, pulling object, running. Extracted per activity: 51 frames of joint coordinates, 50 of velocity, 49 of acceleration; body joints (Head, Neck, Chest, spines, hips, center of mass, eyes, clavicles, shoulders, forearms, hands, thighs, shins, feet, toes, effectors). Raw streams ~2 min per scenario per sensor. Novel claim: first openly available multimodal indoor+outdoor-sensor HAR dataset. Authors also reviewed existing HAR datasets (Table I: e.g., NTU RGB-D with 60 classes/40 subjects; UTD-MHAD; MPII).

## 3. Method / model
DAEFE (Data Pre-processing Algorithm for Elastic Feature Extraction): (1) select joints/parameters of interest (coordinates c, velocity v, acceleration a); (2) build posture feature vectors per frame; normalize by replacing absolute coordinates with relative coordinates centered on a torso joint (f_i = |d_i|, distance vectors from torso, invariant to participant position); (3) aggregate into matrix M (features) + label vector C for supervised learning. Split: 60% train / 20% test / 20% validation; 5-fold cross-validation. Six algorithms evaluated after a 22-algorithm pre-screen: fine decision tree, linear discriminant, cubic SVM, fine k-NN, bagged trees, deep neural network (w=175). Feature-space experiments: 3D vs 2D postures; joint subsets (9/18/28 joints); PCA at 95% explained variance. Model-checking note: failure intent of unsuccessful moves handled via GBM (not relevant here; cited from general method discussion).

## 4. Equations & assumptions
Frame counts: p ∈ {51, 50, 49} for (coordinates, velocity, acceleration). Relative joint features: f_i = |d_i| for i = 2,3,…,n−1 with d_i the distance vector between joint i and the torso reference (head/neck per garbled text, torso joint in practice). Posture vector F = (f_1, f_2, …, f_n). Aggregated matrix M and label vector C with c ∈ {1,…,9}. No loss functions or probabilistic equations stated; this is an empirical benchmark paper, not a modeling paper.
Stated assumptions: single-posture frames suffice (time-invariant classification); relative coordinates remove position bias; T-position standardization at tracking start; stationary sensor testbed during collection.

## 5. Features / target
Input: relative 3D (or 2D) body-joint coordinates / joint velocities / joint accelerations from RGB-D skeleton extraction. Target: one of 9 activity classes (static posture classification, not temporal sequence labeling).

## 6. Validation design
60/20/20 train/test/validation split; 5-fold cross-validation reported; 22 algorithms pre-screened, top 6 compared. Comparison across feature modalities (c vs v vs a), joint subsets, PCA on/off. No temporal/leave-one-subject-out split reported — all 16 subjects presumably appear in train and test (subject leakage not addressed). Sensor testbed stationary; all activities from optimal sensor operating range.

## 7. Numerical results / baselines
- Best overall (Table III/IV/V): cubic SVM 97.9% (pre-screen) / 91.6% (Table IV, coordinates); DNN 95.0% → 95.1% (Table IV) → 96.5% with 28-joint 3D feature set (Table V); fine k-NN 94.4%; bagged trees 92.5%. Abstract headline: "mean accuracy of up to 96.8% for classification across all stationary and dynamic activities" (deep neural network, RGB-Depth data).
- Feature modalities (Table IV): coordinates dominate — Decision Tree 79.2%/34.2%/17.0% (c/v/a); Lin. Discriminant 80.0%/29.4%/12.9%; Cubic SVM 91.6%/44.0%/24.4%; Fine k-NN 94.4%/45.5%/21.6%; Bagged Tree 92.5%/46.3%/22.5%; DNN 95.1%/29.0%/10.8%.
- PCA (95% variance) hurts accuracy substantially: e.g., DNN 96.5% → values "≪ 75.0%" under realistic conditions per authors' own discussion; fine k-NN 77.2%, bagged trees 76.7% on PCA-reduced sets — authors interpret non-PCA results as overfit to the dataset and PCA results as more realistic.
- 3D postures beat 2D; adding joints beyond ~28 yields no gain (curse of dimensionality).
- Confusion patterns: running (class 9) confused with walking (class 5); walking confused with walking+texting (6) and carrying (7/8); authors attribute misclassification to missing object-context in feature vectors (no phone/box in features).

## 8. Code / data availability
Dataset: LboroHAR released openly (authors' claim). No code link or data URL stated in the text. "None stated" for code.

## 9. Leakage & limitations
Adversarial read: (1) No leave-one-subject-out evaluation — 16 participants with standardized T-positions; models likely memorize individual gait/posture signatures; subject-level generalization untested. (2) Stationary testbed, optimal lighting, standardized start pose — authors themselves admit real-world accuracy would be "≪ 75.0%" and call the work a proof of concept, not a functional solution. (3) Black sweatpants broke RGB-D silhouette recognition (sensor limitation admitted). (4) No object context — cannot distinguish texting-while-walking from carrying. (5) Relative-coordinate normalization destroys absolute position info that matters for e.g. lying on couch vs sitting. (6) Pre-screen selection of 6 algorithms from 22 on the same dataset = selection bias. (7) External validity to NFL: zero. No game-outcome, spread, total, or prop mechanism; human pose classification of indoor activities is unrelated to GSE's statistical modeling. The paper mentions "sports analytics" as a possible application domain in passing but develops nothing in that direction.

## 10. GSE overlap
No repo work on pose estimation, computer vision, or sensor-based activity recognition; GSE models are statistical (nflverse, charting, odds). The map's ML brief mentions multimodal fusion as a topic (area 13) but for text/news features, not pose data. NGS tracking exists in the repo (27-family taxonomy) but no pose-classification work. Status: **no overlap and no transfer path** — wrong domain entirely (indoor AV safety), wrong data type (RGB-D/LiDAR), wrong target (activity classification).

## 11. GSE implementation spec
REJECT verdict → no build plan. No data source, feature, or method in this paper applies to GSE's NFL prediction/prop pipeline.

## 12. Reproducible test
Not applicable — REJECT on domain grounds.

## 13. Acceptance / rejection gate
REJECT: indoor HAR for autonomous vehicles with RGB-D/LiDAR pose classification; nothing in the method, data, or results transfers to NFL game or prop modeling. Ledger written in full per REJECT protocol.

## 14. Improvement experiment
None applicable to GSE. For the paper's own domain: leave-one-subject-out evaluation, object-aware feature vectors (detect phone/box), and moving-sensor data collection — all suggested by the authors' own future-work section (sensor fusion of RGB-D + LiDAR, real-time sequential classification).
