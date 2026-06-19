# GSE: Free Bots, Distribution Tooling & Open Datasets
**Generated:** 2026-06-19  
**Scope:** Free / permissive / self-hostable only. Paid or ToS-restricted items are flagged and excluded from USE-NOW.

---

## SHORTLIST — Highest value, lowest effort

| # | Name | What it gives GSE | Adopt |
|---|------|-------------------|-------|
| 1 | **nflverse-data + nfl_data_py** | NFL PBP 1999–present, schedules, rosters, betting lines — CC-BY-4.0, GitHub Actions auto-updated | USE-NOW |
| 2 | **Open-Meteo** | Hourly weather at any stadium coordinate, 80-yr ERA5 archive, CC-BY-4.0, no key | USE-NOW |
| 3 | **Retrosheet** | Complete MLB PBP 1910–2025, permissive "use/sell/redistribute with attribution" | USE-NOW |
| 4 | **RSS-to-Telegram-Bot** | One Docker container → push GSE daily brief to a Telegram channel via RSS feed | USE-NOW |
| 5 | **discord-sports-notification** | MIT bot skeleton for Discord alerts; already wired to NBA/MLB official endpoints | USE-NOW |
| 6 | **Postiz** | AGPL self-hosted scheduler; posts to Discord, Mastodon, Bluesky, Reddit, X via owner-auth; API+webhooks | USE-NOW (review AGPL) |
| 7 | **openfootball / football.json** | Public-domain soccer schedules + results (EPL, Bundesliga, La Liga, World Cup) in JSON, no key | USE-NOW |
| 8 | **Wikidata SPARQL** | CC0 team/player/venue reference facts; canonical IDs linkable to all other datasets | USE-NOW |
| 9 | **GitHub Actions cron** | Free 2000 min/mo (public repos: unlimited) — run ingestion, scoring, content-gen on schedule at $0 | USE-NOW |
| 10 | **sportsdataverse-py** | MIT Python package; CFB, NBA, NHL, soccer PBP via ESPN public endpoints | USE-NOW |

---

## 1. Distribution Bots & Tooling

### 1.1 discord-sports-notification
- **URL:** https://github.com/wazam/discord-sports-notification
- **License:** MIT
- **What it does:** Sends Discord channel messages when NBA/MLB games reach threshold close-score conditions. Has `!schedule` and `!weather` commands. Configurable criteria.
- **GSE surface:** Daily brief / no-bet-watch pushes to a GSE Discord server channel. Post is owner-triggered or cron-triggered — not auto-publish.
- **Notes:** No official releases yet (122 commits, 8 open PRs — active). Uses NBA's stats.nba.com and MLB Stats API (both public, no key). Extend with GSE's own picks payload via webhook.
- **Clearance:** NBA.com and MLB Stats API endpoints are public-access facts; qualify as `approved_public_logged_off` for reference data. No evasion.
- **Adopt:** USE-NOW. Clone, extend with a custom `/brief` command that fetches from GSE's own picks API.

### 1.2 RSS-to-Telegram-Bot (Rongronggg9)
- **URL:** https://github.com/Rongronggg9/RSS-to-Telegram-Bot
- **License:** AGPL-3.0+
- **What it does:** Reads any RSS/Atom feed on a schedule and posts to a Telegram channel or group. Docker Compose deploy. Supports formatting, image attachments, per-feed proxy settings.
- **GSE surface:** GSE generates an RSS feed of its daily brief / calibration updates (see §3 below). This bot consumes that feed and pushes to a Telegram channel GSE owns. Owner-gated — the channel is GSE's, posts only when GSE's feed has new items.
- **Notes:** Calling for new maintainers (issue #747) — project is in maintenance mode but Docker image is stable.
- **Clearance:** The bot reads GSE's own RSS output — no third-party scraping.
- **Adopt:** USE-NOW. Requires a cheap VPS or existing Docker host. Pair with an RSS generator (§3.3).

### 1.3 Telegram RSS Bot alternatives (simpler)
- **rss-telegram (Python):** https://github.com/daquino94/rss-telegram — MIT, simpler codebase, groups by feed source. Good fallback if Rongronggg9 breaks.
- **telegram-rss-bot (Go):** https://github.com/0x111/telegram-rss-bot — MIT, single binary, Docker image. Lowest footprint.
- **Adopt:** PARK until RSS-to-Telegram-Bot shows maintenance issues.

### 1.4 Postiz (self-hosted social scheduler)
- **URL:** https://github.com/gitroomhq/postiz-app
- **License:** AGPL-3.0
- **What it does:** Multi-channel social scheduler with a visual queue. Supports 35+ platforms: Discord, Mastodon, Bluesky, X, Reddit, LinkedIn, Threads, Slack, and more. Exposes a public REST API + webhooks + n8n/Make/Zapier connectors. Weekly releases (v2.21.7 shipped 2026-04-27).
- **GSE surface:** Owner-authenticated posting of GSE's daily brief, calibration milestones, or no-bet-watch alerts to all owned social channels from one place. A GitHub Action or BullMQ job POSTs to Postiz's API to enqueue a draft; a human or scheduled trigger publishes.
- **Notes:** AGPL means any modified version must also be open-sourced if distributed. Running it privately for GSE's own use is fine. Requires Postgres + Redis + Docker.
- **Clearance:** Posts only GSE-generated content to GSE-owned accounts. No data extraction.
- **Adopt:** USE-NOW (AGPL acceptable for internal use). Check `/pricing` before self-hosting — free tier has webhook limits on the hosted version; self-hosted has no artificial limits.

### 1.5 ntfy (push notification broker)
- **URL:** https://github.com/binwiederhier/ntfy  
- **License:** Apache 2.0 / GPL v2 (dual)
- **What it does:** HTTP pub/sub push broker. Any script does `curl -d "Today's picks are live" ntfy.sh/gse-daily` and subscribers get a push notification on phone/desktop. Self-hostable. No account required on public server for low-volume topics; self-host for production.
- **GSE surface:** Internal staff alerts (picks pipeline completed, ingestion error) + subscriber notifications for Elite-tier users who opt in to push. Lighter-weight than a full bot.
- **Adopt:** USE-NOW. Trivially integrates into existing BullMQ workers with a single HTTP call.

---

## 2. Open Sports Datasets

### 2.1 nflverse / nflverse-data
- **URL:** https://github.com/nflverse/nflverse-data · https://github.com/nflverse/nfl_data_py
- **License:** CC-BY-4.0 (attribution required)
- **Contents:** NFL play-by-play (1999–present), schedules, rosters, draft picks, standings, team colors/logos, betting lines, combine results. Backed by ~30 data types.
- **Freshness:** Automated GitHub Actions jobs update nightly during season.
- **File formats:** Parquet and CSV via GitHub Releases. Python access via `nfl_data_py`; R via `nflreadr`.
- **GSE moat:** Historical lines data feeds calibration. PBP feeds factor derivation (yards-after-contact, red-zone efficiency, etc.). Schedule data feeds the ingestion pipeline's game-clock context. Betting lines data cross-validates The Odds API feeds.
- **Clearance registry:** `approved_open_license` (CC-BY-4.0). Facts only. Attribution required in derived outputs.
- **Adopt:** USE-NOW. `pip install nfl-data-py` → immediate access. Wire into the data-ingestion worker.

### 2.2 sportsdataverse (cfbfastR, hoopR, wehoop, etc.)
- **URL:** https://github.com/sportsdataverse · https://github.com/sportsdataverse/sportsdataverse-py
- **License:** MIT (package code); underlying data CC-BY-SA-4.0 where noted
- **Contents:** College football (CFB), NBA (hoopR), WNBA (wehoop), NHL, soccer. PBP data pulled from ESPN's public endpoints, then reformatted and hosted as open releases.
- **Freshness:** Active; updated during each season. CFB PBP goes back to 2004.
- **GSE moat:** Fills the college sports gap (CFB, CBB) not covered by nflverse. ESPN endpoint access is public-access-logged-off — facts only.
- **Clearance registry:** Package is MIT; data derived from ESPN public API → `approved_public_logged_off` for facts (scores, schedules, stats). No article text, no protected graphics.
- **Adopt:** USE-NOW. `pip install sportsdataverse`.

### 2.3 Retrosheet (MLB historical)
- **URL:** https://www.retrosheet.org · https://github.com/chadwickbureau/retrosplits
- **License:** Custom permissive — "recipients are free to use, sell, give away, or produce commercial products; attribution required." Effectively public-domain-with-credit.
- **Contents:** Complete MLB PBP event files, 1910–2025 (every pitch/play in structured format). Box scores, game logs, rosters, umpires. Negro Leagues 1935–1949. Chadwick's `retrosplits` repackages it as ODbL-licensed CSV aggregations.
- **Freshness:** Updated annually post-season; current through 2025.
- **GSE moat:** Deepest available baseball historical signal for calibrating any MLB prediction model. Venue/park factor extraction.
- **Clearance registry:** `approved_open_license`. Attribution: "The information used here was obtained free of charge from and is copyrighted by Retrosheet."
- **Adopt:** USE-NOW. Download event files → parse with Chadwick tools or `pyretrosheet`.

### 2.4 Baseball Databank / Lahman Database
- **URL:** https://github.com/cbwinslow/baseballdatabank · https://www.kaggle.com/datasets/open-source-sports/baseball-databank
- **License:** CC-BY-SA-3.0 (Chadwick Bureau version)
- **Contents:** Season-level MLB batting, pitching, fielding, salaries, awards, managers, HOF since 1871. The "Lahman Database" — standard reference in baseball analytics.
- **Freshness:** Updated annually.
- **GSE moat:** Long-run player and franchise reference for enriching narrative/content layer; salary context for roster analysis.
- **Clearance registry:** `approved_open_license`.
- **Adopt:** USE-NOW.

### 2.5 openfootball / football.json
- **URL:** https://github.com/openfootball · https://github.com/openfootball/football.json
- **License:** Public domain (no restrictions whatsoever)
- **Contents:** EPL, Bundesliga, La Liga, Serie A, MLS, Champions League match schedules + results in JSON. World Cup data 1930–2026 (Canada/USA/Mexico 2026 already staged). Also `.txt` format datasets for ~100 leagues worldwide.
- **Freshness:** Community-maintained; major leagues updated during season.
- **GSE moat:** Soccer schedule and result seed data; World Cup 2026 is a priority event for GSE given the US hosting context.
- **Clearance registry:** `approved_open_license` (public domain).
- **Adopt:** USE-NOW. No API key — raw JSON files on GitHub.

### 2.6 JeffSackmann Tennis (ATP/WTA)
- **URL:** https://github.com/JeffSackmann/tennis_atp · https://github.com/JeffSackmann/tennis_wta
- **License:** CC-BY-NC-SA-4.0 — **NonCommercial clause**
- **Contents:** ATP/WTA rankings, results, match stats from 1968–present. Point-by-point data for 5,000+ matches (Match Charting Project).
- **Freshness:** Actively updated during season.
- **GSE moat:** Deep tennis signal for confidence calibration on ATP/WTA picks.
- **Clearance registry:** NC clause means this is **not** `approved_open_license` for a commercial product. Register as `permission_required` and evaluate whether GSE qualifies as non-commercial analytics publisher, or seek written permission. Do NOT use in production ingestion until legal review.
- **Adopt:** PARK — owner clearance needed.

### 2.7 Open-Meteo (weather)
- **URL:** https://open-meteo.com · https://github.com/open-meteo/open-meteo  
- **License:** CC-BY-4.0 (data); open source API server (AGPLv3)
- **What it provides:** Hourly weather forecasts for any lat/lon, 16-day horizon. Historical ERA5 archive from 1940 to present (gap-free). 30+ global weather models (ECMWF, NOAA, UK Met Office, etc.). Variables: temperature, wind speed, precipitation, humidity, cloud cover, snow depth, UV index, and many more.
- **Usage limits (free):** 10,000 API calls/day for non-commercial use. Commercial use requires a paid plan. Self-host the open-source server for unlimited calls at $0.
- **GSE moat:** Weather as a pick factor — outdoor stadiums (NFL, MLB, CFB, MLS). Feed game-day temp + wind + precipitation into the prediction engine. ERA5 archive enables backtesting (what were conditions when this team historically underperformed?).
- **Clearance registry:** `approved_open_license` (CC-BY-4.0, attribution in data outputs). Self-hosted option is `approved_open_license` with no call limit.
- **Adopt:** USE-NOW. Single HTTP GET, returns JSON. No key for non-commercial; self-host the Docker container for commercial use.

### 2.8 Wikidata (team/player/venue reference)
- **URL:** https://www.wikidata.org · https://query.wikidata.org
- **License:** CC0 (public domain — no restrictions)
- **Contents:** Structured facts: team names, founding dates, home venues, capacity, lat/lon, league membership timelines, player birth dates, nationalities, career history. Queryable via SPARQL endpoint (no key).
- **GSE moat:** Canonical entity resolution layer — link nflverse player IDs, Retrosheet player IDs, and openfootball team IDs to a single Wikidata QID. Enables cross-dataset joins. Venue lat/lon feeds Open-Meteo weather lookups.
- **Clearance registry:** `approved_open_license` (CC0). Facts only — no article text.
- **Adopt:** USE-NOW. SPARQL endpoint at query.wikidata.org. Rate-limit: ~60 req/min; use nightly batch jobs.

### 2.9 TheSportsDB
- **URL:** https://www.thesportsdb.com
- **License:** Free tier — "free at point of access"; $9/mo premium. Commercial use terms not clearly published on the free tier. No API key required to start.
- **Contents:** Team logos, player images, event results, TV listings, stadium data (100+ sports worldwide). Crowd-sourced.
- **GSE moat:** Artwork / team image assets for the UI content layer. Secondary schedule cross-reference.
- **Clearance registry:** Free tier ToS unclear on commercial use → register as `vendor_candidate` until ToS review confirms. Do not use in automated production ingestion until confirmed.
- **Adopt:** PARK — review ToS first. If non-commercial clause absent, upgrade to `approved_public_logged_off`.

### 2.10 HIFLD Major Sport Venues (US government open data)
- **URL:** https://hifld-geoplatform.opendata.arcgis.com/datasets/major-sport-venues
- **License:** US government open data — public domain (no copyright on federal data)
- **Contents:** ~1,500 major US sports venues. Fields: name, sport type, capacity, address, lat/lon, year opened. Available as CSV, GeoJSON, KML.
- **GSE moat:** Authoritative US venue coordinate list for weather queries. Stadium capacity as a context signal.
- **Clearance registry:** `approved_open_license` (US federal public domain).
- **Adopt:** USE-NOW. One-time download; import to Prisma seed.

### 2.11 nba_api (NBA.com wrapper)
- **URL:** https://github.com/swar/nba_api
- **License:** MIT (package); NBA.com data governed by NBA.com ToS
- **Contents:** Accesses NBA.com's undocumented stats endpoints — player career stats, game logs, shotcharts, live scoreboard, play-by-play.
- **Freshness:** Updated through 2025-26 season (v1.11.4, Feb 2026).
- **GSE moat:** NBA game-level facts for pick factors and calibration.
- **Clearance registry:** NBA.com's ToS restrict certain uses. The data is public-access (no login) but NBA.com does not grant commercial redistribution rights to the raw data. Register as `approved_public_logged_off` for **facts and derived signals only** (scores, standings, aggregated stats). Do NOT republish raw endpoint responses. Apply `checkClearance()` before any ingestion job.
- **Adopt:** USE-NOW with constraints noted above. Rate-limit: add jitter + retry; NBA.com throttles burst traffic.

---

## 3. Workflow Automation Glue (self-hostable, $0)

### 3.1 GitHub Actions (cron scheduler)
- **URL:** https://github.com/features/actions
- **Cost:** Free for public repos (unlimited minutes). Private repos: 2,000 min/mo free (standard runners).
- **Pattern for GSE:**
  - `schedule: cron: '0 6 * * *'` → pull fresh odds from The Odds API → run prediction engine → publish picks
  - `schedule: cron: '*/15 * * * *'` → freshness check on ingested data
  - `schedule: cron: '0 2 * * 1'` → weekly calibration report generation
  - Artifacts persist outputs between jobs; secrets stored in repo/org secrets vault.
- **GSE surface:** Replace or supplement BullMQ for jobs that don't need sub-minute latency. Zero-infrastructure for CI-triggered data refreshes.
- **Note:** From 2026-03-01, self-hosted runners on private repos incur $0.002/min cloud platform charge. GitHub-hosted runners remain at the free quota. Keep lightweight data jobs on GitHub-hosted ubuntu-latest runners.
- **Adopt:** USE-NOW. GSE already has `.github/workflows/` directory.

### 3.2 n8n (visual workflow automation)
- **URL:** https://github.com/n8n-io/n8n
- **License:** Fair-code (source-available); self-hosted is free with restrictions on white-labeling/resale
- **What it does:** Visual node-based workflow builder. 400+ integrations. Triggers: cron, webhook, DB event. Native AI node. Can orchestrate: fetch odds → score picks → post to Discord/Telegram via Postiz API → log to Postgres.
- **GSE surface:** Non-engineer-friendly glue between The Odds API → prediction engine → Postiz → notification. Useful for content pipeline (fetch calibration data → draft blog post via Claude API → push to CMS).
- **Notes:** Fair-code license ≠ OSI open source. Self-hosting for internal use is permitted. Cannot embed n8n in a product sold to others.
- **Adopt:** USE-NOW for internal automation glue. Deploy via Docker alongside existing services.

### 3.3 RSS Feed Generation (static/templated)
- **Pattern:** GSE's Next.js app can expose `/api/feed.xml` — a standard RSS 2.0 endpoint generated server-side from the picks database. No additional tooling required; libraries like `feed` (npm, MIT) render the XML.
- **URL:** https://github.com/jpmonette/feed (MIT, 1.3k stars)
- **GSE surface:** Generates the RSS feed that Telegram/Discord bots and subscribers consume. Each new daily brief = new RSS item. This is GSE's owned distribution channel, zero-dependency on third-party platforms.
- **Adopt:** USE-NOW. Add one API route to the Next.js app.

### 3.4 openskill.py (open rating engine)
- **URL:** https://github.com/vivekjoshy/openskill.py
- **License:** MIT
- **What it does:** Bayesian multi-team skill rating (Plackett-Luce and related models). 3x faster than TrueSkill. 100% test coverage. Published in JOSS (peer-reviewed).
- **GSE surface:** Optional augmentation of the prediction engine — derive team/player strength ratings from historical results as an additional confidence factor input. Complements existing odds-based scoring.
- **Adopt:** USE-NOW if the prediction engine roadmap includes Elo/skill-based features. `pip install openskill`.

---

## 4. Clearance Engine Mapping Summary

The following table summarizes how each dataset maps into `apps/web/lib/scraping/source-rights-registry.ts`:

| Dataset | Proposed status | Condition |
|---------|----------------|-----------|
| nflverse-data | `approved_open_license` | Attribution: nflverse CC-BY-4.0 |
| sportsdataverse-py | `approved_open_license` | Attribution per dataset |
| Retrosheet | `approved_open_license` | Required attribution string in outputs |
| Baseball Databank (Lahman) | `approved_open_license` | CC-BY-SA-3.0 attribution |
| openfootball / football.json | `approved_open_license` | Public domain; no restrictions |
| Open-Meteo (self-hosted) | `approved_open_license` | CC-BY-4.0 attribution on data outputs |
| Open-Meteo (hosted, non-commercial) | `approved_open_license` | 10k calls/day; must confirm commercial status |
| Wikidata | `approved_open_license` | CC0; cite wikidata.org in attribution |
| HIFLD Venues | `approved_open_license` | US federal public domain |
| nba_api / NBA.com | `approved_public_logged_off` | Facts + derived signals only; no raw redistribution |
| TheSportsDB (free) | `vendor_candidate` | Review ToS before production use |
| JeffSackmann Tennis | `permission_required` | NC clause; needs written permission for commercial use |

---

## 5. What NOT to pursue (fast-exclude)

- **Sportsipy (roclark):** Unmaintained since Jan 2021. Scrapes Sports-Reference sites which have ToS against automation. Exclude.
- **SerpAPI / ScraperAPI / proxy rotation services:** Evasion tooling. Blocked per GSE scraping policy.
- **NBA.com raw data redistribution:** NBA.com ToS prohibit redistribution of raw API responses. Use derived facts only.
- **JeffSackmann Tennis (commercial):** CC-BY-NC-SA-4.0; NC clause blocks commercial use without permission.
- **Scores24.live automation:** Already `permission_required` in GSE registry. Written consent from Kiito OÜ required before any ingestion.

---

## Sources

- https://github.com/wazam/discord-sports-notification
- https://github.com/Rongronggg9/RSS-to-Telegram-Bot
- https://github.com/gitroomhq/postiz-app
- https://github.com/binwiederhier/ntfy
- https://github.com/nflverse/nflverse-data
- https://github.com/nflverse/nfl_data_py
- https://github.com/nflverse/nfldata/blob/master/DATASETS.md
- https://github.com/sportsdataverse/sportsdataverse-py
- https://www.retrosheet.org/datause.html
- https://github.com/chadwickbureau/retrosplits
- https://github.com/cbwinslow/baseballdatabank
- https://github.com/openfootball/football.json
- https://github.com/openfootball/worldcup.json
- https://github.com/JeffSackmann/tennis_atp
- https://github.com/JeffSackmann/tennis_wta
- https://open-meteo.com/
- https://registry.opendata.aws/open-meteo/
- https://www.wikidata.org/
- https://www.thesportsdb.com/
- https://hifld-geoplatform.opendata.arcgis.com/datasets/major-sport-venues
- https://github.com/swar/nba_api
- https://github.com/n8n-io/n8n
- https://github.com/vivekjoshy/openskill.py
- https://docs.github.com/billing/managing-billing-for-github-actions/about-billing-for-github-actions
- https://github.com/jpmonette/feed
