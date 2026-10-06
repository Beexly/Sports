# [0677] Bye-Bye, Bye Advantage: Estimating the competitive impact of rest differential in the National Football League (arXiv:2408.10867)

**Citation:** Michael J. Lopez, Thompson Bliss (2024). *Bye-Bye, Bye Advantage: Estimating the competitive impact of rest differential in the National Football League*. arXiv:2408.10867. URL: https://arxiv.org/abs/2408.10867
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF via https://arxiv.org/pdf/2408.10867, all sections 1–4 incl. results tables/figures, appendix refs; local cache was truncated at methods — results fetched from PDF).
**Verdict:** ADAPT — rest-differential categories with the 2011 CBA structural break are essential schedule features for GSE's spread model; adapt the categorical MNF/Mini/Bye specification directly.

## 1. Research question
What is the competitive impact of rest differential in the NFL, did the 2011 CBA change (bye-week practice eliminated) alter the bye-week advantage, and do betting markets price rest differentials correctly?

## 2. Dataset / schema
5,679 NFL regular-season games, 2002–2023 (256/season 2002–2020, 272 in 2021/2023, 271 in 2022). Game info from internal NFL sources; point spreads from nflreadR (aggregate of sportsbooks). 52 games (0.9%) dropped for unclassifiable rest (COVID/weather reschedules). Rest edges: MNF 410 away/290 home, Mini 526, Bye 593. Access: data + Stan code at https://github.com/ThompsonJamesBliss/restadvantageinamerfootball.

## 3. Method / model
Bayesian state-space models (Glickman & Stern 1998/2017; Lopez et al. 2018) with time-varying team strength, linear-trend home advantage, and three categorical rest indicators I(MNF), I(Mini), I(Bye) (±1 home/away symmetric). Four models: Model 1 (constant bye, point differential), Model 2 (bye split pre/post-2011 CBA, point differential), Model 3 (constant bye, point spread), Model 4 (bye split, point spread). Fit in Stan: 4 chains × 3000 iterations, 1000 burn-in, weakly informative priors. Model comparison via LOO ELPD; posterior P(α_Bye,post < α_Bye,pre) computed directly.

## 4. Equations & assumptions
- E[Y_{s,ij}] = θ_{s,i} − θ_{s,j} + μ_{HA,s} + α_MNF·I(MNF) + α_Mini·I(Mini) + α_Bye·I(Bye) (Model 1; Model 2 splits α_Bye,pre·I(S≤2010) + α_Bye,post·I(S≥2011)).
- θ_{(s,i)} ~ N(γ·θ_{(s−1,i)}, σ²_teamstrength); μ_{HA,s} = (α_HA_Trend·s + α_HA_Intercept)·I(HA).
- Models 3/4 identical with Z_{s,ij} = pregame point spread as outcome.
- Priors: θ_2002 ~ N(0, σ²), σ ~ HalfNormal(0,5²), γ ~ Uniform(0,1), rest α ~ N(0,5²).
- Assumptions: rest effects symmetric home/away; categorical (practice-time-based) preferred to continuous rest days; neutral-site games (65) have no HA; market spread incorporates all public info.

## 5. Features / target
Features: season team-strength parameters, linear-trend home advantage, three rest indicators (MNF: ≥1-day diff with disadvantaged team ≤6 days rest; Mini: one team 9–11 days rest with ≥2-day diff; Bye: did not play prior week). Targets: point differential (Models 1–2), pregame point spread (Models 3–4).

## 6. Validation design
MCMC convergence via trace plots (Figs 7–10, appendix); sanity check of team-strength estimates (Patriots peak 2007 +14.5; Bills top 2020–2023); LOO ELPD model comparison; posterior probabilities for directional hypotheses; 95% credible intervals throughout.

## 7. Numerical results / baselines
Bye (point differential): pre-2011 +2.21 pts/game (95% CI 0.61–3.80, P(>0)=99.6% — "as beneficial as home field"); post-2011 +0.31 (CI −1.01 to 1.64, P(>0)=67.9%); P(decline)=96.6%. Markets (Model 4): bye valued +0.39 pre (CI 0.00–0.78) → +0.97 post (CI 0.65–1.28), P(increase)=98.8% — markets now OVERVALUE the bye by ~0.66 pts vs reality. Mini: PD +0.48 (CI −0.65 to 1.57, n.s.); market −0.06 (P(>0)=31.8%). MNF: PD +0.14 (CI −0.86 to 1.18, n.s.); market +0.37 (CI 0.14–0.61, P=99.9%). Home advantage 2023: PD +1.65, market +1.74 (markets near-perfect on HA); HA declined ~1 pt/game over the period. Postseason bye still real: 2011–2023, 34-10 SU (+7.34 avg PD), 21-22-1 ATS. Bye cover rates: 2002–2010 home 55.8%/away 56.9% → 2011–2023 home 44.6%/away 52.7% (edge flipped to anti-bye).

## 8. Code / data availability
Full code + data: https://github.com/ThompsonJamesBliss/restadvantageinamerfootball (Stan models).

## 9. Leakage & limitations
Authors are NFL employees (disclosed). Rescheduled games dropped (0.9%). Regular-season only in models; postseason bye evidence is descriptive (n=44 post-2011). Categorical rest is a modeling choice; continuous rest-day effects unexplored. Team strength is season-level (no within-season dynamics). 2020 CBA Thursday-practice limits may already be eroding the mini-bye further.

## 10. GSE overlap
Existing-research-map does not cover rest/schedule differentials (no bye/rest entry). This is a NEW feature family for GSE — schedule-derived, publicly known pre-game, and demonstrably mispriced by the market post-2011. High value, no duplication.

## 11. GSE implementation spec
Add rest-differential features to GSE's spread model: I(MNF), I(Mini), I(Bye) with the paper's exact category definitions, plus the market's implied rest valuation (from closing lines) as a separate feature so the engine can bet the gap between reality (+0.31) and market pricing (+0.97). Re-estimate on 2015–2024 with the state-space Stan code as reference. Priority: anti-bye system — fade teams off a bye getting >0.97 pts of market credit. Effort: ~3 days.

## 12. Reproducible test
Dataset: NFL 2015–2024 with opening/closing spreads. Protocol: replicate Models 2/4 (or logistic ATS equivalents) with nflverse data; metric: posterior mean rest effects + ATS ROI of fading market bye pricing. Baseline to beat: the paper's +0.97 market valuation — if GSE's estimate of market bye pricing on 2015–2024 is within 0.3 pts of the paper's, adopt the anti-bye angle. Pass criterion: post-2011 bye effect estimate within the paper's CI and market overvaluation confirmed.

## 13. Acceptance / rejection gate
Adopt as permanent spread-model features if replication on 2015–2024 confirms post-2011 bye PD effect <1.0 pt/game with market pricing ≥0.5 pts above it; if the market has corrected (pricing ≈ reality), keep features but drop the anti-bye angle.

## 14. Improvement experiment
Add travel-distance/timezone rest interaction (west-coast teams playing 1pm ET after MNF), TNF-specific rest bins, and altitude; test whether the residual rest mispricing concentrates in specific schedule spots (e.g., road teams off bye vs home teams off bye) to build a targeted rest-differential betting system.
