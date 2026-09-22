# [2202] Where Is The Ball: 3D Ball Trajectory Estimation From 2D Monocular Tracking (arXiv:2506.05763)

**Citation:** Ponglertnapakorn, P. & Suwajanakorn, S. (2025). *Where Is The Ball: 3D Ball Trajectory Estimation From 2D Monocular Tracking*. arXiv:2506.05763. URL: https://arxiv.org/abs/2506.05763
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

## 1. Research question
How can the 3D trajectory of a bouncing ball — including multiple bounces and hits (e.g., a tennis rally, a soccer ball struck repeatedly) — be estimated from a 2D monocular tracking sequence, despite the fundamental ambiguity that one 2D trajectory can correspond to many valid 3D motions? The paper asks whether a learning-based pipeline, trained solely on simulated data, can outperform geometric/physics-based baselines and generalize to real-world sports video. (Introduction, §1)

## 2. Dataset / schema
Training: synthetic data generated from the PhysX physics engine in Unity — a bouncing ball simulated with sequences of impulse forces; recorded per timestep: 3D positions, 2D projected coordinates, end-of-trajectory flags. Training/validation/test generated separately. Each of 3 synthetic datasets (matching Mocap, IPL, TrackNet camera params and trajectory characteristics): 5,000 training sequences + 500 test sequences; plus a Synthetic Single-Launch dataset (300 train / 100 test sequences).
Test/real datasets (with 3D ground truth unless noted):
- **Real Mocap:** ping-pong ball with IR reflective sticker, 8 synchronized IR cameras at 50 fps in ≈100 m² studio; 344 sequences, 103,872 data points, highly accurate 3D ground truth; 2D tracks from all 8 cameras.
- **Real IPL:** Fotouhi et al. 2017 — 2-minute capture of a real soccer match from 6 synchronized cameras on both touchlines at 25 fps with 2D tracking annotations; 3D ground truth via triangulation + Rematas et al. 2018 camera pipeline; 9 sequences successfully calibrated (lengths 18–147 frames, avg 68; ball travels 30.60×47.07 m², max height 1.66 m). Missing 2D points filled with an autoregressive LSTM (App. D.1).
- **Real TrackNet:** Huang — 81 video clips from 10 tennis matches, broadcast camera, 2D ball-tracking annotations; camera calibrated via PnP from court detection; 118 trajectories from 13 clips of one match evaluated qualitatively (avg 3 strokes, up to 9 bounces). No 3D ground truth — used for landing-position evaluation.
All public datasets are previously published academic sets; the Mocap studio capture is the authors' own.

## 3. Method / model
Three-stage LSTM pipeline operating on a novel camera-independent input parameterization (§3.1):
1. **Input parameterization (§3.1.1):** each 2D track point (u,v) is back-projected to a 3D viewing ray r(s)=c+ds from camera center c and direction d (computed from extrinsics E and intrinsics f, px, py — eqs. 1–2). The ray is reparameterized as two intersection points with two perpendicular planes: the ground plane (y=0) and a vertical plane (z=0, e.g., coplanar with a tennis net), dropping the always-zero coordinates → P=(p_ground, p_vertical) ∈ R⁴. This representation is independent of camera location/orientation/focal length, so one network handles arbitrary views.
2. **End-of-trajectory (EoT) network (LSTM^ε, §3.1.2):** stack of 3 bidirectional LSTMs with shortcut connections (Yu et al. 2017), + 3 FC layers; input = temporal differences ΔP_t = P_{t+1}−P_t (relative representation → shift invariance); output ε_t ∈ [0,1], probability the ball ends its current trajectory or stops. Used as auxiliary signal, not hard segmentation.
3. **Height prediction network (§3.1.3):** forward LSTM^f and backward LSTM^b predict height differences Δh^f_t / Δh^b_t, accumulated from h^f_0=0 / h^b_N=0 and combined by ramp sum h_t=(1−w_t)h^f_t + w_t h^b_t, w_t=(t−1)/(N−1) (eq. 3). Height (1 degree of freedom, camera-independent) uniquely determines the 3D point via ray intersection r^y_t(s*_t)=h_t, guaranteeing reprojection consistency (projection of predicted 3D = input pixel). A bidirectional LSTM^height refines absolute heights (fixing drift / below-ground protrusion).
4. **Refinement network (LSTM^refine, §3.1.4):** stack of 3 BiLSTMs predicting residual deltas (δx_t,δy_t,δz_t) on the reconstructed 3D coordinates (ResNet-style identity-friendly), absorbing 2D tracking noise and enforcing learned 3D smoothness priors.
Training: all networks jointly, Adam, lr 0.001 constant, batch 256, 1,400 epochs, BPTT; Gaussian noise added to 2D inputs to simulate tracker noise; loss weights (λ_ε, λ_3D, λ_B)=(10,1,10).

## 4. Equations & assumptions
- Ray back-projection (eqs. 1–2): c=ψ(E⁻¹[0,0,0,1]ᵀ), d=ψ(E⁻¹[u−p_x, v−p_y, f, 0]ᵀ), ψ = dehomogenization.
- Height combination (eq. 3): h_t=(1−w_t)h^f_t + w_t h^b_t, w_t=(t−1)/(N−1).
- EoT loss (eq. 4): L_ε = −(1/N)Σ_t [γ ε^gt_t log ε_t + (1−γ)(1−ε^gt_t) log(1−ε_t)] — weighted binary cross-entropy.
- 3D reconstruction loss (eq. 5): L_3D = (1/N)Σ_t ‖(x,y,z)^gt_t − (x,y,z)^final_t‖²₂.
- Below-ground loss (eq. 6): L_B = (1/|Y|)Σ_{y∈Y} y², Y={y^final_t | y^final_t<0}.
- Total (eq. 7): L_Total = λ_ε L_ε + λ_3D L_3D + λ_B L_B.
Stated assumptions: (a) the first and last frames of the input sequence lie on the ground (y=0), giving a known initial height for accumulation; (b) camera parameters (intrinsics + extrinsics) are known; (c) camera is high enough and facing downward so no viewing ray is parallel to either plane; (d) each "trajectory" begins when a force is applied (kick/hit) and ends before the next force or rest.

## 5. Features / target
Input features: 2D ball track (u_t, v_t) per frame, mapped to plane-point representation P_t=(p_ground, p_vertical) ∈ R⁴, plus temporal differences ΔP_t; auxiliary EoT probabilities ε_t. Target: 3D ball coordinates (x_t, y_t, z_t) per frame. Prediction horizon: full sequence length (offline / bidirectional — not causal).

## 6. Validation design
Time-ordering not applicable (i.i.d. simulated + captured sequences; no chronological leakage concept). Evaluated on 4 synthetic and 3 real datasets. Metrics: NRMSE (normalized RMSE, Mocanu et al. 2017 convention — RMSE normalized by max ground-truth range in x/y/z) on all datasets; on Real TrackNet (tennis) follows SynthNet's protocol: landing accuracy (T.F1, T.acc) and landing error (LE). Baselines: SynthNet (Ertner et al. 2024, SOTA, tennis), physics-based Shen et al. 2016 (optimizes initial velocity+position with contact-point constraints — reimplemented by authors), learning-based Mocanu et al. 2017 (restricted Boltzmann machines — official code, results verified with the original authors). Noise robustness tested at ±5/10/15/20/25 px input noise. Extensive ablations on input/output parameterization (Table 1) and pipeline components (Table 2).

## 7. Numerical results / baselines
- **Tennis landing (Real TrackNet, vs SynthNet):** landing accuracy 87.21%, F1 0.807, landing error 0.63 m vs SynthNet's 3.58 m (Table 4, §4.2.1; SynthNet numbers quoted from its paper).
- **Single-launch trajectories (distance NRMSE ± std err, Table 3/§4.2.2):** Ours 0.03±0.002 (≈0.6 cm RMSE on that dataset) vs Shen et al. 2016 0.11±0.01 vs Mocanu et al. 2017 1.02±0.03. With ±25 px input noise (1664×1088 resolution): Ours degrades to ≈0.11–0.13 range (0.05/0.07/0.09/0.11 at 5/10/15/20/25 px — partial table), vs Shen 0.64 at ±25 px and Mocanu 1.20±0.42 — the paper's claim: ours degrades minimally.
- **Parameterization ablation (Table 1, distance NRMSE, Synthetic→Real Mocap/IPL):** proposed p_ground+p_vertical input + height output: 0.05/0.09/0.01 (synth) and 0.68/0.74 (real). Naïve pixel-input + xyz-output: 14.13/0.31/0.70 synth, 11.68/2.45 real — showing the representation is the decisive ingredient, and naïve 3D regression overfits badly (large synth→real gap).
- **Component ablation (Table 2):** removing LSTM^height explodes error (e.g., synth Mocap 0.05→6.26); removing LSTM^refine raises errors across all datasets (synth Mocap 0.05→0.10, real IPL 0.74→1.84); EoT flags matter most on Tennis/IPL where player-induced direction changes are less predictable.

## 8. Code / data availability
Project page: https://where-is-the-ball.github.io/ (stated in abstract). Simulation built in Unity with PhysX; a Unity-Projects GitHub link (sinoriani/Unity-Projects) appears in the appendix for simulation reference. No explicit statement of model-code release in the paper text I read.

## 9. Leakage & limitations
- Trained entirely on PhysX/Unity simulation; sim→real gap acknowledged — simulation ignores spin, aerodynamics (Magnus), and court/turf-type friction effects; unusual trajectories degrade (App. G). This is acute for NFL: a football is not a sphere, and Magnus/tumble/wobble dynamics dominate — sim must model the prolate spheroid.
- Ground-start/end assumption (y=0 at both ends) requires manual trimming (e.g., start after the first post-serve bounce) — operational friction for automated pipelines.
- Requires known calibrated camera parameters for every sequence; broadcast NFL cameras move/zoom — per-segment calibration (PnP from field markings) is a prerequisite the paper inherits from Rematas et al. 2018.
- Bidirectional (non-causal) architecture — not directly usable for real-time in-play prediction; inference is offline/post-play.
- Tennis evaluation is qualitative (no 3D GT); only landing positions quantitatively compared vs SynthNet.
- External validity to NFL: bouncing tennis/soccer balls ≠ spiraling footballs; catching/punting trajectories have different physics (nose-down spiral, end-over-end). The *pipeline design* transfers; the *trained weights* do not.

## 10. GSE overlap
Per /home/hatch/workspace/arxiv-sweep/existing-research-map.md: GSE tracks NGS tracking data (27-family taxonomy, line 51) and reads tracking-data methodology papers (STRAIN 2305.10262). There is no learned 3D ball-trajectory-from-broadcast model in the GSE corpus — NGS itself does not publish 3D ball coordinates for kicks. This is a new capability, not a duplicate: a learned physics prior that converts abundant 2D broadcast tracks into 3D trajectories. Complements the wave-5a trajectory-prediction papers (which forecast player movement) by solving the ball side of the simulation state.

## 11. GSE implementation spec
Build an NFL kick/punt trajectory engine: (1) Data: nflverse play-by-play + NGS tracking for kick plays; broadcast footage frames with 2D ball tracks from an off-the-shelf detector (TrackNet-style or YOLO-ball) + camera calibration via field-marking PnP (Yard-line intersections give 2D–3D correspondences each frame; interpolate across zoom). (2) Simulation: replace PhysX spheres with a football flight model — rigid-body prolate spheroid with drag, Magnus lift, gravity; impulses for kick launches; implement in MuJoCo or custom NumPy/C++ sim generating 2D-projected tracks + EoT flags + 3D GT. (3) Model: reimplement the 4-LSTM pipeline (EoT → height → refinement) with the plane-point ray parameterization; sequence input = calibrated 2D tracks of punts/kickoffs/field goals. (4) Serving: offline post-game batch inference over all kick plays; outputs feed hang-time/landing-spot/distance models and the kicking-evaluation desk. Effort: ~3–4 engineer-weeks for sim + pipeline; calibration pipeline is the long pole.

## 12. Reproducible test
Dataset: 2023–2024 NFL punts with NGS tracking (kickoff/punt hang time + landing as weak GT; refine later with manual 3D labels on ~200 kicks). Metric: landing-spot error (yards) and height-profile RMSE vs a physics-only baseline (vacuum projectile + quadratic drag fit per kick) on a held-out 2024 second-half test window. Baseline to beat: the fitted-physics model. The learned model must cut landing error by ≥25% on noisy broadcast-derived 2D tracks.

## 13. Acceptance / rejection gate
ADOPT the architecture if, on held-out real NFL kick/punt sequences with 2D tracks from broadcast video: (a) landing-spot error ≤ 1.5 yards mean absolute error, AND (b) beats the fitted-physics baseline by ≥25% on landing error, AND (c) sim-trained weights transfer (no more than 2× error inflation from synthetic validation to real). Reject if any condition fails or if per-sequence camera calibration cannot be automated to <5% frame failure rate.

## 14. Improvement experiment
Replace the ballistic-only simulation with a 6-DoF football flight model including angular velocity state (spiral rate, wobble) and Magnus coefficients fit from NFL Next Gen Stats kick data, and add spin as a latent variable the EoT network must implicitly detect from 2D wobble signatures. Hypothesis: modeling orientation dynamics explicitly will beat the sphere-assumption sim-to-real transfer on punts (which tumble) while matching on kickoffs (stable spirals) — test via the landing-error metric split by kick type.
