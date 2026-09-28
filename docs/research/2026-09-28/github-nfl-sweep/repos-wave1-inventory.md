# Wave 1 — NFL repo inventory (code-grounded keepers)

29 keepers from 1,000 repos scanned (10 pages × 100, `q=NFL&sort=updated&order=desc`, 2026-09-28).
Each entry grounded in the repo's actual source, not its README. License absent = **no license — method-level learning only, no code reuse.**

## Prediction models & ML

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| cbratkovics/fantasy-football-ai | 16 | 2026-09-28 | Python | **MIT** | dbt bronze/silver/gold marts; `ffai/features/asof.py` as-of feature engineering (no lookahead); per-position RF+XGBoost with committed model artifacts; `fct_decision_policy_v1/v2.sql` decision tables; OOS predictions + model card. |
| ryanpmcintire/nfl_py3 | 15 | 2026-09-28 | Python | **MIT** | `src/nfl_ats/` feature modules (qb_identity, roster_availability, sharp_book_movement, transaction_wire, recurrence_hazard, weather, officials); Bayesian team model; market-updated model; leader-median confidence; experiment registry with per-week JSON specs; agentless pipeline (spec → reliability → bootstrap → registry, `docs/experiment_pipeline.md`). |
| mtsilverstein/Megatron | 1 | 2026-09-28 | Python | none | `src/ffmodel/model/net.py`: encoder-only Transformer (d_model=96, 4 heads, 3 layers) with quantile heads (11 stats × 3 quantiles) + optional mean head; trained checkpoints per season 2016–2025 with per-fold calibration; rookie-decision and consensus-benchmark diagnostics. |
| chmoses98/nfl-edge-finder | 1 | 2026-09-28 | Python | none | Game/period/joint/player engines (v2–v5 player dists: hybrid, market, snap, volume); one Monte Carlo (20,000 common rows) prices every market; Kalshi reconciliation weights fit OOS; joint engine refuses composites unless all legs evaluate on the same draws (`JOINT_MODEL_REQUIRED` otherwise). |
| mattleonard16/nflalgorithm | 9 | 2026-09-26 | Python | **MIT** | `confidence_engine.py`: 0-100 score = edge size × projection stability × volume certainty × volatility → tiers Premium/Strong/Marginal/Pass; model provenance utils; pipeline orchestrator + state machine docs. |
| rogerroot01/NFL-projections | 1 | 2026-09-28 | R | none | R ensemble: legacy xgboost margin/total trees + NextGen feature pipelines (`00_v12_modeling_helpers.R`), as-of-next week-cut preprocessing, pregame replay audit for parity. |
| gmalbert/nfl-predictions | 3 | 2026-09-28 | Python | none | Nightly/weekly CI (keep-alive, nightly-update, weekly-model-performance) refreshing predictions + schedules; v2 quality workflow. |
| kaiwave/boardsteals-nfl | 1 | 2026-09-28 | Python | NOASSERTION | Fantasy sleeper picks from underlying data. |
| bsr-0/nfl-player-projections | 1 | 2026-09-28 | Python | none | Agentic Claude build (CLAUDE.md, .claude/skills): phase1 canonical player-weeks → phase2 participation; AUDIT_REPORT.md + GAPS.md on file. |
| grant-jones1/NFL-model | 0 | 2026-09-28 | Python | none | Elo ratings + margin distributions, calibration vs betting markets. |
| teond1090/football-probs | 0 | 2026-09-28 | Python | none | NFL/CFB win/spread/total probabilities vs sportsbook lines, with backtests. |

## Prediction-market / odds tooling

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| abudnick8/prop-edge | 6 | 2026-09-28 | TypeScript | none | Scans Kalshi, Polymarket, DraftKings; `server/grade_engine.py` + `ml_engine.py`; bracket engine TS. |
| jdev-02/gooseline-model-hq | 2 | 2026-09-28 | Python | none | `src/core/models.py`: closed-form weighted ridge with Gaussian predictive distribution over home margin (MAP prior, σ fit on residuals); Kalman team ratings; Kalshi edge rundowns. |
| thiagocavalheiro/polymarket-sports-trading-bot | 4 | 2026-09-28 | Rust | none | Automated sports betting/trading on Polymarket (NFL/NBA/tennis) in Rust. |
| kyle-vo/fade-the-chalk | 1 | 2026-09-28 | Python | none | Contrarian board: model vs Robinhood (Kalshi) vs Pinnacle vs crowd; `backtest.py` + daily Kalshi JSON history. |
| Twoos123/draftkings-live-odds | 0 | 2026-09-25 | TypeScript | none | DraftKings push feed → Next.js + SSE, ~0.2s behind the book. |
| wesnicol2/odds-fantasy | 1 | 2026-09-28 | Python | GPL-3.0 | NFL odds retrieval tools from betting websites. |

## Fantasy / DFS

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| Krool/FantasyFootballAnalyzer | 7 | 2026-09-28 | TypeScript | none | Fantasy league analyzer + live draft room for Sleeper, ESPN, Yahoo (70MB). |
| jlattanzi4/nfl-survivor-optimizer | 2 | 2026-09-28 | Python | **MIT** | `pipeline/optimizer.py`: objective Σ log p − λ·log fs (pick win prob vs field-survival EV); Hungarian assignment (`scipy.optimize.linear_sum_assignment`) over weeks×teams; JS port with Python↔JS parity tests. |
| nukesim/nuke-dfs-hub | 0 | 2026-09-28 | Python | none | NFL DFS lineup building hub for DraftKings: player pools, QB planning, multi-lineup building, exposure tracking. |
| balprab24/fantasy-kai | 1 | 2026-09-24 | Java | **MIT** | Recomputes player rankings against any league scoring rules. |

## Props / player models

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| seidcubro/player-prop-machine-learning-analysis-platform | 1 | 2026-09-27 | Python | NOASSERTION | Full-stack FastAPI + PostgreSQL prop analytics platform; docker-compose, CI, jobs/services layout. |
| tucknub/nfl-prop-war-room | 1 | 2026-09-27 | Python | NOASSERTION | 1,310-file prop platform with CI product gates (shadow-deploy, canary, QA). |

## Data pipelines & NGS

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| nflverse/nfldata | 364 | 2026-09-28 | R | none | NFL data (Lee Sharpe's corpus behind the models) — canonical play-by-play source. |
| sportsdataverse/sportsdataverse-py | 118 | 2026-09-28 | Python | **MIT** | Python package for sports data endpoints. |
| sportsdataverse/nfl-ngs-raw | 0 | 2026-09-28 | Python | none | Scrapes nextgenstats.nfl.com/api JSON into a committed raw library; logs for seasons 2009→present; sibling `sportsdataverse/nfl-ngs-data` reshapes to nfl_ngs_* datasets. |
| sportsdataverse/nfl-ngs-data | 0 | 2026-09-28 | Python | none | Reshapes nfl-ngs-raw JSON into released nfl_ngs_* datasets. |
| rj7002/next-gen-scrapy | 0 | 2026-09-28 | Python | none | Package extracting NGS passing/rushing/receiving charts. |
| ebhattad/nfl-mcp | 7 | 2026-09-24 | Python | **MIT** | MCP server over DuckDB nflverse data: 8 tools (schema, read-only SELECT guardrails, play search, team/player stats, compare); Docker, tests. |
| mitchellsteinberg03/camp-injury-watch | 0 | 2026-09-28 | HTML | none | Training-camp injury tracker by position group (DB, LB, OT, OG, RB), all 32 teams. |

## Computer vision / tracking

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| sumedhk0/PanopticPigskin | 0 | 2026-09-27 | Python | AGPL-3.0 | `nfl_gsplat/calibration/`: camera calibration from field geometry (homography decomposition, field detection, endzone paint, from-paint/from-player solvers); player tracking; Gaussian-splat 3D replay. |

## Misc keepers

| Repo | ★ | Pushed | Lang | License | Method (from code) |
|---|---|---|---|---|---|
| FrederikBolding/nfl-probabilities | 1 | 2026-09-28 | TypeScript | **MIT** | Web app + CLI for NFL playoff probabilities and team ELO. |
| 3GO-47/rainman | 1 | 2026-09-27 | HTML | none | Defense-vs-position intelligence terminal: per-defense stats allowed by position; committed game logs + depth charts 2024→2026. |
| spiflicate/yfs-api | 2 | 2026-09-25 | TypeScript | **MIT** | Fully-typed TypeScript wrapper for Yahoo Fantasy Sports API (OAuth 1.0/2.0). |
| dgrifka/nfl_simulator | 5 | 2026-09-23 | Python | **MIT** | One deserve-to-win number per game: OLS on 2016–2023 team-games maps (success rate, yards/play) → likely points; 40,000-draw bootstrap for DTW%; docs/research has 75 numbered research docs. (Also the standout of the wiki wave.) |
