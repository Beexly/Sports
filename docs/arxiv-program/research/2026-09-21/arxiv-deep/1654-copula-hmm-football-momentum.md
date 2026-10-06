# 1654 A copula-based multivariate hidden Markov model for modelling momentum in football (arXiv:2002.01193)

**Citation:** Adrian O'Hagan, et al. *A copula-based multivariate hidden Markov model for modelling momentum in football*. arXiv:2002.01193 (2020). URL: https://arxiv.org/abs/2002.01193
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text, ~entire paper including appendices; tables and model-selection results read in full). Not an abstract-only read.
**Verdict:** ADAPT — the copula-coupled multivariate HMM with covariate-driven transitions is worth porting to GSE's live NFL game-state regime detection, but the football-specific state semantics and single-team scope must be replaced by drive-level NFL observables.

## 1. Research question

Does "momentum" exist in football as a statistically identifiable latent regime, and can a multivariate hidden Markov model with state-dependent copula dependence between shots and ball touches — with transition probabilities driven by match covariates — detect it and beat a conditionally-independent baseline?

## 2. Method/model

Multivariate HMM on minute-by-minute observations of Borussia Dortmund (Bundesliga 2017/18, 34 matches, 3,214 bivariate minute observations; match lengths 91–100 minutes). Observations: (shots on goal, ball touches) per minute. Marginal state-dependent distributions are Conway–Maxwell–Poisson (handles under/over-dispersion); dependence between the two variables within a state is modelled by a copula (Clayton selected). Transition probabilities follow a multinomial-logit specification with covariates (opponent market value, score difference, home/away, match minute). Estimation by numerical maximum likelihood via `nlm()` with 50 random starts. Model selection by AIC/BIC over 2–5 states and over copula families.

## 3. Mathematics/equations/assumptions

- Hidden states S_t ∈ {1,...,K}; state-dependent joint distribution f(y_t | S_t) = c(F_1(y_{1t}|θ_1), F_2(y_{2t}|θ_2); η) · f_1 · f_2, with F Conway–Maxwell–Poisson marginals and Clayton copula c(·;η).
- Transition: P(S_t = j | S_{t-1} = i, x_t) = exp(γ_ij' x_t) / Σ_k exp(γ_ik' x_t), multinomial logit with covariates x_t (opponent market value, score diff, home dummy, minute).
- Assumptions: Markov property on minute grid; conditional independence of y_t given S_t (after copula coupling); covariates affect transitions only, not state-dependent means; stationarity within state; single-team scope (no joint opponent state).
- Numerical ML: 50 random initializations to mitigate multimodality; standard errors from numerical Hessian.

## 4. Dataset/schema

- Borussia Dortmund, Bundesliga 2017/18, all 34 league matches; 3,214 minute-level bivariate observations (minutes 1..91–100 per match).
- Per minute: shots on goal (count), ball touches (count).
- Covariates per minute: opposing team's squad market value, current score difference, home/away indicator, match minute.
- Source: not public — authors state data and code in supplementary material; no URL given in text.

## 5. Features and target

- Features: bivariate counts (shots on goal, ball touches); transition covariates: opponent market value, score difference, home/away, minute.
- Target: latent regime ("momentum" states); the observables are the counts. No direct win/loss prediction — unsupervised regime identification.

## 6. Validation design

- Model selection by AIC/BIC across K = 2..5 states and copula families (Clayton vs conditional independence). 50 random starts per fit; best likelihood retained.
- No out-of-sample predictive validation on held-out matches — validation is in-sample penalized likelihood plus interpretability of decoded states (Viterbi paths plotted against match events).

## 7. Exact results and baselines with numbers

- Copula model beat the conditional-independence baseline by ΔAIC = 48, ΔBIC = 35 (Clayton selected).
- Model selection: 2-state Clayton AIC/BIC 20,941 / 21,020; 3-state 20,839 / 20,979; 4-state 20,817 / 21,030; 5-state 20,801 / 21,098. BIC + interpretability favor 3 states.
- Baseline 2-state transition matrix: [[0.867, 0.133], [0.280, 0.720]].
- 3-state means — shots: 0.226, 0.132, 0.147; ball touches: 2.032, 4.583, 9.732.
- 3-state transition matrix: [[0.471, 0.054, 0.475], [0.006, 0.988, 0.006], [0.195, ≈0, 0.805]].
- Adding all covariates improved fit by ΔAIC = 51 vs no-covariate transitions.
- Interpretation: states ≈ "low control/counter-attack", "balanced", "dominant possession" — momentum visible as persistent high-persistence regimes.

## 8. Code/data availability

Data and R code stated available in supplementary material; no public URL or repo in the paper text. No GitHub link. Data is proprietary (club tracking/event feed), not reconstructable from public sources.

## 9. Leakage and limitations

- No out-of-sample validation; all selection in-sample — regime "discovery" may overfit one team's season.
- Single team only (Dortmund); no opponent joint dynamics; tactics/coaching changes confounded with "momentum".
- Minute grid ignores stoppage structure and within-minute ordering; irregular effective time.
- Unsupervised states are proxies — no ground truth for momentum; labeling is interpretive.
- Copula choice limited to those tested; CMP marginals add flexibility but more parameters per state.

## 10. GSE overlap

GSE existing state-space coverage (Kalman filters, particle filters, dynamic Elo, nested AR(1), GPs, temporal fusion transformers) covers filtering but not copula-coupled multivariate HMMs for live in-game regime detection. The covariate-driven transition idea extends GSE's dynamic Elo / regime work into discrete latent states with interpretable persistence. Do not duplicate: frame as the discrete-regime complement to GSE's continuous state-space models.

## 11. Implementation specification

- Build `gse.regimes.CopulaHMM`: minute- (or drive-/play-) level bivariate observations for NFL: e.g., (EPA per play, success rate) or (pass rate, explosive-play rate) over rolling windows; CMP or negative-binomial marginals; Gaussian/Clayton copula; K=3 states; transitions via multinomial logit on score differential, time remaining, home/away, opponent strength.
- Fit by EM/numerical ML with ≥25 random starts; select K by BIC on training seasons; decode states with Viterbi for live dashboards.
- Feed posterior state probabilities P(S_t | y_1:t) as features into GSE's in-game win-probability and live spread/total models.

## 12. Reproducible test

- nflverse play-by-play 2018–2024: aggregate to drive-level bivariate series (EPA/play, success rate). Fit K=2..4 copula-HMM per team-season on 2018–2022; select K by BIC.
- Test A: compare ΔAIC/ΔBIC of copula vs independence baseline — expect ΔAIC > 20 in ≥60% of team-seasons.
- Test B: hold out 2023–2024; compute one-step-ahead predictive log-likelihood of the fitted model vs a no-regime baseline; expect improvement in ≥65% of team-seasons.
- Test C: regress next-drive points on decoded-state dummies controlling for score/time — state coefficients jointly significant (F-test p < 0.05) in pooled test.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** on 2023–2024 holdout, the copula-HMM's one-step-ahead predictive log-likelihood beats the independence-HMM baseline by ≥ 0.02 nats/observation on average across team-seasons AND the Viterbi state dummies are jointly significant (p < 0.05) for next-drive points. If either fails, REJECT the regime feature for live models (keep as exploratory).
- **Improvement experiment:** (i) add opponent joint state (bivariate chain) — expect +0.01 nats/obs; (ii) replace minute/drive grid with play-level irregular-time transitions (continuous-time HMM) — expect better calibration of persistence; (iii) use posterior state probs as features in GSE's live WP model and measure Brier-score delta — target ≥ 0.002 Brier improvement in 4th quarters.

**Verdict:** ADAPT — copula-coupled multivariate HMM with covariate-driven transitions is a strong template for GSE live NFL regime features, but it must be rebuilt on drive/play-level NFL observables with out-of-sample validation the paper lacks.
