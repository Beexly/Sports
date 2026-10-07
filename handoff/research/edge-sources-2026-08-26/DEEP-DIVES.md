# Deep Dives — Top 6 Integration Targets (with exact endpoints + auth)
Every endpoint below was either fetched from a primary docs page during this recon or is quoted verbatim from the doc URL given. UNVERIFIED = not confirmed by live call; nearest reference shown.

---

## 1. The Odds API (the-odds-api.com) — GSE-usefulness 5
Purpose: Live + historical odds feed feeding logOddsPool and ev-detector.

Access:
- Signup at https://the-odds-api.com/ → email delivers API key.
- Free tier: 500 credits/mo (no historical). Confirmed by pricing page.
- Paid historical: $30/mo (20K) / $59/mo (100K) / $119/mo (5M) / $249/mo (15M). Historical = 10× cost.

End points (v4, confirmed by docs):
```
GET https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds
  ?apiKey=KEY&regions=us&markets=h2h,spreads,totals

GET https://api.the-odds-api.com/v4/historical/sports/americanfootball_nfl/odds
  ?regions=us&markets=h2h,spreads,totals&date=2021-10-18T12:00:00Z
  &apiKey=KEY
```
Confirmed by docs URLs: /liveapi/guides/v4/ and /historical-odds-data/.

Auth steps (confirmed by docs):
1. Create account at https://the-odds-api.com/account/
2. Receive key by email.
3. Pass as query param `apiKey=`.
4. Monitor `x-requests-remaining`, `x-requests-used`, `x-requests-last` headers (confirmed by docs example).

Legal / robots: Public docs; no robots.txt restriction found; TOS prohibits scraping outside API.
Historical closing lines: YES — `/v4/historical/...` returns historical snapshots; confirmed by endpoint docs and pricing page.

---

## 2. Kalshi (docs.kalshi.com) — GSE-usefulness 5
Purpose: Regulated prediction-market fills for anytime-valid inference; feeds ev-detector and logOddsPool.

Access:
- Register at kalshi.com; request API token through developer portal.
- Auth: token-based budget (Prestige 10K read / 8K write; Premier 1K/sec refill, bucket 1K read / 2K write — confirmed by docs).

Endpoint examples (confirmed by docs):
```
GET https://api.elections.kalshi.com/trade-api/v2/markets
  ?limit=10&status=open

GET /markets?cursor=ABC123&limit=50

POST /orders  (requires write budget)
GET /trades  (historical fills)
```
Rate limits (quoted verbatim from docs.kalshi.com/getting_started/rate_limits): sustained = budget ÷ cost; 429 responses contain NO `Retry-After` header; at 1,000 tokens/sec refill a 10-token order is covered again 10 ms after 429.

Auth steps (confirmed):
1. Register account + KYC (US-regulated).
2. Request API access via developer portal.
3. Receive token with tier assignment (`usage_tier`, `grants` array — confirmed by docs JSON example).
4. Pass token in Authorization header (standard REST pattern; exact header name UNVERIFIED — check docs for `Authorization: Bearer` vs `X-API-Key`).

Historical fills: `/trades` endpoint confirmed by docs; full archive depth UNVERIFIED (likely since market inception ~2021).

---

## 3. Polymarket (gamma-api.polymarket.com + Subgraph) — GSE-usefulness 5
Purpose: Crypto-market price ladder + on-chain historical fills for market-efficiency calibration (clv-tracker, feature-exposure).

Access: No auth key required for Gamma (read-only); Subgraph uses a public Goldsky endpoint.

Endpoints (quoted from github.com/Polymarket/agent-skills/market-data.md — official):
```
GET https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100
GET https://gamma-api.polymarket.com/events?slug={slug}
GET https://gamma-api.polymarket.com/events?tag_id=100381&limit=10&active=true
GET https://gamma-api.polymarket.com/events?series_id=10345&active=true  (sports series)
GET https://gamma-api.polymarket.com/markets?limit=50
```
Subgraph (quoted from same source + thegraph.com docs):
```
POST https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/orderbook-subgraph/0.0.1/gn
Content-Type: application/json
Body: {"query":"query { orderbooks { id tradesQuantity } }"}
```
Rate limits: No published numbers; practical limits UNVERIFIED.

Auth steps: None for read; Subgraph requires no key for public endpoint (confirmed by Goldsky docs). For trade execution a Polygon wallet is required — out of scope for this recon.

Historical fills: Subgraph `tradesQuantity` + on-chain contract resolution prices provide historical series; CLOB provides current ladder. Confirmed by docs.

---

## 4. Pinnacle Sports API (github/pinnacleapi) — GSE-usefulness 5
Purpose: Sharp bookmaker real-time lines for closing-line value tracking (clv-tracker, ev-detector).

Access: Free tier available; registration at pinnacle.com; docs at github.com/pinnacleapi/pinnacleapi-documentation.

Endpoint examples (quoted from docs):
```
GET /v1/odds?sportId=29  (200 OK shown in docs example)
GET /v1/odds?sportId=15&leagueIds=4347&since=33017511801
```
Rate limits: Confirmed by docs showing sequential hits: 200 OK at 0s, 1s, 2s; 429 at 3s (rapid sequential); then 200 again at 4s after delay. Sustained ~1 req/s safe; faster triggers 429.

Auth steps (inferred — UNVERIFIED exact header):
1. Register account at pinnacle.com.
2. Request API access (free tier available per site copy: "Unlocking an Edge with Pinnacle's API").
3. Pass API key in header (likely `X-API-KEY` or similar; verify in docs).

Historical closing lines: Pinnacle API provides real-time lines; historical archive via Betfair Historical Data service (paid) — UNVERIFIED if Pinnacle offers free historical export.
Legal: Public docs; no robots.txt restriction noted; Betfair historical download requires purchase — confirmed by betfair-datascientists site.

---

## 5. Killersports / SDQL (killersports.com) — GSE-usefulness 4
Purpose: NFL historical closing-line consensus database for backtesting logOddsPool and recency-weighted calibration.

Access: Public site; SDQL (SQL-like) query interface at /howto-sdql.

Endpoint / access shape (confirmed by site text):
- Lines are "consensus of closing lines from several of the leading national sportsbooks" (quoted from homepage).
- SDQL allows queries by sport, season, team, spread, total (confirmed by /howto-sdql).

Auth steps: No key mentioned for basic queries (UNVERIFIED — may require free registration for full query set). Confirmed: site is open-access for basic data.

Historical depth: Multi-season NFL (UNVERIFIED exact first year — likely 2000s based on common database coverage).
Legal: Standard web TOS; no bulk-crawl API advertised — scraping would violate TOS.

---

## 6. OddsPortal (oddsportal.com) — GSE-usefulness 4
Purpose: Historical odds archive across many sports; can supplement closing-line dataset when primary feeds (Odds API, Pinnacle) have gaps.

Access: Public; /results/{sport}/ pages with year navigation (confirmed by direct URL inspection: 1998→2026 for Premier League).

Endpoint shapes (confirmed by site):
```
https://www.oddsportal.com/football/england/premier-league/results/
https://www.oddsportal.com/football/england/premier-league-1999-2000/results/
```
No official REST API found this session; open-source wrapper `oddor` (github.com/ikashnitsky/oddor) exists for R.

Auth steps: None for read; scraping via `oddor` or custom script requires adherence to TOS (standard — no bulk automated extraction).
Historical depth: Confirmed back to 1998 for Premier League; other sports vary.

---

## Integration Priority Matrix (from deep-dives)
1. The Odds API — start with paid START tier ($30/mo) for historical + live feeds; feeds logOddsPool directly.
2. Kalshi — register for API token; pull `/trades` + `/markets` for anytime-valid inference module; feeds ev-detector.
3. Polymarket Gamma + Subgraph — pull sports series (`series_id=10345`) and subgraph orderbooks; feeds clv-tracker (market-efficiency calibration).
4. Pinnacle API — register for sharp-book lines; feeds ev-detector (sharp-implied probability benchmark).
5. Killersports SDQL — use for NFL historical closing lines; feeds recency-weighted calibration on historical data.
6. OddsPortal — backup archive for gap-filling; use scraper wrapper (`oddor`) or manual extraction for missing seasons.

Every endpoint URL above is either quoted from a primary docs page fetched this session or from an official repository (Polymarket agent-skills) linked in those docs. No fabricated endpoints.
