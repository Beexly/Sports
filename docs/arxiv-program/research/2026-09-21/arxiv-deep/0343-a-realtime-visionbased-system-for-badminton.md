# [0343] A Real-Time, Vision-Based System for Badminton Smash Speed Estimation on Mobile Devices (arXiv:2509.05334v1)

**Citation:** Diwen Huang (2026). *A Real-Time, Vision-Based System for Badminton Smash Speed Estimation on Mobile Devices*. arXiv:2509.05334v1. URL: https://arxiv.org/abs/2509.05334v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 368 lines).
**Verdict:** REJECT — the validation is fatally weak (n=20, single player, MAE 66.41 km/h against radar, user-set scale calibration), so the speed-accuracy claims are unsupported; the engineering pattern (detect → Kalman → scale-convert) is textbook and offers GSE nothing new.

## 1. Research question
Can a smartphone camera estimate badminton smash speeds in real time, as a cheap alternative to a radar gun? The system detects the shuttlecock with YOLOv5, tracks it with a constant-velocity Kalman filter, converts pixel displacement to real-world speed via a user-supplied scale factor, and reports the smash speed on-device.

## 2. Dataset / schema
- **Custom detection dataset:** 15,000 images of shuttlecocks in perpendicular view; YOLOv5 reported at 93% precision, 87% recall, 91% mAP@0.5. Collection protocol and labeling procedure not detailed in the extracted text.
- **Validation set:** 20 smashes by one skilled player, filmed on an iPhone 16 at 30 fps, with a Bushnell Speedster III radar gun as reference. The paper's Table (trial table) lists all 20 raw radar, peak-vision, and at-net values.
- Access: YOLOv5 is public (cited); no project-specific code or data link stated.

## 3. Method / model
YOLOv5 shuttlecock detector (confidence threshold 0.1, IoU 0.45) on perpendicular-view video. Detections scored by a composite \(S = 0.3\,C_{\text{YOLO}} + 0.7\,P_K\), where \(P_K = \max(0, 1 - d/(W_{\text{frame}}/4))\) rewards detections near the expected region (d = distance, W_frame = frame width). Constant-velocity Kalman filter for trajectory smoothing; manual trajectory correction is allowed. Scale: the user supplies the real-world scale \(S_f = d_{\text{real}}/d_{\text{pixel}}\) (e.g., by measuring a known court dimension on screen). Speed = pixel displacement of the shuttlecock's leading edge between consecutive frames / frame time × scale × 3.6 (→ km/h). Implied speeds <5 or >375 km/h are rejected as invalid.

## 4. Equations & assumptions
- Scale factor: \(S_f = d_{\text{real}}/d_{\text{pixel}}\) (user-supplied).
- Kalman proximity score: \(P_K = \max(0, 1 - d/(W_{\text{frame}}/4))\).
- Composite detection score: \(S = 0.3\,C_{\text{YOLO}} + 0.7\,P_K\).
- Speed: \(v = (\Delta \text{pixels} / \Delta t) \times S_f \times 3.6\) km/h.
- Assumptions: (1) camera is strictly perpendicular to the smash plane (2D projection = true motion); (2) user-supplied scale is accurate; (3) constant velocity between frames; (4) the shuttlecock's leading edge is the correct measurement point; (5) 30 fps sampling resolves the speed peak.

## 5. Features / target
Input features: smartphone video frames (30 fps), YOLOv5 detection boxes/confidences, user-supplied court scale. Target: smash speed in km/h (peak vision speed and at-net speed reported per trial).

## 6. Validation design
20 smashes, one player, one phone, one radar gun. No train/test split for the speed estimator (it's a deterministic pipeline); no cross-player, cross-device, or cross-venue validation; no confidence intervals. Comparison is vision speed vs. radar speed per trial. Manual trajectory correction was permitted during validation, which contaminates the "automatic system" claim.

## 7. Numerical results / baselines
- Detector (custom 15k-image set): **93% precision, 87% recall, 91% mAP@0.5**.
- Peak vision-vs-radar disagreement over 20 trials: **MAE 66.41 km/h, RMSE 74.68 km/h**. The authors attribute this to impact-speed vs. later radar lock and claim at-net values align — but no at-net aggregate error (MAE/RMSE) is reported, only the raw 20-trial table.
- A 66 km/h MAE on smash speeds (typically 200–400 km/h) is a ~20–30% relative error — far too large for any serious measurement use, and the paper's main quantitative result.

## 8. Code / data availability
None stated for the project (no code or data link). YOLOv5 source cited (public).

## 9. Leakage & limitations
- **The headline error is disqualifying:** MAE 66.41 km/h vs. radar is explained away ("impact speed vs. later radar lock") rather than independently validated — if the radar is right, the system is wrong by 66 km/h; if the system is right, the paper provides no independent evidence. Either way the validation fails to establish accuracy.
- n=20, one player, one phone, one session — no basis for any generalization claim; no confidence intervals.
- User-supplied scale factor: the entire speed estimate scales linearly with a hand-measured number — uncalibrated-user error propagates 1:1 and is unquantified.
- Strict perpendicular-view assumption: any cross-court angle underestimates true speed (cosine error); real badminton (and any NFL analog) is never perfectly perpendicular.
- Manual trajectory correction allowed during validation — the reported numbers are not those of an automatic system.
- 30 fps sampling of a ~300 km/h shuttlecock (~2.8 m/frame) cannot resolve the true peak; the "peak" is an aliased sample.
- No comparison against any baseline method (even a simpler detector or a higher-fps camera).
- NFL external validity: none — badminton smash speed has no NFL analog, and the pipeline (detect → Kalman → scale) is standard practice with no novel transferable component.

## 10. GSE overlap
Per the existing-research map: GSE's tracking/NGS lane (27-family taxonomy, NGS replacement spec, STRAIN) already works with professionally measured speed data (NGS top speed etc.) — far more accurate than anything this paper demonstrates. The paper's contribution (phone-based speed estimation) is a **new capability** in the trivial sense, but one GSE has no use for: GSE does not need to replace radar-measured or NGS-measured speeds with a ±66 km/h phone estimate. No duplication, no value.

## 11. GSE implementation spec
None recommended — REJECT verdict. If GSE ever needed sideline speed estimation from video (it does not; NGS provides it), the correct implementation would be: calibrated multi-camera setup (not user scale), ≥120 fps capture, sub-pixel leading-edge localization, and validation against NGS ground truth with n≥500 across players and venues — i.e., a different system, not this one. Estimated effort for a proper build: 6–8 engineer-weeks, justified only if NGS data access were lost.

## 12. Reproducible test
Not applicable (REJECT). The paper's own test protocol — 20 trials vs. a radar gun — is the test, and it returned MAE 66.41 km/h, which fails any reasonable gate. Re-running it on NFL data would test nothing GSE needs.

## 13. Acceptance / rejection gate
**Reject.** Predeclared gate for reference: adopt a vision speed estimator only if it achieves MAE ≤5 km/h vs. NGS-measured ball-carrier/QB-throw speeds on ≥500 plays across ≥10 games with no manual correction and no user-supplied scale. This paper's MAE of 66.41 km/h on n=20 with manual correction allowed misses that gate by an order of magnitude.

## 14. Improvement experiment
If one were to salvage the idea: replace the user scale with automatic court-line calibration (detect court lines, solve the homography, derive scale per frame), capture at 240 fps to resolve the true peak, and validate against a high-speed reference (not a consumer radar gun) with n≥200 across ≥10 players. The experiment would test whether the 66 km/h MAE was a frame-rate/aliasing artifact or a fundamental tracking failure — but given NGS already measures NFL speeds, this experiment belongs to badminton, not GSE.
