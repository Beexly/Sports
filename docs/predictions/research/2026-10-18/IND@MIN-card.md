# IND@MIN - Analyst Card (Trench Funnel)

generated_utc: 2026-10-18T09:12:57.228766+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Trench Funnel** - named from the confluence cluster of 83 cited facts across 7 domains (biophysical, cognitive, dfs, environmental, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2212 kg/m3 measured at U.S. Bank Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 15.6 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Christian Darrisaw (MIN) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Charles Demmings (MIN) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Jordan Addison (MIN) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: T.J. Hockenson (MIN) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.69 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.68 / ask 0.7 (mid 0.69, spread 0.02) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.32 / ask 0.33 (mid 0.325, spread 0.01) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
9. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 1 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
10. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
11. TRACKING (2026 IN-SEASON): Aaron Jones (MIN) records RYOE = -38.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Aaron Jones (MIN) records STACKED BOX PCT = 21.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (2026 IN-SEASON): Jahmyr Gibbs (IND) records RYOE = 53.0 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. TRACKING (BASELINE, 2025 season): Justin Jefferson (MIN) carried NGS ngs_separation_2025baseline = 3.2 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 12 cited fact(s)
- cognitive: 4 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 6 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 52 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | IND@MIN | 43.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | U.S. Bank Stadium | 1.2212 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | U.S. Bank Stadium | 15.6 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | U.S. Bank Stadium | 47.5 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | U.S. Bank Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_RB | Jordan Mason (MIN) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Christian Darrisaw (MIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Charles Demmings (MIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Jordan Addison (MIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | T.J. Hockenson (MIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Donovan Jackson (MIN) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Josh Oliver (MIN) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Jaylon Carlies (IND) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ashton Dulin (IND) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Tyler Warren (IND) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Alec Pierce (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Arden Key (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Minnesota wins (KXNFLGAME-26OCT25INDMIN-MIN) | 0.69 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Indianapolis wins (KXNFLGAME-26OCT25INDMIN-IND) | 0.33 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_two_sided_home | Minnesota wins (KXNFLGAME-26OCT25INDMIN-MIN) | {'yes_bid': 0.68, 'yes_ask': 0.7, 'mid': 0.69, 'spread': 0.02} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| kalshi_two_sided_away | Indianapolis wins (KXNFLGAME-26OCT25INDMIN-IND) | {'yes_bid': 0.32, 'yes_ask': 0.33, 'mid': 0.325, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| pinnacle_sharp_reference_available | IND@MIN | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 34 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.69**
- Book de-vig home fair: **0.6908** (espn-inline DraftKings -258/+210 de-vig)
- |delta| = **0.0008** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.69**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.695** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -5.5 (±3.0), total 43.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 0 | 0.0% |
| push | 0 | 0.0% |
| home failed to cover | 5 | 100.0% |

Named precedents (most recent first):

- 2024 W18: WAS @ DAL final 23-19, close -7 / 43.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W18: LAC @ LV final 34-20, close -7 / 42.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: BAL @ HOU final 31-2, close -5.5 / 46.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: LAC @ NE final 40-7, close -6 / 42 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: KC @ CLE final 21-7, close -4.5 / 41.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Jaylon Carlies (IND) (LB, Out); Ashton Dulin (IND) (WR, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 18 MIN players appear on the report but carry ACTIVE status
- injuries: 20 IND players appear on the report but carry ACTIVE status
- news: no MIN/IND hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 82/100 (cited links 14 / cited + gaps 17)
- **Kelly-fraction ceiling: 0.0082 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 82/100

Conviction in the CHAIN (cited links 14 / cited + named gaps 17). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
