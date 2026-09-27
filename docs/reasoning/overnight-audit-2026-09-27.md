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
|1 | 2026-09-27T04:06:38Z | verify-files | scripts/overnight/verify-files.mjs | node scripts/overnight/verify-files.mjs | 0 | 5/5 sha256 match; bytes+rows exact; publishes_pick=false; seasons=[2024,2025]; participation row1=2024_01_TEN_CHI play40 n=22; snaps have no gsis_id; punt_wp null | - | no fit; no season extension yet; .ps1 deleted not force-added (.gitignore:195 + AGENTS.md law 2) | PASS | -|
