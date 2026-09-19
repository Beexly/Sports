# NFL Betting Repos — Code Deep-Dive (Agent 13)

Purpose: bottom-up extraction of edge methodologies, data pipelines, and reusable code from the
four cited GitHub repos. Complements NFL_BETTING_EDGES.md (H0, top-down behavioral/market edges)
which cited these as tooling sources. H0 covers behavior; this report opens the black box.

Repo snapshot:
- mattleonard16/nflalgorithm  : end-to-end value-betting pipeline (ingest->project->no-vig->Kelly->confidence->correlation-aware risk->live-odds agent)
- nflverse/nfl_data_py        : archived Sep 2025 data-access layer (parquet/CSV) -> migrate to nflreadpy
- hueyfreemancodes/LuckyLinesV1: projection/modeling stack (XGBoost/LGBM/LSTM ensemble, feature store, OR-Tools DFS optimizer, EV engine)
- yzRobo/draftkings_api_explorer: DK feed scraper (browser-impersonated HTTP, dynamic structure analyzer, main-line detection, SHA-256 verified updater)

================================================================================
1. nflalgorithm — value-betting engine
================================================================================
Clone: /workspace/repos/nflalgorithm. Architecture: docs/ARCHITECTURE.md.
Core: confidence_engine.py, risk_manager.py, nba_value_engine.py (NFL value engine
is the sibling referenced by its docstring: "Modeled after the NFL value_betting_engine.py"),
learning_loop.py.

1.1 EDGE MATH (nba_value_engine.py ~L100-140)
- implied_probability(odds): American->raw prob (no vig).
- implied_probability_no_vig(over,under): normalize raw over+under to sum=1 -> fair probs.
- american_to_decimal(odds); prob_over(mu,sigma,line): P(stat>line) via NORMAL CDF using
  Abramowitz & Stegun polynomial approx (max abs err < 7.5e-8) -> NO scipy dependency.
- edge = model_prob - market_implied_prob; Kelly criterion for sizing.
- norm_cdf is portable drop-in for any language.

1.2 CONFIDENCE TIERS (confidence_engine.py)
0-100 score from 4 min-maxed components:
  _score_edge(edge%): 0->0, 0.25+->100.
  _score_stability(mu,sigma): CV=sigma/mu; CV0->100, CV>=1->0.
  _score_volume(target_share): 0->0, 0.30+->100.
  _score_volatility(v): convert 0-100 badness.
Tiers: Premium 90-100, Strong 75-89, Marginal 60-74, Pass<60.
Kelly fraction SCALED BY TIER (bet SIZE tied to multi-factor confidence, not raw edge).

1.3 CORRELATION-AWARE RISK (risk_manager.py)  <-- H0 Edge1 concrete impl
- POSITIVE_CORRELATIONS: (passing_yards,receiving_yards),(passing_yards,receptions),
  (passing_yards,passing_tds),(passing_tds,receiving_tds).
- NEGATIVE_CORRELATIONS: (rushing_yards,passing_yards).
- detect_correlations(df): groups same-game props via _same_game (event_id or team) +
  _classify_pair -> correlation_group col. Then per-team/game/player exposure CAPS +
  Monte Carlo drawdown via risk_adjusted_kelly (utils/risk_utils.py).
=> Bet sizing accounts for the JOINT distribution of correlated legs (the "uncorrelated
   parlay edge" data the H0 doc cites).

1.4 POST-GAME ATTRIBUTION / LEARNING (learning_loop.py)
- model_error = |mu - actual|/sigma (z-score). labels: model_accurate(<=1sigma),
  model_miss(<=2sigma), high_variance(>2sigma).
- line_value = actual - line = CLV (beating closing line).
- Bayesian threshold tuning of confidence cutoffs.

1.5 DATA PIPELINE (scripts/ingest_real_nfl_data.py) -- calls nflreadpy
nfl.get_current_season; nfl.load_player_stats; nfl.load_snap_counts; nfl.load_rosters;
nfl.load_rosters_weekly; nfl.load_depth_charts; nfl.load_injuries; nfl.load_schedules;
nfl.load_pbp
Quality scaffolding:
- ROLE_PRIORS (QB 28att/75%snap, RB 8att/38%, WR 4.5tgt/55%, TE 3.5tgt/52%, FB 1tgt/22%...).
- NFL_TEAM_COUNT=32; MIN_PLAYERS_PER_TEAM_FOR_AUTHORITATIVE_ROSTER=40;
  MIN_EXISTING_ROSTER_RETENTION=0.90 -- flag authoritative roster snapshots.
- MARKET_MIN_EXPECTED_VOLUME (sports/nfl.py): rushing<=3.0att, receiving<=2.0tgt,
  passing<=12.0att floors before training/projecting a player.
- Player matching 3-tier: exact player_id -> name+team canonicalization -> fuzzy.
  utils/player_id_utils.py: 32-team set, TEAM_ALIASES (ARZ->ARI etc), TEAM_TYPO_FIXES.

1.6 MARKET MODEL (sports/markets.py) -- sport-neutral registry
MarketSpec{key,stat_column,unit,positions,sides}; get_sport("nfl").
NFL markets: rushing_yards(yards,RB/QB/WR/TE), receiving_yards(yards,WR/TE/RB),
passing_yards(yards,QB), receptions, targets -> MARKET_TO_STAT (utils/nfl_markets.py).
melt_actuals() unpivots player-week actuals to one row per market.

1.7 ODDS INGESTION (scripts/prop_line_scraper.py -> The Odds API /v4)
utils/two_sided_odds.py:pair_two_sided_prices -- pairs Over/Under ONLY on matching
player AND LINE (float tolerance). Prevents classic bug: Over@55.5 vs Under@70.5 on
alternates. utils/event_keys.py:resolve_event_id (UnresolvableEventError).

1.8 PIPELINE ORCHESTRATION (pipelines/orchestrator.py + pipelines/nfl_contract.py)
Sport-neutral FAIL-CLOSED sequential runner.
NFL_STAGE_NAMES=("prepare_week","odds","value_ranking","risk_assessment","agents","materialize").
NFL_AUTOMATIC_RETRY_SAFE_STAGES excludes value_ranking (effects not yet proven idempotent).
Idempotent, lease-based worker claiming + cooperative cancellation; bounded exponential
backoff ONLY on retry-safe stages; terminal/unproven -> explicit operator retry.
Live-odds failure halts before value/risk/agents/materialize.

1.9 REUSABLE CODE (nflalgorithm)
- nba_value_engine.py: no-vig + normal-CDF + Kelly math (port CDF to any language).
- utils/two_sided_odds.py: line-paired Over/Under matching (kills alternate-line bugs).
- confidence_engine.py: component scoring -> tiered confidence (size to confidence, not edge).
- risk_manager.py: correlation-group + exposure-cap + Monte-Carlo-Kelly model.
- pipelines/orchestrator.py: fail-closed stage runner w/ lease/cancel/retry contracts.
- utils/player_id_utils.py: team alias + typo normalization (32-team, production-hardened).

================================================================================
2. nfl_data_py (nflverse) — data-access layer
================================================================================
Clone: /workspace/repos/nfl_data_py. ARCHIVED Sep 2025 -> migrate to nflreadpy (Polars).

2.1 API (contract to preserve)
import_pbp_data, cache_pbp, import_weekly_data, import_seasonal_data, see_*_cols,
import_weekly_rosters, import_seasonal_rosters, import_players, import_team_desc,
import_schedules, import_win_totals, import_officials, import_sc_lines,
import_draft_picks, import_draft_values, import_combine_data, import_ids,
import_contracts, import_ngs_data, import_depth_charts, import_injuries, import_qbr,
import_seasonal_pfr, import_weekly_pfr, import_snap_counts, import_ftn_data,
clean_nfl_data. Pure data plumbing -- but data choices ARE the edge surface.

2.2 SOURCE ENDPOINTS (parquet/CSV from nflverse releases)
- pbp: nflverse-data/releases/.../pbp/play_by_play_{year}.parquet (1999+); also
  pbp_participation_{year}.parquet.
- weekly player: .../player_stats/player_stats_{year}.parquet (target share, air-yards, dominator).
- players/teams: players.parquet; nflfastR-data/.../teams_colors_logos.csv.
- weekly rosters: rosters/roster_{year}.parquet (in-season updates).
- depth charts: depth_charts_{year}.parquet.
- injuries: injuries_{year}.parquet.
- NGS: ngs_{year}.parquet (YAC, route data).
- PFR adv stats: advstats_season_{s_type}.parquet; advstats_week_{year}_{wk}.parquet.
- snap counts: snap_counts_{year}.parquet.
- schedules: http://www.habitatring.com/games.csv (all years, filter in-memory).
- odds/lines: mrcaseb/nfl-data/.../nfl_lines_odds.csv.gz (closing lines, win totals).
- win totals: nfldata/.../sc_lines.csv (code warns data source currently broken).
- QBR: espnscrapeR-data/.../qbr-{year}-{season_type}.csv.
- player-id map: dynastyprocess/data/.../db_playerids.csv (cross-site ID resolution).
- draft picks/values, combine, FTN charting, officials via nflverse releases.

2.3 Patterns
Single-year read_parquet/read_csv; cache=True via appdirs.user_cache_dir('nfl_data_py',
'cooper_dff'); thread_requests=True -> ThreadPoolExecutor; downcast float64->float32.
clean_nfl_data aligns name diffs so weekly/pbp/pfr joins stay consistent.

2.4 REUSABLE CODE
- Endpoint template list + caching pattern (copy into re-implementation).
- clean_nfl_data name-alignment for cross-source joins.
- MIGRATE import_* -> nflreadpy.load_* (same backends, Polars default, .to_pandas()).

================================================================================
3. LuckyLinesV1 — projection/modeling stack
================================================================================
Clone: /workspace/repos/LuckyLinesV1. FastAPI + PostgreSQL.

3.1 MODELING (app/models/projections/)
Ensemble: XGBoost + LightGBM + LSTM stack; prop-specific models per market.
README MAEs: passing_yards 26.5, rushing_yards 17.8, receiving_yards 18.6 (verify vs
scripts/train_prop_models.py). XGBoostModel (xgboost_model.py) wires FeatureEngineering.

3.2 FEATURE STORE (app/services/feature_engineering.py)
- add_emas(span=4), add_lags(lag=1), calc_streak(short=3/long=8 EMA ratio >1=hot),
  calc_velocity(short-long EMA delta), add_streaks, add_xfp (expected fantasy points).
- add_team_shares, add_rz_share, add_opp_share (target/red-zone/opportunity share vs team).
- add_vegas_implied, add_def_features, add_game_script_features (spread interactions),
  add_weather_impact (wind_passing_penalty, wind_rushing_boost, temp_extreme, humidity).
3.3 OPP DEFENSE (app/services/opponent_defense_features.py)
4-game rolling points/yards/sacks/turnovers allowed per game -> opp_def_strength_score.

3.4 EV ENGINE (app/services/ev_calculator.py)
EV% = (WinProb*(decimal-1)) - (1-WinProb), over wager.
STD_DEV_MAP (market-specific, tunable): pass=35.0, rush=15.0, rec=15.0.
win prob: z=(line-proj)/std; Over->1-norm.cdf, Under->norm.cdf.  (mirrors nflalgorithm math.)

3.5 DFS OPTIMIZER (app/optimization/optimizer.py)
OR-Tools CP-SAT. Bool var per player. Constraints: salary_cap, roster_size, per-position
counts, FLEX(RB/WR/TE pool math), QB+WR/TE same-team STACKING, per-player exposure_limits,
min_diversity between lineups. Objective: max sum(projected_points*100).
simulator.py: Monte Carlo payout sim.

3.6 PIPELINE
app/ingestion/DraftKingsIngestion (live slates/salaries via DK draftgroups API) + base.py
+ OddsApi/other. DB: app/models/models.py (BettingLine, Projection, Player, PlayerSeasonStats).
backtest 2024: scripts/backtest_2024.py iterates weeks 2-18, generate_projections(season,week),
joins actuals, reports MAE + r2 per market (week 1 skipped -> needs EMA history).

3.7 REUSABLE CODE (LuckyLines)
- feature_engineering.py: EMA/lag/streak/velocity + vegas + defense + weather + game-script.
- optimizer.py: CP-SAT DFS skeleton (salary/roster/position/FLEX/stacking/exposure/diversity).
- ev_calculator.py: normal-CDF win-prob + EV% formula (cross-check vs nflalgorithm STD_DEV).
- opponent_defense_features.py: 4-game rolling defensive-strength scorer.

================================================================================
4. draftkings_api_explorer — DK feed scraper
================================================================================
Clone: /workspace/repos/draftkings_api_explorer. Single file dk_api_gui_explorer.py (62KB).

4.1 EDGE DATA: MAIN-LINE DETECTION (apply_smart_formatting)
DK returns EVERY alternate line as a separate Over/Under. Code pivots Over/Under into one
row per participant per line, then per participant selects the MAIN line via DK's own `main`
flag, FALLING BACK to cost=|OverOdds|+|UnderOdds| min (closest to -110) when flag absent.
Comment: cost heuristic alone gets the line wrong when an adjacent alternate is marginally
tighter -> prefer `main` flag as authoritative.  (Feeds H0 Edge1 uncorrelated-parlay math.)

4.2 HTTP / ANTI-BOT
DEFAULT_API_BASE = https://sportsbook-nash.draftkings.com/api/sportscontent/dkusoh/v1
DEFAULT_LEAGUE_ID = 88808 (NFL)
build_api_url(league_id, category_id, subcategory_id) ->
  /leagues/{id}/categories/{c}[/subcategories/{s}]
fetch_dk_feed: cffi_requests.get(..., impersonate="chrome110", timeout=30)
  => curl_cffi + browser impersonation bypasses DK bot detection (portable win).

4.3 DYNAMIC PARSER (no hard-coded feed schema)
- StructureAnalyzer: samples markets/selections fields, label_patterns(Counter),
  detects has_points/has_participants, market_name_patterns, market-to-event rels.
- EnhancedDynamicParser.parse_selection: uses events for team/player extraction.
- _detect_market_type_from_analysis: label ratios (>80% Over/Under -> over_under/player_props;
  ordinals -> division_standings; trailing '+' -> threshold).
- Category->type fallback: 1759=player_props, 1801=rookie/threshold, 820=division_standings.

4.4 FEED NORMALIZATION
- normalize_market_name: strips DK prefix "NFL 2026/27 - " (regex LEAGUE_SEASON_PREFIX_RE).
- resolve_outcome: handles combined "Over 3949.5" label vs separate points field
  (EMBEDDED_LINE_LABEL_RE).
- GENERIC_SUBJECTS blacklist ('regular season','season','total','the') avoids bogus subjects.

4.5 REFERENCE / IDS
id_reference.json: list of {category_name:"... (Category ID: N)", subcategories:["... (ID: M)"]}
  -> 15 NFL futures groups e.g. WINS(1286), FUTURES(529), AWARDS(787), REGION(49808)=NFL,
     PLAYER PROPS(1759), ROOKIE PROPS(1801), DIVISION STANDINGS(820).
config.json: api_base + default_league_id + check_updates_on_startup.

4.6 VERIFIED AUTO-UPDATER
fetch_latest_release (GitHub releases, drafts/prereleases excluded) -> select_exe_asset by
name -> download_verified_asset: requires asset.digest starts with 'sha256:', checks size +
sha256(payload)==expected, writes to *.download, atomic same-volume rename (Windows can't
overwrite running .exe -> move current to .old, delete next launch).

4.7 REUSABLE CODE (DK Explorer)
- curl_cffi + impersonate="chrome110" HTTP (anti-bot bypass).
- build_api_url/fetch_dk_feed (~15 lines, GUI-free DK client).
- StructureAnalyzer + EnhancedDynamicParser + apply_smart_formatting (analyze-then-parse
  unknown sportsbook feed; main-line selection).
- normalize_market_name/resolve_outcome regexes (prefix + embedded-line labels).
- Main-line selection (prefer `main` flag; cost heuristic fallback).
- Verified-update pattern (SHA-256 + size + atomic rename).
- Threading via queue.Queue + root.after poller (non-blocking GUI).

================================================================================
CROSS-REPO CAPABILITY MATRIX
================================================================================
Capability            | nflalgorithm | nfl_data_py | LuckyLines | DK Explorer
Data ingestion         | nflreadpy    | nflverse raw | DK+OddsAPI | DK only
Projection model       | position ML  | none        | XGB/LGBM/LSTM | none
Odds source            | The Odds API | nfl_lines csv | DK+OddsAPI | DK live feed
Value math             | no-vig+Kelly+CDF| none     | EV%+CDF   | none (data layer)
Confidence sizing      | 4-tier score | none        | none      | none
Correlation/risk       | corr+Kelly MC| none        | DFS stacking | none
Optimization           | none         | none        | OR-Tools DFS| none
Steam/momentum agent   | odds_agent  | none        | none       | provides raw snapshots
Reusable scraper       | -            | -           | -          | YES (best quality)

RECOMMENDED INTEGRATION (parent project):
1. Take DK Explorer's fetch_dk_feed + main-line pivot as the LIVE ODDS feed (replaces
   LuckyLines DK ingestion and nflalgorithm's Odds-API-only prop scraper).
2. Use nfl_data_py endpoint list (migrated to nflreadpy) as data backbone; bolt on
   LuckyLines feature_engineering.py (EMA/lag/streak/vegas/defense/weather/game-script).
3. Value math: shared no-vig + normal-CDF + Kelly (cross-check nflalgorithm vs
   LuckyLines STD_DEV per market).
4. Size via nflalgorithm confidence tiers + correlation-aware Kelly; OR-Tools optimizer
   for DFS; nflalgorithm odds_agent/market_bias_agent as live edge triggers.

================================================================================
ISSUES / BLOCKERS
================================================================================
- nfl_data_py archived Sep 2025 -> upstream nflreadpy (Polars). Treat as DATA CONTRACT, not fork.
- nflalgorithm README cites data_pipeline.py & value_betting_engine.py NOT in tree; NFL value
  engine is the sibling nba_value_engine.py (docstring confirms). Mirror its math.
- LuckyLines ev_calculator._project_stat hard-codes target_season=2023,target_week=1 and calls
  full-projection generation PER PLAYER (noted inefficient) -> batch before reuse.
- DK config.json overrides nothing unusual; league/category IDs in id_reference.json as
  [{category_name, subcategories}].
- ENV: sandbox bash `terminal` mounts a DIFFERENT /workspace than Python/read_file tools;
  all reads here used execute_code(Python)+read_file. Write path: C:\Users\Garrett (python maps
  /workspace -> C:\workspace; bash maps /workspace -> MSYS root, inaccessible).
