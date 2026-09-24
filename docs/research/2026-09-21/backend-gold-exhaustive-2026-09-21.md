# Backend Gold — Exhaustive Methodology Trace (2026-09-21)

Public-web-only research. Every formula below is sourced from a primary public
source linked inline. Anything not found is marked GAP rather than invented.
Task rule observed: never bypass logins, paywalls, or access controls; no
social interaction (no likes, follows, replies, reposts, forms).

## 1. Author-by-author: how each of the nine computes what they post

### 1.1 @scottbarrettdfb (Scott Barrett, FantasyPoints / ex-PFF)

**xFP — historical PFF implementation** (public article, still live):
https://www.pff.com/news/fantasy-football-z-expected-fantasy-points-week-2-2019

- Sample: historical 10-season NFL play-by-play.
- Target valuation: each target valued by distance from the end zone AND
  depth of target.
- Carry valuation: each carry valued by distance from the end zone AND
  down-and-distance.
- Aggregation: sum each player's play-level expected values across his
  workload.
- Efficiency read: `actual fantasy points − xFP` = points over expectation.
- No public coefficient table found for this implementation.

**Depth-Adjusted Yards Per Target** (public article, still live):
https://www.pff.com/news/fantasy-football-introducing-depth-adjusted-yards-per-target-over-expectation

- Expected YPT built from every WR target since 2007, conditional on
  air-yard depth.
- Metric: `actual YPT − depth-conditioned expected YPT`.
- Published finding: correlation with following-season targets rose from
  0.28 (raw YPT) to 0.31 (depth-adjusted YPT over expectation).
- Exact smoothing/binning not published in the article. GAP on coefficients.

**Weighted Opportunity (RB predictor)** (public article, still live):
http://www.pff.com/news/fantasy-football-weighted-opportunity-a-better-fantasy-football-predictor-than-raw-touches

Published formula:
`1.28 × red-zone carries + 2.39 × red-zone targets + 0.47 × non-red-zone carries + 1.54 × non-red-zone targets`

- Reported correlations with PPR points: raw touches 0.89 → raw
  opportunities 0.90 → weighted opportunity 0.95 → red-zone-aware
  weighted opportunity 0.97.
- This is a Scott Barrett RB metric, NOT Marvin's WR WOPR. Do not conflate.

**Current FantasyPoints Data Suite XFP** (public page):
https://fantasypointsdata.com/

- Public description: expected fantasy points modeled over each play's
  context, recombined under the chosen scoring system.
- Product surface was previously behind a closed beta/account wall; no
  public model card or coefficients. GAP on current coefficient deltas vs.
  the 2019 PFF implementation.
- GAP: Pressure Rate Over Expectation formula — no public methodology page
  found. It is referenced by aggregators (e.g. StatRankings AI matchup
  reports, MagicSportsGuy material) but the defining formula is not public.

**GSE relevance:** xFP is the cleanest "workload vs. efficiency" split in
fantasy; Barrett's own weighting coefficients are directly reusable for
GSE expected-points displays (with attribution).

---

### 1.2 @ff_marvine (Marvin Elequin)

**WOPR (WR)** — published formula:
`WOPR = 1.5 × target share + 0.7 × team air-yards share`

- Recurring series: "Fantasy Football Expected Points & Opportunity."
- Public article index:
  https://www.thefantasyfootballers.com/2025-ultimate-dfs-pass/dfs-pass-expectation-report/
- Known metrics used: targets, receptions, yards, TDs, target share, air
  yards, aDOT, YPRR, WOPR.
- GAP: whether his expected-points numbers are his own build, nflfastR
  EPA-derived, or ffopportunity's model — no primary-source statement found.
- Individual public articles still need opening for exact per-article
  definitions.

**GSE relevance:** WOPR is a one-line composite worth benchmarking against
GSE opportunity metrics.

---

### 1.3 @sfdata9ers

- Weekly QB table columns observed: Total QBR (ESPN-style), EPA/play, CPOE,
  success rate, time to throw, aDOT, YAC%, passer rating.
- **No author-published methodology found.** "Total QBR" is not assumed to
  be his own composite — it matches ESPN's public Total QBR labeling.
- ESPN's public QBR description (proprietary formula): all QB plays
  (pass, run, sack, penalty, turnover) valued by situation-weighted
  EPA-like contribution, clutch weighting, partial credit split by air
  yards/YAC/pressure via charting, scaled 0–100 with logistic regression.
- GAP: his data source(s), QBR derivation, update cadence. Needs the
  live-browser X pass (post footers, replies, Ko-fi posts).

---

### 1.4 @joea_nfl (Joe A., "Money Where the Film Is")

**CLOSED GAP — grading legend from his own FREE Patreon posts:**
https://www.patreon.com/JoeA_NFL/posts/qb-charts-week-9-74478594
https://www.patreon.com/JoeA_NFL/posts/qb-charts-weeks-72980421

Verbatim legend (his words, free posts from the 2022 season):
- Frame of reference: pick the most average NFL QB (he uses Colt McCoy;
  Andy Dalton or Kirk Cousins are acceptable substitutes).
- **Pedestrian** = what you expect from the average QB.
- **Solid** = nice, somewhat encouraging.
- **Great** = legitimately surprising; a play you did not expect the
  average QB to make.
- **Elite** = a play you do not believe the average QB could ever make;
  typically any 50+ air-yard throw (line of scrimmage to catch point).
- "Clearly, this is all subjective, and the capabilities of the analyst
  matter. Such is the nature of scouting."

**Process (public):**
- Every chart ships as a spreadsheet: every game graded, season-long
  composites per QB, QB summaries, weekly grades, plus a blank template
  so others can chart themselves.
  (https://www.patreon.com/JoeA_NFL/posts/end-of-season-qb-79620437)
- 2023 mid-summer update: 10,000 snaps graded from the 2023 season.
  (https://www.patreon.com/JoeA_NFL/posts/2023-qb-charts-106199663)
- He prefers letter-grade tiers over stack ranking ("no need to splice
  the hair between top 5 QBs").

**Remaining GAPs:** the newer column set (Accuracy+, PGP, Cheap Play %,
positive/negative play %) is not defined in these posts — needs the
live-browser X-history pass and public YouTube descriptions. Treat as
undisclosed until a primary source defines them.

**GSE relevance:** a fully worked manual-charting protocol with a public
anchor (average-QB reference + 50-air-yard elite rule) — the best public
template for a GSE "process over stats" QB product.

---

### 1.5 @pff (Pro Football Focus)

- Public methodology page: https://www.pff.com/grades (grading every
  player on every play since 2006; 200+ data points per play; each play
  reviewed, all-22 angles; senior-analyst review loop).
- PFF Premium Stats metric definitions (public):
  https://www.pff.com/news/pro-pff-premium-stats-highlighting-all-of-pffs-advanced-metrics-and-grades
  - **Defensive stops:** a PFF-exclusive "win for the defense" formula.
  - **Elusive rating:** yards after contact + missed tackles forced.
  - **Tackling efficiency:** missed tackles per tackle attempt.
- PFF grades/data are commercial (PFF ELITE); footers on aggregator
  charts cite them but the raw values are not open.

---

### 1.6 @hawkblogger (Brian Nemhauser / SumerSports)

- Public methodology is marketing-level only: human + AI evaluation,
  frame-level information, per-snap player-role identification, receiver
  space creation and catch context, player contribution grading.
- Sumer Premium is commercial; no public formula for their published
  charts. GAP — needs Sumer whitepapers/podcasts/conference material, then
  the live-browser pass.

---

### 1.7 @ihartitz (Ian Hartitz, RotoWire)

**Public metric definitions from his own RotoWire "Stat Table Key":**
- https://www.rotowire.com/football/article/nfl-box-score-breakdown-week-2-recap-usage-stats-135781
- https://www.rotowire.com/football/article/nfl-box-score-breakdown-week-1-recap-usage-stats-134247
- AY = air yards; Sn% = snap share; Rt% = route share;
  Tg% = team target share; AY% = team air-yard share;
  TPRR = targets per route run; aDOT = average depth of target;
  PROE = pass rate over expectation.
- His core analytical set: target share, air yards/air-yard share,
  routes, TPRR, aDOT — i.e. opportunity metrics, not efficiency.
- **Stabilization context** (Intentional Rounding, archived):
  https://web.archive.org/web/20141013045104/http://intentionalrounding.com/when-do-yards-per-route-run-targets-per-route-run-and-yards-per-target-stabilize/
  - TPRR stabilizes ≈ 7 games (≈ 185 routes) — the fastest of the three.
  - YPT stabilizes ≈ 39 games (≈ 205 targets) — the slowest.
- GAP: TruMedia methodology behind his RotoWire numbers (TruMedia has its
  own EPA model — cited via The Athletic — but publishes no model card);
  OddsJam methodology; full Hartitz post trail for original calculations.

**GSE relevance:** TPRR's stabilization speed makes it the earliest
reliable in-season WR signal — worth a GSE "signal arrives week X"
framing.

---

### 1.8 @acccountstat

- Chart stated the values are averaged across NFL Pro, PFF, and SumerSports.
- **No public statement found on:** simple vs. weighted mean, denominator
  alignment, handling of missing/source disagreement, or whether
  "avoided tackles" definitions were normalized across sources.
- GAP — needs the live-browser X pass (replies explaining the averaging).

---

### 1.9 @gridironinfo_

- No public methodology, website, repository, or about page found in this
  sweep. GAP — needs the live-browser profile pass.

---

## 2. Open backend infrastructure (the actual "leaked backend gold")

### 2.1 nflfastR + the model cards

Repo: https://github.com/nflverse/nflfastR
Model methodology: https://opensourcefootball.com/posts/2020-09-28-nflfastr-ep-wp-and-cp-models/
Field descriptions: exposed through the package and
https://www.nflfastr.com/ reference pages.

- Play-by-play back to 1999; cp, cpoe, xyac_epa, xyac_mean_yardage back to
  2006; nightly in-season releases.
- All principal models are XGBoost.
- **EP** (7-class next-score model: possession TD / opponent TD /
  possession FG / opponent FG / possession safety / opponent safety /
  no score). Features: half seconds remaining, yard line, home possession,
  roof type, down, yards to go, era buckets, both teams' timeouts.
  Training: objective multi:softprob, num_class 7, nrounds 525,
  eta 0.025, gamma 1, subsample 0.8, colsample_bytree 0.8, max_depth 5,
  min_child_weight 1. Calibration: leave-one-season-out, probabilities
  binned to 0.05 and checked against observed frequencies.
- **WP** features include `diff_time_ratio =
  point_differential × exp(4 × (3600 − game_seconds_remaining) / 3600)`;
  spread model adds `spread_time =
  posteam_spread × exp(−4 × (3600 − game_seconds_remaining) / 3600)`.
- **CP/xYAC** features: yard line, home, roof, down, distance,
  air_yards − yards_to_go, era, air yards, zero-air-yard flag,
  middle vs non-middle throw, QB hit; xYAC adds distance from catch
  point to goal line.
- **xPass** features: yard line, home, roof, down, quarter, half time
  remaining, distance, score differential, timeouts, spread and
  non-spread WP, era.
- Model artifacts shipped: https://github.com/nflverse/fastrmodels
  (`ep_model`, `wp_model`, `wp_model_spread`, `fg_model`, `cp_model`,
  `xyac_model`, `xpass_model`) — the actual trained objects.

### 2.2 nflreadpy (Python/Polars port of nflreadr)

Repo: https://github.com/nflverse/nflreadpy — MIT code license; most data
CC-BY 4.0; FTN data CC-BY-SA 4.0.

Loaders: load_pbp, load_player_stats, load_team_stats, load_schedules,
load_players, load_rosters, load_rosters_weekly, load_snap_counts,
load_nextgen_stats, load_ftn_charting, load_participation, load_draft_picks,
load_injuries, load_contracts, load_officials, load_combine,
load_depth_charts, load_trades, load_ff_playerids, load_ff_rankings,
load_ff_opportunity.

### 2.3 nflverse-data releases + update schedule

Repo: https://github.com/nflverse/nflverse-data
Releases: https://github.com/nflverse/nflverse-data/releases
Schedule/status: https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html

Release families observed: teams, schedules, team stats, player stats,
ESPN stats (QBR), weekly rosters (NFL Shield v2 API back to 2002),
players/ID mappings.

Update cadence (public schedule page):
- pbp + player/team stats: nightly after each game day (plus intra-day on
  game days); NFL stat corrections land Mon–Wed, so Thursday's pull is
  the cleanest.
- Raw pbp JSON: `nflfastR::build_nflfastR_pbp()` usually available within
  ~15 min of a game ending.
- FTN charting and PFR snap counts/advanced stats: 0/6/12/18 UTC daily.
- Rosters, depth charts, injuries: 7 AM UTC daily.
- NGS player-level weekly: nightly 3–5 AM ET.
- Depth charts from 2025: ISO8601-timestamped append-only updates, no
  week assignment.
- Participation: pre-2023 from NFL NGS (source died in 2023 season);
  2023+ courtesy of FTN, only after all postseason games.

### 2.4 ffverse/ffopportunity (expected fantasy points model)

Repo: https://github.com/ffverse/ffopportunity
Docs: https://ffopportunity.ffverse.com/articles/

- XGBoost + tidymodels trained on nflverse play-by-play 2006–2020.
- Scores every pass/rush play with expected values independent of the
  play's actual outcome: completion probability, expected YAC, expected
  TD probability, etc.
- `ep_load()` pulls precomputed releases; `ep_build()` rebuilds from
  base nflverse data. Output: ep_weekly (player-week, ~159 columns),
  ep_pbp_pass, ep_pbp_rush.
- Release assets: `ep_pbp_pass_{season}.parquet` /
  `ep_pbp_rush_{season}.parquet` under the `latest-data` tag.
- Join key: gsis-style player IDs (same `00-00xxxxx` format as nflverse).
- License: code GPL-3.0; model outputs/data CC BY-SA 4.0 (with
  attribution requirement).
- A third-party coverage doc notes nflreadpy's `load_ff_opportunity()`
  `season` column is a string (cast before filtering).

**GSE relevance:** the closest public equivalent of FantasyPoints' xFP —
an actual trained xgboost expected-fantasy-points model, runnable and
redistributable under CC BY-SA 4.0.

### 2.5 dynastyprocess/data (fantasy football open data)

Repo: https://github.com/dynastyprocess/data — weekly GitHub Actions.

- `db_playerids.csv` — cross-source player ID crosswalk (feeds
  nflreadpy's load_ff_playerids).
- `db_fpecr` (csv.gz + parquet) — FantasyPros expert consensus rankings,
  updated weekly (feeds load_ff_rankings).
- `values.csv` (+ values-players.csv, values-picks.csv) — dynasty trade
  values.
- Older monolithic database.csv broken into pieces; archives/ holds
  stale files.

### 2.6 sportsdataverse/nfl-data (independent nflfastR-parity pipeline)

Repo: https://github.com/sportsdataverse/nfl-data
QBR reconstruction doc:
https://github.com/sportsdataverse/nfl-data/blob/HEAD/docs/models/qbr.md

- Builds nflfastR-parity pbp from the NFL Shield API (raw:
  sportsdataverse/nfl-raw); publishes via sportsdataverse-data releases.
- Models built: EP, spread-WP, naive WP, CP, xYAC, xPass, first-down,
  two-point, FG, WP, punt.
- Release families: nfl_model_pbp, nfl_model_artifacts, nfl_4th_down_models,
  nfl_espn_qbr, nfl_ratings_weekly, nfl_rosters, nfl_players,
  nfl_player_stats, nfl_team_stats.
- **Public ESPN-QBR reconstruction:** XGBoost regression against ESPN's
  published raw QBR on six features — qbr_epa, pass_epa, rush_epa,
  sack_epa, pen_epa, spread. EPA components are per-game
  win-probability-leverage-weighted means; EPA clamped at −5 (fumbles
  −3.5); plays in 0.1–0.2 or 0.8–0.9 home-WP bands get 0.9× weight,
  outside bands 0.6×. Explicitly notes public EPA cannot reproduce
  ESPN's private charting-based credit assignment.
- Player percentiles: qualification 14 dropbacks / 6.25 carries / 1.875
  targets per team game; Weibull `100 × (n + 1 − rank) / (n + 1)` by
  season and position table; null metrics stay null.

### 2.7 Supporting public model repos found along the way

- greerreNFL/nfeloqb — public QB Elo ratings (qb_elos.csv), used by
  third-party fantasy pipelines. (Name from a downstream README; repo
  page not yet opened — verify before citing URL in public copy.)
- nflverse-ts (TypeScript loaders) — full parity incl. loadPfrAdvstats
  (2018+), loadNextgenStats (2016+), loadFtnCharting (2022+ FTN,
  CC-BY-SA 4.0), loadFfOpportunity (weekly/pbp_pass/pbp_rush).

---

## 3. Public metric definitions worth locking in

From the Advanced Football Analytics glossary (public, long-standing):
https://www.advancedfootballanalytics.com/2010/08/glossary.html?m=0

- **Air Yards:** passing yards forward of the line of scrimmage (total
  passing yards minus YAC).
- **WP:** probability of winning given score, time, field position, down,
  distance — built on actual outcomes of similar historical situations.
- **WPA:** WP(end of play) − WP(start of play); player WPA = sum over
  plays the player was directly involved in (ran/threw/kicked, targeted,
  tackled/sacked, caused fumble, defended pass, penalty).
- **EP:** net expected point advantage of a down/distance/field-position
  situation (no score/time component, unlike WP).

**Stabilization benchmarks** (public research, archived):
- TPRR ≈ 7 games (≈185 routes) — fastest of the WR usage metrics.
- YPT ≈ 39 games (≈205 targets) — slowest.
- Source:
  https://web.archive.org/web/20141013045104/http://intentionalrounding.com/when-do-yards-per-route-run-targets-per-route-run-and-yards-per-target-stabilize/

---

## 4. Gap list — needs the live-browser X pass (parent/root delegation)

The following cannot be completed with public search/index alone and
require the read-only live-browser profile/timeline/reply pass:

1. @sfdata9ers: source footers, QBR derivation, methodology replies,
   Ko-fi public posts.
2. @acccountstat: how the NFL Pro / PFF / SumerSports averaging is done
   (weights, missing values, definition normalization).
3. @joea_nfl: definitions of Accuracy+, PGP, Cheap Play %, positive/
   negative play % (the four throw grades are now closed from Patreon).
4. @gridironinfo_: entire profile/methodology trail.
5. @scottbarrettdfb: PROE formula; current FantasyPoints XFP deltas vs.
   the 2019 PFF implementation; public Data Suite model card if one exists
   outside the beta wall.
6. @ff_marvine: open the individual Expected Points & Opportunity articles
   for per-article metric definitions; confirm EP source.
7. @ihartitz: TruMedia methodology; OddsJam methodology; full post trail
   for original metric calculations.
8. @hawkblogger / SumerSports: whitepapers, conference talks, podcast
   transcripts with reproducible formulas (commercial product — expect
   marketing only).
9. greerreNFL/nfeloqb: open repo, verify license + update cadence before
   GSE use.
10. nflverse-data: full release-tag inventory with file schemas, exact
    asset URLs, and coverage dates (page 1 captured; pagination not
    exhausted).

## 5. Stats/calculations/visual (open workstream)

The directives "do the stats, do the calculations — find something unique
and different and put a graph or visual" were partially served by the
2026-09-21 evening parlay work (cached parquets in
~/workspace/gse-lab/whalelay/: pbp_2025_2026, player_stats_2025_2026,
schedules; scratch scripts angles.py/angles2.py/angles3.py, render.py,
stafford_series.py). Findings banked: Corum 2025 = 8 receptions in 17
games (0.47/g, not "multiple per game"); Theo Johnson 45 rec / 15 games
(3.0/g, 14/15 games with ≥1); Adams-with/without-Puka split is n=1 on
the out side.

Queued for a follow-up dispatch (needs real compute time, separate from
this research pass):
- Extend Stafford's history beyond 2026-W1 (multi-season bounce-back
  base rates after a 0-TD game with <200 yards).
- Uncertainty-aware leg hit rates (Wilson intervals on small samples;
  n=1 splits flagged, not headlined).
- Render one unique visual: recommended angle is the stabilization
  chart — TPRR vs YPT signal arrival (7 games vs 39 games) with GSE
  branding — or a "sample-size honesty" chart showing Corum vs Johnson
  hit-rate distributions with confidence intervals.
