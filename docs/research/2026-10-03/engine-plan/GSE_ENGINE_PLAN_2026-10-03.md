# GSE Engine Plan — 2026-10-03

Direction: GSE is a reasoning engine. It ingests every signal (on-field, off-field, injuries, depth, OL/DL, weather, books, cognition, nutrition, everything), reasons over them, and emits picks, props, parlays, fantasy/DFS and analysis. We grade the ENGINE on its own metrics, every output, every night, and the engine learns from every graded row. The close is a reference line on our charts. It is not the goal and not the gate.

Two targets:
1. The GSE scorecard: the engine's own accuracy and calibration, per market family, trending toward 100% (the direction we push; the measured curve is what we report).
2. The intelligence charts: (a) GSE's own learning charts, and (b) the public AI forecasting leaderboards where a reasoning engine competes against frontier models and superforecasters.

---

## 1. Measured today (receipts in this folder; nothing below is from memory)

Data: nflverse games.csv + pbp 2018–2026 (CC-BY), GSE prod Neon (read-only hermes_ro).
2026 so far: W1–W3 complete (48 games) + W4 TNF (1). 15 W4 games unplayed.

| # | Test | Result |
|---|---|---|
| M1 | Reference line, de-vigged close, 2006–2025 | Brier 0.198–0.238 per season, log loss 0.58–0.67. 2026 W1–4 (n=49): Brier 0.2347, ll 0.6634 (noisy early season). |
| M2 | Independent score-only Elo | Behind the close every season 2017–2025 (e.g. 2025 ll 0.6408 vs 0.6070). |
| M3 | Per-QB EPA/dropback (16-game rolling, keyed by passer_player_id, shrunk) on top of Elo, walk-forward 2022→2026 | Engine improves: ll 0.6392 → 0.6302 pooled, n=1,185 out-of-sample games. Reproduces the handoff's 0.633→0.625 claim. Every season except 2026 (n=49) improved. |
| M4 | Same QB feature added to the close | No lift: coefficient CI includes 0 in all 5 windows; pooled ll 0.6094 → 0.6111. Recorded, not a gate. |
| M5 | GSE prod NFL picks | 296 total. 54 preseason (no nflverse row). 208 lack trueProb. Only 29 regular-season picks are scorable (2026 W1–W4). |
| M6 | GSE prod NFL engine on those 29 | Brier 0.2417, ll 0.6769, mean p 0.603, hit 0.655. Pre-kick mint only (n=28): Brier 0.2359. |
| M7 | selectivePublishSweep on prod NFL (δ ∈ {0,.08,.10,.12,.15,.18}) | Unpowered. trueProb never reaches abs(p−0.5) ≥ 0.15. At δ=0.10 the shuffled-week placebo is as good or better 91% of the time → fail. The sweep must run on a replay, not on 29 rows. |
| M8 | Pending prod picks | Picks already exist for games in Nov, Dec and Jan 2027 (62 rows): minted before any injury or starter information exists. |
| M9 | Tracking feed for 2603.17866 | None. watch.games = 15 rows, 0 frames ingested. Paper not read, as instructed. |
| M10 | Known fail band (from grok exam contract) | confidence ≥ 0.80: claimed 0.8663, realized 0.5191, n=235. |

W4 test, sealed before kickoff: `w4_2026_sealed.json`, sha256 `d6e03aaf18cebd5ee0e940e710e9948208d610212acf013687448bb3b66b6d2e`, sealed 2026-10-03T05:30:20Z. 15 games, Elo + per-QB model. This is an internal pre-registration so Monday's grade is honest. It is not a public surface. Grade it Monday.

What this tells us:
- The engine's learning bottleneck is GRADED HISTORY, not ideas. 29 graded NFL rows cannot teach anything or support any chart. M5 is the biggest gap in the project.
- Reasoning-level signals measurably make the engine smarter (M3). That is the progress we chart.
- Compressed probabilities plus an overconfident ≥0.80 band (M6, M10) mean calibration is the first fix to make, before more signals.

---

## 2. The gaps, ranked by how much engine intelligence they unlock

G1. No replay (biggest). The engine has to run as-of on every historical game, 2018–2025 plus 2026 W1–4: features frozen at T−kickoff, the same code path as live, the same reasoning trace. That turns 29 graded rows into about 2,300 game rows per market family, plus props. Without it, learning, weighting, calibration and every chart are starved.

G2. No closed learning loop. The pieces exist (calibration seam #1011, fitted-weight caller, arbiter) but nothing grades every output nightly, refits, and promotes. "Learning every minute" has to mean: grade → refit walk-forward → challenger vs champion on held-out → promote if better → version stamp. It runs on a schedule, never on active picks.

G3. Calibration before sharpness. Fit a walk-forward calibration map (isotonic/beta, per market family) on replay rows, and kill the ≥0.80 band until the map says otherwise. The ranking already discriminates (MLB/all-sport audit 2026-09-30: 43% → 58% → 62% by band). The numbers are inflated.

G4. Signal-to-engine wiring with ablation. Every signal enters the engine with a measured contribution: engine log loss with vs without, walk-forward, plus a shuffled-week placebo. Per-QB EPA is the first one to wire (M3 says it earns its place). Then OL/DL (#1018), injuries/depth, weather, rest, coaching tendencies (tau), books as a feature (not a target).

G5. Props/DFS/fantasy grading. Same scorecard per player market: projection error (MAE/CRPS), over/under Brier, DFS lineup percentile. Player-level data (118k signals rows, snap counts, injuries) already exists.

G6. Reasoning trace that is graded. analyze() returns INVALID today. A trace must cite feed rows, name rejected facts, and be scored: did the reasons that moved p move it the right way? Reasoning quality becomes a chart, not prose.

G7. Far-future mints (M8). A pick for a January game made in September carries no starter or injury information. Withhold until a T−7d window, or tag it so it can never enter grading as if it were informed.

G8. Repo hygiene. 30 open PRs, most with red CI, and 40+ Sports-wt-* worktrees. Close or merge before new lanes, or every lane collides.

---

## 3. The intelligence charts

A. GSE engine charts. Generated from graded rows only. Every chart shows n and a 95% interval.
1. Learning curve: engine log loss and Brier by week, per family (ML, spread, total, props, DFS), across engine versions. The close is drawn as a reference line.
2. Reliability diagram: stated p vs realized, 10 bins, with ECE.
3. Signal contribution: Δ log loss for each signal (ablation), with the placebo next to it.
4. Reasoning score: share of outputs with a valid trace, and directional accuracy of the cited reasons.
5. Version ladder: champion vs challenger on the same held-out rows.

B. External AI forecasting leaderboards. This is how GSE gets onto an intelligence index. These rank systems by Brier on real-world events, against frontier models and humans:
- ForecastBench (FRI). Superforecasters ≈ 0.081 difficulty-adjusted Brier. FRI projected LLM–superforecaster parity for 2026.
- Prophet Arena. Live Kalshi markets, including sports. It now benchmarks end-to-end forecasting agents, so the GSE reasoning engine can enter as an agent.
- Metaculus FutureEval / AI benchmark bot tournaments. Quarterly, scored against pros.

Sports is the floor. The same ingest → reason → probability → grade loop, pointed at Kalshi/Metaculus questions, is what puts GSE on those charts. Entry order: Prophet Arena first (sports overlap), then Metaculus bot tournament, then ForecastBench.

---

## 4. Order of work

Done tonight: sweep on prod (M7, unpowered), per-QB vs close (M3/M4), tracking gate (M9), W4 sealed.
Unlocked now: paging the brief tree (3,457 briefs, 1,115 fulltexts, waves, scored batches). The three prerequisites are done.

1. Replay harness (G1). This blocks everything else that learns.
2. Calibration map on replay + retire the ≥0.80 band (G3).
3. Wire per-QB EPA into the engine with an ablation receipt (G4).
4. Nightly grade → refit → champion/challenger loop (G2).
5. Engine charts A1–A5 from graded rows (§3A).
6. Props/DFS scorecard (G5). Reasoning-trace grading (G6).
7. Prophet Arena agent entry (§3B).
In parallel: brief-tree promotion ledger (grok bot), PR/worktree cleanup (G8), far-future mint guard (G7).
Monday: grade the sealed W4 file.

Excluded on purpose: Glass Ledger (founder said no). No public accuracy claims until the charts carry n and intervals.
