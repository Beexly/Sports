# 1077 — A comprehensive survey of the home advantage in American football

## Citation / full-text source

- arXiv:2401.16392v3 — full text: https://arxiv.org/pdf/2401.16392
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2401.16392v3
- **Full-text URL**: https://arxiv.org/pdf/2401.16392v3
- **Authors**: Luke Benz (Harvard T.H. Chan), Thompson Bliss (NFL), Michael Lopez (NFL)
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: 1610 REJECT → 2207 reserve REJECT → 2401 ADAPT. Read as the compliant fresh-search replacement for 1610.06833v1 (REJECT — pure optimal-transport theory, ledger 1075); the consumed reserve 2207.11709v2 (TVCalib, ledger 1076) was itself REJECTED as domain-disjoint from GSE, so this paper was selected by a fresh referee-bias/home-advantage arXiv search.
- **Fresh-search record**: On 2026-09-21 I searched the arXiv API for referee bias / home advantage mechanisms using the targeted query `ti:"referee bias" OR ti:"home advantage"`. Relevant returns included 2509.22683v1 (Serie A tactical home advantage), 2506.09287v1 (Bayesian home advantage in squash), 2411.12509v1 (Bundesliga home advantage before/after COVID), 2308.06279v2 (away supporters as a mechanism), 2104.11595v1 (American football home advantage without crowds), and 2401.16392v3 (this paper). I selected 2401.16392v3 because it covers NFL/NCAA/high-school American football (GSE's core leagues), estimates home advantage with Bayesian paired-comparison models under full probabilistic time-trend inference, ships public code, and studies home-advantage decline and its mechanisms (replay review, travel, officiating) — directly on the calibration/uncertainty lane. Note: the cached/ar5iv HTML copy was truncated at the start of Section 3.1 with a fatal conversion error, so I fetched and read the full PDF (ar5iv/arxiv.org PDF) before writing this ledger.
- **Read depth**: FULL READ of the complete PDF text (main paper plus supplementary materials, including model formulations, data filtering procedure, results figures/tables, and full R-hat/ESS diagnostics tables).
- **Wave**: wave2-reader-20
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

How large is home advantage across all levels of American football (NFL, four NCAA divisions, all 50 states of high school) over 2004–2023, and has it declined — estimated in a single uniform Bayesian framework on the largest sample used to date?

## Summary

The authors build a uniform Bayesian framework to estimate home advantage (HA) across **all levels of American football** — NFL, four NCAA divisions (FBS, FCS, DII, DIII), and all 50 states of high school football — over 2004–2023 (2020 excluded for COVID), a sample roughly twice as large as anything previously used. They fit three models in Stan for each of 55 leagues: (1) constant HA, (2) linear HA trend over time, (3) per-season time-varying HA, and compare them with expected log pointwise predictive density via LOO-CV.

Core model: score differential \(Y_{ijkt} \sim N(\mu_{ijkt}, \sigma_k^2)\) with \(\mu_{ijkt} = \theta_{ikt} - \theta_{jkt} + \text{HA term}\), where \(\theta\) are season-specific team-strength parameters (independent across seasons — no dynamic state space — justified by roster turnover at amateur levels). Weakly informative half-normal priors; 4 chains × 2000 iterations with 500 burn-in; all R-hat ≈ 1 with ESS diagnostics tabulated.

Key findings: 2023 HA is largest at the college level (FCS 2.49, FBS 2.39, DIII 2.37, DII 1.86 points/game), versus NFL 1.73 (1.07, 2.39). HA is **declining in the NFL and top college tiers** — FBS shows the strongest decline, \(\hat{\beta}_1 \approx -0.097\) points/year (~1 point per decade, P(decline)=1.000); NFL \(\hat{\beta}_1 = -0.032\) points/year with P(decline)=0.857 — while high-school HA is flat or rising (38 of 50 states show positive \(\hat{\beta}_1\)). The authors attribute the pro/college decline to replay review expansion (NFL challenge success rate rose 31%→58% over the sample; NCAA adopted replay 2004–2006; high school prohibited it until 2019) and improved team travel, with distance traveled showing at best weak association (R²=0.016). A crucial methodological point: unadjusted empirical home-vs-away score differentials are **severely biased upward** versus team-strength-adjusted model estimates (gaps often >3 points), because better teams host more home games — NCAA teams buy cupcakes, high-school playoffs seed home games.

## Method, math, and equations

- Outcome model: \(Y_{ijkt} \sim N(\mu_{ijkt}, \sigma_k^2)\) (score differential ≈ normal, citing Glickman & Stern).
- Model 1 (constant HA): \(\mu_{ijkt} = \theta_{ikt} - \theta_{jkt} + \alpha_k\).
- Model 2 (linear HA): \(\mu_{ijkt} = \theta_{ikt} - \theta_{jkt} + \beta_{0k} + \beta_{1k}(t - t_0)\); \(P(\beta_{1k} < 0)\) is the posterior probability of decline.
- Model 3 (time-varying HA): \(\mu_{ijkt} = \theta_{ikt} - \theta_{jkt} + \gamma_{kt}\).
- Priors: \(\theta_{ikt} \sim N(0, \zeta_k^2)\), \(\zeta_k, \sigma_k \sim \text{HalfNormal}(0, 5^2)\), \(\alpha_k \sim N(0, \eta_k^2)\), \(\eta_k \sim \text{HalfNormal}(0, 5^2)\), \(\beta_{0k} \sim N(0, \lambda_{0k}^2)\), \(\beta_{1k} \sim N(0, \lambda_{1k}^2)\) with half-normal variance priors.
- Model comparison: ELPD via `loo()` in R, with SE estimates; rule-of-thumb 4-SE gap for significance.
- Supplementary hierarchical variant (Model 2H): \(\beta_{1k} \sim N(\beta_1^*, \lambda_1^2)\), \(\beta_1^* \sim N(0, 5^2)\) — shares trend information across leagues/states; experiments on 17 small states and all 50 states show shrinkage of trends toward the shared mean (all-50-state fit exhibits over-shrinkage; large states like TX/CA/PA/OH dominate with ~27% of games and barely shrink).

## Datasets

- **NFL**: 5,395 games / 640 team-seasons (internal NFL database; public equivalents nflfastR/nflverse).
- **NCAA** (FBS, FCS, DII, DIII): 64,345 games / 12,377 team-seasons, scraped from MasseyRatings.com.
- **High school**: 1,283,531 games / 247,402 team-seasons from MaxPreps (coach-entered results), filtered to in-state games only; iterative filter retaining team-seasons with ≥7 games/season kept 92% of teams.
- All league team-strength estimates correlate 0.92 with MasseyRatings public ratings — a direct sanity check that the strength adjustment works.

## GSE application and implementation spec

This paper is a direct blueprint for how GSE should model and refresh its NFL home-edge adjustment:

1. **Team-strength-adjusted HA as a live prior**: GSE's engine currently treats home field as a fixed constant (or near-constant) in spread models. This work shows HA in the NFL is (a) smaller than folklore (2023 estimate 1.73 pts, well under the standard 3), and (b) has likely declined ~0.65 points over 20 years. **Implementation**: add a Bayesian paired-comparison HA module to the engine — score-differential outcome on nflverse game logs, season-specific team strengths, league HA term with linear drift — fit weekly/dynastically, and feed the posterior mean HA as the engine's home-field term instead of a static 3.
2. **Decline-trend detection**: the \(P(\beta_1 < 0)\) posterior-probability-of-decline construction is a clean, interpretable monitoring statistic. **Implementation**: run the linear-trend model over a rolling 10-year window each offseason; if P(decline) > 0.9, re-baseline the engine's HA constant.
3. **Strength-adjustment discipline**: the empirical-vs-model gap (>3 points in some leagues) is a warning that raw home win-rate differentials are contaminated by scheduling asymmetry. For GSE's college lanes, any home-advantage feature must be strength-adjusted; the paper's unadjusted \(\gamma_{kt}\) vs \(\gamma_{kt}\) comparison is the exact diagnostic to replicate.
4. **Mechanism features**: replay-review adoption and travel improvements are the paper's hypothesized HA drivers. GSE can encode a "replay era" indicator or officiating-crew-level home bias (building on Snyder & Lopez's 18% DPI finding) as features in the calibration layer.
5. **Hierarchical caution**: the Model 2H over-shrinkage result warns that sharing trends across small samples (e.g., GSE's team-level HA estimates) will over-shrink unless the shared-trend variance \(\lambda_1\) is estimated carefully.

## Leakage

- NFL source is described as "an internal database" but the authors note the same data is publicly available (nflfastR/nflverse); no proprietary leakage in the model itself.
- High-school data is coach-entered via MaxPreps and noisy; iterative filtering mitigates but does not eliminate measurement error in game location/scores.
- 2020 excluded due to COVID fan restrictions; neutral-site games handled by league (Texas playoffs at neutral sites vs. home-seeded playoffs elsewhere — Texas's empirical/model agreement is the tell).
- Replay/travel drivers are observational correlations, not causal estimates — league-level confounds (rule changes favoring offense) cannot be disentangled.

## Limitations

- Linear trend (Model 2) cannot capture nonlinear HA trajectories (e.g., replay-adoption step changes); authors flag quadratic/spline terms as future work.
- No information sharing across leagues by default (Model 2H only in supplement, with over-shrinkage when sizes differ wildly).
- Distance-traveled covariate unavailable/granular; R² = 0.016 for distance vs. standardized HA.
- High-school location data is city-level lat/long; many in-town games show 0 distance, undercounting true travel.
- Model comparison is underpowered in small states (wide credible intervals; e.g., Alaska HA 2.01 with CI 0.91–3.12).
- Empirical-vs-model comparison assumes the team-strength model is adequate; all HA inference is downstream of that modeling choice.

## GSE overlap

None: not in phase-one tracker, existing-research-map, or wave-one reports. Thematic neighbors in the corpus may include other home-advantage studies, but this is the first comprehensive Bayesian time-trend survey across all American football levels with public code.

## Implementation difficulty

Medium. Stan fit per league-season; the design scales to GSE's data size (NFL ~5.4K games over 20 years is trivial; NCAA/high-school scale is the heavy part and GSE doesn't need it). The core engine deliverable is a lightweight Stan or PyMC paired-comparison model with linear HA drift, refit on a rolling window — a few days of work for the stats agent, with code from the paper's GitHub repo (https://github.com/ThompsonJamesBliss/comprehensive_survey_american_football_home_adv) as scaffolding.

## Reproducible test

- Refit Model 2 (linear HA) on 2004–2023 NFL games from nflverse with the paper's priors; verify the posterior mean HA for 2023 falls within the reported 95% CI (1.07, 2.39) and that P(β₁ < 0) ≈ 0.857 within Monte Carlo tolerance.
- Reproduce Table 3's NFL row: Model 2 ΔELPD = 0 (best), Model 1 ΔELPD = −1.31 (SE 1.75, 0.75 SEs worse), Model 3 ΔELPD = −4.93 (SE 4.83).
- Sanity check: correlate estimated team strengths θ against MasseyRatings-equivalent (e.g., nflverse ELO) — paper reports 0.92 for NCAA divisions.

## Numeric gate

**ADAPT iff a Stan refit of Model 2 on nflverse NFL data reproduces a 2023 NFL home advantage within the paper's 95% credible interval (1.07–2.39 points);** failure to replicate the decline signal or HA magnitude means GSE's home-edge implementation cannot trust this paper's calibration.

## Improvement experiment

Extend Model 2 for GSE's betting use: (1) replace season-independent team strengths with a dynamic state-space strength model (Glickman & Stern style) for weekly engine updates; (2) add a spline or changepoint term on HA to capture replay-adoption discontinuities; (3) add crew-level random effects for officiating home bias, fit on nflfastR penalty data, to produce a crew-adjusted HA for spread calibration. Evaluate with rolling-origin LOO: does crew-adjusted, time-varying HA beat the static engine HA on out-of-sample log score?

## Verdict

**ADAPT** — Bayesian paired-comparison home-advantage estimation with probabilistic decline monitoring, strength-adjusted, validated against a 1.28M-game sample. GSE should adapt it into a live HA module: replace the static ~3-point home-field constant with a strength-adjusted, replay-era-aware posterior estimate, and use the P(β₁<0) statistic as the offseason re-baseline trigger. The improvement experiment (dynamic strengths + spline HA + crew-level officiating effects) is the direct path to engine integration.
