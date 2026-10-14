# Ingestion Coverage — 2026-10-13

**Deliverable:** code-verified inventory of every ingestion path currently live in `C:\Users\Garrett\Sports`,
plus a candidate roster of everything-else worth wiring, the ten immediate wins with exact commands,
and an honest risk list.

**Mandate:** Omnirvorous Signal Ingestion (P2).
**Branch:** `fix/galaxy-odds-first-2026-10-08` · HEAD `8ec003f62` (Tue Oct 13 14:58:04 2026 -0500).
**Author:** agent session, 2026-10-13. No production writes were made while producing this document.

---

## 0. How to read this document

Every factual claim carries a marker:

- **[V]** — verified in this session by running a command against the repo or the live web; the command is
  reproduced in Appendix A and its output is quoted inline.
- **[U]** — unverified, inherited from documentation/comments/other branches, or a proposal. Treated as a
  lead, not a fact. Nothing in this document is asserted as measured unless it is marked [V].

Law 1/Law 4 discipline applies: where the repo's own comments and the repo's actual state disagree, this
document reports the **state**, and flags the comment as drift.

---

## 1. Method and evidence base

| Step | What was done | Evidence |
|---|---|---|
| 1 | Enumerated every cron route and every declared schedule | `apps/web/app/api/cron/` (37 dirs) vs `vercel.json` + `apps/web/vercel.json` (31 `crons[]` entries each) **[V]** |
| 2 | Enumerated every ingestion module and its callers | `apps/web/lib/ingestion/*.ts` export list + `grep -rn` for callers **[V]** |
| 3 | Enumerated every free adapter and the free-first router | `apps/web/lib/data-sources/free-adapters/*.ts` (10 files) + `free-first-ingest.ts` **[V]** |
| 4 | Enumerated the news wire roster and its only caller | `apps/web/lib/news/reporter-roster.ts` + `wire-store.ts` **[V]** |
| 5 | Enumerated rights/clearance gates | `apps/web/lib/scraping/source-rights-registry.ts` (18 entries), `ingestion-source-clearance.mjs` guardrail **[V]** |
| 6 | Measured what actually landed today | `brain/feeds/2026-10-13/trainer_feed.jsonl`, `.mind_guardian/ledger.json`, `brain/local_vault/2026-10-13/`, `intelligence/voice_brain/memory.db` **[V]** |
| 7 | Probed robots.txt for 15 candidate hosts | `docs/data-sources/research/2026-10-13/robots-probe/robots-2026-10-13.txt` **[V]** |
| 8 | Piloted the PFR replacement via Firecrawl | `docs/data-sources/research/2026-10-13/thesportsdb-pilot/` **[V]** |

---

## 2. Inventory — every ingestion path currently in the repo, grouped by trigger

### Trigger A — Vercel cron (`vercel.json` + `apps/web/vercel.json`)

31 scheduled entries, mirrored in both files. 37 route directories exist under `apps/web/app/api/cron/`;
**7 routes are not referenced by any schedule** (see Trigger G). **[V]**

| Schedule | Route | What it ingests | Lands in |
|---|---|---|---|
| `*/15 * * * *` | `/api/cron/refresh-odds` | The Odds API — all sports, live lines | odds tables |
| `2,17,32,47 * * * *` | `/api/cron/board-fill` | ESPN seed + odds + signals composite | board surfaces |
| `20 * * * *` | `/api/cron/settle-picks` | final scores → settlement | pick settlement |
| `15 */3 * * *` | `/api/cron/deliver-settlement-alerts` | settlement notifications | outbox |
| `0 9 * * *` | `/api/cron/ingest-player-stats` | nflverse `player_stats_week`, one season per run, trend-window backfill | `Player` / `PlayerGameStat` |
| `0,30 * * * *` | `/api/cron/refresh-player-stats` | nflverse weekly stats; `?mode=full` adds snaps, injuries, depth, NGS | `PlayerGameStat`, `Injury`, `DepthChartEntry`, `signals` |
| `15 7 * * *` | `/api/cron/backfill-team-efficiency` | nflverse team-week stats → efficiency | team efficiency tables |
| `10 */4 * * *` | `/api/cron/backfill-independent-trueprob` | independent probability backfill | trueProb ledger |
| `30 11 * * 3` | `/api/cron/ngs-ingest` | nflverse NGS receiving/rushing/passing | `signals` keyed by `gsisId` |
| `10 6,12,18 * * *` | `/api/cron/game-weather-capture` | NWS per-venue game weather (writer for `loadNflGameWeather`) | weather store |
| `20 6,12,18 * * *` | `/api/cron/prediction-market-snapshot` | Kalshi/Polymarket snapshots | market snapshot |
| `0 */2 * * *` | `/api/cron/free-spine-health` | free score chains + freeCoverage probe; writes `IngestionRun SUCCESS` | `IngestionRun`, free-spine cache |
| `*/15 * * * *` | `/api/cron/health-alert` | health SLA alerts | alerts |
| `7,22,37,52 * * * *` | `/api/cron/autonomy-cycle` | I9 plan→act loop (dry-run unless flagged) | autonomy ledger |
| `41 * * * *` | `/api/cron/arbiter-adjudication` | stale-pick adjudication | adjudication |
| `23 * * * *` | `/api/cron/signal-ledger-write` | signal ledger writes | signal ledger |
| `25 * * * *` | `/api/cron/props-slate-shadow` | player-prop slate shadow | props shadow |
| `55 * * * *` | `/api/cron/engine-dfs-slate` | DFS slate engine | DFS surfaces |
| `*/10 * * * *` | `/api/cron/watch-scheduler` | watchlist evaluation | watchlist |
| `*/3 * * * *` | `/api/cron/watch-warm` | watch warm path | watchlist |
| `15 * * * *` | `/api/cron/jarvis-snapshot` | Jarvis memory snapshot | `JarvisMemoryEvent` |
| `30 9 * * *` | `/api/cron/hydrate-cold-plane` | cold-plane hydration | cold plane |
| `45 * * * *` | `/api/cron/reconcile-entitlements` | entitlement reconcile | entitlements |
| `30 6 * * *` | `/api/cron/prune-rate-limits` | rate-limit pruning | — |
| `50 * * * *` | `/api/cron/repair-checkout-attempts` | checkout repair | — |
| `45 9 * * *` | `/api/cron/run-formal-receipt` | formal receipt run | formal layer |
| `* * * * *` (ops route) | `/api/ops/daily-truth` | daily truth recompute | truth store |

Every route authenticates with `CRON_SECRET` (`cronAuthError` from `@/lib/cron/authorize`) and gates writes
behind readiness checks. **[V]**

### Trigger B — GitHub Actions scheduler (`.github/workflows/external-cron.yml`)

9 jobs hitting production over HTTP with the same bearer token. **[V]**

`free-spine-health` · `refresh-player-stats` · `refresh-odds` · `settle-picks` · `autonomy-cycle` ·
`jarvis-snapshot` · `board-fill` · `generate-signal-slate` · `backfill-independent-trueprob`

> **Load-bearing caveat, quoted from the file's own header:** "PRODUCTION SCHEDULER SoT (2026-08-10):
> **Vercel-only** until private-repo GitHub Actions minutes / billing are restored. This workflow may sit
> idle (no runners) — that is accepted, not a bug." **[V]**
>
> Consequence: this workflow is a *contingent* ingestion path. Any coverage claim that leans on it is
> conditional on Actions minutes existing. See risk G7.

### Trigger C — Local daemon: Mind Guardian (`scripts/ops/mind_guardian_daemon.py`, 497 lines) **[V]**

The only path that ingests *arbitrary files* rather than structured feeds.

| Property | Value |
|---|---|
| Watch roots | `~/Downloads`, `~/.hermes` (lines 241, 243), plus repo dirs; docstring line 6 names "Downloads / data-snapshots / .hermes" |
| Buckets | canonical tuple at line 50 — `dfs, engine, data-sources, arxiv-program, …`; `DEFAULT_BUCKET = "engine"` (line 59) |
| Classifier | `_BUCKET_KEYWORDS` (line 135) → compiled regexes (line 166) → deterministic first-wins tie-break (line 190) |
| Extension gate | `SUPPORTED_EXTS = {".txt",".md",".json",".csv",".docx",".pdf"}` (line 61) |
| Landing | `docs/<bucket>/research/<YYYY-MM-DD>/<filename>` (line 339 pattern) |
| Feed write | appends `{"sha256","text","path","bucket","source"}` to `brain/feeds/<date>/trainer_feed.jsonl` |
| Dedupe | content-hash ledger at `.mind_guardian/ledger.json` (`{"hashes": {sha: {...}}}`) |
| Sensitive path | `is_sensitive()` → copy to `brain/local_vault/<date>/`, **no feed row, no memory index** |
| Memory | optional SQLite FTS5 (`facts` + `facts_fts`) |
| Tests | `scripts/ops/test_mind_guardian.py` — 30 test functions **[V]** |
| Invocation | `python scripts/ops/mind_guardian_daemon.py --once` (or `--watch --interval 30`) |

### Trigger D — Local one-shot feed builders (`brain/feeds/`)

| Script | State |
|---|---|
| `brain/feeds/append_day_feed.py` | Working. 12 rows of today's feed carry its `appended_by` marker. **[V]** |
| `brain/feeds/prepare_feed.py` | **Stale — hardcoded to `2026-10-11`** (line 3 output path; lines 10–12 input dirs). It writes to a date that is already past and whose feed file no longer exists. **[V]** |

### Trigger E — Agent research streams (repo-as-ingest)

| Stream | Commits | Landing target | State |
|---|---|---|---|
| `x-intel` | 25 commits, newest `x-intel: 2026-10-13 09:08 morning analytics run …` | `docs/research/<date>/full-tables/*.csv` (e.g. `gridironinfo-week5-drive-outcomes.csv`, `fantasyptsdata-advanced-receiving-3yr-yprr-tprr.csv`) | **Active** **[V]** |
| `ingest-queue` | 145 commits exist **across branches**, 0 reachable from the current branch | `docs/research/2026-10-03/engine-plan/ingest-queue/` | **Not in the working tree** — invisible to Guardian and to `prepare_feed.py` **[V]** |

### Trigger F — Free spine (no-key HTTP chains)

`apps/web/lib/data-sources/free-first-ingest.ts` + 10 adapters: `espn-scores`, `espn-standings`,
`espn-rankings`, `espn-boxscore`, `henrygd-ncaa`, `open-meteo`, `mlb-statsapi`, `nhl-web-api`,
`balldontlie-nba`, `fpl`. Exercised on demand by `scripts/free-ingest-smoke.mjs` (`npm run free:doctor`),
and continuously by `/api/cron/free-spine-health`. **[V]**

### Trigger G — Routes that exist but are NOT scheduled

`backfill-historical-games` · `backfill-player-data` · `backtest-calibration` · `feature-recipe-backtest` ·
`gamma` · **`refresh-wire`** · `signal-ledger-census`

`refresh-wire` is the interesting one: `wire-store.ts:507 refreshWireFromRoster()` is called **only** from
`apps/web/app/api/cron/refresh-wire/route.ts:41`, and that route appears in **neither** `vercel.json`
schedule list. The ~100-feed reporter roster therefore has **no automatic trigger**. **[V]** — risk G2.

### Trigger H — Already-landed local drops (2026-10-13)

`docs/data-sources/research/2026-10-13/` currently holds: `weather-pilot/` (`ingest_stadium_weather.py`,
`weather-stadium-pilot.json` 68,784 B), `injuries/` (`espn_nfl_injuries_week6.json` 173,345 B), `kalshi/`
(`ingest_kalshi_nfl.py`, `kalshi-nfl-digest.json`), `news-rss/` (`espn_nfl.xml`, `google_news_nfl.xml`,
`google_news_nfl_injury.xml`, `ingest_news_rss.py`), `news-espn/` (`espn-nfl-news-digest.json`,
`ingest_espn_news.py`), `robots-probe/`, `thesportsdb-pilot/`, plus empty `cognitive/`. **[V]**

---

## 3. What actually landed today (measured, not assumed)

| Measure | Value | Note |
|---|---|---|
| `brain/feeds/2026-10-13/trainer_feed.jsonl` | **3,842 rows**, 231,133,900 bytes | 3,830 Guardian-shaped rows + 12 `append_day_feed` rows **[V]** |
| Distinct `sha256` in that feed | **722** | i.e. **~5.3× duplication**; worst offender repeated **40×** across 10 distinct source paths **[V]** |
| Feed row sources | `Downloads` 3,040 · repo-internal 790 | single biggest contributor: `data\snapshots\eyi_package\workspace` (704 rows) **[V]** |
| Bucket distribution | predictions 1,530 · engine 1,242 · data-sources 352 · dfs 320 · arxiv-program 224 · fantasy 136 · props 26 · none 12 | **[V]** |
| Total extracted text | ~214.3 M characters | ~214 MB of text sitting in one JSONL **[V]** |
| `.mind_guardian/ledger.json` | **117 entries**, 37,815 B, mtime 15:05 | all 117 have `bucket: null` and `sensitive: true` **[V]** |
| Ledger ↔ feed overlap | **0** | feed shas not in ledger: 722; ledger shas not in feed: 117 **[V]** |
| `brain/local_vault/2026-10-13/` | **117 files** | filenames are largely arXiv IDs (`2304.06489v1.pdf`, `2512.19551v1.pdf`, …) **[V]** |
| `intelligence/voice_brain/memory.db` | `facts` **13** rows, `facts_fts` **13** rows | domains: user_taught 5, doctrine 3, then 1 each for sports/identity/fleet/credentials/budget — **no ingest domain at all** **[V]** |
| `brain/feeds/2026-10-11/` | only `EXCLUDED.md`; **no `trainer_feed.jsonl`** | `prepare_feed.py`'s hardcoded target no longer exists **[V]** |

Two findings fall straight out of this table and both are risks:

1. **Dedupe is not functioning end-to-end.** The daemon's docstring promises content-hash dedupe; the feed
   contains 3,842 rows for 722 distinct documents, and **none** of the feed's hashes appear in the ledger.
   The ledger and the feed describe different worlds. → G3.
2. **The "sensitive" classifier is swallowing research.** 117/117 ledger entries were classified sensitive
   and routed to the vault; the vault's contents are overwhelmingly arXiv PDFs. Ordinary papers are being
   diverted out of the feed and out of the memory index. → G4, G5.

---

### 3.5 LineStar usage surfaces — `GetSnapCounts` and `GetRedZoneStats` [V VERIFIED-LIVE]

Both routes were probed live on 2026-10-13 against the anonymous LineStar API and **both returned
`200 OK` with real player-level payloads**. This closes gap G-LS-2 ("usage basis absent"); the routes
named in the earlier LineStar capture note as UNVERIFIED are now verified for these two.

| endpoint | status | bytes | top-level keys | teams returned | rows | raw evidence |
|---|---|---|---|---|---|---|
| `GetSnapCounts?periodId=412&site=1&sport=1` | **200** | 39,946 | `SnapCounts`, `Teams` | 2 (IND 89, LAR 75) | **64** | `linestar/raw_GetSnapCounts.json` |
| `GetRedZoneStats?periodId=412&site=1&sport=1` | **200** | 36,747 | `RedZoneStats`, `Teams` | 2 (SF 95, CHI 77) | **65** | `linestar/raw_GetRedZoneStats.json` |

Digest: `docs/data-sources/research/2026-10-13/linestar/linestar_usage_surfaces_2026-10-13.json`
(both payloads verbatim, key list, team map, row counts). Auth: **anonymous — no login, no key, no cookies.**

**Schema — `GetSnapCounts` row keys [V]:**
`PlayerId, Name, Position, StartingPosition, DepthOrder, TeamId, TeamSnapsSeason, TeamSnapsLast4Weeks,
TeamSnapsLastWeek, SnapsSeason, Snaps4wk, Snaps1wk, TgtSeason, Tgt4wk, Tgt1wk, RecSeason, Rec4wk, Rec1wk,
CarSeason, Car4wk, Car1wk, Sps{Season,4wk,1wk}{Reg,Arc}, Fpps{Season,4wk,1wk}{Reg,Arc}, PctChgLastWk`

**Units caveat — read this before wiring [V]:** the `Snaps*` fields are raw snap **counts** (e.g. Keenan
Allen `Snaps4wk=117` against `TeamSnapsLast4Weeks=273`), while `Tgt*`, `Rec*`, `Car*` are already **shares**
in [0,1] (Keenan Allen `Tgt4wk=0.188`). Snap share must be computed as `Snaps4wk / TeamSnapsLast4Weeks`,
not read from the field. Mislabeling the count as a share is a live risk — it was made once during the
first pass and corrected here.

**Schema — `GetRedZoneStats` row keys [V]:**
`PlayerId, Name, Position, StartingPosition, DepthOrder, TeamId, Height, Weight,
Pass{ATT,COMP,TD,INT,YD}{2,4,8}, Rec{2,4,8}, Tgt{2,4,8}, RecTD{2,4,8}, RecYD{2,4,8},
Rush{ATT,TD,YD}{2,4,8}` — i.e. red-zone volume and production in **2/4/8-week windows**, split
pass/rec/rush. This is the TD-prop predictor the prop models were approximating.

**Coverage limit — honest [V]:** each call returns **one game**, not the slate. `GetRedZoneStats` moves with
`periodId` (409→JAX/SF, 410→CIN/GB, 411→CLE/CIN, 412→SF/CHI), but `GetSnapCounts` returned the **same**
IND/LAR pair for 409, 410, 411 and 412 while row count shifted (66, 66, 64, 64) — so its game selector is
**not** `periodId` and its semantics are **UNVERIFIED**. Do not treat either feed as slate-wide: to cover a
16-game slate you must discover the selector per game. A bulk scan of ~94 period ids returned 94 distinct
team pairs, which is the current best-known enumeration path.

**Signal mapping [V]** — both are third-party published usage, so they land `REPORTED`, domain `dfs`
(not `MEASURED`; we did not measure the snaps):

| payload field | Signal metric | direction |
|---|---|---|
| `Snaps4wk / TeamSnapsLast4Weeks` | `snap_share_4wk` | above positional baseline → supports route/volume hypothesis |
| `Tgt4wk` | `target_share_4wk` | above baseline → supports target-volume and ceiling hypothesis |
| `Rec4wk`, `Car4wk` | `reception_share_4wk`, `carry_share_4wk` | as above |
| `Fpps4wkReg` | `fpps_per_route_4wk` | efficiency; gate on snap share so a 5-snap player cannot headline |
| `RushATT4`, `RushTD4`, `Tgt4`, `RecTD4` | `rz_rush_attempts_4wk`, `rz_rush_td_4wk`, `rz_targets_4wk`, `rz_rec_td_4wk` | **the strongest TD-prop prior available keyless** |

Provenance for every row: the endpoint URL + `PlayerId` + `generated_utc`. `PlayerId` is LineStar's own id —
join to repo feeds via name+team until a crosswalk exists (named gap, not silently bridged).

## 4. Candidate roster — "everything under the sun" (59 sources)

Legend for **Rights/robots**: `OK` = robots permits and registry/licence is clear · `GATE` = robots permits
but rights/permission unresolved · `BLOCK` = robots forbids automated access · `PAID` = commercial licence or
subscription required · `N/A` = not applicable (local path).

### A. NFL & NCAA structured facts

| # | Source | Signal it gives | Access path | Rights/robots | Landing target | Cost |
|---|---|---|---|---|---|---|
| 1 | nflverse-data releases | pbp, player_stats_week, snap_counts, depth_charts, injuries, rosters, schedules | GitHub release assets / nflverse loaders | `OK` — CC-BY-4.0, registry `nflverse` approved | `Player`, `PlayerGameStat`, `Injury`, `DepthChartEntry` via `apps/web/lib/ingestion/*` | Free |
| 2 | nflverse NGS | separation, RYOE/att, CPOE | nflverse NGS assets | `OK` — CC-BY-4.0 | `signals` keyed by `gsisId` (existing `ngs-ingest` cron) | Free |
| 3 | nflverse `pfr_advstats` | PFR-derived advanced stats redistributed by nflverse | nflverse asset | **`GATE`** — registry `pfr-advstats-via-nflverse` is `permission_required`, `automation_allowed:false` | *(blocked)* | — |
| 4 | ffverse `ffopportunity` | expected opportunity / xFP components | GitHub release | `OK` — registry `ffverse-ffopportunity` | fantasy opportunity tables | Free |
| 5 | **Pro Football Reference, direct** | charting, advanced splits | `pro-football-reference.com/football/*` | **`BLOCK`** — `User-agent: * Disallow: /football/` | **do not ingest** | — |
| 6 | Sports-Reference family (non-PFR paths) | CBB/CFB boxscores etc. | `sports-reference.com/*` | `GATE` — `Disallow: /bb/`, `/cfb/search.cgi`, splits paths; football routes to PFR | candidate only | Free |
| 7 | ESPN public API | scores, standings, rankings, boxscores | `site.api.espn.com/apis/…` | `GATE` — robots 403 on `/robots.txt`; registry `espn-public-api` allows automation but **commercial display not allowed — "fallback only, rate-limit aggressively"** | free-first adapters | Free |
| 8 | ESPN injuries feed | weekly injury designations | ESPN JSON | `GATE` — same registry constraint | `docs/data-sources/research/…/injuries/` then `Injury` | Free |
| 9 | ESPN team-blog RSS | team beat posts | `espn.com/blog/<slug>/rss` | **dead** — verified dead 2026-09-15 per `reporter-roster.ts` comment | none | Free |
| 10 | Club official news RSS (32 teams) | roster moves, pressers | `reporter-roster.ts` `club()` entries | `OK` — public RSS, ~100 feeds | `WireItem` via wire store | Free |
| 11 | TheSportsDB | team/venue metadata + **ESPN id crosswalk** | `thesportsdb.com/api/v1/json/…`, league pages | `GATE` — robots `Allow: /` but `Content-Signal: ai-train=no`; **no registry entry yet** | `docs/data-sources/research/<date>/thesportsdb-pilot/` | Free tier |
| 12 | Sleeper API | players, leagues, trending adds | `api.sleeper.app/v1/…` | `OK` — registry `sleeper-api` | fantasy tables | Free |
| 13 | Fantasy Football Calculator | ADP | `fantasyfootballcalculator.com` API | `OK` — registry `ffc-adp`, `automation_allowed:true` | ADP tables | Free |
| 14 | FantasyPros | rankings, projections | site/API | `GATE` — registry `fantasypros-com`, licence required | candidate | Paid |
| 15 | CollegeFootballData (CFBD) | CFB plays, ratings, recruiting | `api.collegefootballdata.com` | `GATE` — registry `collegefootballdata`, automation not yet allowed | candidate | Free tier |
| 16 | SportsDataverse archives | historical CFB/CBB archives | GitHub / archive buckets | `GATE` — candidate id `sportsdataverse-archives` | candidate | Free |
| 17 | Commercial multi-sport APIs | Sportradar, SportsDataIO, SportsGameOdds, TheRundown, BigBalls, SharpAPI, Highlightly, Rolling Insights, StoryStats | vendor endpoints | `PAID` — all present as candidates in `sports-data-candidates.ts` | candidate | Paid |
| 18 | MLB StatsAPI | MLB games, lineups | `statsapi.mlb.com` | `GATE` — registry `mlb-statsapi` `permission_required`, automation false | free adapter exists | Free |
| 19 | NHL Web API | NHL schedules, boxscores | `api-web.nhle.com` | `GATE` | free adapter exists | Free |
| 20 | balldontlie (NBA) | NBA games/players | `api.balldontlie.io` | `GATE` | free adapter exists | Free tier |
| 21 | Fantasy Premier League API | FPL data | `fantasy.premierleague.com/api` | `GATE` — registry `fpl-api` | free adapter exists | Free |

### B. Weather, venue & environment

| # | Source | Signal | Access | Rights/robots | Landing | Cost |
|---|---|---|---|---|---|---|
| 22 | NWS `api.weather.gov` | per-venue game weather | JSON API | `GATE` — **robots says `Disallow: /`**; it is a documented public API but the robots signal contradicts our use | `game-weather-capture` cron | Free |
| 23 | Open-Meteo | stadium weather backfill | `open-meteo.com` | `OK` — registry `open-meteo`, `approved_open_license`, `Allow: /` | `weather-pilot/weather-stadium-pilot.json` | Free |
| 24 | NOAA SWPC | space weather / GPS-adjacent | JSON API | `OK` [U] | candidate | Free |
| 25 | OpenAQ | air quality by venue city | API | `OK` [U] | candidate | Free |
| 26 | Venue metadata (TheSportsDB venues, Wikipedia) | stadium geometry, roof type, altitude | API / dump | `GATE` | candidate | Free |
| 27 | USGS earthquake feed | geophysical nuisance events | GeoJSON | `OK` [U] | candidate | Free |

### C. News, voice & social

| # | Source | Signal | Access | Rights/robots | Landing | Cost |
|---|---|---|---|---|---|---|
| 28 | ESPN NFL news digest | league news | ESPN JSON | `GATE` | `news-espn/espn-nfl-news-digest.json` **[V]** | Free |
| 29 | Google News RSS per-team | beat aggregation | `news.google.com/rss/search?q=…` | `GATE` — aggregator terms | `news-rss/google_news_nfl*.xml` **[V]** | Free |
| 30 | ProFootballTalk (NBC) | fast league news | `profootballtalk.nbcsports.com/feed/` | `OK` — in reporter roster **[V]** | wire store | Free |
| 31 | PFF feed + PFF grades | grades, analysis | `pff.com/feed`; site | `OK` for feed; **grades are paywalled**; robots blocks `/partners/`, `/amember/`, `/login*` | wire store | Free/Paid |
| 32 | SharpFootballAnalysis | scheme analysis | `sharpfootballanalysis.com/feed` | `OK` **[V]** | wire store | Free |
| 33 | GalaxySportsEdge journal | own-surface posts | `galaxysportsedge.com/journal/rss.xml` | `OK` **[V]** | wire store | Free |
| 34 | Substack beat writers | independent beat reporting | `<writer>.substack.com/feed` | `OK` — public RSS **[V]** | wire store | Free |
| 35 | Bluesky profile RSS | reporter posts | `bsky.app/profile/<handle>/rss` | `OK` **[V]** | wire store | Free |
| 36 | **Reddit** | fan/beat signal | `reddit.com/*` | **`BLOCK`** — `User-agent: * Disallow: /`; needs official API/OAuth per Public Content Policy | *(blocked)* | — |
| 37 | Bluesky Jetstream / AT Protocol | full firehose filtering | `jetstream*.bsky.network` | `OK` [U] | candidate | Free |
| 38 | X / Twitter API | fastest beat reporting | API v2 | `PAID` — currently proxied manually via the `x-intel` stream | `docs/research/<date>/full-tables/` | Paid |
| 39 | Instagram / Threads | player posts | Graph API | `GATE`/`BLOCK` — prior attempts "did not yield a claim" per `airwave-intake.py` docstring | candidate | Free-ish |
| 40 | Discord / Telegram public channels | community + beat chatter | bot APIs | `GATE` | candidate | Free |
| 41 | YouTube RSS + captions | pressers, film breakdowns | `youtube.com/feeds/videos.xml?channel_id=…` | `OK` [U] | `docs/youtube/…` (bucket exists) | Free |
| 42 | Podcast Index API | podcast episodes + transcripts | `api.podcastindex.org` | `OK` [U] | candidate | Free |

### D. Research & knowledge corpus

| # | Source | Signal | Access | Rights/robots | Landing | Cost |
|---|---|---|---|---|---|---|
| 43 | arXiv | papers already being dropped as PDFs | per-PDF drops; **bulk export is robots-blocked** | `BLOCK` on `export.arxiv.org` (`Disallow: /`); use the API or respect per-file drops | `docs/arxiv-program/research/<date>/` | Free |
| 44 | OpenAlex | citation graph, research discovery | `api.openalex.org` | **`OK`** — `User-agent: * Allow: /` **[V]** | `docs/arxiv-program/research/<date>/` | Free |
| 45 | Semantic Scholar API | paper metadata/embeddings | API | `OK` [U] | candidate | Free tier |
| 46 | Crossref | DOI metadata | API | `OK` [U] | candidate | Free |
| 47 | PubMed E-utilities | sports-medicine literature | API | `OK` [U] | candidate | Free |
| 48 | Wikipedia / Wikidata | entity metadata | API/dump | `OK` [U] | candidate | Free |

### E. Markets, odds & prediction

| # | Source | Signal | Access | Rights/robots | Landing | Cost |
|---|---|---|---|---|---|---|
| 49 | The Odds API | live lines | API | `OK` — registry `the-odds-api`, "subscription in place, confirmed commercial display and storage rights" | odds tables via `refresh-odds` | Paid |
| 50 | Kalshi | event contracts | `api.elections.kalshi.com` | `GATE` — payload-rights tests assert Kalshi `storage_status` is **not** `allowed` | `prediction-market-snapshot` cron | Free API |
| 51 | Polymarket | event contracts | `gamma-api.polymarket.com` | `GATE` — robots 404; terms unreviewed | candidate | Free API |
| 52 | FRED | macro context | API | `OK` [U] | candidate | Free |
| 53 | Sportsbook public JSON (DK/FD) | line comparison | site JSON | `GATE`/ToS risk — prefer The Odds API | candidate | Free-ish |

### F. Local drops & internal memory

| # | Source | Signal | Access | Rights/robots | Landing | Cost |
|---|---|---|---|---|---|---|
| 54 | `~/Downloads` | operator drops, papers, exports | Mind Guardian watch root | `N/A` | `docs/<bucket>/research/<date>/` + feed | Free |
| 55 | `~/.hermes` | agent-produced artifacts | Mind Guardian watch root | `N/A` | same | Free |
| 56 | `data/snapshots/**` | bulk vendor snapshots (e.g. `eyi_package`) | local path | `N/A` | feed (704 rows today) | Free |
| 57 | `brain/local_vault/<date>/` | credentials — **never** fed | local path | `N/A` | vault only | Free |
| 58 | Mailbox (newsletters) | analyst newsletters | IMAP | `GATE` | candidate | Free |
| 59 | `git` streams (`x-intel`, `ingest-queue`) | research notes as commits | repo history | `N/A` | `docs/research/<date>/` | Free |

---

## 5. Top 10 immediate wins — exact commands

> All commands assume `cd C:/Users/Garrett/Sports` and PowerShell or Git Bash. Nothing here writes to
> production except the explicitly-marked `curl` cron triggers. Run the read-only ones first.

### W1 — Run Guardian once and reconcile ledger vs feed **[V pattern tested]**

```bash
cd C:/Users/Garrett/Sports
python scripts/ops/mind_guardian_daemon.py --once
python - <<'PY'
import json
led=set(json.load(open(".mind_guardian/ledger.json"))["hashes"])
feed=set()
for l in open("brain/feeds/2026-10-13/trainer_feed.jsonl",encoding="utf-8",errors="ignore"):
    l=l.strip()
    if not l: continue
    try: r=json.loads(l)
    except Exception: continue
    if r.get("sha256"): feed.add(r["sha256"])
print("ledger",len(led),"feed-distinct",len(feed),"overlap",len(led&feed))
PY
```

Why first: it measures the dedupe break before anything else depends on it. Expected today: overlap ≈ 0.

### W2 — Produce a de-duplicated copy of today's feed (streaming, no OOM)

```bash
python - <<'PY'
import json
src="brain/feeds/2026-10-13/trainer_feed.jsonl"
dst="brain/feeds/2026-10-13/trainer_feed.dedup.jsonl"
seen=set(); kept=dup=bad=0
with open(src,encoding="utf-8",errors="ignore") as f, open(dst,"w",encoding="utf-8") as o:
    for l in f:
        s=l.strip()
        if not s: continue
        try: r=json.loads(s)
        except Exception: bad+=1; continue
        sha=r.get("sha256") or r.get("path")
        if sha in seen: dup+=1; continue
        seen.add(sha); o.write(s+"\n"); kept+=1
print("kept",kept,"dropped",dup,"unparsable",bad,"distinct",len(seen))
PY
```

Today's numbers predict ≈3,100 dropped rows. Keep the original until a consumer is repointed.

### W3 — Audit the vault misrouting (read-only)

```bash
python - <<'PY'
import json, collections
h=json.load(open(".mind_guardian/ledger.json"))["hashes"]
ext=collections.Counter(v.get("name","").rsplit(".",1)[-1].lower() for v in h.values())
print("vault by extension:",ext.most_common())
sus=[v.get("name","") for v in h.values()
     if not any(k in v.get("name","").lower() for k in ("key","token","secret","cred","pass","api","env"))]
print("non-credential-looking names:",len(sus))
for n in sus[:25]: print("  ",n)
PY
```

If arXiv papers show up here (they did in the vault listing), `is_sensitive()` needs narrowing. → G4.

### W4 — Replace PFR with TheSportsDB + ESPN crosswalk **(PFR is robots-blocked)**

```bash
cd C:/Users/Garrett/Sports
mkdir -p docs/data-sources/research/2026-10-13/thesportsdb-pilot
firecrawl --status
firecrawl scrape "https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Arizona_Cardinals" \
  -o docs/data-sources/research/2026-10-13/thesportsdb-pilot/api-searchteams-cardinals.json
firecrawl scrape "https://www.thesportsdb.com/league/4391" \
  -o docs/data-sources/research/2026-10-13/thesportsdb-pilot/league-4391-nfl.md
```

**Note on PFR:** `pro-football-reference.com/robots.txt` carries `User-agent: * Disallow: /football/`
(and our own probe got `HTTP 403` from Cloudflare). **No PFR crawling is planned or piloted.** The named
alternatives are the ESPN public endpoints (#7/#8), nflverse (#1/#2/#4), and TheSportsDB (#11). TheSportsDB's
value here is the `idESPN` field it carries on team objects — a ready-made crosswalk key. Firecrawl is
confirmed authenticated (v1.25.3, 3,459/5,000 credits) but **always check robots.txt first**; the probe
transcript for 15 hosts is committed at `docs/data-sources/research/2026-10-13/robots-probe/robots-2026-10-13.txt`.

### W5 — Schedule the dark news wire (`refresh-wire`)

Manual trigger now:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "$CRON_TARGET_URL/api/cron/refresh-wire"
```

To make it automatic, add the same block to **both** `vercel.json` and `apps/web/vercel.json`:

```json
{ "path": "/api/cron/refresh-wire", "schedule": "5,35 * * * *" }
```

Confirm nothing collides: `npm run guard:cron-collisions` **[U — verify the script name in `package.json`]**.

### W6 — Run the nflverse weekly refresh in full mode

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" "$CRON_TARGET_URL/api/cron/refresh-player-stats?mode=full"
```

This is the only path that reaches injuries + depth + snaps + NGS in one run. Watch for the historical
serverless OOM: the route's own comment records a kill "after ~90s post-primary" on Hobby.

### W7 — Prove the free spine still returns data

```bash
npm run free:doctor          # scripts/free-ingest-smoke.mjs — ESPN 7 sports + Open-Meteo + NCAA cross-check
npm run guard:nflverse-currency   # scripts/check-nflverse-currency.ts
```

### W8 — Index the corpus into the FTS memory

Today the memory DB holds 13 facts and **zero** ingest rows. Before running, confirm the flag exists:

```bash
python scripts/ops/mind_guardian_daemon.py --help
```

Then a bounded re-index pass over one directory (do **not** point it at `~/Downloads` wholesale first):

```bash
python scripts/ops/mind_guardian_daemon.py --once --memory-db intelligence/voice_brain/memory.db
```

Verify afterwards:

```bash
python - <<'PY'
import sqlite3
c=sqlite3.connect("intelligence/voice_brain/memory.db")
print("facts",c.execute("select count(*) from facts").fetchone()[0])
print(c.execute("select domain,count(*) from facts group by domain order by 2 desc limit 10").fetchall())
PY
```

Caveat: the ledger must be reconciled first (W1), or the daemon will treat everything as already-ingested
and index nothing. **[U — depends on W1 outcome]**

### W9 — Register TheSportsDB in the rights registry before any wiring

Edit `apps/web/lib/scraping/source-rights-registry.ts` to add a `thesportsdb` entry carrying the real terms
verdict (robots allow + `ai-train=no` + tier terms), then:

```bash
npm run guard:ingestion-clearance
npm run test:ingestion-clearance
```

The guardrail scans `packages/data-ingestion/src`, `packages/prediction-engine/src`,
`apps/web/lib/ingestion`, `apps/web/lib/nflverse`, `apps/web/lib/intelligence`, and `workers/` for
extraction jobs whose source has no clearance verdict. **Do not wire a new parser before this passes.**

### W10 — Pull OpenAlex (the permitted research source) and refresh the robots evidence

```bash
curl -s "https://api.openalex.org/works?search=NFL%20injury%20prediction&per-page=25" \
  -o docs/arxiv-program/research/2026-10-13/openalex-nfl-injury-prediction.json
```

Re-run the robots probe any time a new host is proposed, and keep the transcript:

```bash
python - <<'PY'
import subprocess
hosts=["https://www.pro-football-reference.com/robots.txt","https://www.espn.com/robots.txt",
       "https://www.thesportsdb.com/robots.txt","https://api.openalex.org/robots.txt",
       "https://www.reddit.com/robots.txt","https://www.pff.com/robots.txt"]
out="docs/data-sources/research/2026-10-13/robots-probe/robots-2026-10-13.txt"
with open(out,"a",encoding="utf-8") as fh:
    for u in hosts:
        r=subprocess.run(["curl","-s","-m","12","-A","Mozilla/5.0 (compatible; GSE-ops-probe/1.0)","-w","\\nHTTP %{http_code}\\n",u],
                         capture_output=True,text=True)
        fh.write("=== %s ===\n%s\n"%(u,r.stdout))
print("appended",out)
PY
```

---

## 6. Honest risks and gaps

**G1 — PFR is robots-blocked; the repo still ships a PFR-shaped module.**
`apps/web/lib/ingestion/pfr-adv-stats.ts:112 ingestPfrAdvStats` exists and its upstream source
(`pfr-advstats-via-nflverse`) is `permission_required` with `automation_allowed: false` in the rights
registry. Direct PFR crawling is blocked by `Disallow: /football/`. **Nothing may be planned or piloted
against PFR.** The allowed substitutes are ESPN public endpoints, nflverse, and TheSportsDB.

**G2 — The news wire has no trigger.** `refresh-wire` is one of 7 routes absent from both `vercel.json`
files, and it is the sole caller of `refreshWireFromRoster`. ~100 public feeds are wired in code and dark in
production.

**G3 — Dedupe is broken between the ledger and the feed.** 117 ledger hashes vs 722 feed hashes, zero
overlap, 5.3× row duplication. Either an earlier daemon version ran without persisting the ledger, or the
ledger was reset while the feed was not. Until reconciled, "content-hash dedupe" is a claim, not a property.

**G4 — `is_sensitive()` over-matches and diverts research to the vault.** 117/117 ledger entries are
`sensitive:true`; the vault directory named `2026-10-13` is full of arXiv PDFs. Those files were never fed
and never indexed. This is silent data loss for the mind.

**G5 — The memory index is effectively empty.** `facts` = 13 rows, `facts_fts` = 13 rows, no ingest domain.
The "index it into FTS so a later session can find it" promise in the daemon docstring is not being kept.

**G6 — `brain/feeds/prepare_feed.py` is frozen at 2026-10-11.** Hardcoded output path and input dirs; its
target feed no longer exists. Anyone running it today writes into the past.

**G7 — The GitHub Actions scheduler is conditional.** `external-cron.yml` states Vercel-only is the SoT until
Actions minutes return. Any cadence claim that leans on Actions is not currently true.

**G8 — Robots signal contradicts our NWS use.** `api.weather.gov/robots.txt` returns `User-agent: * Disallow: /`
while `game-weather-capture` ingests it. It is a documented public API, but the robots signal should be
recorded and a decision taken consciously rather than by accident. **[V]**

**G9 — Reddit is off the table without an API path.** `User-agent: * Disallow: /` plus Reddit's Public
Content Policy. `airwave-intake.py` already notes Reddit "did not yield a claim". Do not scrape; use OAuth or
nothing. **[V]**

**G10 — The feed is a 231 MB JSONL in a gitignored directory.** No rotation, no compression, no retention
policy. `.gitignore` line 245 ignores `brain/feeds/*/trainer_feed.jsonl`, so the corpus is unversioned and
unbacked. One bad write loses it. **[V]**

**G11 — `brain/local_vault/` is gitignored and 117 files deep today.** Nothing verifies those are genuinely
credentials; nothing prevents a real credential from being misrouted into the *feed* if the classifier misses.
**[V]**

**G12 — Unscheduled routes are invisible inventory.** 7 routes (`backfill-historical-games`,
`backfill-player-data`, `backtest-calibration`, `feature-recipe-backtest`, `gamma`, `refresh-wire`,
`signal-ledger-census`) exist with no schedule and no documented owner. **[V]**

**G13 — `ingest-queue` history is not in the working tree.** 145 commits across branches; 0 reachable from
HEAD; a repo-wide content grep for the string "ingest-queue" returns nothing. Guardian cannot see it and
`prepare_feed.py` cannot find it. **[V]**

**G14 — ESPN's robots.txt blocks AI crawlers by name.** `GPTBot`, `ChatGPT-User`, `Google-Extended`,
`CCBot`, `anthropic-ai`, `Omgilibot`, `claritybot` all `Disallow: /` on `www.espn.com`; `site.api.espn.com/robots.txt`
returns `HTTP 403`. The ESPN registry entry already limits us to "fallback only, rate-limit aggressively" —
that constraint is doing real work. **[V]**

**G15 — Firecrawl spend is finite.** 3,459/5,000 credits after this pilot's 2 credits. Bulk crawling is not a
strategy; targeted extraction is. **[V]**

**G16 — `arxiv` bulk export is blocked.** `export.arxiv.org/robots.txt` = `Disallow: /`. The arxiv-program
corpus must arrive by API or by operator drop. **[V]**

**G17 — PFF's best content is behind the paywall.** The feed is crawlable, grades are not. Any plan that
assumes PFF grades at scale needs a licence. **[V for robots; U for licence terms]**

**G18 — Candidate roster rights are largely unresolved.** Of 59 roster rows, ~20 are `GATE`: no registry
verdict, no licence read, no permission letter. Wiring any of them before a verdict would trip
`guard:ingestion-clearance`.

**G19 — Kalshi storage rights are explicitly not `allowed`.** Payload-rights tests assert it; the snapshot cron
still runs. Storage/display of Kalshi payloads needs a decision recorded, not assumed. **[V]**

**G20 — No single source of truth for "what ingestion exists".** This document is a snapshot; it was assembled
by hand from code. `scripts/ops/unwired-inventory.ts` and `scripts/ops/inventory-codebase.py` exist and were
not exercised here. A generated inventory (cron routes ↔ modules ↔ landing tables) would remove the drift
class that produced G6 and G12. **[U — proposed]**

---

## Appendix A — verification commands (copy-paste)

```bash
cd C:/Users/Garrett/Sports

# A1 — routes vs schedules
python - <<'PY'
import json, os
sched={c["path"].rsplit("/",1)[-1] for c in json.load(open("vercel.json"))["crons"]}
routes=sorted(os.listdir("apps/web/app/api/cron"))
print("routes",len(routes),"scheduled",len(sched))
print("UNSCHEDULED:",[r for r in routes if r not in sched])
PY

# A2 — ingestion module inventory + callers
grep -rn "^export async function" apps/web/lib/ingestion/*.ts | grep -v test
grep -rn "ingestInjuries\|ingestDepthCharts" apps/web/app --include="*.ts" | grep -v test

# A3 — free adapters
ls apps/web/lib/data-sources/free-adapters/

# A4 — wire roster + its only caller
grep -c "url:" apps/web/lib/news/reporter-roster.ts
grep -rn "refreshWireFromRoster" apps/web --include="*.ts"

# A5 — rights registry verdicts
grep -n "status:\|automation_allowed" apps/web/lib/scraping/source-rights-registry.ts | head -40

# A6 — feed + ledger measurement
python - <<'PY'
import json, collections
p="brain/feeds/2026-10-13/trainer_feed.jsonl"
c=collections.Counter(); b=collections.Counter(); n=0
for l in open(p,encoding="utf-8",errors="ignore"):
    l=l.strip()
    if not l: continue
    try: r=json.loads(l)
    except Exception: continue
    n+=1; b[r.get("bucket","(none)")]+=1
    if r.get("sha256"): c[r["sha256"]]+=1
print("rows",n,"distinct_shas",len(c),"top_dup",c.most_common(3))
print("buckets",b.most_common())
PY

# A7 — memory DB state
python - <<'PY'
import sqlite3
c=sqlite3.connect("intelligence/voice_brain/memory.db")
print("facts",c.execute("select count(*) from facts").fetchone()[0])
print("fts",c.execute("select count(*) from facts_fts").fetchone()[0])
PY

# A8 — guardian tests
python -m pytest scripts/ops/test_mind_guardian.py -q

# A9 — guardrails
npm run guard:ingestion-clearance
npm run test:ingestion-clearance
```

---

## Appendix B — evidence index

| Artifact | Path |
|---|---|
| Robots probe transcript (15 hosts) | `docs/data-sources/research/2026-10-13/robots-probe/robots-2026-10-13.txt` |
| TheSportsDB pilot + README | `docs/data-sources/research/2026-10-13/thesportsdb-pilot/` |
| Weather pilot | `docs/data-sources/research/2026-10-13/weather-pilot/` |
| ESPN injuries pilot | `docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json` |
| Kalshi digest pilot | `docs/data-sources/research/2026-10-13/kalshi/` |
| News RSS pilot | `docs/data-sources/research/2026-10-13/news-rss/` |
| Guardian daemon | `scripts/ops/mind_guardian_daemon.py` |
| Guardian tests (30) | `scripts/ops/test_mind_guardian.py` |
| Ledger | `.mind_guardian/ledger.json` |
| Trainer feed | `brain/feeds/2026-10-13/trainer_feed.jsonl` |
| Memory DB | `intelligence/voice_brain/memory.db` |
| Rights registry | `apps/web/lib/scraping/source-rights-registry.ts` |
| Clearance guardrail | `scripts/guardrails/ingestion-source-clearance.mjs` |
| Cron declarations | `vercel.json`, `apps/web/vercel.json` |
| Actions scheduler | `.github/workflows/external-cron.yml` |

---

*End of document. Nothing in section 5 was executed against production while authoring this file; the `curl`
commands are provided for an operator to run deliberately.*
