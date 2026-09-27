# [0585] Bayesian Analysis of Formula One Race Results: Disentangling Driver Skill and Constructor Advantage (arXiv:2203.08489v2)

**Citation:** van Kesteren, E.-J., & Bergkamp, T. (2022). *Bayesian Analysis of Formula One Race Results: Disentangling Driver Skill and Constructor Advantage*. arXiv:2203.08489v2. URL: https://arxiv.org/abs/2203.08489v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1479 lines, incl. appendices A–D).
**Verdict:** ADAPT — port the Bayesian multilevel rank-ordered logit decomposition (participant skill + team/unit advantage + seasonal form, all as log-odds ratios) to GSE's NFL problems where outcomes entangle individual and team contributions: QB-vs-team, coach-vs-roster, and unit-level (OL/DL) effects. The cross-classified structure and the teammate-comparison identification logic transfer directly; the F1 data do not.

## 1. Research question
In F1, success entangles driver skill and car (constructor) advantage. Can a Bayesian multilevel rank-ordered logit model on per-race finishing orders disentangle the two, and what share of outcome variance does each explain? Three questions: (a) relative influence of driver vs constructor, (b) driver skill ranking, (c) constructor advantage ranking — for the F1 hybrid era 2014–2021.

## 2. Dataset / schema
160 races, 51 drivers, 19 constructors, 2014–2021 hybrid era. Source: Ergast API dataset (Newell 2021) enriched by Wikipedia scraping (wet/dry indicator — 143 dry, 17 wet; street vs permanent circuit). 590 of 3267 rows (non-finishers) removed for the main analysis → only finished races ranked. Access: public; analysis scripts + preprocessed data at https://doi.org/10.5281/zenodo.7632045.

## 3. Method / model
Bayesian multilevel rank-ordered logit (ROL; Glickman & Hennessy 2015). Each race's finishing order y_r ~ RankOrderedLogit(ϑ_r); competitor c = driver–constructor–season pairing with latent ability ϑ_c = θ_dts = θ_d + θ_ds + θ_t + θ_ts (average driver skill + seasonal driver form + average constructor advantage + seasonal constructor form), each ~ N(0, σ²) cross-classified random effect. Logit link with no intercept ⇒ parameters are log-odds ratios of beating an average competitor (θ_d=0.3 ⇒ P(beat average) = 1/(1+e^{−0.3}) ≈ 0.57 — Elo-like interpretation). Extensions tested: wet-race driver random slope (θ_d = γ_0d + γ_1d·wet_race), permanent-circuit constructor random slope (θ_t = γ_0t + γ_1t·permanent_circuit). Model selection by LOO-CV ELPD (Vehtari et al. 2017); basic model wins on parsimony (differences within SE). Fit in Stan: 8 chains × 1250 post-warmup, all R̂ < 1.01, ESS > 2500. Posterior predictive checks on 2015 and 2019 seasons.

## 4. Equations & assumptions
- y_r ~ RankOrderedLogit(ϑ_r); generative: z_c ~ Gumbel(ϑ_c), y_r = rank(z_r); likelihood p(y_r|ϑ_r) = ∏_{i=1}^{m_r−1} exp(ϑ_i)/Σ_{j=i}^{m_r} exp(ϑ_j) (Plackett–Luce form).
- ϑ_c = θ_d + θ_ds + θ_t + θ_ts; θ_d ~ N(0,σ_d²), θ_ds ~ N(0,σ_ds²), θ_t ~ N(0,σ_t²), θ_ts ~ N(0,σ_ts²).
- Gumbel density: f(x;μ) = exp(x−μ−exp(x−μ)).
- Counterfactual: π_{ham>rai} = exp(θ_{ham:alfa:2021})/(exp(θ_{ham:alfa:2021})+exp(θ_{rai:merc:2021})).
- Variance shares: σ_c²≈2.65, σ_cs²≈0.54, σ_d²≈0.29, σ_ds²≈0.12 ⇒ constructor share ≈ (2.65+0.54)/(2.65+0.54+0.29+0.12) ≈ 88% (89% CI [0.775, 0.945]).
- Assumptions stated: no driver×constructor interaction (skill independent of team — identified via teammate comparisons and driver team-moves); skills stable within a season (i.i.d. seasonal form); non-finishers excluded (parameters measure finished-race performance only — reliability excluded); qualifying performance folded into race outcome (starting position ignored).

## 5. Features / target
Input features: driver id, constructor id, season, wet/dry, circuit type. No continuous covariates. Target: per-race full ranking of finishers (m_r competitors). Downstream: driver/constructor rankings, variance decomposition, counterfactual win probabilities. Prediction horizon: within-season (retrospective); authors state the model is "probably not suitable for prediction" (year effects unknowable pre-season).

## 6. Validation design
LOO-CV ELPD for model selection among 4 extensions (Table 1: Circuit −3992.29 ± 84.11; Basic −3993.36 ± 83.72, Δ=−1.07 ± 6.35 — differences within noise). Posterior predictive checks (2015, 2019): simulated vs observed finish-position distributions per driver — satisfactory, though observed bimodality (Vettel 2019, Bottas 2015) not captured. 2021 posterior-predictive points-per-race vs realized (Table 2): coverage good, slight shrinkage at extremes. Appendix D: AR(1) vs i.i.d. seasonal form vs slope — AR(1) ≈ basic (ΔELPD −1.1 ± 1.7), slope clearly worse. Appendix A: sensitivity to non-finisher handling — including non-finishes shrinks all effects toward 0; Maldonado 6th-worst with all data vs 19th/38 on finishers-only.

## 7. Numerical results / baselines
- Variance decomposition: constructor advantage σ_c=1.63 [1.14,2.27], constructor form σ_cs=0.73, driver skill σ_d=0.54, driver form σ_ds=0.35 ⇒ **~88% of variance from constructor** (vs Bell et al. 2016: 86% — consistent replication).
- 2021 driver skill: Hamilton and Verstappen top (posterior means + 89% CIs; figure-rendered values).
- Constructor advantage: Mercedes, Ferrari, Red Bull ("big three") clearly above the rest.
- Counterfactual: Hamilton (Alfa Romeo) vs Räikkönen (Mercedes) 2021 — E[π_{ham>rai}] = 0.36 (car wins).
- 2021 expected vs observed points/race: Verstappen 15.30 [12.32,18.00] vs 18.00 observed; Hamilton 14.58 [11.45,17.50] vs 17.59 — model underestimates top, overestimates bottom (shrinkage).
- Ferrari 2019→2020 form drop captured (post-engine-settlement).
- All numbers are the paper's posterior summaries.

## 8. Code / data availability
Fully public: https://doi.org/10.5281/zenodo.7632045 (scripts + preprocessed data). Stan, standard priors. Reproducible.

## 9. Leakage & limitations
- No leakage (retrospective inference). Limitations: authors explicitly state the model is **not for prediction** (year effects unknowable pre-season) — GSE must add a forecasting layer; non-finisher exclusion removes reliability (the Maldonado problem — 6th-worst vs 19th); no driver×constructor interaction assumed (a star QB may elevate a weak roster — the exact interaction GSE cares about); teammate-identification requires teammates with comparable equipment (works in F1's 2-car teams; NFL analogues are noisier); team-continuity ignored across rebrands; qualifying folded into race result (starting-position information lost); wet-race/circuit extensions added nothing (ELPD differences within SE) — a parsimony lesson; 89% CIs used (McElreath convention), not 95%.
- NFL transfer caveat: F1 has ~20 competitors/race with stable pairings; NFL has 32 teams playing pairwise — the ROL likelihood must be replaced by a pairwise (Bradley-Terry/logistic) or margin likelihood; the *decomposition structure* transfers, not the likelihood.

## 10. GSE overlap
Extension, high-value. Existing-research-map: GSE has QB metrics, EPA, team strength ratings, and "coaching" is listed as a gap-adjacent topic — but **no hierarchical decomposition of outcomes into individual-skill vs team/unit-advantage components with variance shares**. The closest existing items are raw QB-vs-team debates and unit-graded data (PFF-style), none of which produce log-odds-ratio parameters with credible intervals or an 88%-style variance attribution. The identification logic (teammate comparisons + personnel moves across teams) maps to: backup QBs behind the same OL, players changing teams in free agency, coordinators changing teams. Verdict: **extension** — a new capability (variance attribution + counterfactuals) for existing debates.

## 11. GSE implementation spec
1. Likelihood swap: replace ROL with pairwise logistic on game outcomes (or normal on margin): logit P(A beats B) = (θ_{QB_A} + θ_{team_A} + …) − (θ_{QB_B} + θ_{team_B} + …), cross-classified random effects for QB, head coach, offensive/defensive units, plus seasonal form terms.
2. Identification: exploit QB team-changes (free agency/trades) and backup-QB starts (same-team comparisons) exactly as the paper exploits driver moves and teammate pairings.
3. Fit in Stan (or numpyro) on 2009–2025 game data; report variance shares (QB vs roster vs coach) — the "Rosberg 80/20" question for football, answered with CIs.
4. Counterfactual engine: posterior P(team X with QB Y beats team Z with QB W) — directly usable for trade/free-agency valuation content and for adjusting power ratings after QB changes.
5. Effort: ~2–3 weeks for one engineer (Stan model ~100 lines; the work is entity-resolution across seasons and validation).

## 12. Reproducible test
Dataset: nflverse 2009–2024 (game-level W/L + margin; QB starter per game from roster data). Fit hierarchical logistic decomposition with QB + team + coach random effects + seasonal forms on 2009–2022. Metric 1 (explanatory): variance shares with 89% CIs — does team dominate QB as constructor dominated driver? Metric 2 (predictive): for 2023–2024 games where a team's starting QB differs from the prior season's primary QB (team-changers + rookie starters, ~40–60 team-seasons), predict W/L using decomposed parameters vs a team-only Elo baseline — log-loss comparison. Time window: fit through 2022, test 2023–2024.

## 13. Acceptance / rejection gate
ADOPT the decomposition as a GSE feature layer if: (a) the QB/team/coach variance shares are stable across two independent fit windows (2009–2015 vs 2016–2022; rank-order of shares identical, magnitudes within 50%), AND (b) on the 2023–2024 QB-change test set, the decomposed model's log-loss beats team-only Elo by ≥1%. REJECT if the QB effect collapses into the team effect (identification failure — credible intervals for QB variance include ~0) or if no predictive gain materializes; the variance shares alone are still publishable as content even under rejection.

## 14. Improvement experiment
Beyond the paper: add the **interaction the paper assumes away** — a QB×team (or QB×coach) random interaction term capturing scheme fit (e.g., a QB whose skill manifests only in specific systems). Compare LOO-ELPD of interaction vs no-interaction models on the §12 fit window; hypothesis: the interaction term carries 5–10% of variance and explains the paper-noted failure mode where movers systematically over/underperform their decomposed prediction. If confirmed, the interaction parameters become a "scheme-fit rating" — a genuinely new GSE metric for free-agency analysis.
