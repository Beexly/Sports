# WSH@SF - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T05:57:51.491198+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 48 cited facts across 5 domains (biophysical, cognitive, dfs, market, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: James Thompson Jr. (SF) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Marques Sigle (SF) listed DOUBTFUL [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Kyle Juszczyk (SF) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Nick Bosa (SF) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. TRACKING (2026 IN-SEASON): Christian McCaffrey (SF) records RYOE = 21.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
6. TRACKING (2026 IN-SEASON): Christian McCaffrey (SF) records STACKED BOX PCT = 24.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Kaelon Black (SF) records RYOE = -27.0 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -422, Spd -7.5, O/U 50.5); DraftKings (ML -278, Spd -4.5, O/U 25); DraftKings (ML -225, Spd -2.5, O/U 9.5); DraftKings (ML -225, Spd -3.5, O/U 15.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
9. TRACKING (BASELINE, 2025 season): Jauan Jennings (SF) carried NGS ngs_separation_2025baseline = 2.2 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 9 cited fact(s)
- cognitive: 4 cited fact(s)
- dfs: 3 cited fact(s)
- market: 4 cited fact(s)
- on_field: 28 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | WAS@SF 5:15 PM | 50.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_DT | James Thompson Jr. (SF) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Marques Sigle (SF) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_FB | Kyle Juszczyk (SF) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Nick Bosa (SF) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Nick Martin (SF) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Christian Kirk (SF) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Garret Wallow (SF) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Deebo Samuel Sr. (SF) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Dre Greenlaw (SF) | Suspension | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| action_network_multi_book | WSH@SF multi-book plane | 29 books: DraftKings (ML -422, Spd -7.5, O/U 50.5); DraftKings (ML -278, Spd -4.5, O/U 25); DraftKings (ML -225, Spd -2.5, O/U 9.5); DraftKings (ML -225, Spd -3.5, O/U 15.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| market_spread_dispersion | WSH@SF | 6.0 | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| pinnacle_sharp_reference_available | WSH@SF | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| depth_chart_move | SF Brandin Cooks |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| depth_chart_move | SF KhaDarel Hodge |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| game_context_flag | SF |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| game_context_flag | WSH |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| ngs_2026_ryoe | Christian McCaffrey (SF) | 21.1 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |
| ngs_2026_stacked_box_pct | Christian McCaffrey (SF) | 24.6 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |
| ngs_2026_ryoe | Kaelon Black (SF) | -27.0 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |
| ngs_2026_stacked_box_pct | Kaelon Black (SF) | 16.2 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=0.7819063004846527 (one anchor missing from the corpus/traces)

## Precedent (structural matches from the 2,622-game corpus)

no signal - named gap: no structurally similar game in the 2015-2024 corpus (market shape match on closing spread/total found nothing). This thesis has no precedent support; treat it as a first observation, not a repeated pattern.

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Marques Sigle (SF) (S, Doubtful); Garret Wallow (SF) (LB, Out); Deebo Samuel Sr. (SF) (WR, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- weather: venue 'Levi's Stadium' not in pilot file
- injuries: 16 SF players appear on the report but carry ACTIVE status
- injuries: no injury records found for WSH
- market: Kalshi digest has no row for this game
- market: fresh Kalshi two-sided books have no row for this game
- news: no SF/WSH hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 60/100 (cited links 9 / cited + gaps 15)
- **Kelly-fraction ceiling: 0.006 of bankroll (quarter-unit max)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 60/100

Conviction in the CHAIN (cited links 9 / cited + named gaps 15). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
