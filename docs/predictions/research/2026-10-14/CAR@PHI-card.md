# CAR@PHI - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T05:59:56.616765+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 72 cited facts across 7 domains (biophysical, cognitive, dfs, environmental, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1891 kg/m3 measured at Lincoln Financial Field [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 13.0 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Jalyx Hunt (PHI) listed DOUBTFUL [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: DeVonta Smith (PHI) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Drew Kendall (PHI) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Marcus Epps (PHI) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.52 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.51 / ask 0.52 (mid 0.515, spread 0.01) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.49 / ask 0.5 (mid 0.495, spread 0.01) [docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_2026-10-14T05-55-21Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
9. TRACKING (2026 IN-SEASON): Saquon Barkley (PHI) records RYOE = 40.2 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
10. TRACKING (2026 IN-SEASON): Saquon Barkley (PHI) records STACKED BOX PCT = 13.9 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
11. TRACKING (2026 IN-SEASON): Tank Bigsby (PHI) records RYOE = -18.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -115, Spd -1.5, O/U 40.5); DraftKings (ML -113, Spd -1, O/U 20.5); DraftKings (ML -110, Spd -0.5, O/U 7.5); DraftKings (ML -120, Spd -1.5, O/U 12.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
13. TRACKING (BASELINE, 2025 season): Tetairoa McMillan (CAR) carried NGS ngs_separation_2025baseline = 2.7 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 21 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 8 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 29 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | CAR@PHI 10:00 AM | 40.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Lincoln Financial Field | 1.1891 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Lincoln Financial Field | 13.0 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| temp_f | Lincoln Financial Field | 73.2 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Lincoln Financial Field | 1 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| injury_status_LB | Jalyx Hunt (PHI) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | DeVonta Smith (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_C | Drew Kendall (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Marcus Epps (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Jonathan Greenard (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Saquon Barkley (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Hollywood Brown (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Will Shipley (PHI) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Michael Carter II (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Lane Johnson (PHI) | Reserve-Ret | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Chance Campbell (PHI) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Tershawn Wharton (CAR) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Trevor Etienne (CAR) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Jalen Coker (CAR) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Cam Jackson (CAR) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Taylor Moton (CAR) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Damien Lewis (CAR) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Ikem Ekwonu (CAR) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Monroe Freeling (CAR) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.52**
- Book de-vig home fair: **0.5108** (espn-inline DraftKings -115/-105 de-vig)
- |delta| = **0.0092** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.52**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.5258** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -1.5 (±3.0), total 40.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W17: KC @ PIT final 29-10, close -3 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: TEN @ JAX final 13-20, close -1 / 38 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: LV @ NO final 25-10, close -2 / 37.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: MIN @ SEA final 27-24, close -2.5 / 43 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W13: IND @ NE final 25-24, close -2.5 / 41.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Jalyx Hunt (PHI) (LB, Doubtful); Will Shipley (PHI) (RB, Doubtful); Tershawn Wharton (CAR) (DT, Out); Taylor Moton (CAR) (OT, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 14 PHI players appear on the report but carry ACTIVE status
- injuries: 15 CAR players appear on the report but carry ACTIVE status
- news: no PHI/CAR hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 81/100 (cited links 13 / cited + gaps 16)
- **Kelly-fraction ceiling: 0.0081 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 81/100

Conviction in the CHAIN (cited links 13 / cited + named gaps 16). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
