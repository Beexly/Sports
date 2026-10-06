# [0355] Posture-Driven Action Intent Inference for Playing Style and Fatigue Assessment (arXiv:2507.11642v2)

**Citation:** Abhishek Jaiswal, Nisheeth Srivastava (2025). *Posture-Driven Action Intent Inference for Playing Style and Fatigue Assessment*. arXiv:2507.11642v2. URL: https://arxiv.org/abs/2507.11642
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract).
**Verdict:** ADAPT — posture/motion time-series intent classifier with a released pose dataset and honest cross-validation; the 1D-CNN and motion-range models are directly portable to NGS tracking kinematics for effort/intensity inference, which GSE's tracking lane currently lacks.

## 1. Research question
Can posture and motion data alone infer a batter's *intent* (aggressive/high-energy vs defensive/low-energy) in cricket, and can match statistics serve as weak supervision to validate predictions — opening a path to fatigue and playing-style assessment?

## 2. Dataset / schema
- **Cricket Shot Intent Dataset (CSID):** >2,500 shot clips extracted from YouTube cricket match videos across 11 folders (matches merged to reach shot counts); ODI, T20, and Test formats. Labels: high-energy (1235) / low-energy (1376), assigned by manual visual inspection of shot speed; ambiguous intermediate-energy shots intentionally excluded. Random verification by an independent annotator.
- Per-folder counts (high/low): F1 120/52, F2 75/12, F3 59/28, F4 187/44, F5 29/102, F6 17/108, F7 105/81, F8 452/733, F9 87/80, F10 86/65, F11 18/71.
- Pose extraction: Google MediaPipe Pose → per-frame joint coordinate CSVs, **released** (pose CSV dataset; visualizations in CSID-Visualisations supplementary folder).
- Clip length statistics: mean 54.3, median 50, mode 46, std 25.7, min 25, max 377 frames.
- Single-batter case study: 14 matches annotated video (443 high / 679 low shots) matched to 35 matches of match-analysis statistics by ball number ("over").

## 3. Method / model
- **Shot segmentation pipeline:** YOLO person detector per frame → heuristic identifies the batter by typical pre-shot screen position → tracks batter within a fixed-width screen region; when the batter exits (camera follows ball), shot clip ends. MediaPipe Pose applied to the clip → joint time series.
- **Feature inputs:** shoulder, elbow, wrist, hip, knee, ankle, heel (x,y) for all models; 2s-AGCN additionally uses nose joint + joint detection confidence scores.
- **Preprocessing:** drop first 10 frames of each series, cap at 50 frames.
- **Models compared:** (1) 1D CNN — 1D convolutions over multivariate joint time series; (2) LSTM; (3) LSTM autoencoder (joint reconstruction + classification loss); (4) Motion Range model — per-feature (max−min) over time → Random Forest; (5) Two-Stream Adaptive Graph CNN (2s-AGCN, Shi et al. 2019; reduced from 9 to 3 AGCN blocks per Jaiswal & Srivastava 2024 to limit overfitting; streams = joint positions + bone vectors).
- **Training:** early stopping on F1, up to 2500 epochs.
- **Weak-supervision validation:** shot energy from match statistics heuristic — runs ≥ 3 on a ball → high-energy, runs ≤ 1 → low-energy; eight-field-region shot distributions compared between model predictions and stats-derived approximations (distribution deviation, average proportion deviation).

## 4. Equations & assumptions
- Feature: joint angle θ_i = ∠(p_{i−1}, p_i, p_{i+1}); joint velocity v_i = |p_i^{(t)} − p_i^{(t−1)}|/Δt (definitions as given in the pipeline description).
- Motion-range feature: r_j = max_t(x_j^{(t)}) − min_t(x_j^{(t)}) per feature j, fed to Random Forest.
- LSTM autoencoder joint loss: L = L_reconstruction + L_classification (combined loss over encoder–decoder and classifier).
- Weak-supervision heuristic: E(ball) = high if runs ≥ 3, low if runs ≤ 1 (runs = 2 discarded).
- 2s-AGCN: adaptive graph topology learning on skeleton sequences; two streams fusing joint-position and bone-vector dynamics (Shi et al. 2019 formulation, 3-block reduction).
- **Assumptions:** shot speed (human-judged) is a valid proxy for intent; energy ≡ aggressiveness; excluding the intermediate-energy middle doesn't bias the task beyond scope; MediaPipe pose noise is tolerable (mitigated via confidence inputs in 2s-AGCN); runs-per-ball is a usable weak label despite region-dependent violations (they document the behind-the-batter failure explicitly).

## 5. Features / target
- Inputs: multivariate pose time series (14 joint coordinates for most models; 15 joints + confidences for 2s-AGCN), ≤ 50 frames.
- Target: binary shot intent — high-energy (aggressive) vs low-energy (defensive).
- Case study adds: eight-region shot distribution per batter, over-range (0–10 … 40+) energy summaries, per-bowler energy splits.

## 6. Validation design
- **Ordered leave-pair-out cross-validation across the 11 folders:** each iteration → 1 folder validation, 1 folder test, 9 train; ¹¹P₂ = 110 permutation runs. Mean ± std + 95% CI reported per metric. Motion-range model evaluated with leave-one-out CV (needs no validation set).
- **External weak-supervision check:** model-predicted 8-region shot-energy distributions vs match-statistics-derived distributions (35 matches) and vs ground truth proportions (14 matches) — distribution deviation and average proportion deviation.
- **Baselines:** random predictor; runs-based heuristic approximation.
- Single-batter generalization test: models trained on multi-batter data evaluated on one batter's 14-match set.

## 7. Numerical results / baselines
Main results (110-run leave-pair-out CV, mean ± std [95% CI]):
- 2s-AGCN: Acc 0.78 ± 0.10 [0.76, 0.80]; AUC-ROC 0.87 ± 0.06 [0.86, 0.88]; F1 0.78 ± 0.12 [0.75, 0.80] — best, but heavier.
- 1D CNN: Acc 0.77 ± 0.07 [0.75, 0.78]; AUC 0.83 ± 0.07 [0.82, 0.85]; F1 0.77 ± 0.08 [0.76, 0.78] — selected for follow-ups (simple, near-real-time, tightest CIs).
- LSTM: Acc 0.75 ± 0.10 [0.73, 0.76]; AUC 0.81 ± 0.08 [0.80, 0.83]; F1 0.71 ± 0.14 [0.68, 0.73].
- LSTM AE: Acc 0.73 ± 0.14 [0.70, 0.76]; AUC 0.79 ± 0.13 [0.77, 0.81]; F1 0.72 ± 0.18 [0.69, 0.75].
- Motion Range (LOOCV): Acc 0.73 ± 0.10 [0.66, 0.80]; AUC 0.79 ± 0.09 [0.73, 0.85]; F1 0.70 ± 0.12 [0.62, 0.78].
- Clip-length ablation (1D CNN): 3 frames → F1 0.58; 20 → 0.65; 30 → 0.71; 40 → 0.75; 60–70 → 0.78; 80 → 0.79 (plateau at ~80 frames ≈ mean + 1 std; intent detectable even at 30–40 frames, before the mean clip length of 55).
- Single-batter test set (Table 4): 2s-AGCN Acc 0.74 / AUC 0.81 / F1 0.73; 1D CNN 0.74 / 0.76 / 0.73; LSTM 0.68 / 0.72 / 0.64; motion range 0.67 / 0.72 / 0.57.
- Baseline comparison (Table 6, 14-match single-batter data, 443 high / 679 low): Random — Acc 46.9%, distribution deviation 34.90, avg proportion deviation 14.9; Runs-approx heuristic — 66.2%, 28.97, 22.3; **1D-CNN — 71.4%, 15.69, 5.6** (best on all three).
- Region proportion deviations (Table 5): model within ±5 points of ground truth high-ratio for most regions; worst at fine leg (true 0.33 vs model 0.22) and point (0.39 vs 0.50), attributed to sample size/noise.
- Kohli case study (3rd ODI, IND v SA, Cape Town 2018; 160 off 159): energy ramp 0–10 overs → 22 low / 6 high; 40+ overs → 9 low / 17 high; bowler split e.g. Tahir 17 high / 5 low vs Ngidi 2 high / 12 low.

## 8. Code / data availability
- Pose CSV dataset released (CSID); visualizations in CSID-Visualisations supplementary folder; supplementary file §§1–3 cover ground-truth distributions, region shot counts, cricket term definitions. YouTube source video identified (VIVEK 2025 reference). No explicit code repo link in the text.

## 9. Leakage & limitations
- **Label subjectivity:** high/low-energy labels come from human visual judgment of shot speed — the classifier may be learning annotator heuristics rather than "intent" per se. Independent verification was only on a random subset.
- **Spectrum truncation:** deliberately excluding intermediate-energy shots inflates separability; real-world deployment sees the full continuum and performance will degrade.
- **Weak-supervision heuristic is noisy:** runs ≥ 3 / ≤ 1 mislabels energy in regions like behind the batter (authors acknowledge the violation); the validation is approximate by design.
- **Single-batter validation is n = 1 batter:** playing-style generalization claims rest on one cricketer's 14 matches.
- **No external cricket-beyond-YouTube replication:** all clips from YouTube broadcast video; pose quality on other sources untested.
- **Transfer caution:** results are cricket-shot-specific; the fatigue-assessment application (the paper's motivating claim) is demonstrated only as shot-energy profiling, not as a validated fatigue/injury detector.

## 10. GSE overlap
Per the existing-research-map: Garrett's corpus has NGS tracking + STRAIN as the kinematics lane; no posture-based intent/effort inference work; cricket as a source domain is novel. Not a duplicate — but the *method family* (skeleton/kinematic time-series classification) is new to the corpus, so this is a genuine lane extension, not redundant coverage.

## 11. GSE implementation spec
ADAPT the two simplest components to NGS tracking data, where pose is replaced by player kinematics:
- **(a) Motion-range effort feature:** for each NGS-tracked ball-carrier or rusher play, compute per-frame (x, y, speed) and derive per-play range features r_j = max−min (speed range, lateral displacement range, direction-change count) → Random Forest predicting "high-effort vs routine" plays. This mirrors the paper's motion-range model exactly and needs no deep learning; it gives GSE a first effort/intensity label from tracking data it already has.
- **(b) 1D-CNN effort classifier on tracking frames:** multivariate time series (speed, acceleration, x, y, orientation at 10 Hz for the ball-carrier window) → binary effort class, trained on plays labeled by a weak-supervision analog of the runs-heuristic: e.g., broken tackles / yards-after-contact ≥ threshold → high-effort; label via existing charting data. Validate with the paper's leave-pair-out analog: leave-game-pair-out CV across games to get honest variance estimates.
- **(c) In-game energy profiling (Kohli analog):** per-player high-effort play share by quarter/phase → fatigue/injury-risk signal; flag deviations from a player's baseline (the paper's stated playing-style/fatigue use case maps directly to "is this RB's burst declining in the 4th quarter").
- Do NOT port: the cricket-specific segmentation pipeline (YOLO + fixed-screen-region tracking is a broadcast-video artifact; NGS gives clean per-player tracks).

## 12. Reproducible test
- **Data:** nflverse/NGS tracking week(s) with play-level charting (broken tackles, YAC) as weak labels; hold out 2 full games as test (game-pair-out CV analog, mirroring their ¹¹P₂ design at the play level across weeks).
- **Pipeline:** (1) per-play ball-carrier speed/accel time series, drop first N frames (pre-snap), cap length; (2) train 1D-CNN + motion-range Random Forest on weak labels; (3) report mean ± std and 95% CI across CV folds; (4) baselines: random + naive heuristic (e.g., max speed threshold).
- **Pass gate:** AUC-ROC ≥ 0.80 and F1 ≥ 0.75 with CIs not crossing 0.70 (matching the paper's bar), on the held-out games. **Fail gate:** motion-range RF matches the 1D-CNN within CIs → ship the RF (simpler, interpretable).
- **Second test (energy profiling):** per-RB high-effort share by quarter vs 4th-quarter YPC drop; report correlation — if effort share predicts late-game efficiency decline, the fatigue application transfers.

## 13. Acceptance / rejection gate
- **Accept the paper as evidence** that kinematic time-series intent classification works at ~0.78 F1 / 0.87 AUC under honest leave-pair-out CV — the validation design (110 permutation runs, CIs, external stats-based validation, baselines) clears the evidence bar.
- **Gate the GSE port on the reproducible test above:** only ship an effort-intensity feature to GSE if it hits the AUC ≥ 0.80 gate on held-out NFL games with the weak-label pipeline. Do not generalize to injury prediction without a separate validation study.

## 14. Improvement experiment
- **(i) Label de-subjectivization:** replicate the paper's experiment but replace human shot-speed labels with instrumented labels (bat-sensor swing speed) — tests whether the 0.78 F1 survives objective ground truth; expect a drop, which would quantify the annotator-heuristic bias.
- **(ii) Full-spectrum classification:** re-include the excluded intermediate-energy shots as a third class or ordinal regression — tests whether the binary 0.78 F1 was an artifact of spectrum truncation; if three-class accuracy collapses, the practical deployment value is lower than reported.
- **(iii) GSE-side improvement:** replace NGS speed/accel with *derived burst features* (acceleration peaks, deceleration rate into contact — borrowing the deceleration-into-contact idea) and test whether adding a contact-window feature (frames ±0.3 s around first contact) beats the whole-play series — the hypothesis is that intent/effort concentrates at contact, and a contact-gated 1D-CNN should match full-series performance at lower latency, enabling near-real-time in-game effort tracking.
