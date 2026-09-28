# Completeness Audit — NFL GitHub sweep, second pass (2026-09-28)

A dedicated re-cut ran six alternate searches against the morning's sweep (10 pages of `q=NFL&sort=updated`, 1,000 repos, 29 keepers). Verdict: **pass 1 was recency-biased and missed the foundation** — the re-cut found 30 should-have-been keepers and 34 marginals that pass 1 could not structurally see.

## Re-cuts executed (6)

1. **Pages 11–15 of `q=NFL&sort=updated`** — IMPOSSIBLE. GitHub Search API hard-caps at 1,000 results; pages 11+ return HTTP 422 `"Only the first 1000 search results are available"`. Pass 1 hit the API ceiling, not a stopping choice.
2. **`q=NFL&sort=stars`, pages 1–3** — 300 repos scanned. This is where the big misses live.
3. **Topic queries** — `topic:fantasy-football` (p1–2), `topic:dfs` (p1–2), `topic:odds`, `topic:sports-betting`, `topic:nfl` (p1 each) = 700 repos.
4. **License cuts** — `NFL language:Python license:mit` (603 total, 100 scanned), `license:apache-2.0` (79 total, all 79 scanned).
5. **Freshness cut** — `NFL pushed:>2026-08-28` (2,818 total, 100 scanned; mostly overlaps pass 1's window — skim-check).
6. **Wikis** — 7 page-fetches: `NFL playbook` p1, `NFL analytics` p1–3, `nflverse` p1–3.

**Totals: 1,094 unique repos scanned across API cuts; 12 were already-keeper dupes (validating the cuts — 12/29 pass-1 keepers re-surface); 66 finalists + 1 wiki lead verified against real source files.**

## Class (a) — should-have-been keepers (30)

Foundational or high-signal repos pass 1 structurally could not see (old, high-star, buried past the 1,000-result recency window):

| # | Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|---|
| 1 | BurntSushi/nflgame | 1304 | 2019-10-23 | Python | Unlicense | Classic NFL Game Center JSON client; `nflgame/seq.py` Django-style `Gen.filter()` query API over players/plays. Archived; reference implementation. |
| 2 | BurntSushi/nfldb | 1079 | 2021-01-26 | Python | Unlicense | PostgreSQL-backed NFL data library; versioned schema (`api_version=8`), full relational query layer. Archived. |
| 3 | georgedouzas/sports-betting | 802 | 2026-09-24 | Python | MIT | Full betting-AI toolkit (117 py files): dataloaders, core, evaluation, execution, sources, MCP server. Active, reuse-safe. |
| 4 | pseudo-r/Public-ESPN-API | 739 | 2026-07-04 | Python | none | Docs of *undocumented* ESPN API endpoints (Django reference models per sport). Key data-source reference. |
| 5 | maksimhorowitz/nflscrapR | 552 | 2020-04-03 | R | none | Original R NFL scraping package; predecessor of the nflverse stack. |
| 6 | nflverse/nflfastR | 546 | 2026-09-19 | R | none | Active nflverse workhorse: 50 R files scraping NFL play-by-play. Standard PBP engine. |
| 7 | pretrehr/Sports-betting | 534 | 2023-12-21 | Python | MIT | Betting assistant (odds loading, outcome-probability, bankroll optimization). |
| 8 | FantasyFootballAnalytics/FantasyFootballAnalyticsR | 504 | 2026-05-15 | R | none | R scripts + data (74 R files, 193 CSVs) behind FantasyFootballAnalytics — projections, rankings, draft values. |
| 9 | DimaKudosh/pydfs-lineup-optimizer | 449 | 2024-03-01 | Python | MIT | Multi-site DFS optimizer factory (DK/FD/Yahoo, 67 py files). Canonical open DFS optimizer. |
| 10 | nflverse/nfl_data_py | 440 | 2025-09-25 | Python | MIT | Python nflverse client — archived, superseded by nflreadpy (#19). Historical reference. |
| 11 | nflverse/nflverse-data | 409 | 2026-09-16 | R | CC-BY-4.0 | The automated nflverse data repository itself (releases + upload-retry plumbing). |
| 12 | mkreiser/ESPN-Fantasy-Football-API | 352 | 2025-01-04 | JS | LGPL-3.0 | JS client for ESPN's fantasy API (`League`, `Boxscore`, `Player`, `DraftPlayer`, `FreeAgentPlayer`). |
| 13 | nflverse/nflverse-pbp | 351 | 2026-09-11 | R | CC-BY-4.0 | nflverse PBP build pipeline; `models/model_data.R` prepares EP/CP/FG/WP training datasets. |
| 14 | fivethirtyeight/nfl-elo-game | 350 | 2023-05-02 | Python | MIT | 538's NFL Elo forecasting game; `Forecast.forecast(games)` + Elo benchmark. |
| 15 | sedemmler/WagerBrain | 315 | 2020-05-02 | Python | MIT | Betting-math package: American/decimal/fractional odds conversion (Fraction/gcd-exact). |
| 16 | BenBrostoff/draftfast | 299 | 2026-02-05 | Python | none | DK/FD lineup optimizer on OR-Tools (rule sets per site/sport, 56 py files). |
| 17 | uberfastman/yfpy | 268 | 2026-04-21 | Python | none | Typed Python models over the Yahoo Fantasy Sports REST API. |
| 18 | jordantete/OddsHarvester | 254 | 2026-09-28 | Python | MIT | OddsPortal scraper with real CLI (`live`, `historic`, `upcoming`, `community`, `team`); 175 py files + HAR fixtures. |
| 19 | nflverse/nflreadpy | 223 | 2026-09-09 | Python | MIT | Python port of nflreadr; transparent memory/filesystem caching with expiry. The live Python nflverse client. |
| 20 | FantasyFootballAnalytics/ffanalytics | 190 | 2026-09-09 | R | none | R package scraping FantasyPros ECR + projections/ADP. |
| 21 | nflverse/nflreadr | 115 | 2026-09-17 | R | none | R downloader for all nflverse data (52 R files, memoized `rds_from_url`). |
| 22 | dynastyprocess/data | 110 | 2026-09-28 | data | GPL-3.0 | Open fantasy data repo (991 CSVs: FP ECR, ADP, projections). Live data source. |
| 23 | kachence/polymm | 100 | 2026-08-16 | Python | MIT | Polymarket sports market-making/arbitrage bot (124 py + SQL, de-vig logic). |
| 24 | ffverse/ffscrapr | 96 | 2024-11-01 | R | none | R API client for fantasy league platforms (112 R files). |
| 25 | derekrbreese/fantasy-football-mcp-public | 87 | 2026-09-06 | Python | MIT | Production Yahoo Fantasy MCP server (lineup optimization, parallel processing); 87 py files + tests. |
| 26 | joeyagreco/leeger | 86 | 2024-12-25 | Python | MIT | Fantasy-league stats engine: 190 py files of typed models (standings, streaks, smart wins). |
| 27 | SwapnikKatkoori/sleeper-api-wrapper | 83 | 2023-05-22 | Python | MIT | Sleeper API wrapper (leagues/drafts/players). |
| 28 | asonty/ngs_highlights | 62 | 2022-01-04 | R | none | Open NGS player-tracking data (564 TSVs, 2017–2019) + R fetch utilities. Rare. |
| 29 | gtonic/nfl_mcp | 24 | 2026-09-24 | Python | MIT | NFL-intelligence MCP server: 221 py files with **rest-of-season projections** (`nfl_mcp/ros.py` per-week expected points for trade/drop/IR decisions), ESPN newsfeed + Sleeper API, evals/. |
| 30 | odds-api/odds-api | 31 | 2026-09-27 | TypeScript | Apache-2.0 | Odds API's official repo — OpenAPI spec, SDKs, streaming **MCP server** (zod-validated). Garrett's own odds provider; directly pluggable. |

## Class (b) — marginal (34)

Real code, but smaller, older, archived, data-only, or likely already seen-and-skipped by pass 1:

1. nflverse/nflseedR (34★) — season simulator (`double_games` Monte Carlo sim plumbing).
2. nflverse/nfl4th (23★) — 4th-down decision calculator (loads archived xgboost FD/WP models).
3. nflverse/nflplotR (24★) — ggplot2 NFL viz helpers (logos, fields). Presentation only.
4. nflverse/nflverse-rosters (27★) — roster-build pipeline (Shield API + nflverse player data merge).
5. nflverse/nflverse-pfr (10★, GPL-3.0) — Pro-Football-Reference scrape builder (14k files, mostly artifacts).
6. dos-2/oddshub (125★, Apache-2.0) — terminal UI for odds analysis (56 Go files). Viewer, not a model.
7. HintikkaKimmo/surebet (87★, MIT) — arbitrage-calculation library. Narrow but clean.
8. jjti/ff (78★) — fantasy draft assistant; `data/main.py` scrape→aggregate→upload of ESPN/CBS/NFL projections to S3.
9. krmisystems/fantasy-football-manager (91★, MIT) — ESPN draft/lineup tools packaged for Codex/MCP clients. Agent-harness flavor.
10. sanchitvj/sports_betting_analytics_engine (57★, MIT) — `betflow` real-time sports analytics platform (118 py + 85 SQL). Platform, not NFL models.
11. chanzer0/NFL-DFS-Tools (50★) — NFL classic + showdown optimizers and GPP tools.
12. dfs-with-r/coach (51★, GPL-3.0) — DFS lineup-optimization R package (37 R files).
13. agad495/DKscraPy (47★) — DraftKings Sportsbook scraper (thin, 3 py files).
14. slieb74/NFL-Betting-Data (43★) — over/under prediction notebooks (22 ipynb). Analysis, not library.
15. blnkpagelabs/nflscraPy (41★, MIT) — NFL datasets + scraping functions (box-score parsing).
16. romanlutz/NFLPlayPrediction (38★) — play-success prediction (sklearn + PCA/ANOVA feature selection). Dated but method-complete.
17. TheoViel/nfl_impact_detection (36★) — Kaggle NFL Impact Detection solution (torch 3D-CNN on helmet-sensor video). CV-heavy, tangential.
18. Brian-Doucet/nfldfs (35★) — CLI scraping NFL DFS salary/points data across seasons.
19. ratsam3474/autoarbitrage (35★) — automated cross-book arbitrage (pydantic `Opportunity` models).
20. Deryck97/nfl_nextgenstats_data (33★) — weekly NGS scraped CSVs (8 files). Data-only.
21. ThompsonJamesBliss/WeatherData (30★) — NFL game weather CSVs 2000–2020. Data-only; weather is a GSE total-signal input.
22. k5cents/fflr (29★, GPL-3.0) — ESPN fantasy data in R (71 R files).
23. zackthoutt/nfl-player-stats (98★, MIT) — Django app modeling every NFL player's recorded stats. App, not library.
24. bcongelio/nfl-analytics-with-r-book (77★, CC0-1.0) — published CRC textbook repo (11 qmd chapters). Reference value.
25. bcanfield/southpaw (58★) — FanDuel API wrapper + lineup automation.
26. BlairCurrey/nfl-analytics (8★) — NFL spread-prediction pipeline (sklearn LinearRegression, train/test, MSE/MAE). Small but end-to-end.
27. joeyagreco/sleeper (39★, MIT) — thinner second Sleeper wrapper.
28. KBThree13/mcp_espn_ff (48★, MIT) — tiny FastMCP wrapper around `espn_api` (9 files).
29. DanielTomaro13/sportsdata-mcp (20★, MIT) — 841 tools across 64 providers. Broad but shallow per sport.
30. odds-api-io/odds-api-python (10★, MIT) — official SDK for odds-api.io (**different provider** than the-odds-api; typed client with rate-limit/validation errors).
31. haris-sujethan/live-sportsbook-arbitrage (1★) — live arb tool + research notes + browser extension; 75 sqlite artifacts suggest real usage.
32. JovaniPink/awesome-nfl-data (2★, MIT) — curated NFL data-source catalog with a validating test suite. List, not code.
33. WFord26/BetTrack (15★, MIT) — **wiki-sourced lead.** FastMCP server (557 files) for betting odds + ESPN data with player props, live scores, dashboard API; wiki documents bookmaker analytics, CLV-by-bookmaker endpoints, automated odds syncing across 7 leagues (NFL hourly window). Bet-tracking + CLV analytics with an MCP face.
34. nflverse/nfl_data_py — archived; superseded by nflreadpy (also listed in class (a) #10).

## Class (c) — duplicate/overlap (2)

1. **kachence/polymm** — also class-(a) #23; overlaps `thiagocavalheiro/polymarket-sports-trading-bot` (pass-1 keeper). Distinct implementation (market-making/de-vig vs. trading bot) — keep both, overlap noted.
2. **nflverse/nflverse** — 61★ metapackage that just attaches the nflverse suite. Overlaps class-(a) nflverse entries; not independently valuable.

## Checked and rejected

`veltman/nflplays` (CSV only), `Externoak/LaLigaApp` + `jonortega20/fantasybot` (LaLiga, not NFL), NBA repos (`kyleskom/NBA-Machine-Learning-Sports-Betting` 1723★, `NBA-Betting/*`, `whisdev/NBA-prediction`), `nutcas3/lets-bet` (Kenya/Nigeria platform), `masterai-top/Overseas-Lottery-Platform-Source-Code` (lottery spam), `cruuz/2k-football-mod-tools` (video-game mods), `api-evangelist/*` (API profiles), ~40 zero-star 2026-09-28 dashboard/pickem stubs (correctly below pass-1's bar), hardware widgets (`nfl-led-scoreboard`, `ha-nfl`), chatbots (`fantasy_football_chat_bot`, `sleeper-ff-bot`), `nmelhado/league-page` (site builder), league-automation scripts.

## Wiki re-check results

- **`NFL playbook` wikis (p1):** junk — Madden UPC lists, Reddit clients, fan notebooks. No keepers.
- **`NFL analytics` wikis (p1–3):** p1–2 yielded **one genuine lead → WFord26/BetTrack** (above, class-(b) #33). p3 was spam/essays — confirms pass 1's "pages 3+ are spam" for this query family too.
- **`nflverse` wikis:** only 12 results total; p1–2 are fragments of downstream-project wikis (a "process meter" built on nflverse EPA/success rate; a browser data-engine on nflreadpy) with no new repo names; p3 empty. The nflverse repos themselves were already captured via the API cuts.

## Verdict: was pass 1's "29 keepers from 1,000" adequate?

**No — recency-biased by construction, and it missed the foundation.** The GitHub Search API caps at 1,000 results, so pass 1's `sort=updated` covered ~1,000 of **23,941** NFL repos (~4.2%). Everything foundational and old — nflgame (1.3k★), nfldb (1.1k★), the entire nflverse R/Python stack, the two big DFS optimizers, 538's NFL Elo, the ESPN API clients, the ffanalytics R ecosystem — was structurally invisible. The re-cut scanned 1,094 *different* repos and produced **30 class-(a) misses plus 34 marginals**, several of which (nflverse suite, nflgame/nfldb, the two big DFS optimizers, odds-api's official repo, georgedouzas/sports-betting) are more important to GSE than most of pass 1's 29. Pass 1's bar was sound (its freshness window is mostly 0-star stubs, and 12 of its 29 re-surface in these cuts — they're legit). The fix: merge these 30 in. The two passes are almost perfectly complementary — recency vs. authority.

## Caveats

1. Pages 11–15 of the original query are impossible — GitHub 422s past result 1,000; nothing was missed there.
2. Several nflverse/R repos report `NOASSERTION`/no license — reuse needs per-repo confirmation.
3. `BurntSushi/nflgame`, `nfldb`, `nfl_data_py`, `fivethirtyeight/nfl-elo-game` are archived — reference value, not live dependencies.
4. Raw evidence (66 per-repo JSON files with file trees + probed source heads) lives at `/tmp/wave-a/evidence/` — ephemeral scratch, not the deliverable.
