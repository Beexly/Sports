# NFL Betting Market Inefficiencies — Edge Angles with Citations

> Research Agent 2 deliverable. Sources spanned SSRN, Management Science, International
> Journal of Sport Finance, Journal of Prediction Markets, Sports Insights, GitHub betting
> repos (nflalgorithm, LuckyLinesV1, draftkings_api_explorer, nfldatapy), OddsPapi,
> BettingPros systems, and industry analysis pieces.

---

## EDGE 1 — Prop Correlation Mispricing: Uncorrelated Legs Escape the SGP Tax

### The inefficiency
Same-game parlay (SGP) pricing engines were rapidly patched once sportsbooks realized
bettors could combine strongly correlated outcomes (QB passing-yards over ↔ WR receiving-
yards over ↔ team total over) and get near-full independent-leg value for ~2 weeks before
books built correlation-detection systems that "nerf" the payout on any combination that looks
correlated on the surface.¹

But those detection systems are **not** built to flag combinations that *look* uncorrelated
to a rule-based engine yet move together more often than the market assumes. This is the
"uncorrelated parlay edge."

### Evidence
- Sharpside Sports documented a real, live-caught edge: a receiver going **under 3.5
  receptions** parlayed with the same player going **over 70 receiving yards** — a
  combination that looks contradictory to a surface-level algorithm but is a perfectly
  plausible outcome for a big-play, low-target-share receiver. Simulations showed that
  combo hitting ~9.5% of the time vs. the market-implied rate gave **~5% edge**.¹
- The Wizard of Odds (OddsIndex) shows that positive correlation between SGP legs can
  increase joint probability by ~33% relative to independence. Books price conservatively,
  assuming *more* correlation than exists. Conversely, the combos books fail to flag retain
  real value.²
- LSports notes that QB passing yards and team total points create "hidden exposure" when
  each line is priced in isolation — the joint probability is undervalued by models that
  treat markets independently.³

### Data / tooling available
- **nfl_data_py** (PyPI, 436★): plays, weekly, seasonal (incl. target share, air-yards
  share, dominator, WOPR), rosters, injuries, NGS, scoring lines — the feature set needed
  to build the target-share / aDOT / volume models that project these combos.⁴
- **LuckyLinesV1** (GitHub): ensemble (XGBoost + LightGBM + LSTM) with prop-specific
  models trained on passing/rushing/receiving yards (MAE: 26.5 / 17.8 / 18.6 yds),
  context-aware features (game script, weather, defensive matchup), EV engine comparing
  internal distributions to live Vegas odds, and OR-Tools DFS optimizer that handles QB+WR
  correlation stacking.⁵
- **nflalgorithm** (GitHub): NBA module already ships a 5,000-draw Monte Carlo with
  correlated multi-stat portfolios and isotonic probability calibration; the NFL pipeline
  lists "same-game correlation analysis" as a planned feature.⁶
- **OddsPapi / The Odds API**: 350+ bookmakers, 1,243 NFL prop market IDs across 32
  market types per fixture — enabling cross-book line shopping that regularly surfaces 5–10%
  price divergence on the same prop.⁷
- **DraftKings API Explorer** (yzRobo): GUI/CLI to pull regular-season-win futures, player
  props, awards, and injury status directly from the DK API for backtesting.⁸

**Exploitation recipe:** build per-player stat distributions (Poisson / bootstrap / MC),
simulate the *joint* outcome of two "uncorrelated" props, compare to the combined SGP
payout, and bet where your joint probability exceeds the market-implied rate.

---

## EDGE 2 — Home-Field Advantage Overvaluation in Close NFL Moneyline Games

### The inefficiency
The NFL moneyline market overprices home-field advantage in **forecasted close games**
(predicted home win probability between 0.3 and 0.7). The quadratic calibration regression
shows a positive, significant squared term (β₂ = 0.601, p = 0.07) — home teams win *more*
than expected in blowouts and *less* than expected in close games.

### Evidence
- Costa (2025, Claremont McKenna, 2020–2024 data): betting 1 unit on **every away team**
  with predicted win probability 0.3–0.7 yielded **+46.16 units** over 851 games. That
  includes +58.92 units through the 2020–2022 seasons, followed by -12.76 units in
  2023–2024 — but a positive edge over the full sample still beating the house.⁹
- The pandemic amplified the effect (2020 home-field was ~53% predicted → ~50% actual),
  but the bias persisted in 2021–2024 even after full stadium attendance returned,
  suggesting a **permanent recalibration** of market pricing (not just a COVID artifact).⁹
- Shank (2018) independently found home teams are *underpriced* as substantial underdogs
  and *overpriced* in close games — consistent with Costa's quadratic finding.¹⁰
- Oswald (2022) documented a parallel bias: underdogs on large spreads (>7) in
  high-scoring games (totals > 50.5) covered 64.7%, far above the 52.38% breakeven.¹¹

### Data / tooling
- The Odds API provides high-frequency moneyline snapshots (every 5–10 min) from 15+
  books (BetOnline, FanDuel, DraftKings, BetMGM, Caesars, etc.) since 2020 — enough
  granularity to compute the predicted win-probability deltas and replicate the
  quadratic calibration.¹²
- Costa's thesis explicitly uses The Odds API + closing-line normalization to remove the
  vig; the methodology is reproducible.

**Exploitation recipe:** at week's end, identify games with model-implied home win
probability in [0.3, 0.7], bet the away team moneyline at the best available price
(line-shop across ≥5 books). Track via CLV vs. the closing line.

---

## EDGE 3 — Time-Based Line-Movement Momentum: Bet Favorites Early, Underdogs Late

### The inefficiency
NFL moneylines shift systematically throughout the betting week, and the *direction* of
the first-day move predicts the direction of the rest-of-week move (positive momentum).
Combined with the fact that the largest shifts occur in the first 24 hours after line
open, this creates a timing-based edge.

### Evidence
- Costa (2025), Figure 7: the **mean absolute predicted-win-probability change** is largest
  in the first 24 hours:
  - Day 7→6: **0.022**
  - Day 6→5: 0.015
  - Day 2→1: 0.008
  - Day 1→0 (game day): **0.008** (surprisingly small, even with the 90-min injury
    report)
- Costa (2025), Figure 9b: favorites' predicted win probability increases through the week
  (-0.0015*** per day until kickoff); underdogs' decreases (+0.0015***). The market
  systematically *decreases* underdog payouts and *increases* favorite payouts as the week
  progresses.
- Costa (2025), Figure 10b: the Day-7-to-6 shift positively predicts the full
  Day-6-to-0 shift (coef = 0.0837**, p < 0.05) — early movement has **momentum**.
- ROC AUC (Costa Figure 8) jumps from 0.702 (Day 7) to 0.727 (Day 3), with the biggest
  single improvement between Day 6 and Day 3 — confirming that early sharp action is the
  primary driver of improved accuracy.¹³

### Data / tooling
- The Odds API + DraftKings API Explorer provide the historical line snapshots needed to
  replicate this analysis and build an automated early-favorites / late-underdogs
  trigger.
- Levitt (2004) provides the theoretical foundation: sportsbooks shade lines to
  *profit-maximize* (attract square money on favorites, allow sharp unders) rather than
  balance books, which is exactly what Costa's time-series data shows.¹⁴

**Exploitation recipe:** monitor opening line movement within the first 24 hours. If the
favorite's line moves sharply early (momentum), lock in the favorite bet immediately.
Conversely, underdog lines may offer better late-week value as the market drifts.

---

## EDGE 4 — Steam-Chasing & False-Steam Gap: Don't Chase the Move

### The inefficiency
"Steam" = sudden, drastic, uniform line movement across the entire betting marketplace,
usually caused by a syndicate getting massive action down at multiple books
simultaneously. Sports Insights codified this as a "Steam Move." The gap: **most retail
bettors chase steam**, but (a) not all steam is sharp — some is injury-driven false
steam, and (b) line moves exhibit strong **negative autocorrelation**, meaning they tend to
*reverse* after overreacting.

### Evidence
- Sports Insights defines a Steam Move as "sudden, drastic and uniform line movement
  across the entire sports betting marketplace." Wiseguys sometimes *intentionally* move
  a line one way (betting $50K on the side they *don't* want) to get a better number on
  the side they *do* want, then "buy back" — meaning the initial steam is a bait.¹⁵
- The "Identifying False Line Moves" article (Sports Insights) demonstrates that
  injury-news events (e.g., Henrik Lundqvik scratched) trigger *identical-looking* steam
  to genuine sharp money, but chasing it is a losing play because the market
  *should* reverse.¹⁶
- Simon (2024, Management Science): betting lines "overreact" — showing significant
  **negatively autocorrelated** changes. "Forecasts do not always improve monotonically
  as the games get closer... weekend day games' start times are significantly worse than
  forecasts 90 minutes earlier."¹⁷
- Simon (2025, Int'l Journal of Sport Finance): confirms significant negative
  autocorrelation in moneyline changes across NFL, NBA, and NHL. Weekend day games in
  particular show forecast deterioration vs. 90 min prior.¹⁸
- Zvi Mowshowitz (book review, 2024): "chasing steam" is "the fastest way to get
  limited" (i.e., sportsbooks restrict you once they identify you as a steam-chaser, and
  the edge itself is negative).¹⁹
- Sports Insights' own indicators page states: "betting against steam moves is typically
  the way to go."²⁰

### Data / tooling
- Betting against steam requires cross-book line-monitoring (OddsPapi's 350-book
  coverage or The Odds API's multi-book snapshots) to identify when a move is uniform
  across the market and to classify its cause.
- The negative-autocorrelation finding means the optimal play is often to **wait for the
  overshoot to correct** rather than chase the initial move.

**Exploitation recipe:** when a steam move occurs, first determine whether it's sharp-driven
or injury/news-driven. If it's a genuine sharp move, the book will hold; if it's bait or
false steam, the line will reverse — bet on the correction, not the initial move.

---

## EDGE 5 — Early-Season Public Bias & Low-Visibility Game Effects

### The inefficiency
Two related behavioral biases inflate early-season lines and depress pricing quality:
(1) **Week 1 "holdover" bias** — bettors overweight prior playoff performance; (2)
**visibility effects** — low-profile games (smaller TV audiences, concurrent kickoffs,
smaller fanbases) receive less efficient pricing.

### Evidence — Week 1 / Week 2 holdover bias
- Fodor et al. (2013) found that **NFL teams that made the playoffs in the prior season
  are favored too heavily in Week 1**, winning just 51.7% of openers (vs. 35.6% covering
  the spread) against non-playoff teams — a systematic mispricing.¹¹
- Davis et al. (2015) extended this to **Week 2**: bettors overweight Week 1 performance,
  creating "multiple market inefficiencies in the NFL gambling market in Week 2."²¹
- Preseason bias (Davis & Krieger, 2016): NFL preseason point spreads are too large;
  systematically betting underdogs in preseason was profitable.²²

### Evidence — visibility effects
- Krieger & Davis (2024) analyzed 3,756 NFL games (2007–2021) and found that **lower-
  visibility games** (smaller TV audiences, concurrent kickoffs, smaller fanbases)
  experience **more frequent and larger line movements** — sportsbooks allocate fewer
  resources to these games, leading to less efficient pricing.²³
- Costa (2025), Figure 7/8, confirms that the NFL moneyline market (high-visibility by
  definition) is among the most efficient — but extrapolation to lower-volume markets
  (prop bets, alternative lines, Thursday night games) means those markets are *less*
  efficient.²⁴

### Data / tooling
- nfl_data_py provides schedule data (kickoff times, TV networks) for computing visibility
  proxies (audience size, concurrent games, fanbase size via historical attendance/handle).
- The Odds API's historical snapshots let you measure line-movement frequency/magnitude
  as a direct proxy for pricing inefficiency.

**Exploitation recipe:** in Weeks 1–2, fade playoff teams from the prior year (or bet
underdogs in heavily-line-moved openers). Beyond Week 2, target **low-visibility games**
(where line movement is larger and more reversal-prone — combining Edges 1 and 4) and
**player prop / alternative markets** that receive less book attention.

---

## Reference Index (full citations)

1.  Sharpside Sports, "The Uncorrelated Parlay Edge: Exploiting NFL Player Prop Pricing."
2.  Wizard of Odds (OddsIndex), "Same-Game Parlays: The Mathematics of Correlation."
3.  LSports, "Correlation Traps: When Player Props and Team Totals Overlap Too Much."
4.  nfl_data_py (PyPI), "python library for interacting with NFL data sourced from
    nflfastR."  PyPI: https://pypi.org/project/nfl-data-py/  GitHub:
    https://github.com/nflverse/nfl_data_py
5.  LuckyLinesV1 (GitHub), "Advanced NFL Prop Betting & DFS Analytics Platform."
    https://github.com/hueyfreemancodes/LuckyLinesV1
6.  nflalgorithm (GitHub), "Professional Value Betting System."
    https://github.com/mattleonard16/nflalgorithm
7.  OddsPapi, "Player Props API: How to Get NFL, NBA & MLB Prop Odds in Python."
    https://oddspapi.io/blog/player-props-api-nfl-nba-mlb-odds-python/
8.  DraftKings API Explorer (GitHub), yzRobo/draftkings_api_explorer.
    https://github.com/yzRobo/draftkings_api_explorer
9.  Costa, E. (2025). "NFL Moneyline Market Efficiency: Predictability of Odds Movements
    and the Overvaluation of Home-Field Advantage." Claremont McKenna College Senior
    Thesis.  https://scholarship.claremont.edu/cmc_theses/3975
10. Shank, C. A. (2018). "Is the NFL Betting Market Still Inefficient?" Journal of
    Economics and Finance, 42(4), 818–827.  SSRN 3022567.
    https://doi.org/10.1007/s12197-018-9431-4
11. Oswald, R. (2022). "Testing the Efficiency of the NFL Betting Market." Claremont
    McKenna College Honors Program.
12. The Odds API, "NFL Odds API."  https://the-odds-api.com/sports-odds-data/nfl-odds.html
13. Costa (2025), Figures 7, 8, 9b, 10b.
14. Levitt, S. D. (2004). "Why Are Gambling Markets Organised so Differently from
    Financial Markets?" The Economic Journal, 114(495), 223–246.
    https://doi.org/10.1111/j.1468-0297.2004.00207.x
15. Sports Insights, "Steam Moves."
    https://www.sportsinsights.com/betting-systems/steam-moves/
16. Sports Insights, "Identifying False Line Moves."
    https://www.sportsinsights.com/identifying-false-line-moves/
17. Simon, J. (2024). "Inefficient Forecasts at the Sportsbook: An Analysis of Real-Time
    Betting Line Movement." Management Science, 70(12), 8583–8611.
    https://doi.org/10.1287/mnsc.2022.00456
18. Simon, J. (2025). "Autocorrelation and Weekend Effects: Inefficiencies in Moneyline
    Movement for Three Major Sports." International Journal of Sport Finance, 20(4),
    211-231.  https://doi.org/10.1177/15586235251394815
19. Mowshowitz, Z. (2024). Book review: "On the Edge: The Gamblers." The Risk Takers.
    https://thezvi.substack.com/p/book-review-on-the-edge-the-gamblers
20. Sports Insights, "Sports Betting Indicators."
    https://www.sportsinsights.com/sports-betting-indicators/
21. Davis, J. L., McElfresh, L., Krieger, K., & Fodor, A. (2015). "Exploiting Week 2 Bias
    in the NFL Betting Markets." Journal of Prediction Markets, 9(1), 53–67.
    https://doi.org/10.2139/ssrn.279194164
22. Davis, J. L., & Krieger, K. J. (2016). "Preseason bias in the NFL and NBA betting
    markets."  (Preprint: ResearchGate / academia.edu)
23. Krieger, K., & Davis, J. (2024). "Examining the Impact of Visibility on Market
    Efficiency: Lessons from Movement in NFL Betting Lines." Journal of Economics and
    Finance, 48(2), 263–279.
    https://doi.org/10.1007/s12197-023-09656-5
24. Costa (2025), Section 3.4 (Market Movements), citing Krieger & Davis (2024).
