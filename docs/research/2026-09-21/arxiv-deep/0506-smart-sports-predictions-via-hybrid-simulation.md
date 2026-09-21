# [0506] Smart Sports Predictions via Hybrid Simulation: NBA Case Study (arXiv:2304.09918v2)

**Citation:** Ignacio Erazo (2023). *Smart Sports Predictions via Hybrid Simulation: NBA Case Study*. arXiv:2304.09918v2. URL: https://arxiv.org/abs/2304.09918v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 786 lines).
**Verdict:** ADOPT — two portable findings for GSE: (1) per-method optimal historical lookback windows (more data is not always better), and (2) rule-based incentive adjustments (rest/tank) that measurably improve late-season accuracy; both port to NFL season simulation.

## 1. Research question
Can a hybrid simulation — discrete-event season simulation generalized with agent-based rational decision-making (teams reacting to playoff status, draft incentives, and schedule) — improve NBA game-outcome prediction over the standard "predict each game independently" Monte Carlo approach? Two sub-questions: (a) how much predictive power do single summary statistics (win percentage, net rating) carry, and (b) how much historical data should be kept to maximize accuracy?

## 2. Dataset / schema
- Ten seasons of NBA regular-season box-score data for both teams, 2011–2012 through 2021–2022, downloaded via the Python module `nba_api`.
- Season 2019–2020 excluded (COVID mid-season break, neutral-site bubble, incomplete rosters).
- Nine seasons simulated, 1,000 runs each.
- Draft-pick ownership info from Pro Sports Transactions (for the tanking incentive).
- Code: not stated in paper (methodology described in full text).

## 3. Method / model
Two-step prediction per game, computed chronologically from data available at tip-off:
- Step 1 (rating): single summary statistic — win percentage or net rating (overall or "home-adjusted": home team's stat computed on home games only, visitor's on all games).
- Step 2 (probability): one of six methods — (i) Bernoulli Race on win pct; (ii) home-adjusted Bernoulli Race on win pct; (iii) largest value on win pct; (iv) home-adjusted largest value on win pct; (v) largest value on net rating; (vi) home-adjusted largest value on net rating.
- "Basic" simulation: outcome depends solely on the summary statistics (equivalent to independent-game Monte Carlo).
- "Extended" simulation: adds agent-based rational incentives via fixed rules (see §4) — eliminated teams that own their draft pick are weakened (tanking), and already-classified teams resting players late are weakened.

## 4. Equations & assumptions
Win percentage with prior (faithful to paper):
p̂_1^i = (π + Σ_{k=1}^{i} x_1^k) / (1 + i), where x_1^k ∈ {0,1} is team 1's win indicator and π ∈ (0,1) is a prior (neutral 0.5 or preseason betting odds).

Net rating: (points scored − points conceded over games 1..i) / (total possessions); initialized at 0.

Bernoulli Race BR(p_1, p_2) for no-tie sports — P(team 1 wins) = p_1(1−p_2) / [p_1(1−p_2) + (1−p_1)p_2]. Property: vs an average team (p_2 = 0.5), team 1's win probability is exactly p_1.

Incentive rules (extended model; magnitudes admitted as arbitrary, untuned):
- Eliminated from playoffs AND owns its upcoming first-round pick → win pct halved (methods i–iv) or net rating −5 (methods v–vi).
- Classified for playoffs with ≤ 3 regular-season games remaining → same reductions (resting starters).
- Play-in accounting: 2012–2019, "classified" = cannot finish below 8th, "eliminated" = cannot finish above 9th; 2020–21/2021–22, classified = cannot finish below 6th, eliminated = cannot finish above 11th.

Assumptions: (a) halving win pct / −5 net rating approximates real incentive effects; (b) draft-pick ownership fully captures tanking incentives; (c) single summary statistics suffice as team-strength proxies; (d) chronological simulation with 1,000 replications estimates true accuracy.

## 5. Features / target
- Inputs: win percentage or net rating (overall or home-adjusted), plus playoff-status/draft-pick state for the extended model.
- Target: binary game winner (regular season only). Horizon: single game, simulated chronologically through each season.

## 6. Validation design
- Each of nine seasons simulated 1,000 times per method; accuracy aggregated over complete seasons and second halves separately.
- "Higher mean accuracy for a specific season" counts: how many of the nine seasons each method won outright.
- Lookback-window study: recompute statistics using only the last N games (N swept), methods (ii) and (vi), extended model, 1,000 runs/season, 95% confidence bands (Figure 3).
- No betting-market baseline; comparison is basic vs extended and across the six methods.

## 7. Numerical results / baselines
Table 1 — basic model, average accuracy (complete season / 2nd half):
- (i) 56.9% / 57.3%; (ii) 57.9% / 58.6%; (iii) 64.1% / 66.0%; (iv) 64.3% / 66.0%; (v) 63.8% / 66.7%; (vi) 63.7% / 66.5%.
- Seasons won (complete / 2nd half): (i) 0/0, (ii) 9/9, (iii) 3/4, (iv) 6/5, (v) 6/6, (vi) 3/3.

Table 2 — extended model (complete / 2nd half):
- (i) 57.3% / 58.0%; (ii) 58.2% / 59.2%; (iii) 64.1% / 66.2%; (iv) 64.5% / 66.4%; (v) 64.0% / 67.1%; (vi) 64.0% / 67.0%.
- Seasons won: (i) 0/0, (ii) 9/9, (iii) 3/3, (iv) 6/6, (v) 5/5, (vi) 4/4.

Every method improves under the extended model; gains concentrate in the second half (incentives bind late). Home adjustment helps the Bernoulli Race (+1pp) but is neutral for largest-value methods (<0.2pp).

Lookback window (Figure 3): accuracy rises, plateaus, then slowly declines as more games are kept. Method (ii) peaks using the last 8–15 games; method (vi) peaks at 18–25 games. Same pattern for other methods and the basic model.

Calibration note (Figure 2): largest-value methods are strongly biased — systematically over-crediting good teams' win totals; Bernoulli Race gives more balanced simulated standings at the cost of accuracy.

## 8. Code / data availability
Data via `nba_api` (public) and Pro Sports Transactions (public). Model code: none stated.

## 9. Leakage & limitations
- **Incentive magnitudes arbitrary and untuned** (author-admitted): halving win pct / −5 net rating. The extended-model gain is directionally suggestive, not a calibrated estimate.
- **No market baseline.** Beating "predict each game independently with win pct" is a low bar; no comparison to Elo, betting odds, or published NBA models.
- **Deterministic largest-value methods** inflate accuracy while producing badly miscalibrated season standings (Figure 2) — accuracy without calibration is dangerous for a betting engine.
- Nine NBA seasons is a modest sample for the window-shape claim; 95% bands in Figure 3 are wide.
- 2019–20 exclusion is reasonable but reduces generalizability claims.
- External validity to NFL: the incentive logic (rest/tank) has a direct NFL analog (resting starters, draft-position tanking), but the NBA's 82-game season gives far more data per team than the NFL's 17 — optimal windows will differ.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's simulation work is thin — the map lists no season-simulation methodology papers in the repo, and gap analysis focuses on metrics, calibration, and market microstructure. The two findings are **new capabilities**: (a) no existing GSE doc prescribes per-predictor optimal lookback windows via ablation (current practice is ad-hoc recency choices); (b) incentive adjustments for meaningless games are not in the engine — GSE prices all 17 games with the same strength inputs. This paper gives both a method and a template for measuring them.

## 11. GSE implementation spec
Two workstreams:
- (a) Lookback-window ablation: for each core GSE predictor family (EPA/play differentials, success rate, pressure rate, etc.), sweep the trailing window N ∈ {4, 6, 8, 10, 13, 17 games} on 2015–2024 nflverse; pick per-predictor N by held-out log-loss. Replaces one-size-fits-all windows.
- (b) Incentive-adjusted season simulation: in GSE's season simulator, add rule-based modifiers for weeks 16–18: teams locked into playoff seeds (cannot move) get a strength discount (tune the magnitude on 2015–2024, do not copy the NBA's halving); teams eliminated but alive for top draft picks get a smaller discount. Draft-pick ownership from public sources (tankathon-style data).
- Data: nflverse; playoff-state computed from standings each simulated week.
- Effort: ~2–3 weeks (ablation harness 1 week, incentive module + tuning 1–2 weeks).

## 12. Reproducible test
- Dataset: nflverse 2019–2024 regular seasons; GSE's game-prediction model.
- Test A (windows): for each predictor, compare the paper-style swept optimal N vs the current fixed window on held-out seasons; metric = log-loss on game outcomes.
- Test B (incentives): simulate weeks 16–18 games 500× with and without the incentive modifiers; metric = accuracy and log-loss on actual outcomes, reported separately for "meaningful" vs "locked/eliminated" games.
- Baselines: current GSE configuration (fixed windows, no incentive adjustment).

## 13. Acceptance / rejection gate
ADOPT per-predictor windows if, pre-registered: the swept window improves pooled held-out log-loss by ≥ 0.003 over the fixed window on 2019–2024, with gains in ≥ 4 of 6 seasons. ADOPT incentive modifiers if they improve log-loss on the "locked/eliminated" week 16–18 subset by ≥ 0.01 without degrading the "meaningful" subset. REJECT either workstream if its gate fails — the NBA numbers do not transfer automatically to a 17-game season.

## 14. Improvement experiment
Go beyond the paper's arbitrary incentive magnitudes: fit the rest/tank discount as a *parameter* by maximizing held-out likelihood on historical meaningless games (2015–2024), separately for "seed locked" vs "eliminated" states and for home/away — then check whether the fitted discounts correlate with observable proxies (snap-share of starters in those games, from snap-count data). The paper guessed the magnitudes; GSE can estimate them.
