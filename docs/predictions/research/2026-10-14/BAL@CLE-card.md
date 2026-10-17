# BAL@CLE - Analyst Card (Narrative Fog)

generated_utc: 2026-10-14T05:59:53.349413+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Narrative Fog** - named from the confluence cluster of 70 cited facts across 5 domains (biophysical, cognitive, dfs, market, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Tylan Wallace (CLE) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Carsen Ryan (CLE) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Mason Graham (CLE) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Mike Hall Jr. (CLE) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. MICROSTRUCTURE: Kalshi prints 0.34 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
6. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.32 / ask 0.33 (mid 0.325, spread 0.01) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
7. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.67 / ask 0.68 (mid 0.675, spread 0.01) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. TRACKING (2026 IN-SEASON): Quinshon Judkins (CLE) records RYOE = -34.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. TRACKING (2026 IN-SEASON): Quinshon Judkins (CLE) records STACKED BOX PCT = 23.3 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
10. TRACKING (2026 IN-SEASON): Derrick Henry (BAL) records RYOE = 22.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
11. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML 189, Spd 4.5, O/U 41.5); DraftKings (ML 147, Spd 2.5, O/U 20.5); DraftKings (ML 125, Spd 0.5, O/U 7.5); DraftKings (ML 138, Spd 1.5, O/U 12.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
12. TRACKING (BASELINE, 2025 season): Zay Flowers (BAL) carried NGS ngs_separation_2025baseline = 3.6 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 20 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- market: 8 cited fact(s)
- on_field: 33 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | BAL@CLE 10:00 AM | 41.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_RB | Raheim Sanders (CLE) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Tylan Wallace (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Carsen Ryan (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Mason Graham (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Mike Hall Jr. (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Teven Jenkins (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Quinshon Judkins (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Dylan Sampson (CLE) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Carson Schwesinger (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | KC Concepcion (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Tytus Howard (CLE) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Kalia Davis (CLE) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Dillon Gabriel (CLE) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Andrew Vorhees (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_C | Cam Jurgens (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Trey Hendrickson (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Lamar Jackson (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ja'Kobi Lane (BAL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Broderick Washington Jr. (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Durham Smythe (BAL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Cleveland wins (KXNFLGAME-26OCT18BALCLE-CLE) | 0.34 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Baltimore wins (KXNFLGAME-26OCT18BALCLE-BAL) | 0.68 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_two_sided_home | Cleveland wins (KXNFLGAME-26OCT18BALCLE-CLE) | {'yes_bid': 0.32, 'yes_ask': 0.33, 'mid': 0.325, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.34**
- Book de-vig home fair: **0.325** (espn-inline DraftKings +195/-238 de-vig)
- |delta| = **0.015** -> AGREE - prior solid, L2 signals apply cleanly

## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread 4.5 (±3.0), total 41.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 5 | 100.0% |
| push | 0 | 0.0% |
| home failed to cover | 0 | 0.0% |

Named precedents (most recent first):

- 2024 W18: SF @ ARI final 24-47, close +4.5 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: DEN @ LAC final 27-34, close +3 / 41.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: HOU @ KC final 19-27, close +3.5 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: TEN @ IND final 30-38, close +4 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: IND @ DEN final 13-31, close +4.5 / 43.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** no signal - named gap: no rotation-thinning signal above threshold; late-game prop conditioning defaults to league-average fourth-quarter patterns.

## Counter-thesis (the strongest case against)

**Coach-speak is noise by construction.** Presser sentiment is a public signal distributed to everyone simultaneously; any real information in it is priced within minutes. The 'fog' is only actionable when it contradicts a measured on-field signal - and this card cites both, which means the market saw both too.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the sentiment shift correlates with an already-reported injury (same underlying fact) - then it adds no new information and the thesis collapses to Attrition Edge

## Honest gaps

- weather: venue 'Huntington Bank Field' not in pilot file
- injuries: 12 CLE players appear on the report but carry ACTIVE status
- injuries: 18 BAL players appear on the report but carry ACTIVE status
- news: no CLE/BAL hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 75/100 (cited links 12 / cited + gaps 16)
- **Kelly-fraction ceiling: 0.0075 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 75/100

Conviction in the CHAIN (cited links 12 / cited + named gaps 16). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
