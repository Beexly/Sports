# Firecrawl Session: Historical NFL Odds — 50 Verified Public URLs

**Access date:** 2026-09-18
**Session focus:** historical NFL opening/closing odds, line-movement histories, archived odds pages, downloadable datasets, closing-line-value resources. Historical complement to the Sports repo's existing The Odds API live-odds implementation.
**Access policy:** public surfaces only. Anything login-gated is marked. No bypass instructions.

## A. Multi-season closing-odds archives (Covers Sports Odds History — free)

1. https://www.covers.com/sportsoddshistory/nfl-game-odds/ — Master index of every NFL season 1952-present; the map page for crawling the entire archive. 1952-1977 odds via Newspapers.com (night-before lines), 1978-present via Pro Football Reference (closing odds).
2. https://www.covers.com/sportsoddshistory/nfl-game-season/?y=2002 — Full 2002 season game-by-game odds; template for season-level crawls of any modern year.
3. https://www.covers.com/sportsoddshistory/nfl-game-season/?y=1990 — Full 1990 season odds page; pre-1995 seasons are rare in free closing-odds data.
4. https://www.covers.com/sportsoddshistory/nfl-game-season/?y=1966 — Full 1966 season odds page; documents night-before lines from the pre-merger AFL/NFL era.
5. https://www.covers.com/sportsoddshistory/nfl-game-season/?y=1971 — Full 1971 season odds page; template showing how deep (early-70s) the archive reaches.
6. https://www.covers.com/sportsoddshistory/nfl-game-team/?tm=NEP — Every Patriots game line 1952-present; template for all 32 franchise history pages.
7. https://www.covers.com/sportsoddshistory/nfl-game-team/?tm=BUF — Every Bills game line 1952-present; second team-history template proving decade-spanning coverage.

## B. Timestamped line-movement histories (free)

8. https://www.vegasinsider.com/nfl/odds/las-vegas/line-movement/dolphins-@-jets.cfm/date/9-16-18/time/1300 — Dolphins @ Jets 2018 line-movement trail; timestamped spread/total/ML/price change logs per game, the open-to-close evidence trail.
9. https://www.vegasinsider.com/nfl/odds/las-vegas/line-movement/chiefs-@-chargers.cfm/date/12-16-21 — Chiefs @ Chargers 2021 movement page; same timestamped format, recent-season example.
10. https://www.vegasinsider.com/nfl/odds/las-vegas/line-movement/texans-@-titans.cfm/date/12-15-19 — Texans @ Titans 2019 movement page; per-book spread and total movement logs.
11. https://www.vegasinsider.com/nfl/odds/las-vegas/line-movement/packers-@-lions.cfm/date/12-29-19 — Packers @ Lions 2019 movement page; end-of-season line-shock example.
12. https://www.vegasinsider.com/nfl/odds/offshore/line-movement/bengals-@-chargers.cfm/date/12-02-12/time/1625 — Bengals @ Chargers 2012 offshore movement page; offshore (Pinnacle-style) line track for CLV benchmarking.
13. https://www.thespread.com/nfl-articles/2010-nfl-week-1-line-movement-report-a-odds/ — Archived 2010 Week 1 line-movement report with full timestamped open-to-close logs; rare surviving pre-2015 movement archive.
14. https://www.vegasinsider.com/nfl/nfl-week-1-odds-2026/ — VegasInsider 2026 Week 1 odds page with opening lines and movement commentary; current-season template for the weekly archive crawl.

## C. Downloadable datasets (free / free-account)

15. https://www.kaggle.com/datasets/tobycrabtree/nfl-scores-and-betting-data — Spreadspoke NFL scores + betting data, spreads since 1979; the canonical free game-lines CSV (FREE Kaggle account required to download).
16. https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv — nflverse games.csv, 1999-present with spread_line/total_line/moneyline fields; one-stop free market-lines download (CAVEAT: provenance of whether its line is a true close is documented as uncertain by downstream users — use as first pass, validate against closers).
17. https://github.com/flancast90/sportsbookreview-scraper/blob/HEAD/README.md — SportsbookReview scraper with pre-scraped 2011-2021 NFL JSON archive; real opening-to-closing spread/total pairs plus closing moneylines across books.
18. https://github.com/willvernon/nfl_scores_lines — NFL game lines CSV 1999-2024/25 (spread, total, moneyline, prices); independent cross-check source for nflverse/Spreadspoke lines.
19. http://www.aussportsbetting.com/data/historical-nfl-results-and-odds-data/ — Historical NFL results and odds CSV, 2006-2020, 45 fields per game; rich feature set beyond lines (weather, etc.).
20. http://www.repole.com/sun4cast/data.html — Original source data 1978-2013 cited by multiple NFL modeling projects; one of the oldest public historical data pages.
21. https://github.com/bobby-king3/nfl-market-movement-tracker — 2025-2026 season: 1.8M+ rows, 636 snapshots, 30+ operators at 4x daily; opening/closing lines and movement models for the current market.
22. https://github.com/nkgilley/sbrscrape — Python SportsbookReview odds scraper (per-book spreads, totals, moneylines, prices); rebuild-your-own-archive tooling.
23. https://github.com/anaborne/nfl-pricing-model — Vendors nflverse games.csv 1999+; explicitly documents the closing-line provenance uncertainty every consumer should read.

## D. Odds reference / archive pages (free)

24. https://www.sportsoddshistory.com/nfl-regular-season-win-total-results-by-team/ — Archived NFL regular-season win-total results by team; the futures/lookahead counterpart to game lines.
25. https://www.rotowire.com/betting/nfl/odds — RotoWire NFL odds page; consolidated current/historical odds reference used as a line source by academic projects.
26. https://www.oddsportal.com/american-football/usa/nfl-2023-2024/standings/ — OddsPortal NFL 2023/24 results archive; per-season pages carry per-game opening and closing odds.
27. https://www.oddsportal.com/american-football/usa/nfl-2019-2020/standings/ — OddsPortal NFL 2019/20 results archive; second season template proving archive depth (seasons back to ~2008).
28. https://www.oddsportal.com/american-football/usa/nfl-2014-2015/standings/ — OddsPortal NFL 2014/15 results archive; third season proving the decade-plus backfill.
29. https://www.actionnetwork.com/nfl/nfl-odds-spreads-over-unders-week-10-2018 — Archived Action Network 2018 Week 10 odds page; dated lookahead-line snapshot, ideal for lookahead-vs-close studies.
30. https://www.actionnetwork.com/nfl/nfl-betting-primer-trends-stats-systems-for-every-game — Action Network weekly betting primer (archived weekly); systems history, public splits, 60 seasons of final scores (Bet Labs systems content is PAYWALLED — primer itself is free).
31. https://www.actionnetwork.com/nfl/broncos-vs-chiefs-picks-props-odds-predictions-monday-night-football-sept-14 — Example Action Network game page with spread/total/moneyline tables; template for per-game odds pages.
32. https://www.pro-football-reference.com/years/2026/games.htm — Pro Football Reference yearly games hub (pattern years/YYYY/games.htm links every season); closing Vegas lines feed downstream archives.

## E. Free public ESPN API endpoints (no key; undocumented — treat as unstable)

33. https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard — ESPN public NFL scoreboard JSON; current/historical game IDs that anchor the odds endpoints below.
34. https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401249063/competitions/401249063/odds — ESPN per-game odds JSON (event/provider odds; event IDs vary).
35. https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401249063/competitions/401249063/odds/1002/history/0/movement?limit=100 — ESPN odds movement history JSON; timestamped line-movement feed per event/provider, the closest free equivalent of a movement API.
36. https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2021/types/2/teams/12/odds-records — ESPN team odds records JSON (ATS/ML records vs lines); validates closing-line performance.

## F. Pinnacle (the sharp-odds benchmark)

37. https://github.com/pinnacleapi/pinnacleapi-documentation — Official Pinnacle API docs (Lines API v2); docs are public, API access requires a Pinnacle account — the route to the sharpest closing lines in the industry. (ACCOUNT-GATED API; docs free.)
38. https://www.quantargo.com/help/r/latest/packages/pinnacle.API/2.3.3 — pinnacle.API R package reference docs; free documentation of the client-side workflow for pulling Pinnacle lines.

## G. GitHub modeling repos with documented line pipelines (free)

39. https://github.com/speencers/nfl-math-spencerronit — 1,855 games 2018-2024 with closing totals/odds; clean modern closing-line sample.
40. https://github.com/koltbern15/sports-betting — Spreadspoke pipeline (spread/total/over-under EDA + models); documents the standard free-stack wiring.
41. https://github.com/isai-salazar/nfl-predictor — Spreadspoke-based predictor; second independent pipeline example for the same source data.
42. https://github.com/shaanj2469/nfl-power-ratings-model — nflverse + Spreadspoke with model MAE within 0.28 pts of Vegas closing lines; proves closing-line benchmark quality.
43. https://github.com/macn84/nfl-predictor — nflverse closing spreads from the schedules endpoint; minimal end-to-end closing-line consumer.
44. https://github.com/hienha34/predicting-nfl-over-or-under-totals — RotoWire archive + AusSportsBetting 2006-2020 (3,738 games, 45 fields); totals-modeling dataset provenance.

## H. Research / source-map documentation (free)

45. https://github.com/alexandrosh8/sharp-ev-picks/blob/HEAD/docs/research/historical-odds-backtest-data-2026-06-21.md — Audit of public historical odds datasets and their limitations; the source map that ranks these sources by reliability.
46. https://github.com/ryanpmcintire/nfl_py3/blob/HEAD/docs/data_source_scout_v5.md — Historical-odds source scout (v5); documents Wayback/CDX methodology for VegasInsider boards and measures capture density — the playbook for reconstructing movement history from archives.
47. https://github.com/gesmith0606/nfl_data_engineering/blob/HEAD/.planning/SOTA_RESEARCH.md — SOTA research on historical odds sources; documents paid Odds API coverage and free alternatives.
48. https://github.com/gesmith0606/nfl_data_engineering/blob/HEAD/.planning/PROPS_DATA_PLAN.md — Props historical pricing candidate table; adjacent lane documenting which props-odds history exists (mostly paid).

## I. Academic / market-efficiency studies (free)

49. https://arxiv.org/pdf/1211.4000 — "The Performance of Betting Lines for Predicting NFL Games"; 2,560 games 2002-2011 with opening AND closing lines, open-vs-close MSE analysis — directly on-topic CLV-adjacent research.
50. https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0287601&type=printable — PLOS ONE 2023 "A statistical theory of optimal decision-making in sports betting"; uses NFL spread/total data to test market efficiency — peer-reviewed methodology for evaluating closing lines.

## Five strongest finds

1. Flancast90's pre-scraped SportsbookReview archive (2011-2021): real opening-to-closing spread/total pairs and closing moneylines across books — the single best free open/close dataset.
2. Bobby King's 2025-2026 market-movement tracker: 1.8M+ rows, 636 snapshots, 30+ operators at 4x daily — the only high-frequency movement dataset in the pool.
3. Covers' Sports Odds History: game odds 1952-present sliced by season and franchise — the deepest free closing-line archive anywhere.
4. nflverse games.csv (1999-present): one free download with spread/total/moneyline fields, with a documented closing-line caveat that keeps the research honest.
5. VegasInsider's per-game line-movement pages: timestamped spread/total/ML/price change logs, plus a Wayback/CDX playbook for reconstructing 2005-2016 movement.
