# Movement Prediction Module — Implementation Spec
**Date:** 2026-09-26 · **Status:** implementation-ready, methods-only (no code copied from any source)
**Purpose:** Predict NFL player movement from tracking trajectories, with calibrated per-player uncertainty, for the GSE prediction engine.

## 0. Provenance and constraints

Synthesized from verified sources only:
- **NFL Big Data Bowl 2026** (Kaggle featured comp, Sep 2025 → Jan 2026; 8,147 entrants / 1,899 teams): task was predicting every player's (x, y) while the ball is in the air, scored RMSE in yards = sqrt(0.5·(MSE_x + MSE_y)). Reference leaderboard band: **0.518–0.540**. Winners: **Takoi** (ball–runner–defender relational modeling informed by film study) and **Mifune** (outputs **speed + prediction confidence**, not just position, for physics-smooth trajectories in contested situations).
- **Reusable takeaways (verified from winner writeups/public artifacts):** (1) predict deltas + speed/uncertainty, not raw coordinates; (2) ball-landing conditioning is highest-leverage (`dist_to_ball` ≈ 20% feature importance); (3) relational modeling over the 22-player set beats per-player sequence models; (4) physics-informed losses (direction-cosine, velocity caps) are cheap wins; (5) horizontal flip is the best augmentation; (6) ensemble + test-time augmentation + multi-seed is the medal-round last mile (~0.005–0.010 LB).
- **Polymathic AI's The Well** (NeurIPS 2024, BSD-3-Clause): methodology of training models on simulation/trajectory data rather than text. Transferable principle: player dynamics are learned from trajectory distributions with physical structure (kinematics, coupling), not from memorized play labels; treat tracking frames as the primary signal and let relational structure emerge from the data.

**Hard constraints:**
- Methods only. No code lifted from any repo. Reimplementation from this spec.
- The Big Data Bowl 2026 dataset is **CC BY-NC 4.0 — non-commercial**. Do NOT train GSE's commercial model on it. Train on GSE's own NGS tracking data. (BDB data may be used for non-commercial benchmarking only, if at all.)
- ML work in Python (PyTorch). The TypeScript engine consumes this module through the input/output schemas below (parquet/CSV frame tables in, prediction tables out). Uncertainty outputs feed the engine's calibration rebuild — they must be calibrated per §8, not just emitted.

## 1. Task definition

Given tracking history for a play up to frame `t` (10 Hz NGS frames), predict for each of the 22 players:
- displacement `(dx, dy)` in yards at each horizon in `H = {5, 10, 20 frames}` (0.5s / 1.0s / 2.0s) **and** at the ball-landing frame (sample-specific Δt, passed as a feature),
- predicted speed magnitude `s_hat`,
- per-coordinate uncertainty `(log σx², log σy²)`,
- confidence `c ∈ [0,1]` that the position error will be < 1.0 yard.

Primary metric: RMSE in yards, same formula as BDB: `sqrt(0.5 * (mean((dx-dx̂)²) + mean((dy-dŷ)²)))`. Target: beat the 0.518–0.540 public reference band on GSE's own held-out games (band is directional — different data — but it is the only public yardstick).

## 2. Input schema (per play)

One row per entity per frame. Entities: 22 players + ball = 23 rows/frame.

**Raw tracking columns (from NGS ingest):**

| Column | Type | Notes |
|---|---|---|
| `game_id` | str | grouping key for splits |
| `play_id` | str | grouping key |
| `frame_id` | int | 10 Hz, monotonic within play |
| `time` | float | seconds since snap (snap = 0); history is `time <= t` |
| `entity_id` | str | player nflId or `"BALL"` |
| `x`, `y` | float | yards; x ∈ [0,120], y ∈ [0,53.3] |
| `s`, `a` | float | speed, acceleration (yd/s, yd/s²) |
| `dis` | float | distance traveled cumulative |
| `o`, `dir` | float | orientation, direction of motion (degrees) |
| `event` | str | e.g. `ball_snap`, `pass_forward`, `pass_arrived`; may be null |
| `team` | str | `"off"` / `"def"` / `"ball"` |
| `position` | str | QB/RB/WR/TE/OL/DL/LB/CB/S or null for ball |
| `is_targeted_receiver` | bool | from play metadata |
| `ball_landing_x`, `ball_landing_y` | float | known landing spot (conditioning) |
| `frames_to_landing` | int | landing frame − t (for landing head) |

**Play context columns (constant within play):** `quarter`, `down`, `yards_to_go`, `yardline_100` (yards from own goal, 1–99), `seconds_remaining`, `score_diff`, `play_direction` (`"left"`/`"right"` — normalize all plays to a canonical direction at load: see §6).

**History window:** `T = 10` frames (1.0 s) ending at `t`. (Ablation note in §9: try T=15.)

**Causality rule:** features may only use frames with `frame_id <= t`. The loader must enforce this; `test_causality` (§10) verifies it.

## 3. Output schema (per play, per horizon)

| Tensor | Shape | Meaning |
|---|---|---|
| `dx`, `dy` | [22] | predicted displacement in yards |
| `speed` | [22] | predicted speed magnitude, yd/s |
| `logvar` | [22, 2] | `log σx²`, `log σy²` |
| `conf` | [22] | P(position error < 1.0 yd), sigmoid output |

Ordering: fixed canonical order — 11 offense then 11 defense, sorted by `entity_id` within each. (Permutation invariance is tested, not relied upon.)

**Downstream contract:** engine receives `dx, dy, speed, σx, σy, conf` per player per horizon. Uncertainties are calibrated per §8 before any downstream use.

## 4. Feature list with computation recipes

All computed from raw columns; all causal (frames ≤ t only).

**Per-entity kinematic (per frame, then aggregated over window):**
- `x, y` (standardized with train-only mean/std)
- `vx, vy` = finite difference of (x, y) over 1 frame, yd/s
- `speed_now` = hypot(vx, vy); `accel_now` = finite difference of speed
- `heading` = atan2(vy, vx); `heading_change_3f` = angular difference vs 3 frames ago
- Window aggregates: `disp_3f`, `disp_10f` (displacement magnitudes), `max_speed_win`, `mean_speed_win`

**Relational (the highest-leverage group — compute per frame at t, plus 3-frame lag):**
- `dist_to_ball` = hypot(x − ball_x, y − ball_y)
- `angle_to_ball` = atan2(ball_y − y, ball_x − x) − heading (wrapped to [−π, π])
- `dist_to_ball_landing` = hypot(x − ball_landing_x, y − ball_landing_y) ← **anchor feature**
- `closing_to_landing` = −d/dt(dist_to_ball_landing) over 3 frames (positive = closing)
- `dist_to_targeted_receiver`, `is_targeted_receiver`
- `nearest_opp_dist`, `nearest_opp_closing` (3-frame derivative)
- `dist_to_own_endzone`, `dist_to_opp_endzone`, `dist_to_los` (line of scrimmage), `dist_to_sideline` = min(y, 53.3 − y)
- `speed_toward_ball` = projection of (vx, vy) onto unit vector toward ball

**Role/context embeddings (learned):**
- `position` → 16-dim embedding (QB/RB/WR/TE/OL/DL/LB/CB/S/BALL)
- `team` → 4-dim embedding (off/def/ball)
- play context vector: `[down/4, yards_to_go/30, yardline_100/100, seconds_remaining/3600, score_diff/30, quarter/4]` → MLP to 16-dim, broadcast as global conditioning

**Ball-landing conditioning (Takoi/Mifune lesson — do not skip):** `ball_landing_x, ball_landing_y, frames_to_landing` are appended to **two dedicated context tokens** (see §5), not just per-entity features. The model must be able to attend to the landing spot globally.

## 5. Relational architecture sketch

**Design:** query-centric transformer over the entity set (relational-over-22 beats per-player sequences).

1. **Per-entity temporal encoder.** For each of 23 entities: stack its T=10 frames of features (§4) → 1D conv (kernel 3) or single-layer GRU → 64-dim token. (Start with GRU; ablation vs. temporal conv in §9.)
2. **Entity embedding.** token = temporal_encoding + position_embedding(16) + team_embedding(4) → linear to `d_model = 128`.
3. **Context tokens.** Two extra tokens: `landing_token` = MLP([ball_landing_x, ball_landing_y, frames_to_landing]) and `play_token` = MLP(play context vector). Total sequence length = 25.
4. **Relational encoder.** 4-layer transformer, 4 heads, `d_model = 128`, full self-attention over all 25 tokens. **No positional encoding over entities** (set structure — permutation invariance required, tested in §10). Pre-norm, dropout 0.1.
5. **Decoder heads (per entity, per horizon).** Shared MLP (128 → 64 → outputs) applied to each of the 22 player tokens at each horizon:
   - `dx, dy` (linear)
   - `speed` (softplus)
   - `logvar_x, logvar_y` (linear; clamp to [−6, 4])
   - `conf` (sigmoid)
   - auxiliary: `dist_to_landing_hat` (linear) — trained, discarded at inference
6. **Horizons.** Separate decoder MLPs per horizon in H = {5f, 10f, 20f, landing}. Landing head additionally receives `frames_to_landing` as input feature (sample-specific Δt).

**Parameter target:** < 2M parameters for the single model. (Keeps 5-seed ensembles trainable overnight on one GPU.)

**GNN variant (documented alternative, not the primary):** message-passing over a fully connected 23-node graph with edge features = pairwise (dx, dy, dist). The transformer above subsumes this; implement only if the transformer underperforms the physics baseline by < 5%.

## 6. Loss terms (all formulas, with starting weights)

Notation: per player `i`, predicted `(dx̂, dŷ)`, truth `(dx, dy)`, `lx = log σx²`, `ly = log σy²`, `Δt` = horizon seconds.

1. **Gaussian NLL (position + uncertainty, primary):**
   `L_nll = mean_i 0.5 * (lx_i + (dx_i − dx̂_i)²/e^{lx_i} + ly_i + (dy_i − dŷ_i)²/e^{ly_i})`
   (constant log 2π dropped). Weight `w_nll = 1.0`.
2. **Speed consistency (Mifune lesson):**
   `L_speed = mean_i |ŝ_i − hypot(dx̂_i, dŷ_i)/Δt|`. Weight `w_speed = 0.2`.
3. **Direction-cosine physics loss:**
   Let `v_i` = last observed velocity vector, `d̂_i` = predicted displacement. For players with `|v_i| > 1.0` yd/s:
   `L_dir = mean_i w_i * (1 − (v_i·d̂_i)/(|v_i||d̂_i|))`, `w_i = min(|v_i|, 3)/3`.
   (Penalizes unphysical direction reversals at speed; quiet at low speed.) Weight `w_dir = 0.1`.
4. **Velocity cap (hinge):**
   `L_cap = mean_i ReLU(ŝ_i − v_max)²`, `v_max = 12.0` yd/s. Weight `w_cap = 1.0`. Should be ~0 at convergence; it is a guardrail, not a teacher.
5. **Confidence head (BCE):**
   label `z_i = 1[hypot(dx_i − dx̂_i, dy_i − dŷ_i) < 1.0]` (computed from detached predictions each batch);
   `L_conf = BCE(c_i, z_i)`. Weight `w_conf = 0.2`.
6. **Auxiliary landing-distance:**
   `L_aux = mean_i (dist_to_landing_hat_i − dist_to_landing_true_i)²`. Weight `w_aux = 0.1`.

`L_total = w_nll·L_nll + w_speed·L_speed + w_dir·L_dir + w_cap·L_cap + w_conf·L_conf + w_aux·L_aux`

**Weight tuning protocol:** train with starting weights; on validation, grid-search `w_speed ∈ {0.1, 0.2, 0.4}`, `w_dir ∈ {0.05, 0.1, 0.2}`; keep the combination minimizing validation RMSE subject to `L_cap ≈ 0`. One round only — no endless tuning.

## 7. Augmentation protocol

Applied per training sample, **before** feature computation (flip raw coords, then recompute derived features):

1. **Horizontal flip (primary — best augmentation per winners):** `x' = 120 − x`, `vx' = −vx`, `dir' = 180 − dir`, `o' = 180 − o`; swap `play_direction`; recompute all distance features. Involutive — applying twice returns the original (tested).
2. **Position jitter:** add iid Gaussian noise σ = 0.1 yd to (x, y) per frame per entity; recompute derived kinematics. (Robustness to tracking noise.)
3. **Frame subsampling:** with p = 0.2, drop to every-2nd-frame history (T = 5 over 1.0 s). (Robustness to frame-rate variation.)

No vertical flip (field is not symmetric sideline-to-sideline for play direction semantics after canonicalization — actually y IS symmetric; but winners found horizontal flip sufficient; keep the protocol minimal and add vertical only if overfitting).

**Canonicalization at load (not augmentation):** normalize all plays to `play_direction = "right"` by applying the horizontal flip once where needed. Augmentation flip is then a true symmetry of the canonicalized data.

## 8. Training, validation, and uncertainty calibration

**Splits (no leakage — game-level, never shuffle plays across games):**
- Sort games chronologically. Expanding window: train on games 1..N−2k, validate on games N−2k+1..N−k, test on the most recent k games (k ≈ 10% of games, minimum 20 games).
- As new games arrive, roll the window forward and retrain. Validation is always the most recent pre-test block (recency matters — schemes drift).
- Feature standardization (mean/std) computed on train games only.

**Training:**
- Optimizer: AdamW, lr = 3e−4, weight decay 1e−2, batch = 256 plays, cosine schedule with 5% warmup, 100 epochs max, early stop on validation RMSE (patience 10).
- 5 seeds for the final ensemble (medal-round last mile). Single-seed model must first beat the physics baseline (§9) before ensembling.

**Test-time augmentation:** at inference, run each play twice (original + horizontally flipped), mirror the flipped prediction back, average `dx, dy`; combine uncertainties as mixture: `σ²_mix = mean(σ²) + var(means)`.

**Uncertainty calibration (feeds the engine's calibration rebuild — mandatory gate):**
- On the validation block, per player compute `σ̄ = sqrt(0.5·(σx² + σy²))` and empirical error `e = hypot(dx − dx̂, dy − dŷ)`.
- **Reliability:** bin by σ̄ into 10 equal-count bins; per bin compute RMSE_b and mean σ̄_b. 
- **ECE_regression** = Σ_b (n_b/N)·|RMSE_b − σ̄_b|. **Gate: ECE < 0.15 yd.**
- **Coverage:** fraction of true positions within Mahalanobis distance ≤ 1 (expect 0.393 for 2D Gaussian) and ≤ 2 (expect 0.865). **Gate: within ±5 pp of nominal.**
- **Recalibration if gates fail:** fit isotonic regression `σ_cal = f(σ̄)` on validation bins (monotone), or equivalently temperature-scale the log-variances `logvar' = logvar + log T` with scalar T fit to minimize validation NLL. Apply at inference. Re-check gates after.
- Report reliability diagram values (10 bin rows: n, mean σ̄, RMSE) in the training log — file-verifiable numbers, not plots alone.

## 9. Baselines and ablations (build order)

- **Phase 0 — physics baseline (must exist first):** constant-velocity extrapolation + ball-landing prior (players drift toward landing spot at observed speed). No learning. This is the floor every learned model must beat, and it validates the data pipeline end-to-end.
- **Phase 1 — single relational model** (§5) trained per §8. Acceptance: validation RMSE beats Phase 0 by ≥ 10%.
- **Phase 2 — uncertainty + calibration** (§8 gates). Acceptance: ECE < 0.15 yd, coverage within ±5 pp.
- **Phase 3 — ensemble (5 seeds) + TTA.** Acceptance: test RMSE improves over Phase 1 single model; expected gain ~0.005–0.010 in BDB units — small but it is the documented last mile.
- **Ablations (one training run each, report Δ validation RMSE):** no landing conditioning (expect large degradation — documents takeaway #2); per-player LSTM instead of relational encoder (expect degradation — documents #3); T=15 vs T=10; GRU vs temporal conv; drop `L_dir`/`L_cap` (expect small RMSE change but physics violations rise — documents #4).

## 10. Exact test assertions

(Data tests use a synthetic 2-game fixture with known kinematics; model tests use random init + fixed seed.)

1. `test_output_shapes`: batch of B=4 plays → `dx,dy` [4,22], `speed` [4,22], `logvar` [4,22,2], `conf` [4,22], per horizon.
2. `test_finite`: no NaN/Inf in any output on the fixture.
3. `test_speed_cap`: `speed ≤ 12.0 + 1e-6` everywhere.
4. `test_no_teleport`: `hypot(dx,dy) ≤ 12.0·Δt + 0.5` for every player/horizon (0.5 yd slack for acceleration).
5. `test_positive_uncertainty`: `σx, σy > 0` everywhere (equivalently `logvar` finite).
6. `test_conf_range`: `0 ≤ conf ≤ 1`.
7. `test_determinism`: two forward passes, same seed, `torch.use_deterministic_algorithms(True)` → max abs diff < 1e−6.
8. `test_permutation_invariance`: permute the 22 player input rows (carrying their features) → outputs permuted identically, max abs diff < 1e−5. (Architecture must have no entity positional encoding.)
9. `test_flip_involution`: augmentation flip applied twice == original inputs exactly.
10. `test_causality`: zeroing all frames with `frame_id > t` leaves outputs unchanged (max abs diff < 1e−6) — proves no future leakage in the loader.
11. `test_canonicalization`: a left-direction play and its canonicalized right-direction version produce mirrored-identical predictions.
12. `test_calibration_synthetic`: synthetic data with known iid Gaussian noise σ=0.5 yd → after the §8 protocol, ECE < 0.10 and coverage within ±3 pp of (0.393, 0.865).
13. `test_baseline_beats_naive`: Phase 0 physics baseline RMSE < last-position-carried-forward RMSE on the fixture (sanity that the pipeline works).
14. `test_loader_schema`: loader output contains every column in §2 with correct dtypes and ranges (x ∈ [0,120], y ∈ [0,53.3], no null `entity_id`).

## 11. Integration points (GSE engine)

- **Consumes:** NGS tracking ingest (frame tables per §2). The loader specified here is the contract — whatever produces the frame tables must satisfy `test_loader_schema`.
- **Feeds:** the engine's calibration rebuild — calibrated `(dx, dy, σx, σy, conf)` per player per horizon become features for downstream win-probability / EPA modules. Uncertainty gates in §8 must pass before downstream use; if they fail, the module ships point predictions only and the failure is logged, not silently consumed.
- **Does not touch:** the fleet/agent work (parked per Garrett 2026-09-26), broadcast-video pipeline (separate module), or any BDB CC BY-NC data for training.

## 12. Open questions for Garrett (do not block build)

1. Which NGS seasons are licensed/available for training? (Determines the expanding-window depth.)
2. Is the ball-landing spot available at inference time in production, or only historically? (If not, the landing head needs a landing-spot predictor upstream — spec the fallback: replace true landing with predicted landing from a separate small model, and log the degradation.)
3. GPU budget for the 5-seed ensemble cadence (nightly? weekly?).

---
*Methods-only spec. No code reproduced from any external source. License posture: train on GSE's own NGS data; BDB-2026 artifacts referenced for methodology under their own licenses (MIT artifacts noted as directly reusable with attribution; unlicensed writeups are learn-from only).*
