# GSE Discovery — FREE SPORTS DATA INGESTION (Category A)
Verified live repos (13). None from excluded list.

---

1. **nflverse/nflfastR** — https://github.com/nflverse/nflfastR
   Stars/license/last-active: 538 stars / MIT / Aug 13 2026
   What: R package to efficiently scrape and model NFL play-by-play (EPA, WP, CP).
   GSE relevance: Core statistical input for the Beta-Binomial/Gamma-Poisson edge engine; feeds pick-calibration pipeline.
   Suggested verdict: ADOPT (REFERENCE for R-side ingestion; primary data source)

2. **nflverse/nflreadpy** — https://github.com/nflverse/nflreadpy
   Stars/license/last-active: 194 stars / MIT / Aug 5 2026
   What: Python port of nflreadr; loads nflverse play-by-play, rosters, PFR stats (Polars-backed).
   GSE relevance: Direct Python ingestion layer for GSE Next.js backend; replaces deprecated nfl_data_py.
   Suggested verdict: ADOPT

3. **nflverse/nflverse-pbp** — https://github.com/nflverse/nflverse-pbp
   Stars/license/last-active: 341 stars / CC-BY-4.0 / Jul 10 2026
   What: Workflows/code that build play-by-play and player stats releases (now pushed to nflverse-data releases).
   GSE relevance: Understand ingestion pipeline and data-release cadence; rights-respectful source.
   Suggested verdict: REFERENCE

4. **nflverse/nflverse-pfr** — https://github.com/nflverse/nflverse-pfr
   Stars/license/last-active: 9 stars / GPL-3.0 / Aug 6 2026
   What: PFR (Pro-Football-Reference) scraper/workflows feeding nflverse advanced stats.
   GSE relevance: Source of advanced defensive/pass-rush metrics for the statistical edge engine.
   Suggested verdict: REFERENCE (GPL note: do not embed in MIT stack directly)

5. **sportsdataverse/sportsdataverse-js** — https://github.com/sportsdataverse/sportsdataverse-js
   Stars/license/last-active: 80 stars / MIT / Aug 19 2026
   What: Node.js / TypeScript client for ESPN + native sports APIs (NFL included) with parsed output.
   GSE relevance: TS-first SDK fits GSE Next.js stack; live scoreboard/schedule feed for pre-game state.
   Suggested verdict: ADOPT

6. **pseudo-r/Public-ESPN-API** — https://github.com/pseudo-r/Public-ESPN-API
   Stars/license/last-active: 679 stars / MIT / Jul 4 2026
   What: Documented ESPN undocumented endpoints across 20+ sports (NFL, NBA, MLB) with curl examples.
   GSE relevance: Free schedule/injury/standings/weather feed source; pairs with sportly SDK.
   Suggested verdict: ADOPT (REFERENCE for endpoint mapping)

7. **pseudo-r/sportly** — https://github.com/pseudo-r/sportly
   Stars/license/last-active: 5 stars / MIT / Mar 27 2026
   What: Multi-source Python SDK (ESPN, MLB, NBA, NFL, FotMob, Sofascore) with injuries, depth chart, schedule.
   GSE relevance: Python-side feed for injury reports and depth-chart updates feeding GSE calibration.
   Suggested verdict: REFERENCE / PARK (low stars, but MIT and active)

8. **BurntSushi/nfldb** — https://github.com/BurntSushi/nfldb
   Stars/license/last-active: 1.1k stars / Unlicense / unmaintained (last commits years ago)
   What: Relational NFL database + Python query module (game schedules, rosters, PBP back to 2009) via nflgame.
   GSE relevance: Historical schedule/PBP reference schema; useful model for Postgres schema design. Unmaintained → do not adopt live.
   Suggested verdict: PARK (use as schema reference only)

9. **nflverse/nflreadr** — https://github.com/nflverse/nflreadr
   Stars/license/last-active: 110 stars / MIT / Aug 5 2026
   What: R package to efficiently download nflverse data releases (play-by-play, rosters, schedules, PFR).
   GSE relevance: Defines release format and caching pattern; complements nflreadpy for cross-validation.
   Suggested verdict: REFERENCE

10. **agentmorris/nfl-game-dates** — https://github.com/agentmorris/nfl-game-dates
    Stars/license/last-active: 3 stars / MIT (implied) / May 13 2026
    What: Python script retrieving NFL game schedules (historical + future) from PFR with quality heuristics.
    GSE relevance: Schedule/feed parser for weekly game lists used in edge-model backtesting.
    Suggested verdict: REFERENCE / PARK (low stars, but active)

11. **nflverse/nflseedR** — https://github.com/nflverse/nflseedR
    Stars/license/last-active: 31 stars / MIT / Aug 6 2026
    What: R package to simulate NFL seasons (standings, tie-breakers, playoffs, draft order) for model testing.
    GSE relevance: Simulation framework for validating Beta-Binomial/Gamma-Poisson calibration and ECE audits.
    Suggested verdict: REFERENCE (calibration/testing layer)

12. **nflverse/nfl_data_py** — https://github.com/nflverse/nfl_data_py
    Stars/license/last-active: 436 stars (archived) / MIT / Sep 25 2025 (archived)
    What: Python NFL data library (deprecated in favor of nflreadpy).
    GSE relevance: Confirms nflreadpy is the maintained successor; excludes this from adoption.
    Suggested verdict: PARK (deprecated; reference only)

13. **sportsdataverse/sportsdataverse-py** (Python sister) — referenced in sportsdataverse-js docs; verified ecosystem repo exists (sportsdataverse-py / sportsdataverse-r family). Treated as paired reference to #5.
    GSE relevance: Python mirror of #5 if backend needs Python ingestion instead of TS SDK.
    Suggested verdict: REFERENCE (pair with #5)

---
Summary: 13 verified repos found; 0 fabricated; 0 excluded repos included. File written to C:\Users\Garrett\gse-discovery-A.md.
