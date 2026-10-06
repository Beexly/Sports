# Competitor scrape reference — 2026-09-12

Source: founder scraping agent, extract-data-2026-09-12.json.
Scraped: LineStar, PropFinder, RotoGrinders, RotoWire, SaberSim, OddsShopper,
Statcast, Fangraphs, Baseball-Reference, Pro-Football-Reference,
Basketball-Reference, Hockey-Reference, NFL Savant, RBSDM, The Odds API,
Polymarket, DraftKings, scikit-learn, arxiv (grouping loss), nflverse.

## LineStar Props table columns (the target)

From `https://www.linestarapp.com/Props`:

| Column | What it is |
|---|---|
| position / team | Player identity |
| Recent Form: Last 5, Last 10, Season, Last LG | Rolling windows |
| Projection (confidence) | Their number + a confidence read |
| Market (odds, prop line/type) | The posted line and price |
| Edge (+EV, Edge %) | Edge against the market |
| Matchup (Matchup+ Imp, Matchup) | Opponent context |
| Pick / consensus | Over / Under split |
| Over / Under | The two sides |
| Chat | Community |

**Our projections table already ships:** Sal, Proj, Val, Ceil, pOwn%, Lev.
**Missing vs LineStar:** Recent Form windows, Matchup impact, Over/Under consensus.

## Statcast columns (the underlying metrics)

From `https://baseballsavant.mlb.com/statcast_leaderboard`:

- EV50 — average of hardest 50% of batted balls (batter) / softest 50% allowed (pitcher)
- Hard Hit 95 MPH+ (%), Hard Hit (%)
- Barrels #, Brls/BBE (%), Brls/PA (%)
- LA SwSp% (Launch Angle Sweet-Spot %)
- Exit Velocity Max / Avg (MPH)
- Distance Max / Avg (ft)
- Qualifiers: 2.1 PA/team game (batters), 1.25 PA/team game (pitchers)

## PropFinder NFL/CFB columns

- target share, snap counts, coverage matchups, weekly usage trends
- TD / rushing / redzone / line / coverage matchup cheatsheets
- hit rates, opponent matchup ranks
- QB rankings, win totals, home-field advantage, weather
- model spreads, totals, projections, win probability

## Formulas captured

- **Platt scaling:** `p(y=1|f) = 1/(1+exp(Af+B))`, A and B fitted by MLE
- **Isotonic objective:** `sum (y_i - f^i)^2` s.t. `f^i >= f^j whenever f_i >= f_j`
- **Temperature scaling:** `softmax(z/T)`
- **EV50:** average of hardest 50% (batter) / softest 50% allowed (pitcher)
- **Grouping loss** (arXiv 2210.16315): "given the calibration loss, the missing
  piece to characterize individual errors is the grouping loss"
- **PickFinder:** "every price against a devigged fair line, ranked by edge"
- **SaberSim:** "simulates every game thousands of times, play-by-play"

## Scoring / ranking logic captured

- RotoWire: "most projected fantasy points for each roster spot while balancing
  salary-cap restrictions and stacking"
- SaberSim: "high-upside lineups and optimize for ROI"; controls player
  exposures, team stacks, game stacks
- PickFinder: "EV+ prices against a devigged fair line, ranked by edge"
- RBSDM: EPA and Weighted EPA views, garbage-time win-probability filter

## What to scrape next

1. **LineStar Props deep page** (logged in) — the actual Recent Form numbers,
   Matchup+ Imp values, and confidence formula. The marketing page names the
   columns but not the math.
2. **PropFinder NFL cheatsheets** (logged in) — the TD/rushing/redzone/line/
   coverage matchup data. The sign-in gate blocked the public fetch.
3. **SaberSim optimizer** (trial) — the lineup rules builder and contest sim
   controls. $7 for 7 days.
4. **OddsShopper Portfolio EV** — the custom devigging method.
5. **Fangraphs projections** (ATC, THE BAT, Steamer, ZiPS) — the model families
   and their weights. The projections page lists model names; the methodology
   pages have the math.
6. **nflverse Next Gen Stats** — sprint speed, time to throw, separation.
   Already in our source registry; needs the license check.
7. **PrizePicks / Underdog public pick %** — the consensus over/under split
   the founder wants for the 5,000-over / 3,700-under factor.
