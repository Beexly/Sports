# [0354] AI-Enhanced Precision in Sport Taekwondo: Increasing Fairness, Speed, and Trust in Competition (FST.ai) (arXiv:2507.14657v2)

**Citation:** Keivan Shariatmadar, Ahmad Osman (2025). *AI-Enhanced Precision in Sport Taekwondo: Increasing Fairness, Speed, and Trust in Competition (FST.ai)*. arXiv:2507.14657v2. URL: https://arxiv.org/abs/2507.14657
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1607 lines).
**Verdict:** REJECT — a framework/vision paper with zero empirical results: no dataset, no measured accuracy, no validation study; every number in the paper is an explicitly labeled illustrative example, not a finding.

## 1. Research question
Can an AI system (pose estimation + temporal action recognition + impact analysis + edge inference + human-in-the-loop) replace/augment Instant Video Replay for Taekwondo head-kick scoring, cutting review time from ~90 seconds to seconds while improving consistency? The paper proposes the FST.ai framework and its phased implementation roadmap (with LA 2028 Olympic aspirations), but presents no built system evaluation — it is a design proposal.

## 2. Dataset / schema
No dataset described. The roadmap (§8, Phase 1) says the *first* step would be "curate annotated video datasets from historical matches" — i.e., data collection hasn't happened. The only real-world data cited: the Cadet World Championship 2025 Fujairah anecdote (one IVR review took ~90 s; 40 matches/court/day × 3 requests × 1.5 min = 180 min/day operational loss), used as motivation, not as a dataset. No schema, no sample sizes, no access.

## 3. Method / model
- **Proposed pipeline (6 steps):** (1) high-speed video capture >60 fps → preprocessing (histogram equalization, deblurring via Wiener/blind deconvolution); (2) OpenPose-style 2D pose estimation (18 joints, confidence maps + PAFs), joint tracking via Kalman filter or optical flow; (3) action segmentation via temporal sliding windows + CNN-LSTM/Transformer classifier on pose sequences (joint angles θ_i = ∠(p_{i−1},p_i,p_{i+1}), velocities v_i = |p_i^{(t)} − p_i^{(t−1)}|/Δt) → classes {slide, standard head kick, turning head kick}; (4) impact verification: foot deceleration a_i = (v_{i,t−1} − v_{i,t})/Δt > a_threshold AND IoU(foot bbox, head bbox) > 0.3, plus torso rotation > 90°/120°/150° (thresholds vary across sections) → 3 or 5 points; (5) jury prompt within 3–5 s with confidence + overlays; (6) logging S = (X, y_AI, y_jury) and feedback retraining.
- **Edge inference:** NVIDIA Jetson (Xavier named), TensorRT, INT8 quantization, pruning; stated design target T_total = T_pose + T_class + T_impact ≤ 200 ms per event.
- **Feedback loss:** L_feedback := λ_cross·CE(y_jury, y_AI) + λ_conf·|p_AI − p_jury|².
- **Ethics:** privacy-by-design (no raw video stored, only metadata), human-in-the-loop (D_final = D_AI if accepted else D_jury), explainability overlays, bias audits — all aspirational design principles, not implemented features with measurements.
- No architecture details beyond component names; no training procedure; no hyperparameters values beyond the formulas.

## 4. Equations & assumptions
Quoted from the paper (as numbered; note: equation numbers restart in §4, so there are two "(1)"s — I disambiguate):
- Preprocessing: I_t′ = normalize(deblur(hist_eq(I_t))). (§4.1, eq. 1)
- Kalman joint tracking: x̂_{t|t}^j = x̂_{t|t−1}^j + K_t(z_t^j − H x̂_{t|t−1}^j). (§4.2, eq. 2)
- Feedback retraining loss: L_feedback := λ_cross·CE(y_jury, y_AI) + λ_conf·|p_AI − p_jury|². (§4.6, eq. 3)
- Impact rule: a_i = (v_i^{(t−1)} − v_i^{(t)})/Δt > a_threshold and IoU(foot bbox, head bbox) > 0.3. (§3.3)
- Latency budget: T_total = T_pose + T_class + T_impact ≤ 200 ms. (§3.4)
- Pose function: f*_pose: I_t → P_t = {(x_i, y_i)}_{i=1}^K maximizing alignment with ground truth under confidence C_i. Classifier: f_class: R^{n×2K} → {A_1…A_m} maximizing P(A_j | {P}). (§3.1–3.2)
- **Assumptions:** pose estimation is reliable on fast combat motion; deceleration + IoU overlap reliably indicates contact (thresholds asserted, not calibrated); turning-kick rotation thresholds (90°/120°/150° — inconsistent across sections) separate 3- vs 5-point kicks; human jurors accept AI prompts within 3–5 s; edge hardware achieves the 200 ms budget (no measurement).

## 5. Features / target
- Inputs: multi-camera high-speed video (>60 fps) of the competition mat.
- Features (proposed): 18-joint 2D keypoints + confidences, joint angles, joint velocities/decelerations, foot–head bounding-box IoU, torso rotation angle.
- Targets: action class (slide / standard head kick / turning head kick) → point value (0/3/5) + confidence + rationale. Human jury makes the final call.

## 6. Validation design
None. There is no experiment, no train/val/test split, no baseline, no metric computed on data. §8 describes a six-phase roadmap whose Phase 3 ("offline testing... against historical matches") and Phase 4 ("pilot deployment") are future work. The "94.2% confidence" and "27% reduction" numbers in the text are presented inside explicitly labeled *examples*, not results tables.

## 7. Numerical results / baselines
**None stated.** Every number in the paper is an illustrative worked example, e.g.:
- §3.2 example: P(A_3) = 0.917, "Class = Turning Head Kick, Confidence = 91.7%" (example).
- §3.3 example: foot decelerates 4.1 → 0.6 m/s over 0.033 s (a ≈ 106 m/s²), IoU 36%, rotation 156° → 5 points (example).
- §3.4 example: T_pose = 9 ms, T_class = 43 ms, T_impact = 8 ms, total 60 ms (example, asserted not measured).
- §4.3 example: class vector y = [0.02, 0.04, 0.94], "94.2% confidence" (example).
- §4.4 example: deceleration 3.5 → 0.4 m/s over 0.033 s, a = 94 m/s², IoU 0.35 (example).
- §4.6 example: "In 12 matches, the AI misclassified a slide as a kick in 3 cases... reducing future false positives by 27% after retraining" (example).
- The 90-second IVR anecdote and 40×3×1.5 = 180 min/day arithmetic are motivation, not system results.
There are no baselines, no tables of measured performance, no confidence intervals. This paper contributes no empirical evidence.

## 8. Code / data availability
None stated. The R3AL.ai project page (https://r3al.ai/) is referenced as the project's home; no code repo, no dataset link.

## 9. Leakage & limitations
- **No empirical validation whatsoever:** the core deliverable — a validated head-kick detection system — does not exist in the paper. All performance claims ("high accuracy," "rigorously validated," "operationally tested" in §3.5's summary sentence) are contradicted by the absence of any experiment.
- **Inconsistent thresholds:** turning-kick rotation threshold is >90° in §3.3, >150° in the §3.3 example, >120° in §4.4 — the scoring rule isn't even self-consistent as a proposal.
- **Example-vs-result ambiguity:** a casual reader could mistake the worked examples for measured results; the paper's own language ("mathematically grounded, rigorously validated, and operationally tested") is misleading.
- **References of uneven quality:** several citations are to journals of questionable standing ("IEEE Edge Computing Journal," "AI Ethics Review," "Journal of Sport Technology and Ethics") with generic author lists — citation padding rather than evidence.
- **External validity to NFL:** nil. Taekwondo officiating assistance has no mapping to NFL prediction or analytics; the impact-detection idea (deceleration + spatial overlap) is a generic contact heuristic with no demonstrated transfer, and even its source-domain validity is untested.

## 10. GSE overlap
Per the existing-research-map: no officiating/combat-sports/computer-vision-for-refereeing lane exists in Garrett's corpus — the tracking lane is NGS metrics + STRAIN; nothing on pose-based action classification for scoring. Not a duplicate. The one conceptually portable element — the human-in-the-loop feedback-retraining loss (L_feedback combining jury-label cross-entropy with confidence calibration) — is a generic online-learning pattern with no GSE application (GSE has no human-jury labeling pipeline). Verdict: **no actionable overlap; REJECT on lack of evidence, not redundancy.**

## 11. GSE implementation spec
None warranted — REJECT. There is nothing validated to implement. For the record, if GSE ever needed a "human-overrides-AI" logging loop (e.g., Garrett overriding engine picks), the L_feedback pattern (λ_cross·CE(y_human, y_AI) + λ_conf·|p_AI − p_human|²) is a reasonable starting template for learning from overrides — but that is a two-line idea, not a build plan, and it requires a labeled override log GSE doesn't currently keep.

## 12. Reproducible test
Not possible — there is no system, no dataset, and no measured claim to reproduce. The only reproducible artifacts are the formulas in §4, which are standard (Kalman update, cross-entropy + MSE). If the authors later release an evaluated system, the test would be: fixed historical Taekwondo matches, metric = head-kick classification precision/recall and point-assignment accuracy vs expert panel, baseline = IVR jury alone, gate = ≥ jury accuracy with ≤ 5 s latency. None of this exists today.

## 13. Acceptance / rejection gate
- **Reject** — no empirical results, no dataset, no code, no measured baselines. A framework paper with zero validation cannot clear any evidence-based gate; the verdict stands regardless of how plausible the pipeline sounds.
- Reconsider only if a follow-up publication reports measured precision/recall on a fixed, released Taekwondo head-kick dataset with a human-jury baseline.

## 14. Improvement experiment
Within the paper's own lane: actually run Phase 3 of their roadmap — assemble a fixed dataset of ~500 annotated head-kick events from historical WT matches (with expert-panel labels for kick type and point value), implement the proposed pipeline (OpenPose → sliding-window CNN-LSTM → deceleration+IoU impact check), and report precision/recall for kick detection and point-assignment accuracy against the panel, with latency measured on a Jetson. Hypothesis: the uncalibrated thresholds (IoU > 0.3, rotation cutoffs) will fail on the first real dataset, and the informative result will be the *calibrated* thresholds — which is the actual scientific contribution this paper skips. Second arm: ablate the pipeline by removing the learned classifier entirely (pose heuristics + impact rule only) to test whether the deep learning adds anything over kinematics.
