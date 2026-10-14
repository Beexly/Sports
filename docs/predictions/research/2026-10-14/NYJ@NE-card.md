# NYJ@NE - Analyst Card (Narrative Fog)

generated_utc: 2026-10-14T04:42:29.955553+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Narrative Fog** - named from the confluence cluster of 76 cited facts across 6 domains (biophysical, cognitive, dfs, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Dylan Parham (NYJ) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Kiko Mauigoa (NYJ) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Adonai Mitchell (NYJ) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Breece Hall (NYJ) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. MICROSTRUCTURE: Kalshi prints 0.26 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
6. TRACKING (2026 IN-SEASON): Rhamondre Stevenson (NE) records RYOE = 30.3 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Rhamondre Stevenson (NE) records STACKED BOX PCT = 22.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): Breece Hall (NYJ) records RYOE = -7.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -350, Spd -7.5, O/U 43.5); DraftKings (ML -257, Spd -4, O/U 22); DraftKings (ML -210, Spd -2.5, O/U 7.5); DraftKings (ML -225, Spd -3.5, O/U 13.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
10. TRACKING (BASELINE, 2025 season): Stefon Diggs (NE) carried NGS ngs_separation_2025baseline = 3.0 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 7 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- market: 6 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 53 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | NYJ@NE 10:00 AM | 43.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_G | Dylan Parham (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Kiko Mauigoa (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Adonai Mitchell (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Breece Hall (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Kenyon Sadiq (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Joseph Ossai (NYJ) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Braiden McGregor (NYJ) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | New York J wins (KXNFLGAME-26OCT18NYJNE-NYJ) | 0.26 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | New England wins (KXNFLGAME-26OCT18NYJNE-NE) | 0.76 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| action_network_multi_book | NYJ@NE multi-book plane | 29 books: DraftKings (ML -350, Spd -7.5, O/U 43.5); DraftKings (ML -257, Spd -4, O/U 22); DraftKings (ML -210, Spd -2.5, O/U 7.5); DraftKings (ML -225, Spd -3.5, O/U 13.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| market_spread_dispersion | NYJ@NE | 7.0 | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| pinnacle_sharp_reference_available | NYJ@NE | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| presser_sentiment | NYJ | neutral | Sources: Rams release kicker Mevis after miscues in loss, sign Grupe from Jets. The Rams are releasing kicker Harrison Mevis and signing Blake Grupe off the Jets' practice squad, sources told NFL Netw | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | NYJ | neutral | GM Darren Mougey & HC Aaron Glenn NFL Draft Press Conference (4/23) - New York Jets. GM Darren Mougey & HC Aaron Glenn NFL Draft Press Conference (4/23)    New York Jets | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| coach_speak_delta | NYJ | flat | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| coach_speak_delta | NYJ | flat | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| depth_chart_move | NYJ Jordan Meredith |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| depth_chart_move | NYJ Dylan Parham |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| ngs_2026_ryoe | Rhamondre Stevenson (NE) | 30.3 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |
| ngs_2026_stacked_box_pct | Rhamondre Stevenson (NE) | 22.8 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.26**
- Book de-vig home fair: **0.7441** (espn-inline DraftKings -345/+275 de-vig)
- |delta| = **0.4841** -> DIVERGE - stale book or stale market; treat the prior as unreliable

## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -7.5 (±3.0), total 43.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W18: WAS @ DAL final 23-19, close -7 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: LAC @ LV final 34-20, close -7 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: LAC @ NE final 40-7, close -6 / 42 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: IND @ NYG final 33-45, close -7.5 / 40.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: WAS @ NO final 20-19, close -7.5 / 44.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** no signal - named gap: no rotation-thinning signal above threshold; late-game prop conditioning defaults to league-average fourth-quarter patterns.

## Counter-thesis (the strongest case against)

**Coach-speak is noise by construction.** Presser sentiment is a public signal distributed to everyone simultaneously; any real information in it is priced within minutes. The 'fog' is only actionable when it contradicts a measured on-field signal - and this card cites both, which means the market saw both too.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the sentiment shift correlates with an already-reported injury (same underlying fact) - then it adds no new information and the thesis collapses to Attrition Edge

## Honest gaps

- weather: no venue mapping or no weather file for NE
- injuries: no injury records found for NE
- injuries: 18 NYJ players appear on the report but carry ACTIVE status
- news: no NE/NYJ hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 71/100 (cited links 10 / cited + gaps 14)
- **Kelly-fraction ceiling: 0.0071 of bankroll (quarter-unit max)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 71/100

Conviction in the CHAIN (cited links 10 / cited + named gaps 14). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
