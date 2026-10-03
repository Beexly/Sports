# Super Grok Heavy: deep research brief for GSE (2026-10-03)

Paste everything below the line. Attach GSE_STATUS_AND_PLAN_FOR_DEEP_RESEARCH_2026-10-03.md as context.

---

You are the deep-research team for GSE, an all-ingesting reasoning engine for sports prediction (NFL first; also NCAAF, MLB, NBA, NHL, MLS).
It ingests every signal on the field, around the game and outside the game, reasons over it, and emits picks, props, parlays, fantasy/DFS and analysis.
It grades itself on proper scoring rules and learns continuously.
The attached status file shows what we have, what we measured and what is running. Do not repeat it back. Find what we cannot find ourselves.

RULES
- Every factual claim carries a working URL, plus a date or version.
- If you cannot verify something, write UNVERIFIED. Never invent a dataset, API, endpoint, paper, number or license.
- For every data source, report:
  - coverage years and sports
  - granularity
  - whether timestamps or vintages exist (can we know what was known at time t?)
  - access method and cost
  - rate limits
  - license and terms, quoted where possible, and whether internal commercial modelling is allowed
  - a sample record or schema
- Prefer free and open sources. Name paid ones with their price.
- Rank everything by (expected accuracy gain × data availability) ÷ build effort.
- Output one section per task, in the order below, each ending with a 'BUILD THIS FIRST' line.

TASK 1: Point-in-time availability truth (our highest-value build).
- Find every source of historical NFL pre-game information with real timestamps or vintages, 2012–2026:
  - Wed/Thu/Fri practice participation and final designations
  - game-day inactives (about 90 minutes before kickoff)
  - expected starters/depth charts as published before the game
  - IR/PUP/COVID lists, suspensions, elevations from the practice squad
- For each: does a historical archive exist (nflverse, NFL GSIS, nfl.com, ESPN, Pro Football Reference, Rotowire, FantasyLabs, Wayback Machine snapshots, Kaggle datasets, GitHub scrapers)? How far back? Does it record publication time?
- Then give the best published methods for:
  - (a) the probability a player plays, given the practice-status sequence and designation
  - (b) replacement-adjusted value by position (QB, OL, edge, CB, WR), with effect sizes on points or win probability
- Quote numbers from papers or analyst studies with links.

TASK 2: Historical odds and props with timestamps.
- Every archive of NFL (and NCAAF/MLB) odds with line-movement timestamps by book: open, intermediate, close, sharp books (Pinnacle, Circa, Bookmaker) vs recreational.
- Player props history: yards, receptions, attempts, TDs, anytime TD, longest, alt lines.
- Include The Odds API historical, SportsDataIO, OddsJam, Unabated, Action Network, Kaggle odds datasets, sportsbookreviewsonline archives and academic datasets. Give price per month for paid ones.
- Answer: what is the cheapest way to get decision-time (not just closing) quotes for NFL games and props for 2018–2025?
- Also: which books' closes are sharpest for NFL sides, totals and props, per published studies?

TASK 3: State of the art in NFL game-score distributions and market-coherent pricing.
- Papers and open code for:
  - bivariate/joint NFL score distributions (bivariate Poisson variants, Skellam, ordered/discrete-normal margin models with key-number mass at 3 and 7)
  - drive and possession simulators
  - mapping spread + total to team-total, half, quarter and alt-line probabilities
  - same-game parlay correlation estimation
- Report measured calibration and log loss vs market, with sample sizes.
- Answer: which approach gives coherent ML/spread/total/team totals with the best out-of-sample calibration on 2015+ data?

TASK 4: Player prop and DFS modelling that beats public projections.
- Best published or open methods for opportunity models (snaps, routes run, targets, carries, red-zone share, dropbacks) and efficiency, with distributional outputs (zero-inflated, NGBoost, quantile).
- Measured accuracy vs FantasyPros/ECR, ESPN, CBS, numberFire, establishtheedge, 4for4.
- Sources of route-participation data (PFF, FTN, nflverse participation, NGS) with license terms.
- DFS: sources of projected and actual ownership (DraftKings/FanDuel contest results, free CSV sources), and leverage/stacking optimizers with results.

TASK 5: Madden 26 and Madden 27 data, legally.
- Where can play-by-play playbook structure be obtained: formation, play name, concept, per-receiver route assignment, protection?
- Where are weekly player ratings with release dates (EA ratings site API, community databases)?
- Quote EA terms on data use. Is there any studied evidence that Madden ratings predict NFL performance, especially rookies and backups? Effect sizes.
- Is Madden gameplay footage usable as synthetic CV training data, and what has been published on sim-to-real for football?

TASK 6: Football computer vision that works on broadcast video.
- Open datasets and models for player detection, team ID, jersey-number OCR, field registration/homography (yard numbers, hash marks), pre-snap formation classification, route recognition and play segmentation from broadcast or All-22.
- Include Kaggle NFL Health & Safety Helmet Assignment, Big Data Bowl tracking (2021/2023/2024/2025/2026), SoccerNet-style camera calibration, sports keypoint models and Roboflow football datasets. Give licenses and benchmark numbers.
- Answer: what is the fastest route to (a) formation/personnel classification at ≥ 90% accuracy and (b) a homography reprojection error < 1 yard, running on a CPU/Intel iGPU laptop with OpenVINO?

TASK 7: Outside-the-game signals with evidence.
- For each family, find the strongest published evidence (effect size, n, years) that it moves NFL outcomes, totals or player stats beyond what the closing line already prices. Also give a source that can be archived with timestamps:
  - travel distance and time zones
  - circadian/body-clock kickoff effects
  - short weeks and the TNF penalty
  - international games
  - altitude
  - weather forecast vs actual (wind especially)
  - referee crews (penalty rates, totals)
  - crowd and stadium noise
  - fan travel share
  - turf vs grass
  - coaching changes and play-caller changes
  - coordinator tendencies
  - contract incentives and contract years
  - personal and family events
  - player sentiment from press conferences and beat reporters
  - social-media insider leaks before official reports
  - public betting splits and handle
  - prediction-market (Kalshi/Polymarket) prices
  - search interest
  - playoff leverage and motivation
  - lookahead and letdown spots
  - revenge games
- Mark which are supported, which are folklore, and which are already priced.

TASK 8: Leakage-proof evaluation of LLM-based forecasting.
- The best current methods for evaluating LLM reasoners on sports without pretraining contamination: anonymization, counterfactual or perturbed histories, post-cutoff-only evaluation, retrieval-only designs.
- Report the methods and published results of the top systems on Prophet Arena, the Metaculus FutureEval/AI benchmark tournaments and ForecastBench (2025–2026): architecture, retrieval, ensembling, calibration and fine-tuning recipes.
- What exactly would an entry on those leaderboards require from us (rules, cadence, APIs)?

TASK 9: Calibration and promotion statistics for a small-n, high-dependence setting.
- Best practice for: paired block bootstrap by game; effective sample size with many correlated targets per game; FDR with permutation p-values; sequential/anytime-valid tests (e-values) for weekly promotion; beta vs isotonic vs Venn-Abers calibration under drift; conformal prediction for abstention under time drift.
- Give the concrete formulas and the open-source libraries.

TASK 10: Foundation models for sports event sequences.
- Papers and open code for transformer, sequence or graph models pretrained on play-by-play or tracking data (football, soccer, basketball, baseball) and fine-tuned for game, player or prop prediction.
- Report measured gains over strong tabular baselines and their compute.
- Answer: what is the smallest pretraining that has shown real downstream gains, and could it run on a CPU laptop plus free Kaggle/Colab GPUs?

TASK 11: Free and cheap data we are not using, for every sport.
- For NCAAF (cfbfastR/CFBD), MLB (Statcast, Retrosheet, umpire data, lineups with timestamps), NBA (pbp, tracking, injury reports with timestamps), NHL and MLS: the best free sources of pre-game lineups/injuries with vintage, odds history, and advanced stats.
- Include license terms.

TASK 12: The hardest question.
- Given everything above, design a ranked build list for the next 24 hours and the next 7 days.
- The goal is to maximize the engine's out-of-sample log loss and calibration across ML, spread, total, props and DFS, while respecting point-in-time correctness.
- For each item give: the data source, the method, the expected gain with evidence, the test that proves it, and the build hours.
- Then list what a sophisticated sports-modelling syndicate would have that this plan still lacks.

FINAL OUTPUT FORMAT
- A ranked master table: item, task #, source URL, license status, PIT-safe (yes/no/partial), expected gain + citation, build hours, BUILD-THIS-FIRST flag.
- Then the 12 sections.
- Then a list of every claim you marked UNVERIFIED.
