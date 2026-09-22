# 1796 Robust Analysis of Second-Leg Home Advantage in UEFA Football Through Better Nonparametric Confidence Intervals for Binary Regression Functions (arXiv:1701.07555v2)

**Citation:** Gery Geenens, Thomas Cuddihy (2017). *Robust Analysis of Second-Leg Home Advantage in UEFA Football Through Better Nonparametric Confidence Intervals for Binary Regression Functions*. arXiv:1701.07555v2. URL: https://arxiv.org/abs/1701.07555v2
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Does a "second-leg home advantage" (SLHA) exist in two-legged UEFA knockout ties — i.e., is P(second-leg home team qualifies | teams equally strong) > 1/2 — and can it be detected without the parametric (logistic) specifications previous studies used without goodness-of-fit checks? Along the way: construct valid nonparametric (Wilson/Agresti-Coull) confidence intervals for a conditional probability estimated by Nadaraya-Watson binary regression, with a bootstrap bandwidth selector targeting coverage rather than estimation optimality.

## 2. Dataset / schema

- **1,353 two-legged knockout ties**, UEFA Champions League + Europa League, 2009/10–2014/15 (from 4,160 matches; group-stage and single-leg ties removed). 84 ties went to extra time.
- Outcome Yᵢ = 1 if second-leg home team qualifies. Predictor X = log(C₂/C₁) = log(C₂) − log(C₁), the log-ratio of UEFA club coefficients (strength proxy); X = 0 = perfectly balanced tie. Log-ratio justified algebraically (ℝ⁺,×) and empirically (La Fiorita–Levadia vs Barcelona–Bayern example).
- **Confounding confirmed:** P(X > 0) = 752/1353 = 0.556, Wilson CI [0.529, 0.582] — stronger teams are preferentially seeded to play the second leg at home, so naive comparisons are biased; conditioning on X is mandatory.
- **Access:** Kassies (2016) UEFA coefficient database (public website); no code repo linked.

## 3. Method / model

Nadaraya-Watson kernel regression p̂_h(x) = ΣK((x−Xᵢ)/h)Yᵢ / ΣK((x−Xᵢ)/h) (Gaussian kernel, h₀ = 0.525 by AIC) estimates the conditional qualification probability p(x). Three pointwise 95% CIs for p(0) constructed: Wald-type (3.6), conditional Wilson (3.8), conditional Agresti-Coull (3.9), all built on the "local equivalent sample size" nhf̂_h(x)/R(K). Bandwidth for the *intervals* chosen by a novel bootstrap procedure (B = 5,000 resamples, Yᵢ* ∼ Bernoulli(p̂_{h₀}(Xᵢ)), fixed design): pick h maximizing estimated coverage P̂(x,h), averaged over the h-values achieving ≥95%. Simulation study (M = 1,000 replications, n = 50/250/1000) validates coverage.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- NW estimator (3.2): p̂_h(x) = ΣᵢK((x−Xᵢ)/h)Yᵢ / ΣᵢK((x−Xᵢ)/h).
- Asymptotic normality (3.5, undersmoothed): √(nh)(p̂_h(x) − p(x)) →ᴸ N(0, R(K)p(x)(1−p(x))/f(x)).
- Conditional Wilson (3.8): CI_Wi(x;h) = [ (p̂_h(x)·nhf̂_h(x)/R(K) + z²/2)/(nhf̂_h(x)/R(K) + z²) ± z(nhf̂_h(x)/R(K))^{1/2}/(nhf̂_h(x)/R(K) + z²) · √(p̂_h(x)(1−p̂_h(x)) + z²R(K)/(4nhf̂_h(x))) ].
- Conditional Agresti-Coull (3.9): CI_AC = [p̃_h(x) ± z√(p̃_h(x)(1−p̃_h(x))/ñ_h(x))], p̃_h(x) = (p̂_h(x)nhf̂_h(x)/R(K) + z²/2)/(nhf̂_h(x)/R(K) + z²), ñ_h(x) = nhf̂_h(x)/R(K) + z².
- Coverage-error rate (3.10): P(p(x) ∈ CI_Wa) = 1 − α + O(nh⁵ + h² + (nh)⁻¹).
- Predictor (4.1): X = log(C₂/C₁).

Assumptions stated: X treated as fixed design; Yᵢ|Xᵢ ∼ Bernoulli(p(Xᵢ)) independent; p twice continuously differentiable; f(x) > 0 at estimation points. Logistic comparison model logit(p(x)) = α + βx used only as a foil.

## 5. Features / target

Features: single scalar — log-ratio of team strength indices. Target: binary tie outcome (qualification of the second-leg home team). Deliberately minimal: the question is about one conditional probability, p(0).

## 6. Validation design

Simulation study with known truth (Scenarios 1–2, M = 1,000 replications each): empirical coverage of the three interval constructions at nominal 95%, across sample sizes and at p(x) ≈ 1/2 and ≈ 0.95. Real-data analysis is estimation + inference, not prediction — no train/test split; the "validation" is the coverage simulation plus the logistic-model goodness-of-fit rejection.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly:

- **SLHA estimate:** p̂_{h₀}(0) = 0.539; 95% CIs (h = 0.873 Wald / 0.854 Wilson & AC): **CI = [0.504, 0.574]** — all three intervals agree to the 4th decimal; 1/2 excluded → significant SLHA.
- **Excluding 84 extra-time ties:** p̂ = 0.540 — the effect is *not* an extra-time artifact.
- **Logistic foil:** α̂ = 0.088, β̂ = 0.770; implied 95% CI for p(0) = [0.491, 0.552] ∋ 1/2 — **misses the effect**. Goodness-of-fit rejects the logistic model (deviance p ≈ 0.001; le Cessie–van Houwelingen p = 0.06). Nonparametric CI length 0.070 vs logistic 0.061 — flexibility costs almost no precision.
- **Simulation coverage (nominal 95%):** at n = 1000, x = π/2 (p ≈ 0.953): Wald 0.860, Wilson 0.958, Agresti-Coull 0.961. At n = 250, x = π/2: Wald 0.796 (!), Wilson 0.940, AC 0.939. Scenario 2 (mimicking the real data, n = 1350): Wald 0.934, Wilson 0.953, AC 0.955.
- **Bandwidth finding:** the coverage-optimal h (≈0.86) was *larger* than the estimation-optimal h₀ = 0.525 — naive "undersmoothing" heuristics (h = h₀n^{−2/15} = 0.2) would have produced severely under-covering intervals. The bootstrap selector is the paper's practical fix.

## 8. Code / data availability

No code linked; bandwidth selector implemented via R package `np` for h₀; all formulas fully specified. Kassies UEFA coefficient database is public.

## 9. Leakage & limitations

- **Soccer-specific estimand:** second-leg home advantage has no NFL analogue (no two-legged ties); the transferable asset is the *method*, not the finding.
- **Strength proxy is crude:** UEFA coefficients are 5-year rolling indices; within-season form, injuries, and line-ups unmodeled — residual confounding possible if the proxy mismeasures true strength differentially by leg order.
- **Single scalar regression:** no interaction of SLHA with era, competition, or team — the "remontada" team-specific heterogeneity noted as future work.
- **Interval agreement is sample-size luck:** the three CIs coinciding to 4 decimals at n = 1353, p ≈ 0.54 is the benign regime; the simulation shows they diverge badly at extreme p or small local n.
- **Causality:** the paper is careful — this is a conditional association; the crowd-pressure mechanism (Lidor et al.: home goals +33% in second leg) is cited, not tested.

## 10. GSE overlap

The corpus models home-field advantage as a constant or a fitted parameter inside parametric models (Elo/HFA terms, Poisson home effects). No ledger questions whether the *functional form* of the HFA adjustment is right, or provides honest uncertainty for a *nonparametric* conditional win-probability curve. This paper supplies both: (a) a template for estimating P(win | strength differential) nonparametrically with valid CIs — directly portable to NFL moneyline calibration (plot empirical P(home win) vs Elo/spread differential with Wilson bands instead of trusting the logistic link); (b) the log-ratio strength measure X = log(C₂/C₁), the natural scale for positive strength indices; (c) a cautionary empirical proof that a misspecified logistic link can *hide a real, significant effect* (SLHA invisible to logistic, visible nonparametrically) — relevant to GSE's spread→probability mappings. Not a duplicate.

## 11. GSE implementation spec

1. **Nonparametric HFA diagnostic:** using 2010–2025 NFL games, compute NW estimates of P(home win | spread-differential or Elo-differential) with conditional Wilson 95% bands; overlay the engine's parametric (logistic) mapping. Where the nonparametric curve exits the parametric band, the link function is misspecified — recalibrate locally.
2. **Situational HFA decomposition:** extend the scalar regression to estimate HFA as a function of rest differential, altitude/dome, and division rivalry (additive NW / local-linear), each with bootstrap-selected bandwidths — a data-driven alternative to fixed HFA constants.
3. Cost: ~2 days (game-level data already in the research stack).

## 12. Reproducible test

Dataset: NFL 2015–2024 (fit 2015–2022, evaluate 2023–2024). Baseline: engine's current home-win probability model (logistic in spread). Metrics: Brier score and calibration-curve deviation of the nonparametric-corrected mapping vs baseline on 2023–2024; plus coverage check of the Wilson bands (empirical coverage should be ≥93% at nominal 95%). Success gate below.

## 13. Acceptance / rejection gate

**Adopt the nonparametric HFA correction if** it improves Brier score on 2023–2024 home-win probabilities by ≥0.002 AND the Wilson bands reveal ≥1 spread region where the parametric mapping is significantly miscalibrated (band excludes the parametric curve); **reject** if the logistic mapping stays inside the bands everywhere (then the paper's lesson is "your link is fine" — still a useful audit). Never widen published probabilities based on the bands alone; they are a diagnostic, not a forecast.

## 14. Improvement experiment

**Local-likelihood HFA surface with uncertainty-aware staking:** replace the scalar NW with a local-logistic surface P(home win | Elo-diff, rest-diff, dome/altitude) and compute conditional Wilson bands on a grid; feed the band *width* (not just the point estimate) into the sizing lane — games where the HFA surface is uncertain (wide bands: e.g., extreme rest differentials with thin data) get fractional-Kelly down-weighting. Hypothesis: the paper's honest-uncertainty machinery converts directly into edge-aware stake sizing, cutting drawdowns on thin-data situational spots. Test: backtest 2023–2024 with band-width-scaled stakes vs flat Kelly; success = higher Sharpe with no return loss. This turns a statistical-inference paper into a risk-management input.

**Verdict:** ADAPT
