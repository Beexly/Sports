# GB@DAL - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T04:41:33.331154+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 75 cited facts across 7 domains (biophysical, cognitive, dfs, environmental, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1278 kg/m3 measured at AT&T Stadium [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 20.2 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: DeMarvion Overshown (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Joey Porter Jr. (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Drew Shelton (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Cobie Durant (DAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. TRACKING (2026 IN-SEASON): Emanuel Wilson (GB) records RYOE = -47.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Emanuel Wilson (GB) records STACKED BOX PCT = 23.3 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): George Holani (GB) records RYOE = -27.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -120, Spd -1.5, O/U 53); DraftKings (ML -118, Spd -1, O/U 26.5); DraftKings (ML -125, Spd -0.5, O/U 9.5); DraftKings (ML -113, Spd -1.5, O/U 16.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
10. TRACKING (BASELINE, 2025 season): George Pickens (DAL) carried NGS ngs_separation_2025baseline = 2.3 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 18 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 4 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 39 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | DAL@GB 5:20 PM | 52.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
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
| injury_status_C | Jacob Monk (GB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Aaron Banks (GB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Anthony Campbell (GB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Micah Parsons (GB) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Javon Hargrave (GB) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Benjamin St-Juste (GB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Skyy Moore (GB) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Chris Brooks (GB) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Savion Williams (GB) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Edgerrin Cooper (GB) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| action_network_multi_book | GB@DAL multi-book plane | 29 books: DraftKings (ML -120, Spd -1.5, O/U 53); DraftKings (ML -118, Spd -1, O/U 26.5); DraftKings (ML -125, Spd -0.5, O/U 9.5); DraftKings (ML -113, Spd -1.5, O/U 16.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=0.5260865852617197 (one anchor missing from the corpus/traces)

## Precedent (structural matches from the 2,622-game corpus)

no signal - named gap: no structurally similar game in the 2015-2024 corpus (market shape match on closing spread/total found nothing). This thesis has no precedent support; treat it as a first observation, not a repeated pattern.

## Projected game state

**First 15 (script):** wind 20.2 km/h > 20: early scripts typically shift toward short passing and inside run; deep-shot rate dips in the first quarter [measured forecast, docs/data-sources/research/2026-10-13/weather-pilot/]

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Micah Parsons (GB) (DE, Out); Javon Hargrave (GB) (DT, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 17 DAL players appear on the report but carry ACTIVE status
- injuries: 15 GB players appear on the report but carry ACTIVE status
- market: Kalshi digest has no row for this game
- news: no DAL/GB hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 71/100 (cited links 10 / cited + gaps 14)
- **Kelly-fraction ceiling: 0.0071 of bankroll (quarter-unit max)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 71/100

Conviction in the CHAIN (cited links 10 / cited + named gaps 14). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
