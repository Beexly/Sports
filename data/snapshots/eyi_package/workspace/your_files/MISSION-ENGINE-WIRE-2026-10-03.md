# MISSION: Wire Paper Equations into the GSE NFL Engine — 2026-10-03

**Lead:** Motif. **Window:** six hours from 8:35 AM CT Saturday 3 Oct 2026 (ends 2:35 PM CT). **Budget:** spend it. **Comms:** Garrett talks only to the lead. Fleet reads this file and executes.

**Machine:** Beexly, Windows, PowerShell. Do not nest `powershell -Command`.
**Python:** `C:\Users\Garrett\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`
**Desktop app:** if offline, reconnect and start. Do not report a pid you did not see.
**Worktree:** `C:\Users\Garrett\Sports-wt-engineplan`
**Branch:** `research/engine-plan-2026-10-03`. One committer. Everyone else writes a lane file and stops. Push the branch. Never main. Never force.
**Live tree:** `C:\Users\Garrett\_research\ctx-2026-10-03\`
**Papers (read-only):** `C:\Users\Garrett\_research\agent-bus` and the Sports repo.

## Lanes (assigned before anyone starts — no two workers write the same file)

- **Trainer A** already owns `brain\mind.jsonl` via `mind_train.py`. Do not kill it. Do not open that file for write.
- **Trainer B** owns `brain\mind_b.jsonl` ONLY. If `mind_train.py` has no output flag, copy the loop to `brain\mind_train_b.py` and change only the output path. Confirm Trainer A is still alive after B starts.
- **Equation slices:** split `eng\equations_stated.jsonl` by line range. Worker k writes ONLY `eng\wire_k.py` and `eng\wire_k_missing.json`. No shared module. No edits to `join_rest.py`, `chart.py`, `mint_w4.py`, or another worker's `wire_k`.
- **One integrator, last.** Reads the `wire_k` files and adds them. Nobody else touches the engine entry point.

## Already on origin — DO NOT REDO (verified by lead 2026-10-03)

- `3e20c44aa` — engine: air-yard completion residual from c02/a04, walk-forward
- `d74e2eeae` — chart: air-yard residual row and W4 mint 20261003T0857Z, v1a
- `6a73a3ebe` — parent interception rate computed from cell counts (not join)
- `ef9224fc6` — wire coaching and qb-behavior tables, four-week target-share

Parent interception stays cell-level. `learn_wide` 3741×201 is not scored and is not rebuilt.

## The bar

Last walk-forward: **n=1914, stress+INT+air log loss 0.610490**. That is the bar AFTER the wire is in — not a place to stop, not a number to recompute for fun.

## Point-in-time — every new column, no exceptions

Latest row with `season*100+week` strictly before the game, lag at most 2 seasons, home minus away, null if either side misses the floor. Ratios and shrinkage BEFORE the diff. A league constant is not a feature. Net EPA stays blocked. FTN stays out. Do not fake pressure.

## Column matching

Throw out the column-name matcher. `=` with an empty column list is not a hit. `home`, `away`, `team`, `total`, `season` are not formulas.

## Papers

Papers are read-only. Statement not in the paper: UNVERIFIED, not coded. Inputs exist: code it in your own `wire_k.py`. Input missing: `missing:<field>` in your own json. Do not invent a column. Do not invent a mechanism.

## Order

1. Both trainers alive. Report both pids and both file sizes once.
2. Fleet codes every equation whose paper is on disk and whose inputs exist. `corpus-intelligence` and `sports/` first, then the rest. Any domain transfers when the columns exist. The close is one input, not the judge.
3. Integrator lands the `wire_k` functions. Then ONE walk-forward against 0.610490. Report n, log loss, Brier, and the paired interval. Keep a move of 0.0001 toward 0. Then mint. Forecasts only. No score before the wire is in. No second score after.
4. One push. Report at `C:\Users\Garrett\_research\agent-bus\outbox\from-grok\`: every SHA, every formula coded, every formula NOT coded and the missing column, both mind row counts. An equation with no line in that report was not done.

## Walls (violate one and the run is discarded)

No Cursor cloud agents. No merge to main. No Neon. No Vercel. No secrets. No second writer on `mind.jsonl`. No invented column. No invented mechanism. No claim that 100% is met — 100% is the aim. Do not shrink the job. Do not collide, regress, or duplicate. A finished slice is appended, not rewritten. No worker "cleans up" another worker's code. No worker redoes a SHA already on origin.
