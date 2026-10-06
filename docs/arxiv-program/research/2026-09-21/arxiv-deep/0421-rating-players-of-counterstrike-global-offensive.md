# [0421] Rating Players of Counter-Strike: Global Offensive Based on Plus/Minus value (arXiv:2409.05052v1)

**Citation:** Hongyu Xu and Sarat Moka (2024). *Rating Players of Counter-Strike: Global Offensive Based on Plus/Minus value*. arXiv:2409.05052v1. URL: https://arxiv.org/abs/2409.05052v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1506 lines).
**Verdict:** ADAPT — port the regularized adjusted plus/minus design (design matrix of ±1/0 over participants, Bayesian prior from a box-score rating) to NFL snap-level player effect estimation, replacing the random split with strict season/week temporal validation.

## 1. Research question
Can player ratings for CS:GO be derived from team outcomes alone — without box-score statistics — using adjusted plus/minus (APM) regression, and do regularized/Bayesian variants of APM predict player performance better than the standard Rating2.0 box-score metric? It is a direct import of the basketball RAPM idea into esports.

## 2. Dataset / schema
HLTV match data: "big event" matches from 2018–2023, 500+ players (the example design matrix schema shows 518 player columns). Train on 2018–2022, evaluate on future 2023 matches per the paper's framing. Schema: match ID, team 1 roster, team 2 roster, ResultDiff (team 1 score minus team 2 score) as the target, and each player's standardized Rating2.0 used as a Bayesian prior. Players with fewer than 50 matches are excluded. Access: HLTV public data; not stated as downloadable in the paper but HLTV is a public source.

## 3. Method / model
Design matrix X: rows are matches, columns are players; X_ij = +1 if player j is on team 1, −1 if on team 2, 0 if absent. Target: ResultDiff. Models compared: OLS, ridge regression, elastic net, logistic regression variants, Bayesian linear regression, and hierarchical Bayesian with the player's standardized Rating2.0 as the prior mean. Hyperparameters: 100 alpha values on [0, 1] for the elastic-net mixing parameter; penalty strength selected by 10-fold cross-validation. Evaluation: random 80/20 split plus 10-fold CV; Pearson correlation test between predicted and true player plus/minus on test data.

## 4. Equations & assumptions
The paper states the model family in prose with standard forms; the core specification is:
- ResultDiff_i = Σ_j X_ij β_j + ε_i, with X_ij ∈ {+1, −1, 0} as above
- Ridge/elastic-net: penalized least squares with L1/L2 penalties; 100 alpha values on [0,1] searched via 10-fold CV
- Bayesian variant: β_j ~ prior centered on standardized Rating2.0 (hierarchical version pools across players)
Assumptions: (a) player effects are additive and constant across matches and roles; (b) teammate/opponent effects are fully captured by the linear design; (c) Rating2.0 is a valid prior center (i.e., the box-score metric is unbiased on average); (d) excluding sub-50-match players does not bias the estimated distribution of talent.

## 5. Features / target
Features: the ±1/0 participation design matrix (518 player columns in the example) plus standardized Rating2.0 as a Bayesian prior. Target: ResultDiff (team 1 score minus team 2 score) per match; player-level evaluation uses predicted vs. true plus/minus on test matches. Prediction horizon: per-match score differential.

## 6. Validation design
Random 80/20 train/test split and 10-fold cross-validation on the pooled 2018–2023 data, with the narrative claim of training on 2018–2022 and evaluating on 2023. Baselines compared: OLS, ridge, elastic net, logistic, elastic-logistic, Bayesian, hierarchical Bayesian, and the raw Rating2.0 metric. Metrics reported: Pearson-test p-values for predicted-vs-true plus/minus correlation on test data; cross-validated penalized likelihood for tuning. Critically, the main split is random over pooled matches — not time-ordered — so same-roster matches can straddle train and test.

## 7. Numerical results / baselines
Table II — p-value of Pearson test of correlation between players' true plus/minus and predicted plus/minus on test data (exact):
- Ridge plus/minus: 0.57
- Bayesian plus/minus: 0.03323
- Logistic plus/minus: 2.092e-05
- Elastic logistic plus/minus: 2.2e-16
Also reported: Pearson p-value of 0.293 for the correlation between initial Rating2.0 and plus/minus. Paper's claim: logistic, elastic-logistic, and Bayesian models' predictions are "highly correlated" with actual plus/minus, showing effectiveness. My interpretation: p-values are not effect sizes — with hundreds of players, tiny correlations are "significant." The paper reports no correlation magnitudes, no MAE, no log loss, no calibration. The ridge p-value of 0.57 (non-significant) versus the logistic variants' extreme significance suggests the interesting variation is in the binary-outcome framing, but without effect sizes this is uninterpretable as predictive evidence.

## 8. Code / data availability
Data: HLTV (public website; no download link stated). Code: none stated.

## 9. Leakage & limitations
Adversarial: (a) Random 80/20 split over pooled 2018–2023 matches means rosters/teams repeat across train and test — the model can memorize team strength via player dummies; this is the classic APM leakage pattern. (b) The Bayesian prior (Rating2.0) is computed from the same matches, including test-period matches — prior leakage. (c) Identifiability: teammates who always play together have collinear columns; the paper does not discuss how ridge/Bayes resolves persistent five-man units (CS:GO rosters are stable). (d) Excluding <50-match players induces survivorship bias — the estimated talent distribution is conditional on survival. (e) No effect sizes, no calibration, no out-of-sample predictive metric on match outcomes. (f) "Big events" only — selection bias toward elite tournaments. External validity to NFL: the design transfers naturally to snap-level data (each snap is a "match" with 22 participants), but football's 11-man units with near-fixed personnel make collinearity far worse than CS:GO's 5-man rosters.

## 10. GSE overlap
New capability. The existing-research-map's rating-model coverage is Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, Plackett-Luce, Dixon-Coles, Massey/Sagarin/Colley — all team-level or pairwise-comparison systems. There is no adjusted plus/minus / RAPM-style player-effect decomposition anywhere in the map, and no snap-level player value attribution. The map's gaps include "methods that transfer player/context adjustment to NFL props" — a snap-level APM for individual player props (e.g., isolating a WR's effect on team EPA from his QB and line) fits that gap exactly.

## 11. GSE implementation spec
Build snap-level adjusted plus/minus for the NFL: (1) Data: nflverse play-by-play 2020–2025, expanding each play into 22 participant slots (offense/defense × 11) — computationally heavy, so start with skill-position subsets (QB/RB/WR/TE on offense; or unit-level for OL/DL). (2) Design matrix per play: +1 offensive participant, −1 defensive participant (or separate offensive/defensive coefficient blocks to handle the two-sided scoring structure). (3) Target: play EPA (continuous → ridge/elastic-net) or drive success (binary → elastic-logistic). (4) Prior: PFF grade or the player's trailing-season EPA rate, standardized, as the Bayesian prior mean — mirroring the paper's Rating2.0 prior. (5) Regularization: elastic net with alpha grid on [0,1], 10-fold CV by week. (6) Serve: per-player APM coefficients feed the props engine as matchup adjustments (e.g., a CB's defensive APM vs. the opposing WR's offensive APM). Effort: 3–4 days for the prototype on skill positions; full 22-man is a scaling project.

## 12. Reproducible test
Dataset: nflverse play-by-play, 2022–2024 seasons for fitting, 2025 season (Weeks 1–3 available) for evaluation — strictly time-ordered, expanding-window: fit through week w, predict week w+1. Metric: out-of-sample R² on play EPA and Brier/log-loss on drive success vs. the no-APM baseline (context-only EPA model). Baseline to beat: the context-only expected-EPA model from ledger 0419 §11. Minimum: full 2024 season as the test window, all plays.

## 13. Acceptance / rejection gate
ADOPT snap-APM if, on the 2024 season walk-forward test, adding player APM coefficients improves play-EPA out-of-sample R² by ≥ 0.01 AND the top-decile offensive APM players beat their yardage prop lines at a rate exceeding the baseline model by ≥ 2 percentage points (hit-rate lift on ≥ 200 graded props). REJECT if the APM coefficients are unstable week-to-week (median absolute rank correlation of player APM across consecutive 4-week windows < 0.5) or if all predictive lift vanishes once team fixed effects are included — i.e., the model is just rediscovering team strength.

## 14. Improvement experiment
The paper never tests whether the Bayesian Rating2.0 prior actually helps versus pure regularization, nor does it handle the collinearity of stable units. Run the ablation: ridge vs. elastic net vs. Bayesian-with-PFF-prior vs. Bayesian-with-shrunk-prior, and add a unit-level random effect (offensive line as a group, secondary as a group) in a hierarchical model so individual APM is estimated net of unit effects. The hypothesis: individual WR/RB APM becomes predictive only after absorbing OL/secondary unit effects — the experiment the paper's CS:GO setting (stable 5-man rosters) needed but never ran, and the one that decides whether snap-APM is signal or team-strength relabeling in football.
