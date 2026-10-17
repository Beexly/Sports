# QUANTITATIVE PREDICTION & REASONING MODELS INVENTORY
**Compiled by**: GSE Engine Architecture / REA Verification Pipeline  
**Standards**: Model classification, input features, target output, mathematical assumptions, code repository implementation vs. literature paper status.

---

## 1. Implemented In-Code Models (GSE Production & Edge-Lab)

### Model 1: Glicko-2 with Idle Volatility Step
- **Category**: Rating & Dynamic Capability Engine
- **Target Output**: Dynamic skill rating $\mu$, rating deviation $\phi$, rating volatility $\sigma$.
- **Features / Inputs**: Match outcomes, opponent ratings, time elapsed since last game (idle decay step).
- **Mathematical Assumptions**: Skill parameter is Gaussian distributed; volatility $\sigma$ constrains the rate of variance expansion during inactive periods.
- **Repository Location**: `packages/prediction-engine/src/models/glicko2.ts` on `research/rating-atlas-2026-10-09-packet`.
- **Status**: **IMPLEMENTED IN CODE** (10/10 Vitest green).
- **Reusability**: UNIVERSAL (Team power ratings and player matchup tiers).

---

### Model 2: Dixon-Coles Bivariate Poisson Scoring Model
- **Category**: Game Totals & Exact Score Distribution Engine
- **Target Output**: Joint probability matrix $P(X = x, Y = y)$ for home/away points.
- **Features / Inputs**: Team offensive scoring intensity $\alpha_i$, defensive vulnerability $\beta_j$, home advantage $\gamma$, low-score correlation parameter $\rho$.
- **Mathematical Assumptions**: Scoring events follow non-homogeneous Poisson processes modified by copula-like dependence structure for low-scoring states (0-0, 1-0, 0-1, 1-1 in soccer; modified key numbers 3, 7, 10 in NFL).
- **Repository Location**: `packages/prediction-engine/src/models/dixon-coles.ts`.
- **Status**: **IMPLEMENTED IN CODE** (Validated with asymmetric devigging tests).
- **Reusability**: HIGH (NFL totals and derivative alternate spreads).

---

### Model 3: Bradley-Terry Paired Comparison Model
- **Category**: Moneyline & Direct Matchup Probability
- **Target Output**: $P(i > j) = \frac{\pi_i}{\pi_i + \pi_j}$.
- **Features / Inputs**: Team strength vectors $\pi$, home advantage scalar.
- **Mathematical Assumptions**: Unidimensional latent strength parameters with logit link function.
- **Repository Location**: `packages/prediction-engine/src/models/bradley-terry.ts`.
- **Status**: **IMPLEMENTED IN CODE**.
- **Reusability**: UNIVERSAL.

---

### Model 4: Conformal Margin Set Predictor (Inductive Venn-Abers)
- **Category**: Uncertainty Quantification & Coverage Sets
- **Target Output**: Multi-class confidence intervals with guaranteed finite-sample coverage $1 - \alpha$.
- **Features / Inputs**: Non-conformity scores derived from model error residuals on calibration folds.
- **Mathematical Assumptions**: Exchangeability of calibration and test distributions (marginal exchangeability holds under identical game conditions).
- **Repository Location**: `packages/prediction-engine/src/calibration/conformal.ts`.
- **Status**: **IMPLEMENTED IN CODE** (Guards against overclaiming edge).
- **Reusability**: CRITICAL.

---

### Model 5: Isotonic Temperature Scaling Calibrator (PAVA)
- **Category**: Post-Hoc Probability Calibration
- **Target Output**: Monotonically calibrated win probability $\tilde{p} = \sigma(z / T)$.
- **Features / Inputs**: Uncalibrated logit scores $z$, single learned scalar temperature $T > 0$.
- **Mathematical Assumptions**: Preserves rank ordering while minimizing empirical cross-entropy loss on validation folds.
- **Repository Location**: `packages/prediction-engine/src/calibration/temperature.ts`.
- **Status**: **IMPLEMENTED IN CODE**.
- **Reusability**: HIGH.

---

## 2. Models Described in Research Literature (Corpus Ingested)

### Model 6: Mamba State-Space Tracking Model (SportMamba)
- **Category**: Real-Time Player & Ball Trajectory State-Space Filtering
- **Target Output**: 2D coordinate position vectors $(x, y)$ and velocity $\vec{v}$ of 22 players at 10Hz.
- **Features / Inputs**: Camera-vision bounding box detections (from Hugging Face YOLOv8 pipeline).
- **Mathematical Assumptions**: Linear time-invariant continuous state-space discretization with selective parameter scan.
- **Corpus Citation**: Paper `[0008] SportMamba: Multi-Object Tracking in Sports Broadcast Video` (arXiv:2407.12984).
- **Status**: **DESCRIBED IN PAPER & PILOTED IN WATCH PIPELINE**.
- **Reusability**: HIGH (Powers the live camera-vision tracking pipeline).

---

### Model 7: WorldGym Autoregressive Diffusion Policy Evaluator
- **Category**: Counterfactual Play Simulation & Strategy Rollout
- **Target Output**: Expected play success rate $\hat{\rho}(\pi)$ under alternative play-calls (e.g. run vs pass on 4th & 1).
- **Features / Inputs**: Play initial condition frame + action chunk vector $\vec{a}$.
- **Mathematical Assumptions**: Latent diffusion transformer dynamics emulate physics and player reaction geometry.
- **Corpus Citation**: Paper `[2212] WorldGym: World Model as An Environment for Policy Evaluation` (arXiv:2506.00613).
- **Status**: **DESCRIBED IN PAPER** (Archived in `arxiv-deep/2212-*`).
- **Reusability**: HIGH (Simulating coach situational aggression).

---

### Model 8: Causal Trench Distortion & Pressure Model
- **Category**: Layer 2 Situational Pass Protection Overlay
- **Target Output**: Marginal QB EPA degradation $\Delta \text{EPA}_{\text{trench}}$ as a function of interior pressure.
- **Features / Inputs**: Opponent blitz rate, pass rush win rate (PRWR), offensive line continuity, short rest fatigue.
- **Mathematical Assumptions**: When pressure rate exceeds $38.5\%$, QB processing speed breaks non-linearly, driving an exponential increase in turnover-worthy plays.
- **Corpus Citation**: GSE Layer 2 Situational Dossier (`LAYER2_WEEKS_1_TO_5_SITUATIONAL_REASONING_DOSSIER.md`).
- **Status**: **IMPLEMENTED IN DATA ENGINE** (Verified across Weeks 1–5 FTN tracking).
- **Reusability**: CRITICAL (The primary Layer 2 overlay against sharp market lines).

---

## 3. Open Source Football Empirical Models (Extracted via REA)

### Model 9: Open Source Fourth Down Conversion & Decision Model
- **Category**: In-Game Situational Decision Modeling
- **Target Output**: Ex-ante Expected Win Probability Delta $\Delta \text{WP} = \text{WP}(\text{Go}) - \max(\text{WP}(\text{FG}), \text{WP}(\text{Punt}))$.
- **Features / Inputs**: Yardline, yards-to-go, time remaining, score differential, pre-game Vegas spread, timeouts, team offensive/defensive run/pass EPA tiers.
- **Mathematical Assumptions**: Conversion probability modeled via calibrated logistic splines; conditional value evaluated via dynamic expected points surface.
- **Repository Location / Citation**: Open Source Football (`opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/`); Baldwin (2020).
- **Status**: **INGESTED & CALIBRATED** (Direct reference model for game leverage evaluation).
- **Reusability**: HIGH.

---

### Model 10: Spatial Receiver Separation & Player Density Surface Estimator
- **Category**: Computer Vision & Spatial Coordinate Modeling
- **Target Output**: Continuous spatial player density $\hat{f}(x, y)$ and completion probability surface $\mathcal{S}(x, y)$.
- **Features / Inputs**: 2D coordinate positions $(x_i, y_i)$, speed $s_i$, orientation $\theta_i$ of defensive backs and receivers at pass arrival.
- **Mathematical Assumptions**: 2D bivariate Gaussian kernel density estimation (KDE) with bandwidth $\mathbf{H}$ parameterized by player velocity vectors.
- **Repository Location / Citation**: Open Source Football (`opensourcefootball.com/posts/2020-08-29-player-density-and-completion-surface-estimates/` & `2021-05-31-computer-vision-in-r-using-torch/`).
- **Status**: **VERIFIED IN ARTIFACT RECORD** (Integrated with Hugging Face YOLO + BoTSORT tracking pipeline).
- **Reusability**: VERY HIGH (Next-gen pass coverage evaluation).

