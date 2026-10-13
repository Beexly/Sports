# NYG@WSH - Analyst Card (Confluence Play)

generated_utc: 2026-10-13T21:24:21.114743+00:00  |  trace: 2026-10-13T173138Z0000-3fdf15a4  |  corpus date: 2026-10-13

## Named thesis

**Confluence Play** - named from the confluence cluster of 46 cited facts across 3 domains (biophysical, dfs, on_field).

## Causal chain (every link cites its file)

1. AVAILABILITY: Jermaine Eluemunor (NYG) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
2. AVAILABILITY: Jason Pinnock (NYG) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
3. AVAILABILITY: Colton Hood (NYG) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
4. AVAILABILITY: Tyler Nubin (NYG) listed QUESTIONABLE [docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json] -> unit rotation depth changes at that position -> snap share and pressure/scheme leverage shift toward the opponent's strength
5. TRACKING: Wan'Dale Robinson (NYG) carries NGS ngs_separation = 3.4 [docs/data-sources/research/2026-10-13/nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json] -> measured athletic/tracking performance, not box-score residue -> usage and matchup edges the market prices late

## Confluence

- biophysical: 25 cited fact(s)
- dfs: 3 cited fact(s)
- on_field: 18 cited fact(s)

## Firing vs contradicting signals

| metric | subject | value | direction | source |
|---|---|---|---|---|
| injury_status_OT | Jermaine Eluemunor (NYG) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Jason Pinnock (NYG) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Colton Hood (NYG) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_S | Tyler Nubin (NYG) | Questionable | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Nikko Reed (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Jake Haener (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | J.C. Davis (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DT | Bobby Jamison-Travis (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Devin Singletary (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_PK | Dominic Zvada (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Isaiah Likely (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | Jameis Winston (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_RB | Cam Skattebo (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Malik Nabers (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_QB | J.J. McCarthy (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_DE | Chauncey Golston (NYG) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_OT | Andrew Thomas (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Chris Manhertz (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_WR | Braxton Berrios (NYG) | Injured Reserve | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Greg Newsome II (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Tremaine Edmunds (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_LB | Arvell Reese (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_CB | Deonte Banks (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |
| injury_status_TE | Theo Johnson (NYG) | Active | fires | docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json |

## Pre-registered breaking conditions

- Pre-kick scratch: any player cited OUT/QUESTIONABLE in this card is announced active -> availability links invert immediately
- Weather shift: wind > 20 km/h or precipitation > 0.2 in at kickoff vs the cited forecast -> ballistics links must be re-run, not assumed
- Market break: Kalshi/book prior divergence > 3 points on this game -> microstructure link is void; treat the prior as unreliable
- Line move: closing total moves > 1.5 from the cited anchor -> the market knows something the corpus does not; downgrade conviction

## Honest gaps

- weather: no venue mapping or no weather file for WSH
- injuries: no digest or no mapping for WSH
- market: Kalshi digest has no row for this game
- news: no WSH/NYG hits in espn-nfl-news-digest.json

## Conviction: 56/100

Conviction in the CHAIN (cited links 5 / cited + named gaps 9). NOT a win probability. The Bayesian posterior lives in the ranked board's bayes_updates; the math validates this chain, it does not replace it.
