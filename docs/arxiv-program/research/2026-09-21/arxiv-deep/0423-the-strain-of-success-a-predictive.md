# [0423] The Strain of Success: A Predictive Model for Injury Risk Mitigation and Team Success in Soccer (arXiv:2402.04898v1)

**Citation:** Everett et al. (2024). *The Strain of Success: A Predictive Model for Injury Risk Mitigation and Team Success in Soccer*. arXiv:2402.04898v1. URL: https://arxiv.org/abs/2402.04898v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 796 lines).
**Verdict:** ADAPT — port the injury-risk → squad-selection → expected-points simulation loop (XGBoost injury model + Maher-style Poisson match model + MCTS squad optimizer) to NFL roster/load management, replacing the Gaussian injury-duration draw and random-shuffle CV with survival modeling and strict temporal validation.

## 1. Research question
Can player injury risk be predicted from workload and physical features, and can a team improve its expected season points — and reduce wage waste on injured players — by selecting squads with an optimizer (MCTS) that accounts for predicted injury risk, rather than greedily fielding the strongest eleven every match?

## 2. Dataset / schema
English Premier League 2017/18 and 2018/19 seasons, 760 games. On-ball event data from StatsBomb; player workload/physical features engineered from match events; injury records from Transfermarkt. Schema key columns: player ID, match date, minutes played, distance/intensity workload features, injury occurrence (binary), injury length (days), team, VAEP-derived player values. Code and data pipeline: https://github.com/Sentient-Sports/Strain-of-Success. Transfermarkt injury data quality is a known weak point (reporting inconsistency) — see §9.

## 3. Method / model
Three components: (1) XGBoost classifier predicting per-player injury risk for the upcoming match from workload features. (2) Maher-style Poisson match model: team strength = sum of selected players' VAEP values; scorelines simulated from Poisson distributions; expected points V(C,t) = 3·Pr(win|C) + Pr(draw|C). (3) Squad selection as an MDP solved with Monte Carlo Tree Search (MCTS) using UCB1 and progressive widening: the planner chooses the eleven to maximize season expected points net of predicted injury risk. Rollouts simulate the first three transitions with injuries enabled, then assume no further injuries. Injury length is sampled from a Gaussian fitted to observed injury lengths. Team-season simulations: 100 per team for MCTS, 1,000 per team for the greedy baseline.

## 4. Equations & assumptions
Stated in the paper:
- Expected points of team C at time t: V(C,t) = 3·Pr(win|C) + Pr(draw|C)
- MDP: G = ⟨S, A, P, R, γ⟩; Bellman optimality: V(s) = max_a (R(s,a) + γ Σ_{s'} Pr(s'|s,a) V(s'))
- MCTS action selection via UCB1 with progressive widening (constants not fully specified in the extracted text)
Assumptions: (a) summed player VAEP is a sufficient statistic for team strength in the Poisson model; (b) injury occurrence depends only on the engineered workload features; (c) injury duration follows a Gaussian fitted to observed lengths (questionable — durations are non-negative and right-skewed); (d) after three rollout transitions, no further injuries occur; (e) Transfermarkt injury records are complete and correctly dated.

## 5. Features / target
Injury model features: player workload and physical-output features derived from StatsBomb event data (minutes, recent match load, intensity proxies). Target: binary injury occurrence for the upcoming match; secondary: injury length (days, Gaussian-sampled). Match model features: summed VAEP of the selected eleven. Target: match scoreline → win/draw/loss probabilities → expected points. MCTS objective: season expected points net of injury cost.

## 6. Validation design
Injury model: log loss vs. a heuristic baseline; cross-validation described as random shuffled — NOT chronological or team-held-out (major weakness, §9). Match model: predictive accuracy at player level and team level (exact metric definition unclear in extraction — reported as 0.915 ± 0.020 player-level and 0.910 ± 0.018 team-level, presumably outcome-classification accuracy). Simulation: MCTS (100 sims/team) vs. greedy strongest-eleven (1,000 sims/team) over a season; predicted vs. actual team injury counts compared with Pearson correlation.

## 7. Numerical results / baselines
Exact numbers as stated:
- Injury model log loss: 0.1676 ± 0.0005 vs. heuristic baseline 0.1700 ± 0.0002; injury base rate ~4%
- Match model: player-level 0.915 ± 0.020; team-level 0.910 ± 0.018
- Aggregate season simulation: expected points difference MCTS vs. greedy −0.1% ± 0.3 (i.e., no points gain, statistically indistinguishable from zero)
- Squad injuries reduced ~5%; top-11 player injuries reduced ~13%; expected-points variance reduced 17%
- Predicted vs. actual team injuries: mean percentage difference ~14%; Pearson r = 0.77, p < 0.01
- Financial simulation: average 11% lower injured-player wage waste, ~£700,000 per club; Manchester United £1.88m; Manchester City £1.80m
My interpretation: the honest headline is the null result on points (−0.1% ± 0.3) plus injury reduction — the optimizer trades no expected points for ~13% fewer key-player injuries. The £700k figure is a simulation output stacked on the injury model and the Gaussian duration assumption, not a measured saving.

## 8. Code / data availability
Code: https://github.com/Sentient-Sports/Strain-of-Success. Data: StatsBomb (open data release) + Transfermarkt (scraped; availability/ToS constraints apply).

## 9. Leakage & limitations
Adversarial: (a) Random shuffled CV for the injury model — injuries are temporally clustered (fixture congestion, winter); shuffled CV leaks future information and inflates the log-loss win over the heuristic. (b) The headline injury reductions are simulation outputs, not measured outcomes — they depend entirely on the injury model's calibration and the Gaussian duration draw; a miscalibrated 4%-base-rate model can manufacture phantom savings. (c) Gaussian injury duration is misspecified (non-negative, heavy right tail — hamstring vs. ACL are different distributions). (d) MCTS rollout truncation (injuries only in first three transitions) biases the planner's risk estimates. (e) Transfermarkt injury data: inconsistent reporting, ambiguous return dates, no severity standardization. (f) VAEP-sum team strength ignores opposition interaction and tactics. (g) 760 games / 2 seasons is a small sample for injury modeling at 4% base rate. External validity to NFL: the concept transfers well (load management is a live NFL question), but the NFL's 17-game season, hard salary cap, and practice-vs-game load split require a different feature set; soccer's 38-game season gives the optimizer more room than football's short season does.

## 10. GSE overlap
New capability — and it fills a named gap. The existing-research-map lists gap 9: "Causal injury impact — causal inference is a brief topic; player-level causal injury effect estimation (synthetic controls on QBs/OL) is thin." This paper is not causal either (it is predictive + simulative), but it is the closest template in the program so far for an injury-risk → lineup-decision loop, which the map shows GSE does not have. No injury-prediction or load-management content exists in the GSE corpus. The STRAIN tracking paper (2305.10262) in the map is pass-rush biomechanics, a different thing entirely.

## 11. GSE implementation spec
NFL load-management decision tool: (1) Data: nflverse 2020–2025 play-by-play + snap counts; injury data from public injury reports (FOXSports/NFL official reports via nflverse injuries table — note reporting noise). (2) Injury-risk model: gradient boosting (or survival model — see §14) predicting per-player game-miss probability from trailing workload: snaps, touches, days rest, travel, surface, age, prior injury history. (3) Team-strength model: existing GSE EPA-based team ratings (already in corpus) instead of VAEP-sum. (4) Optimizer: rest-vs-play decisions for veterans in low-leverage weeks (e.g., resting starters Week 18 or short-week Thursdays) via the same expected-points MDP framing, with playoff-seeding value replacing raw points. (5) Output: a weekly "rest recommendation" with expected seeding-value delta, for content and for DFS fade/buy signals. Effort: 4–6 days (injury model 2–3, MDP wrapper 1–2, content surfacing 1).

## 12. Reproducible test
Dataset: nflverse injuries + play-by-play, 2020–2023 train, 2024 test — strictly chronological, team-clustered. Metric: Brier score / log loss on per-player-week injury-miss occurrence vs. a base-rate heuristic; secondary: calibration in risk deciles. Baseline to beat: the heuristic in the paper's spirit (recent-snap-count threshold rule). Then the decision layer: backtest the rest-optimizer's recommendations on 2022–2024 — compare recommended-rest weeks' actual team EPA/play vs. counterfactual, with the honesty constraint that this is observational.

## 13. Acceptance / rejection gate
ADOPT the injury-risk model only if it beats the snap-count heuristic by ≥ 0.005 Brier on the 2024 chronological holdout with team-clustered bootstrap CIs excluding zero AND the top risk decile has ≥ 2× the base injury rate (real stratification, not just ranking noise). REJECT the rest-optimizer for betting/DFS use if the observational backtest cannot reject the null (rested players' teams perform no differently than matched controls) — keep it as content-only ("load management watch") until a cleaner identification exists.

## 14. Improvement experiment
Replace the paper's Gaussian duration draw and binary injury classifier with a competing-risks survival model: time-to-injury with cause-specific hazards (soft-tissue vs. contact vs. concussion), where contact injuries are modeled as largely load-independent. The paper's single 4%-base-rate classifier conflates preventable (load-driven) and unpreventable (contact) injuries — the optimizer can only act on the former. Test whether the survival model's load-attributable risk component produces rest recommendations with larger seeding-value deltas than the paper's binary classifier. If soft-tissue risk is predictable but contact risk dominates NFL missed games, the honest conclusion is that load management's lever is smaller than the soccer paper implies — a result worth knowing before building the product.
