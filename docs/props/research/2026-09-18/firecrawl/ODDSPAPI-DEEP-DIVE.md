# OddsPapi (oddspapi.io) — Deep-Dive Research Report

**Path:** `docs/research/2026-09-18-props-reverse-engineering/firecrawl/ODDSPAPI-DEEP-DIVE.md`
**Author:** Motif subagent (public-source investigation)
**Date of research:** 2026-09-18 (all access times UTC; fetches performed after ~21:06 UTC unless noted)
**Method:** public search + text fetching only. No API key used, no live API calls made, no paywall/login bypassed, no access controls circumvented.

**Confidence legend (applied per finding):**
- `CONFIRMED` — stated on an official OddsPapi surface (site, docs, official blog) or independently verified by ≥2 unrelated third parties.
- `INFERRED` — strong logical conclusion from confirmed facts, but not stated outright.
- `UNVERIFIED` — single-source claim, third-party/community claim, or plausible-but-not-stated.

---

## 0. Executive summary (read this first)

OddsPapi is a sports-odds aggregation API (base URL `https://api.oddspapi.io/v4`, key as `apiKey` query param) run by a company called **55 Tech**. Its distinguishing features vs. Garrett's existing **The Odds API 20K plan ($30/mo, 20,000 credits)** are:

1. **Per-request flat billing** (1 call = 1 request, no markets×regions multiplier), free tier **250 requests/month** with *all* bookmakers including Pinnacle and the **free/unmetered historical-odds endpoint** with full timestamped line-movement snapshots.
2. **Bookmaker breadth**: 300–350+ books, incl. Pinnacle, Singbet, SBOBet, Betfair Exchange, crypto books — far beyond The Odds API's ~40 US soft books.
3. **NFL is a first-class covered product**: tournamentId `31` on sportId `14`, 255 scheduled fixtures, 237 bookmakers quoting a single fixture (79 *independent* after dedupe), **21 NFL player-prop families** with 100 market families on sportId 14, documented ladder structure (one market ID per line rung).

**Hard caveats that matter for GSE:**
- **Historical retention is a rolling window, not a permanent archive.** Official docs say "all historical odds data since January 2026 is available" (~8–9 months), but an independent May 2026 probe measured only ~90 days. Discrepancy must be resolved live before any backfill engineering.
- **Terms forbid reselling/repackaging/redistributing the data as a standalone product** (`CONFIRMED` at https://oddspapi.io/en/legal/terms). Internal analytics is fine; any redistribution or public display needs a legal read.
- **No sharp books on the NFL prop board.** Pinnacle, Bet365, BetMGM quote NFL game lines only; props come from US retail (FanDuel, DraftKings, Caesars, ESPNBet) + European softs + Kalshi (110 props, unusual for a prediction market).
- **Props open ~10 days before kickoff, game lines ~22+ days earlier.** A prop scanner must be scheduled against kickoff, not the calendar.
- **WebSocket is paid/B2B only** — not on the free REST tier.
- Every competitive claim on OddsPapi's own blog (vs The Odds API: 60s delays, 10× historical cost, etc.) is **vendor marketing** — treat as `UNVERIFIED` until independently tested.

**Recommended GSE role: complement, not replacement.** Keep The Odds API as the primary live US/NFL feed (already paid, already wired). Use OddsPapi free tier for: (a) historical line movement + CLV reconstruction, (b) NFL prop-market discovery and cross-book prop comparison, (c) Pinnacle limit data, (d) bookmaker breadth for disagreement checks. **Do not** move production off The Odds API until NFL live stability, latency, retention, and licensing are verified with a real key.

---

## 1. Vendor identity

- `CONFIRMED` (provider's own comparison blog, accessed 2026-09-18): OddsPapi is developed by **55 Tech** — https://oddspapi.io/blog/the-odds-api-alternative-comparison/ : *"OddsPapi is developed by [55 Tech](55-tech.com)"*.
- `CONFIRMED` (same source): **not the same company as The Odds API (the-odds-api.com)** — the post explicitly disambiguates them.
- `INFERRED`: 55 Tech maintains a public GitHub presence. A repo `lakeside763/55-tech` (accessed via search 2026-09-18) builds on `https://api.oddspapi.io` — a TypeScript arbitrage tool. Treat the repo as third-party, not confirmed-official.
- `CONFIRMED`: vendor runs an official Medium account (`@oddspapi`) publishing integration tutorials — e.g. "How to Pull Live Sports Odds in Python (Free API, 2026 Guide)" — https://medium.com/@oddspapi/how-to-pull-live-sports-odds-in-python-free-api-2026-guide-24ecf72be811 (accessed 2026-09-18).
- `CONFIRMED`: official contact is `support@oddspapi.io` (docs overview, quota page, terms page, all accessed 2026-09-18).

---

## 2. Product & coverage claims (official)

Source: official homepage https://oddspapi.io (accessed 2026-09-18).

- `CONFIRMED`: Real-time, pre-match, live, and historical odds; REST JSON + WebSocket.
- `CONFIRMED`: **300+ bookmakers** (homepage). Note time-varying provider claims: newer official blogs say **350+** (e.g. free-odds-api-350-bookmakers, 2026-06-05), one GitHub summary says "350+ bookmakers" from the NFL props FAQ, another official context mentions **360 slugs**. Treat exact count as a time-varying marketing figure, not a contract.
- `CONFIRMED`: **60+ sports** (homepage); a migration code sample says **"Returns all 69 supported sports"** from `/sports`; the pricing blog says **69 sports, 9,600+ leagues**. Range: 60–69 sports.
- `CONFIRMED`: 12,000+ yearly competitions (homepage).
- `CONFIRMED`: Futures, player props, totals, Asian handicaps; normalized IDs for sports/tournaments/markets/outcomes.
- `CONFIRMED`: claimed bookmaker set includes Pinnacle, Bet365, DraftKings, FanDuel, BetMGM, Unibet, Bwin, SBOBet (homepage); plus Singbet, Betfair Exchange, 1xBet, Stake, BC.Game, Kalshi, Novig, ESPNBet, theScore, Fanatics, Caesars (blog posts).
- `CONFIRMED`: auth is the `apiKey` **query parameter**, never a header. Base host `https://api.oddspapi.io`, current version path **`/v4`**.

---

## 3. Pricing, free tier, and quota model

### 3.1 Free tier
- `CONFIRMED` (provider's own posts, accessed 2026-09-18):
  - **250 requests/month**, free, no credit card — https://oddspapi.io/blog/the-odds-api-alternative-comparison/ , https://oddspapi.io/blog/odds-api-pricing-2026-comparison/ , https://oddspapi.io/blog/the-odds-api-free-tier-limits/
  - All 350+ bookmakers included on free tier, including Pinnacle/Singbet; historical odds included at every tier with no multiplier.
- `UNVERIFIED`/conflicting: one third-party setup file (`bangletsgetit/nba-ncaa-betting-models` ODDSPAPI_SETUP.md) says 200 requests/month. **250 is the stronger current claim** (appears on three official pages); verify live via `/account` before hard-coding.
- `CONFIRMED`: "The free tier reads the same endpoints as the paid one" — https://oddspapi.io/sports/american-football/nfl (accessed 2026-09-18).
- Paid tiers: **Custom/B2C and Custom/B2B, flat per-request pricing** — https://oddspapi.io/blog/odds-api-pricing-2026-comparison/ . No public per-request dollar figure on the visible surface (`INFERRED` from the JS-rendered pricing calculator page at https://oddspapi.io/en/pricing — calculator rendered as an empty JS shell in text fetch; numbers not readable without JS execution).

### 3.2 Billable endpoints and quota rules
Source: https://oddspapi.io/en/docs/requests-and-quota (accessed 2026-09-18). `CONFIRMED` unless noted:

**Billable (1 request per call, regardless of response size or filters):**
`/v4/players`, `/v4/settlements`, `/v4/fixtures`, `/v4/fixture`, `/v4/odds-by-tournaments`, `/v4/languages`, `/v4/sports`, `/v4/bookmakers`, `/v4/markets`, `/v4/tournaments`, `/v4/participants`, `/v4/scores`, `/v4/odds`.

**Special quota behavior:**
- `/v4/historical-odds` **does not increment request usage** (unmetered).
- `/v4/account` is unmetered and remains available after quota exhaustion; returns `request_limit` and `request_count`.
- Errors processed by a billable endpoint (incl. 4xx/5xx) count as 1 request.
- Invalid-key and already-exhausted requests rejected *before* endpoint processing do **not** count.
- **Critical nuance:** after the plan request limit is reached, subsequent calls to billable **or free** endpoints are blocked with 429, except `/account`. "Free" = unmetered, not "usable after exhaustion."

### 3.3 Rate limits / cooldowns (per-endpoint, official docs)
- `CONFIRMED` (each endpoint's doc page, accessed 2026-09-18):
  - `/v4/odds`: **500ms**
  - `/v4/fixtures`: **2000ms**
  - `/v4/markets`: **1000ms**
  - `/v4/settlements`: **2000ms**
  - `/v4/historical-odds`: **5000ms** (a 304 response still counts)
- `CONFIRMED` (official NFL props blog code): a **429 body is valid JSON** with `error.retryMs`; honor it (`time.sleep(r.json()["error"]["retryMs"]/1000 + 0.3)`). The provider's sample code also sleeps 5s×attempt on 429.
- The Sept 2026 Bet365 historical tutorial used ~4.6s between historical calls — consistent with the 5000ms cooldown.

---

## 4. Endpoint inventory (official direct API, `/v4`)

Source for all schemas: official per-endpoint doc pages at https://oddspapi.io/en/docs/* (all accessed 2026-09-18). Doc-page inventory (also enumerable from the sitemap https://oddspapi.io/sitemap-main.xml):

| Doc page | Endpoint |
|---|---|
| `/en/docs/websocket-api` | `wss://api.oddspapi.io/v4/ws?apiKey=...` |
| `/en/docs/get-historical-odds` | `GET /v4/historical-odds` |
| `/en/docs/get-account`, `/en/docs/post-account` | `GET/POST /v4/account` |
| `/en/docs/get-sports` | `GET /v4/sports` |
| `/en/docs/get-bookmakers` | `GET /v4/bookmakers` |
| `/en/docs/get-fixtures` | `GET /v4/fixtures` |
| `/en/docs/get-odds` | `GET /v4/odds` |
| `/en/docs/get-scores` | `GET /v4/scores` |
| `/en/docs/get-settlements` | `GET /v4/settlements` |
| `/en/docs/get-tournaments` | `GET /v4/tournaments` |
| `/en/docs/get-markets` | `GET /v4/markets` |
| `/en/docs/get-languages` | `GET /v4/languages` |
| `/en/docs/get-participants` | `GET /v4/participants` |
| `/en/docs/get-fixture` *(implied by quota page; doc page not in sitemap)* | `GET /v4/fixture` |
| `/en/docs/get-odds-by-tournaments` *(implied by quota page)* | `GET /v4/odds-by-tournaments` |
| `/en/docs/get-players` *(implied by quota page)* | `GET /v4/players` |

### 4.1 `/v4/fixtures` — fixture discovery
`CONFIRMED` params (https://oddspapi.io/en/docs/get-fixtures):
- `tournamentId` (number), `sportId` (number), `participantId` (number)
- `from`, `to` (ISO 8601; `YYYY-MM-DD` accepted in practice)
- `language` (a2 code; default `en`)
- `statusId` (0: not yet started, 1: live, 2: finished, 3: cancelled)
- `hasOdds` (boolean) — can be evaluated against a `bookmakers` comma list filter
- **Parameter conditions:** `tournamentId` can be the *only* param; `sportId` must be accompanied by `tournamentId`, `participantId`, or `from`+`to` ≤ **10 days apart**; `from`+`to` *without* any ID must be ≤ **48 hours apart**.
- Fixture object fields: `fixtureId` (string, e.g. `id1000001761301153`), `participant1Id/2Id`, `sportId`, `tournamentId`, `seasonId`, `statusId`, `hasOdds`, `startTime`, `trueStartTime`, `trueEndTime`, `updatedAt`, `statusName` (Pre-Game/In-Play/Ended), `participant1Name/ShortName/Abbr` (+ participant2), `sportName`, `tournamentSlug`, `categorySlug`, `categoryName`, `tournamentName`, and **`externalProviders`**: `betradarId`, `mollybetId`, `opticoddsId`, `lsportsId`, `txoddsId`, `sofascoreId`, `betgeniusId`, `flashscoreId`, `pinnacleId`, `oddinId`. ← GSE-relevant: free cross-vendor ID crosswalk.
- `CONFIRMED` provider note: `hasOdds` is a *flag*, not a depth signal, and is `false` on every finished fixture; `tournamentId` filter lifts the 10-day cap and cuts payload ~20× (sports coverage pages, https://oddspapi.io/sports/american-football/nfl).
- `CONFIRMED` (NFL props blog): date window runs midnight-to-midnight **UTC**; a same-day query returns only fixtures kicking off exactly at 00:00Z; set `to` to the day after the last wanted day.

### 4.2 `/v4/odds` — current odds board
`CONFIRMED` params (https://oddspapi.io/en/docs/get-odds):
- `fixtureId`* (string, required), `bookmakers` (optional comma-separated slugs; omitted = all books), `oddsFormat` (fractional|decimal|american), `language`, `verbosity` (number — higher = more detail).
- Response: fixture object (same shape as §4.1) + top-level **`bookmakerOdds`** keyed by bookmaker slug. Per book: `bookmakerIsActive`, `bookmakerFixtureId`, `fixturePath` (deep link to the fixture on the book's site), `suspended` (bool — entire book suspended), `markets` keyed by market ID string.
- Per market: `bookmakerMarketId`, `marketActive`, `outcomes` keyed by outcome ID string.
- Per outcome → `players` keyed by player ID string (**`"0"` = game line**; prop markets keyed by player ID, with `playerName` as `"Last, First"`).
- Per price object: `price` (decimal), `priceAmerican` (string), `priceFractional` (string), `active`, `betslip`, `bookmakerOutcomeId`, `bookmakerChangedAt` (the book's own timestamp, may be null) vs `changedAt` (OddsPapi ingestion timestamp), `limit` (max stake; Pinnacle populates, Bet365 often null), `playerName`, `mainLine` (bool), `exchangeMeta`.
- `CONFIRMED`: all three price formats are always returned regardless of `oddsFormat`.
- Dict keys that look numeric (`"101"`, `"0"`) are **strings** (official Medium tutorial: `odds["bookmakerOdds"]["pinnacle"]["markets"]["101"]["outcomes"]["101"]["players"]["0"]["price"]`).
- `CONFIRMED` (docs overview example): `/v4/odds-by-tournaments?bookmaker=pinnacle&tournamentIds=17,8` — bulk variant takes `bookmaker` (singular) + `tournamentIds` (plural, comma list). One request = one call regardless of size.

### 4.3 `/v4/historical-odds` — free line-movement history
`CONFIRMED` params (https://oddspapi.io/en/docs/get-historical-odds):
- `fixtureId`* (string), `bookmakers`* (comma-separated, **max 3** — 4+ returns `TOO_MANY_BOOKMAKERS`), optional `id` (filter to one entry), `playerId`, `outcomeId`, `active`.
- Response top-level key is **`bookmakers`** (vs `bookmakerOdds` on live `/odds`).
- Shape: `bookmakers[slug].markets[marketId].outcomes[outcomeId].players[playerId]` → **list of snapshots**: `id`, `createdAt`, `price`, `limit`, `active`, `exchangeMeta` (may include back/lay).
- `CONFIRMED`: conditional requests — send `If-None-Match` with a previous ETag; finished/cancelled fixtures return `ETag` + `Cache-Control: private, max-age=259200` (3 days); match → `304 Not Modified`, empty body. Live/upcoming fixtures emit no ETag.
- `CONFIRMED`: **"All historical odds data since January 2026 is available."** (doc page) — see §8 for the retention discrepancy.
- Behavior notes (official Bet365 historical guide, https://oddspapi.io/blog/bet365-historical-odds-guide-the-data-apis-and-strategy/, accessed 2026-09-18): invalid slug → `INVALID_PARAMETER`; plan-gated slug → `RESTRICTED_ACCESS`; a successful response may silently omit a requested book that had no line; snapshots may continue **in-play** — derive the close as the last `active` snapshot with `createdAt < startTime`; repeated identical snapshots are heartbeats, not moves — dedupe consecutive identical prices before measuring movement; one Bet365 fixture example returned 266 markets / 230,515 snapshots / 29,569 deduped moves.

### 4.4 `/v4/settlements` — grading
`CONFIRMED` (https://oddspapi.io/en/docs/get-settlements): params `fixtureId`*, optional `playerId`, `outcomeId`. Per market/outcome/player: `result` ∈ **`WIN | LOSE | HALFWIN | HALFLOSS | PUSH | CANCELLED | UNDECIDED`**. ← GSE-relevant: includes Asian-handicap half outcomes natively.

### 4.5 `/v4/markets` — market catalog
`CONFIRMED` (https://oddspapi.io/en/docs/get-markets): returns a **global** lookup array (the `sportId` param does nothing — official NFL props blog). Each entry: `marketId`, `marketLength`, `marketName`, `playerProp` (bool — filter for prop families), `sportId`, `handicap`, `period`, `marketType`, `outcomes[]` (`outcomeId`, `outcomeName`). Cooldown 1000ms. Provider guidance: never hardcode IDs — resolve by name, collect **every** ID mapping to the name (same bet ships under multiple IDs).

### 4.6 Remaining billable endpoints (params not yet individually documented here)
`/v4/sports`, `/v4/tournaments` (`sportId` filter; returns `tournamentId`, `tournamentSlug`, `tournamentName`, `categorySlug/Name`, `futureFixtures`, `upcomingFixtures`, `liveFixtures`), `/v4/bookmakers`, `/v4/participants`, `/v4/players`, `/v4/languages`, `/v4/scores`, `/v4/fixture`, `/v4/account` (returns `request_limit`, `request_count`; unmetered). Full parameter lists: fetch each doc page before coding. `/v4/scores` schema not verified in this pass — `UNVERIFIED`.

---

## 5. NFL / American-football coverage (deep dive)

### 5.1 IDs and tournament catalog — `CONFIRMED`
Source: live-API-regenerated official coverage pages, measured 2026-09-18 04:14–04:18 UTC (https://oddspapi.io/sports/american-football and https://oddspapi.io/sports/american-football/nfl, both accessed 2026-09-18). These pages are regenerated from the live API, so numbers move; figures below are the 2026-09-18 snapshot:

| Item | Value |
|---|---|
| American Football `sportId` | **14** |
| NFL `tournamentId` | **31** (255 fixtures scheduled) |
| NCAA Regular Season `tournamentId` | **27653** (2,745 fixtures) |
| CFL `tournamentId` | **790** (23 fixtures) |
| Tournaments with fixtures (sportId 14) | 3 of 32 carried |
| American-football fixtures, next 9 days (Sep 18–27) | **607** |
| Market families on sportId 14 | **100** |

Provider instruction: confirm IDs via `/v4/tournaments?sportId=14` before hardcoding — ids are described as stable.

### 5.2 Bookmaker depth on NFL — `CONFIRMED` (provider's live measurement, 2026-09-18 04:14 UTC)
- **237 bookmakers** quoted the Atlanta Falcons v Carolina Panthers fixture 3 days before kickoff; collapsing identical price tuples → **79 independent prices**.
- `CONFIRMED` provider guidance: **dedupe before averaging** — distinct slugs publish identical prices and the `cloneOf` metadata is incomplete (`cloneOf: null` on many members of identical groups). Compare full price tuples, not metadata.
- Main NFL result market IDs used by the official NFL page: **141** and **143** (same bet ships under >1 market ID; resolve by name).
- NFL match-market families (with market-ID counts; a many-ID family = a ladder, one ID per line):
  - Regular Time Result 1; Winner (incl. overtime) 1; Total (incl. overtime) **201**; Over Under First Half 120; Over Under Second Half 120 (incl. OT 120); quarters 80 each (1st/2nd/3rd/4th, incl. OT variants); Handicap (incl. overtime) **281**.

### 5.3 NFL player props — `CONFIRMED`
Source: official study post "NFL Player Props API: Fifteen Yardage Lines on One Receiver" (https://oddspapi.io/blog/nfl-player-props-api/, published 2026-09-09, data pulled live 2026-08-31 from the Week 1 opener **Seattle Seahawks v New England Patriots**):

- **259 books** quoted the opener; **99** priced player props; 8,508 prop prices, 5,391 active. Props board ⇒ `players` dict keyed by **player ID** (never hardcode `"0"`), `playerName` formatted `"Last, First"`.
- **21 prop families** on one fixture (active rate splits the board — TD markets stay open; yardage ladders mostly suspended):

| Family | Prices | Active | Books | Players | Market IDs |
|---|---|---|---|---|---|
| Over Under Player Receiving Yards | 2,176 | 62.5% | 91 | 8 | 41 |
| Over Under Rush Yards | 1,147 | 53.9% | 91 | 5 | 31 |
| Over Under Pass Yards | 888 | 41.1% | 90 | 2 | 35 |
| Player To Score TD | 830 | 91.1% | 32 | 23 | 2 |
| Over Under Player Receptions | 801 | 49.8% | 52 | 8 | 10 |
| Player To Score First TD | 581 | 92.8% | 34 | 23 | 1 |
| Over Under Player TD Passes | 410 | 60.0% | 88 | 2 | 3 |
| Rush Yards (threshold ladder) | 338 | 16.9% | 37 | 5 | 1 |
| Over Under Rush TD | 330 | 100.0% | 38 | 5 | 1 |
| Pass Yards (threshold ladder) | 275 | 23.6% | 38 | 2 | 1 |
| Over Under Player TD | 153 | 94.8% | 6 | 20 | 3 |
| To Score TD Second Half | 132 | 100.0% | 7 | 18 | 1 |
| To Score TD First Half | 126 | 100.0% | 7 | 17 | 1 |
| To Score TD First Quarter | 75 | 86.7% | 5 | 13 | 1 |
| Over Under Player Interceptions | 56 | 100.0% | 14 | 2 | 1 |
| Over Under Longest Rush Yards | 48 | 100.0% | 8 | 3 | 2 |
| Over Under Longest Pass Completion | 48 | 66.7% | 8 | 2 | 2 |
| Over Under Field Goals | 36 | 100.0% | 9 | 2 | 1 |
| Over Under Kicking Points | 32 | 100.0% | 8 | 2 | 2 |
| Over Under Pass Attempts | 22 | **0.0%** | 6 | 2 | 2 |
| Over Under Pass Completions | 22 | **0.0%** | 6 | 2 | 2 |

- **Ladder structure:** Cooper Kupp receiving yards carried **15 distinct active rungs** (9.5 → 39.5+), each rung its own market ID. Key on **(playerName, handicap)** — never market ID. De-vig only rungs with *both* sides active (many rungs are one-sided alt ladders).
- **Two naming conventions that look identical but differ:** `Over Under Rush Yards` (two-sided, de-viggable) vs bare `Rush Yards` (one-sided threshold ladder, outcomes like `60+`/`90+`, single market ID, not de-viggable).
- **Anytime TD ships under two market IDs** (14388 and 144637 on the measured fixture), with outcome names split `Yes`/`1+`/`2+`/`3+` — resolve by market *name*, collect all IDs.
- `CONFIRMED` (provider measurement): `mainLine` flag is unreliable for NFL alt lines — agreed with consensus spread on only 46% of flags.
- **Dedupe results:** 99 prop books → **39 independent** price groups (60.6% reduction); largest group 21 slugs (e.g. 8 Betano skins shipping 180 identical prices each). `cloneOf` present on 96 of 259 books but incomplete — compare tuples.
- Filter on price-level `active` (pass attempts/completions were posted fully suspended: 44 quotes nobody would take) and skip internal feeds (`slug.startswith("pinnacle+")`, `slug == "demo"`) and books with `suspended: true`.

### 5.4 Which books price NFL props — `CONFIRMED` (same study, Week 1 opener)
- Prop depth: **FanDuel 321** prop prices (91.6% active, 9 families, 17 players) > Caesars/WilliamHill 250 > ESPNBet/theScore 233 > DraftKings 200 > Betano (8 skins) 180 each > Novig.us 174 > **Kalshi 110** (100% active — unusual for a prediction market) > Fanatics 81.
- **`pinnacle`, `bet365`, `betmgm`, `betfair-ex`, `polymarket`, `sbobet` priced 0 props** — game lines only. If GSE needs a *sharp reference price on a prop*, the NFL prop board will not supply it.
- Best/worst anytime-TD spread on one player (Kupp): 3.00 FanDuel → 4.37 betfirst.be (+45.7% payout gap).

### 5.5 Props run on a different clock — `CONFIRMED`
- FanDuel: game lines entered feed **9 Aug**; props entered **31 Aug 00:27:16 UTC** — 10 days before kickoff, **22 days after** game lines.
- DraftKings 00:31:48, Caesars/ESPNBet 00:34:19, Kalshi 00:57:40 UTC the same morning — 5 independent operators opened Week-1 props within ~30 minutes (scheduled jobs, not traders).
- DraftKings had posted an anytime-TD board 2–4 June then pulled it (60 snapshots); the provider characterizes NFL price collection as beginning **~100 days before kickoff** — treat that as provider's characterization (`INFERRED` reading: the true "board open" moment is not directly observable at that edge).
- Practical rule from the provider: **schedule the prop scanner against kickoff, not the calendar** (poll 10 days out to find the board mid-build; 2 weeks out = game lines only).

---

## 6. Historical odds — deep dive + retention analysis

### 6.1 Confirmed mechanics (official docs/tutorial)
- Unmetered endpoint (`/v4/historical-odds`), max **3 bookmaker slugs per call**, 5000ms cooldown, ETag/304 support on finished fixtures (§4.3).
- Provider's tested examples (Sept 2026 Bet365 guide): one fixture returned 266 markets / 230,515 snapshots / 29,569 deduped price moves; independent measurement (cleatiq, soccer) found ~20–30s snapshot density near kickoff with ms timestamps.
- Official tutorial also confirms `tournamentId` works as a filter on `/fixtures`, lifts the 10-day range cap, and cuts payload — documented in the blog but **not** in the formal endpoint docs; treat as provider-observed, not a stable contract.

### 6.2 Retention — conflicting evidence, resolve live
| Evidence | Claim | Date | Status |
|---|---|---|---|
| Official endpoint docs (/en/docs/get-historical-odds) | "All historical odds data since **January 2026** is available" (~8–9 months) | current page | `CONFIRMED` provider claim |
| Official Sept 16, 2026 blog probe | EPL data OK for 2026-01-17, 404 for 2025-10-18 (~8 months) | 2026-09-16 | `CONFIRMED` provider-measured (EPL only) |
| Independent probe (mxvsatv321/cleatiq, soccer) | **~90-day rolling window** (Feb 2026 full, Jan 2026 partial, 118d none; 2024-25 categorically NOT_FOUND) | ~2026-05 | `CONFIRMED` third-party measurement, older |
| Official blog | "Historical storage is a rolling window, not a permanent archive" | 2026-09-16 | `CONFIRMED` provider-stated |

`INFERRED` reconciliations (pick none without testing): (a) retention is **plan/tier-dependent** (free/short vs paid/long); (b) retention **expanded** between May and September 2026; (c) retention differs **by sport/league** (EPL 8 months vs the 90-day soccer sample set). **GSE must test live:** query `/v4/historical-odds` for old NFL fixture IDs (e.g. 2025 season) on the actual key and binary-search the 404 boundary. Do not budget a 2024–25 NFL backfill on OddsPapi until that test lands.

### 6.3 Close-line semantics
`CONFIRMED` (official guide + two independent repos): there is **no `is_closing` flag**. Close = last snapshot with `active=true` and `createdAt < startTime`. Snapshots continue in-play (Pinnacle prices in-play), so the pre-kickoff filter is mandatory, not optional.

## 7. WebSocket feed

Source: https://oddspapi.io/en/docs/websocket-api (accessed 2026-09-18).
- `CONFIRMED`: `wss://api.oddspapi.io/v4/ws?apiKey=YOUR_API_KEY`; one-way server→client; only changed values pushed (except complete `players` objects); messages keyed by `fixtureId`.
- Fixture fields can include: `betradarId`, `startTime`, participant IDs, `sportId`, `tournamentId`, `seasonId`, `sofascoreId`, `betgeniusId`, `flashscoreId`, `statusId`.
- Odds-update fields: bookmaker fixture/path IDs, market/outcome/player IDs, `limit`, `price`, `active`, `oddsId`, `betslip`, `changedAt`, `playerName`, `exchangeMeta`.
- `CONFIRMED`: **not on the ordinary free REST tier** — docs say available by contacting OddsPapi / via B2B; one official guide calls it Pro-tier access. Treat live push as a paid-tier feature.

## 8. Latency

Source: https://oddspapi.io/en/coverage/latency (accessed 2026-09-18).
- `CONFIRMED` provider methodology statement: they prioritize sharps (Pinnacle) and major softs (Bet365) to be as close to **1 second** as possible over WebSocket; pregame polling frequency is increased for high-profile tournaments **(NFL named explicitly)**; soft books with anti-bot protection (Cloudflare/Akamai) naturally run 4–10s.
- The per-book delay table itself was empty in the text fetch (JS-rendered) — figures `UNVERIFIED`.
- The 60-second-delay claim about The Odds API appears only in OddsPapi's marketing blog — `UNVERIFIED` independently; do not repeat as fact.

## 9. Terms, licensing, redistribution

Source: https://oddspapi.io/en/legal/terms (accessed 2026-09-18). `CONFIRMED`:
1. **"You may not resell, repackage, or redistribute our data as a standalone product."** Access may be revoked on detected misuse/unauthorized distribution.
2. Abuse/fair-use monitoring explicitly covers **exceeding limits, sharing API keys, and scraping**; suspension/termination at their discretion without notice.
3. API key is personal and tied to the plan; do not share.
4. All payments **non-refundable**; cancellation via dashboard; plan stays active to end of billing cycle.
5. No accuracy/completeness guarantee; user verifies data before use; no liability for decisions/losses.
6. Terms can change any time; continued use = acceptance.
- Privacy policy exists at `/en/legal/privacy` (not reviewed in this pass).
- **GSE implication:** internal engine analytics + private research is the safe lane. Any public display of odds (site, X posts), redistribution of derived datasets, or commercial packaging needs a legal read *and* likely a direct conversation with the vendor. Note the comparison is about The Odds API too: Garrett's existing 20K plan has its own terms — do not assume identical rights.

## 10. Legacy/alternate surfaces — do NOT conflate

There is a **separate legacy RapidAPI surface** that is not the official direct `/v4` API:
- `INFERRED` from two independent third-party repos: host `oddspapi.p.rapidapi.com`, header auth (`X-RapidAPI-Key` / `X-RapidAPI-Host`), paths reported as `/v1/matches?sportId=11`, `/v1/sports/11/fixtures`, `/v1/odds/pre-match`, `/v1/odds/live` (one repo, 2026) and `/fixtures/odds/main`, `/fixtures/odds/historical`, `/markets?sportId=...` labeled "V5" (another repo). Version numbering is inconsistent across third parties — do not treat either as current; the official direct API is `/v4` at `api.oddspapi.io`.
- One public repo (`bangletsgetit/nba-ncaa-betting-models`, `RAPIDAPI_ODDSPAPI_STATUS.md`) has a **RapidAPI key committed in plaintext** — do not use it; treat as compromised. (Value deliberately not reproduced here.)

---

## 11. Public code ecosystem (GitHub) — all found 2026-09-18 via public search

**Reusable clients/integrations:**
1. **`lakeside763/55-tech`** — TypeScript arbitrage toolkit aimed at `api.oddspapi.io`; README shows a real UEFA Youth League arb analysis (251 markets, 96 active books, 25 opportunities). Shares the vendor's name (55 Tech). Third-party, not confirmed-official. `CONFIRMED` exists.
2. **`bhupeshb1/sports-odds-analysis-mcp-server`** — MCP server for Claude Desktop wrapping `https://api.oddspapi.io/v4` (tournaments/fixtures/account tools), default bookmaker Pinnacle. Matches the official blog's "odds-api-mcp-server-claude-cursor" post. `CONFIRMED` exists.
3. **`andrewkorot/sports-odds-discrepancy-alert-scanner`** — discrepancy/EV scanner using the official v4 contract (`apiKey` query param, `/bookmakers` catalog endpoint), with a credentialed coverage-verification script. `CONFIRMED` exists.
4. **`heymillsy/gamblor`** — World Cup + player-props spike on the OddsPapi free tier (250 req/mo); community-observed params: `verbosity=3`, `marketId=10730` (Anytime Goal Scorer) on `/odds`, `q=tab` filter on bookmakers/markets, `summary=tournaments` on fixtures. **These params are not in the official docs — `UNVERIFIED`, community-reported.**
5. **`nderman/polymarket-ai-bot`** — Claude skill querying OddsPapi for CS2 (`sportId=17`) and tennis. `CONFIRMED` exists.

**Research/analysis repos (evidence-grade):**
6. **`mxvsatv321/cleatiq`** — `docs/oddspapi_recon.md`: Pinnacle historical schema, ~20–30s snapshot density near kickoff, and the empirical **~90-day retention** measurement (§6.2). https://github.com/mxvsatv321/cleatiq/blob/HEAD/docs/oddspapi_recon.md
7. **`alexandrosh8/sharp-ev-picks`** — `docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md`: endpoint-shape review, close-semantics derivation rule, kickoff-cutoff requirement. https://github.com/alexandrosh8/sharp-ev-picks/blob/HEAD/docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md
8. **`maxviidal/tennis-trading-algorithm`** — runnable tennis historical integration; caches exact fixture/settlement/historical responses locally; groups historical calls in threes (matches the 3-slug cap). `CONFIRMED` exists.
9. **`th3-h4xx0r/intellistock`** — commit `301d26a418185130bbc01f30c5ba85f6990bb74d`: real-schema correction confirming fixture fields (`participant1Name`, `participant2Name`, `fixtureId`, `startTime`, `hasOdds`). `CONFIRMED` exists.
10. **`capitalinvestingpartners/statsedge`** — `docs/ODDS_INTELLIGENCE.md`: production integration against the **separate RapidAPI V5 surface** (§10). Do not conflate with `/v4`.
11. **`bangletsgetit/nba-ncaa-betting-models`** — `ODDSPAPI_SETUP.md` / `ODDSPAPI_INTEGRATION.md` / `RAPIDAPI_ODDSPAPI_STATUS.md`: useful only as an example of what *not* to trust — contains guessed endpoint patterns, an obsolete `/api/v1` claim, and a leaked RapidAPI key. Treat as unreliable.

**Committed payload samples:** several repos cache *local* (git-ignored) fixture/settlement/historical responses (e.g. maxviidal's tennis cache), but **no public committed OddsPapi historical JSON archive was found** — the local caches are described as ignored build artifacts, not published data. Kaggle search for an OddsPapi historical dataset returned nothing relevant. Verdict: **no public reusable historical dump found** (`CONFIRMED` negative result, 2026-09-18).

## 12. Official blog — posts most relevant to GSE (full index enumerated from https://oddspapi.io/blog/post-sitemap.xml, 2026-09-18)

NFL/American football:
- `free-nfl-odds-api-guide` (2026-07-28) — the study behind the NFL coverage page
- `nfl-player-props-api` (2026-09-09) — the prop-board study (§5.3–5.5)
- `nfl-alternate-lines-api`, `nfl-team-totals-api`, `nfl-schedule-api`, `nfl-key-numbers-half-point-cost`, `nfl-sportsbook-margins`, `when-do-nfl-odds-open`, `kalshi-polymarket-nfl-odds`, `nfl-prediction-market-liquidity` (Aug–Sep 2026)
- `college-football-odds-api`, `college-football-player-props-api`, `college-football-odds-coverage` (Aug 2026)

Pricing/comparison/methodology:
- `odds-api-pricing-2026-comparison` (2026-08-24) — 4-provider pricing table (§3.1)
- `the-odds-api-alternative-comparison` — direct The Odds API comparison (vendor marketing)
- `the-odds-api-free-tier-limits` — free-tier mechanics
- `free-odds-api-350-bookmakers` — free-tier claims
- `team-ratings-from-closing-odds` (2026-08-06), `how-many-bookmakers-backtest` (2026-09-03), `backtest-betting-model-free-historical-odds`, `historical-odds-csv-excel-backtesting`, `clv-sportsbook-line-audit`, `soft-book-lag-pinnacle` — CLV/backtest methodology
- `odds-api-mcp-server-claude-cursor` — MCP integration
- Per-book SEO pages: `draftkings-api-odds-access`, `fanduel-api-odds-access`, `betmgm-api-odds-access`, `caesars-sportsbook-api-odds-access`, `betrivers-api-odds-access`, `bet365-api-odds-access`, `sbobet-api-odds-access`, `circa-sports-api-odds-access`, etc.

## 13. Comparison: OddsPapi vs The Odds API (Garrett's existing plan)

| Dimension | The Odds API (Garrett's 20K, $30/mo — independently confirmed via Gmail 2026-08-22) | OddsPapi free / paid (`CONFIRMED` provider claims; competitive claims `UNVERIFIED`) |
|---|---|---|
| Billing | Credits: `/odds` costs markets×regions per call; historical costs 10× (per OddsPapi's blog; cross-check against the-odds-api.com docs) | Flat per-request; 1 call = 1 request; historical unmetered |
| Free tier | 500 credits/mo | 250 requests/mo; all books + historical included |
| Books | ~40 US soft books | 300–350+; Pinnacle, Singbet, SBOBet, Betfair Exchange, crypto |
| Latency | 60s delay claimed by OddsPapi's blog (`UNVERIFIED`) | Real-time claimed; WS only on paid tiers |
| Historical | Paid, 10× multiplier (per OddsPapi's blog; verify) | Free/unmetered, rolling window (Jan 2026+ claimed) |
| Prop depth (NFL) | Event-level, limited markets | 21 prop families, 100 market families, ladder rungs per line |
| Push | REST only per OddsPapi's blog (`UNVERIFIED`) | WebSocket (paid/B2B) |
| Data rights | Garrett's existing ToS (review separately) | No resell/repackage/redistribute as standalone product |

**Where The Odds API still wins for GSE:** it's already paid, already integrated (`THE_ODDS_API_KEY` in Sports code), covers the core US books Garrett's audience bets at, and its credit economics are known. **Where OddsPapi wins:** historical line movement for CLV (free), Pinnacle limits for true-probability anchoring, prop-market breadth, and book-count for disagreement signals.

## 14. GSE integration notes (what to build, what to avoid)

**Recommended lane split:** The Odds API = primary current-line feed + failover anchor. OddsPapi = (1) historical CLV reconstruction, (2) NFL prop-market discovery + cross-book comparison, (3) Pinnacle-limit-anchored fair probabilities, (4) book-breadth disagreement checks.

**Engineering rules (all derived from confirmed provider behavior above):**
1. `apiKey` is a **query param**, never a header.
2. Resolve market/outcome IDs by **name** via `/markets` at boot; never hardcode (same bet ships under multiple IDs; IDs are per-fixture opaque).
3. Key yardage props on **(playerName, handicap)**, never market ID (ladder rungs).
4. Skip `"0"` for props; iterate the full `players` dict. `playerName` = `"Last, First"`.
5. **Dedupe clone feeds by full price tuple** — `cloneOf` is incomplete; 99→39 reduction measured on NFL props.
6. Filter `active=true` at price level; skip `suspended` books and internal feeds (`pinnacle+*`, `demo`).
7. Close = last snapshot with `active` and `createdAt < startTime`; dedupe consecutive identical prices first.
8. Honor `error.retryMs` on 429; respect per-endpoint cooldowns (odds 500ms, fixtures 2000ms, historical 5000ms).
9. Use `tournamentId=31` on `/fixtures` for NFL (lifts 10-day cap, ~20× smaller payload).
10. Use ETag/`If-None-Match` on historical for finished fixtures (3-day cache window).
11. Store **vendor-native IDs + `externalProviders` crosswalk** (Betradar, Pinnacle, SofaScore, Flashscore…) plus a canonical GSE mapping layer.
12. Current GSE `picks` table supports only SPREAD/MONEYLINE/TOTAL — **props require a schema extension** before any prop lane goes live.
13. Schedule prop collection **relative to kickoff** (props open ~10 days out; game lines ~22+ days out).
14. **Do not publish or redistribute raw/redistributed odds data** without a legal read of §9 terms.

## 15. Open questions (resolve with a live key before engineering)

1. **Retention boundary for NFL**: binary-search `/v4/historical-odds` 404s on 2025-season NFL fixtures (§6.2 discrepancy).
2. **Free-tier quota reality**: confirm 250 vs 200 via `GET /v4/account` (`request_limit`).
3. **NFL prop book roster on paid vs free**: `RESTRICTED_ACCESS` behavior per book (docs mention plan-gated slugs).
4. **Latency reality**: timestamp `/v4/odds` vs live book pages for NFL (their 60s-delay claim about The Odds API is unverified).
5. **`/v4/scores` schema** and **`/v4/players` schema**: not reviewed in this pass.
6. **Pinnacle NFL game-line depth on free tier**: confirmed present on the Week-1 opener; confirm across the slate.
7. **Community params** (`marketId` on `/odds`, `q` on `/bookmakers`, `summary=tournaments`): verify live or ignore.
8. Whether "55 Tech" (55-tech.com) offers an SLA/B2B contract path for the WebSocket feed and what it costs.

## 16. Source index (every URL fetched, accessed 2026-09-18)

Official surfaces:
- https://oddspapi.io (homepage)
- https://oddspapi.io/en/docs (docs overview)
- https://oddspapi.io/en/docs/requests-and-quota
- https://oddspapi.io/en/docs/websocket-api
- https://oddspapi.io/en/docs/get-fixtures
- https://oddspapi.io/en/docs/get-odds
- https://oddspapi.io/en/docs/get-historical-odds
- https://oddspapi.io/en/docs/get-markets
- https://oddspapi.io/en/docs/get-settlements
- https://oddspapi.io/en/legal/terms
- https://oddspapi.io/en/coverage/latency
- https://oddspapi.io/sports/american-football
- https://oddspapi.io/sports/american-football/nfl
- https://oddspapi.io/sitemap.xml, /sitemap-main.xml, /blog/sitemap_index.xml, /blog/post-sitemap.xml
- https://oddspapi.io/robots.txt
- https://oddspapi.io/blog/nfl-player-props-api/
- https://oddspapi.io/blog/bet365-historical-odds-guide-the-data-apis-and-strategy/
- https://oddspapi.io/blog/odds-feed-api-real-time-bookmaker-data/
- https://oddspapi.io/blog/the-odds-api-alternative-comparison/
- https://oddspapi.io/blog/odds-api-pricing-2026-comparison/
- https://oddspapi.io/blog/the-odds-api-free-tier-limits/
- https://medium.com/@oddspapi/how-to-pull-live-sports-odds-in-python-free-api-2026-guide-24ecf72be811

Third-party / community (all via public search, 2026-09-18):
- https://github.com/mxvsatv321/cleatiq/blob/HEAD/docs/oddspapi_recon.md
- https://github.com/alexandrosh8/sharp-ev-picks/blob/HEAD/docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md
- https://github.com/capitalinvestingpartners/statsedge/blob/HEAD/docs/ODDS_INTELLIGENCE.md
- https://github.com/maxviidal/tennis-trading-algorithm
- https://github.com/th3-h4xx0r/intellistock (commit 301d26a418185130bbc01f30c5ba85f6990bb74d)
- https://github.com/bhupeshb1/sports-odds-analysis-mcp-server
- https://github.com/lakeside763/55-tech
- https://github.com/andrewkorot/sports-odds-discrepancy-alert-scanner
- https://github.com/heymillsy/gamblor
- https://github.com/nderman/polymarket-ai-bot
- https://github.com/bangletsgetit/nba-ncaa-betting-models (unreliable; contains a leaked RapidAPI key — not reproduced here)

---

*End of report. Written 2026-09-18 from public sources only. Every factual claim carries a CONFIRMED / INFERRED / UNVERIFIED label and a source URL with access date. Nothing here required a key, login, or bypass of any access control.*
