# [1138] Investigating Fouling Efficiency in Football Using Expected Booking (xB) Model (arXiv:2401.08718)

**Citation:** Azmat, A. & Yi, S. S. (2024). *Investigating Fouling Efficiency in Football Using Expected Booking (xB) Model*. arXiv:2401.08718. URL: https://arxiv.org/abs/2401.08718
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:2401.08718v1 [cs.LG]).
**Verdict:** ADAPT

The xG-style "expected booking" idea ports directly to an NFL "expected flag" model (per-foul booking probability) that GSE could feed into drive-level and penalty-prop modeling, but the paper itself is soccer-only, small-data, and methodologically thin.

## 1. Research question
Can the probability that a football (soccer) foul results in a yellow card be estimated from match context, in the same spirit as expected goals (xG) estimates goal probability — i.e., an "Expected Booking (xB)" metric that can rate the fouling efficiency/tactical discipline of teams and players?

## 2. Dataset / schema
- Source: StatsBomb open event data + StatsBomb 360 data (freeze-frame player locations at events), via the Socceraction package for feature computation.
- Experiment 1–2: 957 non-dangerous foul events from 210 matches across 4 competitions.
- Experiment 3: ~20,000 non-dangerous foul events from 2,690 matches — "all of publicly released men's event data by StatsBomb at the writing of this paper": Serie A 2015/2016 (380 matches, 2,716 fouls), Premier League 2015/2016 (380, 2,418), La Liga 2015/2016 (380, 3,388), Ligue 1 2015/2016 (376, 2,321), Bundesliga 2015/2016 (304, 2,013), Indian Super League 2021/2022 (114, 619), FIFA World Cup 2018 (64, 385), FIFA World Cup 2022 (64, 370), UEFA Euro 2020 (51, 329).
- Label: binary — yellow card issued for the foul or not. Non-dangerous fouls filtered by excluding fouls due to handball, dangerous play, foul out, dive, 6-seconds, backpass pick. Explicitly excludes bad-behavior fouls.
- Public access: StatsBomb free data (https://statsbomb.com/what-we-do/hub/free-data/).

## 3. Method / model
Three iterative experiments: (1) six features on 957 fouls, comparing Decision Tree, Logistic Regression, Gradient Boosting, XGBoost on an 80/20 random split; (2) same data plus VAEP offensive value and two 360 spatial features (attackers count ahead of foul location, defenders count between foul and goal), comparing Gradient Boosting vs XGBoost; (3) XGBoost on ~20,000 fouls from event data only (no 360 features). Analysis section: applies the trained model to FIFA World Cup 2022, computing cumulative xB per match vs actual bookings per match, and player-level xB/B ratio vs fouls per 90.

## 4. Equations & assumptions
No equations stated for the xB model itself (it is a classifier-output probability). The VAEP feature is quoted from Decroos et al. (2019): V(ai, x) = ΔPscores(ai, x) + (−ΔPconcedes(ai, x)).
Assumptions: (1) non-dangerous fouls, as filtered, are the "tactical" component of fouling and can be modeled independently of bad-behavior bookings; (2) yellow-card issuance 18× more frequent than red cards (cited to Poli et al. 2020) justifies modeling only yellow cards; (3) booking probability depends on match context (minute, goal difference, VAEP offensive threat) and foul history, not on referee identity (no referee fixed effects); (4) cumulative per-foul probabilities are comparable across matches for rating teams/players.

## 5. Features / target
Features: minutes (exact minute of foul), distance to goal, angle to goal (to defending goal's midpoint), foul count player (fouls by fouling player in this match up to now), foul count team (same, team-level), goal difference, VAEP offensive (ΔPscores of the pre-foul action), attackers count ahead of foul location (360 freeze frame), defenders count between foul location and defending goal (360 freeze frame). Target: binary yellow-card issuance for the foul; the model's predicted probability is the xB of that foul; team/player ratings = sum of xB per match, and xB/B ratio.

## 6. Validation design
80/20 random train/test split (NOT time-ordered — fouls from the same match can appear on both sides). Baselines: Decision Tree, Logistic Regression, Gradient Boosting, XGBoost (experiment 1); Gradient Boosting vs XGBoost (experiment 2). Metrics: accuracy, precision, recall, F1, ROC AUC. Experiment 3 reports XGBoost only. The FIFA World Cup 2022 analysis is a post-hoc descriptive application, not a holdout validation. Class imbalance handling not stated.

## 7. Numerical results / baselines
- Experiment 1 (957 fouls, 6 features): Decision Tree — Acc 0.55, Prec 0.45, Rec 0.50, F1 0.47, AUC 0.59; Logistic Regression — Acc 0.57, Prec 0.42, Rec 0.16, F1 0.23, AUC 0.56; Gradient Boosting — Acc 0.58, Prec 0.47, Rec 0.32, F1 0.38, AUC 0.59; XGBoost — Acc 0.59, Prec 0.50, Rec 0.47, F1 0.48, AUC 0.61.
- Experiment 2 (+VAEP, +2 spatial features): Gradient Boosting — Acc 0.76, Prec 0.65, Rec 0.76, F1 0.70, AUC 0.82; XGBoost — Acc 0.79, Prec 0.71, Rec 0.75, F1 0.73, AUC 0.84. Paper states accuracy improved 20% and ROC AUC 23% with XGBoost vs experiment 1.
- Experiment 3 (~20,000 fouls, event data only, XGBoost): Accuracy 0.83, Precision 0.83, Recall 0.78, F1-Score 0.82, ROC AUC 0.91.
- WC 2022 descriptive: Morocco noted as best fouling efficiency (high foul count, low bookings, high xB/B ratio); Marcos Acuña (Argentina) top individual: xB 3.78, B 3, ratio 1.26; then Woo-Young Jung xB 2.42, B 2, ratio 1.21.
- Exact chart readings from figures 7–9 (xB/match vs bookings/match scatter, ratio vs fouls scatter) not numerically extractable from the text — approximate only.

## 8. Code / data availability
None stated (no code link, no dataset DOI). Data is StatsBomb open data; Socceraction is open source (github.com/ML-KULeuven/socceraction).

## 9. Leakage & limitations
- **No referee effects**: yellow-card issuance is heavily referee-dependent; omitting referee identity is a major omitted variable (the model may learn league/referee style instead of foul characteristics).
- **Random splits, not time-ordered**: in experiment 3, fouls from the same matches/teams appear in both train and test; test AUC 0.91 likely optimistic.
- **Crude "non-dangerous" filter** based on event-type labels, no verification that tactical fouls are isolated.
- **Class imbalance not discussed**; 83% accuracy without a majority-class baseline makes the headline numbers weak (e.g., if ~17% of fouls are booked, a no-skill classifier gets ~83%).
- **Subjective filtering of "bad behavior"** fouls introduces selection bias.
- **External validity to NFL**: this is soccer; no NFL analogue tested. Concepts (minute → game clock, distance/angle → field position) transfer, but booking mechanics differ fundamentally from NFL flags (no discretionary "booking" equivalent; penalties are discrete events with set yardages).

## 10. GSE overlap
GSE's engine-benchmark lane has extensive defensive metric coverage, but a penalty/flag model is not in the existing-research map (checked conceptually — no "xFlag" entry). Closest GSE-adjacent work: xG analogues for scoring efficiency are covered in the 750 corpus; the *booking* angle (expected-discipline) is new territory. GSE predicts SPREAD/MONEYLINE/TOTAL only — no prop markets — so a flag model would feed drive-level simulation, not a direct prop product.

## 11. GSE implementation spec
Build an NFL "xFlag" (expected-penalty) model: per-play penalty probability conditioned on game state and officiating. Data: nflverse play-by-play (penalty events with yards, down, distance, field position, penalty type) + penalty detail for ~2018–2025 seasons. Features: down/distance, yardline, score differential, time remaining, quarter, home/away, team prior penalty rate, referee crew (nflverse has roster/officiating data), EPA of the pre-flag play (VAEP analog), pass/run, shotgun/no-huddle, defender pressure rate (FTN charting if available). Model: XGBoost or LightGBM binary classifier, target = flag on the play. Outputs: expected flags per game by team (xFlags), per-referee-crew tendencies, drive-level expected free yards. Use: feed xFlag expectations into GSE's drive/game simulation to adjust totals and spread; secondary: flag-related derivative analysis (e.g., drive-extension probabilities feeding win-prob). Effort: ~1–2 weeks for a competent engineer with nflverse access.

## 12. Reproducible test
Dataset: nflverse play-by-play 2021–2024 regular seasons. Train on 2021–2022, test on 2023–2024 (time-ordered, team-out-of-sample for a subset). Metric: ROC AUC and calibration slope vs a naive team-average flag-rate baseline. Baseline to beat: per-team historical penalty rate per play; success if xFlag model achieves ≥0.55 AUC out-of-sample AND calibrated expected team flags improve drive-level total prediction vs no-penalty model on the same window.

## 13. Acceptance / rejection gate
ADOPT the xFlag sub-model into GSE's game simulation only if: (a) out-of-sample AUC ≥ 0.58 on 2023–2024 holds-out AND (b) adding xFlag to the totals simulation reduces MAE on closing totals by ≥ 0.3 points over 2023–2024 (n≈540 games). Otherwise keep as research note only.

## 14. Improvement experiment
Add referee-crew embeddings (learned per-crew booking tendency vectors from past seasons) and model the *joint* distribution of flag occurrence and flag yardage with a two-stage hurdle model (flag/no-flag → yardage conditional on flag). Hypothesis: crew fixed effects capture the "referee style" variance this paper missed entirely and should deliver the largest single AUC lift.
