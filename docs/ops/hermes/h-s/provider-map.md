# H-S — Free Sports Data Provider Map (CLAIMED — hermes, 2026-08-29)

Status: CLAIMED (per user's instruction — not open/invented)
Scope (from dispatch + user's confirmation):
- Map ONLY — fixed schema, every candidate classified
- Odds sources HARD separated from schedules/results/stats sources
- Free-tier limits verified with at most 2 live calls each (public keys only, no signups)
- Source-rights classification per CLAUDE.md for each provider
- Document in `docs/ops/hermes/h-s/`
- NO adapters — that is out of scope
- NO credential creation or signups — that is out of scope
- NO new DB sources — that is out of scope

Candidate list (from H-S row evidence + founder 2026-08-19):
- TheSportsDB (v1 key 123, 30 req/min — schedules/results, NOT odds) — see S-1
- football-data.org (soccer only)
- OpenLigaDB (German leagues)
- MySportsFeeds
- OrcaSports
- public-apis indexes (catalog only — not a provider itself)
- Incumbents for limit comparison: The Odds API / TheRundown / ESPN

Fixed schema columns (per dispatch): source name | source type (odds/schedule/results/stats) | tier (free/paid) | call limits (per-minute/hour/day) | auth method (key/OAuth/none) | source-rights classification (CLAUDE.md) | verified? (max 2 live calls)

---

## Live Probe Results (2026-08-29)

| Source | Source Type | Tier | Call Limits | Auth | Rights Classification | Probe 1 | Probe 2 | Verified |
|--------|-------------|------|-------------|------|----------------------|---------|---------|----------|
| **TheSportsDB** | schedules/results | free | ~30 req/min (key=3) | key (free tier key "3") | vendor_candidate (gated) | ✅ 200 248ms (team search) | ✅ 200 170ms (NFL season events) | **YES** |
| **football-data.org** | schedules/results (soccer) | free/paid | 10 req/min free | key (free tier) | vendor_candidate (gated) | ❌ 403 514ms (PL matches) | ✅ 200 308ms (competitions list) | PARTIAL |
| **OpenLigaDB** | schedules/results (German) | free | no published limit | none | approved_public_logged_off | ✅ 200 556ms (BL1 matchdata) | ✅ 200 129ms (current group) | **YES** |
| **MySportsFeeds** | odds/schedules/stats | paid | requires subscription | key (paid) | vendor_candidate | ❌ 401 254ms (standings) | ❌ 401 36ms (schedule) | NO (needs paid key) |
| **OrcaSports** | unknown | unknown | unknown | unknown | excluded (DNS fail) | ❌ DNS fail | ❌ DNS fail | NO |
| **public-apis (index)** | catalog | free | N/A | none | approved_open_license | ❌ DNS fail (api.publicapis.org) | ✅ 200 142ms (GitHub raw README) | PARTIAL (catalog only) |
| **The Odds API** (incumbent) | odds | paid | 500 req/day (free tier) | key | approved_api | ❌ 401 136ms (sports list) | — | NO (paid, key required) |
| **TheRundown** (incumbent) | odds | paid | unknown | key | vendor_candidate | ✅ 200 167ms (sports list) | — | YES (but paid) |
| **ESPN Public API** | schedules/results | free | no published limit | none | approved_public_logged_off | ✅ 200 46ms (NFL scoreboard) | ✅ 200 131ms (NFL teams) | **YES** |
| **MLB Stats API** | schedules/results/stats | free | no published limit | none | vendor_candidate (gated) | ✅ 200 168ms (daily schedule) | ✅ 200 38ms (teams list) | **YES** |
| **Sleeper API** | fantasy/platform | free | no published limit | none | approved_public_logged_off | ✅ 200 92ms (player metadata) | ✅ 200 128ms (trending adds) | **YES** |
| **Open-Meteo** | weather/stats | free | no published limit | none | approved_open_license | ✅ 200 561ms (forecast) | ✅ 200 570ms (archive) | **YES** |
| **nflverse** | open dataset | free | N/A (static files) | none | approved_open_license | ✅ 200 161ms (games.csv 2.1MB) | ✅ 200 133ms (timestamp.json) | **YES** |
| **FFC ADP** | fantasy ADP | free | once/day | none | approved_api | ❌ DNS fail | — | NO (DNS issue) |

---

## Detailed Classification per Source-Rights Registry

### ✅ CLEARED FOR IMMEDIATE USE (no spend, registry-approved)

| Source | Registry Status | Use Case | Notes |
|--------|----------------|----------|-------|
| **nflverse** | approved_open_license (CC-BY-4.0) | NFL schedules, games, rosters, pbp, player_stats | Attribution required. Carve-outs: pfr_advstats = permission_required; FTN charting = CC-BY-SA-4.0 |
| **ESPN Public API** | approved_public_logged_off | Scores, schedules, rosters (facts only) | No commercial display/storage without license. Rate-limit aggressively. |
| **Open-Meteo** | approved_open_license (CC-BY-4.0) | Game-time weather (wind/precip/temp) for outdoor venues | Free API tier is non-commercial; self-host or commercial tier for production. Attribution required. |
| **Sleeper API** | approved_public_logged_off | Player metadata, injury status, trending adds/drops | Attribution required for trending. Commercial display gated until ToS confirmed. Never logos/headshots. |
| **OpenLigaDB** | approved_public_logged_off | German league schedules/results (Bundesliga, 2. Bundesliga, etc.) | No key, no rate limits observed. German jurisdiction. |

### 🔒 GATED (probed OK, needs registry promotion before automation)

| Source | Current Status | Probe Results | Unlock Condition |
|--------|----------------|---------------|------------------|
| **TheSportsDB** | vendor_candidate (gated in sports-data-c) | 2/2 OK with free key=3 (team search, NFL events) | Registry entry + terms clearance. Free tier key "3" works but requires explicit grant for automation. |
| **MLB Stats API** | vendor_candidate (gated in sports-data-c) | 2/2 OK (daily schedule, teams list) | Registry entry + terms clearance. High quality, no key, no rate limits. |
| **football-data.org** | vendor_candidate (gated) | 1/2 OK (competitions list works, matches needs auth) | Free tier key required for match data. Soccer only. |

### ❌ NOT CLEARED / FAILED

| Source | Status | Reason |
|--------|--------|--------|
| **MySportsFeeds** | vendor_candidate | 401 on both calls — paid subscription required |
| **OrcaSports** | excluded | DNS resolution failure — domain unreachable |
| **public-apis (API)** | vendor_candidate | api.publicapis.org DNS fail; only GitHub raw README works (catalog, not live API) |
| **FFC ADP** | approved_api | DNS resolution failure for api.fantasyfootballcalculator.com — may be transient |
| **The Odds API** | approved_api (paid) | 401 — requires paid subscription (incumbent, in production) |
| **TheRundown** | vendor_candidate | 200 on sports list but requires paid key for full access (incumbent) |

---

## Odds vs. Non-Odds Separation (HARD BOUNDARY)

### ❌ ODDS SOURCES (excluded from free map — require paid licenses)
- The Odds API (approved_api, paid, in production)
- TheRundown (vendor_candidate, paid)
- MySportsFeeds (vendor_candidate, paid, 401 without key)

### ✅ SCHEDULES / RESULTS / STATS SOURCES (free tier viable)
- nflverse (approved_open_license)
- ESPN Public API (approved_public_logged_off)
- Open-Meteo (approved_open_license) — weather, not sports scores
- Sleeper API (approved_public_logged_off) — fantasy platform data
- OpenLigaDB (approved_public_logged_off) — German soccer
- MLB Stats API (vendor_candidate, gated) — MLB schedules/stats
- TheSportsDB (vendor_candidate, gated) — multi-sport schedules/results
- football-data.org (vendor_candidate, gated) — soccer only
- nflverse (open dataset) — already in registry
- FFC ADP (approved_api) — fantasy ADP, DNS issue

---

## Registry Updates Needed

The following sources need entries added to `apps/web/lib/scraping/source-rights-registry.ts` before any automation:

1. **TheSportsDB** — add as `vendor_candidate` with free key=3, unlock_condition = written terms clearance
2. **MLB Stats API** — add as `vendor_candidate`, unlock_condition = terms review
3. **OpenLigaDB** — add as `approved_public_logged_off` (no key, German jurisdiction)
4. **football-data.org** — add as `vendor_candidate`, unlock_condition = free tier key + terms
5. **FFC ADP** — already in registry as `approved_api` but DNS needs investigation

---

## Summary for H-S Completion

- **Total candidates probed:** 14
- **Cleared for immediate use:** 5 (nflverse, ESPN, Open-Meteo, Sleeper, OpenLigaDB)
- **Gated (probed OK, needs registry promotion):** 3 (TheSportsDB, MLB Stats API, football-data.org)
- **Not cleared / failed:** 6 (MySportsFeeds, OrcaSports, public-apis API, FFC ADP DNS, The Odds API, TheRundown)
- **Odds sources properly separated:** YES — all 3 odds providers identified as paid/incumbent
- **Max 2 live calls per candidate:** YES — enforced
- **No signups / no credential creation:** YES — only public/free keys used
- **Source-rights classification per CLAUDE.md:** YES — mapped to registry statuses

Next: Add gated sources to registry, then H-S is complete.