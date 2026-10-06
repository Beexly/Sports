# [1704] A Statistical Exploration of Duckworth-Lewis Method Using Bayesian Inference (arXiv:1810.00908)

**Citation:** Bhattacharya, I., Ghosal, R. & Ghosh, S. (2018). *A Statistical Exploration of Duckworth-Lewis Method Using Bayesian Inference*. arXiv:1810.00908. URL: https://arxiv.org/abs/1810.00908
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections 1–6 + Appendices A–C + references, ~39k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the monotonicity-enforcing Bayesian prior construction for a bivariate resource table and the "resources remaining" framework for weather-interrupted games are directly adaptable to GSE's in-game win-probability surfaces and extreme-weather-interruption adjustments, but the exponential-decay cricket model and its fitted table do not transfer to football.

## 1. Research question
Can Bayesian inference build a better rain-rule resource table for interrupted limited-overs cricket than the incumbent Duckworth-Lewis (D/L) table? The authors fit a Bayesian nonlinear regression R̄(u,w) ~ N(a_w(1−e^{−b_w u}), σ²/n_uw) to 947 ODI first innings (2005–2017), using order-constrained priors that guarantee monotonicity (the D/L table is non-monotone in wickets lost 8–9), imputing 26.8% missing (u,w) cells via the posterior predictive distribution, and show better first-innings score prediction (lower RSS) than D/L.

## 2. Dataset / schema
- 947 ODI matches, 2005–2017 (cricsheet.org), restricted to matches where the first innings lasted the full 50 overs; over-by-over runs scored and wickets lost in the first innings.
- Aggregated to R̄(u,w): mean runs scored from the point with u overs remaining and w wickets lost to end of innings, over n_uw matches (n_uw ∈ [0, 947]); 26.8% of the 500 (u,w) cells have no observations (extreme states never observed).
- Comparison baseline: the ICC D/L percentage resource table (Table 1 / Appendix A), which is flat/non-monotone for 8–9 wickets lost.

## 3. Method / model
- Likelihood: R̄(u,w) ~ N(m(u,w;θ), σ²/n_uw) (Eq. 4), mean function m(u,w;θ) = a_w(1 − e^{−b_w u}) (Eq. 5), θ = {(a_w,b_w), w = 0..9}.
- Monotonicity priors (Eq. 7): a_0 ~ U(0,A_0), b_0 ~ U(0,B_0), a_{w+1} | · ~ U(0,a_w), b_{w+1} | · ~ U(0, a_w b_w/a_{w+1}), 1/σ² ~ Ga(a,b); proven in Appendix B to enforce m(u_1,w)<m(u_2,w) for u_1<u_2 and m(u,w)>m(u,w+1) with probability 1. Alternative (a_w, c_w=a_w b_w) reparameterization given.
- Inference: JAGS (Gibbs for σ², slice-within-Metropolis-Hastings for a_w, b_w); 20k burn-in + 30k samples; posterior medians as point estimates; hyperparameters A_0=2000, B_0=100, a=b=0.1 (vague).
- Missing R̄(u,w) imputed from the normal posterior predictive under MAR.
- Evaluation: split each first innings at u overs remaining, predict final score from the resource table, compute RSS_u = Σ_w Σ_i (R^A − R^P)² (Eq. 8); compare Bayesian vs D/L via RSS ratios across u = 30..1 with posterior densities of the ratio.

## 4. Equations & assumptions
- D/L model: R(u,w) = a_w(1 − e^{−b_w u}) (Eq. 1); P(u,w) = R(u,w)/R(50,0) (Eq. 2); target reset T = S·P_2/P_1 + 1 (P_1>P_2), S+1 (P_1=P_2), S + G(50)(P_2−P_1) + 1 (P_1<P_2) (Eq. 3).
- Bayesian: Eqs. 4–5 above; prior chain Eq. 7; monotonicity conditions Eq. 6 with proof via g_w(u) derivative analysis (Appendix B); JAGS code in Appendix C.
- Assumptions: first-innings data only (second innings not run-maximizing, per D/L); MAR for missing cells; exponential-decay mean function; posterior median as estimator.

## 5. Features / target
Features: overs remaining u ∈ {1..50}, wickets lost w ∈ {0..9}. Target: mean runs obtainable R̄(u,w) → percentage resources P(u,w) = m(u,w)/m(50,0).

## 6. Validation design
In-sample predictive check with a pseudo-out-of-sample flavor: each match's first innings is cut at u overs remaining (u = 30..1), final score predicted from the table, RSS_u computed per method; ratio of √RSS (Bayes/D/L) plotted with posterior densities (Figs. 4–5). No cross-validated or held-out-match evaluation.

## 7. Numerical results / baselines
- Bayesian resource table (Table 3/6) is monotone in both dimensions by construction; D/L table flat at 11.9% for 8 wickets lost across u = 50..15 and at 4.7% for 9 wickets (Table 1).
- RSS ratio (Bayes/D/L): < 1 in the majority of overs-left scenarios from u=30 down to u=1, "statistically significant in majority of the portions" — Bayesian predicts first-innings totals better, especially with many overs left.
- Nonparametric empirical table (Table 2/5) is even worse: non-monotone with wild values (e.g., 101.71% at 47 overs/3 wickets, 53.67% at 13 overs/0 wickets) and 26.8% missing cells — motivating the Bayesian approach.
- Fitted table values e.g.: 50 overs/0 wkts = 100%; 25/5 = 50.08%; 10/9 = 18.12% (Bayesian) vs 4.70% (D/L) — large differences in tail states.

## 8. Code / data availability
Data: cricsheet.org (public). JAGS model snippet in Appendix C; no full repo.

## 9. Leakage & limitations
- Cricket-specific exponential form; no reason a football "resources" surface follows a_w(1−e^{−b_w u}).
- Evaluation is in-sample (tables fit on the same 947 matches used for RSS comparison) — the Bayesian win over D/L partly reflects fitting freedom, not validated generalization.
- First-innings-only data; second-innings chase dynamics unmodeled.
- MAR assumption for missing extreme-state cells is untestable; posterior predictive imputation in unobserved regions is pure model extrapolation.
- The D/L parameters were never public, so "beats D/L" is against the table, not the method.

## 10. GSE overlap
New methodology for the corpus. No existing ledger builds monotone-constrained Bayesian adjustment tables, and no ledger addresses weather-interrupted games — relevant to GSE via NFL/NCAA lightning delays and extreme-weather postponements (games suspended with partial state). The "resources remaining" concept maps to expected remaining scoring given (time left, score differential, timeouts, field position) — the core of any live win-probability engine. The prior construction (Eq. 7) is a reusable recipe wherever GSE needs a bivariate surface that must be monotone (win prob in score diff; weather penalty in wind speed). Complements ledger 1705 (DLS vs ML comparison) — read together they bracket the classical-vs-ML rain-rule debate.

## 11. GSE implementation spec
- Module `live/interruption_adjustment.py`: adapt the framework to football — define game-state resources R(t, s, to): expected remaining point differential given minutes remaining t, score differential s, timeouts remaining to. Fit Bayesian monotone model on nflverse play-by-play: R̄(t,s,to) ~ N(m(t,s,to;θ), σ²/n), with order-constrained priors enforcing: R increasing in own timeouts, decreasing in deficit, increasing in time remaining (the Eq. 7 construction ported: chain uniform priors on successive levels).
- Application 1: lightning-delayed/suspended games — fair evaluation of game state at interruption (e.g., for grading picks on suspended games or modeling resume probabilities).
- Application 2: monotone win-probability surface for the live engine — replace any non-monotone empirical WP table with the constrained Bayesian version.
- Effort: ~3 days (state aggregation from nflverse + JAGS/Stan monotone model + table export).

## 12. Reproducible test
Dataset: nflverse 2016–2025 play-by-play; aggregate to (minutes remaining × score differential × timeouts) cells with mean eventual point differential. Baseline: empirical (unconstrained) cell means. Test: monotone Bayesian table; metric: out-of-sample RMSE predicting final margins from mid-game states on 2024–2025 holdout games. Check: fitted surface strictly monotone in each dimension (the paper's Table 3 property) and no cell predicts a worse outcome for a strictly better state.

## 13. Acceptance / rejection gate
ADOPT the monotone table if (a) out-of-sample RMSE beats the unconstrained empirical table by ≥ 2% (the constraint acts as regularization, mirroring the paper's RSS win), (b) monotonicity holds exactly across all cells, and (c) the table's implied win probabilities are calibrated (ECE ≤ 0.02 on holdout). REJECT if the constraint doesn't improve generalization — with NFL sample sizes (far fewer games than 947 ODIs × 50 overs), the prior may over-smooth real structure.

## 14. Improvement experiment
The paper's stated future work — "a nonparametric approach for modeling such constrained bivariate functions not based on exponential decay" — ported to GSE: replace the parametric m(u,w) with a monotone Gaussian process (or monotone spline) over (time, score diff, timeouts), keeping the Eq. 7-style order priors on the GP's inducing values. Hypothesis: the nonparametric monotone surface captures football-specific structure the exponential form misses (e.g., the 2-minute-warning and 4th-quarter comeback nonlinearity) while retaining exact monotonicity. Test: compare parametric vs monotone-GP on holdout RMSE and on calibration in extreme states (large deficits late — where the paper's D/L comparison showed the biggest table differences); success = GP wins by ≥ 3% RMSE in the last 5 minutes of games. This becomes GSE's live-engine WP surface.

**Verdict:** ADAPT — the monotonicity-enforcing Bayesian prior construction and the resources-remaining interruption framework are directly portable to GSE's live win-probability surfaces and suspended-game adjustments, but the exponential cricket model must be replaced with a football state model.
