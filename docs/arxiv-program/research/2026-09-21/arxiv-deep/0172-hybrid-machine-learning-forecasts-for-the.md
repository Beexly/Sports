# 0172 Hybrid Machine Learning Forecasts for the UEFA EURO 2020 (arXiv:2106.05799v1)

**Citation:** Groll, A., Hvattum, L. M., Ley, C., Popp, F., Schauberger, G., Van Eetvelde, H., & Zeileis, A. (2021). *Hybrid Machine Learning Forecasts for the UEFA EURO 2020*. arXiv:2106.05799v1. URL: https://arxiv.org/abs/2106.05799v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 1,604 extracted lines, read 0–1,604).
**Verdict:** ADAPT — the hybrid "ranking-estimates-as-covariates + tree ensemble + 100k tournament simulation" architecture ports directly to NFL postseason / any bracket-style tournament forecasting, but the soccer-specific components (Poisson goals, PM player ratings from lineup-segment data, bookmaker-outright inverse simulation) need NFL-native replacements.

## 1. Research question
Can forecasts of international football tournament outcomes be improved by feeding tree-based machine-learning models (random forest, extreme gradient boosting) not only conventional team covariates but also strength estimates produced by three separate statistical ranking systems — a bivariate-Poisson ability model on historic matches, a bookmaker-consensus ability model from outright odds, and plus-minus player ratings — and then using the fitted model to simulate the UEFA EURO 2020 (100,000 runs) for winning probabilities for all 24 teams? (Sections 1, 3.6, 5; paper uses EUROs 2004–2016 as training, predicts EURO 2020.)

## 2. Dataset / schema
Four data types (Section 2):

- **Covariate data (2.1):** all matches of the four UEFA EUROs 2004–2016 (144 matches total: 3 × 31 for the 16-team editions + 51 for EURO 2016). 17 variables per team per tournament: GDP per capita ratio, population ratio, Host dummy, Neighbor dummy, market value (log, transfermarkt), FIFA ranking, UEFA association points, UEFA starting places, max/second-max teammates at same club, absolute age distance from optimal age, # CL semifinal players, # EL semifinal players, # players abroad (legionnaires), coach age distance, coach nationality dummy, group-stage dummy; plus ranking covariates HistAbility, logability, ave.PM, player.miss (Sections 3.3–3.5).
- **Historic match results (2.2):** every international match in the 8 years preceding each EURO, with venue and date for time-decay weighting. For EURO 2020: matches of 282 national teams from 2003-05-27 to 2021-05-26, **6,953 matches** (Section 5.2).
- **Bookmaker data (2.3):** outright tournament-winning odds from **19 online bookmakers** obtained 2021-05-31 (Table 11, Appendix B); 2008/2012/2016 odds reused from Leitner et al. (2010), Zeileis et al. (2012, 2016); EURO 2004 odds from German state agency ODDSET (Table 10).
- **Plus-minus player rating data (2.4):** match segments with starting lineups, substitutions/red cards (with minute and players involved), and goal times; matches split into maximal segments with constant on-pitch player sets (Tables 4–5). Sources: World Bank (GDP), transfermarkt.de, kicker.de, betexplorer.com (three-way odds), oddschecker.com/bwin.com. Access: public web sources, manually collected; no single download URL stated.

## 3. Method / model
Hybrid ML (Section 3):

- **Random forest (3.1):** B trees (e.g., B = 5000) on bootstrap samples; two R variants tested — classical `ranger` (Breiman 2001) and `cforest` from `party` (conditional inference trees, Hothorn et al. 2006; avoids selection bias across mixed-scale covariates). Final fit: mtry = √p = 4 (Section 5.1). Response: goals scored by one team (two rows per match, Table 2).
- **XGBoost (3.2):** `xgb.train` from R package xgboost 1.3.2.1; tuning via multivariate 10-fold CV with `xgb.cv` over discrete grids (learning rate, boosting steps, penalties).
- **Baseline ML-regression:** L1-penalized (lasso) Poisson regression via `cv.glmnet` (glmnet).
- **Ranking component A — historic-match abilities (3.3):** bivariate Poisson model (Karlis & Ntzoufras 2003) with time-decay weights, 3-year half period, home effect, estimated by weighted MLE over historic matches.
- **Ranking component B — bookmaker consensus (3.4):** strip overround (quoted = odds·δ + 1; median overround 17.3%), average log-odds across 19 bookmakers, then inverse tournament simulation (100,000 runs) with Bradley-Terry pairwise probabilities to find team abilities matching consensus win probs → logability covariate, draw-effect stripped.
- **Ranking component C — plus-minus player ratings (3.5):** ridge regression of segment goal differences on player presence indicators (±1), with country home advantage, red-card covariates, age adjustment, league-participation adjustment, triple weighting (recency, segment duration, goal state), ad-hoc shrinkage toward most-common teammates (Pantuso & Hvattum 2021). Team features: mean/median/top-11 PM and # of missing important PM players (only average PM + missing-player count kept; the three aggregates correlate > 0.98).
- **Combination (3.6):** ranking estimates become extra covariates in the tree models; predicted expected goals serve as Poisson intensities λ; match outcomes (win/draw/loss) computed from two independent Poissons via the Skellam distribution.
- **Tournament simulation (5.2):** 100,000 runs; group stage from simulated scorelines under official UEFA tiebreakers; knockout extra time = re-simulated with λ × 1/3 (30 min); penalties = virtual coin flip. Home/neighbor dummies set to 0 for EURO 2020 (multi-country, COVID-reduced crowds).

## 4. Equations & assumptions
Quoted faithfully; **PDF-extraction garbles flagged as uncertain** (reconstructed forms marked [UNCERTAIN — reconstructed from garbled extraction]):

- Time-decay weight (3.3): w_time,m(x_m) = (1/2)^(x_m / Half period), "a match played Half period days ago only contributes half as much as a match played today" — Half period = 3 years (1095 days), chosen by RPS optimization [UNCERTAIN — extraction shows "1 xm Half period / wtime,m(xm) = 2"; the 1/2-power form is the only reading consistent with the text].
- Bivariate Poisson PMF (3.3) [UNCERTAIN — heavily garbled in extraction]: standard Karlis–Ntzoufras form P(Y_ijm = z, Y_jim = y) = exp(−(λ_ijm + λ_jim + λ_C)) · (λ_ijm^z λ_jim^y)/(z! y!) · Σ_{k=0}^{min(z,y)} [C(z,k) C(y,k) k! (λ_C/(λ_ijm λ_jim))^k], with covariance parameter λ_C ≥ 0 constant over matches; λ_C = 0 gives the independent model. **Use the original Karlis & Ntzoufras (2003) paper, not this extraction, if implementing.**
- Intensity model, Eq. (1) (3.3): log(λ_ijm) = β_0 + (r_i − r_j) + h·1(team_i playing at home); Σ r_i = 0 constraint.
- Weighted likelihood (3.3): L = ∏_{m=1}^{M} w_time,m · P(Y_ijm = y_ijm, Y_jim = y_jim) [rendering uncertain in extraction; this is the described form].
- Bradley-Terry (3.4): Pr(A beats B) = ability_A / (ability_A + ability_B).
- PM regression (3.5): y_i = Σ_j β_j x_ij + ε_i, y_i = segment goal difference (home perspective), x_ij ∈ {1, −1, 0}.
- Multinomial likelihood (4): ∏_{r=1}^{3} π̂_{ri}^{δ_{r,ỹ_i}} [UNCERTAIN — garbled; standard form]; classification rate: 1(ỹ_i = argmax_r π̂_{ri}); RPS = (1/(3−1)) Σ_{r=1}^{2} (Σ_{l=1}^{r} (π̂_{li} − δ_{l,ỹ_i}))² [UNCERTAIN — garbled in extraction; standard ordinal RPS for 3 categories].
- Skellam (Appendix A): P(K=k) = e^{−(λ_1+λ_2)} (λ_1/λ_2)^{k/2} I_k(2√(λ_1 λ_2)), k ∈ ℤ [UNCERTAIN — garbled; standard Skellam PMF]; P(Y_1>Y_2) = P(K>0), etc.
- **Assumptions:** Poisson goal processes independent across teams conditional on covariates; ability ratings identified up to additive constant (Σr=0); time decay depends on calendar days not match days; each bookmaker's δ constant across teams; tournament simulation treats BT winner-probabilities as sufficient for outrights; extra-time λ scaling 1/3 linear in minutes; shootouts = fair coin; three-way odds margins equally distributed over outcomes.

## 5. Features / target
**Features (exact, as team-difference covariates + dummies; Section 2.1, Figure 1):** HistAbility, logability, ave.PM, player.miss (missing important PM players), FIFA.rank, market.value, GDP, population, host, neighbor, age (optimal-age distance), max.team, max.team2, CL.players, EL.players, legionnaires, UEFA.points, UEFA.start, nation.coach, age.coach, group.stage. Covariates enter as differences (first-named team perspective); dummies (Host, neighbor, coach nationality, groupstage) also as differences/single columns.
**Target:** number of goals scored by each team in a match (count), i.e., two observations per match (Table 2). Match-outcome probabilities derived via Skellam.
**Horizon:** single match scores; aggregated to full-tournament winning probabilities.

## 6. Validation design
**Leave-one-tournament-out** over EURO 2004–2016 (Section 4): train on three EUROs, predict the held-out EURO, rotate so each EURO is held out once → out-of-sample predictions for all 144 matches. **Baselines:** the four model variants against each other plus bookmakers' three-way odds (betexplorer; margins removed by normalizing π̃_ri = 1/odds_ri by c_i = Σ_r π̃_ri — benchmark favors bookmakers since odds are fixed days before matches and embed late information like injuries, footnote 11). **Metrics:** multinomial likelihood, classification rate, RPS (ordinal 1X2), and mean absolute error of exact goals and goal differences (Tables 6–7). Splits are tournament-ordered by construction; no random shuffling.

## 7. Numerical results / baselines
All numbers exact from Tables 6–7 (Section 4), averaged over 144 matches, regular-time results:

- **Table 6 (likelihood / classification rate / RPS):** ranger 0.372 / 0.458 / 0.216; **cforest 0.382 / 0.486 / 0.213**; xgboost 0.380 / 0.486 / 0.217; lasso 0.379 / 0.458 / 0.210; bookmakers 0.400 / 0.493 / 0.203. Paper: hybrid cforest best on likelihood, tied-best with xgboost on classification rate, "getting even close to the bookmakers"; lasso marginally best on RPS; all methods "slightly worse" than the same group's FIFA World Cup results (Groll et al. 2019a).
- **Table 7 (MAE goals / MAE goal difference):** ranger 0.862 / 1.176; cforest 0.862 / 1.166; xgboost 0.883 / 1.162; **lasso 0.846 / 1.148** (best on both). Paper: "all four methods yield rather similar results, with slight advantages for lasso."
- **Variable importance (Figure 1, Section 5.1):** market.value top (mean decrease in accuracy ≈ 0.055), then logability, CL.players, ave.PM, UEFA.points, FIFA.rank ≈ HistAbility, GDP; host/neighbor/player.miss/legionnaires/max.team2/population/group.stage/age/EL.players near zero.
- **Table 8:** rankings of EURO 2020 teams under the four systems; historic-ability #1 = Belgium, bookmaker #1 = England, PM #1 = Germany, FIFA #1 = Belgium; North Macedonia last on all four.
- **Table 9 (100,000 simulations; win % / bookmaker consensus %):** France 14.8 / 15.0; England 13.5 / 14.8; Spain 12.3 / 9.9; Portugal 10.1 / 9.0; Germany 10.1 / 9.6; **Belgium 8.3 / 12.1** (model notably below bookmakers); Italy 7.9 / 7.5; Netherlands 6.1 / 6.5; Denmark 4.6 / 2.9; Croatia 3.1 / 2.4; Switzerland 2.2 / 1.1; Austria 1.5 / 0.8; Poland 1.2 / 1.1; Sweden 1.0 / 0.9; Turkey 0.7 / 1.6; Wales 0.6 / 0.6; Scotland 0.6 / 0.4; Russia 0.4 / 0.9; Czechia 0.3 / 0.6; Ukraine 0.3 / 1.0; Slovakia 0.3 / 0.3; Finland 0.1 / 0.2; North Macedonia 0.1 / 0.2; Hungary 0.0 / 0.2 (group of death with France/Germany/Portugal). Paper notes Germany reaches final more often than Belgium (18.8% vs 16.2%) despite lower R16 probability (85.3% vs 91.5%) — draw effect.
- Model choice: "hybrid cforest ... the best and most reliable choice for forecasting the upcoming UEFA EURO 2020"; xgboost showed "higher sensitivity and instability during the (more sophisticated) tuning process," attributed to the small sample (Section 4, Section 6).
- Median bookmaker overround: 17.3% (Section 3.4).

## 8. Code / data availability
No code or data repository link stated in paper ("None stated"). Methods implemented in R packages named in text: party (cforest), ranger, xgboost 1.3.2.1 (xgb.train/xgb.cv), glmnet (cv.glmnet). Data sources named (Section 2): World Bank GDP, transfermarkt.de, kicker.de, betexplorer.com, oddschecker.com/bwin.com, ODDSET (on request) — manually collected, no download URL.

## 9. Leakage & limitations
- **Benchmark asymmetry:** three-way odds are fixed days before each match and embed late information (injuries) the model cannot see — bookmaker baseline is advantaged (paper's own footnote 11).
- **Small sample:** 144 tournament matches total; xgboost tuning instability explicitly attributed to this; leave-one-tournament-out further shrinks training folds. Overfitting risk on 17+ covariates with ~288 team-rows.
- **Market-value 2004 approximation:** transfermarkt archive starts 2004-10-04, so EURO 2004 values are "only a rough approximation" (footnote 2).
- **Squad rescaling hack:** 26-player EURO 2020 squads multiplied by 23/26 for comparability (Section 2.1).
- **Crude knockout modeling:** extra time = λ/3 linear scaling; penalties = coin flip; ignores team-specific shootout skill and fatigue.
- **COVID caveat** (Section 1): trained on COVID-free tournaments; authors expect degraded reliability.
- **Selection:** of the three PM aggregates only average PM kept after >0.98 correlation — a data-driven choice made during tuning, mild snooping.
- **External validity to NFL:** soccer goals are low-count Poisson; NFL scores are not Poisson-goals. The PM player-rating component requires segment-level lineup/goal data that has no NFL analog without play-level charting (would need EPA-based plus-minus from nflverse instead). Bookmaker-outright inverse simulation ports to Super Bowl futures only loosely (draw/group effects are the actual thing it strips). The portable core is the hybrid architecture: pre-estimated ability features + gradient-boosted/RF ensemble + massive tournament simulation.

## 10. GSE overlap
Per existing-research-map: the map already inventories Dixon-Coles, Skellam, Poisson, Bradley-Terry, Fischer/Heuer soccer Poisson-vs-ML (2408.08331), and xG player/position-adjusted (2301.13052) as absorbed/known items, plus an XGBoost production status note for nflfastR EP models. What GSE does **not** have: a hybrid "separate ability estimators as ML features" design, a leave-one-tournament-out validation protocol, or a 100k-run full-bracket Monte Carlo simulator for NFL playoffs/Super Bowl futures. This paper is therefore an **extension/new capability**, not a duplicate — the architecture (not the soccer specifics) is the transferable piece. Note this paper is a direct sequel to Groll et al. (2019a, 2019b) on the 2018 World Cup and 2019 Women's World Cup; its earlier siblings were not in the existing map.

## 11. GSE implementation spec
NFL adaptation of the hybrid architecture:

1. **Ability estimators (features):** (a) time-decayed Bradley-Terry/Elo on 8 seasons of NFL games (half-life ~2 seasons, tuned by RPS on moneyline probs); (b) bookmaker-consensus: average log-odds of Super Bowl futures across books, inverted via 100k season simulations to draw-neutral team strengths; (c) player-level: EPA-based plus-minus from nflverse (ridge regression of drive EPA on offensive/defensive personnel indicators) → team "roster strength" + "missing starters" features.
2. **Covariates:** rest/bye, travel/altitude, wind/weather, market-implied total, injury-report counts — all as team differences, mirroring the paper's difference-coding.
3. **Model:** gradient boosting (XGBoost/LightGBM; nflverse-scale data removes the paper's small-sample instability) + conditional-inference RF as a stability check; target = team points (or win prob via Skellam analog for point differential); hyperparameters via time-series CV, never random folds.
4. **Simulation:** 100k full-season/playoff simulations from predicted score distributions for Super Bowl probabilities and round-by-round survival, mirroring Table 9.
5. **Serving:** batch weekly — refit ability estimators on rolling window, predict upcoming slate, simulate remainder of season; expose win/draw(loss)/total distributions.
6. **Effort estimate:** 2–3 weeks for ability estimators + PM-EPA pipeline; 1 week for simulation harness; 1 week for validation. Uses nflverse (free), Odds API (existing account), no new spend.

## 12. Reproducible test
Dataset: nflverse play-by-play + schedules 2015–2024. Protocol: leave-one-season-out (train on 9 seasons, predict held-out season), mirroring the paper's leave-one-tournament-out. Models: (a) hybrid XGBoost with BT-Elo + futures-consensus + EPA-PM features; (b) baseline = market consensus moneyline probabilities alone. Metric: mean log-loss on moneyline outcomes and RPS-equivalent on spread buckets, averaged over the 10 held-out seasons. Baselines to beat: market consensus (the paper's bookmaker line) and a plain covariate XGBoost without the ranking features.

## 13. Acceptance / rejection gate
**Adopt** the hybrid architecture if, on the 2015–2024 leave-one-season-out test, the hybrid model's mean moneyline log-loss beats **both** the market-consensus baseline and the plain-covariate XGBoost by ≥ 0.005 (absolute), with the improvement present in ≥ 7 of the 10 held-out seasons. **Reject** (keep current GSE pipeline unchanged) if the gain is < 0.005, inconsistent across seasons, or the ranking features' variable importance is negligible (all three ability features outside the top half of importance). Gate is set before any test is run.

## 14. Improvement experiment
Go beyond the paper in two ways. First, replace the paper's conditional-independence assumption (two independent Poissons) with a **copula-coupled score model** (the paper itself cites McHale & Scarf 2007/2011 and van der Wurp et al. 2020 as the dependent-scores literature but doesn't use it): for NFL, model the joint distribution of (home points, away points) with a Gaussian-copula negative-binomial, which should capture the negative correlation in blowouts (starters pulled) and positive correlation in shootouts — test whether it beats independent-Poisson-style sampling on MAE of point differential. Second, add a **market-movement feature** (opening→current line/total drift) as a covariate, since the paper's bookmaker information enters only via pre-tournament outrights; late steam is exactly the information the paper's benchmark had but its model lacked (footnote 11 asymmetry), and closing-line drift is a proven NFL signal.
