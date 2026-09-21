# [0225] Glocal Explanations of Expected Goal Models in Soccer (arXiv:2308.15559v1)

**Citation:** Cavus, M., Stańdo, A., & Biecek, P. (2023). *Glocal Explanations of Expected Goal Models in Soccer*. arXiv:2308.15559v1. URL: https://arxiv.org/abs/2308.15559
**Ledger completed:** 2026-09-21. **Read:** full text (local file), entire text including methodology and applications (remainder is references).
**Verdict:** ADAPT — the glocal XAI machinery (aggregated SHAP + aggregated ceteris-paribus profiles for groups of observations) transfers directly to GSE's NFL EPA/efficiency models: decomposing a team's or unit's efficiency change into per-feature contributions is exactly the Napoli/Lille analysis applied to EPA/play, and the corpus has no group-level model-explanation work.

## 1. Research question
Local XAI explains one observation, global XAI explains the whole model — but for soccer performance analysis, explaining a *group* of observations (a player's or team's shots over a period) is more useful. The paper formalizes "glocal" (between local and global) explanations and introduces two tools: aggregated SHAP (aSHAP), exploiting SHAP's additivity to sum per-shot contributions over a group, and aggregated ceteris-paribus profiles (AP), averaging per-observation profiles over a group. Applications: young-player scoring potential, goalkeeper blind spots, and team performance-change decomposition.

## 2. Dataset / schema
Pre-trained xG model from Cavus & Biecek (2022), trained on Understat event data: 315,430 shots from 12,655 matches in the German Bundesliga, English Premier League, Spanish La Liga, French Ligue 1, and Italian Serie A, seasons 2014-15 through 2020-21. Features (Table 1): minute (continuous), homeAwayTeam (home/away), situation (Direct freekick, From corner, Open play, Penalty, Set play), shotType (Head, Left foot, Right foot, other), lastAction (Pass, Cross, Rebound, Head Pass, +35 more levels), distanceToGoal (continuous), angleToGoal (continuous). Application subsets: most valuable U18 players of top-5 leagues 2022/23 (Transfermarkt); three U30 goalkeepers playing all league matches; SSC Napoli 2021/22 vs 2022/23; Lille OSC 2020/21 vs 2021/22. No new data collected; all existing and publicly available.

## 3. Method / model
- Glocal explanation defined as e_GL[f(X), M] = e_GL(f, {(x_i, y_i)}_{i=1}^m) for a group M of m < n observations — via explanation aggregation (train on full data, explain the group's observations, aggregate).
- Aggregated SHAP: per-shot SHAP f_i(X) = φ_0 + Σ_{j=1}^p φ_{ji} (Eq. 6); summed over the group: f_A(X) = φ_0 + Σ_{i=1}^n Σ_{j=1}^p φ_{ji} (Eq. 7), leveraging additivity and local accuracy. Implemented in the shapviz package of the DALEX XAI ecosystem.
- Aggregated profiles: g^j_AP(z) = E_{X^{-j}}[f(X^{-j|=z})] (Eq. 8), estimated by averaging k ceteris-paribus profiles ĝ^j_AP(z) = (1/k) Σ_{i=1}^k f(x^{ij|z}) (Eq. 9). Differs from PDP only in that AP aggregates a group's profiles rather than the whole dataset's.
- Applications: AP on distanceToGoal/angleToGoal for U18 player scoring potential; AP on situation/shotType/homeAway for goalkeeper blind spots via xGAOT (expected goals against on-target, xS = 1 − xG complement on on-target shots); aSHAP decomposition of team xG across seasons.

## 4. Equations & assumptions
Exact equations, copied faithfully:
- e_L[f(X), x_i] = e_L(f, x_i) (1); e_G[f(X), D] = e_G(f, {(x_i,y_i)}_{i=1}^n) (2); e_GL[f(X), M] = e_GL(f, {(x_i,y_i)}_{i=1}^m) (3).
- SHAP decomposition: f(X) = φ_0 + Σ_{j=1}^k φ_j (4).
- Shapley: φ_j(f) = Σ_{k∈{1..p}/{j}} |k|!(p−|k|−1)!/p! [f(x_k)] (5).
- Aggregated SHAP: f_A(X) = φ_0 + Σ_{i=1}^n Σ_{j=1}^p φ_{ji} (7).
- Aggregated profile: g^j_AP(z) = E^{-j}_X[f(X^{-j|=z})] (8); estimator ĝ^j_AP(z) = (1/k) Σ_{i=1}^k f(x^{ij|z}) (9).
- xG variants: xG = Σ_i ŷ_i; xGOT = Σ_i y_i z_i; xGA = Σ_l ŷ_l (conceded); xGAOT = Σ_l y_l z_l (conceded on-target), z_i ∈ {0,1} on-target indicator.
- Assumptions: SHAP properties (symmetry, additivity, local accuracy) hold for the model; observations i.i.d. from P(X,Y); ceteris-paribus profiles are meaningful (features can be varied independently — correlated features distort AP); aSHAP aggregation is valid across the group's observations.

## 5. Features / target
xG model features: minute, homeAwayTeam, situation, shotType, lastAction, distanceToGoal, angleToGoal. Target: binary goal/no-goal per shot. Explanation targets: per-group aggregated SHAP values per variable (contribution to xG), per-group aggregated profiles (how a variable shifts predicted xG for the group).

## 6. Validation design
No train/val/test splits and no predictive benchmarking — this is a methodology + illustration paper using a fixed pre-trained xG model. "Validation" is by worked applications: do the glocal explanations surface plausible, interpretable performance stories (player potential groups, goalkeeper blind spots, team season-over-season change). Baselines: none; the comparison is between explanation levels (local vs global vs glocal) conceptually.

## 7. Numerical results / baselines
Exact numbers as stated:
- xG training data: 315,430 shots, 12,655 matches.
- U18 players 2022/23 shots/goals: Moukoko 35/7, Garnacho 24/3, Tel 20/5, Bynoe-Gittens 24/3, Ferguson 36/6. AP findings: for distanceToGoal 0–15, better group = Moukoko, Ferguson, Tel; above distance 20, Moukoko falls to the worse group; Tel slightly best overall; Bynoe-Gittens and Garnacho not competitive with the others.
- Goalkeepers: Marvin Schwabe (27, FC Köln, 54 conceded), Alex Remiro (27, RCD Espanyol, 69), David Raya (26, Brentford, 46). Schwabe better in all situations except Set Piece (blind spot) and all shot types except Head; no significant home/away differences.
- Napoli: distanceToGoal and angleToGoal contributions negative in 2021/22, positive in 2022/23 (championship season).
- Lille OSC: xG per shot 0.267 in title season 2020/21 vs 0.295 in the worse 2021/22 season; lastAction contributed −0.0041 (largest negative effect) in the worse season.
- Stated limitation: aSHAP has heavy computational steps.

## 8. Code / data availability
Code: https://github.com/adrianstando/glocal-explanations-of-xG-models. aSHAP implemented in the shapviz package of the DALEX ecosystem. Data: Understat (public), Transfermarkt (public). No new data.

## 9. Leakage & limitations
- Descriptive, not causal: aSHAP/AP describe the model's behavior on a group, not why the group changed; correlated features (distance/angle) distort ceteris-paribus profiles — acknowledged implicitly by focusing on marginal profiles.
- Application samples are tiny and hand-picked (5 players, 3 goalkeepers, 2 teams) — illustrative, not statistically powered.
- aSHAP is computationally heavy (exact Shapley over many observations × features); the paper flags this as the main limitation.
- Group definitions are analyst-chosen (U18 most-valuable, U30 ever-present GKs) — selection bias in the stories told.
- Soccer xG context only; the xG model itself is taken as given (no model validation in this paper).

## 10. GSE overlap
GSE's corpus covers NFL efficiency metrics and calibration, but has no group-level model-explanation work — nothing like SHAP aggregated by team-season to decompose efficiency changes. The corpus documents extensive metric benchmarking but not "why did this team's EPA/play change" decomposition. This is a new analytical capability: model-interpretation infrastructure for GSE's own EPA/play-efficiency models, not a duplicate.

## 11. GSE implementation spec
Apply glocal XAI to GSE's NFL EPA model:
1. Take GSE's existing play-level EPA model (features: down, distance, field position, personnel, formation, motion, air yards, etc.); compute per-play SHAP values with shapviz/DALEX or shap.
2. Aggregate by team-season (aSHAP): decompose each team's EPA/play into per-feature contributions — e.g., "Team X's EPA/play fell because their down/distance mix worsened (more 3rd-and-longs), not because of play design."
3. Aggregate by player-group (QB, RB room, receiver corps) for unit-level stories, mirroring the paper's player analysis.
4. Build aggregated ceteris-paribus profiles for key features (e.g., air yards, field position) per team to visualize scoring-potential curves — the AP analogue of the paper's Figs. 2–3.
Estimated effort: 1–2 days (SHAP on existing model + aggregation + visualization notebook).

## 12. Reproducible test
Dataset: GSE's play-level EPA model applied to nflverse 2023–2025 seasons. Compute team-season aSHAP decompositions; test: pick the 5 teams with the largest EPA/play swings from 2024 to 2025 and check whether the aSHAP decomposition attributes the swing to the same features a football analyst would name (down/distance mix vs efficiency conditional on state) — scored as agreement on the top-2 contributing features per team, target ≥ 4/5 agreement. Baseline: raw EPA/play deltas with no decomposition (which cannot attribute causes at all).

## 13. Acceptance / rejection gate
Adopt if the aSHAP team-season decompositions are stable (bootstrap over games within a season changes the top-3 contributing features for fewer than 20% of teams) AND correctly attribute the top-2 drivers for ≥ 4 of the 5 largest 2024→2025 EPA/play swing teams. Reject otherwise — in particular reject if aggregation washes out into noise (features flip sign across bootstrap resamples), since unstable explanations are worse than none.

## 14. Improvement experiment
Go beyond the paper by making the glocal explanations temporal: compute rolling (per-4-game-window) aSHAP for each team across the season and test whether feature-contribution shifts precede EPA/play regime changes by 2–3 weeks — i.e., do glocal explanations have leading-indicator value, not just post-hoc descriptive value? If rolling aSHAP detects, say, a team's air-yard distribution shifting before their EPA/play collapses, it becomes a genuine early-warning input for GSE's team-strength updates rather than a retrospective chart.
