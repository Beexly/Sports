# 1655 A regularized hidden Markov model for analyzing the "hot shoe" in football (arXiv:1911.08138)

**Citation:** (authors as listed on arXiv). *A regularized hidden Markov model for analyzing the "hot shoe" in football*. arXiv:1911.08138 (2019). URL: https://arxiv.org/abs/1911.08138
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text, entire paper including simulation study, real-data analysis, tables; ~all sections read). Not an abstract-only read.
**Verdict:** ADAPT — the LASSO-penalized HMM with 656 covariates is directly portable to GSE's sparse player-form/injury/role regime modeling, but the two-state binary-outcome framing and irregular inter-attempt timing need upgrading before production use.

## 1. Research question

Is there a "hot shoe" (hot-hand) effect in football penalty taking — i.e., do players switch between latent form states that affect conversion probability — and can a regularized HMM with a large covariate set identify which player, goalkeeper, and situational factors matter while selecting variables automatically?

## 2. Method/model

Two-state hidden Markov model with Bernoulli-logit state-dependent distribution. The intercept varies by state (capturing "hot"/"cold" regimes); a large set of covariates (player indicators, goalkeeper indicators, home, matchday, minute, experience, score-difference categories, score×minute interactions, rule-era dummies — 656 coefficients total) enters with common (state-independent) coefficients. Penalization: LASSO and relaxed LASSO on the covariate coefficients; L1 approximated smoothly by sqrt((β+c)^2), c=10^-5, to allow gradient-based optimization; tuning parameter λ chosen by AIC/BIC. Simulation study validates selection performance before the real-data application.

## 3. Mathematics/equations/assumptions

- S_t ∈ {1,2}; P(Y_t = 1 | S_t = s, x_t) = logit^{-1}(α_s + x_t'β); α_s state-varying intercept, β shared.
- Penalized log-likelihood: ℓ(α,β,Γ) − λ Σ_j |β_j| (LASSO); relaxed LASSO refits unpenalized on the selected support.
- Smooth L1: |β| ≈ sqrt((β+c)^2), c = 10^-5.
- λ grid: 50 values from 5,000 down to 0.0001; selected by AIC/BIC.
- Assumptions: first-order Markov latent chain; Bernoulli outcomes conditionally independent given state and covariates; state affects only the intercept; transition probabilities constant (not covariate-dependent); irregular gaps between a player's penalties treated as equally spaced.

## 4. Dataset/schema

- All Bundesliga penalties, seasons 1963/64–2016/17; players with ≥5 attempts: 3,482 penalties, 310 penalty takers, 327 goalkeepers.
- Per penalty: taker, goalkeeper, converted (0/1), home/away, matchday, minute, taker/keeper professional experience, score-difference category, rule era.
- Source: not public in the paper; no data URL given.

## 5. Features and target

- Target: binary penalty converted (1/0).
- Features: 656 covariates — player fixed effects, goalkeeper fixed effects, home, matchday, minute, experience measures, score-difference dummies, score×minute interactions, era dummies.
- Latent: two form states (intercepts only).

## 6. Validation design

- Simulation: 100 runs; each 5,100 observations (first 5,000 train, final 100 test); 50 covariates with 47 pure-noise variables; 50-value λ grid. Metric: selection of true vs noise covariates; test-set fit.
- Real data: λ selected by AIC/BIC on the full sample; relaxed LASSO reported as preferred. No held-out real-data predictive test.

## 7. Exact results and baselines with numbers

- Simulation: relaxed LASSO with BIC selected zero noise covariates in 84/100 runs — best overall among LASSO / relaxed LASSO × AIC/BIC; LASSO overselected noise variables.
- Real model: 656 coefficients; relaxed-LASSO/BIC state intercepts 1.422 and −14.50 (i.e., a near-automatic-goal state and a near-automatic-miss state).
- Transition matrix: [[0.978, 0.022], [0.680, 0.320]]; stationary distribution 0.969 / 0.031.
- Other fits: AIC-HMM diagonals 0.989/0.386, intercepts −14.71/1.347; BIC-HMM diagonals 0.987/0.368, intercepts −18.83/1.360.
- Only goalkeeper selected: Jean-Marie Pfaff, relaxed coefficient −0.125 (reduces conversion odds against him).
- Substantive finding: essentially no hot-shoe evidence — the "cold" state is rare (3.1% stationary mass) and player indicators mostly unselected; situational effects dominate.

## 8. Code/data availability

No code repository or data URL stated in the paper. Method described in enough detail to reimplement (smooth-L1 LASSO HMM via numerical optimization).

## 9. Leakage and limitations

- Irregular elapsed time between a player's penalties (days to months) treated as unit steps — transition dynamics misspecified.
- Self-selection: only designated takers attempt penalties; omitted non-Bundesliga attempts (European fixtures) break the sequence.
- Two states may be too coarse; no time-gap-aware transitions; no goalkeeper form dynamics.
- No held-out validation on real data; conclusions rest on in-sample penalized fit + simulation.
- Extreme intercepts (−14.5) indicate near-degenerate state — identification is fragile.

## 10. GSE overlap

GSE's existing toolbox (Elo/Glicko/TrueSkill-style ratings, Kalman/particle filters) handles continuous form tracking but not sparse high-dimensional covariate selection inside a latent-regime model. This paper's relaxed-LASSO HMM fills that gap: hundreds of candidate features (injuries, role changes, matchup dummies) with automatic selection inside a form-state model. Frame as an extension of GSE's existing dynamic-rating work, not a replacement.

## 11. Implementation specification

- Build `gse.regimes.SparseFormHMM`: binary target (e.g., kicker makes FG / QB pass success / 3rd-down conversion) with 2–3 latent form states, state-varying intercept, and a wide covariate matrix (player/team dummies, weather, rest, matchup, injury flags); LASSO + relaxed LASSO via smooth-|·| (c=1e-5), λ grid 50 values log-spaced, BIC selection.
- Time-gap-aware extension: scale transition matrix by gap Δt (continuous-time embedding) for irregular NFL event spacing.
- Output: posterior form-state probabilities as features for GSE's player-prop and game models; selected-covariate list as a feature-screening report.

## 12. Reproducible test

- nflverse 2015–2024 kicking data (FG attempts; kicker/stadium/weather covariates): fit 2-state sparse HMM on 2015–2021, tune λ by BIC.
- Test A (selection sanity): replicate the paper's simulation protocol with 50 covariates/47 noise on synthetic FG data — relaxed-LASSO/BIC must select zero noise vars in ≥75/100 runs.
- Test B (predictive): predict 2022–2024 FG outcomes; compare log-loss vs plain logistic regression with the same covariates — expect ≥0.005 log-loss improvement and positive state-persistence (diagonal > 0.7).

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** on 2022–2024 holdout FG data, the sparse form-HMM beats the plain logistic baseline by ≥ 0.005 log-loss AND the simulation replication selects zero noise covariates in ≥75/100 runs. Fail either → REJECT for production (keep as screening tool only).
- **Improvement experiment:** (i) time-gap-aware transitions (gap-scaled Γ) — expect +0.003 log-loss; (ii) 3-state extension — expect BIC improvement ≥ 10 on training; (iii) feed form-state posteriors into GSE's kicker-prop pricing and measure CLV delta — target ≥ +0.5% CLV on lined props.

**Verdict:** ADAPT — the relaxed-LASSO HMM is the right sparse-regime machinery for GSE player-form modeling, but it needs time-gap-aware transitions and genuine holdout validation before it touches production features.
