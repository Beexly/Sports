# [1577] Explainable Machine-Learning based Detection of Knee Injuries in Runners (arXiv:2602.11668)

**Citation:** David Fuentes-Jiménez, Sara García-de-Villa, David Casillas-Pérez, Pablo Floría, Francisco-Manuel Melgarejo-Meseguer (Univ. of Alcalá / URJC / Univ. Pablo Olavide, 2026). *Explainable Machine-Learning based Detection of Knee Injuries in Runners*. arXiv:2602.11668v1 [cs.LG], submitted 12 Feb 2026. URL: https://arxiv.org/abs/2602.11668v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF via browser).
**Verdict:** ADAPT

supervised injury-pattern detection from full stance-phase kinematic time series (not reduced point values) with a hybrid CNN + triple explainability (SHAP/saliency/Grad-CAM) under strict volunteer-separated CV; a portable, interpretable injury-screening pipeline GSE can adapt to NGS-derived stride kinematics for soft-tissue (hamstring) risk.

## 1. Research question
PFPS and ITBS are the most common knee injuries in runners, but prior work (mostly unsupervised clustering) failed to find injury-specific movement patterns, and supervised evidence is thin (one study, n=6 injured). Can supervised ML/DL on full stance-phase joint-angle time series — with explainability — detect injury-associated running patterns in a large public motion-capture database?

## 2. Dataset / schema
Ferber et al. 2024 public database: 1,798 runners, treadmill running, high-speed Vicon optoelectronic motion capture. Analyzed: 137 PFPS records, 126 ITBS records, 576 non-injured records (one sample per record; some runners multiple records). Per sample: demographics/anthropometrics + raw marker trajectories of 7 structures (2 feet, 2 shanks, 2 thighs, pelvis). Preprocessing: X-Y-Z Cardan angles for 6 joints (ankles/knees/hips) + 3 segments (feet/pelvis); stance phase segmented by PCA-based touch-down/toe-off detection (Osis et al. 2014); cubic interpolation to 101 samples; time series = mean + upper/lower envelope angles. Point values: spatio-temporal parameters (step width, stride rate/length, %stance/swing, pelvis drop, ankle eversion %, dorsiflexion/knee-flexion/hip-extension peaks, foot progression angle, pronation onset/offset, joint velocity peaks) + rotation-series power in LF (0–1 Hz), MF (1–3 Hz), HF (3–99 Hz) bands.

## 3. Method / model
Three binary tasks: (1) PFPS+ITBS vs healthy, (2) PFPS vs healthy, (3) ITBS vs healthy; three input regimes: time series only, point values only, hybrid. Models: KNN, linear/poly SVM, Gaussian Process, Decision Tree, AdaBoost, Random Forest, ANN + CNN (two-branch: main branch joint-temporal tensor (T,A,C) → Gaussian noise 0.05 → 2× Inception-residual blocks (64 filters) + SE modules + dropout 0.3 → flatten; secondary branch point values → dense 8→16 with BN/SiLU/dropout 0.3; fusion → dense 16 → sigmoid; RMSprop 1e-4, binary crossentropy, class-imbalance data generators) + LSTM (bidirectional conv-LSTM 30 filters k=3 → bidirectional LSTM 20 units → dense 10 → sigmoid). Grid-searched hyperparameters reported. Explainability: SHAP (SVM_L), saliency + Grad-CAM + SHAP on CNN as 2D joint×time heatmaps with cross-method consistency check.

## 4. Equations & assumptions
- Metrics: ACC/PRE/REC/F1 standard definitions (Eqs. 1–4).
- 5-fold CV over volunteers: 80% volunteers train, 20% test, averaged ± SD.
- Assumptions: treadmill gait ≈ overground injury-relevant gait; stance phase carries the injury signal; one-record-per-sample independence (multiple records per runner allowed across folds — volunteer-level separation enforced); Cardan angle conventions consistent across the database.

## 5. Features / target
Features: stance-phase joint/segment angle time series (101 samples × articulations × channels/modalities) ± kinematic point values. Target: binary injury-pattern label (PFPS+ITBS / PFPS / ITBS vs healthy).

## 6. Validation design
5-fold cross-validation with strict volunteer separation — no volunteer appears in both train and test (explicitly stricter than their 2025 paper; authors report metrics decreased under this protocol, an honesty signal). 10 models × 3 tasks × 3 input regimes. No external test set; no prospective validation.

## 7. Numerical results / baselines
CNN best accuracy: PFPS 77.9% (hybrid), ITBS 73.8% (time series), PFPS+ITBS 71.4% (time series). Classical best: SVM_L (PFPS hybrid 71.7%, F1 73.5), GP (PFPS+ITBS hybrid 66.0%). Precision/recall trade-off: CNN maximizes recall (PFPS recall 90.3%, precision 41.3%, F1 56.5; ITBS recall 81.9%, precision 34.3%) — high-recall screening profile. Hybrid helps PFPS (+1.7pp over time series alone) but slightly hurts ITBS (−0.5pp). SHAP (SVM_L): longer stance time (both feet) → injury risk in all three tasks; PFPS adds lower stride rate + high MF/HF power (foot/ankle/pelvis); ITBS adds stride length (longer = protective) + knee abduction peak velocity (lower = protective). CNN heatmaps: midstance 20–60% most relevant; PFPS = initial contact (feet/ankle) + late midstance (knee/hip); ITBS = early stance (foot/ankle) → midstance hip. Three explainability methods consistent (red regions agree across saliency/Smooth-Grad/SHAP).

## 8. Code / data availability
Public Ferber et al. 2024 database; preprocessing uses the database's supplemental codes. No model-code link in the paper.

## 9. Leakage & limitations
Treadmill (not overground/field) gait; retrospective case-control (injured vs healthy) — detects correlates, not predictors of future injury. Authors explicitly state the explainability maps "do not allow for the determination of a clear specific running pattern" — no crisp biomechanical signature emerged. CNN precision 34–52% limits clinical use. Multiple records per runner with volunteer-level (not record-level) separation is handled, but within-volunteer correlation across records remains. No portable-sensor validation (future work).

## 10. GSE overlap
Injuries-lane method paper with three portable assets: (a) the hybrid time-series + descriptor CNN recipe and the empirical finding that full temporal dynamics beat point-value reduction (Phinyomark et al. 2017) — directly relevant to GSE feature engineering on NGS tracking (keep the full stride time series, don't aggregate to per-play means); (b) the strict volunteer-separated CV discipline — same identity-bias lesson as 1573, now with a concrete demonstration that metrics drop under honest splits; (c) the triple-explainability consistency protocol as a template for interpreting GSE's own injury-risk models. Complements 1573 (SkiC-LSTM segmentation front end) as the downstream injury-pattern classifier.

## 11. GSE implementation spec
Build `gse_injury_screen.py` adapting the pipeline: (1) derive stride-kinematic time series from NGS tracking (per-play speed/acceleration/jerk series + stride proxies: stride length/rate from speed oscillation, stance-time proxies from deceleration phases); (2) hybrid CNN (temporal branch + point-value branch) trained to classify plays preceding soft-tissue injuries (hamstring/groin, from injury reports) vs matched healthy plays, under strict player-separated CV; (3) SHAP + saliency/Grad-CAM on the CNN to extract interpretable risk factors (e.g., stride-length asymmetry, late-play deceleration spikes); (4) output a per-player-week soft-tissue risk score feeding GSE's injury-report models and sit/start content. Gate the whole build on the paper's own honesty test: metrics must be reported under player-separated splits only.

## 12. Reproducible test
Reproduce Table 1 on the public Ferber database: CNN PFPS accuracy ≈ 77.9% (hybrid), ITBS ≈ 73.8% (time series) under volunteer-separated 5-fold CV; confirm the hybrid-vs-time-series ordering (hybrid helps PFPS, neutral/hurts ITBS). Then port to NGS: assemble pre-injury vs control play windows for 2022–2024 hamstring injuries; gate on player-separated CV AUC ≥ 0.65 for the hybrid CNN vs ≤ 0.60 for a point-values-only logistic baseline. If the CNN doesn't beat the baseline by ≥5pp AUC, the temporal dynamics carry no incremental signal — keep the baseline.

## 13. Acceptance / rejection gate
Accepted: large public dataset (839 records), 10-model comparison with reported grid search, strict volunteer-separated validation with honestly decreased metrics vs their prior work, triple-method explainability with consistency checks, and a concrete portable pipeline (hybrid temporal CNN + explainability + honest CV) that maps onto GSE's soft-tissue injury screening. Modest accuracies and no crisp biomechanical signature limit the paper's clinical claims but not the method's adaptability.

## 14. Improvement experiment
The authors' stated next step — portable sensing — is GSE's too: replace Vicon with smartphone/IMU-derived stride kinematics and test how much accuracy survives (the 1573 SkiC-LSTM architecture is the natural front end). Within GSE, the sharper experiment is prospective: train the screen on 2022–2023 pre-injury windows and test on 2024 injuries without retraining, measuring whether SHAP-identified risk factors (stride asymmetry, deceleration spikes) replicate out-of-sample — the true test of an injury-prevention signal vs a retrospective correlate.
