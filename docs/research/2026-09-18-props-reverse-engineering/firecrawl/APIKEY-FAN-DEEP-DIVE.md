# APIKEY.FAN (apikey.fan) — Deep Dive

Research date: 2026-09-18. All page fetches performed 2026-09-18 ~16:04–16:25 CDT (21:04–21:25 UTC).
Task boundary: public material only. No logins, no paywall bypass, no credential use.
Companion note: `APIVAULT-DEEP-DIVE.md` (same directory) covers apivault.uk separately.

## Bottom line

**CONFIRMED: APIKEY.FAN is NOT a sports-data or odds-data provider.**
It is an AI-model API relay/gateway ("The Universal AI Gateway") — a re-seller proxy
for Claude, OpenAI/Codex, Gemini, and other LLM APIs at ~7–20% of official rates.
Garrett's belief that it has "free tiers of API data statistics" for sports is NOT
supported by any public evidence. It has **zero sports, odds, or NFL statistics
endpoints** on its public site.

That said, it may matter to the broader operation: it is a cheap AI-inference layer
(relevant to model/compute spend for the Minis/Hermes builder agents and any
Motif-side LLM usage), but it is **not a data source for the Sports repo**.

Of Garrett's five password-manager screenshots, the one with real sports-data value
is **OddsPapi (oddspapi.io)** — a genuine sports-odds API with a free tier (250
requests/mo) and a **free, unmetered `/v4/historical-odds` endpoint**. That is
documented in Section 6 below.

## 1. What apikey.fan actually offers — CONFIRMED

Source: https://apikey.fan (fetched 2026-09-18 ~21:05 UTC)

- Tagline: "The Universal AI Gateway" / "Access World-Class AI Models".
- "Built for developers and teams worldwide — high-speed dedicated access, zero ban
  risk, balance never expires. Alipay / WeChat Pay supported, with low-latency
  access to Claude, ChatGPT, Gemini, and more."
- Integration model: drop-in replacement for official SDKs — "Just change the API
  endpoint — no need to rewrite your existing business logic." / "Replace YOUR_API_KEY
  with the key you generated in your account."
- FAQ, verbatim: "Priced at roughly 20% of official rates." Claims "100% official
  performance," enterprise-tier quota, "zero risk" of bans because billing consumes
  their enterprise quota.
- Billing: top-up balance, never expires ("as long as your account remains active").
  Payment methods mentioned: Alipay / WeChat Pay. "Create Free Account" CTA present —
  a free-account tier exists, but its free-quota amount is NOT published on the
  public homepage (UNVERIFIED until signup, which is out of scope).
- Supported tools ecosystem page lists OpenClaw, Claude Code, Codex, and Hermes
  (a multi-channel config tool, not the builder agent — name collision).

## 2. Domain history — CONFIRMED

- apikey.fan is the successor domain of **apikey.fun** ("APIKEY.FUN").
  Source: https://github.com/sailingloong/loongport/commit/99b4248aaa969b5763a5f0020eeb24762e7a3446
  (2026-09-13): "fix(presets): update APIKEY.FUN URLs to apikey.fan — The relay moved
  to the apikey.fan domain."
- Source: https://github.com/fan-van/sub2api (README, fetched via search 2026-09-18):
  "APIKEY.FUN is one of the core contributors to the sub2api open-source project,
  dedicated to providing open, stable, and cost-effective AI API access. The platform
  supports API relay services for Claude, OpenAI, Gemini, and other popular models,
  with pricing starting from as low as **7% of the original rate**."
- Garrett's password manager entry shows website "apikey.fun", modified Aug 20, 2026,
  username baxley.garrett@gmail.com — consistent with him registering during the
  apikey.fun era. (Per his screenshot; no login attempted.)

## 3. Public API surface / endpoint inventory

- **No public API documentation for a REST data API exists** — because the product is
  an OpenAI/Anthropic-compatible relay, not a data API. INFERRED: the "API" is the
  standard `/v1/chat/completions` (OpenAI) and `/v1/messages` (Anthropic) wire
  protocols pointed at their gateway host, per the "Point your tools at us — one
  line changes" framing and full official-SDK compatibility claim. This is an
  inference from their marketing copy, not a documented endpoint list — do not treat
  exact paths as CONFIRMED.
- The relay class is well documented by independent third parties (RelayRouter,
  Sub2API, OortAPI docs all describe the same architecture: one key, multi-model
  routing, per-token billing). These are category analogues, not apikey.fan internals.
- Public JS bundles of apikey.fan were NOT enumerated in this pass (homepage fetch
  returned rendered text only). A follow-up bundle scrape is worthwhile to document
  the exact gateway hosts and any public pricing/quota endpoints — public bundles are
  in scope; login is not.

## 4. GitHub / code provenance

| Item | Finding |
|---|---|
| https://github.com/fan-van/sub2api | CONFIRMED relationship: apikey.fun listed as core contributor/sponsor of this open-source AI-relay project. Pricing "from 7% of original rate." |
| https://github.com/sailingloong/loongport/commit/99b4248... | CONFIRMED: domain migration apikey.fun → apikey.fan (2026-09-13). |
| https://github.com/doctorfan1314/oortapi | UNRELATED product (self-hosted AI relay). Useful only as architecture reference. |
| Any sports/odds code under apikey.fan | NONE FOUND. No repos, no mirrors, no clones, no leaked datasets. |

## 5. Archived / leaked historical data

- **None found, and none expected**: the service sells AI inference, not data. There
  is no historical dataset to leak. No public dumps, archives, or mirrors were found
  in any search.
- Public leaks policy note: if any credential or key material for apikey.fan surfaces
  publicly, it must NOT be used — credentials are never used to authenticate as
  someone else.

## 6. OddsPapi (oddspapi.io) — the screenshot site with REAL sports-data value

Garrett's screenshot set included OddsPapi (oddspapi.io). Unlike apikey.fan, this one
IS a sports odds API, and its free tier is unusually generous for historical data.
Findings below are from public pages fetched 2026-09-18 ~21:06–21:25 UTC.

### What it offers — CONFIRMED
Source: https://oddspapi.io (fetched 2026-09-18 ~21:06 UTC)
- Real-time, pre-match, live, and **historical** sports betting odds from **300+
  bookmakers** across **60+ sports** and 12,000+ yearly competitions.
- Bookmakers include Pinnacle, Bet365, DraftKings, FanDuel, BetMGM, Unibet, Bwin,
  Sbobet (sharp books explicitly included — Pinnacle matters for CLV).
- Markets: moneyline, spread, totals, draw-no-bet, double chance, 1X2, player props,
  team props, exact score, Asian handicaps, futures.
- "Free historical data" is a headline feature ("Data that's usually expensive —
  made free for our users").

### Free tier — CONFIRMED
Source: https://oddspapi.io/en/docs/requests-and-quota (fetched via search cache,
2026-09-18) and https://oddspapi.io/blog/the-odds-api-free-tier-limits/ (fetched
2026-09-18)
- Free plan: **250 requests/month**.
- **`/v4/historical-odds` is ALWAYS FREE — calls never increment the request count.**
  `/v4/account` is unmetered and always accessible (even after quota exhaustion).
- 1 request = 1 call to a billable endpoint regardless of response size. Per their
  own comparison post: The Odds API free tier is 500 credits/mo but costs
  markets × regions (1–15+ credits) per call and 10× for historical; OddsPapi's 250
  requests are "250 full boards — every book, every market."
- Pricing page (https://oddspapi.io/pricing, fetched 2026-09-18) is a JS calculator
  ("Customize your plan … $0.00 per month") — exact paid tiers not extractable
  without rendering. INFERRED: usage-based pricing by bookmakers × sports × requests.

### Endpoint inventory — CONFIRMED
Base URL: `https://api.oddspapi.io/v4`. Auth: `apiKey` as **query parameter**
(not a header).
Billable (1 request each): `/v4/players`, `/v4/settlements`, `/v4/fixtures`,
`/v4/fixture`, `/v4/odds-by-tournaments`, `/v4/languages`, `/v4/sports`,
`/v4/bookmakers`, `/v4/markets`, `/v4/tournaments`, `/v4/participants`,
`/v4/scores`, `/v4/odds`.
Free: `/v4/historical-odds`. Unmetered: `/v4/account`.
Sources: https://oddspapi.io/en/docs/requests-and-quota;
https://github.com/mxvsatv321/cleatiq/blob/HEAD/docs/oddspapi_recon.md (2026-05-02).

### Request/response examples — CONFIRMED (from official docs/tutorial + recon)
```python
import requests
BASE_URL = "https://api.oddspapi.io/v4"
r = requests.get(f"{BASE_URL}/sports", params={"apiKey": API_KEY})   # 69 sports as of June 2026
r = requests.get(f"{BASE_URL}/fixtures", params={"apiKey": API_KEY, "sportId": 13,
    "from": "2026-06-05", "to": "2026-06-06"})                      # date range, max 10 days apart
# Only fixtures with hasOdds: true return a price payload.
r = requests.get(f"{BASE_URL}/historical-odds",
    params={"apiKey": API_KEY, "fixtureId": X, "bookmakers": "pinnacle"})
```
Key usage notes (CONFIRMED from recon + docs):
- `GET /v4/historical-odds?fixtureId=X&bookmakers=slug1,slug2` — max 3 bookmakers per call.
- Soccer sportId = 10; MLB sportId = 13 (per docs/tutorial). **NFL sportId UNVERIFIED**
  in this pass — resolve via `GET /v4/sports` before building.
- Fixtures endpoint supports `from`/`to` ISO date range.
- Independent GitHub evaluation
  (https://github.com/alexandrosh8/sharp-ev-picks/blob/HEAD/docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md,
  2026-07-05) documents a working GET-only client for `GET
  /v4/historical-odds?fixtureId=…&bookmakers=…&apiKey=…` reducing chronological
  per-outcome price history to (open, close) with UTC-aware times — NBA-tested with
  **Pinnacle open = anchor, Pinnacle close = CLV reference**. Parsing/secret/format
  work is done there; football fixture resolution is the open gap.

### Update latency / snapshot frequency — INFERRED / UNVERIFIED
Public docs claim "ultra-fast latency with WebSocket streaming" and odds that
"update once per minute" appears only for a *different* provider (Sportsbook API —
do not conflate). OddsPapi's exact poll cadence and historical snapshot granularity
(T-5min? per-move?) are NOT published on the pages fetched. The cleatiq recon
(2026-05-02) was scoped to "T-5min odds" availability — read it before assuming.

### Licensing / commercial use — UNVERIFIED
No terms-of-service or redistribution language was captured in this pass. The free
historical endpoint being free ≠ free to redistribute. Read their ToS before
persisting or republishing data.

## 7. The other screenshot sites (brief)

- **Free Public APIs (https://www.freepublicapis.com**, fetched 2026-09-18): a
  directory of free APIs with health scores — NOT a data provider itself. The one
  sports-relevant listing: **"5Dollar Football API"** — "live scores, fixtures,
  odds, and statistics for various leagues and teams … historical data for analysis
  in real-time or for backtesting purposes," 1 endpoint, health 95. CONFIRMED to
  exist as a directory listing; its own docs/pricing/quotas were NOT fetched in this
  pass (follow-up target).
- **BetOnline (api.betonline.ag)**: Garrett's password manager shows an account
  (modified Apr 4, 2025). BetOnline is a sportsbook, not a public data API — no
  public developer documentation for api.betonline.ag was found, and a direct fetch
  of https://api.betonline.ag failed in this environment (UNVERIFIED whether the
  host serves anything publicly). Its odds surface is reachable via aggregators
  (Sportsbook API lists BetOnline among covered books). The public betonline.ag
  frontend JS bundles are a legitimate REVERSE-ENGINEERING TARGET for publicly
  served internal odds endpoints — public bundles are in scope; any authenticated
  endpoint is not.
- **APIvault (apivault.uk)**: covered in `APIVAULT-DEEP-DIVE.md` — generic proxy
  aggregator, zero sports endpoints.

## 8. Sports-repo (GSE) comparison and recommended tasks

| Source | Role for GSE | Free tier | NFL/odds fit |
|---|---|---|---|
| The Odds API (existing integration) | Primary live odds | 500 credits/mo free; Garrett has paid 20K/mo plan | CONFIRMED working client in repo |
| **OddsPapi** | **Historical odds / line movement / CLV anchor** | **250 req/mo + `/v4/historical-odds` always free** | HIGH — free Pinnacle open/close histories; sharp-ev-picks repo has a working parser pattern |
| nflverse / nflfastR | Stats / EPA / WP core | Free, open | CONFIRMED core |
| apikey.fan | NONE for data — AI inference cost arbitrage only | Free account exists (quota unpublished) | No engineering value as a data source |
| apivault.uk | None | n/a | Zero sports endpoints |
| 5Dollar Football API | Possible soccer/secondary; NFL coverage UNVERIFIED | Listed as free | Investigate only if soccer lane opens |
| betonline.ag bundles | Possible scraped odds surface (public JS only) | n/a | RE target, no auth |

### Prioritized engineering tasks for Sports
1. **Spike: OddsPapi free historical-odds ingestion** — `GET /v4/sports` → resolve
   NFL sportId → `GET /v4/fixtures` by date range → `GET /v4/historical-odds` per
   fixture (Pinnacle) → reduce to open/close per the sharp-ev-picks pattern.
   No credit burn on the historical endpoint. Key hygiene: `apiKey` is a query
   param — keep it out of logs (same discipline as the existing odds-api client).
2. **CLV feed**: use Pinnacle open/close from (1) as the closing-line-value reference
   for grading GSE/Beex picks. This is the single highest-value free data on the
   board.
3. **Read first**: https://github.com/mxvsatv321/cleatiq/blob/HEAD/docs/oddspapi_recon.md
   (quota burn notes, sport/tournament IDs) and the OddsPapi ToS (redistribution
   terms) before persisting anything.
4. Do NOT build adapters for apikey.fan or apivault.uk as data sources.

## Sources (verbatim, accessed 2026-09-18 ~21:04–21:25 UTC)
- https://apikey.fan
- https://github.com/sailingloong/loongport/commit/99b4248aaa969b5763a5f0020eeb24762e7a3446
- https://github.com/fan-van/sub2api
- https://oddspapi.io
- https://oddspapi.io/pricing
- https://oddspapi.io/en/docs/requests-and-quota
- https://oddspapi.io/blog/the-odds-api-free-tier-limits/
- https://github.com/alexandrosh8/sharp-ev-picks/blob/HEAD/docs/research/2026-07-05-oddspapi-crosscheck-evaluation.md
- https://github.com/mxvsatv321/cleatiq/blob/HEAD/docs/oddspapi_recon.md
- https://github.com/andrewkorot/sports-odds-discrepancy-alert-scanner
- https://www.freepublicapis.com/
- Search: "apikey.fan API marketplace sports odds"
- Search: "github apikey.fan OR apikey.fun sports data"
- Search: "apikey.fan API key relay what is it pricing"
- Search: "oddspapi.io documentation endpoints historical odds"
- Search: "betonline.ag API sportsbook developer feed odds public documentation"
- https://api.betonline.ag (fetch failed in this environment — UNVERIFIED)

Labels: CONFIRMED = seen on a fetched page or verbatim search result. INFERRED =
reasonable deduction stated as such. UNVERIFIED = claimed but not publicly
checkable. No endpoints, schemas, credentials, or URLs were fabricated. No logins
attempted; no paywalls bypassed.
