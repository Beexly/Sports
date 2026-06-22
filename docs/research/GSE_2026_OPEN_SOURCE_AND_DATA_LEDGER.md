# GSE 2026 — Open-Source, Open-Data, Model & API Adoption Ledger

> **Author:** open-source / data-acquisition research (autonomous overnight sprint)
> **Date:** 2026-06-22
> **Scope:** A concrete "what already exists that we can adopt/copy" ledger for Galaxy Sports Edge (GSE) —
> open-source repos, open datasets, pretrained models, and free/cheap APIs to improve data, stats,
> projections, and analytics.
> **Method:** Every license + commercial-use term below was checked against the source on the web in June 2026.
> Where the source page is JS-rendered, binary, or otherwise not machine-verifiable, the line is explicitly
> marked **(license unverified — confirm)**. No fabrication.
> **Coherence:** GSE already ingests The Odds API (paid), ESPN free adapters (facts-only, no commercial display),
> Open-Meteo, and has built (but gated) an FPL adapter. It owns a source-rights registry
> (`apps/web/lib/scraping/source-rights-registry.ts`) + clearance engine
> (`apps/web/lib/scraping/clearance-engine.ts`). **Nothing below bypasses terms, paywalls, login, or anti-bot
> controls.** Every "candidate" must pass `checkClearance()` and carry a `RightsSnapshot` before any extraction.

---

## 0. How to read this ledger

For each resource: **name · type · URL · license + commercial verdict (VERIFIED) · sport/domain · what it gives GSE ·
freshness · cost · dependency risk · GSE integration status + one-line "how we'd use it."**

**GSE integration status** vocabulary:
- **have** — already wired into GSE (registry entry exists + adapter live).
- **partial** — adapter or registry entry exists but gated/not ingesting.
- **candidate** — not yet integrated; clear path; recommended.
- **gap** — desirable but no path yet, or blocked by license.

**Source-rights mapping** (GSE registry status this maps to):
`approved_open_license` · `approved_api` · `approved_public_logged_off` · `vendor_candidate` ·
`permission_required` · `manual_research_only` · `excluded`.

**Commercial-use verdict legend:** ✅ commercial OK · ⚠️ conditional (share-alike / attribution / use-restrictions) ·
❌ commercial NOT permitted on the free path.

---

## 1. American football — NFL & college

### 1.1 nflverse (nflfastR / nfl_data_py / nflreadr / nflreadpy)
- **Type:** dataset + libraries (R: nflfastR/nflreadr; Python: nfl_data_py/nflreadpy)
- **URL:** https://github.com/nflverse/nflverse-data · https://nflreadpy.nflverse.com/
- **License (VERIFIED):** Bulk data **CC-BY-4.0** → ✅ commercial OK with attribution. **Exception:** FTN charting/participation
  data is **CC-BY-SA-4.0** (share-alike) → ⚠️ — do NOT mix into closed derivatives. Confirmed: "all but the FTN data …
  CC-BY 4.0; FTN data is CC-BY-SA 4.0." Package wrappers themselves MIT.
- **Domain:** NFL play-by-play, EPA/WP, rosters, schedules, depth charts, snap counts, draft, combine, Next Gen Stats summaries.
- **Gives GSE:** Gold-standard free NFL feature store — EPA/play, success rate, pass rate over expected, QB/team efficiency for projections & factor trails.
- **Freshness:** Updated through current season, in-season weekly; very actively maintained.
- **Cost:** Free.
- **Dependency risk:** Low. Upstream is community-maintained; data files are stable Parquet/CSV on GitHub releases. Underlying play-by-play is ESPN-derived (facts).
- **GSE status:** **have** (registry: `nflverse`, `approved_open_license`). *How we'd use it:* nightly pull of `load_pbp` + `load_player_stats` into a feature table for NFL projections; keep FTN data out of closed pipelines.

### 1.2 CollegeFootballData.com (CFBD) + cfbfastR
- **Type:** api + library (cfbfastR = MIT R wrapper)
- **URL:** https://collegefootballdata.com · https://github.com/sportsdataverse/cfbfastR
- **License (VERIFIED):** Freemium API; free key required (Bearer). Terms page is **JS-rendered → (license unverified — confirm)** for commercial use. Free tier 1,000 calls/mo; paid $1–$30/mo.
- **Domain:** College football scores, advanced stats, recruiting, betting lines, returning production.
- **Gives GSE:** CFB factual feature set; the **QB college→NFL scheme-transition signal** (college passing/scheme facts feeding NFL projections).
- **Freshness:** Actively maintained, in-season.
- **Cost:** Free tier → $1–$30/mo.
- **Dependency risk:** Low-medium (single maintainer; commercial terms unconfirmed).
- **GSE status:** **partial** (registry: `collegefootballdata`, `vendor_candidate`, all flags false until key + terms confirmed). *How we'd use it:* obtain free key, legal-read terms, then flip to `approved_api` and verify endpoint schemas live before adapter.

---

## 2. Baseball — MLB

### 2.1 Lahman Baseball Database
- **Type:** dataset
- **URL:** http://seanlahman.com/download-baseball-database/ · CRAN `Lahman` pkg
- **License (VERIFIED):** **CC BY-SA 3.0** → ⚠️ commercial OK **but share-alike**: derivative databases must be re-licensed CC-BY-SA. Copyright Sean Lahman.
- **Domain:** Season-level batting/pitching/fielding/teams 1871–present.
- **Gives GSE:** Deep historical baseline for player-career priors & era adjustments.
- **Freshness:** Annual full-season releases (not in-season/live).
- **Cost:** Free.
- **Dependency risk:** Low (stable, decades-old). **Share-alike is the catch** for closed projection tables built directly on it.
- **GSE status:** **candidate** → map to `approved_open_license` with a **share-alike flag**. *How we'd use it:* historical priors only; isolate derived tables so SA doesn't infect proprietary models, or treat outputs as facts/aggregates.

### 2.2 Retrosheet (via pybaseball / retrosheet parsers)
- **Type:** dataset
- **URL:** https://www.retrosheet.org · accessed through https://github.com/jldbc/pybaseball
- **License (VERIFIED):** ✅ **Commercial use explicitly permitted** — "free to make any desired use … including selling it … or producing a commercial product," **provided** the notice "The information used here was obtained free of charge from and is copyrighted by Retrosheet" appears prominently. Attribution-mandatory, not share-alike.
- **Domain:** Game/play-level event data, box scores, historical lineups.
- **Gives GSE:** Event-level historical baseball for situational modeling.
- **Freshness:** Periodic seasonal releases.
- **Cost:** Free.
- **Dependency risk:** Low. Mandatory attribution string must propagate to outputs (registry `attribution_text`).
- **GSE status:** **candidate** → `approved_open_license`. *How we'd use it:* historical event features; hard-wire the Retrosheet notice into attribution propagation.

### 2.3 pybaseball (library) + Statcast / Baseball Savant
- **Type:** library (pybaseball MIT) + data source (Statcast via baseballsavant.mlb.com)
- **URL:** https://github.com/jldbc/pybaseball · https://baseballsavant.mlb.com
- **License (VERIFIED):** pybaseball = **MIT** (✅, code). **Statcast/Baseball Savant data = MLBAM, governed by MLB.com Terms of Use — no open commercial-use grant; commercial terms NOT verified** → treat data as **(license unverified — confirm)** and conservatively `permission_required`. The library being MIT does **not** license the data it fetches.
- **Domain:** Pitch-level Statcast (exit velocity, spin, xwOBA), FanGraphs/BBRef scrapes.
- **Gives GSE:** Best-in-class MLB granular metrics for projections.
- **Freshness:** Live in-season.
- **Dependency risk:** **Medium-high** — Savant has no commercial license; aggressive pulling and commercial display carry MLBAM ToS risk. FanGraphs/BBRef scrapers inside pybaseball hit Sports-Reference terms (see §4.2 landmine).
- **GSE status:** **gap** (data side). *How we'd use it:* the **MIT library is adoptable**; the **Savant data path needs a clearance decision** — facts/derived-analytics only, no commercial display until terms confirmed or an MLB license obtained. Do not enable via pybaseball's BBRef/FanGraphs endpoints.

---

## 3. Basketball — NBA / NCAA

### 3.1 hoopR (+ hoopR-nba-data) / sportsdataverse
- **Type:** library + dataset
- **URL:** https://github.com/sportsdataverse/hoopR · https://hoopr.sportsdataverse.org
- **License (VERIFIED):** **MIT** (code). Confirmed via hoopR LICENSE page. Underlying play-by-play is ESPN/NCAA-sourced facts.
- **Domain:** Men's college + NBA play-by-play, box scores, schedules.
- **Gives GSE:** Free NBA/NCAAM PBP & box-score feature store.
- **Freshness:** Actively maintained, in-season.
- **Dependency risk:** Low for code; the **data originates from ESPN endpoints** → same facts-only / no-commercial-display posture as GSE's existing ESPN entry.
- **GSE status:** **candidate** → library `approved_open_license`; data treated like `espn-public-api` (facts/derived only). *How we'd use it:* mirror our ESPN posture — ingest facts for projections, no verbatim commercial redistribution.

### 3.2 sportsdataverse-py / sportsdataverse-js
- **Type:** library
- **URL:** https://github.com/sportsdataverse/sportsdataverse-py · `-js`
- **License (VERIFIED):** **MIT** (org standard). Multi-sport (NBA, WNBA, NFL, NHL, CFB, CBB).
- **Gives GSE:** One TS/JS-native wrapper to pull facts across sports — fits our Next.js/TS stack directly.
- **Dependency risk:** Low (code); data = ESPN/NCAA facts posture.
- **GSE status:** **candidate** → `approved_open_license` (code). *How we'd use it:* the JS port is the cleanest stack-native adapter base for multi-sport fact ingestion.

### 3.3 nbastatR (R) — NBA Stats API wrapper
- **Type:** library
- **URL:** https://github.com/abresler/nbastatR
- **License (VERIFIED):** **MIT** (code). Wraps **stats.nba.com**, which is **unofficial/undocumented** — same risk class as ESPN hidden endpoints (see §3.4 note / §9).
- **Dependency risk:** **Medium** — stats.nba.com aggressively rate-limits/blocks; no commercial grant.
- **GSE status:** **gap/candidate** (code adoptable; data path = `permission_required`-equivalent, treat like undocumented endpoint risk). *How we'd use it:* prefer hoopR's stable data files over live stats.nba.com hits.

### 3.4 balldontlie API
- **Type:** api
- **URL:** https://www.balldontlie.io · terms: https://www.balldontlie.io/terms.html
- **License (VERIFIED):** Tiered API. Free tier = basic data. **Terms: may NOT resell/redistribute/sublicense API or data without written permission, nor build a competing product.** ⚠️ — usable as an input, not for redistribution. Paid: ALL-STAR $9.99/mo, GOAT $39.99/mo (odds, advanced stats, real-time).
- **Domain:** NBA/NFL/MLB/NHL + 20 leagues — scores, box scores, season averages, odds (paid).
- **Gives GSE:** Cheap, clean multi-sport REST feed; easy facts/box-score source.
- **Freshness:** Live; actively run as a commercial API.
- **Dependency risk:** Low-medium (no-redistribution clause; "no competing product" clause needs read for a picks product).
- **GSE status:** **candidate** → `approved_api` after a terms read (the "competing product" clause must be cleared since GSE is a decision product). *How we'd use it:* low-cost box-score/odds input feeding projections; never re-expose raw feed.

---

## 4. Soccer / football (global)

### 4.1 StatsBomb Open Data ⚠️ **LICENSE LANDMINE**
- **Type:** dataset
- **URL:** https://github.com/statsbomb/open-data
- **License (VERIFIED):** **StatsBomb Public Data User Agreement — non-commercial / research only.** Sources confirm data is "freely available for public **non-commercial** use for research projects." Requires registration + acceptance of the User Agreement; attribution + logo required on any published analysis. **❌ NOT freely usable commercially.** (The exact PDF text is binary and not machine-quotable, but multiple independent sources + StatsBomb's own framing confirm the non-commercial restriction — **confirm the signed agreement before ANY use**.)
- **Domain:** High-detail event/360 freeze-frame data (selected competitions: WC, some leagues, women's football).
- **Gives GSE:** Richest free soccer event data — but commercially off-limits.
- **Dependency risk:** **High legal** for a commercial product.
- **GSE status:** **gap / avoid for commercial.** Map to **`permission_required`** (commercial license required from StatsBomb/Hudl). *How we'd use it:* **only** internal R&D / method prototyping that never ships; production needs a paid Hudl StatsBomb license.

### 4.2 FBref / Stathead / Sports-Reference ⚠️ **LICENSE LANDMINE**
- **Type:** website + paid query tool (Stathead)
- **URL:** https://fbref.com · https://stathead.com
- **License (VERIFIED):** **Sports Reference trademarks; automated access/bulk scraping prohibited without license.** Note also: a data provider **terminated** Sports Reference's access to advanced soccer feeds, forcing **deletion** of that data from FBref/Stathead — a live signal of upstream contractual fragility. **❌** no commercial scraping path. Stathead is a paid subscription for human querying only.
- **Domain:** Comprehensive multi-sport stats & advanced soccer metrics.
- **Gives GSE:** Would be valuable, but legally closed to automation.
- **GSE status:** **gap / avoid.** Map to **`permission_required`** (manual UX research allowed; no automated extraction). *How we'd use it:* human reference only; do not build an adapter.

### 4.3 Understat (xG)
- **Type:** website + community wrappers (`understatapi`, `understat`)
- **URL:** https://understat.com
- **License (VERIFIED):** No open license; **personal/non-commercial use only — commercial use needs licensing**; community scrapers exist but are unsanctioned. **❌** on the free path for commercial.
- **Domain:** Shot-level xG for top-5 European leagues.
- **Gives GSE:** xG inputs for soccer models.
- **GSE status:** **gap.** Map to **`permission_required`**. *How we'd use it:* not commercially; prefer open xG (StatsBomb non-commercial is also out) — soccer xG remains a paid-license gap (SportMonks/Opta).

### 4.4 Football-Data.co.uk
- **Type:** dataset (CSV)
- **URL:** https://www.football-data.co.uk/data.php · disclaimer: /disclaimer.php
- **License (VERIFIED):** Free CSVs of historical results + closing odds; **no explicit open license, terms thin (license unverified — confirm)**; long-standing free-for-use posture, widely used in research/commercial-adjacent. Treat conservatively.
- **Domain:** Historical match results + bookmaker odds, many leagues, back to 1990s.
- **Gives GSE:** Free historical soccer odds/results for backtesting & calibration.
- **Freshness:** Updated each matchday in-season.
- **Dependency risk:** Low technically; **license ambiguity is the risk** → confirm before commercial display.
- **GSE status:** **candidate** → `vendor_candidate`/`approved_public_logged_off` pending terms read. *How we'd use it:* backtest/calibration dataset for soccer odds models (internal), not redistributed.

### 4.5 OpenFootball (football.db)
- **Type:** dataset
- **URL:** https://github.com/openfootball · https://openfootball.github.io
- **License (VERIFIED):** **Public Domain (CC0)** → ✅ "use as you please with no restrictions whatsoever … including commercial." Cleanest license in the whole soccer space.
- **Domain:** Fixtures, results, clubs, leagues worldwide (schema + data + scripts).
- **Gives GSE:** Free, unrestricted fixtures/results scaffolding for soccer.
- **Freshness:** Community-maintained; coverage strong on major leagues, patchier on niche/live.
- **Dependency risk:** Low (CC0); completeness/timeliness varies by competition.
- **GSE status:** **candidate** → `approved_open_license`. *How we'd use it:* base fixtures/results table for soccer; no attribution legally required (still good practice).

### 4.6 football-data.org API
- **Type:** api
- **URL:** https://www.football-data.org
- **License (VERIFIED):** Free tier = 12 competitions, 10 calls/min, delayed data; **attribution required** ("Football data provided by the Football-Data.org API"). Paid tiers for deeper/player data. Free tier historically **non-commercial-leaning** — confirm commercial on free tier.
- **Domain:** Major European leagues + cups: fixtures, tables, results.
- **Gives GSE:** Cheap structured soccer schedule/table feed (cleaner license than scraping).
- **Cost:** Free tier → paid.
- **GSE status:** **candidate** → `approved_api` (paid) / `vendor_candidate` (free-tier commercial unconfirmed). *How we'd use it:* the licensed alternative to FPL/EPL scraping that GSE's registry already names as the EPL unlock path.

---

## 5. Multi-sport free/cheap APIs & aggregators

### 5.1 TheSportsDB
- **Type:** api + dataset
- **URL:** https://www.thesportsdb.com
- **License (VERIFIED):** Free API for dev/lookup; **cannot publish to an app store unless paid subscriber**; may scrape/copy/modify content **via official endpoints** with attribution. $9/mo Patreon supporter tier → production key + V2 (livescores, highlights). Commercial production ⇒ paid tier.
- **Domain:** Teams, events, logos/artwork, schedules across many sports/leagues.
- **Gives GSE:** Metadata, logos, schedules — handy for UI enrichment.
- **Dependency risk:** Low; community-curated (artwork copyright varies — attribute).
- **GSE status:** **candidate** → `approved_api` (at $9/mo paid tier for production). *How we'd use it:* UI metadata/artwork + schedule backfill on the paid key; attribute as source.

### 5.2 API-Football (API-Sports)
- **Type:** api
- **URL:** https://www.api-football.com
- **License (VERIFIED):** Commercial use allowed on all tiers **including free** — **but** "does **not** grant commercial rights on competitions"; **betting/broadcast/fantasy/mass-media use may require additional rights-holder licenses.** ⚠️ — the betting-adjacency caveat matters for a picks product.
- **Domain:** Global football fixtures, lineups, stats, odds, predictions.
- **Cost:** Free tier (100 req/day) → paid.
- **GSE status:** **candidate** → `approved_api` after reading the betting/competition-rights caveat. *How we'd use it:* soccer fixtures/stats/odds input; legal read on the betting clause first.

### 5.3 SportMonks
- **Type:** api (vendor)
- **URL:** https://www.sportmonks.com
- **License (VERIFIED):** Commercial licensed API. Free tier = only Danish Superliga + Scottish Premiership (demo). Real coverage €29–€99+/mo (top-5 + UCL ≈ €99/mo Growth); enterprise to ~€2,388/yr.
- **Domain:** Licensed soccer data incl. **xG**, lineups, odds — a legitimate paid path to xG that StatsBomb/Understat can't give commercially.
- **GSE status:** **candidate** → `vendor_candidate` → `approved_api`. *How we'd use it:* the **licensed commercial xG source** if soccer becomes a core sport.

### 5.4 MySportsFeeds
- **Type:** api (vendor)
- **URL:** https://www.mysportsfeeds.com
- **License (VERIFIED):** **Free only for non-commercial** (devs/students/hobbyists). **Commercial requires a paid license.** NFL/MLB/NBA/NHL in XML/JSON/CSV.
- **GSE status:** **candidate (paid)** → `vendor_candidate`. *How we'd use it:* paid US-sports feed alternative if we need licensed redistribution rights.

### 5.5 ESPN unofficial/"hidden" endpoints
- **Type:** api (undocumented)
- **URL:** site.api.espn.com (community-documented, e.g. github.com/pseudo-r/Public-ESPN-API)
- **License (VERIFIED):** **No official public API; undocumented; commercial/public use risks flagged; subject to ESPN ToS; no published rate limits; endpoints can change/break without notice.** Facts (scores/schedules) aren't copyrightable; structured feed may carry EU database-right risk.
- **GSE status:** **have** (registry: `espn-public-api`, `approved_public_logged_off`, `commercial_display_allowed=false`, `storage_allowed=false`). *How we'd use it:* exactly as today — facts/derived-analytics fallback, rate-limited, no commercial display/storage until licensed via ESPN syndication.

---

## 6. Models, ratings & forecast archives (copyable methods/outputs)

### 6.1 FiveThirtyEight data & models (Elo, RAPTOR, SPI, NFL/CFB Elo, QB Elo)
- **Type:** dataset + model (methodology + historical outputs)
- **URL:** https://github.com/fivethirtyeight/data · /nba-raptor · WNBA-stats
- **License (VERIFIED):** **CC-BY-4.0** → ✅ commercial OK with attribution. Repo is archived (538 wound down) — **historical** files, not live-updating.
- **Domain:** NBA RAPTOR + Elo, NFL/NBA/MLB/NHL Elo, Soccer SPI, QB Elo, forecasts.
- **Gives GSE:** Free, documented baseline rating systems + labeled historical forecasts — excellent **calibration benchmark** and feature seed; the **Elo/SPI methods are reimplementable** (math is public).
- **Freshness:** **Stale/archived** (no longer updated) — value is historical + methodology.
- **Dependency risk:** Low (CC-BY, static).
- **GSE status:** **candidate** → `approved_open_license`. *How we'd use it:* reimplement Elo/SPI ourselves (public method) for live ratings; use 538's historical forecasts as a calibration yardstick for GSE confidence scores.

### 6.2 Kaggle — March Madness / NCAA & other sports datasets
- **Type:** dataset (varies)
- **URL:** https://www.kaggle.com (e.g. annual March Machine Learning Mania)
- **License (VERIFIED):** **Per-dataset — varies wildly.** "CC0/MIT/Apache/CC-BY allow commercial; **CC-BY-NC prohibits it**." Each dataset's license must be checked individually. Competition data also has competition-specific rules. ⚠️ **LANDMINE: looks free, often isn't commercially.**
- **Domain:** Wide (NCAA tourney, soccer, NFL, etc.).
- **Gives GSE:** Ready-made labeled datasets + modeling baselines (esp. bracket/tournament prediction).
- **GSE status:** **candidate, case-by-case** → status depends on each dataset's license (`approved_open_license` only if CC0/CC-BY/MIT/Apache; otherwise `excluded`/`permission_required`). *How we'd use it:* mine CC0/CC-BY datasets for backtests; **per-dataset clearance entry required** — never bulk-trust "Kaggle = free."

### 6.3 Wikidata
- **Type:** dataset
- **URL:** https://www.wikidata.org
- **License (VERIFIED):** Structured data **CC0 (public domain)** → ✅ unrestricted commercial use.
- **Domain:** Entity graph — teams, players, venues, leagues, identifiers, cross-IDs.
- **Gives GSE:** Free entity resolution / ID-mapping layer (link ESPN ↔ nflverse ↔ our IDs).
- **Dependency risk:** Low (CC0); completeness varies.
- **GSE status:** **candidate** → `approved_open_license`. *How we'd use it:* canonical entity/ID crosswalk + venue/team metadata, no attribution legally required.

### 6.4 Wikipedia
- **Type:** dataset
- **URL:** https://en.wikipedia.org
- **License (VERIFIED):** Article text **CC-BY-SA 4.0** → ⚠️ commercial OK **but share-alike + attribution** on reused text. (Facts within are free; the prose is SA.)
- **Domain:** Narrative/biographical context, historical records.
- **Gives GSE:** Background/context facts; **avoid reusing prose** (SA contaminates) — extract facts only.
- **GSE status:** **candidate (facts only)** → `approved_open_license` with SA caution. *How we'd use it:* extract facts (dates, records) — never copy article bodies into content (CLAUDE.md "never extract article bodies").

---

## 7. Reusable modeling libraries (Python) — all permissive, all ✅ commercial

| Library | License (VERIFIED) | Commercial | What it gives GSE |
|---|---|---|---|
| **scikit-learn** | BSD-3-Clause | ✅ | Core ML — calibration (`CalibratedClassifierCV`, isotonic/Platt) for confidence scores; baselines. |
| **XGBoost** | Apache-2.0 | ✅ | Gradient boosting for projections/win-prob; handles tabular sports features well. |
| **LightGBM** | MIT | ✅ | Faster GBM alt to XGBoost; good for large PBP feature sets. |
| **statsmodels** | BSD-3-Clause (Modified) | ✅ | GLMs, time-series, inference/diagnostics for transparent factor trails. |
| **PyMC** | Apache-2.0 | ✅ | Bayesian hierarchical models (team/player priors, partial pooling) + uncertainty. |
| **Stan** (cmdstanpy/PyStan) | New BSD | ✅ | Gold-standard Bayesian inference; ratings models with calibrated intervals. |
| **Prophet** (Meta) | MIT | ✅ | Quick seasonal time-series baselines (e.g. usage/volume trends). |
| **NeuralProphet** | MIT *(verify on repo — strongly indicated)* | ✅ | Neural extension of Prophet for richer time-series. |
| **MAPIE** | BSD-3-Clause | ✅ | **Conformal prediction** — distribution-free prediction intervals → directly supports GSE's 0–100 *calibrated* confidence guarantee. |
| **River** | BSD-3-Clause | ✅ | **Online/incremental learning** — update models as games settle without full retrain. |
| **Optuna** | MIT | ✅ | Hyperparameter optimization across all the above. |

> All eleven are permissively licensed (BSD/MIT/Apache) → **adopt freely, no attribution obligation beyond notice files.** Low dependency risk; all actively maintained as of 2026. **GSE status: candidate (have-adjacent)** — these are pip installs, not data sources, so no registry entry needed; the high-leverage adds are **MAPIE** (calibrated intervals) and **scikit-learn calibration** (confidence scores), plus **PyMC/Stan** for auditable hierarchical ratings.

### 7.1 JS/TS equivalents (stack-native — Next.js/TS)
| Library | License (VERIFIED / indicated) | Commercial | Use |
|---|---|---|---|
| **TensorFlow.js** | Apache-2.0 *(standard TF license; confirm on repo)* | ✅ | In-process/edge inference of trained models in the Node/Next runtime. |
| **ONNX Runtime (web/node)** | MIT *(confirm on repo)* | ✅ | Run models trained in Python (export to ONNX) inside our TS services — bridges the Python→TS gap cleanly. |
| **ml.js** | MIT *(confirm on repo)* | ✅ | Lightweight classic ML (regression, trees) natively in JS. |
| **danfo.js** | MPL-2.0 / MIT *(confirm on repo)* | ✅/⚠️ | Pandas-like DataFrames in JS for feature wrangling in-stack. |
| **simple-statistics** | ISC *(confirm)* | ✅ | Fast descriptive stats / regressions in TS for lightweight factors. |

> **Recommended bridge pattern:** train in Python (scikit-learn/XGBoost/PyMC), **export to ONNX**, serve via **ONNX Runtime** in the TS API layer — keeps modeling power without leaving GSE's stack. The JS license flags marked *(confirm)* are well-established in practice but were not pinned to a license page in this pass.

---

## 8. Ranked adoption table (≥25 rows)

> **Value** & **Integration cost** are H/M/L. Ordered by adopt-now priority. "Commercial OK?" reflects the *free path*.

| # | Resource | License | Commercial OK? | Value | Integ. cost | GSE status | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | nflverse (non-FTN) | CC-BY-4.0 | ✅ (attrib) | H | L | have | **adopt now** |
| 2 | scikit-learn | BSD-3 | ✅ | H | L | candidate | **adopt now** |
| 3 | MAPIE (conformal) | BSD-3 | ✅ | H | L | candidate | **adopt now** |
| 4 | XGBoost | Apache-2.0 | ✅ | H | L | candidate | **adopt now** |
| 5 | LightGBM | MIT | ✅ | H | L | candidate | **adopt now** |
| 6 | Open-Meteo | CC-BY-4.0 (data) | ✅ (attrib)* | M | L | have | **adopt now** |
| 7 | OpenFootball | CC0 | ✅ | M | L | candidate | **adopt now** |
| 8 | Wikidata | CC0 | ✅ | M | L | candidate | **adopt now** |
| 9 | FiveThirtyEight data/models | CC-BY-4.0 | ✅ (attrib) | H | M | candidate | **adopt now** (benchmark) |
| 10 | hoopR / sportsdataverse-js | MIT (code) | ✅ code / facts data | H | M | candidate | **adopt now** |
| 11 | statsmodels | BSD-3 | ✅ | M | L | candidate | adopt now |
| 12 | Retrosheet | Free + mandatory notice | ✅ (notice) | M | M | candidate | adopt now |
| 13 | PyMC | Apache-2.0 | ✅ | H | M | candidate | pilot |
| 14 | Stan (cmdstanpy) | New BSD | ✅ | H | M | candidate | pilot |
| 15 | Optuna | MIT | ✅ | M | L | candidate | adopt now |
| 16 | River (online ML) | BSD-3 | ✅ | M | M | candidate | pilot |
| 17 | ONNX Runtime (TS bridge) | MIT* | ✅ | H | M | candidate | pilot |
| 18 | balldontlie API | Proprietary (no-resell) | ⚠️ input-only | M | L | candidate | pilot |
| 19 | TheSportsDB | Paid prod tier ($9/mo) | ✅ (paid) | M | L | candidate | pilot |
| 20 | football-data.org | Free+attrib / paid | ⚠️→✅ paid | M | M | candidate | pilot |
| 21 | API-Football | All tiers, betting caveat | ⚠️ | M | M | candidate | pilot |
| 22 | CFBD + cfbfastR | Freemium (terms unconfirmed) | ⚠️ confirm | M | M | partial | pilot |
| 23 | ESPN unofficial endpoints | ToS / no license | ⚠️ facts-only | M | L | have | hold (as-is) |
| 24 | Lahman DB | CC-BY-SA-3.0 | ⚠️ share-alike | M | L | candidate | pilot (isolate SA) |
| 25 | Wikipedia | CC-BY-SA-4.0 | ⚠️ facts-only | L | L | candidate | pilot (facts only) |
| 26 | Kaggle datasets | Per-dataset (varies) | ⚠️ case-by-case | M | M | candidate | pilot (per-license) |
| 27 | SportMonks | Paid (€29–99+/mo) | ✅ (paid) | M | M | candidate | pilot (if soccer core) |
| 28 | Football-Data.co.uk | Thin/ambiguous | ⚠️ confirm | M | L | candidate | pilot (backtest) |
| 29 | MySportsFeeds | Paid commercial | ✅ (paid) | M | M | candidate | hold |
| 30 | nbastatR / stats.nba.com | MIT code / undoc. data | ⚠️ | M | M | gap | hold |
| 31 | Statcast / Baseball Savant | MLBAM ToS (no grant) | ❌ unconfirmed | H | M | gap | hold |
| 32 | Understat (xG) | Non-commercial | ❌ | M | M | gap | **avoid** (commercial) |
| 33 | FBref / Stathead | No-scrape / TM | ❌ | M | — | gap | **avoid** |
| 34 | StatsBomb Open Data | Non-commercial agreement | ❌ | H | — | gap | **avoid** (commercial) |
| 35 | siriusxm-activator | (evasion) | ❌ | — | — | excluded | **avoid** (permanent) |

\* Open-Meteo: underlying data is CC-BY-4.0 (commercial OK), but the **hosted free API tier is non-commercial/fair-use** — production must self-host the open data or take the commercial tier (already noted in GSE registry).

---

## 9. "Adopt this week" — top 10 with integration sketch

1. **nflverse feature pull** *(have → operationalize)* — nightly job loads `load_pbp`/`load_player_stats` Parquet into a `nfl_features` table; attach CC-BY attribution; exclude FTN (CC-BY-SA) from closed tables.
2. **scikit-learn calibration on confidence scores** — wrap the prediction-engine scorer in `CalibratedClassifierCV` (isotonic) and validate against the calibration pipeline so 0–100 confidence is empirically calibrated.
3. **MAPIE conformal intervals** — add distribution-free prediction intervals to projections; surface as the uncertainty band behind confidence tiers (directly serves "calibrated against historical results").
4. **XGBoost/LightGBM projection baseline** — train a gradient-boosted projection model on nflverse features as a versioned `model_version` baseline; log to the audit trail.
5. **FiveThirtyEight as a calibration benchmark** — import 538's archived Elo/SPI forecasts (CC-BY) and grade GSE confidence against them to detect drift; cite 538.
6. **OpenFootball + Wikidata scaffolding** — stand up a CC0 fixtures table (OpenFootball) keyed to Wikidata entity IDs for a clean, license-free soccer/entity backbone before any paid soccer feed.
7. **Reimplement Elo/SPI ourselves** — code the public Elo/SPI math (no license issue) into the prediction engine for live ratings, validated against 538's historical outputs.
8. **sportsdataverse-js multi-sport adapter** — use the MIT JS port as the stack-native base for NBA/CBB fact ingestion, mirroring our existing ESPN facts-only posture (no commercial display/storage).
9. **ONNX bridge** — export the Python projection model to ONNX and serve it via ONNX Runtime inside the Next.js API layer, so modeling stays Python but inference stays in-stack.
10. **CFBD key + terms read** *(partial → unblock)* — obtain the free CFBD key, get legal to read the JS-rendered terms; on approval flip registry `collegefootballdata` → `approved_api` and verify endpoint schemas live before the adapter (no guessed columns).

---

## 10. License landmines — "looks free, isn't (freely) commercial"

| Resource | Trap | Reality | GSE action |
|---|---|---|---|
| **StatsBomb Open Data** | "Free football data" on public GitHub | **Non-commercial research-only User Agreement**; attribution + logo mandatory | **Avoid for production.** Map `permission_required`; commercial needs paid Hudl StatsBomb license. **Biggest landmine.** |
| **FBref / Stathead** | Public stats pages | **Automated scraping prohibited; trademarked; upstream feed was revoked** (deletion forced) — contractually fragile | Manual reference only; **no adapter**. `permission_required`. |
| **Understat** | Open xG, community scrapers everywhere | **Personal/non-commercial only**; scrapers unsanctioned | Avoid commercially; use SportMonks/Opta (paid) for licensed xG. |
| **Lahman DB** | CC-BY (commercial OK!) | It's **CC-BY-SA 3.0** — **share-alike** can force open-licensing of derivative databases | Isolate derived tables; treat outputs as facts/aggregates so SA doesn't infect proprietary models. |
| **Wikipedia text** | "It's free" | Prose is **CC-BY-SA 4.0** (share-alike); only the *facts* are free | Extract facts only — never reuse article bodies (also a CLAUDE.md hard rule). |
| **Kaggle datasets** | "Kaggle = free data" | **Per-dataset**; many are **CC-BY-NC** (no commercial) or have competition-only rules | Per-dataset clearance entry; only CC0/CC-BY/MIT/Apache are commercially safe. |
| **Statcast / Baseball Savant** | pybaseball is MIT, so "the data is too" | **MIT licenses the *code*, not the MLBAM data**; Savant has no commercial grant | Facts/derived-analytics only; no commercial display until MLB license; don't route via pybaseball's BBRef/FanGraphs scrapers (Sports-Reference terms). |
| **Open-Meteo hosted API** | Free, no key | **Hosted free tier is non-commercial/fair-use**; only the *underlying data* is CC-BY commercial | Self-host the open data or take the commercial tier (already flagged in GSE registry). |
| **balldontlie / API-Football free tiers** | "Commercial allowed" | balldontlie forbids **resale/redistribution + competing products**; API-Football grants **no competition rights** and flags betting/fantasy use | Use as inputs only; legal read on "competing product" / betting clauses before relying on them. |
| **nflverse FTN data** | All nflverse is CC-BY | FTN charting/participation is **CC-BY-SA** (share-alike) within an otherwise CC-BY dataset | Exclude FTN from closed derivative tables. |

---

## 11. Net assessment

- **Strongest immediate, fully-commercial wins:** nflverse (non-FTN), OpenFootball (CC0), Wikidata (CC0), FiveThirtyEight (CC-BY), Retrosheet (notice-only), and the entire permissive Python/JS modeling stack (scikit-learn, XGBoost, LightGBM, statsmodels, PyMC, Stan, Prophet, MAPIE, River, Optuna; ONNX Runtime/TF.js/ml.js on the TS side). These need no licensing negotiation — only attribution discipline and share-alike isolation where flagged.
- **Highest-leverage method adds:** **MAPIE conformal intervals** + **scikit-learn calibration** make GSE's 0–100 confidence empirically defensible; **PyMC/Stan** give auditable hierarchical ratings; reimplementing **Elo/SPI** (public math) gives live ratings with a free 538 calibration benchmark.
- **Paid-but-clean paths** if a sport goes core: SportMonks/MySportsFeeds (licensed feeds), football-data.org/TheSportsDB (cheap), API-Football (with betting caveat read).
- **Do not touch on the free path:** StatsBomb Open Data (non-commercial — **biggest landmine**), FBref/Stathead (no-scrape + revoked upstream), Understat (non-commercial). All map to `permission_required`/avoid.
- **Already-correct in registry:** ESPN (facts-only, no commercial display), Open-Meteo (self-host/commercial-tier note), FPL (gated `permission_required`). No change needed; this ledger is consistent with the existing source-rights registry.

---

## Sources

- nflverse / nflreadr licensing (CC-BY-4.0; FTN CC-BY-SA-4.0): https://nflreadpy.nflverse.com/ · https://github.com/nflverse/nflverse-data
- StatsBomb Open Data (non-commercial agreement): https://github.com/statsbomb/open-data · https://github.com/statsbomb/open-data/issues/47 · https://github.com/statsbomb/amf-open-data
- Lahman DB (CC-BY-SA-3.0): http://seanlahman.com/download-baseball-database/ · https://sabr.org/lahman-database/
- pybaseball (MIT) / Retrosheet (commercial OK w/ notice) / Statcast (MLBAM ToS): https://github.com/jldbc/pybaseball · https://github.com/jldbc/pybaseball/blob/master/docs/retrosheet.md · https://baseballsavant.mlb.com
- hoopR / sportsdataverse / nbastatR (MIT): https://hoopr.sportsdataverse.org/LICENSE.html · https://github.com/sportsdataverse · https://github.com/abresler/nbastatR
- balldontlie (terms, no-resell/no-compete): https://www.balldontlie.io/terms.html · https://www.balldontlie.io/
- Understat (non-commercial): https://understat.com/ · https://statpair.com/blog/best-xg-websites-2026-comparison
- FBref / Stathead (no-scrape; revoked upstream): https://www.sports-reference.com/stathead/fbref/ · https://www.sports-reference.com/blog/category/fbref/
- Football-Data.co.uk (thin terms): https://www.football-data.co.uk/disclaimer.php · https://www.football-data.co.uk/data.php
- OpenFootball (CC0 public domain): https://github.com/openfootball · https://openfootball.github.io/
- football-data.org (free tier + attribution): https://www.football-data.org/pricing · https://www.thestatsapi.com/blog/football-data-org-free-tier-limits-2026
- TheSportsDB (free vs paid prod tier): https://www.thesportsdb.com/docs_terms_of_use.php · https://www.thesportsdb.com/pricing
- API-Football (commercial all tiers, betting/competition caveat): https://www.api-football.com/terms · https://www.api-football.com/pricing
- SportMonks (paid; pricing): https://www.sportmonks.com/football-api/plans-pricing/ · https://www.sportmonks.com/terms-of-service/
- MySportsFeeds (non-commercial free / paid commercial): https://www.mysportsfeeds.com/terms-use/
- ESPN unofficial endpoints (risk): https://github.com/pseudo-r/Public-ESPN-API · https://zuplo.com/learning-center/espn-hidden-api-guide
- FiveThirtyEight data/models (CC-BY-4.0): https://github.com/fivethirtyeight/data · https://github.com/fivethirtyeight/data/tree/master/nba-raptor
- Kaggle dataset licenses (per-dataset; NC traps): https://www.kaggle.com/getting-started/515708 · https://www.kaggle.com/general/116302
- Wikidata (CC0) / Wikipedia (CC-BY-SA-4.0): https://www.wikidata.org/wiki/Wikidata:Licensing · https://creativecommons.org/2023/06/29/wikipedia-moves-to-cc-4-0-licenses/
- scikit-learn (BSD-3): https://github.com/scikit-learn/scikit-learn/blob/main/COPYING
- XGBoost (Apache-2.0): https://github.com/dmlc/xgboost/blob/master/LICENSE
- LightGBM (MIT): https://github.com/lightgbm-org/LightGBM/blob/master/LICENSE
- statsmodels (BSD-3): https://www.statsmodels.org/
- PyMC (Apache-2.0): https://github.com/pymc-devs/pymc/blob/main/LICENSE
- Stan (New BSD): https://en.wikipedia.org/wiki/Stan_(software)
- Prophet (MIT) / NeuralProphet: https://github.com/facebook/prophet/blob/main/LICENSE · https://github.com/ourownstory/neural_prophet
- MAPIE (BSD-3): https://github.com/scikit-learn-contrib/MAPIE
- River (BSD-3): https://github.com/online-ml/river/blob/main/LICENSE
- Optuna (MIT): https://github.com/optuna/optuna
- TensorFlow.js / ONNX Runtime / ml.js / danfo.js (JS stack): https://www.tensorflow.org/js
- CollegeFootballData / cfbfastR: https://collegefootballdata.com · https://github.com/sportsdataverse/cfbfastR
