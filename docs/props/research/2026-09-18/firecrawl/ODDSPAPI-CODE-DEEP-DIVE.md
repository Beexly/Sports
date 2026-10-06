# OddsPapi + BetOnline — Public Code Deep-Dive

**Date:** 2026-09-18, accessed ~21:12–21:40 UTC
**Method:** public docs pages, sitemap.xml, robots.txt, public GitHub recon repos, public NFL sport page (contains a working, vendor-published integration example). No logins, no keys, no paywall bypass, no authenticated calls. Key-gated endpoints documented from their public request shapes only — no live calls made.

Label key: **CONFIRMED** = seen on an official public page or in public code. **INFERRED** = strongly implied but not stated verbatim. **UNVERIFIED** = could not be confirmed this session.

---

## 1. Complete /v4 endpoint inventory (CONFIRMED)

Sourced from the official sitemap (`https://oddspapi.io/sitemap-main.xml`, accessed 2026-09-18) and the individual public docs pages (all under `https://oddspapi.io/en/docs/...`). Every endpoint below has its own public docs page; request/response shapes below are quoted from those pages.

| Method | Route | Docs page | Cooldown (rate limit) |
|---|---|---|---|
| GET | `/v4/sports` | `/en/docs/get-sports` | 1000ms |
| GET | `/v4/tournaments` | `/en/docs/get-tournaments` | 1000ms (INFERRED from sibling listing endpoints) |
| GET | `/v4/bookmakers` | `/en/docs/get-bookmakers` | 1000ms |
| GET | `/v4/fixtures` | `/en/docs/get-fixtures` | 2000ms |
| GET | `/v4/odds` | `/en/docs/get-odds` | 500ms |
| GET | `/v4/odds-by-tournaments` | docs overview `/en/docs` | UNVERIFIED (documented in quickstart example, no dedicated cooldown published) |
| GET | `/v4/historical-odds` | `/en/docs/get-historical-odds` | 5000ms (304 responses also count) |
| GET | `/v4/scores` | `/en/docs/get-scores` | UNVERIFIED (page exists, body not fetched this session) |
| GET | `/v4/settlements` | `/en/docs/get-settlements` | UNVERIFIED (page exists, body not fetched this session) |
| GET | `/v4/markets` | `/en/docs/get-markets` | 1000ms |
| GET | `/v4/languages` | `/en/docs/get-languages` | UNVERIFIED |
| GET | `/v4/participants` | `/en/docs/get-participants` | UNVERIFIED |
| GET | `/v4/account` | `/en/docs/get-account` | UNVERIFIED |
| POST | `/v4/account` | `/en/docs/post-account` | UNVERIFIED |
| WS | `wss://api.oddspapi.io/v4/ws?apiKey=YOUR_API_KEY` | `/en/docs/websocket-api` | n/a — B2B/contact-only (CONFIRMED: "only available by contacting us or via the b2b plan") |

**Host:** `https://api.oddspapi.io` — CONFIRMED (docs overview: "All requests use the host https://api.oddspapi.io").

**Auth (CONFIRMED):** `apiKey` as a **query parameter on every request**, never a header. The vendor's own NFL integration example states verbatim: *"The key is the query parameter apiKey, never a header."* (`https://oddspapi.io/sports/american-football/nfl`, accessed 2026-09-18).

**Legacy surface (CONFIRMED, do not conflate):** `https://oddspapi.io/api/v1` exists; its `/sports` returns 59 sports (per public repo `bangletsgetit/nba-ncaa-betting-models`, file `ODDSPAPI_INTEGRATION.md`). The v1 shape is different from /v4. **Dead domain:** `api.oddspapi.com` has dead DNS (CONFIRMED by public commit `pejofv93/prediction-intelligence` d29533d: "api.oddspapi.com DNS dead [Errno -2]. Changed _ODDSPAPI_BASE to api.oddspapi.io"). Use `api.oddspapi.io` only.

**No public OpenAPI/Swagger (CONFIRMED attempt):** `https://api.oddspapi.io/swagger.json` and `https://api.oddspapi.io/openapi.json` both failed to fetch on 2026-09-18 (browser fetch failure, not retried). No swagger/OpenAPI JSON advertised on the public site. The docs are hand-written pages, not spec-generated. **JS bundles:** oddspapi.io pages are server-rendered (Next.js-style, "page regenerated from the API"); the fetch-text pipeline does not expose `<script>`/bundle URLs, so no public bundle URLs could be extracted this session. Route strings below come from the docs text itself instead (equivalent for endpoint inventory purposes).

---

## 2. Auth and error handling (CONFIRMED from vendor-published code)

The vendor's own NFL page ships a complete Python client (quoted verbatim, `https://oddspapi.io/sports/american-football/nfl`):

```python
BASE_URL = "https://api.oddspapi.io/v4"

def get(path, params):
    """The key is the query parameter apiKey, never a header.
    Read the status code first: a 429 body is valid JSON too."""
    query = dict(params, apiKey=API_KEY)
    for attempt in range(3):
        response = requests.get(f"{BASE_URL}/{path}", params=query, timeout=180)
        if response.status_code == 429:
            time.sleep(5 * (attempt + 1))
            continue
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
    raise RuntimeError("rate limited on /" + path)
```

Behavioral contract derived from this plus independent recon:

- **404 → treat as None** (fixture/market absent). CONFIRMED (vendor code).
- **429 body is valid JSON** and carries `error.retryMs` (CONFIRMED: vendor docstring + prior deep-dive). Backoff with sleep; vendor example retries 3× with 5s×attempt.
- **Per-endpoint cooldowns are hard:** odds 500ms, fixtures 2000ms, historical-odds 5000ms (a 304 still counts), bookmakers/sports/markets 1000ms. CONFIRMED (docs "Notes" sections).
- **Retention miss is NOT_FOUND, not UNAUTHORIZED** (CONFIRMED by independent recon `mxvsatv321/cleatiq`, `docs/oddspapi_recon.md`, 2026-05-02): fixtures older than the retention window return `NOT_FOUND`. This is a data-absence signal, not a subscription gate — important for pipeline error classification.

---

## 3. Response schemas (CONFIRMED, quoted from docs)

### 3a. `/v4/fixtures` — request
```
GET /v4/fixtures?sportId=10&from=2026-04-12&to=2026-04-17&statusId=0&hasOdds=true&bookmakers=pinnacle
```
Params: `tournamentId` (number), `sportId` (number), `participantId` (number), `from`/`to` (ISO 8601), `language` (a2, default `en`), `statusId` (0=not started, 1=live, 2=finished, 3=cancelled), `hasOdds` (boolean), `bookmakers` (comma-separated slugs, used to evaluate hasOdds).

**Range rules (CONFIRMED):** `sportId` alone is not enough — must accompany `tournamentId`, `participantId`, or `from`+`to` under 10 days apart. `from`+`to` alone must be under 48 hours apart. **`tournamentId` lifts the 10-day cap** — the vendor's NFL example pulls a full month (`from=2026-09-18&to=2026-10-18`) on `tournamentId=31` in one call and notes it "cuts the payload about 20x" vs a sport-wide call.

### 3b. `/v4/fixtures` — response object (every field documented)
`fixtureId` (string, e.g. `id1000001761301153`), `participant1Id`, `participant2Id`, `sportId`, `tournamentId`, `seasonId`, `statusId`, `hasOdds`, `startTime`, `trueStartTime`, `trueEndTime`, `updatedAt`, `statusName` ("Pre-Game"/"In-Play"/"Ended"), `participant1Name/ShortName/Abbr`, `participant2Name/ShortName/Abbr`, `sportName`, `tournamentSlug`, `categorySlug`, `categoryName`, `tournamentName`, and **`externalProviders`** — the cross-vendor ID map (see §6).

**Trap documented by vendor (CONFIRMED):** `hasOdds` is a flag, not a depth signal, **and it is false on every finished fixture**. "Boards open on their own clock, so the fixtures nearest kick-off carry the prices, and a fixture already in play often has the result market suspended. Read the ones still ahead of us, soonest first."

### 3c. `/v4/odds` — request/response
```
GET /v4/odds?fixtureId=id1000003969653792&bookmakers=pinnacle&language=en&verbosity=3
```
Params: `fixtureId` (required), `bookmakers` (optional CSV), `oddsFormat` (`fractional|decimal|american`), `language`, `verbosity` (number — higher = more detail).

Nesting: `bookmakerOdds.<slug>` → `bookmakerIsActive`, `bookmakerFixtureId`, `fixturePath` (deep link to the book's site), `suspended`, `markets.<marketId>` → `bookmakerMarketId`, `marketActive`, `outcomes.<outcomeId>` → `players.<playerId|0>` → `active`, `betslip`, `bookmakerOutcomeId`, `bookmakerChangedAt`, `changedAt`, **`limit`** (max stake — Pinnacle's confidence signal), `playerName` (null except player props), `price`, `priceAmerican`, `priceFractional`, `mainLine`, `exchangeMeta`.

**Price formats (CONFIRMED):** all three of `price` (decimal), `priceAmerican`, `priceFractional` are **always returned regardless of the `oddsFormat` param**. **Players key:** `"0"` on match markets; on player props it is keyed by real player id — "never hardcode '0' outside this case" (vendor NFL page).

### 3d. `/v4/historical-odds` — request/response
```
GET /v4/historical-odds?fixtureId=id1000000758265379
GET /v4/historical-odds?fixtureId=id1000000758265379&bookmakers=pinnacle
```
Params: `fixtureId` (required), `bookmakers` (CSV, **max 3** — CONFIRMED), `id`, `playerId`, `outcomeId`, `active` (optional filters). Request header `If-None-Match` for conditional requests.

Response: same nesting as `/v4/odds`, except `players.<id>` is an **array of snapshot objects**: `id`, `createdAt` (ISO 8601, ms precision), `price`, `limit`, `active`, `exchangeMeta`. **Close is derived, not flagged** — there is no `is_closing` field (CONFIRMED by `alexandrosh8/sharp-ev-picks` recon): close = last `active` snapshot with `createdAt < kickoff`. **Pinnacle prices in-play**, so a pre-KO cutoff against fixture `startTime` is mandatory (sharp-ev-picks F2).

**Conditional requests (CONFIRMED):** finished/cancelled fixtures emit `ETag` + `Cache-Control: private, max-age=259200` (3 days); re-request with `If-None-Match` → `304 Not Modified`, empty body, reuse cached payload. ETag is tied to the exact query (changes with filters). Live/upcoming fixtures never emit ETag (history still growing). Cooldown 5000ms applies even to 304s.

**Retention conflict (CONFIRMED both sides, unresolved):** official docs (2026-09-18): *"All historical odds data since January 2026 is available."* Independent empirical probe (`cleatiq`, 2026-05-02): **hard ~3-month retention** — 0–91 days full (T-5min anchors present), 91–110 days partial (pre-KO window incomplete), >118 days `NOT_FOUND`. The two claims contradict; do not flatten — resolve with a live key probe.

### 3e. `/v4/markets` — response (market-id registry)
```
GET /v4/markets?language=en
```
Each entry: `marketId`, `marketLength`, `marketName`, `playerProp` (boolean), `sportId`, `handicap`, `period`, `marketType`, `outcomes: [{outcomeId, outcomeName}]`. Example: market `101` = "Full Time Result", 1x2, outcomes 101/102/103 = 1/X/2; market `104` = "Both Teams To Score"; market `106` = "Over Under Full Time" (handicap 0.5).

**Ladder rule (CONFIRMED, vendor NFL page):** "The same bet ships under more than one market id on several sports, so resolve the result market from /v4/markets by name and read every id that maps to it. Reading one id drops part of the board." A family with many market ids is a ladder (one id per line rung); key props on (player, handicap).

### 3f. `/v4/bookmakers` — response
Array of `{bookmakerName, slug, liveOdds, cloneOf}`. `slug` is the value to pass as the `bookmaker(s)` param. `liveOdds` may be `null`. `cloneOf` names the book this one clones — but the vendor's NFL page warns identical price tuples must be **grouped empirically before the second count**, because "distinct slugs publish the same price and `cloneOf` does not track that."

### 3g. `/v4/sports` and `/v4/tournaments`
`/v4/sports?language=en` → `[{sportId, slug, sportName}]` (e.g. 10=soccer, 11=basketball). `/v4/tournaments?sportId=10` → `[{tournamentId, tournamentSlug, tournamentName, categorySlug, categoryName, futureFixtures, upcomingFixtures, liveFixtures}]` (e.g. 17=premier-league/England, 8=laliga/Spain).

### 3h. WebSocket
`wss://api.oddspapi.io/v4/ws?apiKey=YOUR_API_KEY`, one-way server→client, **B2B/contact-only**. Messages always include `fixtureId`; only changed values transmitted except complete `players` objects; one bookmaker per message; `updatedAt` changes on any top-level update. Includes a `scores.periods` shape (`participant1Score`, `participant2Score`, `updatedAt` per period).

---

## 4. NFL-specific public surface (CONFIRMED, vendor NFL page)

`https://oddspapi.io/sports/american-football/nfl` (measured live 2026-09-18 04:14 UTC, page regenerates from the API):

- `sportId = 14`, `tournamentId = 31` (vendor: "Confirm it against `/v4/tournaments?sportId=14` before you hardcode it").
- 255 fixtures scheduled; 63 inside next 30 days (pulled in 10-day windows on tournamentId).
- 237 bookmakers quoted one fixture → **79 independent prices** after grouping identical tuples (Falcons v Panthers, 3 days out).
- **100 market families** on sportId 14; sampled table: Regular Time Result (1), Winner incl. OT (1), Total incl. OT (201), OU 1st/2nd Half (120), OU 2nd Half incl. OT (120), OU Q1 (80), OU Q4 (80), OU Q4 incl. OT (80), OU Q2 (80), OU Q3 (80), Handicap incl. OT (281).
- Vendor's worked example uses `MAIN_MARKET_IDS = ["141", "143"]` for the NFL result market (CONFIRMED as the vendor's own choice; cross-check against `/v4/markets` at integration time).
- **21 prop families** with full price/active/book tables (per prior deep-dive of the same page).
- Free tier reads the same endpoints as paid.

---

## 5. Cross-vendor ID map — `externalProviders` (CONFIRMED, highest join value for GSE)

Every fixture/odds object carries this map (null when a provider lacks the fixture):

`betradarId`, `mollybetId`, `opticoddsId`, `lsportsId`, `txoddsId`, `sofascoreId`, `betgeniusId`, `flashscoreId`, `pinnacleId`, `oddinId`.

This is the cheapest canonical join in the whole recon corpus: one OddsPapi fixture resolves to Betradar, Mollybet, OpticOdds, SofaScore, BetGenius, Flashscore, and native Pinnacle IDs without any fuzzy matching. **GSE action:** persist this map at fixture ingest; it collapses the entity-resolution problem for every downstream feed that keys on any of these providers.

---

## 6. GitHub recon — endpoint usage patterns in public code

### 6a. `mxvsatv321/cleatiq` — `docs/oddspapi_recon.md` (2026-05-02; full read 2026-09-18)
Public recon report, ~28 of 250 monthly requests burned. Endpoints used: `/v4/sports`, `/v4/tournaments?sportId=10`, `/v4/bookmakers?sportId=10` (367 for soccer), `/v4/fixtures?tournamentId=X&from=ISO&to=ISO`, `/v4/historical-odds?fixtureId=X&bookmakers=slug1,slug2`, `/v4/account`. Soccer tournament IDs empirically resolved: EPL 17, LaLiga 8, Bundesliga 35, Serie A 23, Ligue 1 34, UCL 7. Snapshot density: **~6,000 snapshots/fixture**, 30–90s cadence in the final 30 min pre-KO, **21 snapshots in the T-7..T-3min window**, T-5min Pinnacle anchor reliably present. Every 2024-25 fixture returned `hasOdds: false` with full fixture catalogs present — fixture catalog ≠ odds availability. Verdict in-repo: do not subscribe for 2024-25 backfill (retention, not price, is the blocker); good for forward-looking Pinnacle T-5min collection.

### 6b. `alexandrosh8/sharp-ev-picks` — `docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md` (2026-07-04)
Repo already contains a working GET-only client (`app/ingestion/oddspapi.py`) for `GET /v4/historical-odds?fixtureId=…&bookmakers=…&apiKey=…` with `price_history_open_close()` reducing to (open, close), key hygiene (query-string key never logged), tenacity retry, optional `ODDSPAPI_KEY`. NBA adapter exists (`scripts/value_backtest.py`, `--source oddspapi-nba`): Pinnacle open = anchor, Pinnacle close = CLV ref. Budget math: **N=50–60 fixtures ≈ 70 req/month** inside 250/mo. Open questions at the time (all still open): true free quota, free-tier pre-KO granularity, free-tier league coverage, OddsPapi capture lag vs Pinnacle real-time.

### 6c. `pejofv93/prediction-intelligence` — commit `d29533d` (2026-04-27)
`_fetch_oddspapi_league` uses **`/v4/odds` with `sportId=10`, `tournamentId`, `from`/`to` date range**; maintains an `_ODDSPAPI_TOURNAMENT_IDS` map of 19 leagues so requests filter by tournament instead of returning all football; non-200 responses cached to prevent retry storms.

### 6d. `bangletsgetit/nba-ncaa-betting-models` — `ODDSPAPI_INTEGRATION.md`
Found the legacy surface `https://oddspapi.io/api/v1`; `/sports` returns 59 sports without a key. Protected endpoints need a key. Rate-limit note in-repo: 200 req/month (conflicts with the 250 figure — flagged, see prior deep-dive).

### 6e. `andrewkorot/sports-odds-discrepancy-alert-scanner`
`SportsOddsConnector` retrieves OddsPapi soccer fixtures, bookmaker coverage, and current fixture odds; Kalshi/Polymarket cross-checked against OddsPapi sportsbook implied probabilities. Read-only pattern.

### 6f. `Danymcflyy/OddsTracker`
Next.js + Supabase dashboard with OddsPapi sync scripts (open/close). README references a `GETTING_STARTED_V4.md`. Not deep-read this session.

---

## 7. Sitemap / robots (CONFIRMED)

- `https://oddspapi.io/robots.txt`: `User-agent: * / Allow: /`, sitemap at `https://oddspapi.io/sitemap.xml`. (Accessed 2026-09-18.)
- `https://oddspapi.io/sitemap-main.xml`: locale pages (us/en/de/es/fr/it/pt/ru/zh/tr), `/pricing`, `/coverage`, `/coverage/latency`, `/docs` + 15 per-endpoint docs pages, `/about`, `/faq`, `/contact`, `/career`, `/affiliates`, `/legal/terms`, `/legal/privacy`, and per-sport SEO pages (`/sports`, `/sports/american-football`, `/sports/american-football/nfl`, `/ncaaf`, `/baseball`, `/mlb`, `/basketball`, `/nba`, `/wnba`, `/esports`, `/cs2`, `/lol`, `/football` + 9 soccer leagues, `/ice-hockey`, `/nhl`, `/mma`, `/tennis`). Lastmod 2026-06-17 (static) / 2026-09-18 (sport pages, regenerated).
- No swagger/OpenAPI JSON found or advertised (fetch attempts failed, §1).

---

## 8. BetOnline (`betonline.ag` / `api.betonline.ag`) — public frontend only

- `https://www.betonline.ag/robots.txt` (CONFIRMED, accessed 2026-09-18): `User-agent: *`, disallows `/systeminfo`, `/healthcheck`, `/login`, `/join`, `/myaccount`. No sitemap advertised. The disallowed `/systeminfo` and `/healthcheck` paths confirm internal ops endpoints exist but are explicitly off-limits — not touched.
- `https://www.betonline.ag/` renders as a JS-only shell (20 lines of marketing text via fetch-text; the pipeline does not expose `<script>`/bundle URLs), so **no public JS bundle URLs and no public JSON endpoint strings could be extracted this session**. UNVERIFIED for public odds/scoreboard JSON endpoints.
- `https://api.betonline.ag` **failed to fetch** via the page-text tool on 2026-09-18 (not retried). UNVERIFIED whether it serves a public API surface.
- No public API documentation for BetOnline found via web search (2026-09-18). Third-party profile `api-evangelist/sportsbook-api` (updated ~5 days ago) lists BetOnline only as one of the books aggregated by a separate Sportsbook API product — not a BetOnline public API.
- **Recommendation (INFERRED):** the JS-bundle reverse-engineering Garrett wants for BetOnline needs a real browser session (or Firecrawl under its own licensing, per his instruction) — a generic subagent with fetch-text tooling cannot reach the bundle layer. Do not attempt `api.betonline.ag` probing beyond public GETs; the login/join/account paths are disallowed and off-limits.

---

## 9. Engineering rules for Sports (GSE)

1. Base `https://api.oddspapi.io/v4`; `apiKey` query param, never header; never log the query string (sharp-ev-picks pattern: pin httpx/httpcore to WARNING).
2. Classify errors: 404/→`NOT_FOUND` = data absent (retention), never retry as auth failure; 429 = valid JSON with `error.retryMs`, backoff and retry.
3. Respect per-endpoint cooldowns in a request scheduler (500/1000/2000/5000ms); 304s count against the historical-odds cooldown.
4. Fixture discovery: always via `tournamentId` (lifts the 10-day cap, ~20x smaller payload). Cache `/v4/tournaments`, `/v4/markets`, `/v4/bookmakers` aggressively (1000ms cooldown, slow-changing).
5. Market resolution: resolve market ids by name from `/v4/markets` per sport; never hardcode one market id (ladders). For NFL the vendor's own example uses ids `141`/`143` — verify at integration time.
6. Props: `players` keyed by player id (not `"0"`); key prop markets on (player, handicap).
7. Close semantics: close = last `active` snapshot with `createdAt < startTime` (pre-KO cutoff mandatory; Pinnacle prices in-play; no `is_closing` flag exists).
8. Persist `externalProviders` on every fixture — the Betradar/Mollybet/OpticOdds/SofaScore/Pinnacle join map.
9. Persist Pinnacle `limit` per snapshot — max-stake is a line-confidence signal no other free source carries.
10. Group identical price tuples empirically before counting "independent" books; `cloneOf` does not track all duplicates.
11. `hasOdds=false` on finished fixtures is expected — do not treat as missing data.
12. ETag/`If-None-Match` on finished fixtures to avoid re-transfer (3-day `max-age`).
13. Retention is the binding constraint, not quota: probe the true window with a live key before designing any backfill (docs say Jan 2026; independent probe says ~3 months).
14. Budget: N=50–60 fixture/month Pinnacle-only cross-check ≈ 70 requests — fits the 250/mo free tier with headroom (sharp-ev-picks math).

---

## 10. Open questions (live-key probes, operator-side)

1. True free-tier quota (250 vs 200 cited in different public repos).
2. True historical retention window (Jan 2026 vs ~3 months).
3. Free-tier pre-KO snapshot granularity for NFL specifically (soccer is 30–90s; NFL unmeasured).
4. Whether `/v4/scores`, `/v4/settlements`, `/v4/participants`, `/v4/languages`, `/v4/account` carry NFL-usable fields (docs pages exist, bodies not fetched).
5. BetOnline's public frontend JSON endpoints — needs a real browser/Firecrawl session.
6. `verbosity` param levels on `/v4/odds` — undocumented scale.
7. The `suspended` field semantics per bookmaker on `/v4/odds` (fixture-level vs market-level interplay).

*Sources: all URLs above, accessed 2026-09-18 ~21:12–21:40 UTC. Public only; nothing fabricated, no credentials used, no access controls touched.*
