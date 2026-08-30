# CFB / NFL Data-Source Candidates — Owner Review

**Status: GATED. None of these are approved.** They are evaluation candidates for
College Football / NFL coverage, surfaced by the owner. None may be used in public
claims, StatKing evidence, Airwave feeds, or any automation until they clear the
source-provider + clearance gates and are promoted into
`apps/web/lib/scraping/source-rights-registry.ts` with verified terms.

Canonical machine-readable list: `apps/web/lib/scraping/sports-data-candidates.ts`
(approval flags are type-locked to `false`; tests assert none can be promoted here).

## Secrets handling (read first)

- API keys are provisioned as **environment variables only** — never committed.
  Names are documented (commented) in `.env.example`.
- A **StoryStats** key and one additional key were shared in chat/screenshot. Treat
  both as **compromised → rotate them**, then store the new values only as the named
  env vars. The StoryStats dashboard itself says "Keep this key secret."
- The owner labeled an inbound key "balldontlie" but the screenshot showed a
  **StoryStats** key. Confirm which key maps to which provider before wiring anything.

## Standard verification gate (every candidate)

1. Obtain the key; store it ONLY as the named env var (never in code).
2. Read the provider Terms; confirm commercial display + storage are permitted.
3. Verify each endpoint's real schema live before building an adapter (no guessed columns).
4. Record rate limits / freshness; confirm they meet the no-stale-data rule.
5. On clearance: add a verified `source-rights-registry.ts` entry and remove from the
   candidate list.

## Candidates

| Priority | Source | Access | Free tier (as provided) | Env var | Notes |
|---|---|---|---|---|---|
| high | CollegeFootballData (CFBD) | free key | 1,000 calls/mo | `CFBD_API_KEY` | Real CFB stats (games, box scores, win prob, SP+, trends). Already a vendor_candidate; terms need a human read. |
| high | The Odds API (NCAAF) | free key | 500 credits/mo | `THE_ODDS_API_KEY` | Already approved_api + wired. NCAAF via `americanfootball_ncaaf`. Odds-only. Confirm sport key is in plan. |
| high | SportsDataIO College Football | free trial | trial (commercial feed) | `SPORTSDATAIO_API_KEY` | Deep D1 FBS feed. Testing + licensing analysis only; images are graphics, not facts. |
| medium | henrygd NCAA API | no key | 5 req/sec/IP demo; self-host advised | — | NCAA.com-derived fallback. Confirm redistribution posture; prefer self-host. |
| medium | balldontlie NCAAF | free key | ~5 req/min (limited) | `BALLDONTLIE_API_KEY` | Roster/identity supplement, not a main engine. |
| medium | Highlightly NFL/NCAA | free key | 100 req/day | `HIGHLIGHTLY_API_KEY` | Broad live-score/check source. |
| medium | API-SPORTS NFL & NCAA | free key | 100 req/day | `API_SPORTS_KEY` | Secondary; validate CFB depth. |
| medium | Big Balls Sports Data | free key | 1,000–2,000 req/day | `BIGBALLS_API_KEY` | Promising; verify coverage/terms. |
| medium | TheRundown | free key | 20,000 points/day, 5-min delay | `THERUNDOWN_API_KEY` | Market baseline, not live trading. |
| medium | Sports Game Data | free key | 2,500 objects/mo, 10-min updates | `SPORTSGAMEDATA_API_KEY` | 10-min freshness — validate for live use. |
| low | SharpAPI NCAAF Odds | free key | 12 req/min, 2 books | `SHARPAPI_KEY` | Second odds check. |
| evaluation | SportsGameOdds | free trial | "Start Free Trial" | `SPORTSGAMEODDS_API_KEY` | Confirm durable free tier before relying. |
| evaluation | Sportradar NCAA Football v7 | trial | marketplace trial key | `SPORTRADAR_API_KEY` | Enterprise, likely future-paid; reference architecture. |
| evaluation | Rolling Insights / DataFeeds | trial | 30-day trial | `ROLLING_INSIGHTS_API_KEY` | Trial expires; eval only. |
| evaluation | RapidAPI NCAA/CFB listings | marketplace | varies per listing | `RAPIDAPI_KEY` | Experimental; each listing needs its own rights review. |
| evaluation | StoryStats API | free key | 10 req/day (120/min when subscribed) | `STORYSTATS_API_KEY` | Rotate shared key. Confirm sport coverage + terms. |

## Recommended sequence

1. **CFBD** (free, deep CFB facts) — finish the terms read already pending in the registry.
2. **The Odds API NCAAF** — already licensed; just confirm the sport key is enabled.
3. **henrygd NCAA** (no key) — stand up a self-hosted fallback for scores/standings facts.
4. Everything else stays in evaluation; promote one at a time only after the gate clears.

Odds-only sources (The Odds API, TheRundown, SharpAPI, SportsGameOdds) feed the market
baseline; they are not deep CFB stats and must not be presented as such.
