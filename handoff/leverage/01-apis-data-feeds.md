# Leverage Audit 01 — APIs, Data Sources, Feeds, Scraping, OSINT & Algorithms

**Auditor domain:** APIs / datasets / feeds (RSS/JSON) / metrics / scraping & crawl tooling / OSINT / search & archive engines / algorithms.
**Sources audited:** `handoff/codex/galaxy-2026-limit-push/NORMALIZED_RESOURCE_LEDGER.csv` (rows with disposition `approved_direct` or `owner_review` only — 2,210 eligible rows) + section context from `handoff/incoming/garrett-resource-dump-2026-06-15.md`.
**Date:** 2026-06-15

---

## Headline finding (read this first)

**This dump contains ZERO direct sports-stats/odds/lines APIs.** There is no TheSportsDB, balldontlie, api-football, sofascore, football-data.org, StatsBomb, etc. The only "sports" rows are YouTube replay channels, Football Manager fan tools, and trivia games — none feed a prediction engine. The raw dump contains **no canonical URLs at all** (name + description format only).

**So the real leverage is one layer up:** this is a high-quality catalog of the *generic infrastructure* you need to (a) **discover** the free sports APIs that ARE out there, (b) **ingest** facts from cleared public sources, (c) **monitor** content/news via RSS, and (d) **process/store** the data. The single most valuable items are the **public-API discovery indexes** — they each contain live, free Sports categories (publicapis.dev explicitly lists "NBA Stats" and "Fantasy Premier League"). Mine those indexes to expand beyond the 4 free sources already wired (ESPN, henrygd NCAA, Open-Meteo, nflverse).

Everything here is facts-only / rights-gated compatible. Nothing below is piracy or evasion (those were already quarantined out of the eligible set). Scraping tools below still MUST pass `checkClearance()` per CLAUDE.md before any job.

---

## Top 10 highest-leverage

| # | Resource | One-line leverage |
|---|----------|-------------------|
| 1 | **public-apis/public-apis** (GitHub, 300k★) | Master index of free APIs w/ a Sports & Fitness category — the fastest path to replace The Odds API's coverage with free feeds. **ADOPT NOW** as a research input. |
| 2 | **publicapis.dev** | 1,400+ API directory; live Sports & Fitness section already surfaces **NBA Stats** and **Fantasy Premier League** free APIs. **ADOPT NOW.** |
| 3 | **APIs.guru** (openapi-directory) | "Wikipedia for Web APIs" — machine-readable OpenAPI specs. Lets you auto-generate typed clients for any free API you adopt. **ADOPT NOW / EVALUATE.** |
| 4 | **Crawl4AI** (Apache-2.0, 68k★) | Open-source, zero-key, LLM-friendly scraper → clean Markdown/JSON; Docker + FastAPI. Ideal cleared-source ingestion engine for facts. **ADOPT NOW.** |
| 5 | **DuckDB** (MIT) | In-process OLAP SQL over CSV/Parquet/JSON, queries remote files over HTTPS. Zero-cost analytics layer for nflverse-style datasets & backtesting. **ADOPT NOW.** |
| 6 | **FreePublicAPIs.com** | 600+ APIs, "tested every single day," has a Sport category — freshness-checked discovery feed. **EVALUATE.** |
| 7 | **Miniflux** (Apache-2.0, self-host) | Minimalist RSS reader **with a clean REST API** + full-content fetch — programmatic news/content ingestion for the content engine. **ADOPT NOW / EVALUATE.** |
| 8 | **Feedle** | Search engine for blogs & podcasts where *every search is an RSS feed* — turn any topic (e.g. "NFL injuries") into a monitored feed for content. **EVALUATE.** |
| 9 | **Kill the Newsletter** (OSS) | Converts email newsletters → Atom feeds. Pulls beat-writer/analyst newsletters into the pipeline as structured feeds. **EVALUATE.** |
| 10 | **OSINT Framework / Awesome Search Engines** | Curated trees of free search/lookup engines — research aids for verifying facts, finding obscure free data portals, injury/roster confirmation. **FUTURE / research aid.** |

---

## Ranked table — full domain inventory

Alignment key: **ADOPT NOW** (clear immediate fit) · **EVALUATE** (promising, needs a spike) · **FUTURE** (real but later) · **SKIP** (out of scope).

### A. API discovery indexes (the real treasure — mine these for free sports feeds)

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| public-apis/public-apis | 300k★ GitHub curated free-API list, Sports & Fitness category | ADOPT NOW | Primary source to find free replacements/supplements for The Odds API; recheck quarterly | **Live** ✓ |
| publicapis.dev | 1,400+ API directory, Sports & Fitness (NBA Stats, FPL) | ADOPT NOW | Directly surfaces named free sports APIs to wire in | **Live** ✓ |
| APIs.guru | OpenAPI spec directory, 4.2k★ | ADOPT NOW | Auto-generate typed TS clients (no `any`) for adopted APIs | **Live** ✓ |
| FreePublicAPIs.com | 600 APIs, daily-tested, Sport category | EVALUATE | Freshness-validated discovery; good for "is this still up?" | **Live** ✓ |
| Public API Lists / PublicAPIs / Any API / API List / APIsList / APIVault | Additional free-API aggregators/indexes | EVALUATE | Redundant discovery surfaces; dedupe against the above | Assessed from description (unverified) |
| APIKit / Awesome API Security | API security/testing resource indexes | FUTURE | Hardening reference when exposing our own API | Assessed from description (unverified) |

### B. Scraping / crawling tooling (cleared-source fact ingestion — all gated by clearance-engine)

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| Crawl4AI | Apache-2.0 LLM-friendly scraper → Markdown/JSON, Docker+FastAPI, zero keys | ADOPT NOW | Ingestion engine for `approved_public_logged_off` sources; outputs facts only | **Live** ✓ |
| Scrapling | Python scraping library (repo at `D4Vinci/Scrapling`, not `scrapling/scrapling`) | EVALUATE | Lightweight alternative/adjunct to Crawl4AI for structured pulls | Path 404'd; exists under different org (unverified) |
| Instant Data Scraper | Browser extension, auto-detect tables | EVALUATE | Manual/one-off research extraction of public tables | Assessed from description (unverified) |
| web.scraper.workers.dev | Cloudflare-Workers-based scraper | EVALUATE | Serverless, zero-infra scraping for cleared sources | Assessed from description (unverified) |
| Heritrix / brozzler / grab-site | Internet Archive / ArchiveTeam crawlers | FUTURE | Heavyweight archival crawl; overkill for facts-only now | Assessed from description (unverified) |
| 80legs / Crawly / SpiderSuite / Waymore | Cloud/online scrapers & crawlers | FUTURE/SKIP | Mostly redundant with Crawl4AI; some are recon-oriented | Assessed from description (unverified) |
| Awesome Web Scraping / Web Scraping FYI | Resource indexes | FUTURE | Reference when choosing scraping stack | Assessed from description (unverified) |

### C. RSS / feeds (content engine input + news/injury monitoring)

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| Miniflux | Apache-2.0 self-hosted RSS reader **with REST API** + full-content fetch | ADOPT NOW | Programmatic feed ingestion into content/news pipeline | **Live** ✓ |
| Feedle | Blog/podcast search where every search = an RSS feed | EVALUATE | Turn topics ("NFL injuries", "{team} news") into monitored feeds | **Live** ✓ |
| Kill the Newsletter | Email newsletter → Atom feed (OSS) | EVALUATE | Pull analyst/beat-writer newsletters as structured feeds | **Live** ✓ |
| FreshRSS / Tiny Tiny RSS / CommaFeed / selfoss / Fusion / NewsPipe | Self-hosted RSS readers (most have APIs) | EVALUATE | Alternatives to Miniflux; FreshRSS also has a strong API | Assessed from description (unverified) |
| Feedly / Inoreader / NewsBlur / Fluent Reader / Feed Flow / yarr / Brief / Feedbro | Hosted/desktop/extension RSS readers | FUTURE | Personal research/monitoring, not server pipeline | Feedly noted `approved_direct` |
| siftrss | RSS feed filters | EVALUATE | Filter noisy feeds down to relevant items before ingest | Assessed from description (unverified) |
| RSS.app | RSS feed generator/search (creates feeds from sites w/o them) | EVALUATE | Generate feeds for sources lacking native RSS | Assessed from description (unverified) |
| All about RSS / RSSTango / "RSS" indexes / Want My RSS / FeedButler | RSS tool indexes & utilities | FUTURE | Reference material | Assessed from description (unverified) |

### D. Data storage / processing / analytics (zero-cost data layer & backtesting)

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| DuckDB | MIT in-process OLAP SQL over CSV/Parquet/JSON incl. remote HTTPS | ADOPT NOW | Analytics + backtesting layer over nflverse/cleared datasets; calibration analysis without standing up infra | **Live** ✓ |
| Grafana | Self-hosted metrics dashboards | EVALUATE | Ops dashboards for ingestion freshness/job health (ties to "no stale data" rule) | Assessed from description (unverified) |
| Qdrant | Vector DB | FUTURE | Semantic search / RAG over content & research corpus | Assessed from description (unverified) |
| Ingestr | Transfer data between databases | EVALUATE | Move datasets between Postgres/DuckDB/Parquet in pipelines | Assessed from description (unverified) |
| DBeaver / DB Browser / SQLiteStudio / SQLook | DB clients / SQLite browsers | FUTURE | Dev/debug ergonomics for the Prisma/Postgres DB | Assessed from description (unverified) |
| ChartDB | DB schema visualization | FUTURE | Visualize/communicate the Prisma schema | Assessed from description (unverified) |
| AirTable / Baserow / NocoDB | Spreadsheet-DBs | SKIP/FUTURE | Possible lightweight editorial CMS for content team; not core | Assessed from description (unverified) |
| DB Engines / DBDB | Database rankings | SKIP | Reference only | Assessed from description (unverified) |
| Awesome Big Data / Data Engineering / MySQL | Resource indexes | FUTURE | Reference when scaling the data layer | Assessed from description (unverified) |

### E. OSINT / search engines (research aids — fact verification, finding free data portals)

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| OSINT Framework | Curated tree of free OSINT/search tools | FUTURE | Research aid: locate obscure free data portals, verify roster/injury facts | **Live** ✓ |
| Awesome Search Engines | Index of OSINT/specialty search engines | FUTURE | Discover niche search engines beyond Google for fact-finding | Assessed from description (unverified) |
| Bellingcat / IntelTechniques / OSINT Combine / Mitaka / Harpoon | Investigation toolkits & CLI/extensions | FUTURE | Manual research/verification only; not automated ingestion | Assessed from description (unverified) |
| ~18 other OSINT collection/guide indexes | General OSINT index lists | FUTURE (low) | Diminishing returns; one or two indexes suffice | Assessed from description (unverified) |

### F. Misc data sources / signals

| Resource | What it is | Alignment | How it maps + future uses | Verification |
|---|---|---|---|---|
| Copernicus Browser (Data Space) | Free EU satellite/earth-observation imagery & data | FUTURE | Weather/ground-condition context for outdoor games (complements Open-Meteo); niche | **Live** ✓ (301 → browser.dataspace.copernicus.eu) |
| Phys.org | Physics/science news | SKIP | Not relevant to sports prediction | Assessed from description (unverified) |
| PROGRID | NFL schedule chart (site) | SKIP | Schedule already available free via ESPN/nflverse | Assessed from description |
| Futez | Rate/review football matches | SKIP | User-review site, not a data API | Assessed from description |
| Official YT Sports Replay Channels (9) | YouTube football/NFL replay/highlight channels | SKIP | Video, not structured facts; no ingestion value (and republication risk) | Assessed from description |

### G. AI/agent API tooling (mostly ChatGPT-UI extensions — not relevant)

The "AI API Tools" section (14 rows) is almost entirely ChatGPT browser-extension tweaks (ChatGPT Box, KeepChatGPT, GPThemes, etc.) — **SKIP**. The one mild exception is **Agent Reach** ("connect AI agents to internet platforms") — FUTURE/low. `LLM` (Simon Willison's LLM CLI) is a useful local scripting tool — EVALUATE for content tooling, but the project already standardizes on the Claude API.

---

## Aggregate skip counts (not individually listed)

- **~775 eligible rows** are clearly hobby/consumer/piracy-adjacent (game/anime/movie/music databases, Football Manager tools, color pickers, temp-mail, YouTube/Twitch/Reddit/Spotify utilities, trivia games). **SKIP — zero relevance** to a facts-only sports prediction platform.
- The mislabeled "sports_data" CSV category (601 rows) is **not** sports data — it's a grab-bag (temp mail, OSINT, scrapers). Category column is unreliable; section column is the signal.
- 8,166 `approved_internal_reference` rows were excluded per instructions (spot-checked: no hidden sports APIs).

---

## Recommended next actions (highest leverage first)

1. **Harvest the API indexes now.** Pull the Sports & Fitness sections of public-apis, publicapis.dev, FreePublicAPIs, APIs.guru. Compile a candidate list of free sports APIs (NBA Stats, FPL, and whatever else), run each through the Scraping Clearance Engine / rights classification, and wire the cleared ones as new `data-ingestion` adapters. This is the direct path to dropping The Odds API.
2. **Stand up Crawl4AI + DuckDB** as the cleared-source ingestion + local analytics/backtesting pair (both verified live, both permissive licenses, both zero-cost).
3. **Wire Miniflux (API mode) + Feedle + Kill-the-Newsletter** into the content engine for news/injury/analyst-feed monitoring.
4. Keep OSINT Framework + Copernicus as on-demand research aids; do not build automation around them yet.

**Verification tally:** 13 items fetched live (public-apis, publicapis.dev, APIs.guru, FreePublicAPIs, Crawl4AI, DuckDB, Miniflux, Feedle, Kill-the-Newsletter, OSINT Framework, Copernicus [301], plus Scrapling [404 at given path — exists under D4Vinci/Scrapling]). Remainder assessed from description.
