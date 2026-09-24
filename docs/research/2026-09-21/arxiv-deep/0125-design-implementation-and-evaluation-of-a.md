# [0125] Design, Implementation and Evaluation of a Real-Time Remote Photoplethysmography (rPPG) Acquisition System for Non-Invasive Vital Sign Monitoring (arXiv:2508.18787)

**Citation:** Constantino Álvarez Casado et al. (2025). *Design, Implementation and Evaluation of a Real-Time Remote Photoplethysmography (rPPG) Acquisition System for Non-Invasive Vital Sign Monitoring*. arXiv:2508.18787v1. URL: https://arxiv.org/abs/2508.18787v1
**Ledger completed:** 2026-09-21. **Read:** full text via ar5iv HTML.
**Verdict:** REJECT for GSE — a well-executed real-time computer-vision health-monitoring system with no application surface in GSE's sports-intelligence stack.

## 1. Research question
Can a C++ real-time pipeline extract heart-rate (and related vital signs) from ordinary camera video with laboratory-grade accuracy while sustaining 30+ fps on commodity hardware — and can it be served over REST/MJPEG for remote monitoring?

## 2. Dataset / schema
Four public rPPG benchmarks (Section IV): COHFACE (160 videos, 40 subjects, 20 Hz ground truth), LGI-PPGI (24 videos, 6 subjects, 25 Hz), UBFC1 (8 videos), UBFC2 (42 videos, 30 Hz), PURE (60 videos, 10 subjects, 30 Hz). Standard splits as published with each dataset; ground truth = contact PPG/ECG heart rate.

## 3. Method / model
Face2PPG, a C++14 multi-threaded pipeline (Section III): camera thread → GUI thread → processing thread → REST thread + MJPEG thread. Per frame: face detection/alignment, geometric ROI extraction, RGB→CIE-Lab color-space conversion, 12-second rolling buffer, 61-tap FIR band-pass filter, FFT/Welch spectral heart-rate estimation. Main loop every 33 ms targeting 30 fps. REST endpoint /vhealth on port 8080; MJPEG streams on port 8081. Two real-time configs (RT Config 1/2) vs two server configs (Normalized, Multiregion).

## 4. Equations & assumptions
Equations (1)–(10) as stated (transcribed from ar5iv HTML; standard color-science formulas, verified against known references):
(1)–(3) RGB normalization and gamma correction: r_lin = (R/255)^γ piecewise linearization (sRGB companding).
(4)–(6) RGB→XYZ conversion via the standard 3×3 sRGB matrix.
(7)–(9) XYZ→CIE-Lab: L* = 116·f(Y/Y_n) − 16; a* = 500·[f(X/X_n) − f(Y/Y_n)]; b* = 200·[f(Y/Y_n) − f(Z/Z_n)], with f(t) = t^(1/3) for t > δ³ else t/(3δ²) + 4/29.
(10) FIR band-pass design (61 taps, passband covering the physiological heart-rate range).
Assumptions: frontal face visible; stable illumination; subject relatively still; 12 s buffer sufficient for spectral resolution; camera frame rate ≥ 20 Hz.

## 5. Features / target
Input features: per-frame facial ROI Lab-channel time series (12 s rolling window). Target: heart rate (bpm) via dominant spectral peak; secondary outputs (HRV-class metrics) mentioned but not evaluated. Prediction horizon: real-time, per-frame update.

## 6. Validation design
Evaluated on the four public datasets' standard protocols; baselines = the paper's own server-side configs vs real-time configs (no external SOTA rPPG method comparison — e.g., no POS/CHROM/DeepPhys baselines, "Not stated in paper"). Metrics: MAE ± std (bpm) and Pearson correlation (PCC) vs contact ground truth.

## 7. Numerical results / baselines
Table 2 (MAE ± std / PCC, exact): Server Multiregion — LGI-PPGI 4.5±3.3/0.57, COHFACE 8.0±4.4/0.06, UBFC1 0.9±0.4/0.96, UBFC2 0.9±0.9/0.98; RT Config 1 — 6.4±6.8/0.45, 10.8±5.5/−0.04, 1.4±0.5/0.80, 4.7±4.6/0.72; RT Config 2 — 5.9±8.0/0.49, 11.3±7.3/−0.01, 1.5±1.2/0.83, 6.7±6.1/0.54. Table 3 (speed): RT1 14.11 ms/frame (71 FPS), RT2 9.69 ms/frame (103 FPS), Server Normalized 116.46 ms/frame (8.59 FPS), Server Multiregion 221.87 ms/frame (4.51 FPS). Note COHFACE PCC ≈ 0.06/−0.04/−0.01 — the method fails on that dataset's compressed video; the paper reports it honestly.

## 8. Code / data availability
"Not stated in paper" — no repository URL given in the text; datasets are the standard public ones (COHFACE, LGI-PPGI, UBFC1/2, PURE).

## 9. Leakage & limitations
Adversarial read: (a) no comparison against standard rPPG baselines (POS, CHROM, ICA-based, or learned methods) — only self-comparison across configs; (b) COHFACE failure (PCC ≈ 0) suggests brittleness to compression/artifacts, which is exactly the real-world condition; (c) still-subject assumption limits practical deployment; (d) no arrhythmia/HRV clinical validation despite "vital sign monitoring" framing; (e) NFL/GSE overlap: none — GSE has no camera-based or biometric data source.

## 10. GSE overlap
From existing-research-map.md: no computer-vision, biometric, or health-monitoring research anywhere in the corpus. No duplication. The only transferable lesson is generic: multi-threaded producer/consumer pipeline design with lock-free queues for real-time edge processing — a software-engineering pattern, not a research asset.

## 11. GSE implementation spec
No implementation. REJECT — there is no camera/biometric data in GSE's pipeline and no planned product that needs it. The one reusable engineering idea (thread-per-stage pipeline with a rolling buffer and REST/MJPEG serving) is standard practice and needs no paper to justify.

## 12. Reproducible test
Not applicable — no GSE test warranted.

## 13. Acceptance / rejection gate
REJECT for GSE: zero application surface (no biometric inputs, no health-monitoring product, no video pipeline in the stack). Revisit only if GSE ever ingests broadcast video for analysis — and even then, the relevant papers would be pose/tracking work, not rPPG.

## 14. Improvement experiment
One follow-up (for the paper's own program, not GSE): add a compression-robustness study — re-encode PURE/UBFC2 at the COHFACE-equivalent bitrate ladder and report MAE/PCC vs bitrate, with a learned ROI-weighting baseline (e.g., attention over facial regions) to test whether the COHFACE failure is recoverable. Dataset: PURE + UBFC2 re-encoded. Metric: PCC at each bitrate rung. Gate: attention-ROI beats fixed geometric ROI by ≥0.1 PCC at the lowest bitrate.
