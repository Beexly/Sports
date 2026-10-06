# [0361] Egocentric Event-Based Vision for Ping Pong Ball Trajectory Prediction (arXiv:2506.07860)

**Citation:** Alberico, I., Cannici, M., Cioffi, G., Scaramuzza, D. (2025). *Egocentric Event-Based Vision for Ping Pong Ball Trajectory Prediction*. arXiv:2506.07860 (June 2025). URL: https://arxiv.org/abs/2506.07860
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3130 lines).
**Verdict:** ADAPT — the gaze-foveated ROI + motion-compensated event filtering + physics-model trajectory pipeline is portable to NFL ball-flight tracking, but the event camera and circle-fitting must be replaced with RGB ellipse fitting for a football.

## 1. Research question
Can a real-time table-tennis ball trajectory prediction system work from the *player's* (egocentric) perspective using event cameras — overcoming the motion blur, latency, and bandwidth limits of frame cameras — by (a) foveated event processing guided by eye gaze, (b) IMU motion-compensated moving-object detection, and (c) physics-based trajectory forecasting from a short post-impact measurement window?

## 2. Dataset / schema
- **Self-collected dataset:** 30 table-tennis game sequences with 5 participants, recorded with: Meta Project Aria glasses (RGB 1408×1408 @30 FPS, eye tracking @60 FPS, 7-mic audio @48 kHz, SLAM pose @30 FPS, IMUs @1 kHz and 800 Hz) + iniVation DVXplorer event camera (640×480, 6 mm lens, IMU 800 Hz) mounted on top of the glasses + **OptiTrack motion capture** (ball 3D trajectory @200 Hz, glasses 6D pose) as ground truth.
- **Sync/calibration:** IMU gyro streams aligned in the frequency domain (ms accuracy); OptiTrack synced via audio peaks of ball bounces; stereo calibration via Kalibr; hand-eye calibration between Aria RGB camera and OptiTrack.
- **Access:** dataset release not stated in the paper (code repo only); collected by the authors.

## 3. Method / model
Three modules:
1. **Ball detection in the event domain.** Events restricted to a w×w window (w=80 px) around the eye-gaze reprojection x_ET on the event plane: E = {e_i | x_i ∈ N(x_ET, w)}, Δt = 5 ms window. IMU-gyro motion compensation: x_i^mc = K[I − [ω̄]_×(t_i − t_0)]K^−1 x_i; mean timestamp image T(x); normalized timestamp ρ(x); binary map B(x)=1 iff ρ(x) > θ_0 + θ_1‖ω̄‖; DBSCAN clustering on (t, x, y) of dynamic events; per-cluster convex hull circularity γ_j = P(conv(S_j))²/(4π·A(conv(S_j))); best-circularity cluster with perimeter/area in [P_min,P_max]/[A_min,A_max] is the ball.
2. **Depth via circle fitting.** Ball events split into M temporal batches; on each batch's convex hull pick 3 points maximising pairwise distance; fit circle; depth Ẑ_m,ball = f·W_metric/r̂_m,ball with W_metric = 0.02 m (physical ball radius).
3. **Trajectory prediction.** (a) Monotonically-constrained polynomial regression on x(t), y(t), Z(t) (least squares with Ż(t) ≤ 0, since the ball always approaches the camera from opponent impact). (b) Physics differential equations: p(t_i) = p(t_{i−1}) + v(t_{i−1})Δt; v(t_i) = v(t_{i−1}) − k_d|v(t_{i−1})|v(t_{i−1})Δt + gΔt (drag + gravity). (c) EKF bootstrap with state x^ekf = [p, v, a]^T, constant-acceleration model (F, H matrices stated), M predict-update iterations to initialise the differential equations.

## 4. Equations & assumptions
- ROI event set: E = {e_i | x_i ∈ N(x_ET, w)}_{i=0}^{N−1}, e_i = (x_i, t_i, p_i), t_i ∈ [t, t+Δt].
- Motion compensation: x_i^mc = K[I − [ω̄]_×(t_i − t_0)]K^−1 x_i.
- Mean timestamp image: T(x) = Σ_i(t_i − t_0)δ(x − x_i^mc) / Σ_i δ(x − x_i^mc); binary map B(x) = 1 iff ρ(x) > θ_0 + θ_1‖ω̄‖.
- Circularity: γ_j = P(conv(S_j))²/(4π·A(conv(S_j))) ≈ 1 for circles.
- Depth: Ẑ_m,ball = f·W_metric/r̂_m,ball, W_metric = 0.02 m.
- Trajectory: min_{β_Z} (1/M)Σ_m(Ẑ_m − Σ_j β_{Z,j} t_{Bm}^j)² s.t. Ż(t) ≤ 0; physics updates p(t_i) = p(t_{i−1}) + v(t_{i−1})Δt, v(t_i) = v(t_{i−1}) − k_d|v(t_{i−1})|v(t_{i−1})Δt + gΔt; EKF with x^ekf = [p,v,a]^T and stated F/H matrices.
- **Assumptions:** player's gaze is always on the ball (validated by monitoring gaze across games); sequences start at opponent impact (no automatic impact trigger); ball radius constant and known; drag model with single coefficient k_d; no spin/Magnus term in the deployed estimator (the supplement derives the full Magnus-augmented form).
- **Supplement §8 (aerodynamics model, fully derived).** Four forces considered: gravity F_g, buoyancy F_b (neglected — displaced-air mass negligible), drag F_d, Magnus F_m. Deployed motion model: ΣF = F_g + F_d, i.e. ΣF = mg − ½C_dρA|v(t)|v(t) (11); v̇_k(t) = g − k_d|v(t)|v(t) (12) with k_d = C_dρA/(2m). Known ball parameters: ρ = 1.225 kg/m³, r = 0.02 m, m = 0.0027 kg, C_d = 0.4. Bounce: when estimated z < h_table (from ArUco markers) and v_z < 0, v_z^+ = e·v_z^− with 0 < e < 1 (inelastic bounce). Spin-neglect justification: ball's small dimensions make spin unobservable to the vision system.
- **Supplement §8.1 (rotational dynamics, derived for completeness).** Magnus force F_m = C_mρAr(ω × v) (13); extended motion: v̇_k(t) = g − k_d‖v(t)‖v(t) + k_m(ω × v) (14), discrete form v(t_i) = v(t_{i−1}) + [−k_d‖v‖, −k_mω_z, k_mω_y; k_mω_z, −k_d‖v‖, −k_mω_x; −k_mω_y, k_mω_x, −k_d‖v‖]·v(t_{i−1})Δt + [0,0,−g]^TΔt (15), with k_m = C_mρAr/m. Angular velocity ω is unmeasurable directly — must be inferred from trajectory data {t_{B_k}, p̂_k, v̂_k}.
- **Supplement §9 (sensing latency).** An event-camera edge generates an event when its image-plane projection moves ≥ 1 pixel (Falanga et al. 2019); sensing latency τ_E = (1/v̂)·(Δu·d²)/(f·r_o + Δu·d) (16) with Δu = 1 px, d = obstacle distance, r_o = radius, f = focal length. For the ping-pong scenario (640×480, f = 6 mm, d = 2–3 m, relative velocity ∼4–8 m/s), theoretical latency is in the low-ms green-shaded region of their Fig. 5 — the theoretical justification for the measured 2.35 ms pipeline latency.
- **Supplement §12 (audio impact-trigger).** To segment long sequences at opponent impact, they high-pass Butterworth-filter the Aria 7-mic audio and detect peaks with scipy.signal.find_peaks at > ¼ of the signal magnitude y(t); four peak types (user hit, user-half bounce, opponent-half bounce, opponent hit, each with different intensity due to mic distance), opponent-hit peak being weakest; a neural classifier for real-time triggering is proposed but not implemented.
- **Supplement §13 (circle fitting).** Compared against ellipse fitting (mean center + PCA of covariance eigenvalues) and Taubin's geometric method on event-cluster convex hulls; both alternatives underestimate the ball radius (even 1-px error at 3 m causes cm-scale depth errors), while the paper's 3-point-max-distance convex-hull circle fit is the only reliable method of the three.
- **Supplement §10 (DCGN horizon analysis, Table 7).** DCGN trained on ground-truth trajectories upsampled to 0.8 kHz (80/20 split): longer prediction horizons give *lower* RMSE — 0.01 s: 0.2616; 0.03 s: 0.2055; 0.12 s: 0.1737; 0.20 s: 0.1470; 0.30 s: 0.1177. Short horizons struggle (poor prediction, e.g. T=0.03 s trajectory deviates significantly); on noisy perception-pipeline measurements the degradation is worse (Section 5). This is a direct caution for any GSE flight-model horizon choice: short lookaheads underperform.
- **Supplement §11.** Online-forecast error plots (Fig. 8) show prediction accuracy improves as the accumulation window grows and the trajectory is recomputed with recent measurements; Fig. 7 shows DCGN and 200 Hz diff-eq fitting give concentrated impact-point error distributions around the origin vs wide spread for 30 Hz fitting.

## 5. Features / target
- **Inputs:** asynchronous event stream (x, y, t, polarity), eye-gaze reprojection, IMU angular velocity, camera intrinsics.
- **Outputs:** 3D ball position + velocity estimates; predicted future 3D trajectory / impact point on the table.

## 6. Validation design
- **Data:** all 30 collected sequences (no train/val/test split — the pipeline is classical, with θ_1 swept as a parameter study; physics model has no learned weights; DCGN baseline was trained on ground-truth trajectories upsampled to 800 Hz).
- **Metrics:** detection success rate = fraction of detections with 2D error < 5 px vs reprojected OptiTrack ground truth; trajectory RMSE of predicted impact point on the table (meters).
- **Baselines:** frame-rate (30 Hz) differential-equation prediction using only 2 measurements; DCGN learning-based predictor (Gomez-Gonzalez et al. 2020); oracle differential equations initialised from ground truth (lower bound); latency comparison vs 30 FPS frame system.

## 7. Numerical results / baselines
- **Latency (Intel i7-13700H CPU, w=80):** mean pipeline latency 2.35 ms total (ego-motion comp 1.390 ms / 59.1%; threshold+morphology 0.083 ms / 3.5%; DBSCAN+filtering 0.879 ms / 37.4%). With gaze-ROI cropping: **1.5 ms, 735 events** vs without: 16.18 ms, 7,157 events — foveation gives a **10.81× event reduction**. Worst-case total latency **4.5 ms** vs 66 ms perception-only for a 30 FPS camera (detection compute 1.5 ms; ball detection on 10 ms windows: 2.35 ms vs Falanga et al. 2020's 3.56 ms).
- **Detection (θ_0 fixed):** θ_1=0.6 → 88.88% (1,009 events); θ_1=**0.8 → 92.59%** (701 events, best); θ_1=1.4 → 59.26% (279 events). With ROI cropping 92.59% vs without 81.48% (cropping also removes false circular distractors).
- **Trajectory, online forecasting (0.2 s horizon, impact-point RMSE):** Diff. Eq. @200 Hz: 0.1472±0.0938 m; Diff. Eq. (EKF): 0.1432±0.0991 m; Diff. Eq. @30 Hz: 0.1915±0.1705 m; **DCGN: 0.1072±0.1085 m (best)**; oracle: 0.0121±0.0075 m. Authors' claim: 200 Hz event updates reduce average error by **4.8 cm** (physics) and **8.4 cm** (learning-based DCGN) vs frame-based over the 0.2 s horizon. Single-batch 33 ms-window: Diff Eq @200 Hz 0.242±0.096 m vs @30 Hz 0.409±0.504 m vs DCGN 0.442±0.194 m.

## 8. Code / data availability
Code: https://github.com/uzh-rpg/event_based_ping_pong_ball_trajectory_prediction. Dataset download: not stated in the paper.

## 9. Leakage & limitations
- **No train/test split needed (classical pipeline) but the θ_1 sweep and all latency/detection numbers come from the same 30 sequences** — parameter overfitting risk to this small dataset (5 participants, one venue).
- **Gaze assumption is fragile:** if the player looks away, detection fails; the authors acknowledge this and suggest a wider window at bandwidth cost. Lab validation ≠ real match gaze behaviour.
- **No automatic impact trigger:** sequences are manually cut at opponent impact; continuous-gameplay deployment needs an audio/neural trigger (acknowledged).
- **Short horizon only (0.2 s);** single-batch prediction at 10–20 ms windows is weak (RMSE 0.784 m at 10 ms — worse than useful).
- **Egocentric parallax problem:** small ball at far distance → noisy depth (radius-based depth is ill-conditioned for small apparent radii).
- **External validity to NFL:** direct transfer is nil (GSE has no event cameras; table tennis ball physics ≠ football). The transferable pieces are architectural: foveated/attention ROI processing and the physics-drag + EKF trajectory estimator.

## 10. GSE overlap
Garrett's tracking lane is consumer-side: the 2026-09-21 NGS 27-family taxonomy inventoried, NGS replacement spec (2026-09-18) for building equivalents from public data — GSE buys tracking, doesn't compute ball trajectories. Nothing in `docs/research/` covers egocentric/foveated vision, event cameras, or physics-based ball-flight models. The closest adjacent concept is the NGS "air distance" / completion-probability family, which GSE cannot reproduce. This paper is a **new capability in the tracking-method space**: a monocular 3D ball-trajectory estimator from known ball size + drag physics, and — more valuably — the foveated ROI attention pattern (10.81× compute reduction) that ports to any CV pipeline. **Extension / new capability.**

Per the existing-research map (2026-09-21, checked for egocentric vision, event cameras, and ball-flight physics coverage): no prior coverage — new ground.

## 11. GSE implementation spec
- **Adaptation 1 — football flight model for kicks:** replace circle fitting with *ellipse* fitting (a football projects as an ellipse, not a circle); known ball dimensions give monocular depth; fit the same gravity+drag differential equations (plus a Magnus term — a football's spiral stabilises it, unlike a ping-pong ball, so drag coefficient differs per axis) with EKF initialisation to estimate kickoff/punt hang-time and landing point from broadcast video. Use case: validate/derive kick-trajectory features for totals (wind × hang time) — a gap in the existing-research-map (item 8: weather physics for totals).
- **Adaptation 2 — foveated attention for GSE CV pipelines:** apply the gaze-ROI lesson as saliency-ROI processing in any future GSE video pipeline (papers 1–2 of this wave): run detectors at full resolution only inside a tracked region (ball carrier, QB), background at low resolution — targeting the same ~10× compute reduction before any model work.
- **Effort:** 2–3 weeks for a prototype football ellipse-fit + drag-model tracker on broadcast kickoff clips (OpenCV only, no event hardware needed).

## 12. Reproducible test
Take 20 NFL kickoff/punt broadcast clips with known landing spots (from play-by-play spot data). Fit an ellipse to the ball in each frame of the first 0.3 s of flight; estimate depth from known ball size; initialise the paper's drag+gravity model via the EKF bootstrap; predict the landing point; metric: landing-point RMSE vs a constant-velocity (no-drag) baseline.

## 13. Acceptance / rejection gate
PURSUE the football flight-model adaptation if the drag+EKF model beats the constant-velocity baseline by ≥ 2 m on landing-point RMSE over the 20-clip window (the paper's own 4.8 cm gain scaled to football distances); otherwise REJECT and treat ball-flight estimation as buy-not-build (NGS air-distance family).

## 14. Improvement experiment
Add a Magnus/lift term to the differential equations with a spin-axis parameter estimated from the ellipse's rotation across frames — a spinning football's lift measurably alters hang time, and the paper's drag-only model ignores spin; test whether spin-aware prediction beats drag-only on punts (highest spin) vs kickoffs.
