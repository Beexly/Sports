# [0369] Multi-person Physics-based Pose Estimation for Combat Sports (arXiv:2504.08175v3)

**Citation:** Hossein Feiz, David Labbé, Thomas Romeas, Jocelyn Faubert, Sheldon Andrews (2025). *Multi-person Physics-based Pose Estimation for Combat Sports*. arXiv:2504.08175v3. URL: https://arxiv.org/abs/2504.08175
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2587 lines).
**Verdict:** ADAPT — the iLQR-based multi-person physics trajectory refinement (collision/contact penalties) is a transferable post-processing step for broadcast-video player motion reconstruction, but GSE has no multi-camera calibrated tracking source today, so this is a future-capability idea, not an immediate build.

## 1. Research question
Can multi-view RGB video of combat sports (e.g., boxing sparring) be converted into accurate, physically plausible 3D motion capture — with correct contact dynamics, no inter-body penetration, and no foot sliding — using a sparse camera setup, via a four-stage pipeline (multi-view tracking → weighted triangulation → SMPL kinematic optimization → multi-person physics-based iLQR trajectory optimization)?

## 2. Dataset / schema
- **Boxing dataset (new, released):** over 20 minutes of multi-view video of elite boxers during diverse sparring scenarios; no ground-truth 3D (evaluated qualitatively / via physics metrics).
- **Supplementary dataset (new, released):** two-person close-interaction sequences; RGB from up to 4 cameras calibrated with OpenCV and aligned to a 24-camera OptiTrack motion-capture frame (ground-truth 3D trajectories).
- **Benchmarks:** Campus (Fleuret et al. 2007; 3 cameras, 3 subjects) and Shelf (Belagiannis et al. 2016; 5 cameras, 4 subjects), evaluated with Percentage of Correctly estimated body Parts (PCP); CHI3D (127 motion sequences, 5 pairs, action labels, SMPL ground truth, 4 camera views) and Hi4D (100 short sequences, intense interaction, up to 8 cameras, 20 unique pairs) for multi-person physics metrics.
- Data released on the authors' project page (URL not present in the text extract; abstract says "Results and dataset can be found on our project page"). Proprietary elite boxing footage but released publicly.

## 3. Method / model
Four-stage pipeline:
1. **Multi-view tracking:** YOLOv8 detections → XMem (memory-based video object segmentation) for per-view persistent identities; cross-view identity association via bbox centroids + epipolar constraints (fundamental matrix F_21 = K_2^{-T} R K_1^{T} [K_1 R t]_×; association minimizes symmetric epipolar distance); ViTPose for 2D keypoints.
2. **Weighted triangulation:** confidence-weighted linear triangulation per joint solved by SVD; cubic-spline interpolation/smoothing plus EKF (velocity/acceleration/position constraints) for triangulation failures and outliers.
3. **Kinematic optimization:** fit SMPL (shape β ∈ R^10 initialized from triangulated limb lengths; pose θ ∈ R^72) with LBFGS (history 100, LR 1.0, strong Wolfe). Objective: w1 L_2D (reprojection, Geman-McClure robust, only 2D joints with confidence > 0.7) + w2 L_3D + w3 L_reg + w4 L_smooth + w5 L_GMM (SMPL pose prior) + w6 L_Vposer (latent prior), weights 0.001/1.0/0.01/0.001/0.0001/0.0001.
4. **Multi-person dynamics optimization:** custom physics humanoid generator converts SMPL T-pose meshes to articulated rigid bodies (69 joint-angle DOFs + 6-DOF free root, hinge joints, convex-hull collision geometry from SMPL segmentation, mean density 985 kg/m³); trajectory optimized with iLQR (Howell et al. 2022) under MuJoCo-style contact dynamics (Todorov et al. 2012; Coulomb friction, non-penetration via contact manifolds), collision penalty φ(d_overlap) over colliding part pairs, parallel line search for step size α ∈ [α_min, 1].

## 4. Equations & assumptions
- Epipolar association: d_e(p_1,p_2) = d(p_1, l_{c1}) + d(p_2, l_{c2}), with l_{c1} = F_12 p_1, l_{c2} = F_21 p_2. (Eq. 1)
- Weighted triangulation linear system: [μ_1(P_11 − u_1 P_31); μ_1(P_21 − v_1 P_31); …; μ_N(P_1N − u_N P_3N); μ_N(P_2N − v_N P_3N)] [x,y,z,1]^T = 0, μ_j = mean detection confidence of camera j. (Eq. 2)
- Kinematic objective: min_θ w_1 L_2D + w_2 L_3D + w_3 L_reg + w_4 L_smooth + w_5 L_GMM + w_6 L_Vposer, weights (0.001, 1.0, 0.01, 0.001, 0.0001, 0.0001). (Eq. 3)
- L_2D = Σ_{j∈V} Σ_{i∈J_2D} c_{j,i} ρ(J_{proj_{j,i}} − J_{2D_{j,i}}), ρ = Geman-McClure; only confidences > 0.7. (Eq. 4)
- L_3D = Σ_{i∈J_3D} c_i ‖J_i(θ,β) − J_{3D,i}‖². (Eq. 5)
- L_smooth = Σ_t ‖θ^t − θ^{t−1}‖² + ‖M(θ^t,β) − M(θ^{t−1},β)‖². (Eq. 6)
- iLQR objective: min_{u_{0:T}} Σ_t w_1 L_{reg,t} + w_2 L_{p,t} + w_3 L_{v,t} + w_4 L_{collision,t}, weights (0.001, 10, 0.1, 20); Δu_t = K_t Δx_t + α k_t. (Eq. 7)
- Collision penalty: L_{collision,t} = Σ_{(i,j)∈C_t} φ(d_overlap(i,j)), φ growing rapidly (e.g., quadratically) in penetration depth.
- State: x_t = (q_t, v_t), q_t ∈ R^{63K}, v_t ∈ R^{62K}; torques u_t ∈ R^{56K}; dynamics x_{t+1} ← f(x_t, u_t).
- Stated assumptions: calibrated camera pairs (epipolar constraints need intrinsics/extrinsics); mean human body density 985 kg/m³; hinge-joint biomechanics approximate human articulation; SMPL GMM/Vposer priors capture plausible pose distribution; empirically set loss weights.

## 5. Features / target
Inputs: multi-view RGB frames; outputs: 3D joint trajectories, SMPL parameters (θ, β), physics-consistent humanoid state (q, v) and contact-compliant motion. No feature/target framing of a prediction task — this is a reconstruction pipeline.

## 6. Validation design
Evaluated on held-out public benchmarks (Campus/Shelf PCP vs. 9 prior multi-view methods), monocular close-interaction datasets (CHI3D/Hi4D vs. SLAHMR, EmbPose-MP, MultiPhys using physics metrics: penetration, ground penetration, skating, acceleration error, WA/W-MPJPE, PA-MPJPE), a new OptiTrack-ground-truth supplementary dataset (MPJPE, foot-height error e_{foot,z}, foot-planar-velocity error e_{foot,vxy}, smoothness e_smooth; PCP at 4/3/2 cameras), and an ablation single-person vs. multi-person physics optimization on CHI3D. No train/test ML splits (pipeline, not learned model).

## 7. Numerical results / baselines
- Supplementary dataset (Table 1, custom metrics, lower better): Kinematics vs Dynamics — e_MPJPE 41.2 → 38.4; e_{foot,z} 16.4 → 8.1; e_{foot,v_xy} 2.2 → 0.3; e_smooth 6.1 → 4.6. (Paper's claim: physics layer halves foot-height error, kills foot sliding.)
- Supplementary PCP (Table 2): with 4 cameras avg PCP — Triangulation 98.0, Kinematics 99.0, Dynamics 98.4; 3 cameras — 97.5/97.9/96.3; 2 cameras — 88.6/89.0/90.5. Dynamics slightly lowers PCP at 4 views (rigid-body model approximation) but wins at 2 views.
- Single- vs multi-person physics on CHI3D (Table 3): penetration 114.9 → 18.7; WA-MPJPE 117.3 → 86.4; W-MPJPE 174.5 → 156.4; PA-MPJPE 92.1 → 75.2 (mm).
- Shelf (Table 4, PCP%): ours-Kinematics 98.6 avg (Actor1 99.8, Actor2 97.6, Actor3 98.6), highest average reported — state-of-the-art on Shelf; Campus avg 95.3–96.5 vs best baseline 97.4 (competitive).
- CHI3D (Table 5): Ours (monocular) — Pen 21.4 (vs SLAHMR 139.3, MultiPhys 18.7), Gnd Pen 1.8, Skating 2.3, Acc Error 6.7, WA-MPJPE 86.4 (best), W-MPJPE 156.4 (best), PA-MPJPE 75.2 (best). Hi4D: ours Pen 67.2 (worse than MultiPhys 51.1, EmbPose-MP 39.8 — the paper's exception: "outperforms existing methods in most physics-based metrics, except for penetration"), but best Gnd Pen (1.6) and Skating (1.9); WA/W-MPJPE 91.1/124.1 vs SLAHMR 80.9/121.6.
- All numbers are the paper's reported claims; I interpret the Hi4D penetration regression as real — multi-person iLQR helps contact quality but can worsen whole-body penetration under extreme interactions.

## 8. Code / data availability
Project page referenced in abstract ("Results and dataset can be found on our project page") but no URL in the text extract; no code repository stated. Datasets: new boxing dataset (20+ min elite sparring) and supplementary OptiTrack dataset — stated as publicly released. → Effectively "none stated" for code.

## 9. Leakage & limitations
- No ground truth on the boxing dataset (qualitative + physics metrics only) — the headline application is the least quantitatively validated part.
- Physics metrics are self-referential: minimizing penetration is both objective and metric on the new datasets; only OptiTrack comparison gives an independent accuracy signal, and there dynamics improve MPJPE only modestly (41.2 → 38.4).
- Hi4D: penetration worse than two baselines under intense interaction — the collision model (convex hulls from SMPL segmentation) is coarse for grappling-like contact.
- Compute: four-stage pipeline + iLQR is far from real-time; authors state future work targets runtime reduction.
- Cross-view association assumes calibrated cameras; sparse NFL broadcast cameras lack calibration and have near-degenerate baselines.
- Monocular results depend entirely on SLAHMR as front-end (same as MultiPhys) — not an end-to-end method.
- External validity to NFL: zero football footage; combat sports (2 bodies, small space) ≠ 22 players over 120 yards. Penetration/contact modeling transfers better to line-of-scrimmage play than open-field tracking.

## 10. GSE overlap
New capability — no duplicate in Garrett's research map. Closest existing work: NGS metric taxonomy (2026-09-21, 27 families — map §1) is tracking *data* products, not reconstruction methods; STRAIN paper (2305.10262, read) consumes tracking data rather than producing it. The iLQR contact-penalty idea could extend GSE's future NGS-replacement work (`2026-09-18-ngs-replacement-spec.md`) if Garrett ever sources multi-view video; today GSE works from nflverse/FTN tabular data and single-camera public sources, with no pose-reconstruction pipeline. Track as a future-method note, not active overlap.

## 11. GSE implementation spec
Do not build now (no data source). If GSE ever acquires synchronized multi-angle NFL footage (e.g., All-22 + broadcast + end-zone): (1) front-end: YOLOv8/XMem/ViTPose for per-view tracks; (2) weighted triangulation with confidence weights; (3) SMPL kinematic fit with the stated loss weights as starting values; (4) port only the iLQR collision/contact stage (Eq. 7) as a post-processing refiner on any kinematic player trajectories to eliminate inter-player penetration at the line of scrimmage — a smaller, bounded build vs. the full pipeline. Estimated effort for the collision-refinement stage alone: 2–4 weeks with an existing physics simulator (MuJoCo/MuJoCo-MPC). Full pipeline: 3+ months, no current data to validate against.

## 12. Reproducible test
Not runnable today (no calibrated multi-view NFL footage and no released code). If the released boxing/OptiTrack datasets become reachable: replicate the paper's Table 1/2 on the supplementary dataset — reimplement Eq. 2 weighted triangulation + Eq. 3 kinematic fit, compute e_MPJPE, e_{foot,z}, e_{foot,vxy}, e_smooth, and PCP at 4/3/2 cameras, and check our reimplementation lands within ±2 pp of the paper's Dynamics row (MPJPE 38.4, foot-z 8.1, foot-vxy 0.3, smooth 4.6; PCP avg 98.4/96.3/90.5).

## 13. Acceptance / rejection gate
ADOPT the iLQR collision-refinement stage only if, on the paper's released supplementary dataset, it beats the kinematics-only baseline by the paper's own margins (≥10% reduction in e_MPJPE and ≥50% reduction in e_{foot,vxy}); otherwise REJECT — GSE has no use for a pipeline it cannot feed or validate.

## 14. Improvement experiment
Replace the empirical loss-weight schedule (Eq. 3, Eq. 7) with an automated weight-tuning loop (e.g., Bayesian optimization over w_1…w_6 and iLQR weights on the OptiTrack dataset) — the paper concedes all weights are empirical, and weight sensitivity is the unreported fragility. A second experiment: swap convex-hull collision proxies for capsule-based collision geometry to test whether the Hi4D penetration regression (67.2 vs 39.8) is a geometry-resolution artifact rather than an optimizer limitation.
