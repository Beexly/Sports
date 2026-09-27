# [0414] Who's good this year? Comparing the Information Content of Games in the Four Major US Sports (arXiv:1501.07179v1)

**Citation:** Julian Wolfson and Joseph S. Koopmeiners (2015). *Who's good this year? Comparing the Information Content of Games in the Four Major US Sports*. arXiv:1501.07179v1. URL: https://arxiv.org/abs/1501.07179v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 966 lines).
**Verdict:** ADAPT — port the sample-sufficiency/plateau analysis to determine when GSE's in-season NFL team ratings stabilize, but replace the paper's within-season random subsampling with chronological rolling-origin evaluation so the result is deployable.

## 1. Research question
How much information about relative team strength does each game provide in the NFL, NBA, NHL, and MLB — i.e., how many games into a season can we reliably tell "who's good this year"?

## 2. Dataset / schema
- Game scores: NFL 2004–2012; NBA 2003-04 to 2012-13; NHL 2005-06 to 2012-13; MLB 2006–2012.
- Schema: game date, home team, away team, scores. No player-level or situational data.
- Access: public game-score data (e.g., sports-reference style sources); no proprietary data.

## 3. Method / model
- Bradley–Terry paired-comparison model for win probability: logit(π_{i,j}) = β_i − β_j + α (α = home advantage).
- Margin-of-victory model: μ_{i,j} = δ_i − δ_j + λ (λ = home edge in points).
- For each season, randomly sample X% of games for X ∈ {12.5%, 25%, 37.5%, 50%, 62.5%, 75%, 87.5%}, fit the models, predict the remaining (100−X)% of games; repeat 100 times per X per season.
- Compare accuracy against the always-pick-home-team baseline via odds ratios.

## 4. Equations & assumptions
- Bradley–Terry: logit(π_{i,j}) = β_i − β_j + α.
- MOV: μ_{i,j} = δ_i − δ_j + λ.
- Assumptions: (a) team strength is a single constant parameter per season (no injuries, trades, or form changes); (b) random subsamples are representative — the paper explicitly samples at random "so as to reduce the influence of temporal trends"; (c) home advantage is a single constant per league-season; (d) games are independent given strengths.

## 5. Features / target
- Input features: team identities (home/away) only.
- Targets: game winner (BT model); point margin (MOV model).

## 6. Validation design
- Within-season random-subsample validation (100 repetitions per training fraction), NOT chronological: future games are used to estimate "average" team strength, then used to predict past games. The paper is explicit that this measures information content, not forecastability.
- Baselines: always-pick-home; BT vs BT+MOV comparison.

## 7. Numerical results / baselines
- NBA: most predictable league; up to 70% accuracy with 87.5% of games as training. Home teams won ~60% of NBA games (largest home advantage). NBA accuracy plateaued: "no better when 75% of games were included than when 25% were" — information plateau around 25–30 games.
- NFL: accuracy kept improving as more games were added (no plateau within a season).
- MLB: never exceeded 58% correct even with 140 games (7/8 season) as training. NHL: never exceeded 60% (only in 2005-06, when home win probability was 58%). For both, accuracy was rarely more than 2–3 percentage points better than always picking home; in 2007-08 and 2011-12, always-home beat the half-season paired-comparison models.
- Odds ratio vs always-home at 87.5% training: NBA 1.41, NFL 1.46, NHL 1.09, MLB 1.06 (paper's Table values).
- Per-game percentage-point accuracy gain at 87.5% training: NBA 0.34, NFL 1.4, NHL 0.13, MLB 0.053.
- MOV added virtually nothing in the NBA ("led to slightly worse predictions during the 05-06 season").

## 8. Code / data availability
None stated in the extracted text. Underlying game scores are public.

## 9. Leakage & limitations
- The central design flaw for deployment: random within-season splits use future games to estimate team strength — this is lookahead bias by construction. It answers "how much information is in a season" but cannot be turned into a forecasting system without redoing it chronologically.
- Single constant strength per team-season ignores the very dynamics (injuries, QB changes) that dominate NFL predictability.
- No schedule-strength nuance beyond paired comparison; no rest, travel, or weather.
- The "plateau" finding for the NBA may partly reflect the random-split design rather than true information saturation.
- External validity to NFL: the NFL-specific finding (each game adds ~1.4pp accuracy; no within-season plateau) is the actionable one for GSE — NFL ratings need continuous updating all season.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's corpus already includes EPA/play ratings, weekly trends, and objective team-rating tables, and the map's methods list includes Bradley–Terry models — so paired-comparison machinery itself is **duplicate**. The **extension** is the paper's actual contribution: a formal sample-sufficiency/plateau analysis telling us *when in-season ratings stabilize* — the map has no stabilization/half-life analysis for GSE's NFL priors. That, not the BT model, is what to port.

## 11. GSE implementation spec
- Data: nflverse play-by-play/game scores 2009–2025.
- Feature engineering: per-game team strength estimates via BT + MOV with exponential time-decay weights (half-life as a tuned parameter).
- Model: chronological rolling-origin evaluation — fit on weeks 1..t, predict week t+1, for t = 4..17, each season 2015–2024; record accuracy/log-loss vs weeks elapsed.
- Deliverable: an empirical stabilization curve for NFL (the paper's plateau analysis, done right) that sets the prior half-life for GSE's in-season team ratings and tells content "after week X, ratings are signal."
- Estimated effort: 3–5 days for a single engineer.

## 12. Reproducible test
- Dataset: NFL regular seasons 2015–2024 (nflverse).
- Procedure: rolling-origin — for each season, fit decay-weighted BT on weeks 1..t, predict weeks t+1..18; sweep decay half-lives {2, 4, 8, 16 weeks, infinite}.
- Metric: cumulative log-loss on forward predictions.
- Baseline to beat: static (infinite half-life) BT — the paper's implicit model.

## 13. Acceptance / rejection gate
ADOPT a finite decay half-life for GSE in-season ratings IF the best finite half-life beats the static BT by ≥ 0.5% log-loss on the 2015–2024 rolling-origin test AND the stabilization curve identifies a week after which marginal information gain per game drops below 0.2pp accuracy (deployable "ratings have settled" rule); otherwise REJECT decay weighting and keep static in-season ratings. Gate fixed before running.

## 14. Improvement experiment
Hierarchical BT with separate offensive/defensive strength parameters plus rest-days and travel-distance covariates, learning a *per-team* decay rate (contenders with stable QBs decay slowly; rebuilding teams fast). The paper's single-parameter, single-decay model cannot capture this — test whether per-team decay beats the global best half-life by ≥0.3% log-loss on the same rolling-origin test.
