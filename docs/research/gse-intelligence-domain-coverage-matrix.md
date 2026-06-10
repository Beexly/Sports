# GSE Intelligence Domain Coverage Matrix

Generated: 2026-06-09

This is the first-pass map for "know everything" without letting the system become reckless. Every domain gets a primary path, backups, minimum useful fields, and a governance note. The product should treat missing P0/P1 coverage as an operational fault, not as a reason to hallucinate.

| Domain | Criticality | Primary source | Fallbacks | Governance |
| --- | --- | --- | --- | --- |
| ODDS | P0 | The Odds API / licensed odds provider | TheRundown, SportsDataIO, manual book export | public derived, raw provider terms gated |
| SCORES | P0 | licensed scores feed | SportsDataIO, nflverse schedules/PBP, official league site | withhold settlement on conflict |
| SCHEDULE | P0 | nflreadr schedules | SportsDataIO, official NFL/team schedule | required for every slate |
| PLAYER_PROFILE | P1 | nflreadr rosters | SportsDataIO, team roster pages, GSIS IDs | identity map required |
| PLAYER_STATS | P0 | nflfastR/nflreadr player stats | SportsDataIO, official gamebooks | public stats can power derived claims |
| PLAYER_PARTICIPATION | P1 | nflreadr participation | snap counts, charting provider, manual review | raw personnel may require charting license |
| INJURY | P0 | official injury report / licensed feed | team report, SportsDataIO, trusted reporter confirmation | public claims require official or T1/T2 support |
| DEPTH_CHART | P1 | team official depth chart / licensed feed | SportsDataIO, FantasyLife, team beat confirmation | beat notes are claim cards, not truth |
| ROSTER_TRANSACTION | P0 | NFL transactions/team official | SportsDataIO, trusted wires, team accounts | must be timestamped |
| COACH_STAFF | P1 | team announcements / ESPN guide | NFL.com, CBS, FantasyLife, official team pages | titles do not equal play caller |
| SCHEME_TENDENCY | P1 | nflverse PBP aggregate | FTN/PFF/SIS charting, manual analyst review | separate observed vs inferred |
| OFFICIALS | P1 | nflreadr load_officials | SportsDataIO referee crew, Football Zebras, PFR officials | trend claims observational only |
| OFFICIATING_TENDENCY | P2 | derived PBP + officials join | RefMetrics, SportsDataIO, Football Zebras | never imply bias or misconduct |
| STADIUM | P1 | nflreadr schedules/stadium metadata | SportsDataIO stadium profiles, Tom Bliss coordinates | retractable roof needs game-day status |
| WEATHER | P1 | Weather API at stadium coordinates | Meteostat archive, AccuWeather, Windy, Weatherbit | indoors/retractable roof gates impact |
| WIND | P1 | Weather API + stadium orientation | Windy, Meteostat, stadium-side manual report | wind is a separate football-impact domain |
| SURFACE_ROOF | P1 | stadium metadata + team/game day source | Tom Bliss archive, SportsDataIO, official team/stadium account | roof status must not be stale |
| MARKET_PROPS | P1 | licensed odds/player props | TheRundown, SportsDataIO, manual user export | provider terms govern display |
| DFS_SALARIES | P2 | authorized user export / licensed provider | Run The Sims, SaberSim, FantasyLabs if licensed | no direct scraping DK/FD |
| DFS_OWNERSHIP | P2 | licensed projection provider | user upload, public contest rewind when allowed | source terms are critical |
| FANTASY_ADP | P2 | platform ADP exports/licensed | FantasyPros, Underdog ADP, FFPC/NFFC data if licensed | do not ingest private leagues without user auth |
| BEAT_REPORTER | P2 | trusted reporter registry | team beat lists, outlet pages, manual operator curation | reporter claims require verification path |
| ANALYST_RANKINGS | P3 | licensed/ranked analysts | FantasyPros ECR, FTN, Footballguys, free public articles | never copy paid rankings verbatim |
| NEWS_CLAIM | P1 | claim card from trusted source | official confirmation, multiple T3 corroboration, manual review | AI output is never a source |
| COMMUNITY_WEAK_SIGNAL | P3 | watchlist-only community monitor | Reddit/X/YouTube comments only if policy-approved | cockpit only; never public evidence |
| MODEL_OUTPUT | P2 | internal model decision trace | shadow models, backtests, calibration logs | model output is not truth |
| AUTONOMOUS_SYSTEM_HEALTH | P0 | control-plane telemetry | synthetic monitor, health route, worker logs, CI | must remain visible in cockpit |

## Sources

- [nflreadr reference](https://nflreadr.nflverse.com/reference/) - Public nflverse loader surface for play-by-play, rosters, schedules, injuries, officials, participation, depth charts, Next Gen Stats and FTN charting loaders.
- [nflreadr load_officials](https://nflreadr.nflverse.com/reference/load_officials.html) - One row per game per official; useful public foundation for officials identity and assignment history.
- [nflfastR load_pbp](https://www.nflfastr.com/reference/load_pbp.html) - Public play-by-play foundation for down, distance, play type, game state, EPA, success, weather text and derived football features.
- [nflfastR update_pbp_db](https://nflfastr.com/reference/update_pbp_db.html) - Maintains a database table for nflverse play-by-play; useful pattern for GSE canonical football history.
- [SportsDataIO NFL API](https://sportsdata.io/nfl-api) - Commercial NFL API covering scores, stats, odds, projections, news, injuries, depth charts, weather forecasts, referee crew, stadiums and historical data.
- [TheRundown API](https://docs.therundown.io/introduction) - Sports betting data API with odds, scores, schedules, team/player stats, player props and historical line data.
- [Tom Bliss NFL Weather Data](https://www.datawithbliss.com/weather-data) - Historical NFL game weather archive and stadium coordinates/roof/azimuth documentation.
- [OpenTelemetry observability primer](https://opentelemetry.io/docs/concepts/observability-primer/) - Standard concepts for traces, spans, metrics and logs in distributed debugging.
- [AWS Reliability Pillar](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html) - Reliability design guidance around resilience, monitoring, recovery and consistent change management.
- [Football Zebras](https://www.footballzebras.com/) - Officiating news and crew assignment context; use as secondary/watchlist source, not a sole production truth source.
- [Pro Football Reference officials](https://www.pro-football-reference.com/officials/index.htm) - Historical officials index; useful for public cross-checking and identity resolution.
- [RefMetrics NFL](https://www.refmetrics.com/nfl/home) - Officials analytics platform through 2025; candidate source to evaluate for officiating trend data.
