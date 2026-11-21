# Five-Paper Deep Research Synthesis: Trench Bradley–Terry, NFL Ghosts, Step-and-Turn, Combine ML & Decision Calibration (`2026-11-21`)

> **MIND-FIRST / INGEST-AND-LEARN Doctrine Compliance:** All five papers reviewed below were ingested directly from source PDFs in `C:\Users\Garrett\Downloads\`. Items #1–#4 (`arXiv`) are mathematically synthesized and operationalized cleanly; item #5 (`s40537-025-01128-3.pdf`, CC-BY-NC-ND 4.0) is **strictly LEARN-ONLY / CITE-ONLY** with high-level methodological citations only and zero verbatim or derivative reuse.

---

## 1. Opponent-Adjusted Evaluation of NFL Pass Protection and Pass Rush
- **Citation:** Jonathan Pipping-Gamón, Maximilian Gebauer, Victoria Lee, Kenny Watts, Abraham J. Wyner (University of Pennsylvania), `arXiv:2604.01491v2` (27 pp., Oct 2026).
- **Open Implementation:** `https://github.com/WhartonSABI/nfl-elo`
- **Data & Sample:** 2021 NFL regular season Hudl blocking/player coordinates linked to `nflverse` PBP (`19,583` matched plays, `95.8%`; early outcome sample `266` games / `18,225` plays / `70,304` initial matchups; final outcome sample `262` games / `17,920` plays / `69,114` matchups).
- **Core Equations:**
  - **Early Pass Rush Model ($\le 2.5\text{s}$):** Ridge-penalized Bradley–Terry paired comparison between rusher strength $r_{i(k)}$ and mean blocker strength $\frac{1}{m_k}\sum_{j \in J_k} b_j$ plus help indicator $D_k$:
    $$\text{logit}\Pr(\text{EarlyWin}_k = 1) = \alpha + r_{i(k)} - \frac{1}{m_k}\sum_{j \in J_k} b_j + \delta D_k$$
    Player effects are centered to zero within role (`mean(r) = 0`, `mean(b) = 0`), with intercept absorbing baseline log-odds.
  - **Multinomial Full-Play Model ($\mathcal{C} = \{\text{loss}, \text{win}, \text{pressure}, \text{sack}\}$):**
    $$\eta_{k,c} = \alpha_c + r_{i(k),c} - \frac{1}{m_k}\sum_{j \in J_k} b_{j,c} + \delta_c D_k, \qquad \Pr(C_k = c) = \frac{\exp(\eta_{k,c})}{\sum_{d \in \mathcal{C}} \exp(\eta_{k,d})}$$
  - **EPA-Based Disruption Weights:** Play-level OLS regression $\text{EPA}_\ell = \beta_0 + \beta_{\text{win}} W_\ell + \beta_{\text{pressure}} P_\ell + \beta_{\text{sack}} S_\ell + f(z_\ell) + \varepsilon_\ell$, normalized relative to a sack ($w_c = \hat{\beta}_c / \hat{\beta}_{\text{sack}}$):
    - `Loss`: `0`
    - `Win only (no pressure/sack)`: `0.009` (`95% CI [-0.009, 0.025]`)
    - `Pressure`: `0.103` (`95% CI [0.071, 0.140]`)
    - `Sack`: `1.0`
  - **Expected Disruption Rating ($Q_a$):** Marginalized over a fixed common mix of blocking assignments and help so pass rushers and offensive linemen are comparable on common schedule & help footing.
- **Measured Benchmarks (Held-Out Weeks 16–18, 47 games):**
  - Early model log-loss `0.448` vs `0.492` league avg (`-8.8%`) and `0.469` smoothed historical (`τ = 2`, **`-4.5%` reduction**, 95% bootstrap `[3.4%, 5.2%]`).
  - Final multinomial log-loss `0.641` vs `0.682` league avg (`-6.1%`) and `0.665` smoothed historical (`τ = 10`, **`-3.6%` reduction**, 95% bootstrap `[3.2%, 4.4%]`).
  - All-Pro Top-200 Alignment (`AUC`): Full-play disruption `0.911 / 0.915` (rushers 1st/either team) and `0.723 / 0.823` (OL), outperforming raw and smoothed win rates in top-10 concentration.
  - Spearman correlation between raw win-rate rank and fitted early strength: `0.85` (rushers), `0.77` (OL). Spearman between early strength and full-play disruption $Q$: `0.61` (rushers), `-0.53` (OL).
- **GSE Engine Wiring:** Implemented causally at unit-matchup level (`posteam` OL unit vs `defteam` pass-rush front) in **Stream 16B** (`intelligence/coaching/causal_sequencing_trench_punting_engine.py`) with causal 2024+2025 EPA weights (`w_hit` vs `sack`) and ridge paired-comparison normal equations.

---

## 2. NFL Ghosts: Evaluating Defender Positioning with Conditional Density Estimation
- **Citation:** Ronald Yurko, Quang Nguyen, Konstantinos Pelechrinis (CMU & Univ. of Pittsburgh), `arXiv:2406.17220v2` (34 pp., Jun 2025).
- **Open Implementation:** `https://github.com/ryurko/nfl-ghosts`
- **Data & Sample:** 2018 NFL Big Data Bowl 2021 tracking (`10 Hz`, Weeks 1–17, `10,363` completed passes).
- **Core Equations:**
  - **RFCDE Leaf-Proximity Weights & Kernel Density Estimator:** Across $T = 500$ conditional-density trees splitting to minimize CDE loss:
    $$w_i(X^*) = \frac{1}{T}\sum_{t=1}^T \frac{\mathbf{1}(X_i \in R(X^*, \theta_t))}{\sum_{j=1}^n \mathbf{1}(X_j \in R(X^*, \theta_t))}, \qquad \hat{f}(Y \mid X^*) = \frac{\sum_{i=1}^n w_i(X^*) K_h(Y_i - Y)}{\sum_{i=1}^n w_i(X^*)}$$
  - **Expected Play Value at Catch:** $\text{EPV}_{\text{catch}} = \int g(Y) f(Y \mid X_{\text{catch}})\,dY$ evaluated over 1-yard discrete grid $[-10, \text{YardsToEndzone}+2]$ with expected points utility $g(\cdot)$.
  - **Counterfactual Ghost Marginalization (2D Location $\ell=(x,y)$ $\times$ 3D Trajectory $v=(s,\text{dir},o)$):**
    $$\mathbb{E}[\delta_{\text{catch}}] = \int_{\ell \in L} \left[\int_{v \in V} (\text{EPV}_{\text{catch}} - \text{EPV}_{\text{catch}}^{\ell, v})\, p(v \mid \ell)\, dv\right] h(\ell \mid X_{\text{catch}}^{-\text{def1}})\, d\ell$$
    with inverse-distance trajectory resampling weights $\omega_{i,\ell} = |\text{dist}_i - \text{dist}_\ell|^{-1}$ ($B=100$).
- **Measured Results:** Jaire Alexander led 2018 NFL DBs with total $\mathbb{E}[\delta_{\text{catch}}] = -7.37$ EPA saved (`-0.14` avg/play across 53 receptions, `2.42` avg YAC allowed), Adoree' Jackson `-7.35`, A.J. Bouye `-7.16`. Season defender $\mathbb{E}[\delta_{\text{catch}}]$ correlated `r = 0.65` with YAC allowed and `r = 0.37` with team pass defense EPA.
- **GSE Engine Wiring:** Counterfactual spatial ghost marginalization and bootstrap CI evaluator wired in **Stream 16C** (`intelligence/coaching/spatial_ghosts_and_step_turn_evaluator.py`).

---

## 3. NFL Step-and-Turn: Generative Multilevel Framework for Player Movement
- **Citation:** Quang Nguyen & Ronald Yurko (Carnegie Mellon University), `arXiv:2603.17866v3` (32 pp., Sep 2026).
- **Open Implementation:** `https://github.com/qntkhvn/nfl-step-turn`
- **Data & Sample:** 2022 NFL Big Data Bowl 2025 tracking (`10 Hz`, Weeks 1–9, `136` games, `5,400` RB rush plays).
- **Core Equations:**
  - **Step Length & Bearing Definitions:** $s_t = \sqrt{(x_{t+1}-x_t)^2 + (y_{t+1}-y_t)^2}$, bearing $b_t = \text{atan2}(y_{t+1}-y_t, x_{t+1}-x_t)$, turn angle $\varphi_t = b_t - b_{t-1}$.
  - **Hierarchical Step Length Model (Scaled Arcsine Transform $\tilde{s}_{ijt}$):**
    $$\tilde{s}_{ijt} \sim \mathcal{N}(\mu_{ijt}^{(\text{SL})}, \sigma^2), \qquad \mu_{ijt}^{(\text{SL})} = \alpha_0^{(\text{SL})} + X_{ijt}^{(\text{SL})}\beta^{(\text{SL})} + u_j + v_k$$
    with ball-carrier ($u_j \sim \mathcal{N}(0, \tau_u^2)$) and defense ($v_k \sim \mathcal{N}(0, \tau_v^2)$) random intercepts.
  - **Hierarchical Conditional Turn Angle Model (von Mises):**
    $$\varphi_{ijt} \sim \text{von Mises}(\mu_{ijt}^{(\text{TA})}, \kappa_{ijt}), \qquad \tan\!\left(\frac{\mu_{ijt}^{(\text{TA})}}{2}\right) = \alpha_0^{(\text{TA})} + X_{ijt}^{(\text{TA})}\beta^{(\text{TA})}, \qquad \log \kappa_{ijt} = \gamma_0 + \gamma_1 s_{ijt} + w_j$$
    where concentration $\kappa_{ijt}$ explicitly increases/scales with current step length $s_{ijt}$ plus carrier variability $w_j \sim \mathcal{N}(0, \tau_w^2)$ ($r = 0.279$ between posterior means $u_j, w_j$).
  - **Posterior Predictive Spatial Rollout & Valuation:**
    $$(x_{t+1}^{(h)}, y_{t+1}^{(h)}) = \left(x_t + s_{t+1}^{(h)}\cos(\varphi_{t+1}^{(h)} + b_t),\; y_t + s_{t+1}^{(h)}\sin(\varphi_{t+1}^{(h)} + b_t)\right), \qquad \bar{\delta}_{ijt} = \frac{1}{H}\sum_{h=1}^H (\hat{\ell}_{ijt} - \hat{\ell}_{ijt}^{(h)})$$
- **Measured Results:** Jonathan Taylor showed lowest turn-angle variability (`high κ` straight-ahead profile); Yards Success Rate leaders Josh Jacobs `0.542`, Miles Sanders `0.539`, Travis Etienne `0.527`; Explosiveness (`>95th pct`) Travis Etienne `0.118`.
- **GSE & GSI Dual-Use Wiring:** Hypothetical rollout & valuation implemented in `spatial_ghosts_and_step_turn_evaluator.py`, plus an isolated **GSI ADR-0003** rule-in-only bilateral cut-kinematics benchmark in `evaluation/gsi/biomechanical_step_turn_kinematics.py` (`return_to_play_clearance_permitted` strictly `False`).

---

## 4. NFL Career Success as Predicted by NFL Scouting Combine
- **Citation:** Brian Szekely, Christian Sinnott, Savannah Halow, Gregory Ryan (UNR & Piedmont Univ.), `arXiv:2303.05774v1` (16 pp., Mar 2023).
- **Open Implementation:** `github.com/bszek213/nfl_combine/tree/publish`
- **Data & Sample:** 2013–2017 NFL Draft cohorts (`1,973` raw $\to$ `805` complete 6-drill cases: 40-yd dash, broad jump, 225-lb bench reps, vertical jump, 20-yd shuttle, 3-cone; 80/20 split, 10-fold CV).
- **Measured Results:**
  - **NFL Matriculation ($\ge 1$ snap):** Tuned Random Forest (`n_estimators=944`, `max_depth=97`, `min_samples_split=2`, `max_features=3`) achieved **`83%` test accuracy** (`0.81` 10-fold CV vs LogReg `0.75`, SVM `0.76`, GBM `0.77`, DT `0.73`), driven primarily by **3-cone drill** and **40-yard dash**.
  - **Career Snaps Longevity (Regression):** Linear Regression outperformed tree/SVM models but exhibited high error and weak variance explained (`test RMSE = 904.6`, **`10-fold CV RMSE = 1,210.1` snaps**, **`R^2 = 0.17`**; broad jump highest coefficient, 3-cone weakest).
- **GSE Doctrine Constraint:** Combine athleticism informs entry/roster-viability priors ONLY (`compute_szekely_combine_prior_weight` already wired); career snap volume & betting projections must weight active snap counts, role usage, and coaching scheme rather than Combine totals.

---

## 5. Counterattack Detection & Decision Evaluation Framework (Strictly Learn-Only / Cite-Only)
- **Citation:** Jiangyan Yang, Huanmin Ge, Yixiong Cui (2025), *"An AI framework for counterattack detection and decision-making evaluation in football,"* *Journal of Big Data* `12:91`, `https://doi.org/10.1186/s40537-025-01128-3` (18 pp.).
- **License Governance:** Licensed under **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (`CC-BY-NC-ND 4.0`)**. Per GSE `INGEST-AND-LEARN` + commercial clearance doctrine, **no verbatim excerpts, figures, or derivative code implementations are incorporated into any Beexly/Sports runtime asset**.
- **High-Level Non-Derivative Scientific Takeaways (Learned Concepts):**
  1. **Calibration Must Explicitly Audit Deep Transition Models:** Deep classifiers (e.g., graph/transformer models over spatial frames) can achieve high classification discrimination yet misstate probabilities unless explicitly evaluated via Expected Calibration Error (**ECE**) — directly reinforcing GSE's frozen ECE + Venn-ABERS calibration gates (`score_walkforward_calibration_v1.py`) and **Stream 16C** abstention gates.
  2. **Graph-Structure-Preserving Attribution:** Permutation Feature Importance (PFI) should isolate node/context attributes separately from structural graph edges when auditing spatial interactions so permutation does not corrupt topological validity.
  3. **Transition Quality > Raw Transition Frequency:** High transition frequency alone does not maximize scoring conversion; spatial progression distance, relative actor angles, defensive pressure context, and transition timing dominate raw volume — mirroring GSE's finding that explosive-efficiency and clean-pocket EPA dominate raw deep-shot frequency (Stream 16A).
