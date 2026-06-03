# Data-source evaluation: Kalshi (fair value / CLV) + odds-api.io (odds failover)

_Dated 2026-06-03. Grounded in live read-only probes, not docs alone._

## TL;DR decision

| Need | Source | Why |
|------|--------|-----|
| **#5 odds-provider failover** (`MIN_BOOKMAKERS`, R5) | **odds-api.io** | A second independent **sportsbook-odds aggregator** — different vendor from the incumbent `the-odds-api.com` (`THE_ODDS_API_KEY`). True failover requires a second *book-line* source. |
| **#2 CLV / fair value** (make-or-break metric) | **Kalshi public `/markets`** | Regulated **event-exchange** prices = market-implied probability. An independent fair-value anchor; capture implied prob at lock + near start → CLV-style metric. **No auth, no key, no cost** for market reads. |

These are **complementary**, not competing. Kalshi is an exchange (not a book), so it does not replace odds-api.io for failover; odds-api.io is not a fair-value consensus, so it does not replace Kalshi for CLV.

## Verified by read-only probe (2026-06-03)

Network note: this machine sits behind TLS interception. `curl` fails with exit 35 (SSL); **`NODE_OPTIONS=--use-system-ca` + Node `fetch` works**. Use Node for any provider connectivity here.

- `GET /trade-api/v2/exchange/status` → `{"exchange_active":true,"trading_active":true}` — **public, no auth**.
- `GET /trade-api/v2/markets?limit=2` → **public, no auth**, returns live sports markets **with prices** (`last_price_dollars`). Sample tickers: `KXNBAGAME-26JUN03NYKSAS-NYK` (Knicks v Spurs, Jun 3), `KXMLBHR-…`. Ticker grammar is parseable: `KX<SPORT><TYPE>-<DATE><MATCHUP>-<SIDE>`.
- `GET /trade-api/v2/live_data/batch` → `400 "milestone_ids required"`. **The `live_data/*` endpoints are play-by-play / game-stats — a live in-game feed, NOT prices.** Useful only for future live features, not for pricing or CLV.

## Critical distinction

The Kalshi snippets initially pasted were all `live_data/*` (game data). The **price** data — the thing CLV needs — lives under `/markets`, `/events`, `/series`, and those **public reads require no authentication or RSA request-signing**. Authenticated/portfolio endpoints need RSA signing, but we never touch those (see guardrails).

## Guardrails (non-negotiable)

- **Kalshi: PUBLIC, READ-ONLY market data only.** No Kalshi account, no API key, no RSA signing, no `portfolio`/`order` endpoints, **no orders, ever.** Kalshi is a real-money venue; placing any order = automated betting = prohibited (no-autonomous-money doctrine).
- **odds-api.io key: env var only** (`ODDS_API_IO_KEY`), never committed. **Rotate** the key that was pasted in cleartext.
- **Coverage / liquidity is partial.** Not every game has a Kalshi market; thin markets give noisy prices. Kalshi is a **supplementary** fair-value signal, never the sole source. Honesty doctrine: never overclaim an edge derived from thin markets.
- All provider connectivity from this machine: `NODE_OPTIONS=--use-system-ca`.

## Recommended first build (gated on founder go-ahead — model-adjacent)

1. **Read-only Kalshi fair-value probe** in `packages/data-ingestion`: map an internal game → Kalshi ticker, fetch implied probability from `/markets`. Pure read, behind a flag, no pick-generation change.
2. **Schema field** to persist a closing-line / closing-implied-prob snapshot at lock + near start → feeds the existing `computePickClv`.
3. Only after validation: surface a private CLV dashboard (#2), then consider `PERFORMANCE_STATS_ENABLED`.

odds-api.io (#5) proceeds on a separate track once we confirm its odds endpoint + rate limits (the pasted payload was its `filters_by_sports` catalog, not the odds-fetch endpoint).

## Spike result — PROVEN (2026-06-03, `scripts/spikes/kalshi-fairvalue-spike.mjs`)

End-to-end read-only spike works. Mapping: `KX<LEAGUE>GAME-<YYMMMDD><AWAY><HOME>-<SIDE>`. Prices are `*_dollars` strings already in [0,1] (`yes_bid_dollars`, `yes_ask_dollars`, `last_price_dollars`).

```
Game 1  NYK@SAS  Jun 3  -> KXNBAGAME-26JUN03NYKSAS   overround 100.0%
   New York 36.5%   San Antonio 63.5%   (deep liquidity: vol ~4.7M, OI ~4M)
Game 2  NYK@SAS  Jun 5  -> KXNBAGAME-26JUN05NYKSAS   overround 100.5%
   New York 37.8%   San Antonio 62.2%
```

Takeaway: exchange overround is ~0-0.5% vs sportsbooks' 4-5% -> Kalshi is a *cleaner* fair-value anchor. Open questions for the real adapter: (1) team-abbreviation mapping table (Kalshi NYK/SAS vs our internal team ids); (2) coverage gaps (not every game/sport has a Kalshi market); (3) timestamping the lock + near-start snapshots for the CLV diff.

## Expanded provider map (all sources offered 2026-06-03)

| Provider | Layer / role | Maps to | Key? | Notes |
|----------|--------------|---------|------|-------|
| **Kalshi** `/markets` | Fair value / CLV | #2 | none | Public read-only. SPIKE PROVEN. Never orders. |
| **odds-api.io** | Sportsbook-odds failover | #5 | `ODDS_API_IO_KEY` | 2nd book aggregator; need odds endpoint. Rotate pasted key. |
| **API-Sports** (`api-sports` Ruby gem / `api-football` npm) | Structured **game data**: fixtures, results, lineups, h2h, stats | settlement + evidence (NOT odds/CLV) | `API_SPORTS_KEY` / api-football key | Results-and-stats backbone. `api-football` = soccer only; API-Sports family has sibling APIs per sport under one key. **Ruby gem is irrelevant to our TS stack** — use the REST API / npm SDK. Rotate pasted key. |
| **SerpApi** (Google sports one-box) | Scraped scores / standings / player stats | settlement + evidence — **redundant with API-Sports** | `SERPAPI_KEY` | Returns Google's sports one-box as JSON. Lower structural fidelity than a real sports-data API (string scores, ambiguous dates, knowledge-graph ids), rate-limited per search. **Risky as a source of truth for a tamper-evident, source-cited product** (honesty doctrine). At most incidental enrichment, not settlement. |

## SerpApi (offered 2026-06-03) — REJECTED for GSE

SerpApi is a Google-results *scraper* (organic results, the sports one-box, AI Mode, shopping). For every GSE need it is redundant and strictly worse on the one axis that matters here — **provenance**:
- Results/stats/settlement → API-Sports is a real structured API; SerpApi returns scraped Google one-box (string scores, fuzzy "Tomorrow"/"Yesterday" dates, knowledge-graph ids). Scraped search results are the **worst** settlement source for a tamper-evident, source-cited product.
- Odds/CLV → SerpApi has none; Kalshi + odds-api.io already cover it.
- Cost/fragility → per-search billing + breaks when Google's HTML changes.

**Decision: do not adopt SerpApi.** (At most a far-future nice-to-have for SEO/trend research on the marketing side — not the prediction/settlement core, and not now.)

## Recommendation: STOP adding providers — this is the final stack

Roughly half a dozen data providers were offered in one session (odds-api.io, Kalshi, API-Sports, api-football, SerpApi, plus the the-odds-api.com incumbent), with **two live keys leaked in cleartext**. For a product whose entire pitch is *trust and provenance*, bolting on more half-wired sources is the opposite of the moat. The stack is now **decided and closed**:

- **Fair value / CLV (#2):** Kalshi — PROVEN, free, no auth. Ship this first.
- **Odds (existing + failover #5):** the-odds-api.com (incumbent) + odds-api.io (2nd source).
- **Results / settlement / stats:** exactly ONE structured provider — **API-Sports** (real API, multi-sport under one key) over SerpApi (scraped one-box). Do not adopt both.
- **Drop:** SerpApi as a source of truth (overlaps API-Sports; weaker provenance for a glass-box product).

Sequencing: land Kalshi CLV (#2) → wire odds-api.io failover (#5) → evaluate API-Sports for settlement/evidence. One at a time, each verified, before the next.

## Secrets hygiene — ACTION REQUIRED
Two live API keys were pasted in cleartext into the session transcript: **odds-api.io** and **api-football**. Treat both as compromised: **rotate them**, and store replacements only in env vars (`ODDS_API_IO_KEY`, `API_SPORTS_KEY`), never in code. (Kalshi needs no key; SerpApi not adopted.)
