# BAL@ATL - Analyst Card (Ballistics Window)

generated_utc: 2026-10-14T02:37:06.239398+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Ballistics Window** - named from the confluence cluster of 61 cited facts across 6 domains (biophysical, cognitive, dfs, environmental, market, on_field).

## Causal chain (every link cites its file)

1. AIR: venue air density 1.1245 kg/m3 measured at Mercedes-Benz Stadium [docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json] -> ball carries measurably differently than a sea-level-standard model assumes ; wind 9.7 km/h qualifies it -> deep-ball and kick distances shift; totals and long-DK props carry the effect, spreads barely
2. AVAILABILITY: Za'Darius Smith (ATL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Michael Penix Jr. (ATL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: C.J. Henderson (ATL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. AVAILABILITY: Andrew Vorhees (BAL) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
6. TRACKING (2026 IN-SEASON): Brian Robinson (ATL) records RYOE = -3.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Brian Robinson (ATL) records STACKED BOX PCT = 17.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (2026 IN-SEASON): Bijan Robinson (ATL) records RYOE = 161.2 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
9. TRACKING (BASELINE, 2025 season): Zay Flowers (BAL) carried NGS ngs_separation_2025baseline = 3.6 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 11 cited fact(s)
- cognitive: 6 cited fact(s)
- dfs: 3 cited fact(s)
- environmental: 4 cited fact(s)
- market: 2 cited fact(s)
- on_field: 35 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | BAL@ATL 5:20 PM | 43.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| air_density_kg_m3 | Mercedes-Benz Stadium | 1.1245 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| wind_kmh | Mercedes-Benz Stadium | 9.7 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| temp_f | Mercedes-Benz Stadium | 86.4 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| precip_prob_pct | Mercedes-Benz Stadium | 0 | fires | docs/data-sources/research/2026-10-13/weather-pilot/weather-stadium-pilot.json |
| injury_status_DE | Za'Darius Smith (ATL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Michael Penix Jr. (ATL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | C.J. Henderson (ATL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Yasir Abdullah (ATL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_G | Andrew Vorhees (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_C | Cam Jurgens (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Trey Hendrickson (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Lamar Jackson (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ja'Kobi Lane (BAL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Broderick Washington Jr. (BAL) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Durham Smythe (BAL) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| pinnacle_sharp_reference_available | BAL@ATL | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| presser_sentiment | ATL | neutral | Head Coach Kevin Stefanski Media Availability | Tuesday, September 29th | Press Conference - Atlanta Falcons. Head Coach Kevin Stefanski Media Availability | Tuesday, September 29th | Press Conference | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | ATL | neutral | Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 24, 2026 - Atlanta Falcons. Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 24, 2026    Atlanta Falcons | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | ATL | neutral | Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 26, 2026 - Atlanta Falcons. Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 26, 2026    Atlanta Falcons | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| presser_sentiment | ATL | neutral | Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 12, 2026 - Atlanta Falcons. Head Coach Kevin Stefanski AT&T Training Camp Press Conference | August 12, 2026    Atlanta Falcons | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=None (one anchor missing from the corpus/traces)

## Honest gaps

- injuries: 21 ATL players appear on the report but carry ACTIVE status
- injuries: 18 BAL players appear on the report but carry ACTIVE status
- market: Kalshi digest has no row for this game
- news: no ATL/BAL hits in espn-nfl-news-digest.json

## Conviction: 69/100

Conviction in the CHAIN (cited links 9 / cited + named gaps 13). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
