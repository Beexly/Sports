# GSE deep-research findings (2026-10-03)

Scope: sources GSE cannot pull from the local lake. Every factual claim has a URL. Anything not checked is marked UNVERIFIED. Existing measured results in the status file are not repeated.

Rank key: (expected accuracy gain × data availability) / build effort. Availability is free-or-already-in-hand vs paid-and-gated. Effort is hours on the current laptop, not a GPU cluster.

## Ranked master table

| Rank | Item | Task | Source URL | License | PIT-safe | Expected gain + citation | Hours | Flag |
|---|---|---|---|---|---|---|---|---|
| 1 | Point-in-time starters + designation play-probability | 1 | https://nflreadr.nflverse.com/reference/load_injuries.html | nflverse-data CC-BY-4.0 https://github.com/nflverse/nflverse-data | Partial: `date_modified` exists; Wed/Thu/Fri split not in dictionary | Designation miss rates: Probable/Blank 1.9%, Questionable 28%, Doubtful 99.8% (2015–2019) https://journals.sagepub.com/doi/10.1177/22150218241304941 | 6–8 | BUILD |
| 2 | Empirical joint score PMF with key-number mass | 3 | https://nflanalytic.com/explainer-key-numbers.html | nflverse games, credit nflverse | Yes (final scores are post-game; features must be pre-kick) | 15.1% of 7,276 games (1999–2025) decided by 3, 9.0% by 7. Normal margin models ignore this (Stern 1991; PFR win-prob page) | 6–10 | BUILD |
| 3 | Lag-1 snap × route opportunity for props | 4 | https://nflreadr.nflverse.com/reference/load_participation.html | CC-BY-SA 4.0; attribute NGS or FTN via nflverse | Yes if lag ≥ 1 week. 2023+ FTN arrives after postseason | Target-share stability claimed R² 0.53 by PFF on 2023 (proprietary) https://www.pff.com/news/nfl-expected-targets-week-5 | 8–12 | BUILD |
| 4 | Decision-time odds snapshots, not just close | 2 | https://the-odds-api.com/historical-odds-data/ | Terms allow model training; forbid resale https://the-odds-api.com/terms-and-conditions.html | Yes: snapshot ≤ requested ISO timestamp | Featured markets from 2020-06-06; props from 2023-05-03. Cheap paid plan $30/mo | 3–4 to wire | BUILD |
| 5 | Wind as a totals residual, forecast vintage | 7 | https://nflanalytic.com/explainer-weather-and-scoring.html | Secondary calc on nflverse | Partial: actual weather is post; forecast vintage is the PIT object | Outdoor totals 44.7 (0–5 mph) vs 40.5 (≥16 mph), 1999–2025, n=7,276 games. Not a close-residual study | 4 | BUILD after 1–3 |
| 6 | Depth-chart vintage (2025+) | 1 | https://nflreadr.nflverse.com/articles/dictionary_depth_charts.html | CC-BY-4.0 | Yes from 2025 (ISO8601 `dt` per update). Pre-2025 weekly only | No published incremental log-loss vs designation model | 2 | BUILD with 1 |
| 7 | Venn-Abers + e-value promotion gate | 9 | https://pypi.org/project/venn-abers/ and https://github.com/jakorostami/expectation | Open source | Yes if fit only on past weeks | No NFL-specific published gain. Method is the gate, not a signal | 4 | BUILD as harness |
| 8 | CFBD free college feed | 11 | https://api.collegefootballdata.com/getting-started | Free key; commercial terms UNVERIFIED | Partial | No measured NFL-transfer gain | 3 | later |
| 9 | NBA official injury snapshots 2021-22+ | 11 | https://github.com/mxufc29/nbainjuries | Package license UNVERIFIED; data is NBA official | Yes: hourly / 15-min snapshots | No measured gain here | 3 | later |
| 10 | Madden OVR as rookie/backup prior | 5 | https://github.com/theedgepredictor/nfl-madden-data | Community scrape; EA commercial use disallowed https://help.ea.com/en/articles/security-and-rules/ea-content-policy | Partial (release date of ratings UNVERIFIED) | 65.4% winner accuracy on 416 games, not vs close https://github.com/nifleisch/madden-nfl-prediction | 4 test only | NO |
| 11 | Broadcast CV formation / homography | 6 | https://www.kaggle.com/competitions/nfl-health-and-safety-helmet-assignment/data | Competition rules; BDB 2024 is CC BY-NC 4.0 | N/A for pre-game pricing this week | No laptop OpenVINO ≥90% formation result found | 20+ | NO this week |
| 12 | Tracking transformer pretrain | 10 | https://github.com/SumerSports/SportsTrackingTransformer | Repo license UNVERIFIED; BDB data CC BY-NC | N/A | 20.2% ADE cut vs a zoo baseline on tackle frames, not on game log loss | 40+ | NO |

---

## TASK 1: Point-in-time availability truth

### What is actually archived

**nflverse injuries, 2009–present.** `load_injuries()` returns official injury and practice reports. Dictionary fields: `season`, `season_type`, `team`, `week`, `gsis_id`, `position`, `full_name`, `report_primary_injury`, `report_secondary_injury`, `report_status`, `practice_primary_injury`, `practice_secondary_injury`, `practice_status`, `date_modified` ("Date and time that injury information was updated"). Source: https://nflreadr.nflverse.com/articles/dictionary_injuries.html and https://nflreadr.nflverse.com/reference/load_injuries.html (page dated 2026-04-20). Pipeline calls `nflapi::nflapi_injuries` and publishes to the injuries release: https://github.com/nflverse/nflverse-rosters/blob/main/exec/update-injuries.R. Updates daily at 07:00 UTC in season: https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html (2026-09-17).

PIT status: **partial**. `date_modified` is a vintage of the row nflverse stored, not a guaranteed publication timestamp of each Wednesday, Thursday and Friday report. The dictionary has one `practice_status`, not three day columns. Wed/Thu/Fri sequences are UNVERIFIED in this feed.

License: nflverse-data repository is CC-BY-4.0: https://github.com/nflverse/nflverse-data. Attribution required. Internal modelling is allowed under CC-BY-4.0; share-alike does not attach to CC-BY (unlike participation, which is CC-BY-SA).

Sample: one row per player-week with `report_status` in {Out, Doubtful, Questionable, and historically Probable} and `practice_status` in {Did Not Participate, Limited Participation, Full Participation} — exact string set UNVERIFIED beyond the dictionary descriptions.

**Depth charts.** From 2025, each update carries ISO8601 `dt` and is appended, so a chart can be assigned to a point in time. Pre-2025 charts are week-assigned. https://nflreadr.nflverse.com/articles/dictionary_depth_charts.html. Daily 07:00 UTC. PIT-safe only from 2025.

**Game-day inactives.** NFL Football Operations delivers the inactive list about 90 minutes before kickoff (secondary citation via https://parlae.io/fantasy/guides/the-hour-before-kickoff, 2026-09-03, which cites operations.nfl.com). A free historical archive of inactive lists with publication timestamps, 2012–2026, was not found. nflverse snap counts tell who played, which is post-game and not a pre-kick inactive list. Status: **UNVERIFIED as a PIT archive**.

**IR / PUP / practice-squad elevations.** Roster rules (IR minimum four games, up to eight designations to return, 21-day practice window) are in AP, 2026-07-28: https://apnews.com/article/nfl-roster-ir-pup-waivers-06af6d081e7fd7630202be3133851179. A timestamped historical list of elevations is UNVERIFIED in open data.

**Rotowire practice-report API.** Current endpoint exists (https://rotowire.readme.io/reference/get_football-nfl-practicereport-php). Historical depth and license: UNVERIFIED.

**Wayback / nfl.com injury-report pages.** nfl.com weekly reports exist from 2009 (secondary: https://www.scrapeit.io/sports-data-scrapers/nfl). A complete Wayback vintage of Wed/Thu/Fri pages was not verified this pass. Status: UNVERIFIED as a built archive.

### Play probability given designation

Glazer, Binney and Seth, SAGE 2025, empirical 2015–2019 starter/situational miss rates: Probable or blank 1.9% (7,764 played of 7,918), Questionable 28% (3,588 played of 4,983), Doubtful 99.8% (1 of 653 played). https://journals.sagepub.com/doi/10.1177/22150218241304941. These are the best open numbers. They are designation-only, not the practice sequence.

Footballguys (Hutchison, 2025-09-01) studied 2017–2023 practice reports and says final practice participation is the most predictive, with tables behind a free Insider wall: https://www.footballguys.com/article/2025-practice-participation-and-chance-to-play. Exact DNP/LP/FP play rates: UNVERIFIED (paywalled).

League dropped Probable in 2016. Secondary: https://betfootballexpert.com/article/nfl-injury-report-guide-for-bettors-how-to-use-it-to-your-advantage/ (2026-03-14).

### Replacement value

PFF WAR page: Yurko and colleagues estimated WAR for QB, receiver and RB from public play-by-play; QB season-to-season WAR correlation 0.62 vs 0.45 for EPA/pass play. https://www.pff.com/war. No open point-estimate for "starting LT out = X points" was extracted.

SIS primer (2021-05-04): Points Above Replacement converts EPA-style points to wins; example 2020 Mahomes 4.6 WAR. https://www.sportsinfosolutions.com/2021/05/04/a-primer-for-siss-nfl-wins-above-replacement-war-metric/. Position-specific absence effects on spread: UNVERIFIED in this pass.

BUILD THIS FIRST: fit P(play | report_status, practice_status, position) on nflverse 2009–2025 with `date_modified` < kickoff, then snap-weight the miss. Gate against the already-measured snap-weighted injury residual. Do not wait for a Wed/Thu/Fri archive.

---

## TASK 2: Historical odds and props with timestamps

**The Odds API (official).** Featured markets (h2h, spreads, totals) from 2020-06-06, snapshots every 10 minutes; from September 2022 every 5 minutes. Additional markets including player props from 2023-05-03, 5-minute snapshots. Endpoint returns the closest snapshot equal to or earlier than `date`. Historical costs 10 credits per region per market and is paid-only. https://the-odds-api.com/historical-odds-data/ and https://the-odds-api.com/liveapi/guides/v4/ (both observed 2026-09-29).

Official prices on https://the-odds-api.com/ (2026-09-29): Free 500 credits/month, no historical; $30 / 20,000 credits; $59 / 100,000; $119 / 5,000,000; $249 / 15,000,000. All paid tiers list Historical Odds. A different domain, theoddsapi.com, lists a $99 Business tier (2026-07-03). Treat that as a separate product. Do not budget against it.

Terms, last updated 31 August 2026: storing indefinitely, training statistical and ML models, and commercial apps are allowed; reselling the raw feed is not. https://the-odds-api.com/terms-and-conditions.html. Quote: "Using our data to train statistical and machine learning models."

Schema sample (live shape, same markets): `sport_key`, `commence_time`, `bookmakers[].key`, `last_update`, `markets[].key`, `outcomes[].name`, `outcomes[].price`. https://the-odds-api.com/.

**sportsoddshistory.com.** Free. NFL spreads for almost every game since 1952. 1952–1977 from Newspapers.com (night before). 1978–present closing odds from Pro-Football-Reference. Not line movement. https://www.sportsoddshistory.com/about-us (page dated 2014-05-12; method notes current as described).

**Pinnacle sharpness.** Industry consensus, not a single open NFL study with log loss by book. SharpLine claims 1.9M closing lines and a calibration p of 0.66; that is vendor marketing, not a paper: https://getsharpline.com/. OddsHub states Pinnacle does not publish its own historical closes: https://www.oddshub.io/blog/pinnacle-closing-odds (2026-06-18). Book-by-book NFL prop sharpness: UNVERIFIED.

**Cheapest decision-time path for 2018–2025.** 2018–mid-2020: no Odds API snapshots (starts 2020-06-06). Use sportsoddshistory / PFR closes only, and label them close-not-decision. 2020-06 onward sides and totals: Odds API $30 tier, request a snapshot 90 minutes and 5 minutes before `commence_time`. Props: only from 2023-05-03. SportsDataIO, OddsJam, Unabated prices: UNVERIFIED this pass.

BUILD THIS FIRST: one season of Odds API snapshots at T-24h, T-90m and close for NFL h2h/spread/total. Compare engine probability to the de-vigged price at each vintage. Do not grade against a close the engine could not have seen.

---

## TASK 3: Score distributions and coherent pricing

**Normal margin is the published baseline, and it ignores key numbers.** Stern, American Statistician 1991, 45:179–183: margin over the spread was not significantly different from Normal with SD slightly under 14 on 1981, 1983, 1984. https://www.tandfonline.com/doi/abs/10.1080/00031305.1991.10475798. PFR win-probability page uses the Winston/Stern normal with SD 13.45 (1978–2012) and a continuity correction at ±0.5, and says it ignores key-number lumps. https://www.pro-football-reference.com/about/win_prob.htm (content from search snippet; direct browse returned 403 — treat the SD figure as secondary-confirmed).

**Key-number mass is large.** Secondary calculation on nflverse games, 1999–2025, n=7,276: 15.1% decided by exactly 3, 9.0% by exactly 7. https://nflanalytic.com/explainer-key-numbers.html (2026-06-22).

**Open mixed model, no OOS log loss.** nfelo builds a baseline normal plus a key-number component whose weight decays with distance from the spread: https://www.nfeloapp.com/analysis/margin-probabilities-from-nfl-spreads (2020-11-01). No published log loss vs the close.

**Do not port soccer bivariate Poisson.** Karlis and Ntzoufras 2003 (doi:10.1111/1467-9884.00366) is soccer goals. NFL points are sums of 3s and 7s. A Poisson team-score model fails game dynamics: https://informs-sim.org/wsc24papers/con253.pdf (WSC 2024).

**In-game EP/WP is not a pregame joint.** nflfastR EP/WP is xgboost, leave-one-season-out, MIT models: https://github.com/nflverse/fastrmodels and https://www.opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/. Useful for drive simulation later, not for tonight's price.

**Same-game parlay.** Gaussian copula separating margins from dependence is the standard description. An illustrative matrix, not an NFL calibration study: https://wizardofodds.com/article/same-game-parlays-the-mathematics-of-correlation/ (2026-08-02). Published NFL SGP correlation vs market: UNVERIFIED.

No peer-reviewed 2015+ study was found that reports joint ML / spread / total / team-total log loss against a de-vigged close. That comparison is UNVERIFIED in the open literature.

BUILD THIS FIRST: empirical conditional distribution of (home points, away points) given spread and total, with explicit mass at margins 3, 7, 6, 10 and 14, fit on nflverse final scores, walk-forward log loss on ML, cover, total and team totals together. Hours 6–10. Possession sim is not on the 24-hour path.

---

## TASK 4: Props and DFS

**Route and participation.** 2016–2022 from NFL NGS; the NGS source died during 2023. 2023+ is FTN and is released only after the postseason. CC-BY-SA 4.0; attribute "NFL NextGenStats via nflverse" or "FTN Data via nflverse". https://nflreadr.nflverse.com/reference/load_participation.html. FTN charting subset via nflverse from 2022, charted within 48 hours, same license: https://nflreadr.nflverse.com/reference/load_ftn_charting.html. Commercial FTN package price: UNVERIFIED (https://ftnfantasy.com/stats/sports-data).

**Published opportunity models.** PFF "predicted targets" claims validated R² 0.53 on 2023 targets and route-level air-yards R² 0.23. Proprietary. https://www.pff.com/news/nfl-expected-targets-week-5 (2024-10-03) and https://www.pff.com/news/nfl-refining-coach-i-was-open-a-model-comparing-actual-vs-predicted-target-shares (2024-10-10). Open NGBoost / zero-inflated prop papers with a FantasyPros comparison: UNVERIFIED this pass.

**DFS ownership.** No official free pre-lock DraftKings ownership feed was confirmed. Absence noted in an open engine's data-source file: https://raw.githubusercontent.com/Travd3/nfl-dfs-engine/main/DATA_SOURCES.md (observed 2026-09). Ownership has to be modelled from salary and public projections, then checked against post-contest results.

Measured out-of-sample win over FantasyPros / ESPN / CBS / numberFire: UNVERIFIED.

BUILD THIS FIRST: lag-1 snap share × route participation → zero-inflated or NGBoost targets and carries. Score projection error against a rolling-mean baseline. Do not fit on the current week.

---

## TASK 5: Madden, legally

Community historical ratings (Madden 02–present, joined to approximate value): https://github.com/theedgepredictor/nfl-madden-data, sourced from maddenratings.weebly.com. A second scrape predicted the winner in 65.4% of 416 games and did not compare to the closing line: https://github.com/nifleisch/madden-nfl-prediction. Incremental value over the market: UNVERIFIED.

FiveThirtyEight, 2021-11-08: Madden speed scores track NGS max speed in a multilevel model. Not a win-probability study. https://fivethirtyeight.com/features/maddens-player-speed-scores-are-surprisingly-good-but-whose-ratings-did-the-game-get-wrong/.

EA content policy: "Don't use our game content for commercial purposes." The same page prohibits obtaining assets through data mining. https://help.ea.com/en/articles/security-and-rules/ea-content-policy. Full user-agreement quote on ratings-API reuse: UNVERIFIED (page not fully fetched).

Open playbook structure (formation, concept, per-receiver route, protection) under a licence that allows modelling: not found. UNVERIFIED. Sim-to-real CV papers using Madden footage: not found. UNVERIFIED.

BUILD THIS FIRST: do not scrape EA. If a community CSV is already on disk, test it only as a rookie and backup prior. Kill it unless it beats market + QB EPA on walk-forward log loss. Legal review before any commercial use.

---

## TASK 6: Broadcast computer vision on this laptop

**Helmet assignment.** Kaggle NFL Health & Safety Helmet Assignment: video, image labels, 10 Hz tracking. License is competition rules, not an open commercial licence. https://www.kaggle.com/competitions/nfl-health-and-safety-helmet-assignment/data. 3.43 GB.

**Big Data Bowl tracking.** 2024 competition data is CC BY-NC 4.0 (non-commercial). https://www.kaggle.com/competitions/nfl-big-data-bowl-2024/data. Tracking is 10 Hz with jersey number and club. Not broadcast video. One 2017 game remains public in the older ops repo: https://github.com/nfl-football-ops/Big-Data-Bowl.

**Tracking model, not broadcast.** SumerSports transformer cut average displacement error 20.2% (5.78 to 4.61 yards) vs a zoo baseline on a tackle task, test n=1,871 plays. https://github.com/SumerSports/SportsTrackingTransformer. That is not formation accuracy and not a homography error.

Published broadcast formation classifier at ≥90% and homography reprojection under 1 yard, running on CPU / Intel iGPU with OpenVINO: UNVERIFIED. SoccerNet-style calibration numbers transferred to NFL broadcast: UNVERIFIED.

BUILD THIS FIRST: do not build CV before kickoff. The watcher has 0 ingested frames. Formation labels for pricing should come from participation and personnel strings already in the lake, not from a new detector.

---

## TASK 7: Outside-the-game signals

Supported enough to test, not yet shown to beat the close:

- **Wind.** Outdoor totals 44.7 points at 0–5 mph vs 40.5 at ≥16 mph; domes 46.9; temperature almost flat (freezing 43.4, warm 43.0). nflverse 1999–2025, n=7,276. https://nflanalytic.com/explainer-weather-and-scoring.html (2026-06-17). This is actual weather, not the forecast, and not a residual vs the close. Forecast-vs-close edge: UNVERIFIED.
- **Penalty tendencies differ by crew; points do not, in this sample.** Era-adjusted, 0 of 21 high-volume crews clear two standard errors on totals. https://nflanalytic.com/explainer-referee-effects.html (2026-07-09). Crew penalty-rate differences are acknowledged; a points effect is rejected here.

Folklore or null after controls:

- **Travel and time zones.** Union College abstract, 2015–2025, fixed effects with FPI: travel distance, zones crossed and eastward travel small and insignificant once team strength is controlled. https://steinmetz.union.edu/abstract/effects-travel-time-zones-and-game-start-times-team-performance-national-football-league (2026-04-12). American Journal of Epidemiology 2025: jet-lag effect on beating the spread compatible with null (P=0.133); replication of Smith et al. also null. https://academic.oup.com/aje/article/194/9/2499/8158079.
- **Circadian night effect.** Walter Reed analysis of the 2013 season, reported second-hand: fewer mental errors in 8–9 pm ET games. https://studyfinds.com/nfl-teams-play-better-night-study-suggests-circadian-rhythms/ (2018-06-07). Single season, not vs the close. Treat as weak.

UNVERIFIED this pass (no effect size and no close-residual found): short-week / TNF penalty, international games, altitude, crowd noise, fan travel share, turf vs grass, coaching and play-caller changes, coordinator tendencies, contract-year incentives, personal events, press-conference sentiment, social leaks, public betting splits, search interest, lookahead / letdown, revenge. Kalshi prices are a market, not an independent signal; whether they lead the sportsbook close is UNVERIFIED.

BUILD THIS FIRST: wind only, and only as a residual on the total after the score model, using the forecast timestamp not the actual. Drop travel and referee-totals from the 7-day list unless a close-residual test turns positive.

---

## TASK 8: Leakage-proof LLM evaluation

**ForecastBench** scores only future events, so pretraining cannot contain the resolution. Dataset questions from ACLED, DBnomics, FRED, Yahoo Finance and Wikipedia; market questions from Metaculus and Manifold. Difficulty-adjusted Brier. https://forecastingresearch.substack.com/p/ai-llm-forecasting-model-forecastbench-benchmark (2025-10-07). July 2026 update: Cassi AI at superforecaster parity via sub-questions, search, recency filter; xAI and DeepMind also in the indistinguishable band. https://forecastingresearch.substack.com/p/ai-models-have-likely-reached-parity (2026-07-15). Entry rules, cadence and API: UNVERIFIED beyond "submissions may use tools, context, fine-tuning, ensembling."

**Prophet Arena** forecasts live prediction markets and scores 1 − Brier against a matched market baseline. https://www.prophetarena.co/leaderboard/forecast. Paper: events from live markets, cutoff 2025-10-11, 1,367 resolved events, 72,136 markets. https://arxiv.org/html/2510.17638v2. Sports are in the pool. Exact submission API: UNVERIFIED.

Methods that work for past NFL games: post-cutoff-only evaluation (ForecastBench's design), retrieval-only with a frozen corpus dated before kickoff, and anonymized or perturbed histories. A published NFL-specific anonymization result with log loss: UNVERIFIED.

BUILD THIS FIRST: do not enter a leaderboard this week. If an LLM is used, restrict it to event extraction (designation text, beat-writer sentences) with a source timestamp. It does not output a probability. That matches the v2 decision already in the plan.

---

## TASK 9: Small-n, dependent promotion

Concrete tools, not NFL papers:

- Venn-Abers calibration: `venn-abers` 1.5.4, inductive split, multiprobability intervals. https://pypi.org/project/venn-abers/ (2026-08-12). Better than a single isotonic map when the calibration set is a few hundred games, because it returns an interval.
- E-values / anytime-valid tests: `expectation` library, sequential mean and proportion tests, e-BH for FDR. https://github.com/jakorostami/expectation. Peeking each week does not invalidate the e-value.
- Paired block bootstrap by game: resample games, not player-rows. Effective sample size is closer to the number of games than to the number of props. Formula: for exchangeable within-game correlation ρ and m targets per game, n_eff ≈ n_games × m / (1 + (m − 1) ρ). Open implementation: UNVERIFIED as a named library; the formula is the standard design effect.
- Conformal abstention under drift: UNVERIFIED as a packaged NFL result. `mapie` is the usual sklearn conformal library; version and drift guarantees not checked this pass. Status of mapie drift claim: UNVERIFIED.

BUILD THIS FIRST: promote a signal only if a game-block bootstrap interval on log-loss improvement vs the market offset excludes 0, and an e-value on the paired weekly difference crosses a preset threshold. Do not use a player-row t-test.

---

## TASK 10: Foundation models on event sequences

**Soccer action transformer.** Three seasons of FA Women's Super League StatsBomb open data, next-action prediction, compared with a Markov model and an MLP. Open code. https://arxiv.org/html/2407.14558v1 and https://github.com/danielhocevar/Foundation-Model-for-Soccer. Downstream game-level log loss vs a tabular baseline: not reported. Gain on NFL: none shown.

**Tracking transformer.** 20.2% ADE reduction on a tackle-frame task, not on spread or total. https://github.com/SumerSports/SportsTrackingTransformer. Training quoted as 8–12 hours; hardware UNVERIFIED. Data is BDB-style tracking, CC BY-NC if it is the Kaggle release.

Smallest pretraining with a published downstream gain on NFL game log loss: not found. UNVERIFIED. A CPU laptop plus free Colab is enough to fine-tune the soccer toy model. It is not enough to expect a pricing gain.

BUILD THIS FIRST: do not pretrain. The status file already showed a flat 33-feature model and a simple play encoder losing to two features. Sequence models wait until the availability and score gates pass.

---

## TASK 11: Free or cheap data not yet used

**NCAAF.** CollegeFootballData API, free key, base `https://api.collegefootballdata.com`, 84 endpoints via cfbfastR including passing charting. https://api.collegefootballdata.com/getting-started (2026-09-28) and https://cfbfastr.sportsdataverse.org/ (2026-10-01). Injury vintage and odds history: UNVERIFIED. Commercial licence: UNVERIFIED.

**MLB.** Retrosheet CSV game, lineup, umpire and play files, 1897–2025: https://retrosheet.org/downloads/csvdownloads.html. Lineups in `teamstats.csv` / gameinfo are post-game as published, not a pre-game vintage. Statcast pitch-level: free via Baseball Savant; timestamp of lineup card: UNVERIFIED.

**NBA.** Official injury reports stored as hourly or 15-minute snapshots since 2021-22. Teams must report by 5 pm local the day before (1 pm on the second of a back-to-back). https://github.com/mxufc29/nbainjuries. Package licence: UNVERIFIED. Pre-2021 historical: UNVERIFIED.

**NHL and MLS** free pre-game injury vintages: UNVERIFIED this pass.

BUILD THIS FIRST: nothing multi-sport before the NFL Week 4 mint. CFBD key and NBA injury package are the first non-NFL wires, after the gate exists.

---

## TASK 12: 24-hour and 7-day build list

Constraint: first kick is IND–WAS, London, neutral site, 08:30 CT on 2026-10-04. The current file gives Washington home field. That is a known bug, not a research item.

### Next 24 hours

1. Neutral-site flag on IND–WAS and any other international game in the slate. Data: schedule (already in lake). Method: home-field term = 0 on neutral. Test: home-field coefficient is not applied. Hours: 1. Evidence: the bug is in the status file.
2. Point-in-time starters. Data: nflverse injuries `date_modified` + depth chart `dt` where present. Method: designation play-probability from Glazer et al. rates, snap-weighted. Test: walk-forward log loss on 2022–2025 does not use actual starters. Hours: 6. Evidence: status file already showed the actual-starter model is an upper bound.
3. Joint score distribution. Data: nflverse final scores. Method: conditional PMF with key-number mass. Test: one probability vector prices ML, spread, total and team totals; log loss vs de-vigged close on a prior season. Hours: 8. Evidence: 15.1% / 9.0% key-number shares.
4. Health gate and kill switch. Data: freshness of injury file, odds snapshot age, model hash. Method: refuse to mint if any check fails. Test: a stale file does not publish. Hours: 2.
5. Mint 15 Week 4 forecasts before 08:30 CT, logged as engine forecasts, not written onto frozen picks.

### Next 7 days

1. Odds API decision-time snapshots for 2024–2025, $30 tier, T-24h and T-90m. Test: CLV of the engine vs the close, computed only from prices that existed at decision time.
2. Wind residual on the total, forecast timestamp only.
3. Lag-1 route/snap prop model, scored on projection error.
4. Promotion harness: game-block bootstrap plus e-value. No new signal goes live without it.
5. CFBD and NBA injury package, behind the same gate. No Madden scrape. No CV. No foundation-model pretrain.

### What a syndicate has that this plan still lacks

- A sharp closing and decision-time archive before June 2020, including Pinnacle and Circa, with bet-acceptance limits. We have closes from PFR and snapshots only from mid-2020.
- In-house or licensed PFF / FTN / NGS charting in-season, not after the postseason. Participation 2023+ arrives too late to train a live prop model on the current year.
- A true inactive feed at T-90 with a stored vintage back to 2012. We can see who played after the game.
- Limits, account health and a fill model. A probability is not a bet.
- An exchange or sharp-book account to mark positions. Kalshi is in the lake; a systematic comparison to the sportsbook close is not.
- Human beat-writer coverage with a clock. The LLM extractor does not replace a timestamped news wire.
- Dedicated GPU tracking. Not required for the pricing gate, and not available on this laptop.

---

## UNVERIFIED list

- Wed/Thu/Fri practice sequence as separate columns in nflverse injuries.
- Free historical inactive-list archive with publication timestamps, 2012–2026.
- Rotowire historical practice-report depth and licence.
- Complete Wayback vintage of nfl.com injury pages.
- Position-specific points lost when a starter is out (LT, edge, CB), beyond PFF/SIS WAR descriptions.
- SportsDataIO, OddsJam, Unabated and Action Network prices and historical depth.
- Book-by-book NFL prop sharpness.
- theoddsapi.com $99 tier (different domain from the official Odds API).
- Peer-reviewed NFL joint log loss vs de-vigged close, 2015+.
- Published NFL same-game parlay correlation calibration.
- Open prop model that beats FantasyPros / numberFire out of sample.
- Official free pre-lock DraftKings ownership feed.
- FTN commercial package price.
- EA user-agreement clause on ratings reuse beyond the content-policy page.
- Legal playbook ontology (formation, route, protection).
- Sim-to-real football CV from Madden footage.
- Broadcast formation ≥90% and homography < 1 yard on CPU/OpenVINO.
- Travel, TNF, altitude, crowd, turf, coaching, contract year, sentiment, leaks, splits, search, lookahead, revenge as close-residuals.
- Kalshi leading the sportsbook close.
- ForecastBench and Prophet Arena exact entry APIs.
- Named library for the design-effect effective sample size.
- mapie drift guarantees.
- Foundation model with a published NFL game-level log-loss gain.
- CFBD commercial licence; NBA package licence; NHL and MLS free injury vintages.
- Statcast lineup-card publication time.

---

## Supplement: teammate primary URLs folded after the first draft (2026-10-03)

These replace or tighten claims above. Where they conflict, this supplement wins.

### Task 1
- Inactive deadline, primary social post of the league memo: Tom Pelissero, 2020-12-16, https://x.com/TomPelissero/status/1339219367083585538. No free 2012–2025 inactive vintage archive found (Harper).
- Glazer/Binney/Seth cell counts are from the indexed table; full text returned 403. Treat 1.9% / 28% / 99.8% as indexed, not full-text confirmed.
- nflverse-data license confirmed CC-BY-4.0 on the repo page: https://github.com/nflverse/nflverse-data. Participation and FTN charting are CC-BY-SA 4.0 (share-alike). Do not ship a derivative charting product without checking SA.

### Task 3
- Possession/EP layer citation: Yurko, Ventura, Horowitz, nflWAR, arXiv:1802.00998 v2 (2018-07-12), https://arxiv.org/abs/1802.00998. Multinomial logistic EP. This is not a pregame joint score distribution.
- nflfastR EP leave-one-season-out calibration error 0.006 vs nflscrapR 0.017 on 2000–2019: https://www.opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/ (Baldwin, 2021-02-05). In-game only.

### Task 7
- Borghesi 2008, Applied Financial Economics 18(12):947–953. NFL totals 1984–2004. Heat, wind and rain reduced scoring; claimed out-of-sample win rate above the 52.38% vig threshold. https://www.tandfonline.com/doi/full/10.1080/09603100701335432. Old market. Do not assume the bias survives.
- Nichols 2014, Journal of Sports Economics. NFL 1981–2004. West-to-east travel raised home win probability; the model did not produce a profitable out-of-sample betting strategy. https://journals.sagepub.com/doi/10.1177/1527002512440580.
- Open-Meteo Historical Forecast API: archived model runs (GFS from 2021-03-23, ICON from 2022-11-24). This is the point-in-time forecast, not ERA5 actuals. https://open-meteo.com/en/docs/historical-forecast-api. Commercial terms and free quota: UNVERIFIED beyond the features page.
- Contract-year NFL overperformance: not supported. 4for4 2012, n=121, fantasy PPG not higher: https://www.4for4.com/2012/preseason/2012-contract-year-players-and-myth-increased-production. White & Sheldon 2014 is NBA/MLB, not NFL.

### Task 8
- ForecastBench submission: register at https://register.forecastbench.org/; question set at 00:00 UTC; upload by 23:59:59 UTC; must cover ≥95% of market and ≥95% of dataset questions or missing answers are imputed at 0.5. https://github.com/forecastingresearch/forecastbench/wiki/How-to-submit-to-ForecastBench. Questions are not NFL game results.
- GPT-4.5 Brier 0.101 vs superforecasters 0.081 is a ForecastBench sample, not an NFL result: https://forecastingresearch.substack.com/p/ai-llm-forecasting-model-forecastbench-benchmark.
- Prophet Arena paper: https://arxiv.org/abs/2510.17638.

### Task 9
- Choe and Ramdas, Comparing Sequential Forecasters, Operations Research 72(4):1368–1387, 2024. doi:10.1287/opre.2021.0792. https://dl.acm.org/doi/abs/10.1287/opre.2021.0792.
- Implementation: seqcomp on CRAN, MIT, 0.3.0 published 2026-09-27. https://cran.r-project.org/package=seqcomp.
- MAPIE Venn-ABERS: https://mapie.readthedocs.io/en/stable/examples_calibration/1-quickstart/plot_calibration_venn_abers_multiclass.html.
- Promote only when a game-blocked paired log-loss gap vs the close has an e-process that crosses a preset threshold. The existing Elo ablation (interval includes 0) fails this gate.

### Odds API price conflict (do not collapse)
- Official https://the-odds-api.com/ (2026-09-29): historical on paid tiers; $30 / 20k credits, $59 / 100k, $119 / 5M, $249 / 15M. Historical endpoint costs 10 credits per region per market.
- Different domain https://theoddsapi.com/pricing (2026-07-03): Business $99/mo claims historical included. UNVERIFIED as the same product. Budget against the-odds-api.com.
