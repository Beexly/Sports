# IND@PIT - Analyst Card (Trench Funnel)

generated_utc: 2026-10-14T02:36:47.222812+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-14

## Named thesis

**Trench Funnel** - named from the confluence cluster of 76 cited facts across 6 domains (biophysical, cognitive, dfs, market, matchup, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Jamel Dean (PIT) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Rico Dowdle (PIT) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Ben Skowronek (PIT) listed OUT [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Roman Wilson (PIT) listed OUT [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. TRACKING (2026 IN-SEASON): Jahmyr Gibbs (IND) records RYOE = 53.0 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
6. TRACKING (2026 IN-SEASON): Jahmyr Gibbs (IND) records STACKED BOX PCT = 19.0 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
7. TRACKING (2026 IN-SEASON): Tyler Allgeier (PIT) records RYOE = -5.6 [docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json] -> live tracking proves in-season trench/separation mechanics (not historical proxy) -> provides immediate ground-truth efficiency adjustment for weekly player projections and game game-scripts
8. TRACKING (BASELINE, 2025 season): Alec Pierce (IND) carried NGS ngs_separation_2025baseline = 2.1 last season [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> a measured 2025 form floor, NOT this season's number -> if 2026 usage matches, the baseline makes the market's late pricing of matchup edges visible; breaking condition: a fresh in-season 2026 NGS capture showing materially different separation/usage voids this link

## Confluence

- biophysical: 12 cited fact(s)
- cognitive: 5 cited fact(s)
- dfs: 3 cited fact(s)
- market: 2 cited fact(s)
- matchup: 1 cited fact(s)
- on_field: 53 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| vegas_line_slate | IND@PIT 10:00 AM | 41.5 | fires | docs/data-sources/research/2026-10-13/linestar/linestar_slates_by_period.json |
| injury_status_CB | Jamel Dean (PIT) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Rico Dowdle (PIT) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ben Skowronek (PIT) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Roman Wilson (PIT) | Out | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Michael Pittman Jr. (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | DeShon Elliott (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Derrick Harmon (PIT) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Darius Slayton (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Ashton Dulin (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Jaylon Carlies (IND) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Arden Key (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Will Mallory (IND) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| pinnacle_sharp_reference_available | IND@PIT | 2 Pinnacle guest line snapshot(s) archived | fires | docs/data-sources/research/2026-10-13/pinnacle/guest_2026-10-14T01-47-09Z.json |
| dfs_leverage_spots | week slate | 31 leverage spots flagged (1 tied to named roster players) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dfs_ownership_quotes | week slate | 7 public ownership quotes parsed (confidence varies; see source) | fires | docs/data-sources/research/2026-10-13/dfs/dfs-signals-digest.json |
| dk_contest_census | week slate | 6388 DK contests captured; flagship: NFL $2.5M Fantasy Football Millionaire [$1M to 1st] | fires | docs/data-sources/research/2026-10-13/dfs/dk-contests-census.csv |
| depth_chart_move | PIT Eli Heidenreich |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| depth_chart_move | PIT Doneiko Slaughter |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| depth_chart_move | PIT Lew Nichols |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| game_context_flag | IND |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| game_context_flag | PIT |  | fires | docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json |
| ngs_2026_ryoe | Jahmyr Gibbs (IND) | 53.0 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |
| ngs_2026_stacked_box_pct | Jahmyr Gibbs (IND) | 19.0 | fires | docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

### Cross-anchor check

- unavailable: kalshi=None, book_fair=None (one anchor missing from the corpus/traces)

## Honest gaps

- weather: venue 'Acrisure Stadium' not in pilot file
- injuries: 18 PIT players appear on the report but carry ACTIVE status
- injuries: 20 IND players appear on the report but carry ACTIVE status
- market: Kalshi digest has no row for this game
- news: no PIT/IND hits in espn-nfl-news-digest.json

## Conviction: 62/100

Conviction in the CHAIN (cited links 8 / cited + named gaps 13). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
