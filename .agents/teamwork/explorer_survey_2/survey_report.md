# Comprehensive Survey Report: Signal Registry & Prediction Engine Math

**Author**: Explorer 2 (Teamwork Explorer Agent)  
**Date**: 2026-10-04  
**Target Working Directory**: `C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2`  
**Governing Doctrine**: Standing Doctrines 1–11 in `AGENTS.md`  

---

## Executive Summary

This investigation was commissioned to conduct an exhaustive audit and technical survey of the Galaxy Sports Edge (GSE) **Signal Registry** (`packages/ingestion-pipeline`), **Prediction Engine** (`packages/prediction-engine`), the quantitative mathematical modules in `frontier/sports/`, and their integration requirements with the mandatory emission gate `frontier/sports/engine_gate.py`.

### Core Discoveries:
1. **Signal Registry Catalog (47 Registered Signals)**:
   - `packages/ingestion-pipeline/src/signal-registry-definitions.ts` declares **19 base signals**, **5 blocked signals** (`BLOCKED_SIGNALS`), and imports **23 extended signals** from `signal-registry-extensions.ts`.
   - Total canonical signals registered in `SIGNAL_REGISTRY` = **47 signals**.
   - Signals are classified across **8 families** (`MARKET`, `EFFICIENCY`, `TRENCHES`, `LUCK`, `SITUATIONAL`, `NARRATIVE`, `MICROCLIMATE`, `MARKET_MICROSTRUCTURE`) and 14 data categories matching Prisma `SignalCategory`.
   - **Continuous vs Probability Distinction**: 23 extended NFL signals and 7 base signals output `CONTINUOUS_VALUE` (e.g. multipliers, fatigue indexes, EPA shifts). In `signal-registry-runner.ts`, `isSignalProbabilityValue` strictly filters out continuous values so scalars cannot pollute independent 2-way win probability blending.
2. **Mathematical Suites (Dual-Language Landscape)**:
   - **TypeScript (`packages/prediction-engine`)**: Implements Poisson scoring (`poisson.ts`), Dixon-Coles low-score adjustment (`dixon-coles.ts`), Skellam spread cover (`skellam.ts`), opponent-adjusted EPA fixed-point iteration with DAVE shrinkage (`signals/opponent-adjusted-epa.ts`), CQR surrogate calibration (`hpo/cqr-surrogate.ts`), and pregame logistic bridge (`bridge/bridge-model.ts`).
   - **Python (`frontier/sports/`)**: High-performance institutional mathematical engines exist in Python with **84/84 passing pytest unit tests**:
     - **Wilson Score LCB**: Implemented in `frontier/sports/engine_gate.py:91-104` (`bootstrap_free_lcb`).
     - **Bayesian Robust Kelly**: Implemented in `frontier/sports/bayesian_robust_kelly_engine.py` (Conjugate Beta-Binomial posterior, Cornish-Fisher quantile inversion, CV penalty $\kappa$, Browne 50% drawdown ruin probability, correlated portfolio Kelly).
     - **Copula Tail Dependence**: Implemented in `frontier/sports/vine_copula_parlay_engine.py` (Clayton lower-tail, Gumbel upper-tail, Frank symmetric, Gaussian, exact h-functions, Fréchet-Hoeffding bounds, 50,000 QMC simulation).
     - **Higham Nearest-PSD Matrix Repair**: Implemented in `frontier/sports/matrix_repair.py` (eigenvalue projection $\hat{\lambda} = \max(\lambda, \epsilon)$, diagonal renormalization, safe Cholesky).
     - **Poisson / Dixon-Coles**: Implemented in `frontier/sports/dixon_coles_simulation_engine.py` (GAS update, V4 match simulator).
     - **Conformal Prediction / CQR**: Implemented in `frontier/sports/adaptive_conformal_engine.py` (DtACI online miscoverage gradient descent, Jackknife+ finite-sample intervals $\ge 1-2\alpha$, ECAP Tweedie empirical-Bayes shrinkage).
     - **EPA & SVI**: Implemented in `frontier/sports/nfl_ep_wp_engine.py` (canonical 7-state multinomial logit EP/EPA, Brownian motion lead decay WP, Baldwin spread conditioning) and `frontier/sports/shootout_velocity_engine.py` (SVI logistic formula, harmonic mean bilateral playoff leverage, geographic rivalry decay, 3300s scrimmage clock expansion simulation).
3. **Engine Gate Gap Analysis**:
   - `frontier/sports/engine_gate.py` currently executes:
     - G1: Live Roster Gate (`intelligence.roster.live_roster_gate.py`)
     - G2: Provenance Gate (checks `Sourced` object, non-manual, max age)
     - G3: JEV Gate (`subprocess.run(["jev.cmd", "ask"])`)
     - G4: Real LCB Gate (`bootstrap_free_lcb` on raw history)
     - G5: Stamping (`ENGINE_GATE_V1`)
   - **Gap Identified**: `engine_gate.py` does NOT currently invoke the Signal Registry (`SIGNAL_REGISTRY`), nor does it run candidates through BDR-Kelly, Vine Copula, SVI, or Matrix Repair.
   - **Bridge Requirement**: Because `engine_gate.py` is in Python and the Signal Registry is in TypeScript, an explicit bridge/adapter is needed to satisfy Deliverable 1 of `ORIGINAL_REQUEST.md`.

---

## Part 1: Signal Registry Inventory & Architecture

### 1.1 Source Files & Schema Definition
The Signal Registry architecture is partitioned across three core files:
1. `packages/types/src/signal-registry.ts`: Type contracts and runtime type guards.
2. `packages/ingestion-pipeline/src/signal-registry-definitions.ts`: Base signals (19), blocked signals (5), runner logic.
3. `packages/ingestion-pipeline/src/signal-registry-extensions.ts`: Extended NFL research signals (23).

#### Core Type Contract (`packages/types/src/signal-registry.ts:135-166`)
```typescript
export interface SignalDefinition {
  readonly id: string;
  readonly label: string;
  readonly category: SignalCategory;
  readonly family: SignalFamily;
  readonly outputKind: SignalOutputKind;
  readonly validSports: readonly SportKey[];
  readonly owner: string;
  readonly dataDependencies: readonly string[];
  readonly activationStatus: EvidenceActivationStatus;
  readonly trustWeight: number;
  readonly killLine: SignalKillLine;
  readonly isRightsCleared: (env: Record<string, string | undefined>) => boolean;
  readonly acquisitionTask: string | null;
  readonly blockedReason: string | null;
  readonly evaluate?: SignalEvaluator;
}
```

#### Taxonomy Dimensions:
- **`category`** (14 members from Prisma `SignalCategory`): `ODDS`, `SCHEDULE`, `WEATHER`, `INJURIES`, `RATINGS`, `TEAM_RATES`, `STANDINGS`, `MILESTONES`, `PLAYER_AVAILABILITY`, `OFFICIALS`, `VENUE_ENVIRONMENT`, `PACE`, etc. Represents data-source origin.
- **`family`** (8 members in `SignalFamily`): `MARKET`, `EFFICIENCY`, `TRENCHES`, `LUCK`, `SITUATIONAL`, `NARRATIVE`, `MICROCLIMATE`, `MARKET_MICROSTRUCTURE`. Used for multi-collinearity clustering: signals within the same family do not count as independent corroboration.
- **`outputKind`**: `2WAY_PROBABILITY`, `3WAY_PROBABILITY`, `SPREAD_COVER_PROBABILITY`, `CONTINUOUS_VALUE`, `MULTIPLIER`.
- **`killLine`**:
  ```typescript
  export const DEFAULT_KILL_LINE = {
    maxBrierScoreVsMarket: 0.250,
    minSettledSample: 100,
    maxDivergenceZScore: 3.0,
    maxAgeMinutes: 120,
  } as const;
  ```

### 1.2 Exhaustive Signal Registry Catalog (47 Total)

| Index | Signal ID | Label | Category | Family | Output Kind | Activation Status | Trust Weight |
|---|---|---|---|---|---|---|---|
| 1 | `prefetched_exchange` | Caller-supplied / Pre-fetched Exchange Fair Value | ODDS | MARKET | 2WAY_PROBABILITY | ACTIVE | 1.00 |
| 2 | `kalshi` | Kalshi Exchange Real-time Fair Value | ODDS | MARKET | 2WAY_PROBABILITY | ACTIVE | 1.00 |
| 3 | `espn_powerindex` | ESPN Football Power Index (FPI) Logistic | RATINGS | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 0.80 |
| 4 | `clubelo` | ClubElo European Football Ratings | RATINGS | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 0.90 |
| 5 | `poisson_dixon_coles` | Team Rate Scoring Model (Dixon-Coles / Poisson) | TEAM_RATES | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 1.00 |
| 6 | `skellam_cover` | Skellam Cover Spread Fair Value | TEAM_RATES | EFFICIENCY | SPREAD_COVER_PROBABILITY | ACTIVE | 0.85 |
| 7 | `mlb_standings` | MLB Official Standings Win% Logistic | STANDINGS | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 0.75 |
| 8 | `elo` | Chronological Team Results Elo | RATINGS | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 0.90 |
| 9 | `polymarket_gamma_internal` | Polymarket Prediction Exchange Gamma Fair Value | ODDS | MARKET | 2WAY_PROBABILITY | SHADOW_ONLY | 0.50 |
| 10 | `nfl_epa_adj` | NFL Opponent-Adjusted EPA/Play (nflverse) | RATINGS | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 1.00 |
| 11 | `nfl_wind_elasticity` | NFL Wind Elasticity & Convex Passing/FG Decay | WEATHER | MICROCLIMATE | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 12 | `nfl_coaching_tendencies` | NFL Coaching 2nd-Down Run Alternation & 4th Down Conservatism | PACE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 13 | `nfl_injury_trajectory` | NFL Practice Report Wed/Thu/Fri Trajectory & Questionable Fade | INJURIES | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.12 |
| 14 | `nfl_redzone_te_leverage` | NFL Red Zone TE Leverage & Scoring Efficiency | TEAM_RATES | EFFICIENCY | 2WAY_PROBABILITY | ACTIVE | 0.10 |
| 15 | `nfl_offensive_line_trench` | NFL Offensive Line Continuity & PBWR Trench Edge | TEAM_RATES | TRENCHES | CONTINUOUS_VALUE | ACTIVE | 0.12 |
| 16 | `nfl_referee_crew_tendencies` | NFL Referee Crew Penalty & Total Points Elasticity | OFFICIALS | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 17 | `nfl_circadian_travel_fatigue` | NFL Circadian Rhythm & Timezone Travel Fatigue | SCHEDULE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.09 |
| 18 | `nfl_contract_milestones` | NFL Late-Season Contract Incentives & Milestone Funneling | MILESTONES | NARRATIVE | CONTINUOUS_VALUE | ACTIVE | 0.11 |
| 19 | `nfl_wr1_out_redistribution` | NFL Alpha WR1-Out Vacated Target Reallocation | PLAYER_AVAILABILITY | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.14 |
| 20 | `nfl_contract_incentives` | NFL Player Contract Incentives & Milestones | MILESTONES | NARRATIVE | 2WAY_PROBABILITY | BLOCKED_MISSING_SOURCE | 0.00 |
| 21 | `nfl_cognitive_load_fatigue` | NFL Cognitive Load & Thursday Night Travel Stress | SCHEDULE | SITUATIONAL | 2WAY_PROBABILITY | BLOCKED_MISSING_SOURCE | 0.00 |
| 22 | `nfl_beat_desk_corroboration` | NFL Beat Reporter Injury & Depth Chart Insights | PLAYER_AVAILABILITY | NARRATIVE | 2WAY_PROBABILITY | BLOCKED_MISSING_SOURCE | 0.00 |
| 23 | `nfl_trench_pass_block_win_rate` | NFL Offensive vs Defensive Line Pass Block Win Rate (PBWR) | TEAM_RATES | TRENCHES | 2WAY_PROBABILITY | BLOCKED_MISSING_SOURCE | 0.00 |
| 24 | `nfl_luck_fumble_regression` | NFL Fumble Recovery & 3rd Down Conversion Luck Regression | TEAM_RATES | LUCK | 2WAY_PROBABILITY | BLOCKED_MISSING_SOURCE | 0.00 |
| 25 | `nfl_turnover_luck` | NFL Turnover Luck (recovery variance vs skill) | TEAM_RATES | LUCK | CONTINUOUS_VALUE | ACTIVE | 0.12 |
| 26 | `nfl_short_week_road_deficit` | NFL Short-Week Road Rest Deficit | SCHEDULE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.11 |
| 27 | `nfl_age_conditioned_rest` | NFL Age-Conditioned Rest Recovery | SCHEDULE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 28 | `nfl_fourth_down_aggressiveness` | NFL Fourth-Down Coaching Aggressiveness | PACE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.09 |
| 29 | `nfl_second_and_ten_tendency` | NFL 2nd-and-10 Play-Calling Tendency (Lopez) | PACE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.07 |
| 30 | `nfl_primetime_target_concentration` | NFL Primetime Target Concentration | PLAYER_AVAILABILITY | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 31 | `nfl_early_down_proe_momentum` | NFL Early-Down PROE Momentum | PACE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 32 | `nfl_two_minute_hurry_up` | NFL Two-Minute Hurry-Up Efficiency | PACE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 33 | `nfl_bye_week_defensive_install` | NFL Bye-Week Defensive Installation Edge | SCHEDULE | SITUATIONAL | CONTINUOUS_VALUE | ACTIVE | 0.09 |
| 34 | `nfl_qb_twp_regression` | NFL QB Turnover-Worthy-Play Regression | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.13 |
| 35 | `nfl_qb_receiver_continuity` | NFL QB-Receiver Continuity | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 36 | `nfl_penalty_differential_momentum` | NFL Penalty Differential Momentum | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.07 |
| 37 | `nfl_backup_qb_target_distribution` | NFL Backup-QB Target Distribution Shift | PLAYER_AVAILABILITY | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.11 |
| 38 | `nfl_man_zone_receiver_archetype` | NFL Man/Zone Receiver Archetype Matchup | PLAYER_AVAILABILITY | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 39 | `nfl_wr1_vacated_target_efficiency` | NFL WR1-Out Efficiency Decay | PLAYER_AVAILABILITY | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 40 | `nfl_redzone_opportunity_conversion` | NFL Red-Zone Opportunity Conversion | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.11 |
| 41 | `nfl_negative_binomial_redzone_td` | NFL Negative-Binomial Red-Zone TD Rate | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.10 |
| 42 | `nfl_redzone_personnel_grouping` | NFL Red-Zone Personnel Grouping Edge | TEAM_RATES | EFFICIENCY | CONTINUOUS_VALUE | ACTIVE | 0.09 |
| 43 | `nfl_rookie_breakout_cohort` | NFL Rookie Breakout Cohort | PLAYER_AVAILABILITY | NARRATIVE | CONTINUOUS_VALUE | ACTIVE | 0.06 |
| 44 | `nfl_high_altitude_fatigue` | NFL High-Altitude Fatigue Decay | VENUE_ENVIRONMENT | MICROCLIMATE | CONTINUOUS_VALUE | ACTIVE | 0.07 |
| 45 | `nfl_linear_wind_pass_impact` | NFL Linear Wind Passing Impact | WEATHER | MICROCLIMATE | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 46 | `nfl_temperature_precipitation_decay` | NFL Temperature & Precipitation Decay | WEATHER | MICROCLIMATE | CONTINUOUS_VALUE | ACTIVE | 0.08 |
| 47 | `nfl_turf_surface_fatigue` | NFL Turf Surface Fatigue | VENUE_ENVIRONMENT | MICROCLIMATE | CONTINUOUS_VALUE | ACTIVE | 0.06 |

### 1.3 Validation & Execution Semantics
In `packages/ingestion-pipeline/src/signal-registry-runner.ts:46-78`:
1. **Activation Filter**: Skips if `signal.activationStatus !== "ACTIVE"`.
2. **Rights Gate**: Checks `signal.isRightsCleared(ctx.env)`.
3. **Sport Filter**: Checks `signal.validSports.includes(ctx.sportKey)`.
4. **Execution Safety**: Evaluates `signal.evaluate(ctx)` inside a fail-closed `try/catch`. Exceptions log warning and yield silence (null semantics).
5. **Type Narrowing**: Uses `isSignalProbabilityValue(val)` (`packages/types/src/signal-registry.ts:125-133`):
   ```typescript
   export function isSignalProbabilityValue(
     value: SignalValue | SignalContinuousValue | null | undefined
   ): value is SignalValue {
     if (value === null || value === undefined) return false;
     if (!("homeFairProb" in value) || !("awayFairProb" in value)) return false;
     const { homeFairProb, awayFairProb } = value;
     if (!Number.isFinite(homeFairProb) || !Number.isFinite(awayFairProb)) return false;
     return homeFairProb >= 0 && homeFairProb <= 1 && awayFairProb >= 0 && awayFairProb <= 1;
   }
   ```
   **Key Finding**: Signals returning `SignalContinuousValue` (`{ value: number, capturedAt: string }`) are deliberately excluded from independent market fair value blending. This prevents a scalar (e.g. 0.92 wind passing multiplier) from being misinterpreted as a 92% win probability.

---

## Part 2: Exact Mathematical Equations & Implementation Catalog

The prompt mandates specific verification of six real mathematical equations:

### 2.1 Wilson Score Lower Credible Bound (LCB)
- **Mathematical Formula**:
  Given $n$ trials and $k$ successes, let $\hat{p} = \frac{k}{n}$. For confidence level $1 - \alpha$ with critical value $z$ (e.g., $z = 1.645$ for 95% one-sided):
  $$\text{Center} = \frac{\hat{p} + \frac{z^2}{2n}}{1 + \frac{z^2}{n}}$$
  $$\text{Margin} = \frac{z \sqrt{\frac{\hat{p}(1 - \hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$
  $$p_{\text{LCB}} = \max\left(0.0, \text{Center} - \text{Margin}\right)$$
- **Exact Code Location**: `frontier/sports/engine_gate.py:91-104`
  ```python
  def bootstrap_free_lcb(history: Sequence[float], line: float, side: str, z: float = 1.645) -> Optional[Dict[str, float]]:
      xs = [float(x) for x in history if x is not None]
      n = len(xs)
      if n < 5:
          return None
      hits = sum(1 for x in xs if (x > line if side == "OVER" else x < line))
      p = hits / n
      denom = 1 + z * z / n
      centre = p + z * z / (2 * n)
      margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
      return {"n": n, "p_hat": p, "p_lcb": max(0.0, (centre - margin) / denom)}
  ```
- **Error Conditions & Invariants**:
  - Sample floor: $n < 5$ returns `None`, forcing Gate G4 to fail closed (`ABSTAIN`).
  - Edge hurdle: Must satisfy $p_{\text{LCB}} - p_{\text{implied}} > 0$ and $\text{nominal\_edge} \ge \text{min\_edge}$ (default 3.5%).
  - Verified by `frontier/sports/test_engine_gate.py:78-83` (`test_lcb_is_real_not_edge_times_point8`).

### 2.2 Bayesian Distributionally Robust Kelly (BDR-Kelly)
- **Mathematical Formula**:
  1. Conjugate Beta-Binomial update:
     $$\alpha_{\text{post}} = \alpha_0 + k, \quad \beta_{\text{post}} = \beta_0 + (n - k)$$
     $$\mu_{\text{post}} = \frac{\alpha_{\text{post}}}{\alpha_{\text{post}} + \beta_{\text{post}}}, \quad \sigma^2_{\text{post}} = \frac{\alpha_{\text{post}} \beta_{\text{post}}}{(\alpha_{\text{post}} + \beta_{\text{post}})^2 (\alpha_{\text{post}} + \beta_{\text{post}} + 1)}$$
  2. Blended mean with small-sample weight $w_n = \min(1.0, n / 30)$:
     $$p_{\text{blended}} = (1 - w_n) p_{\text{model}} + w_n \mu_{\text{post}}$$
  3. LCB quantile via Cornish-Fisher quantile expansion:
     $$q_{\delta} = \mu_{\text{post}} + \left(z_{\delta} + \frac{\text{skew}}{6} (z_{\delta}^2 - 1)\right) \sigma_{\text{post}}$$
     $$p_{\text{LCB}} = \max\left(0.001, \min\left(0.999, q_{\delta} - (\mu_{\text{post}} - p_{\text{blended}})\right)\right)$$
  4. Full and LCB Kelly fractions for decimal odds $d$ (net odds $b = d - 1$):
     $$f^*_{\text{LCB}} = \max\left(0, \frac{b \cdot p_{\text{LCB}} - (1 - p_{\text{LCB}})}{b}\right)$$
  5. Coefficient of Variation (CV) penalty:
     $$CV^2 = \frac{\sigma^2_{\text{post}}}{p_{\text{blended}}^2}, \quad \kappa = \frac{1}{1 + \gamma \cdot CV^2}$$
  6. Final allocation:
     $$f_{\text{robust}} = \min\left(\text{cap}, f^*_{\text{LCB}} \times 0.25 \times \kappa\right)$$
  7. Browne 50% Drawdown Ruin Probability:
     $$\mu_g = f \cdot \text{edge}, \quad \sigma^2_g = f^2 b, \quad \theta = \frac{2\mu_g}{\sigma^2_g}, \quad P(\text{Ruin}) = \exp\left(-\theta \ln\left(\frac{1}{1 - 0.5}\right)\right)$$
- **Exact Code Location**: `frontier/sports/bayesian_robust_kelly_engine.py:79-192`
- **Fail-Closed Gate**: If $p_{\text{LCB}} - p_{\text{implied}} \le 0$ or $f_{\text{robust}} \le 0.0005$, returns `recommended_stake_dollars = 0.0` with status `"REJECTED_NO_LCB_EDGE"`.
- **Verified Unit Tests**: `frontier/sports/test_bayesian_robust_kelly_engine.py` (6/6 passing).

### 2.3 Copula Tail Dependence & C-Vine SGP Engine
- **Mathematical Formula**:
  - Clayton Copula (Lower Tail Dependence for Blowout / Offensive Collapse):
    $$C(u, v) = \left(u^{-\theta} + v^{-\theta} - 1\right)^{-1/\theta}, \quad \lambda_L = 2^{-1/\theta}, \quad \lambda_U = 0$$
    $$h(u \mid v) = \frac{\partial C}{\partial v} = v^{-\theta - 1} \left(u^{-\theta} + v^{-\theta} - 1\right)^{-1/\theta - 1}$$
    $$h^{-1}(w \mid v) = \left[\left(w \cdot v^{\theta + 1}\right)^{-\theta / (\theta + 1)} - v^{-\theta} + 1\right]^{-1/\theta}$$
  - Gumbel Copula (Upper Tail Dependence for Shootouts / Correlated Explosive Breakouts):
    $$C(u, v) = \exp\left( -\left[(-\ln u)^\theta + (-\ln v)^\theta\right]^{1/\theta} \right), \quad \lambda_U = 2 - 2^{1/\theta}, \quad \lambda_L = 0$$
    $$h(u \mid v) = C(u, v) \frac{1}{v} (\ln v)^{\theta - 1} \left[(-\ln u)^\theta + (-\ln v)^\theta\right]^{1/\theta - 1}$$
  - Fréchet-Hoeffding multi-dimensional bounds:
    $$\max\left(0, \sum_{i=1}^d p_i - (d - 1)\right) \le P_{\text{joint}} \le \min_{i} p_i$$
  - Canonical Vine Simulation: Generates correlated uniforms via $X_1 = W_1$ and $X_i = h^{-1}(W_i \mid X_1)$ over 50,000 QMC draws.
- **Exact Code Location**: `frontier/sports/vine_copula_parlay_engine.py:105-395`
- **Verified Unit Tests**: `frontier/sports/test_vine_copula_parlay_engine.py` (6/6 passing).

### 2.4 Higham Nearest Positive Semi-Definite (PSD) Matrix Repair
- **Mathematical Formula**:
  Given an arbitrary symmetric or non-symmetric matrix $A$ (e.g. empirical correlation matrix with negative eigenvalues due to missing data or extreme SGP legs):
  1. Symmetrize: $B = \frac{A + A^T}{2}$
  2. Spectral decomposition: $B = V \Lambda V^T$ where $\Lambda = \text{diag}(\lambda_1, \dots, \lambda_n)$
  3. Eigenvalue projection: $\hat{\Lambda} = \text{diag}(\max(\lambda_i, \epsilon))$ where $\epsilon = 10^{-6}$
  4. Reconstruct: $A_{\text{psd}} = V \hat{\Lambda} V^T$
  5. Correlation matrix diagonal normalization:
     $$D = \text{diag}\left(\frac{1}{\sqrt{\max(\text{diag}(A_{\text{psd}}), \epsilon)}}\right), \quad A_{\text{corr}} = D A_{\text{psd}} D$$
     Set $\text{diag}(A_{\text{corr}}) = 1.0$.
- **Exact Code Location**: `frontier/sports/matrix_repair.py:24-80`
  ```python
  def safe_cholesky(A: np.ndarray, eps: float = 1e-6) -> Tuple[np.ndarray, bool]:
      A = np.asarray(A, dtype=np.float64)
      try:
          L = np.linalg.cholesky(A)
          return L, False
      except np.linalg.LinAlgError:
          A_repaired = nearest_positive_definite(A, eps=eps)
          L = np.linalg.cholesky(A_repaired)
          return L, True
  ```
- **Verified Unit Tests**: `frontier/sports/test_matrix_repair.py` (2/2 passing).

### 2.5 Poisson, Dixon-Coles & Conformal Quantile Regression (CQR)
- **Poisson & Dixon-Coles**:
  - Independent Poisson scoring PMF: $P(X=x, Y=y) = \frac{e^{-\lambda_h} \lambda_h^x}{x!} \frac{e^{-\lambda_a} \lambda_a^y}{y!}$.
  - Dixon-Coles (1997) low-scoring correlation factor $\tau(x, y)$:
    $$\tau(0,0) = 1 - \lambda_h \lambda_a \rho, \quad \tau(0,1) = 1 + \lambda_h \rho, \quad \tau(1,0) = 1 + \lambda_a \rho, \quad \tau(1,1) = 1 - \rho$$
  - Implementations:
    - TypeScript: `packages/prediction-engine/src/poisson.ts`, `dixon-coles.ts`, `team-rates.ts`, `skellam.ts`.
    - Python: `frontier/sports/dixon_coles_simulation_engine.py` (GAS dynamic tracking).
- **Conformal Prediction & CQR**:
  - Adaptive Conformal Inference with Dynamic Tuning (DtACI, Zaffran et al. 2022):
    $$\alpha_{t+1} = \alpha_t + \gamma_t (\alpha_{\text{nom}} - \text{err}_t), \quad \gamma_t = \gamma_0 \left(1 + 2 \sqrt{\text{Var}(\text{err}_{t-w:t})}\right)$$
  - Jackknife+ Finite-Sample Prediction Interval:
    $$C_{n, \alpha}(x_{n+1}) = \left[ q_{\alpha(n+1)}\left(\mu_{-i}(x_{n+1}) - R_i\right), \; q_{(1-\alpha)(n+1)}\left(\mu_{-i}(x_{n+1}) + R_i\right) \right]$$
    guarantees coverage $\ge 1 - 2\alpha$.
  - Excess Certainty Adjusted Probabilities (ECAP) via Tweedie shrinkage:
    $$\Delta p = \lambda \cdot (p - \mu_{\text{prior}}) \cdot (1 - 4 p (1 - p))$$
  - Implementations:
    - Python: `frontier/sports/adaptive_conformal_engine.py`.
    - TypeScript: `packages/prediction-engine/src/hpo/cqr-surrogate.ts`, `packages/prediction-engine/src/decision/no-bet-filters.ts` (`cqrVarianceGate`).

### 2.6 Expected Points Added (EPA) & Shootout Velocity Index (SVI)
- **Expected Points Added (EPA)**:
  - Canonical 7-state multinomial logit for next scoring event $k \in \{\text{TD}, \text{FG}, \text{Safety}, \text{NoScore}, -\text{Safety}, -\text{FG}, -\text{TD}\}$:
    $$P(\text{Score} = k) = \frac{\exp(x^T \beta_k)}{\sum_l \exp(x^T \beta_l)}$$
    $$EP = \sum_{k=1}^7 V_k P(\text{Score} = k), \quad EPA = EP_{\text{post}} - EP_{\text{pre}} + \text{PointsScored}$$
  - Closed-form Brownian motion continuous lead decay:
    $$P(\text{Win} \mid L, \tau) = 0.5 \left[1 + \text{erf}\left(\frac{L}{\sqrt{4 D \tau}}\right)\right]$$
  - Baldwin spread conditioning: blends in-game physical lead with pregame spread prior via weight $w(\tau) = (\tau / 3600)^{1.5}$.
  - Implementations:
    - Python: `frontier/sports/nfl_ep_wp_engine.py`.
    - TypeScript: `packages/prediction-engine/src/signals/opponent-adjusted-epa.ts` (iterative fixed-point opponent adjustment with 4 coupled series and DAVE linear decay to week 6).
- **Shootout Velocity Index (SVI)**:
  - Exact logistic formulation ($0 \le \text{SVI} \le 100$):
    $$\text{SVI} = \frac{100}{1 + \exp\left(-0.6 \cdot (z_{\text{pace}} + z_{\text{env}} + z_{\text{expl}} + z_{\text{funnel}} + z_{\text{urgency}} + z_{\text{vegas}} + z_{\text{cond}})\right)}$$
    where:
    - $z_{\text{pace}} = 1.8 \cdot (28.0 - \text{avg\_sps})$
    - $z_{\text{env}} = +1.35$ (dome) or $-1.5 - 0.12(\text{wind} - 15.0)$
    - $z_{\text{expl}} = 25.0 \cdot (\text{bilateral\_explosive\_pass\_rate} - 0.09)$
    - $z_{\text{funnel}} = 0.8 \cdot (\text{funnel}_A + \text{funnel}_B)$
    - $z_{\text{urgency}} = 0.04 \cdot (\text{GSU} - 50.0)$, utilizing Bilateral Playoff Leverage (harmonic mean of win/loss playoff $\Delta P$) and geographic rivalry decay
    - $z_{\text{vegas}} = 0.12 \cdot (\text{total} - 45.0) - 0.25 \max(0, |\text{spread}| - 3.5) + 0.10 \cdot \text{line\_mov}$
    - $z_{\text{cond}} = 15.0 \cdot (\text{HHI}_{\text{targets}} - 0.09)$
  - Scrimmage clock expansion simulation: 3300 scrimmage seconds; incomplete passes freeze clock at 5.5s vs 20-34s in-bounds runoff.
  - Implementation: `frontier/sports/shootout_velocity_engine.py`.

---

## Part 3: Bridge & Adapter Architecture Analysis

### 3.1 Current Status
- `frontier/sports/engine_gate.py` runs inside a Python environment (`python.exe` 3.13 on Windows).
- The GSE Signal Registry lives in TypeScript packages (`@sports/ingestion-pipeline` and `@sports/prediction-engine`).
- **No active IPC bridge exists** connecting `frontier/sports/engine_gate.py` to the TypeScript Node.js runtime.
- In `frontier/sports/`, the only external tool invoked via subprocess is `jev.cmd ask` (`subprocess.run(["jev.cmd", "ask"], ...)`).
- However, as proven above, **all the mathematical engines required by the mandate already exist in Python in `frontier/sports/`** and pass all 84 unit tests.

### 3.2 Architectural Evaluation of Bridge Options

#### Option A: Subprocess Node.js CLI Bridge (`run_signal_registry_bridge.mjs`)
- **Mechanism**: A lightweight Node.js script is created that imports `runSignalRegistry` from `packages/ingestion-pipeline/src/signal-registry-runner.js`, accepts JSON input over `stdin`, and returns the evaluated signals as JSON over `stdout`. `engine_gate.py` calls this via `subprocess.run(["node", ...])`.
- **Pros**: Directly executes the TypeScript code; zero mathematical drift between web app and python gate.
- **Cons**: Process spawn overhead per candidate or batch (adds 500ms–2s per evaluation); requires Node runtime, tsx/esbuild transpilation, and Prisma client initialization.

#### Option B: Standalone Native Python Signal Registry Mirror (`frontier/sports/signal_registry.py`)
- **Mechanism**: Implement a native Python class `SignalRegistry` and `SignalDefinition` that mirrors the exact 47 signals defined in TS, executing the calculations using the existing Python modules (`nfl_ep_wp_engine`, `stadium_microclimate_engine`, `shootout_velocity_engine`, etc.).
- **Pros**: Sub-millisecond execution; pure Python stack; zero external runtime dependencies; allows direct integration with NumPy/SciPy in `engine_gate.py`.
- **Cons**: Requires keeping TS and Python signal definitions in sync.

#### Option C: Recommended Hybrid Protocol
- **Implementation**:
  1. Build `frontier/sports/signal_registry.py` matching the TypeScript `SignalDefinition` contract, schema, IDs, trust weights, and kill lines.
  2. Implement `scripts/verify-signal-registry-parity.mjs` and a pytest companion `frontier/sports/test_signal_registry_parity.py` that verifies 1:1 ID, family, category, and trustWeight parity between the TypeScript source of truth and Python registry.
  3. Integrate the Signal Registry and Python Math Engines into `frontier/sports/engine_gate.py`.

---

## Part 4: Engine Gate Contract & Signatures

### 4.1 Data Contracts (`frontier/sports/engine_gate.py`)

#### `Sourced` (Provenance Unit)
```python
@dataclass
class Sourced:
    value: Any
    source: str       # Banned: {"", "manual", "hand", "inline", "hardcoded", "llm", "assumed", None}
    captured_at: str  # ISO-8601 UTC string

    def age_minutes(self, now: datetime) -> float: ...
```

#### `Candidate` (Evaluation Subject)
```python
@dataclass
class Candidate:
    id: str
    player: str
    team: str
    market: str            # e.g. "rushing_yards", "receiving_yards", "receptions"
    side: str              # "OVER" | "UNDER"
    line: Sourced
    odds: Sourced          # American odds (-110, +140)
    projection: Sourced
    history: Sourced       # list of actual per-game numerical outcomes
    context: str = ""
    is_team_market: bool = False
```

#### `GateLog` & `EmittedPick` (Audit Output)
```python
@dataclass
class GateLog:
    gate: str              # "G1" | "G2" | "G3" | "G4" | "G5"
    ok: bool
    detail: str

@dataclass
class EmittedPick:
    candidate_id: str
    status: str            # "PLAY" | "ABSTAIN"
    win_prob: Optional[float]
    edge_pct: Optional[float]
    lcb_edge_pct: Optional[float]
    jev: Dict[str, Any]
    gates: List[GateLog]
    provenance: Dict[str, Any]
    stamped_at: str
    stamp: str = "ENGINE_GATE_V1"
```

### 4.2 Error Conditions & Fail-Closed Invariants
1. **G1 Live Roster**:
   - Player not on active ESPN roster $\implies$ FAIL (`rv.ok == False`).
   - Sleeper disagreement or inactive status $\implies$ FAIL.
   - Feed failure (HTTP 5xx, timeout, parse error) $\implies$ FAIL (never assume active).
2. **G2 Provenance**:
   - Bare un-Sourced value $\implies$ FAIL.
   - Hand-typed or placeholder source $\implies$ FAIL.
   - Data age exceeds `max_age` (line: 30m, odds: 30m, projection: 24h, history: 7d) $\implies$ FAIL.
3. **G3 JEV**:
   - JEV CLI timeout or exit non-zero $\implies$ FAIL.
   - JEV choice == `TRAP_OR_PASS` $\implies$ FAIL.
   - JEV choice == `CAUTION` with confidence $> 0.70 \implies$ FAIL.
4. **G4 Real LCB**:
   - Sample count $n < 5 \implies$ FAIL (`insufficient sample`).
   - $p_{\text{LCB}} \le p_{\text{implied}} \implies$ FAIL (Law 9: non-positive LCB edge).
   - $\text{edge} < \text{min\_edge\_pct}$ (default 3.5%) $\implies$ FAIL.
5. **G5 Stamp**:
   - Any pick missing `ENGINE_GATE_V1` stamp or failing any gate has `status = "ABSTAIN"`. `publishable(p)` strictly evaluates `False`.

---

## Part 5: Action Plan & Recommendations for Next Implementation Steps

To achieve full compliance with `ORIGINAL_REQUEST.md` (strengthening the Engine Gate to run every candidate through the Signal Registry and real math engines):

1. **Implement `frontier/sports/signal_registry.py`**:
   - Mirror the 47 signals from `packages/ingestion-pipeline/src/signal-registry-definitions.ts` and `signal-registry-extensions.ts`.
   - Provide evaluation logic for active signals using live feeds or candidate context.
2. **Strengthen `frontier/sports/engine_gate.py`**:
   - In Gate G4, combine `bootstrap_free_lcb` with `BayesianRobustKellyEngine.evaluate_single_bet_robust_kelly`.
   - Add Signal Registry validation (Gate G-Sig) ensuring candidate sports and markets are evaluated against registered signals.
   - Add SVI evaluation for game context (`ShootoutVelocityEngine`).
   - Add Higham Matrix Repair and Vine Copula SGP checks for any correlated parlay legs (`matrix_repair.py`, `vine_copula_parlay_engine.py`).
3. **Audit Tonight's DET @ CAR SNF Board**:
   - Ingest live lines and rosters for Detroit Lions at Carolina Panthers.
   - Evaluate all candidate props (Amon-Ra, Gibbs, Jameson Williams, Tetairoa McMillan, Chuba Hubbard) through the strengthened Engine Gate.
   - Produce a sealed, verified audit report.
