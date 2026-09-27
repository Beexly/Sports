# Overnight audit - 2026-09-27

One row per cycle. Every number here traces to a command whose output is in context.
Verdicts: `PASS` `DARK` `STORED` `NOT_EVALUATED` `BLOCKED` `STUCK`

| cycle | utc | slice | files touched | command | exit | measured | scalarizer | refused | verdict | commit |
|---:|---|---|---|---|---:|---|---|---|---|
|0 | 2026-09-27T04:05:01Z | orient | data/reasoning/overnight-loop.jsonl,docs/reasoning/overnight-audit-2026-09-27.md | git rev-parse --abbrev-ref HEAD; git rev-parse HEAD; git merge-base --is-ancestor | 0 | branch=grok/reasoning-layer-2026-09-26 HEAD=b6723fd5a descendant-of-87d72747=YES dirty=only-own-files | - | no push; PR#919 already merged by owner, not re-touched; no edit to main | PASS | -|

## Reconciled baseline

The work order's CURRENT TRUTH was written against `87d727475` and the repository has moved.
The method in the work order still governs. These five facts do not, each with the command or
path that proves it.

| # | Work order says | Measured | Evidence |
|---|---|---|---|
| 1 | `HEAD` is `87d727475e17efe0cad90996c651fc7f4f7dcb5c` | `b6723fd5a53302274cda8e1401660068cc7387c9` | `git rev-parse HEAD`. A descendant, so slice 0's takeover check does not fire. |
| 2 | "That commit is local. Origin may still be at `fed4ef3cc`" | PR #919 merged; `origin/main` is `d6197a3aa` | `git log --oneline -1 origin/main` -> "Merge pull request #919 from Beexly/grok/reasoning-layer-2026-09-26" |
| 3 | FORBIDDEN 1: "The feature branch is not pushed" | pushed and merged to `main` | `AGENTS.md` law 1: "Push only when the owner asked for that push." Binding prospectively only. This run pushes nothing. |
| 4 | "There is no `from-bridge.ts`. There is no `reasonAbout`." | Both exist | `packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts` calls `reasonAbout`. `AGENTS.md:27` already records the correction. FORBIDDEN 12 reads as **no second copy**. |
| 5 | "`npm install` uses `--ignore-scripts --no-audit --no-fund`" | `AGENTS.md` law 7 forbids `--ignore-scripts` for new installs | `AGENTS.md:99`. No new package is installed tonight. If one is needed, the package is reported instead. |

Verified unchanged, so the gates still mean what they meant: the eight LIVE parts, the four
DARK verdicts, the eight-member `SignalFamily` union, and all 62 directories under
`packages/prediction-engine/src` (plus `__tests__`, which the work order does not list).

## Concurrency

`grok.exe` (PID 32168) was live and writing in this worktree during cycle 0. It is the
owner's process and was neither stopped nor killed. Before every commit, `git status` is
read; any modification to a file this run did not touch stops that slice as `BLOCKED`
rather than committing over another writer. That is FORBIDDEN 13 applied to a live process
rather than a hypothetical one.

## Lane split

| | Lane 1 | Lane 2 |
|---|---|---|
| Worktree | `Sports-wt-grok-reasoning` | `Sports-wt-night-lane2` |
| Branch | `grok/reasoning-layer-2026-09-26` | `mimo/night-lane2-2026-09-26` |
| Slices | 0-7, 10-12 | 8, 9 |
| Writes | all source, parts registry, loop, audit, archive | `module-ledger.jsonl`, `feature-catalog.jsonl` only |

`AGENTS.md:83` designates one overnight agent. The owner is running two. Isolation is the
mitigation: 51 worktrees already exist on this repo, so a second one follows house practice.
The override is recorded here so the next agent sees why two lanes exist.

## Harness

Four scripts under `scripts/overnight/`, one per operational failure mode. Each was executed,
not merely written.

| Script | Fixes | Result observed |
|---|---|---|
| `verify-files.mjs` | PowerShell escaping. The work order's multi-line `python -c` heredoc does not survive PowerShell argument passing. | Exit 0. All 5 sha256, byte counts, and row counts match. |
| `log-slice.mjs` | Compaction amnesia. | Cycle 0 appended; a repeat of cycle 0 was refused with exit 2. |
| `scan-modules.mjs` | Context burn on slice 8. | 63 directories: 59 `catalogued`, 4 `blocked`. Zero rows claim `wired` or `measured_zero`. |
| `scan-features.mjs` | Context burn on slice 9, and the 240-row trap. | 6 grains, 0 skipped. Count is derived from headers actually read. |

The hasher was written first as `verify-files.ps1` and could not be committed: `.gitignore:195`
is `*.ps1`, and `AGENTS.md` law 2 forbids editing `.gitignore`. Rather than force-add a file
the repo deliberately ignores, it was ported to `.mjs`. Both implementations were executed and
agreed on all five hashes and all structural checks before the `.ps1` was deleted, so the pair
is a cross-check rather than an assumption.

Slice 1 verification detail, exit 0: `publishes_pick` is `false` and seasons are `[2024, 2025]`;
participation row 1 is `2024_01_TEN_CHI` play 40 with 22 players in `players_on_field`;
snap-counts keys are `season, week, team, player, position, offense_snaps, offense_pct,
defense_snaps, defense_pct, st_snaps, st_pct, game_id, pfr_player_id` and carry no `gsis_id`;
`fourth-down.jsonl` has `punt_wp` and its first row's value is genuinely null.

## Slice 2 — bridge-premises audit

`scripts/overnight/audit-bridge-premises.mjs`, exit 0. 285 rows, 0 parse errors, 285 distinct
`game_id`, no duplicates, 0 probabilities outside `[0,1]`, 0 nulls.

One `signal_id` (`pregame_context_logit`, 285 rows), one `method` (`logistic-irls`, 285 rows),
one `sample_count` (**6955**, 285 rows). The file has **no season field and no year field at
all** — keys are exactly `game_id, signal_id, outcome, probability, sample_count, method,
home_sign`.

### The constant sample count is explained, not suspicious

The work order calls a constant `sample_count` on holdout rows a smell. Measured, it is the
training row count of one fit, stamped onto every scored game, which is correct by
construction. `scripts/run-bridge.mjs:74` writes `predicted.data.sampleCount`, which is
`fit.data.sampleCount` — a property of the fit, not of the game.

Reproduced independently, applying the writer's own refusal rules to `features.jsonl`:

| quantity | value |
|---|---|
| `features.jsonl` rows | 7548, seasons 1999-2026 |
| rows with `season >= 2025` (excluded from fit) | 557 |
| pre-2025 candidate rows | 6991 |
| refused: `home_margin_avg` missing | 16 |
| refused: `home_opp_adj_pts_scored` missing | 15 |
| refused: `away_margin_avg` missing | 4 |
| refused: `away_opp_adj_pts_scored` missing | 1 |
| **reproduced training rows** | **6955** |

6991 - 36 = 6955, matching the file exactly.

### The fit is genuinely out of sample

`run-bridge.mjs:48` is `if (row.season >= 2025) continue;` in the training loop, so the fit
uses seasons 1999-2024. `holdout.jsonl` is 285 rows, and all 285 of them match `features.jsonl`
rows of season 2025. No 2025 outcome enters the fit.

### Disposition

The work order's "audit the writer before you trust a probability" is satisfied: the writer is
`scripts/run-bridge.mjs`, the training window is pre-2025, and the constant `sample_count` is
the training N. **This file is a real walk-forward holdout**, which contradicts
`AGENTS.md:66` ("Do not treat it as a holdout") and the work order's framing of the constant as
a smell. Both are recorded here as superseded by measurement.

It still does **not** enter the live edge. A clean holdout is a precondition for trusting a
probability, not a substitute for `selectPart` returning `g = 0`. `aggregateSignals` was not
called and the file was not deleted or modified.
|1 | 2026-09-27T04:06:38Z | verify-files | scripts/overnight/verify-files.mjs | node scripts/overnight/verify-files.mjs | 0 | 5/5 sha256 match; bytes+rows exact; publishes_pick=false; seasons=[2024,2025]; participation row1=2024_01_TEN_CHI play40 n=22; snaps have no gsis_id; punt_wp null | - | no fit; no season extension yet; .ps1 deleted not force-added (.gitignore:195 + AGENTS.md law 2) | PASS | -|
|2 | 2026-09-27T04:10:04Z | audit-bridge-premises | data/gse-dataset/bridge-premises.jsonl | node scripts/overnight/audit-bridge-premises.mjs | 0 | 285 rows, 1 signal_id, 1 method, sample_count constant 6955, 0 parse errors, 285 distinct game_id, 0 probs outside [0,1], no season/year field; reproduced 6991 pre-2025 rows minus 36 refusals = 6955 exactly | not run; no fit, no LIVE | did not delete or modify bridge-premises.jsonl; did not call aggregateSignals; did not treat it as LIVE | PASS | -|
|3 | 2026-09-27T04:13:44Z | production-guards | scripts/backfill/historical-settlement-backfill.ts | curl -sI https://www.galaxysportsedge.com/ai.txt ; npx vitest run src/__tests__/pick-proof-receipt.test.ts | 0 | entryOdds guard already at pick-proof-receipt.ts:165 + 13 tests pass; closed 1 uncovered write path in backfill; ai.txt live 308 Location=https://www.galaxysportsedge.com/llms.txt ->200 | not run; no fit | did not edit ai.txt route (already absoluteUrl); did not rewrite the 199 historical entryOdds rows; did not run the owner-gated backfill | PASS | -|
