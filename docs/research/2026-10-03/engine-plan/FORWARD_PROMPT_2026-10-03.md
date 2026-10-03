# Forward prompt: GSE engine, one run, many lanes (2026-10-03)

Paste this whole block to the coding agent (Hermes / Codex / Claude Code on Beexly/Sports). One command. The lanes are independent unless marked.

---

SPRINT CLOCK AND BINDING RULES: GSE_V3_DECISIONS_2026-10-03.md overrides this prompt and GSE_V2_DECISIONS_SPRINT_2026-10-03.md wherever they conflict. v2 still supplies the decision function (§2.1), the bitemporal contract (§2.3), the reasoner interface (§2.6), ownership (§2.15) and the escalation rule (§2.13). Nothing waits weeks. Do not stop work.

STOP, from v3. Do not build these even if a lane below still names them: a moneyline model aimed at beating 0.6098; the leaky 0.6072 champion; availability as a moneyline add; open-to-close as a bet; Kalshi as the sharp price; travel, referee totals, OL continuity, contract-year, or firing ATS as pricing inputs; Madden or CV as a price this week; an LLM that outputs p; bivariate Poisson; foundation pretraining. The next build is alt-line and team-total capture at the same timestamp as the main line, then the joint scored against those prices. The W4 mint is eng/w4_mint_v1_20261003T0757Z.json (sha256 b67c48f988f072e65119864bcb49ac6478960b3f181bf5bbef12acdda174099e). Forecast only. Do not write Neon picks.

You are building the GSE reasoning engine on Beexly/Sports. GSE ingests every signal, reasons over it, and emits picks, props, parlays, fantasy/DFS and analysis. We grade the engine on its own metrics: log loss, Brier, ECE, hit rate, projection error. The engine learns from every graded row. The de-vigged close is drawn as a reference line on charts. It is not the target and not a merge gate. Never claim we beat it.

Neon production picks are frozen history. Do not settle, re-grade, tag, edit, or train on any existing pick until the founder declares the engine complete. All engine testing runs on the replay against nflverse outcomes.

The architecture is GSE_MASTER_INTEGRATION_2026-10-03.md, in the same folder. Read it first: one loop (ingest → encode → perceive → reason → price → decide → grade → learn → chart), with every component wired into it. Wiring is immediate; weight is earned. Each family goes live the day it is wired, and the nightly grader sets its weight from walk-forward results. Measured today: 33 flat features made the engine worse than 2. Do not dump raw signals into the pricer; use the hierarchy and the gate. Lane 0 runs first. Lane 20 (activate what already exists) and lanes 16–19 start in parallel with it. The coding-agent kit (contracts, gate, definition of done, directory ownership, order) is GSE_20K_REVIEW_2026-10-03.md §G. Follow it exactly; if it does not cover something, comment on the card instead of deciding.

Ground truth before you start (measured 2026-10-03, receipts in docs/research/2026-10-03/engine-plan/):
- Prod NFL has 29 scorable graded picks. That is the bottleneck. The engine cannot learn from 29 rows.
- Per-QB EPA/dropback (16-game rolling, passer_player_id, shrunk to −0.05 with 150 pseudo-dropbacks) improves the independent engine: walk-forward log loss 0.6392 → 0.6302, n=1,185. Wire it.
- Confidence ≥ 0.80 claimed 0.8663 and realized 0.5191 (n=235). trueProb is compressed (never reaches abs(p−0.5) ≥ 0.15).
- No tracking feed exists (watch.games 15 rows, 0 frames).
- Glass Ledger is out. Do not build it.

Rules: re-fetch origin/main first. One PR per lane, on a feature branch. git push -u origin <branch> after every commit. If it is not on origin, it did not happen. CI green before merge. Walk-forward only: no fit may see its own test season. As-of features only: nothing timestamped after kickoff. Every metric carries n and a 95% interval. Shuffled-week placebo on every new signal. No runtime fit on active picks. Do not flip MODEL_VERSION, CALIBRATION_AUTO_PUBLISH or STATS_PUBLIC without a receipt in the PR. Do not touch #1018 or #1019 except to land them.

LANE 1: Replay harness (blocks 2, 3, 4, 5).
Build packages/prediction-engine replay: run the live engine path as-of T−90min for every NFL game 2018–2025 and 2026 W1–4, using nflverse games/pbp/injuries/depth/snaps (CC-BY, attribute). Same code as live, no fork. Write graded rows to a replay table or parquet: game_id, family (ML/spread/total), p, as-of feature hash, trace verdict, outcome, close q (reference only). Receipt: row counts per season and family, plus proof that no feature timestamp is after kickoff.

LANE 2: Calibration map (needs 1).
Fit isotonic and beta maps per family, walk-forward by season, on replay rows. Pick by held-out log loss. Retire the ≥0.80 band unless the map supports it. Receipt: reliability diagram per family, ECE before and after, n.

LANE 3: Signal wiring with ablation (needs 1).
Wire per-QB EPA into the independent engine first. Then, one at a time: OL/DL (#1018 once merged), injuries/depth, weather, rest, coaching tau, book features. For each: engine log loss with vs without (walk-forward), the placebo, and the Δ with its CI. A signal earns weight only when its engine Δ CI excludes 0 on held-out seasons. Receipt: a signal contribution table.

LANE 4: Learning loop (needs 1, 2).
Nightly job: grade every engine output from replay and from new as-of runs against nflverse outcomes (never Neon prod picks), append to graded rows, refit calibration and weights walk-forward, run champion vs challenger on the same held-out window, promote only if the challenger wins on log loss and the placebo fails. Version-stamp every promotion. Receipt: the first two nightly runs with promotion decisions.

LANE 5: Engine intelligence charts (needs 1).
apps/web: learning curve per family by week and version, close drawn as a reference line; reliability diagram; signal contribution bars with placebo; reasoning-trace validity rate; champion vs challenger ladder. Graded rows only. n and interval on every chart. Copy stays "math you can read."

LANE 6: Props, DFS, fantasy scorecard (needs 1).
Same loop per player market: projection MAE and CRPS, over/under Brier, DFS lineup percentile. Use the existing signals (118k rows), snap_counts and injuries.

LANE 7: Reasoning-trace grading.
Make analyze() return non-INVALID traces: each one cites feed rows and names rejected facts. Score whether the cited reasons moved p in the direction of the outcome. Report it as a chart, not prose.

LANE 8: Mint window, new mints only.
The engine mints only inside T−7d of kickoff. Do not touch existing picks. Receipt: a test showing a T−8d game is withheld.

LANE 9: Hygiene.
Triage the 30 open PRs: merge if green and still relevant, otherwise close with a reason. Prune merged Sports-wt-* worktrees. Receipt: a before/after list.

LANE 10: Grade W4 after the Monday-night game ends (MNF is Monday 2026-10-05; grade early Tuesday 2026-10-06). Store the date logic in tests.
This is an nflverse-only engine test, not a Neon pick. Verify the sha256 of docs/research/2026-10-03/engine-plan/w4_2026_sealed.json (d6e03aaf18cebd5ee0e940e710e9948208d610212acf013687448bb3b66b6d2e). Score log loss and Brier for the independent and Elo-only columns. Show the close as reference.

LANE 11: External intelligence leaderboards (after 2 and 4).
Wrap the engine's ingest → reason → probability loop as a forecasting agent. Enter Prophet Arena first (Kalshi, sports overlap), then the Metaculus FutureEval bot tournament, then ForecastBench. Read each one's rules and terms before submitting.

LANE 12: Foundation pretraining, the 1M-signal layer (needs 1 for the downstream test).
Pretrain a play-level model on nflverse pbp 1999–2026 (every play, all 372 columns, as-of state only). Objectives: next-play EPA, drive outcome, player stat line. Export per-entity encodings (player state, unit-vs-unit matchup, situational context) as engine features. Hold out 2025 and 2026 entirely from pretraining. Downstream test: engine log loss with vs without the encodings, walk-forward, plus a placebo. Free compute only (local GPU/CPU, ZeroGPU). Receipt: pretraining loss curve, downstream Δ with CI, plus the param count and wall-clock time.

LANE 13: Social/cognitive signal capture.
Start a daily archiver now. Sources: beat reporters, pressers, injury designations, team social, X. Store raw text with first-seen timestamp and source. Use the LLM layer (local Ollama for bulk, MiMo on ZeroGPU for the live slate) to extract structured timestamped events: injury hints, role changes, motivation and situational context, locker-room state. Each event carries source, as-of time and a confidence field. The LLM writes events, never probabilities. Events enter the engine through Lane 3's ablation like any other signal. Receipt: sources, rows per day, an extraction schema, 50 hand-checked events.

LANE 14: Reasoner (needs 2, 12).
For each pick, retrieve the relevant slice of raw signals plus encodings, write a trace (cited rows, rejected facts), sample k traces, and aggregate to p. Train with RL on as-of evidence episodes, with log loss of the outcome as the reward. Gate: the reasoner's held-out log loss must beat the non-reasoner engine on the same rows. Receipt: the comparison, k, and cost per pick.

LANE 15: Fix the watch relay before buying GPU.
The gse-watch-pipeline Space ran 6h on a T4 and watch.games has 0 frames ingested. Trace the path Windows watcher → /process-frame → Vercel /api/ops/watch-ingest → Neon watch.* and find where the frames drop. Stay on cpu-basic until a test frame lands in watch.frames.

LANE 0: Go live for W4, Sunday 2026-10-04 (do this first).
The mint already exists. Champion for the moneyline is the market offset plus home/neutral plus PIT QB plus Elo residual. Log loss 0.6107 vs the close 0.6098, n=1,914. That is a tie. Do not cite 0.6072. The joint is market-anchored (v3 §2). Publish a play only where §2.1 passes; at this mint expect none. Refresh injuries and odds before the London kickoff. The 06:45 CT cron does that. Do not touch existing Neon picks.

LANE 16: Computer vision, wired, optimized, fine-tuned (§3.3).
(a) Deploy watcher/watcher.py with a real config.json as a Windows scheduled task. Run the detector locally with OpenVINO on the Iris Xe; the HF Space stays on cpu-basic. Receipt: a test frame in watch.frames, then a full game.
(b) Scorebug OCR → nflverse play_id join. Every perceived play is auto-labelled from participation and FTN: formation, personnel, route, coverage, man/zone, pressure, time to throw, play action, motion, RPO.
(c) Pseudo-label frames with an open-vocabulary teacher (YOLO-World / Grounding-DINO + SAM2) and distill into YOLO11n/s football classes plus jersey OCR, on Kaggle's free GPU. Target recall ≥ 0.90 in piles.
(d) Motion-compensated tracking with a 10 fps burst. Keypoint homography from yard numbers and hash marks.
(e) Merge #1009 once CI is green.
CV features enter the pricer through the Lane 3 gate. Receipt: recall/precision on 200 hand-checked boxes, median tracklet life, homography reprojection error, Δ log loss.

LANE 17: Madden into coaching schemes (§3.4).
Import the Madden 26/27 playbooks as a private ontology (formation × concept × per-receiver route). Find the source and record its terms; store structure and names only, no EA art. Map every real play (nflverse plus CV) to its nearest concept and build team concept-frequency tables by situation and opponent coverage. These feed the coaching-scheme encoder.
Wire weekly Madden ratings as player priors through the existing 1810.08032 MPPV module. Test on backups and rookies first.
Capture Madden gameplay with known calls as synthetic CV training data.

LANE 18: Lake and forward archive (§3.1).
Turn pull_lake.py into scheduled jobs writing the as-of signal store:
- Alexandria nfl-com injuries (Wed/Thu/Fri/game day), rosters (daily), news (twice daily), CBS and startwho projections (weekly)
- ESPN summary/predictor, all leagues
- Kalshi game, spread, total and player markets (hourly on game days)
- Open-Meteo forecasts
- nflverse daily
Log credits per call in the manifest, with a hard credit budget per week. ESPN's predictor and Kalshi prices are not kept by their sources: archive them from today.

LANE 19: Outside-sports intelligence families (§3.1).
Build each as a signal family with source and observed_at: travel distance and time zones, circadian kickoff hour, altitude, short week and rest, referee crew tendencies, contract/incentive context, press-conference and beat-reporter text events, social/personal events, crowd/noise, prediction-market crowd, search-interest spikes. Every family goes through the Lane 3 gate with a placebo. Receipt per family: n, Δ log loss with CI, placebo result.

LANE 20: Activate what is already built, before building anything new (GSE_MASTER_INTEGRATION §5). One PR per item:
(a) Derive closing_lines from odds_line_snapshots: last pre-kickoff snapshot per book × market. Today the CLOSE phase covers only 60 of 299 NFL games and the closing_lines table has 0 rows. Then build the line-movement family (open→close, steam, book disagreement, time-to-close) for every sport.
(b) Fix the starved crons. game-weather-capture has written 10 rows per key. Find where prediction-market-snapshot, props-slate-shadow and engine-dfs-slate write; if the target is empty, fix the writer.
(c) Route the 122,548 PRODUCTION/HEALTH signals into the props and DFS encoders and through the Lane 3 gate.
(d) Run each of the 47 registry signals through the gate. Change wired_state only with a production caller plus a calibration row.
(e) Populate the knowledge graph (entities, entity_edges: player, coach, scheme, team, event) for the reasoner's retrieval.
(f) Extend prop capture beyond receptions and pass TDs to every player market on every book already ingested.
(g) Give every sport (MLB, NCAAF, MLS, NHL, NBA) its own replay with the same gate. NCAAF has 1.44M line snapshots.
Receipt per item: before/after row counts, the gate result, and the PR.

LANE 21: Joint distribution, phase 1 is the neighbourhood PMF already measured. Do not build a drive simulator this week.
Anchor it to the quoted spread and total (v3 §2). The test is game-blocked log loss against the book's alt spreads, alt totals and team totals at the same timestamp. Those prices are not in the live Neon snapshot. First step is capture, then the test. Kill if the interval covers 0 after 200 games. Do not pool targets and call the rows independent.

LANE 22: Line movement as a minute-by-minute grader (§A2).
From odds_line_snapshots, compute post-mint movement toward or away from the engine at sharp books. Add it as an auxiliary low-variance learning signal in the nightly refit.
Receipt: weeks needed to detect a fixed Δ log loss improvement, outcomes alone vs outcomes plus movement.

LANE 23: Multi-mint decision points (§A6).
Mint at Tuesday open, at each of Wed/Thu/Fri practice reports, Saturday status, inactives (about 90 minutes pre-kick) and the final pre-kick price. Grade each mint. Add an inactives feed; check the Alexandria nfl-com game endpoint first and record the result if it lacks inactives.

LANE 24: Live in-game engine (§A7).
Live win probability and live props from pbp plus CV, using the in-game modules already in packages/prediction-engine (2410.09068, 2601.07980). Weight earned on live 2026 data only.

LANE 25: Invalidator guards (§B), land with Lane 3:
(a) llm_cutoffs.json, and the gate refuses LLM-in-loop scoring before cutoff + 30 days
(b) PIT audit of every family. Pre-game QB comes from depth chart/injury vintage, not games.csv qb_id. Re-run the per-QB test this way and record the corrected number.
(c) FDR correction plus an untouched final holdout (2026 W5+ live)
(d) CLV graded at sharp books only

LANE 26: Decision layer (§D).
Portfolio selection with correlation and exposure caps, fractional Kelly on calibrated p with uncertainty shrinkage, and conformal abstention. DFS: projections plus projected ownership plus stack correlation, graded on projection error and contest results.

LANE 27: Engine memory (§E).
Write a structured autopsy into loss_autopsies after every graded game: wrong input / wrong weight / variance / missing family. Counts of the taxonomy become the family backlog. Populate entities and entity_edges for reasoner retrieval.

LANE 28: Signal-universe families not yet built (§C). One family per PR through G1–G3:
- travel and body clock
- altitude
- playoff-leverage simulator
- special teams
- turnover luck
- officials crews
- coverage-matchup encoder (participation coverage columns, currently 0 code files)
- OL continuity
- venue and crowd
- contracts and incentives
- coaching changes
- public attention

Final receipt: per lane, the files, tests, remote SHA, PR number, the metric with n and CI, what was excluded, and what was not done.

---

Grok bot, same night (separate agent): page the brief tree now. The three prerequisites are done. Read all 3,457 briefs, 1,115 fulltexts, the waves and the scored batches. Write one promotion-ledger row per item: arXiv id, card path, in-repo module or NOT IMPLEMENTED, license, duplicate flag, a held-out metric or "none stated", and which LANE above it would feed. Only items that state a held-out metric become build candidates. Commit to docs/research/2026-10-03/promotion-ledger/, then push. Report coverage as counts opened out of counts total.
