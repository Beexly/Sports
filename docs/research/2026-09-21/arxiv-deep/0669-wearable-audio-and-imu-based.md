# [0669] Wearable Audio and IMU Based Shot Detection in Racquet Sports (arXiv:1805.05456v1)

**Citation:** Manish Sharma, Akash Anand, Rupika Srivastava, Lakshmi Kaligounder (2018). *Wearable Audio and IMU Based Shot Detection in Racquet Sports*. arXiv:1805.05456v1. URL: https://arxiv.org/abs/1805.05456v1
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/1805.05456.txt`; all 9 sections + references in full).
**Verdict:** REJECT — a table-tennis wrist-wearable (smartwatch) shot-detection paper with no GSE application: wrong sport, wrong sensor modality (microphone audio + wrist IMU; GSE has no audio data and no wearable data), and no transferable method for NFL prediction or calibration. Read as pool-reserve replacement for the rejected 2206.13222v1. (Replacement for this reject: fresh-search paper in the betting-market-efficiency territory.)

## 1. Research question
Can a wrist-worn wearable (smartwatch) detect table-tennis shots in real time by fusing microphone audio and IMU (accelerometer + gyroscope) data, including a method to synchronize the two asynchronously-acquired sensor streams using the detected shots themselves?

## 2. Dataset / schema
- ~650 table-tennis shots from 8 players (intermediate and professional), collected on a Samsung Gear S2 smartwatch: audio at 8 kHz, IMU at 100 Hz (accelerometer ±8 g, gyroscope ±2000 deg/s); video from a Samsung S6 smartphone at 30 fps used for manual shot tagging via an in-house tool.
- 80% train / 20% cross-validation split; results reported on the CV set. Shot/non-shot audio sequences sampled 1:20.
- Access: proprietary to the authors; no public release stated.

## 3. Method / model
- Audio branch: short-time energy E[i] = Σ s_k² over 10 ms microframes; Audio Peak Function APF[i] = E[i] − (1/11)Σ_{j=i−5}^{i+5} E[j]; preceded by a 23-tap FIR filter whose weights and threshold bias are learned by backpropagating a hinge-style classification loss through the pipeline (filtering → STE → APF → threshold) with Adam; decision rule shot if APF[i]+bias > 0.
- IMU branch: radial acceleration a_rad = a_x and tangential angular velocity ω_tan = sqrt(ω_y²+ω_z²), IIR low-passed at 10 Hz; IMU Peak Function IPF[i] = (a_x[i] − Σ_{j=i−4}^{i+5} a_x[j]) × (ω_tan[i] − Σ_{j=i−4}^{i+5} ω_tan[j]).
- Synchronization: quintile-quantize APF/IPF, triangle-smooth (1,2,3,4,3,2,1), maximize cross-correlation → offset (example: −270 ms, peak 0.6); mean absolute alignment error 32 ms on 20 s snippets.
- Combined detector: IPF local maxima (500 ms neighborhood) → candidate points; features = max APF, IPF, a_rad, a_tan, ω_rad near candidates; pre-trained classifier (SVM-RBF or 50-tree random forest); consecutive shot neighborhoods deduplicated.

## 4. Equations & assumptions
- E[i] = Σ_{s_k ∈ i-th microframe} s_k² (Eq. 1).
- APF[i] = E[i] − (1/11)Σ_{j=i−5}^{i+5} E[j] (Eq. 2).
- Loss[i] = −(APF[i]+bias) if y=1,ŷ=0; +(APF[i]+bias) if y=0,ŷ=1; 0 otherwise.
- a_rad = a_x, a_tan = sqrt(a_y²+a_z²); ω_rad = ω_x, ω_tan = sqrt(ω_y²+ω_z²) (Eqs. 6–7).
- IPF[i] = (a_x[i] − Σ_{j=i−4}^{i+5} a_x[j]) × (ω_tan[i] − Σ_{j=i−4}^{i+5} ω_tan[j]) (Eq. 8).
- Assumed: impact audio impulse and peak arm speed coincide in time; swing ≈ circular motion with the x-axis along the forearm; microphone captures a usable 10–20 ms impact transient.

## 5. Features / target
- Target: binary shot/non-shot per microframe/neighborhood in table-tennis play.
- Features: STE-derived APF from audio; radial acceleration and tangential angular velocity peak functions from IMU; fused candidate-point maxima of the five signal features.

## 6. Validation design
- Single 80/20 split on the 650-shot author-collected set; no held-out players, no cross-device or cross-sport validation. Baselines: Zhang et al. audio EPD (F 42%), EPD+MBR (F 81%), Srivastava Pan-Tompkins IMU on the authors' data (F 55%).

## 7. Numerical results / baselines
- Audio branch: IIR(10 taps)+APF F-score 75%; trained 23-tap filter+APF F-score 80% (precision 85%, recall 75%), comparable to EPD+MBR (F 81%).
- IMU branch: IPF F-score 78% (precision 73%, recall 83%) vs Srivastava on their data (F 55%).
- Combined: SVM-RBF F 91.5% (P 88.4%, R 94.8%); random forest (50 trees) F-score 95.6% (precision 97.3%, recall 93.9%) — ~15 pp improvement over either sensor alone. Authors note 62% of table-tennis shots have acceleration < 3 g, motivating audio fusion.

## 8. Code / data availability
None stated — no code link, no dataset release.

## 9. Leakage & limitations
- Small author-collected set (8 players, ~650 shots); no held-out-player evaluation, so reported 95.6% F-score likely overstates generalization; no cross-sport validation despite the "extensible" claim.
- Tagging via video by the authors themselves — label noise unknown.
- No ablations of the synchronization step's contribution to the final score; sync error 32 ms vs a 10 ms impact transient suggests alignment is approximate.

## 10. GSE overlap
- Existing-research map: tracking lane covers NGS ball/player position, speed, acceleration (27-family taxonomy); no audio modality anywhere in GSE; no wearable data. Nothing in the repo does impact-event detection from audio. This paper is consumer-device sports-tech (table tennis, smartwatch), not sports prediction. **No GSE surface.**

## 11. GSE implementation spec
None — no GSE data source contains microphone audio, and GSE does not model table tennis. The peak-function feature recipe (APF/IPF) has no NFL target to attach to.

## 12. Reproducible test
Not applicable (REJECT). No GSE dataset can replicate this.

## 13. Acceptance / rejection gate
REJECT. Gate failed: the paper's domain (table-tennis shot detection from a smartwatch's microphone + IMU) has zero overlap with GSE's NFL prediction/calibration stack — no audio data source, no wearable data, no table-tennis market, and no transferable method (the APF/IPF peak functions solve an impact-transient detection problem with no NFL analogue in the engine). This reject is itself replaced via fresh search in the betting-market-efficiency territory.

## 14. Improvement experiment
None proposed for GSE. (For the record: a natural paper-internal follow-up would be held-out-player and cross-device validation, which the authors never did.)
