# GSE Master Integration: how every piece works together (2026-10-03)

One loop. Every data source, the CV pipeline, Madden, the LLM reasoner, calibration, picks/props/DFS, grading, learning and the charts are wired into it. No piece lives in a side folder.

Rule of harmony: wiring is immediate, weight is earned. Each signal family goes live the day it is wired. The grader sets its weight from walk-forward results, every night, automatically. Nobody hand-sets a weight and nothing waits in shadow for a human.

## 1. The loop

1. INGEST. Every source lands in one as-of signal store. Each row carries source, entity ids (GSIS for NFL), event time, first-seen time (observed_at) and license.
2. ENCODE. Pretrained encoders compress raw signals into entity states: player, unit-vs-unit matchup, coaching scheme, situational context, team social/cognitive state.
3. PERCEIVE. CV turns broadcast frames into plays: formation, routes for every receiver, coverage shell, separation, pressure timing. These are labelled for free by nflverse charting, and Madden concepts give them names.
4. REASON. The LLM reasoner retrieves the slice of evidence relevant to each pick and writes a trace that cites rows and names the facts it rejected. It outputs structured adjustments and events, not a final number.
5. PRICE. The calibrated pricer combines the market offset, the encoders, the CV features and the reasoner's adjustments into p for ML, spread, total, props, DFS and fantasy. Weights are learned and shrunk; calibration is refit walk-forward.
6. DECIDE. The play selector ranks by the engine's deviation from the market and by confidence intervals, then emits picks, plays, props, parlays, DFS lineups and analysis. Each output carries its trace and a pre-kickoff timestamp.
7. GRADE. Every output is graded nightly against outcomes: Brier, log loss, calibration and hit rate per family, plus ablation and placebo for every signal family.
8. LEARN. Weights, the calibration map and encoder fine-tunes are refit. A challenger version replaces the champion only if its held-out log loss is better.
9. CHART. Learning curves, calibration charts, signal contributions, trace validity, and external leaderboard entries.

Existing Neon picks are frozen history. They are not settled, re-graded, tagged or used for training until the founder declares the engine complete. Grading runs on new engine outputs and on replays.
## 2. Measured today (backend tests, NFL 2018–2026 W1–4, walk-forward; nothing fit on its own test season)

| Test | Result |
|---|---|
| Market close, 2022–2026 W1–4 pooled (n=1,185) | log loss 0.6094, Brier 0.2110 |
| Elo alone | log loss 0.6392 |
| Elo + per-QB EPA16 | log loss 0.6302: QB is the strongest independent family |
| 33 flat features (team form, matchup, situational, QB, Elo), independent | log loss 0.6388, **worse than 2 features** |
| Ablation on the 33-feature engine (Δ log loss when the family is dropped; + means it helped) | QB +0.0050, Elo +0.0019, team form −0.0006, matchup −0.0002, situational −0.0027 |
| 33 features + market, ridge (market coefficient shrunk too) | log loss 0.6296, dilutes the market |
| Market as fixed offset + QB + Elo residual, shrunk | log loss 0.6102 vs close 0.6094 (Δ +0.0008): parity |
| Market offset + all 33 | Δ +0.0016 |

What this proves: flat signals plus a small label set make the engine dumber. Dumping signals in raw cannot reach a million; hierarchy, pretraining and an earned-weight gate are what get there. The right live form puts the market in as a fixed offset and lets the other signals learn only the deviations, each shrunk toward zero until the grader proves it.

Other facts measured today:
- Alexandria nfl-com/injury_report, 2026 REG W4 (5 credits): 313 player rows, GSIS id on 100%, per-day practice status, observed_at timestamp. 70 OUT, 58 QUESTIONABLE, 2 DOUBTFUL. QBs out: Mayfield (TB), C. Williams (CHI), J. Daniels (WAS). nflverse's projected starters already matched for those three games: an automatic feed-agreement check.
- nflverse participation 2025: 45,184 plays with route, coverage type (49% filled), man/zone, pressure, time to throw, formation and personnel. FTN charting 2025: 47,316 plays with play action, motion, RPO, blitzers, drops and catchable ball. defense_coverage_type appears in 0 code files: coverage is not wired.
- CV: YOLOv8n COCO person class, precision 1.00 / recall 0.74 on 57 people; tracklets fragment (median life 0.6–0.8 s); homography degenerate on yard-lines-only; the watcher is not running and there is no config.json, so 0 frames in watch.*.
- Hardware: the laptop is an i7-1255U with 32 GB and Iris Xe graphics. No NVIDIA GPU. Ollama has no models pulled.
- Madden: Stage 7 route-combination ontology (12 concepts) sits on PR #1009, not merged. The Madden-prior player value module (1810.08032) exists but is not wired.
- Firecrawl: 4,058 credits left this cycle. Alexandria covers nfl-com (injuries, rosters/depth, schedule, game, news, standings), espn-com (scoreboard, event, roster, player, standings, search, all leagues), cbssports and startwho (fantasy projections, rankings, injuries, weekly results). 5 credits per call.

More measured today (data pulled into the lake, then tested):
- Lake pull: 163 items, 0 failures, 370 Firecrawl credits (3,688 left). The lake now holds:
  - nfl.com injury reports for 2026 W1–W4: 182 / 251 / 301 / 313 rows, all with GSIS ids
  - 1,561 nfl.com team news articles (32 teams)
  - 32 nfl.com rosters with GSIS ids
  - W4 fantasy projections: 428 CBS (6 positions, PPR) and 273 startwho
  - 772 open Kalshi NFL markets (60 game, 408 spread, 304 total)
  - ESPN summaries for 16 W4/W5 games; 15 carry ESPN's Matchup Predictor (FPI)
  - 16 Open-Meteo venue forecasts
  - 39 nflverse files (46.7 MB): injuries 2018–25, snap counts 2018–26, participation 2018–25, FTN 2022–26, NGS passing/receiving/rushing, depth charts, weekly rosters, players, officials
- Injury availability signal: for each Out/Doubtful non-QB player, his snap share over the 4 games before the report week, summed by unit. 95.9% of the 9,415 report rows matched to snaps.
  - Independent engine, Elo+QB: log loss 0.6309 → 0.6286 with this signal. Signs are correct: more missing snaps means a lower win probability.
  - Market-offset engine: 0.6078 → 0.6072, against the close at 0.6070.
  - Each family that passes the gate moves the engine toward parity and beyond. This is the flywheel working, measured.
- ESPN's predictor is not retained after a game (it comes back null for 2025). Kalshi and the predictor have to be archived forward from today, or that history is lost.

## 3. Components, and how each one plugs into the loop

### 3.1 Ingest: the as-of signal store (feeds everything)
- One table shape: `signal(entity_type, entity_id, signal_family, name, value, event_time, observed_at, source, license, run_id)`. GSIS is the NFL spine (nfl.com, nflverse and rosters all carry it), with crosswalks for ESPN, PFR, FTN, Kalshi and the books.
- Nothing is read at a time later than its observed_at. That one rule makes every replay honest and every live pick reproducible.
- Feeds and cadence:
  - Firecrawl Alexandria (5 credits/call; about 3,688 left this cycle; a full W4 refresh costs about 370):
    - nfl-com injury reports: Wed/Thu/Fri plus game day
    - rosters/depth: daily
    - team news: twice daily, 32 teams
    - CBS and startwho projections: weekly
    - ESPN scoreboard/event, all leagues
  - Free direct feeds:
    - ESPN site API: summary, predictor, injuries, odds, play-by-play win probability, every league
    - Kalshi trade API: game, spread, total and player markets
    - Open-Meteo forecasts per venue
    - nflverse daily: pbp, participation, FTN, NGS, snaps, depth, injuries
    - The Odds API / books already in the engine
  - Outside sports intelligence, all timestamped:
    - travel distance and time zones crossed
    - circadian kickoff penalty (body-clock hour)
    - altitude, short weeks, bye-week rest
    - referee crew tendencies (nflverse officials)
    - coach press-conference language, beat-reporter and social text
    - contract and incentive context (games a player needs for a bonus)
    - family, legal and personal events in the news
    - stadium crowd and noise context
    - the public-betting and prediction-market crowd (Kalshi)
    - search-interest spikes
  - Every one of these is a signal family with a source and an observed_at. Every one goes through the same ablation gate.
- Archive forward, starting tonight: ESPN predictor, Kalshi prices, news text and injury snapshots. These sources do not keep their history; whatever isn't captured is gone.

### 3.2 Encode: pretraining, which is where a million signals become usable
- Pretrain on every play: nflverse pbp 1999–2026, 1,288,125 plays (measured, 28 seasons downloaded to the lake) × 372 columns, plus participation and FTN.
  - Objectives: next play, EPA, success, drive outcome, player stat lines.
  - Output: embeddings for each player, unit, coaching scheme and team-week.
- Fine-tune on graded games, props and DFS from the replay.
- Hold out 2025 and 2026 from pretraining entirely.
- Compute: the laptop has no NVIDIA GPU, so training goes to free GPUs:
  - Kaggle notebooks, about 30 GPU-hours a week
  - Colab free T4
  - HF ZeroGPU is for inference only

### 3.3 Perceive: computer vision, wired, optimized, fine-tuned
Current state: YOLOv8n COCO person class, recall 0.74. Tracklets fragment. Homography is degenerate. 0 frames ingested: the watcher has never run, and there is no config.json.
1. Get frames flowing first. Deploy watcher/watcher.py with a real config.json and register it as a Windows scheduled task. Run detection locally with OpenVINO on the Iris Xe, so there is no HF T4 spend. Keep the HF Space on cpu-basic as a fallback. The receipt is a test frame in watch.frames.
2. Free labels: join every perceived play to its nflverse play_id via scorebug OCR (quarter, clock, down, distance, yard line). Every broadcast play is then auto-labelled by nflverse participation and FTN:
   - formation and personnel
   - targeted route
   - coverage type, man/zone
   - pressure, time to throw, blitzers
   - play action, motion, RPO
   No hand labelling.
3. Fine-tune the detector into football classes: offense, defense, referee, ball, plus jersey-number OCR.
   - Pseudo-label captured frames with a large open-vocabulary teacher (YOLO-World / Grounding-DINO + SAM2) and distill into YOLO11n/s.
   - Train on Kaggle's free GPU.
   - Target: recall ≥ 0.90 in piles.
4. Tracking: motion-compensated association (BoT-SORT plus the ORB stabilizer already in the Space), with a 10 fps burst during live play.
5. Homography: field keypoints (yard numbers, hash marks, sideline intersections) from a small keypoint model trained on the same pseudo-labels, instead of yard-lines-only DLT.
6. What CV adds that nflverse does not:
   - routes for every receiver, not only the targeted one
   - pre-snap coverage shell and alignment
   - separation at the break
   - OL pass-block win time
   - charting for 2026 the same day the game is played, before FTN publishes
   All of this feeds the encoders and the pricer through the ablation gate like every other family.
7. Merge #1009 (Stage 7 ontology plus the formation→combination bridge) after CI is green.

### 3.4 Madden: an ontology, a prior and synthetic data
- Playbooks into coaching schemes. Import the Madden 26 and 27 playbooks as an ontology: formation × concept × route assignment per receiver.
  - Store names and structure only. No EA art or geometry is redistributed; the ontology stays private, consistent with the Stage 7 header.
  - Map every real play (nflverse route, formation and personnel, plus CV routes for all receivers) to its nearest Madden concept.
  - That gives each team a concept-frequency table by down, distance, field zone and opponent coverage. The coaching-scheme encoder replaces raw tau.
- Ratings as player priors. Weekly Madden ratings shrink noisy on-field estimates for low-sample players: backups, rookies, players returning from injury. This is the already-written MPPV / 1810.08032 module, now wired.
  - Today's W4 has several backup QBs (Keenum, Mariota, Jalon Daniels). This is exactly where the prior matters.
- Synthetic CV data. Madden gameplay captured with known play calls is labelled video for sim-to-real pretraining of the formation and route classifiers.

### 3.5 Reason: the LLM layer
- Per pick: retrieve the evidence slice (signals, encodings, CV plays, news events). Write k traces that cite rows and name rejected facts. Each trace outputs structured adjustments plus a confidence. The pricer turns adjustments into p; the grader decides how much the reasoner's adjustments are worth.
- Text → events: news, pressers and social text become structured, timestamped events (injury hints, role changes, motivation, locker room, coaching changes).
- Models: MiMo-9B on ZeroGPU for the live slate (40 GPU-min/day, shared). For bulk extraction, pull a small local model into Ollama (CPU only on this laptop, so slow) or use Kaggle's free GPU in batch.
- Reinforcement learning: episodes are full as-of evidence, and the reward is the outcome's log loss.

### 3.6 Price, decide, grade, learn, chart
- Pricer: the market as a fixed offset plus learned, shrunk deviations from every family, then a calibration map refit walk-forward. The same form serves ML, spread, total, each prop market, DFS and fantasy (per-player stat distributions).
- Decide: picks, plays, props, parlays (with a correlation model), DFS lineups (optimizing projected distribution against ownership) and analysis. All carry the trace.
- Grade: nightly, per family and per signal, with ablation and a shuffled placebo.
- Learn: refit weights and calibration nightly. The challenger replaces the champion only on better held-out log loss.
- Charts:
  - learning curve by week and version
  - calibration chart
  - signal-family contribution next to its placebo
  - trace validity
  - engine vs its last version, with the market as a reference line
- External leaderboards: Prophet Arena (Kalshi, sports overlap), Metaculus FutureEval, ForecastBench. They are the AI-intelligence charts for forecasting.

## 4. Live for Week 4, Sunday 2026-10-04

Champion for the day: market offset + QB + Elo residual + injury availability, shrunk. Measured backtest: log loss 0.6072 vs close 0.6070.
1. Saturday: refresh injuries and news (Alexandria), weather, Kalshi and the ESPN predictor. Resolve starters from the injury report crossed with nflverse projections; the feed-agreement check must pass.
2. Mint every W4 game's p with trace and observed_at before kickoff.
3. Plays: for now, publish only where |p − q| clears the CI bound. At parity there will be few or none; that is the honest state of a day-one champion. Props and DFS go through the same gate using the projections pulled today.
4. Sunday night: grade, refit and log the week on the learning curve. Every week after that adds 16 graded games plus props, and every new family wired joins the gate on the next refit.

Not done yet, and named: pretraining (3.2), CV labels and fine-tune (3.3), Madden import (3.4) and the reasoner (3.5) are build work starting now. They are not live today. Madden 26/27 playbooks need a source; the founder has said one exists, and the coding agent must find it and record its terms.

## 5. What is already built: status matrix (Neon prod + repo, read-only, 2026-10-03)

The repo already contains most of the loop; most of it is starved, unweighted or not live. Lane 20 activates what exists before anything new is built.

Scale:
- 21 packages; 231 top-level prediction-engine modules; 31 scheduled crons.
- Neon: 135 tables, 34 with rows (4.2M rows total), 101 empty.

| Asset | Rows / state | Wired | Weighted | Calibrated | Tested | Live |
|---|---|---|---|---|---|---|
| odds_line_snapshots (13 books, OPEN/INTERIM/CLOSE, Aug 19 → now) | 3,499,830; NFL 1,104,900 across 299 games | yes | no | no | no | ingest only |
| NFL CLOSE-phase snapshots | 60 of 299 games | partial | | | | |
| closing_lines table | **0**, even with 3.5M snapshots | starved | | | | |
| NFL player-prop snapshots | 2 markets only (receptions, pass TDs), 3 books | thin | no | no | no | no |
| signals (PRODUCTION 115,458 / HEALTH 7,090; pgs.*, ngs.*, injury.availability) | 122,548 | yes | no | no | no | no |
| intelligence/signals/registry.json | 47 signals: wired_state no=46, partial=1 | registry only | priors=1.0 | no | no | no |
| game_signals | weather 10 rows per key (cron runs 3×/day); schedule density 2,674 | starved | | | | |
| player_game_stats / snap_counts / injuries / next_gen_stats / depth_chart_entries | 35,536 / 31,100 / 7,093 / 2,867 / 2,274 | yes | no | no | no | no |
| team_game_efficiency | 668 | yes | partial | | | |
| prediction-market-snapshot cron | no populated market table found | starved? | | | | |
| props-slate-shadow / engine-dfs-slate / arbiter crons | no populated output tables found | shadow | | | | |
| empty but designed: historical_games, team_week_stats, team_game_logs, pfr_adv_stats, player_rush_profiles, gse_player_sentiment, entities + entity_edges (knowledge graph), shadow_signals, film_shadow_ledger, watch_plays + watch.frames/tracklets/field_positions/derived_metrics, gse_ml_experiments, calibration_proposals, loss_autopsies, pick_memories, model_journal_entries | 0 | schema only | | | | |

Under-leveraged, and worth more than any new source:
1. **3.5M line snapshots.** Opening line, movement, steam, book disagreement and time-to-close, across 13 books and every sport. Derive closing_lines from them now (CLOSE phase exists for only 60 of 299 NFL games), then expose movement as a signal family.
2. **122k player signals** (target share, EPA, NGS separation/CPOE/YAC, availability). These are the props and DFS encoders' inputs. Today they feed nothing that is weighted.
3. **The 47-signal registry.** Each entry goes through the Lane 3 gate. wired_state changes only with a production caller plus a calibration row.
4. **The empty knowledge graph** (entities, entity_edges). This is where player–coach–scheme–team–event relations live for the reasoner's retrieval.
5. **Props.** Only 2 prop markets are captured. Extend the odds pull to all player markets the books offer (yards, attempts, anytime TD, longest) on every book already ingested.
6. **Every sport.** MLB 2,639 picks, NCAAF 829, MLS 385, NHL 67, NBA 55, NFL 296. NCAAF has 1.44M line snapshots, more than NFL. The loop is sport-agnostic. Each sport gets its own replay (Retrosheet/Statcast for MLB, cfbfastR for NCAAF, NHL/NBA public APIs) and the same gate.
