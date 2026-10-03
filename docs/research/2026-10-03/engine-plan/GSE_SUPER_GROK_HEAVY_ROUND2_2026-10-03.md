# GSE deep research, round 2 (2026-10-03, ~02:30 CT)

Rules held: URL and date on every claim. UNVERIFIED if the page was not opened or the number was not on it. Licence and point-in-time rule on every source. Round-1 measurements are not repeated. New measurements since round 1 are treated as given: PIT starter costs 0.0035 log loss vs the leaky actual starter; market-anchored engine 0.6107 vs de-vigged close 0.6098 on 1,914 games; availability add is inside noise; empirical score neighbourhood matches the spread market and does not beat the moneyline close.

## Ranked master table

| Rank | Item | Task | Segment | Source | Licence | PIT rule | Effect, n, citation | Cost | Hours | Flag |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Alt lines and team totals vs the main line | A, F | Derivatives | Holzhauer, Athletic, 2021-08-17 | Paywalled article; method is public | Price at decision time, not the close | No effect size. Claim: full-game NFL spread and total are the high-limit markets; alts are the soft ones. https://www.nytimes.com/athletic/2764957/2021/08/17/james-holzhauer-understanding-key-numbers-half-points-and-mispriced-markets-in-nfl-and-college-football/ | $0 if Neon already stores alts; else Odds API | 8 | BUILD-NOW |
| 2 | Joint PMF shifted off the market, scored on alts | F | Derivatives | nflverse games; nfelo method page 2020-11-01 | nflverse CC-BY-4.0 | Final scores post-game; features pre-kick | Key-number mass already measured. Calibration of a location shift vs reweight: UNVERIFIED | $0 | 8 | BUILD-NOW |
| 3 | Injury-news latency vs Neon snapshots | A, C | Latency | Neon OPEN/INTERIM/CLOSE since 2026-08-19; GDELT DOC | GDELT open; Neon is ours | Article seendate vs snapshot time | Minutes-to-move: UNVERIFIED in the literature. Measurable on our own 6 weeks of snapshots | $0 | 6 | BUILD-NOW |
| 4 | Prop close efficiency by stat, 2023-05 onward | A, D, E | Props | Odds API historical | Terms allow model training, forbid resale (2026-08-31) | Snapshot ≤ requested time | Vendor self-report only. No independent study opened | $119 one month if backfill is batched | 6 to pull, 12 to test | LATER this week |
| 5 | Game-status by the 4 p.m. ET rule, not a vintage column | B | Availability | Sporting News quoting NFL ops, 2024-09-10; 2022-23 manual scan | Policy text; content from nflverse | As-of = the rule, content from any later archive | Designation miss rates from round 1; practice-sequence rates still UNVERIFIED | $0 | 4 | BUILD-NOW |
| 6 | Wind from Open-Meteo previous-run | G | Weather | https://open-meteo.com/en/terms (2026-09-29) | Free tier non-commercial. Data CC-BY-4.0. Commercial needs a paid plan | Previous-run API, not ERA5 actuals | Borghesi 2008 is pre-smartphone books. Post-2020 residual vs close: UNVERIFIED | Paid plan price UNVERIFIED | 4 | LATER |
| 7 | DFS ownership from contest CSV | D | DFS | DraftKings support article | Contest CSV is post-lock, customer download. Redistribution UNVERIFIED | Post-lock only. Not a pre-lock projection | No edge size | $0 if we enter contests | 6 | LATER |
| 8 | Kalshi vs sportsbook after fees | A | Exchange | TrueEdge, 509 games, Sept 2026 | Vendor | Last quote, not synchronised | After fees Kalshi best on 17.6% of sides; NFL subset 22 of 32. Not a lead/lag vs the book | $0, already in lake | 4 | LATER |
| 9 | Formation from participation, not CV | H | Perception | nflverse participation | CC-BY-SA 4.0 | Lag ≥ 1 for training; live personnel from depth chart | No broadcast model at ≥90% opened | $0 | 0 this week | KILL for tonight |
| 10 | Madden ratings as a prior | H | Prior | EA content policy | Commercial use of game content disallowed | Release date of ratings UNVERIFIED | Incremental vs close UNVERIFIED | $0 | 0 | KILL until legal review |
| 11 | Open-to-close as a bet at the open | A | Sides | Szalkowski & Nelson, arXiv:1211.4000, 2002–2011, n=2,560 | arXiv open | Open vs close | Open MSE slightly better than close; difference insignificant. ~10% of games move ≥2. Pre-2020 | $0 | 2 to replicate on our snapshots | KILL as a standalone |
| 12 | Home-underdog, travel, referee totals, contract year | A, G | Sides | Levitt 2004; Nichols 2014; round-1 referee page | Mixed | Known at schedule release | Effects shrink or vanish after strength controls. Post-2020 residual vs close: unknown, prior is null | $0 | 0 | KILL |

---

## TASK A: Where the price is beatable

The new walk-forward is the constraint. On 1,914 games, a market-anchored engine with a PIT quarterback, Elo and availability does not beat the de-vigged moneyline close (0.6107 vs 0.6098; availability delta CI crosses 0). Any segment below has to be a different market, or a different time, or it is not an edge.

### (a) Openers vs closers

Szalkowski and Nelson, arXiv:1211.4000 (posted 2012-11-16, HTML mirror dated in search as 2026-08-24). 2,560 NFL games, 2002–2011. Opening line had a smaller mean squared error than the closing line. The difference was small and not significant. More than 2,000 games moved 1 point or less. About 10% moved 2 or more, and those games showed no consistent behavior afterward. https://arxiv.org/html/1211.4000v1

Levitt, Economic Journal 2004, saw prices and quantities for 19,770 bets by 285 bettors on 242 games in 2001. Informed traders moved the line toward efficiency. Secondary summary: https://loserwins.com/strategy/line-movement-value/ (2025-12-06). Primary PDF not opened this pass.

Home underdogs: Levitt’s mirrored 1980–2001 sample, 1,483 games, 53.3% cover. Szalkowski and Nelson 2002–2011, 805 home-underdog games, 50.8% cover, below the 52.38% break-even. https://loserwins.com/data-analysis/home-underdog-statistics/ (2025-12-06). Still present after 2020: unknown, and the later sample already failed.

A line-movement dataset on Zenodo (record 21765675, 2026-08-02) reports price discovery mostly 1–7 days out, and NFL preseason futures moving 0.3–0.4 points. It is not an NFL sides inefficiency study. https://zenodo.org/records/21765675

Verdict: open-to-close movement is mostly small. Betting the open because it will move is not supported. Still present after 2020: unknown. A coherent score model does not exploit this unless it is better than the open, which we have not shown.

### (b) Derivative markets

James Holzhauer, The Athletic, 2021-08-17. Full-game NFL spread and total are the high-limit markets and the toughest to beat. Most professionals cannot beat them on Sunday morning. When an alt is inconsistent with the main line, bet the alt, because lower limits mean a softer number. Push-chart weights: margin 3 is 20, margin 7 is 15, margin 10 and 14 are 11, on his NFL chart. https://www.nytimes.com/athletic/2764957/2021/08/17/james-holzhauer-understanding-key-numbers-half-points-and-mispriced-markets-in-nfl-and-college-football/

No published effect size, n, or post-2020 replication of alt-line mispricing was opened. Neil Greenberg’s win-total notes (2026-04-27) are a paid newsletter and are futures, not game derivatives. https://fancystats.substack.com/p/where-nfl-win-totals-are-mispriced

Verdict: this is the segment a coherent distribution can attack, because team totals, halves and alts are functions of the joint. Evidence of a remaining edge after 2020: unknown. Test: price alts from our PMF, compare to the book’s alt at the same timestamp, score log loss and CLV. Data we need: alt and team-total snapshots. Neon’s market mix is not confirmed to include them.

### (c) Player props

No independent closing-efficiency study by book was opened. A vendor walk-forward (predictionmarketspicks.com, 2026-10-01) claims 2024–25 top-decile lift of +13.6 pp on pass TDs (n=590), +9.7 on receiving yards (n=2,483), +12.8 on rushing yards (n=1,173), +9.4 on receptions (n=2,540). Pass yards and anytime TD failed. Treat as self-report. https://predictionmarketspicks.com/articles/nfl-player-prop-projections-vs-the-market

PropsEdge (2026-09-26) says anytime TD hold is often 6–10% and that secondary names are the mispricing. No sample. https://www.propsedge.io/blog/nfl-player-props-guide

Verdict: props are the plausible soft market because limits are lower and names are overbet. Still present after 2020: unknown until we score our own projections against a prop close. A distribution plus availability can exploit it only if the prop close is the grade, not a public projection.

### (d) Same-game parlays

Wizard of Odds, 2026-08-02. Illustrative Gaussian copula. In a stated 500-game slice (favorite by 3–7, total 45–51), a three-leg hit 20.4% vs 15.7% under independence. Correlation matrix is an example, not a book’s error. https://wizardofodds.com/article/same-game-parlays-the-mathematics-of-correlation/

No study opened that measures a book’s SGP price against the empirical joint and finds a signed error. Documented book correlation error: UNVERIFIED. A coherent joint is exactly the tool, and the test is the book’s SGP price vs our joint at the same time.

### (e) Kalshi / Polymarket vs sportsbooks

TrueEdge, 2026-09-29, 509 games, 579 sides. Before fees an exchange was the best price on 73.6% of sides. After fees, 55.4%. Kalshi was best on 17.6% (79 of 449). NFL subset after fees: 22 of 32 sides. Quotes were not synchronised (median book quote 59 minutes old at kickoff). https://www.trueedgewire.com/article/exchanges-vs-sportsbooks-best-price-after-fees-509-games

Pantera Research Lab, 2026-02-05: Kalshi leads Polymarket’s in-game repricing by a median 7 seconds on about 80% of large moves. That is exchange vs exchange, not vs a sportsbook. https://panteraresearchlab.xyz/research/the-super-bowl-of-prediction-markets-kalshi-and-polymarkets-battle-for-price-vs-liquidity/

Lead/lag of Kalshi vs a sportsbook close: UNVERIFIED. Our 772 Kalshi markets can be paired to Neon snapshots. That test is ours to run.

### (f) Injury-news latency

No paper opened with minutes from first public report to the line move. Secondary betting guides say Friday designations and the T-90 inactive window are when lines move. Not evidence. https://www.deucescracked.com/blog/nfl-injury-reports-betting-line-movement-guide (2026-09-23)

This is measurable. Neon has snapshots since 2026-08-19. A timestamped news source (below) gives the other clock. Six weeks is a small n. It is still the only latency test we can run before a historical odds backfill.

### (g) Live in-game

No NFL live-market closing-efficiency study opened. Pantera’s 7-second Kalshi lead is the only number. Live is a different engine. Not on the 24-hour path.

### (h) DFS

No published ROI for an ownership-leverage strategy was opened. The mechanism is real: a contest scores against the field, not against a close. Data rule: actual ownership is post-lock. Projected ownership is the feature. See Task D.

### What syndicates say

Holzhauer, 2021: do not expect to beat Sunday full-game spreads and totals; look for inconsistent derivative prices, and trust the higher-limit number. Levitt, 2004: the close is where informed money has already done the work, so the open is the softer moment, and even that edge was era-specific. Neither is a post-2020 NFL prop study.

BUILD THIS FIRST: score our joint against alt lines and team totals at a stored timestamp. Do not spend the night trying to beat the moneyline close. The new measurement already failed that test.

---

## TASK B: Point-in-time truth without a vintage archive

### Release rules, as opened

Sporting News, 2024-09-10, quoting the NFL operations site: practice report covers participation; game status report is due by 4 p.m. ET the day before the next game; in-game updates go to the broadcast, media and stadium board at the same time. https://www.sportingnews.com/au/nfl/news/nfl-injury-report-rules-penalties-violations-2024/05ab0439361a73dd047fec2f

A scan of the 2022-23 NFL Operations Manual, page 104, on FlipHTML5 (published 2022-07-14): Wednesday practice report no later than 4:00 p.m. New York time, or as soon as practice ends. Friday practice report and game status report no later than 4:00 p.m. New York time. Categories: Did Not Participate, Limited, Full. Game status: Out, Doubtful, Questionable. A player listed Out cannot be changed and must be one of the inactives. A player on the practice report who is absent from the game status report is treated as certain to play. Players practicing under designated-to-return or PUP are not listed on the practice or game status report until activated. https://fliphtml5.com/uryp/sdbq/NFL_Operations_Manual_2022-2023/104/

Inactives at 90 minutes: not in the manual excerpt opened. Round-1 primary was Pelissero, 2020-12-16, https://x.com/TomPelissero/status/1339219367083585538. Season-by-season changes since 2012: UNVERIFIED beyond the 2016 drop of Probable (round 1).

PIT rule this supports: for a Sunday game, Friday 4 p.m. ET is a legal as-of for the designation, even if we read the text from a later archive. Wednesday and Thursday 4 p.m. ET are legal as-ofs for that day’s practice report, if we can recover the page. The inactive list’s as-of is kickoff minus 90 minutes, if we can recover the list.

### Content sources

- nflverse injuries, 2009–present, one practice_status, date_modified. Not three days. Round 1.
- NFL game books: PDF linked from the game recap. Support article updated 2026-01-27. https://support.nfl.com/hc/en-us/articles/35869678028180-Game-Books. A scraper claims historical books from 2001. https://github.com/davidfischer/nfl-scraper. Coverage counts per season: UNVERIFIED. Game books list who was inactive after the game; they are not a T-90 publication stamp. PIT: content yes, timestamp no. Use kickoff-minus-90 as the rule only if the list matches the submitted inactives.
- Wayback CDX. Endpoint verified in a 2026-02 guide; CDX itself checked working 2026-09-06 by that author. https://maxintel.org/wayback-osint-guide-2026.html

Query pattern, not yet run:

```
https://web.archive.org/cdx/search/cdx?url=www.nfl.com/injuries/*&from=20120801&to=20260201&output=json&fl=timestamp,original,statuscode,digest&filter=statuscode:200&collapse=digest
```

Team-week URL patterns were not enumerated. Share of team-weeks recoverable: UNVERIFIED. Next query is that CDX call.

### Glazer, Binney, Seth 2025

Open access, Journal of Sports Analytics, first published 2025-01-26. https://journals.sagepub.com/doi/10.1177/22150218241304941. Abstract compares wAGL (franchise-tag weights) and WAIL (PFF WAR) to preseason vs end-of-season lines. Practice-sequence cell counts are not in the abstract. Full text was 403 in round 1. No SSRN or ResearchGate preprint found this pass. The 1.9% / 28% / 99.8% figures remain indexed-snippet only.

P(active) and P(full snap share) by Wednesday-Thursday-Friday pattern: UNVERIFIED. Best open estimate remains designation-only.

BUILD THIS FIRST: code the as-of as the rule. Friday 4 p.m. ET designation from nflverse. Do not block on a Wayback rebuild tonight. Queue the CDX pull for the practice sequence.

---

## TASK C: Timestamped text, no social API

GDELT DOC 2.0. Article search via `gdeltdoc`. The client documents that the API officially supports the most recent 3 months; earlier ranges may return data and are not guaranteed. https://github.com/alex9smith/gdelt-doc-api. Context 2.0 API announcement, 2020-05-10, says the DOC timespan default is 24 hours and historical search of the live API was then limited. https://blog.gdeltproject.org/announcing-the-gdelt-context-2-0-api/. BigQuery holds the archive. Latency of NFL beat outlets: UNVERIFIED. Licence: GDELT is released as open data; the exact licence line was not quoted this pass. UNVERIFIED quote.

Query recipe for a beat site, last 72 hours:

```
https://api.gdeltproject.org/api/v2/doc/doc?query=domain:espn.com%20(questionable%20OR%20inactive)%20sourcecountry:US&mode=artlist&maxrecords=75&format=json&startdatetime=20261001120000&enddatetime=20261003120000
```

That pattern is from the documented parameters. It was not executed. NFL-outlet coverage share: UNVERIFIED.

Common Crawl. September 2026 crawl released 2026-09-19, 2.17 billion pages, bucket `commoncrawl`, prefix `crawl-data/CC-MAIN-2026-39/`. https://commoncrawl.org/blog/september-2026-crawl-archive-now-available. Timestamp fidelity is crawl time, not publication time. Licence of the crawl: not quoted this pass. UNVERIFIED. Too slow for a T-90 alert. Useful as a replay corpus after the fact.

Team RSS, Google News RSS, Bluesky firehose, Mastodon, X archive after the API change, Reddit after Pushshift, presser transcripts: not opened this pass. Each is UNVERIFIED for NFL beat coverage and licence.

How to measure latency against our snapshots: join article seendate to the first Neon snapshot whose spread or total moves by at least 0.5 points for that game, within 6 hours, after the article and before kickoff. Report the median minutes and the share of articles with no move. n will be small. That is the test.

Evidence that injury news moves lines, and how fast: no minute-level study opened. The mechanism is accepted by every book. The speed is the missing number.

BUILD THIS FIRST: GDELT artlist on 8 beat domains for the last 6 weeks, joined to Neon. Do not buy an X archive this week.

---

## TASK D: Props and DFS

Open, reproducible models with an out-of-sample result against a prop close or against FantasyPros: none opened. The vendor piece in Task A is the only numeric claim, and it is not independent. GitHub search this pass did not return a repo with a published prop-close log loss. UNVERIFIED that one exists.

Opportunity, lag-1 only. Routes and snaps are in nflverse participation, 2016–2022 NGS, 2023+ FTN after the postseason, CC-BY-SA 4.0. A lag-1 target share is the PIT-safe feature. PFF’s 0.53 R² is proprietary (round 1). No open lag-1 model with a calibration table was opened.

Zero-inflated receptions and TD counts: no open calibration study opened. Anytime TD is the market the vendor model failed. Do not lead with it.

Ownership. DraftKings lets a customer download a contest CSV after lock, including roster and ownership in that contest. https://support.draftkings.com/dk?id=kb_article_view&sys_kb_id=0ab574cfd4698310e205d33116175bae. That is actual ownership, post-lock. It is not a projected-ownership archive. Redistribution licence: UNVERIFIED. RotoGrinders historical projections: not opened. A community script reads RotoGrinders, Awesemo and SaberSim CSVs. https://github.com/jmoore87jr/DFS_ownership_projections. Those files are paid-site exports. Licence: UNVERIFIED.

Weakest prop close: UNVERIFIED. The test is ours once props are in the snapshot store. Neon currently has receptions and pass TDs at 3 books.

BUILD THIS FIRST: do not build a prop pricer tonight. After the score model, fit lag-1 routes to receptions and grade against the 3-book prop close already in Neon.

---

## TASK E: Backfill cost

Official meter, https://the-odds-api.com/historical-odds-data/ (page observed 2026-09-29): historical odds cost 10 credits per region per market. Featured markets from 2020-06-06. Additional markets, including props, from 2023-05-03. Plans on https://the-odds-api.com/ (same date): $30 / 20,000; $59 / 100,000; $119 / 5,000,000; $249 / 15,000,000. theoddsapi.com $99 tier is a different domain. Ignore it.

Assumptions, stated so the dollar figure can be recomputed: 272 regular-season games plus 13 postseason, 285 games a season. 2020 season is fully after 2020-06-06. 2020 through 2025 is 6 seasons, 1,710 games. 2026 weeks 1–4 are 60 games. Total 1,770 games. Two timestamps (T-90 and close).

(a) h2h, spreads, totals, regions us and eu. Credits = 1,770 × 2 timestamps × 2 regions × 3 markets × 10 = 212,400. Dollars: one month of the $119 plan (5M credits), or four months of the $59 plan ($236) if the backfill is spread out. The $30 plan would take 11 months.

(b) Add alternate spreads, alternate totals, and team totals. Market count is UNVERIFIED. If those are 3 more markets, add another 212,400 credits. Still inside one $119 month. If the historical event-odds endpoint is required per event, the multiplier is worse. Confirm before buying. UNVERIFIED which endpoint the alt markets use in historical.

(c) Props from 2023-05-03. About 3 seasons plus 4 weeks: 3 × 285 + 60 = 915 games. Props are listed as US and AU bookmakers only. https://the-odds-api.com/sports-odds-data/nfl-odds.html (2026-09-29). Region count = 1 if we take us only. Prop market count is UNVERIFIED. At 15 markets, credits = 915 × 2 × 1 × 15 × 10 = 274,500. At 30 markets, 549,000.

(a)+(c) at the high prop count is about 762,000 credits. Cheapest single plan that covers it in one month is the $119 / 5M plan. Cheapest if spread across months is the $59 plan for eight months, $472, which is worse.

Pinnacle: bookmaker key `pinnacle`, region `eu`. Note on the bookmaker page: "Odds are from public website which may incur a delay." https://the-odds-api.com/sports-odds-data/bookmaker-apis.html (2026-09-14). Circa: not in the US or EU table opened. Circa key: UNVERIFIED. Do not assume Circa is in the feed.

Open-Meteo. Terms page 2026-09-29: free API is non-commercial, under 10,000 calls/day, 5,000/hour, 600/minute. Commercial includes ads, subscriptions, and undisclosed research at a commercial entity. Data is CC-BY 4.0. Paid plans add a commercial-use licence. https://open-meteo.com/en/terms and https://open-meteo.com/en/pricing (2026-09-26). Internal modelling at a company is commercial under their examples. Price of the paid plan: not extracted. UNVERIFIED dollars.

CFBD. Terms effective 2025-07-01, Rad Sports Analytics LLC. Free tier 1,000 calls per month. Resale forbidden. Commercial modelling clause: not quoted beyond the resale ban. https://collegefootballdata.com/terms. A 2025-01-04 blog lists Patreon tiers from $1. https://blog.collegefootballdata.com/api-v2-is-now-in-general-availability/amp/

nbainjuries: MIT. Respect NBA terms of use. https://github.com/mxufc29/nbainjuries. Free NFL inactive archive with a publication stamp: still not found.

BUILD THIS FIRST: do not buy the backfill before Sunday. Neon covers the live slate. Buy the $119 month next week if alt and prop tests are the chosen grade.

---

## TASK F: The coherent distribution

What we already measured is the right shape. Neighbour games by spread, unshifted margins, so 3 and 7 keep their mass. Totals shifted by the line. That matched the spread market (cover 0.4875 predicted vs 0.4882 realized) and did not beat the moneyline close (0.6117 vs 0.6098).

nfelo, 2020-11-01: baseline normal plus a key-number component whose weight falls with distance from the spread. No out-of-sample log loss. https://www.nfeloapp.com/analysis/margin-probabilities-from-nfl-spreads

Holzhauer’s push chart is the empirical mass a lattice should match: 3, 7, 10, 14, 6 in that order of weight. No integer-lattice paper with an NFL calibration table was opened. Copula approaches in the open are the SGP illustrations in Task A, not a pregame joint.

Shifting when our probability differs from the market. Two options. Location shift: move the margin mean, keep the key-number lattice. Reweight: tilt the joint toward our moneyline and renormalize. Evidence on which preserves calibration: UNVERIFIED. The safe test is to do both on 2019–2024, score moneyline, spread, total and team total together, and keep the one whose game-blocked interval on log loss excludes a worse fit. Do not shift until the availability model has a delta whose interval excludes 0. It does not, on the new measurement.

How books price team totals and alts from the main line: Holzhauer’s account is the opened source. Known mispricings with n: UNVERIFIED.

BUILD THIS FIRST: keep the empirical neighbourhood PMF. Add team-total and alt margins as derived outputs. Grade those, not the moneyline.

---

## TASK G: Signals with a replayable source

Keep, because the source is replayable:

- Officials. Assignment is public before the game. Crew effect on totals failed a secondary test in round 1. Replayable, and already killed as a totals feature. Do not reopen without a prop-level hypothesis.
- Wind. Open-Meteo previous-run is the PIT source. Commercial licence requires a paid plan. Post-2020 residual vs the close: UNVERIFIED.
- Turf type. Static by stadium. Injury association is a conference report (round 1). Scoring gap was under a point. Replayable. Not a pricer feature until it clears the gate.
- OL continuity, games started together. Computable from nflverse snaps and rosters, lag-1. No published effect size opened. Testable. Not evidenced.
- Practice-squad elevations. Roster transactions are public. A timestamped archive: UNVERIFIED. Kill until a source is named.
- Concussion protocol. Return-to-participation is in the injury report. A separate timeline archive: UNVERIFIED.

Kill, no replayable timestamped source opened, or prior evidence is null:

- Long-haul travel after 2015. Round-1 controls wiped it. Schedule is replayable. The effect is not.
- Practice-weather disruption. No source opened.
- Coordinator changes and in-season firings. News is replayable in principle. No effect size opened.
- Special-teams churn. No source.
- Referee crew × DPI × totals since 2022. No study opened. Round-1 totals test was null.
- Bye-week compression. Schedule is replayable. Effect: UNVERIFIED.
- Division rematch. Schedule is replayable. Effect: UNVERIFIED.
- Tempo after a coaching change. No timestamped play-caller archive opened.

BUILD THIS FIRST: none of these before the derivative test. Wind is the only one worth a week-2 residual.

---

## TASK H: Computer vision and Madden, the honest path

Licensed video. NFL game books are PDFs, not video. NFL+ is US-only and is a consumer product. Training rights: UNVERIFIED. https://support.nfl.com/hc/en-us/articles/35869678028180-Game-Books. Hudl IQ describes internal field registration and player ID on customer film. https://www.hudl.com/blog/how-hudl-iq-creates-football-data (2024-07-16). Terms that allow us to train on Hudl film: UNVERIFIED. Big Data Bowl tracking remains competition-rules or CC BY-NC depending on year (round 1). Roboflow: a workspace setting controls whether uploaded data may be used for their model training. That is their right to our uploads, not a grant of their Universe sets. https://docs.roboflow.com/platform/billing-and-plans/plans (updated about 2026-09-24). Universe set licences are per-project. A permissive NFL broadcast set at formation scale: not opened. UNVERIFIED.

Formation at ≥90% from broadcast, with a number: not found. Personnel strings already in participation and depth charts are the 90% path for pricing. Broadcast alignment or coverage shell predicting play outcome beyond play-by-play: not found. UNVERIFIED.

Madden. EA content policy, round 1: do not use game content commercially; do not obtain assets by data mining. https://help.ea.com/en/articles/security-and-rules/ea-content-policy. Whether a rating posted on ea.com is “game content”: UNVERIFIED. The safe reading is that it is. Legal substitutes already in the lake: NGS athleticism, combine via nflverse, college production via CFBD, prior-year EPA. Evidence these predict backups and rookies better than prior-year snaps: UNVERIFIED. Open play-concept ontology: not found. Coaching-manual taxonomies exist in print. A dataset licence: UNVERIFIED.

The honest path is not a detector this week. It is personnel and route labels we already have, lagged. A CV stack is a research bet after the pricing gate exists, trained on data we have a licence for. BDB non-commercial tracking can train a method. It cannot ship in a commercial engine.

BUILD THIS FIRST: do not build. Write the licence constraint into the PR #1009 note so the watcher is not treated as a pricing input.

---

## TASK I: What a desk has, and five hypotheses

Fifteen things a desk has that we do not, and the cheapest legal approximation in 7 days:

1. Decision-time Pinnacle before June 2020. No legal free source found. Approximation: PFR closes, labeled close-not-decision.
2. Pinnacle with a delay flag, from June 2020. Approximation: Odds API `eu` / `pinnacle`, $119 month. Delay note stands.
3. Circa. Not confirmed in the Odds API. Approximation: UNVERIFIED. Do not invent a feed.
4. Limits at the number we would bet. No feed found. Approximation: none. A probability without a limit is not a bet.
5. In-season charting. FTN via nflverse arrives after the postseason. Approximation: lag-1 participation only.
6. T-90 inactive archive back to 2012. Approximation: game-book PDF inactive list, as-of = kickoff minus 90 by rule. Coverage UNVERIFIED.
7. Wednesday-Thursday-Friday practice pages. Approximation: Wayback CDX, query in Task B. Share UNVERIFIED.
8. A beat wire with a clock. Approximation: GDELT on 8 domains, last 3 months guaranteed.
9. Alt-line history. Approximation: Odds API additional markets from 2023-05-03, same $119 month.
10. Prop-close history before May 2023. No source found. Approximation: none.
11. Projected ownership. Approximation: model it from salary and a public projection. Actuals from our own contest CSV.
12. SGP prices. Approximation: derive the joint ourselves and compare only where a book posts the parlay. Historical SGP archive: UNVERIFIED.
13. Account health and a fill. Approximation: none in 7 days.
14. GPU tracking. Approximation: do not. Personnel strings are the feature.
15. A human on the Friday report. Approximation: the 4 p.m. ET rule plus nflverse. A human still wins the last hour.

Five hypotheses. Each is a mechanism, not a slogan. None is claimed as published.

H1. Alt-line incoherence. Books fit the main spread and total, then a thinner model for team totals and alts. Estimand: log loss of our joint vs the book’s alt price, paired by game, at the same timestamp. PIT: snapshot time. Kill if the game-blocked interval on the delta covers 0 after 200 games.

H2. Name tax on anytime TD. Secondary scorers are priced off fame, not red-zone share. Estimand: CLV of a lag-1 red-zone-share model vs the anytime price at T-24h. PIT: lag-1 touches only. Kill if CLV interval covers 0 after a season, or if the vendor’s failed anytime result replicates.

H3. Designation latency. The first public Out moves the spread before the second book. Estimand: minutes from GDELT seendate to the first Neon move of at least 0.5, and the residual of our update versus the slower book. PIT: article time and snapshot time. Kill if median lag is under 5 minutes or the residual interval covers 0. n will be small. Run it anyway.

H4. OL continuity. Sack rate jumps when the five starters have fewer than 50 snaps together, beyond the market total. Estimand: residual of team sack rate on lag-1 continuity, after the total. PIT: prior-game snaps only. Kill if the game-blocked coefficient interval covers 0 on 2016–2024.

H5. Forecast-wind residual on the total. Open-Meteo previous-run wind at T-24h, after the market total. Estimand: log loss on the over, game-blocked. PIT: previous-run, never the actual. Kill if the interval covers 0. This is the only outside-the-game hypothesis with both a mechanism and a source.

BUILD THIS FIRST: H1 on whatever alt snapshots Neon already has. H3 on the 6 weeks of Neon plus GDELT. The other three wait on the gate.

---

## Still UNVERIFIED, and the next query

- Practice-sequence play rates in Glazer 2025. Next: open the PDF at doi.org/10.1177/22150218241304941 (page says open access).
- Wayback share of nfl.com/injuries team-weeks. Next: run the CDX query in Task B.
- Game-book coverage by season. Next: `scrapy crawl historicalspider -a year=2015` in https://github.com/davidfischer/nfl-scraper and count PDFs.
- Season-by-season injury-policy changes since 2012. Next: NFL operations manual PDFs for 2012, 2016, 2020.
- Circa bookmaker key. Next: the full bookmaker table at https://the-odds-api.com/sports-odds-data/bookmaker-apis.html, search “circa”.
- Historical alt-market credit multiplier. Next: one historical event-odds call and read `x-requests-last`.
- Open-Meteo paid price. Next: https://open-meteo.com/en/pricing, extract the dollar tiers.
- CFBD commercial-modelling clause. Next: the rest of https://collegefootballdata.com/terms past the resale ban.
- GDELT licence sentence and NFL-domain hit rate. Next: one artlist call on espn.com and the GDELT licence page.
- Common Crawl licence sentence. Next: https://commoncrawl.org/terms-of-use.
- X archive, Reddit post-Pushshift, Bluesky beat coverage. Next: a named dump with a date and a licence.
- Independent prop-close study. Next: search GitHub for “prop closing line value” and require a results table.
- DraftKings CSV redistribution. Next: the contest rules linked from the support article.
- SGP book error with n. Next: a book’s historical SGP price, which we do not have.
- Kalshi lead vs a sportsbook. Next: pair our 772 markets to Neon by minute.
- Live NFL market efficiency. Next: not this week.
- Formation ≥90% and homography <1 yard. Next: a paper with both numbers on broadcast, not tracking.
- ea.com ratings as game content. Next: the EA user agreement, not the content-policy summary.
- Open play-concept ontology licence. Next: a dataset, not a coaching book.
- OL-continuity, bye, rematch, tempo effect sizes. Next: our own tests, not a search.

---

## Corrections after teammate pages (these win where they conflict)

### Credit math, corrected
The historical odds endpoint returns every event at one timestamp. Cost is 10 credits per region per market per call, not per game. https://the-odds-api.com/historical-odds-data/

Planning count: 6 kickoff clusters per week × 2 timestamps × weeks {2020: 18, 2021–2025: 19 each, 2026: 4} = 1,404 calls.

(a) 3 markets × 2 regions × 10 credits × 1,404 = 84,240 credits. One month of the $59 / 100,000 plan. US-only is 42,120.

(b) If alts are on the same odds endpoint, another 84,240. If they require event-odds, budget ~210,000. Endpoint: UNVERIFIED.

(c) Props are event-odds. At 12 markets, us-only, 2 timestamps, ~915 games: 219,600 credits. At 20 markets: 366,000.

(a)+(c) at 12 prop markets ≈ 304,000 credits. One month of the $119 / 5,000,000 plan. Do not buy the $249 plan.

The pricing page lists Historical Odds on the free 500-credit tier. The historical docs say paid only. Conflict stands. Do not plan a backfill on the free tier.

Pinnacle key `pinnacle`, region `eu`, public-site delay. Circa key not found.

### Glazer counts, opened
Table 1, 2015–2019, starter/situational, open access: Probable/Blank played 7,764 of 7,918 (missed 1.9%); Questionable played 3,588 of 4,983 (missed 28%); Doubtful played 1 of 653 (missed 99.8%). No practice-sequence × position cells. https://journals.sagepub.com/doi/10.1177/22150218241304941 (2025-01-26).

### Other primaries folded
- Game-day loophole: if a club works a player out at the stadium, it need not update the game status report and may wait for the 90-minute inactive list. Florio, 2024-09-14. https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/game-time-decision-loophole-helps-teams-avoid-having-to-downgrade-players-from-questionable
- IR return after four games, up to eight designations: https://www.nfl.com/news/players-now-eligible-to-return-from-injured-reserve-after-four-games (2022-05-26)
- Kalshi vs DraftKings, Cotti CMC thesis, 285 NFL games 2025–26: small Brier gap, gone after quote-format controls. https://scholarship.claremont.edu/cmc_theses/4214
- OL continuity: SIS, 86 groups with ≥500 snaps since 2018, no Total Points gain as shared snaps accumulate. https://www.sportsinfosolutions.com/2024/11/15/study-does-offensive-line-continuity-drive-better-performance/ (2024-11-15). Hypothesis H4 is killed by this.
- Mid-season firing: Sportico, 37 firings since 2000, first game 16–21, ATS not an edge. https://www.sportico.com/leagues/football/2023/nfl-coaches-fired-record-frank-reich-1234749569 (2023-12-02)
- Common Crawl terms, 2024-03-07: counsel before commercial use. https://archive.is/2026.01.11-205554/https://commoncrawl.org/terms-of-use
- Google News RSS is a ranking feed, median item age about 6.6 days in one 2026 measurement. https://cloro.dev/blog/google-news-rss/ (2026-06-28). Not a wire.
- nfelo margin bug: probabilities were not symmetric around the spread. https://github.com/greerreNFL/nfelo changelog 2026-08-15.
