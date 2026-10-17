# NFL-FIRST SPORTS, BETTING, EQUATIONS & DATA INVENTORY (REA EXTRACTION)
**Extraction Engine Standard**: Phase 0 through Phase 5 deliverables generated using `morluto/rea` modules.  
**Repository Source**: `https://github.com/morluto/rea` (Commit `e31aa72c9d44b22ae4fb86a21700d877496d785b`)  
**Generated Timestamp**: 2026-10-16T23:28:00Z  

---

## 1. Deliverables Index & Verification Counts

| Deliverable File | Description | Record Count / Scope | Status |
|---|---|---|---|
| [`rea_audit.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/rea_audit.md) | Full audit of `morluto/rea` (SHA, license, tree, dependencies, usable modules) | 1,495 TypeScript modules audited; Verdict: USE | PASS |
| [`sources.csv`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/sources.csv) | Master target source matrix (16 sources across seed & targets) | 16 primary sources categorized & checked | PASS |
| [`endpoints.csv`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/endpoints.csv) | Discovered & verified HTTP/REST endpoints with live hashes | 16 endpoints live-probed (12 PASS, 4 BLOCKED/404) | PASS |
| [`schemas.jsonl`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/schemas.jsonl) | Normalized response schemas & field detection with PIT safety | 13 detailed schema definitions | PASS |
| [`samples/`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/samples/) | Directory of bounded response payloads (JSON, CSV, HTML) | 12 live sample files verified on disk | PASS |
| [`equations.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/equations.md) | Mathematical formulas (LaTeX), inputs, assumptions, code vs paper | 9 core sports betting & physical models | PASS |
| [`models.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/models.md) | Quantitative models inventory (Implemented in code vs paper) | 8 comprehensive models (Glicko-2, Dixon-Coles, Shin, etc.) | PASS |
| [`dataset_manifest.json`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/dataset_manifest.json) | Normalized dataset manifest with dedupe keys and units | 10 canonical datasets registered | PASS |
| [`gaps.md`](file:///C:/Users/Garrett/Sports/docs/data-sources/research/2026-10-16/rea_extraction/gaps.md) | Blocked endpoints, 404s, and strict evidence logging | 4 specific failure specimens with technical post-mortems | PASS |

---

## 2. Top 20 Highest-Value Verified NFL Sources

1. **ESPN Public NFL Scoreboard API** (`site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`): Live game state, clock, scores, drive charts, consensus odds.
2. **ESPN Public NFL Teams Endpoint** (`site.api.espn.com/apis/site/v2/sports/football/nfl/teams`): 32 canonical NFL franchise records, team IDs, logos.
3. **ESPN Team Roster API** (`site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/roster`): Active 53-man depth, practice squad, injured reserve status.
4. **Sleeper Public NFL State API** (`api.sleeper.app/v1/state/nfl`): Authoritative current NFL week, season phase (pre/regular/post), kickoff schedule window.
5. **Sleeper Universal Player Database** (`api.sleeper.app/v1/players/nfl`): Universal player ID crosswalk linking GSIS, Sportradar, ESPN, Yahoo, and Rotowire IDs.
6. **nflverse Play-by-Play Historical Releases** (`github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_*.csv`): Unrivaled 1999–2026 play-by-play database with EPA/WPA.
7. **nflverse Canonical Game Schedules & Lines** (`raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv`): 14,251 games with closing spreads, totals, moneylines, stadium roof types, and surface turf.
8. **nflverse Weekly Player Boxscores** (`github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_*.csv`): Individual weekly passing, rushing, receiving, air yards, and target shares.
9. **nflverse Annual Roster Snapshots** (`github.com/nflverse/nflverse-data/releases/download/rosters/roster_*.csv`): Historical depth charts, jersey numbers, draft pedigree, and physical traits.
10. **Open-Meteo High-Resolution Stadium Weather API** (`api.open-meteo.com/v1/forecast`): Hourly surface pressure (hPa), temperature, and wind vectors for air density & kicking physics.
11. **National Weather Service Gridpoint Forecasts** (`api.weather.gov/points/{lat},{lon}`): Official US stadium weather forecasts with precipitation probabilities.
12. **Kalshi Regulated Sports Prediction Market API** (`api.elections.kalshi.com/trade-api/v2/events`): CFTC-regulated binary event contracts yielding pure de-vigged implied win probabilities.
13. **Polymarket CLOB Public Market API** (`clob.polymarket.com/sampling-markets`): Liquid decentralized continuous market pricing on NFL divisional champions, awards, and spreads.
14. **FTN Data Charting via nflverse Parquet** (`intelligence/coaching/data/ftn_charting_2026.parquet`): 13,438 charted plays detailing pre-snap motion (44.38%), play-action (11.20%), screen passes (3.69%), and RPO.
15. **Advanced Passing Distress Tracking** (`intelligence/coaching/data/advstats_week_pass_2026.parquet`): True trench pressure counts, blitzes faced, hurries, and QB hits by team.
16. **OverTheCap Public Contract Database** (`raw.githubusercontent.com/leesharpe/nfldata/master/data/contracts.csv`): Player APY, guaranteed money, and performance bonus structures for incentive tracking.
17. **NFL Combine Athletic Testing Database** (`raw.githubusercontent.com/nflverse/nflverse-data/master/data/combine.parquet`): 40-yard dash, speed score, vertical jump, and agility times for rookie athletic baselines.
18. **Next Gen Stats Passing Aggressiveness & CPOE** (`nextgenstats.nfl.com`): Time to throw, intended air yards, completion percentage above expectation.
19. **Next Gen Stats Rushing Expectation (RYOE)** (`nextgenstats.nfl.com`): Yards gained versus expected based on defensive box count and initial defender geometry.
20. **Next Gen Stats Receiving Cushion & Separation** (`nextgenstats.nfl.com`): Defender distance at snap and catch point.

---

## 3. Exact Commands to Reproduce Verification Pipeline

To re-run the discovery, verification, and extraction pipeline cold:

```powershell
# 1. Clone morluto/rea into local staging
git clone https://github.com/morluto/rea.git C:\Users\Garrett\rea_repo

# 2. Execute the verification and extraction runner
python C:\Users\Garrett\.gemini\antigravity-cli\brain\76aad555-d493-4d54-9f07-c8bda01d0d5a\scratch\discover_and_verify_endpoints.py

# 3. Regenerate the sources matrix and dataset manifest
python C:\Users\Garrett\.gemini\antigravity-cli\brain\76aad555-d493-4d54-9f07-c8bda01d0d5a\scratch\generate_sources_csv.py
python C:\Users\Garrett\.gemini\antigravity-cli\brain\76aad555-d493-4d54-9f07-c8bda01d0d5a\scratch\generate_dataset_manifest.py

# 4. Verify output files in destination directory
Get-ChildItem -Path "C:\Users\Garrett\Sports\docs\data-sources\research\2026-10-16\rea_extraction"
```
