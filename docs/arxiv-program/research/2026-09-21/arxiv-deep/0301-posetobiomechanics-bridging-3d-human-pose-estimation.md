# [0301] Pose-to-Biomechanics: Bridging 3D Human Pose Estimation and Biomechanical Analysis (arXiv:2607.08725)

**Citation:** Ayda Eghbalian, Kevin Desai (2026). *Pose-to-Biomechanics: Bridging 3D Human Pose Estimation and Biomechanical Analysis*. arXiv:2607.08725v1. URL: https://arxiv.org/abs/2607.08725
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2,262 lines).
**Verdict:** REJECT — biomechanics-from-pose inference for lab motions; no path into GSE's NFL game-outcome/prop/fantasy engine, and the existing corpus already rejected the other biomechanics paper (0091) for the same structural reason.

## 1. Research question
3D human pose estimation (HPE) gives joint coordinates, but biomechanics needs velocities, accelerations, joint torques, ground reaction forces (GRF), and muscle activity — traditionally from marker-based motion capture + force plates + EMG. Can a learned transformer (BioModule) infer the full biomechanical state from 3D skeleton input alone, and how much does accuracy degrade when fed *estimated* poses (from real HPE models) instead of ground-truth motion capture? (Abstract; Sec. 1)

## 2. Dataset / schema
- **Aligned Human3.6M / H3.6Mplus:** 520,509 frames, 210 clips, 30 activities, 7 subjects (S1, S5, S6, S7, S8, S9, S11), 4 synchronized cameras, 50 fps. Train: S1/S5/S6/S7/S8 (157 clips, ~108 minutes). Test: S9/S11 (53 clips, ~44 minutes). Cross-validation with H36Mplus (S2/S3/S4/S7) for pose estimators.
- **Biomechanical labels:** OpenSim-style simulation outputs — 17 attribute heads: coordinates, speed, acceleration (kinematics); torques, power, GRF, seat reaction, touch (kinetics); activation, excitation, scaling, max torque (neuromuscular).
- **Alignment:** sub-pixel 2D alignment (<0.28 px error); pelvis anchor K1 matches H36M joint 0 "to machine precision." H3.6Mplus provides 17-joint pose (51 dims/frame); H36M uses 24 joints — both aligned to common conventions.
- **Access:** code at https://github.com/UTSA-VIRLab/BioModule; site https://utsa-virlab.github.io/BioModule/; data derived from public Human3.6M.

## 3. Method / model
- **BioModule:** 4-layer transformer, hidden d = 256, 8 attention heads (head dim 32), FFN expansion 4×, dropout 0.1; temporal window W = 81 frames (~1.62 s at 50 fps); 17 independent attribute regression heads. Input: root-centered 17-joint 3D skeleton (51 dims/frame).
- **Training:** 50 epochs, AdamW, lr = 1e-4, weight decay 1e-4, batch 64, cosine schedule (T_max = 50); multitask loss weights: kinematic 1.0, kinetic 0.5, neuromuscular 0.3.
- **Protocol:** (1) frozen module on ground-truth pose (upper bound); (2) frozen module on estimated poses (H36Mplus: TCPFormer, D3DP, MHFormer, MixSTE, PoseFormer; H36M: MPJPE 37–52 mm range models); (3) per-estimator fine-tuning: 10 epochs at lr = 1e-5 on frozen-module outputs, checkpoint selected by minimum training loss (no validation set — flagged below).
- Note: the bidirectional W = 81 window uses future frames — strictly offline inference, not real-time.

## 4. Equations & assumptions
- Attention: standard QK^T/√d_k softmax; no novel equations — the contribution is the aligned multi-convention dataset + frozen/fine-tuned evaluation protocol.
- Multitask loss: L = 1.0·L_kinematic + 0.5·L_kinetic + 0.3·L_neuromuscular.
- Assumptions: labels inherit OpenSim simulation assumptions (torques/forces are simulated, not measured); 17-joint skeleton is sufficient; per-estimator fine-tuning on training-loss-selected checkpoints generalizes.

## 5. Features / target
- **Inputs:** 3D joint coordinates (17 joints × 3 = 51 dims/frame), windowed over 81 frames.
- **Targets:** 17 biomechanical attributes (coordinates/speed/acceleration; torques/power/GRF/seat-reaction/touch; activation/excitation/scaling/max-torque).

## 6. Validation design
- **Subjects held out** (S9/S11 never trained on) — genuine subject-level generalization.
- **Two tables:** frozen module (Table 1) × five H36Mplus estimators + five H36M estimators + GT upper bound; fine-tuned module (Table 2) × per-estimator 10-epoch adaptation.
- **Metrics:** MAE per attribute (torque units N·m-ish; GRF in N), touch as classification accuracy %.

## 7. Numerical results / baselines
Frozen module (Table 1) — GT upper bound vs estimator degradation:
- Coordinates MAE: GT 0.228 → TCPFormer 0.583, D3DP 0.594, MHFormer 0.658, MixSTE 0.634, PoseFormer 0.636.
- Active torque: GT 9.529 → 15.4–16.9 (MHFormer worst 16.874).
- GRF: GT 28.900 → 37.5–39.1 (MHFormer 39.000).
- Touch accuracy: GT 67.500% → 41.8–43.7% (MHFormer 43.700%).
- H36M estimators (MPJPE 37–52 mm) show the same pattern: e.g., 37 mm model's coordinate 0.573, GRF 37.700, touch 42.700%.
Fine-tuned (Table 2): coordinate MAE recovers to 0.260–0.278 across all ten estimators; touch recovers to 67.5–68.6% — but the fine-tune checkpoint is chosen by **minimum training loss with no validation set**, so some of this recovery is likely overfit to the estimators' error patterns.

## 8. Code / data availability
Code: https://github.com/UTSA-VIRLab/BioModule; project site: https://utsa-virlab.github.io/BioModule/; data: Human3.6M-derived, public. Affiliation: UTSA (VirLab).

## 9. Leakage & limitations
- **My adversarial notes:** (a) No validation set — checkpoint selection by minimum *training* loss after fine-tuning is a real overfitting risk, especially when adapting to each estimator's error distribution. (b) All labels are OpenSim *simulations* — the model learns a simulator's physics, not measured forces; compounding error vs reality is unquantified. (c) Seven subjects, indoor lab activities (walking, sitting, gesturing) — no football contact, cutting, sprinting, or equipment; GRF/torque transfer to NFL is untested. (d) Bidirectional 1.62 s window means no live inference. (e) 17-joint skeleton discards hand/foot detail that matters for contact biomechanics. (f) Touch at 67.5% even with ground-truth pose is a weak ceiling — the task is hard and the headroom claim is thin.

## 10. GSE overlap
No overlap with any GSE lane. The existing-research-map's injury gap (gap #9) is about injury *effects on game outcomes/availability* — causal team-level effects — not musculoskeletal inference from video. The only other biomechanics paper in the corpus, 0091 (deep-learning head model for concussion brain deformation), was rejected for the same reason: no biomechanics consumer exists in GSE's stack. No duplication; no bridge.

## 11. GSE implementation spec
Not applicable — no implementation recommended. If GSE ever opened a player-health modeling lane (e.g., injury-risk features from broadcast video), the prerequisites would be: NFL-specific biomechanical labels (none exist publicly), contact-sport validation (paper has none), and a causal (not bidirectional) architecture. That lane does not exist and is not proposed here.

## 12. Reproducible test
Not run — rejected for scope. The reproduction would be: clone BioModule, run the frozen module on the H36Mplus test split, confirm coordinate MAE within ±0.01 of 0.228 (GT) and touch within ±0.5 pp of 67.5%. Expected to reproduce (standard protocol), but the result would not change the verdict — it validates a biomechanics claim, not a football one.

## 13. Acceptance / rejection gate
**Reject** for GSE: no biomechanics consumer, no NFL validation, simulated labels, lab-only motions. The gate that would reopen it: a demonstrated, peer-reviewed link between pose-inferred biomechanics and an NFL outcome GSE predicts (injury probability, games missed) — with effect sizes measured on football players, not lab subjects. Nothing in this paper or the corpus meets that bar.

## 14. Improvement experiment
For the paper's own lane (not GSE): add a proper validation split for fine-tune checkpoint selection; replace the bidirectional window with a causal one for real-time viability; validate on a contact-sport dataset (e.g., rugby/AFL motion capture if available). For GSE: no experiment proposed — the honest note is that pose-to-force inference is a multi-year research program away from anything the engine consumes, and the engine's injury gap is better served by availability/injury-report modeling (existing lane) than by video biomechanics.
