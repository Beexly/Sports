# TB@DAL - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T04:37:43.410118+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 73 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1278 kg/m3 measured at AT&T Stadium [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 20.2 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: DeMarvion Overshown (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Joey Porter Jr. (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Drew Shelton (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Cobie Durant (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. TRACKING (2026 IN-SEASON): Rachaad White (TB) records RYOE = -24.9 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Rachaad White (TB) records STACKED BOX PCT = 6.9 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): Jacory Croskey-Merritt (TB) records RYOE = -29.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. TRACKING (BASELINE, 2025 season): George Pickens (DAL) carried NGS ngs_separation_2025baseline = 2.3 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 13 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 2 cited fact(s)
- on_field: 45 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | TB@DAL 5:15 PM | 48.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | AT&T Stadium | 1.1278 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | AT&T Stadium | 20.2 | contradicts | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| temp_f | AT&T Stadium | 90.9 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | AT&T Stadium | 1 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| injury_status_LB | DeMarvion Overshown (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Joey Porter Jr. (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Drew Shelton (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Cobie Durant (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Tyler Guyton (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | CeeDee Lamb (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Alijah Clark (DAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Jonathan Bullard (DAL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Antoine Winfield Jr. (TB) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Benjamin Morrison (TB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | SirVocea Dennis (TB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | David Sills V (TB) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Baker Mayfield (TB) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| pinnacle_sharp_reference_available | TB@DAL | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| presser_sentiment | TB | neutral | Todd Bowles: Focused on Thursday Night Football | Press Conference - Tampa Bay Buccaneers. Todd Bowles: Focused on Thursday Night Football | Press Conference    Tampa Bay Buccaneers | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | TB | neutral | Zyon McCollum: Bucs Secondary Staying Focused | Press Conference - Tampa Bay Buccaneers. Zyon McCollum: Bucs Secondary Staying Focused | Press Conference    Tampa Bay Buccaneers | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=None (one anchor missing from the corpus/traces)

## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -8.5 (±3.0), total 48.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W16: DET @ CHI final 34-17, close -7 / 47.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W12: DET @ IND final 24-6, close -7 / 50.5 [data/backtest/nfl_historical_games.json rows[]]
- 2023 W13: MIA @ WAS final 45-15, close -8.5 / 50 [data/backtest/nfl_historical_games.json rows[]]
- 2023 W8: KC @ DEN final 9-24, close -7 / 45.5 [data/backtest/nfl_historical_games.json rows[]]
- 2022 W18: KC @ LV final 31-13, close -9 / 51.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** wind 20.2 km/h > 20: early scripts typically shift toward short passing and inside run; deep-shot rate dips in the first quarter [measured forecast, docs/data-sources/research/2026-10-13/weather-pilot/]

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Antoine Winfield Jr. (TB) (S, Doubtful); Baker Mayfield (TB) (QB, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 17 DAL players appear on the report but carry ACTIVE status
- injuries: 20 TB players appear on the report but carry ACTIVE status
- market: Kalshi digest has no row for this game
- news: no DAL/TB hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 69/100 (cited links 9 / cited + gaps 13)
- **Kelly-fraction ceiling: 0.0069 of bankroll (quarter-unit max)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 69/100

Conviction in the CHAIN (cited links 9 / cited + named gaps 13). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
