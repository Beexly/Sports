# WSH@SF - Analyst Card (Trench Funnel)

generated_utc: 2026-10-18T09:10:51.168235+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Trench Funnel** - named from the confluence cluster of 65 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.2277 kg/m3 measured at Levi's Stadium [docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 3.3 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Mykel Williams (SF) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Upton Stout (SF) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Marques Sigle (SF) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Nick Bosa (SF) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. COGNITIVE: news flow names this game: "Ex-Broncos exec John Beake, who helped land John Elway, dies at 87" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
7. COGNITIVE: news flow names this game: "49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
8. COGNITIVE: news flow names this game: "Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
9. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 3 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
10. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
11. TRACKING (2026 IN-SEASON): Christian McCaffrey (SF) records RYOE = 21.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
12. TRACKING (2026 IN-SEASON): Christian McCaffrey (SF) records STACKED BOX PCT = 24.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
13. TRACKING (2026 IN-SEASON): Kaelon Black (SF) records RYOE = -27.0 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. MULTI-BOOK PLANE: Action Network multi-book coverage across 29 books: DraftKings (ML -422, Spd -7.5, O/U 50.5); DraftKings (ML -278, Spd -4.5, O/U 25); DraftKings (ML -225, Spd -2.5, O/U 9.5); DraftKings (ML -225, Spd -3.5, O/U 15.5) [docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json] -> cross-book price consensus from Caesars, DraftKings, FanDuel, and BetMGM exits the single-book plane -> enables true Shin de-vigging and bookmaker shading identification
15. TRACKING (BASELINE, 2025 season): Jauan Jennings (SF) carried NGS ngs_separation_2025baseline = 2.2 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 13 cited fact(s)
- cognitive: 12 cited fact(s)
- dfs: 4 cited fact(s)
- environmental: 4 cited fact(s)
- market: 4 cited fact(s)
- on_field: 28 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | WAS@SF 5:15 PM | 50.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Levi's Stadium | 1.2277 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Levi's Stadium | 3.3 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| temp_f | Levi's Stadium | 59.2 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Levi's Stadium | 0 | fires | docs/data-sources/research/2026-10-18/weather-pilot/weather-stadium-pilot.json |
| injury_status_DE | Mykel Williams (SF) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Upton Stout (SF) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Marques Sigle (SF) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Nick Bosa (SF) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Christian Kirk (SF) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Mike Evans (SF) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Siran Neal (SF) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Gracen Halton (SF) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Deebo Samuel Sr. (SF) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Demarcus Robinson (SF) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Dre Greenlaw (SF) | Suspension | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Nick Martin (SF) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Garret Wallow (SF) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| action_network_multi_book | WSH@SF multi-book plane | 29 books: DraftKings (ML -422, Spd -7.5, O/U 50.5); DraftKings (ML -278, Spd -4.5, O/U 25); DraftKings (ML -225, Spd -2.5, O/U 9.5); DraftKings (ML -225, Spd -3.5, O/U 15.5) | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| market_spread_dispersion | WSH@SF | 6.0 | fires | docs/data-sources/research/2026-10-13/action-network/scoreboard_probe.json |
| pinnacle_sharp_reference_available | WSH@SF | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| news_hit | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 | Ex-Broncos exec John Beake, who helped land John Elway, dies at 87 John Beake, who was instrumental in the trade for John Elway and helped guide the Denver Broncos to back-to-back Super Bowl titles in the late 1990s, has died at age 87, the team said Saturday.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk | 49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk The San Francisco 49ers will have to wait at least another week for the return of defensive end Nick Bosa, though there's at least a chance they'll have both receiver Mike Evans and fullback Kyle Juszczyk for Monda | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |
| news_hit | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out | Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out Updated inactives and analysis based on the latest reports and official announcements leading up to kickoff.   | fires | docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=0.7819063004846527 (one anchor missing from the corpus/traces)

## Precedent (structural matches from the 2,622-game corpus)

no signal - named gap: no structurally similar game in the 2015-2024 corpus (market shape match on closing spread/total found nothing). This thesis has no precedent support; treat it as a first observation, not a repeated pattern.

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Marques Sigle (SF) (S, Out); Nick Bosa (SF) (DE, Out); Deebo Samuel Sr. (SF) (WR, Out); Garret Wallow (SF) (LB, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**Attrition is priced, not missed.** The injury reports this card cites are public before kickoff; the market has already moved the line for them. What looks like an unpriced trench edge is the market's Tuesday number meeting the public's Friday report - the mechanism inverts: the 'funnel' is where the sharp money already is, and the value (if any) is on the other side.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- the cited market anchor moved LESS than 0.5 pts after the injury report timestamp - then the market genuinely missed it and the thesis stands
- line-movement history for this game (ESPN odds open vs close in the slate traces) shows <0.5 pts of total movement - no pricing evidence either way

## Honest gaps

- injuries: 12 SF players appear on the report but carry ACTIVE status
- injuries: no injury records found for WSH
- market: fresh Kalshi two-sided books have no row for this game

## Sizing

- Chain conviction 83/100 (cited links 15 / cited + gaps 18)
- **Kelly-fraction ceiling: 0.0083 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 83/100

Conviction in the CHAIN (cited links 15 / cited + named gaps 18). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
