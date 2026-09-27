# AGENTS.md

Live contract for every agent in this repo. Read this file. Then stop looking for a newer status in an old log.

History through 2026-09-24 (X sweeps, Move-37 lab notes, benchmark dumps) is frozen at `docs/ops/AGENTS-history-through-2026-09-24.md`. Do not append sweep logs to this file. Do not treat that archive as a task list.

Product overview stays in `CLAUDE.md`. This file is where we are, and what you must not redo.

## Where we are

Date of this contract: 2026-09-26.

Branch: `grok/reasoning-layer-2026-09-26`.
Worktree used to write this: `C:\Users\Garrett\Sports-wt-grok-reasoning`.
Do not use `C:\Users\Garrett\Sports` for this lane. Do not run tests from `C:\WINDOWS\system32`.

`publishes_pick` is false. No auto-publish, no auto-send, no automated betting. Public copy does not get a win rate, ROI, or units number. The calibration page stays dark.

### Reasoning layer

Eight LIVE parts are locked in `data/reasoning/parts-registry.jsonl`. The signed numbers belong to `2026_03_LAC_BUF`, week `2026-W3`, and to no other game. Edge sum `0.30259224777263855`. Coverage `0.68`. Home is the sign of the sum.

| family | weight | signed |
|---|---:|---:|
| on_field_efficiency | 0.14 | 1 |
| scheme_play_design | 0.12 | 0.033708224093976474 |
| availability | 0.12 | 0.6666666666666666 |
| schedule_and_body | 0.08 | 0.08802857142857143 |
| historical_strength | 0.08 | 0.5560780554178324 |
| trench_personnel | 0.05 | 0.7486746146729814 |
| chemistry | 0.04 | 0 |
| airwave | 0.05 | -0.2083 |

Chemistry's zero stays in the sum. SiriusXM is not the airwave row.

DARK, because honesty failed, not because a cell was empty:

- officials. 2025 holdout n=113, r=-0.092574, slope=-0.010072, se=0.010282. `|r|` clears 0.08. `|slope|` does not clear se. Naming a referee does not flip this.
- weather_physics. Wind slope does not clear its standard error. A forecast does not flip this.
- narrative_contract. Contracts are now on disk. The family stays DARK until a walk-forward fit clears both bars.
- coaching. Go-rate did not clear. nfl4th is the same family, not a second live signal.

The only LIVE path is `g = max(0.5*f1, 0.3*f2, 0.2*f3) = 0` in `packages/prediction-engine/src/reasoning/part-selector.ts`. f1 is honesty (`|r| >= 0.08` and `|slope| > se`). f2 is "this family already has a representative." f3 is a missing week-3 row. Do not loosen those bars. Do not add a prior. Do not rescale live families. Market is context. Meters are not the edge.

Reading path: `readParts` → `aggregateSignals`. There is no `from-bridge.ts` and no `reasonAbout`. Do not create them. Do not import the selector into `packages/prediction-engine/src/engine/reasoning-surface.ts`.

`SignalFamily` in `packages/types/src/signal-registry.ts` has eight members and the prior weights sum to 1. Do not widen it. A new grain goes in a catalog file, not in that union.

### Data already ingested

`data/gse-dataset/nflverse-ingest-manifest.json` records 2024 and 2025:

- `contracts.jsonl` — 11550 kept. Missing `gsis_id` refused.
- `rosters.jsonl` — 99740 kept.
- `snap-counts.jsonl` — 53228 kept. No `gsis_id` column. Do not invent one.
- `participation.jsonl` — 91103 kept. `players_on_field` is the `players_on_play` list. 2023+ is FTN via nflverse, CC-BY-SA 4.0, internal only.
- `fourth-down.jsonl` — 8465 kept from the nfl4th RDS. Play-by-play does not contain `go_wp`, `punt_wp`, or `fg_wp`. The R model was not ported. Null `punt_wp` stays null.

Verify sha256 against the manifest before you overwrite a file. `data/gse-dataset/bridge-premises.jsonl` already exists and is unaudited. Do not treat it as a holdout.

Loaders: `packages/data-ingestion/src/nflverse/`. Tests run from `packages/data-ingestion`. Reasoning tests run from `packages/prediction-engine`.

### Do not redo

- Do not rebuild the part selector, the registry, or the week-3 ledger.
- Do not re-download the 2024–2025 nflverse files if the manifest hashes match.
- Do not fit a model on 2025. 2025 is the holdout. Two seasons are not a training set.
- Do not start a second price archive, a second feature catalog, or a second overnight loop if `data/reasoning/overnight-loop.jsonl` exists.
- Blocked kernels: `props-dfs`, GLMF, `fitAlpha`, `ooEpc`, `bucketRoi`, `gaussCopulaJoint`, `opponent-adjusted-epa`, `reasoning-surface.ts`.
- Do not scrape PFF, SIS, scores24, `pfr_advstats`, or SiriusXM. Do not invent nutrition, cognition, RFID, or public hit rates.

## Tonight

The owner is running one overnight agent on Grok. The work order is `docs/reasoning/overnight-agent-prompt-2026-09-26.md`.

Grok is that agent. It is not a second model you call for a ruling. If you are not that agent, do not start the queue. If `data/reasoning/overnight-loop.jsonl` is growing, leave it alone.

OpenRouter stays unused. DeepSeek text is context. A measured holdout beats either one.

## Laws

Breaking one discards the run.

1. Push only when the owner asked for that push. Never force-push. Never push `main` unless the owner asked to merge to `main` in the same request.
2. Do not edit `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`, `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`, `.gitignore`, `.githooks/**`, or `apps/web/lib/ai-control-plane/**`.
3. Do not flip `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`, `PERFORMANCE_STATS`, or any other publish gate. An estimator may be corrected only when the floor stays the same, the raw number is reported beside it, and a ledger row records the change. Do not lower a floor. Do not widen a sample by outcome.
4. Do not write a claim you did not run. Not run means `NOT RUN`. A missing file is named. A blank cell stays blank. A missing sample count stays missing.
5. Do not mark done unless the check you named actually passed.
6. Do not use `git commit --no-verify`.
7. Do not run a migration or print `DATABASE_URL` / `DIRECT_URL`. `npm install` is setup. Do not disable `.npmrc` script controls, and do not pass `--ignore-scripts` to get past an unapproved install script. Report the package instead. The nflverse install that already landed used `--ignore-scripts` once, on purpose, to skip `db:generate`. Do not repeat that pattern for a new package.
8. Do not fabricate picks, odds, win rates, or benchmarks.
9. Do not weaken a guard, a forbidden-copy list, or an assertion to make a test pass.
10. Frozen proof receipts stay frozen. A new `entryOdds` value between -100 and 100 exclusive is invalid. Do not rewrite the historical rows.

## Working rules

- One task, one commit. Stage files by name. Never `git add -A`.
- Two failed attempts, then `BLOCKED` with the error text. Do not take a third lap.
- Before a code commit, run the package test that covers the change. Typecheck the package you edited. Do not pipe the exit code away.
- TypeScript stays strict. No `any`, no `@ts-ignore`.
- Ledger evidence is one line.
- Commit subject is short and lowercase. The body says what was measured.

## Tests

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning\packages\prediction-engine
npx vitest run src/reasoning/part-selector.test.ts src/reasoning/live-edge-registry.test.ts src/reasoning/part-reading.test.ts
```

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning\packages\data-ingestion
npx vitest run src/nflverse/rows.test.ts
```

Node does not rewrite `.js` imports to `.ts`. `scripts/engine-reading.mjs` may import `part-selector.ts`. It may not import `part-reading.ts`.

## Standard

Every number traces to a command. One invented number makes the rest suspect. Work the open slice. Leave the locked parts locked.
