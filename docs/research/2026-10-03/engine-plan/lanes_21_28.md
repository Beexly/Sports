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
