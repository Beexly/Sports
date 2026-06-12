# NFL Source Rights Catalog — 2026-06-12

Status-grouped index of all 180 NFL data-source candidates surfaced by the owner,
rights-classified per the legal scraping posture in `CLAUDE.md`. Source of truth:
`apps/web/lib/scraping/nfl-source-catalog.ts` (catalog) and
`apps/web/lib/scraping/source-rights-registry.ts` (canonical registry entries).
Tested by `apps/web/__tests__/nfl-source-catalog.test.ts`.

Rules of the road:

- An `approved_*` status still requires `checkClearance()` before every extraction
  job, and every extracted record carries a `RightsSnapshot`.
- `permission_required` means NO automation until written consent exists. Manual
  human research of those sites remains allowed.
- An open-source scraper TOOL never clears its rights-gated TARGET; the target's
  status governs.

Summary: 180 sources — 45 approved_open_license, 10 approved_public_logged_off,
5 approved_api, 12 vendor_candidate, 108 permission_required. 8 already integrated.

## Integration priority order

Open-license nflverse release tags first (zero legal friction, CC-BY-SA 4.0 with
attribution + share-alike), mapped to the Players Lab / signal need each feeds:

| Priority | Source (nflverse tag) | Feeds |
|---|---|---|
| 1 | snap_counts | Players Lab snap % |
| 2 | injuries | Injury signal (not yet implemented) |
| 3 | officials | Officials signal |
| 4 | ftn_charting | Charting signals (routes, alignment, pressure) |
| 5 | players / players_components | Canonical player IDs/bios (join key for everything) |
| 6 | rosters / weekly_rosters | Roster validity + Players Lab membership |
| 7 | depth_charts | Depth-chart role signal |
| 8 | schedules | Schedule/results backbone |
| 9 | stats_player / player_stats / stats_team | Player + team stat surfaces |
| 10 | pbp / pbp_participation | EPA, pace, usage shares, red-zone splits |
| 11 | nextgen_stats | NGS aggregates via open mirror |
| 12 | pfr_advstats | PFR advanced facts via open mirror |
| 13 | contracts | Cap/contract context (OTC mirror) |
| 14 | trades / draft_picks / combine / teams / misc | Transactions, draft, combine, team metadata |
| 15 | espn_data / espnscrapeR-data | ESPN-derived QBR etc. via open mirror |

Then:

| Priority | Source | Why |
|---|---|---|
| 16 | ESPN public JSON API (`espn-public-api`) | Facts-only public endpoints (scoreboard/teams already integrated; leaders, team leaders, core events next). No commercial display until licensed; rate-limit aggressively. |
| 17 | Sleeper API (`sleeper-api`) | Documented free public read-only API (players/state/trending already partly integrated). Cache players endpoint daily; re-confirm ToS for commercial display. |

Everything below those is vendor licensing work (FantasyPros, RotoWire, FTN,
SumerSports, Opta) or written-permission outreach — not engineering work.

## Do NOT scrape directly — use the open mirror

These proprietary sites must not be scraped even though their facts are wanted.
The same facts arrive legally via the open nflverse mirrors:

| Gated source | Open mirror |
|---|---|
| pro-football-reference.com (all stat pages) | nflverse `pfr_advstats` release |
| nextgenstats.nfl.com | nflverse `nextgen_stats` release / `ngs-data` repo |
| www.nfl.com/stats (player + team) | nflverse `player_stats` / `stats_team` releases |
| overthecap.com | nflverse `contracts` release |
| espn.com/nfl web pages (stats, QBR, injuries) | ESPN public JSON API (facts) + nflverse `espnscrapeR-data` (QBR) + nflverse `injuries` |
| footballdb.com / statrankings.com | nflverse `pbp`, `snap_counts`, `ftn_charting` (derive usage/route metrics ourselves) |

## approved_open_license — open data/code (CC-BY-SA 4.0 / MIT / Apache); automatable with attribution (45)

| Source | URL | Integrated | Registry | Notes |
|---|---|---|---|---|
| nflverse-data releases | https://github.com/nflverse/nflverse-data/releases | YES | nflverse | Canonical open release index. CC-BY-SA 4.0; attribution + share-alike. |
| nflverse pbp | https://github.com/nflverse/nflverse-data/releases/tag/pbp | YES | nflverse | Play-by-play. Open release. |
| nflverse player_stats | https://github.com/nflverse/nflverse-data/releases/tag/player_stats | YES | nflverse | Weekly player stats. Open release. |
| nflverse stats_team | https://github.com/nflverse/nflverse-data/releases/tag/stats_team | no | nflverse | Team stats. Open release. |
| nflverse nextgen_stats | https://github.com/nflverse/nflverse-data/releases/tag/nextgen_stats | no | nflverse | NGS aggregates republished by nflverse under their open release; underlying NGS is NFL — use the nflverse mirror, attribute nflverse. |
| nflverse pfr_advstats | https://github.com/nflverse/nflverse-data/releases/tag/pfr_advstats | no | nflverse | PFR advanced stats mirrored by nflverse; access via nflverse open release, carry upstream PFR attribution. Do NOT scrape PFR directly (see pro-football-reference). |
| nflverse snap_counts | https://github.com/nflverse/nflverse-data/releases/tag/snap_counts | no | nflverse | Snap counts. Open release. Feeds Players Lab snap %. |
| nflverse pbp_participation | https://github.com/nflverse/nflverse-data/releases/tag/pbp_participation | no | nflverse | Participation/personnel. Open release. |
| nflverse weekly_rosters | https://github.com/nflverse/nflverse-data/releases/tag/weekly_rosters | no | nflverse | Weekly rosters. Open release. |
| nflverse depth_charts | https://github.com/nflverse/nflverse-data/releases/tag/depth_charts | no | nflverse | Depth charts. Open release. |
| nflverse injuries | https://github.com/nflverse/nflverse-data/releases/tag/injuries | no | nflverse | Injury reports. Open release. Feeds injury signal (currently not implemented). |
| nflverse officials | https://github.com/nflverse/nflverse-data/releases/tag/officials | no | nflverse | Game officials. Open release. Feeds officials signal. |
| nflverse draft_picks | https://github.com/nflverse/nflverse-data/releases/tag/draft_picks | no | nflverse | Draft picks. Open release. |
| nflverse combine | https://github.com/nflverse/nflverse-data/releases/tag/combine | no | nflverse | Combine results. Open release. |
| nflverse contracts | https://github.com/nflverse/nflverse-data/releases/tag/contracts | no | nflverse | Contracts mirrored from OverTheCap via nflverse open release; use the mirror, do NOT scrape OTC directly. |
| nflverse ftn_charting | https://github.com/nflverse/nflverse-data/releases/tag/ftn_charting | no | nflverse | FTN charting subset shared open via nflverse; attribute FTN. The commercial FTN site is vendor_candidate. |
| nflverse espn_data | https://github.com/nflverse/nflverse-data/releases/tag/espn_data | no | nflverse | ESPN-derived data mirrored by nflverse; use the mirror, attribute upstream. |
| nflfastR | https://github.com/nflverse/nflfastR | no | nflverse | R package, MIT. EPA/WP models. Methods + outputs usable with attribution. |
| nflreadpy | https://github.com/nflverse/nflreadpy | no | nflverse | Python loader, MIT. |
| nflreadr | https://github.com/nflverse/nflreadr | no | nflverse | R loader, MIT. |
| nflverse-pbp | https://github.com/nflverse/nflverse-pbp | no | nflverse | PBP data repo. Open. |
| nflverse-rosters | https://github.com/nflverse/nflverse-rosters | no | nflverse | Rosters data repo. Open. |
| ngs-data | https://github.com/nflverse/ngs-data | no | nflverse | NGS aggregates repo packaged by nflverse. Open mirror. |
| nfldata | https://github.com/nflverse/nfldata | no | nflverse | Lee Sharpe misc datasets (schedules, standings, draft). Open. |
| nfl_data_py | https://github.com/nflverse/nfl_data_py | no | nflverse | Python loader (legacy), MIT. Superseded by nflreadpy. |
| espnscrapeR-data | https://github.com/nflverse/espnscrapeR-data | no | nflverse | ESPN QBR mirror in nflverse org; use mirror, attribute ESPN upstream. |
| nflseedR | https://github.com/nflverse/nflseedR | no | nflverse | Playoff/seeding sim, MIT. |
| nfl4th | https://github.com/nflverse/nfl4th | no | nflverse | 4th-down model, MIT. |
| fastrmodels | https://github.com/nflverse/fastrmodels | no | nflverse | Pretrained models for nflfastR, MIT. |
| nflplotR | https://github.com/nflverse/nflplotR | no | nflverse | Plotting helpers (logos/wordmarks), MIT — note team logos are trademarks, do not republish marks. |
| nflverse (meta) | https://github.com/nflverse/nflverse | no | nflverse | Org meta-package. Open. |
| nflscrapR (archived) | https://github.com/maksimhorowitz/nflscrapR | no | — | Archived predecessor to nflfastR, open license. Historical reference only. |
| nflscrapR-data (archived) | https://github.com/ryurko/nflscrapR-data | no | — | Archived 2009-2019 data, open. Superseded by nflfastR pbp. |
| nflscrapR-models (archived) | https://github.com/ryurko/nflscrapR-models | no | — | Archived models, open. Historical. |
| Open Source Football | https://opensourcefootball.com/ | no | — | Community methods blog (MIT repo). Use methods/code; article prose is authored content — do not republish bodies. |
| nflverse trades | https://github.com/nflverse/nflverse-data/releases/tag/trades | no | nflverse | Trade transactions. Open nflverse release (CC-BY-SA 4.0). |
| nflverse teams | https://github.com/nflverse/nflverse-data/releases/tag/teams | no | nflverse | Team metadata/identifiers. Open nflverse release (CC-BY-SA 4.0). |
| nflverse schedules | https://github.com/nflverse/nflverse-data/releases/tag/schedules | no | nflverse | Schedules and game results. Open nflverse release (CC-BY-SA 4.0). |
| nflverse stats_player | https://github.com/nflverse/nflverse-data/releases/tag/stats_player | no | nflverse | Player stats (current-schema release). Open nflverse release (CC-BY-SA 4.0). |
| nflverse players | https://github.com/nflverse/nflverse-data/releases/tag/players | no | nflverse | Canonical player IDs/bios. Open nflverse release (CC-BY-SA 4.0). |
| nflverse players_components | https://github.com/nflverse/nflverse-data/releases/tag/players_components | no | nflverse | Player ID component tables. Open nflverse release (CC-BY-SA 4.0). |
| nflverse rosters | https://github.com/nflverse/nflverse-data/releases/tag/rosters | no | nflverse | Season rosters. Open nflverse release (CC-BY-SA 4.0). |
| nflverse misc | https://github.com/nflverse/nflverse-data/releases/tag/misc | no | nflverse | Miscellaneous datasets. Open nflverse release (CC-BY-SA 4.0). |
| nflfastR docs | https://www.nflfastr.com/ | no | nflverse | Docs site for the open package. |
| nfl4th.com | https://www.nfl4th.com/ | no | — | Site for the open nfl4th model. |

## approved_public_logged_off — public, no login, facts only; automatable with polite rate limits (10)

| Source | URL | Integrated | Registry | Notes |
|---|---|---|---|---|
| rbsdm.com stats | https://rbsdm.com/ | no | — | Ben Baldwin free public dashboard built on nflfastR (open) data; prefer regenerating from nflfastR directly. Facts only, no login. |
| rbsdm box scores | https://rbsdm.com/stats/box_scores/ | no | — | Free public box-score view over open data. Facts only. |
| NFL Savant | https://nflsavant.com/ | no | — | Publishes free public CSV downloads (pbp, weather) with no login. Facts only; attribute the source. |
| ESPN scoreboard API | https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard | YES | espn-public-api | Undocumented public JSON, no auth. Facts (scores/schedule). Already an ingestion fallback. Polite rate, facts only. |
| ESPN teams API | https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams | YES | espn-public-api | Public JSON team metadata. Facts only. |
| ESPN leaders API | https://site.web.api.espn.com/apis/site/v3/sports/football/nfl/leaders | no | espn-public-api | Public JSON stat leaders. Facts only. |
| ESPN team leaders API | https://site.web.api.espn.com/apis/site/v3/sports/football/nfl/teamleaders | no | espn-public-api | Public JSON team leaders. Facts only. |
| ESPN core events API | https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events | no | espn-public-api | Public JSON events feed. Facts only. |
| nntrn ESPN API gist | https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c | no | espn-public-api | Community documentation of ESPN's public JSON API; same facts-only public-API posture as our espn-public-api source. |
| pseudo-r Public-ESPN-API | https://github.com/pseudo-r/Public-ESPN-API | no | espn-public-api | Community documentation of ESPN's public JSON API; same facts-only public-API posture as our espn-public-api source. |

## approved_api — documented/licensed API; automatable per API terms (5)

| Source | URL | Integrated | Registry | Notes |
|---|---|---|---|---|
| Sleeper API docs | https://docs.sleeper.com/ | YES | sleeper-api | Documented free public read-only API, no auth for reads. Rate-limited (<1000/min). Already integrated. |
| Sleeper players | https://api.sleeper.app/v1/players/nfl | YES | sleeper-api | Public read endpoint. Cache per docs (call once/day). |
| Sleeper NFL state | https://api.sleeper.app/v1/state/nfl | YES | sleeper-api | Public read endpoint (week/season state). |
| Sleeper trending add | https://api.sleeper.app/v1/players/nfl/trending/add | no | sleeper-api | Public read endpoint (waiver trends). |
| Sleeper trending drop | https://api.sleeper.app/v1/players/nfl/trending/drop | no | sleeper-api | Public read endpoint (drop trends). |

## vendor_candidate — commercial provider; license/questionnaire before any ingestion (12)

| Source | URL | Integrated | Registry | Notes |
|---|---|---|---|---|
| SumerSports QB | https://sumersports.com/players/quarterback/ | no | — | Commercial analytics (Sumer) with proprietary models — candidate for a licensed feed. |
| SumerSports RB | https://sumersports.com/players/running-back/ | no | — | Commercial analytics — vendor candidate. |
| SumerSports WR | https://sumersports.com/players/wide-receiver/ | no | — | Commercial analytics — vendor candidate. |
| SumerSports TE | https://sumersports.com/players/tight-end/ | no | — | Commercial analytics — vendor candidate. |
| FantasyPros advanced QB | https://www.fantasypros.com/nfl/advanced-stats-qb.php | no | — | FantasyPros offers a commercial API/license; pursue that rather than scraping. |
| FantasyPros advanced WR | https://www.fantasypros.com/nfl/advanced-stats-wr.php | no | — | FantasyPros — licensed API candidate. |
| FantasyPros red zone WR | https://www.fantasypros.com/nfl/red-zone-stats/wr.php | no | — | FantasyPros — licensed API candidate. |
| FantasyPros snap counts | https://www.fantasypros.com/nfl/reports/snap-counts/ | no | — | FantasyPros — licensed API candidate. Snaps also via nflverse snap_counts (open). |
| FTN air yards | https://ftnfantasy.com/nfl/air-yards | no | — | FTN commercial; an open charting subset is in nflverse ftn_charting. License the rest. |
| FTN snaps | https://ftnfantasy.com/nfl/snaps | no | — | FTN commercial. Snaps also via nflverse snap_counts (open). |
| RotoWire player stats | https://www.rotowire.com/football/player-stats.php | no | — | RotoWire licenses commercial data feeds — pursue a license rather than scraping. |
| The Analyst (Opta) zone | https://theanalyst.com/articles/nfl-advanced-stats-zone | no | — | Opta / Stats Perform premium data — licensable enterprise feed. Article prose is authored content; do not republish bodies. |

## permission_required — NO automation without written consent (108)

| Source | URL | Integrated | Registry | Notes |
|---|---|---|---|---|
| Next Gen Stats | https://nextgenstats.nfl.com/ | no | — | NFL's proprietary tracking product. No automation without NFL license. Use nflverse nextgen_stats mirror for facts. |
| NGS passing | https://nextgenstats.nfl.com/stats/passing | no | — | Proprietary NFL. Mirror available via nflverse. |
| NGS rushing | https://nextgenstats.nfl.com/stats/rushing | no | — | Proprietary NFL. Mirror via nflverse. |
| NGS receiving | https://nextgenstats.nfl.com/stats/receiving | no | — | Proprietary NFL. Mirror via nflverse. |
| NGS defense | https://nextgenstats.nfl.com/stats/defense | no | — | Proprietary NFL. Mirror via nflverse. |
| NFL.com stats | https://www.nfl.com/stats/ | no | — | Official NFL content, proprietary. License required. |
| NFL.com player stats | https://www.nfl.com/stats/player-stats/ | no | — | Proprietary NFL. Use nflverse player_stats. |
| NFL.com team stats | https://www.nfl.com/stats/team-stats/ | no | — | Proprietary NFL. Use nflverse stats_team. |
| NFL Ops Big Data Bowl | https://operations.nfl.com/gameday/analytics/big-data-bowl/ | no | — | Info page; competition tracking data is NFL-owned, distributed via Kaggle under competition rules. |
| ESPN Analytics receivers | https://espnanalytics.com/receivers | no | — | ESPN proprietary analytics (open-score etc). License required; not the public API. |
| ESPN Analytics decision | https://www.espnanalytics.com/decision/ | no | — | ESPN proprietary analytics. License required. |
| ESPN.com NFL stats | https://www.espn.com/nfl/stats | no | — | ESPN web pages, proprietary. Use the public JSON API for facts instead of scraping HTML. |
| ESPN.com QBR | https://www.espn.com/nfl/qbr | no | — | QBR is ESPN proprietary. Mirror via nflverse espnscrapeR-data. |
| ESPN.com team stats | https://www.espn.com/nfl/team/stats | no | — | Proprietary web pages. Prefer public API. |
| ESPN.com injuries | https://www.espn.com/nfl/injuries | no | — | Proprietary web pages. Use nflverse injuries for facts. |
| Big Data Bowl 2026 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2026 | no | — | NFL-owned player-tracking data under Kaggle competition rules; commercial use needs NFL permission. |
| Big Data Bowl 2025 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2025 | no | — | Competition rules; NFL-owned tracking. Permission for commercial. |
| Big Data Bowl 2024 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2024 | no | — | Competition rules; NFL-owned tracking. |
| Big Data Bowl 2023 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2023 | no | — | Competition rules; NFL-owned tracking. |
| Big Data Bowl 2022 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2022 | no | — | Competition rules; NFL-owned tracking. |
| Big Data Bowl 2021 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2021 | no | — | Competition rules; NFL-owned tracking. |
| Big Data Bowl 2020 | https://www.kaggle.com/competitions/nfl-big-data-bowl-2020 | no | — | Competition rules; NFL-owned tracking. |
| NFL Punt Analytics | https://www.kaggle.com/competitions/NFL-Punt-Analytics-Competition | no | — | Competition rules; NFL-owned data. |
| NFL Impact Detection | https://www.kaggle.com/competitions/nfl-impact-detection | no | — | Competition rules; NFL-owned video/data. |
| NFL Ops BDB repo | https://github.com/nfl-football-ops/Big-Data-Bowl | no | — | NFL Football Ops repo; data subject to competition terms. |
| NFL Ops BDB data | https://github.com/nfl-football-ops/Big-Data-Bowl/tree/master/Data | no | — | NFL-owned tracking sample; competition terms. |
| ngs_highlights | https://github.com/asonty/ngs_highlights | no | — | Personal repo pulling NGS data; no clear OSI license + NGS-derived. Permission required before reuse. |
| StatsBomb amf-open-data | https://github.com/statsbomb/amf-open-data | no | — | StatsBomb open data is free for research/education with attribution; commercial use (this is a paid product) requires a written StatsBomb agreement. |
| StatsBomb amf-open-data data | https://github.com/statsbomb/amf-open-data/tree/main/data | no | — | Same StatsBomb non-commercial license; commercial use needs agreement. |
| MarcLinderGit/NFL_Stats | https://github.com/MarcLinderGit/NFL_Stats | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| blnkpagelabs/nflscraPy | https://github.com/blnkpagelabs/nflscraPy | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| ColeBallard/nfl-data-scraper | https://github.com/ColeBallard/nfl-data-scraper | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| ewelchman/scrape_pfr | https://github.com/ewelchman/scrape_pfr | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| Code-JL/NFL-Point-Kicker-Data-Scraper | https://github.com/Code-JL/NFL-Point-Kicker-Data-Scraper | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| zackthoutt/nfl-player-stats | https://github.com/zackthoutt/nfl-player-stats | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| hvpkod/NFL-Data | https://github.com/hvpkod/NFL-Data | no | — | Community data repo of mixed provenance/unclear license; permission/provenance review required before reuse. |
| opendoug/nfl-score-scraper | https://github.com/opendoug/nfl-score-scraper | no | — | Open-source scraper TOOL, but it extracts from a rights-gated target (e.g. PFR/ESPN); the TARGET's status governs — must not be used to launder a gated source's ToS. |
| Pro Football Reference | https://www.pro-football-reference.com/ | no | — | Sports Reference ToS prohibits automated scraping/bots. Data licensing via Sports Reference LLC. Use nflverse pfr_advstats mirror for facts. |
| PFR advanced stats | https://www.pro-football-reference.com/years/2025/advanced.htm | no | — | Same PFR ToS. Use nflverse pfr_advstats. |
| PFR advanced passing | https://www.pro-football-reference.com/years/2025/passing_advanced.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR advanced rushing | https://www.pro-football-reference.com/years/2025/rushing_advanced.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR advanced receiving | https://www.pro-football-reference.com/years/2025/receiving_advanced.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR advanced defense | https://www.pro-football-reference.com/years/2025/defense_advanced.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR red zone passing | https://www.pro-football-reference.com/years/2025/redzone-passing.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR red zone rushing | https://www.pro-football-reference.com/years/2025/redzone-rushing.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR red zone receiving | https://www.pro-football-reference.com/years/2025/redzone-receiving.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR opponent stats | https://www.pro-football-reference.com/years/2025/opp.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR splits | https://www.pro-football-reference.com/years/2025/splits.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR leaders | https://www.pro-football-reference.com/years/2025/leaders.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR passing | https://www.pro-football-reference.com/years/2025/passing.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR rushing | https://www.pro-football-reference.com/years/2025/rushing.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR receiving | https://www.pro-football-reference.com/years/2025/receiving.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR defense | https://www.pro-football-reference.com/years/2025/defense.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR kicking | https://www.pro-football-reference.com/years/2025/kicking.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| PFR returns | https://www.pro-football-reference.com/years/2025/returns.htm | no | — | Sports Reference ToS prohibits automated scraping; use nflverse pfr_advstats mirror for facts. |
| TeamRankings stats | https://www.teamrankings.com/nfl/stats/ | no | — | Commercial stats product; ToS restricts automated use. Has paid data offering. |
| TeamRankings YPP | https://www.teamrankings.com/nfl/stat/yards-per-play | no | — | Commercial; permission required. Derivable from nflverse pbp. |
| Sharp Football pace | https://www.sharpfootballanalysis.com/stats-nfl/nfl-team-pace-stats/ | no | — | Commercial analytics site. Pace derivable from nflverse pbp. |
| PlayerProfiler | https://www.playerprofiler.com/ | no | — | Proprietary advanced metrics; ToS restricts automation. Permission required. |
| OverTheCap | https://overthecap.com/ | no | — | Proprietary contract/cap data. Use nflverse contracts mirror; do not scrape OTC directly. |
| Spotrac NFL cap | https://www.spotrac.com/nfl/cap | no | — | Proprietary contract data; licensing available. Permission required. |
| Ourlads depth charts | https://www.ourlads.com/nfldepthcharts/ | no | — | Proprietary depth charts. Use nflverse depth_charts for facts. |
| RAS (ras.football) | https://ras.football/ | no | — | Kent Lee Platte's RAS metric — creator-owned. Ask permission; attribute creator. |
| MockDraftable | https://www.mockdraftable.com/ | no | — | Proprietary combine percentiles (largely inactive). Permission required. |
| NFLPenalties.com | https://www.nflpenalties.com/ | no | — | Free hobby site of penalty facts; ToS unstated — conservative permission_required pending review. Penalty facts also in nflverse pbp. |
| NFL Weather | https://nflweather.com/ | no | — | Proprietary aggregator; ToS restricts. Underlying weather is public via NWS (public domain) / licensed weather APIs — prefer those. |
| DraftScout | https://draftscout.com/ | no | — | Proprietary scouting database. Permission required. |
| Yahoo NFL stats | https://sports.yahoo.com/nfl/stats/ | no | — | Yahoo proprietary; ToS restricts scraping. |
| Yahoo team stats | https://sports.yahoo.com/nfl/stats/team/ | no | — | Yahoo proprietary. |
| Yahoo weekly stats | https://sports.yahoo.com/nfl/stats/weekly/ | no | — | Yahoo proprietary. |
| CBS Sports stats | https://www.cbssports.com/nfl/stats/ | no | — | CBS proprietary; ToS restricts scraping. |
| CBS Sports team stats | https://www.cbssports.com/nfl/stats/team/ | no | — | CBS proprietary. |
| FOX Sports stats | https://www.foxsports.com/nfl/stats | no | — | FOX proprietary; ToS restricts scraping. |
| FootballDB stats | https://www.footballdb.com/stats/index.html | no | — | Proprietary stats site; ToS restricts. Facts derivable from nflverse. |
| FootballDB team stats | https://www.footballdb.com/stats/teamstat.html | no | — | Proprietary. Use nflverse. |
| FootballDB players | https://www.footballdb.com/players/index.html | no | — | Proprietary. Use nflverse rosters. |
| FootballDB penalties | https://www.footballdb.com/statistics/penalties.html | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB player passing | https://www.footballdb.com/statistics/nfl/player-stats/passing | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB player rushing | https://www.footballdb.com/statistics/nfl/player-stats/rushing | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB player receiving | https://www.footballdb.com/statistics/nfl/player-stats/receiving | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB offense totals | https://www.footballdb.com/statistics/nfl/team-stats/offense-totals | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB defense totals | https://www.footballdb.com/statistics/nfl/team-stats/defense-totals | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB offense passing | https://www.footballdb.com/statistics/nfl/team-stats/offense-passing | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB offense rushing | https://www.footballdb.com/statistics/nfl/team-stats/offense-rushing | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB offense scoring | https://www.footballdb.com/statistics/nfl/team-stats/offense-scoring | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB weekly leaders | https://www.footballdb.com/statistics/weekly-leaders.html | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB player splits | https://www.footballdb.com/statistics/nfl/player-splits | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| FootballDB offense punting | https://www.footballdb.com/statistics/nfl/team-stats/offense-punting/2025/regular-season | no | — | Proprietary; ToS restricts automation; facts derivable from nflverse. |
| StatMuse NFL | https://www.statmuse.com/nfl | no | — | Proprietary NL stats search; ToS restricts automation. |
| Footballguys snap counts | https://www.footballguys.com/stats/snap-counts/teams | no | — | Subscription product; permission required. Use nflverse snap_counts. |
| Footballguys targets | https://www.footballguys.com/stats/targets/teams | no | — | Subscription product. Targets via nflverse pbp. |
| Footballguys red zone | https://www.footballguys.com/stats/redzone/teams | no | — | Subscription product. Red-zone via nflverse pbp. |
| Fantasy Alarm snap counts | https://www.fantasyalarm.com/nfl/snap-counts | no | — | Subscription product; permission required. Use nflverse snap_counts. |
| Lineups snap counts | https://www.lineups.com/nfl/snap-counts | no | — | Proprietary; ToS restricts. Use nflverse snap_counts. |
| StatRankings players | https://www.statrankings.com/nfl/advanced/players | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings usage | https://www.statrankings.com/nfl/advanced/players/usage | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings snap rate | https://www.statrankings.com/nfl/advanced/players/usage/snap-rate | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings opportunity share | https://www.statrankings.com/nfl/advanced/players/usage/opportunity-share | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings route participation | https://www.statrankings.com/nfl/advanced/players/usage/route-participation | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings first-read target share | https://www.statrankings.com/nfl/advanced/players/usage/first-read-target-share | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings targets per route run | https://www.statrankings.com/nfl/advanced/players/usage/targets-per-route-run | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings routes run | https://www.statrankings.com/nfl/advanced/players/usage/routes-run | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings total opportunities | https://www.statrankings.com/nfl/advanced/players/usage/total-opportunities | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings air yards percentage | https://www.statrankings.com/nfl/advanced/players/receiving/air-yards-percentage | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings air yards per route run | https://www.statrankings.com/nfl/advanced/players/receiving/air-yards-per-route-run | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings teams | https://www.statrankings.com/nfl/advanced/teams | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings teams EPA | https://www.statrankings.com/nfl/advanced/teams/epa/ | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
| StatRankings zone coverage rate | https://www.statrankings.com/nfl/advanced/teams/coverage/zone-coverage-rate | no | — | Proprietary commercial advanced-stats product; ToS restricts automation; usage/route metrics partly derivable from nflverse + ftn_charting. |
