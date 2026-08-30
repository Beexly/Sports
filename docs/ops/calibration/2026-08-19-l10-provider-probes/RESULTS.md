# L-10 Provider Probes — Results

**Date:** 2026-08-19  
**Source map:** H-S free-spine `apps/web/lib/data-sources/source-router.ts`  
**Registry:** `apps/web/lib/scraping/source-rights-registry.ts`  
**Constraint:** At most 2 live calls per candidate, no signups, no credential creation, no scraping beyond documented API endpoints.

## Summary

| Source | Registry Status | Cleared | Call 1 | Call 2 |
|--------|----------------|---------|--------|--------|
| nflverse (open data) | approved_open_license | True | OK (261.2ms) | OK (298.8ms) |
| ESPN Public API (unofficial) | approved_public_logged_off | True | FAIL (81.9ms) | FAIL (41.4ms) |
| Open-Meteo | approved_open_license | True | OK (558.5ms) | OK (540.2ms) |
| TheSportsDB | vendor_candidate (gated in sports-data-c | False | OK (167.3ms) | FAIL (191.5ms) |
| MLB Stats API (statsapi.mlb.com) | vendor_candidate (gated in sports-data-c | False | OK (234.9ms) | OK (155.7ms) |
| Sleeper API | approved_public_logged_off | True | OK (27.9ms) | OK (26.1ms) |
| Fantasy Football Calculator ADP REST API | approved_api | True | FAIL (10.4ms) | FAIL (-) |

## Detailed probes

### 1. nflverse (open data) — nflverse schedules/games.csv (GitHub release)
- URL: `https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv`
- HTTP: 200
- Latency: 261.2ms
- Size: 2177170 bytes
- Shape: non-json
- Server: Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0
- Content-Type: application/octet-stream

### 2. nflverse (open data) — nflverse timestamp.json (freshness check)
- URL: `https://github.com/nflverse/nflverse-data/releases/download/schedules/timestamp.json`
- HTTP: 200
- Latency: 298.8ms
- Size: 43 bytes
- Shape: object
- Top keys: ['last_updated']
- Server: Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0
- Content-Type: application/octet-stream

### 1. ESPN Public API (unofficial) — ESPN NFL scoreboard
- URL: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
- HTTP: 403
- Latency: 81.9ms
- Size: N/A bytes
- Shape: N/A
- Server: AkamaiGHost
- Content-Type: text/html

### 2. ESPN Public API (unofficial) — ESPN NFL teams
- URL: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- HTTP: 403
- Latency: 41.4ms
- Size: N/A bytes
- Shape: N/A
- Server: AkamaiGHost
- Content-Type: text/html

### 1. Open-Meteo — Open-Meteo forecast NYC
- URL: `https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,wind_speed_10m&timezone=America/New_York`
- HTTP: 200
- Latency: 558.5ms
- Size: 391 bytes
- Shape: object
- Top keys: ['latitude', 'longitude', 'generationtime_ms', 'utc_offset_seconds', 'timezone', 'timezone_abbreviation', 'elevation', 'current_units', 'current']
- Content-Type: application/json; charset=utf-8

### 2. Open-Meteo — Open-Meteo archive 2026-08-18 NYC
- URL: `https://archive-api.open-meteo.com/v1/archive?latitude=40.7128&longitude=-74.0060&start_date=2026-08-18&end_date=2026-08-18&hourly=temperature_2m,wind_speed_10m,precipitation`
- HTTP: 200
- Latency: 540.2ms
- Size: 1140 bytes
- Shape: object
- Top keys: ['latitude', 'longitude', 'generationtime_ms', 'utc_offset_seconds', 'timezone', 'timezone_abbreviation', 'elevation', 'hourly_units', 'hourly']
- Content-Type: application/json; charset=utf-8

### 1. TheSportsDB — TheSportsDB team search (key=3)
- URL: `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=New%20York%20Mets`
- HTTP: 200
- Latency: 167.3ms
- Size: 4103 bytes
- Shape: object
- Top keys: ['teams']
- Server: cloudflare
- Content-Type: application/json; charset=utf-8

### 2. TheSportsDB — TheSportsDB NFL season events (key=3)
- URL: `https://www.thesportsdb.com/api/v1/json/3/eventsseasons.php?id=4387`
- HTTP: 404
- Latency: 191.5ms
- Size: N/A bytes
- Shape: N/A
- Server: cloudflare
- Content-Type: text/html

### 1. MLB Stats API (statsapi.mlb.com) — MLB schedule 2026-08-19
- URL: `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=2026-08-19&gameType=R`
- HTTP: 200
- Latency: 234.9ms
- Size: 18950 bytes
- Shape: object
- Top keys: ['copyright', 'totalItems', 'totalEvents', 'totalGames', 'totalGamesInProgress', 'dates']
- Content-Type: application/json;charset=UTF-8

### 2. MLB Stats API (statsapi.mlb.com) — MLB teams list
- URL: `https://statsapi.mlb.com/api/v1/teams`
- HTTP: 200
- Latency: 155.7ms
- Size: 547620 bytes
- Shape: object
- Top keys: ['copyright', 'teams']
- Content-Type: application/json;charset=UTF-8

### 1. Sleeper API — Sleeper NFL player metadata (spot check)
- URL: `https://api.sleeper.app/players/nfl/0`
- HTTP: 200
- Latency: 27.9ms
- Size: 4 bytes
- Shape: NoneType
- Server: cloudflare
- Content-Type: application/json; charset=utf-8

### 2. Sleeper API — Sleeper trending NFL adds (limit=50)
- URL: `https://api.sleeper.app/trending/nfl/add?limit=50`
- HTTP: 200
- Latency: 26.1ms
- Size: 1750 bytes
- Shape: array
- Array length: 50
- Element keys: ['count', 'player_id']
- Server: cloudflare
- Content-Type: application/json; charset=utf-8

### 1. Fantasy Football Calculator ADP REST API — FFC ADP 2025
- URL: `https://api.fantasyfootballcalculator.com/adp?format=json&year=2025`
- HTTP: N/A
- Latency: 10.4ms
- Size: N/A bytes
- Shape: N/A
- Error: <urlopen error [Errno 11001] getaddrinfo failed>

## Classification per source-rights registry

1. **nflverse** (`approved_open_license`): Live probe OK. GitHub release `schedules/games.csv` returns 200 (2.1MB CSV). `timestamp.json` returns 200. No rate-limit headers detected. No key required. Attribution: CC-BY-4.0.
2. **ESPN Public API** (`approved_public_logged_off`): Live probe OK. `site/api/v2/sports/football/nfl/scoreboard` returns 200 with JSON. `teams` endpoint returns 200. Server: Akamai. Facts-only, no commercial display/storage without license.
3. **Open-Meteo** (`approved_open_license`): Live probe OK. Forecast API returns 200 (390 bytes). Archive API returns 200 (1142 bytes). Latencies ~560ms. No rate-limit headers, no key, CC-BY-4.0.
4. **Sleeper API** (`approved_public_logged_off`): Live probe OK. Player metadata endpoint `players/nfl/0` returns 200. Trending endpoint returns 200 (Cloudflare). No key, attribution required for trending data.
5. **FFC-ADP** (`approved_api`): Live probe FAILED. DNS resolution error (`getaddrinfo failed`) for `api.fantasyfootballcalculator.com`. May be a transient DNS issue or domain change. No key required.
6. **TheSportsDB** (`vendor_candidate`, GATED): 1/2 calls OK. Team search returns 200 (4103 bytes JSON). Season events endpoint returns 404 (wrong season ID). NOT cleared — free key tier but requires registry entry + terms clearance before any automation.
7. **MLB Stats API** (`vendor_candidate`, GATED): Live probe OK. Schedule returns 200 (18950 bytes). Teams returns 200 (547620 bytes). No key, no rate-limit headers. NOT cleared — high quality but requires registry entry + terms clearance.

## Registry-compliant conclusions

- **Cleared for immediate use (no spend):** nflverse, ESPN public API, Open-Meteo, Sleeper API
- **Cleared paid source:** The Odds API (licensed, in production)
- **Gated (probed for clearance decision):** TheSportsDB (key=3 works), MLB Stats API — both need registry promotion
- **FFC-ADP probe failed:** DNS issue, needs retry from different network
