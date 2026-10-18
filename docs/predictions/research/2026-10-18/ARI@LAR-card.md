# ARI@LAR - Analyst Card (Attrition Edge)

generated_utc: 2026-10-18T09:10:44.053419+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-18

## Named thesis

**Attrition Edge** - named from the confluence cluster of 64 cited facts across 5 domains (biophysical, cognitive, dfs, market, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Kitan Crawford (ARI) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Andrew Wingard (ARI) listed OUT [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Zaven Collins (ARI) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Budda Baker (ARI) listed QUESTIONABLE [docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. MICROSTRUCTURE: Kalshi prints 0.88 on this game [docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json] -> an independent Layer-1 anchor exists beside the de-vigged book line -> when the two agree within ~2 points, the prior is solid and L2 signals apply cleanly; divergence would flag a stale book
6. MICROSTRUCTURE (two-sided): Kalshi live book on the home side: bid 0.87 / ask 0.88 (mid 0.875, spread 0.01) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
7. MICROSTRUCTURE (two-sided): Kalshi live book on the away side: bid 0.12 / ask 0.13 (mid 0.125, spread 0.01) [docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json] -> the prediction market quotes BOTH sides with visible depth -> a tight spread means the prior is liquid; a wide spread means the market itself is uncertain and any 'edge' vs a single stale book quote is suspect
8. COGNITIVE: news flow names this game: "Ex-Broncos exec John Beake, who helped land John Elway, dies at 87" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
9. COGNITIVE: news flow names this game: "49ers rule out Bosa for Monday, still hopeful for Evans, Juszczyk" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
10. COGNITIVE: news flow names this game: "Fantasy football Week 6 inactives: Williams to play; Hurts, Jackson ruled out" [docs/data-sources/research/2026-10-18/news-espn/espn-nfl-news-digest.json] -> narrative/attention pressure around the teams -> market attention (and DFS ownership) can detach from fundamentals; watch for overreaction spots
11. DFS: corpus artifact references this game (REA Week 6 funnel (24/25 sources, 2 team-specific hits)) [docs/data-sources/research/2026-10-18/rea_week6_extraction_manifest.json] -> salary/ownership surfaces exist for this slate -> leverage and correlation structure for entry construction is derivable, not assumed
12. AIRWAVE CH87 (04:00-23:00 CT): SiriusXM CH87 (04:00-06:00 CT, ch87-early-look-replay) -> Early-morning injury desk emphasizes left-tackle and boundary-corner multi-DNP practice streaks (such as New England LT Will Campbell MCL sprain and Rams kicker transition to Blake Grupe) as primary pre-kickoff line-movement catalysts. [docs/data-sources/research/2026-10-18/siriusxm_ch87_week6_schedule_and_digest.json] -> satellite desk consensus & practice-window context cross-checked against on-field and market priors
13. TRACKING (2026 IN-SEASON): Kyren Williams (LAR) records RYOE = 40.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
14. TRACKING (2026 IN-SEASON): Kyren Williams (LAR) records STACKED BOX PCT = 27.1 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
15. TRACKING (2026 IN-SEASON): Blake Corum (LAR) records RYOE = 3.8 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
16. TRACKING (BASELINE, 2025 season): Puka Nacua (LAR) carried NGS ngs_separation_2025baseline = 2.9 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 8 cited fact(s)
- cognitive: 14 cited fact(s)
- dfs: 4 cited fact(s)
- market: 6 cited fact(s)
- on_field: 32 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | ARI@LAR 1:05 PM | 51.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_S | Kitan Crawford (ARI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Andrew Wingard (ARI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Zaven Collins (ARI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Budda Baker (ARI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_P | Blake Gillikin (ARI) | Questionable | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Jeremiyah Love (ARI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Wydett Williams Jr. (ARI) | Out | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | James Conner (ARI) | Injured Reserve | fires | docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json |
| kalshi_yes_ask | Los Angeles R wins (KXNFLGAME-26OCT18ARILAR-LAR) | 0.88 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_yes_ask | Arizona wins (KXNFLGAME-26OCT18ARILAR-ARI) | 0.13 | fires | docs/data-sources/research/2026-10-13/kalshi/kalshi-nfl-digest.json |
| kalshi_two_sided_home | Los Angeles R wins (KXNFLGAME-26OCT18ARILAR-LAR) | {'yes_bid': 0.87, 'yes_ask': 0.88, 'mid': 0.875, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| kalshi_two_sided_away | Arizona wins (KXNFLGAME-26OCT18ARILAR-ARI) | {'yes_bid': 0.12, 'yes_ask': 0.13, 'mid': 0.125, 'spread': 0.01} | fires | docs/data-sources/research/2026-10-18/kalshi/kalshi_full_slate_2026-10-18T08-54-31Z.json |
| pinnacle_sharp_reference_available | ARI@LAR | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
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

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check (Layer 1 vs Layer 1)

- Kalshi home price: **0.88**
- Book de-vig home fair: **0.863** (espn-inline DraftKings -900/+600 de-vig)
- |delta| = **0.017** -> AGREE - prior solid, L2 signals apply cleanly

## Precedent (structural matches from the 2,622-game corpus)

Structural filter: closing spread -12.5 (±3.0), total 51.5 (±3.0) -> 3 precedent games (2015-2024, nflverse, CC-BY 4.0).

Outcome distribution of the matched set (home side vs the close):

| outcome | n | share |
|---|---|---|
| home covered | 0 | 0.0% |
| push | 0 | 0.0% |
| home failed to cover | 3 | 100.0% |

Named precedents (most recent first):

- 2023 W17: SF @ WAS final 27-10, close -14 / 49 [data/backtest/nfl_historical_games.json rows[]]
- 2021 W13: TB @ ATL final 30-17, close -11 / 51 [data/backtest/nfl_historical_games.json rows[]]
- 2018 W13: KC @ OAK final 40-33, close -14 / 53.5 [data/backtest/nfl_historical_games.json rows[]]

## Projected game state

**First 15 (script):** no signal - named gap: no environmental or script-shaping signal above threshold in the corpus for this game; first-15 leans league-average and the market's implied script.

**Halftime trajectory:** the breaking conditions below are written to be checkable at half - scratch lists and line moves are the two things that legitimately change the read by then. No halftime-specific signal exists in the corpus for this game (named gap: no in-game tracking feed ingested yet).

**Fourth-quarter mode:** rotation thinning is live on the cited report (Andrew Wingard (ARI) (S, Out); Jeremiyah Love (ARI) (RB, Out); Wydett Williams Jr. (ARI) (S, Out)) - fourth-quarter rush-decay and pressure-rate drift are the exposed mechanisms; conditioning props on late-game volume carry the risk [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json]

## Counter-thesis (the strongest case against)

**The confluence is counting, not compounding.** This card cites facts across several domains, but citation count is not mechanism count. Unless two domains touch the SAME causal path (not merely the same game), they are independent observations, and multiplying their LRs overstates the evidence - failure taxonomy #2 and #3 in one move.

Falsifiers for the counter-thesis (conditions under which the ORIGINAL thesis stands):

- name the specific mechanism any two cited domains share; if the answer is only 'they describe the same game', the confluence claim is false and conviction should drop to the single strongest domain's weight

## Honest gaps

- weather: no venue mapping or no weather file for LAR
- injuries: no injury records found for LAR
- injuries: 17 ARI players appear on the report but carry ACTIVE status

## Sizing

- Chain conviction 84/100 (cited links 16 / cited + gaps 19)
- **Kelly-fraction ceiling: 0.0084 of bankroll (half-unit ceiling)**
- Basis: this is a *coverage* ratio, not a win probability; the engine refuses to mint a win probability (named gap: no calibrated tau on this host). The fraction above is a hard ceiling on stake sized from evidence coverage, discounted 50% for uncalibrated LRs - every LR in the Bayesian layer is ASSUMED or COMPUTED, none MEASURED.
- Concentration: slate-level correlation is NOT computed here (named gap: the portfolio layer does not yet consume these cards). Do not stack multiple cards sharing the same weather or injury signal without cutting each stake; shared signals compound concentration risk, not edge.

## Conviction: 84/100

Conviction in the CHAIN (cited links 16 / cited + named gaps 19). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
