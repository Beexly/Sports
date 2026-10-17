# TEN@IND - Analyst Card (Narrative Fog)

generated_utc: 2026-10-14T05:59:54.063578+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Narrative Fog** - named from the confluence cluster of 84 cited facts across 5 domains (biophysical, cognitive, dfs, market, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Darius Slayton (IND) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Ashton Dulin (IND) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Jaylon Carlies (IND) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: David Martin-Robinson (TEN) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. MICROSTRUCTURE: Kalshi prints 0.26 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
6. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.24 / ask 0.26 (mid 0.25, spread 0.02) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
7. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.75 / ask 0.76 (mid 0.755, spread 0.01) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. TRACKING (2026 IN-SEASON): Bhayshul Tuten (TEN) records RYOE = 22.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. TRACKING (2026 IN-SEASON): Bhayshul Tuten (TEN) records STACKED BOX PCT = 14.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
10. TRACKING (2026 IN-SEASON): Chris Rodriguez Jr. (TEN) records RYOE = -2.4 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
11. MULTI-BOOK PLANE: Action Network multi-book coverage across 28 books: DraftKings (ML -340, Spd -7, O/U 44); DraftKings (ML -258, Spd -4, O/U 22.5); DraftKings (ML -220, Spd -2.5, O/U 7.5); DraftKings (ML -220, Spd -2.5, O/U 13.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
12. TRACKING (BASELINE, 2025 season): Alec Pierce (IND) carried NGS ngs_separation_2025baseline = 2.1 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 10 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- market: 8 cited fact(s)
- on_field: 57 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | TEN@IND 10:00 AM | 44.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_WR | Darius Slayton (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ashton Dulin (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Jaylon Carlies (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Arden Key (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Will Mallory (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | David Martin-Robinson (TEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Amani Hooker (TEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Kevin Winston Jr. (TEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Cor'Dale Flott (TEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Joshua Williams (TEN) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Tennessee wins (KXNFLGAME-26OCT18TENIND-TEN) | 0.26 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Indianapolis wins (KXNFLGAME-26OCT18TENIND-IND) | 0.75 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_two_sided_away | Tennessee wins (KXNFLGAME-26OCT18TENIND-TEN) | {'yes_bid': 0.24, 'yes_ask': 0.26, 'mid': 0.25, 'spread': 0.02} | fires | docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json |
| kalshi_two_sided_home | Indianapolis wins (KXNFLGAME-26OCT18TENIND-IND) | {'yes_bid': 0.75, 'yes_ask': 0.76, 'mid': 0.755, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json |
| action_network_multi_book | TEN@IND multi-book plane | 28 books: DraftKings (ML -340, Spd -7, O/U 44); DraftKings (ML -258, Spd -4, O/U 22.5); DraftKings (ML -220, Spd -2.5, O/U 7.5); DraftKings (ML -220, Spd -2.5, O/U 13.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| market_spread_dispersion | TEN@IND | 5.5 | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| pinnacle_sharp_reference_available | TEN@IND | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| presser_sentiment | TEN | negative | Cam Ward’s viral press conference moment adds to frustration around winless Titans - Yahoo Sports. Cam Ward’s viral press conference moment adds to frustration around winless Titans    Yahoo Sports | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | TEN | neutral | Alontae Taylor Press Conference - Tennessee Titans. Alontae Taylor Press Conference    Tennessee Titans | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | TEN | neutral | 2026 Big Ten Media Days: Head Coach Greg Schiano Press Conference - Rutgers University Athletics. 2026 Big Ten Media Days: Head Coach Greg Schiano Press Conference    Rutgers University Athletics | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.75**
- Book de-vig home fair: **0.7409** (espn-inline DraftKings -340/+270 de-vig)
- |delta| = **0.0091** -> AGREE - prior solid, L2 signals apply cleanly

## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -7 (±3.0), total 44.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 0 | 0.0% |
| push | 1 | 20.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W18: WAS @ DAL final 23-19, close -7 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: LAC @ LV final 34-20, close -7 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: BAL @ HOU final 31-2, close -5.5 / 46.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: LAC @ NE final 40-7, close -6 / 42 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: ARI @ CAR final 30-36, close -5.5 / 47 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** no signal - named gap: no rotation-thinning signal above threshold; late-game prop conditioning defaults to league-average fourth-quarter patterns.

## Counter-thesis (the strongest case against)

**Coach-speak is noise by construction.** Presser sentiment is a public signal distributed to everyone simultaneously; any real information in it is priced within minutes. The 'fog' is only actionable when it contradicts a measured on-field signal - and this card cites both, which means the market saw both too.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the sentiment shift correlates with an already-reported injury (same underlying fact) - then it adds no new information and the thesis collapses to Attrition Edge

## Honest gaps

- weather: venue 'Lucas Oil Stadium' not in pilot file
- injuries: 20 IND players appear on the report but carry ACTIVE status
- injuries: 20 TEN players appear on the report but carry ACTIVE status
- news: no IND/TEN hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 75/100 (cited links 12 / cited + gaps 16)
- **Kelly-fraction ceiling: 0.0075 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 75/100

Conviction in the CHAIN (cited links 12 / cited + named gaps 16). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
