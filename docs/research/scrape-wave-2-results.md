# Scrape wave 2 results — 2026-09-12

Source: founder-pasted extract JSON (`extract-data-2026-09-12 (1).json`).
71 feature inventory items, 567 data columns, 34 verbatim formulas,
12 pricing observations, 4 calibration claims, 39 export/API paths,
17 paywalled features, deep structure keys for RBSDM and NFL/Savant.

This doc is the wiring map. Do not re-scrape these URLs.

---

## Tier 1 — factor engine inputs (wire these first)

### MLB Statcast batters → `underlying` factor

**Source:** baseballsavant.mlb.com/statcast_leaderboard + expected_statistics + sprint_speed

**Columns per player (confirmed):**
- EV (avg exit velocity, MPH)
- EV50 (avg of hardest 50% of batted balls; for pitchers, softest 50% allowed)
- LA (launch angle, degrees)
- LA SwSp% (launch angle sweet-spot %)
- Hard Hit % (95 MPH+)
- Barrels count, Brls/BBE%, Brls/PA%
- Distance (avg feet)
- xBA, xSLG, xwOBA + Diff columns (actual minus expected)
- Sprint Speed (ft/sec, fastest one-second window; best ~2/3 of competitive runs averaged)
- Bolts (runs at or above 30 ft/sec)
- HP to 1B (home to first, seconds)

**Formulas (verbatim from Savant):**
- Hit Probability assigned from exit velocity and launch angle of each batted ball, based on outcomes of comparable historic balls in play
- Expected season metrics accumulate expected outcomes of each batted ball with actual strikeouts, walks and HBPs
- Sprint Speed = "feet per second in a player's fastest one-second window" on individual plays; best ~2/3 averaged for seasonal figure
- MLB average competitive sprint speed: 27 ft/sec (range ~23 poor to ~30 elite)

**Wiring target:** `apps/web/lib/statcast/` (new). Mirror nflverse loader pattern.
**Factor input:** `underlying: { barrelPct, hardHitPct, ev50, xwOBA, sprintSpeed }`

### MLB Statcast pitchers → pitcher `underlying` factor

**Source:** baseballsavant.mlb.com/statcast_search

**Columns per pitch/pitcher (confirmed):**
- Pitch Velocity (MPH), Perceived Velocity (MPH)
- Spin Rate (RPM)
- Vertical/Horizontal Release Point (feet), Release Extension (feet)
- Arm Angle (degrees)
- Plate Horizontal/Vertical (feet)
- Whiff Rate, Chase% (from metric keys)
- xBA, xSLG, xwOBA allowed
- Barrel/BBE%, Barrel/PA% allowed
- Hard Hit% allowed

**Metric keys offered in search UI:** PA, AB, BIP, Hits, 1B/2B/3B/HR, SO, K%, BB, BB%, HBP, Whiffs, Swings, xBA, xOBP, xSLG, xwOBA, Barrels, BABIP, ISO, Whiff Rate, Run Value, Pitch Velocity, Spin Rate, Exit Velocity, Launch Angle, Hit Distance, Hard Hit%, Barrel/BBE%, Barrel/PA%

**Wiring target:** same `apps/web/lib/statcast/` module, pitcher projection.

### PropFinder NFL → `matchupSplit` factor

**Status:** /nfl is sign-in gated. Marketing page confirms the data model:
- Target share, snap counts, coverage matchups
- QB adjustments
- Model spreads and totals
- Sportsbooks: DraftKings, FanDuel, BetMGM, Caesars, ESPN Bet, Fanatics, PrizePicks, Underdog
- Sports: NFL, CFB, MLB, WNBA, NBA, NHL

**Wiring target:** `apps/web/lib/nfl/coverage-splits.ts` (new).
**Factor input:** `matchupSplit: { vsMan, vsZone, vsLightBox, vsStackedBox, sampleSize }`
**Blocker:** needs founder login credentials for PropFinder, or use nflverse play-by-play which already has coverage data.

### PrizePicks/Underdog → `consensus` factor

**Status:** not in this scrape. PropFinder marketing confirms both books are in their odds mix.
**Wiring target:** `apps/web/lib/consensus/public-picks.ts` (new).
**Factor input:** `consensus: { overCount, underCount }`
**Rule:** NEVER fabricate. Absent = factor does not fire.

---

## Tier 2 — optimizer and props board parity

### LineStar Projections table (full column set confirmed)

| Column | Unit | Notes |
|---|---|---|
| Status | label | player status |
| Chat | — | player chat |
| Value | X multiplier | e.g. 3.5X |
| Salary | USD | e.g. $5,800 |
| Projection | fantasy pts | model projection |
| Consensus | fantasy pts | market consensus |
| Max Exp% | percent | max exposure |
| Cons Diff | fantasy pts | Projection minus Consensus |
| Time | game time | |
| Opponent | team | |
| vs Pos | rank | opponent positional rank |
| Floor | fantasy pts | |
| Ceiling | fantasy pts | |
| Range | — | floor-to-ceiling spread |
| AlertScore | score | composite alert |
| Avg FP | fantasy pts/game | |
| Imp Pts | points | implied points |
| Matchup Data | tags | |
| SIC Score | score | Sports Injury Calculator |
| pOwn | pOwn% | projected ownership |
| Leverage | score | |
| Safety | score | |

**Our current projections table** already has: Sal, Proj, Val, Ceil, L5, M/U, pOwn%, Lev.
**Gap:** Consensus, Cons Diff, Max Exp%, AlertScore, SIC Score, Safety, Imp Pts, vs Pos, Range.

### LineStar Props board (full column set confirmed)

Groups: PLAYER, RECENT FORM, PROJECTION, MARKET ODDS, EDGE, MATCHUP

| Column | Unit |
|---|---|
| Last 5 / Last 10 / Season | hit-rate % |
| Projection / Pick | model projection |
| Consensus | market |
| Line | prop threshold |
| Over / Under | selection + American odds |
| Sportsbook | book name |
| +EV / Edge % | percent |
| Matchup+ Imp | matchup impact |
| Matchup tags | categorical |

**Our props board** already has market + team filters.
**Gap:** L5/L10/Season hit rates, Matchup+ Imp, Consensus column, +EV column.

### LineStar pricing (competitive intel)

- Premium: $39.99/month or $239.99/year
- Unlimited projections, all apps/website, every sport
- Sports: NFL/MLB/NBA/NHL/PGA/CFB/CBB/WNBA/UFC/NAS/CSGO/LOL/CFL

### PropFinder pricing

- Monthly: $14.99
- Yearly: $149.99
- Free tier: 1 game/league
- Sports: MLB, NBA, NFL, CFB, NHL, WNBA

### Other competitor pricing

| Product | Price |
|---|---|
| Props.Cash | $19.99/mo or $199.99/yr |
| Props.Cash NBA Pass | $99.99/yr |
| Outlier Premium | $19.99/mo |
| Outlier Premium+ | $29.99/mo |
| Outlier Pro | $79.99/mo |
| PlayerProps.ai 6-mo VIP | $295 |
| PickFinder Premium | $149.99/yr |
| PickFinder Pro | $299.99/yr |
| SaberSim | $7 for 7 days trial |

---

## Tier 3 — methodology and calibration

### Fangraphs projection models (confirmed list)

Pre-season: ZiPS, ZiPS DC, Steamer, Depth Charts, ATC, THE BAT, THE BAT X, OOPSY
In-season: updated, RoS, 600 PA/200 IP, three-year ZiPS, On-Pace
Pagination: 4186 default results; ATC bat 631; ATC pit 855

Model authors credited: Dan Szymborski (ZiPS), steamerprojections.com, FanGraphs staff, Ariel Cohen (ATC), Derek Carty (THE BAT), Jordan Rosenblum, Eno Sarris

**No equations published.** Weights not disclosed. This is competitive intel only.

### RBSDM (NFL efficiency backbone)

**JSON API keys observed:** min_season, max_season, season_week_bounds, teams, generated_at

**Tabs:** Team Tiers, Offense, Defense, Quarterbacks, Neutral Pass Freq, Pass Over Expected, Fourth Downs, Luck, Series Success

**Formulas:**
- Pass Over Expected Difference = Actual − Expected
- Series Conv % = TD / 1st Down / FG / Punt / TO outcome percentages

**Filters:** season min/max (2020+), regular week min/max, postseason (None/WC/DIV/CONF/SB), downs 1-4, quarters 1-4/OT, garbage-time WP filter, exclude-turnovers

### NFL/Savant (JSON API)

**API response keys:** week, metrics, category, unit, rows, columns
**Row keys:** id, name, team, pos, v, qualified, values
**Value keys:** epa, comp, att, comp_pct, yds, ya, td, int, sacks, cpoe, pressure_pct, succ, adot

**Formulas (verbatim):**
- EPA/play = how much a QB raises or lowers his team's scoring expectation on each pass play
- Rushing YOE = actual yards minus what an average back would gain from the same situation
- Pressure % = share of opposing dropbacks where this defender recorded a sack or QB hit

**Provenance:** play-by-play via nflverse; charting data FTN Data + NFL Next Gen Stats via nflverse (CC-BY-SA 4.0)

### Next Gen Stats columns

**Receiving:** CUSH, SEP, TAY, TAY%, REC, TAR, CTCH%, YDS, TD, YAC/R, xYAC/R, +/-
**Rushing:** EFF, 8+D%, TLOS, ATT, YDS, RYOE, AVG, RYOE/Att, ROE%, TD

### Basketball-Reference advanced

data-stat keys: ranker, name_display, age, team_name_abbr, pos, games, games_started, mp, per, ts_pct, fg3a_per_fga_pct, fta_per_fga_pct, orb_pct, drb_pct, trb_pct, ast_pct, stl_pct, blk_pct, tov_pct, usg_pct, ows, dws, ws, ws_per_48, obpm, dbpm, bpm, vorp, awards

VORP tooltip: "Multiply by 2.70 to convert to wins over replacement"

---

## Tier 4 — competitive intel and alerts

### Alert/notification patterns observed

- LineStar: AlertScore + alert icons (Expected Starter, Good Vegas Odds, opponent ranks, favored/away splits, recent-form)
- SaberSim: real-time alerts for breaking news and surprise scratches
- Outlier: save filters, notify when opportunities fit
- PickFinder: Discord notifications for new/updated lines
- PlayerProps.ai: premium community line movement alerts

### Paywall patterns

| Feature | Gate type |
|---|---|
| Stathead | Subscription (first month free promo) |
| LineStar full projections | Premium |
| LineStar PropsAI full data | Premium (limited free set) |
| PropFinder NFL dashboard | Auth (sign-in) |
| RotoGrinders premium tools | Premium Only badge |
| Data Export | Members Only |
| Historical Projections | Members Exclusive |
| Percentile Outcomes wOBA | Members mode |
| Cleaning the Glass | Subscribe (error page in capture) |
| SaberSim optimizer | Paid ($7/7 days) |
| Outlier advanced | Premium/Premium+/Pro |
| PlayerProps.ai premium | Subscription tiers |
| PickFinder EV+/arb/middles | Pro annual |
| Props.Cash full analytics | Paid plans |

### RotoGrinders prop evaluation example (verbatim)

"The line of 4.5 compares favorably based on our MLB simulations. The prop projects to hit 72.81% of the time based on the assumptions, and that represents an 11.27% edge."

### Calibration claims observed

- PickFinder community testimonial: 65% accuracy (member for 2 months, under a month of winnings) — testimonial only, not a measured claim
- LineStar: "independently verified as one of the best in the industry" — no sample size or metric published
- Sprint speed: 27 ft/sec MLB average, 23-30 competitive range

---

## Wiring priority (updated)

| Priority | What | Unlocks | Blocker |
|---|---|---|---|
| 1 | Statcast batters loader | MLB `underlying` factor fires | none — public CSV available |
| 2 | Statcast pitchers loader | pitcher `underlying` | none |
| 3 | RBSDM EPA backbone | NFL efficiency metrics | none — JSON API |
| 4 | NFL/Savant JSON | pressure%, EPA, RYOE | none — JSON API |
| 5 | NGS receiving/rushing | air yards, separation, RYOE | none — public tables |
| 6 | PropFinder NFL cheatsheets | `matchupSplit` factor | sign-in required |
| 7 | PrizePicks/Underdog consensus | `consensus` factor | not in this scrape |
| 8 | LineStar Props L5/L10 data | hit-rate columns in props board | premium |
| 9 | LineStar Ownership | real pOwn% and Own Diff | premium |
| 10 | Fangraphs ATC/THE BAT | cross-model comparison | none for structure, premium for data |

---

## What we already have vs what this scrape adds

### Already wired (from wave 1 + ASTRA)
- Projections table: Sal, Proj, Val, Ceil, L5, M/U, pOwn%, Lev
- Props board: market + team filters
- CSV export (DK Classic)
- Max exposure slider (10-100%)
- Factor engine skeleton: depth chart, injury, matchup split, underlying, consensus, rest

### This scrape adds (column definitions + formulas, ready to wire)
- Statcast: EV50, Hard Hit%, Barrels, LA SwSp%, xBA/xSLG/xwOBA, Sprint Speed, Bolts
- Pitcher Statcast: spin rate, perceived velo, release point, arm angle, whiff%, chase%
- LineStar gap columns: Consensus, Cons Diff, AlertScore, SIC Score, Safety, Imp Pts, vs Pos
- Props gap columns: L5/L10/Season hit rates, Matchup+ Imp, +EV
- RBSDM: EPA/play, Pass Over Expected, Series Success, garbage-time WP filter
- NFL/Savant: pressure%, EPA/play, RYOE, CPOE, ADOT
- NGS: CUSH, SEP, TAY%, YAC/R, xYAC/R, EFF, 8+D%, RYOE/Att

### Still blocked
- PropFinder NFL board (sign-in)
- LineStar Props/Ownership data (premium)
- PrizePicks/Underdog public pick % (not scraped)
- SaberSim contest sim internals (paid)
