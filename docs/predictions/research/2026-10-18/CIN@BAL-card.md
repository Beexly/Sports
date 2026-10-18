# CIN@BAL - Analyst Card (Trench Funnel)

generated_utc: 2026-10-18T09:13:04.063451+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Trench Funnel** - named from the confluence cluster of 67 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2973 kg/m3 measured at M&T Bank Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 7.5 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Ja'Kobi Lane (BAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Broderick Washington Jr. (BAL) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Cam Jurgens (BAL) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Matt Hibner (BAL) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.38 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.41 / ask 0.44 (mid 0.425, spread 0.03) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.57 / ask 0.6 (mid 0.585, spread 0.03) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
9. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 1 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
10. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (14:00-17:00 CT, ch87-fantasy-alarm-show) -> High-total AFC/NFC marquee spots draw projected chalk ownership above 20% on primary tight ends and RB1s; tournament leverage favors bring-back WR2/WR3 options with rising 4-week red-zone target share. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
11. TRACKING (2026 IN-SEASON): Chase Brown (CIN) records RYOE = -49.2 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Chase Brown (CIN) records STACKED BOX PCT = 25.4 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (2026 IN-SEASON): Samaje Perine (CIN) records RYOE = 7.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. TRACKING (BASELINE, 2025 season): Ja'Marr Chase (CIN) carried NGS ngs_separation_2025baseline = 3.2 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 11 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 6 cited fact(s)
- on_field: 36 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | CIN@BAL | 50.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | M&T Bank Stadium | 1.2973 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | M&T Bank Stadium | 7.5 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | M&T Bank Stadium | 39.2 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | M&T Bank Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_WR | Ja'Kobi Lane (BAL) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Broderick Washington Jr. (BAL) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_C | Cam Jurgens (BAL) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Matt Hibner (BAL) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Lamar Jackson (BAL) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Emery Jones Jr. (BAL) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Andrew Vorhees (BAL) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Colbie Young (CIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Kyle Dugger (CIN) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Tanner Hudson (CIN) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Swayze Bozeman (CIN) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Cincinnati wins (KXNFLGAME-26OCT25CINBAL-CIN) | 0.38 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Baltimore wins (KXNFLGAME-26OCT25CINBAL-BAL) | 0.65 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_two_sided_away | Cincinnati wins (KXNFLGAME-26OCT25CINBAL-CIN) | {'yes_bid': 0.41, 'yes_ask': 0.44, 'mid': 0.425, 'spread': 0.03} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| kalshi_two_sided_home | Baltimore wins (KXNFLGAME-26OCT25CINBAL-BAL) | {'yes_bid': 0.57, 'yes_ask': 0.6, 'mid': 0.585, 'spread': 0.03} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| pinnacle_sharp_reference_available | CIN@BAL | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 34 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_artifact_hit | REA Week 6 funnel (24/25 sources, 1 team-specific hits) | 1410 runtime APIs intercepted across FantasyGuru, LineStar, RotoGrinders, FantasyAlarm, Sabersim, FTN, RotoWire, FantasyPros | fires | docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.65**
- Book de-vig home fair: **0.6164** (espn-inline DraftKings -180/+150 de-vig)
- |delta| = **0.0336** -> DIVERGE - stale book or stale market; treat the prior as unreliable

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.65**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.6553** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -3.5 (±3.0), total 50.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 0 | 0.0% |
| push | 0 | 0.0% |
| home failed to cover | 5 | 100.0% |

Named precedents (most recent first):

- 2024 W18: CIN @ PIT final 19-17, close -2.5 / 48.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: DET @ SF final 40-34, close -4 / 50.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: TB @ DAL final 24-26, close -4.5 / 47.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: GB @ SEA final 30-13, close -3 / 48 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W14: BUF @ LA final 42-44, close -3.5 / 49.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Broderick Washington Jr. (BAL) (DT, Out); Cam Jurgens (BAL) (C, Out); Matt Hibner (BAL) (TE, Out); Lamar Jackson (BAL) (QB, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 18 BAL players appear on the report but carry ACTIVE status
- injuries: 21 CIN players appear on the report but carry ACTIVE status
- news: no BAL/CIN hits in espn-nfl-news-digest.json

## Sizing

- Chain conviction 82/100 (cited links 14 / cited + gaps 17)
- **Kelly-fraction ceiling: 0.0082 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 82/100

Conviction in the CHAIN (cited links 14 / cited + named gaps 17). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
