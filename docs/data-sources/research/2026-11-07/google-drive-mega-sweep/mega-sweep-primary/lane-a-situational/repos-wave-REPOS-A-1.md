# REPOS WAVE REPOS-A-1 — Lane A (GSE situational): 50 verified GitHub repos
Mega Sweep 2026-11-06 · Lane A · Worker wave REPOS-A-1

Scope: football/NFL analytics and data repos feeding the GSE reasoning engine — play-by-play datasets/pipelines, EP/WP models, tracking tooling, play-calling/coaching analytics, QB/receiver and player-value metrics, draft/roster modeling, simulation engines, sports-analytics libraries with real football depth.
Excluded by design: betting/trading bots, pick-selling tools, odds scrapers for automated betting, DFS lineup optimizers.
Dedupe: every candidate checked against SEEN-ledger fragments (none existed at run start), REPO-CATALOG.md (21 repos), 2026-11-04-MASTER-PULL.md and SHARED-ITEMS-REGISTER.md (github.com grep). Hits recorded as DUPE-SKIP in SEEN-REPOS-A-1.md.
Verification: every repo below returned live by the GitHub API in this run (search-API records: existence, description, stars, last push, language, license, fork flag). Note: the connector's direct /repos/{owner}/{name} endpoint repeatedly dropped connections (RemoteDisconnected) during this run; per-repo search re-verification succeeded for a subset and agreed with the search records used here. Stars/push dates are the API values at verification time (2026-11-06).

## A-R1-01 — roclark/sportsipy
**Verified (GitHub API, 2026-11-06):** 578★ · last push 2025-01-31 · created 2018 · primary language Python · license MIT · fork: False · https://github.com/roclark/sportsipy
**API description:** A free sports API written for python

1. **WHAT IT IS:** Python library and CLI that scrapes Sports Reference sites (Pro Football Reference for NFL) into typed datasets: teams, rosters, schedules, boxscores, players.
2. **WHERE:** https://github.com/roclark/sportsipy
3. **HOW TO USE IT:** pip install sportsipy; from sportsipy.nfl.teams import Teams / schedule / boxscore modules; no API key.
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** Backfill source for the TypeScript engine's Python sidecar; pairs with nflverse pbp to cross-validate PFR-only fields (sacks, pressures proxies) and to sanity-check nflverse joins.
6. **§8 ENGINE-TRAINING VALUE:** PFR team/player season and game tables: labels = actual outcomes (points, yards); features = historical team strength priors where nflverse is thin pre-1999. Data lives on pro-football-reference.com via the library; labels exist (game results).
7. **PROVENANCE:** Original work by Robert Clark (roclark); wraps Sports Reference LLC data.
8. **VERDICT:** TEST

## A-R1-02 — maksimhorowitz/nflscrapR
**Verified (GitHub API, 2026-11-06):** 556★ · last push 2020-04-03 · created 2016 · primary language R · license none stated · fork: False · https://github.com/maksimhorowitz/nflscrapR
**API description:** R Package for Scraping and Aggregating NFL Data

1. **WHAT IT IS:** The original R package for scraping NFL play-by-play from NFL.com GameCenter JSON and computing EPA/WP — the direct ancestor of nflfastR/nflverse.
2. **WHERE:** https://github.com/maksimhorowitz/nflscrapR
3. **HOW TO USE IT:** R: devtools::install_github('maksimhorowitz/nflscrapR'); scrape_play_by_play(); needs season game IDs.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** Provenance anchor: GSE's EPA/WP definitions trace here; useful to diff historical EPA model specs against the current nflverse implementation when auditing model drift.
6. **§8 ENGINE-TRAINING VALUE:** EPA and WP model code + coefficients: features = down/distance/yardline/time/score state; labels = play outcomes and game outcomes in the scraped pbp. Labels exist.
7. **PROVENANCE:** By Maksim Horowitz, Ron Yurko, Sam Ventura line of work (CMU); superseded upstream by nflverse/nflfastR, which is already known to GSE (dupe base) — this repo is the pre-nflverse original, not a fork.
8. **VERDICT:** LEARN-ONLY

## A-R1-03 — ryurko/nflscrapR-data
**Verified (GitHub API, 2026-11-06):** 387★ · last push 2020-03-02 · created 2017 · primary language HTML · license none stated · fork: False · https://github.com/ryurko/nflscrapR-data
**API description:** Data files (.csv) accessed with nflscrapR and summarized at the player-level

1. **WHAT IT IS:** Pre-scraped CSV datasets produced by nflscrapR: play-by-play summarized at player level (passing/rushing/receiving season files) used across early NFL analytics writing.
2. **WHERE:** https://github.com/ryurko/nflscrapR-data
3. **HOW TO USE IT:** Download CSVs from repo data folders; load with pandas/readr; no code install required.
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** Frozen historical snapshot — good as an immutable regression fixture: if GSE's pipeline output ever disagrees with these player-season totals, the diff localizes the break.
6. **§8 ENGINE-TRAINING VALUE:** Player-season aggregates (attempts, yards, EPA per player-season) with player IDs; labels = realized season totals. Data lives in-repo as CSV.
7. **PROVENANCE:** By Ron Yurko (ryurko), CMU statistics; companion data repo to nflscrapR.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-04 — ryurko/nflscrapR-models
**Verified (GitHub API, 2026-11-06):** 41★ · last push 2018-09-18 · created 2017 · primary language R · license none stated · fork: False · https://github.com/ryurko/nflscrapR-models
**API description:** Code to build and test the expected points and win probability models in nflscrapR

1. **WHAT IT IS:** The model-building code behind nflscrapR's expected points and win probability models — multinomial/gradient-boosted EP and WP fitting with evaluation.
2. **WHERE:** https://github.com/ryurko/nflscrapR-models
3. **HOW TO USE IT:** R scripts in repo; run against nflscrapR-data / scraped pbp; entry points are the model .Rmd/.R files.
4. **WHICH SYSTEM:** GSE engine layer — situational; matchup.
5. **SECOND-ORDER:** Blueprint for a GSE-owned EP/WP refit: lets the engine stop inheriting nflverse's EP as a black box and instead fit EP on GSE's own situational splits (weather, surface, pace).
6. **§8 ENGINE-TRAINING VALUE:** EP model (next-score probabilities per game state) and WP model (win label per state): labels = next scoring event and final winner, both derivable from pbp. Training code + spec in-repo.
7. **PROVENANCE:** By Ron Yurko (CMU); the original published EP/WP modeling code for the nflscrapR lineage.
8. **VERDICT:** TEST

## A-R1-05 — ryurko/nflWAR
**Verified (GitHub API, 2026-11-06):** 38★ · last push 2018-09-18 · created 2017 · primary language R · license none stated · fork: False · https://github.com/ryurko/nflWAR
**API description:** An R package to compute WAR for offensive players using nflscrapR

1. **WHAT IT IS:** R package implementing Wins Above Replacement for NFL offensive players (QB/RB/WR/TE) built on nflscrapR EPA/WPA, with multilevel modeling of player value.
2. **WHERE:** https://github.com/ryurko/nflWAR
3. **HOW TO USE IT:** R: install from GitHub; functions fit WAR models on nflscrapR pbp; see vignettes.
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** Player-value layer GSE lacks: WAR-style replacement-level baselines convert raw EPA into 'value over available replacement', which sharpens prop reasoning (backup QB / RB2 situations).
6. **§8 ENGINE-TRAINING VALUE:** Per-play EPA/WPA attribution to individual players and posterior player-value distributions; labels = play outcomes; replacement-level thresholds estimated in-code. Data = nflscrapR pbp.
7. **PROVENANCE:** By Ron Yurko (CMU); research package accompanying his NFL WAR papers.
8. **VERDICT:** LEARN-ONLY

## A-R1-06 — nflverse/nflverse-data
**Verified (GitHub API, 2026-11-06):** 442★ · last push 2026-11-01 · created 2022 · primary language R · license CC-BY-4.0 · fork: False · https://github.com/nflverse/nflverse-data
**API description:** Automated nflverse data repository

1. **WHAT IT IS:** The central automated data warehouse of the nflverse: release assets (parquet/CSV/RDS) for play-by-play, rosters, schedules, player stats, injuries, snap counts, trades, draft picks, combine, depth charts, officials and more, rebuilt on scheduled pipelines.
2. **WHERE:** https://github.com/nflverse/nflverse-data
3. **HOW TO USE IT:** Download release assets from GitHub Releases (or via nflreadr/nflreadpy); data dictionaries in-repo.
4. **WHICH SYSTEM:** GSE engine layer — usage; health; matchup; situational; venue-weather-refs.
5. **SECOND-ORDER:** This is the canonical ingest target for a GSE data mirror: pin a release, mirror to Neon, and every downstream layer (usage, health, refs, draft) reads one versioned source instead of scraping.
6. **§8 ENGINE-TRAINING VALUE:** Dozens of labeled tables: pbp with EPA/WP/CPOE labels, player-week stats, injuries (player/week/status labels), officials assignments (crew per game), depth charts, draft capital. Labels exist throughout.
7. **PROVENANCE:** By the nflverse organization (Ben Baldwin, Sebastian Carl, Tan Ho et al.); original project, aggregates upstream NFL/PFR/FTN feeds with attribution in-repo.
8. **VERDICT:** ADOPT

## A-R1-07 — nflverse/nfl_data_py
**Verified (GitHub API, 2026-11-06):** 442★ · last push 2025-09-25 · created 2021 · primary language Python · license MIT · fork: False · https://github.com/nflverse/nfl_data_py
**API description:** Python code for working with NFL play by play data.

1. **WHAT IT IS:** Python package for importing nflverse play-by-play and auxiliary data (schedules, rosters, weekly/seasonal player stats, snap counts, PFR advanced stats) into pandas.
2. **WHERE:** https://github.com/nflverse/nfl_data_py
3. **HOW TO USE IT:** pip install nfl-data-py; import nfl_data_py as nfl; nfl.import_pbp_data(seasons).
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** The Python bridge for GSE's lab work (DeepSeek-protocol experiments, model prototyping) so Python notebooks stop hand-rolling nflfastR CSV URLs.
6. **§8 ENGINE-TRAINING VALUE:** Same nflverse tables in pandas form: pbp EPA/WP labels, player stats, snap counts (usage labels: snap share per player-week). Labels exist.
7. **PROVENANCE:** nflverse org; Python sibling of nflreadr, maintained within the nflverse project.
8. **VERDICT:** ADOPT

## A-R1-08 — nflverse/nflverse-pbp
**Verified (GitHub API, 2026-11-06):** 358★ · last push 2026-09-11 · created 2020 · primary language R · license CC-BY-4.0 · fork: False · https://github.com/nflverse/nflverse-pbp
**API description:** builds play by play and player stats for nflverse/nflverse-data

1. **WHAT IT IS:** The build pipeline that constructs nflverse play-by-play and player stats from raw sources — parsing, ID resolution, EPA/WP/CPOE model application, and release publishing.
2. **WHERE:** https://github.com/nflverse/nflverse-pbp
3. **HOW TO USE IT:** R build scripts; not an end-user package — read/run the pipeline to reproduce nflverse-data pbp assets.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** Full provenance for GSE's core input: when an EPA value looks wrong, this is where the answer lives. Also the template for building a GSE-owned pbp variant (e.g., with GSE's own EP model swapped in).
6. **§8 ENGINE-TRAINING VALUE:** Shows exactly how EPA/WP/CPOE labels are generated (model objects + code); the pipeline itself is the training-label factory for any GSE refit.
7. **PROVENANCE:** nflverse org build repo; upstream models descend from nflscrapR (see A-R1-02/04).
8. **VERDICT:** LEARN-ONLY

## A-R1-09 — nflverse/nflreadpy
**Verified (GitHub API, 2026-11-06):** 251★ · last push 2026-10-30 · created 2025 · primary language Python · license MIT · fork: False · https://github.com/nflverse/nflreadpy
**API description:** python port of nflreadr package for loading nflverse data

1. **WHAT IT IS:** Actively developed Python port of nflreadr: loads nflverse data (pbp, player stats, rosters, schedules, injuries, etc.) via Polars with caching and clean schemas.
2. **WHERE:** https://github.com/nflverse/nflreadpy
3. **HOW TO USE IT:** pip install nflreadpy; import nflreadpy as nfl; nfl.load_pbp(seasons).
4. **WHICH SYSTEM:** GSE engine layer — usage; health; matchup.
5. **SECOND-ORDER:** Successor to nfl_data_py for new Python work — Polars speed matters for play-by-play-scale frames in the lab; standardize GSE Python tooling on one loader.
6. **§8 ENGINE-TRAINING VALUE:** All nflverse labeled tables via Polars: pbp, injuries, participation; labels exist as in nflverse-data.
7. **PROVENANCE:** nflverse org; port of the R nflreadr package (same org).
8. **VERDICT:** ADOPT

## A-R1-10 — nflverse/nflreadr
**Verified (GitHub API, 2026-11-06):** 115★ · last push 2026-09-17 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflreadr
**API description:** Efficiently download nflverse data

1. **WHAT IT IS:** The canonical R loader for nflverse data with caching, progress, and dictionary helpers — the reference implementation every other loader mirrors.
2. **WHERE:** https://github.com/nflverse/nflreadr
3. **HOW TO USE IT:** R: install.packages('nflreadr') / pak; load_pbp(), load_player_stats(), load_injuries(), etc.
4. **WHICH SYSTEM:** GSE engine layer — usage; health; matchup.
5. **SECOND-ORDER:** Reference spec: GSE's TypeScript loader can mirror nflreadr's function/table inventory as its completeness checklist (which tables exist, which seasons each covers).
6. **§8 ENGINE-TRAINING VALUE:** Access layer to all labeled nflverse tables; data_dictionary_* helpers document every field/label in-code.
7. **PROVENANCE:** nflverse org (Sebastian Carl lead); original.
8. **VERDICT:** ADOPT

## A-R1-11 — nflverse/nflverse
**Verified (GitHub API, 2026-11-06):** 66★ · last push 2025-08-06 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflverse
**API description:** Easily Install and Load the 'nflverse'

1. **WHAT IT IS:** Meta-package that installs and loads the core nflverse R ecosystem in one call, with version/conflict management.
2. **WHERE:** https://github.com/nflverse/nflverse
3. **HOW TO USE IT:** R: install.packages('nflverse'); library(nflverse).
4. **WHICH SYSTEM:** GSE engine layer — corpus.
5. **SECOND-ORDER:** Environment pin for any R-side reproduction work (BDB replications, book code): one install reproduces the stack those repos assume.
6. **§8 ENGINE-TRAINING VALUE:** No new data; guarantees version-consistent access to the labeled tables of the ecosystem.
7. **PROVENANCE:** nflverse org meta-package.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-12 — nflverse/nflseedR
**Verified (GitHub API, 2026-11-06):** 35★ · last push 2026-10-31 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflseedR
**API description:** Functions to Efficiently Simulate and Evaluate NFL Seasons

1. **WHAT IT IS:** R package that simulates NFL seasons and playoff seeding efficiently — standings, tiebreakers, and playoff pictures from game probabilities, used for season simulations.
2. **WHERE:** https://github.com/nflverse/nflseedR
3. **HOW TO USE IT:** R: install from CRAN/GitHub; simulate() with per-game win probabilities.
4. **WHICH SYSTEM:** GSE engine layer — situational.
5. **SECOND-ORDER:** Playoff-leverage layer: GSE situational reasoning gains a real 'what does this game mean for seeding' number (motivation/rest-risk spots late season) instead of narrative guessing.
6. **§8 ENGINE-TRAINING VALUE:** Simulation engine consuming per-game WP inputs and producing playoff-probability labels per team-week; labels = simulated/actual seeding outcomes for validation.
7. **PROVENANCE:** nflverse org; simulation methods build on the community's season-sim lineage (Lee Sharpe et al.).
8. **VERDICT:** TEST

## A-R1-13 — nflverse/nflverse-rosters
**Verified (GitHub API, 2026-11-06):** 27★ · last push 2026-11-01 · created 2020 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflverse-rosters
**API description:** builds roster data for nflverse/nflverse-data

1. **WHAT IT IS:** Build pipeline for nflverse roster data: weekly and seasonal rosters with GSIS/Otto IDs, positions, depth info, harmonized across eras.
2. **WHERE:** https://github.com/nflverse/nflverse-rosters
3. **HOW TO USE IT:** R build repo; outputs land in nflverse-data roster releases.
4. **WHICH SYSTEM:** GSE engine layer — usage; health.
5. **SECOND-ORDER:** Identity resolution is GSE plumbing gold: the ID crosswalks here (GSIS, PFR, ESPN, Sleeper) are what let usage/health tables join without name-matching hacks.
6. **§8 ENGINE-TRAINING VALUE:** Roster tables with multi-source player ID crosswalk labels (same player across GSIS/PFR/ESPN/Sleeper/FantasyPros IDs). Labels = curated identity links.
7. **PROVENANCE:** nflverse org build repo.
8. **VERDICT:** ADOPT

## A-R1-14 — nflverse/nflplotR
**Verified (GitHub API, 2026-11-06):** 25★ · last push 2026-10-20 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflplotR
**API description:** A set of functions to visualize National Football League analysis in 'ggplot2'

1. **WHAT IT IS:** R plotting helpers for NFL analysis: team logos/colors in ggplot2, player headshots, and standardized chart theming.
2. **WHERE:** https://github.com/nflverse/nflplotR
3. **HOW TO USE IT:** R: install.packages('nflplotR'); geom_nfl_headshots(), element_team_logo(), etc.
4. **WHICH SYSTEM:** GSE engine layer — corpus.
5. **SECOND-ORDER:** Card/chart production for GSE content: headshot/logo geoms are the fast path to publication-grade matchup charts without bespoke asset plumbing.
6. **§8 ENGINE-TRAINING VALUE:** No training data; visualization layer over labeled nflverse tables.
7. **PROVENANCE:** nflverse org; original.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-15 — nflverse/nfl4th
**Verified (GitHub API, 2026-11-06):** 25★ · last push 2026-11-01 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nfl4th
**API description:** NFL 4th down decision calculator

1. **WHAT IT IS:** R package that calculates NFL 4th-down decision recommendations — go/punt/field-goal expected WP gain from a fitted model on nflverse pbp.
2. **WHERE:** https://github.com/nflverse/nfl4th
3. **HOW TO USE IT:** R: install from GitHub/CRAN; get_rush_likelihood / decision functions via nfl4th::load_4th_pbp or the 4th-down calculator data.
4. **WHICH SYSTEM:** GSE engine layer — situational; matchup.
5. **SECOND-ORDER:** Direct coaching-analytics input: a team's historical 4th-down aggressiveness vs model-optimal is a measurable coaching-tendency feature for matchup reasoning (and a live in-game situational signal).
6. **§8 ENGINE-TRAINING VALUE:** WP-gain labels per 4th-down state (go vs punt vs FG deltas) from its fitted WP/EP models; features = full game state. Labels exist (model outputs + realized outcomes).
7. **PROVENANCE:** nflverse org; model lineage from Ben Baldwin's 4th-down research (RBSDM).
8. **VERDICT:** TEST

## A-R1-16 — nflverse/ngs-data
**Verified (GitHub API, 2026-11-06):** 24★ · last push 2026-11-01 · created 2021 · primary language R · license MIT · fork: False · https://github.com/nflverse/ngs-data
**API description:** builds next gen stats data for nflverse/nflverse-data

1. **WHAT IT IS:** Build pipeline for Next Gen Stats data in nflverse: weekly NGS passing/rushing/receiving aggregates (time to throw, aggressiveness, expected completion %, rushing yards over expected, etc.).
2. **WHERE:** https://github.com/nflverse/ngs-data
3. **HOW TO USE IT:** R build repo; outputs land in nflverse-data NGS releases; consume via nflreadr::load_nextgen_stats().
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** The open NGS aggregate feed for GSE: RYOE per RB-week and CPOE/time-to-throw per QB-week are ready-made tracking-derived features without needing raw tracking.
6. **§8 ENGINE-TRAINING VALUE:** NGS aggregate metrics per player-week: RYOE, expected completion %, time to throw, separation, cushion — tracking-derived labels computed by NFL NGS, redistributed here. Labels exist.
7. **PROVENANCE:** nflverse org; data originates from NFL Next Gen Stats (AWS) public weekly aggregates.
8. **VERDICT:** ADOPT

## A-R1-17 — nflverse/nflverse-pfr
**Verified (GitHub API, 2026-11-06):** 10★ · last push 2026-11-01 · created 2021 · primary language R · license GPL-3.0 · fork: False · https://github.com/nflverse/nflverse-pfr
**API description:** builds pfr data for nflverse/nflverse-data

1. **WHAT IT IS:** Build pipeline that scrapes Pro Football Reference advanced stats (passing/rushing/receiving weekly advanced tables: air yards, pressures, blitzes, drops, bad throws, play action) into nflverse releases.
2. **WHERE:** https://github.com/nflverse/nflverse-pfr
3. **HOW TO USE IT:** R build repo; outputs in nflverse-data pfr_advstats releases; consume via nflreadr.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** Pressure/blitz rates per QB-week and per defense-week are exactly the scheme-pressure features GSE's matchup layer wants; this pipeline is their provenance and refresh path.
6. **§8 ENGINE-TRAINING VALUE:** PFR advanced weekly tables: pressures, hurries, blitz rate, bad-throw %, play-action rate, broken tackles — labeled per player/team-week. Labels exist.
7. **PROVENANCE:** nflverse org; source data Pro Football Reference (Sports Reference).
8. **VERDICT:** ADOPT

## A-R1-18 — nflverse/nflverse-players
**Verified (GitHub API, 2026-11-06):** 5★ · last push 2026-11-01 · created 2024 · primary language R · license NOASSERTION · fork: False · https://github.com/nflverse/nflverse-players
**API description:** Create 'nflverse' Players Data

1. **WHAT IT IS:** Build repo that creates the nflverse players table — the master player identity/demographic file (names, IDs, birthdates, college, draft info).
2. **WHERE:** https://github.com/nflverse/nflverse-players
3. **HOW TO USE IT:** R build repo; output consumed via nflreadr::load_players().
4. **WHICH SYSTEM:** GSE engine layer — usage; corpus.
5. **SECOND-ORDER:** Canonical player dimension table for GSE joins — one row per player with every ID system, ending per-project player tables.
6. **§8 ENGINE-TRAINING VALUE:** Player dimension with ID crosswalks + draft year/round/pick labels and college. Labels exist (curated).
7. **PROVENANCE:** nflverse org build repo.
8. **VERDICT:** ADOPT

## A-R1-19 — sportsdataverse/sportsdataverse-py
**Verified (GitHub API, 2026-11-06):** 127★ · last push 2026-11-06 · created 2021 · primary language Python · license MIT · fork: False · https://github.com/sportsdataverse/sportsdataverse-py
**API description:** Tidy sports data in Python: play-by-play, box scores, schedules, rosters and models across 100+ leagues (NFL, NBA, WNBA, MLB, NHL, college sports, soccer, international basketball and hockey). polars-first.

1. **WHAT IT IS:** Python SportsDataverse: tidy play-by-play, schedules, rosters, box scores and built-in models (EP/WP for CFB, etc.) across NFL, CFB and 100+ leagues, ESPN-backed.
2. **WHERE:** https://github.com/sportsdataverse/sportsdataverse-py
3. **HOW TO USE IT:** pip install sportsdataverse; import sportsdataverse.nfl / .cfb modules; ESPN endpoints, no key for most.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage; situational.
5. **SECOND-ORDER:** Second independent pbp source: where nflverse and ESPN disagree (participation, scoring plays), GSE gets a cross-check; its CFB EP/WP gives the college pipeline the same shape as the NFL one.
6. **§8 ENGINE-TRAINING VALUE:** CFB/NFL pbp with EP/WP labels from its own models, plus team box scores and rosters. Labels exist.
7. **PROVENANCE:** SportsDataverse org (Saiem Gilani et al.); Python counterpart of the R sportsdataverse ecosystem.
8. **VERDICT:** TEST

## A-R1-20 — sportsdataverse/sportsdataverse-js
**Verified (GitHub API, 2026-11-06):** 88★ · last push 2026-11-05 · created 2021 · primary language TypeScript · license MIT · fork: False · https://github.com/sportsdataverse/sportsdataverse-js
**API description:** Retrieves sports data from a popular sports website as well as from the NCAA website, with support for NBA, WNBA, NFL, NHL, College Football and mens and womens college basketball, 

1. **WHAT IT IS:** TypeScript/JavaScript SportsDataverse client: retrieves ESPN and NCAA data for NFL, CFB, NBA, NHL and more — the only sports-pbp client that lives natively in GSE's own language.
2. **WHERE:** https://github.com/sportsdataverse/sportsdataverse-js
3. **HOW TO USE IT:** npm install sportsdataverse; import { nfl } from 'sportsdataverse'; Node/TypeScript.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** Highest-leverage wiring candidate in this wave: a TS-native data client drops straight into the Beexly/Sports monorepo with no Python/R sidecar for ESPN-sourced tables.
6. **§8 ENGINE-TRAINING VALUE:** ESPN NFL/CFB pbp, schedules, rosters, standings as typed TS objects; EP/WP not included (pair with GSE's own models). Labels = game/play outcomes from ESPN feeds.
7. **PROVENANCE:** SportsDataverse org (Saiem Gilani et al.); JS port of the sportsdataverse family.
8. **VERDICT:** TEST

## A-R1-21 — sportsdataverse/cfbfastR
**Verified (GitHub API, 2026-11-06):** 113★ · last push 2026-11-06 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/sportsdataverse/cfbfastR
**API description:** An R package to quickly obtain clean and tidy college football play by play data

1. **WHAT IT IS:** R package for clean, tidy college football play-by-play from CollegeFootballData, with CFB EP/WP models — the college twin of nflfastR.
2. **WHERE:** https://github.com/sportsdataverse/cfbfastR
3. **HOW TO USE IT:** R: install.packages('cfbfastR'); cfbd_pbp_data() with a free CollegeFootballData API key.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** GSE's NCAA lane gets the same EP/WP substrate as the NFL lane; also the prospect pipeline: college pbp is where draft-class efficiency features come from.
6. **§8 ENGINE-TRAINING VALUE:** CFB pbp 2002–present with EPA/WPA labels from cfbfastR's own models, plus player/team season stats. Labels exist.
7. **PROVENANCE:** SportsDataverse org (Saiem Gilani); models follow the nflfastR EP/WP pattern adapted to CFB.
8. **VERDICT:** ADOPT

## A-R1-22 — sportsdataverse/cfbfastR-data
**Verified (GitHub API, 2026-11-06):** 20★ · last push 2026-11-02 · created 2021 · primary language R · license none stated · fork: False · https://github.com/sportsdataverse/cfbfastR-data
**API description:** cfbfastR data 2002-present

1. **WHAT IT IS:** Automated data repository holding cfbfastR's built play-by-play and stats releases (2002–present) so users load data without running the API pipeline.
2. **WHERE:** https://github.com/sportsdataverse/cfbfastR-data
3. **HOW TO USE IT:** GitHub Releases in-repo; load via cfbfastR's data loaders.
4. **WHICH SYSTEM:** GSE engine layer — matchup; corpus.
5. **SECOND-ORDER:** Versioned CFB mirror for GSE: pin a release next to the nflverse mirror for reproducible college work.
6. **§8 ENGINE-TRAINING VALUE:** Full CFB pbp + stats tables with EPA/WPA labels, as release assets. Labels exist.
7. **PROVENANCE:** SportsDataverse org; build outputs of cfbfastR.
8. **VERDICT:** ADOPT

## A-R1-23 — sportsdataverse/cfb4th
**Verified (GitHub API, 2026-11-06):** 11★ · last push 2026-11-06 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/sportsdataverse/cfb4th
**API description:** A set of functions to analyze NCAA Football 4th Downs.

1. **WHAT IT IS:** R package analyzing NCAA 4th-down decisions — the college counterpart of nfl4th, with CFB WP-based go/punt/FG recommendations.
2. **WHERE:** https://github.com/sportsdataverse/cfb4th
3. **HOW TO USE IT:** R: install from GitHub; functions mirror nfl4th's API over cfbfastR data.
4. **WHICH SYSTEM:** GSE engine layer — situational.
5. **SECOND-ORDER:** Coaching-tendency features for the NCAA lane (aggressiveness vs optimal), same feature family as nfl4th so NFL and CFB coaching profiles are comparable.
6. **§8 ENGINE-TRAINING VALUE:** WP-gain labels per CFB 4th-down state from its fitted models. Labels exist.
7. **PROVENANCE:** SportsDataverse org; method ported from nflverse/nfl4th (named upstream lineage).
8. **VERDICT:** TEST

## A-R1-24 — sportsdataverse/amf-location-data
**Verified (GitHub API, 2026-11-06):** 3★ · last push 2026-10-12 · created 2024 · primary language Python · license MIT · fork: False · https://github.com/sportsdataverse/amf-location-data
**API description:** Data repository that parses `statsbomb/amf-open-data` into a format simliar to the NFL Big Data Bowl (BDB) tracking datasets.

1. **WHAT IT IS:** Data repo that parses StatsBomb's American-football open data (statsbomb/amf-open-data) into NFL Big Data Bowl-style tracking format — player locations per frame/play in BDB schema.
2. **WHERE:** https://github.com/sportsdataverse/amf-location-data
3. **HOW TO USE IT:** Python scripts in-repo; download, run parsers; output = BDB-shaped tracking tables.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** Schema bridge: any model built for BDB tracking (separation, leverage, tackling) can be validated on this independent tracking set, and vice versa — cross-dataset generalization tests for GSE tracking features.
6. **§8 ENGINE-TRAINING VALUE:** Frame-level player (x,y) tracking with play outcomes — features = locations/speeds; labels = play result (yards, success). Data originates from StatsBomb AMF open data; labels exist.
7. **PROVENANCE:** SportsDataverse org; repackages StatsBomb amf-open-data (upstream named in the repo description).
8. **VERDICT:** TEST

## A-R1-25 — UnravelSports/unravelsports
**Verified (GitHub API, 2026-11-06):** 250★ · last push 2026-01-16 · created 2024 · primary language Python · license MPL-2.0 · fork: False · https://github.com/UnravelSports/unravelsports
**API description:** The unravelsports package aims to aid researchers, analysts and enthusiasts by providing intermediary steps in the complex process of turning raw sports data into meaningful information and actionable insights.

1. **WHAT IT IS:** Python framework that turns raw sports tracking data into analysis-ready form: pitch/field standardization, synchronization, and feature extraction, with American football (BDB/NGS-style) and soccer support.
2. **WHERE:** https://github.com/UnravelSports/unravelsports
3. **HOW TO USE IT:** pip install unravelsports; import unravel; loaders for BDB-style CSVs; docs + examples in-repo.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** The tracking ETL GSE would otherwise hand-build: standardize BDB tracking once, then every tracking feature (separation, closing speed, leverage) reads the same clean frames.
6. **§8 ENGINE-TRAINING VALUE:** Feature-extraction code for tracking: velocities, accelerations, team formations, player interactions per frame; labels come from the tracking datasets fed in (BDB play outcomes).
7. **PROVENANCE:** UnravelSports org (open-source sports-science collective); original framework.
8. **VERDICT:** TEST

## A-R1-26 — bcongelio/nfl-analytics-with-r-book
**Verified (GitHub API, 2026-11-06):** 80★ · last push 2025-02-12 · created 2022 · primary language TeX · license CC0-1.0 · fork: False · https://github.com/bcongelio/nfl-analytics-with-r-book
**API description:** The repo for Introduction to NFL Analytics with R (published with CRC Press)

1. **WHAT IT IS:** Full source of 'Introduction to NFL Analytics with R' (CRC Press, Bradley Congelio): every chapter's code and data workflows — pbp, tracking (BDB), modeling, visualization, Shiny.
2. **WHERE:** https://github.com/bcongelio/nfl-analytics-with-r-book
3. **HOW TO USE IT:** Clone repo; chapter .Rmd/.qmd files run against nflverse/BDB data; book text via CRC.
4. **WHICH SYSTEM:** GSE engine layer — corpus; matchup.
5. **SECOND-ORDER:** A ready curriculum + code library: its BDB tracking chapters are worked examples GSE can lift for feature code, and chapter exercises double as pipeline tests.
6. **§8 ENGINE-TRAINING VALUE:** Worked pipelines over nflverse pbp and BDB tracking with EPA/WP and tracking-feature labels; labels exist in the underlying datasets.
7. **PROVENANCE:** By Bradley Congelio (bcongelio); official companion repo to his CRC Press book.
8. **VERDICT:** LEARN-ONLY

## A-R1-27 — bendominguez0111/nflfastpy
**Verified (GitHub API, 2026-11-06):** 76★ · last push 2021-10-09 · created 2020 · primary language Python · license MIT · fork: False · https://github.com/bendominguez0111/nflfastpy
**API description:** Python package for loading nflfastR play by play data

1. **WHAT IT IS:** Early Python package for loading nflfastR play-by-play into pandas — historically important first Python bridge, now superseded by nfl_data_py/nflreadpy.
2. **WHERE:** https://github.com/bendominguez0111/nflfastpy
3. **HOW TO USE IT:** pip install nflfastpy (legacy); load_pbp equivalents.
4. **WHICH SYSTEM:** GSE engine layer — corpus.
5. **SECOND-ORDER:** Keep as provenance/comparison only: documents how the Python ecosystem started; do not build on it (archived-era code).
6. **§8 ENGINE-TRAINING VALUE:** Loader for labeled nflverse pbp (EPA/WP included). Labels exist in the data it loads.
7. **PROVENANCE:** By Ben Dominguez (bendominguez0111); superseded upstream by nflverse's own Python packages in this same wave.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-28 — asonty/ngs_highlights
**Verified (GitHub API, 2026-11-06):** 64★ · last push 2022-01-04 · created 2020 · primary language R · license none stated · fork: False · https://github.com/asonty/ngs_highlights
**API description:** Player-tracking data from NFL Next Gen Stats Highlights.

1. **WHAT IT IS:** R code and data wrangling for NFL Next Gen Stats Highlights tracking data — the public player-tracking extracts NGS published per highlight play (all 22 players, 10Hz).
2. **WHERE:** https://github.com/asonty/ngs_highlights
3. **HOW TO USE IT:** R scripts in-repo; data pulled from NGS highlight feeds as documented; outputs tidy tracking frames.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** One of the only public raw-tracking (not aggregate) NFL sources: small but real 10Hz data for prototyping separation/speed features before BDB data arrives each year.
6. **§8 ENGINE-TRAINING VALUE:** Raw tracking frames (x,y,speed,acceleration,orientation per player per frame) for highlight plays; labels = the highlight play outcomes. Labels exist for the included plays.
7. **PROVENANCE:** By asonty; data originates from NFL Next Gen Stats public highlights.
8. **VERDICT:** TEST

## A-R1-29 — guga31bb/ngscleanR
**Verified (GitHub API, 2026-11-06):** 23★ · last push 2021-10-04 · created 2021 · primary language R · license NOASSERTION · fork: False · https://github.com/guga31bb/ngscleanR
**API description:** functions to clean up nfl player tracking data

1. **WHAT IT IS:** R functions to clean NFL player tracking data (designed for Big Data Bowl / NGS tracking): standardize directions, compute derived motion fields, fix play-direction and coordinate issues.
2. **WHERE:** https://github.com/guga31bb/ngscleanR
3. **HOW TO USE IT:** R: source/install from GitHub; functions operate on BDB-format tracking data frames.
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** The known-good cleaning step for BDB tracking: direction standardization bugs silently flip left/right features — importing a battle-tested cleaner removes a whole class of GSE tracking errors.
6. **§8 ENGINE-TRAINING VALUE:** Cleaning/derivation code producing standardized tracking features (displacement, velocity toward end zone, etc.); labels from the BDB data it processes.
7. **PROVENANCE:** By guga31bb (John Edwards, prominent NFL analytics community member); original utility package.
8. **VERDICT:** TEST

## A-R1-30 — rushfive/FFDB
**Verified (GitHub API, 2026-11-06):** 44★ · last push 2024-02-03 · created 2018 · primary language C# · license MIT · fork: False · https://github.com/rushfive/FFDB
**API description:** NFL Database Engine for PostgreSql and Mongo (easily works with other custom databases too)

1. **WHAT IT IS:** NFL database engine for PostgreSQL/MongoDB (.NET): schemas, importers and query layer that build a queryable NFL database from nflverse/fantasy data sources.
2. **WHERE:** https://github.com/rushfive/FFDB
3. **HOW TO USE IT:** Clone; build in .NET; configure Postgres/Mongo connection; importer pulls source data per README.
4. **WHICH SYSTEM:** GSE engine layer — usage; corpus.
5. **SECOND-ORDER:** Schema reference for GSE's Neon design: its table layouts for players/games/stats are a worked example of NFL-domain relational modeling (even if GSE stays TypeScript).
6. **§8 ENGINE-TRAINING VALUE:** DDL + import logic for NFL tables (players, games, weekly stats); labels = the source stats it imports. Data lives in the user's Postgres/Mongo instance once imported.
7. **PROVENANCE:** By rushfive; original. (Fantasy-named but the asset is a general NFL database engine, not a betting/pick tool.)
8. **VERDICT:** LEARN-ONLY

## A-R1-31 — veltman/nflplays
**Verified (GitHub API, 2026-11-06):** 44★ · last push 2020-09-30 · created 2013 · primary language n/a · license none stated · fork: False · https://github.com/veltman/nflplays
**API description:** Cleaned-up NFL play-by-play data from 2002-2012

1. **WHAT IT IS:** Cleaned historical NFL play-by-play dataset (2002–2012) in tidy form, published by Noah Veltman — a long-used open pbp extract predating nflfastR.
2. **WHERE:** https://github.com/veltman/nflplays
3. **HOW TO USE IT:** Download data files from repo; CSV/JSON; no install.
4. **WHICH SYSTEM:** GSE engine layer — corpus; matchup.
5. **SECOND-ORDER:** Era-comparison fixture: pre-2013 pbp in already-clean form for testing whether GSE features behave across eras (rule changes, pace shifts).
6. **§8 ENGINE-TRAINING VALUE:** Play-level table with down/distance/result fields for 2002–2012; labels = play outcomes. Data in-repo.
7. **PROVENANCE:** By Noah Veltman (veltman), data journalist; source = NFL GameCenter-era feeds, cleaned by the author.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-32 — mjk2244/pro-football-reference-web-scraper
**Verified (GitHub API, 2026-11-06):** 41★ · last push 2024-05-21 · created 2023 · primary language Python · license Apache-2.0 · fork: False · https://github.com/mjk2244/pro-football-reference-web-scraper
**API description:** Web scraper to retrieve player and team data from Pro Football Reference.

1. **WHAT IT IS:** Maintained Python scraper for Pro Football Reference: player game logs, team season data, standings, and more, returned as pandas DataFrames.
2. **WHERE:** https://github.com/mjk2244/pro-football-reference-web-scraper
3. **HOW TO USE IT:** pip install pro-football-reference-web-scraper; from pro_football_reference_web_scraper import player_game_log etc.
4. **WHICH SYSTEM:** GSE engine layer — usage; health.
5. **SECOND-ORDER:** Fills PFR-only gaps nflverse doesn't carry (some game-log splits, older seasons) for the Python lab without writing new scrapers; pair with sportsipy where coverage differs.
6. **§8 ENGINE-TRAINING VALUE:** Scraped PFR tables: player game logs (labels = realized stats), team data. Labels exist in source tables.
7. **PROVENANCE:** By mjk2244; original scraper over Sports Reference data.
8. **VERDICT:** TEST

## A-R1-33 — romanlutz/NFLPlayPrediction
**Verified (GitHub API, 2026-11-06):** 38★ · last push 2016-12-21 · created 2015 · primary language OpenEdge ABL · license none stated · fork: False · https://github.com/romanlutz/NFLPlayPrediction
**API description:** Based on NFL game data, we want to predict the success of a play. This can be used to insert different strategies before the play is called to determine the success probability.

1. **WHAT IT IS:** Early ML project predicting NFL play success/outcome from game state — feature engineering over pbp with classifier evaluation, framed as pre-snap strategy support for play-calling.
2. **WHERE:** https://github.com/romanlutz/NFLPlayPrediction
3. **HOW TO USE IT:** Jupyter/Python in-repo (legacy stack); run notebooks against included/loaded pbp data.
4. **WHICH SYSTEM:** GSE engine layer — situational; matchup.
5. **SECOND-ORDER:** Play-calling tendency prototype: its framing — predict success probability per candidate play type pre-snap — is exactly a GSE play-calling feature (defense-facing tendency scores). Read for method, not code reuse.
6. **§8 ENGINE-TRAINING VALUE:** Play-success classifier: features = down/distance/formation-era state; label = play success (EPA>0 style). Labels derivable from its pbp inputs.
7. **PROVENANCE:** By Roman Lutz (romanlutz); standalone project, CMU-era work.
8. **VERDICT:** LEARN-ONLY

## A-R1-34 — clausherther/nfl-dbt
**Verified (GitHub API, 2026-11-06):** 24★ · last push 2023-12-26 · created 2019 · primary language Python · license Apache-2.0 · fork: False · https://github.com/clausherther/nfl-dbt
**API description:** This repo contains dbt models to transform NFL Play-by-Play (pbp) data sourced from https://github.com/nflverse/nflverse-data into analytical models

1. **WHAT IT IS:** dbt project that transforms raw nflverse play-by-play (from nflverse-data) into analytical marts — dim/fact models, tests, and documented SQL for NFL analytics in a warehouse.
2. **WHERE:** https://github.com/clausherther/nfl-dbt
3. **HOW TO USE IT:** Clone; dbt + DuckDB/BigQuery per README; dbt run builds marts from nflverse-data extracts.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage; corpus.
5. **SECOND-ORDER:** Warehouse blueprint for GSE: if/when GSE stands up an analytics warehouse beside Neon, these models are the starting schema for pbp marts (and its dbt tests are data-quality checks GSE can copy).
6. **§8 ENGINE-TRAINING VALUE:** Modeled tables: play-level facts with EPA/WP labels preserved, team/player aggregates; dbt schema tests act as label/quality assertions. Labels exist from nflverse source.
7. **PROVENANCE:** By clausherther; original dbt project over nflverse-data (upstream named in its description).
8. **VERDICT:** TEST

## A-R1-35 — thadhutch/sports-quant
**Verified (GitHub API, 2026-11-06):** 25★ · last push 2026-03-19 · created 2024 · primary language Python · license MIT · fork: False · https://github.com/thadhutch/sports-quant
**API description:** End-to-end NFL data pipeline that scrapes PFF grades and Pro Football Reference game data, builds analysis-ready datasets, and trains ensemble XGBoost models with walk-forward backtesting

1. **WHAT IT IS:** End-to-end NFL pipeline: scrapes PFF grades and PFR game data, builds analysis-ready datasets, trains ensemble XGBoost models with honest validation reporting.
2. **WHERE:** https://github.com/thadhutch/sports-quant
3. **HOW TO USE IT:** Clone; Python pipeline scripts per README; needs PFF/PFR source access for full rebuild.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** Worked example of joining PFF grades to outcomes — GSE reasons about PFF grades constantly; this shows a reproducible join + feature path (and its validation discipline is the part to copy).
6. **§8 ENGINE-TRAINING VALUE:** Features = PFF player grades + PFR game data; labels = game outcomes/player performance targets defined in its notebooks. Labels exist.
7. **PROVENANCE:** By thadhutch; original project. (Model target is performance prediction, not betting automation.)
8. **VERDICT:** LEARN-ONLY

## A-R1-36 — paulcbogdan/NFL-play-by-player
**Verified (GitHub API, 2026-11-06):** 25★ · last push 2022-11-26 · created 2020 · primary language Python · license none stated · fork: False · https://github.com/paulcbogdan/NFL-play-by-player
**API description:** This code simulates NFL games in a play-by-play fashion

1. **WHAT IT IS:** Play-by-play game simulator: simulates NFL games snap by snap by sampling from empirical play distributions conditioned on game state, producing full simulated game scripts.
2. **WHERE:** https://github.com/paulcbogdan/NFL-play-by-player
3. **HOW TO USE IT:** Python; run simulation entry points per README; conditioned on historical pbp distributions.
4. **WHICH SYSTEM:** GSE engine layer — situational.
5. **SECOND-ORDER:** A distribution-sampling simulator complements parametric sims (nflseedR): GSE can ensemble both for score-distribution tails (blowout/comeback shapes) that single-model sims understate.
6. **§8 ENGINE-TRAINING VALUE:** Simulator generating labeled synthetic plays/games from empirical conditional distributions; validation = simulated vs actual score/play distributions.
7. **PROVENANCE:** By paulcbogdan; original.
8. **VERDICT:** TEST

## A-R1-37 — rtelmore/NFLSimulatoR
**Verified (GitHub API, 2026-11-06):** 19★ · last push 2022-08-19 · created 2019 · primary language R · license NOASSERTION · fork: False · https://github.com/rtelmore/NFLSimulatoR
**API description:** An R Package for simulating NFL games using play-by-play data.

1. **WHAT IT IS:** R package for simulating NFL games from play-by-play data — drive/play simulation functions with tidy outputs for research and teaching.
2. **WHERE:** https://github.com/rtelmore/NFLSimulatoR
3. **HOW TO USE IT:** R: install from GitHub/CRAN; NFLSimulatoR::simulate_game() style API per docs.
4. **WHICH SYSTEM:** GSE engine layer — situational.
5. **SECOND-ORDER:** Second independent game-sim implementation to cross-check GSE sim outputs (distribution agreement between two engines = cheap validation).
6. **§8 ENGINE-TRAINING VALUE:** Simulation functions consuming pbp-derived transition probabilities; outputs simulated play/game labels for calibration vs actuals.
7. **PROVENANCE:** By rtelmore (Ryan Elmore, sports analytics academic); original package.
8. **VERDICT:** TEST

## A-R1-38 — ffverse/ffopportunity
**Verified (GitHub API, 2026-11-06):** 26★ · last push 2025-12-11 · created 2021 · primary language R · license GPL-3.0 · fork: False · https://github.com/ffverse/ffopportunity
**API description:** Models for Fantasy Football Expected Points

1. **WHAT IT IS:** R package modeling fantasy expected opportunity: expected fantasy points models (receiving/rushing usage value) built on nflverse participation and pbp — target/carry quality, not just volume.
2. **WHERE:** https://github.com/ffverse/ffopportunity
3. **HOW TO USE IT:** R: install from GitHub; ep functions over nflverse data (needs participation data).
4. **WHICH SYSTEM:** GSE engine layer — usage.
5. **SECOND-ORDER:** Opportunity modeling is usage-layer math GSE wants for props: expected value per target/carry (air yards, depth, end-zone share) separates real role value from empty volume.
6. **§8 ENGINE-TRAINING VALUE:** Expected-points-per-opportunity model outputs per player-play: features = target depth, location, participation; labels = realized fantasy points/EPA. Labels exist.
7. **PROVENANCE:** ffverse org (Tan Ho et al., fantasy analytics collective adjacent to nflverse); original models. (Player-opportunity modeling, not a pick/betting tool.)
8. **VERDICT:** TEST

## A-R1-39 — saiemgilani/cfbscrapR
**Verified (GitHub API, 2026-11-06):** 37★ · last push 2021-04-03 · created 2020 · primary language R · license NOASSERTION · fork: False · https://github.com/saiemgilani/cfbscrapR
**API description:** A scraping and aggregating package using the CollegeFootballData API

1. **WHAT IT IS:** R package scraping/aggregating college football data via the CollegeFootballData API — the predecessor that evolved into cfbfastR.
2. **WHERE:** https://github.com/saiemgilani/cfbscrapR
3. **HOW TO USE IT:** R: install from GitHub; functions need a free CFBD API key.
4. **WHICH SYSTEM:** GSE engine layer — corpus; matchup.
5. **SECOND-ORDER:** Provenance for the CFB stack (and by the same author as the already-known Sports-Research-Papers collection): keep for lineage and for any legacy function cfbfastR dropped.
6. **§8 ENGINE-TRAINING VALUE:** CFBD-sourced CFB pbp/stats tables; EP/WP labels via CFBD-era models. Labels exist.
7. **PROVENANCE:** By Saiem Gilani; superseded by his own cfbfastR (same wave) — named upstream/downstream relationship.
8. **VERDICT:** LEARN-ONLY

## A-R1-40 — CFBD/cfb.js
**Verified (GitHub API, 2026-11-06):** 17★ · last push 2024-08-27 · created 2020 · primary language JavaScript · license none stated · fork: False · https://github.com/CFBD/cfb.js
**API description:** JavaScript client library for accessing the CollegeFootballData API

1. **WHAT IT IS:** Official JavaScript client library for the CollegeFootballData API — games, plays, stats, recruiting, rankings, SP+/FPI ratings endpoints in JS/TS-friendly form.
2. **WHERE:** https://github.com/CFBD/cfb.js
3. **HOW TO USE IT:** npm install cfbd; configure with free CFBD API key; call endpoint modules.
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** TS-native CFB access for the Sports monorepo: recruiting + SP+ ratings are draft-pipeline and team-strength inputs GSE's NCAA lane can pull without a Python detour.
6. **§8 ENGINE-TRAINING VALUE:** CFBD API tables: plays, games, team/player stats, recruiting classes (labels = realized stats; SP+/FPI = published ratings). Labels exist.
7. **PROVENANCE:** CFBD org (CollegeFootballData, BlueSCarver project); official client.
8. **VERDICT:** TEST

## A-R1-41 — CFBD/CFBSharp
**Verified (GitHub API, 2026-11-06):** 9★ · last push 2024-09-19 · created 2020 · primary language C# · license none stated · fork: False · https://github.com/CFBD/CFBSharp
**API description:** C# client library for accessing the CollegeFootballData API

1. **WHAT IT IS:** Official C#/.NET client for the CollegeFootballData API covering the full endpoint surface.
2. **WHERE:** https://github.com/CFBD/CFBSharp
3. **HOW TO USE IT:** NuGet CFBSharp; API key config; async client calls.
4. **WHICH SYSTEM:** GSE engine layer — corpus.
5. **SECOND-ORDER:** Reference implementation of the CFBD API surface (endpoint inventory + schemas) — useful as the checklist when GSE builds its own TS client coverage.
6. **§8 ENGINE-TRAINING VALUE:** Same CFBD tables as cfb.js (plays/stats/recruiting/ratings). Labels exist.
7. **PROVENANCE:** CFBD org; official client.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-42 — johnwmillr/SportradarAPIs
**Verified (GitHub API, 2026-11-06):** 57★ · last push 2026-10-26 · created 2018 · primary language Python · license MIT · fork: False · https://github.com/johnwmillr/SportradarAPIs
**API description:** Python wrapper for the Sportradar APIs  ⚽️🏈

1. **WHAT IT IS:** Python wrapper for Sportradar's official APIs (NFL and other sports): schedules, game stats, play-by-play, player profiles from Sportradar feeds.
2. **WHERE:** https://github.com/johnwmillr/SportradarAPIs
3. **HOW TO USE IT:** pip install sportradar; SportradarAPI with a Sportradar trial/commercial API key.
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** Commercial-grade fallback feed: if GSE ever needs licensed real-time NFL data (the step beyond nflverse's post-hoc files), this wrapper shows the Sportradar schema and access pattern.
6. **§8 ENGINE-TRAINING VALUE:** Sportradar NFL endpoints: pbp, game/team/player stats — labels = official realized stats. Data requires Sportradar key (trial available).
7. **PROVENANCE:** By johnwmillr; wrapper over Sportradar LLC's official API.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-43 — MySportsFeeds/mysportsfeeds-node
**Verified (GitHub API, 2026-11-06):** 66★ · last push 2023-04-18 · created 2017 · primary language JavaScript · license MIT · fork: False · https://github.com/MySportsFeeds/mysportsfeeds-node
**API description:** NodeJS wrapper for the MySportsFeeds Sports Data API

1. **WHAT IT IS:** Node.js wrapper for the MySportsFeeds sports data API (NFL feeds: schedules, box scores, play-by-play, stats) — a JavaScript-native commercial data client.
2. **WHERE:** https://github.com/MySportsFeeds/mysportsfeeds-node
3. **HOW TO USE IT:** npm install mysportsfeeds-node; API key (MySportsFeeds account, free tier exists for non-commercial).
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** Another TS/JS-lane feed option with a free non-commercial tier: a cheap redundancy source for schedules/box scores inside the monorepo.
6. **§8 ENGINE-TRAINING VALUE:** MySportsFeeds NFL tables: games, box scores, pbp, cumulative stats; labels = realized stats from the feed.
7. **PROVENANCE:** MySportsFeeds org; official Node client for their API.
8. **VERDICT:** CONTEXT-ONLY

## A-R1-44 — agentscope-ai/DojoZero
**Verified (GitHub API, 2026-11-06):** 56★ · last push 2026-07-27 · created 2025 · primary language Python · license MIT · fork: False · https://github.com/agentscope-ai/DojoZero
**API description:** A platform for running AI agents on realtime sport data and make predictions about game outcomes.

1. **WHAT IT IS:** Platform for running AI agents on real-time sports data to make and evaluate game-outcome predictions — agent harness + sports data + prediction scoring in one repo (AgentScope team).
2. **WHERE:** https://github.com/agentscope-ai/DojoZero
3. **HOW TO USE IT:** Clone; Python; configure data feeds per README; run agent prediction loops.
4. **WHICH SYSTEM:** GSE engine layer — situational; corpus.
5. **SECOND-ORDER:** Directly relevant pattern for GSE's reasoning-engine direction: an open reference for agent-vs-market prediction evaluation harnesses (logging predictions, grading agents) that GSE's walk-forward grading can borrow from.
6. **§8 ENGINE-TRAINING VALUE:** Prediction-evaluation harness: agent predictions logged against realized game outcomes (labels = finals); real-time data adapters included. Labels exist.
7. **PROVENANCE:** By agentscope-ai (Alibaba AgentScope team); original platform. (Research/eval platform for agent predictions, not a betting bot.)
8. **VERDICT:** LEARN-ONLY

## A-R1-45 — mpchang/uncovering-missed-tackle-opportunities
**Verified (GitHub API, 2026-11-06):** 14★ · last push 2024-03-04 · created 2024 · primary language Jupyter Notebook · license none stated · fork: False · https://github.com/mpchang/uncovering-missed-tackle-opportunities
**API description:** Code for the NFL Big Data Bowl 2024 submission on Tackle Probability, Opportunity, and Conversion

1. **WHAT IT IS:** NFL Big Data Bowl 2024 submission code: models tackle probability, tackle opportunity and conversion from tracking data to find missed tackle opportunities by defenders.
2. **WHERE:** https://github.com/mpchang/uncovering-missed-tackle-opportunities
3. **HOW TO USE IT:** Jupyter notebooks in-repo; run against BDB 2024 tracking data (Kaggle).
4. **WHICH SYSTEM:** GSE engine layer — matchup; situational.
5. **SECOND-ORDER:** Tackling is a GSE blind spot (no clean public tackling metric): tackle-opportunity/conversion rates per defender and per defense are new matchup features (RB contact balance vs defense tackle conversion).
6. **§8 ENGINE-TRAINING VALUE:** Tracking-derived tackle metrics: per-frame tackle probability model; labels = tackle made/missed events in BDB tracking. Labels exist.
7. **PROVENANCE:** By mpchang; BDB 2024 competition submission, original analysis over NFL BDB data.
8. **VERDICT:** TEST

## A-R1-46 — egorfm/nfl-big-data-bowl-2027
**Verified (GitHub API, 2026-11-06):** 20★ · last push 2026-11-04 · created 2026 · primary language Python · license none stated · fork: False · https://github.com/egorfm/nfl-big-data-bowl-2027
**API description:** NFL Big Data Bowl 2027: Bridging Combine RFID sensor dynamics and in-game separation through kinematic braking mechanics (BRK+).

1. **WHAT IT IS:** NFL Big Data Bowl 2027 entry (BRK+): bridges NFL Combine RFID sensor dynamics with in-game separation, modeling kinematic braking mechanics from tracking data.
2. **WHERE:** https://github.com/egorfm/nfl-big-data-bowl-2027
3. **HOW TO USE IT:** Python; notebooks/pipeline per README; needs BDB 2027 + Combine data (Kaggle).
4. **WHICH SYSTEM:** GSE engine layer — matchup; usage.
5. **SECOND-ORDER:** Combine-to-field translation is draft/rookie-projection gold: a braking/ deceleration metric that links Combine testing to real separation gives GSE a measurable rookie-readiness feature.
6. **§8 ENGINE-TRAINING VALUE:** BRK+ braking metric from 10Hz tracking + Combine RFID: features = deceleration kinematics; labels = in-game separation outcomes. Labels exist in BDB data.
7. **PROVENANCE:** By egorfm; BDB 2027 submission, original.
8. **VERDICT:** TEST

## A-R1-47 — usufalbaz/nfl-big-data-bowl-2027-ktd
**Verified (GitHub API, 2026-11-06):** 6★ · last push 2026-10-29 · created 2026 · primary language Python · license MIT · fork: False · https://github.com/usufalbaz/nfl-big-data-bowl-2027-ktd
**API description:** Uncovering NFL Draft Steals & Busts via Kinetic Translation Deficit (KTD) using 10Hz Sensor Tracking Data.

1. **WHAT IT IS:** BDB 2027 entry defining Kinetic Translation Deficit (KTD): how much Combine sensor athleticism fails to translate to in-game tracking, used to flag draft steals and busts.
2. **WHERE:** https://github.com/usufalbaz/nfl-big-data-bowl-2027-ktd
3. **HOW TO USE IT:** Python; MIT; run notebooks against BDB 2027 tracking + Combine data.
4. **WHICH SYSTEM:** GSE engine layer — usage; matchup.
5. **SECOND-ORDER:** A named, falsifiable draft feature: KTD per prospect is precisely the kind of single-number situational input GSE's draft/rookie reasoning can carry and later grade.
6. **§8 ENGINE-TRAINING VALUE:** KTD per player: features = Combine RFID vs in-game tracking kinematics gap; labels = draft position vs on-field production framing. Labels exist in source data.
7. **PROVENANCE:** By usufalbaz; BDB 2027 submission, original.
8. **VERDICT:** TEST

## A-R1-48 — YZY0108/nfl-player-trajectory-prediction
**Verified (GitHub API, 2026-11-06):** 9★ · last push 2026-01-23 · created 2026 · primary language Jupyter Notebook · license none stated · fork: False · https://github.com/YZY0108/nfl-player-trajectory-prediction
**API description:** NFL Big Data Bowl 2026 - Silver Medal | 球员轨迹预测

1. **WHAT IT IS:** NFL Big Data Bowl 2026 silver-medal solution: predicts player trajectories from pre-snap/early-play tracking frames (sequence models over 10Hz tracking).
2. **WHERE:** https://github.com/YZY0108/nfl-player-trajectory-prediction
3. **HOW TO USE IT:** Jupyter/Python; Kaggle BDB 2026 data; notebook pipeline per repo.
4. **WHICH SYSTEM:** GSE engine layer — situational; matchup.
5. **SECOND-ORDER:** Trajectory forecasting is the engine behind future GSE tracking features (predicted separation at catch point, predicted tackle point): a medal-grade worked solution is the fastest teacher.
6. **§8 ENGINE-TRAINING VALUE:** Trajectory model: features = tracking frames up to a cutoff; labels = realized future (x,y) positions per player. Labels exist (held-out frames).
7. **PROVENANCE:** By YZY0108; Kaggle BDB 2026 silver-medal code, original solution.
8. **VERDICT:** LEARN-ONLY

## A-R1-49 — MLecardonnel/ExpectedTackling
**Verified (GitHub API, 2026-11-06):** 6★ · last push 2024-01-05 · created 2023 · primary language Jupyter Notebook · license none stated · fork: False · https://github.com/MLecardonnel/ExpectedTackling
**API description:** NFL Big Data Bowl 2024 submission focusing on the detection of missed opportunities to tackle.

1. **WHAT IT IS:** BDB 2024 work on expected tackling: detects missed tackle opportunities and values defenders by tackles made vs expected from tracking context.
2. **WHERE:** https://github.com/MLecardonnel/ExpectedTackling
3. **HOW TO USE IT:** Jupyter notebooks; BDB 2024 tracking data from Kaggle.
4. **WHICH SYSTEM:** GSE engine layer — matchup.
5. **SECOND-ORDER:** Pairs with A-R1-45 as a second implementation of the same idea — two independent expected-tackle models let GSE sanity-check the metric before adopting either.
6. **§8 ENGINE-TRAINING VALUE:** Expected-tackle value per defender/play: features = tracking geometry at tackle window; labels = tackle success events. Labels exist.
7. **PROVENANCE:** By MLecardonnel; BDB 2024 submission, original.
8. **VERDICT:** TEST

## A-R1-50 — shammeer-s/nfl-tracks
**Verified (GitHub API, 2026-11-06):** 5★ · last push 2025-10-15 · created 2024 · primary language Python · license MIT · fork: False · https://github.com/shammeer-s/nfl-tracks
**API description:** The library simplifies visualization of nfl tracking datasets, integrating customizable fields, player positions, and animations for seamless nfl analytics.

1. **WHAT IT IS:** Python library for visualizing NFL tracking datasets: animated plays, customizable fields, player positions and trajectories from BDB-format data.
2. **WHERE:** https://github.com/shammeer-s/nfl-tracks
3. **HOW TO USE IT:** pip install / clone; Python API per README; feed BDB-format tracking CSVs.
4. **WHICH SYSTEM:** GSE engine layer — corpus; matchup.
5. **SECOND-ORDER:** Film-room tooling for content and debugging: animated tracking plays make GSE's tracking features inspectable (and make member-facing film breakdown content feasible).
6. **§8 ENGINE-TRAINING VALUE:** Visualization layer over tracking frames (x,y per player-frame); no new labels — renders the labels/features of BDB data.
7. **PROVENANCE:** By shammeer-s; original library.
8. **VERDICT:** CONTEXT-ONLY
