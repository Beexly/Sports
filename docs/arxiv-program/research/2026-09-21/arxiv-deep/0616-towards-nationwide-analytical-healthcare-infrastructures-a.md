# [0616] Towards nation-wide analytical healthcare infrastructures: A privacy-preserving augmented knee rehabilitation case study (arXiv:2412.20733v1)

**Citation:** Boris Bačić, Claudiu Vasile, Chengwei Feng, and Marian G. Ciucă (2024). *Towards nation-wide analytical healthcare infrastructures: A privacy-preserving augmented knee rehabilitation case study*. arXiv:2412.20733v1. URL: https://arxiv.org/abs/2412.20733v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 508 lines).
**Verdict:** REJECT — a single-subject, self-reported proof of concept with no independent validation; not usable for any GSE prediction task, though the local pose-extraction pipeline is a narrow, documented technique.

## 1. Research question
Can a privacy-preserving, smartphone-based pipeline (pose estimation + joint-angle computation + peak detection) automatically count knee-rehabilitation exercise repetitions at home, as a proof of concept for nation-wide analytical healthcare infrastructure?

## 2. Dataset / schema
- 9 videos recorded on an iPhone SE (iOS 15.8.3), camera at approximately waist height, 1080p at 30 fps.
- 179 total exercises performed by a single subject (the first author — self-reported rehabilitation case; "broader end-user population" videos transferred from the iPhone SE, but no other subjects are described).
- Schema: MediaPipe 3D body landmarks per frame (hip, knee, ankle, foot-index); derived knee-angle time series; repetition counts.
- Access: no public data release stated.

## 3. Method / model
- Google MediaPipe pose estimation → 3D landmarks (hip/knee/ankle/foot-index).
- Knee angle between thigh and calf computed via the cosine law (equation (1) in the paper).
- Repetition counting: mean-centering of the angle signal, standard-deviation threshold STD_TRESHOLD = 0.5 (tuned for FP vs FN ratio), minimum peak distance/frequency = 4.
- Privacy claim: exporting pose-estimation CSV instead of video is presented as privacy-preserving; no formal anonymization analysis is performed.

## 4. Equations & assumptions
- Knee angle (paper's equation 1): ∠ABC = cos⁻¹((BC² + AB² − AC²) / (2·BC·AB)), where A=hip, B=knee, C=ankle landmarks. The paper also restates the law of cosines / cosine theorem in equations (2)–(3) in garbled extracted form.
- Assumptions: (a) MediaPipe landmarks are accurate enough for clinical-adjacent counting; (b) threshold 0.5 and min peak distance 4 generalize; (c) pose CSV export constitutes privacy preservation; (d) the single subject's movement is representative.

## 5. Features / target
- Input features: per-frame knee joint angle time series from MediaPipe landmarks.
- Target: repetition count per exercise video (side-view and front-view).

## 6. Validation design
- No holdout, no independent subjects, no blinded human labels. The same 9 videos / 179 exercises used to develop the thresholding algorithm are the basis of the accuracy claim. No comparison against a blinded human counter or any clinical ground truth (e.g., IMU).

## 7. Numerical results / baselines
- Claimed counting accuracy: 91.67%–100% of exercises correctly identified, from side- and front-view rehabilitation videos (paper's abstract and §4 numbers).
- Algorithm parameters: STD_TRESHOLD = 0.5; minimum peak distance/frequency = 4; 179 total exercises across 9 videos.
- No baseline comparison reported (no human-counter agreement, no alternative algorithm).

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- N=1, self-reported, first-author subject: the accuracy claim is development-set performance tuned on the same data (threshold explicitly tuned for FP/FN ratio on these videos).
- No independent test subjects, no blinded labels, no clinical validation — the "91.67%–100%" number has no inferential meaning.
- The privacy claim is asserted, not demonstrated: pose CSVs retain identifiable gait biometrics; no anonymization proof or re-identification analysis.
- No control for camera angle, clothing, lighting, or exercise type variation.
- External validity to NFL: none for prediction. The map's gap list mentions causal injury work — this paper does not qualify as injury science; it is an unvalidated rep-counter.

## 10. GSE overlap
Per the existing-research map (2026-09-21): nothing in Garrett's corpus covers rehab rep-counting or pose-based physiotherapy, so there is no duplication — but also no usable overlap. The map lists causal injury work as a gap; this paper does not fill it (no injury mechanism, no cohort, no outcomes). Verdict stands: **not a duplicate, but not a capability either** — REJECT for GSE modeling purposes.

## 11. GSE implementation spec
No GSE prediction build is recommended. The only narrow, documented transfer: if GSE ever needs local biomechanical video analysis (e.g., filming a prospect's movement privately), the MediaPipe → joint-angle → peak-detection pipeline is a reasonable starting template, run fully on-device. Estimated effort for the narrow template: 2–3 days. No model, no serving, no integration with GSE predictions.

## 12. Reproducible test
Were GSE ever to use rep-counting (not currently planned): collect ≥20 independent subjects, ≥5 exercises each, filmed on phones; blinded human counters as ground truth; metric = exact-count agreement rate. Baseline to beat: a naive zero-crossing counter. The paper's method would need to be re-tuned from scratch since its thresholds were fit to N=1.

## 13. Acceptance / rejection gate
REJECT for all GSE prediction use now. Reconsider ONLY if an independent replication on ≥20 subjects with blinded human labels achieves ≥95% exact-count agreement AND a privacy analysis demonstrates non-identifiability of exported pose data. Gate fixed before any such replication.

## 14. Improvement experiment
A real study: synchronized smartphone video + wearable IMU ground truth across ≥50 post-surgical patients, with blinded physiotherapist rep counts, testing whether pose-based counting matches IMU within ±1 rep on ≥95% of sets and whether on-device processing measurably reduces re-identification risk versus cloud video upload. This goes beyond the paper by replacing the N=1 self-report with a validated, privacy-audited design.
