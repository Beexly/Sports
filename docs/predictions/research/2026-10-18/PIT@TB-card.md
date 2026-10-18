# PIT@TB - Analyst Card (Trench Funnel)

generated_utc: 2026-10-18T09:10:42.849899+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Trench Funnel** - named from the confluence cluster of 92 cited facts across 7 domains (biophysical, cognitive, dfs, environmental, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2292 kg/m3 measured at Raymond James Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 16.6 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Benjamin Morrison (TB) listed DOUBTFUL [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Josiah Trotter (TB) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Antoine Winfield Jr. (TB) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Sean Tucker (TB) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.45 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. COGNITIVE: news flow names this game: "Steelers place Wilson on IR with finger injury" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
8. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 2 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
9. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (17:00-20:00 CT, ch87-fantasy-pros-cbs-evening) -> Divisional Week 6 matchups (PIT-CLE, NO-TB, ATL-CAR/NFC South) historically exhibit compressed second-half pace and elevated interior pressure rates when offensive line continuity drops below 80%. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
10. TRACKING (2026 IN-SEASON): Rachaad White (TB) records RYOE = -24.9 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
11. TRACKING (2026 IN-SEASON): Rachaad White (TB) records STACKED BOX PCT = 6.9 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Tyler Allgeier (PIT) records RYOE = -5.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML 115, Spd 2.5, O/U 39.5); DraftKings (ML 110, Spd 1, O/U 19.5); DraftKings (ML 102, Spd 0.5, O/U 7.5); DraftKings (ML 108, Spd 1.5, O/U 12.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
14. TRACKING (BASELINE, 2025 season): Emeka Egbuka (TB) carried NGS ngs_separation_2025baseline = 2.6 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 17 cited fact(s)
- cognitive: 7 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 6 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 53 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | PIT@TB 10:00 AM | 39.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Raymond James Stadium | 1.2292 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Raymond James Stadium | 16.6 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | Raymond James Stadium | 59.9 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Raymond James Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_WR | David Sills V (TB) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Benjamin Morrison (TB) | Doubtful | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Josiah Trotter (TB) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Antoine Winfield Jr. (TB) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Sean Tucker (TB) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Baker Mayfield (TB) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Ayden Garnes (TB) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | SirVocea Dennis (TB) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Roman Wilson (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Pat Freiermuth (PIT) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | DeShon Elliott (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Jalen Ramsey (PIT) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Jamel Dean (PIT) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Rico Dowdle (PIT) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Keeanu Benton (PIT) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ben Skowronek (PIT) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Michael Pittman Jr. (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Tampa Bay wins (KXNFLGAME-26OCT18PITTB-TB) | 0.45 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Pittsburgh wins (KXNFLGAME-26OCT18PITTB-PIT) | 0.56 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.45**
- Book de-vig home fair: **0.4365** (espn-inline DraftKings +120/-142 de-vig)
- |delta| = **0.0135** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.45**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.4558** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread 2.5 (±3.0), total 39.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 4 | 80.0% |
| push | 0 | 0.0% |
| home failed to cover | 1 | 20.0% |

Named precedents (most recent first):

- 2024 W18: NYG @ PHI final 13-20, close +3 / 36.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: HOU @ TEN final 23-14, close +2.5 / 36.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: MIA @ NYJ final 20-32, close +1.5 / 39.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: DEN @ LAC final 27-34, close +3 / 41.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: HOU @ KC final 19-27, close +3.5 / 42.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Benjamin Morrison (TB) (CB, Doubtful); Antoine Winfield Jr. (TB) (S, Out); Baker Mayfield (TB) (QB, Out); Ben Skowronek (PIT) (WR, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 17 TB players appear on the report but carry ACTIVE status
- injuries: 16 PIT players appear on the report but carry ACTIVE status
- market: fresh Kalshi two-sided books have no row for this game

## Sizing

- Chain conviction 82/100 (cited links 14 / cited + gaps 17)
- **Kelly-fraction ceiling: 0.0082 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 82/100

Conviction in the CHAIN (cited links 14 / cited + named gaps 17). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
