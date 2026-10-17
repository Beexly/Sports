# DEN@LAC - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T02:36:54.409697+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 88 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1864 kg/m3 measured at SoFi Stadium [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 13.7 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Brenen Thompson (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Rodney Shelley (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Quentin Johnston (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Donte Jackson (LAC) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. TRACKING (2026 IN-SEASON): Javonte Williams (DEN) records RYOE = -10.2 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Javonte Williams (DEN) records STACKED BOX PCT = 20.3 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): J.K. Dobbins (LAC) records RYOE = -47.7 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. PRACTICE PARTICIPATION: Talanoa Hufanga (DEN) Practice: DIDNOT (2 DNP days; Ankle) [docs/data-sources/research/2026-10-13/firecrawl/alexandria_nfl_injuries_2026-10-14T01-47-09Z.json] -> official NFL practice report reveals recovery trajectory and true snap-share readiness -> multiple DNP days suppress expected touch volume; full-practice return unlocks normal scheme usage
10. PRACTICE PARTICIPATION: Brandon Jones (DEN) Practice: FULL (0 DNP days; Foot) [docs/data-sources/research/2026-10-13/firecrawl/alexandria_nfl_injuries_2026-10-14T01-47-09Z.json] -> official NFL practice report reveals recovery trajectory and true snap-share readiness -> multiple DNP days suppress expected touch volume; full-practice return unlocks normal scheme usage
11. PRACTICE PARTICIPATION: Sai'vion Jones (DEN) Practice: FULL (0 DNP days; Shoulder) [docs/data-sources/research/2026-10-13/firecrawl/alexandria_nfl_injuries_2026-10-14T01-47-09Z.json] -> official NFL practice report reveals recovery trajectory and true snap-share readiness -> multiple DNP days suppress expected touch volume; full-practice return unlocks normal scheme usage
12. TRACKING (BASELINE, 2025 season): Courtland Sutton (DEN) carried NGS ngs_separation_2025baseline = 2.3 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 24 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 2 cited fact(s)
- on_field: 49 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | DEN@LAC 1:05 PM | 42.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | SoFi Stadium | 1.1864 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | SoFi Stadium | 13.7 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| temp_f | SoFi Stadium | 74.3 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | SoFi Stadium | 0 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
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
| injury_status_CB | Pat Surtain II (DEN) | Doubtful | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Riley Moss (DEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Talanoa Hufanga (DEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Sai'vion Jones (DEN) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Pat Bryant (DEN) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| official_practice_S | Talanoa Hufanga (DEN) | Practice: DIDNOT (2 DNP days; Ankle) | fires | docs/data-sources/research/2026-10-13/firecrawl/alexandria_nfl_injuries_2026-10-14T01-47-09Z.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=None (one anchor missing from the corpus/traces)

## Honest gaps

- injuries: 12 LAC players appear on the report but carry ACTIVE status
- injuries: 20 DEN players appear on the report but carry ACTIVE status
- market: Kalshi digest has no row for this game
- news: no LAC/DEN hits in espn-nfl-news-digest.json

## Conviction: 75/100

Conviction in the CHAIN (cited links 12 / cited + named gaps 16). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
