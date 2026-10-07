# Scrape-probe round 2 — 2026-08-26
Worker: external-scrape. No git commit. Firecrawl used: 0 credits (<10 cap).

## 1. sportsoddshistory.com / covers.com — NFL point-spread archive
- URL pattern (season summary): `https://www.covers.com/sportsoddshistory/nfl-game-season/?y=<YEAR>`
- Status: 200. Large HTML (~773KB) with embedded tables (ATS / straight-up / over-under aggregates by season since 1952).
- Parseability: HTML table present but page is dense JavaScript/analytics; raw table extraction possible but not clean. No simple CSV/API endpoint found.
- Sample season fetched: 2024 (200 OK, saved to covers_2024.html — not saved in workspace; fetched inline).
- Verdict: USABLE-NOW with HTML scraping; bulk season pulls require table parsing, not REST.

## 2. Kalshi public/demo API (no auth)
- Endpoint tested: `https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLGAME`
- Response: 200, JSON. `{"cursor":"","markets":[...]}` — 100 market objects returned.
- Sport markets DO exist (binary NFL game markets, e.g. NY Giants vs LA Rams 2026-09-21).
- `/trades` endpoint (`.../markets/KXNFL/trades`): 404; likely requires market-level path + auth.
- Verdict: USABLE-NOW for listing NFL-related binary markets; trades/history needs auth and correct path.

## 3. Killersports.com SDQL
- URL tried: `https://killersports.com/nfl/query` — 200 but shows "Query Limit Exceeded" (tier users limited to 5 queries/day).
- `https://killersports.com/sdql/nbad?date=...` returns 200 with content; actual query interface blocked by rate limit/login wall.
- Verdict: BLOCKED / NEEDS-AUTH (free tier capped; no open anonymous SDQL result stream observed).

## 4. Free historical weather APIs
- Iowa State Mesonet ASOS: endpoint `https://mesonet.agron.iastate.edu/request/download.phtml` (free, no auth). Returns HTML form; CSV download requires parameter POST/get. Confirmed reachable.
- open-meteo historical: `https://archive-api.open-meteo.com/v1/archive?latitude=...&longitude=...&start_date=...&end_date=...&hourly=...`
- Status: 200, returns JSON with hourly temperature/precipitation arrays.
- Verdict: USABLE-NOW (open-meteo simplest for stadium-coordinate hourly joins; IEM ASOS best for airport station exact data).

## Credit usage
Firecrawl v1 scrapes used: 0. Total < 10.

## Verdict summary
- sportsoddshistory: USABLE-NOW (HTML scraping required)
- Kalshi public API: USABLE-NOW (listing only; trades/auth blocked)
- Killersports SDQL: BLOCKED / NEEDS-AUTH
- Historical weather (open-meteo / IEM ASOS): USABLE-NOW
