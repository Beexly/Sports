# Open Source Football — Full Per-Post Dissection

**Site:** https://opensourcefootball.com/
**Repo:** https://github.com/nflverse/open-source-football (default branch `master`, HEAD commit `38b79545fee2b83e114cbd38eba6474ce093dfd6` at time of reading)
**Dissection date:** Saturday, October 24, 2026 (America/Chicago)
**Prepared for:** Garrett Baxley — Galaxy Sports Edge (GSE) engine
**Method:** Read-only inspection. Site index enumerated from the homepage post list and cross-checked against the repo `_posts/` tree. Every article read end-to-end at content level (site render, with repo `.Rmd` source used where the render is thin). No one behind the site or repo was contacted.
**License note:** Site text and figures are CC BY-NC 4.0. Everything below is summarized in our own words; no long passages are copied. Short quotes (under 25 words) appear only where a definition needs exact wording.

---

## 1. Enumeration — how many articles exist

- The homepage ("Latest posts") lists **42 posts**, indexed 0–41 newest-first, checked 2026-10-24.
- The repo `_posts/` tree cross-check: **exactly 42 post directories**, mapped 1:1 against the homepage list — every homepage title has exactly one repo directory and vice versa. All **42 `.Rmd` article sources are present** in the clone. (The clone's checkout left 1,246 non-article paths — site chrome and `docs/` assets — un-checked-out; no article source was among them. Detail in the Gap Audit.)
- **42 matches the count from the first extraction (2026-10-17). No article has been added or removed.**
- **Version drift: NONE.** Repo HEAD (`38b79545`, "gh-action-seb re-build site") is dated **2025-05-14** — the site content has not changed since May 2025, more than a year before Garrett shared it (2026-10-16). The current site is byte-for-byte the site the Oct 17 pass saw. The newest post, *NFL Draft Value Chart* (2023-02-23), is a living document (dated updates inside it run through May 2, 2025, adding the 2020 draft class to on-field value), but all of those updates also predate Oct 17, 2026. It will drift again only if the repo is rebuilt or the chart's next class update lands; both are checkable in one command (`git log -1` on the repo).

### The Oct 17 baseline (do not re-extract)

Five methods were already added to GSE engine docs from the 2026-10-17 pass. In this dissection they are dispositioned **ALREADY EXTRACTED (Oct 17)**:

1. **CPOE via GAMM** — *Individual Expected Completion using Logistic Generalized Additive Mixed Models* (index 24)
2. **Expected field goal (xFG)** — *Creating an Expected Field Goal Metric* (index 15)
3. **Expected turnovers + fumble-luck normalization** — *Expected Turnovers for Quarterbacks* (index 26)
4. **Spatial receiver separation / density estimator** — *Player Density and Completion Surface Estimates* (index 22)
5. **4th-down decision engine** — no standalone article exists in the 42; the extraction rests on the EP/WP machinery documented in *nflfastR EP, WP, CP, xYAC, and xPass models* (index 7). That entry is marked accordingly.

### Disposition key

- **ALREADY EXTRACTED (Oct 17)** — in GSE docs from the first pass.
- **NEW METHOD NOT YET IN GSE DOCS** — a transferable method/model GSE does not currently document.
- **DUPLICATE-OF-EXISTING-GSE** — canonical method GSE already implements or documents under another source.
- **REFERENCE-ONLY** — tutorial, infrastructure, visualization, career-advice, or single-player narrative; cataloged with its use, no engine method claimed.

Nothing is killed or dropped. Every article gets a use.

---

## 2. Per-article dissection

## Batch A (indices 0-13)

### 0. NFL Draft Value Chart
- **Title:** NFL Draft Value Chart
- **URL:** https://opensourcefootball.com/posts/2023-02-23-nfl-draft-value-chart/
- **Author:** Ben Baldwin (@benbbaldwin, shown in the table notes)
- **Date:** 2023-02-23 (post date; page shows updates through 2025-05-14)
- **Builds/measures:** Builds a transparent, reproducible draft-pick value chart for non-quarterbacks only, in two forms: on-field value by pick and surplus value (on-field value minus rookie-contract cost). It also produces position-specific on-field curves and a full pick 1-256 table usable for pick-for-pick and pick-for-player trade checks. Headline finding, in my own words: for non-QBs, surplus peaks in the late first / second round rather than at pick 1, because rookie cost falls faster than expected production.
- **Method & math:** Player value is proxied by the average-per-year (APY) size of a player's second contract, expressed as a percent of the salary cap, with zero assigned to players who never got a second deal; those values are smoothed against pick number. Pick cost is the rookie deal's APY as a percent of cap, assuming roughly 7% annual cap growth over the deal. Surplus = smoothed on-field APY minus cost APY, rescaled 0-100. Draft classes 2011-2020 are used for on-field value in the final update. No formal out-of-sample validation; the curve is cross-checked against the Fitzgerald-Spielberger/OTC, PFR (Chase Stuart/AV), and Jimmy Johnson charts and against PFF WAR-based work.
- **Data source(s):** OverTheCap contract data (second contracts and rookie deals via Spotrac archive), draft pick history.
- **Code:** R (site code on GitHub; tidyverse-style workflow implied by the post's code blocks).
- **GSE application:** Reasoning corpus / Team ratings — GSE would use the non-QB surplus curve as an offseason prior on roster-building and draft capital when reasoning about a team's future talent trajectory, never as an in-season pick input.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — GSE has no documented draft-capital/surplus model; this is a contract-based, QB-excluded construction, not a duplicate of any in-game engine piece.

### 1. Linguistic Analysis of NFL Prospect Reports
- **Title:** Linguistic Analysis of NFL Prospect Reports
- **URL:** https://opensourcefootball.com/posts/2023-07-14-linguistic-analysis-of-nfl-prospect-reports/
- **Author:** not shown on page
- **Date:** 2023-07-14
- **Builds/measures:** An exploratory NLP study of about 4,382 NFL.com prospect reports (draft classes 2014-2023, with grades and text bios). It measures whether report length tracks draft position, whether report sentiment tracks the assigned prospect grade, and which words/phrases distinguish projected Year 1 starters from backups. Findings are weak by design: length correlates only slightly with earlier selection, sentiment is high across all grades with only a faint rise by grade, which the author attributes to public analysts having little incentive to be harsh.
- **Method & math:** Ordinary linear regression of draft pick on bio character length (scikit-learn LinearRegression). Sentiment via NLTK VADER compound score after tokenization and English stopword removal. Starter-vs-backup language contrast via Scattertext: corpus term frequencies, precision/frequency combined into a scaled F-score, with LogOddsRatioUninformativeDirichletPrior for term significance; starter defined as NFL.com grade 6.7 or higher. No predictive holdout validation.
- **Data source(s):** NFL.com Prospect Tracker reports scraped by the author; draft pick data via nfl_data_py (draft_picks parquet, originally PFR-based names).
- **Code:** Python — pandas, numpy, nfl_data_py, matplotlib, seaborn, scikit-learn, NLTK (VADER), scattertext.
- **GSE application:** Reasoning corpus — GSE would mine scout-report language as a documented bias/feature source for prospect and narrative reasoning (e.g., which phrases actually separate starters), rather than treating report prose at face value.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — a text-as-data prospect method (VADER + Scattertext scaled F-score) that GSE's documented EPA/WP/ratings stack does not contain.

### 2. Exploring Quarterback Volatility with Gini Coefficients
- **Title:** Exploring Quarterback Volatility with Gini Coefficients
- **URL:** https://opensourcefootball.com/posts/2021-08-15-QB-volatilty-gini-coefficients/
- **Author:** not shown on page (plots credited to PatriotsStatsR)
- **Date:** 2021-08-15
- **Builds/measures:** A per-QB-season volatility score: how unevenly a quarterback's total EPA is spread across his games, plus a Volatility Over Expected (VOLoe) residual. Good QBs are mostly consistent, mid-tier QBs are the most volatile, and the worst QBs are consistently bad, giving a parabolic volatility-vs-EPA/play shape. High-EPA/high-VOLoe seasons (the Tannehill/Fitzpatrick 2020 profile) were followed by an average EPA/play drop of about 0.08 in the small historical look-ahead sample.
- **Method & math:** A modified Gini coefficient adapted to handle negative game EPA values (standard Gini cannot), computed on game-level total EPA (passes, rushes, penalties), for QB seasons 1999-2020 with at least 250 attempts and games under 5 QB plays dropped. VOLoe comes from a mgcv generalized additive model, VOL ~ s(EPA/play, 9-knot cubic spline) + total plays, fit on a 70/30 split; reported adjusted R-squared about 0.75 and test RMSE about 0.05. VOLoe = observed VOL minus model-predicted VOL.
- **Data source(s):** nflfastR play-by-play 1999-2020 and nflfastR rosters (for age analysis).
- **Code:** R — tidyverse/dplyr, ggplot2, ggrepel, mgcv, gt, lubridate.
- **GSE application:** Matchup / Reasoning corpus — GSE would carry a QB VOLoe flag into matchup reasoning as a variance and regression-risk input (e.g., widening outcome distributions and discounting a hot-but-volatile QB), not as a mean-rating change.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — Gini-based game-to-game EPA volatility plus a GAM residual is a distinct variance signal not in GSE's standard mean-EPA toolkit.

### 3. Evauluating defenses by how well they play the offense's WR 1
- **Title:** Evauluating defenses by how well they play the offense's WR 1
- **URL:** https://opensourcefootball.com/posts/2021-07-30-evauluating-defenses-by-how-well-they-play-the-offenses-wr-1/
- **Author:** not shown on page
- **Date:** 2021-07-30
- **Builds/measures:** A defense-level coverage proxy built without any cornerback tracking: for each defense-season, mean EPA allowed on targets to the opponent's top wide receiver versus mean EPA allowed to all other WRs. Plotted against each other, it recovers recognizable shutdown seasons (2009 Saints best by this measure, 2009 Jets and Charles Woodson's Packers strong, Stephon Gilmore's 2019 Patriots season 4th since 1999). The author is explicit that it cannot credit an individual corner, since help coverage and actual assignments are unobserved.
- **Method & math:** Within each team-season, WRs are ranked by total targeted air yards (total yards used for the all-history version because air yards do not go back far enough); rank 1 gets a binary WR1 flag. Plays are grouped by defense, season, and the flag, and mean EPA is compared across the two groups. No regression, shrinkage, opponent-quality adjustment, or stability validation — descriptive means only, with era and receiver-quality adjustments listed as future work.
- **Data source(s):** nflfastR play-by-play 1999-2019 (loaded as parquet via Arrow) merged with nflfastR roster data for receiver position/identity.
- **Code:** R — arrow, tidyverse, nflfastR, ggrepel, ggpmisc.
- **GSE application:** Matchup — GSE would use a defense's EPA allowed specifically to opposing WR1s as a player-vs-unit matchup feature when reasoning about a top receiver's outlook against that defense that week.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — a WR1-split defensive EPA construction is a specific matchup cut GSE does not document, even though it is built from standard EPA inputs.

### 4. Estimating Team Ability From EPA
- **Title:** Estimating Team Ability From EPA
- **URL:** https://opensourcefootball.com/posts/2021-06-27-estimating-team-ability-from-epa/
- **Author:** not shown on page
- **Date:** 2021-06-27
- **Builds/measures:** Regularized, opponent-adjusted offensive and defensive team-ability estimates (EPA/play) with uncertainty, replacing raw EPA/play rankings. The motivating example is a single 99-yard fumble-return touchdown swinging Kansas City's early-2019 defensive EPA/play from roughly 30th-best to 22nd-best territory in one play, showing how noisy raw EPA is. The joint model shrinks teams toward league average, adjusts for who they faced, and quantifies how little separates most teams even after a full season.
- **Method & math:** Bayesian multilevel (partial-pooling) models in Stan. Play EPA ~ Normal(offense effect + defense effect, sigma), with team effects drawn from Normal(0, sigma_off) and Normal(0, sigma_def), informative priors sigma_off ~ Normal(0.06, 0.03), sigma_def ~ Normal(0.03, 0.03), non-centered parameterization, NUTS sampling (4 chains x 2000). A second version swaps the Normal likelihood for a Student-t with 6 degrees of freedom, which fits EPA's fat tails and spike near zero far better on posterior predictive checks and makes estimates robust to a few huge plays (e.g., Pittsburgh's defense and Buffalo's offense rise; Miami's falls). Data: regular-season pass/run plays, 2018-2020, EPA bounded -16 to 10.
- **Data source(s):** nflfastR play-by-play 2018-2020.
- **Code:** R — rstan/Stan, lme4, tidyverse, tidybayes, bayesplot, DT.
- **GSE application:** Team ratings — GSE would use exactly this partial-pooling, Student-t specification as the principled way to turn play EPA into opponent-adjusted team ratings with honest uncertainty intervals feeding every downstream layer.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — GSE documents Elo/FPI-style ratings, but a Bayesian multilevel Student-t EPA ability model with posterior uncertainty is a distinct, transferable ratings method.

### 5. Computer Vision with NFL Player Tracking Data using torch for R
- **Title:** Computer Vision with NFL Player Tracking Data using torch for R
- **URL:** https://opensourcefootball.com/posts/2021-05-31-computer-vision-in-r-using-torch/
- **Author:** not shown on page
- **Date:** 2021-05-31
- **Builds/measures:** A coverage-classification model that reads one frame of player tracking per pass play (1.8 seconds after the snap) and predicts the coverage family: Cover 0/1/2 Man, Cover 2/3/4/6 Zone, Prevent. It reaches about 78% accuracy on a 200-play held-out test set from a single week of data, matching its cross-validation average, with Cover 1 Man vs Cover 3 Zone the main confusion. The post's stated goal is teaching the torch-for-R workflow, not maximizing accuracy.
- **Method & math:** Each play becomes a tensor of plays x 13 features x 11 defenders x 5 offensive players, following The Zoo's winning 2020 Big Data Bowl design (permutation-invariant in player order). Features: defender distance from line of scrimmage, field position, speed and acceleration in x/y, orientation toward the QB, and x/y distance, relative speed, and relative acceleration to each offensive player. The network uses 1x1 convolutions (128-160-128 channels), a 0.7*mean + 0.3*max pooling over the offense dimension, a second 1D-conv block, then a linear head with dropout 0.3. Training: 5-fold cross-validation, Adam (lr 0.001) with step decay, cross-entropy loss, 50 epochs, vertical-flip data augmentation in training and test-time augmentation (average of normal and flipped predictions, then average over the 5 fold models).
- **Data source(s):** NFL Big Data Bowl 2021 player tracking data (Kaggle) for 2018 Week 1, plus Telemetry coverage labels for that week (1,028 labeled plays after filtering); author's ngscleanR package for prep.
- **Code:** R — torch (R interface), tidyverse, patchwork, gt, splitTools, caret/cvms for the confusion matrix.
- **GSE application:** Matchup — GSE would use automated coverage identification from tracking frames to label what defenses actually ran, feeding scheme-vs-scheme matchup reasoning instead of relying on charting or guessing coverages.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — a tracking-data CNN coverage classifier is well outside GSE's documented play-by-play model set and is directly reusable for matchup inputs.

### 6. NFL win probability from scratch using xgboost in R
- **Title:** NFL win probability from scratch using xgboost in R
- **URL:** https://opensourcefootball.com/posts/2021-04-13-creating-a-model-from-scratch-using-xgboost-in-r/
- **Author:** not shown on page
- **Date:** 2021-04-13
- **Builds/measures:** A complete, worked tutorial for training an in-game win probability model from scratch: feature set, leakage-safe cross-validation, two rounds of hyperparameter tuning, final training, and out-of-sample evaluation with a calibration plot. The final model scores log loss about 0.427 and about 79.3% accuracy (win prob over 0.5) on held-out 2019-2020 plays, with score differential and score-differential-by-time the dominant features, followed by the pregame spread term.
- **Method & math:** XGBoost binary logistic model. Features: receive-second-half-kickoff flag, spread_time (spread decayed by time remaining), home flag, half and game seconds remaining, diff_time_ratio, score differential, down, yards to go, yardline, and both teams' timeouts. Validation uses grouped folds by game_id via splitTools so no game's plays leak across folds; tuning uses a dials Latin hypercube grid (40 configs, then a narrowed second grid) scored by log loss in xgb.cv with early stopping. Monotone constraints force sensible directions (e.g., larger lead can only raise win prob; more yards to go can only lower it); adding a monotone constraint on spread_time did not help log loss (0.4483 vs 0.4479) but was kept on principle. Train 2001-2018, test 2019-2020, overtime and ties excluded.
- **Data source(s):** nflfastR play-by-play 2001-2020 (load_pbp), including its pregame spread field.
- **Code:** R — xgboost, nflfastR, tidyverse/tidymodels dials, splitTools, MLmetrics.
- **GSE application:** Reasoning corpus / Team ratings — GSE already runs WP, so the transferable value is the training discipline (grouped-by-game folds, monotone constraints, log-loss tuning) as a documented recipe for retraining or auditing its own WP model.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — this is the canonical build of the standard WP model GSE already has; its value here is procedural, not a new signal.

### 7. nflfastR EP, WP, CP xYAC, and xPass models
- **Title:** nflfastR EP, WP, CP xYAC, and xPass models
- **URL:** https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/
- **Author:** not shown on page
- **Date:** 2020-09-28
- **Builds/measures:** The reference documentation and calibration proof for the five core nflfastR models: Expected Points (next-score probabilities), Win Probability (with and without the Vegas spread), Completion Probability (the basis of CPOE), expected Yards After Catch (xYAC, a full distribution over YAC outcomes), and expected pass/dropback probability (xPass). Its main claim is calibration: each model is shown to be well calibrated out of sample and better calibrated than the older nflscrapR models it replaced, with era adjustments added so cross-era comparisons are fairer.
- **Method & math:** All models are XGBoost. EP is a 7-class multinomial (touchdown, opponent TD, field goal, opponent FG, safety, opponent safety, no score) on half seconds remaining, yardline, home, roof, down, yards to go, era bins, and timeouts. WP is binary logistic on time, yardline, score differential, diff_time_ratio, down/distance, timeouts, second-half kickoff, and home, plus a spread variant using spread_time. CP is binary logistic on air yards, distance to sticks, pass location (middle or not), QB hit, down, yardline, roof, era. xYAC is a 76-class multinomial over capped YAC values on completed passes. xPass is binary logistic for dropback vs run including both WP variants. Validation throughout is leave-one-season-out over 2000-2019 (2006-2019 for air-yards models), scored with the Yurko-Ventura-Horowitz weighted calibration error: EP 0.006 vs nflscrapR 0.017, WP 0.0055 vs 0.0397, WP-with-spread 0.0066, CP 0.005, xYAC 0.0058, xPass 0.008; adding the spread cut WP classification error from about 27% to 23% and log loss from 0.52 to 0.44.
- **Data source(s):** nflfastR/nflscrapR play-by-play (about 750,000 plays for EP calibration; air-yards fields from 2006 onward).
- **Code:** R — xgboost, tidyverse, nflfastR helper/model code on GitHub.
- **GSE application:** Reasoning corpus / Team ratings — this is the calibration reference GSE's EPA/WP/CPOE inputs rest on; GSE would cite its leave-one-season-out errors when stating how much trust to place in those inputs and would reuse the era-bin idea for cross-era reasoning.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — it documents the canonical EP/WP/CP/xYAC/xPass models that every EPA-based engine, GSE included, already consumes.
- **Coordinator note (Oct 17 baseline):** one of the five methods extracted on Oct 17 — the 4th-down decision engine — has no standalone article in the 42. It is built on the EP/WP machinery documented in this article, so this entry carries that extraction's provenance: ALREADY EXTRACTED component inside a DUPLICATE-disposition article. Counted once, under DUPLICATE, in the totals below; the five extracted methods map to articles 24, 15, 26, 22, and this one.

### 8. Gunslingers and Game Managers
- **Title:** Gunslingers and Game Managers
- **URL:** https://opensourcefootball.com/posts/2021-02-05-gunslingers-and-game-managers/
- **Author:** David Anderson (per the page's citation block)
- **Date:** 2021-02-05
- **Builds/measures:** Two hand-built QB style indices for every QB season since 2005 with over 200 attempts, plotted against each other. The Gunslinger score rewards deep, high-volume, high-touchdown passing; the Game Manager score rewards avoiding interceptions and sacks while completing passes and succeeding play to play. The 2019 plot matches the folk taxonomy: Jameis Winston as extreme gunslinger/poor manager, Drew Brees as manager, Patrick Mahomes high on both.
- **Method & math:** Each component stat is z-scored (R scale()), then combined with subjective fixed weights. Gunslinger: 1.0 x mean air yards + 0.75 x TDs + 0.75 x pass yards (code uses 0.5 for pass yards despite the text saying 75%) + 0.25 x scramble/rush yards - 0.75 x rate of throwing short of the sticks on failed third downs. Manager: -1.0 x interceptions + 0.70 x success rate - 0.50 x sack rate + completion percent (code weight written as 75, an apparent typo that dominates after scaling, though the final scores are re-scaled). Plays are filtered to win probability between 0.1 and 0.9 to limit garbage time. No validation against future performance; a Shiny app lets readers change the weights.
- **Data source(s):** nflfastR play-by-play 2005-2020, dropback plays only (designed QB runs excluded).
- **Code:** R — tidyverse, janitor, pacman, nflfastR, ggrepel, ggimage; companion Shiny app.
- **GSE application:** Reasoning corpus / Fantasy-DFS — GSE would use the two-axis style split as narrative and variance context for QB reasoning (deep-ball aggression vs mistake avoidance), not as a rated input, given the arbitrary weights.
- **Disposition:** REFERENCE-ONLY — an entertaining descriptive taxonomy with hand-set, unvalidated weights (and an apparent weight typo); no transferable predictive method beyond the style-axis idea.

### 9. Modeling NFL game outcomes using Python and scikit-learn
- **Title:** Modeling NFL game outcomes using Python and scikit-learn
- **URL:** https://opensourcefootball.com/posts/2021-01-21-nfl-game-prediction-using-logistic-regression/
- **Author:** not shown on page (author invites contact at @bendominguez011)
- **Date:** 2021-01-21
- **Builds/measures:** A beginner-level pre-game win probability baseline in Python: eight exponentially weighted team EPA features (pass/rush offense and defense for home and away) fed to a logistic regression predicting a home win. Trained on 1999-2019, it reports about 63.5% accuracy and mean log loss about 0.638 in 10-fold cross-validation, and is then run untouched on the 2020 season game by game, including a (wrong) Kansas City Super Bowl pick at about 54%.
- **Method & math:** Weekly team EPA/play is lagged one week, then smoothed with an exponentially weighted moving average. The key feature choice, borrowed from the rolling-EPA post in this same batch, is a dynamic window: span 10 before Week 10 (pulling in prior-season games), then span equal to the current week so only the current season is used after Week 10. Model is plain scikit-learn LogisticRegression with default settings, evaluated with cross_val_score (accuracy and negative log loss). Passing EPA features carry the largest coefficients. Suggested but untested improvements: opponent-adjusted EPA, win-probability-weighted EPA, special teams and other features, tuned/complex models.
- **Data source(s):** nflfastR play-by-play via the Python nflfastpy loader, 1999-2020, plus schedule/score fields from the same data.
- **Code:** Python — scikit-learn, pandas, numpy, matplotlib, nflfastpy.
- **GSE application:** Team ratings / Market price-check — GSE would treat this only as a sanity-check baseline: a simple EPA-only pre-game probability to compare its richer ratings and market prices against.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — a deliberately minimal EPA-plus-logistic-regression game model, i.e., the standard baseline every engine (GSE included) already exceeds.

### 10. Exploring Stability and Predictive Power of Penalties in the NFL
- **Title:** Exploring Stability and Predictive Power of Penalties in the NFL
- **URL:** https://opensourcefootball.com/posts/2021-01-21-exploring-stability-and-predictive-power-of-penalties-in-the-nfl/
- **Author:** not shown on page (tables credited to @jacklich10)
- **Date:** 2021-01-21
- **Builds/measures:** Two things: a stability audit of penalty types, and a penalty EPA decomposition. Stability is measured by correlating team penalty rates across quarter-season (4-game) buckets; the least subjective fouls (offensive false start, defensive offside grouping) are the most stable, defenses control almost none of their penalty rates, and most penalty types are close to random. The decomposition splits every penalty play's EPA into penalty EPA (the value the flag itself added or removed, by re-pricing the nullified play) and no-penalty EPA (what the play would have been worth flag-free). Selective use of real EPA only for the more stable fouls, and penalty-free EPA elsewhere, improved game-outcome prediction for total offense and total defense versus raw EPA.
- **Method & math:** Penalty types are grouped (e.g., encroachment + defensive offside + neutral zone infraction as one class; illegal contact + defensive holding + DPI as another). For stability, split-period correlations of team penalty percentages within seasons, plus change over time. For penalty EPA, the nullified play is re-priced with nflfastR's calculate_expected_points(), penalty_epa = observed EPA minus no-penalty EPA. Prediction testing reuses the lagged dynamic-window rolling EPA framework from the rolling-averages post, comparing baseline EPA, fully penalty-free EPA, and the selective hybrid; special teams penalties are excluded.
- **Data source(s):** nflfastR play-by-play 1999-2020 (over 64,000 penalties).
- **Code:** R — tidyverse/purrr, readr, glue, nflfastR (calculate_expected_points).
- **GSE application:** Venue-Weather-Refs / Team ratings — GSE would strip fluky penalty EPA out of its team ratings while keeping false-start/offside/holding signal, and would carry the stability ranking into referee/venue reasoning about which flag tendencies are real.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — the penalty-EPA / no-penalty-EPA split with a stability-based selective rule is a concrete, tested adjustment GSE does not document.

### 11. Analyzing Home Field Advantage in the NFL
- **Title:** Analyzing Home Field Advantage in the NFL
- **URL:** https://opensourcefootball.com/posts/2021-01-11-hfa-analysis/
- **Author:** not shown on page
- **Date:** 2021-01-11
- **Builds/measures:** A cleaned estimate of home field advantage split into a league component (LHFA) and a team-specific component (iHFA) for 2006-2020. League HFA averages about 2.85 points over the full period but moves year to year in an apparently cyclical pattern, turning slightly negative in 2019 (about -0.7) and only about +0.4 in 2020. Team-specific deviations are small (e.g., Baltimore +0.26, Raiders -0.37 over 2006-2019), statistically insignificant in some seasons (2019 and 2020 included, where every team gets the league value), and close to random year to year.
- **Method & math:** Mixed-effects regression on point differential, structured as two observations per game (one per team) so each team's home-vs-away performance is compared directly. LHFA is the fixed effect of a home indicator; iHFA is a random slope of home by team, (0 + home | team), constrained to sum to roughly zero across teams. Fixed-effect controls: team and opponent strength (PFF season grades), QB and opposing QB play (PFF game grades), and head coach and opposing head coach quality (coach intercepts from a separate mixed model rescaled 0-100). Without those controls, the model just rediscovers that good teams (New England, Pittsburgh, Seattle) look like great home teams.
- **Data source(s):** nflfastR play/game data 2006-2020 plus PFF season team grades and game QB grades.
- **Code:** Not shown on page (methods described in prose; no code blocks or package list in the article text).
- **GSE application:** Venue-Weather-Refs / Team ratings — GSE would replace any flat 3-point home assumption with a time-varying league HFA (near zero in recent seasons in this estimate) and would only apply a team-specific HFA when it is statistically distinguishable from zero.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — the two-rows-per-game random-slope iHFA construction with PFF/coach controls is a specific HFA estimator GSE does not document, and its shrinking-HFA finding directly changes a standard input.

### 12. Exploring Rolling Averages of EPA
- **Title:** Exploring Rolling Averages of EPA
- **URL:** https://opensourcefootball.com/posts/2020-12-29-exploring-rolling-averages-of-epa/
- **Author:** not shown on page
- **Date:** 2020-12-29
- **Builds/measures:** A systematic comparison of how to turn weekly EPA into a predictive team-strength feature: which rolling window and which averaging type best predict future game outcomes. Conclusions: a dynamic window (last 10 games early, expanding to all games played that season, up to 20) beats a fixed 10-game window; weighting games by play count helps; exponential averaging is best for passing and total offense, running/simple averages are best for rushing and for defense and point differential; and adjusting defensive EPA for opponent quality slightly hurts prediction, while splitting pass/rush and adjusting each separately adds little.
- **Method & math:** Weekly offense/defense EPA/play (split pass/rush via dropback flag, kneels excluded, penalties included) is opponent-adjusted, lagged so only prior games inform a prediction, then averaged with pracma moving averages of four types: simple, weighted, running, and exponential. Windows are dynamic: 10 games minimum, growing with games played in the current season, with prior-season games filling the window early (like a prior). A combined pass/rush EPA weights the two by dropback percentage. Predictive power is compared across variants by outcome-prediction accuracy-style plots against game results 2000-2020 (1999 used as the prior season). No single fitted model or coefficients are the product; the product is the feature-engineering recipe.
- **Data source(s):** nflfastR play-by-play 1999-2020.
- **Code:** R — tidyverse, pracma (movavg), nflfastR data loads.
- **GSE application:** Team ratings — GSE would set its EPA feature windows by this recipe: dynamic 10-to-20-game lagged windows, play-count weighting, exponential decay for offensive passing strength and running/simple averages for rushing and defense.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — the tested dynamic-window plus per-category averaging-type recipe is a specific feature-engineering result, distinct from GSE's documented ratings models themselves.

### 13. Still elite: What the numbers tell us about Aaron Rodgers
- **Title:** Still elite: What the numbers tell us about Aaron Rodgers
- **URL:** https://opensourcefootball.com/posts/2020-10-03-still-elite-what-the-numbers-tell-us-about-aaron-rodgers/
- **Author:** not shown on page
- **Date:** 2020-10-03
- **Builds/measures:** A context-adjusted QB evaluation that decomposes dropback value into three components: play quality (avoiding bad play types — sacks, throwaways — and producing scrambles/good throw types), air EPA above expectation, and YAC EPA above expectation, each with the QB as a shrunken random effect and with receiver and defense faced accounted for. Applied to 2016-2019 it moves Rodgers from 7th by raw EPA/play to 2nd overall, while scheme/sample beneficiaries fall (Garoppolo 2nd to 11th, Mullens 11th to 27th, Lock 12th to 20th) and Russell Wilson rises (14th to 9th). The signature finding: Rodgers was by far the league's most aggressive passer past the sticks on 3rd/4th down while playing the short game on early downs, matching how much each yard before the sticks is actually worth by down.
- **Method & math:** Generalized additive mixed models (mgcv bam) predicting play EPA and its air/YAC splits, with smooth terms for context (down, log yards to go, yardline, and interactions such as to_sticks by log distance and yardline), passer as a random effect (top 30 passers, others lumped), receiver as a random effect (top 100) in the throwing models, and defense/coach faced absorbed through opponent terms; model selection/shrinkage via select = TRUE. A separate GAM of throw depth past the sticks on late downs (tensor smooth of log distance and yardline plus passer random effect) produces the aggression ranking. Benchmarked descriptively against SIS Total Points and PFF grades, which the intro cites as the best public predictors of future QB performance; no formal holdout validation of the new metric.
- **Data source(s):** nflfastR play-by-play 2016-2019; SIS Total Points and PFF grades cited for context.
- **Code:** R — tidyverse, mgcv (bam), mixedup (extract_random_effects).
- **GSE application:** Matchup / Reasoning corpus — GSE would reuse the three-part QB decomposition (play quality, air, YAC, all opponent- and receiver-adjusted) as its QB input to matchup reasoning, and the down-specific value-of-yards-before-the-sticks result as a reasoning principle for judging QB decisions.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — a GAMM random-effect QB decomposition with receiver/defense adjustment is a distinct evaluation method, not GSE's standard EPA/CPOE QB read, even though this article presents it through a single-player case study.
## Batch B (indices 14-27)

### 14. Receiving by Position
- Title: Receiving by Position
- URL: https://opensourcefootball.com/posts/2020-09-26-receiving-by-position/
- Author: Arthur Gymer (citation block: "Gymer, Arthur")
- Date: 2020, Sept. 26 (citation block)
- Builds/measures: It joins roster position to every targeted play and tracks how receiving production is split among WR, TE, RB and FB from 2000-2019. Main findings in the piece: TE targets rose steadily, FB targets collapsed, RB targets produced almost no total EPA despite TE-like volume, and WR EPA hit its highest level in the last two seasons shown despite fewer targets. It also looks at target share by field position and flags outlier team-seasons for TE usage.
- Method & math: Descriptive aggregation only, no fitted model. Plays are filtered to targets with a receiver_id and non-missing EPA, decoded to GSIS IDs, joined to roster position, then grouped by season and position to compute mean/total EPA, mean/total air yards, target count and completion rate. Field-position analysis bins yardline_100 and plots smoothed target distributions and target-share proportions in 5-yard bins.
- Data source(s): nflfastR play-by-play (2000-2019) and nflfastR roster data via fast_scraper_roster.
- Code: R; nflfastR, data.table, purrr.
- GSE application: Usage / Matchup — GSE would use position-level target share and EPA by field zone as a scheme fingerprint for each offense (e.g. TE-heavy red-zone usage) when building the matchup reasoning for a defense facing that team.
- Disposition: DUPLICATE-OF-EXISTING-GSE — position-level target/EPA aggregation is a canonical usage split every engine already computes; no new estimator is introduced.

### 15. Creating an Expected Field Goal Metric
- Title: Creating an Expected Field Goal Metric
- URL: https://opensourcefootball.com/posts/2020-09-09-creating-an-expected-field-goal-metric/
- Author: not shown on page
- Date: not shown
- Builds/measures: It builds an expected field goal (xFG) probability for each attempt so kickers can be judged against the difficulty of the kicks they actually faced. Summing xFG and comparing it with makes gives Field Goals Over Expected (FGOE); the 2019 leaderboard shown is headed by Justin Tucker at about +3.9. The author is explicit that the model adds little raw predictive lift over the base make rate.
- Method & math: Logistic regression (binomial GLM, logit link) trained on 2009-2019 attempts with an 80/20 train/test split. A full model with distance, divisional game, surface, temperature, wind, tie/take-lead, game-winning attempt, road team, indoors and precipitation was reduced to the significant variables only: kick distance, game-winning attempt, wind and precipitation. Dome/closed-roof missing weather was imputed as no precipitation, 0 wind, 70 degrees; other missing values were mean-imputed. Test accuracy was 86%, essentially the test sample's base make rate, with much weaker detection of misses (49%) than makes (88%).
- Data source(s): nflfastR play-by-play, 2009-2019, field-goal plays excluding blocked kicks.
- Code: R; nflfastR, tidyverse, caret, gt.
- GSE application: Venue-Weather-Refs / Team ratings — GSE would use xFG/FGOE as the kicker-quality and weather-adjusted kicking input when pricing a game's total and late-game field-goal situations instead of using raw FG percentage.
- Disposition: ALREADY EXTRACTED (Oct 17)

### 16. Estimating Run/Pass Tendencies with tidyModels and nflfastR
- Title: Estimating Run/Pass Tendencies with tidyModels and  nflfastR (title as shown, double space in source)
- URL: https://opensourcefootball.com/posts/2020-09-07-estimating-runpass-tendencies-with-tidymodels-and-nflfastr/
- Author: not shown on page
- Date: not shown
- Builds/measures: It builds a two-stage measure of true team run/pass tendency that strips out game script, so a team that runs a lot only because it leads is not mislabeled run-heavy. The headline example is New England: high raw run volume but pass-heavy once situation is accounted for, while the 2018 Seahawks remain the clear run-heaviest outlier. The output is a team-season effect with uncertainty intervals, rankable against raw dropback rate.
- Method & math: Stage 1 is an XGBoost classifier for P(QB dropback) from game state only — down (1-3), yards to go, yardline_100, score differential, quarter, half seconds remaining, and offensive/defensive timeouts — tuned with tidymodels (40 hyperparameter combinations, cross-validation, ROC AUC selection). Test performance was 69.1% accuracy and 0.760 AUC, with a well-calibrated test calibration plot. Stage 2 is a Bayesian multilevel logistic model fit in Stan: logit of actual dropback = intercept + team-season random effect + coefficient on the logit of the XGBoost probability; the team random effect (sigma_mu about 0.18) is the tendency measure, e.g. a -0.47 effect converts a league-average 0.50 spot into about 0.38 for that team.
- Data source(s): nflfastR play-by-play, regular season 2016-2019.
- Code: R; tidymodels (parsnip, workflows, dials, tune), xgboost engine, rstan, lme4, arm, tidybayes, vip, tidyverse.
- GSE application: Matchup / Situation — GSE would use the game-script-adjusted team tendency effect, not raw run rate, to state in reasoning what an offense actually wants to do in a neutral spot against a specific defense.
- Disposition: NEW METHOD NOT YET IN GSE DOCS — the two-stage XGBoost-expectation plus Stan team random-effect design is a specific, transferable tendency estimator, distinct from a plain pass-rate-over-expected lookup.

### 17. RERUN — Exonerating punters for long returns
- Title: RERUN (full heading on page: "RERUN: Return-edited real unbiased net")
- URL: https://opensourcefootball.com/posts/2020-08-21-rerun-exonerating-punters-for-large-returns/
- Author: not shown on page (produced by the Puntalytics / @ThePuntRunts account, per page text)
- Date: not shown
- Builds/measures: It builds RERUN, a net-punting metric that replaces the actual return on each returned punt with the typical return for a punt of that length, so a punter is not blamed or credited for his coverage unit. Comparing a punter's RERUN with his ordinary net shows whether his coverage team helped or hurt him, and the piece ranks punter-seasons on the adjusted number. League-average RERUN equals league-average net by construction, which is used as a sanity check.
- Method & math: Two stated assumptions do the work: the punter is fully responsible for whether a punt is returned, and not at all responsible for return length once returned. Expected return is a LOESS smooth (span 0.65) of return yards on gross punt yards, fit first league-wide and then refit separately by season for era adjustment (coverage improved over 1999-2019). For returned punts RERUN = gross yards minus the smoothed expected return; for non-returned punts RERUN = gross yards. Touchbacks are treated as punts to the 20 rather than the 0.
- Data source(s): nflfastR play-by-play filtered to punts, 1999-2019, imported and cleaned with the authors' puntr package.
- Code: R; puntr, tidyverse, ggplot2, purrr, tidyr, ggimage, ggrepel.
- GSE application: Team ratings / Situation — GSE would carry RERUN alongside net punting in the special-teams component of team ratings so a coverage-driven net is not read as punter quality in field-position reasoning.
- Disposition: NEW METHOD NOT YET IN GSE DOCS — a named, era-adjusted expected-return replacement for net punting with an explicit responsibility split; not a standard EPA or net-yards figure.

### 18. Defense and rest time re-visited
- Title: Defense and rest time re-visited
- URL: https://opensourcefootball.com/posts/2020-08-25-defense-and-rest-time-re-visited/
- Author: not shown on page
- Date: not shown
- Builds/measures: Using actual clock timestamps, it measures how long a defense really rested (in seconds/minutes) before each drive, instead of using plays or time of possession as a proxy. It finds rest time and plays of rest track each other closely, that short-rest drives are mostly quick-turnover drives that also start with bad field position, and that once field position is accounted for there is essentially no relationship between rest and defensive results. Typical rest is roughly 5-20 minutes, with a mode of exactly 10 minutes.
- Method & math: Descriptive analysis on roughly 30,000 drives, 2015-2019, after manually removing five weather-delayed games and six games with clock errors. Defensive outcome is points per drive over expected, where the expectation is built from starting yard line and seconds remaining in the half, which separates the field-position confound from any rest effect. The rest-vs-outcome relationship is weakly positive and near zero across the bulk of the distribution — a null result, not a fitted predictive model.
- Data source(s): nflfastR play-by-play including time-of-day fields, 2015-2019.
- Code: R (article text; code is in the linked source repository rather than printed in full on the page).
- GSE application: Situation / Reasoning corpus — GSE would cite this as the reason defensive rest minutes get no weight in situational reasoning, while field position after quick turnovers does, keeping a plausible-sounding fatigue narrative out of the published trail.
- Disposition: REFERENCE-ONLY — a careful negative result with a confound check, but no transferable estimator or model for GSE to adopt.

### 19. Calculating Expected Fantasy Points for Receivers
- Title: Calculating Expected Fantasy Points for Receivers
- URL: https://opensourcefootball.com/posts/2020-08-30-calculating-expected-fantasy-points-for-receivers/
- Author: not shown on page
- Date: not shown
- Builds/measures: It computes, for an average receiver, the expected PPR fantasy points on every target by combining completion probability with the full distribution of yards-after-catch outcomes, then aggregates to expected catches, yards, touchdowns and points per player. It goes beyond the mean by simulating a player's game 10,000 times to get a full outcome distribution; the worked example puts Sammy Watkins' 46.8-point Week 1 of 2019 at the 99th percentile of his own simulated distribution and his 10.9-point Week 2 at the 4th percentile.
- Method & math: The nflfastR add_xyac function is modified to return the raw xYAC probability for every possible gain instead of its summary fields. For each target, joint catch-and-run probability = completion probability (CP) times the xYAC probability of that gain; PPR points for an outcome are 1 point for the catch plus 0.1 per yard plus 6 if the gain reaches the end zone; expected points are the probability-weighted sum, with an explicit incomplete-pass branch carrying probability 1 - CP. Fumbles, two-point conversions and rushing plays are excluded. No new validation is run; the piece itself notes target share and QB quality (it suggests CPOE/YAC-over-expected priors as a next step) are not yet in it.
- Data source(s): nflfastR play-by-play, 2019 regular season, pass plays with an identified receiver; nflfastR CP and xYAC models.
- Code: R; tidyverse, gt, scales, with sourced and edited nflfastR helper functions (helper_add_xyac.R, helper_add_nflscrapr_mutations.R).
- GSE application: Fantasy-DFS / Usage — GSE would use the CP-times-xYAC expected-points distribution, not just its mean, to separate opportunity quality from unsustainable touchdown luck when ranking receivers and setting DFS percentile expectations.
- Disposition: NEW METHOD NOT YET IN GSE DOCS — the full-distribution construction (raw xYAC outcome probabilities joined to CP, then simulated) is a specific build, not a generic expected-points total.


### 20. Adding ESPN and 538 Game Predictions to nflfastR Data
- Title: Adding ESPN and 538 Game Predictions to nflfastR Data
- URL: https://opensourcefootball.com/posts/2020-08-29-adding-espn-and-538-game-predictions-to-nflfastr-data/
- Author: not shown on page
- Date: not shown
- Builds/measures: It is a data-joining recipe: scrape or pull pregame win probabilities from FiveThirtyEight (Elo-based) and ESPN's predictor, plus the moneyline-derived probabilities carried in ESPN's pickcenter feed (Caesars, Numberfire, teamrankings, consensus), and merge them onto nflfastR schedule data. It then scores the sources against each other on 2018-2019 regular-season games by pick accuracy and Brier score, finding the odds-linked Numberfire numbers the most accurate — which the author attributes to market information the model-only sources do not have.
- Method & math: No new model. FiveThirtyEight's nfl_elo.csv is read directly and joined on harmonized team codes and date; ESPN game IDs are scraped from weekly schedule pages because they follow no reproducible pattern, then each game's summary JSON is queried for gameProjection and pickcenter odds. American moneylines are converted to implied probabilities with the standard formulas (100/(ML+100) for underdogs, ML/(ML-100) for favorites). Evaluation is percent correct at a 0.5 threshold plus DescTools Brier scores.
- Data source(s): nflfastR schedules (fast_scraper_schedules, 2018-2019), FiveThirtyEight NFL Elo file, ESPN schedule pages and ESPN site API summary endpoint.
- Code: R; tidyverse, lubridate, rvest, xml2, httr, jsonlite, glue, purrr, DescTools.
- GSE application: Market price-check / Team ratings — GSE would use this only as an external-benchmark join pattern: line up independent public win probabilities next to its own pregame number and the market price so disagreements are visible in the price-check step.
- Disposition: REFERENCE-ONLY — a scraping and merging tutorial for third-party predictions (one source, FiveThirtyEight's NFL Elo feed, is a legacy product); no transferable GSE method beyond the join itself.

### 21. Faceted and Animated Heatmaps
- Title: Faceted and Animated Heatmaps
- URL: https://opensourcefootball.com/posts/2020-08-29-faceted-and-animated-heatmaps/
- Author: not shown on page
- Date: not shown
- Builds/measures: A visualization tutorial that puts pass-location density on a drawn football field, split into facets (for example positive vs negative EPA games, or positive vs negative YAC games, or one facet per season) or animated across seasons and weeks. It also includes a two-quarterback density-difference comparison, applied to Mahomes vs Rodgers over 2017-2019. Conclusions from the plots are explicitly left to the reader; the worked observation is that Dak Prescott threw left less often as 2017-2019 progressed.
- Method & math: Two-dimensional kernel density of pass x/y coordinates via ggplot2 geom_density_2d_filled with normalized density contours across facets, and MASS::kde2d on a common x/y range for the QB-vs-QB version, where the difference surface is one QB's density matrix minus the other's. Much of the work is data repair: joining the scraped Next Gen pass-location file to nflfastR aggregates on passer name, team and old game ID, fixing team-code (OAK/LV) and mis-parsed name mismatches by hand. Animation uses gganimate transition_states / transition_manual.
- Data source(s): Next Gen Stats pass-location scrape (ArrowheadAnalytics next-gen-scrapy-2.0 pass_and_game_data.csv) merged with nflfastR play-by-play (2017-2019, loaded locally as feather via arrow).
- Code: R; tidyverse, arrow, data.table, ggplot2, gganimate, MASS, scales.
- GSE application: Matchup / Reasoning corpus — GSE would use faceted pass-location density only as a display and scouting aid behind matchup reasoning (where a QB actually throws, by season), not as an input number.
- Disposition: REFERENCE-ONLY — plotting and data-joining technique with no estimator, prediction or decision rule to transfer.

### 22. Player Density and Completion Surface Estimates
- Title: Player Density and Completion Surface Estimates
- URL: https://opensourcefootball.com/posts/2020-08-29-player-density-and-completion-surface-estimates/
- Author: not shown on page
- Date: not shown
- Builds/measures: It estimates two field surfaces from pass-location coordinates: a kernel density surface showing where a quarterback's passes go, and an expected-completion-percentage surface showing how likely a pass is to be completed at each point on the field. Player surfaces are differenced against the league surface to show, for example, that Mahomes completed passes to the deep middle at well above league rates. Individual surfaces are shrunk toward the league surface so a QB is not credited with a true rate in a zone he has rarely thrown to.
- Method & math: Densities use scipy gaussian_kde evaluated on a fixed mesh grid (121 by 141, half-yard steps) so surfaces are directly subtractable between players, with a quartile mask to show only extreme differences. Completion surfaces use a logistic generalized additive model (PyGAM LogisticGAM) with spline terms for x and y coordinates plus a tensor-product term, following the Mallepalle et al. (2019) approach; in-sample accuracy is 70.1% against a 65.3% always-complete baseline, pseudo R-squared 0.093, and the author states plainly that no holdout or cross-validation was done. Partial-dependence plots show depth (y) drives difficulty and the x coordinate matters mainly near the sidelines. Player shrinkage is a 2-D naive-Bayes style weighting: the regressed surface is the KDE-weighted blend of the league GAM and the QB GAM, weighted by the median league pass count and the QB's own pass count respectively.
- Data source(s): Next Gen Stats pass-location data (ArrowheadAnalytics next-gen-scrapy-2.0 pass_and_game_data.csv; 43,839 passes), x/y target coordinates and pass outcome.
- Code: Python; pandas, numpy, scipy.stats, seaborn, matplotlib, pygam.
- GSE application: Matchup — GSE would use shrunk per-QB and per-defense completion surfaces by field zone as spatial matchup evidence (where this QB is genuinely above or below league completion expectation) inside the reasoning trail.
- Disposition: ALREADY EXTRACTED (Oct 17)

### 23. Fast Data Loading
- Title: Fast Data Loading
- URL: https://opensourcefootball.com/posts/2020-08-28-fast-data-loading/
- Author: not shown on page
- Date: not shown
- Builds/measures: A data-infrastructure walkthrough showing how to store nflfastR play-by-play as an Apache Arrow / feather dataset partitioned by season and play type so filters are applied on disk before anything is collected into memory. The benchmarked claim is roughly a 10x speedup on a filter-group-summarize query: about 0.29 seconds elapsed for the partitioned feather dataset versus about 3.1 seconds for data.table fread of a local CSV and about 69 seconds to pull the CSVs online.
- Method & math: No statistical method. The steps are: load once, write_feather uncompressed, open_dataset, then write_dataset grouped by season and play_type to create the partition layout; queries filter on the partition keys before collect(). Timings come from system.time and a microbenchmark run of five repetitions across three loading strategies.
- Data source(s): nflfastR play-by-play CSV files, 2010-2019.
- Code: R; arrow, tidyverse, data.table, readr, purrr, glue, microbenchmark.
- GSE application: Reasoning corpus (infrastructure only) — GSE would use season/play-type partitioned local storage to keep the weekly play-by-play pulls fast enough that the Monday layer-order build is not bottlenecked on data loading.
- Disposition: REFERENCE-ONLY — a storage and loading tutorial; useful plumbing, no football method or measure.

### 24. Individual Expected Completion using Logistic Generalized Additive Mixed Models
- Title: Individual Expected Completion using Logistic Generalized Additive Mixed Models
- URL: https://opensourcefootball.com/posts/2020-08-28-expected-completion-using-logistic-generalized-additive-mixed-models/
- Author: Adrian Cadena (plot caption credit: "Analysis by Adrian Cadena @adrian_cadem"; no separate byline shown)
- Date: not shown
- Builds/measures: It estimates an individual completion-probability effect for each quarterback — in effect, how much a given QB raises or lowers the chance a pass is completed purely by being the one throwing it, after situation is controlled. Random intercepts are converted from log-odds to probabilities with confidence intervals and ranked for quarterbacks active in 2019. The author frames it as an inferential alternative to CPOE and states CPOE remains the better predictive measure.
- Method & math: A logistic generalized additive mixed model (gamm4, binomial with logit link) on 2016-2019 regular-season passes, filtered to win probability between 0.15 and 0.85, no penalties, and passers with at least 200 plays. Fixed effects are era, yards to go, yardline_100, down, away, QB hit and an air-yards-zero indicator, with a smooth spline term s(air_yards) for the non-linear depth effect; the quarterback is a random intercept (1 | id). Estimation used nAGQ = 0 for speed, with an nloptwrap optimizer. Random intercepts and their standard errors are extracted with broom.mixed for the ranking plots.
- Data source(s): nflfastR play-by-play, 2016-2019 regular season.
- Code: R; gamm4, dplyr, purrr, ggplot2, ggthemes, scales, broom.mixed.
- GSE application: Matchup / Team ratings — GSE would use the QB random-intercept completion effect as a quarterback-quality input that is already purged of target depth and situation, feeding the player-vs-player layer of matchup reasoning.
- Disposition: ALREADY EXTRACTED (Oct 17)

### 25. Open Source (Fantasy) Football: Visualizing TRAP Backs
- Title: Open Source (Fantasy) Football: Visualizing TRAP Backs
- URL: https://opensourcefootball.com/posts/2020-08-25-open-source-fantasy-football-visualizing-trap-backs/
- Author: Sam Hoppen (figure caption credit: "@SamHoppen"; no separate byline shown)
- Date: not shown
- Builds/measures: It visualizes where running backs get their touches by distance from the goal line and computes the TRAP measure — Trivial Rush Attempt Percentage, the share of a back's touches that are low-value rush attempts outside the 10-yard line. It also computes the complement, high-value touch share: carries inside the 10 plus any reception, as a share of total touches. Backs are charted in five field zones (100-81, 80-61, 60-41, 40-21, 20-1 yards out) with a 100-touch minimum for 2019.
- Method & math: Pure counting and proportions, no fitted model. Play-by-play is joined to an external player-position file to isolate RBs, touches are binned by yardline_100, and each zone's share is touches in zone divided by total touches. High-value touches are defined as ten_zone_rushes (rush attempts with yardline_100 at or inside 10) plus receptions; TRAP is the non-high-value share of (rush attempts + receptions). One manual cleaning choice is shown: Kenyan Drake's Miami games are dropped so only his Arizona role is represented.
- Data source(s): nflfastR play-by-play, 2019 regular season; external NFL player positions file (samhoppen/NFL_Positions, 2011-2019); nflfastR team colors/logos.
- Code: R; tidyverse, dplyr, ggimage, nflfastR, RColorBrewer, ggplot2.
- GSE application: Fantasy-DFS / Usage — GSE would use high-value touch share (inside-the-10 carries plus receptions) rather than raw touch count to judge whether a back's role is actually valuable in DFS and touchdown markets.
- Disposition: NEW METHOD NOT YET IN GSE DOCS — TRAP / high-value-touch share is a defined touch-quality metric with an explicit zone definition, distinct from raw volume or EPA counting.


### 26. Expected Turnovers for Quarterbacks
- Title: Expected Turnovers for Quarterbacks
- URL: https://opensourcefootball.com/posts/2020-08-25-expected-turnovers/
- Author: Anthony Gadaleta (@AG_8, per the source file's front matter; site byline check was cut off by the rate limit, front matter is authoritative)
- Date: 2020-08-25
- Builds/measures: Builds expected interceptions (xInt) and expected fumbles lost (xFmb) for quarterbacks and sums them into expected turnovers (xTO), so a QB's actual turnover count can be split into skill/context and conversion luck. Applied to 2019 (minimum 250 dropbacks), it flags who is likely to turn the ball over more or less per dropback in 2020; the conclusion names Jameis Winston as by far the largest expected-vs-actual gap, notes Rodgers and Wentz were among the luckiest yet would regress only to about league average, and finds little improvement hope for Daniel Jones and Kyle Allen because their xTO rates sat just below their actual rates.
- Method & math: Two caret logistic-regression GLMs with repeated 10-fold cross-validation. The interception model is fit on incomplete passes only, using air yards, pass location, QB hit, number of pass defenders (pbu) and season (trained 2006-2016; ROC 0.907). The fumble model predicts a fumble being lost from forced/not-forced, out of bounds, yards gained, sack and aborted snap (ROC 0.712). xTO = xInt + xFmb. Validation is next-season prediction R-squared: raw counts beat expected counts (volume dominates), but per dropback the expected rates win - xTO/dropback R2 0.316 vs 0.259 for actual, xInt/dropback 0.297 vs 0.212. Read route: site render lines 0-601 (models and predictive-power section) plus the repo .Rmd source for the Visuals and Conclusion sections after the browser hit its rate limit; content-equivalent, figures themselves not re-rendered.
- Data source(s): nflfastR play-by-play and roster data (models trained on 2006-2016 era data; evaluation through the 2019 season).
- Code: R; nflfastR, tidyverse, caret, ggimage, gt (per source file).
- GSE application: Matchup / Reasoning corpus - GSE would carry xTO-per-dropback minus actual TO-per-dropback as the turnover-luck adjustment on a QB: a defense facing a QB whose actual rate is far below his xTO rate should not be credited with a ball-security weakness that is mostly luck, and vice versa.
- Disposition: ALREADY EXTRACTED (Oct 17)

### 27. Getting into sports analytics
- Title: Getting into sports analytics
- URL: https://opensourcefootball.com/posts/2020-08-24-getting-into-sports-analytics/
- Author: Ben Baldwin (per the source file's front matter)
- Date: 2020-08-24
- Builds/measures: Not a model - a living Q&A page collecting short answers to recurring career questions: how to learn R, R vs Python, how to build the machine-learning foundation to understand Big Data Bowl work, what degree/field to choose, and what college students should do. Resource pointers include R for Data Science, Advanced R, An Introduction to Statistical Learning, Bayesian Data Analysis, and a free University of Michigan deep-learning course (EECS 498, similar to Stanford CS231n).
- Method & math: None - advice and reading lists only; no data, no fitted model, no validation.
- Data source(s): None (links out to books, courses, and community answers).
- Code: None (the page's only code embeds third-party tweets).
- GSE application: Reasoning corpus (people/training only) - GSE would use it as the onboarding reading list for any new analyst or coding agent joining the football-data work: learn R/Python, learn stats, publish projects publicly.
- Disposition: REFERENCE-ONLY - career-advice Q&A with no engine method; read in full from the repo .Rmd source after the browser hit its rate limit on the site render.

## Batch C (indices 28-41)

### 28. Visualizing ESPN's Total QBR Using Interactive Plots
- **Title:** Visualizing EPSN's Total QBR Using Interactive Plots
- **URL:** https://opensourcefootball.com/posts/2020-08-24-visualizing-epsns-total-qbr-using-interactive-plots/
- **Author:** Carl, Sebastian (per citation block on page)
- **Date:** 2020, Aug. 24 (per citation block on page)
- **Builds/measures:** Builds a reusable pipeline to pull ESPN Total QBR for every week and season 2006-2019 and plot a single quarterback's weekly QBR against league percentile bands. A second, interactive version covers multi-season ranges for two quarterbacks, with hover text showing opponent, result, score and QB plays. Examples are Brady 2007, Manning 2006, Rodgers 2011 and Trubisky 2019, then Mahomes vs Trubisky 2017-2019.
- **Method & math:** No new QBR model — QBR is taken as given from ESPN. Descriptive comparison only: horizontal reference lines at the 10th, 25th, 50th, 75th, 90th and 98th percentiles of all QBR in 2006-2019. Static plots in ggplot2; interactive plots convert the ggplot with plotly's ggplotly, adding opponent logos, a range slider and tooltip text. No validation of QBR itself.
- **Data source(s):** ESPN Total QBR via espnscrapeR; nflfastR schedules and teams_colors_logos for opponents, colours and logos.
- **Code:** R — espnscrapeR, nflfastR, dplyr/purrr/furrr/future, ggplot2, plotly, ggpmisc, ggthemes, glue, magick/grid.
- **GSE application:** Reasoning corpus / Team ratings — GSE would ingest weekly QBR as one external QB-form signal in the reasoning trail, plotted against league percentiles, never as a standalone pick driver.
- **Disposition:** REFERENCE-ONLY — visualization/scraping tutorial for an existing ESPN metric, no transferable rating method.

### 29. Exploring Wins with nflfastR
- **Title:** Exploring Wins with nflfastR
- **URL:** https://opensourcefootball.com/posts/2020-08-23-exploring-wins-with-nflfastr/
- **Author:** Ryan, Austin (per citation block on page)
- **Date:** 2020, Aug. 23 (per citation block on page)
- **Builds/measures:** Measures how much season win totals are explained by team EPA splits, and builds an expected-wins formula from those splits. It then flags over/under-performers (e.g. 2019 Packers and Seahawks high, Cowboys low) and tests whether large residuals mean-revert the next season.
- **Method & math:** Simple linear regressions of wins on each EPA metric (offensive pass EPA/dropback explains ~half the variance, defensive pass ~32%, offensive rush ~18%, defensive rush ~9%), a random forest for variable importance, and a multiple linear regression using offensive and defensive EPA per dropback and per rush, which explains about 78% of win variance. Residuals are roughly normal, mean 0, SD 1.4 wins; teams overperforming by >2.5 wins fell ~2.3 wins next year on average, underperformers rose ~2.7. No out-of-sample test reported.
- **Data source(s):** nflfastR play-by-play, roughly 1999/2009-2019 season aggregates (code hidden in post, linked Rmd).
- **Code:** R — nflfastR, linear regression and random forest (packages not named in the visible text; code chunks intentionally hidden).
- **GSE application:** Team ratings — GSE would use the four-split EPA regression as a sanity-check expected-wins baseline for rating residuals and next-season mean-reversion notes.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — canonical EPA-to-wins regression and mean-reversion check every EPA engine already has.

### 30. Ranking QBs Using Era Adjusted Elo
- **Title:** Ranking QBs Using Era Adjusted Elo
- **URL:** https://opensourcefootball.com/posts/2020-08-22-ranking-qbs-using-era-adjusted-elo/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** Builds an era-adjusted career QB ranking from 538's QB Elo values. By removing week-by-week league median inflation it produces cumulative and per-start era-adjusted value, weekly rank, share of starts as the No.1 / top-3 / top-5 QB, starts and win percentage, back to the 1950s. Manning, Brees and Brady top the cumulative list in that order.
- **Method & math:** Take 538's pre/post QB value (Elo = value × 3.3 per 538 methodology; ~25 Elo ≈ 1 point of expected margin). Era adjustment is median-centring: adjusted value = QB value minus the median QB value for that season-week. Career score is the cumulative sum of adjusted values; average is that sum divided by starts. Regular season only, playoffs excluded. No predictive validation beyond face validity of the ranking.
- **Data source(s):** FiveThirtyEight nfl_elo.csv (QB Elo / qb value fields).
- **Code:** Python — pandas, numpy, requests, seaborn, matplotlib.
- **GSE application:** Team ratings / Matchup — GSE would use median-centred QB Elo as a QB-vs-replacement input (points per game) when pricing a starter change or backup downgrade in a matchup.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — GSE already carries Elo/FPI-style QB ratings; the median-centring trick is the standard era adjustment for them.

### 31. Game Excitement and Win Probability in the NFL
- **Title:** Game Excitement and Win Probability in the NFL
- **URL:** https://opensourcefootball.com/posts/2020-08-21-game-excitement-and-win-probability-in-the-nfl/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** Implements Luke Benz's Game Excitement Index (GEI) for a single game and pairs it with a full win-probability chart. Worked example is 2019 Week 9 Vikings at Chiefs (GEI about 4.65), contrasted with a Ravens-Dolphins blowout (about 0.97) and 49ers-Saints (about 5.19).
- **Method & math:** GEI = (average number of plays per game in the season / plays in this game) × sum over plays of |change in home win probability|. It uses nflfastR's precomputed home_wp/away_wp, not a new WP model. The chart plots WP against game seconds remaining with quarter dividers and a 50% line. Caveat noted: nflfastR WP is unreliable in overtime because it does not account for ties.
- **Data source(s):** nflfastR play-by-play data repository, 2019 season.
- **Code:** Python — pandas, numpy, seaborn, matplotlib.
- **GSE application:** Reasoning corpus / Situation — GSE would use GEI only as a content/context label for how volatile a finished game was, not as a predictive input.
- **Disposition:** REFERENCE-ONLY — applies an existing published GEI formula and a WP chart; no new predictive method.

### 32. NFL Pass Location Visualization
- **Title:** NFL Pass Location Visualization
- **URL:** https://opensourcefootball.com/posts/2020-08-22-nfl-pass-location-visualization/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** Visualizes where passes land on the field using x/y coordinates scraped from static Next Gen Stats passing charts. With about 43,800 passes from 2017-2019 it shows marginal histograms, joint plots, hex-bin density and 2D kernel density, then compares individual quarterbacks (Mahomes spreading targets vs Carr concentrated near the line of scrimmage).
- **Method & math:** Descriptive density estimation only — hex binning counts and seaborn kernel density estimates of target location, faceted by player with field markings overlaid. Coordinates run about -28.3 to 28.3 yards horizontally and -10.4 to 62.1 vertically, with some out-of-bounds artefacts noted. No outcome model or validation; the promised expected-completion surface work is deferred to a later post.
- **Data source(s):** Next Gen Stats passing charts scraped via the Mallepalle/Yurko/Pelechrinis/Ventura approach (arXiv 1906.03339), via the author's maintained pass-and-game CSV.
- **Code:** Python — pandas, seaborn, numpy, matplotlib.
- **GSE application:** Matchup / Usage — GSE would use QB/ receiver target-density maps by field zone as matchup context (where a QB actually throws against a coverage shell), feeding reasoning, not selection.
- **Disposition:** REFERENCE-ONLY — visualization walkthrough of an external scraped dataset, no transferable model.

### 33. Rodgers Efficiency Decline
- **Title:** Rodgers Efficiency Decline
- **URL:** https://opensourcefootball.com/posts/2020-08-22-rodgers-efficiency-decline/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** A case study arguing Aaron Rodgers' efficiency fell after 2014 despite strong reputation surveys and PFF grades. It tracks rolling EPA/dropback and CPOE, QBR by season, splits by air-yards band and by targeted receiver, throwaway rate, and 2019 play-action splits, weighing supporting-cast and injury explanations.
- **Method & math:** Rolling 300-dropback moving averages of EPA/dropback and CPOE benchmarked against the 5th-best QB level; air yards binned behind line / 0-9 / 10-19 / 20+. Reported drops since 2015: deep EPA/dropback down about 27%, intermediate about 25%, short about 40%, with CPOE down in every band. Descriptive case analysis, no fitted model or validation.
- **Data source(s):** nflfastR / nflscrapR play-by-play (EPA, CPOE), ESPN QBR, Football Outsiders DVOA, rbsdm EPA+CPOE composite, PFF grades and throwaway counts, author-charted 2019 play-action/personnel.
- **Code:** R implied by nflfastR plotting (functions for EPA/CPOE moving-average plots are referenced in the homepage summary); packages not systematically named in the article text.
- **GSE application:** Reasoning corpus — GSE would reuse the template (rolling 300-dropback EPA/CPOE, air-yards bands, receiver splits, throwaways) to separate QB decline from cast/scheme decline in a reasoning write-up.
- **Disposition:** REFERENCE-ONLY — single-player opinion/case study; its tools are standard EPA/CPOE rolling averages GSE already has.

### 34. Visualizing the Run/Pass Efficiency Gap
- **Title:** Visualizing the Run/Pass Efficiency Gap
- **URL:** https://opensourcefootball.com/posts/2020-08-19-visualizing-the-runpass-efficiency-gap/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** Builds a team chart of dropback frequency against the pass premium — dropback EPA/play minus designed-run EPA/play — to show which teams pass often despite a small premium and which run often despite a large one. League 2019 values on the filtered sample are about 52.4% pass frequency, +0.089 pass EPA and -0.117 run EPA, a premium of about 0.206.
- **Method & math:** Simple grouped means, deliberately filtered to neutral situations only: downs 1-2, win probability between 20% and 80%, and outside the last two minutes of a half, so obvious pass/run scripts are removed. Premium = mean pass EPA − mean run EPA. No regression, shrinkage or validation.
- **Data source(s):** nflfastR play-by-play repository, 2019 season.
- **Code:** R — tidyverse, ggplot2, ggimage/ggpmisc, scales, shadowtext, magick/grid.
- **GSE application:** Matchup / Usage — GSE would compute the neutral-script pass premium per team as a tendency/efficiency check when reasoning about whether an opponent's run rate is justified.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — neutral-script pass-vs-run EPA gap is a standard EPA split every engine already computes.


### 35. Adjusting EPA for Strength of Opponent
- **Title:** Adjusting EPA for Strength of Opponent
- **URL:** https://opensourcefootball.com/posts/2020-08-20-adjusting-epa-for-strenght-of-opponent/
- **Author:** Goldberg, Jonathan (per citation block on page)
- **Date:** 2020, Aug. 20 (per citation block on page)
- **Builds/measures:** Builds opponent-adjusted weekly offensive and defensive EPA/play for every team, 2009-2019, so a team's EPA is corrected for how strong the defence/offence it just faced had been to that point. It compares adjusted vs unadjusted league pictures and uses each in game-outcome models.
- **Method & math:** Additive adjustment: adjusted EPA = raw EPA + (league mean EPA − opponent's EPA). Opponent strength is a simple 10-game moving average of opponent offensive/defensive EPA, lagged one week to avoid using the current game, and league mean is likewise a lagged 10-game moving average. Validation is two separate GLMs predicting game outcomes over the prior two seasons: adjusted EPA about 64.0% accuracy vs unadjusted about 63.5% — a slight edge only. Author notes play-type weighting and play-level / optimization-based adjustments as improvements.
- **Data source(s):** nflfastR-data play-by-play CSVs (guga31bb repository), 2009-2019.
- **Code:** R — tidyverse/dplyr, purrr, readr, glue, pracma (movavg), glm.
- **GSE application:** Team ratings / Matchup — GSE would use lagged, moving-average opponent-adjusted EPA as the transparent baseline rating input before any heavier optimization-based adjustment.
- **Disposition:** DUPLICATE-OF-EXISTING-GSE — GSE already has opponent adjustments; this is the canonical simple additive version with only a marginal accuracy gain shown.

### 36. Python contributing example
- **Title:** Python contributing example
- **URL:** https://opensourcefootball.com/posts/2020-08-20-python-contributing-example/
- **Author:** Baldwin, Ben (per citation block on page)
- **Date:** 2020, Aug. 20 (per citation block on page)
- **Builds/measures:** A contributor how-to showing Python can run inside the site's R/RStudio + reticulate + distill workflow. As a worked example it loads 2019 play-by-play, tabulates mean team EPA, then ranks quarterbacks with at least 200 plays by EPA per dropback and CPOE (Mahomes and Jackson on top in 2019).
- **Method & math:** No model — setup instructions plus pandas group-by means and a 200-play minimum filter. No validation.
- **Data source(s):** nflfastR-data play-by-play, 2019 season.
- **Code:** Python (inside R Markdown via reticulate) — pandas; R packages distill, rmarkdown, reticulate for the site build.
- **GSE application:** Reasoning corpus — only as documentation of a mixed R/Python publishing workflow; the EPA/CPOE table itself adds nothing to the engine.
- **Disposition:** REFERENCE-ONLY — infrastructure/contributing tutorial with a trivial group-by example, no transferable method.

### 37. Matching players without ID keys
- **Title:** Matching players without ID keys
- **URL:** https://opensourcefootball.com/posts/2020-08-19-matching-players-without-id-keys/
- **Author:** Darkweb, Analytics (per citation block on page)
- **Date:** 2020, Aug. 19 (per citation block on page)
- **Builds/measures:** Rebuilds a CPOE-by-target-depth chart for the top 30 quarterbacks of 2019 when the roster file's ID structure no longer matches nflfastR's. It joins play-by-play passers to roster headshots, team colours and logos without a shared ID key, with manual fixes for a suffix name and a relocated team.
- **Method & math:** Deterministic fuzzy-key join instead of modelling: match on first initial + last name + jersey number + team abbreviation, after splitting the passer name, normalizing one surname and remapping OAK to LV, then checking headshot URLs exist and substituting a default if broken. The displayed metric is smoothed CPOE as a function of air yards, weighted by target count.
- **Data source(s):** nflfastR play-by-play and roster-data roster file, 2019 season; nflfastR teams_colors_logos.
- **Code:** R — tidyverse, nflfastR, purrr/readr/glue, stringr, RCurl, ggplot2/ggimage.
- **GSE application:** Reasoning corpus / Usage — GSE would reuse the initial+surname+jersey+team fallback join as a data-pipeline repair when a feed's player IDs break, so player-level EPA/CPOE does not silently drop.
- **Disposition:** REFERENCE-ONLY — data-wrangling workaround for one broken join, useful as a pipeline note but not an engine method.

### 38. Neural Nets using R
- **Title:** Neural Nets using R
- **URL:** https://opensourcefootball.com/posts/2020-08-19-neural-nets-using-r/
- **Author:** Darkweb, Analytics (per citation block on page)
- **Date:** 2020, Aug. 19 (per citation block on page)
- **Builds/measures:** Builds a small neural network in R to predict yards after catch on pass plays, as a teaching example of Keras/TensorFlow from R. Its predictions are compared in distribution against actual YAC and against nflfastR's existing xYAC mean-yardage model.
- **Method & math:** Feed-forward regression network: 8 standardized numeric inputs (yardline_100, down, ydstogo, shotgun, air_yards, qb_hit, binary pass_location middle, roof as factor code), three dense layers of 64 ReLU units each with 25% dropout, single linear output, MSE loss, Adam optimizer, MAE metric. 90/10 train/test split, 20% validation split inside training, up to 500 epochs with early stopping (patience 20). Test MAE about 4.24 yards, loss about 46.4 — benchmarked only visually/by distribution against xYAC.
- **Data source(s):** nflfastR-data play-by-play, 2010-2019, pass plays only.
- **Code:** R — keras, reticulate, tfdatasets, tidyverse, ggplot2 (TensorFlow backend).
- **GSE application:** Fantasy-DFS / Matchup — GSE would treat this only as a prototype pattern for an xYAC regressor feeding expected fantasy points, after proper benchmarking against the existing xYAC model.
- **Disposition:** REFERENCE-ONLY — self-described toy/tutorial network with weak reported error and no win over the existing xYAC model shown.

### 39. The accumulation of QB hits vs passing efficiency
- **Title:** The accumulation of QB hits vs passing efficiency
- **URL:** https://opensourcefootball.com/posts/2020-08-19-the-accumulation-of-qb-hits-vs-passing-efficiency/
- **Author:** not shown on page
- **Date:** not shown
- **Builds/measures:** Tests the claim that accumulating QB hits wear a passer down within a game. At game level, EPA/dropback falls steeply as total hits rise (about +0.26 with zero hits to negative by 8-9 hits), but the article asks whether that is accumulation or simply bad, overmatched teams both allowing hits and passing poorly.
- **Method & math:** Constructs cumulative hits per team-game with cumsum and total hits per game, repairs the hit flag on no_play snaps by searching play descriptions for the hit marker or a sack, and validates team hit counts against official/SportRadar figures. The key design holds total game hits constant: bin games by total hits (0-1, 2-3, 4-5, 6-7, 8-9, 10+) and plot mean EPA against cumulative hits within each bin, with linear smooths. Within bins the lines are essentially flat — no accumulation effect; the raw relationship is selection/game script.
- **Data source(s):** nflfastR play-by-play, 2015-2019 pass plays; official NFL QB-hit data / SportRadar for a spot check.
- **Code:** R — tidyverse, stringr, ggplot2, ggsci, scales.
- **GSE application:** Health / Situation / Reasoning corpus — GSE would cite this as a negative result: do not apply an in-game cumulative-hit fatigue penalty to a QB projection; total pressure allowed is a team-quality signal instead.
- **Disposition:** NEW METHOD NOT YET IN GSE DOCS — the hold-total-hits-constant binning is a clean causal-check design and a documented negative result worth filing so the engine does not invent a hit-accumulation effect.

### 40. Wins Above Expectation
- **Title:** Wins Above Expectation
- **URL:** https://opensourcefootball.com/posts/2020-08-19-wins-above-expectation/
- **Author:** Carl, Sebastian (per citation block on page)
- **Date:** 2020, Aug. 19 (per citation block on page)
- **Builds/measures:** Builds a simple luck/efficiency visual for 2019: for each team, the share of its snaps (offence plus defence) played while its win probability was above 50%, compared with its actual win percentage. The difference, in percentage points, is labelled win percentage over expectation and ranked in a bar chart.
- **Method & math:** Uses nflfastR's Vegas-line win probability (vegas_wp), not the pure model WP. Offensive share uses plays where vegas_wp > 0.5, defensive share where vegas_wp < 0.5 from the opponent perspective, combined over all pass/run snaps. Actual win percentage counts ties as half a win. Difference = 100 × (win% − WP-share%). The 50% threshold is stated as arbitrarily chosen; no regression, shrinkage or validation.
- **Data source(s):** nflfastR play-by-play, 2019 season (vegas_wp field, which embeds the Vegas line).
- **Code:** R — tidyverse, nflfastR teams_colors_logos, ggplot2, ggpmisc, ggthemes, magick/grid.
- **GSE application:** Team ratings / Market price-check — GSE would use the WP-share vs actual-wins gap only as a quick luck flag on a team's record, noting it inherits the market line because vegas_wp is the input.
- **Disposition:** REFERENCE-ONLY — deliberately simple, arbitrary-threshold descriptive chart; weaker than Pythagorean / EPA expected-wins methods GSE already has.

### 41. PFR's Bad Throw Percentage for Quarterbacks
- **Title:** PFR's Bad Throw Percentage for Quarterbacks
- **URL:** https://opensourcefootball.com/posts/2020-08-18-pfrs-bad-throw-percentage-for-quarterbacks/
- **Author:** Carl, Sebastian (per citation block on page)
- **Date:** 2020, Aug. 18 (per citation block on page)
- **Builds/measures:** Scrapes Pro Football Reference's 2019 advanced passing table once, saves it locally, cleans team abbreviations and player names, and plots quarterbacks' Bad Throw Percentage against average depth of target (intended air yards per attempt), for passers with over 180 attempts. The subtitle flags Tannehill and Prescott as regression candidates for 2020.
- **Method & math:** No model — an rvest HTML-table scrape plus a scatterplot with league-mean reference lines and a linear smooth of bad-throw rate on depth of target. Bad Throw Percentage is PFR's charted share of throws that were not catchable with normal effort, excluding spikes and throwaways. The regression comment is visual judgement, not a fitted forecast or validation.
- **Data source(s):** Pro Football Reference 2019 passing_advanced page; nflfastR teams_colors_logos for colours/logos.
- **Code:** R — tidyverse, rvest, ggplot2, ggrepel, ggthemes, scales, nflfastR.
- **GSE application:** Reasoning corpus / Matchup — GSE would add PFR bad-throw rate, conditioned on depth of target, as a charted-accuracy context signal for a QB matchup note, not as a rating input on its own.
- **Disposition:** REFERENCE-ONLY — scraping tutorial plus descriptive plot of an external charted stat, no transferable method beyond the data pull.

---

## 3. Synthesis — disposition totals and what is new for GSE

### Totals across all 42 articles

| Disposition | Count | Article indices |
|---|---|---|
| ALREADY EXTRACTED (Oct 17) | 4 articles, carrying 5 methods | 15 (xFG), 22 (density/completion surface), 24 (CPOE via GAMM), 26 (expected turnovers); the 5th method — the 4th-down decision engine — traces to the EP/WP machinery in article 7, counted under DUPLICATE below |
| NEW METHOD NOT YET IN GSE DOCS | 15 | 0, 1, 2, 3, 4, 5, 10, 11, 12, 13, 16, 17, 19, 25, 39 |
| DUPLICATE-OF-EXISTING-GSE | 8 | 6, 7, 9, 14, 29, 30, 34, 35 |
| REFERENCE-ONLY | 15 | 8, 18, 20, 21, 23, 27, 28, 31, 32, 33, 36, 37, 38, 40, 41 |
| **Total** | **42** | |

### Top 5 NEW methods for GSE, ranked by value

1. **Bayesian multilevel team ability from EPA, Student-t version (article 4 — Estimating Team Ability From EPA).** Layer: Team ratings. Partial pooling with opponent adjustment and posterior uncertainty is the principled core every other layer reads from; the Student-t likelihood fixes exactly the failure mode raw EPA has (one 99-yard fumble return swinging a defense ~8 ranking spots). Highest value because it upgrades the input all reasoning starts from.
2. **Coverage classification from tracking frames with a CNN in torch (article 5 — Computer Vision with NFL Player Tracking Data).** Layer: Matchup. ~78% single-frame coverage-family accuracy from Big Data Bowl tracking, permutation-invariant by design. GSE's matchup layer needs what defenses actually ran; this is the only article in the 42 that manufactures scheme labels from tracking data GSE can obtain.
3. **Team-specific home field advantage via random-slope mixed model (article 11 — Analyzing Home Field Advantage).** Layer: Venue-Weather-Refs / Team ratings. Directly corrects a live GSE input: league HFA is time-varying and was near zero in 2019-2020 in this estimate, and team-specific HFA should only be applied when statistically distinguishable from zero. A flat home number is a known-wrong constant this replaces.
4. **Penalty-EPA decomposition with a stability-based selective rule (article 10 — Exploring Stability and Predictive Power of Penalties).** Layer: Venue-Weather-Refs / Team ratings. Almost nothing else in the 42 feeds the refs layer at all. Re-pricing nullified plays splits flag value from play value; the split-period stability audit says which foul classes carry signal (false start, offside) and which are noise to strip from ratings.
5. **QB volatility: modified Gini + VOLoe GAM residual (article 2 — Exploring Quarterback Volatility with Gini Coefficients).** Layer: Matchup / Reasoning corpus. GSE rates quarterbacks on mean EPA; this adds the variance axis — high-VOLoe passers are regression risks (about -0.08 EPA/play the next season in the article's look-ahead). It widens or narrows outcome distributions in reasoning instead of moving the mean, which is the correct shape for a volatility signal.

Honorable mentions, all NEW and cataloged above: run/pass tendencies with within-QB expectation plus a Stan team random effect (16, Usage layer); the GAMM three-part QB decomposition — play quality / air / YAC with receiver and defense random effects (13, Matchup); expected fantasy points from the full xYAC distribution by simulation (19, Fantasy-DFS); the non-QB draft surplus-value chart (0, offseason roster reasoning); TRAP / high-value-touch share (25, Usage/Fantasy-DFS); WR1-split defensive EPA (3, Matchup); RERUN era-adjusted punter hangtime/distance residuals (17, the closest thing in the 42 to a special-teams method).

### Layer coverage check (against GSE's weekly-cycle layers)

- **Usage:** fed by 16, 25, 14, 19. Covered.
- **Health:** fed by nothing directly. Article 39 (QB hits) is a *negative* health-adjacent result — no in-game hit-accumulation effect — filed so the engine does not invent one. The site is a play-by-play/tracking methods library, not an injury source; health stays an external-data layer.
- **Matchup:** fed by 3, 5, 13, 24, 30, 32. Strongest coverage after ratings.
- **Situation:** fed thinly — 12 (feature windows), 18 (rest, null result), 31 (excitement index, content-only). Situational reasoning still rests mostly on GSE's own harvest corpus, not this site.
- **Venue/Weather/Refs:** fed by 10 and 11 (refs + home field). **Weather: zero articles in the 42 model weather.** Named here so the absence is on the record, not discovered later.
- **Market price-check:** nothing in the 42 prices against a book. Article 40 (Wins Above Expectation) uses Vegas WP as an input and article 7 documents WP-with-spread; both are flagged in their entries as market-contaminated inputs, consistent with MATCHUP FIRST / BOOKS LAST.
- **Reasoning corpus / Team ratings / Fantasy-DFS:** the bulk of the site — 29 of 42 entries land primarily in ratings, corpus, or fantasy.

---

## 4. Gap audit (Garrett's standard — what was NOT done, with counts)

**NOT read: 0 of 42 articles left unread at content level.**
- 40 articles were read end-to-end from the site render, paged to the final line (longest: article 7 at 2,016 lines; article 5 at 1,663).
- 1 article (26, Expected Turnovers) was read from the render through line 601 of 840, then finished from its repo `.Rmd` source (Visuals + Conclusion sections) after the browser service rate-limited. Content-equivalent; the article's figures were read as code/captions, not re-rendered.
- 1 article (27, Getting into sports analytics) was read in full from its repo `.Rmd` source only, for the same reason.
- The coordinator's own spot-read of article 0 stopped at line 230 of 350 on the same 429 limit; it is NOT counted as a read — Batch A's full paged read of article 0 is the read of record.

**NOT returned by any source: 0.**
- Homepage index: 42 posts. Repo `_posts/`: 42 directories. Repo article sources: 42 `.Rmd` files. All three counts agree; the 1:1 title-to-directory mapping was verified for all 42.
- Transient failures, all closed: browser-service HTTP 429 rate limits hit 3 times during the pass (coordinator article-0 tail; Batch A once, recovered by pausing and paging sequentially; Batch B articles 26/27, closed via repo source). No article, page, or repo path failed permanently.

**URL-only stubs: 0.** Every entry above carries method, data, code, and a GSE application read from the article itself. The nearest thing to a stub: author/date metadata — 27 entry fields across the 42 entries read "not shown on page / not shown," because the site's extracted text drops bylines on most older posts. Dates were recovered from post URLs in those cases; authors were left blank rather than guessed, except articles 26 and 27, whose authors come from the `.Rmd` front matter (named as such in their entries).

**Finds not evaluated: 0 of 42 articles.** Every article carries a disposition and a GSE layer. Two sub-limits, stated plainly:
- 0 of the 42 articles' codebases were executed or re-run. Methods are evaluated as documented, with the articles' own validation numbers (or their absence) recorded per entry. Nothing here is a replication.
- Figures and tables inside articles were read as rendered text/captions; underlying data files in the repo (e.g., the draft chart's contracts CSV) were inventoried, not re-analyzed.

**Researched-but-not-wired: 15 of 15 NEW methods.** This dissection documents; it does not build. All 15 NEW-disposition methods (Section 3) are in GSE's catalog now and in no engine code. Wiring order, if Garrett directs a build pass, follows the Top 5 ranking. The 4 ALREADY EXTRACTED articles' methods were extracted to GSE docs on Oct 17 per the task record; their wiring state inside the engine was not re-verified in this pass (that is an artifact-level check against the Sports repo, a separate job).

**Repo-side caveats, on the record:**
- The local clone used for the cross-check had an incomplete working-tree checkout at inspection time (1,246 paths outside `_posts/` showed as not checked out — site chrome and `docs/` assets). All 42 article directories and all 42 `.Rmd` sources were verified present, so no article content depends on the missing paths. The clone filled the VM's 512 MB `/tmp` tmpfs during this pass and was deleted after its facts were extracted; re-cloning is a one-command job if a build pass needs the sources.
- One background search result suggested the Oct 16/17 extraction's processing log lives in the Sports repo at `docs/research/2026-10-16/open-source-football/processing_log.md`; a direct local check of that path failed in this session, so its location is recorded here as UNVERIFIED. The five extracted methods themselves were verified against the articles directly (articles 15, 22, 24, 26 read in full in this pass; article 7 for the 4th-down provenance) and do not depend on that log.
- Site-vs-source drift inside articles: none found. Repo HEAD is dated 2025-05-14 and the site has not changed since — see Section 1. The one living document (article 0, draft chart) will change values when its next draft class is added; its entry records the update history through May 2025.

**Bottom line:** 42 found, 42 read, 42 dispositioned, 0 stubs, 0 unread, 0 unevaluated. The open work this dissection creates is exactly one thing: 15 documented-not-wired methods, ranked in Section 3, waiting on Garrett's word to build.
