# NFL Win Probability, Pathwise Calibration, Expected Points, 29-Chapter Fantasy Textbook, Rulebooks & 38-Study Sports Medicine Corpus

- **Generated At (UTC)**: `2026-11-08T08:43:42.031067+00:00`
- **Production Engine Module**: `intelligence/nfl_analytics_and_injury_biomechanics/nfl_wp_ep_fantasy_textbook_and_injury_rtp_engine.py`
- **Manifest JSON**: `docs/predictions/research/2026-11-07/nfl-wp-ep-fantasy-textbook-and-injury-biomechanics-corpus.json`
- **Cryptographic SHA-256**: `ef9efb86fc4fd93766441a9d023c3c98971f7b0841b58ec5b16fe4f4352cec23`

## 1. Suite 1 — NFL Win Probability, Pathwise Calibration & Expected Points (`25` Models)
- **Blown Lead Paradox Pathwise Stopping-Time Calibration (`arXiv:2602.10784v1`, Pipping, Gamón, Wyner)**:
  - Evaluates $\tau_q = \inf\{t : \hat{p}_t \ge q\}$, measures $\Delta_{\text{path}}(q) = \Pr(Y=1 \mid \sup_t \hat{p}_t \ge q) - q$, and applies a martingale quadratic-variation shrinkage damper $\lambda_{\text{damper}}$.
- **Generalized Pythagorean + ML Ensemble Win Prediction (`10.3389/fspor.2025.1638446`; Aalto 2023; Nuutinen 2025; Costa 2025; Dong 2020 `dsp01pc289n03q`; Ruscio & Brady 2021; PFR WP; Brian Burke AFA)**:
  - Combines dynamic scoring-environment Pythagorean exponent with Gaussian Brownian-bridge spread decay and tree/GAM situational log-odds.
- **Multinomial 7-State Expected Points, Catalytic Smoothing & `nflWAR` (`arXiv:1802.00998`; `arXiv:2409.04889`; KU Leuven saEPA)**:
  - Evaluates `{TD: +7, FG: +3, Safety: +2, No Score: 0, Opp Safety: -2, Opp FG: -3, Opp TD: -7}` with catalytic prior regularization and opponent defensive ridge adjustment.
- **4th-Down Uncertainty Humility (`arXiv:2311.03490`), `Going Deep` (`arXiv:1906.01760`), `iWinRNFL` (`arXiv:1704.00197`) & HMM Play-Call Sequence Predictor (`arXiv:2003.10791`)**:
  - Enforces `humility_pass_if_interval_straddles_zero` when the 90% confidence interval on 4th-down Go WP gain straddles zero, and emits 3-state HMM drive-rhythm play-call priors.

## 2. Suite 2 — Complete 29-Chapter `isaactpetersen/Fantasy-Football-Analytics-Textbook` Suite
- All 29 chapters (`intro` through `references`) wired with VORP/VBD (`draft`), Linear Mixed-Effects random-intercept BLUP shrinkage (`mixed-models`), IPTW propensity adjustment (`causal-inference`), recency/anchoring debiasing (`cognitive-bias`), positional age curves (`actuarial`), Empirical Bayes shrinkage (`base-rates`), hot-hand/contract-year shrinkage (`mythbusters`), Markowitz mean-variance-covariance Sharpe optimization (`modern-portfolio-theory`), GMM tiering (`cluster-analysis`), Factor/PCA orthogonal workload extraction (`factor-analysis`, `pca`), Monte Carlo heavy-tailed quantiles (`simulation`), and EWMA/AR(1) share drift (`time-series-analysis`).

## 3. Suite 3 — Official NFL Rulebooks (`2014-2023`, `2024/2025 Dynamic Kickoff`, `Helmet-Lowering`, `Walter Camp`)
- Quantifies starting field position shifts (`+3.8` to `+5.4` yards), return rate increases (`21.8%` -> `32.8%` in 2024 -> `62.5%+` in 2025/2026), and scoring drive probability multipliers under the Dynamic Kickoff rule (`10.1177/23259671251397505`) plus Helmet-Lowering penalty/concussion modifiers (`10.1177/2325967120S00403`).

## 4. Suite 4 — 38-Study NFL Sports Medicine, Concussion Biomechanics & Return-to-Play (RTP) Decay Kernels
- **Post-Concussion Lower-Extremity Cascade (`10.1016/j.asmr.2022.04.017`)**: Sensorimotor odds ratio `OR in [1.6, 2.3]` in weeks 1-4 post-concussion return, moderated by subconcussive NfL (`Rubin 2019`), sulcal/CTE cumulative head impact load (`Brain Comms 2025 fcaf345`, `DIAGNOSE CTE 2024`, `BMJ 2026`, `PMC10293571`), and cervical strength angular acceleration attenuation (`Le 2022`, `MTU 345`).
- **Position-Specific RTP Fantasy Decay (`Cureus 2025 10.7759/cureus.99333`, `Achilles Matched Cohort 2026 10.1080/00913847.2026.2682120`, `PMC8422244`, `MED/41948445`)**: Evaluates `eta_RTP(injury_type, position, weeks_back)` across Achilles, ACL, Lisfranc, high-ankle sprain, hamstring, concussion, spine, and open fracture cohorts.
- **Exertional Heat Stroke & Trench Fatigue (`PMC11569638` — 97% burden in linemen; `HUDDLE JACC 2024`; `PMC8854336`)**: Models Q3/Q4 trench pass-rush and run-block attenuation under elevated WBGT.
