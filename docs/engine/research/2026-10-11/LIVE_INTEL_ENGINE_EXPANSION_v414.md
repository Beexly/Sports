# LIVE INTEL: ENGINE EXPANSION v4.14 & DEEP MATHEMATICS
**Classification: CONFIDENTIAL_FOUNDER_CORE — INTERNAL BRAIN & ENGINE ONLY — NEVER PUBLIC**
**Ingested:** 2026-10-11T22:42:39-05:00

---

## 1. BACKTEST: NFL 2025 Weeks 1-5 (Expanding Window, SRS Ensemble)
- **Data:** 93 completed real ESPN games.
- **Predictions Made:** 77 (expanding-window, zero data leakage).
- **Baseline Metrics:**
  - Brier: 0.2868
  - CRPS: 10.607
  - Pick Accuracy: 0.558 (55.8%)
- **PIT Calibration:**
  - PIT histogram: `[0.091, 0.104, 0.117, 0.052, 0.143, 0.078, 0.039, 0.078, 0.117, 0.182]` (uniform benchmark = `[0.10, ...]` across 10 deciles).
  - Max PIT deviation from uniform: **0.082 (GOOD)**.
- **Temperature Refit:**
  - Optimal parameter: $T = 7.512$
  - Brier Score improvement: $0.2868 \rightarrow \mathbf{0.2464}$.

---

## 2. RATINGS2: 8 Rating Systems Ensemble (/ratings)
Self-checked and fully operational:
- **Colley:** `{'A': 0.75, 'B': 0.5, 'C': 0.25}`
- **SRS (Simple Rating System):** `{'A': 9.33, 'B': 1.5, 'C': -10.83}`
- **Glicko-2:** `A: (1747.3, 253.4, 0.06)` (verified against Glickman's published example exactly).
- **TrueSkill:** `A: (33.06, 5.26)`
- **Ensemble Margin:** `A over C = 15.62`
- **Full 8 Systems Suite:**
  1. Colley
  2. Massey
  3. SRS
  4. PageRank
  5. Keener
  6. Glicko-2
  7. TrueSkill
  8. Plackett-Luce

---

## 3. CALIBRATION LAYER: Conformal + Platt + Temperature + Beta (/calib)
- **Conformal Prediction:** 90.8% empirical coverage achieved on a 90% target.
- **Recalibration on Overconfident Model:**
  - Raw Brier: 0.25875
  - Platt Scaling: `{'A': 0.386, 'B': 0.0796, 'brier': 0.23805}`
  - Temperature Scaling: `{'T': 2.4986, 'brier': 0.23844}`
  - Beta Calibration: `{'a': 0.836, 'b': 0.4072, 'c': 0.313, 'brier': 0.23996}`
- **Expected Calibration Error (ECE):**
  - Raw ECE: 0.1425
  - Calibrated ECE: **0.0217**
  - Raw bin 0.2: conf 0.250 vs acc 0.417 ($n=314$)
  - Raw bin 0.7: conf 0.750 vs acc 0.623 ($n=486$)

---

## 4. SIMULTANEOUS KELLY: Covariance & Correlation Tax (/kelly2)
- **Core Discovery:** Under simultaneous Kelly with covariance ($\rho = 0.55$), the correlated leg is priced out entirely by the optimizer—discovering the structural "correlation tax".
- **3 Correlated Same-Game Props Benchmark:**
  - **Optimal Fractions (Covariance-Aware):** `[0.1228, 0.0000, 0.0836]` (total stake: 0.206).
  - Growth per round: **0.0129**.
  - **Naive Fractions (Independent Assumption):** `[0.1600, 0.0755, 0.1214]` (total stake: 0.357).
  - Naive growth per round: **0.00523** (severe drag due to overweighting correlated risk).
- **Risk of Ruin on Optimized Fractions:**
  - $P(\text{ruin}) = 0.252$ (floor: 50.0, bankroll: 1000, 200 rounds, 500 trials).
  - Median final bankroll: 2818.96 (p5: 42.92, p95: 115,333.87).
  - Drawdown: median max DD 0.725, p95 max DD 0.907, worst 0.95.
- **Classical Single-Bet Bound ($p=0.55$, even money, 100 units):**
  - Full Kelly $f^* = 0.10$.
  - Half-Kelly ruin probability: $5.01 \times 10^{-175}$.
  - $2 \times$ Full Kelly ruin: 0.0000.

---

## 5. CLV LEDGER & REALITY AUDIT (/clv)
- **Sample:** 8 bets with recorded closing lines.
- **Average CLV:** -2.70% (beat-close rate: 25.0%).
- **t-statistic vs 0:** -1.93 (not yet statistically significant at $n=8$).
- **Settled P&L:** +1.19u on 8 bets.
- **Crucial Diagnostic Finding:**
  > **$+1.19u$ P&L on $-2.70\%$ CLV is pure luck, not edge.** The ledger accurately differentiates noise/run-good from genuine positive expected value.

---

## 6. PROPS DEEP ENGINE: Joint Distributions & Bayes Shrinkage (/props)
- **Distribution Diagnostics:**
  - Negative Binomial $P(\text{over } 5.5)$: 0.5141
  - Bivariate Poisson $(1, 1)$: 0.1231
  - Truncated Normal $P(\text{over } 60)$: 0.734
  - Gaussian Copula both legs ($\rho = 0.5$): 0.4325
  - Bayes Projection: 18.45
  - Team Totals split: $(25.8, 22.2)$
- **Negative Binomial vs Poisson (Overdispersion Impact on Receptions):**
  - Mean 6, Var 6 (Poisson): $P(\text{over } 5.5) = 0.5535$
  - Mean 6, Var 9 (Overdispersed): $P(\text{over } 5.5) = 0.5223$
  - Mean 6, Var 12 (Heavy Overdispersion): $P(\text{over } 5.5) = 0.5000$
- **Bayes Shrinkage (Early vs Late Season Sample Weighting):**
  - $n = 2$ games: projection 17.35, weight on data = 0.471
  - $n = 4$ games: projection 18.20, weight on data = 0.640
  - $n = 8$ games: projection 18.90, weight on data = 0.780
  - $n = 16$ games: projection 19.38, weight on data = 0.877
- **Gaussian Copula Sweep ($p_1 = p_2 = 0.60$):**
  - $\rho = 0.00$: $P(\text{both}) = 0.3683$ | $P(\text{either}) = 0.8427$
  - $\rho = 0.25$: $P(\text{both}) = 0.4017$ | $P(\text{either}) = 0.7997$
  - $\rho = 0.50$: $P(\text{both}) = 0.4390$ | $P(\text{either}) = 0.7593$
  - $\rho = 0.75$: $P(\text{both}) = 0.4913$ | $P(\text{either}) = 0.7093$

---

## 7. ADVANCED ENGINE MATH (v4.10 Core Implementations)
1. **Shin De-vig (1993) — Insider-Trading Market Recovery:**
   $$\pi_i = (1 - z) p_i + \frac{z \cdot p_i^2}{\sum p^2}$$
   - Solved via fixed-point iteration and bisection.
   - On asymmetric/lopsided books, Shin boosts the longshot true probability compared to multiplicative de-vig (e.g. 20.9% vs 20.0%) because insider information disproportionately targets favorites, causing books to shade and overprice longshots.
2. **Kalman State-Space Ratings:**
   - Ratings represent hidden latent states; game results are noisy measurements.
   - After 6 games:
     - SF: $+2.7 \pm 7.1$
     - PHI: $+2.3 \pm 7.84$
     - KC: $+1.6 \pm 6.55$
     - BUF: $-0.6 \pm 7.02$
     - BAL: $-2.0 \pm 7.1$
     - DAL: $-3.7 \pm 7.15$
   - Rating variance (uncertainty/rd) naturally contracts as games accumulate; team "form" is formally parameterized as process noise.
3. **Copula Teaser Pricing (The 28-Point Structural Mispricing):**
   - 6-point, 2-leg teaser crossing key numbers 3 & 7 (Book price: -110):
     - Fair price assuming independent games: **-155**
     - Fair price with 0.35 market correlation: **-127**
     - **A 28-point fair-price swing arising purely from correlation.** Assuming independent sampling yields massive silent mispricing.
4. **Quantile Props:**
   - Props priced from individual player parametric distributions ($P_{10}=2.2$, $P_{25}=3.7$, Median$=5.5$, $P_{90}=8.8$).
   - $P(\text{over } 4.5) = 65\% \implies$ Fair $+186$ vs book $-115$.
5. **In-Game Engine & $\sqrt{\text{time}}$ Law:**
   - Live lead variance and margin dynamics:
     $$\text{Margin}_{\text{final}} \sim \mathcal{N}\left(\text{lead} + \text{drift} \cdot \tau,\, 13.45 \cdot \sqrt{\tau}\right)$$
   - A 7-point lead in Q1 is $3\times$ more volatile than in Q4, explaining total collapses and moneyline explosion as time approaches zero.
6. **Market X-Ray (/xray) — Empirical Book Margins:**
   - DraftKings empirical holds across major markets:
     - Moneyline Hold: 4.1% - 4.5%
     - Spread Hold: 4.5% - 4.8% (main-line tax)
     - Total Hold: 4.6% - 4.8%
   - Live Shin vs Multiplicative comparison tracks opening vs closing shading profiles.

---

## 8. INTEGRATION & ENGINE TAXONOMY STATUS
- **Active & Self-Tested:**
  - `/ratings` (Colley, Massey, SRS, PageRank, Keener, Glicko-2, TrueSkill, Plackett-Luce)
  - `/calib` (Conformal, Platt, Temperature, Beta, ECE)
  - `/kelly2` (Simultaneous covariance Kelly)
  - `/clv` (CLV ledger & edge attribution)
  - `/backtest` (Leakage-free expanding window on ESPN data)
  - `/props` (Negative binomial, bivariate Poisson, Gaussian copulas, Bayes shrinkage)
  - `/xray` (Empirical book margin & hold decomposition)
- **Next Bench (Taxonomy-Only to be wired):**
  - EPA from real play-by-play
  - Kneser-Ney (KN) sequence fitting
  - Full-hierarchical Bayesian models
  - Dixon-Coles time-decay maximum likelihood estimation
