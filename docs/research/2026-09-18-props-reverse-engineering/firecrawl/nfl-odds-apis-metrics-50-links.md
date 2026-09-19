# 50 Odds API / Odds-Derived Metrics URLs

- **Date:** 2026-09-18
- **Source method:** Every URL below was verified live with `curl` (browser UA, following redirects) on 2026-09-18/19. Only URLs returning HTTP 200/202 after redirects are included. No URLs were guessed or invented.
- **Rebuild note:** This file rebuilds a list whose earlier draft was lost. The companion historical-odds list (`nfl-historical-odds-50-links.md`) is not present in the repo, so cross-list dedupe against it was not possible; historical-odds-dataset URLs were deliberately excluded here to avoid colliding with it.
- **Excluded despite being real:** pro-football-reference.com, api-sports.io, betfair.com, oddsjam.com (403 bot-wall to curl); betstamp.app, sumnermetrics.com, kalshi.com (timeouts/blocked); sportsbookreview subpages, covers consensus/trends pages, actionnetwork /nfl/pro (404/dead); imgarena.com (redirects into sportradar.com, kept once); fantasylabs props page (redirects to subscribe paywall).

## Odds APIs & official docs

1. https://the-odds-api.com/liveapi/guides/v4/ — The Odds API v4 developer docs; GSE's existing odds provider (`THE_ODDS_API_KEY`), free 500 requests/month tier, NFL markets + historical odds endpoints.
2. https://the-odds-api.com/ — The Odds API homepage/pricing; baseline commercial odds API GSE already integrates against.
3. https://oddspapi.io/docs — OddsPapi API docs (`api.oddspapi.io/v4`); fixtures, odds, historical odds, scores, settlements, markets endpoints with `apiKey` auth — GSE's second odds source.
4. https://oddspapi.io/ — OddsPapi homepage/plans; documents the free quota tiers GSE's credit governor is sized against.
5. https://pinnacle.com/en/api — Pinnacle's official API page; Pinnacle is the sharpest book and the industry closing-line benchmark — GSE's CLV reference.
6. https://sportsgameodds.com/docs/ — SportsGameOdds API docs; multi-book real-time odds feed with a free tier, candidate fallback odds source.
7. https://www.opticodds.com/ — OpticOdds real-time odds feed; low-latency multi-sportbook odds API, paid.
8. https://developer.sportradar.com/ — Sportradar developer portal; official league-data odds feeds (paid), reference for canonical odds schemas.
9. https://www.lsports.eu/ — LSports real-time sports data/odds feeds (paid); in-play odds feed vendor used by books.
10. https://rapidapi.com/hub — RapidAPI marketplace; discovery surface for niche sports-odds APIs with free tiers.
11. https://betfair-developer-docs.atlassian.net/wiki/spaces/1smk3cen4v3lu/overview — Betfair Exchange API-NG docs; exchange (back/lay) odds are the purest market-implied probabilities — GSE vigorish-removal reference.

## Line movement & odds screens

12. https://www.donbest.com/ — Don Best real-time odds screen; the pro standard for live line moves across books (paid).
13. https://www.sportsbookreview.com/ — SBR odds hub; multi-book NFL odds grid plus line-history pages, free.
14. https://www.covers.com/sport/football/nfl/odds — Covers NFL odds board; consensus lines with opening vs current comparison, free.
15. https://www.vegasinsider.com/nfl/odds/las-vegas/ — Vegas Insider Las Vegas odds; Vegas consensus lines with movement, free.
16. https://vsin.com/nfl/odds/ — VSiN NFL odds page; real-time odds from DraftKings/Circa with pro analysis, free.
17. https://www.actionnetwork.com/nfl/odds — Action Network NFL odds; live odds grid across major US books, free.
18. https://www.oddsportal.com/american-football/usa/nfl/ — OddsPortal NFL odds comparison; deep book coverage with opening/closing archive per game, free.
19. https://www.scoresandodds.com/ — ScoresAndOdds; live odds screen plus historical results/ATS database, free.
20. https://www.sportsbettingdime.com/nfl/odds/ — SportsBettingDime NFL odds; odds comparison with trend content, free.
21. https://www.lineups.com/nfl/odds/ — Lineups NFL odds; clean multi-book odds grid, free.

## Betting splits / consensus / steam / reverse line movement

22. https://www.actionnetwork.com/nfl/public-betting — Action Network public betting splits; ticket% vs handle% per game — the raw input for RLM/steam detection, free.
23. https://vsin.com/nfl/nfl-top-plays-based-on-betting-splits-power-ratings-and-trends-for-week-2/ — VSiN Week 2 splits systems piece; documents how DraftKings/Circa money-vs-ticket discrepancies convert to ATS systems, free article.
24. https://www.bettingpros.com/nfl/picks/ — BettingPros NFL consensus picks; aggregates expert/book consensus, free.
25. https://www.betql.co/ — BetQL (Action Network); sharp-money signals, line-movement alerts and best-bet engine, freemium.
26. https://www.sportsinsights.com/ — Sports Insights; the original betting-splits/steam-move tracker (now Action Network family), paid.
27. https://www.oddsportal.com/dropping-odds/ — OddsPortal dropping odds; flags steam moves as prices collapse across books, free.
28. https://www.oddsportal.com/blocked-odds/ — OddsPortal blocked odds; books pulling prices = strongest steam signal, free.
29. https://www.oddstrader.com/ — OddsTrader; odds comparison plus line-movement tools, free.
30. https://props.cash/ — Props.cash; player-prop odds screen across books with line-movement tracking, freemium — props are a GSE watch item even though `picks` has no prop market.

## Odds-derived metrics & market-implied ratings

31. https://thepowerrank.com/football/nfl/ — The Power Rank NFL; market-derived team ratings built from spreads, free — closest public proxy of market-implied strength.
32. https://www.espn.com/nfl/fpi — ESPN Football Power Index; market-aware predictive ratings, free — benchmark for GSE model comparison.
33. https://masseyratings.com/cf/nfl/ratings — Massey NFL ratings composite; aggregates 100+ computer ratings, free — ensemble benchmark.
34. https://www.bettingpros.com/nfl/odds/ — BettingPros NFL odds; consensus futures/Super Bowl odds imply market title probabilities, free.
35. https://www.pickswise.com/nfl/ — Pickswise NFL; model picks vs market lines with ATS records, free — calibration reference.
36. https://www.sportsline.com/nfl/ — SportsLine NFL; proven-model projections against the spread, paid — external model benchmark.
37. https://www.dratings.com/sports/nfl-football-ratings/ — DRatings (Dunkel) NFL ratings; long-running power ratings vs lines, free.
38. https://www.unabated.com/ — Unabated; sharp tools (CLV tracking, no-vig calculators, alternate-line EV), paid — pro-grade odds-derived workflow reference.
39. https://pregame.com/ — Pregame line service; veteran odds service with consensus data, paid.

## Bookmakers & odds data vendors

40. https://www.betonline.ag/sportsbook/football/nfl — BetOnline NFL sportsbook; early/overnight lines — BetOnline opens numbers first, key for opening-line capture.
41. https://geniussports.com/ — Genius Sports; official NFL data partner feeds (paid), league-canonical data provenance.
42. https://sportradar.com/ — Sportradar; official NFL data distribution partner (paid), odds + data feeds.
43. https://www.statsperform.com/products/opta-data/ — Stats Perform Opta; premium sports data feeds including odds-adjacent products (paid).

## Open-source odds tooling

44. https://github.com/the-odds-api/samples-python — Official The Odds API Python samples; reference client patterns for GSE's odds ingestion.
45. https://github.com/the-odds-api/samples-nodejs — Official The Odds API NodeJS samples; same, for the TS side of the repo.
46. https://github.com/coreyjs/the-odds-api — Community The-Odds-API.com client; alternative integration patterns.
47. https://github.com/Scorpio1987/odds-api-client — Python client for The Odds API; normalizer/mapper reference.
48. https://github.com/robbiehaynes/arbitrage-finder — Arbitrage finder on The Odds API; cross-book odds comparison logic, reusable math.
49. https://github.com/cvidan/bet365-scraper — bet365 odds scraper (Selenium); book-direct line-capture technique reference.
50. https://github.com/golden-mane-labs/Sports-Betting-Demo — OddsPortal multi-sport odds scraper (8 sports); open-source line-capture pipeline GSE can study.
