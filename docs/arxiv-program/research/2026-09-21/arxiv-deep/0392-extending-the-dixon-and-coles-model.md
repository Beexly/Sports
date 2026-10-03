# [0392] Extending the Dixon and Coles model: an application to women's football data (arXiv:2307.02139v1)

**Citation:** Rouven Michels, Marius Ötting, Dimitris Karlis (2023). *Extending the Dixon and Coles model: an application to women's football data*. arXiv:2307.02139v1. URL: https://arxiv.org/abs/2307.02139v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5071 lines).
**Verdict:** ADAPT — the Sarmanov-family generalization (non-Poisson marginals, probability-shifting over arbitrary score sets, wider correlation ranges) is worth porting as a candidate joint-distribution model for NFL exact scores/totals, tested head-to-head against GSE's existing Skellam/independent-Poisson baselines; do not adopt the women's-football-fitted parameters.

## 1. Research question
The Dixon and Coles (1997) model only shifts probability among the four scorelines (0-0, 1-0, 0-1, 1-1), only allows Poisson marginals, and implies only a narrow range of correlation — limitations that break on women's football data, where scorelines like 2-0 and 3-0 are overrepresented, 0-0s are *under*represented (vs overrepresented in men's), goal counts are overdispersed, and home–away goal correlations reach −0.263 to −0.395. Can the Dixon–Coles model be embedded in a more general family (Sarmanov, 1966) to allow probability shifting over arbitrary score sets, non-Poisson marginals, and wider correlation ranges, and do the resulting models fit women's football scorelines better? (§1, §3)

## 2. Dataset / schema
- Four European women's leagues, seasons 2011/12–2018/19 and 2021/22 (COVID-affected seasons excluded): English FA Women's Super League, German Frauen-Bundesliga, French Division 1 Féminine, Spanish Primera Iberdrola. Only match scorelines (home goals, away goals) — no covariates in the baseline; team attack/defence dummies + home dummy in the extended fits.
- Key empirical patterns: joint-frequency/marginal-product ratios (Table 1) differ substantially from 1 (independence rejected by χ² for all leagues except England, p = 0.067); correlations home–away goals: England −0.269, Germany −0.352, France −0.395, Spain −0.263 (Figure 4 shows season-level scatter; classical Dixon–Coles lower correlation bound is −0.08 at λ_1=1.3, λ_2=1.2, and −0.05 for their fitted data); overdispersion: several team mean–variance points lie above the diagonal and outside 95% MC intervals, especially in Germany, France, Spain (Figure 5).
- Predictive demonstration: German Frauen-Bundesliga 2021/22 — fit on first 15 matchdays, predict final standings from the last 7 matchdays via 1,000 Monte Carlo simulations → 95% prediction intervals contain all teams' observed final points (Figure 6).

## 3. Method / model
- **§2.1 Dixon–Coles recap:** joint pmf P(X_1=x_1,X_2=x_2) = τ_{λ_1,λ_2}(x_1,x_2)·Poisson(λ_1)·Poisson(λ_2), with τ shifting probability only among (0,0),(1,0),(0,1),(1,1) via dependence parameter ω̃ bounded by max(−1/λ_1,−1/λ_2) ≤ ω̃ ≤ min(1/(λ_1λ_2),1).
- **§2.2 Sarmanov family:** P(X_1=x_1,X_2=x_2) = P_1(x_1)P_2(x_2)[1 + ω q_1(x_1)q_2(x_2)] (Eq. 2), with bounded non-constant q_i satisfying Σ q_i(x_i)P_i(x_i) = 0 (Eq. 1); correlation ρ = ωu_1u_2/(σ_1σ_2), u_i = E[X_i q_i(X_i)].
- **§2.3 Key theoretical result:** Dixon–Coles is a Sarmanov member: with Poisson marginals, ω = −ω̃ and q_dc(x_i) = −λ_i if x_i=0, 1 if x_i=1, 0 if x_i≥2.
- **§2.4 New models:** (a) q̂ — quadratic-exponent shifting on the same four pairs; (b) q̃ — extends shifting to x_i ∈ {0,1,2} (9 pairs); (c) q^(s) — general form q^(s)(x_i) = −x_i! λ^{s−x_i} for x_i<s, s·s! at x_i=s, 0 beyond — shifting over (s+1)² pairs; different q-functions allowed per marginal. (d) **Non-Poisson marginals:** general q_{1P}, q_{2P}, q_{3P} functions for any discrete distribution (in terms of P_0, P_1, μ_i); worked example: negative-binomial marginals with q_nb, q̂_nb, q̃_nb (variance μ_i + μ_i²/φ_i). (e) **Full-support shifting (§2.5):** q_Sar(x_i) = exp(−x_i) − L_i(1) with L_i the Laplace transform — bivariate pmfs derived for Poisson margins (L_i(1) = exp(−λ_i(1−e^{−1}))) and NB margins (L_i(1) = [φ_i/(φ_i+μ_i(1−e^{−1}))]^{φ_i}); (f) **ANS (Alternative Negative-binomial Sarmanov)** — novel: q_ANS(x) = [φ_i/(φ_i+μ_i)]^{x_i} − c_i (c_i given in §2.5, Appendix B verifies Eq. 1 holds; Appendix C gives correlation properties). ANS shifts more weight from scoreless draws/close wins to clear wins than the Laplace-based NB Sarmanov (Figure 3).
- **Fitting:** numerical MLE in R via `nlm()`; team-specific models use log-linear mean parametrization log(θ_1j) = home + att_{h_j} + def_{g_j}, log(θ_2j) = att_{g_j} + def_{h_j} with sum-to-zero constraint on defence parameters. Model comparison by AIC (Tables 2–3) and by sum of absolute differences between model and empirical score probabilities over scores 0-0…11-11 ×100 (Table 4).

## 4. Equations & assumptions
- Dixon–Coles pmf and τ definition (§2.1) and ω̃ bounds quoted in §3 above.
- Sarmanov: P(X_1=x_1,X_2=x_2) = P_1(x_1)P_2(x_2)[1 + ω q_1(x_1)q_2(x_2)] (Eq. 2); zero-mean constraint Σ q_i(x_i)P_i(x_i) = 0 (Eq. 1); correlation ρ = ωu_1u_2/(σ_1σ_2).
- q_dc, q̂, q̃, q^(s), q_{1P}/q_{2P}/q_{3P}, q_nb/q̂_nb/q̃_nb, q_Sar, q_ANS as listed in §3.
- Poisson full-support pmf: P(x_1,x_2) = Pois(λ_1)Pois(λ_2){1 + ω[(e^{−x_1} − e^{−λ_1 c})(e^{−x_2} − e^{−λ_2 c})]}, c = 1 − e^{−1}.
- NB full-support pmf with [1 + ω(e^{−x_1} − L_1(1))(e^{−x_2} − L_2(1))] and L_i(1) = [φ_i/(φ_i+μ_i(1−e^{−1}))]^{φ_i}.
- ANS pmf with [1 + ω((φ_1/(φ_1+μ_1))^{x_1} − c_1)((φ_2/(φ_2+μ_2))^{x_2} − c_2)], c_i = (φ_i/(φ_i+μ_i))^{φ_i}[1 − (1 − φ_i/(φ_i+μ_i))·φ_i/(φ_i+μ_i)]^{−φ_i}.
- Appendix A: q̂_{(s)} with exponent s: −λ_i^s at x_i=0, λ_i^{s−1} at x_i=1.
Stated assumptions: marginal pmfs discrete on ℕ_0; q-functions bounded, non-constant, zero-mean under the marginal; [1 + ωq_1q_2] ≥ 0 for all (x_1,x_2) (bounds ω); team strength constant within a season (no time weighting); attack/defence effects log-linear and separable.

## 5. Features / target
- Input features: none in baseline models (intercept-only marginals); team identity dummies (attack/defence per team per league) + home indicator in §3.3 models.
- Target: joint distribution of (home goals, away goals) — bivariate count pmf; derived: exact-score probabilities, simulated final league standings.

## 6. Validation design
- Baseline (no covariates): AIC across 11 model formulations × 4 leagues (Table 2). Team-dummy models: AIC again (Table 3).
- Model checking: Σ|model probability − empirical proportion| over all scores 0-0…11-11, ×100 (Table 4).
- Predictive: train on first 15 matchdays of Bundesliga 2021/22, Monte Carlo 1,000 simulated completions of last 7 matchdays → 95% prediction intervals for final points vs observed (Figure 6). This is a genuine out-of-sample prediction exercise, though on one league-season only.

## 7. Numerical results / baselines
- **Baselines:** NB marginals beat Poisson marginals on AIC for every league (Table 2, e.g., Spain: double NB 14,953.09 vs double Poisson 15,432.49). ANS is AIC-preferred among all 11 formulations for all four leagues in the baseline fits (England 4332.66, Germany 8164.33, France 8343.46, Spain 14787.05 — bold in Table 2).
- **Team-dummy models (Table 3):** ANS preferred for Germany (7321.30), France (7102.81), Spain (13515.88); England prefers the Dixon–Coles NB extension shifting scores up to 2 (q̃_nb, 4015.71 vs ANS 4018.12) — authors attribute this to lower overdispersion in England.
- **Score-fit check (Table 4, ×100):** ANS best for Germany (13.19) and France (13.28); Dixon–Coles Poisson best for Spain (9.50, ANS 9.61); DC-NB q_nb best for England (18.72, ANS 19.19).
- **Key empirical numbers:** home–away goal correlations −0.263…−0.395; Dixon–Coles correlation floor −0.08 (at λ=1.3/1.2) / −0.05 on fitted data — i.e., classical DC *cannot* represent the observed negative dependence (Figure 4, Figure C1 shows ANS covers a much wider range).
- Predictive intervals (Figure 6): all Bundesliga teams' true final points inside the ANS model's 95% intervals — encouraging but a single-season demo.

## 8. Code / data availability
None stated — no code repository, no data download. Fitting described as R `nlm()` numerical MLE on scorelines (data itself is public record: women's league results 2011/12–2021/22, but no compiled file provided).

## 9. Leakage & limitations
- AIC comparisons mix models with different parameter counts on the same data — AIC is the right tool, but the "ANS wins" headline is in-sample; the only out-of-sample check is one league-season (Bundesliga 2021/22, 7 matchdays, 1,000 simulations) — thin evidence for predictive superiority.
- Women's football sample sizes per league-season are small; several teams appear in few seasons, and the χ² independence test fails to reject for England (p = 0.067) — the dependence structure the whole paper models is borderline-detectable there.
- Team strengths assumed constant within season (no time weighting, no form) — the authors flag this as future work; Dixon–Coles's own time-decay weighting is dropped.
- Negative-binomial marginals + Sarmanov q-functions have awkward parameter boundaries ([1+ωq_1q_2] ≥ 0 constraint); `nlm()` without stated starting values or convergence diagnostics — reproducibility of the exact fits is uncertain.
- External validity to NFL: soccer goals (means ~1.3) vs NFL points (means ~23, different scoring increments) — the *dependence machinery* transfers (bivariate counts with overdispersion and negative correlation), but NFL score correlation structure (correlated scoring via game script) differs from soccer's; the paper's q-functions are designed around low-count scores and would need re-derivation for NFL point totals (or application to TD/FG counts instead).
- Adversarial note: the paper's motivating contrast (men's vs women's football) is empirical description, not a causal claim; and the "ANS shifts weight from draws to clear wins" property (Figure 3) is exactly what you'd expect from fitting overdispersed data with negative correlation — the flexibility could overfit small league-seasons (the England result, where simpler wins, is the warning sign).

## 10. GSE overlap
Extension of an inventoried method — marginal new value. The map lists Dixon-Coles, Skellam, and Poisson models as inventoried methods. This paper is a *generalization* of Dixon–Coles, not a new method family: the Sarmanov embedding, NB marginals, and arbitrary score-set shifting extend machinery GSE already knows. What is genuinely new relative to the map: (a) the Sarmanov q-function recipe for shifting probability over *arbitrary* score sets (q^(s)) — a constructive tool for building bivariate count models; (b) the ANS model as a concrete overdispersed, wide-correlation-range bivariate count distribution; (c) the empirical demonstration that classical Dixon–Coles *cannot* represent correlations below ≈−0.08 — relevant if GSE ever fits joint score models and finds stronger negative dependence (e.g., in low-total games). Not duplicate, but adjacent: it upgrades an inventoried tool rather than adding a lane.

## 11. GSE implementation spec
Narrow, well-scoped port: use the Sarmanov/ANS machinery as a *challenger* joint-distribution model for NFL exact scores and totals.
1. **Target reformulation:** NFL points are not low-count Poisson; apply the framework to (home TDs, away TDs) or (home scores, away scores) as bivariate counts, or discretize point totals into bins. Simpler first step: bivariate counts of (home touchdowns, away touchdowns) per game from nflverse 2015–2025, with NB marginals (overdispersion is expected).
2. **Model:** ANS-style Sarmanov with NB marginals + team attack/defence log-linear means (the paper's §3.3 parametrization ports directly: log(θ) = home + att + def, sum-to-zero constraint on defence). Fit by numerical MLE (the paper's `nlm()` recipe; GSE can use scipy/R).
3. **Use:** the fitted joint pmf gives exact-score probabilities → derive totals and spread distributions that respect dependence (negative correlation in low-scoring games) — compare against GSE's current Skellam/independent baseline.
4. **Correlation check first:** estimate empirical home–away TD correlation; if it sits within the classical bivariate-Poisson range, the ANS machinery adds nothing and the project stops.
Estimated effort: 1–2 engineer-weeks for the challenger model + comparison harness.

## 12. Reproducible test
- **Paper reproduction:** reimplement the ANS model and the Dixon–Coles NB q_nb model in R/Python; fit to one public women's league dataset (e.g., football-data.co.uk women's files or worldfootball.net scrapes for the FA WSL 2011/12–2018/19); success = reproduce Table 2 ordering (ANS AIC < DC-NB AIC < double-NB AIC < Poisson variants) within ±5 AIC points, and reproduce the home–away correlation range (−0.26 to −0.40).
- **NFL transfer test:** fit the bivariate-NB Sarmanov model to (home TDs, away TDs) from nflverse 2015–2022 regular seasons; evaluate out-of-sample log-likelihood of exact TD pairs on 2023–2025 vs baselines: (a) independent NB, (b) classical bivariate Poisson. Metric: mean per-game log-likelihood difference; also calibration of implied totals (predicted vs actual over/under at the closing line, hit rate vs 52.4% break-even on a fixed rule).

## 13. Acceptance / rejection gate
Adopt the Sarmanov/ANS challenger into GSE's score-distribution stack only if: (a) the reproduction confirms the paper's mechanism (ANS AIC-best on women's data and correlation range reproduced); AND (b) on the NFL TD-count transfer, the Sarmanov model beats independent NB on out-of-sample mean per-game log-likelihood over 2023–2025 with p < 0.05 (paired test), AND (c) implied-total calibration shows no degradation vs the current production baseline (Brier score on over/under at close ≤ baseline). If (b) fails — NFL TD counts show no exploitable dependence beyond independence — reject; the paper remains a reference for bivariate-count modeling technique.

## 14. Improvement experiment
Two extensions beyond the paper: (1) **Time-weighted Sarmanov** — the paper drops Dixon–Coles's time-decay weighting; reintroduce exponential time weighting into the Sarmanov MLE so recent matches dominate (the standard Dixon–Coles ξ(t) = e^{−ξt} scheme), and test whether time-weighted ANS beats static ANS on rolling out-of-sample likelihood — directly relevant to GSE's weekly refit cadence. (2) **Covariate-driven ω** — make the dependence parameter a function of game context (e.g., total line, weather, divisional matchup) via ω = g(x'β), testing whether score-dependence itself is predictable; if low-total games show stronger negative TD correlation, the joint model would sharpen totals edges exactly where GSE's TOTAL picks live.
