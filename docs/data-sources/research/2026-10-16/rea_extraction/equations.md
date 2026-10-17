# MATHEMATICAL SPECIFICATION & EQUATIONS INVENTORY (NFL & SPORTS BETTING)
**Compiled by**: GSE Quantitative Engine / REA Verification Pipeline  
**Standards**: Rigorous LaTeX formulation, explicit input/output definitions, empirical assumptions, code vs. paper status, and reusability rating.

---

## 1. Win Probability & Rating Systems

### 1.1 Dynamic Elo Rating Update
- **LaTeX Formula**:
  $$\Delta R_{A} = K \cdot (S_{A} - \hat{P}_{A}) \cdot \left(\frac{|\text{MOV}| + 3}{(R_{A} - R_{B})\cdot 0.006 + 2.2}\right)$$
  $$\hat{P}_{A} = \frac{1}{1 + 10^{-(R_{A} - R_{B} + \text{HFA})/400}}$$
- **Inputs**: $R_A, R_B$ (pre-game ratings), $\text{MOV}$ (margin of victory), $S_A \in \{0, 0.5, 1\}$, $\text{HFA}$ (home field advantage $\approx 48-55$ Elo pts).
- **Outputs**: $\Delta R_A$ (rating update delta), $\hat{P}_A$ (win probability).
- **Assumptions**: Logistic difference model; margin-of-victory multiplier corrects for blowout autocorrelation.
- **Source**: Elo (1978); Silver / FiveThirtyEight NFL model; implemented in `packages/prediction-engine/src/models/elo.ts`.
- **Implementation Status**: Implemented in code (Vitest verified 10/10).
- **Confidence**: HIGH | **Reusability**: UNIVERSAL (Bedrock Layer 1 baseline).

---

### 1.2 Expected Points Added (EPA) Play-Level Formulation
- **LaTeX Formula**:
  $$\text{EPA}_{t} = \text{EP}_{t} - \text{EP}_{t-1}$$
  $$\text{EP}(s) = \sum_{k \in \mathcal{K}} v_k \cdot P(S_{\text{next}} = k \mid \text{down}, \text{ydstogo}, \text{yardline}, \text{half\_seconds\_remaining}, \text{era})$$
  $$\mathcal{K} = \{\text{Touchdown}(7), \text{Field Goal}(3), \text{Safety}(2), \text{No Score}(0), \text{Opp Safety}(-2), \text{Opp FG}(-3), \text{Opp TD}(-7)\}$$
- **Inputs**: Down, distance, yardline (1–99), game clock seconds remaining, timeouts remaining.
- **Outputs**: Expected point value of game state $\text{EP}(s) \in [-7, +7]$; Net EPA of play.
- **Assumptions**: Semi-Markovian next-score expectation trained via multinomial logistic regression / XGBoost.
- **Source**: Yurko, Ventura, Horowitz (2019) *nflWAR: A Reproducible Method for Offensive Player Valuation*; `nflfastR`.
- **Implementation Status**: Implemented in code and verified across 13,438 plays in `intelligence/coaching/data/ftn_charting_2026.parquet`.
- **Confidence**: HIGH | **Reusability**: CRITICAL.

---

### 1.3 Pythagorean Expectation (Morey-Carter NFL Exponent)
- **LaTeX Formula**:
  $$\hat{W} = \frac{\text{PF}^\gamma}{\text{PF}^\gamma + \text{PA}^\gamma}, \quad \gamma \approx 2.37$$
- **Inputs**: $\text{PF}$ (Points For), $\text{PA}$ (Points Against).
- **Outputs**: $\hat{W}$ (Expected win percentage).
- **Assumptions**: Points scored follow Weibull distributions with common shape parameter.
- **Source**: Bill James (1980); Daryl Morey (1993); Schatz (Football Outsiders).
- **Implementation Status**: Implemented in code (`packages/prediction-engine/src/models/pythagorean.ts`).
- **Confidence**: HIGH | **Reusability**: HIGH (Season-long totals and regression-to-the-mean anchor).

---

## 2. Market De-Vigging & Implied Probability Formulations

### 2.1 Multiplicative (Standard Proportional) De-Vigging
- **LaTeX Formula**:
  $$p_i = \frac{\pi_i}{\sum_{j=1}^n \pi_j}, \quad \pi_i = \begin{cases} \frac{100}{100 + |O_i|} & \text{if } O_i < 0 \\ \frac{O_i}{100 + O_i} & \text{if } O_i > 0 \end{cases}$$
- **Inputs**: American odds $O_i$ for outcome $i \in \{1, \dots, n\}$.
- **Outputs**: De-vigged true probability $p_i$, where $\sum p_i = 1.0$.
- **Assumptions**: Overround (bookmaker juice) is distributed proportionally across all outcomes.
- **Source**: Buchdahl (2016); implemented in `packages/prediction-engine/src/edge-lab/devig.ts`.
- **Implementation Status**: Implemented in code.
- **Confidence**: HIGH | **Reusability**: UNIVERSAL.

---

### 2.2 Shin De-Vigging Model (Informed Trader Parameterization)
- **LaTeX Formula**:
  $$\pi_i = (1 - z) p_i + z \frac{p_i}{\sum_j \sqrt{p_j}}, \quad z \in [0, 1)$$
  $$\sum_{i=1}^n \sqrt{z^2 + 4(1 - z)\frac{\pi_i}{\sum \pi_k}} = 2 + (n - 2)z$$
- **Inputs**: Gross market probabilities $\pi_i$, market participant count $n$.
- **Outputs**: Insider proportion $z$, true fundamental probabilities $p_i$.
- **Assumptions**: Market consists of uninformed public noise bettors and informed sharp syndicates; bookmakers set odds to maximize profit under asymmetric information.
- **Source**: Shin (1992, 1993); Jullien & Salanié (2000); verified on `research/rating-atlas-2026-10-09-packet`.
- **Implementation Status**: Implemented in code (`packages/prediction-engine/src/models/shin.ts`).
- **Confidence**: HIGH | **Reusability**: CRITICAL (Identifies sharp money shade vs public retail bias).

---

## 3. Evaluation & Scoring Metrics

### 3.1 Brier Score & Brier Skill Score (BSS)
- **LaTeX Formula**:
  $$\text{BS} = \frac{1}{N} \sum_{i=1}^N (f_i - o_i)^2$$
  $$\text{BSS} = 1 - \frac{\text{BS}_{\text{model}}}{\text{BS}_{\text{ref}}}$$
- **Inputs**: Forecast probability $f_i \in [0, 1]$, binary observed outcome $o_i \in \{0, 1\}$, reference baseline $\text{BS}_{\text{ref}}$ (closing market implied).
- **Outputs**: Mean squared error of probabilistic forecasts; skill score relative to closing market.
- **Assumptions**: Strictly proper scoring rule; penalizes overconfidence quadratically.
- **Source**: Brier (1950); verified in GSE calibration registry (`reports/emission-gate-eval-set-v2.jsonl`).
- **Implementation Status**: Implemented in code.
- **Confidence**: HIGH | **Reusability**: CRITICAL (Calibration benchmark).

---

### 3.2 Continuous Ranked Probability Score (CRPS)
- **LaTeX Formula**:
  $$\text{CRPS}(F, y) = \int_{-\infty}^\infty \left( F(x) - \mathbf{1}(x \ge y) \right)^2 dx = \mathbb{E}|X - y| - \frac{1}{2}\mathbb{E}|X - X'|$$
- **Inputs**: Cumulative distribution function $F(x)$, observed continuous outcome $y$ (e.g. margin of victory or total points).
- **Outputs**: Continuous distance metric measuring spread distribution accuracy.
- **Assumptions**: Proper scoring rule generalized to continuous probability distributions.
- **Source**: Gneiting & Raftery (2007); documented in `research/paper-crps-extracts-2026-10-15.md`.
- **Implementation Status**: Described in research papers; partial implementation in experimental worktrees.
- **Confidence**: HIGH | **Reusability**: HIGH.

---

### 3.3 Closing Line Value (CLV)
- **LaTeX Formula**:
  $$\text{CLV} = \frac{p_{\text{close}}}{p_{\text{bet}}} - 1$$
  $$\text{CLV}_{\text{cents}} = \text{DecimalOdds}_{\text{bet}} \cdot \text{FairProb}_{\text{close}} - 1$$
- **Inputs**: Odds/probability at bet placement, devigged fair probability at game close.
- **Outputs**: Percentage expected value gained against closing market efficiency.
- **Assumptions**: The closing market price represents the most accurate, information-dense probability available.
- **Source**: Vlastakis & Botsis (2018); Standing Doctrine (Garrett 2026-10-05).
- **Implementation Status**: Implemented in code (`packages/prediction-engine/src/edge-lab/clv.ts`).
- **Confidence**: HIGH | **Reusability**: CRITICAL (The true measure of analytical edge).

---

## 4. Physical, Altitude, and Environmental Adjustments

### 4.1 Air Density & Ball Flight Aerodynamics (Mile High Adjustment)
- **LaTeX Formula**:
  $$\rho = \frac{p \cdot M}{R \cdot T}$$
  $$F_D = \frac{1}{2} \rho v^2 C_D A$$
  $$\Delta d_{\text{field\_goal}} \approx \alpha \cdot \left(1 - \frac{\rho_{\text{Denver}}}{\rho_{\text{SeaLevel}}}\right), \quad \alpha \approx 4.8 \text{ yards}$$
- **Inputs**: Atmospheric pressure $p$ (hPa from Open-Meteo), temperature $T$ (Kelvin), molar mass of air $M$, universal gas constant $R$.
- **Outputs**: Air density $\rho$ ($\text{kg/m}^3$), drag force reduction $F_D$, incremental field goal range delta $\Delta d$.
- **Assumptions**: Drag coefficient $C_D$ remains approximately constant in sub-transonic regime ($v \approx 30 \text{ m/s}$).
- **Source**: Kagan (2015) *The Physics of Football*; Open-Meteo verified Denver surface pressure: $841.5 \text{ hPa}$ vs $1013.25 \text{ hPa}$ at sea level ($\approx 17.0\%$ reduction in aerodynamic drag).
- **Implementation Status**: Implemented in research dossier (`LAYER2_WEEKS_1_TO_5_SITUATIONAL_REASONING_DOSSIER.md`).
- **Confidence**: HIGH | **Reusability**: HIGH.
