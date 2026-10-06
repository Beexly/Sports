---
feature: overnight-reasoning-queue
status: designed
updated: 2026-09-26
branch: grok/reasoning-layer-2026-09-26
commits:
---

# Overnight Reasoning Queue

## Report

## [S1] Problem

The work order at `docs/reasoning/overnight-agent-prompt-2026-09-26.md` defines a 13-slice
queue that has never been run. Its `CURRENT TRUTH` block was written against commit
`87d727475` and the repository has moved underneath it. Two agents are being launched into a
single worktree while a live committed contract (`AGENTS.md:83`) names exactly one overnight
agent, and a third process (`grok.exe`, PID 32168) is still writing to that worktree.

Separately, the queue's four most mechanical steps — file hashing, the 62-directory module
census, the feature catalog, and the per-slice loop bookkeeping — are precisely the steps that
degrade after context compaction. Done by hand each cycle, they burn context, and the
bookkeeping is the one thing that must not be forgotten.

## [S2] Design

### [D1] Reconciled baseline

The prompt wins on method. These five factual claims are stale and are superseded by measured
state. Every item below was read from the live repository, not inferred.

| # | Prompt says | Live state, measured | Consequence |
|---|---|---|---|
| 1 | `HEAD` is `87d727475` | branch is `b6723fd5a` ("Merge origin/main into grok/reasoning-layer-2026-09-26") | Slice 0's descendant check passes; it is a descendant, not a takeover |
| 2 | "That commit is local. Origin may still be at `fed4ef3cc`" | PR #919 merged; `origin/main` is `d6197a3aa` | Slice 0's "stop if someone moved the branch" does not fire |
| 3 | FORBIDDEN 1: "The feature branch is not pushed" | branch is pushed and merged to `main` | FORBIDDEN 1 binds only prospectively: no push *by this run*. History is not rewritten. |
| 4 | "There is no `from-bridge.ts`. There is no `reasonAbout`." | `packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts` exists and calls `reasonAbout` | FORBIDDEN 12 reads as **no second copy**, not "these do not exist". `AGENTS.md:27` already records the correction. |
| 5 | "`npm install` uses `--ignore-scripts --no-audit --no-fund`" | `AGENTS.md` law 7 forbids `--ignore-scripts` for new installs | `AGENTS.md` is newer and is a law. No `--ignore-scripts`. If a new package is needed, report the package instead of bypassing the script control. |

Verified unchanged, so the queue's gates still mean what they meant: the eight LIVE parts,
the four DARK verdicts, the `SignalFamily` eight-member union, and all 62 slice-8
directories (`packages/prediction-engine/src/*`, plus `__tests__` not listed by the prompt).

The queue is unstarted. `data/reasoning/overnight-loop.jsonl`,
`docs/reasoning/overnight-audit-2026-09-27.md`, `docs/reasoning/morning-2026-09-27.md`,
`data/reasoning/module-ledger.jsonl`, `data/reasoning/feature-catalog.jsonl` and
`data/decision-time-prices/` do not exist.

### [D2] Lane topology

`AGENTS.md:83` says one agent. The owner is running two. The override is the owner's to make
(law 3 authority); the engineering answer is to make two agents physically unable to collide
rather than to rely on them not to.

Isolation is the house pattern — 51 worktrees already exist on this repo.

- **Lane 1 (this session).** `C:\Users\Garrett\Sports-wt-grok-reasoning`, branch
  `grok/reasoning-layer-2026-09-26`. Owns the sequential measurement chain: slices 0–7, 10–12.
  Sole writer of all TypeScript source, `data/reasoning/parts-registry.jsonl`,
  `data/reasoning/dark-candidates.jsonl`, `data/decision-time-prices/`, and the overnight
  loop and audit logs.
- **Lane 2 (parallel session).** `C:\Users\Garrett\Sports-wt-night-lane2`, branch
  `mimo/night-lane2-2026-09-26`, based on `b6723fd5a`. Owns the read-only census: slices 8
  and 9. Sole writer of `data/reasoning/module-ledger.jsonl` and
  `data/reasoning/feature-catalog.jsonl`, plus its own audit file.

The two lanes have disjoint write sets. Lane 2 never runs a fit, never edits source, never
touches the parts registry. Lane 1 never hand-walks the 62 directories.

The 51-worktree repo means `git worktree list` is noisy; lane membership is asserted by
branch name, not by directory count.

### [D3] Night harness

Four scripts under `scripts/overnight/`, one per failure mode named by the owner. They exist so
that after any compaction the next cycle is a command, not a recollection.

| Script | Fixes | Contract |
|---|---|---|
| `verify-files.mjs` | PowerShell escaping. The prompt's multi-line `python -c` heredoc does not survive PowerShell argument passing, and a here-string still has to be quoted correctly by whatever calls it. | Streaming SHA-256 per file, line counts, manifest `publishes_pick` check, `players_on_field` array check, snap-row `gsis_id` absence, `punt_wp: null` presence. Emits JSON. Non-zero exit on any mismatch. |
| `log-slice.mjs` | Compaction amnesia. The loop line is the only durable state; appending it must not depend on remembering to. | One JSON object appended atomically to `data/reasoning/overnight-loop.jsonl` plus one row to the audit md. Refuses a non-monotonic cycle number. Prints the new `next`. |
| `scan-modules.mjs` | Context burn on slice 8. Walking 62 directories by hand burns the window and invites post-compaction invention. | Walks `packages/prediction-engine/src/*` deterministically; per directory emits file count, whether any file exports a number, matched blocked-kernel names, and a data-file reference. Emits `module-ledger.jsonl` rows with status `catalogued` or `blocked`. **Never assigns `wired` or `measured_zero`** — those require a number an agent computed. |
| `scan-features.mjs` | Context burn on slice 9, and the 240-row trap. | Derives candidate grains from the headers of the five nflverse JSONL files and the manifest. Emits `feature-catalog.jsonl` with `status: catalogued` and real `source_file`. A grain whose required keys are not in the observed header is skipped and the skip is reported. The count will be well under 240 and that is a pass. |

The hasher was first written as `verify-files.ps1` and could not be committed: `.gitignore:195`
is `*.ps1`, and `AGENTS.md` law 2 forbids editing `.gitignore`. A script nobody can commit is a
script the next agent does not have, so it is a `.mjs` like the rest of the harness. That also
removes the PowerShell 5.1-versus-7 question. Both implementations were run and agreed on
every hash before the `.ps1` was deleted, which makes the pair a cross-check rather than a
guess.

`scan-modules.mjs` and `scan-features.mjs` may only ever produce `catalogued` or `blocked` or
`absent`. Promoting a row to `wired` or `measured_zero` requires a measurement recorded
against a command, which is a human/agent act, not a script act. This is the structural
expression of FORBIDDEN 11.

### [D4] The scalarizer is untouched

No script writes to `parts-registry.jsonl` except the agent that has computed a real fit. The
harness has no path to a LIVE verdict. `g = 0` is the only LIVE path and the only producer of
a registry row is a recorded walk-forward fit with `n`, `r`, `slope`, `se`.

### [D5] Evidence discipline

Every number in the morning report traces to a command whose output is in context. Script
output is JSON so a claim can be diffed against the file it came from. `verdict` vocabulary
stays `PASS | DARK | STORED | NOT_EVALUATED | BLOCKED | STUCK`.

### [D6] Concurrency guard

`grok.exe` (PID 32168) is still running in Lane 1's worktree. It is not stopped and not
killed — it is the owner's process. Before every Lane 1 commit, `git status` is read and any
modification to a file this run did not touch is treated as a collision: that slice stops and
logs `BLOCKED` rather than committing over another writer. This is FORBIDDEN 13's "do not
become a fifth concurrent writer" applied to a live process rather than a hypothetical one.

## [S3] Out of Scope

- No push, no force-push, no rebase, no amend of a pushed commit. PR #919 already landed; this run does not touch `main`.
- No edit to blocked kernels: `props-dfs`, GLMF, `fitAlpha`, `ooEpc`, `bucketRoi`, `gaussCopulaJoint`, `opponent-adjusted-epa`, `reasoning-surface.ts`.
- No second `from-bridge.ts`, no second `reasonAbout`, no edit to the existing one.
- No `SignalFamily` widening; no padding `feature-catalog.jsonl` to 240.
- No `priced: true`; no I/O inside `pricePropAgainstMarket`; no public win rate, ROI, or units.
- No loosening `|r| >= 0.08`, `|slope| > se`, `minSampleCount`, `maxECE`, or the 4-leg guard.
- No `prisma migrate`, no `db push`, no reading `DATABASE_URL` / `DIRECT_URL`.
- No scraping PFF, SIS, scores24, `pfr_advstats`, or SiriusXM. No porting the nfl4th R model.
- No new model call, no API key spend, no printing a secret.
- No edit to `AGENTS.md`, `.githooks/**`, `.gitignore`, or any `LAUNCH` file.
- No second night harness if `data/reasoning/overnight-loop.jsonl` already exists.

## Tasks

- [ ] T1: Record the reconciled baseline in the audit — acceptance: `docs/reasoning/overnight-audit-2026-09-27.md` names all five deltas from D1 with the SHA or path that proves each (covers: D1)
- [ ] T2: Orient — create the loop and audit files, assert branch and HEAD, append cycle 0 — acceptance: loop line 0 exists with `verdict` and a `next`; branch is `grok/reasoning-layer-2026-09-26` (covers: D1, D2)
- [ ] T3: Build `verify-files.ps1` and run it — acceptance: JSON output for all five files, exit 0, every sha256 equal to the prompt table (covers: D3, D5)
- [ ] T4: Build `log-slice.mjs` and append a real cycle line through it — acceptance: the file gains exactly one line, the cycle number is monotonic, and a non-monotonic append is refused (covers: D3)
- [ ] T5: Audit `bridge-premises.jsonl` — acceptance: row count, `signal_id` histogram, `sample_count` distribution, out-of-range probability count, duplicate `game_id` count, and the writer path or `UNKNOWN_WRITER` are all written down; the file is not fed to `aggregateSignals` (covers: D1, D5)
- [ ] T6: Build `scan-modules.mjs` and generate the module ledger — acceptance: one row per real directory, blocked kernels marked `blocked` and not opened, no row asserts `wired` or `measured_zero` (covers: D3)
- [ ] T7: Build `scan-features.mjs` and generate the feature catalog — acceptance: every row's `source_file` is a real file that was read, count is below 240, and null sample counts stay null (covers: D3)
- [ ] T8: entryOdds write guard — acceptance: a unit test shows `-33` rejected and `-110` accepted; the 199 historical rows are byte-identical before and after (covers: D5)
- [ ] T9: Build the decision-time price archive — acceptance: `decision-time-price-archive.test.ts` passes from `packages/prediction-engine`, tests write to a temp dir and not to `data/decision-time-prices/`, and `pricePropAgainstMarket` has no `fs` import (covers: D5)
- [ ] T10: Extend nflverse seasons under an enlarged heap — acceptance: manifest `rows` equals the line count, `read` equals `kept` plus refusals, new sha256 values recorded, and no fit is run in this slice (covers: D5)
- [ ] T11: Build the joiner and write `join-report.json` — acceptance: match rate, unmatched, and ambiguous counts are computed from a full hashed pass; null `players_on_field` returns null and not an empty roster (covers: D5)
- [ ] T12: One walk-forward measurement through `selectPart` — acceptance: `n`, `r`, `slope`, `se`, and `g` are recorded; the registry is untouched unless `g = 0`; the LAC edge is recomputed and stated (covers: D4)
- [ ] T13: Merge Lane 2's census into Lane 1 and write the dashboard — acceptance: every dashboard number cites a path that exists; no hit-rate projection and no units (covers: D2, D5)
- [ ] T14: Write the morning report as the final commit — acceptance: `HEAD start` records `b6723fd5a`, `pushed: no`, `publishes_pick: false`, and no number appears that was not computed this run (covers: D1, D5)
