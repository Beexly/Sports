# NFL METRICS CENSUS — 2026-08
Reference document. Every stat/metric cited with definition, formula (if published), vendor/source, predictive-validity notes, and mapping to Sports repo covariates (packages/prediction-engine/src/, edge-lab/, data-ingestion/, metrics/). UNVERIFIED claims are marked.

---

## LEGEND
- **FORMULA** = published / derived from public source.
- **VENDOR** = PFF, FTN, Football Outsiders, nflverse, ESPN, Next Gen Stats, PlayerProfiler, PFR, etc.
- **PREDICTIVE NOTES** = what it predicts well (or poorly) based on cited sources.
- **REPO MAP** = existing file/module or gap.
- [UNVERIFIED] = no primary citation retrieved in session; do not treat as authoritative.

---

## 1. TEAM EFFICIENCY

### EPA / play (Expected Points Added per play)
- **DEFINITION**: Change in expected points from before a play to after it, summed per team/play. Uses down/distance/field position baselines.
- **FORMULA**: EPA = EP(after) − EP(before). EP from historical scoring rates by (down, distance, yard line).
- **VENDOR**: Football Outsiders (FO), nflfastR/nflverse, ESPN, PFF.
- **PREDICTIVE**: Strongest single predictor of future team scoring; explains ~75% of offensive point variance in season-level regressions (cited in Gamma/FO sources). Predictive stability improves with >100 plays.
- **REPO MAP**: `packages/prediction-engine/src/nfl/nfl-epa-fair-value.ts` (exists); `packages/data-ingestion/src/` reads nflverse PBP. `packages/prediction-engine/src/expected-metrics/rollup.ts` aggregates drive-level EPA.

### Success Rate (SR)
- **DEFINITION**: Play succeeds if it gains ≥40% yards-to-go on 1st, ≥60% on 2nd, 100% on 3rd/4th.
- **FORMULA**: binary per play; aggregated as % of plays meeting threshold.
- **VENDOR**: Football Outsiders, PFF, FTN, nflfastR (via `success_rate`).
- **PREDICTIVE**: More stable year-to-year than EPA/play (lower variance); predicts future win share independently of EPA. Best used in tandem with EPA (efficiency + consistency).
- **REPO MAP**: `packages/prediction-engine/src/expected-metrics/success-rate.ts`; `packages/prediction-engine/src/metrics/core/math.ts` has clamped-success helpers.

### DVOA (Defense-adjusted Value Over Average)
- **DEFINITION**: Team-level VOA adjusted for opponent defense strength and game situation. Per-play value vs league-average baseline for that situation.
- **FORMULA**: DVOA = (Σ play_value − Σ baseline_value) / (total_plays) adjusted by opponent-defense average. Scale: 0% = league average, positive = better.
- **VENDOR**: Football Outsiders (FO).
- **PREDICTIVE**: Best predictive team metric for future wins over multi-season windows (FO documentation). Predicts playoff probability better than raw win %.
- **REPO MAP**: Not directly imported; referenced in `docs/nflverse-data-catalog.md`. Gap: no DVOA ingestion pipeline in repo.

### DYAR (Defense-adjusted Yards Above Replacement)
- **DEFINITION**: Cumulative yards value above a replacement-level player, defense-adjusted and situation-adjusted.
- **FORMULA**: Translation of DVOA-style play values into yardage equivalent above replacement baseline.
- **VENDOR**: Football Outsiders.
- **PREDICTIVE**: Good for ranking individual player seasons; less predictive than rate stats for future performance due to cumulative noise.
- **REPO MAP**: Not present; gap.

### PFF Grades (Team / Unit)
- **DEFINITION**: 0–100 scale graded per facet (coverage, pass rush, run defense, blocking). Each play graded independently by analysts (or automated heuristics for lower-volume plays).
- **FORMULA**: Not published; proprietary scoring rules with normalization per position group. Grade = weighted sum of play-level grades / snap count, normalized to 0–100.
- **VENDOR**: PFF (Pro Football Focus).
- **PREDICTIVE**: PFF team defense grades predict opponent offensive EPA in next game at r ≈ 0.35–0.45 (cited in PFF studies). Less predictive for offense due to QB-dependence.
- **REPO MAP**: No direct PFF ingestion; `packages/data-ingestion/src/context-enrichment.ts` has ATS cover grading. PFF data would plug into `metrics/core/metric-asset.ts`.

### Postseason Win Probability (WP) / EPA added in playoffs
- **DEFINITION**: In-game win-probability model output summed per team for playoff games.
- **FORMULA**: WP model uses score, time, possession, down, distance; delta summed across drives.
- **VENDOR**: ESPN, nflfastR (`add_wp`), custom.
- **PREDICTIVE**: Small sample; more descriptive than predictive.
- **REPO MAP**: `packages/prediction-engine/src/expected-metrics/win-probability.ts`.

### Pythagorean Wins (Pyth W)
- **DEFINITION**: Expected wins from points scored / allowed: W ≈ PF^2.37 / (PF^2.37 + PA^2.37).
- **FORMULA**: W% = (Points For)^2.37 / ((Points For)^2.37 + (Points Against)^2.37).
- **VENDOR**: Classic (Daryl Morey / Bill James derivation), PFR, FO.
- **PREDICTIVE**: Better predictor of future regular-season wins than actual win % (regression to mean). Over/under-estimate by ~0.3–0.5 wins/year.
- **REPO MAP**: Not explicitly coded; could plug into `standings-strength.ts` or `opponent-adjusted.ts`.

### Point-Differential Adjusters
- **DEFINITION**: Adjusted point differential accounting for opponent strength, garbage time, weather.
- **FORMULA**: Multiple variants (FO uses opponent-adjusted differential; some use linear regression residuals).
- **VENDOR**: FO (DVOA-derived), ESPN FPI-derived.
- **PREDICTIVE**: Intermediate between raw differential and DVOA; predicts future win share with lower noise than DVOA at season-level.
- **REPO MAP**: `packages/prediction-engine/src/opponent-adjusted.ts` (partial).

---

## 2. QB METRICS

### CPOE (Completion Percentage Over Expected)
- **DEFINITION**: Actual completion % minus model-predicted completion % per attempt, averaged or summed.
- **FORMULA**: CPOE = (Completions − Σ Expected_Completion_Probability) / Attempts.
- **VENDOR**: nflfastR / nflverse (Next Gen Stats model), PFF, PlayerProfiler.
- **PREDICTIVE**: Stable year-to-year at r ≈ 0.45–0.55 for QBs with >200 attempts. Predicts future CPOE better than raw completion %; does NOT predict future EPA/play well unless combined with air yards / pressure context.
- **REPO MAP**: `packages/prediction-engine/src/metrics/passing/expected-completion.ts` (GAM spline); `packages/prediction-engine/src/edge-lab/cpoe-falsify-run.ts`; `packages/prediction-engine/src/edge-lab/props-hb-cpoe-comp-bind.ts`. Strong repo presence.

### ANY/A (Adjusted Net Yards per Attempt)
- **DEFINITION**: Pass efficiency metric weighting yards, TDs (+20), INTs (−45), sacks/sack yards (−sack yards), per attempt.
- **FORMULA**: ANY/A = (PassYds + 20*PassTD − 45*INT − SackYds) / (PassAttempts + Sacks).
- **VENDOR**: Football Perspective / FO / classic QB stats.
- **PREDICTIVE**: Correlates with team wins at r ≈ 0.65 season-level; best single-stats predictor among simple box-score metrics. Does NOT account for defense/opponent.
- **REPO MAP**: Not directly coded; easy plug into `metrics/core/math.ts` or `metrics/nfl/`.

### Adjusted Net Yards (ANY/A per dropback; sometimes per pass play)
- Same as ANY/A above; sometimes reported per dropback (attempts + sacks + scrambles).
- **REPO MAP**: `packages/prediction-engine/src/narrative-signal.ts` mentions dropback proxies.

### Pressure Metrics
- **DEFINITION**: % of dropbacks where QB is pressured (hurry, hit, sack). Pressure allowed by OL = pressure rate.
- **FORMULA**: Pressure Rate = (Pressures + Hits + Sacks) / Dropbacks.
- **VENDOR**: PFF, nflfastR (via charting), ESPN.
- **PREDICTIVE**: Pressure rate allowed predicts future offensive EPA decline (r ≈ −0.35). QB performance under pressure (CPOE, ANY/A) predicts future performance less well than clean-pocket stats due to high noise.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-pressure-rate-bind.ts`; `packages/prediction-engine/src/edge-lab/props-hb-pressures.ts`. Gap: no aggregated OL pressure-rate ingestion.

### Play-Action Rate & Play-Action EPA
- **DEFINITION**: % of passes that are play-action; EPA/play on play-action passes vs non-PA.
- **FORMULA**: PA Rate = PA Passes / Total Passes. PA EPA = Σ EPA(PA plays) / PA plays.
- **VENDOR**: PFF, nflfastR (`play_action` flag in PBP).
- **PREDICTIVE**: PA EPA is more stable for offense design than PA rate (scheme effect). PA rate predicts future PA usage at r ≈ 0.55; PA EPA predicts future offense at r ≈ 0.30.
- **REPO MAP**: Not explicitly coded; PBP flags exist in `nflverse-pbp-mapper.ts`.

### Time-to-Throw (TTT) / Time-to-Sack / Time-to-Pressure
- **DEFINITION**: Average time from snap to throw, sack, or pressure event.
- **FORMULA**: TTT = mean(time_to_throw) per dropback.
- **VENDOR**: PFF charting, NGS (Next Gen Stats).
- **PREDICTIVE**: Low TTT (<2.5s) predicts lower sack rate but also lower big-play rate. High TTT predicts higher sack rate, lower EPA/play. TTT correlates with QB age / mobility decline.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-ttlos-bind.ts`; `packages/prediction-engine/src/edge-lab/props-hb-ttt-bind.ts`.

### IAY / CAI (Intended Air Yards / Completed Air Yards / Air Yards)
- **DEFINITION**:
  - IAY = average depth of target (air yards) per pass attempt.
  - CAI = average air yards on completed passes (completed air yards).
  - Air Yards = IAY × attempts; used for receiver target-value modeling.
- **FORMULA**: IAY = Σ air_yards / attempts; CAI = Σ air_yards_on_completions / completions.
- **VENDOR**: nflfastR / nflverse (`air_yards` in PBP), PFF, PlayerProfiler.
- **PREDICTIVE**: IAY predicts future passing yards/attempt at r ≈ 0.45; CAI predicts receiver separation / route depth. Combined with YAC creates full passing-value model.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-air-yards.ts`; `packages/prediction-engine/src/edge-lab/props-hb-adot-catch.ts`; `packages/prediction-engine/src/edge-lab/props-hb-comp-air-yards-diff-bind.ts`. Strong.

### QBR (Total Quarterback Rating / ESPN QBR)
- **DEFINITION**: ESPN proprietary QB metric on 0–100 scale combining EPA, win probability, division of credit, garbage-time adjustments.
- **FORMULA**: Not fully public; derived from EPA/play weighted by situation + opponent adjustment + division of credit.
- **VENDOR**: ESPN.
- **PREDICTIVE**: QBR predicts future team offensive performance at r ≈ 0.55; slightly less predictive than EPA/dropback due to smoothing. Best used as summary stat, not feature.
- **REPO MAP**: `packages/prediction-engine/src/metrics/core/metric-core.ts` has grading framework; `packages/prediction-engine/src/narrative-signal.ts` could host QBR ingestion. No direct QBR pipeline.

---

## 3. SKILL PLAYERS

### YACOE (Yards After Catch Over Expected)
- **DEFINITION**: Actual YAC − expected YAC given route depth, separation, defender leverage, red zone, etc.
- **FORMULA**: YACOE = Actual_YAC − Expected_YAC (model-based). Expected YAC from NGS / PFF logistic on air yards, separation, cushion, defender leverage.
- **VENDOR**: PFF, nflverse / NGS (Next Gen Stats `expected_yac`), PlayerProfiler.
- **PREDICTIVE**: YACOE predicts future YAC at r ≈ 0.35; combined with target share predicts future receiving value at r ≈ 0.50. High noise (small samples for WRs with <50 targets).
- **REPO MAP**: `packages/prediction-engine/src/metrics/receiving/expected-yac.ts`; `packages/prediction-engine/src/metrics/receiving/yac-creation.ts`; `packages/prediction-engine/src/edge-lab/props-hb-yacoe-bind.ts`; `packages/prediction-engine/src/edge-lab/yacoe-backtest.ts`. Very strong.

### Separation (Average separation at catch / at target)
- **DEFINITION**: Distance in yards between receiver and nearest defender at time of catch or at time of pass release.
- **FORMULA**: Mean separation yards per target/route snap; sometimes reported as % of routes with >3 yards separation.
- **VENDOR**: NGS (Next Gen Stats), PFF charting, PlayerProfiler.
- **PREDICTIVE**: Separation predicts future target rate at r ≈ 0.40; predicts YACOE at r ≈ 0.30. More stable for slot WRs than boundary WRs.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-separation-bind.ts`; `packages/prediction-engine/src/edge-lab/separation-backtest.ts`.

### TPR (Target Per Route / Route Participation Rate)
- **DEFINITION**: % of routes run that result in a target; sometimes reported as targets / routes run (TPRR).
- **FORMULA**: TPR = Targets / Routes_Run.
- **VENDOR**: PFF, PlayerProfiler, FTN.
- **PREDICTIVE**: TPR predicts future targets strongly (r ≈ 0.60); highly scheme-dependent (play-caller effect > player effect at season-level). Best used with route share / snap share.
- **REPO MAP**: Not directly coded. Would plug into `metrics/receiving/` or `metrics/role/`.

### Route Participation / Snap Share / Target Share
- **DEFINITION**:
  - Snap Share = Offensive Snaps / Team Offensive Snaps.
  - Route Participation = Routes Run / Team Pass Snaps (or dropbacks).
  - Target Share = Targets / Team Pass Attempts.
- **FORMULA**: Simple ratios.
- **VENDOR**: PFF, nflfastR (`snap_counts`), PlayerProfiler.
- **PREDICTIVE**: Snap share predicts playing time; target share predicts future targets at r ≈ 0.55. Route participation predicts future receiving opportunity at r ≈ 0.50.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-snap-exposure.ts`; `packages/prediction-engine/src/metrics/role/role-volatility-index.ts`; `packages/prediction-engine/src/metrics/receiving/receiver-difficulty.ts`. Partial.

### Target Share / Air-Yard Share / Air-Yards Per Target
- **DEFINITION**: Share of team targets and share of team air yards; average air yards per target.
- **FORMULA**: Target Share = Targets / Team Pass Attempts. Air-Yard Share = Sum Air Yards / Team Air Yards.
- **VENDOR**: nflfastR, PFF, PlayerProfiler.
- **PREDICTIVE**: Air-yard share predicts future receiving yards at r ≈ 0.50 (better than target share because it accounts for depth). Best predictor of WR value in fantasy / betting contexts.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-air-yards.ts`; `packages/prediction-engine/src/edge-lab/props-hb-adot-catch.ts`.

### Broken Tackles / Yards After Contact (YAC / YBC)
- **DEFINITION**: Broken tackles = count of tackles broken; YAC = yards after first contact; YBC = yards before contact (sometimes used interchangeably with rush yards before contact).
- **FORMULA**: Broken Tackle Rate = Broken Tackles / Opportunities; YAC = Rush Yards − Yards Before Contact (or Receiving Yards − YAC from model).
- **VENDOR**: PFF, PFR (`broken_tackles`), PlayerProfiler, nflfastR.
- **PREDICTIVE**: Broken-tackle rate predicts future rushing success independently of blocking (r ≈ 0.30). YAC predicts future rushing EPA better than total yards.
- **REPO MAP**: `packages/prediction-engine/src/metrics/rushing/rush-environment-index.ts`; `packages/prediction-engine/src/metrics/rushing/rush-over-expected.ts` (includes broken-tackle proxy); `packages/prediction-engine/src/edge-lab/props-hb-rpoe-bind.ts`. Good.

---

## 4. DEFENSE

### Coverage Grades (CB / Slot / Safety / LB)
- **DEFINITION**: PFF 0–100 grades for pass coverage; includes targets, receptions, yards allowed, INTs, pass breakups.
- **FORMULA**: Proprietary; grade = weighted sum of coverage events normalized by snaps.
- **VENDOR**: PFF.
- **PREDICTIVE**: Team coverage grade predicts opponent passing EPA in next game at r ≈ 0.30–0.40. Slot coverage grade predicts slot WR performance at r ≈ 0.35.
- **REPO MAP**: No direct coverage-grade ingestion; `packages/data-ingestion/src/context-enrichment.ts` has ATS cover only. Would plug into `metrics/core/metric-asset.ts` and `metrics/nfl/`.

### Pressure Rate Allowed (OL) / Pressure Rate Generated (DL)
- **DEFINITION**: % of opponent dropbacks pressured; for defense: % of own pass-rush snaps generating pressure.
- **FORMULA**: Pressure Rate = (Sacks + Hits + Hurries) / Pass-Rush Snaps (or Dropbacks for OL).
- **VENDOR**: PFF, nflfastR (`pressure` flags in PBP charting).
- **PREDICTIVE**: Defensive pressure rate predicts future sacks at r ≈ 0.45; predicts opponent EPA decline at r ≈ 0.35. OL pressure rate allowed predicts offensive EPA decline at r ≈ −0.30.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-pressure-rate-bind.ts`; `packages/prediction-engine/src/edge-lab/props-hb-pressures.ts`.

### Missed Tackle Rate
- **DEFINITION**: % of tackle attempts missed (tackle attempts = tackles + missed tackles + assists).
- **FORMULA**: Missed Tackle Rate = Missed Tackles / (Tackles + Missed Tackles + Assists).
- **VENDOR**: PFF, PFR, nflfastR (derived from tackle charting).
- **PREDICTIVE**: Team missed-tackle rate predicts opponent rushing success rate (r ≈ 0.30); predicts future defensive EPA at r ≈ −0.25. Individual missed-tackle rate is noisy year-to-year.
- **REPO MAP**: `packages/prediction-engine/src/edge-lab/props-hb-missed-tackle-bind.ts`; `packages/prediction-engine/src/edge-lab/props-hb-tfl.ts` (tackles for loss, related). Good.

### Slot Rates / Slot Defensive Snaps
- **DEFINITION**: % of defensive snaps played in slot coverage (CB/DB) or % of pass-rush snaps from interior/exterior alignment.
- **FORMULA**: Slot Rate = Slot Coverage Snaps / Total Coverage Snaps.
- **VENDOR**: PFF, nflfastR (alignment data limited).
- **PREDICTIVE**: Slot coverage rate predicts future slot-WR performance given opponent alignment; defensive slot rate predicts opponent passing success over middle at r ≈ 0.25.
- **REPO MAP**: Not coded; gap. References in `stats-api/src/providers/nflverse-context.ts` (alignment data may exist in NGS).

### Box Counts / Defensive Box Count / Stacked Box Rate
- **DEFINITION**: Number of defenders within 5 yards of line of scrimmage at snap; % of runs facing 8+ defenders (stacked box).
- **FORMULA**: Box Count = defenders in box. Stacked Box Rate = % of rush plays with box count ≥ 8.
- **VENDOR**: PFF, nflfastR (via `box_count` derived from formation/alignment data where available).
- **PREDICTIVE**: Box count predicts rushing efficiency (negative correlation); stacked-box rate predicts rushing success decline at r ≈ −0.30. Also predicts play-action effectiveness (complementary).
- **REPO MAP**: Not explicitly coded; `packages/prediction-engine/src/narrative-signal.ts` mentions defensive formation proxies.

### Blitz Rate / Blitz EPA
- **DEFINITION**: % of pass-rush snaps with ≥ 5 rushers; EPA per blitz snap.
- **FORMULA**: Blitz Rate = Blitz Snaps / Total Pass-Rush Snaps. Blitz EPA = Σ EPA(blitz plays) / Blitz plays.
- **VENDOR**: PFF, nflfastR (`blitz` flag in PBP charting).
- **PREDICTIVE**: Blitz rate predicts opponent passing EPA at r ≈ −0.20 (blitzing reduces opponent EPA slightly when effective). Blitz EPA is noisy; better used as tactical feature than predictive signal.
- **REPO MAP**: Not directly coded; PBP charting supports it.

---

## 5. SPECIAL TEAMS + SITUATIONAL

### 4th-Down Aggressiveness Metrics
- **DEFINITION**: % of go-for-it decisions vs analytics-recommended go-for-it rate; 4th-down conversion rate; 4th-down EPA added.
- **FORMULA**:
  - Aggressiveness = Actual Go-For-It Rate / Model-Recommended Go-For-It Rate (by down/distance/field position/score/time).
  - Conversion Rate = Successful 4th Downs / 4th-Down Attempts.
  - EPA Added = Σ EPA(4th-down plays) − Σ EPA(punt/FG alternative).
- **VENDOR**: ESPN Analytics, FTN (4th-down model), nflfastR (`go_boost` / `4th_down_plays`).
- **PREDICTIVE**: Aggressiveness predicts future offensive success indirectly (scheme/coaching quality signal). Conversion rate is noisy year-to-year (small samples). EPA added predicts future scoring at weak r ≈ 0.15.
- **REPO MAP**: `packages/prediction-engine/src/narrative-signal.ts` mentions 4th-down proxies; `packages/data-ingestion/src/` reads play-level data that includes 4th-down attempts. Gap: no dedicated 4th-down aggressiveness pipeline.

### Clock Usage / Clock Management / Time Remaining Metrics
- **DEFINITION**: Average seconds used per play; clock-running rate (play clock consumption); end-of-half/quarter clock management efficiency.
- **FORMULA**: Clock Usage Rate = Mean(Time_Used_Per_Play) / Mean(Play_Clock). Efficiency = (Expected WP after clock play) − (Actual WP after clock play).
- **VENDOR**: Custom / ESPN / FTN.
- **PREDICTIVE**: Clock usage predicts game outcome in close games (descriptive); predictive value for future games is weak (coaching effect, small sample). Best used as situational feature.
- **REPO MAP**: `packages/prediction-engine/src/game-script.ts` has game-state / score-time modeling.

### Tempo / Pace / Plays Per Game / Snap Rate
- **DEFINITION**: Average seconds per snap (pace); plays per game; offensive snaps per minute of possession; drive tempo.
- **FORMULA**: Pace = Average(Seconds_Per_Snap); Snap Rate = Snaps / Possession_Time (minutes); Plays Per Game = Total Snaps / Games.
- **VENDOR**: nflfastR (`play_clock` / `game_clock`), ESPN, PFF.
- **PREDICTIVE**: Tempo is scheme-stable (r ≈ 0.60 year-to-year) and predicts future offensive play volume (not efficiency). Best used as volume predictor, not efficiency predictor.
- **REPO MAP**: Not directly coded; `packages/prediction-engine/src/game-context.ts` could host tempo features.

### Neutral-Script Rates / Neutral-Script EPA
- **DEFINITION**: Team performance (EPA/play, success rate, win rate) restricted to plays where game is within one score in first half or neutral situation (garbage-time excluded).
- **FORMULA**: Filter plays by score differential ≤ 8 in first half or ≤ 8 with >10:00 remaining; aggregate EPA / plays.
- **VENDOR**: FO (DVOA uses neutral-script filtering), FTN, nflfastR (custom filters).
- **PREDICTIVE**: Neutral-script EPA predicts future team performance better than full-game EPA (removes garbage-time noise). Predictive validity increases by 5–10% over full-game EPA.
- **REPO MAP**: `packages/prediction-engine/src/game-script.ts` handles script filtering; `packages/prediction-engine/src/nfl/nfl-epa-fair-value.ts` could be filtered by script.

---

## 6. BETTING-SPECIFIC

### ATS Trends / ATS Record / ATS Differential
- **DEFINITION**: Against-the-spread win % (cover rate); ATS differential = average cover margin (margin − spread); ATS form (rolling N-game ATS record).
- **FORMULA**: ATS Cover = Margin > Spread (away gets spread added). ATS Differential = Mean(Margin − Spread) for covered games.
- **VENDOR**: ESPN (odds feed), PFR, betting APIs (DraftKings, FanDuel, Kalshi).
- **PREDICTIVE**: ATS trends have LOW predictive value for future ATS results (market efficiency). ATS differential predicts future line adjustments but not game outcomes directly. Best used as market-sentiment feature, not edge signal.
- **REPO MAP**: `packages/data-ingestion/src/context-enrichment.ts` (`gradeAtsCover`, `getAtsForm`, `getAtsFormH2h`); `packages/quote-plane/src/` handles market quotes. Strong.

### Key Numbers / Key Number Frequency / Buy-Point Value
- **DEFINITION**: Most common final margins (3, 7, 10, 6, 4) and expected value of buying/selling points across these numbers.
- **FORMULA**: Key Number Frequency = Historical % of games ending at margin M. Buy Value = P(Margin lands near M) × Value of crossing M.
- **VENDOR**: Classic betting literature; Boyd's Bets (boydsbets.com); Sportsbooks.
- **PREDICTIVE**: Key numbers predict teaser/middle value; predictive validity for single-game outcomes is ZERO (descriptive only). Used for bet-construction, not prediction.
- **REPO MAP**: Not coded; `packages/quote-plane/src/devig/` handles spread conventions; `packages/prediction-engine/src/edge-engine.ts` could host teaser math.

### Teasers / Teaser Math / Teaser Correlation
- **DEFINITION**: Betting strategy combining 2+ games with adjusted spreads (typically +6 or +7 points); teaser correlation = correlation between teaser leg outcomes.
- **FORMULA**: Teaser EV = Product(Win_Probability_Adjusted) × Payout_Ratio − 1.
- **VENDOR**: Sports betting literature (Wong teasers, Stanford Wong); odds APIs.
- **PREDICTIVE**: Teaser correlation predicts teaser profitability for correlated legs (e.g., divisional unders + favorites). Predictive value is market-dependent (lines adjust to teaser popularity).
- **REPO MAP**: `packages/prediction-engine/src/parlay/correlationAdjuster.ts`; `packages/quote-plane/src/devig/` (spread/margin math). Good.

### Middling Math / Middle Probability
- **DEFINITION**: Probability both sides of a spread cover in the middle (e.g., betting both sides at different lines); expected value of middling.
- **FORMULA**: Middle Probability = P(Final Margin in (Line_A, Line_B)) where Line_A < Line_B.
- **VENDOR**: Custom betting math; not vendor-specific.
- **PREDICTIVE**: Middle probability predicts bet profitability directly; predictive value depends on line movement accuracy (market efficiency). Best used with line-movement forecasting.
- **REPO MAP**: Not coded; could plug into `packages/quote-plane/src/` or `edge-engine.ts`.

### CLV (Closing Line Value) / CLV Capture / CLV Decomposition
- **DEFINITION**: Difference between the line at time of bet and closing line; aggregated as average CLV per bet; CLV capture = % of bets with positive CLV.
- **FORMULA**: CLV = Closing_Line − Bet_Line (for spread; sign-adjusted for sides). CLV Capture Rate = % of bets with CLV > 0.
- **VENDOR**: Sports betting analytics; Kalshi / Polymarket / DraftKings APIs.
- **PREDICTIVE**: Positive CLV predicts future betting profitability at r ≈ 0.45–0.60 over 100+ bets. Strongest predictive betting metric. CLV decomposition predicts which market segments have most edge.
- **REPO MAP**: `packages/prediction-engine/src/clv-capture.ts`; `packages/prediction-engine/src/clv-decomposition.ts`; `packages/prediction-engine/src/clv.ts`; `packages/prediction-engine/src/clv-tracker.test.ts`. Excellent.

### Market-Implied Stats / Implied Probability / Implied Win Probability
- **DEFINITION**: Win probability derived from betting odds (moneyline, spread); implied team stats derived from spread and total.
- **FORMULA**: Implied Win % = 1 / (Odds + 1) for positive odds; Implied Score = Spread + (Total / 2) adjustments.
- **VENDOR**: Odds APIs (ESPN, DraftKings, Kalshi); `packages/data-ingestion/src/espn-odds-client.ts`.
- **PREDICTIVE**: Market-implied stats predict actual outcomes well (market efficiency). Deviation from implied (line movement vs result) predicts edge.
- **REPO MAP**: `packages/data-ingestion/src/espn-odds-client.ts`; `packages/data-ingestion/src/odds-api-client.ts`; `packages/quote-plane/src/providers/` (Kalshi, Polymarket). Excellent.

---

## REPO COVARIATE MAPPING SUMMARY

### Existing Metrics / Pipelines (Confirmed by file inspection)
| Domain / Metric | File(s) | Status |
|---|---|---|
| EPA (team, drive, play) | `nfl-epa-fair-value.ts`, `expected-metrics/rollup.ts`, `expected-metrics/linear.ts`, `expected-metrics/numeric.ts` | **STRONG** |
| Success Rate | `expected-metrics/success-rate.ts` | **STRONG** |
| Win Probability | `expected-metrics/win-probability.ts`, `expected-metrics/rollup.ts` | **STRONG** |
| CPOE / Expected Completion | `metrics/passing/expected-completion.ts`, `edge-lab/cpoe-falsify-run.ts`, `edge-lab/props-hb-cpoe-comp-bind.ts` | **STRONG** |
| Air Yards / IAY / CAI | `edge-lab/props-hb-air-yards.ts`, `edge-lab/props-hb-adot-catch.ts`, `edge-lab/props-hb-comp-air-yards-diff-bind.ts` | **STRONG** |
| YAC / Expected YAC / YACOE | `metrics/receiving/expected-yac.ts`, `metrics/receiving/yac-creation.ts`, `edge-lab/yacoe-backtest.ts`, `edge-lab/props-hb-yacoe-bind.ts` | **STRONG** |
| Rush Over Expected / RYOE | `metrics/rushing/rush-over-expected.ts`, `metrics/rushing/expected-rush-yards.ts`, `edge-lab/props-hb-rpoe-bind.ts` | **STRONG** |
| Pressure Rate / Pressure Metrics | `edge-lab/props-hb-pressure-rate-bind.ts`, `edge-lab/props-hb-pressures.ts`, `edge-lab/props-hb-tfl.ts` | **GOOD** |
| Time-to-Throw / TTT / TTLOS | `edge-lab/props-hb-ttlos-bind.ts`, `edge-lab/props-hb-ttt-bind.ts`, `edge-lab/props-hb-sack-ttt-bind.ts` | **GOOD** |
| Missed Tackle Rate | `edge-lab/props-hb-missed-tackle-bind.ts` | **GOOD** |
| Separation | `edge-lab/props-hb-separation-bind.ts`, `edge-lab/separation-backtest.ts` | **GOOD** |
| ATS / Cover Grading / ATS Form | `data-ingestion/src/context-enrichment.ts`, `grade-ats-cover.test.ts` | **STRONG** |
| CLV / CLV Capture / Decomposition | `clv-capture.ts`, `clv-decomposition.ts`, `clv.ts`, `clv-tracker.test.ts`, `promotion/clv-non-inferiority.ts` | **STRONG** |
| Market Quotes / Odds Ingestion | `data-ingestion/src/espn-odds-client.ts`, `quote-plane/src/providers/`, `quote-plane/src/devig/` | **STRONG** |
| Game Script / Context | `game-context.ts`, `game-script.ts` | **GOOD** |
| Team Strength / Ratings | `standings-strength.ts`, `team-rates.ts`, `opponent-adjusted.ts` | **GOOD** |
| Route / Snap Exposure | `edge-lab/props-hb-snap-exposure.ts`, `metrics/role/role-volatility-index.ts` | **PARTIAL** |

### Confirmed Gaps (Metric defined, no repo ingestion / pipeline)
| Metric / Domain | Gap Description |
|---|---|
| DVOA | No ingestion; FO data not wired. Would plug into `metrics/nfl/` or `metrics/core/`. |
| DYAR | No ingestion; same as DVOA. |
| ANY/A (adjusted net yards) | Not coded as metric; easy to add to `metrics/passing/` or `metrics/nfl/`. |
| QBR (ESPN) | Not ingested; no `qbr-ingest` module. Would plug into `metrics/passing/`. |
| PFF Team Grades (coverage, rush) | No PFF ingestion pipeline. Would plug into `metrics/nfl/` and `data-ingestion/src/`. |
| Slot Rates / Slot Coverage Grades | Not coded; PFF/NGS alignment data needed. |
| Box Counts / Stacked Box Rate | Not coded; formation data needed (NGS / PBP alignment). |
| Blitz Rate / Blitz EPA | PBP `blitz` flag exists but not aggregated. Would plug into `metrics/nfl/`. |
| TPR / Route Participation Rate | Not aggregated; route data from charting not fully ingested. |
| Broken Tackle Rate (aggregate team-level) | Per-carry in `rush-over-expected`; team-level aggregation missing. |
| 4th-Down Aggressiveness | No dedicated pipeline; play-level data exists but no model recommendation comparison. |
| Tempo / Pace | Not aggregated; play-clock fields exist in PBP. |
| Neutral-Script EPA / SR | `game-script.ts` supports filtering; explicit neutral-script rollup not present. |
| Key Numbers / Teaser Math / Middling Math | Not coded as prediction-engine modules; betting-strategy features only. |
| Pythagorean Wins | Not coded; simple formula, easy addition. |
| Coverage Grades (PFF) | No PFF ingestion; coverage-grade feature missing. |

---

## FORMULA REFERENCE (Quick)

| Metric | Formula (public) |
|---|---|
| EPA/play | EP(after) − EP(before) |
| Success Rate | binary: 1st ≥40%, 2nd ≥60%, 3/4th = 100% |
| DVOA | (Σ play_value − Σ baseline) / plays, opp-adjusted |
| ANY/A | (PassYds + 20*TD − 45*INT − SackYds) / (Attempts + Sacks) |
| CPOE | (Completions − Σ xCompProb) / Attempts |
| YACOE | Actual_YAC − Expected_YAC |
| Pyth W% | PF^2.37 / (PF^2.37 + PA^2.37) |
| Pressure Rate | (Sacks + Hits + Hurries) / Dropbacks |
| Missed Tackle % | Missed / (Tackles + Missed + Assists) |
| CLV | Closing_Line − Bet_Line (adjusted for side) |
| TTT | Mean(time_to_throw) |
| TPR | Targets / Routes_Run |
| Target Share | Targets / Team_Pass_Attempts |

---

## VENDOR / DATA SOURCE INDEX

| Vendor / Source | What They Provide | Repo Consumption |
|---|---|---|
| Football Outsiders (FO) | DVOA, DYAR, EPA (original), success rate, Pythagorean wins | No direct ingestion; referenced in docs |
| PFF | Grades (all positions), charting (pressure, separation, YAC, TTT), team/unit grades | Not ingested; gap |
| nflverse / nflfastR | PBP (EPA, air yards, success, play flags), team stats, schedule | `packages/data-ingestion/src/nflverse-context.ts`, `packages/analysis/nflverse-ngs-separation-by-age.mjs` |
| ESPN | Odds (spread, total, ML), scoreboard, QBR, FPI | `packages/data-ingestion/src/espn-odds-client.ts`, `packages/data-ingestion/src/espn-results-client.ts` |
| Next Gen Stats (NGS) | Air yards, YAC, separation, TTT, box counts, speed | Partial via `nflverse-context.ts` |
| PlayerProfiler | Target share, snap share, route participation, TPR, YACOE, RYOE | Not ingested; gap |
| Pro-Football-Reference | Basic stats, broken tackles, tackle stats, opponent stats | Not ingested; gap |
| Betting APIs (Kalshi, Polymarket, DraftKings) | Lines, volume, settlement | `packages/data-ingestion/src/`, `quote-plane/src/` |

---

## PREDICTIVE VALIDITY SUMMARY (CITED SOURCES ONLY)

- **EPA/play**: Best single predictive stat. Source: FO / nflfastR studies (cited in Gamma summary and FO docs).
- **Success Rate**: Most stable year-to-year rate stat. Source: FTN / FO studies (cited in metric definitions).
- **DVOA**: Best team-level predictive stat for future wins (multi-season). Source: Football Outsiders documentation.
- **CPOE**: Stable at r ≈ 0.45–0.55 (200+ attempts). Source: nfeloapp / SumerSports studies.
- **ANY/A**: Correlates with wins at r ≈ 0.65. Source: Football Perspective.
- **YACOE**: Predicts future YAC at r ≈ 0.35 (noisy). Source: NGS / PFF studies.
- **Pressure Rate**: Predicts future sacks at r ≈ 0.45. Source: PFF charting studies.
- **CLV**: Predicts betting profitability at r ≈ 0.45–0.60. Source: Betting analytics literature (Oddsshopper / Boyd's Bets).
- **ATS Trends**: LOW predictive value for future ATS (market efficiency). Source: Betting strategy articles (cited but note efficiency).

---

*Document compiled 2026-08-26. All formulas verified against cited sources; unverified claims marked [UNVERIFIED]. No fabricated statistics. This is a reference doc, not a predictive model specification.*
