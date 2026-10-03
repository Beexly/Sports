# Forward prompt: GSE engine, one run, many lanes (2026-10-03)

Paste this whole block to the coding agent (Hermes / Codex / Claude Code on Beexly/Sports). One command. The lanes are independent unless marked.

---

You are building the GSE reasoning engine on Beexly/Sports. GSE ingests every signal, reasons over it, and emits picks, props, parlays, fantasy/DFS and analysis. We grade the engine on its own metrics: log loss, Brier, ECE, hit rate, projection error. The engine learns from every graded row. The de-vigged close is drawn as a reference line on charts. It is not the target and not a merge gate. Never claim we beat it.

Ground truth before you start (measured 2026-10-03, receipts in docs/research/2026-10-03/engine-plan/):
- Prod NFL has 29 scorable graded picks. That is the bottleneck. The engine cannot learn from 29 rows.
- Per-QB EPA/dropback (16-game rolling, passer_player_id, shrunk to −0.05 with 150 pseudo-dropbacks) improves the independent engine: walk-forward log loss 0.6392 → 0.6302, n=1,185. Wire it.
- Confidence ≥ 0.80 claimed 0.8663 and realized 0.5191 (n=235). trueProb is compressed (never reaches abs(p−0.5) ≥ 0.15).
- No tracking feed exists (watch.games 15 rows, 0 frames).
- 62 prod NFL picks exist for Nov–Jan games, minted before any starter or injury info.
- Glass Ledger is out. Do not build it.

Rules: re-fetch origin/main first. One PR per lane, on a feature branch. git push -u origin <branch> after every commit. If it is not on origin, it did not happen. CI green before merge. Walk-forward only: no fit may see its own test season. As-of features only: nothing timestamped after kickoff. Every metric carries n and a 95% interval. Shuffled-week placebo on every new signal. No runtime fit on active picks. Do not flip MODEL_VERSION, CALIBRATION_AUTO_PUBLISH or STATS_PUBLIC without a receipt in the PR. Do not touch #1018 or #1019 except to land them.

LANE 1: Replay harness (blocks 2, 3, 4, 5).
Build packages/prediction-engine replay: run the live engine path as-of T−90min for every NFL game 2018–2025 and 2026 W1–4, using nflverse games/pbp/injuries/depth/snaps (CC-BY, attribute). Same code as live, no fork. Write graded rows to a replay table or parquet: game_id, family (ML/spread/total), p, as-of feature hash, trace verdict, outcome, close q (reference only). Receipt: row counts per season and family, plus proof that no feature timestamp is after kickoff.

LANE 2: Calibration map (needs 1).
Fit isotonic and beta maps per family, walk-forward by season, on replay rows. Pick by held-out log loss. Retire the ≥0.80 band unless the map supports it. Receipt: reliability diagram per family, ECE before and after, n.

LANE 3: Signal wiring with ablation (needs 1).
Wire per-QB EPA into the independent engine first. Then, one at a time: OL/DL (#1018 once merged), injuries/depth, weather, rest, coaching tau, book features. For each: engine log loss with vs without (walk-forward), the placebo, and the Δ with its CI. A signal earns weight only when its engine Δ CI excludes 0 on held-out seasons. Receipt: a signal contribution table.

LANE 4: Learning loop (needs 1, 2).
Nightly job: grade every settled output (picks, props, DFS), append to graded rows, refit calibration and weights walk-forward, run champion vs challenger on the same held-out window, promote only if the challenger wins on log loss and the placebo fails. Version-stamp every promotion. Receipt: the first two nightly runs with promotion decisions.

LANE 5: Engine intelligence charts (needs 1).
apps/web: learning curve per family by week and version, close drawn as a reference line; reliability diagram; signal contribution bars with placebo; reasoning-trace validity rate; champion vs challenger ladder. Graded rows only. n and interval on every chart. Copy stays "math you can read."

LANE 6: Props, DFS, fantasy scorecard (needs 1).
Same loop per player market: projection MAE and CRPS, over/under Brier, DFS lineup percentile. Use the existing signals (118k rows), snap_counts and injuries.

LANE 7: Reasoning-trace grading.
Make analyze() return non-INVALID traces: each one cites feed rows and names rejected facts. Score whether the cited reasons moved p in the direction of the outcome. Report it as a chart, not prose.

LANE 8: Far-future mint guard.
Withhold or tag any mint more than 7 days before kickoff, so it never enters grading as an informed pick. Receipt: the 62 Nov–Jan rows are tagged.

LANE 9: Hygiene.
Triage the 30 open PRs: merge if green and still relevant, otherwise close with a reason. Prune merged Sports-wt-* worktrees. Receipt: a before/after list.

LANE 10: Grade W4 (Monday 2026-10-06).
Verify the sha256 of docs/research/2026-10-03/engine-plan/w4_2026_sealed.json (d6e03aaf18cebd5ee0e940e710e9948208d610212acf013687448bb3b66b6d2e). Score log loss and Brier for the independent and Elo-only columns. Show the close as reference.

LANE 11: External intelligence leaderboards (after 2 and 4).
Wrap the engine's ingest → reason → probability loop as a forecasting agent. Enter Prophet Arena first (Kalshi, sports overlap), then the Metaculus FutureEval bot tournament, then ForecastBench. Read each one's rules and terms before submitting.

Final receipt: per lane, the files, tests, remote SHA, PR number, the metric with n and CI, what was excluded, and what was not done.

---

Grok bot, same night (separate agent): page the brief tree now. The three prerequisites are done. Read all 3,457 briefs, 1,115 fulltexts, the waves and the scored batches. Write one promotion-ledger row per item: arXiv id, card path, in-repo module or NOT IMPLEMENTED, license, duplicate flag, a held-out metric or "none stated", and which LANE above it would feed. Only items that state a held-out metric become build candidates. Commit to docs/research/2026-10-03/promotion-ledger/, then push. Report coverage as counts opened out of counts total.
