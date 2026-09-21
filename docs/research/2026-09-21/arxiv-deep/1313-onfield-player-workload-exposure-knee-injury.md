# [1313] On-field player workload exposure and knee injury risk monitoring via deep learning (arXiv:1809.08016v3)

**Citation:** William R. Johnson, Ajmal Mian, David G. Lloyd, Jacqueline A. Alderson (2019). *On-field player workload exposure and knee injury risk monitoring via deep learning*. arXiv:1809.08016v3. Published: *Journal of Biomechanics* (2019), DOI: 10.1016/j.jbiomech.2019.07.002. URL: https://arxiv.org/abs/1809.08016
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv, text extracted with pdftotext; abstract, introduction, methods, results Tables 1–3, discussion, conclusions, references read).
**Verdict:** ADAPT — the CNN multivariate-regression protocol for estimating 3D knee joint moments from kinematics (double-cascade transfer learning: ImageNet → GRF/M → KJM) is a portable biomechanical-load-estimation primitive for GSE's player-availability/injury lane; ACL is the highest-cost non-contact injury in football and this is the closest paper in the wave to a real-time load-monitoring method. Replaces the 1123 REJECT slot (via 1312, also rejected).

## 1. Research question
Can deep learning estimate 3D knee joint moments (KJM) — a strong indicator of ACL injury risk — directly from motion-capture kinematics, without laboratory force plates and inverse-dynamics modeling, as a step toward real-time on-field workload-exposure monitoring?

## 2. Dataset / schema
- **UWA 17-year biomechanics archive** (2001–2017); **458,372 motion capture files** mined; healthy athletic population (amateur to professional), male 62.8% / female 37.2%, height 1.766 ± 0.097 m, mass 74.5 ± 12.2 kg. Ethics approval RA/4/1/8415.
- Usable trial counts: walk L 570 / R 646; run L 233 / R 884; sidestep L 566 / R **1,527**. Only **8 passive markers** (C7, sacrum, bilateral hallux/calcaneus/lateral malleolus) to maximize trial inclusion.
- Three movement types (walking, running, sidestepping) selected for progressive complexity and sports relevance.
- Ground truth: KJM from inverse dynamics with synchronized force plates.
- Supplementary material: digitalathlete.org. No general data release stated.

## 3. Method / model
- **Spatio-temporal → image encoding:** marker (x,y,z) mapped to image (R,G,B); 8 markers → image width; 125 samples → image height; warped to **227×227** pixels via cubic spline interpolation.
- **CaffeNet** (pre-trained on 1.3M ImageNet images) fine-tuned with final 1,000-dim SoftMax **replaced by a Euclidean loss layer** → multivariate regression network.
- **Output compression:** 6 KJM waveforms (LKJMx/y/z, RKJMx/y/z) **deinterlaced** (90 features each), each **PCA-reduced** (threshold t=0.999; e.g., RKJMz 90→59 features).
- **Double-cascade transfer learning:** fine-tune once from ImageNet (single), or twice — from an earlier GRF/M model's weights, then on KJM (double-cascade).
- Prediction over the **initial 33% of stance phase** (the injury-relevant window). Metrics: correlation **r** and relative RMSE (**rRMSE**).

## 4. Equations & assumptions
- No novel equations stated; standard Euclidean-loss regression on PCA-compressed waveform outputs. Assumptions: (a) external knee abduction moments during sidestepping are valid ACL-risk indicators (cited biomechanics literature); (b) 8 lower-body markers suffice to reconstruct knee loading; (c) the initial 33% of stance carries the injury signal; (d) transfer from ImageNet features to biomechanical waveforms is meaningful.

## 5. Features / target
- Features: 8-marker 3D trajectories (125 time samples, FS−66% stance → toe-off). Target: six KJM component waveforms over the first 33% of stance (extension/flexion, abduction/adduction, internal/external rotation).

## 6. Validation design
- Random 80/20 split (single fold primary); **5-fold CV** on the largest subset (sidestep right) to check overfitting. Baselines: single fine-tune vs double-cascade; Mann-Whitney significance test on the +4.2% improvement (p < 0.01).

## 7. Numerical results / baselines
- Single fine-tune best: sidestep left **r(LKJMmean) = 0.9179**; weakest: sidestep right 0.8168.
- Double-cascade: sidestep left **0.9277** (components: ext/flex 0.9829, abd/add 0.9050, int/ext 0.8953); sidestep right 0.8168 → **0.8512** (+4.2%, p<0.01); **mean improvement +1.8%** across movement types; sidestep pair combined **r(KJMmean) = 0.8895**.
- 5-fold CV: mean r(RKJMmean) = **0.8472** vs single-fold 0.8512 — overfitting avoided.
- Weakest component throughout: **KJMz (internal/external rotation)** — e.g., run right 0.7430 single-tune; sidestep right 0.7304 double-cascade.

## 8. Code / data availability
- Supplementary material at **digitalathlete.org** (per paper). No code repository or public dataset stated.

## 9. Leakage & limitations
- **Still lab-bound:** inputs are marker-based motion capture, not on-field sensors — the stated next phase (accelerometer-driven regression) is future work, not demonstrated. (b) **KJMz (internal/external rotation) is the weakest component** — and rotational moments are central to the ACL mechanism; the method is strongest where it matters least. (c) KJM sample counts (233–1,527) are smaller than the earlier GRF/M work (2,196); authors expect more samples would improve KJM accuracy. (d) Systematic/manual errors in the legacy archive propagate into ground truth. (e) 2019-era tech (CaffeNet); a modern backbone would likely do better. (f) Not football-specific (walking/running/sidestepping in a lab).

## 10. GSE overlap
- Related injury ledgers: `0768-early-detection-injuries-mlb-pitchers-video.md`, `0772-multimodal-injury-risk-prediction-in-tennis.md`, `1120-predicting-ulnar-collateral-ligament-injury-rookie.md`, `1312` (REJECT — same-study duplicate of 0772). This paper is **biomechanical load estimation via deep regression** — a distinct method from all of them (tabular prediction, video classification, multimodal ensembles). The map flags **causal injury impact as thin**; this extends the injury cluster into *mechanistic load monitoring* rather than injury prediction. Not a duplicate.

## 11. GSE implementation spec
- **Use case:** non-contact knee-injury (ACL) risk monitoring — the highest-cost injury class in football. Non-contact ACL events are 51–80% of team-sport ACLs, >80% in sidestepping/single-leg landing (paper's cited epidemiology) — cutting is football's core movement.
- **Modern port:** replace CaffeNet with a temporal CNN/transformer backbone; replace marker trajectories with **NGS tracking data** (10 Hz player coordinates) or practice wearable IMU streams; target = estimated knee-load proxies or validated workload-exposure scores per player per week.
- **Training:** lab-grade biomechanics data as ground truth (partner with a sports-science lab or license an existing mocap dataset); double-cascade transfer (ImageNet-scale pre-training → force/moment estimation → joint-load estimation) retained as the training recipe.
- **Serving:** weekly batch workload-exposure reports for fantasy/injury-risk content; real-time is a later phase.
- **Effort:** ~4–6 engineer-weeks for a prototype (data partnership is the long pole).

## 12. Reproducible test
- Dataset: public biomechanics mocap dataset with force plates (e.g., a CMU-style or published cutting-maneuver dataset). Replicate the encoding (xyz→RGB, 227×227) with a modern backbone; predict the three KJM components over the first 33% of stance. Baseline: linear regression from marker kinematics (the "orthodox extrapolation" the paper criticizes). Metric: correlation r and rRMSE per component, with 5-fold CV.

## 13. Acceptance / rejection gate
- **Adopt** if the modern-backbone port beats linear regression on KJMz (the ACL-relevant rotational component) by ≥0.05 correlation with 5-fold CIs excluding zero on held-out subjects; **reject** if the gain is confined to ext/flex (KJMx), which the paper already shows is easy (r≈0.99) and least injury-relevant.

## 14. Improvement experiment
- **Target the weak component:** add a physics-informed loss term penalizing violations of the inverse-dynamics relationship between predicted KJM and measured GRF (available in the same trials), with extra weight on KJMz. The paper treats all six waveforms symmetrically; a physics constraint directly attacks the internal/external-rotation weakness. Hypothesis: KJMz correlation improves ≥0.05 without degrading KJMx/KJMy, because the GRF coupling is strongest in the rotational channel.
