# LAR@LV - Analyst Card (Ballistics Window)

generated_utc: 2026-10-18T09:13:12.251443+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Ballistics Window** - named from the confluence cluster of 75 cited facts across 7 domains (biophysical, cognitive, dfs, environmental, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1255 kg/m3 measured at Allegiant Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 3.7 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Tonka Hemingway (LV) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Trey Zuhn III (LV) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. MICROSTRUCTURE: Kalshi prints 0.27 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
5. COGNITIVE: news flow names this game: "Ex-Broncos exec John Beake, who helped land John Elway, dies at 87" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
6. COGNITIVE: news flow names this game: "49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
7. COGNITIVE: news flow names this game: "Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
8. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 2 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
9. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
10. TRACKING (2026 IN-SEASON): Kyren Williams (LAR) records RYOE = 40.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
11. TRACKING (2026 IN-SEASON): Kyren Williams (LAR) records STACKED BOX PCT = 27.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Mike Washington Jr. (LV) records RYOE = 21.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (BASELINE, 2025 season): Puka Nacua (LAR) carried NGS ngs_separation_2025baseline = 2.9 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 4 cited fact(s)
- cognitive: 14 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 4 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 44 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | LAR@LV | 48.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Allegiant Stadium | 1.1255 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Allegiant Stadium | 3.7 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | Allegiant Stadium | 65.8 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Allegiant Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_TE | Carter Runyon (LV) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Tonka Hemingway (LV) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Dont'e Thornton Jr. (LV) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_C | Trey Zuhn III (LV) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Las Vegas wins (KXNFLGAME-26OCT25LARLV-LV) | 0.27 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Los Angeles R wins (KXNFLGAME-26OCT25LARLV-LAR) | 0.76 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| pinnacle_sharp_reference_available | LAR@LV | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| news_hit | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 John Beake, who was instrumental in the trade for John Elway and helped guide the Denver Broncos to back-to-back Super Bowl titles in the late 1990s, has died at age 87, the team said Saturday.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk The San Francisco 49ers will have to wait at least another week for the return of defensive end Nick Bosa, though there's at least a chance they'll have both receiver Mike Evans and fullback Kyle Juszczyk for Monda | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out Updated inactives and analysis based on the latest reports and official announcements leading up to kickoff.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Sources: Bears plan to start QB Caleb Williams in Week 6 vs. Falcons | Sources: Bears plan to start QB Caleb Williams in Week 6 vs. Falcons The Bears are planning to start Caleb Williams against the Falcons after the star QB missed the past three games, sources told NFL Network and ESPN.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Eagles QB Jalen Hurts on IR due to blood clot, expected to be out indefinitely | Eagles QB Jalen Hurts on IR due to blood clot, expected to be out indefinitely The Eagles have placed Jalen Hurts on injured reserve after consultations with numerous doctors and experts, sources told ESPN and NFL Network.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Steelers place Wilson on IR with finger injury | Steelers place Wilson on IR with finger injury The Pittsburgh Steelers placed Roman Wilson on the injured reserve list, their second key receiver lost to injury in as many weeks.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Taylor Moton among 3 Panthers activated ahead of Eagles game | Taylor Moton among 3 Panthers activated ahead of Eagles game The Panthers will have RT Taylor Moton and DE Tershawn Wharton available Sunday against the Eagles. RB Trevor Etienne was also activated off IR.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Bears CB Kyler Gordon set for 2026 debut after PUP activation | Bears CB Kyler Gordon set for 2026 debut after PUP activation Bears nickel corner Kyler Gordon has been activated off the PUP list and could make his season debut against the Falcons.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| dfs_leverage_spots | week slate | 34 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-18/dfs/dfs-signals-digest.json |
| dfs_artifact_hit | REA Week 6 funnel (24/25 sources, 2 team-specific hits) | 1410 runtime APIs intercepted across FantasyGuru, LineStar, RotoGrinders, FantasyAlarm, Sabersim, FTN, RotoWire, FantasyPros | fires | docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json |
| dk_contest_census | week slate | 9819 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-18/dfs/dk-contests-census.csv |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.27**
- Book de-vig home fair: **0.2779** (espn-inline DraftKings +245/-305 de-vig)
- |delta| = **0.0079** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.27**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.2746** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread 7.0 (±3.0), total 48.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 5 | 100.0% |
| push | 0 | 0.0% |
| home failed to cover | 0 | 0.0% |

Named precedents (most recent first):

- 2024 W18: CAR @ ATL final 44-38, close +7.5 / 48.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: ARI @ LA final 9-13, close +6.5 / 48 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: NE @ ARI final 17-30, close +6 / 46.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W14: ATL @ MIN final 21-42, close +6 / 46.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W14: LV @ TB final 13-28, close +7 / 47 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Tonka Hemingway (LV) (DT, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Both kickers and both QBs practice in this air daily.** Air-density effects on ball flight are second-order for professionals who calibrate to their home venue every week; the measurable effect lands on inanimate props (K distance, punt avg), not on spreads. The mechanism is real but the market already prices home venue effects in every number it hangs.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- a dome/outdoor split on the 2,622-game corpus shows no total-overskew for extreme density venues - then the environmental edge is noise
- the wind reading is a forecast, not a measurement; if forecast-vs-actual error at this venue exceeds 5 km/h historically, the link is unfalsifiable pre-kickoff

## Honest gaps

- injuries: 21 LV players appear on the report but carry ACTIVE status
- injuries: no injury records found for LAR
- market: fresh Kalshi two-sided books have no row for this game

## Sizing

- Chain conviction 81/100 (cited links 13 / cited + gaps 16)
- **Kelly-fraction ceiling: 0.0081 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 81/100

Conviction in the CHAIN (cited links 13 / cited + named gaps 16). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
