# 1791 Modelling handball outcomes using univariate and bivariate approaches (arXiv:2404.04213v1)

**Citation:** Dimitris Karlis, Rouven Michels, Marius Ötting (2024). *Modelling handball outcomes using univariate and bivariate approaches*. arXiv:2404.04213v1. URL: https://arxiv.org/abs/2404.04213v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Handball scores are *under*dispersed relative to Poisson (variance < mean), breaking the standard Poisson-score toolkit. Can the problem be circumvented by modeling the score *difference* (an integer in ℤ) — with Skellam regression, zero-inflated Skellam, and discretized normal/Laplace alternatives — and can first-half/second-half differences be jointly modeled with copulas to yield halftime-conditional final-outcome probabilities? Data: German Handball Bundesliga 2017-18–2022-23.

## 2. Dataset / schema

- **Games:** German Handball Bundesliga (HBL), seasons 2017-18 through 2022-23; 1,844 matches total (18 teams round-robin; 2019-20 stopped after 240 matches due to COVID; 2020-21 played with 20 teams/380 matches).
- **Descriptives:** home goals mean 28.07 / variance 19.67; away goals mean 26.92 / variance 18.32 → underdispersed, small home advantage; home–away goal correlation 0.14. Season goal-difference means 0.71–1.35, SDs 5.04–5.96, skewness −0.10 to 0.19 (Table 1).
- **Betting odds:** betexplorer.com HBL odds, converted to probabilities assuming equal vig on three outcomes (used as benchmark and, experimentally, as a covariate for the zero-inflation parameter).
- **Schema:** per match: home/away goals, first-half and second-half score differences (Y1, Y2).
- **Access:** HBL scores re-scrapable; betexplorer odds archival; no code link stated.

## 3. Method / model

**Univariate.** Skellam2 reparameterization (Koopman et al. 2017): Skellam2(μ, σ²) with μ = θ1−θ2, σ² = θ1+θ2, so covariates enter the mean linearly: μ_jk = α + β_j + γ_k (team j home vs team k; β_j = home ability, γ_k = away ability; baseline team Bergischer HC; team-specific home advantage = β_j − γ_j). Extensions: (a) **zero-inflated Skellam** with extra parameter p (fit by EM; p optionally logistic in covariates z_i'γ); (b) **discretized normal** P_N(z) = Φ(z+0.5)−Φ(z−0.5); (c) **discretized Laplace** P_L(z) = F(z+0.5)−F(z−0.5). Key theory: the difference of two *underdispersed* variables is still Skellam (write Y1 = X1+W, Y2 = X2+W with W underdispersed; Y1−Y2 = X1−X2) — the formal justification for using Skellam on underdispersed handball scores.

**Bivariate.** First-half and second-half score differences (Y1, Y2) each marginally Skellam2, joined by a copula (Frank — allows negative/positive dependence — or Gumbel — tail dependence), with the discrete joint PMF via copula CDF differencing. Three complexity tiers: A = independence with half-specific abilities (72 params); B = copula with common abilities across halves (38 params); C = copula with half-specific abilities (73 params). Conditional win probability given halftime deficit x: P(Win) = P(Y > −x | X = x) = Σ_{y=−x+1}^∞ P(Y=y|X=x).

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- Skellam PMF (eq. 1): P(Z=z|θ1,θ2) = e^{−(θ1+θ2)}(θ1/θ2)^{z/2} I_{|z|}(2√(θ1θ2)), z ∈ ℤ; E(Z)=θ1−θ2, Var(Z)=θ1+θ2 (hence Var ≥ |E|); skewness = (θ1−θ2)/(θ1+θ2)^{3/2}.
- ZI Skellam: P_Z(z) = p + (1−p)P(z) if z=0; (1−p)P(z) if z≠0, p ∈ [0,1).
- Covariate inflation: p_i = exp(z_i'γ)/(1+exp(z_i'γ)).
- Discrete normal: P_N(z|μ,σ²) = Φ(z+0.5;μ,σ²) − Φ(z−0.5;μ,σ²). Discrete Laplace: P_L(z|μ,σ²) = F(z+0.5)−F(z−0.5).
- Bivariate copula PMF: P(Y1=y1,Y2=y2) = C(F(y1),G(y2)) − C(F(y1−1),G(y2)) − C(F(y1),G(y2−1)) + C(F(y1−1),G(y2−1)).
- Frank: C(u,v;θ) = −(1/θ)log[1 + (e^{−θu}−1)(e^{−θv}−1)/(e^{−θ}−1)]; Gumbel: C(u,v;θ) = exp(−((−log u)^θ + (−log v)^θ)^{1/θ}).

Assumptions stated: Skellam marginals per half (validated: no structural deviation in half-difference histograms, Fig. 8); team abilities constant across halves in the preferred model; draws arise from a constant zero-inflation probability (covariate-dependent p tried with betting odds — not significant, dropped to avoid overparameterization); Skellam's time-scaling closure (Skellam per unit time ⇒ Skellam per any time unit with scaled parameters) underpins in-game use.

## 5. Features / target

Univariate inputs: home-team and away-team identity dummies (β_j, γ_k) plus intercept; target: integer final score difference. Bivariate inputs: same ability parameters per half; target: joint (Y1, Y2) halftime/fulltime difference pair. Derived: P(home win/draw/away win), halftime-conditional win probabilities, season-simulation standings.

## 6. Validation design

- **Fit:** season-by-season MLE (6 seasons) for stability/robustness checks; AIC bake-off across Skellam / ZI Skellam / discrete normal / discrete Laplace.
- **Goodness-of-fit (2021-22, 306 matches):** summed predicted outcome probabilities vs observed frequencies vs bookmaker-implied probabilities; 10,000-replication parametric bootstrap of league points with 95% CIs (Fig. 4); EDF vs model CDF with 95% band (Fig. 5).
- **Out-of-sample:** COVID-truncated 2019-20 season — fit on games played, Monte Carlo (10,000) the remainder; champion/relegation probabilities (Table 4).
- **Bivariate:** AIC across models A/B/C × {Frank, Gumbel}.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly:

- **AIC by season (Table 2):** e.g., 2021-22 — Skellam 1854.39, ZI Skellam 1850.77, discrete normal 1855.83, discrete Laplace 1854.42. ZI Skellam has the best log-likelihood in every full season; on AIC, Skellam or ZI Skellam wins each season (discrete normal hurt by skewness).
- **Outcome calibration 2021-22 (Table 3, 306 matches):** observed — home 153.00, draw 29.00, away 124.00. Bookmaker-implied — 160.63 / 28.22 / 117.14. Skellam — 157.45 / 20.66 / 127.89 (10 draws short). ZI Skellam — **152.02 / 30.39 / 123.59** (nails draws 30.39 vs 29, and beats bookmakers on home/away counts). Discrete normal — 157.55/20.40/128.05; discrete Laplace — 159.95/21.35/124.70.
- **Bivariate (Table 5):** Model A AIC 3324.09; Model B Gumbel 3282.47 / **Frank 3279.47** (preferred — no tail dependence); Model C Gumbel 3321.02 / Frank 3319.84. Half-difference correlation 0.13.
- **COVID out-of-sample (Table 4):** Kiel champion probability 0.972, Flensburg 0.028; Nordhorn-Lingen relegation 1.000; hypothetical table matched the actually-awarded outcome.
- **Halftime conditionals (Fig. 10):** e.g., Erlangen–Leipzig tied 8–8 at half → home win prob 0.49.

## 8. Code / data availability

None stated. No repository; data re-scrapable (HBL scores, betexplorer odds).

## 9. Leakage & limitations

- **No walk-forward:** season-by-season fits are descriptive; the only true out-of-sample test is the COVID-interrupted season (a natural experiment, but n=1 and the "truth" was administratively decided).
- **Draw-centric sport:** handball draws are rare but real; the ZI mechanism targets exactly this. In the NFL, ties are ~1% — the ZI machinery is more useful repurposed for *push* mass (margin == spread, total == line) than for ties.
- **Constant-p inflation:** the authors admit a common p across mismatched teams is "rather unnatural" but keep it to avoid overparameterization; the odds-covariate version failed — suggesting the draw mechanism isn't cleanly captured by observables.
- **Copula on discrete margins:** the usual identification caveats for discrete copulas apply (dependence parameter not fully identified); Frank winning over Gumbel is a weak signal (AIC gap ~3).
- **NFL transfer:** handball halves are symmetric 30-min blocks with ~28 goals each; NFL halves are asymmetric in strategy (2-minute drills, clock management). The "common abilities across halves" finding may not hold in the NFL — 2nd-half adjustments and garbage time are real. Also NFL scoring is lumpy, not smooth-count.

## 10. GSE overlap

Directly extends ledger 1790 (Pelechrinis & Winston Skellam regression): where 1790 gives the log-linear-rate Skellam recipe, this paper adds (a) the **Skellam2 (μ,σ²) reparameterization** enabling linear ability models — cleaner for team-strength ratings than dual log-links; (b) the **underdispersion justification theorem** (difference of underdispersed counts is Skellam) — matters because NFL scoring shows underdispersion relative to Poisson in some splits; (c) the **zero-inflated Skellam with EM fitting** — the tool for excess mass at a point (pushes); (d) a **discrete-distribution bake-off protocol** (AIC across Skellam/ZI/discrete-normal/discrete-Laplace) GSE can rerun on NFL margins; (e) the **copula half-by-half model** giving halftime-conditional win probabilities — a live-betting primitive GSE lacks. The existing map notes "live spread/total probability surfaces are thin" (gap #7) — this paper's §3.4 is exactly that machinery, albeit for handball halves.

## 11. GSE implementation spec

1. **Univariate NFL margin model:** Z (home−away points) ~ ZI-Skellam2(μ, σ², p) with μ_jk = α + β_j + γ_k (team home/away abilities from nflverse 2015–2025), σ² team-pair or global, p = push-mass parameter. Fit by MLE/EM; bake off vs discrete normal/Laplace on AIC, exactly per Table 2.
2. **Push handling:** interpret p as excess mass at Z == spread (recenter Z' = Z − spread per game); this converts the ZI trick from "draws" to "pushes" — directly prices push probability into spread bets.
3. **Bivariate half model:** (1H diff, 2H diff) with Skellam2 marginals + Frank copula; team abilities shared vs half-specific (Model B vs C test on NFL data). Output: halftime-conditional P(win), P(cover), P(over) — the live-betting surface.
4. **Season sim:** 10,000 Monte Carlo replications of remaining schedule for playoff-probability content (mirrors §3.2.3).
5. Serve margin CDFs precomputed per matchup; halftime conditionals computed on the fly from the copula (cheap: 1-D sums).

Estimated effort: 4–5 days (EM fitting + copula + calibration).

## 12. Reproducible test

Dataset: 2024–2025 NFL regular seasons (fit 2015–2023). Baselines: (a) plain Skellam2 without ZI; (b) closing-spread-implied win probs. Metrics: exact-margin log-loss; push-frequency calibration (predicted vs observed push rate); halftime-conditional Brier on 2H outcomes (fit bivariate on 1H/2H splits). Must beat the non-ZI Skellam on AIC and match observed push rate within 0.5pp.

## 13. Acceptance / rejection gate

**Adopt if** ZI-Skellam2 beats plain Skellam2 by AIC ≥ 10 on the 2024–2025 holdout AND predicted push rate is within 0.5pp of observed AND halftime-conditional Brier beats a naive "halftime leader wins" baseline by ≥0.01; **reject** otherwise (fall back to the ledger-1790 plain Skellam). The bivariate half model is adopted only if Model B (Frank, shared abilities) beats Model A (independence) by AIC ≥ 10 — if halves are effectively independent given abilities, keep the univariate model.

## 14. Improvement experiment

**Quarter-by-quarter vine copula:** extend the bivariate half model to four quarters with a D-vine of Frank copulas (Q1→Q2→Q3→Q4), Skellam2 marginals, abilities allowed a linear "fatigue/adjustment" trend across quarters. Hypothesis: NFL 4th quarters differ systematically (prevent defense, kneel-downs, garbage time) — a vine captures the dependence chain while the trend captures regime change. Test: quarter-conditional win-probability Brier at the start of Q3 and Q4 on the 2024–2025 holdout vs the half-based model; success = ≥0.005 Brier gain at both checkpoints. If quarter abilities collapse to the shared model, the experiment still answers whether NFL halves are strategically asymmetric (the paper's handball finding says no — the NFL test is the point).

**Verdict:** ADAPT
