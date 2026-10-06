# [0217] Simulating Tracking Data to Advance Sports Analytics Research (arXiv:2503.19809v1)

**Citation:** David Radke, Kyle Tilbury (2025). *Simulating Tracking Data to Advance Sports Analytics Research*. Proc. of the 24th International Conference on Autonomous Agents and Multiagent Systems (AAMAS 2025), Demo Track, Detroit. arXiv:2503.19809v1. URL: https://arxiv.org/abs/2503.19809
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 345 lines; complete — it is a short demo paper).
**Verdict:** ADAPT (modest) — no new science, but the *practice* is directly useful to GSE: prototype tracking-data models on **simulated** tracking data when the licensed data (NFL NGS) is gated, expensive, or rate-limited. The entity-schema design and the event/stint extraction pipeline are a reusable template for GSE's own NGS tracking-data store and feature extraction.

## 1. Research question
A demo paper, not a research contribution: can simulated tracking data from the Google Research Football (GRF) RL environment substitute for real tracking data in developing sports-analytics models? Motivation: tracking data (player/ball positions multiple times per second) is locked behind league/team/broadcaster/gambling-company access, while event (play-by-play) data misses the full game state. The demo: (1) record GRF headless state as entity rows in a real-tracking-like schema, (2) extract events (passes, receptions, shots, turnovers, interceptions) and stints (continuous gameplay segments), (3) show xG and pitch-control models built on the simulated data behaving as they do on real data.

## 2. Dataset / schema
Pre-collected dataset: **3,000 simulated GRF soccer games** (Radke & Tilbury 2024, Google Drive). Schema (analogous to Omidshafiei et al. 2022): each game = 3,000 timesteps; each timestep = 23 rows (22 agents + ball) with entity ID, x/y/z center-of-mass coordinates, team affiliation, role (one of 8 position types), velocity; plus a boolean ball-possession flag extracted from the environment. GRF headless state ≈ real center-of-mass tracking. Limitations admitted: no pose estimation, some omitted ball possessions, edge cases in event extraction.

## 3. Method / model
- **Collection:** GRF headless state → entity-row schema.
- **Event extraction:** rule-based from raw tracking — passes/receptions (possession transfer to teammate), turnovers/interceptions (to opponent), shots (ball moved in attacking direction + goal / out beyond goal line / to opposing keeper). **Stint identification:** automatic segmentation of continuous gameplay with unique IDs.
- **xG demo:** logistic regression on shot polar coordinates (angle + distance from center of opposing goal), all shots aligned to attack the right goal. Result: monotonic decline of scoring probability with distance and angle — consistent with real-soccer xG (Spearman 2018).
- **Pitch-control demo:** per-timestep probability that each team would recover the ball at any pitch location, from player positions/velocities + ball travel speed + control time (Voronoi + physics, Spearman et al. 2017). Visualized as blue/red probability field with the ball-carrier highlighted.
No training details (demo); no hyperparameters reported beyond the model forms.

## 4. Equations & assumptions
No numbered equations (demo paper). Model forms stated in words: xG = logistic regression P(goal | polar shot coordinates); pitch control = P(recovery | player positions, velocities, ball travel speed, player control time). **Assumptions:** GRF agent behavior is a sufficient stand-in for real player behavior for *model development* (not for calibration to real outcomes); center-of-mass coordinates suffice (no pose); 8 discrete roles capture team structure; rule-based event extraction approximates real event definitions.

## 5. Features / target
xG: shot angle + distance (polar coords from goal center). Pitch control: 22 player (x, y, vx, vy, role) + ball (x, y) per timestep. Targets: goal/no-goal; per-location team possession probability. Feature engineering is the point: events and stints are *derived* from raw tracking via the extraction pipeline.

## 6. Validation design
Qualitative/consistency validation only: xG surface shows the expected monotonic decline (matches real-data literature); pitch-control field looks sensible on a sample timestep. No train/test splits, no metrics, no baselines vs real data — it is a demo track paper. Validation = "established models behave plausibly on simulated data."

## 7. Numerical results / baselines
No numerical results reported. The "results" are two figures: (1a) xG probability surface over shot locations (darker red = higher P(goal), declining with distance/angle); (1b) one pitch-control frame. No tables, no metrics.

## 8. Code / data availability
Code and pre-recorded 3,000-game dataset released (repository + Google Drive links in the paper; demo video linked). GRF itself is open (Kurach et al. 2020).

## 9. Leakage & limitations
- GRF agents are RL bots, not humans — behavioral realism is limited; any model *calibrated* on this data does not transfer to real games, only the *model architecture and pipeline* do. The authors are clear about this framing.
- No pose data; event extraction has edge cases; some possessions missed.
- Soccer only; no NFL analogue exists in the paper. An NFL version would need a football simulator (GRF has no American-football equivalent of comparable maturity in the paper).
- Demo-level rigor: no quantitative comparison of simulated vs real data distributions.

## 10. GSE overlap
GSE's standing directive makes **NFL Next Gen Stats tracking data** "one of the single most important things" in the operation, and the repo already inventories tracking-derived metrics (the existing-research map §2 lists NGS-adjacent tracking material; the 2026-09-18 benchmark sweeps mined NGS tables). What does NOT exist in the corpus: a practice for **prototyping tracking-data models without the licensed feed** — this paper's core move. xG and pitch control themselves are inventoried concepts (expected-goals analogues); the entity-schema + event/stint extraction pipeline is the portable engineering artifact.

## 11. GSE implementation spec
Use the paper's practice, not its models:
1. **Simulation-first prototyping lane:** when NGS access is rate-limited or a new tracking-data feature is being designed (e.g., receiver-separation-at-target models, pass-rush pressure fields, "field control" analogues of pitch control for route combinations), prototype the model architecture and the full extraction pipeline on simulated tracking data first, then port to real NGS. For soccer-equivalent validation the paper shows even RL-bot data suffices for architecture debugging.
2. **Entity schema template:** adopt the paper's storage pattern for GSE's own tracking store — one row per entity per timestep (player/ball ID, x/y, team, role/position, velocity, possession flag), stints as first-class segment IDs. This is directly implementable on NGS CSVs and matches how the repo's NGS work is structured.
3. **Event/stint extraction:** port the rule-based event extractor concept to NFL — derive events (target, catch, pressure, missed tackle) and stints (plays/drives) from raw NGS frames so downstream models consume a stable event layer rather than raw frames.
4. Effort: ~1 week for the schema + extraction layer on existing NGS data; simulation lane only if a usable football simulator is identified (investigate before committing — no GRF equivalent for football is established in the paper).

## 12. Reproducible test
On GSE's existing NGS sample: implement the entity-row schema + a rule-based play/stint segmenter; verify that a logistic expected-completion model (target probability ~ P(catch | separation, distance, pressure)) trained on the extracted events reproduces the known monotonic relationships (completion falls with target depth, rises with separation). Success = the extraction pipeline runs end-to-end and the sanity-check model matches established NFL tracking relationships. This tests the pipeline, not the simulation.

## 13. Acceptance / rejection gate
**Adopt** the entity-schema + event/stint extraction layer for GSE's NGS pipeline if the reproducible test passes (it is pure engineering with no downside). **Adopt** the simulation-first prototyping lane only after identifying a football simulator with adequate behavioral realism — do not assume GRF's soccer result transfers to NFL without that evidence. **Reject** any use of simulated data for *calibrating* production model parameters; simulation is for architecture/pipeline development only.

## 14. Improvement experiment
Close the paper's admitted gap quantitatively: compute distribution-similarity metrics (e.g., MMD on player-velocity and spacing distributions) between the simulated data and real NGS frames, and measure how far a model trained on simulated data degrades when evaluated on real data (sim-to-real gap). For GSE this turns the demo's hand-wavy "behaves plausibly" into a measured transferability score that gates which model classes are safe to prototype in simulation.
