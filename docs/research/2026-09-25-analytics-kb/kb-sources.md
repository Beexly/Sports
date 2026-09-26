# 6. Data Sources Master

# NFL Data Sources — Master Catalog

**Purpose.** Builder-ready digest of every sports data source encountered in the September 2026 NFL analytics sweeps and the accompanying research passes, for Garrett's NFL analytics coding-agent knowledge base.

**Baseline.** Built from `research_notes/nfl-sweep-metrics-catalog/report.md` Part 3 (data-access notes), the Sports repo `AGENTS.md` data-source/API sections (`### 4. Data sources: free vs paid vs social-only`, `Market-data API catalog`, `FTN charting API map`, `Wide data hunt master catalog`, `Free fantasy API catalog`, `STATRANKINGS.COM DEEP DIVE`, `Claim verification sweep`), and the statrankings intel in `docs/research/2026-09-17/statrankings` and `docs/research/2026-09-18/statrankings` (1,148 NFL stat-page URLs inventoried in `nfl-urls.txt`; 673 metric definitions in `methodology-definitions.json`; Sept 18 CSV dumps of 290 player + 122 team + 20 coverage metrics).

**Attribution standard.** Every entry is factual and attributed to the source where observed. Anything not verified is marked **(unverified)**. No credential values, API keys, or passwords appear anywhere in this file — only account metadata Garrett has already stated.

**Access-model legend.** FREE = no key/account, sanctioned reuse · FREETIER = free quota, key required · PUBLIC-READ = readable without login, no redistribution right · GATED = login/subscription required · PAID = paid API/product · ENTERPRISE = sales-contact, five-to-six-figure budget.

---

## A. Free open-data core (legal foundation of the engine)

### 1. nflverse (nflverse.com)
- **Offers:** Play-by-play 1999–2026 (372 columns incl. EPA/WPA/CPOE), rosters to 1981, injuries 2009+, snap counts 2012+, NGS summary tables 2016+, contracts, draft, combine, officials, depth charts, QBR, schedules with closing spread+total, PFR advanced mirror, FTN charting subset 2022+. GitHub releases, parquet/CSV, nightly refresh.
- **Access:** FREE. Code MIT; data CC-BY 4.0 (credit "nflverse"); FTN charting subset (nflverse/nflverse-ftn, `load_ftn_charting()`, 2022+, charted within 48h) CC-BY-SA 4.0 — attribute "FTN Data via nflverse". Loaders: nflreadpy / nflreadr / nflfastR. The only source here that affirmatively grants reuse — v1 features build here.
- **Public without auth:** All of it — GitHub release downloads, no key.
- **Garrett status:** n/a (public); recommended free engine bootstrap: `pip install nflreadpy` → `load_pbp(2020-2026)` + `load_ftn_charting()` + ESPN summary + Sleeper trending — $0, zero credentials.

### 2. rbsdm.com (nflfastR's successor site)
- **Offers:** Public EPA / success-rate / CPOE leaderboards.
- **Access:** PUBLIC-READ. No bulk redistribution right documented.
- **Public without auth:** Leaderboard pages.
- **Garrett status:** n/a.

### 3. nfl4th.com
- **Offers:** Public fourth-down decision-model documentation.
- **Access:** PUBLIC-READ.
- **Public without auth:** Model docs.
- **Garrett status:** n/a.

### 4. ESPN public APIs
- **Offers:** `summary?event=<id>` (live PBP + boxscore + drives + win probability + odds in one call — richest free endpoint, verified 200 on 2026-09-18), scoreboard, teams, rosters, athletes (~13k), standings, published FPI/win-rate rankings.
- **Access:** FREE/no key for site.api endpoints (verified 200). Akamai-walled for datacenter IPs in some cases — use aggregators or the live-browser lane. ESPN Fantasy endpoints (`lm-api`) are bot-mitigated from datacenters (GATED-in-practice).
- **Public without auth:** Summary, scoreboard, teams, rosters, standings endpoints.
- **Garrett status:** n/a; wired in the repo as a GET-only fail-closed client (CATALOG tier).

### 5. NFL Next Gen Stats (summary lane)
- **Offers:** Public summary posts and nflverse NGS tables (separation, cushion, completion probability inputs, etc.).
- **Access:** FREE for summary tables via nflverse. Raw RFID feed is enterprise-only (Sportradar is the NFL's official data-rights partner). `api.nfl.com` and `nextgenstats.nfl.com` returned 401 in the Sept 21 methodology report — dead ends, not public endpoints.
- **Garrett status:** n/a.

### 6. nfelo (nfeloapp.com)
- **Offers:** Open Elo rating/model outputs and code (GitHub: greerreNFL/nfelo, greerreNFL/nfelounits).
- **Access:** FREE / open source.
- **Garrett status:** n/a; direct benchmarking peer for the engine.

### 7. Kaggle / GitHub mirrors + StatsBomb open data
- **Offers:** Community datasets incl. betting-line archives; Big Data Bowl GitHub solutions 2019–2025 ship tracking data in-repo; StatsBomb amf-open-data: free NFL+CFB event + tracking JSON 2016–2022 on S3. Kaggle sets need a free account.
- **Access:** FREE with caveats — license varies per set. 2026 Big Data Bowl set is CC BY-NC 4.0 (non-commercial — **do NOT use for the engine**). Validate community mirrors against nflverse.
- **Garrett status:** n/a.

---

## B. Odds, spreads, and prediction markets

### 8. The Odds API (api.the-odds-api.com/v4)
- **Offers:** Multi-bookmaker odds: h2h, spreads, totals (e.g. `americanfootball_nfl` with draftkings/fanduel/pinnacle), plus prediction-market venues (ProphetX, Novig, Polymarket, Kalshi) under the `us_ex` region.
- **Access:** FREETIER/PAID. Free 500 req/mo, $29/10K, $99/100K, $499/3M (terms verified 2026-09-18). Historical endpoints return 401 on the free tier (confirmed by two OSS projects).
- **Public without auth:** Docs and plan catalog only; API requires a key.
- **Garrett status:** **HAS — account under baxley.garrett@gmail.com on the 20K credits/month plan ($30/mo).** Key value not stored anywhere; key lives in the operator's Secure Vault only. Repo already has a typed GET-only client (`odds-api-client.ts`) with credit governor + ledger + failover wired, awaiting only the live key at deploy time.

### 9. OddsPapi (oddspapi.io)
- **Offers:** Secondary odds provider: `/v4/markets` catalog, `/historical-odds` (free, unmetered) — NFL sportId 14 / tournamentId 31; Pinnacle prices NFL game lines only (zero props). Flagship free job: `fetchPinnacleLineMovement` → deduped snapshots + close-before-kickoff for CLV reconstruction. Vendor terms forbid resell/redistribution as a standalone product — internal analytics only.
- **Access:** FREETIER. 250 req/mo budget tracked by the repo's credit governor; historical-odds unmetered.
- **Public without auth:** Docs only.
- **Garrett status:** Has an API account on oddspapi.io (one-time key-generation permission given; no stored password/key). Wired in repo as a secondary complement to The Odds API (`oddspapi-client.ts`, 37 tests across 4 files, certifiableForLiveGate=FALSE pending legal read).

### 10. Kalshi
- **Offers:** Prediction-market odds: game lines, last-undefeated team, conference champs, season awards (MVP/OPOY/DPOY/COTY/etc.). Used in @GridironInfo_ dashboards and @benbbaldwin v3 "objective ratings."
- **Access:** FREE for public reads. Per docs: `/exchange/status`, `/markets`, `/trades`, `/markets/candlesticks` no-auth; orderbook-auth status ambiguous (SDK says auth, OSS projects report no-auth works) — needs one direct unauthenticated GET to confirm.
- **Public without auth:** Market/trade/candlestick endpoints per docs.
- **Garrett status:** No account recorded; The Odds API's Kalshi feed is the documented zero-key lane.

### 11. Polymarket
- **Offers:** Best zero-key market feed: Gamma API (discovery, 4000 req/10s), CLOB public reads (`/book`, `/price`, `/prices-history`), Data API (`/trades`, `/holders`, `/oi`). Chain: Gamma → clobTokenIds → CLOB token queries.
- **Access:** FREE for reads; trading requires a wallet (out of scope).
- **Public without auth:** Gamma + CLOB + Data APIs.
- **Garrett status:** No account recorded; cheapest legitimate engine wiring starts here.

### 12. ProphetX
- **Offers:** Exchange odds: read layer (sports/tournaments/events/markets/search) zero-login per a public GitHub skill; trading approval-gated.
- **Access:** FREE for the read layer **(unverified from clean IPs — confirm before building on it)**.
- **Garrett status:** None recorded.

### 13. Novig
- **Offers:** Prediction-market exchange; GraphQL POST `https://gql.novig.us/v1/graphql` (Hasura-style), no auth in the OSS wrapper (unverified from clean IPs). Easiest legal lane = The Odds API `novig` key.
- **Access:** FREETIER via aggregator; direct access unverified.
- **Garrett status:** None recorded beyond the Odds API account.

### 14. SportsGameOdds
- **Offers:** Props and alternate-line odds data; has a free tier.
- **Access:** FREETIER.
- **Garrett status:** None recorded. Listed in the 2026-09-18 cheapest-engine-wiring chain (Polymarket + Kalshi → The Odds API → SportsGameOdds → nflverse + Covers → DK splits). **(unverified — free-tier limits not documented in the sweeps; verify terms before wiring.)**

### 15. DraftKings (DFS public surfaces)
- **Offers:** `/lobby/getcontests?sport=NFL` (live contest board, ~235KB); `/lineup/getavailableplayers?draftGroupId=` (player pool + SALARIES); sportsbook splits — DK Network publishes free Bets%/Handle% (spread/total/ML). Sportsbook API is Akamai-walled (403); sportsbook lines via The Odds API or aggregators instead.
- **Access:** FREE for the DFS lobby/player-pool surfaces; sportsbook 403.
- **Public without auth:** DFS lobby + available-players endpoints.
- **Garrett status:** No account recorded. Recommendation in AGENTS.md: use aggregators for sportsbook prices.

### 16. Underdog (stats.underdogfantasy.com)
- **Offers:** Fully open: `/v2/sports`, `/v1/sports/NFL/slates` (live slates), `/v1/slates/{id}/players` (1,690 players), `/v1/scoring_types` (29 systems), appearances endpoint = projections per player (projection.points, adp, avg_weekly_points, salary, position_rank), `/v1/teams` (12MB). Main `api.underdogfantasy.com`: contests/tournaments no-auth per public docs.
- **Access:** FREE / no key — one of the most open surfaces found.
- **Public without auth:** Everything listed above, verified live 2026-09-18.
- **Garrett status:** n/a.

### 17. Sleeper (api.sleeper.app)
- **Offers:** `/v1/state/nfl` (current week), `/v1/players/nfl` (14.6MB, 12,228 players, 9,421 active) with an ID CROSSWALK (sportradar_id, rotowire, yahoo, espn, swish, oddsjam, stats, rotoworld, gsis_id, fantasy_data_id, kalshi_id, opta_id), `trending/{add,drop}` (waiver sentiment — top player 513,972 adds/24h), `/v1/stats/nfl/regular/2026/1` (weekly stats incl. snap counts; deprecated in 2026 — re-verify), `/v1/projections/nfl/regular/2026/2` (1,051 players + Sleeper ADP), full public league/draft suite (millions of public leagues = behavioral dataset).
- **Access:** FREE, 1000 calls/min, **non-commercial** terms (downgraded to "use-with-caution" in the repo registry on 2026-09-18 for this reason).
- **Public without auth:** All endpoints above.
- **Garrett status:** n/a.

### 18. Pregame
- **Offers:** Open JSON API found in their own JS: tick-level consensus history (4,138 ticks/game: cash/ticket/pick%) + per-book odds history, no auth.
- **Access:** FREE / no auth (verified live 2026-09-18).
- **Garrett status:** n/a.

### 19. Action Network
- **Offers:** Public-betting page embeds ticket%/money% + per-book odds in `__NEXT_DATA__`; Wayback gives free history to 2018.
- **Access:** PUBLIC-READ, use-with-caution (ToS anti-automation clause).
- **Public without auth:** Public-betting pages (1.7MB page, 1,368 bet_info entries verified).
- **Garrett status:** n/a.

### 20. Covers
- **Offers:** Odds archive back to **1966** (spread/total + ATS, no moneylines); live pages verified 200.
- **Access:** FREE to read; use-with-caution (ToS).
- **Public without auth:** Archive + live pages.
- **Garrett status:** n/a; one half of the free backfill lane (Covers + spreadspoke).

### 21. spreadspoke
- **Offers:** Free scores+lines back to 1978 (closing spread+total, all 272 games, no key) — best free market-history file found.
- **Access:** FREE, no key.
- **Garrett status:** n/a.

### 22. VSiN
- **Offers:** Betting-content tables (live tables Pro-paywalled — key rejection in the Sept 18 verify-40).
- **Access:** GATED for live tables.
- **Garrett status:** None.

### 23. Pinnacle
- **Offers:** Sharpest books' NFL game lines; prices appear in aggregators and OddsPapi's `/historical-odds`.
- **Access:** PAID/ENTERPRISE — funded + verified account required (`api.pinnaclesports.com`); out of autonomous scope. Prices via aggregators.
- **Garrett status:** None.

---

## C. Charting and analytics vendors (paid / gated)

### 24. FTN Data / FTN Fantasy
- **Offers:** Full feed schemas published at ftnfantasy.com/ftn-data-nfl-catalog: Play-By-Play (~70 fields), Charting (play action, QB pressured, drops, time-to-pass, YAC, separation type, route type 0-12, run concept, RPO, DB count), Participation (pre-snap formation/alignment, skill roles, motion pre/at-snap, defender cushion yards). Human charting team, every play of every NFL game, ~24h turnaround (Sunday games released Mon/Tue); history back to 2019 (charting), 2021 (expanded participation). DVOA is FTN IP (Aaron Schatz, Chief Analytics Officer); partners may display charting metrics publicly EXCEPT DVOA.
- **Access:** PAID/API-key. Charting API (`charting.ftntools.com/api/docs`, OpenAPI 3.1.0, 145 paths): all 144 GET endpoints key-gated (401 without key; key issuance NOT self-serve — requires existing username+password). Pricing: FTN Data individual $69.99/yr (unconfirmed whether API keys included), PbP CSV $499.99, charting feed $5,000/yr commercial / $3,000/yr private. Public spec readable (SwaggerHub FTN-NFL-API: 73 paths, base data.ftndata.com, apiKey header; StatsHub spec: 25 POST analytics endpoints incl. DVOA/DYAR/EPA analytics). Public anomalies: `api.ftnfantasy.com/openapi.json` (89 paths) and `/plans/` (16 plans) anonymous-readable; FTN Stats iQ (`stats.ftnfantasy.com`) had two unauthenticated 200 endpoints at sweep time — `/api/v1/stats/catalog` (322KB charting taxonomy) and `/api/v1/stats/home` (live 2026 leaderboards). Consumer side: FTN Pro $109.99/yr, GOAT from <$21/mo, Bets/DFS $49.99/mo, Contest Sims extra, Football Almanac $29.99 PDF, RATPACK = 10% off first bill.
- **Public without auth:** Catalog pages, plans API, OpenAPI specs, two Stats iQ endpoints above (boundary-held — player search 403).
- **Garrett status:** None. Founder link: StatRankings founder Kevin Adams also founded FTN Fantasy/Data.

### 25. PFF (Pro Football Focus)
- **Offers:** Proprietary per-play grades (−2..+2 per play, aggregated 0–100), QB Accuracy Index (ACC%, PLUS%, CAT INAC%, UNC INAC%, OTHER, CPOE, ACCOE, AJ%), pass-rush win rate, double-team rate, single-game defensive grades.
- **Access:** PAID. PFF Pro $199.99/yr (Sept 2026 price drop — cheapest legitimate path to grade-level data); paid API is license/enterprise-only ("Coming Soon" for programmatic per PFF's own article at sweep time). **Founder override (Garrett, 2026-09-18): grades embedded in PFF's own public player pages (`__NEXT_DATA__` JSON — e.g. 38 gradeValue occurrences on the Mahomes page, verified live) are in scope — extract and wire; cite time, date, exact page URL in AGENTS.md every ingestion.** Not in scope: paid API, credential use, paywall circumvention.
- **Public without auth:** Public article pages (e.g. pff.com/news/nfl-qb-accuracy-report with interactive QB Accuracy Index leaderboard), player pages with embedded `__NEXT_DATA__`.
- **Garrett status:** No PFF subscription recorded.

### 26. statrankings.com ("The Ultimate Sports Data Hub")
- **Offers:** 1,148 NFL stat pages inventoried (nfl-urls.txt): `/nfl/advanced/players` (299), `/nfl/advanced/teams` (129), standard players/teams, `/nfl/coverage` (vs 11 coverage shells), `/nfl/fantasy`, `/nfl/trends` (ATS/moneyline/totals), depth charts (32 teams). 673 metric definitions extracted to `methodology-definitions.json` (/methodology Q&A glossary). Proprietary metrics: ARBY (adjusted run blocking yards), PROE+, Havoc Rate, True Target Share, 1st-Read %, xFP (DK/FD/Underdog/NFFC scoring), CoverageIQ+ (man/zone + 8 shells, 132 WR coverage stats), stat builder, red-zone suite, CB/WR matchup-report PDFs via statrankings.com/ai prompt agent, MCP connector for Claude/ChatGPT/Grok (subscription required). Free tools: oddsboard+ (live lines), trends tool, target share, depth charts, playoff schedule grid, survivor pool preview. Sept 18 CSV dump families: `nfl-advanced-players.csv` (1,525 rows, 290 metrics), `nfl-advanced-teams.csv` (607 rows, 122 metrics), `nfl-coverage.csv` (100 rows, 20 paths) — Week 1 2026 only; `free_full=yes` = full leaderboard free, `no` = paywalled top-5 preview. Stated sources: nflfastR + FTN Data (July 2026 preview PDF); ADP via Underdog/DraftKings.
- **Access:** FREETIER → GATED. Standard stat pages: full leaderboards free, no paywall. Advanced pages: top-5 preview free, full table paywalled. StatRankings+ $139.99/yr or $34.99/mo (Stripe); NFL Stats Archive CSV add-on +$60/yr or standalone $179.99/yr. No public API — CC captures reference an `api.statrankings.com/stats-service/{sport}/{players|teams}/{category}` REST family but it was unreachable from the sweep VM (verdict unknown; follow-up to residential-IP agent sent). 13 subdomains in CT logs, never probed.
- **Public without auth:** Standard leaderboards; e.g. statrankings.com/nfl/coverage/team/bal (Defense Card header rates), trench-play ARBY pages (top-5), /nfl/trends/{ats,moneyline,totals}, /nfl/teams/target-share, /nfl/depth-charts, /nfl/fantasy/playoff-schedule-grid.
- **Garrett status:** No StatRankings+ subscription recorded.

### 27. SumerSports / SumerPass
- **Offers:** Proprietary charting ("300+ data points/sec" claim): public team/personnel and player stat pages, edge-rusher table with PR Win % + min-snaps filters (observed live, "Last Updated 09-18-2026 01:32 PM EST"), interior-DL pressure rate, run stops, gap outcomes, under-center rate/efficiency, YBC and other proprietary fields in SumerPass. SūmerLive is the stated source of raritosdelfootball.com's data ("DATOS DE SŪMERLIVE · TEMPORADA 2026").
- **Access:** FREETIER → GATED. Public stat tables readable; SumerPass $10/wk, $20/mo, $100/yr, 7-day trial (verified live 2026-09-18). No public API (verified live).
- **Public without auth:** Public team/player tables, edge-rusher table.
- **Garrett status:** No SumerPass subscription recorded.

### 28. statyx.io
- **Offers:** Route IQ and matchup boards: TE targets EPA/target, Rush Path / Rush IQ package (lane shares, run-path interaction vs opponent rank, runner evidence percentiles), Run Type Matchup (Inside/Outside Zone/Gap splits vs opponent YPC-allowed), receiving matchup package (coverage matchup + 12-cell target-area matchup grid), defensive explosive-pass % allowed.
- **Access:** PUBLIC-READ for card content posted on X; announced as the data provider for @32BeatWriters. `statyx.io/app` returned a DNS error from the sweep VM (not a paywall) — platform access not characterized.
- **Public without auth:** X-posted cards (their own platform attribution).
- **Garrett status:** n/a.

### 29. Fantasy Points Data (fantasypointsdata.com / Data Suite 2.0)
- **Offers:** Advanced Receiving tables (SNAP%, RTE, YPRR, TPRR, Model XFP), Similarity Finder (SIM score), Bellcow Report (backfield XFP share), Data Suite 2.0 Splits view (opponent-coach splits), proprietary Separation Score / Separation Market Share / ADOR (no definitions published).
- **Access:** GATED/PAID. "FREE Premium Stats & Tools" language on public chart tools; Data Suite 2.0 is a paid add-on (+$200/yr); no exact raw-data API identified in the sweeps.
- **Public without auth:** Public-facing chart tools only.
- **Garrett status:** No Data Suite subscription recorded.

### 30. TruMedia
- **Offers:** Credited on the @ngreenberg aggressiveness chart (GoForIt% 2002–2026). Enterprise sports-data vendor.
- **Access:** ENTERPRISE — no public sports-data endpoint identified (trumedia.com is an unrelated multimedia-services business).
- **Garrett status:** None.

### 31. Sportradar / Stats Perform / SIS (Sports Info Solutions)
- **Offers:** Official NFL data-rights partner (Sportradar); team-tier charting and ratings (SIS, TruMedia/Stats Perform).
- **Access:** ENTERPRISE — pricing not public (budget five-to-six figures; verify with sales before planning around them).
- **Garrett status:** None.

### 32. SportsDataIO (sportsdata.io)
- **Offers:** NFL stats/scoring/odds feeds (enterprise sports-data API house).
- **Access:** ENTERPRISE — pricing not public.
- **Garrett status:** Has an API account on SportsDataIO (one-time key-generation permission given; no stored password/key). Usable as a keyed source when wired.

### 33. Other API services Garrett holds accounts on
One-time key-generation permission given (2026-09-18); passwords supplied in chat were transient and never stored — no stored credentials exist for any of these. Free/public tiers vary per vendor; terms not verified in the sweeps — verify each before wiring:
- **oddspapi.io** — see §9 (secondary odds provider).
- **MySportsFeeds** — sports stats/feeds API (freetier historically documented).
- **TheSportsDB** — sports data (free tier).
- **Infinity Sports AI** — (unverified terms).
- **SportsEngineB2B** — (unverified terms).
- **RTSports** — (unverified terms).
- **SportsLine** — (unverified terms).
- **4Deep Sports** — (unverified terms).
- **apivault.uk** — (unverified terms).
- **apikey.fun** — (unverified terms).
- **freepublicapis.com** — (unverified terms).
- **SportsDataIQ** — listed in Garrett's dictated account list; no further intel.

---

## D. Fantasy rankings, ADP, and dynasty-value sources

### 34. FantasyPros
- **Offers:** ECR (Expert Consensus Rankings): 553 players × 179 experts embedded in page source; public API v2 with $0 tier (sample data; real data at $8.99/mo); ADP pages free with year archives.
- **Access:** PUBLIC-READ / FREETIER. Parse `ecrData` JS var (no NEXT_DATA); real-time API at $8.99/mo.
- **Public without auth:** ECR cheatsheet pages (embedded data).
- **Garrett status:** No API subscription recorded.

### 35. KTC — KeepTradeCut (keeptradecut.com)
- **Offers:** Dynasty trade-value rankings: 500 players embedded in page JSON (crowdsourced values + real-trade data).
- **Access:** PUBLIC-READ, use-with-caution (ToS).
- **Public without auth:** Rankings page JSON.
- **Garrett status:** n/a.

### 36. FantasyCalc
- **Offers:** Trade-value API: `api.fantasycalc.com/values/current` (500+ players, all formats, cross-platform IDs) + `/trades/implied/{id}` (daily value history + ~1,000 real completed trades/player).
- **Access:** FREETIER (no key) — **BUT: endpoint returned 404 at the Sept 18 live verification; crew's "fully mapped, no key" claim does NOT hold right now. Do not list as working until re-verified.** Site + trade calculator UI still live.
- **Public without auth:** Currently unverified/dead path.
- **Garrett status:** n/a.

### 37. 4for4
- **Offers:** Rankings/notes pages with rank, VOR, ADP, GC + percentile notes; cheat-sheet pages with season fantasy-point projections; free ADP (DraftKings + Underdog columns, fetch-verified).
- **Access:** PUBLIC-READ.
- **Public without auth:** Rankings and ADP pages.
- **Garrett status:** n/a.

### 38. DynastyProcess
- **Offers:** Dynasty CSVs (free downloads).
- **Access:** FREE.
- **Garrett status:** n/a.

### 39. FTN free fantasy surfaces
- **Offers:** Free ADP tool (aggregates Underdog/FFPC/Yahoo/RT Sports); free DVOA tables are view-only (JS widget, no CSV); 1977+ historical DVOA archive is subscriber-only.
- **Access:** PUBLIC-READ for ADP; DVOA tables view-only.
- **Garrett status:** n/a.

### 40. Sharp Football (sharpfootballanalysis.com)
- **Offers:** 12 free stats pages, full HTML tables, zero gate: pace, play-action/motion/shotgun, personnel, coverage schemes, EPA, OL/DL, matchup edges.
- **Access:** FREE, no gate (verified 200 live 2026-09-18).
- **Garrett status:** n/a.

### 41. dynatyze.com
- **Offers:** Public NFL Tape scatter tool (dynatyze.com/football/tape); public Usage Lab/rankings surfaces (dynatyze.com/football/usage-lab).
- **Access:** FREETIER → GATED (league sync and premium tools gated).
- **Public without auth:** Tape scatter + usage-lab surfaces.
- **Garrett status:** n/a.

### 42. RotoWire / RotoBaller / Establish The Run / numberFire / Yahoo / CBS / MFL
- **Offers:** Rankings, ADP, projection content.
- **Access:** Mixed. RotoWire RSS (free). RotoBaller articles public (no paywall encountered). Establish The Run, FantasyPoints, Yahoo (OAuth) — login-gated from datacenters. numberFire — empty shell to bots. CBS/MFL — league-sync destinations in FTN plans.
- **Garrett status:** n/a.

---

## E. Historical and archive sources

### 43. Wayback Machine (web.archive.org)
- **Offers:** Football Outsiders DVOA archive — 552 archived URLs (`footballoutsiders.com/dvoa-ratings/*`): season-final tables 1983→present + weekly tables with weighted DVOA and playoff odds 2008–2022. **footballoutsiders.com is network-dead** (DNS resolves, HTTP/HTTPS fail as of Sept 18) — the history exists ONLY in Wayback. Record exact snapshot timestamps per season (SOURCES.md convention from the 2026-09-18 DVOA extraction). Action Network pages archived back to 2018 give free public-betting history.
- **Access:** FREE. Local extractions already produced: `dvoa-weekly.csv` (5,664 rows, 177 season-weeks, 2008–2019) and `dvoa-fo-finals.csv` (1,959 rows, finals 1977–2022 + 2019–2021 weeklies/playoffs) — local, unpushed, in the repo working tree.
- **Garrett status:** CSVs extracted locally (not pushed).

### 44. Pro Football Reference (free) / Stathead
- **Offers:** Box scores, splits, game logs, history, Advanced Passing tables.
- **Access:** PUBLIC-READ with ToS limits — PFR terms bar tool-building from scraped data (per-table CSV export only); no API. Stathead is paywalled (historical pricing $8/mo single / $16/mo all, 2020 — verify current). The compliant path is `nflverse`'s `pfr_advstats` mirror.
- **Public without auth:** Free PFR pages (no bulk scraping right).
- **Garrett status:** n/a.

### 45. TeamRankings
- **Offers:** Team ratings/tables.
- **Access:** PUBLIC-READ / FREETIER (wired in the Sept 18 VERIFY-40 pass).
- **Garrett status:** n/a.

### 46. NFL.com injury table
- **Offers:** Official injury reports.
- **Access:** PUBLIC-READ (listed in the Sept 18 THEFT-WORTHY top 15).
- **Garrett status:** n/a.

---

## F. Other named surfaces in the sweeps

### 47. raritosdelfootball.com/nfl/estadisticas/
- **Offers:** 32-team advanced table, league EPA/play league map, 1,396-player position-by-position rankings, week tabs ("Temporada 2026 / Jornada 2 / Jornada 1"); header "DATOS DE SŪMERLIVE · TEMPORADA 2026" (SumerSports as upstream); 1–10 team composite ("EPA, success rate, presión… todo resumido en una cifra").
- **Access:** FREE, public, ungated. (The post-linked `/nfl/estadistic` 404s; correct path is plural `/nfl/estadisticas/`.)
- **Garrett status:** n/a.

### 48. gridironviz.co
- **Offers:** Source attribution of the @WillBrinson rushing EPA/TD scatter (1999–2026 career chart). (unverified — chart-maker site, not a data product.)
- **Garrett status:** n/a.

### 49. sticktothemodel.com
- **Offers:** Chart builder ("Build your own at sticktothemodel.com/charting"); safety scatter + sack-rate/pressure-rate charts. Chart footer credits "FTN Data via nflverse."
- **Access:** PUBLIC-READ.
- **Garrett status:** n/a.

### 50. samhoppen.substack.com
- **Offers:** Full "waterfall game recap" chart set for all Week 2 games (nflfastR-sourced). Paywall status not verified.
- **Garrett status:** n/a.

### 51. opensourcefootball.com (@benbbaldwin)
- **Offers:** Methodology writeups behind the nflfastR team's posts; market-implied ratings footers.
- **Access:** PUBLIC-READ.
- **Garrett status:** n/a.

### 52. The Spade (Ray Carpenter newsletter)
- **Offers:** Weekly viz newsletter, methods inspiration — not a data feed.
- **Access:** PUBLIC-READ.
- **Garrett status:** n/a.

---

## What Garrett HAS (current as of 2026-09-24)

1. **The Odds API** — account under **baxley.garrett@gmail.com**, 20K credits/month plan. Key value NOT stored anywhere (Secure Vault only; never written here). Repo client + credit governor already wired; key needed at deploy time. Carries Kalshi/Polymarket/Novig/ProphetX under `us_ex` — the prediction-market lane without separate accounts.
2. **OddsPapi** — API account held (key-generation permission given, nothing stored). Secondary complement to The Odds API; unmetered `/historical-odds` is the CLV-reconstruction lane. certifiableForLiveGate=FALSE pending legal read.
3. **Account-level access (no stored credentials):** MySportsFeeds, TheSportsDB, SportsDataIO, Infinity Sports AI, SportsEngineB2B, RTSports, SportsLine, 4Deep Sports, apivault.uk, apikey.fun, freepublicapis.com, SportsDataIQ. One-time key-generation permission exists; passwords were transient and never stored. Each needs terms verification before wiring.
4. **Extracted locally (repo working tree, unpushed):** DVOA weekly/final CSVs from Wayback (5,664 + 1,959 rows); statrankings Sept 18 CSV dump families (2,232 rows, 432 metrics); 1,148 statrankings stat-page URLs; 673 methodology definitions.
5. **Not held:** StatRankings+ subscription, SumerPass, PFF Pro, FTN charting feed, any TruMedia/Sportradar/SIS/Stats Perform enterprise deal, Kalshi/Polymarket/ProphetX/Novig trading accounts.

## Recommended $0 bootstrap order (from the 2026-09-18 verify passes)

nflverse (PBP + FTN charting subset) → ESPN summary endpoint (live) → Sleeper trending (sentiment, non-commercial) → Underdog open surfaces (ADP/projections/salaries) → Polymarket/Kalshi public feeds (market priors) → The Odds API paid quota (multi-book consensus; Garrett's account) → SportsGameOdds free tier (props/alts) → Covers + spreadspoke (free backfill) → DK Network splits (sentiment).

## Open questions / unverified

- StatRankings exact upstream data vendor(s) — strong lead: FTN Fantasy/Data (founder Kevin Adams founded both; StatRankings' own "nflfastR and FTN Data" disclosure). EPA/projection model specs and odds-engine feed source unknown.
- `api.statrankings.com` REST family (CC-captured) — unreachable from sandbox; re-probe from a normal network.
- Kalshi orderbook no-auth status — one direct GET needed.
- ProphetX read layer and Novig GraphQL — unverified from clean IPs; use The Odds API lane meanwhile.
- FantasyCalc `/values/current` — 404 at Sept 18 check; re-verify before listing as working.
- Sleeper weekly-stats endpoint — deprecated; re-verify.
- SportsGameOdds free-tier limits — undocumented in sweeps.
- SumerSports Sept 18 claims (LB/DI/edge tables live, preseason/postseason from 2022) — from a lead, not independently confirmed.
- nflverse field names for kickoff/under-center tags — unresolved.
- Free-tier terms for §33 accounts (MySportsFeeds, TheSportsDB, Infinity Sports AI, SportsEngineB2B, RTSports, SportsLine, 4Deep Sports, apivault.uk, apikey.fun, freepublicapis.com, SportsDataIQ) — verify per vendor before wiring.

## Licensing reality (repo doctrine, condensed)

1. Facts aren't copyrightable; compiled databases and presentations are. Computing our own EPA from nflverse is clean; republishing PFF's grades table is not.
2. nflverse is the engine's legal foundation (CC-BY 4.0; FTN charting CC-BY-SA 4.0). The only source that affirmatively grants reuse.
3. Public reading is not redistribution (ESPN, PFR free, RBSDM, X charting accounts). Scraped tables for internal research are low-risk; publishing or serving them is not.
4. The NFL owns the tracking data. Summary NGS tables via nflverse are usable; the raw RFID feed is enterprise-only.
5. **Garrett's rule: we read and learn from public posts; we never republish anyone's proprietary charts as our own.** The Sept 18 PFF override covers only grades embedded in PFF's own public pages — cite time, date, exact page URL in AGENTS.md on every ingestion.

---
*Sources: `research_notes/nfl-sweep-metrics-catalog/report.md` Part 3; Sports repo `AGENTS.md` (### 4 Data sources, market-data API catalog, FTN charting API map, wide data hunt master catalog, free fantasy API catalog, STATRANKINGS.COM DEEP DIVE, ops log 2026-09-18, claim-verification sweep 2026-09-18); `docs/research/2026-09-17/statrankings/` (nfl-advanced-players.csv, nfl-advanced-teams.csv, nfl-coverage.csv); `docs/research/2026-09-18/statrankings/` (nfl-urls.txt, methodology-definitions.json, js/). Repo is read-only — nothing in it was modified. All observations read-only; no paywall or login bypassed in the sweeps. Compiled 2026-09-24.*


---

