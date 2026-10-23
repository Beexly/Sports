# Knowledge base — NFL reasoning intelligence

Every file under `docs/engine/intel/kb/` is an ingested source with its URL,
fetch status and size recorded. `sources.json` is the machine-readable index.
Failed fetches are kept and named — they are gaps, not zeroes.

| host | files | what it serves |
|---|---|---|
| . | 1 |  |
| contracts | 3 |  |
| depth | 1 | depth charts (L1 replacement rule) |
| espn | 7 | schedules, summaries, injuries, standings (L1/L3/L4) |
| fantasypros | 3 | injury news + depth charts (L1) |
| ftn | 3 | Stats-IQ catalog, charting, shadow page (L0/L2c) |
| injuries | 3 | Rotowire + FantasyPros injury surfaces (L1 cross-check) |
| news | 6 | team/league feeds (L5 narrative) |
| nflverse | 8 | games, injuries, charting, PFR advstats, snap counts, pbp (L0/L2/L5) |
| ngs | 1 | NextGen Stats pages + API probe (L5) |
| pbp | 1 | play-by-play 2026 (L0 shares, L2c EPA) |
| pfr | 1 | season games reference (L3/L5) |
| reddit | 1 | Arctic Shift team narratives (L5 fan-sentiment) |
| refs | 1 | officials data (L4) |
| scores24 | 8 | rapi matches/predictions/search + match pages (L3/L4/L5) |
| usage | 1 | snap counts (L0) |
| weather | 3 | NWS hourly forecasts + alerts (L4) |

**Total: 52 ingested files, 35 fetched OK, 17 failed/kept-as-gaps, 86,760,953 bytes.**

## Failure inventory

- `docs/engine/intel/kb/index.md` — session-artifact
- `docs/engine/intel/kb/contracts/cap.md` — https://www.spotrac.com/nfl/cap/
- `docs/engine/intel/kb/contracts/overthecap-contract-history.md` — session-artifact
- `docs/engine/intel/kb/espn/standings.md` — https://site.api.espn.com/apis/site/v2/sports/football/nfl/standings?seasontype=2
- `docs/engine/intel/kb/fantasypros/depth-charts.md` — session-artifact
- `docs/engine/intel/kb/ftn/search.md` — https://stats.ftnfantasy.com/api/v1/players/search?position=QB
- `docs/engine/intel/kb/news/feed.md` — https://ravenswire.usatoday.com/feed/
- `docs/engine/intel/kb/news/nfl.md` — https://www.yardbarker.com/rss/nfl
- `docs/engine/intel/kb/news/nfl-rss.md` — https://www.nfl.com/feeds-rss/nfl-rss
- `docs/engine/intel/kb/nflverse/papers.md` — https://raw.githubusercontent.com/nflverse/nfldata/main/data/papers.csv
- `docs/engine/intel/kb/nflverse/players_2026.md` — https://github.com/nflverse/nflverse-data/releases/download/players/players_2026.csv
- `docs/engine/intel/kb/nflverse/schedule_2026.md` — https://github.com/nflverse/nflverse-data/releases/download/schedules/schedule_2026.csv
- `docs/engine/intel/kb/pfr/2026-games.md` — session-artifact
- `docs/engine/intel/kb/refs/officials.md` — https://raw.githubusercontent.com/nflverse/nfldata/main/data/officials.csv
- `docs/engine/intel/kb/scores24/countries.md` — https://scores24.live/rapi/countries?lang=en
- `docs/engine/intel/kb/scores24/meta.md` — https://scores24.live/rapi/meta?lang=en
- `docs/engine/intel/kb/scores24/sports.md` — https://scores24.live/rapi/predictions/sports?lang=en

## Rerun inputs

workflow: firecrawl-knowledge-base
source: 40+ NFL intelligence endpoints and files (see sources.json)
goal: reference
depth: quick (wave 1 curl, wave 2 variants + session artifacts)
output_dir: docs/engine/intel/kb/
