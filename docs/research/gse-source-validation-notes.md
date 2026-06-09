# GSE Source Validation Notes

## Validation Performed

- Read the attached R&D brief from both provided pasted-text attachments and confirmed they were identical.
- Verified C:\Users\Garrett\Sports is a clean git repo on safety/sports-wip-2026-06-04 before writing docs.
- Verified the OneDrive Galaxy path resolves to a broad home-level git root and was not used for edits.
- Audited existing docs/research contents before generation.
- Reviewed current repo source files for ingestion, prediction, readiness, source snapshots, entitlements, docs, rejected sources, and source-provider policy.
- Performed web/source research on nflverse, nflreadr, nflreadpy, nflverse-data, official NFL injuries, NFL Next Gen Stats, NWS API, The Odds API, Sleeper, CollegeFootballData, GDELT, YouTube API, Reddit API, Open-Meteo, SportsDataIO, API-Sports, FanDuel terms, Disney terms, StatsBomb open data, and fastRhockey.
- Collected three completed subagent seed outputs: source inventory, video-game analog signals, and build/risk seed list.

## Live API Calls Not Performed

- No sports provider API keys were used.
- No source was scraped behind a login.
- No sportsbook, ESPN, NFL, social, publisher, video, or paywalled endpoint was crawled.
- No database migrations or app runtime commands were executed.

## Known Unknowns

- The Odds API current free-tier NFL availability and quota must be checked before implementation because repo docs and current docs may differ.
- API-Sports, SportsGameOdds, SportsDataIO, and Sportradar terms/prices must be verified with current account/contract context.
- Reddit, YouTube, X/social, publisher, team-site, and NFL-page commercial use terms require owner/legal review before automation.
- Open-Meteo commercial use needs plan/terms confirmation before production use.

## Primary Sources Checked

- [The Odds API](https://api.theoddsapi.com/docs)
- [nflverse umbrella](https://nflverse.nflverse.com/)
- [nflreadpy](https://nflreadpy.nflverse.com/)
- [nflreadr reference datasets](https://nflreadr.nflverse.com/reference/)
- [nflfastR play-by-play](https://www.nflfastr.com/reference/index.html)
- [nflverse-data releases](https://github.com/nflverse/nflverse-data)
- [Official NFL injury reports](https://www.nfl.com/injuries/)
- [nflreadr injuries](https://rdrr.io/cran/nflreadr/man/load_injuries.html)
- [nflreadr depth charts](https://nflreadr.nflverse.com/reference/)
- [nflreadr rosters and players](https://nflreadr.nflverse.com/reference/)
- [nflreadr schedules](https://nflreadr.nflverse.com/reference/)
- [nflreadr participation](https://nflreadr.nflverse.com/reference/load_participation.html)
- [nflreadr snap counts](https://nflreadr.nflverse.com/reference/)
- [nflreadr officials](https://nflreadr.nflverse.com/reference/load_officials.html)
- [nflreadr combine](https://nflreadr.nflverse.com/reference/load_combine.html)
- [nflreadr draft picks](https://nflreadr.nflverse.com/reference/)
- [NFL Next Gen Stats public aggregates](https://nextgenstats.nfl.com/)
- [NFL Football Operations Next Gen Stats overview](https://operations.nfl.com/gameday/technology/nfl-next-gen-stats)
- [NFL Big Data Bowl public datasets](https://operations.nfl.com/programs-initiatives/innovation/big-data-bowl/)
- [CollegeFootballData](https://collegefootballdata.com/api-tiers)
- [National Weather Service API](https://www.weather.gov/documentation/services-web-api)
- [Open-Meteo](https://open-meteo.com/)
- [Wikidata SPARQL](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service)
- [OpenStreetMap Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Sleeper API](https://docs.sleeper.com/)
- [Yahoo Fantasy Sports API](https://sports.yahoo.com/developer/)
- [GDELT DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/amp/)
- [YouTube Data API v3](https://developers.google.com/youtube/v3/getting-started)
- [Reddit API](https://www.reddit.com/dev/api/)
- [Wikimedia Pageviews API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/documentation/getting-started.html)
- [SportsGameOdds](https://sportsgameodds.com/docs/basics)
- [SportsDataIO NFL](https://sportsdata.io/developers/api-documentation/nfl)
- [API-Sports NFL](https://api-sports.io/documentation/nfl/v1)
- [Sportradar NFL](https://developer.sportradar.com/football/reference/nfl-overview)
- [Pro Football Reference / Stathead](https://www.pro-football-reference.com/)
- [Official team sites and press releases](https://www.nfl.com/teams/)
- [Beat-writer and publisher RSS/APIs](https://news.google.com/)
- [DraftKings and FanDuel public pages](https://www.fanduel.com/terms)
- [ESPN public pages](https://disneytermsofuse.com/english/)
- [StatsBomb open data](https://github.com/statsbomb/open-data)
- [fastRhockey / SportsDataverse](https://fastrhockey.sportsdataverse.org/)

## Repo Files Audited

- package.json
- .env.example
- README.md
- docs/data-sources.md
- docs/data-source-options.md
- docs/rejected-data-sources.md
- docs/source-providers/commercial-crawling-approval-gate.md
- docs/source-providers/historical-trends-provider-policy.md
- packages/data-ingestion/src/config.ts
- packages/data-ingestion/src/odds-api-client.ts
- packages/data-ingestion/src/normalizer.ts
- packages/data-ingestion/src/context-enrichment.ts
- packages/ingestion-pipeline/src/process-sport.ts
- packages/ingestion-pipeline/src/source-snapshot.ts
- packages/prediction-engine/src/scoring.ts
- packages/prediction-engine/src/game-context.ts
- packages/prediction-engine/src/constants.ts
- packages/prediction-engine/src/signal-snapshot.ts
- packages/prediction-engine/src/readiness.ts
- packages/types/src/index.ts
- packages/db/prisma/schema.prisma
- apps/web/lib/entitlements.ts
- apps/web/lib/source-intelligence/index.ts
- apps/web/app/api/picks/route.ts
- apps/web/app/api/picks/[id]/audit/route.ts
- apps/web/app/api/performance/route.ts
- apps/web/app/picks/page.tsx
- apps/web/app/cockpit/sources/page.tsx
- apps/web/app/api/cron/refresh-odds/route.ts
- apps/web/app/api/admin/trigger-refresh/route.ts
- workers/data-refresh/src/index.ts
- packages/prediction-engine/src/evidence-readiness-matrix.ts
- docs/brain/source-acquisition-mesh.md
- docs/performance/radar-and-tracking-data-layer.md
- docs/models/local-model-lane.md
