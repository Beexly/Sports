# HOU@JAX - Analyst Card (Attrition Edge)

generated_utc: 2026-10-18T09:10:34.278158+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Attrition Edge** - named from the confluence cluster of 87 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2306 kg/m3 measured at EverBank Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 19.9 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Ross Matiscik (JAX) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Montaric Brown (JAX) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Ja'Marcus Ingram (HOU) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Henry To'oTo'o (HOU) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.57 on this game [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.56 / ask 0.57 (mid 0.565, spread 0.01) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.43 / ask 0.44 (mid 0.435, spread 0.01) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
9. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 4 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
10. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
11. TRACKING (2026 IN-SEASON): Travis Etienne (JAX) records RYOE = -15.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Travis Etienne (JAX) records STACKED BOX PCT = 6.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (2026 IN-SEASON): Kendre Miller (JAX) records RYOE = -37.5 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -148, Spd -2.5, O/U 42.5); DraftKings (ML -142, Spd -1.5, O/U 20.5); DraftKings (ML -135, Spd -0.5, O/U 7.5); DraftKings (ML -140, Spd -1.5, O/U 12.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
15. TRACKING (BASELINE, 2025 season): Nico Collins (HOU) carried NGS ngs_separation_2025baseline = 2.3 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 8 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 7 cited fact(s)
- on_field: 58 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | HOU@JAX 6:30 AM | 42.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | EverBank Stadium | 1.2306 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | EverBank Stadium | 19.9 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | EverBank Stadium | 61.5 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | EverBank Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_LS | Ross Matiscik (JAX) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Montaric Brown (JAX) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Anton Harrison (JAX) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Ja'Marcus Ingram (HOU) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Henry To'oTo'o (HOU) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Jalen Pitre (HOU) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Tank Dell (HOU) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | David Montgomery (HOU) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_two_sided_home | Jacksonville wins (KXNFLGAME-26OCT18HOUJAC-JAC) | {'yes_bid': 0.56, 'yes_ask': 0.57, 'mid': 0.565, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| kalshi_yes_ask | Jacksonville wins (KXNFLGAME-26OCT18HOUJAC-JAC) | 0.57 | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| kalshi_two_sided_away | Houston wins (KXNFLGAME-26OCT18HOUJAC-HOU) | {'yes_bid': 0.43, 'yes_ask': 0.44, 'mid': 0.435, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| action_network_multi_book | HOU@JAX multi-book plane | 29 books: DraftKings (ML -148, Spd -2.5, O/U 42.5); DraftKings (ML -142, Spd -1.5, O/U 20.5); DraftKings (ML -135, Spd -0.5, O/U 7.5); DraftKings (ML -140, Spd -1.5, O/U 12.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| market_spread_dispersion | HOU@JAX | 2.5 | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| pinnacle_sharp_reference_available | HOU@JAX | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 34 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_artifact_hit | REA Week 6 funnel (24/25 sources, 4 team-specific hits) | 1410 runtime APIs intercepted across FantasyGuru, LineStar, RotoGrinders, FantasyAlarm, Sabersim, FTN, RotoWire, FantasyPros | fires | docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json |
| dk_contest_census | week slate | 9819 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-18/dfs/dk-contests-census.csv |
| presser_sentiment | JAX | negative | Jags unlikely to play 3 international games in 2027 during EverBank renovations. The Jaguars are unlikely to play three international home games in 2027 while renovations to EverBank Stadium continue, | fires | docs/data-sources/research/2026-10-18/cognitive/cognitive_signals.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.57**
- Book de-vig home fair: **0.5721** (espn-inline DraftKings -148/+124 de-vig)
- |delta| = **0.0021** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.57**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.5757** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -3 (±3.0), total 42.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W17: KC @ PIT final 29-10, close -3 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: SEA @ CHI final 6-3, close -3.5 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: MIN @ SEA final 27-24, close -2.5 / 43 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: SF @ MIA final 17-29, close -2 / 44 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: KC @ CLE final 21-7, close -4.5 / 41.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Ross Matiscik (JAX) (LS, Out); Montaric Brown (JAX) (CB, Out); Jalen Pitre (HOU) (S, Out); David Montgomery (HOU) (RB, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**The confluence is counting, not compounding.** This card cites facts across several domains, but citation count is not mechanism count. Unless two domains touch the SAME causal path (not merely the same game), they are independent observations, and multiplying their LRs overstates the evidence - failure taxonomy #2 and #3 in one move.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- name the specific mechanism any two cited domains share; if the answer is only 'they describe the same game', the confluence claim is false and conviction should drop to the single strongest domain's weight

## Honest gaps

- injuries: 22 JAX players appear on the report but carry ACTIVE status
- injuries: 20 HOU players appear on the report but carry ACTIVE status
- news: no JAX/HOU hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 83/100 (cited links 15 / cited + gaps 18)
- **Kelly-fraction ceiling: 0.0083 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 83/100

Conviction in the CHAIN (cited links 15 / cited + named gaps 18). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
