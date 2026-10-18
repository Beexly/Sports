# NE@CHI - Analyst Card (Trench Funnel)

generated_utc: 2026-10-18T09:12:48.068018+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Trench Funnel** - named from the confluence cluster of 99 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2641 kg/m3 measured at Soldier Field [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 12.6 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Anthony Johnson Jr. (CHI) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Kyler Gordon (CHI) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Caleb Williams (CHI) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Keyshaun Elliott (CHI) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. MICROSTRUCTURE: Kalshi prints 0.46 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
7. COGNITIVE: news flow names this game: "Ex-Broncos exec John Beake, who helped land John Elway, dies at 87" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
8. COGNITIVE: news flow names this game: "49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
9. COGNITIVE: news flow names this game: "Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
10. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 3 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
11. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
12. TRACKING (2026 IN-SEASON): Rhamondre Stevenson (NE) records RYOE = 30.3 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (2026 IN-SEASON): Rhamondre Stevenson (NE) records STACKED BOX PCT = 22.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. TRACKING (2026 IN-SEASON): D'Andre Swift (CHI) records RYOE = -4.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
15. TRACKING (BASELINE, 2025 season): Stefon Diggs (NE) carried NGS ngs_separation_2025baseline = 3.0 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 9 cited fact(s)
- cognitive: 14 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 4 cited fact(s)
- on_field: 64 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | NE@CHI | 48.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Soldier Field | 1.2641 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Soldier Field | 12.6 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | Soldier Field | 39.9 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Soldier Field | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_S | Anthony Johnson Jr. (CHI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Dayo Odeyingbo (CHI) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Kyler Gordon (CHI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Caleb Williams (CHI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Keyshaun Elliott (CHI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Tyrique Stevenson Sr. (CHI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | T.J. Edwards (CHI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Kyle Monangai (CHI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Montez Sweat (CHI) | Suspension | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | New England wins (KXNFLGAME-26OCT22NECHI-NE) | 0.46 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Chicago wins (KXNFLGAME-26OCT22NECHI-CHI) | 0.55 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| pinnacle_sharp_reference_available | NE@CHI | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| news_hit | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 John Beake, who was instrumental in the trade for John Elway and helped guide the Denver Broncos to back-to-back Super Bowl titles in the late 1990s, has died at age 87, the team said Saturday.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk The San Francisco 49ers will have to wait at least another week for the return of defensive end Nick Bosa, though there's at least a chance they'll have both receiver Mike Evans and fullback Kyle Juszczyk for Monda | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out Updated inactives and analysis based on the latest reports and official announcements leading up to kickoff.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Sources: Bears plan to start QB Caleb Williams in Week 6 vs. Falcons | Sources: Bears plan to start QB Caleb Williams in Week 6 vs. Falcons The Bears are planning to start Caleb Williams against the Falcons after the star QB missed the past three games, sources told NFL Network and ESPN.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Eagles QB Jalen Hurts on IR due to blood clot, expected to be out indefinitely | Eagles QB Jalen Hurts on IR due to blood clot, expected to be out indefinitely The Eagles have placed Jalen Hurts on injured reserve after consultations with numerous doctors and experts, sources told ESPN and NFL Network.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Steelers place Wilson on IR with finger injury | Steelers place Wilson on IR with finger injury The Pittsburgh Steelers placed Roman Wilson on the injured reserve list, their second key receiver lost to injury in as many weeks.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Taylor Moton among 3 Panthers activated ahead of Eagles game | Taylor Moton among 3 Panthers activated ahead of Eagles game The Panthers will have RT Taylor Moton and DE Tershawn Wharton available Sunday against the Eagles. RB Trevor Etienne was also activated off IR.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.55**
- Book de-vig home fair: **0.5325** (espn-inline DraftKings -125/+105 de-vig)
- |delta| = **0.0175** -> AGREE - prior solid, L2 signals apply cleanly

### Bayesian layer (the math behind the chain)

Prior (Kalshi, Layer 1): **0.55**  
Update steps:
   - x1.0235 air_density_kg_m3+wind_kmh (COMPUTED) - heuristic damping (NO measured rho for this pair in the empirical matrix): sqrt(prod)=1.0235 instead of prod=1.0476; named gap, not silent

Posterior: **0.5557** (log-odds shift 0.0233)
Unapplied (neutral/off-hypothesis) signals: 0 - recorded in the board's bayes_updates, never dropped.


## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -1.5 (±3.0), total 48.5 (±3.0) -> 5 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 1 | 20.0% |
| push | 0 | 0.0% |
| home failed to cover | 4 | 80.0% |

Named precedents (most recent first):

- 2024 W18: CIN @ PIT final 19-17, close -2.5 / 48.5 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W17: GB @ MIN final 25-27, close -1 / 49 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W16: LA @ NYJ final 19-9, close -3 / 47 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W15: GB @ SEA final 30-13, close -3 / 48 [data/backtest/nfl_historical_games.json rows[]]
- 2024 W13: LAC @ ATL final 17-13, close -1 / 47 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Anthony Johnson Jr. (CHI) (S, Out); Keyshaun Elliott (CHI) (LB, Out); T.J. Edwards (CHI) (LB, Out); Kyle Monangai (CHI) (RB, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 16 CHI players appear on the report but carry ACTIVE status
- injuries: no injury records found for NE
- market: fresh Kalshi two-sided books have no row for this game

## Sizing

- Chain conviction 83/100 (cited links 15 / cited + gaps 18)
- **Kelly-fraction ceiling: 0.0083 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 83/100

Conviction in the CHAIN (cited links 15 / cited + named gaps 18). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
