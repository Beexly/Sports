# [1186] Forecasting football matches by predicting match statistics (arXiv:2001.09097v1)

**Citation:** Edward Wheatcroft (2020). *Forecasting football matches by predicting match statistics*. arXiv:2001.09097v1. URL: https://arxiv.org/abs/2001.09097v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 30 pages, all sections + appendix).
**Verdict:** ADAPT

Use GAP-style two-sided ratings on *intermediate* NFL stats (EPA/play, pressure, first downs) as features for win/spread/total models, with value-vs-odds testing.

## 1. Research question
Can predictions of intermediate match statistics (shots on/off target, corners) — made before kickoff — produce informative probabilistic forecasts of football (soccer) match outcomes (home win/draw/away win), and do they carry information beyond what is already reflected in bookmaker odds? The key claim: if match statistics were knowable in advance, highly informative outcome forecasts could be made; if statistics can be predicted accurately enough pre-match, informative outcome forecasts follow. The paper then tests whether Generalised Attacking Performance (GAP) ratings predict statistics well enough, and demonstrates long-term robust gambling profit combining the forecasts with two betting strategies.

## 2. Dataset / schema
- Source: www.football-data.co.uk (free). 22 European leagues (English Premier League, Championship, League One, League Two, National League; French Ligue 1/2; German Bundesliga/2.Bundesliga; Greek Super League; Italian Serie A/B; Dutch Eredivisie; Portuguese Primeira Liga; Scottish leagues; Spanish Primera/Segunda; Turkish Super Lig; Belgian Jupiler League).
- Totals: 143,672 matches since 2000/2001; 77,196 with shots/corner data; 49,884 "eligible" for betting (match statistics available AND home team has played ≥6 matches AND has ≥6 matches remaining that season). Data through end of 2018/19 season.
- Schema per match: shots, shots on target, corners, fouls, yellow cards per team; plus odds from multiple bookmakers for match outcome, over/under 2.5 goals, and Asian Handicap markets. Draws excluded from betting (home/away wins only).

## 3. Method / model
1. **GAP ratings** (from Wheatcroft 2020): each team gets 4 ratings per statistic — home attacking (Hᵃᵢ), home defensive (Hᵈᵢ), away attacking (Aᵃᵢ), away defensive (Aᵈᵢ) — each an estimate of the number of attacking plays the team achieves/concedes vs an average team. Ratings update after every match (equations in §4). Ratings initialised at 0 in the first season with match-statistics data; thereafter carried over, with promoted teams assigned the average ratings of the prior season's relegated teams and vice versa.
2. **Statistic prediction:** predicted home-team attacking plays Ŝₕ = (Hᵃᵢ + Aᵈⱼ)/2; predicted away Ŝₐ = (Aᵃⱼ + Hᵈᵢ)/2. The predicted *difference* Ŝₕ − Ŝₐ is the regressor of interest. GAP parameters (λ, φ₁, φ₂) selected by least-squares minimisation of MSE between predicted and observed attacking plays, performed between seasons over all previous seasons simultaneously over all leagues — note: this is **not** the original GAP parameter-selection criterion (which maximised forecast skill).
3. **Outcome model:** ordinal (proportional-odds) logistic regression producing p̂ₕ, p̂_d, p̂ₐ for home/draw/away. Predictors: home odds-implied probability (max odds over bookmakers); observed differences in shots on target / shots off target / corners; predicted differences in shots on target / off target / corners / goals.
4. **Betting:** Level Stakes (unit bet when p̂ᵢ > rᵢ, i.e. forecast probability exceeds odds-implied probability) and Kelly-stake (normalised so total stakes across all bets = 1 unit, making profits directly comparable). Forecasts are truly out-of-sample: regression parameters re-fit every match day on all eligible past matches.

## 4. Equations & assumptions
- Overround: π = Σᵢ(1/Oᵢ) − 1 (Eq. 1). Odds-implied probability rᵢ = 1/Oᵢ.
- Parameter objective: f = Σᵢ[(Sₕ − Ŝₕ)² + (Sₐ − Ŝₐ)²] (Eq. 2).
- Ordinal logistic regression: log(p̂ₕ/(p̂_d+p̂ₐ)) = α̂ + Σᵢβ̂ᵢVᵢ (Eq. 4); log((p̂ₕ+p̂_d)/p̂ₐ) = α̂ + Σᵢβ̂ᵢVᵢ (Eq. 5). Note: the paper writes a single α̂ for both equations, but this is a transcription convention; proportional-odds models use one intercept per threshold. (Paper text: "least squares parameter estimates are used to select the regression parameters α̂ and β̂" — i.e., ML/LS fit on past data.)
- GAP updates (Eqs. 7–8): Hᵃᵢ ← max(Hᵃᵢ + λφ₁(Sₕ − (Hᵃᵢ+Aᵈⱼ)/2), 0); Aᵃᵢ ← max(Aᵃᵢ + λ(1−φ₁)(Sₕ − (Hᵃᵢ+Aᵈⱼ)/2), 0); Hᵈᵢ ← max(Hᵈᵢ + λφ₁(Sₐ − (Aᵃⱼ+Hᵈᵢ)/2), 0); Aᵈᵢ ← max(Aᵈᵢ + λ(1−φ₁)(Sₐ − (Aᵃⱼ+Hᵈᵢ)/2), 0); and mirrored updates for the away team with φ₂. λ > 0 is the learning rate; φ₁, φ₂ ∈ (0,1) govern home-match influence on away ratings and vice versa.
- Kelly fraction: fᵢ = max((rᵢ + pᵢ… − 1)/(rᵢ − 1), 0) — rendered in the PDF as ((rᵢ + ipᵢ − 1)/(rᵢ − 1)), i.e. the standard Kelly (pᵢ·rᵢ − 1)/(rᵢ − 1); stake sᵢ = k·fᵢ with k chosen so Σᵢk·fᵢ = 1 over all bets.
- Assumptions (stated): match outcomes are ordered (home > draw > away) justifying ordinal regression; first 6 and last 6 home-team matches each season ineligible (learning window; end-of-season motivation effects); gambler can obtain maximum odds across bookmakers; forecasts are out-of-sample (parameters from past matches only).

## 5. Features / target
- Target: match outcome — home win / draw / away win (three ordered classes).
- Features (predictor variables): predicted differences Ŝₕ−Ŝₐ for each of goals, shots on target, shots off target, corners; observed differences for shots on target/off target/corners (used as oracle/baseline analysis); home odds-implied probability (max odds). Prediction horizon: pre-match (single game).
- Note: the paper considers observed and predicted statistics separately, not mixed; shots off target = total shots − shots on target.

## 6. Validation design
- Two-stage: (a) variable selection via AIC relative to the null (intercept-only) model, one regression fit over the entire dataset; (b) betting performance with genuinely out-of-sample forecasts (regression refit each match day on all past eligible matches).
- Baselines: null (constant-probability) model; sample-mean forecast for statistic prediction; odds-implied probabilities as a competing/incremental predictor; observed statistics as oracle upper bound.
- Metrics: mean absolute error for statistic prediction; AIC for variable selection; mean percentage profit with 95% bootstrap resampling intervals under Level Stakes and Kelly strategies; overround-stratified profit analysis (5 intervals: negative overround, then 2.5% widths to >7.5%).

## 7. Numerical results / baselines
- **Statistic-prediction MAE (GAP vs sample mean, Table 2):** home goals 1.01 vs 1.02; home shots on target 4.77 vs 5.22; home shots off target **1.86 vs 3.77** (the large win); home corners 2.31 vs 2.34; away goals 0.87 vs 0.85 (worse than mean); away shots on target 3.09 vs 3.24; away shots off target 1.63 vs 3.09; away corners 2.05 vs 2.08.
- **Observed statistics AIC (relative to null; lower = better, Table 3):** all three stats −11,646.1 (no odds) / −14,902.2 (with odds). Individually, shots on target most informative (−9,366.6/−11,155.5), then corners, then off target.
- **Predicted statistics AIC (Table 4):** on/off/corners combo −4,246.9 / −5,750.8; adding goals gives −4,950.3/−5,749.3. Predicted goals alone: −4,324.4/−5,617.8 — with odds included this is essentially identical to the odds-only null (−5,619.1), i.e. **predicted goals add no information beyond odds**. Most informative predicted statistic: shots off target (−2,586.3/−5,709.1), then corners, then shots on target.
- **Level Stakes mean % profit (Table 5, with odds):** best combo off-target+corners +1.85% (+0.17, +3.39); all-stat combos significant positive in several cases. Without odds, intervals mostly include zero.
- **Kelly mean % profit (Table 6, with odds):** best on/off/corners combo +5.01% (+3.38, +6.76); significant (CI excludes 0) for all combos including at least one predicted statistic other than goals. Without odds: +3.58% (+1.34, +5.74) for the best combo.
- **Robustness:** profit significant in 3/5 overround intervals under Kelly; ~18% of matches had negative overround (arbitrage possible with best odds) — but profit not driven by arbitrage: mean profit in the negative-overround interval was not significantly different from zero, and positive in all positive-overround intervals.
- **Decline:** cumulative profit curves (Figs. 2–3) show a downturn in recent seasons, consistent across all 22 leagues — the paper attributes this to odds incorporating more of this information over time.

## 8. Code / data availability
Data: www.football-data.co.uk (free, match statistics + bookmaker odds). **Code: none stated.** GAP rating equations fully specified in the appendix (reimplementable). OddS API and bookmaker odds for NFL equivalents would need sourcing per GSE infra.

## 9. Leakage & limitations
- **AIC variable selection is in-sample** (one fit over the whole dataset) — AIC penalises complexity but the selected "best combination" can still reflect in-sample snooping; the out-of-sample betting results are the honest test.
- **GAP parameters selected between seasons over all previous seasons** — honest (no future data), but note parameter selection here minimised statistic-MSE, not forecast skill, a design choice that worked here but isn't optimal in general.
- **Best-odds assumption:** profitability assumes taking the maximum odds across all bookmakers; realistic execution (limited accounts, line movement) degrades this.
- **Recency decay:** profit declined markedly in the last seasons of the sample — evidence the edge is decaying as markets absorb shot-statistic information. For NFL, where markets are far more efficient, the base effect is likely smaller but the same decay dynamics apply.
- **Draw exclusion:** bets only on home/away — limits generality.
- **External validity to NFL:** soccer-specific (goals rare, draws common); the philosophy transfers but the ordinal model and statistic choices need NFL-native equivalents. No injuries/roster/pace/weather controls.
- Overround < 0 in 18% of cases means best-odds aggregation creates mechanical arbitrage — the paper checks this honestly and shows profit is not driven by it.

## 10. GSE overlap
- The arXiv-750 corpus already contains multiple soccer-prediction and Elo/ratings papers; the distinctive contribution here is the *intermediate-statistic* philosophy (rate on predictable process stats, not on goals) plus the empirical demonstration that the *most predictable* statistic (off-target shots) beats the *most outcome-relevant* one (on-target shots) when used in prediction — information content of a predicted statistic = statistic importance × predictability.
- The existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, read 2026-09-21) lists GAP nowhere: GSE's ratings work covers Elo, Glicko (mentioned), TrueSkill, Bradley-Terry, Dixon-Coles, Massey/Sagarin/Colley, nfelo — but **no GAP-style two-sided (attack/defense × home/away) exponential ratings on intermediate match statistics**. The distinctive contribution here is the *intermediate-statistic* philosophy (rate on predictable process stats, not on goals) plus the empirical demonstration that the *most predictable* statistic (off-target shots) beats the *most outcome-relevant* one (on-target shots) when used in prediction — information content of a predicted statistic = statistic importance × predictability. I treat this as **new capability / extension**, not duplication.

## 11. GSE implementation spec
1. **Data:** nflverse play-by-play (EPA/play, success rate, first downs, pressure/sack rates, yards/play) 2009–present; odds snapshots from The Odds API (already connected, 20K credits/month).
2. **GAP-for-NFL:** per-team ratings, 4-way split (home offense/defense, away offense/defense) on each intermediate measure: offensive EPA/play allowed/gained, pressure rate, first-down rate, explosive-play rate. Update via Eq. 7–8 analogues; parameters (λ, φ₁, φ₂) fit between seasons minimising statistic-MSE. Promoted/relegated mapping replaced by new-coach/roster-change initialisation (prior = league average).
3. **Outcome model:** ordinal logistic regression for win/loss (binary simplification) — NFL has no draws in practice; better: logistic regression on win + separate models for spread cover and total. Features: predicted stat differentials (Ŝₕ−Ŝₐ per measure) + market-implied win probability.
4. **Testing:** walk-forward from 2015: refit weekly; value rule p̂ > implied; Level Stakes + Kelly(½-Kelly for sanity); metrics: log-loss/Brier vs odds-only, CLV, realised ROI with bootstrap CIs. Effort: ~1–2 engineer-weeks including odds-snapshot backfill.

## 12. Reproducible test
- Dataset: nflverse pbp 2015–2024 regular seasons + The Odds API closing moneyline snapshots.
- Build GAP-style ratings on EPA/play and pressure rate; weekly walk-forward predicted differentials as features in a logistic model alongside the closing market implied probability.
- Metric: Brier score and CLV vs a market-only baseline; realised unit-profit with 95% bootstrap CIs under Level Stakes value betting.
- Window: 2019–2024 seasons (6 seasons, ~1,600 games) — enough for the same kind of significance assessment as the paper.

## 13. Acceptance / rejection gate
**Adopt** if, on 2019–2024 walk-forward, the GAP-featured model beats the market-only baseline by ≥0.005 Brier points AND shows positive CLV (mean line move in our favour ≥ +0.3 points) AND realised ROI CI excludes zero under Level Stakes. **Reject** if Brier improvement < 0.002 with no significant CLV — the intermediate-statistic channel adds nothing beyond the market.

## 14. Improvement experiment
GAP updates weight all matches equally beyond λ-decay. NFL-relevant upgrade: make λ and the statistic mix adaptive to *context* — weight EPA/play higher early-season (small sample, process stats stabilise faster than scores), weight predicted *differentials in situational stats* (red-zone efficiency, 3rd-down conversion) late-season when roster/injury info is stable. Test whether a predictability-weighted feature (each statistic's weight = its own past MSE-predictability, mirroring the paper's off-target-shot insight) beats uniform weighting. The paper's own core insight — weight statistics by predictability × outcome relevance — generalises directly.

**Verdict:** ADAPT

The philosophy (predict intermediate process stats with two-sided ratings; feed predicted differentials to an outcome model; test value vs odds) transfers to NFL directly; the soccer equations need NFL-native statistic choices and a binary/draw-free outcome model.
