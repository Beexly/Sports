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

## Slice 5 — nflverse seasons extended to 2018-2025

All five grains re-ingested across eight seasons. `npx tsx packages/data-ingestion/src/nflverse/ingest.ts`
run twice under `NODE_OPTIONS=--max-old-space-size=8192`; the second run used the new per-season
participation writer so the manifest is generated by the code, not hand-edited.

Availability was HEAD-checked before assuming any year existed. The real release paths are
`pbp_participation/`, `rosters/roster_` (singular prefix) and `weekly_rosters/roster_weekly_`;
every season 2018-2025 returned 200 for rosters, weekly rosters, participation, snap counts and
the nfl4th `pre_computed_go_boost` RDS. No season 404s, so no season was recorded as refused.
The Python extractor still refuses a 404 per season rather than inventing a year.

### This table replaces the CURRENT TRUTH table for the rest of the night

Every row is recomputed from disk and compared against `nflverse-ingest-manifest.json`.
`verify-files.mjs` exit 0, 12 files, 0 failures.

| file | rows | bytes | sha256 |
|---|---:|---:|---|
| contracts.jsonl | 35944 | 5551974 | `58f16653c7489e0affb8a34f31b201a358b95b2e6cb68840bae12d12a57eb82f` |
| rosters.jsonl | 404653 | 84324943 | `c6bbf48d45e76545950ea53435a533083c1ac403ab43531597990bc5ddc3a101` |
| snap-counts.jsonl | 205355 | 47343479 | `bf3423a2ffab001c021e654300a0509b3bb4d67232b389182f9e29bee48fddf1` |
| participation-2018.jsonl | 47875 | 21047372 | `9a5d18d4bc69f09f8b559de6b9264bb11c0d59ed1cd2d5210cc6288f2677b635` |
| participation-2019.jsonl | 48034 | 21146293 | `ac9cf0b0d4658fe3fd06ecbc0e39bf07f920de8a9ed103d65197302785d00494` |
| participation-2020.jsonl | 48513 | 21338122 | `bac369225065bbc7d07960a52458c626ce2624b857240882877114f563b0e140` |
| participation-2021.jsonl | 50714 | 22302524 | `8a34ef0184647cc8d04510ff9fa99d0c68fc2375fca07dd9b3a807ad72d28fe1` |
| participation-2022.jsonl | 50150 | 22062934 | `33c77f30fcd23b2672322dcd89fd1b1d2714ceae9f7ae1a06ab420e0200e563c` |
| participation-2023.jsonl | 46168 | 28394109 | `9a4644db629d4c7a2cb2beb625adf0a0e2b153e4c42cff6fb03086c5a6851009` |
| participation-2024.jsonl | 45919 | 28162165 | `c3b8164691b0194f6e9401d709a957f46b6f40d23fafe322129a13ad997429d2` |
| participation-2025.jsonl | 45184 | 27835609 | `18871d87ca8887542c77474ac43c4df0d2580c8919604c4c3fc6742a8fc6f798` |
| fourth-down.jsonl | 33002 | 4575209 | `4a394829346b72e2139667663d43839afd293dd3ea98ce6c4b177cbe3d88ef66` |

### Why participation is eight files and not one

Eight seasons of FTN participation is 183 MB in a single file, past the 90 MB ceiling. The work
order requires a per-season split with each file sealed in the manifest, and forbids dropping a
season to stay small. No season was dropped: 47,875 + 48,034 + 48,513 + 50,714 + 50,150 +
46,168 + 45,919 + 45,184 = 382,557, which is the full kept count.

Writing one season at a time also removes the memory risk: each season is projected and
written before the next is loaded, instead of accumulating all eight in one array.

### Row accounting

`read == kept + refusals` holds for every dataset:

| dataset | read | kept | refusals |
|---|---:|---:|---|
| contracts | 52959 | 35944 | outside_window 13464, missing_gsis_id 3551 |
| rosters | 404804 | 404653 | missing_gsis_id 151 |
| snap-counts | 205355 | 205355 | none |
| participation (8 files) | 382557 | 382557 | none |
| fourth-down | 33002 | 33002 | none |

`publishes_pick` is false. The pbp header probe still reports `go_wp`, `punt_wp` and `fg_wp`
absent, so the nfl4th RDS remains the only source for those columns and the R model was not
ported. The `zero_refusals` warning on snaps, participation and fourth-down is expected: every
row carried its join key, which is not the same as the check having been skipped. The check
lives in `packages/data-ingestion/src/nflverse/rows.ts` and `rows.test.ts`.

### A test that changed meaning

`contractCoversWindow(2022, null)` used to be `false` and asserted that a null `years` is never
given a guessed length. Widening the window to 2018-2025 put 2022 *inside* the window, so the
first branch now returns true and the assertion broke. The test now asserts the same property
about 2017, which is still outside the window. That is the "keep the old examples meaning what
they said" case, not a case of adjusting a number to make a suite green.

`npx vitest run src/nflverse/rows.test.ts` from `packages/data-ingestion`: 5 passed. `npx tsc
--noEmit` for that package: 0 errors.

No fit was run in this slice. No LIVE part was added.

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
|4 | 2026-09-27T04:13:50Z | decision-time-archive | packages/prediction-engine/src/edge-lab/decision-time-price-archive.ts,packages/prediction-engine/src/edge-lab/__tests__/decision-time-price-archive.test.ts | npx vitest run src/edge-lab/__tests__/decision-time-price-archive.test.ts | 0 | 21/21 tests pass from packages/prediction-engine; archive is append-only, validates before write, refuses edge mismatch; priced stays false | not run; no fit | did not set priced:true; did not add fs import to pricePropAgainstMarket (verified unmodified); tests write to temp dir only | PASS | -|
|5 | 2026-09-27T04:14:47Z | clear-typecheck-baseline | packages/prediction-engine/src/reasoning/part-selector.ts | npx tsc --noEmit ; npx vitest run src/reasoning/part-selector.test.ts src/reasoning/live-edge-registry.test.ts src/reasoning/part-reading.test.ts | 0 | npx tsc --noEmit on prediction-engine: 3 errors -> 0 (exit 0); reasoning suite 12/12 pass, no scalarizer regression | ARITHMETIC UNCHANGED: Math.max over the same three values, read via map instead of index | did not use a non-null assertion; did not add any/ts-ignore; did not change the lambda weights, the f1/f2/f3 rules, or any LIVE/DARK verdict | PASS | -|
|6 | 2026-09-27T04:23:40Z | extend-seasons | packages/data-ingestion/src/nflverse/*,data/gse-dataset/*,scripts/overnight/verify-files.mjs | npx tsx packages/data-ingestion/src/nflverse/ingest.ts ; node scripts/overnight/verify-files.mjs ; npx vitest run src/nflverse/rows.test.ts | 0 | 8 seasons 2018-2025; verify-files 12/12 ok 0 failures; contracts 35944, rosters 404653, snaps 205355, participation 382557 in 8 files, fourth-down 33002; read==kept+refusals for all; publishes_pick=false | not run; no fit in this slice | did not drop a season to stay under 90MB; did not port the nfl4th R model; did not fit on 2025; did not add a LIVE part | PASS | -|
|7 | 2026-09-27T04:25:55Z | measure-coaching | data/reasoning/dark-candidates.jsonl,scripts/overnight/measure-coaching.mjs | npx tsx scripts/overnight/measure-coaching.mjs | 0 | n=285 holdout 2025; r=-0.0346098177800267; slope=-0.2952060610406444; se=0.5067251687981046; g=0.5 winning=f1; f1 fails both bars; in-sample slope 0.412>se 0.178 but holdout does not clear | coaching DARK, g=0.5, winning_term=f1, f1=1 f2=0 f3=1 | did not edit parts-registry.jsonl (verified unmodified, 8 rows); did not loosen \|r\|>=0.08 or \|slope\|>se; LAC edge recomputed to 0.30259224777263855, unchanged | DARK | -|
|8 | 2026-09-27T04:26:29Z | calibration | data/reasoning/calibration-holdout-2025.json,scripts/overnight/measure-calibration.mjs | npx tsx scripts/overnight/measure-calibration.mjs | 0 | engine family calibration INSUFFICIENT_SAMPLE n=0; bridge premise calibration MEASURED n=285: brier 0.2237430131385838, log_loss 0.6365476394547599, ece 0.051868442761204184, drift 0.026910171395645888 | not a scalarizer slice; no fit run for the engine | did not build weight-learner.ts or calibration-tracker.ts; did not fit a weight vector; probabilityClaimsAllowed stays false; calibration page stays dark; did not publish any number | NOT_EVALUATED | -|
|9 | 2026-09-27T04:27:23Z | dashboard | docs/reasoning/engine-dashboard.md,data/reasoning/module-ledger.jsonl,data/reasoning/feature-catalog.jsonl,scripts/overnight/scan-features.mjs | node scripts/overnight/scan-modules.mjs ; node scripts/overnight/scan-features.mjs | 0 | module-ledger 63 rows (59 catalogued, 4 blocked, 0 wired/measured_zero); feature-catalog 6 rows, 0 skipped, 0 false claims; LAC edge 0.30259224777263855 unchanged | no new verdict; dashboard reports the coaching DARK recorded at cycle 7 | did not pad the catalog toward 240; no row claims wired or measured_zero; no hit-rate projection and no units in the dashboard | PASS | -|
|10 | 2026-09-27T04:36:30Z | joins | packages/data-ingestion/src/nflverse/joins.ts,packages/data-ingestion/src/nflverse/joins.test.ts,data/gse-dataset/join-report.json | npx vitest run src/nflverse/joins.test.ts ; npx tsc --noEmit | 0 | roster index 404653 rows -> 24850 keys, 1 ambiguous (2019\|00-0035718); snaps->rosters 135808/205355 matched (0.6613, pfr_id blank on 44.7% of roster rows); contracts->rosters 35138/35944 (0.9776); personnel ids 3019631/7952525 (0.3797) but 2023-2025 rate is 1.0 | not a scalarizer slice; no fit | did not build a jersey-number crosswalk that does not exist; did not coerce 2018-2022 ids; did not write an exploded personnel file; did not select one row for the ambiguous key | PASS | -|
