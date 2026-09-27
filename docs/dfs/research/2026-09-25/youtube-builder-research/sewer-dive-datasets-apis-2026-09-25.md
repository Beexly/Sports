# SEWER DIVE — Datasets, APIs, Databases & Infrastructure Inventory

Date: 2026-09-25. From: Motif (4-track coordinator: GitHub deep, data/API inventory, social/blog/video, kernel tracing). For: Garrett + GSE engine.
Method: read-only (GitHub REST, web search, page fetch). No signups, no keys created, no writes anywhere.
Legend: **DIRECT** = observed in a tool result this pass. **INFERENCE** = reasonable read, flagged. Access: free / key-required / gated. **FRESH ✓** = new/updated on/after 2026-08-26.

Garrett's rule for this lane: learn from everything, produce our own output. Methodology is fair game; code reuse needs a license (marked per item).

---

## RANKED TOP 10 by plug-and-play value to GSE

1. **nflverse + nflreadpy ecosystem** — free NFL feature store (PBP 1999–, NGS, FTN charting, snap counts, injuries, contracts, depth charts). Automated nightly cadence, Sept-2026 commits. The spine. https://github.com/nflverse/nflverse-data · https://github.com/nflverse/nflreadpy (DIRECT, FRESH ✓, nflreadr MIT)
2. **sportsdataverse / cfbfastR scored CFB PBP** — 2004–present, ~2.2M plays, pre-scored EP/WP, weekly in-season republish. Closes GSE's CFB gap. https://github.com/sportsdataverse/cfbfastR-cfb-data (DIRECT, FRESH ✓ 2026-09-22, license unknown)
3. **PropLine** — prop settlement + line history/closing lines + Pinnacle-anchored no-vig fair lines + webhooks. Only candidate covering the prop-CLV gap. https://github.com/proplineapi/propline-mcp (DIRECT, FRESH ✓ 2026-09-21, key-required, ~1,000 req/day free tier, paid from $9/mo)
4. **ESPN undocumented feeds** — free, keyless live fallback (scoreboard, game packages, injuries, standings, ESPN predictor). Third-party docs poll every 5 min on game days. Unsupported — fallback, not spine. `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` (+ `/summary?event=`, `/injuries`, `/teams`, `/standings`; CDN `cdn.espn.com/core/nfl/...?xhr=1`) (DIRECT, FRESH ✓)
5. **Open-Meteo Previous Runs + NWS api.weather.gov** — the only verified leakage-safe weather stack: forecast vintages for backtests (ERA5 archive 5-day delay, ECMWF IFS 2017–), free live gridpoint forecasts. https://previous-runs-api.open-meteo.com/v1/forecast · https://api.weather.gov (DIRECT, FRESH ✓, free)
6. **Sleeper public NFL API** — free, no key: injury status/body part, practice participation, depth-chart order. `/v1/players/nfl` (DIRECT per 2026-09-17 audit, FRESH ✓)
7. **The Odds API** — already owned (20K credits/mo). Baseline for current lines; historical depth is the known gap. (Standing context, not a discovery.)
8. **greerreNFL/nfelodcm** — `pip install nfelodcm`: typed nflverse CSV loader with freshness SLAs. Drop-in data layer. https://github.com/greerreNFL/nfelodcm (DIRECT, pushed 2026-07-23, license unknown)
9. **oooshiny/nfl-data-api + ruthphilippe/nfl-nflverse-pipeline** — dimensional nflverse warehouse reference (325K snap rows, NGS tables, 889K roster rows, 725K depth-chart rows) + daily GH Actions → S3 partitioned parquet. Schema reference for GSE's own warehouse. (DIRECT; oooshiny FRESH ✓ 2026-09-22 weekly refresh, licenses unknown)
10. **JovaniPink/awesome-nfl-data** (MIT, pushed 2026-09-07) + **JacobiusMakes/awesome-sports-betting-data** (CC0, pushed 2026-09-05) — the two maintained indexes: NFL data sources/APIs/tools and odds APIs/historical datasets. Start every future search here.

---

## A. Core datasets & databases

### A1. nflverse data ecosystem
- URLs: https://github.com/nflverse/nflverse-data (releases) · loaders https://github.com/nflverse/nflreadpy (Python/Polars) · https://github.com/nflverse/nflreadr (R)
- Access: free (DIRECT). Cadence (DIRECT, from nflverse data schedule): PBP/player/team stats nightly after game days; FTN charting 00/06/12/18 UTC in season; rosters daily 07:00 UTC; NGS player-week nightly ~03:00–05:00 ET; PFR snap counts/advanced 00/06/12/18 UTC.
- Contents (DIRECT): PBP since 1999, weekly/season player stats, team stats, schedules, ID crosswalks, seasonal rosters (1920–) + weekly rosters (2002–), snap counts (2012–), NGS passing/rushing/receiving, FTN charting, participation, draft, injuries, OTC-derived contracts, officials, combine, depth charts, trades, FantasyPros rankings.
- Freshness: FRESH ✓ (nflreadpy 2026-09-09, nflfastR 2026-09-19, nflverse-pfr 2026-09-22, nflreadr 2026-09-16). License: nflreadr MIT (DIRECT); nflreadpy unknown.
- GSE fit: core feature store for everything.

### A2. sportsdataverse CFB pipeline (cfbfastR-cfb-data)
- URL: https://github.com/sportsdataverse/cfbfastR-cfb-data — free (DIRECT), FRESH ✓ 2026-09-22.
- 19 datasets / ~928 columns: ESPN CFB PBP (2004+), box scores, advanced stats, drives, rosters, betting data, schedules, FPI, injuries; FCS family included. License unknown.
- GSE fit: the CFB equivalent of nflverse.

### A3. sportsdataverse scored CFB model PBP
- URL: https://github.com/sportsdataverse/cfbfastr-cfb-data/blob/HEAD/docs/models/model_pbp.md — free (DIRECT), FRESH ✓ docs 2026-09-18.
- ~2.2M plays 2004–present, pre-scored EP, class probabilities, spread + naive WP, CPOE inputs, decision surfaces; athlete IDs added 2026-09-01. Weekly in-season republish. License unknown.
- GSE fit: saves building a CFB EP/WP stack; decision surfaces usable for 4th-down content.

### A4. oooshiny/nfl-data-api — dimensional warehouse reference
- URL: https://github.com/oooshiny/nfl-data-api — free public repo (DIRECT), weekly GH Actions refresh publishing `nfl.duckdb` (FRESH ✓ 2026-09-22). License unknown.
- GSE fit: copy the dimensional schema, not the data.

### A5. NFL Big Data Bowl 2026 tracking data
- Refs: https://github.com/zohebwaghu/nfl-big-data-bowl-2026-csi · Kaggle competition (gated).
- Pre-/post-throw tracking 2023–2024; ~4.9M rows, 272 games, ~14K plays. Frozen release.
- License: **CC BY-NC 4.0 (DIRECT) — non-commercial; cannot feed published picks or paid products.**
- GSE fit: research-only tracking micro-data (coverage efficiency, defender archetypes).

### A6. Hugging Face NFL candidates (thin verification)
- `keremberke/nfl-object-detection` — 9,947 helmet-annotation images, Public Domain (DIRECT), stale 2022. Vision experiments only.
- Candidates named (not independently verified): `afzalmengal/nfl-4th-downs-dataset`, `SebastianAndreu/24679_NFL_WR_Dataset_2025`, `Karmane/nfl-rest-advantage-travel-spot-research` (gated/paid), `Karmane/nfl-anytime-touchdown-parlay-usage-trends` (gated/paid).

### A7. Historical odds archives (consensus, NOT Pinnacle)
- Covers: https://www.covers.com/sportsoddshistory/nfl-game-season/?y=1990 — free, provenance unknown, do not treat as CLV.
- SBR 10-year: `flancast90/sportsbookreview-scraper` (MIT per research doc) → `nfl_archive_10Y.json`, consensus open/close spread+total. Frozen backfill.
- **Gap (DIRECT): no free trustworthy historical Pinnacle open+close NFL source found.**

### A8. Salary cap
- nflverse `load_contracts()` (OTC-derived) — current, free. jaydenpolansky/nfl-salary-cap-analysis — static 2011–2024, stale. GSE fit: use nflverse.

---

## B. Live APIs & feeds

### B1. ESPN undocumented (free, keyless, unsupported)
Endpoints (DIRECT): `site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`, `/summary?event={id}`, `/teams`, `/standings`, `/injuries`, `/news`; `sports.core.api.espn.com/v2/sports/football/leagues/nfl/athletes?limit=1000&active=true`; CDN `cdn.espn.com/core/nfl/scoreboard?xhr=1`, `/schedule?xhr=1&year=&week=`, `/playbyplay?xhr=1&gameId=`; CFB mirror under `/college-football/`. Canonical endpoint list: gist `nntrn/ee26cb2a0716de0947a0a4e9a157bc1c` (DIRECT, verified live 2026-09-25).
GSE fit: free live fallback for scores/injuries/standings.

### B2. MySportsFeeds — cheapest licensed fallback
- https://www.mysportsfeeds.com — key-required; 14-day trial; personal from $5/mo; commercial NFL CORE from $39/mo (DIRECT, docs current Sep 2026).
- Schedules, scores, boxscores, standings, PBP, lineups, injuries, DFS, odds; JSON/XML/CSV; v1.x + v2.0. Own crowd-sourced data operation.
- GSE fit: one-contract licensed fallback with injuries + DFS + odds.

### B3. Sleeper public API — free depth charts + injuries
- `/v1/players/nfl`: injury status/body part, practice participation, depth-chart order/position (DIRECT per 2026-09-17 audit, FRESH ✓). Free, no key.

### B4. FantasyPros public API — `https://api.fantasypros.com/public/v2/json`
- Injuries, news, crosswalks, rankings (DIRECT per 2026-09-17 research doc, FRESH ✓). Access likely key/paid — verify terms.

### B5. sportsdataverse-py — one Python surface for NFL + CFB loaders (wraps CFBD, ESPN CFB, Fox). Free. Updated 2026-09-17 (FRESH ✓).

### B6. Fox Sports bifrost — `https://api.foxsports.com/bifrost/v1` (event/matchup builders, NFL supported). Key-required (INFERENCE). ToS unknown — unofficial.
**Credential note:** the `lightning-dabbler/sportscrape` Go package's pkg.go.dev page exposes an API key. Location noted only; value NOT recorded.

### B7. PropLine — https://github.com/proplineapi/propline-mcp (FRESH ✓ 2026-09-21)
- Key-required; free tier ~1,000 req/day; paid from $9/mo (DIRECT). Prop settlement, line history/closing lines, Pinnacle-anchored no-vig fair lines, +EV signals, webhooks/WebSockets.
- GSE fit: the prop-CLV gap filler.

### B8. OddsPapi — https://v5.oddspapi.io/en — key-required; historical fixture odds claimed on free tier (single source — verify). (Garrett holds an account; unused this pass.)

### B9. Other vendor candidates (thin verification, from 7-day-old aggregator doc)
- SportsDataIO: 1,000 req/mo, **free-tier data partially randomized** — low value. API-Sports: 100 req/day each. Odds-API.io: 34 sports, 265+ books (unverified). Sports Game Odds: 55+ leagues, props, historical + settlement claimed (unverified). football-data.org: soccer-focused, low NFL value.

### B10. Weather — Open-Meteo + NWS (see Top 5 #5). The leakage-safe stack.

---

## C. Data-pipeline infrastructure patterns (GitHub, for GSE's own warehouse)

| Repo | Stack | License | Push |
|---|---|---|---|
| ayushnair2/Gridiron-Warehouse | Snowflake + dbt ELT, data-quality checks | MIT | 2026-09-23 |
| blahovec-labs/nfl-bigquery | nflverse → BigQuery, idempotent ingestion, LLM-friendly docs | MIT | 2026-09-16 |
| MattWenzel/NFLVERSE-DB | queryable SQLite from nflverse | MIT | 2026-06-18 |
| clausherther/nfl-dbt | dbt models on NFL PBP (reference impl) | Apache-2.0 | 2023-12-26 |
| ruthphilippe/nfl-nflverse-pipeline | daily GH Actions → S3 partitioned parquet + sklearn | none | 2025-10-07 |
| rdsciv/nfl-metabase-warehouse | nflverse → Postgres → Metabase | NOASSERTION | 2026-08-26 |
| gesmith0606/nfl_data_engineering | bronze→silver→gold, weekly + daily sentiment, 1,379 tests | none | 2026-09-17 |
| cbratkovics/fantasy-football-ai | nflverse + dbt + duckdb, as-of features | MIT | 2026-09-22 |

Code-search scale (DIRECT): "nflverse"+"parquet" 3,952 hits · "nflreadpy" 2,392 · "duckdb" 590 · "dbt" 256 · "airflow" 39.

---

## D. Publish-pipeline patterns worth stealing (observed across 15 builders)

1. **Tuesday is the industry rollover day** — TreMatt03 (Tue 11:00 UTC), Damepivot (Tue AM), GLASSBOX (Tue 09:00 UTC), sooth seal/grade (Wed 13:00 UTC), PriorLine retrain (Tue 1:00 ET), nfelo (Tue/Thu) — all keyed to MNF settling + nflverse publish.
2. **Immutable ledgers**: TreMatt03 commits `predictions_log.csv` back and refuses reruns that revise old calls; sooth's Merkle seal uses the git commit timestamp as the trust anchor.
3. **Sub-hourly GitHub cron is unreliable** — sooth's */30 cron delivered ~3 runs/day instead of 48 (documented 2026-08-28). Mitigations: odd-minute offsets, single-commit orphan branches, batched commits (Vercel 100/day cap).
4. **Free/paid capture on separate schedules** — sooth split ESPN (free, no backfill) from Odds API (paid, budgeted) so drained credits can never kill evidence.
5. **Cost ceilings as code** — `--max-credits 40`/run (sooth); 3-day window + restricted bookmakers (PriorLine).
6. **Odds API billing intel** (DIRECT): per event per market; **historical archive ~10x live rate** (PriorLine); ~1 req/run sustainable on 20K plan (GLASSBOX); ESPN odds blocks are **deleted at final whistle with no backfill** — capture pre-kickoff; Kalshi blocks browser-Origin requests (403) — proxy through a runner; nflverse `injuries` rebuilds daily 07:07 UTC, Friday designations land Saturday.

---

## E. Deployed public apps — honest result: 0 confirmed live at check time

- `nfl-model-final.onrender.com` (davidli33/nfl-model-final, FRESH ✓ 2026-09-18) — fetcher got HTTP 403 (likely bot-blocking; load-unverified, not dead). **Credential note:** README documents a default sign-in password — value NOT recorded; treat as insecure.
- HF Spaces `siddhantevre11/NFL` and `tanman37/nfl-injury-dashboard` — both returned "scheduling failure" runtime errors on 2026-09-25 (possibly HF infra; re-check later).
- A-Peoples/NFL_Play_Predictor → nflplaypredictor.streamlit.app (claimed live; not load-verified this pass).

## F. Notebooks & reports worth mining
- CFBD Starter Pack notebooks guide (cdn.collegefootballdata.com) — fastest CFB EPA on-ramp.
- "NFL Analytics with Python and R" book PDF — feature-stability methodology.
- nflWAR paper (degruyterbrill.com) — reproducible EP/WP/WAR + calibration.
- BDB 2026 CSI project (zohebwaghu) — tracking-derived coverage metrics (**CC BY-NC 4.0 — research only**).
- tejseth's RYOE xgboost gist (multi:softprob, 26 classes, 2010–2020) — companion writeup at mfootballanalytics.com.

---

## Open gaps for a follow-up pass
1. Prediction-market APIs (Polymarket Gamma, Kalshi) as market-implied inputs.
2. Historical Pinnacle open+close — no free source found.
3. Official NFL.com / Next Gen Stats restricted tracking access.
4. SportsDataIO / API-Sports / Odds-API.io / Sports Game Odds vendor verification.
5. ESPN ToS / commercial suitability of undocumented feeds.
6. Re-check D1–D3 app liveness.

*All claims tagged DIRECT/INFERENCE inline. Read-only throughout. Credential locations noted without values.*
