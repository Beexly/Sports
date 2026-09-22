# [1700] Park Factor Estimation Improvement Using Pairwise Comparison Method (arXiv:2109.09287)

**Citation:** Konaka, E. (2021). *Park Factor Estimation Improvement Using Pairwise Comparison Method*. arXiv:2109.09287. URL: https://arxiv.org/abs/2109.09287
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, full paper + references, ~15k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the pairwise logistic decomposition of each plate appearance into batter-team strength, pitcher-team strength, and a pure ballpark effect is a directly portable recipe for estimating NFL venue effects (altitude, dome, wind) free of schedule-strength confounding, but the steepest-descent-on-squared-error fitting and baseball-specific event set must be replaced with proper MLE and football events.

## 1. Research question
How can the pure effect of a ballpark (size, altitude, humidity, air pressure, wind) on outcomes be estimated without contamination from team strength and unbalanced schedules? The author shows ESPN's conventional park factor (home/road ratio) is confounded and even degrades prediction for singles and walks, then proposes modeling every plate appearance as a matchup between a batting team and a pitching team plus a park, distilling the park effect via logistic regression. Verification on >1.5M MLB plate appearances (2010–2017).

## 2. Dataset / schema
- 1,550,000 plate appearances, MLB 2010–2017 seasons, scraped from Baseball Reference; per-PA fields: batting team i, pitching team j, ballpark k, binary event outcome x_l ∈ {0,1} for each of 5 events (HR, single, double, triple, walk).
- N_T teams, N_P ≥ N_T parks (extra parks for neutral-site games, e.g., 2012 Mariners–Athletics Tokyo series).
- Baselines for comparison: constant-probability model (per-event league average) and conventional ESPN park factor (Eq. 1), computed from boxscores.

## 3. Method / model
Logistic model per PA: p_{i,j,k} = 1/(1+exp(−(b_i − d_j − r_k))) (Eq. 2), with team batting strength b_i, team pitching/defense strength d_j, park effect r_k — one parameter set per event type (r_k^HR, r_k^H, …). Parameters fit by steepest descent on squared error J = Σ(p_{i,j,k} − x_l)² (Eqs. 3–6). Park factor reported in ESPN-compatible units via Eq. 7: PF̄_k = σ(E(b)−E(d)−r_k)/σ(E(b)−E(d)−E(r)). Evaluation metric: log-loss L = E(−x_l log₂ p_l − (1−x_l) log₂(1−p_l)) (Eq. 8), reported as improvement vs the constant baseline (negative = better).

## 4. Equations & assumptions
- Conventional PF: PF_a^HR = [(HS_home+HA_home)/Games_home] / [(HS_road+HA_road)/Games_road] (Eq. 1); 1.0 = neutral, >1.0 batter-friendly.
- Proposed: p_{i,j,k} = 1/(1+exp(−(b_i−d_j−r_k))) (Eq. 2); J = Σ(p−x_l)² (Eq. 3); updates b_i ← b_i − α∂J/∂b_i etc. (Eqs. 4–6); PF conversion Eq. 7.
- Log-loss (base 2) Eq. 8.
- Assumptions: team strength is constant within a season (no time variation); one scalar park effect per event; events modeled independently; home/away team–park index coincidence (team i's park = park i); identifiability of (b_i, d_j, r_k) assumed without stated constraints.

## 5. Features / target
Features: batting team identity, pitching team identity, ballpark identity. Target: binary per-PA event indicators (HR, 1B, 2B, 3B, BB) — five separate models.

## 6. Validation design
No train/test split; in-sample log-loss comparison of three models (constant baseline, conventional PF, proposed) per event per season 2010–2017. Table 1 gives baseline log-loss per event per season (e.g., HR 2017: 0.203984 at p_avg = 0.03193 from 6,105 HR in 191,195 PA). Figures 4–8 plot log-loss difference vs baseline (negative = improvement) for each event. Correlation between proposed and conventional 2017 HR PFs reported.

## 7. Numerical results / baselines
- 2017 HR: conventional Coors PF = 1.195 → P(HR) = 1.195 × 0.03193 = 0.03816. Proposed–conventional HR PF correlation = **0.81**.
- Conventional PF improves over baseline for long hits (2B, 3B, HR) but **degrades** log-loss for singles and walks — evidence the home/road ratio is misspecified there.
- Proposed PF beats conventional for HR, 3B, and H; roughly tied on 2B; and finds the park effect on singles and walks is **negligible** (the correct structural insight: park size shouldn't drive walk probability).
- Context numbers: total bases + walks per PA ranged 0.4068–0.495 across parks in 2017; bases/PA vs runs/game R² = 0.8522; Rockies' claim quoted: a 400-ft sea-level HR → 408 ft in Atlanta → **440 ft in Denver** (1,609 m altitude).

## 8. Code / data availability
None stated. Data source (Baseball Reference) is public but no extraction code shared.

## 9. Leakage & limitations
- In-sample evaluation only — no held-out seasons, so the proposed model's extra parameters (2N_T + N_P per event) may partly win by overfitting; no regularization or identifiability constraints discussed (b_i, d_j, r_k have an additive degree of freedom).
- Fitted by squared-error steepest descent rather than maximum likelihood, despite log-loss being the evaluation metric — inconsistent objective.
- Team strengths assumed static within a season; mid-season trades, injuries, call-ups ignored.
- Events modeled independently (no multinomial structure); per-PA independence assumed.
- Baseball-specific event set and home-park/team index coincidence don't map to the NFL (neutral-site games are rare; every game already has a designated home team).

## 10. GSE overlap
Directly addresses the open gap in the existing research map: **no verified travel/altitude coefficient** — GSE inventories wind/weather but has never cleanly separated venue effects from team strength. This paper is the estimation recipe: replace PA with NFL drive/play, batting/pitching strength with offensive/defensive strength, and ballpark with stadium, and the r_k parameters become GSE's first principled stadium factors (Denver altitude, dome, wind-exposed bowls) instead of naive home/road splits. Complements ledger 1699 (physics of *why* altitude matters) with the statistics of *how much* each venue matters, and complements 1699's Table-1 difference design with a cleaner per-event decomposition. The "conventional PF degrades on singles/walks" warning also transfers: naive NFL home/road splits are confounded by schedule strength.

## 11. GSE implementation spec
- Module `weather/stadium_factors.py`: per-season logistic decomposition on nflverse play-by-play (or per-drive) data — P(event | offense i, defense j, stadium k) = σ(o_i − d_j − s_k) for events: TD, FG attempt/make, explosive play (10+ yds), punt; fit by penalized MLE (L2 on team strengths, sum-to-zero constraints on o, d, s for identifiability — fixing the paper's gap).
- Output: per-stadium factor table s_k per event per season (Denver's s_k for FG distance = the verified altitude coefficient), with year-to-year shrinkage for stability.
- Feed s_k as features into the totals/spread engine; expected headline: Denver FG-make and punt-distance factors, dome vs outdoor splits, wind-bowl stadiums (Buffalo, Chicago, Foxborough).
- Effort: ~2 days (nflverse extraction + penalized logistic + reporting).

## 12. Reproducible test
Dataset: nflverse 2018–2025 play-by-play, per-drive outcomes, stadium metadata. Baseline A: conventional home/road ratio factor per stadium (NFL analogue of Eq. 1). Baseline B: team-strength-only logistic (no stadium). Test: full pairwise model; metric: log-loss on held-out 2025 season drives. Also check: stadium factors for "neutral" events (e.g., false starts — shouldn't depend on stadium) come out ≈ 0, mirroring the paper's singles/walks sanity check.

## 13. Acceptance / rejection gate
ADOPT the stadium-factor table if the full model beats both baselines by ≥ 0.003 log-loss on 2025 holdout AND neutral-event factors are ≈ 0 (structural sanity) AND Denver's kicking/punting factor is positive and stable across ≥ 3 seasons. REJECT if the stadium terms add nothing over team strengths — venue effects may be too small/noisy at NFL sample sizes (17 games/team vs 162).

## 14. Improvement experiment
Fix the paper's two methodological gaps and test whether they matter: (a) fit by proper penalized MLE instead of squared-error steepest descent, with sum-to-zero identifiability constraints; (b) make team strengths time-varying within season (weekly random-walk state-space, cf. GSE's Bayesian lane) and re-estimate stadium factors — hypothesis: static team strengths leak mid-season form changes into the stadium terms, so time-varying strengths *shrink* the stadium factors toward zero but make the survivors (Denver, domes) more trustworthy. Success = Denver/dome factors survive shrinkage with tight credible intervals. This would give GSE the first defensible altitude coefficient in the corpus.

**Verdict:** ADAPT — the pairwise logistic venue decomposition is the right estimator for NFL stadium effects and directly targets GSE's missing altitude coefficient, but the fitting objective, identifiability, and event set must be rebuilt for football.
