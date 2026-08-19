# DATA-CLEARANCE COVERAGE AUDIT — P5-13 (READ-ONLY)

**Task:** P5-13 — Systematic data-clearance coverage re-audit (READ-ONLY)
**Auditor:** Hermes (GSE sprint executor)
**Date:** 2026-08-15
**Scope:** For every `source_id` registered in `apps/web/lib/scraping/source-rights-registry.ts`, verify whether `checkClearance()` is called before the fetch in `apps/web/lib/data-sources/**` and `apps/web/lib/scraping/**`.
**Method:** Read the full source-rights-registry.ts (17 source_ids), then grep both directories for every source_id + `checkClearance` call sites. No files were modified.

## Coverage Table

| # | source_id | Registry status | Fetch site(s) in data-sources/** or scraping/** | checkClearance before fetch? | Verdict |
|---|-----------|-----------------|--------------------------------------------------|-------------------------------|---------|
| 1 | `nflverse` | approved_open_license | `ingestion/player-stats.ts:68`, `ingestion/depth-charts.ts:46`, `ingestion/next-gen-stats.ts:124`, `ingestion/historical-games.ts:43`, `ingestion/injuries.ts:40`, `ingestion/rush-tendencies.ts:51`, `ingestion/snap-counts.ts:42`, `ingestion/team-efficiency.ts:77`, `ingestion/team-week-stats.ts:87`, `nflverse/pressure-coverage.ts:183`, `nflverse/usage-pulse.ts:229`, `nflverse/birthday-usage-trend.ts`, `nflverse/qb-age-rb-trend.ts` | **YES** — all ingestion paths call `nflverseIngestionGate(now)` (defined in `ingestion/nflverse-gate.ts:16`) which calls `checkClearance({ source_id: "nflverse", ... })` before any fetch. The `data-sources/nflverse.ts` adapter functions (`fetchNflversePlayerStats`, etc.) are leaf functions with no gate, but they are never called directly in production — only through the gated ingestion paths. | PASS |
| 2 | `pfr-advstats-via-nflverse` | permission_required | `ingestion/pfr-adv-stats.ts:125`, `intelligence/pressure-coverage.ts:183`, `intelligence/rushing-contact.ts:112` | **YES** — every path calls `checkClearance({ source_id: "pfr-advstats-via-nflverse", ... })` before fetching. | PASS |
| 3 | `open-meteo` | approved_open_license | `data-sources/free-first-ingest.ts:147` (`fetchWeather`) | **NO** — `fetchWeatherFreeFirst` calls `fetchWeather(latitude, longitude, opts)` at line 147 with no preceding `checkClearance({ source_id: "open-meteo", ... })` call. The source is approved but the fetch is ungated. See GSE-SEC-076. | FAIL |
| 4 | `espn-public-api` | approved_public_logged_off | `data-sources/free-first-ingest.ts:117` (`fetchEspnScoreboard`), `data-sources/multi-source-scores.ts:106,218,386` (`fetchEspnForDates` → `fetchEspnScoreboard`), `data-sources/free-adapters/espn-scores.ts:141` (leaf), `espn-standings.ts`, `espn-rankings.ts`, `espn-boxscore.ts` (leaf, unused) | **PARTIAL** — `free-first-ingest.ts:99-116` gates the ESPN fetch with `checkClearance({ source_id: "espn-public-api", intents: ["derived_analytics"] })`. However, `multi-source-scores.ts:106,218,386` calls `fetchEspnScoreboard` / `fetchEspnForDates` WITHOUT any `checkClearance` call before the fetch. These paths are reachable via `free-score-persist.ts:179` (`fetchScoresMultiSource`). See GSE-SEC-078. | PARTIAL |
| 5 | `sleeper-api` | approved_public_logged_off | `sleeper/market-signal.ts:122-127` (`loadSleeperMarketSignal`), `integrations/sleeper.ts:275-280` (`loadSleeperTrending`) | **PARTIAL** — both reader functions call `assertIngestible("sleeper")` (from `@sports/data-ingestion` source-registry) before fetching. However, this is a compile/registration gate, NOT a runtime `checkClearance()` call against `source-rights-registry.ts`. The leaf adapter `sleeper/source.ts` (`fetchSleeperPlayers`, `fetchSleeperTrendingEntries`) has no gate at all — the gate lives in each reader (by design, per the module comment). The two source registries (`@sports/data-ingestion` SOURCE_REGISTRY vs `scraping/source-rights-registry.ts`) are separate, meaning a rights change in one would not be enforced at the fetch site. See GSE-SEC-079. | PARTIAL |
| 6 | `ffverse-ffopportunity` | approved_open_license | `intelligence/expected-points.ts:203`, `intelligence/expected-points-display.ts:96` | **YES** — `loadExpectedPoints` calls `checkClearance({ source_id: "ffverse-ffopportunity", ... })` before fetch. The display boundary (`expected-points-display.ts:40`) calls `checkClearance` with `intents: ["commercial_display", ...]` before delegating to the loader. | PASS |
| 7 | `ffc-adp` | approved_open_license | `fantasy/adp-source.ts:229` (`fetchFfcAdp`) | **YES** — `checkClearance({ source_id: "ffc-adp", ... })` called at line 229 before `fetcher(url)` at line 250. | PASS |
| 8 | `the-odds-api` | approved_api | `process-sport.ts:253` (`client.getOdds`), `settle-sport.ts:178` (`client.getScores`), `packages/data-ingestion/src/odds-provider-adapter.ts:127` (`this.client.getOdds`) | **NO** — none of the three fetch sites call `checkClearance({ source_id: "the-odds-api", ... })` before fetching. `process-sport.ts:251` and `settle-sport.ts:171` call `paidCallJustified(need, sport.key)` which is a **spend guard** (`source-router.ts`), not a rights/clearance check. `odds-provider-adapter.ts:127` has no guard at all. See GSE-SEC-077. | FAIL |
| 9 | `scores24-live` | permission_required | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 10 | `fpl-api` | permission_required | `data-sources/free-adapters/fpl.ts:150` (`fetchFplSnapshot`) | **NO** — the adapter exists and calls `getJson` / `fetch` without any `checkClearance` or `assertIngestible("fpl-api")` gate. However, it has zero callers in production code (grep confirms only the definition exists, no imports). The adapter is a verified-but-not-yet-wired stub. See GSE-SEC-080. | FAIL (defensive — no production caller) |
| 11 | `fantasypros-com` | permission_required | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 12 | `score24-com` | vendor_candidate | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 13 | `jeff-mans-one-mans-opinion` | vendor_candidate | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 14 | `collegefootballdata` | vendor_candidate | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 15 | `siriusxm-streaming` | permission_required | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 16 | `jeff-mans-weekly-show` | manual_research_only | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |
| 17 | `siriusxm-activator` | excluded | **none** (no fetch site in scope) | N/A | PASS (no fetch site) |

## Already-fixed gaps (from this session)

Per the task brief, three gaps of this exact bug class were already found and fixed earlier in this session:

| Finding | Source | Fix applied | Status |
|---------|--------|-------------|--------|
| GSE-SEC-049 | `pfr-advstats-via-nflverse` ingested under nflverse blanket | Added PFR-specific `checkClearance` gate in `pfr-adv-stats.ts:125`, `pressure-coverage.ts:183`, `rushing-contact.ts:112` | Fixed |
| GSE-SEC-050 | Unregistered secondary score sources (henrygd, mlb, balldontlie, nhl) fetched without clearance | Added `checkSecondaryClearance()` gate in `multi-source-scores.ts:137-143` before each secondary fetch | Fixed |
| GSE-SEC-051 | ESPN scores stored despite `storage_allowed=false` | Added `checkClearance({ intents: ["storage"] })` gate in `free-score-persist.ts:216` before DB write; narrowed intent in `free-first-ingest.ts:99-116` to `derived_analytics` only | Fixed |

## New gaps found (not among the 3 already fixed)

| New Finding | Source | Gap | See |
|-------------|--------|-----|-----|
| GSE-SEC-076 | `open-meteo` | `fetchWeatherFreeFirst` in `free-first-ingest.ts:147` calls `fetchWeather` without `checkClearance` | § GSE-SEC-076 |
| GSE-SEC-077 | `the-odds-api` | Three fetch sites in `process-sport.ts:253`, `settle-sport.ts:178`, `odds-provider-adapter.ts:127` — no `checkClearance`; only spend guard | § GSE-SEC-077 |
| GSE-SEC-078 | `espn-public-api` | `multi-source-scores.ts` fetch sites (lines 106, 218, 386) bypass `checkClearance` that `free-first-ingest.ts` has | § GSE-SEC-078 |
| GSE-SEC-079 | `sleeper-api` | Uses `assertIngestible` (registration gate) instead of runtime `checkClearance` against source-rights-registry; two separate registries drift | § GSE-SEC-079 |
| GSE-SEC-080 | `fpl-api` | Adapter `free-adapters/fpl.ts:150` fetches without any gate; no production caller | § GSE-SEC-080 |

## Summary

- 17 source_ids in the registry.
- 7 have NO fetch site in scope (candidates/vendors not yet wired) → trivially no gap.
- 10 have fetch sites.
- 3 already fixed (049/050/051).
- 4 still PASS cleanly (nflverse, pfr-advstats, ffverse-ffopportunity, ffc-adp).
- **3 FAIL** (open-meteo, the-odds-api, fpl-api) + **1 PARTIAL** (espn-public-api) + **1 PARTIAL** (sleeper-api) = **6 findings** (GSE-SEC-076 through GSE-SEC-080, though 076/077/078/080/079 are 5 findings).
