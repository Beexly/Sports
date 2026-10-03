# 50 NFL Statistics / Advanced-Metrics API URLs

- **Date:** 2026-09-18
- **Source method:** Every URL below was verified live with `curl` (browser UA, following redirects) on 2026-09-18/19. Only URLs returning HTTP 200/202 after redirects are included. No URLs were guessed or invented.
- **Rebuild note:** This file rebuilds a list whose earlier draft was lost. The companion historical-odds list (`nfl-historical-odds-50-links.md`) is not present in the repo, so cross-list dedupe against it was not possible; no URL here duplicates List A (`nfl-odds-apis-metrics-50-links.md`).
- **Excluded despite being real:** pro-football-reference.com and stathead subpages (403 bot-wall to curl — Stathead's marketing page verified instead); site.api.espn.com returned 403 with a browser UA but 200 with plain curl (noted below); mysportsfeeds.com, sumnermetrics.com, ras.football, nflfastR/nfl4th pkgdown docs (timeouts); footballoutsiders.com (dead); operations.nfl.com player-tracking subpage, espn next-gen-stats story, rotowire/4for4/footballguys subpages (404 — homepages verified instead).

## nflverse open-data ecosystem (play-by-play, EPA, WP, charting-adjacent)

1. https://nflverse.nflverse.com/ — nflverse docs home; the free, open backbone of GSE's stat layer — play-by-play, rosters, schedules, 1999-present.
2. https://nflreadr.nflverse.com/ — nflreadR docs; fastest loader for nflverse data into R/Python — GSE ingestion reference.
3. https://nflplotr.nflverse.com/ — nflplotR docs; NFL-themed visualization package — charting/visual layer reference.
4. https://github.com/nflverse/nflverse-data — nflverse data releases repo; versioned CSV/parquet data drops GSE can pin and mirror.
5. https://github.com/nflverse/nflverse-data/releases — nflverse data releases page; per-release changelogs — provenance tracking for GSE datasets.
6. https://github.com/nflverse/nflfastR — nflfastR repo; the original play-by-play scraper with EPA/WP models — GSE's EPA methodology reference.
7. https://github.com/nflverse/nflreadr — nflreadR repo; data-loading code GSE can port patterns from.
8. https://github.com/nflverse/nfl4th — nfl4th repo; 4th-down decision bot logic (win probability) — WP modeling reference.
9. https://github.com/nflverse/nflseedR — nflseedR repo; season simulation engine — Monte Carlo simulation reference for GSE.
10. https://github.com/nflverse/nflplotR — nflplotR repo; plotting code for analytics visuals.
11. https://github.com/nflverse/nflverse — nflverse meta repo; org index linking every package and data release.
12. https://github.com/nflverse/nflverse-pbp — nflverse play-by-play data repo (successor of guga31bb/nflfastR-data); the actual parquet/CSV pbp files GSE ingests.

## Official NFL & Next Gen Stats

13. https://nextgenstats.nfl.com/ — NFL Next Gen Stats home; official player-tracking metrics (speed, separation, completion probability) — free.
14. https://nextgenstats.nfl.com/stats/top-plays — NGS top-plays stats; advanced tracking leaderboards (expected YAC, aggressiveness), free.
15. https://www.nfl.com/stats/player-stats/ — NFL.com official player stats; league-canonical seasonal stat tables, free.
16. https://www.nfl.com/stats/ — NFL.com stats hub; entry point to team/player splits, free.
17. https://operations.nfl.com/ — NFL Football Operations; explains NGS/player-tracking systems and data definitions — schema context for tracking data.

## Player tracking / combine / prospect data

18. https://www.kaggle.com/competitions/nfl-big-data-bowl-2025 — NFL Big Data Bowl 2025 (Kaggle); free full player-tracking dataset with prize-winning notebooks — GSE tracking-model training data.
19. https://www.kaggle.com/competitions/nfl-big-data-bowl-2024 — NFL Big Data Bowl 2024 (Kaggle); prior year tracking dataset — more training rows, free.
20. https://www.mockdraftable.com/ — Mockdraftable; combine measurables spider charts for every prospect, free — athleticism priors.
21. https://www.nflcombineresults.com/ — NFL Combine Results; searchable historical combine data, free — draft-model inputs.
22. https://www.playerprofiler.com/ — PlayerProfiler; athletic comps and advanced college-to-pro metrics, freemium — prospect evaluation reference.

## Sports data APIs (free tiers and paid)

23. https://www.balldontlie.io/ — balldontlie API; free JSON sports API with NFL coverage — quick stat lookups without a key.
24. https://www.thesportsdb.com/ — TheSportsDB; free sports metadata API (teams, players, schedules) GSE already clients — enrichment layer.
25. https://sportsdata.io/ — SportsDataIO; full NFL stats/odds/projections API, paid — commercial-grade feed reference.
26. https://fantasydata.com/ — FantasyData; NFL stats and projections API, paid — feed-schema reference.
27. https://www.sports-reference.com/stathead/ — Stathead (Sports Reference); the deepest queryable NFL stat database, paid — research/verification tool.

## Analytics & advanced-metrics sites

28. https://rbsdm.com/ — RBSDM.com (Ben Baldwin); EPA/playoff-odds model interactives, free — GSE EPA-decomposition benchmark.
29. https://sumersports.com/ — SumerSports; charting-backed analytics (TPRR, pressure rates) with free articles — proprietary-metric benchmark.
30. https://www.sportsinfosolutions.com/ — Sports Info Solutions; the charting-data gold standard (paid) — defines what public EPA proxies can't reproduce.
31. https://www.sharpfootballanalysis.com/ — Sharp Football Analysis (Warren Sharp); situational/pre-snap tendency stats, freemium — playcalling-tendency reference.
32. https://ftnfantasy.com/ — FTN Fantasy/Data; DVOA's current home plus charting tools, paid — efficiency-metric benchmark.
33. https://www.establishtherun.com/ — Establish The Run; high-end matchup/usage analysis, paid — usage/efficiency reference.
34. https://the33rdteam.com/ — The 33rd Team; ex-NFL-coach film/analytics breakdowns, free — qualitative overlay for charting reads.
35. https://www.opensourcefootball.com/ — Open Source Football; public expected-points and win-probability research, free — open methodology GSE can audit.
36. https://www.sharpfootballstats.com/ — Sharp Football Stats; free advanced team stats (success rate, explosiveness), free — quick team-strength inputs.
37. https://www.footballguys.com/ — Footballguys; deep stats/projections archive, freemium — consensus-projection reference.
38. https://www.4for4.com/ — 4for4; snap counts, target shares, advanced fantasy stats, freemium — usage-metric reference.

## Reference & stats portals

39. https://www.teamrankings.com/nfl/ — TeamRankings NFL; predictive stats, trends and power ratings, free — GSE model benchmark.
40. https://www.espn.com/nfl/stats — ESPN NFL stats; standard stat leaders, free — sanity-check layer.
41. https://www.espn.com/nfl/qbr — ESPN Total QBR; proprietary QB efficiency metric, free — QB-rating benchmark.
42. https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard — ESPN hidden JSON API; free, no key — live scores/schedules/odds in JSON (note: returns 403 with browser UA, 200 with plain curl).
43. https://sports.yahoo.com/nfl/stats — Yahoo NFL stats; clean stat tables, free — secondary sanity-check.
44. https://www.cbssports.com/nfl/stats/ — CBS Sports NFL stats; splits and situational tables, free.
45. https://www.pff.com/nfl — PFF NFL hub; grades and premium charting content, freemium — grades benchmark (charting is paywalled).
46. https://www.rotowire.com/football/ — RotoWire NFL; news plus stats/injury data, freemium — injury/status feed reference.
47. https://www.fantasypros.com/nfl/stats/qb.php — FantasyPros QB stats; sortable advanced passing tables, free.
48. https://www.fantasypros.com/nfl/projections/qb.php — FantasyPros QB projections; consensus projections, free — projection-accuracy benchmark.
49. https://www.fanduel.com/research/nfl — FanDuel Research (formerly NumberFire); model-driven NFL projections and analysis, free.
50. https://www.footballdb.com/statistics/nfl/player-stats/passing/2026 — The Football Database NFL stats; deep historical stat tables, free — long-history reference.
