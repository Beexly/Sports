# Orchestration Index — NFL GitHub research → coding-agent builds (2026-09-28)

Research-side handoff only. No orchestration executed. This index maps every keeper (pass 1's 29 + pass 2's 30) to GSE lanes with a build directive and a license gate. The coding agent reads this doc and executes; it should not need to re-research anything — the teardowns under this folder are implementation-ready.

## License gates (standing rule)

- **MIT / Apache-2.0 / Unlicense / CC0-1.0**: code may be adapted with attribution in the file header and this index's license column cited.
- **No license / NOASSERTION**: ALL RIGHTS RESERVED — method description only, independent re-implementation, never copied code.
- **AGPL-3.0**: study only, never incorporated into the Sports repo.
- **GPL-3.0 / LGPL-3.0**: GPL-3.0 is a poison pill for this codebase — method only; LGPL (mkreiser/ESPN-Fantasy-Football-API) may be *used* as a library dependency, not forked in.

## Priority builds (do these first)

| # | Source | GSE lane | Build directive for the coding agent | License |
|---|---|---|---|---|
| 1 | cbratkovics/fantasy-football-ai | Projection layer | Port `asof.py` + `test_asof_no_leakage.py` pattern: one `build_features(stats, targets)` with shifted-groupby invariant, leak test on real data, plus the pure-function decision-policy receipt pattern (content-hashed decision IDs). | MIT ✅ |
| 2 | ryanpmcintire/nfl_py3 | Total-signal rule store | Adopt the weak-signal registry schema + closing rule verbatim (`unresolved_below_power` semantics, effect units ats_points/brier/log_loss). Correct the label: PageRank graph + ridge, not Bayesian. | MIT ✅ |
| 3 | chmoses98/nfl-edge-finder | DFS payout sim + parlay pricing | Implement CRN shared-draws discipline: one shared simulation batch, all lineup/parlay legs as indicators on the SAME draws, `JOINT_MODEL_REQUIRED` when a leg can't evaluate. Note: 40,000 draws per the CRN arm docstring. | none — method only |
| 4 | ebhattad/nfl-mcp | Agent-fleet data layer | Fork the MCP pattern (schema tool + parameterized SQL + freshness tool + timeout guard) against GSE's DuckDB/Neon marts; add the 11 fantasy-research tools (opportunity, rankings, role-trend, TD luck). 20 tools total, not 8. | MIT ✅ |
| 5 | dgrifka/nfl_simulator | Engine methodology | Adopt the **reproducibility protocol**: pre-registered gates, pin-checked weight artifacts, per-game sha256 seeding, draw-count stability gates, stage-0 tests, calibration firewall (process metrics ≠ forecast features). | MIT ✅ |
| 6 | agentscope-ai/DojoZero | Backtest infra + off-field intake | Event-sourced DataHub + JSONL replay as the backtest substrate (live path == backtest path); typed LLM-extracted pre-game events (injury_report / power_ranking / expert_prediction) for the off-field intake lane; 180s LLM throttle + 102k-token offload as inference-budget design. | MIT ✅ |
| 7 | Twoos123/draftkings-live-odds | Live DFS slate provider | DK push websocket subscription shape (entity events + `leagueId eq '88808'` filter + delta updates + wire-vs-created latency instrumentation) as a Go/Python collector feeding the market-updated model and CLV tracking. | none — method only |
| 8 | DimaKudosh/pydfs-lineup-optimizer | DFS optimizer benchmark | Benchmark `optimize(n)` vs GSE `diversePool`/`kBest` on the same slate (solve quality + pool metrics). Port candidates: objective-noise diversification (±12% random, floor/ceil bands, progressive 1%-boost), hard ownership caps, conditional bring-back encoding, min-salary rule. | MIT ✅ |
| 9 | georgedouzas/sports-betting | Engine + MCP | Survey its `dataloaders/core/evaluation/execution/sources` + `mcp/` server; strongest MIT betting-AI toolkit found (802★). | MIT ✅ |
| 10 | mtsilverstein/Megatron | Projection model | Never-masked context-token pattern (rookies get finite predictions from target-week context); pair any quantile head with a Poisson-NLL mean head (optimizer needs E[points], not medians). | none — method only |
| 11 | gtonic/nfl_mcp | Agent-fleet data layer | Rest-of-season projection pattern (`ros.py`: per-week expected points over remaining season for trade/drop/IR decisions); ESPN newsfeed + Sleeper API shape. | MIT ✅ |
| 12 | mattleonard16/nflalgorithm | Pick-posting gate | Drop `confidence_engine.py` (edge 0.35 / stability 0.25 / volume 0.20 / volatility 0.20; tiers Premium≥90/Strong≥75/Marginal≥60) as the @GalaxySportsHQ posting gate mapping onto the 9.2 Hold floor. | MIT ✅ |
| 13 | jlattanzi4/nfl-survivor-optimizer | Pick'em / DFS | Add an explicit contrarian-dial λ to `diversePool` (trade pure win-probability vs field-survival-weighted EV), calibrated to the DK ownership barbell from the 2026-09-25 GPP research. | MIT ✅ |
| 14 | sportsdataverse/nfl-ngs-raw | NGS program | Adopt the acquisition pattern: raw-first, validity-by-content-not-presence, pace-after-every-attempt (0.25s), empty-envelope sentinel as standing data-QC rule. | none — method only |
| 15 | nflverse/nflreadpy | Data pipeline | The live Python nflverse client (transparent caching). Evaluate against GSE's existing nflverse adapter — canonicalize on one. | MIT ✅ |
| 16 | nflverse/nflverse-pbp | Engine methodology | `models/model_data.R` — how the EP/CP/FG/WP model training datasets are built. Study for GSE's EPA model lineage. | CC-BY-4.0 (data; code per-repo) |
| 17 | odds-api/odds-api | Agent-fleet data layer | Official Odds API repo — streaming MCP server (zod-validated). Plug into the agent stack; this is Garrett's own provider. | Apache-2.0 ✅ |
| 18 | carter-tyra/pgatour-ai | Golf-adjacent lanes (method only) | SG feature recipe (long-term/recent-24/components/volatility/course_fit/field-adjusted) with `as_of` leakage cutoff + input hashing; blend weights 0.65/0.25/0.07/0.03 as starting points; promotion gates (Brier ≤0.18, calibration ≤8%, ≥500 outcomes, fail-closed). | none — method only |
| 19 | sumedhk0/PanopticPigskin | Movement/video lane | Ruler doctrines: judge tracking on numbers read from the *render*, never internal tracks; validate pose in a held-out camera view; gate homography decompositions on relative conditioning. | AGPL-3.0 — study only |
| 20 | jordantete/OddsHarvester | Market data | OddsPortal scraper CLI (live/historic/upcoming/community/team); HAR fixtures suggest the scrape shape. | MIT ✅ |

## Secondary / situational

- **BurntSushi/nflgame + nfldb** (Unlicense ✅, archived): reference implementations for the query-API and relational-schema patterns; don't build on the archives, learn the shapes.
- **pseudo-r/Public-ESPN-API** (no license): undocumented-ESPN-endpoints bible — method reference for the ESPN intake lane.
- **fivethirtyeight/nfl-elo-game** (MIT ✅): benchmark harness pattern for GSE's prediction leaderboard.
- **sedemmler/WagerBrain** (MIT ✅): odds-conversion arithmetic library — use, don't rebuild.
- **pretrehr/Sports-betting** (MIT ✅): bankroll-optimization module worth reviewing.
- **BenBrostoff/draftfast** (no license): OR-Tools-based DFS optimizer — second benchmark candidate alongside pydfs.
- **derekrbreese/fantasy-football-mcp-public** (MIT ✅): Yahoo Fantasy MCP with lineup optimization — compare against gtonic/nfl_mcp before choosing the fleet's fantasy data MCP.
- **joeyagreco/leeger** (MIT ✅): typed fantasy-league models — reuse for league-intake normalization.
- **SwapnikKatkoori/sleeper-api-wrapper** (MIT ✅): Sleeper league/draft/player endpoints.
- **asonty/ngs_highlights** (no license): rare open NGS tracking TSVs (2017–2019) — ingest for the movement lane if format parses.
- **WFord26/BetTrack** (MIT ✅): CLV-by-bookmaker endpoints + automated odds syncing — model the market-data pipeline on this.
- **ThompsonJamesBliss/WeatherData** (no license): NFL game weather CSVs 2000–2020 — feed the weather rule in the total-signal taxonomy.
- **dynastyprocess/data** (GPL-3.0): 991 CSVs of ECR/ADP/projections — **data may be usable, code is GPL poison**; have counsel-free Garrett sign off before ingesting GPL-licensed data into the pipeline (data vs. code distinction is not settled here).
- **kachence/polymm** (MIT ✅): Polymarket market-making/de-vig logic — method reference for prediction-market pricing.
- **romanlutz/NFLPlayPrediction** (no license): dated but method-complete sklearn play-prediction pipeline — architecture reference only.
- **ngs-data companions** (nflverse/nflverse-data CC-BY-4.0, nflverse/nflverse-rosters, nflverse/nflverse-pfr GPL-3.0 — method only): data-source inventory for the NGS mega-program.

## Explicitly not built on (recorded so no one re-researches)

- **carter-tyra/AIntelligent-Oddz**: all-backend-stubs skeleton, 0 stars, no license — architecture curiosity only.
- **~40 zero-star 2026-09-28 dashboard/pickem stubs**: personal pages and empty repos; correctly below the bar in both passes.
- **DojoZero's prediction layer**: persona-prompted LLM vibe bets with zero statistical content — mine only the infrastructure (DataHub/replay/gateway/scheduler/throttle), never the "model."

## Honest gaps — unanswerable from GitHub alone

The coding agent must not chase these in repos; they need feeds, accounts, or Garrett's taps:

1. **Live DraftKings salaries + ownership**: proprietary, changes per slate. Only sources: the DK slate provider wiring (Twoos123 pattern) or a licensed feed. No repo can supply this.
2. **Real closing-line value (CLV) history**: CLV requires timestamped line snapshots from actual books. OddsHarvester/BetTrack patterns show *how* to collect it; the data itself must be collected going forward or licensed.
3. **NFL official injury truth**: repos like camp-injury-watch scrape public reports; the real inactives list and practice-report grades come from official feeds + beat writers — the typed-LLM-extraction pattern (DojoZero's pre-game pipeline) is the build, not a repo.
4. **NGS official tracking feed**: nfl-ngs-raw scrapes the public JSON; the full tracking dataset (all-22, per-frame) is licensed or scraped at NFL's tolerance. The 48-post inventory continuation stays scrape-based.
5. **Betting-market execution**: kachence/polymm and georgedouzas/sports-betting show execution patterns, but actual book accounts, API keys, and bankroll are Garrett's — no automation touches money without his explicit word (standing boundary).
6. **Sportsbook terms for the DK push feed**: the Twoos123 subscription shape targets the public NJ websocket; commercial use may violate ToS — flag for Garrett before a production collector ships.
7. **GPL-3.0 data/code**: dynastyprocess/data and nflverse/nflverse-pfr are GPL-3.0 — method-only until the GPL question is settled; do not ingest or fork.

## Corrections log (pass 1 → pass 2)

1. `ebhattad/nfl-mcp`: 8 tools → **20 registered tools** (11 fantasy-research tools). Keeper strengthens.
2. `ryanpmcintire/nfl_py3`: "Bayesian team model" → **prior-weighted PageRank graph + ridge**; the weak-signal registry is the real gold. Label corrected.
3. `chmoses98/nfl-edge-finder`: 20,000 → **40,000 draws** per the CRN arm docstring. Minor.
4. `jlattanzi4/nfl-survivor-optimizer`: missed the full CRN field simulator (Binomial small-pool variance, multi-life buckets, split-pot settlement). Keeper strengthens.
5. Pass 1 was recency-biased: 30 class-(a) + 34 class-(b) misses found via sort=stars/topics/license cuts. The two passes are complementary; merged corpus = 59 keepers + teardowns.
