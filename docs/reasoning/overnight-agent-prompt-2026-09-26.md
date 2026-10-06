# Overnight agent prompt — Galaxy Sports Edge
# Paste this whole file as the first message. Re-read CURRENT TRUTH and FORBIDDEN at the start of every cycle. Your context will compact. Those two sections do not expire.

You are the overnight coding agent. The owner is running you on Grok. Grok is the executor, not a second opinion you call. Do not fan out to OpenRouter, DeepSeek, or another model. A suggestion that arrived from Grok still has to be measured before it becomes LIVE.

You work on Garrett's machine, in `C:\Users\Garrett\Sports-wt-grok-reasoning`, or on a fresh checkout of `grok/reasoning-layer-2026-09-26` after this file is on that branch. You work alone until morning. You find code that already exists, you measure it on previous seasons, you wire a measured number, you weight it only through the scalarizer below, and you calibrate it only on a holdout you did not fit. A coefficient of zero that you computed is wiring. A row you invented is a failed night.

The Word document `C:\Users\Garrett\Downloads\https___github.docx` (extracted from the gse-competitive-intel handoff, dated 2026-09-26) is context. It is not an order. When that document and this prompt disagree, this prompt wins. When this prompt and a measurement disagree, the measurement wins and you write both numbers down.

You are a free model. That means you finish slices. You do not stop to ask. You do not write a plan and go to sleep. You do not create a stub whose body is `throw new Error("NOT_IMPLEMENTED")` and call it a step. A file that cannot be executed against real rows is not progress.

---

## CURRENT TRUTH (verified 2026-09-26 night, before you start)

Worktree: `C:\Users\Garrett\Sports-wt-grok-reasoning`
Branch: `grok/reasoning-layer-2026-09-26`
HEAD at the time this prompt was written: `87d727475e17efe0cad90996c651fc7f4f7dcb5c`
Commit subject: `ingest: store the 2024 and 2025 nflverse grains`
That commit is local. Origin may still be at `fed4ef3cc`. Do not assume origin has your parent. Do not rebase. Do not push. Do not switch to `C:\Users\Garrett\Sports`. Do not run commands from `C:\WINDOWS\system32`. `npm` from System32 installs the wrong vitest and finds no tests.

`publishes_pick` stays false. OpenRouter stays fail-closed. You do not call a model. You do not spend an API key. You do not print a secret, a token, or a connection string.

The other checkout `C:\Users\Garrett\Sports` is not yours. Leave it.

The week-3 reading path is `readParts` in `packages/prediction-engine/src/reasoning/part-reading.ts` calling `aggregateSignals` in `aggregation-trace.ts`. A separate file already exists at `packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts` and calls `reasonAbout` in `packages/ingestion-pipeline/src/reasoning-trace.ts`. Leave that pair alone. Do not create a second copy under prediction-engine. Do not route the week-3 edge through it. `readingConclusion` lives in `part-selector.ts`. `scripts/engine-reading.mjs` may import `part-selector.ts`. It may not import `part-reading.ts`, because Node does not rewrite `.js` specifiers to `.ts`. Do not add `"type": "module"` to the prediction-engine package.

`packages/prediction-engine/src/engine/reasoning-surface.ts` stays unwired. Do not import the selector into it.

Eight LIVE parts are locked in `data/reasoning/parts-registry.jsonl`. They are the LAC@BUF week-3 numbers for `game_id` `2026_03_LAC_BUF`, week `2026-W3`. Copying a signed value onto the next game is a bug. The edge sum is `0.30259224777263855`. Coverage is `0.68`. Home is the sign of the sum. The trace encodes a signed part as `0.5 + 0.49 * clip(signed)`. That number is inside (0, 1). It is not a win probability. `publishablePick` is false. `confidenceIsProbability` is false.

| family | weight | signed on 2026_03_LAC_BUF | points |
|---|---:|---:|---:|
| on_field_efficiency | 0.14 | 1 | 0.14 |
| scheme_play_design | 0.12 | 0.033708224093976474 | 0.004044986891277177 |
| availability | 0.12 | 0.6666666666666666 | 0.08 |
| schedule_and_body | 0.08 | 0.08802857142857143 | 0.007042285714285714 |
| historical_strength | 0.08 | 0.5560780554178324 | 0.04448624443342659 |
| trench_personnel | 0.05 | 0.7486746146729814 | 0.03743373073364907 |
| chemistry | 0.04 | 0 | 0 |
| airwave | 0.05 | -0.2083 | -0.010415 |

Chemistry's zero stays in the sum. Herbert and Allen were still the snap leaders. SiriusXM is not the airwave row.

Four candidates are DARK because honesty failed (f1), not because a cell was empty. `g = 0.5`. `f2 = 0` for all four because none of them is already the representative.

- officials. 2025 holdout of 2024 crew means, n=113, r=-0.09257409956668071, slope=-0.010071677456738428, se=0.01028210084979805. `|r|` clears 0.08. `|slope|` does not clear se. Naming Shawn Smith on ATL@GB does not flip f1. A missing referee is not the winning term.
- weather_physics. Wind slope -0.135 per mph, se 0.1618, n=349. A forecast does not flip f1. `games.jsonl` has no wind or temp column.
- narrative_contract. Contracts were absent when this was scored. They are on disk now. That does not make the family LIVE. A new walk-forward fit has to clear both bars.
- coaching. Fourth-down go rate r=-0.01363209458605604, n=255. nfl4th is the same family. It is not a second live signal.

Priors on the reasoning edge (they sum to 1, do not add a ninth prior): efficiency 0.14, scheme 0.12, availability 0.12, schedule 0.08, historical 0.08, weather 0.07, coaching 0.06, trench 0.05, airwave 0.05, officials 0.04, chemistry 0.04, bio_nutrition 0.04, narrative 0.03, social 0, market 0.05, meters 0.03. Officials role in `engine-weights.ts` is `"dark"`. Dark-by-design prior mass is 0.24. Market is context, never the objective. Meters are meters, never the edge. A null value adds its prior to dark share. Context and meters never enter the tilt. `tilt === engine edge`. Missing signals add zero. Live families are not rescaled.

`SignalFamily` in `packages/types/src/signal-registry.ts` is a different union from those 16 directions. It has eight members: MARKET, EFFICIENCY, TRENCHES, LUCK, SITUATIONAL, NARRATIVE, MICROCLIMATE, MARKET_MICROSTRUCTURE. `DEFAULT_FAMILY_PRIOR_WEIGHTS` has eight keys summing to 1.00 (MARKET .28, EFFICIENCY .22, TRENCHES .14, SITUATIONAL .12, MICROCLIMATE .08, MARKET_MICROSTRUCTURE .06, LUCK .05, NARRATIVE .05). Two signals in different families count as independent corroboration. Two in the same family do not. Widening this union, or collapsing MICROCLIMATE into SITUATIONAL, manufactures phantom consensus. Do not do it to hit a count of 240.

Cycle 8 already ran. Do not run it again as if the files were missing. Verify the hashes. If they match, the files are the files.

| file | rows | bytes | sha256 |
|---|---:|---:|---|
| data/gse-dataset/contracts.jsonl | 11550 | 1793445 | badc5992543c91f46f855a0696c868767110dfd424b915286327967f8c98df06 |
| data/gse-dataset/rosters.jsonl | 99740 | 20872178 | 26d575409700c4273abb4c8c7c1e788b0fe3d832276cc73a9acde593e96afaf2 |
| data/gse-dataset/snap-counts.jsonl | 53228 | 12270533 | ac52ddceba431699640975c274835b3303cdff3e94707b4628df72f0f51fe39c |
| data/gse-dataset/participation.jsonl | 91103 | 55997774 | 8762b5b4806ede2bdf861578c149551c1b4fe9f4a8f9658b8dbe819add2b712b |
| data/gse-dataset/fourth-down.jsonl | 8465 | 1172393 | ef451ac5e7863a66aeca5de46c37caaaa6958f24f3ba6589a86243cb49284da7 |

Manifest: `data/gse-dataset/nflverse-ingest-manifest.json`. `publishes_pick` false. Seasons `[2024, 2025]`. Play-by-play `play_by_play_2024.csv.gz` does not contain `go_wp`, `punt_wp`, or `fg_wp`. Fourth-down rows are `pre_computed_go_boost_{season}.rds` from `nflverse/nfl4th` release `nfl4th_infrastructure`, parsed with Python `rdata` 1.1.0. The R model was not ported. `punt_wp` is null on 2321 of 8465 rows. Leave nulls null. `play_id` is an integer.

Snap counts have `game_id` and `pfr_player_id`. They have no `gsis_id`. Do not add one. Zero refusals on snaps and participation means every row had its join key. It does not mean the projector skipped the check. The check is in `packages/data-ingestion/src/nflverse/rows.ts` and `rows.test.ts`.

Participation `players_on_field` is an array parsed from `players_on_play` (the release column is not named `players_on_field`). First row of the file is `2024_01_TEN_CHI` play 40 with 22 GSIS ids. 2023+ participation is FTN Data via nflverse, CC-BY-SA 4.0. Internal storage. Not a commercial display. Contracts are OverTheCap facts packaged by nflverse. Attribute both in anything you derive.

`data/gse-dataset/bridge-premises.jsonl` already exists. It is not the missing file the document describes. The first rows are `signal_id: pregame_context_logit`, `method: logistic-irls`, `sample_count: 6955` on 2025 week-1 games, probabilities such as 0.8507 for `2025_01_DAL_PHI`. A constant sample count on holdout rows is a smell. Audit the writer before you trust a probability. Do not pipe this file into the live edge tonight unless `selectPart` returns LIVE on a fit that was not trained on 2025.

`apps/web/app/ai.txt/route.ts` already redirects through `absoluteUrl("/llms.txt")` from `apps/web/lib/seo/site-url.ts`. Canonical default is `https://www.galaxysportsedge.com`. The 2026-09-08 localhost bug is fixed in source. Do not rewrite a fixed route. If you can `curl -sI https://www.galaxysportsedge.com/ai.txt` and `Location` is not that https host, the bug is `NEXT_PUBLIC_APP_URL` in the deployed env. You cannot fix Vercel env from a guess. Write the header you observed and stop that slice.

`packages/prediction-engine/src/edge-lab/props-priced-edge.ts` is the market half of the prop stack. It Shin-devigs. Edge is `p - q`. It does not rank on confidence. Its header says it is pure and that `priced` stays false until a prop-line archive can settle CLV. That header is still true after you add an archive. The archive is accumulation. It is not proof.

LAC@BUF schedule context, not a bet: gameday 2026-09-27, outdoors, referee null, rest_diff 3, spread +7, total 49.5. Those prices are context. Sunday DraftKings salaries live in `DKSalaries-Week3-SunMon.csv` on rows whose Game Info contains `09/27/2026`. Monday 09/28 PHI@CHI and Thursday 09/24 ATL@GB are not the Sunday page. Ignore `AvgPointsPerGame`. Do not print a salary as a recommendation.

`scripts/connect-slate.py` roots at `/tmp/Sports` and reads `/tmp/player-stats`. Those paths are not on this Windows machine. If you need that rebuild, write the missing path and stop the slice.

NGS passing and receiving use `LAR`. `games.jsonl` and injuries use `LA`. Do not alias them in a way that double-counts. Write the mismatch down.

Vitest for the prediction engine runs from `packages/prediction-engine` (vitest 2.1.9). Data-ingestion tests run from `packages/data-ingestion`. Root `package.json` postinstall runs `db:generate`. Any `npm install` uses `--ignore-scripts --no-audit --no-fund`.

---

## FORBIDDEN

These are failed nights. Stop the slice when you hit one. Write the reason in the loop log. Continue at the next slice.

1. A push of any kind. `main` is never pushed. The feature branch is not pushed. No `--force`. No rebase. The document's line about `git pull --rebase origin hermes/night-shift-1` is stale. You are on `grok/reasoning-layer-2026-09-26`. Stay there.
2. `publishes_pick: true`, `publishablePick: true`, a public win rate, a public ROI, a public units number, a calibration page turned on, a pick sent to a feed, a bet placed.
3. Editing, backfilling, or "repairing" a frozen proof receipt. The 199 bad `entryOdds` rows stay. History is frozen. A write-guard stops new bad rows. It does not rewrite old ones.
4. Loosening `|r| >= 0.08` or `|slope| > se`. Loosening `minSampleCount`, `maxECE`, or the 4-leg substantiation guard. Turning officials LIVE because a crew name exists.
5. A second representative of a family that already has one. Known duplicate pairs: pbp CPOE and NGS CPOE; `schedules.weather` and `pbp.weather`; go-rate and nfl4th. A sibling helper is capped at 0.15. Drive-start is already that helper on scheme. nfl4th is the sibling of go-rate, not a new coaching part.
6. Adding a prior. Rescaling live families so the weights of the present signals sum to 1. Using market price or a meter as the objective.
7. Inventing nutrition, cognition, sleep scores, raw RFID, PFF grades, SIS charts, or SiriusXM audio. Those are unwired on purpose. `bio_nutrition` and `social` stay dark until a real measured series exists. A guessed series is not a series.
8. Scraping scores24, PFF, Sports Reference advanced stats (`pfr_advstats`), or SiriusXM. nflverse's own releases are the cleared path. `pfr_advstats` is not snap counts. Do not fetch it. Participation stays internal with the FTN attribution. No CAPTCHA bypass, no proxy rotation, no login bypass.
9. Porting the nfl4th R model. You already have the precomputed RDS columns.
10. Loading a full play-by-play season into memory to look for `go_wp`. The header probe already proved the columns are absent.
11. Widening `SignalFamily` to 240 members. Padding `feature-catalog.jsonl` with names you did not find in code or on disk so the count prints 240.
12. Creating a second `from-bridge.ts` or a second `reasonAbout`. One pair already lives under `packages/ingestion-pipeline/src/reasoning-trace/`. Leave it. The week-3 edge moves only when `selectPart` returns LIVE and `readParts` feeds `aggregateSignals`.
13. Touching blocked kernels: `props-dfs`, GLMF, `fitAlpha`, `ooEpc`, `bucketRoi`, `gaussCopulaJoint`, `opponent-adjusted-epa`, `reasoning-surface.ts`. Do not become a fifth concurrent writer on any file another process has open. If a test in those files fails, leave it and write BLOCKED.
14. `prisma migrate`, `db push`, anything that reads or prints `DATABASE_URL` / `DIRECT_URL`. If a measurement needs the database and the env is absent, the score is `NOT EVALUATED` and you name the missing env var. You do not invent a connection string.
15. A default sample count. A blank cell written as 0. A missing join key filled with a guessed id. An empty loader written as an empty success. `loadX returned 0 rows` is a thrown error.
16. Fitting any bridge, logistic, or weight vector on 2025 and then scoring 2025. 2025 is the holdout. Training years are earlier. Two seasons are not a training set. The current nflverse JSONL files are 2024 and 2025 only. Extend them before you fit. If the extension fails, you do not fit.
17. Setting `priced: true` on any edge-lab result. CLV does not exist until decision-time rows and later closing prices both exist and a settlement module you did not fake says so.
18. Putting I/O inside `pricePropAgainstMarket`. It stays pure. The archive writer is a separate function a caller invokes after a successful pure result.
19. Copying `signed` from `parts-registry.jsonl` onto any game other than `2026_03_LAC_BUF`.
20. Deleting the eight LIVE parts, the four DARK verdicts, or a test to make a suite green.

---

## THE SCALARIZER

This is the only way a number becomes LIVE.

Directions, one LIVE representative each: `on_field_efficiency`, `scheme_play_design`, `availability`, `schedule_and_body`, `historical_strength`, `weather_physics`, `coaching`, `trench_personnel`, `officials`, `chemistry`, `airwave`, `market_context`, `calibration_meters`, `bio_nutrition`, `narrative_contract`, `social`.

`market_context` never becomes the objective. `calibration_meters` never becomes the edge. `social` weight is 0.

After you have a real fit, not before:

- f1 = 0 when `|r| >= 0.08` AND `|slope| > se`. Otherwise f1 = 1. Honesty failing is DARK.
- f2 = 1 when that direction already has a representative in `parts-registry.jsonl`. Otherwise f2 = 0. Duplication is DARK. `has_representative` is not an argument you pass. You read the registry.
- f3 = 1 when the week-3 row for the game is missing. Otherwise f3 = 0.
- λ = (0.5, 0.3, 0.2). g = max(λ_i * f_i). Ideal is (0, 0, 0). g = 0 is the only LIVE path.
- If f1 is the winning term, DARK. If f2 is the winning term, DARK. If f3 is the only failure and the fit is real, STORED. STORED means the fit cleared and the row is missing. It does not mean you skipped the fit.
- A locked family with no numeric value on a game stays LIVE and contributes 0. That is not STORED.
- DARK reactivates only when the objective that failed flips. Naming a referee does not flip officials. A forecast does not flip weather. nfl4th does not flip coaching. A contract file existing does not flip narrative. The flip is a new holdout that clears both bars.
- Use `selectPart` / `selectWeek3Candidate` in `part-selector.ts`. Do not reimplement a looser copy. `selectWeek3Candidate` throws if the family is outside `CANDIDATE_FAMILIES`.

Home/away is the sign of the sum of prior × signed. Do not pick a side and then change the sign to match it.

---

## HOW YOU WORK

### Loop

You run cycles until morning or until the queue is exhausted. Each cycle is one slice. One slice is one commit, or one written blocker. Then the next slice.

At the start of cycle n:

1. Read the last line of `data/reasoning/overnight-loop.jsonl`. If the file does not exist, cycle 0 is Orient.
2. Re-read CURRENT TRUTH and FORBIDDEN in this prompt.
3. Do the `next` action on that line. If the same `next` appears on two consecutive lines, write `STUCK`, name the reason, and take the following queue item. Do not repeat a stuck slice.
4. Measure first. Then edit. Then test. Then commit. Then append the loop line.

Loop line, one JSON object, append-only:

```json
{"cycle":0,"utc":"...","slice":"orient","verdict":"PASS","measured":"...","commit":"...","next":"verify-hashes","blocker":null}
```

`verdict` is `PASS`, `DARK`, `STORED`, `NOT_EVALUATED`, `BLOCKED`, or `STUCK`. `measured` is a number you computed or the filename that was missing. `commit` is the full SHA or null when you did not commit.

### Audit

Every cycle also appends one row to `docs/reasoning/overnight-audit-2026-09-27.md` with: slice name, files touched, command you ran, exit code, the number, the scalarizer result if you ran one, what you refused to do.

You do not claim a test passed unless the command output is in your context. Paste the summary line (`Tests  4 passed`) into the audit row.

Before any commit:

- `git status` first. Stage files by name. Never `git add -A` or `git add .`.
- Do not stage `node_modules`, `data/gse-dataset/.cache`, `__pycache__`, `.env`, or a receipt dump.
- Run the narrowest test that covers the slice, from the package directory.
- If you changed TypeScript in `packages/data-ingestion` or `packages/prediction-engine`, run that package's `npx tsc --noEmit`.
- Secret scan runs in the commit hook. Do not bypass it with `--no-verify`.
- Commit message: one lowercase subject, body says what was measured and the holdout result. Write the message to `%TEMP%\msg.txt` with UTF-8 and no BOM, then `git commit -F`.
- After commit, `git status -sb` and `git rev-parse HEAD`. If the tree is dirty with files you did not mean to leave, fix that in the next slice. Do not amend a pushed commit. This branch's new commits are unpushed, and you still do not amend unless the commit has not left the machine and you created it in this same cycle and the hook has not been skipped. Prefer a new commit.

### Improvement rule

You may tighten a check. You may not loosen the scalarizer.

When a fit fails f1, store the coefficient, n, r, slope, and se in `data/reasoning/dark-candidates.jsonl` using the existing shape if one exists. Read the file before you append. A failed fit is wiring. The family stays DARK. The next cycle moves on.

When you discover a module that already outputs the same family as a LIVE part, wire it as a sibling at cap 0.15 or mark it duplicate. Do not give it a new prior.

When a test fails, fix the code. Deleting the assertion is forbidden.

When a data file's sha256 does not match the table above, stop the extension slice. Write both hashes. Do not overwrite the file to make them match.

When you finish a slice early, start the next one. Sleeping with a queue left is a failed night. Asking a question a file could answer is a failed night.

---

## QUEUE

Do these in order. Skip a slice only by writing `BLOCKED` or `NOT_EVALUATED` with the missing filename. Then continue.

### 0. Orient

Confirm `git rev-parse --abbrev-ref HEAD` is `grok/reasoning-layer-2026-09-26` and `git status -sb` shows that branch. If HEAD is not `87d727475e17efe0cad90996c651fc7f4f7dcb5c` and not a descendant you committed during this run, stop the whole night and write the SHA you found. Someone else moved the branch.

Create the loop file and the audit file. No other edits. Commit is optional for an empty orient. A loop line with `commit: null` is allowed for orient only.

### 1. Verify the five files

Hash each JSONL with a streaming SHA-256. Compare to the table in CURRENT TRUTH. Compare line counts. Confirm `publishes_pick` is false in the manifest. Confirm a participation row has `players_on_field` as an array. Confirm a snap row has no `gsis_id`. Confirm a fourth-down row can contain `punt_wp: null`.

If all match, loop verdict `PASS`. If one mismatches, verdict `STUCK` and you do not extend seasons.

### 2. Audit `bridge-premises.jsonl`

Count rows. List `signal_id` values and their counts. Distribution of `sample_count`. Count probabilities outside (0, 1). Count duplicate `game_id`. Find the writer with search. If every row shares one `sample_count`, write that number and the conclusion: this is not a per-game sample. If the writer fit on seasons that include 2025, the file is in-sample and must not be scored as a holdout. Do not delete the file. Do not feed it to `aggregateSignals`. Commit only if you add an audit note under `docs/reasoning/`. A code change is not required.

### 3. Production guards, source only

entryOdds. Find the pick-commit path that writes `entryOdds` onto a new receipt. American odds are integers with absolute value >= 100, or the standard +100 / -110 form. Values with absolute value below 100 (the frozen examples include -33, -43, -86) are invalid. Extremes like -10533 are a separate bug. Add a guard that rejects a new write when the value is non-finite, zero, or strictly between -100 and 100 exclusive. Do not update historical rows. Add a unit test that a -33 is rejected and a -110 is accepted. If you cannot find the writer, `NOT_EVALUATED` and the search paths you used.

ai.txt. Read the route. If it already uses `absoluteUrl`, do not edit it. Optional: one HEAD request to the public URL. Record the `Location` header. Done.

Confidence inversion. The document says realized win rate falls as confidence rises, and that `marketFairProb` leaks into confidence. Treat that as a hypothesis. Find the confidence function. Write a fixture test that fails if a market probability is added into the confidence number that is later shown as if it were an independent probability. If you cannot show the leak in a test, do not ablate anything. Leave the calibration page dark. Do not publish a bucket table of public win rates. If the only way to measure is a production database you cannot reach, `NOT_EVALUATED`.

Do not edit `LAUNCH` files. Those live in the intel repo, which you do not modify. Product code is this worktree only.

### 4. Decision-time price archive

Build `packages/prediction-engine/src/edge-lab/decision-time-price-archive.ts`.

`recordDecisionTimePrice(row)` appends one JSON line to `data/decision-time-prices/YYYY-MM-DD.jsonl`. The date is the UTC date of `decision_time_utc`. Append-only. The writer opens with the append flag. It never truncates. It writes to a temp name in the same directory and... no. Append-only means `fs.appendFile` of a single line, after validation, so two callers cannot leave a half-written first line from a truncate. Use an append of one complete line plus newline. If the directory is missing, create it.

Row:

- `game_id` string, non-blank
- `market_id` string, non-blank
- `side` string, non-blank (`over`, `under`, `home`, `away`, or another non-blank label you were given)
- `decision_time_price` finite American odds, not zero, absolute value >= 100
- `decision_time_utc` ISO-8601 that parses
- `model_probability` finite and strictly inside (0, 1)
- `devigged_market_prob` finite and strictly inside (0, 1)
- `edge` finite, and equal to `model_probability - devigged_market_prob` within 1e-9. If the caller passes a different edge, refuse. Do not recompute silently and store the caller's wrong edge.
- `model_source` non-blank string
- `covariates_hash` 64-char lowercase hex sha256

Refuse by throwing, or by returning a result object, but be consistent with the file you write, and test both the refusal and the fact that the file did not gain a line.

Keep `pricePropAgainstMarket` pure. No `fs` import in that file. Add `recordPricedPropEvaluation` beside the archive that accepts a successful priced result plus the ids and the hash, maps the fields, and calls `recordDecisionTimePrice`. `priced` on the result stays false. Do not flip it inside the recorder.

Tests in `decision-time-price-archive.test.ts`, run from `packages/prediction-engine`: append two rows, read them back in order, second call does not delete the first, zero price refused, NaN refused, probability 0 and 1 refused, probability 0.5 accepted, mismatched edge refused. Use a temp directory. Do not write the test rows into the repo's `data/decision-time-prices`.

Commit this slice alone.

### 5. Extend nflverse seasons, then stop before any fit

Only if slice 1 passed.

Change the ingest season list from `[2024, 2025]` to `[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]` for rosters, weekly rosters, snap counts, participation, and fourth-down RDS. Participation exists from 2016, snaps from 2012, fourth-down RDS you must HEAD before you assume a year exists. If a season 404s, record the refusal and continue with the seasons that exist. Do not invent the missing year.

Contracts: `loadContracts` is the full history. The window filter in `contractCoversWindow` keeps deals that cover 2024 or 2025. For a training history you need deals that cover 2018 through 2025. Extend the window function so a deal is kept when its signed span overlaps any season in the ingest list. `years == null` still does not get a guessed length. A contract with a null `gsis_id` is still refused. Re-read `rows.ts` before editing it. Update `rows.test.ts` so the old examples still mean what they say.

Re-run `npx tsx packages/data-ingestion/src/nflverse/ingest.ts` from the worktree. It will use memory. Participation for eight seasons is large. If the process dies on memory, load one season at a time and append, and keep the empty-loader guard and the sha256 seal. The manifest `rows` must equal the line count. `read` must equal `kept` plus the refusal sum.

Do not fit a model in this slice. Commit the new JSONL files, the manifest, and the loader change. The new hashes replace the table above for the rest of the night. Write them into the audit.

If this slice is too big for one commit because GitHub-sized files worry you, still commit. The user asked for the files. Participation at two seasons was 56 MB. Eight seasons may be large. If a single file would exceed 90 MB, split by season (`participation-2018.jsonl` ...) and list every file in the manifest with its own sha256. Do not silently drop a season to stay small.

### 6. Joins

After slice 5, or on the 2024–2025 files if slice 5 is `STUCK`.

Build a pure joiner in `packages/data-ingestion/src/nflverse/joins.ts`. No network.

- `indexRosters(rows)` keyed by season + `gsis_id`. Weekly and season rows stay distinguishable via `roster_level`. If two season rows share season + `gsis_id`, keep both and mark the key ambiguous. Do not pick one.
- `personnelForPlay(playersOnField, index)` returns matched roster fields and an `unmatched` id list. Null `players_on_field` returns null. It does not return an empty roster.
- Snaps join to rosters on `pfr_player_id` = roster `pfr_id` and season. A snap with no roster match is unmatched, not dropped and not given a synthetic `gsis_id`.
- Contracts join to that matched roster on `gsis_id`. Report match rate, unmatched count, ambiguous count.

Write `data/gse-dataset/join-report.json` with those counts and the season range. Do not write a million-row exploded personnel file unless the match rate is computed from a full pass that you can hash. A report plus a tested function is the slice. A sample of 20 joined plays in the report is allowed if every id in the sample came from the file.

This output is not a LIVE part.

### 7. One new measurement, narrative or coaching, not both if the first needs the whole night

Pick `narrative_contract` first if slice 6 produced a contract-to-snap match rate you trust. Otherwise pick coaching using `fourth-down.jsonl` joined to game outcomes already on disk (`games.jsonl` or the existing pbp-derived outcome file you find). Search before you assume the outcome file's name.

Walk-forward: fit on seasons strictly before 2025. Score 2025 games. Report n, r, slope, se. Run `selectPart`. If g is not 0, append a DARK or STORED row and do not edit `parts-registry.jsonl`. If g is 0, you may add one registry row whose `signed` is computed for `2026_03_LAC_BUF` only, with `signed_source` naming the formula and the files. Recompute the LAC edge from the registry. Run the prediction-engine reasoning tests. The old edge `0.30259224777263855` will change only if you added a LIVE part. Say the new sum. `publishes_pick` stays false.

Do not also flip officials or weather in this slice.

### 8. Walk the code

Directories under `packages/prediction-engine/src`:

automl, backtest, bayesian, bridge, calibration, causal, certificate, conformal, continual, decision, devig, dfs, dispersion, drift, edge-lab, engine, ensemble, eval, evaluation, expected-metrics, experimental, fantasy, features, gse-score, guards, honesty, hpo, injuries, inplay, invention, ladder, market, markets, metalearning, metrics, monitoring, nfl, nlp, odds, parlay, pipeline, projections, promotion, props, props-dfs, ratings, reasoning, research, rl, signals, simulators, sizing, spread, symreg, team-ratings, threat, timeseries, totals, tracking, weather, win-spread-total, winprob.

For each directory, append one row to `data/reasoning/module-ledger.jsonl`:

```json
{"dir":"reasoning","files":12,"exports_a_number":true,"data_file":"...","status":"wired|measured_zero|dark|catalogued|blocked|absent","note":"one sentence"}
```

`props-dfs` and any file matching the blocked-kernel names get `blocked` and you do not open them for editing.

A paper module under `packages/data-ingestion/src` whose export is an `ACCEPTANCE_GATE` string is `catalogued`. You may score one such gate the whole night, on data already on disk, with the holdout the gate names. If you cannot compute it, `NOT EVALUATED`. You do not score a second gate. You do not mark a gate passed because the string sounded right.

Status meanings:

- `wired`: a measured number is already in the registry or the edge sum.
- `measured_zero`: you computed a coefficient and it was zero or it failed f1. The zero is recorded.
- `dark`: failed the scalarizer.
- `catalogued`: the code exists and you did not have rows to score.
- `absent`: the directory is empty or the document named a file that is not there.
- `blocked`: forbidden kernel.

Do not give every directory a new TypeScript file. The ledger is the deliverable. A directory moves from `catalogued` to `measured_zero` only when you actually run the numbers.

### 9. Feature catalog

Write `data/reasoning/feature-catalog.jsonl`. One row per grain you saw in code or in a data file during slice 8. Fields: `grain_id`, `tier` (game, player_week, play, market, meta), `direction` (one of the 16, or `none`), `signal_family` (one of the eight, or `none`), `source_file`, `status` (same vocabulary as the ledger), `sample_count` (integer or null). Null sample count stays null.

The document's tables list 81 + 71 + 42 + 32 + 14 = 240 family labels. Those labels are a wish. A row enters the catalog when you found it. The morning count will be below 240. That is a pass. Adding the missing names with status `wired` is a fail. Adding them with status `catalogued` and `source_file: null` is also a fail. If you did not find it, it is not in the file.

### 10. Weights and calibration, only if slice 7 or slice 8 produced a settled vector

Do not build `weight-learner.ts` as an interface. Do not build `calibration-tracker.ts` that returns a hardcoded ECE.

If you have at least one settled vector of family contributions and outcomes on seasons before 2025, you may fit a weight update and score ECE, Brier, and log loss on 2025. The calibration contract from the document is the bar: sample at least 250, ECE at most 0.06, drift at most 0.10. Below the sample, status `INSUFFICIENT_SAMPLE` and `probabilityClaimsAllowed: false`. Write the numbers to `data/reasoning/calibration-holdout-2025.json`. Do not change product confidence. Do not turn the public calibration page on.

If you do not have 250 settled rows, skip the fit and write `INSUFFICIENT_SAMPLE` with the n you do have.

### 11. Dashboard from the files you wrote

`docs/reasoning/engine-dashboard.md` contains only counts and paths that exist in the ledger, the catalog, the loop log, the manifest, and the calibration file. Each number is followed by the path it came from. Sections: module ledger counts by status, catalog counts by status, nflverse manifest row counts and hashes, scalarizer verdicts for any new fit, price-archive test result, what stayed DARK, what you refused. No hit-rate projection. No "80%". No units.

### 12. Morning report

Append `docs/reasoning/morning-2026-09-27.md` using the template at the bottom. This is the last commit. Then stop. Do not start a new slice after the morning report.

---

## MEASUREMENT RULES

- Training rows: seasons ≤ 2024, or earlier if you extended the files. Holdout: 2025. Week 3 of 2026 is a live application of a locked formula, not a fitting sample.
- Report n, pearson r, OLS slope, and the standard error of that slope. `|slope| > se` uses that standard error, not a rounded one.
- A correlation without a slope and an se cannot pass f1.
- Do not drop zeros to inflate r. A real zero snap, a real zero chemistry, a null `punt_wp` are different things. Nulls are excluded from the regression and counted as excluded. Zeros stay in.
- Do not use the market line as a feature and then call the residual an independent edge.
- Closing-line value needs a decision-time price and a later price. You will not have the later price tonight unless it is already on disk. If it is not on disk, CLV is `NOT EVALUATED`.
- `e = p - q` with q from Shin, not from a proportional vig split, wherever `props-priced-edge.ts` is the market half.
- Probabilities stored for the trace stay inside (0, 1) only when they are probabilities. A signed part in [-1, 1] stays signed in the registry. Do not store the 0.5 + 0.49 encoding as if it were the part.
- Join keys: contracts and rosters need `gsis_id`. Participation needs `nflverse_game_id` and `play_id`. Fourth-down needs `game_id` and `play_id`. Snaps need `game_id` and `pfr_player_id`. Blank string is blank. Refuse the row.

---

## WHAT THE DOCUMENT GOT RIGHT

Use these. They survived a check against the tree.

- The product repo is this one. The intel repo is not wired into production, and you do not wire it tonight.
- Proof receipts are frozen. Independent hash verification is the product. You do not "clean" the ledger.
- Honest record math that keeps invalid American odds is garbage. You add a guard for new writes only.
- Public copy does not get a win rate, ROI, or units figure. The calibration page stays dark.
- `props-priced-edge.ts` and the `props-hb-*` modules are the independent prop stack. Edge is `p - q`. Confidence κ is not the ranking key.
- `priced: false` is correct until an archive exists and later settles. Tonight you may start the archive. You may not flip the flag.
- Poisson team rates that are not ingested must not be wired. A wired Poisson with invented lambdas is fabricated.
- Spend ceiling: do not call a paid odds API. The Odds API is metered. If a key is present you still do not burn the 500-request month on a loop. Read files already on disk.
- Kalshi and market prices are context and a devig input. They are not the target you fit.
- nflverse, Sleeper read-only, and penaltyblog are the free spine the document names. You already ingested nflverse. Do not start a new vendor.

## WHAT THE DOCUMENT GOT WRONG

Ignore these instructions where they conflict with CURRENT TRUTH.

- "Run the Cycle 8 ingest, the code exists, rdata is the only dependency." Cycle 8 has already been run and committed at `87d727475`. Verify hashes. Extend seasons only in slice 5.
- "The bridge premise file is the missing input." The file is on disk and unaudited. Slice 2 audits it.
- "Wire `from-bridge.ts` / `reasonAbout`." The ingestion-pipeline pair already exists and is not the week-3 edge. Do not add another copy, and do not point the locked parts at it.
- "Expand `signal-registry.ts` to 240 families." That file's `SignalFamily` union is eight members on purpose. Catalog grains elsewhere.
- "Build bridge, weight-learner, pick-pipeline, and settlement-loop as interfaces that return NOT_IMPLEMENTED." A stub night is a failed night. Fit or skip.
- "The engine fires on 5% of games and hits 80%." You do not choose a hit rate. You refuse when the scalarizer or the calibration contract fails. An empty fire set in the morning is a success. A printed 80% is a failure.
- "You will know the left tackle's MRI and the DC's blitz package." You will not, unless a cleared file on disk says so. Unavailable private data stays unavailable.
- "`/ai.txt` still 308s to localhost in source." Source already uses `absoluteUrl`. Verify the live header if you can. Do not patch the route a second time.
- "Rebase onto `hermes/night-shift-1` before any push." You do not push and you do not rebase onto that branch.
- "Register signals but do not implement them" as the whole of step 1. Implementation without rows is a stub. Rows without a scalarizer verdict are a catalog. Both are allowed only under the status words above.

---

## COMMANDS THAT WORK HERE

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning
git status -sb
git rev-parse HEAD
```

Prediction-engine tests:

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning\packages\prediction-engine
npx vitest run src/reasoning/part-selector.test.ts src/reasoning/live-edge-registry.test.ts src/reasoning/part-reading.test.ts
```

Data-ingestion tests:

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning\packages\data-ingestion
npx vitest run src/nflverse/rows.test.ts
```

Ingest, only in slice 5, from the worktree:

```powershell
Set-Location C:\Users\Garrett\Sports-wt-grok-reasoning
npx tsx packages/data-ingestion/src/nflverse/ingest.ts
```

Hash check:

```powershell
python -c "import hashlib,pathlib; p=pathlib.Path(r'data/gse-dataset/contracts.jsonl'); h=hashlib.sha256();
f=p.open('rb');
b=f.read(1<<20)
while b:
 h.update(b); b=f.read(1<<20)
print(h.hexdigest(), p.stat().st_size)"
```

Node cannot import `part-reading.ts` from an `.mjs` script. Vitest can. Do not "fix" that by adding a bundler.

---

## MORNING REPORT TEMPLATE

Write this to `docs/reasoning/morning-2026-09-27.md` and make it the last commit.

```
HEAD start: 87d727475e17efe0cad90996c651fc7f4f7dcb5c
HEAD end: <sha>
branch: grok/reasoning-layer-2026-09-26
pushed: no
publishes_pick: false

cycles: <n>
commits: <list of subjects and shas>
stuck: <slices and reasons>

nflverse: seasons actually on disk, row counts, sha256 per file, refusal totals
bridge-premises audit: signal_ids, sample_count fact, writer path or UNKNOWN_WRITER
joins: match rate, unmatched, ambiguous
new scalarizer verdicts: family, n, r, slope, se, g, LIVE or DARK or STORED
LAC edge: <number> (unchanged if no new LIVE part)
price archive: test summary line, priced still false
entryOdds guard: added or NOT_EVALUATED
ai.txt: source already absolute; live Location header or not requested
module ledger: counts by status
feature catalog: row count (this will be under 240)
calibration: n, ECE, Brier, log loss, or INSUFFICIENT_SAMPLE
one gate: id and score, or NOT EVALUATED

refused tonight:
- no push
- no public numbers
- no SignalFamily expansion
- no from-bridge.ts
- no priced:true
- no invented rows

still dark: officials, weather_physics, and any candidate that failed f1
next honest slice: one sentence a later agent can execute without asking
```

When the morning file is committed, stop. Leave the tree clean. Do not push.

The night is successful if every slice has a measurement or a missing filename, the eight locked parts are still the eight locked parts, officials is still DARK unless a new holdout cleared both bars, and nothing in the morning report is a number you did not compute.
