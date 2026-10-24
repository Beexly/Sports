# Knowledge base — NFL reasoning intelligence

Every file under `docs/engine/intel/kb/` is an ingested source with its URL,
fetch status and size recorded. `sources.json` is the machine-readable index.
Failed fetches are kept and named — they are gaps, not zeroes.

| host | files | what it serves |
|---|---|---|
| . | 1 |  |
| allorigins | 1 |  |
| api-github | 1 |  |
| api-weather-gov | 1 |  |
| arctic-shift-status | 1 |  |
| cdn-espn | 1 |  |
| contracts | 3 |  |
| depth | 1 | depth charts (L1 replacement rule) |
| draftsharks | 1 |  |
| espn | 7 | schedules, summaries, injuries, standings (L1/L3/L4) |
| espn-news-json | 1 |  |
| fantasypros | 3 | injury news + depth charts (L1) |
| fftoday | 1 |  |
| footballguys | 1 |  |
| forecast-weather-gov | 1 |  |
| foxsports | 1 |  |
| ftn | 3 | Stats-IQ catalog, charting, shadow page (L0/L2c) |
| gist-github | 1 |  |
| grep-app | 1 |  |
| injuries | 3 | Rotowire + FantasyPros injury surfaces (L1 cross-check) |
| news | 6 | team/league feeds (L5 narrative) |
| news-google | 1 |  |
| nfl-com-cdn | 1 |  |
| nfl-com-news | 1 |  |
| nflverse | 8 | games, injuries, charting, PFR advstats, snap counts, pbp (L0/L2/L5) |
| ngs | 1 | NextGen Stats pages + API probe (L5) |
| nominatim-osm | 1 |  |
| numberfire | 1 |  |
| open-meteo-forecast | 1 |  |
| open-meteo-geocode | 1 |  |
| pbp | 1 | play-by-play 2026 (L0 shares, L2c EPA) |
| pfr | 1 | season games reference (L3/L5) |
| pfr-games | 1 |  |
| profootballtalk | 1 |  |
| r-jina-proxy | 1 |  |
| raw-githubusercontent | 1 |  |
| reddit | 1 | Arctic Shift team narratives (L5 fan-sentiment) |
| refs | 1 | officials data (L4) |
| sbnation | 1 |  |
| scores24 | 8 | rapi matches/predictions/search + match pages (L3/L4/L5) |
| si-nfl | 1 |  |
| site-web-api-espn | 1 |  |
| sleeper | 1 |  |
| sleeper-players | 1 |  |
| sports-core-api-espn | 1 |  |
| sports-yahoo-league | 1 |  |
| tank01 | 1 |  |
| the33rdteam | 1 |  |
| usage | 1 | snap counts (L0) |
| weather | 3 | NWS hourly forecasts + alerts (L4) |
| web-archive | 1 |  |
| wikipedia | 1 |  |

**Total: 87 ingested files, 60 fetched OK, 27 failed/kept-as-gaps, 132,903,273 bytes.**

## Failure inventory

- `docs/engine/intel/kb/index.md` — session-artifact
- `docs/engine/intel/kb/allorigins/raw.md` — https://api.allorigins.win/raw?url=https%3A%2F%2Fwww.rotoballers.com%2Fnfl%2Fdepth-charts
- `docs/engine/intel/kb/arctic-shift-status/index.md` — https://status.arctic-shift.photon-reddit.com/api/status
- `docs/engine/intel/kb/contracts/cap.md` — https://www.spotrac.com/nfl/cap/
- `docs/engine/intel/kb/contracts/overthecap-contract-history.md` — session-artifact
- `docs/engine/intel/kb/espn/standings.md` — https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings?seasontype=2
- `docs/engine/intel/kb/fantasypros/depth-charts.md` — session-artifact
- `docs/engine/intel/kb/fftoday/rss.md` — https://www.fftoday.com/rss/
- `docs/engine/intel/kb/ftn/search.md` — https://stats.ftnfantasy.com/api/v1/players/search?position=QB
- `docs/engine/intel/kb/grep-app/search.md` — https://grep.app/api/search?q=nfl%20epa%20json
- `docs/engine/intel/kb/news/feed.md` — https://ravenswire.usatoday.com/feed/
- `docs/engine/intel/kb/news/nfl.md` — https://www.yardbarker.com/rss/nfl
- `docs/engine/intel/kb/news/nfl-rss.md` — https://www.nfl.com/feeds-rss/nfl-rss
- `docs/engine/intel/kb/nfl-com-news/articles.md` — https://www.nfl.com/feeds-rss/articles
- `docs/engine/intel/kb/nflverse/papers.md` — https://raw.githubusercontent.com/nflverse/nfldata/main/data/papers.csv
- `docs/engine/intel/kb/nflverse/players_2026.md` — https://github.com/nflverse/nflverse-data/releases/download/players/players_2026.csv
- `docs/engine/intel/kb/nflverse/schedule_2026.md` — https://github.com/nflverse/nflverse-data/releases/download/schedules/schedule_2026.csv
- `docs/engine/intel/kb/pfr/2026-games.md` — session-artifact
- `docs/engine/intel/kb/raw-githubusercontent/index.md` — https://raw.githubusercontent.com/nflverse/nfldata/main/README.md
- `docs/engine/intel/kb/refs/officials.md` — https://raw.githubusercontent.com/nflverse/nfldata/main/data/officials.csv
- `docs/engine/intel/kb/scores24/countries.md` — https://scores24.live/rapi/countries?lang=en
- `docs/engine/intel/kb/scores24/meta.md` — https://scores24.live/rapi/meta?lang=en
- `docs/engine/intel/kb/scores24/sports.md` — https://scores24.live/rapi/predictions/sports?lang=en
- `docs/engine/intel/kb/site-web-api-espn/index.md` — https://site.web.api.espn.com/apis/common/v3/sports/football/nfl/teams/BAL
- `docs/engine/intel/kb/sports-core-api-espn/index.md` — https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/teams/33/injuries
- `docs/engine/intel/kb/tank01/index.md` — https://tank01-nfl-live-in-game-real-time-statistics-nfl-data.p.rapidapi.com/getNFLTeams
- `docs/engine/intel/kb/web-archive/games.md` — http://web.archive.org/web/2026/https://www.pro-football-reference.com/years/2026/games.htm

## Rerun inputs

workflow: firecrawl-knowledge-base
source: 40+ NFL intelligence endpoints and files (see sources.json)
goal: reference
depth: quick (wave 1 curl, wave 2 variants + session artifacts)
output_dir: docs/engine/intel/kb/
