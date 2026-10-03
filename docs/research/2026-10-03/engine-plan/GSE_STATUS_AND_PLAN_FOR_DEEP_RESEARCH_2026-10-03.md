# GSE: current status and plan, for deep research (2026-10-03, 02:10 CT)

## 0. What GSE is (founder direction)
- GSE is an all-ingesting reasoning prediction engine. It ingests every signal on the field, around the game and outside the game (situational, social, cognitive, physical, environmental, coaching, books, prediction markets).
- It reasons over those signals and emits picks, props, parlays, fantasy/DFS and analysis.
- Its job is to grade itself on its own metrics (log loss, Brier, calibration, hit rate, projection error) and to learn continuously toward maximum accuracy.
- Books are one signal family among many. The market close is a reference line on charts, not the target.
- Existing production picks in Neon are frozen history. They are not settled, re-graded, recalibrated or revisited until the founder declares the engine complete at maximum intelligence and reasoning.
- All training, calibration and learning happen now, on historical data and the engine's own replay and live forecasts, never on the frozen picks.
- Repo: Beexly/Sports. Plan branch: `research/engine-plan-2026-10-03`, head ad1f6bf. All docs and receipts are in `docs/research/2026-10-03/engine-plan/`.

## 1. Measured today (walk-forward: never fit on the season being tested)

| Test | Result |
|---|---|
| Market close (de-vigged ML), 2022–2026 W1–4 pooled, n=1,185 | log loss 0.6094, Brier 0.2110 |
| Independent Elo (no market) | 0.6392; never adds to the close (interval includes 0 in every season) |
| Elo + per-QB EPA/dropback (16-game rolling) | 0.6302 (QB is the strongest family). Upper bound: uses actual starters, not pre-game expected starters. A point-in-time fix is queued |
| 33 flat features (team form, matchups, situational) | 0.6388, worse than 2 features. Proof that raw signals cannot be dumped into the pricer |
| Ablation | QB +0.0050, Elo +0.0019, team form −0.0006, matchup −0.0002, situational −0.0027 |
| Market as fixed offset + QB + Elo residual | 0.6102 vs close 0.6094 (parity) |
| + snap-weighted injury availability (nflverse injuries × prior snap share), 2022–25 | independent 0.6309 → 0.6286; with offset 0.6078 → 0.6072 vs close 0.6070 |
| Opponent-adjusted ridge team ratings from every play (simple encoder) | no gain (0.6342 → 0.6340); the encoder must be player- and matchup-level |
| Production NFL picks (frozen; read once, read-only) | 296 total, 54 preseason, 29 scorable with a model probability. Picks ≥ 0.80 confidence: claimed 0.8663, realized 0.5191 (n=235, from the Grok workspace exam contract) |
| W4 2026 sealed before kickoff | 15 games, sha256 d6e03aaf…6d2e. A v0 champion with injuries is in w4_champion.json |

## 2. Assets in hand

- Neon prod has 4.2M rows across 34 non-empty tables; 101 tables are empty.
  - odds_line_snapshots: 3.5M rows across 13 books (NFL 1.10M, NCAAF 1.44M, MLB 0.50M, MLS, NBA, NHL), Aug 19 – Oct 3, phases OPEN/INTERIM/CLOSE.
  - closing_lines has 0 rows. CLOSE phase covers only 60 of 299 NFL games.
  - signals: 122,548 rows (player-game EPA, target share, fantasy, NGS, injury availability).
  - snap_counts 31,100; injuries 7,093; player_game_stats 35,536.
  - Player props: only receptions and pass TDs, at 3 books.
- Repo: 21 packages; 231 prediction-engine modules; 31 Vercel crons.
  - Several crons write nothing: weather has 10 rows; prediction-market, props, DFS and arbiter tables are empty.
  - Signal registry: 47 signals, 0 fully wired, 1 partial.
  - Perception/CV modules sit on unmerged PR #1009. Madden route ontology Stage 7 (12 concepts) and the Madden-prior player-value module are unwired.
- Local lake (this laptop, i7-1255U, 32 GB, Iris Xe, no NVIDIA GPU):
  - nflverse pbp 1999–2026, 1,288,125 plays × 372 columns
  - participation 2016–2025 (route, coverage type, man/zone, pressure, time to throw), FTN charting 2022–2025
  - injuries 2009–2025, snap counts 2012–2026, NGS, officials, rosters, depth charts
  - nfl.com injury reports 2026 W1–W4 (GSIS ids, practice days), 1,561 team news articles, 32 rosters
  - CBS + startwho projections W4; Kalshi 772 NFL markets; ESPN summaries + FPI predictor W4; Open-Meteo W4 forecasts
- Computer vision:
  - HF Space gse-watch-pipeline runs YOLOv8n (COCO person) + BoT-SORT + ORB stabilizer.
  - Detection precision 1.00, recall 0.74 on 57 hand-checked boxes. Tracklets fragment (median 0.6–0.8 s). Homography degenerate.
  - The watcher is not deployed (no config.json, no process), so 0 frames have been ingested.
- Models available:
  - OpenRouter (cheap: mimo-v2.6-flash, glm-5.3-flash, deepseek-v4.1-flash; free: nemotron-3-ultra/super, qwen3.8, laguna)
  - NVIDIA API Nemotron-3-Ultra
  - OpenCode Zen (deepseek-v4.1-flash, glm-5.3, qwen3.8-flash; gpt-6-luna and gpt-6.1-sol via the Responses API; space-bunny-free)
  - Groq gpt-oss-120b; Grok 4.7 via xai-oauth; AI/ML API ($20); Firecrawl Alexandria (3,688 credits)

## 3. Running right now
- Full read of the Beexly/agent-bus research corpus: 5,621 documents, 120 MB (3,457 briefs, 1,113 arXiv full texts, deep reads, inbox, scored batches).
  - A fleet of 13 models reads every file in full and writes structured records: numbers, methods, data sources, components, builds, repo status.
  - 5,133 of 5,621 documents done. $1.9 spent. Spot check: 99.3% of extracted numbers appear verbatim in the source.
- After that, a per-component synthesis turns all records into ranked dossiers (builds, sources, conflicts, kill list).
- Grok 4.7 red-team call pending. gpt-6.1-sol and Nemotron-3-Ultra red teams are done and folded into the v2 rules.

## 4. Plan (binding docs on the branch)
- GSE_MASTER_INTEGRATION: one loop, ingest → encode → perceive → reason → price → decide → grade → learn → chart. Wiring is immediate; weight is earned through one gate.
- GSE_V2_DECISIONS_SPRINT: single decision function, bitemporal data contract, LLM = event extractor (never outputs p), ownership, escalation rule, hour-level clock.
- GSE_20K_REVIEW: blind spots, the signal universe (on-field / around the game / outside the game, ~90 families), and the coding-agent kit (contracts, gate, definition of done, directory ownership).
- FORWARD_PROMPT: lanes 0–28 for the coding agents.
- Tonight's critical path, before the first W4 kickoff (IND–WAS, London, neutral site, 08:30 CT 10/04):
  - gate harness
  - point-in-time starters
  - availability model
  - bivariate score-distribution engine
  - neutral-site handling (the v0 file currently gives WAS home field; this must be fixed)
  - health gate and kill switch
  - full-slate mint, logged as engine forecasts

## 5. Known invalidators being guarded
LLM pretraining contamination of historical games; point-in-time leakage (actual vs expected starters, revised feeds, post-play columns); target-family double-counting; selection on the held-out set; CLV at soft books; stale or partial publish; pretraining leakage across folds; event duplication across sources; quote normalization; stat corrections.

