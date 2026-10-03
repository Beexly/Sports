You are a second, independent chief architect red-teaming the GSE plan below. GSE is a reasoning sports prediction engine (picks, props, parlays, fantasy/DFS, analysis). The founder's direction: ingest every signal (on the field, around the game, outside the game), reason over it, emit picks/props/DFS, grade the engine on its own metrics, and learn continuously toward maximum accuracy. Constraints: zero/low cost compute, existing Neon prod picks are frozen history, the market close is a reference line rather than the target.
Be concrete and blunt. Do not restate the plan. Output:
1. The 10 most important things the plan is still MISSING (signals, data sources, methods, infrastructure, evaluation, product), each with why it matters and the first build step.
2. What is WRONG or mis-prioritized, and the fix.
3. Hidden invalidators beyond the six listed in §B.
4. Specific named datasets, APIs, open models or papers (real ones you are confident exist) that GSE should use and is not.
5. The single change that would most raise the engine's accuracy in the next 30 days.
6. Anything in the coding-agent kit (§G) that will cause agents to collide, stall, or game the metric.
=== PLAN DOCUMENTS ===


##### GSE_MASTER_INTEGRATION_2026-10-03.md
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


##### GSE_20K_REVIEW_2026-10-03.md
# GSE 20,000-ft review: blind spots, under-leverage, and the kit that lets coding agents work head-down (2026-10-03)

This pass ignores the lane list and asks four questions:
- What limits the engine?
- Where is the information we aren't using?
- What will quietly invalidate our results?
- What do coding agents need so they never have to make a design decision?

## A. The binding constraint is labels, not signals. Multiply them.

We measured it today: 33 flat features made the engine worse than 2. With about 2,300 graded games, every new signal is drowned by noise. More signals only help once there are more labels and a structure that shares strength across them. Seven ways to get more labels:

A1. Every game is hundreds of graded targets, not one. ML, spread and total are just the start. Add:
- team totals, halves and quarters
- first score, drive outcomes, play outcomes
- every player stat line (yards, receptions, attempts, TDs, sacks, tackles)
- fantasy points and DFS scores

Estimate, not measured: about 250 or more gradeable targets per game against today's one. Build ONE joint model per game: a score/drive simulator, or a bivariate points distribution plus player-share models. Every market is then read off the same distribution. Benefits:
- markets can never contradict each other (ML vs spread vs total vs props)
- parlays and same-game parlays are priced with the real correlation
- the calibration machinery learns from about 100x more rows

This is the biggest single unlock, and it is what "picks + props + parlays + fantasy + DFS from one engine" means mechanically.

A2. Line movement is a grader that runs every minute. An outcome is one noisy bit per game. The line moves dozens of times between the open and the close as information arrives (3.5M snapshots are already in Neon). Use the post-mint movement of the line as an auxiliary, low-variance grading signal: "did the market later move toward the engine's number?" This is how the engine learns every minute without waiting for Sunday.
- It is a learning signal, not a product claim.
- Test: how many weeks to detect a fixed Δ log loss improvement using outcomes alone vs outcomes plus movement. Measure it on the snapshots.

A3. High-volume sports train the shared machinery. MLB plays about 2,430 games a season, NCAAF has 130+ teams, the NBA and NHL about 1,300 each. Calibration maps, the gate, the reasoner prompt policy, the abstention logic and the CLV machinery transfer across sports. Train and validate that machinery where labels are plentiful, then apply it to the NFL.

A4. Play-level pretraining (Lane 12): 1,288,125 NFL plays, measured. Today's test: a simple opponent-adjusted team rating added nothing (0.6342 → 0.6340). So the encoder must be player- and matchup-level (QB vs pass rush, WR vs CB coverage type, OL vs DL), not team averages. The free data for that already sits in the lake: participation coverage/route/pressure, plus FTN charting.

A5. Simulation. A drive simulator calibrated on plays produces full outcome distributions, including situations rarely seen (backup QB in wind, short week after OT).

A6. Pre-game decision points as separate labels. Every game has several information moments:
- Tuesday open
- Wednesday/Thursday/Friday practice reports
- Saturday status
- inactives about 90 minutes before kickoff
- the final pre-kick price

Mint at each moment and grade each mint. The engine learns what each moment adds, and when to publish.

A7. In-game is where computer vision pays. Pre-game, the market has days to absorb news. In-game, the information is seconds old: fatigue, an injury walk-off, scheme change, pressure rate, coverage shell. Point CV's main product at live win probability and live props, with weight earned on live data. The repo already has in-game event-dynamics modules (2410.09068, 2601.07980).

## B. Hidden invalidators (any one of these makes a result fake)

B1. LLM memorization. Every frontier and open model was trained on text that includes 2018–2025 results, recaps and box scores. An LLM reasoner "replayed" on those seasons is reading the answer key. Rules:
- Any test that puts an LLM in the loop scores only on games after that model's training cutoff. In practice that means the 2026 season, plus a cutoff check per model.
- Anonymize team, player and date in pre-cutoff prompts. This does not fully fix it; it is only a fallback.
- Non-LLM components (encoders, pricer, gate) may use the full history.

B2. Point-in-time truth. Historical feeds are revised. nflverse games.csv qb_id for past games is the actual starter, not the pre-game expectation. That leaks into our own per-QB test. Today's QB result (+0.009 log loss vs Elo) is an upper bound until the starter comes from the pre-game depth chart or injury report.
- Same issue for depth charts, injury designations and roster status.
- Rule: every stored signal carries observed_at. The replay uses vintage data only. Where no vintage exists, the family is marked PIT-UNSAFE and tested only forward.

B3. The bar moves with the slice. The close's log loss varies by season (0.589–0.627) and by slice (2026 W1–4 at 0.663). Always compare on identical rows with paired CIs. Never compare against a number from a different sample.

B4. Multiple testing. The corpus holds 1,000+ candidate builds. Testing hundreds of families against one replay finds winners by chance. The gate needs:
- a placebo for every family
- a false-discovery correction across families tested in the same window
- a final untouched holdout: 2026 W5+ live, never used to choose anything

B5. Overlapping labels. Parlays, same-game props and correlated markets share outcomes. Grade them with the joint distribution (A1), never as independent bets.

B6. Our own feedback loop. Once GSE publishes, our picks may move lines at small books. Grade CLV against sharp, high-limit books only.

## C. The signal universe: every item, with where it comes from and whether we can test it

Status: L = in the lake/DB today, W = wired in code, T = tested today, — = not yet. PIT = point-in-time safe. FWD = can only be graded forward (no historical vintage).

ON THE FIELD
| Family | Items | Source | Status |
|---|---|---|---|
| QB | EPA/dropback, CPOE, time to throw, pressure-to-sack, under-pressure EPA, scramble rate | nflverse pbp, NGS, participation | L, T (QB EPA16) |
| Pass rush vs pass pro | pressure rate, pass-rush win proxies, sacks/hits, OL continuity (snaps together), OL injuries by position | participation, snap counts, injuries | L, — |
| Coverage | man/zone, coverage shell (C0–C6) by situation, CB vs WR matchups, separation | participation, NGS receiving, CV | L (2016–2025), — (0 code files) |
| Routes/concepts | route by receiver, concept frequency vs coverage, play action, motion, RPO, screens | participation, FTN, Madden ontology, CV | L, — |
| Run game | rush EPA, defenders in box, gap scheme, RYOE | pbp, NGS rushing, participation | L, — |
| Situational play-calling | PROE, 4th-down aggressiveness, 2-min tempo, red zone mix, timeouts | pbp, intelligence/coaching (tau) | L, W (tau) |
| Special teams | FG% by distance/weather, punt/kick EPA, returns | pbp | L, — |
| Turnover luck | fumble recovery rate, INT-worthy vs actual INTs, drops | pbp, FTN | L, — |
| Penalties | team rates, crew rates | pbp, officials | L, — |

AROUND THE GAME
| Family | Items | Source | Status |
|---|---|---|---|
| Availability | Out/Doubtful/Questionable × snap share, practice trend, IR returns, rust, inactives | nfl.com (Alexandria), nflverse injuries 2009–2025 | L, T (+0.002 indep) |
| Depth/roles | starter changes, snap share trend, target/route share | depth charts, snap counts, rosters | L, — |
| Rest/schedule | rest days, short week, bye, TNF, London/International, post-OT fatigue, plays defended last game | games.csv, pbp | L, partial |
| Travel/body clock | miles, time zones crossed, body-clock kickoff hour (West teams at 1pm ET), altitude | computable from venues | —, FWD-safe and PIT-safe |
| Weather | forecast vs actual wind/temp/precip, roof open/closed, surface | Open-Meteo, games.csv | L (W4 only), starved in Neon (10 rows) |
| Venue/crowd | home edge by stadium, travelling fan share, attendance, noise | stadium data, ticket resale prices | — |
| Officials | crew penalty and pace tendencies | nflverse officials | L, — |
| Market | open/close, move timing, steam, book disagreement, limits, exchange vs book, Kalshi/Polymarket crowd | Neon 3.5M snapshots, Kalshi | L, CLOSE phase only 60/299 games |
| Experts | CBS/startwho projections, ESPN FPI, sharp X accounts graded on their own record | Alexandria, ESPN, X sweep in repo | L (W4), FWD |

OUTSIDE THE GAME
| Family | Items | Source | Status |
|---|---|---|---|
| Motivation/leverage | playoff-odds leverage of this game, elimination, rest-starters risk (W17–18), rivalry/division, revenge, lookahead/letdown spots | season simulator over schedule | —, PIT-safe (computable) |
| Coaching | hot seat, coordinator change, play-caller change, new staff learning curve | news, nflverse coaches | partial |
| Contracts | contract-year players, incentive thresholds near season end, holdouts | public contract sites (check terms) | — |
| Personal/cognitive | bereavement, birth of child, illness (flu through a locker room), legal issues, reported conflict, trade-deadline distraction | news, beat reporters, X; LLM-extracted events | archive starting, FWD |
| Team text | pressers, beat reports, injury language ("week-to-week" vs "day-to-day"), coach quotes | nfl.com news (1,561 articles pulled), X, team sites | L (today), FWD |
| Public attention | search-interest spikes, betting handle/ticket splits where public | Google Trends, public splits | — |
| Organizational | ownership/front-office turmoil, GM change, roster churn | news | FWD |

## D. Decision layer (where accuracy becomes picks)

- **Portfolio, not threshold.** Choose plays jointly: correlation across same-team and same-game legs, exposure caps, fractional Kelly on calibrated p with uncertainty shrinkage.
- **Abstain by design.** Conformal or interval-width gating per market family. "No play" is an output.
- **Consistency.** All published markets for a game come from one distribution (A1).
- **DFS is a game-theory problem.** Projections plus projected ownership plus correlation (stacks). Edge comes from leverage against the field, not only from accuracy. Grade both projection error and contest results.
- **Fantasy.** Rest-of-season projections and waiver value come from the same player encoders.

## E. Engine memory and self-critique

- **Autopsies.** loss_autopsies, pick_memories and model_journal_entries are empty tables in Neon. After every graded game, the reasoner writes a structured error taxonomy: wrong input (stale or late data), wrong weighting, variance (correct p, unlucky outcome), or missing family. The taxonomy counts become the backlog that tells us which family to build next. The engine directs its own research.
- **Knowledge graph.** entities and entity_edges are empty. Populate player–team–coach–scheme–injury–event edges so the reasoner can retrieve "everything connected to this game."

## F. External intelligence leaderboards

Prophet Arena first: it uses Kalshi markets and includes sports. The same ingest → reason → price agent, pointed at general news, then enters the Metaculus FutureEval bot tournament and ForecastBench. Expect sports-only knowledge to be weak on non-sports questions. A general news ingest is a separate family to build.

## G. The coding-agent kit: contracts that remove every design decision

Coding agents wire and test. They do not choose schemas, metrics or thresholds. Everything they need is below. If something is not covered here, they stop and comment on the card.

### G1. Signal contract (one shape for every family, every sport)
Use the EXISTING Neon table `signals` (122,548 rows today). Do not create a parallel store. Mapping:
- `entityType`: game | team | player | official | venue | coach | market
- `entityId`: canonical id. NFL players use GSIS ids; teams use nflverse abbreviations (LA, LV, LAC, WAS, JAX, ARI).
- `key`: `<family>.<name>`, e.g. `availability.off_snap_share_out`
- `category`: the family group (ON_FIELD | AROUND | OUTSIDE | MARKET | PERCEPTION | TEXT)
- `value` / `valueRaw`
- `capturedAt`: event time the value describes
- `fetchedAt`: observed_at, when GSE first knew it. This is the as-of key; the replay filters on fetchedAt < mint time.
- `sourceId`, `rightsSnapshot`: source and license at fetch time
- `season`, `week`

Each producer ships 4 things:
- `produce(asOf, scope) -> rows`
- a registry entry in intelligence/signals/registry.json (family, PIT-safe yes/no, source, license, owner lane)
- a unit test that fails if any row has fetchedAt > asOf
- a backfill script for history, when a PIT-safe vintage exists

### G2. One gate, one scorer (nobody writes their own metric)
The harness lives at intelligence/gate/. Seed it from the scripts in docs/research/2026-10-03/engine-plan/ (offset_engine.py, injury_signal.py, perqb.py). If PR #914's frozen-holdout harness is greener, rebase it. One PR decides which, and no lane forks it.

Interface: `gse-gate --family <f> --sport nfl --target <ml|spread|total|prop:<stat>|dfs> --window 2019-2026W3`

It runs the steps below for both engines (independent, and market-offset) and writes a receipt:
1. Walk-forward, with lambda chosen on T-1 only.
2. Shuffled-time placebo (200 draws).
3. FDR correction across all families tested that week.
4. Paired CI on Δ log loss against the current champion on identical rows.

Receipt path: docs/receipts/<sport>/<family>/<yyyy-mm-dd>.json. Fields: family, version, n, window, Δll with CI, Δbrier, ECE, placebo fraction, FDR q, PIT-safe flag, LLM-in-loop flag and model cutoff, and the git SHA.

Weight rule: nightly refit sets weights from the gated families only. A family with q > 0.10 or placebo fraction > 0.2 stays wired at weight 0. It is re-tested automatically as data grows. This is "wired immediately, weight earned."

### G3. Definition of done for any family
1. The producer writes `signals` rows with fetchedAt, the leakage test passes, and it is registered.
2. History is backfilled where PIT-safe, otherwise marked FWD.
3. A gate receipt is committed (pass or fail; a fail is still done).
4. It runs in the nightly refit, at weight 0 if it failed.
5. It appears on the chart: signal-contribution bars with the placebo band.
6. Its monitoring alert fires if the producer writes 0 rows on a day it should write.

### G4. Directory ownership (prevents collisions)
| Lane | Owns | Must not touch |
|---|---|---|
| 0 go-live | intelligence/champion/, the champion mint job | publish path internals beyond the champion hook |
| 1 replay | intelligence/replay/ | the prod picks table (frozen) |
| 2 calibration | packages/prediction-engine/src/calibration/ | CALIBRATION_ADJUSTMENTS flag (founder) |
| 3 gate | intelligence/gate/, docs/receipts/ | producers |
| 12 encoders | intelligence/encoders/ | the pricer |
| 13/19 text and outside families | intelligence/families/<family>/ | each other's family dirs |
| 16 CV | watcher/, packages/prediction-engine/src/perception/, the HF Space | pricer |
| 17 Madden | intelligence/ontology/madden/ | EA assets (structure and names only) |
| 18 lake | intelligence/lake/, cron routes for ingestion | engine code |
| 20 activate-existing | the specific starved cron or table it fixes | anything else |
| 21 joint distribution | intelligence/joint/ | per-market pricers (it replaces them via the gate) |

Hotspot rule: if two lanes need one file, the second lane comments `hotspot: <path>` and waits.

### G5. Model-cutoff registry (for invalidator B1)
intelligence/gate/llm_cutoffs.json maps every LLM GSE calls to its published training cutoff. The gate refuses an LLM-in-loop receipt that scores any game before the cutoff plus a 30-day margin.

### G6. Order (dependencies only; everything else runs in parallel)
- **Before kickoff:** Lane 0 runs first, in time for 2026-10-04 kickoffs.
- **Gate first:** Lane 3 (gate) and the G1 contract land before any family receipt. Families can be built in parallel, but receipts wait for the gate.
- **Replay feeds calibration:** Lane 1 (replay) feeds Lane 2 (calibration) and Lane 21 (joint distribution).
- **Lake feeds families:** Lane 18 (lake) feeds lanes 13/19.
- **CV path:** Lane 16 CV (a) → (b) labels → (c) fine-tune.
- **Reasoner last:** Lane 14 (reasoner) waits for Lane 3 and the B1 registry, and is tested on 2026 only.


##### FORWARD_PROMPT_2026-10-03.md
# Forward prompt: GSE engine, one run, many lanes (2026-10-03)

Paste this whole block to the coding agent (Hermes / Codex / Claude Code on Beexly/Sports). One command. The lanes are independent unless marked.

---

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

LANE 10: Grade W4 (Monday 2026-10-06).
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

LANE 0: Go live for W4, Sunday 2026-10-04 (do this first; GSE_MASTER_INTEGRATION_2026-10-03.md §4).
Champion = market as a fixed offset + per-QB EPA16 + Elo residual + snap-weighted injury availability, shrunk, with a walk-forward calibration map. Backtest: log loss 0.6072 vs close 0.6070.
Saturday: refresh nfl-com injuries, team news, weather, Kalshi and the ESPN predictor. Resolve starters from the injury report crossed with nflverse projections; this feed-agreement check must pass. Mint p, trace and observed_at for every W4 game before kickoff. Publish a play only where |p − q| clears its CI bound. Grade Sunday night and refit. Do not touch existing Neon picks.

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

LANE 21: Joint distribution engine (20K review §A1).
One model per game: a score/drive simulator, or a bivariate points distribution plus player-share models. ML, spread, total, team totals, halves, quarters, every player prop, fantasy and DFS are all read off that one distribution, so markets never contradict each other. Same-game parlays use the model's real correlation.
Test: the gate on every target. Calibration is learned on the pooled targets (about 100x the rows).

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
