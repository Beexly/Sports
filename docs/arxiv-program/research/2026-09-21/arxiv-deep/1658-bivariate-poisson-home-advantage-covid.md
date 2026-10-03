# 1658 Estimating the change in soccer's home advantage during the Covid-19 pandemic using bivariate Poisson regression (arXiv:2012.14949)

**Citation:** Luke S. Benz, Michael J. Lopez. *Estimating the change in soccer's home advantage during the Covid-19 pandemic using bivariate Poisson regression*. arXiv:2012.14949 (2020). URL: https://arxiv.org/abs/2012.14949. Code: https://github.com/lbenz730/soccer_ha_covid
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; Sections 1–7 including simulation study, model specification, Stan priors, Tables 2–4, and data description read in full). Not an abstract-only read.
**Verdict:** ADAPT — the Bayesian bivariate-Poisson home-advantage estimator with league-specific parameters and posterior decline probabilities is directly portable to GSE's NFL score models and home-field estimation, but the λ3=0 independence shortcut and post-Covid confounding need explicit handling.

## 1. Research question

Did soccer's home advantage change when matches were played without fans during the COVID-19 "ghost games", and does the answer differ by league? Methodological sub-question: does bivariate Poisson regression estimate home advantage with less bias than the linear-regression approaches dominating the post-Covid literature?

## 2. Method/model

Bayesian bivariate Poisson (Karlis & Ntzoufras 2003) fit per league in Stan: (Y_H, Y_A) ~ BP(λ_1, λ_2, λ_3) with log λ_1 = μ_ks + T_k·I_pre + T'_k·I_post + α_H + δ_A (home attack + away defense + home-advantage term), log λ_2 = μ_ks + α_A + δ_H, log λ_3 = γ_k (constant covariance). Team attack/defense strengths are seasonal random effects centered at 0. A parallel model (4) is fit for yellow cards with team-specific card tendencies τ. Simulation study (1,800 simulated seasons) compares bivariate Poisson vs linear regression vs paired comparison on home-advantage bias.

## 3. Mathematics/equations/assumptions

- (Y_Hi, Y_Ai) = BP(λ_1i, λ_2i, λ_3i); λ_1i+λ_3i and λ_2i+λ_3i are home/away goal expectations; λ_3i is the covariance.
- log(λ_1i) = μ_ks + T_k·I_pre-Covid + T'_k·I_post-Covid + α_{Hi}ks + δ_{Ai}ks; log(λ_2i) = μ_ks + α_{Ai}ks + δ_{Hi}ks; log(λ_3i) = γ_k.
- Priors (λ_3=0 variant): μ_ks ~ N(0,25); α,δ,τ ~ N(0,σ²), σ ~ Inverse-Gamma(1,1); T_k, T'_k ~ N(0,25). Empirical-Bayes weakly-informative priors for the λ_3>0 variant.
- MCMC: 3 chains × 7,000 (2,000 burn-in) for λ_3=0; 3 × 20,000 (10,000 burn-in) for λ_3>0; R̂ 0.9998–1.003.
- Assumptions: team strengths constant within season (no within-season dynamics — authors note Koopman & Lit 2015 state-space extension as future work); scheduling differences pre/post-Covid absorbed by strength parameters; restart date cleanly separates fan/no-fan regimes.

## 4. Dataset/schema

- 17 professional soccer leagues, 13 European countries, 5 seasons 2015–2020 (Sweden/Norway: 4 full + partial 2020). Scraped from Football Reference 2020-10-28.
- Sample sizes (goals model): e.g., German Bundesliga 1,448 pre / 82 post; English Championship 2,673 / 113; Spanish La Liga 2 2,233 / 129; Italy Serie A 1,776 / 124. Post-Covid samples are small (~60–200 games).
- Yellow-card model drops games with missing card counts (92 pre-Covid games across 5 leagues, 4 post-Covid Russian games).

## 5. Features and target

- Features: home/away team identities (attack/defense strengths), season, league, pre/post-Covid indicator.
- Targets: home goals, away goals (Model 3); home/away yellow cards (Model 4). Parameters of interest: T_k, T'_k (pre/post home advantage on log scale).

## 6. Validation design

- Simulation: team strengths drawn from bivariate Normal (ρ* ∈ {−0.8,−0.4,0}); outcomes from bivariate Poisson or bivariate Normal DGPs; true HA T* ∈ {0, 0.25, 0.5}; 100 seasons per cell × 18 cells = 1,800 seasons; 20-team leagues. Metric: mean absolute bias and mean bias of HA on the goal-difference scale.
- Real data: posterior P(T'_k < T_k) per league — probabilistic decline statements no prior paper attempted.

## 7. Exact results and baselines with numbers

- Simulation MAB (goal-difference scale): bivariate Poisson 0.051–0.084 across all cells; linear regression 0.382–0.549 — linear regression bias ≈6× larger ("reduces absolute bias ... by almost 85 percent"); paired comparison 0.059–0.094 (close to BP under Poisson DGP; within ±3% under Normal DGP, BP slightly better).
- Real data (Table 4, posterior means, log scale): Austrian Bundesliga T̂=0.161 → T̂'=−0.202 (−225.7%, P(decline)=0.999); German Bundesliga 0.239 → −0.024 (−110.2%, 0.995); Greek Super League 0.409 → 0.167 (−59.3%, 0.972); Spanish La Liga 0.306 → 0.149 (−51.3%, 0.959); English Championship 0.234 → 0.114 (0.912); Swedish Allsvenskan 0.231 → 0.108 (0.907); La Liga 2 0.346 → 0.232 (0.903). Six leagues show HA *increases* (Swiss Super League 0.180 → 0.362, +101.1%, P(decline)=0.043; Serie A 0.204 → 0.292, P=0.125).
- P(decline) > 0.9 in 7/17 leagues, > 0.5 in 11/17 — "mixed" verdict, contradicting the pooled literature's uniform-drop finding.
- Pre-Covid HA heterogeneity: Greek Super League 0.409 vs Austrian Bundesliga 0.161 (2.5×) — justifies league-specific estimation.

## 8. Code/data availability

All data and code: https://github.com/lbenz730/soccer_ha_covid. Data scraped from Football Reference (reproducible in principle).

## 9. Leakage and limitations

- Post-Covid samples are small (58–198 games); T'_k estimates noisy; several leagues' "increases" likely noise.
- Pre/post split by restart date is confounded: months-long layoff, limited training, schedule imbalance, some reduced (not zero) attendance late in sample.
- Team strengths fixed within season — the layoff likely changed true strengths, contaminating T'_k.
- Goals model uses λ_3=0 (independence) because observed goal correlation was −0.16..0.07 — reasonable but assumed, not tested per league.
- Yellow-card model assumes teams control only their own card counts.

## 10. GSE overlap

GSE's existing references include Dixon–Coles and Poisson score models, but the Bayesian bivariate-Poisson with *separate attack/defense strengths and explicit home-advantage parameters per competition*, plus posterior decline probabilities, is new machinery. The simulation result (85% bias reduction vs linear regression) directly upgrades any GSE linear-margin home-field estimation. Frame as the Bayesian home-field module inside GSE's score-distribution stack.

## 11. Implementation specification

- Build `gse.scores.BivariatePoissonHA`: per-season NFL fit — (home points, away points) ~ BP with log λ_1 = μ_s + T_s + α_H + δ_A, log λ_2 = μ_s + α_A + δ_H; team attack/defense random effects; T_s = season home advantage. Fit in numpyro/Stan.
- Extensions: (a) within-season time-varying strengths (state-space, per Koopman & Lit); (b) λ_3 estimated not fixed; (c) COVID-2020 season as T'_2020 with posterior P(decline) — direct replication of the paper's natural experiment on NFL data.
- Use posterior attack/defense strengths as features for spread/total models.

## 12. Reproducible test

- nflverse 2000–2024 scores: fit per-season bivariate Poisson; hold out each season's last 4 weeks.
- Test A: simulation replication — simulate NFL-like seasons (32 teams, 17 games) under known T*; verify MAB of T̂ ≤ 0.10 points and beats linear-regression HA by ≥50%.
- Test B: predictive log-likelihood on held-out weeks vs GSE's current score model — expect improvement ≥ 0.01 nats/game.
- Test C: 2020 COVID season T'_2020 vs 2015–2019 — report P(decline) for NFL.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** simulation replication shows MAB(T̂) ≤ 0.10 and ≥50% bias reduction vs linear regression AND 2020-season holdout predictive log-likelihood beats GSE's current score model by ≥ 0.01 nats/game. Fail → REJECT.
- **Improvement experiment:** (i) within-season dynamic strengths (random-walk α, δ) — expect +0.01 nats/game; (ii) estimate λ_3 per season — test whether score correlation is nonzero in high-total games; (iii) team-specific home advantages (hierarchical) merged with ledger 1657's approach — expect +0.005 nats/game.

**Verdict:** ADAPT — the Bayesian bivariate-Poisson home-advantage framework with per-competition parameters and probabilistic decline statements is the right upgrade for GSE's score models, provided λ_3 is tested rather than assumed and within-season strength dynamics are added.
