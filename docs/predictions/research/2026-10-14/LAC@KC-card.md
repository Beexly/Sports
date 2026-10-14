# LAC@KC - Analyst Card (Ballistics Window)

generated_utc: 2026-10-14T05:49:32.165780+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Ballistics Window** - named from the confluence cluster of 77 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1179 kg/m3 measured at Arrowhead Stadium [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 12.7 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Josh Simmons (KC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Rashee Rice (KC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Brenen Thompson (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Rodney Shelley (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.21 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. TRACKING (2026 IN-SEASON): J.K. Dobbins (LAC) records RYOE = -47.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): J.K. Dobbins (LAC) records STACKED BOX PCT = 18.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. TRACKING (2026 IN-SEASON): Bo Nix (LAC) records TIME TO THROW = 2.95 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_passing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
10. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -472, Spd -8.5, O/U 42.5); DraftKings (ML -302, Spd -4.5, O/U 21.5); DraftKings (ML -240, Spd -2.5, O/U 7.5); DraftKings (ML -250, Spd -3.5, O/U 13.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
11. TRACKING (BASELINE, 2025 season): Travis Kelce (KC) carried NGS ngs_separation_2025baseline = 3.2 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 16 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 6 cited fact(s)
- on_field: 42 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | LAC@KC 1:25 PM | 42.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Arrowhead Stadium | 1.1179 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Arrowhead Stadium | 12.7 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| temp_f | Arrowhead Stadium | 88.5 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Arrowhead Stadium | 1 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| injury_status_WR | Tyquan Thornton (KC) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Josh Simmons (KC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Rashee Rice (KC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Brenen Thompson (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Rodney Shelley (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Quentin Johnston (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Donte Jackson (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Derwin James Jr. (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Joe Alt (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Kayode Awosika (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Tre' Harris (LAC) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ladd McConkey (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Bud Dupree (LAC) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Trevor Penning (LAC) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Trey Lance (LAC) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Rashawn Slater (LAC) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Los Angeles C wins (KXNFLGAME-26OCT18LACKC-LAC) | 0.21 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Kansas City wins (KXNFLGAME-26OCT18LACKC-KC) | 0.79 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| action_network_multi_book | LAC@KC multi-book plane | 29 books: DraftKings (ML -472, Spd -8.5, O/U 42.5); DraftKings (ML -302, Spd -4.5, O/U 21.5); DraftKings (ML -240, Spd -2.5, O/U 7.5); DraftKings (ML -250, Spd -3.5, O/U 13.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.79**
- Book de-vig home fair: **0.8** (espn-inline DraftKings -500/+380 de-vig)
- |delta| = **0.01** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.79**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.7938** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -8.5 (±3.0), total 42.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W18: WAS @ DAL final 23-19, close -7 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: LAC @ LV final 34-20, close -7 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: IND @ NYG final 33-45, close -7.5 / 40.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: WAS @ NO final 20-19, close -7.5 / 44.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W11: HOU @ DAL final 34-10, close -7.5 / 41.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Tre' Harris (LAC) (WR, Doubtful)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Both kickers and both QBs practice in this air daily.** Air-density effects on ball flight are second-order for professionals who calibrate to their home venue every week; the measurable effect lands on inanimate props (K distance, punt avg), not on spreads. The mechanism is real but the market already prices home venue effects in every number it hangs.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- a dome/outdoor split on the 2,622-game corpus shows no total-overskew for extreme density venues - then the environmental edge is noise
- the wind reading is a forecast, not a measurement; if forecast-vs-actual error at this venue exceeds 5 km/h historically, the link is unfalsifiable pre-kickoff

## Honest gaps

- injuries: 22 KC players appear on the report but carry ACTIVE status
- injuries: 12 LAC players appear on the report but carry ACTIVE status
- news: no KC/LAC hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 79/100 (cited links 11 / cited + gaps 14)
- **Kelly-fraction ceiling: 0.0079 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 79/100

Conviction in the CHAIN (cited links 11 / cited + named gaps 14). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
