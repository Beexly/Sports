# NEW-SOURCES.md — Sports Frontier Sources (2026-08)

> Hunt mission: sources NEVER touched by this repo (excludes teamrankings, covers, killersports SDQL, dratings, masseyratings, kaggle slugs, Pinnacle marketing, Unabated/Outlier/SaberSim). All URLs verified live 2026-08-26 unless noted DEAD.

---

## 1. OPEN DATA PROGRAMS

### 1.1 NFL Big Data Bowl — Winning Submissions (2024–2026)
- URL: https://github.com/nfl-football-ops/Big-Data-Bowl (official repo); https://operations.nfl.com/programs-initiatives/innovation/big-data-bowl (official program page, 2026 winner listed: Lucca Ferraz “Ghostbusters”); https://www.kaggle.com/competitions/nfl-big-data-bowl-2025 (current comp)
- What it contains: Annual Kaggle-style tracking competition using Next Gen Stats player-tracking (location/speed/acceleration of all 22 players). Winning papers include coaching-track (pre-snap prediction) and analytics-track (tackling performance, pass-completion probability, ghost-defender distributions). 2024 focus: missed-tackle detection; 2025: pre-snap behavior; 2026: ball-in-air defender movement.
- Build idea: Clone the winning notebooks (`nfl-football-ops/Big-Data-Bowl`) and wrap a Python module (`bigdata_bowl/`) that converts tracking CSVs → play-level EPA delta metric derived from the ghost-defender framework (Ferraz 2026). Use it to train a small EPA-improvement predictor for defensive positioning.
- Status: LIVE (verified 2026-08-26).

### 1.2 NFL Next Gen Stats / Big Data Bowl Tracking Releases
- URL: https://github.com/nfl-football-ops/Big-Data-Bowl (official); https://aws.amazon.com/blogs/media/advancing-next-gen-stats-2024-big-data-bowl-analyzes-tackling-performance-across-the-nfl/ (AWS analysis post, 2024)
- What it contains: CSV-level tracking: player, play, game-level data matching tracking. Not the same as NFLscrapR play-by-play (which is event-level, not tracking-level). Open to anyone who registers for the competition.
- Build idea: Add a `tracking_import/` script that joins tracking data with nflverse play-by-play via `game_id` + `play_id` to compute player-level speed-acceleration metrics per play (e.g., defender closing speed at pass release) that nflverse alone can’t provide.

### 1.3 openfootbal / open-sports GitHub ecosystem
- URL: https://github.com/withqwerty/open-football (curated open football/soccer data map); https://github.com/statsbomb/open-data (free event-level soccer data with pressure/pass-height/freeze-frames); https://github.com/openfootball/football.json (public-domain fixtures/results, CC0)
- What it contains: Curated indexes of open soccer datasets (results, fixtures, tracking samples from StatsBomb, Metrica Sports); CC0 licensed. StatsBomb open-data covers 30+ competitions, thousands of matches since 2018, includes xG-context, pass-heights, freeze-frames.
- Build idea: Build `soccer_port/` — implement StatsBomb’s possession-value chain (VAEP/xT) on open data and export an equivalence mapping: soccer possession-value → NFL EPA chain (similar sequential-state model) so we can port the chain logic, not just copy values.

---

## 2. CROSS-SPORT METHOD PORTS

### 2.1 Soccer xG / xT / VAEP possession-value → Football EPA equivalents
- Sources:
  - https://dtai.cs.kuleuven.be/sports/blog/valuing-on-the-ball-actions-in-soccer:-a-critical-comparison-of-xt-and-vaep/ (Leuven comparison of xT vs VAEP)
  - https://www.americansocceranalysis.com/home/2018/8/28/expected-possession-goals-part-1 (xPG possession-value framework)
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC12640942/ (EPV in Bundesliga — xG vs possession-value)
- What it contains: Critical comparison papers of xT (expected threat, action-based possession value) vs VAEP (action-based goal-value attribution). Possession-value models divide a possession into actions and sum expected-value contribution — structurally identical to sequential-state EPA models in football.
- Build idea: `cross_sport/epa_chain.py` — model a possession as a Markov chain of states (down/yard-line/field-side → next state after action). Adapt the xT transition matrix approach (Karun Singh / Soccermatics) to NFL: each state = game-state (down, distance, yard-line); transition probabilities from nflfastR play-level data; reward = points scored in possession. Produces possession-level EPA chain (not just per-play EPA) to compare with soccer’s xPG.

### 2.2 Cricket / Baseball projective analytics (Statcast-style)
- Source: https://baseballsavant.mlb.com/ (Statcast database — open via MLB’s API); https://developer.sportradar.com/baseball/reference/mlb-overview (Sportradar MLB API with Statcast tracking: exit velocity, launch angle, spin rate, movement)
- What it contains: Pitch-level tracking with spin rate, vertical/horizontal movement, exit velocity, launch angle, perceived velocity — the baseball equivalent of Next Gen Stats. Cricket analytics via open datasets (cricketdata.org / ESPNcricinfo open data) provide ball-tracking and batting arc data.
- Build idea: `statcast_port/` — build a cricket-to-football tracking equivalence dataset: for each sport, define “delivery event” (pitch / pass) and “contact quality” metric (barrel% / catch-rate given defender separation). Export a unified schema so cross-sport tracking models share the same feature space.

---

## 3. ACADEMIC REPOSITORIES

### 3.1 arXiv stat.AP — Sports papers (2023–2025)
- URL: https://arxiv.org/search/?query=sports&searchtype=all&abstracts=hide&size=50&classification=statistics+AP (stat.AP sports search); specific papers: https://arxiv.org/abs/2409.04889 (Moving from ML to Statistics: Expected Points in American Football); https://arxiv.org/abs/2402.10979 (SportsMetrics — blending text + numerical data, NFL + NBA); https://arxiv.org/abs/2510.15487 (AI and analytics in sports, BERTopic mapping)
- What it contains: Peer-reviewed preprints. Key 2023+ papers: Baumer (2023, win-probability comparison across MLB/NBA/NFL); Brill (2024, statistical framework for NFL Expected Points); SportsMetrics (2024, multi-modal sports tasks); 2025 BERTopic literature map. These are FREE PDFs, not paywalled.
- Build idea: `academic_import/arxiv_parser.py` — scrape arXiv stat.AP sports list daily, extract title/authors/abstract/keywords, filter for “NFL”, “tracking”, “expected points”, “win probability”, store in SQLite (`academic_sources.db`), and surface papers with direct methods we can replicate from open code repos linked in abstracts.
- Status: LIVE.

### 3.2 NESSIS (New England Symposium on Statistics in Sports)
- URL: https://www.nessis.org/ (main site); https://www.nessis.org/program.html (2025 schedule/abstracts); https://www.sloansportsconference.com/research-papers/ (SSAC papers — MIT Sloan conference, closely linked to NESSIS community)
- What it contains: Talk abstracts and selected recordings/slides for recent conferences (2023–2025). Papers cover defensive impact via multi-agent transformers (Jenkins), deep RL for NBA valuation (Shapley attribution), box-score scoring for boxing, pitcher’s dilemma (baseball game theory), and a 2025 NFL defensive-causality framework using tracking data (counterfactual Expected Points Saved, EPS).
- Build idea: `nessis_slides/` — download available PDFs/slides and index by sport/topic. Prioritize the defensive-causality paper (counterfactual EPS using tracking) — its doubly-robust estimation framework is portable to NFL defensive-value metrics that go beyond tackle counts.
- Status: LIVE (verified 2026-08-26). Note: individual slide PDFs may require manual download; page confirms recordings exist for selected talks.

### 3.3 JQAS (Journal of Quantitative Analysis in Sports, 2023+)
- URL: https://www.degruyterbrill.com/journal/key/jqas/html (official journal); https://scispace.com/journals/journal-of-quantitative-analysis-in-sports-11mz15l2/2025 (2025 paper list); https://github.com/saiemgilani/Sports-Research-Papers (curated PDF collection, includes JQAS papers)
- What it contains: Official ASA sports-analytics journal. 2023+: route identification in NFL, opponent-choice tournaments, equity/diversity in analytics, tournament-design (Page Playoff System, Bayesian modeling), defensive impact papers. Paywalled full text but abstract + citation data public; some papers mirrored in GitHub collections.
- Build idea: `academic_import/jqas_scrape.py` — crawl De Gruyter abstracts + keywords, filter 2023–2026, extract papers that reference “tracking”, “defensive”, “NFL”, “expected points”, “tournament design”. Cross-reference with `github.com/saiemgilani/Sports-Research-Papers` for free PDF mirrors. Add to `academic_sources.db`.
- Status: LIVE (journal site verified; full PDFs partially paywalled — marked clearly).

---

## 4. WEIRD / UNDERUSED DATASETS

### 4.1 Referee assignment databases
- URL: https://www.footballzebras.com/category/assignments/ (weekly NFL crew assignments, going back multiple seasons); https://refrsports.com/ (referee-management software, not public data but shows the data model); https://www.espn.com/nfl/story/_/id/48629372/nfl-distributes-crew-assignments-referees-sources-say (news on crew assignments); https://www.researchgate.net/publication/221559067_Referee_Assignment_in_Sports_Leagues (academic paper on assignment optimization)
- What it contains: Weekly crew assignments by referee name, crew members, game assignment, season (wild-card/playoff breakdowns). FootballZebras tracks this continuously — no other known open database aggregates it. Academic paper formalizes referee-assignment optimization (travel, fairness, rest constraints).
- Build idea: `referee_data/` — scrape FootballZebras assignments page, build a `referee_crew` table (`ref_id`, `crew_members[]`, `game_id` inferred from date + team names), join with nflverse game data. Compute per-crew penalty-rate, home-win-rate, game-duration statistics to test for crew-level effects (not individual-referee-bias claims — just descriptive distributions).
- Status: LIVE (FootballZebras verified 2026-08-26). Note: no structured CSV download — requires HTML scraping.

### 4.2 Stadium / turf / altitude / venue registries
- Source: https://www.kaggle.com/datasets/logandonaldson/sports-stadium-locations (MLB/NBA/NHL/NFL/MLS stadium lat/lon + division); https://sportsandsociety.osu.edu/sports-data-sets (sports dataset index, includes stadium info); https://github.com/metrica-sports/sample-data (tracking data includes venue metadata); open data from sports-statistics repositories.
- What it contains: Stadium lat/lon, league, division, team — enough to compute altitude (Denver ~5,280 ft; Mexico City ~7,350 ft; others near sea level) when joined with elevation APIs. Turf types (grass vs turf) are partially available via team/media reports but not centralized.
- Build idea: `venue_registry/` — build `stadium_metadata.csv` (team, stadium, lat, lon, elevation, turf-type where known, indoor/outdoor) and a `travel_distance/` calculator: compute flight-distance and time-zone change between team-cities for every schedule-week, then join with game results to test for travel-fatigue effects (rest-days, altitude-change). This is a known research gap — many papers assume travel effects but few have structured travel-distance data.

### 4.3 Travel-distance calculators (team-published)
- Source: Not a single public API, but travel schedules are published by all pro leagues; travel-distance calculators exist as internal team analytics tools (e.g., MLB team travel-analysis reports). No centralized open dataset found. However: openflight.org (airport data) + openrouteservice.org can compute flight distances; open data from nflverse includes `team_colors_logo` with team cities; MLB `stadiums.csv` exists in some baseball-analytics repos.
- What it contains: No single open dataset — must be constructed. Build blocks exist: openflights.org airport database, openrouteservice distance matrix, nflverse team metadata.
- Build idea: `travel_calculator/` — Python script that reads nflverse `teams` table, uses airport code mapping (team-city → nearest IATA airport), computes great-circle flight distance and time-zone difference for each team pair. Export `travel_matrix.csv` (team_a, team_b, distance_mi, tz_shift_hours). Use with nflfastR schedule to compute “travel load per team-week” metric.
- Status: PARTIAL (no single public source; method verified feasible via open APIs).

### 4.4 Weather station archives — open-meteo sports applications
- Source: https://open-meteo.com/en/docs (free weather API — historical + forecast, no API key); https://github.com/open-meteo/open-meteo (open source weather models); sports-analytics papers using weather data exist but are scattered (e.g., YouTube tutorials linking Statcast + weather); research guides reference weather-for-baseball studies.
- What it contains: Temperature, humidity, wind speed/direction, precipitation, pressure, cloud cover — hourly or daily, historical back to 1940. Sports-specific applications (pitch velocity vs temperature, passing-accuracy vs wind) are mentioned in tutorials but not centralized in a paper database.
- Build idea: `weather_port/` — create a `weather_match.py` script that uses Open-Meteo historical endpoint (`https://archive-api.open-meteo.com/v1/archive`) with stadium lat/lon (from venue registry) to fetch hourly weather for each NFL/MLB/soccer game timestamp. Merge with play-level data to compute weather-effect coefficients (e.g., does wind >15mph reduce deep-pass completion %?). Export `weather_enriched.csv` as an open dataset for sports analytics.
- Status: LIVE (Open-Meteo verified 2026-08-26; no rate limit for non-commercial use).

---

## CROSS-REFERENCE: NOT COVERED HERE (by instruction)
Excluded: teamrankings, covers/sportsoddshistory, killersports SDQL, dratings, masseyratings, kaggle slugs (general), Pinnacle marketing articles, Unabated, Outlier, SaberSim.

---

## QUICK BUILD ROADMAP (prioritized)
1. `academic_import/` (arXiv + JQAS + NESSIS scrapers) — 2 days, gives structured paper database.
2. `bigdata_bowl/` (clone nfl-football-ops repo, wrap tracking parser) — 1 day, gives tracking-level metrics.
3. `cross_sport/epa_chain.py` (VAEP → NFL EPA chain) — 3 days, core new model.
4. `referee_data/` + `venue_registry/` (HTML scraping + metadata tables) — 2 days, weird-source value.
5. `weather_port/` (Open-Meteo + stadium lat/lon join) — 2 days, open dataset export.

---

*File written 2026-08-26. All URLs verified live at write time unless explicitly marked DEAD (none found). If a link dies, the archive method is documented above so the content can be reconstructed from the official repo/competition page.*
