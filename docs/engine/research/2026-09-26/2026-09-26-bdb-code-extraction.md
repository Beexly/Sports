# NFL Big Data Bowl 2026 — Deep Code Extraction (Engine Track)

**Date:** 2026-09-26
**Purpose:** Maximum-leverage implementation extraction for GSE's NGS-enabled, calibration-rebuilding trajectory engine.
**Sources (both MIT-licensed, read-only clones at `/tmp/bdb/`):**
- `repo1` = `XxRemsteelexX/NFL-Big-Data-Bowl-2026-` (neural track: ST Transformer / CNN / GRU / position-specific ensemble, repo-reported 0.541 public LB)
- `repo2` = `shevchenko9liza/nfl-player-trajectory-prediction` (tabular track: boosting + SHAP-embedding meta-features, README reports RMSE 3.89 → 2.87, −26%)
- Big Data Bowl dataset is CC BY-NC 4.0; methods transfer, competition data must NOT be used commercially.

**License caveats:**
- repo1's `LICENSE` says MIT but the copyright holder is the placeholder `[Your Name]` — attribution is ambiguous; adapt methods, don't ship its text/code verbatim as if cleanly licensed.
- repo2's LICENSE is clean: `Copyright (c) 2026 Elizaveta Shevchenko`.

**Competition task (both repos):** given NGS-style tracking at 10 fps up to the moment of a pass, predict each player-to-predict's (x, y) coordinates over the ball's flight (~9.4 s → 94 frames in repo1; metric = mean Euclidean distance across predicted frames, lower = better). Both repos frame this as a **delta prediction problem**: predict stepwise per-frame increments, then cumulative-sum + anchor to the last observed position.

---

## 1. Architectures (repo1) — exact I/O and internals

### 1a. ST Transformer (best single: repo-reported 0.547 public LB)
File: `src/models/st_transformer.py`
- **Input:** `(B, 10, F)` — 10-frame window, F = number of features (167 in best config).
- Linear projection → d=128 → learned temporal positional embedding.
- **6 pre-norm Transformer encoder layers, 8 heads.**
- **Two learned pooling queries** via cross-attention (2 learned vectors attend over the 10 frame encodings; concatenated → 256).
- Residual MLP: 256 → `horizon*2` (horizon=94 → 188).
- **Output:** `(B, 94, 2)` — per-frame (dx, dy) increments; `torch.cumsum(dim=1)` → cumulative displacement from last observed position.
- Ablation verdict: 6 layers optimal; 8+ layers overfit (CV 0.0750 → 0.0755); 2 layers underfit (0.0794); hidden 128 optimal (64 too small, 256 overfit); window 10 optimal (8 too short, 11+ no gain, 14 worse).

### 1b. Multiscale CNN + Transformer (repo-reported 0.548)
File: `src/models/cnn_transformer.py`
- **Input:** `(B, 10, F)`.
- **Three parallel Conv1D branches, kernel 3, dilations 1/2/3**, each → 128 channels. Concat → 384 → linear fuse → 128.
- 2 pre-norm Transformer layers, 8 heads → same 2-query attention pooling → residual MLP → 94×2 → cumsum.

### 1c. GRU / JointSeqModel (production: hidden 64, unidirectional; repo-reported 0.557 public LB, seed 27)
File: `src/models/gru.py`
- **Input:** `(B, T, F)` (T=9 in competition variant).
- 2-layer GRU, hidden 64, unidirectional (production); competition variant (`nfl_gru.py`) supports bidirectional hidden 128.
- Optional projected input residual. Multi-query attention pooling → residual MLP → 94×2 → cumsum.
- **Ablation: BiGRU actively hurt** — CV 0.0798 → 0.0830, LB 0.557 → 0.583. Unidirectional is the move for causal trajectory data.
- Note: repo2's team NN track reportedly used Bi-GRU in a 0.534 LB ensemble — evidence is mixed across repos; repo1's own code-level ablation says bidirectional hurts.

### 1d. Position-specific ST (4th ensemble member, repo-reported 0.553 alone)
Notebook `12_position_specific_models.ipynb`.
- 22 positions divided into **4 groups by movement pattern** (WRs/routes, QBs/pocket, linemen/blocking, DBs/mirroring).
- Separate ST models per group with position-specific features; **router dispatches predictions per player at inference**.
- Alone it did NOT beat the global model (0.553 vs 0.547) — its ensemble value is diversity, not accuracy.
- Ensemble weight 0.2490.

### 1e. Ensemble (repo-reported 0.541 public LB)
File: `src/models/ensemble.py`
- **Weights:** ST 0.2517 / CNN 0.2517 / Position-ST 0.2490 / GRU 0.2476 (nearly uniform — diversity does the work, not weighting).
- Procedure: (1) average folds within architecture; (2) optional horizontal-flip TTA (flip features → predict → negate dy back); (3) weighted average; (4) convert displacement to absolute coords; (5) clip x→[0,120], y→[0,53.3].
- Ablation: ST+GRU+CNN = 0.540 (best); adding position model → 0.541; 20-model ensembles → 0.545; 12-model same-seed ensemble = no gain over single seed.

### Key architecture takeaways for Minis
1. **Delta formulation + cumulative sum** is the single most important representation choice: predict per-frame increments, cumsum, anchor to last observed position. Every architecture uses it.
2. Learned-query attention pooling (2 queries) beats last-frame / mean pooling across all architectures.
3. Window = 10 frames (1.0 s) optimal for 94-frame horizons. Longer context did not help.
4. Unidirectional recurrence for causal data; bidirectional empirically hurt.

---

## 2. Feature inventory — full recipes (repo1)

### 2a. `src/data/preprocessing.py` groups (167-feature stack)

**Basic/physical:**
- Height ft/in, BMI = `weight_lb / height_in² × 703`
- vx, vy, ax, ay, speed², acceleration magnitude
- Momentum x/y, kinetic energy
- Body orientation vs movement-direction angle difference
- Role flags: offense / defense / targeted receiver / coverage defender / passer

**Ball-relative (landing point as conditioning anchor):**
- `ball_dx = ball_land_x − x`, `ball_dy = ball_land_y − y`; Euclidean + squared distance
- `angle_to_ball = atan2(ball_dy, ball_dx)`; unit direction to landing point
- Velocity projection toward landing; velocity alignment (cosine)
- Orientation-to-landing angle difference

**Temporal:**
- Lags 1–5 for x, y, vx, vy, speed, acceleration
- Rolling mean/std, windows 3 and 5, for x, y, vx, vy, speed
- Velocity changes; EMA(α=0.3) for vx, vy, speed

**Geometric endpoint (THE most important group, +0.0045 CV when removed):**
- Time horizon = `num_frames_output / 10`, else 3.0 s
- Momentum baseline endpoint = `pos + vel × t`
- **Targeted receiver endpoint overridden to ball landing point**
- Endpoint clipped to field
- Vector/distance to endpoint; required velocity; current-vs-required velocity error
- Required acceleration = `2 × displacement / t²`, clipped to [−10, 10]
- Velocity alignment with endpoint

### 2b. `src/competition_code/nfl_gru.py` — the more complete feature engineer (ACTIVE groups)
Config `ENABLED_GROUPS`: `distance_rate`, `target_alignment`, `multi_window_rolling`, `extended_lags`, `velocity_changes`, `field_position`, `role_specific`, `time_features`, `jerk_features`, `interaction_features_mid`, `qb_relative`. Optional (disabled in active config): `curvature_landing`, `route_context`.

**Recipes:**
- **Direction normalization:** for rightward plays, mirror x ← 120−x, y ← 53.3−y, add 180° to dir/o, mirror landing coords; invert predictions afterward. (Canonical coordinate convention.)
- **Kinematics:** `vx = s·cos(dir)`, `vy = s·sin(dir)`, `ax = a·cos(dir)`, `ay = a·sin(dir)` — angle measured from +x axis. ⚠️ **REGRESSION HAZARD:** `src/data/preprocessing.py` swaps sin/cos for velocity and uses inconsistent component ordering for acceleration. Minis must pick ONE convention (repo1's competition code convention) and unit-test it.
- **Distance dynamics:** `d2ball_dt = diff(dist)×10`, `d2ball_ddt = diff(d2ball_dt)×10`, `time_to_intercept = dist / (|d2ball_dt|+0.001)` clipped [0,10].
- **Landing alignment:** velocity projection toward landing, perpendicular velocity, acceleration projection toward landing.
- **Rolling:** mean/std for vx, vy, speed, accel over 3/5/10 frames.
- **Extended lags:** x, y, vx, vy at lags 1–5; initial values filled with player's first observed value (no future leakage).
- **Change/turning:** Δvx, Δvy, Δspeed, wrapped Δdirection.
- **Field geometry:** distance to nearest sideline, distance to nearest end zone.
- **Role-conditioned:** receiver optimality = receiver_flag × velocity alignment; receiver deviation = receiver_flag × |perp velocity|; defender closing speed = coverage_flag × landing-point closing speed.
- **Time:** frames elapsed, normalized trajectory time, sine/cosine time encoding.
- **Jerk:** scalar jerk = diff(a)×10; component jerk = diff(ax)×10, diff(ay)×10.
- **Opponent interactions (target-only):** nearest + 2nd-nearest opposite-side players → `opp_dmin`, `opp_d2`, mean top-2 dist, closing rate, min closing rate, leverage sign (2D cross product), min pursuit-angle error, opponent count ≤10 yd, ally count ≤10 yd, 3-frame smoothed nearest dist/closing rate.
- **QB-relative:** distance to passer, velocity aligned/perpendicular to QB axis, signed bearing to QB + sin/cos encoding.

### 2c. `nfl_gnn.py` — geometric baseline + GNN-lite (named "Geometric Neural", it's NOT a message-passing GNN)
- **Geometric baseline → residual learning:** `compute_geometric_endpoint()` gives deterministic endpoints (momentum for most; targeted receivers → ball landing; coverage defenders with mirror_wr_dist<15 → ball landing + mirror offset, all clipped to field). `add_geometric_features()` then engineers 15 geometric-correction features (vector to geo endpoint, required velocity/accel, alignment, receiver urgency, defender coupling). The model learns **corrections to this baseline**, not raw endpoints — the single biggest feature-group win (+0.0045).
- **Neighbor embeddings ("GNN-lite"):** K=6 nearest players, radius 30 yd, tau=8.0; weights w=exp(−dist/8), normalized; split ally/opp. 17 features: weighted mean dx/dy/dvx/dvy for allies and opponents (8), ally/opp counts (2), min/mean ally/opp distances (4), top-3 nearest distances (3). +0.0030 CV impact when removed (2nd most important).
- **Route patterns:** 7 trajectory-shape features from last 5 frames (straightness, max/mean turn, depth, width, speed mean/change) → StandardScaler → KMeans, k=7, seed fixed, n_init=10. Cluster id as feature. Minor impact (+0.0012) but cheap.

---

## 3. Feature ablation ranking (repo1 notebook 13 — reported as 847+ experiments)
Baseline: all 167 features, CV 0.0750.

| Removed group | CV | Δ (higher = more important) |
|---|---|---|
| Geometric features | 0.0795 | **+0.0045 — most important** |
| GNN neighbor embeddings | 0.0780 | +0.0030 |
| Opponent features | 0.0772 | +0.0022 |
| Temporal features | 0.0768 | +0.0018 |
| Lag features | 0.0765 | +0.0015 |
| Route patterns | 0.0762 | +0.0012 |
| Rolling stats | 0.0758 | +0.0008 |
| Mirror WR | 0.0755 | +0.0005 |

---

## 4. Loss functions (repo1 `nfl_gru.py`)

**TemporalHuber (their competition loss):**
```
L = masked_time_weighted_Huber(δ=0.5) + 0.01 × masked_mean(second_difference²)
```
- Huber on per-frame error e: `0.5e²` if |e|≤0.5 else `0.5(|e|−0.25)`; masked to valid frames.
- **Time weight:** `w_t = exp(−0.03t)` — early frames weighted more (calibration anchor logic: get the start right).
- **Smoothness term:** first diff of predicted steps = step velocity; second diff = change in step velocity; penalize `mean(second_diff²)` with λ_smooth=0.01. (Their comment calls it "jerk" but it's actually **acceleration regularization** — GSE notes should use the correct term.)
- **No direction-cosine or explicit velocity-cap loss found in code.** Earlier summaries claiming those exist are unsupported by the extracted source; the only physics constraint is the λ=0.01 smoothness term.

---

## 5. Training protocol (repo1)

- **Seeds:** [42, 19, 89, 64] (separate full training per seed).
- **Folds:** 5-fold GroupKFold per seed, group key `game_id_play_id` — no players from the same play cross folds. (Notebooks also discuss 20-fold CV for stability; 20-fold reported best CV/LB correlation 0.95.)
- **Scaler:** StandardScaler fit ONLY on training-fold frames.
- **Competition variant:** separate ΔX and ΔY models (two nets), batch 256, up to 200 epochs, patience 30, LR 1e-3.
- **Validation metrics:** per-dimension RMSE, 2D RMSE, mean Euclidean distance.
- Reported LR 1e-3 optimal; batch 256; "frozen encoder fine-tuning" claimed as best single-model technique but **no code backing found** — treat as repo lore, not verified method.

---

## 6. Augmentation & TTA (repo1 `src/data/augmentation.py` + `src/models/ensemble.py`)

| Augmentation | Reported LB gain | Notes |
|---|---|---|
| Horizontal flip (y ← 53.3−y, landing y mirrored, vy/ay negated, dir/o ← 180−angle) | +0.007 | Most effective single aug; also used at inference as TTA (+0.005–0.010, "free") |
| Speed perturbation (Gaussian σ=0.1 on vx/vy, recompute speed) | +0.003–0.004 | Cheap, include |
| Time warp (smooth Gaussian time remap + per-feature interp) | +0.001–0.002 | Expensive, excluded from best models |
| Flip + Speed + TTA combined | +0.021 total | 0.568 → 0.547 |

**⚠️ REGRESSION HAZARDS:**
1. `apply_tta()` in `augmentation.py` is a **stub returning original predictions** — the working TTA is in `ensemble.py` only.
2. `ensemble.py`'s flip TTA flips only the indexed y column, not the full dependent feature schema (vy, ay, dir, o, landing y). A proper implementation must do **schema-aware feature recomputation** after any coordinate transform — or simply recompute features from flipped raw coords.
3. `docs/BIGDATA2_LESSONS.md` documents a catastrophic TTA misfire: noise+speed scaling applied **before** the scaler destroyed distributions and cratered LB 0.589 → 3.674. Rule: augment raw coords → recompute features → then scale.

---

## 7. Negative results (both repos — what did NOT work)

**Repo1:**
- BiGRU: worse (0.557 → 0.583 LB). LSTM: worse than GRU (CV 0.0863).
- 8+ layer transformers: overfit. 20-model ensembles: worse than 3-model.
- LightGBM: "complete failure" on this task.
- Coverage-heavy feature variants: underperformed baseline (distribution mismatch).
- Synthetic data: improved CV ~3% but LB flat/worse (0.557 → 0.559) — synthetic routes too clean; synthetic training is competition-illegal anyway.
- TTA done wrong (pre-scaler augmentation): 0.589 → 3.674.

**Repo2 (honest, documented in README):**
- **Removing Isolation-Forest/Z-score/IQR-flagged anomalies HURT: −0.14% RMSE.** Edge-of-field "anomalies" are real football situations; keep them.
- **DBSCAN on SHAP embeddings found no meaningful clusters** (vs KMeans K=4).
- **Shapley Flow clustering duplicated plain SHAP clustering (ARI = 0.97)** — the fancier explanation method added nothing.
- Their team NN track (Bi-GRU + ST transformer ensemble, LB 0.534) lives outside this repo.

---

## 8. Repo2 — the tabular track (portable to GSE's feature store / fast baselines)

- **Approach:** Ridge → XGBoost / LightGBM / CatBoost, GroupKFold by play, predict x and y with separate regressors.
- **Feature set** (function `create_features`, notebook cell 64): distance/vector to ball landing, velocity decomposition (s·cos(dir), s·sin(dir)), accel components, angle-to-ball + wrapped angle diffs, orientation−dir diff, estimated time to ball = dist/(s+0.1), relative coords (x/120, y/53.3), distance from center, role flags (targeted receiver / defensive coverage / passer / other route runner), offense/defense flags, play_direction_left, height→inches, BMI, interaction terms (is_targeted_receiver × distance, speed × distance). **RMSE 3.886 → 3.520 with engineered features alone.**
- **SHAP-embedding meta-features (the repo's signature trick):** train base LightGBM → `shap.TreeExplainer` → per-sample SHAP vectors (n_features-dim per sample) → KMeans K=4 (elbow + silhouette) → cluster labels back as features, concatenated with originals → **CV RMSE 3.48 → 3.10 (−11%)**. Agglomerative/ward and DBSCAN tried; KMeans won. Recipe is directly portable: any trained tree model → per-row explanation vectors → cluster → new categorical feature.
- **Optuna (TPE, 50 trials, 3-fold CV):** n_estimators 300–800, max_depth 7–11, learning_rate 0.03–0.1 (log), num_leaves 24–64, min_child_samples 20–60, subsample 0.75–0.95, colsample_bytree 0.75–0.95, seed 42 → **final RMSE 2.87 (−26% total)**.
- **Portability note:** repo2's pipeline is per-snapshot (last-frame) tabular, not sequence — it ignores the 94-frame trajectory structure. Its value for GSE is (a) the SHAP-embedding meta-feature recipe, (b) a fast CPU baseline for new markets, (c) the negative results on data cleaning.

---

## 9. Pretrained weights (repo1 — transfer value)

- Hosted on Kaggle datasets under `gdalbey/`: `6layer-seed700-flip-only`, `st-multiscale-cnn-w10-20fold`, `gru-w9-seed27-20fold`, `nfl-bdb-2026-position-st-combined`, `geo-w9-h64-b96-lr3e4`.
- Format: **PyTorch `.pt` state_dicts + `.pkl` StandardScalers + `cv_results.json`** (download script `scripts/download_pretrained.py`).
- No checksums, no architecture-metadata JSON — the state_dict must be loaded into the repo's exact model classes. Transfer value is limited (competition features ≠ GSE features); treat as reference checkpoints for debugging (do our outputs match on the same inputs?) rather than as base models.

---

## 10. Ranked "what to port" for GSE's engine

**Tier 1 — port first (ablation-backed):**
1. **Delta prediction formulation**: predict per-frame (dx, dy), cumsum, anchor to last observed position, clip to field bounds. Universal across all four architectures; the core representation insight.
2. **Geometric baseline + residual features** (+0.0045, most important group): deterministic endpoint per role (momentum default; receiver → target point; defender → mirrored assignment), then engineer vector-to-endpoint / required velocity / required accel / alignment as features. GSE already computes win-probability baselines — same pattern: strong prior + learned correction.
3. **GNN-lite neighbor embeddings** (+0.0030): K=6 nearest, radius 30, tau=8 exponential weights, ally/opp split, 17 aggregate features. Cheap, no graph library needed; directly maps to GSE's on-field matchup context.
4. **Horizontal flip augmentation + flip TTA** (+0.007 train, +0.005–0.010 free at inference): with the schema-aware recompute rule (flip RAW coords → recompute ALL features → scale).
5. **Opponent interaction features** (+0.0022): nearest/2nd-nearest defender distances, closing rates, leverage sign (2D cross product), pursuit-angle error.
6. **Time-weighted Huber + λ=0.01 accel smoothness loss**: `w_t = exp(−0.03t)` focuses learning on early frames — aligns with calibration (early-frame accuracy anchors everything downstream).

**Tier 2 — port next (architecture/training):**
7. **ST Transformer config**: window 10, d=128, 6 pre-norm layers, 8 heads, 2 learned pooling queries, residual MLP head. Verified sweet spot.
8. **Multiscale dilated Conv1D stem** (k=3, dilations 1/2/3) as an alternative front-end; near-identical score (0.548 vs 0.547) — diversity for ensembles.
9. **Small diverse ensemble, uniform weights** (ST + CNN + GRU): 0.547 → 0.540. 3 models, near-uniform weights; more models hurt.
10. **SHAP-embedding meta-features** (repo2, −11% RMSE): recycle any trained tree model into clustered explanation features. Cheap CPU win for GSE's tabular markets (props, fantasy).
11. **Role-conditioned features** (receiver optimality/deviation, defender closing speed) and role-specific endpoints.

**Tier 3 — situational:**
12. Position-specific models (only for ensemble diversity; never beat the global model).
13. Route-pattern KMeans clusters (cheap, +0.0012).
14. Jerk/curvature features (cheap; curvature group was disabled in the best config — try but measure).
15. Optuna search spaces (repo2's LightGBM ranges) for GSE's boosting baselines.

**Explicitly DO NOT port:** bidirectional recurrence (hurt), 8+ layer depth, 20-model ensembles, synthetic training data (LB regression + illegal for the comp), pre-scaler augmentation (the 3.674 crater), anomaly removal (hurt −0.14%), Shapley Flow (duplicated SHAP), LightGBM-as-primary for sequence tasks.

---

## 11. Verification status — proven vs asserted

**Code-verified:** delta formulation + cumsum; all four architectures' I/O; geometric baseline + residual features; neighbor embedding math (K=6, R=30, τ=8); route KMeans; TemporalHuber + smoothness loss formula; seeds/folds/scaler discipline; flip/speed/warp augmentation code; ensemble weights and TTA path; repo2 SHAP-embedding pipeline code; repo2 Optuna space; repo2 anomaly-removal experiment code.

**Repo-asserted (notebook tables, not independently re-run):** all LB/CV numbers (0.541, 0.547, ablations, +0.0045 etc.); the "847+ experiments" count; frozen-encoder fine-tuning (no code found); TTA +0.005–0.010 magnitude; repo2's final 2.87 RMSE.

**Disproven/flagged:** `apply_tta()` is a stub; ensemble flip TTA is schema-incomplete; sin/cos swap between the two repo1 feature engineers; `[Your Name]` license placeholder; repo2's "Bi-GRU" team score (0.534) conflicts with repo1's BiGRU-negative ablation — treat as unresolved, favor the code-level ablation.

---

## 12. Handoff notes for Minis/Hermes

- Full feature recipes: repo1 `src/competition_code/nfl_gru.py` (canonical engineer), `src/data/preprocessing.py` (legacy — kinematics convention wrong), `src/competition_code/nfl_gnn.py` (geometric + GNN-lite + routes).
- Losses: `TemporalHuber` in `src/competition_code/nfl_gru.py` — copy the formula, rename "jerk" → "acceleration/smoothness regularization."
- Models: `src/models/st_transformer.py`, `cnn_transformer.py`, `gru.py`, `ensemble.py`.
- First tests to write: (1) kinematics convention test (dir=0 → vx=s, vy=0); (2) flip-invariance test (predict(flip(x)) == flip(predict(x)) within tolerance); (3) geometric baseline test (receiver endpoint == target point); (4) GroupKFold no-play-leakage test; (5) delta cumsum identity test.
- Competition data is CC BY-NC 4.0: GSE trains on its own NGS data; these repos supply methods only.
