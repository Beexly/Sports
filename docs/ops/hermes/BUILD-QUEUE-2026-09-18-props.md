# Hermes build queue, 2026-09-18: the props lane is live

Issued by the architect session. Read this file top to bottom before you touch
anything, then work the tasks in order. This is your task list for this run.

`AGENTS.md` and `CLAUDE.md` bind you in full. Nothing here overrides a law. Where
this file and a law disagree, the law wins and you mark the task BLOCKED.

---

## 0. Why this run exists

The founder confirmed on 2026-09-18: **props are ON**. `EVENT_ODDS_INGEST_ENABLED`
and `LINE_ARCHIVE_ENABLED` are both set in Vercel Production. That resolves a
contradiction the standing notes carried for six days, where AGENTS.md:776-777
recorded both flags as on while AGENTS.md:437 said prop alignment was inert
pending the same flag. The flags are on. Treat 437 as stale.

This changes the lane from blocked to live, and it starts spending paid Odds API
credits on every refresh cycle. That is the urgency: **credits are being spent
right now, and nobody has verified that what they buy is landing in a table.**

### Ground truth, already verified by the architect session. Do not re-derive.

You will waste your run if you re-trace this. It is checked and correct as of
`origin/main`:

- `packages/ingestion-pipeline/src/event-odds-ingest.ts` is the only production
  entry. It FETCHES ONLY. Its own header says so: "Persistence is the caller's
  job (LINE_ARCHIVE / Odds rows). This module only fetches. Schema is sealed; we
  do not invent an EventOdds table."
- It is wired. `process-sport.ts:84` imports it and `:495` calls
  `ingestEventOddsIfEnabled`.
- It is credit-capped at `DEFAULT_EVENT_ODDS_CREDIT_CAP = 8` per cycle
  (`:24`), overridable by `EVENT_ODDS_CREDIT_CAP` (`:110-112`). It sorts event
  ids kickoff-first so the cap does not starve late games (`:116-122`, `:189`).
  It never calls historical endpoints, which cost 10x. It never throws.
- Books are `draftkings`, `fanduel`, `betmgm`. Markets are
  `player_pass_tds` and `player_receptions` for NFL, `player_points` for NBA.
- Persistence IS implemented, at `process-sport.ts:1032-1038`. It reads
  `eventOddsByExternalId.get(game.externalId)`, converts with
  `toPropLineSnapshotRows` (`packages/ingestion-pipeline/src/prop-line-rows.ts`)
  and passes the rows into `captureLineSnapshotsIfEnabled` alongside the featured
  rows.
- Props persist into `OddsLineSnapshot` with **no schema change**, because
  `market` is a free string. Featured rows use the enum-ish values; props use
  `player_receptions|justin_jefferson`. See `line-archive.ts:36-45`.
- `apps/web/lib/conviction/signals/prop-alignment.ts` exists and is written
  defensively. Its header warns that a demo pool with fictional players (the name
  "Silas Hart" appears) exists for UI work, and that a caller wiring that pool
  into the live path is the hazard. The signal itself only reads what it is
  handed.
- The hierarchical-Bayes props stack is roughly 30 files under
  `packages/prediction-engine/src/edge-lab/props-*`. It is exported from the
  package barrel and has **no production consumer**.

### The hazard the architect found, which is task 1

`process-sport.ts:1032` joins on `game.externalId`. The event-odds snapshots are
keyed by **The Odds API event id**. AGENTS.md documents FIXTURE TRIPLICATION: one
NFL fixture exists as THREE `games` rows, one carrying the odds-api id and two
carrying `espn:americanfootball_nfl:` and `espn:nfl:` ids.

If `game.externalId` on the row being processed is an ESPN id, that `.get()`
returns `undefined`, `propRows` is `[]`, and the cycle persists nothing for that
fixture **while still having paid for the fetch**. The failure is silent. There is
no error, no log line, and no counter that would show it.

So the first question of this run is not "do props work". It is: **on how many
fixtures does the join key match, and does anything at all reach the table.**

---

## 1. What you may not do, no exceptions

These are not suggestions and they are not negotiable. Breaking one discards the
run.

- **Do not touch a database.** No queries, no migrations, no probes, not even
  read-only. Law 7. If a task seems to need a database answer, you build the
  read-only tool that the founder runs, and you mark the task BLOCKED on that run.
- **Do not flip or read a secret, an env flag, or a gate.** Law 3. Props are
  already on; you never set, unset or verify a flag value yourself.
- **Do not install a package.** Law 7. Bare `npm install` for setup is fine.
- **Do not edit any forbidden path.** Law 2: `schema.prisma`, `migrations/**`,
  `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
  `package-lock.json`, `.gitignore`, `.githooks/**`,
  `apps/web/lib/ai-control-plane/**`.
- **Do not write SQL under the migrations directory.** Proposal SQL goes under
  `docs/ops/proposals/` and the founder applies it. You will not need any this
  run: props persist with no schema change.
- **Do not weaken a guard, loosen an assertion, or allowlist a phrase.** Law 9.
  If a guard is red, the code is wrong.
- **Do not let the demo prop pool reach a gate, a feature, or a training row.**
  Fictional players must never touch a real pick. This is the single most
  important rule of this run.
- **Do not publish anything.** Nothing in this queue changes a served number.
  Every task is capture, persistence, measurement or a withhold-only path.
- **Do not bump MODEL_VERSION** and do not touch `constants.ts`.
- **Do not `git push`** unless the founder said so for this session. Otherwise
  commit locally and record `UNPUSHED` with the branch and SHA.

---

## 2. How to work

Follow AGENTS.md THE LOOP. Claim your ledger row in `docs/ops/AGENT_LEDGER.md`
in the same commit that starts the work, owner `hermes`, one row per task below.
Titles must be unique. `DONE` needs a real SHA.

**Verify block before every code commit. Real exit codes, never piped away:**

```bash
npm run typecheck                       # exit 0
npm run lint                            # exit 0
npx vitest run <this task's test file>  # green
```

Before the final commit of the run, also:

```bash
npm run guardrails                      # 26/26
node scripts/ops/check-agent-ledger.mjs # only the known M-1 violation
```

**M-1 is expected to fail and is not yours.** Row M-1 carries owner `motif`,
which is outside the allowed set. It is red on `main` too. Ledger rule 2 forbids
you editing a row you do not own. Leave it. Do not comment on it.

**Two attempts per task, then stop.** Revert, mark BLOCKED with the exact error
text pasted in, move to the next task. A BLOCKED task with an honest error is a
success. A third attempt is not.

**One task, one commit. Stage by name.** Never `git add -A`. Tag every commit
`[hermes-props-N]` where N is the task number.

---

## 3. The tasks, in order

### Task 1. Make the silent prop join failure impossible to miss

**Why.** Described in section 0. A join miss costs paid credits and produces
nothing, with no signal anywhere.

**Build.** The counters live in `process-sport.ts`'s per-game loop, NOT inside
`event-odds-ingest.ts`, which is fetch-only by design and has no visibility into the
per-game join that is the thing being measured. Extend the reporting so every cycle
records, per sport:

- `eventsFetched`: how many event-odds responses came back
- `snapshotsKeyed`: how many went into the map
- `fixturesMatched`: how many `games` rows found a snapshot by `externalId`
- `fixturesUnmatched`: how many did not
- `propRowsBuilt`: total rows out of `toPropLineSnapshotRows`
- `propRowsPersisted`: what was handed to `captureLineSnapshotsIfEnabled`

Log one structured line per sport per cycle. When `eventsFetched > 0` and
`propRowsBuilt === 0`, log it at error level with the words "paid for event odds
and built zero prop rows", because that is the exact failure that is otherwise
invisible.

**Do not** change the join, the cap, the books or the markets in this task. This
task only makes the current behaviour observable. Changing behaviour and
measuring it in the same commit is how you lose the ability to tell which one
did what.

**Definition of done.** New unit test file
`packages/ingestion-pipeline/src/__tests__/event-odds-join-observability.test.ts`
with at least these cases, all green:
1. every fixture matches: counters agree, no error log
2. no fixture matches although events were fetched: `fixturesUnmatched` equals
   the fixture count AND the error-level line fires
3. flag off: every counter is zero and nothing logs
4. a fetch failure: counters still emit, nothing throws

### Task 2. Enumerate the join-key mismatch statically

**Why.** Task 1 measures it at runtime, which needs a deploy. We can bound the
problem now, from code, with no database.

**Build.** A read-only script at
`scripts/ops/report-prop-join-coverage.mjs` that takes a JSON fixture file of
`{ externalId, sportKey }` rows (so it needs no database) and reports how many
external ids look like Odds API event ids versus ESPN-shaped ids
(`espn:*`), grouped by sport. Derive the shape predicates from the code that
already holds them: `packages/ingestion-pipeline/src/fixture-collapse.ts:65` defines
`isEspnExternalId` and uses it at `:90-91`, and
`packages/ingestion-pipeline/src/game-identity.ts` carries the identity rules. **Do not use
`fixture-confirmation.ts`;** an earlier draft named it and that was wrong, it is the ledger
C-111 schedule guard and holds no id-shape logic. Do not invent a new format guess.

**Definition of done.** The script runs against a committed sample fixture in
`scripts/ops/__fixtures__/` and prints a table. A unit test pins the classifier
on both id shapes. The founder can later run it against a real export; you never
run it against a database.

### Task 3. Prove the demo pool cannot reach the live path

**Why.** `prop-alignment.ts` warns about it in prose. Prose is not a guard.

**Build.** A test, not a refactor, co-located with its siblings as
`apps/web/lib/conviction/signals/prop-alignment-no-demo-pool.test.ts`. Every existing test
in that directory is co-located rather than in a `__tests__` subdirectory.

**Scope it to the conviction call chain, NOT to all of `apps/web`.** This is measured.
`apps/web/lib/fantasy/props.ts` is the fictional pool ("Silas Hart" at `:169`), and three
production modules import it today: `components/fantasy/props-edge.tsx`,
`components/fantasy/pickem-ranker.tsx` and `app/fantasy/props/page.tsx`. Those are fantasy
UI surfaces rendering sample data behind the honesty badge this repo already ships. They
are not this guard's business, and a guard scoped to every production module would fire on
all three and send you to BLOCKED over something known and labelled.

**Also verified, so you do not go hunting:** `prop-alignment.ts` does NOT import the
fictional pool. Its only import is `../gate-contract`; the mention at `:28` is a comment
warning against it. The conviction gate still has zero importers outside its own directory,
so no fictional row can reach a pick today. This guard exists to keep it that way.

Assert that nothing under `apps/web/lib/conviction/**` imports `lib/fantasy/props` or any
other sample pool, transitively. Enumerate offenders rather than assert a count, and print
them in the failure message.

Also assert that `prop-alignment` returns `null`, never a neutral or zero vote,
when it is handed an empty or absent prop set. A null is not a vote. A neutral
is. That distinction is load-bearing and must be pinned.

**Definition of done.** Both assertions green. If you find a real importer, do
not fix it silently: mark the task BLOCKED, name the file, and stop. A live
fictional-data path is an architect decision, not a mechanical fix.

### Task 4. Give the props stack one honest consumer, in shadow

**Why.** Roughly 30 files under `edge-lab/props-*` have no production consumer.
The point of this task is NOT to publish a prop pick. It is to make the stack
reachable, measurable and killable.

**Build.** A shadow-only evaluation entry that, given a set of persisted prop
line rows, runs the existing HB stack and records its output to a shadow store.
Reuse what exists. Do not write a second scoring path.

Hard constraints:
- It writes nothing a published number reads.
- It never calls the Odds API. It consumes rows already persisted.
- It is gated so that it no-ops when it has no real rows, and it never
  substitutes a sample.
- It must not import `apps/web` from `packages/*`. That direction is forbidden by
  the workspace graph. Anything it needs from the web app is injected.
- It must not add a cross-package import into `apps/web/lib/board/state.ts` or
  the picks route. 22 files under `apps/web` partially mock
  `@sports/prediction-engine`, so a new import there resolves to `undefined`
  under those mocks and collapses the board. `@sports/types` is the boundary that
  crosses intact.

**Definition of done.** A unit test proving: real rows in, output recorded; zero
rows in, no-op and no write; no import of `apps/web` anywhere in the new code
path, asserted by a test that walks the import graph.

### Task 5. Write the prop pre-registration, do not run it

**Why.** Every signal enters through one door: a pre-registered hypothesis with a
kill line written first. Props are not exempt, and being excited about a live
feed is exactly when that discipline gets skipped.

**Build.** One JSON pre-registration per candidate prop market under
`docs/calibration-proposals/feature-trials/`.

**Correction, verified: `edge-lab/trials-registry.ts` does NOT already define this shape.**
An earlier draft of this task said it did. Its `TrialInput` (`:35-47`) carries only
`trialId`, `family`, `kind`, `recordedAt`, `params` as a free-form `Canonical` blob,
`pValue` and an optional statistic. None of the pre-registration fields exist there, and
`params` is exactly the untyped slot they would occupy. You are DEFINING a shape, not
conforming to one.

**The shape is FIXED ELSEWHERE. Do not define it here.** It is architecture section 8.6
Track F item F8 in `docs/architecture/2026-09-18-signal-architecture.md`, and mainline queue
task 12 builds `preregistration.ts`, the loader that reads these files and refuses an
uncommitted one, against that same list. **Eight fields, not seven:** the hypothesis in one
sentence, the exact feature definition, the code hash, the stratum list, the kill line as a
NUMBER with its confidence level and its n floor, the family id for multiple-comparison
control, the **false-discovery level**, and the placebo spec.

An earlier draft of this task listed seven, omitting the false-discovery level, and told you
to define the shape here if mainline task 12 had not landed yet. That was wrong in a way
worth naming, because it is the failure mode this mechanism exists to prevent. Props runs
before mainline in the queue order, so the seven-field shape would have been committed
first, and then mainline's loader either refuses files that a pre-registration is by
definition not allowed to edit after commit, or someone loosens the validator to accept
them, silently dropping the field that controls multiple comparisons. Write all eight,
whether or not `preregistration.ts` exists yet.

Start with `player_receptions` and `player_pass_tds` for NFL only, because those
are the two markets the ingest actually fetches.

**You do not run any trial this run.** Writing the pre-registration is the task.
Running it before its commit is an ancestor of HEAD would defeat the entire
mechanism.

**Definition of done.** The files validate against the registry's expected shape,
pinned by a test. No trial is executed.

### Task 6. Prop capture freshness has no monitor. Give it one.

**Why.** The line archive died silently for three weeks in August because a catch
swallowed the failure and the only signal was a row count. Nothing monitors
`odds_line_snapshots` freshness to this day. We are now writing a new row family
into the same table with the same failure mode, and paying for it.

**Build.** A prop-capture freshness reading: last prop-market row timestamp per sport, and
an alarm predicate when it exceeds a stated threshold while the flag is on. It reads; it
never writes; it never throws into the caller.

**Where it goes, and this matters more than the reading itself.** The architecture treats
this as ONE workstream, Track A item A12, whose named file is
`apps/web/lib/data-reliability/capture-freshness-manifest.ts`, one entry per capture family,
generalizing the proven `classifyGlobalMaxFetchedAt` pattern. Mainline queue task 8 builds
that generalized manifest. So: **if `capture-freshness-manifest.ts` exists when you get
here, add prop-market rows as ONE MORE FAMILY inside it and add no new file.** If it does
not exist yet, build the narrow version, name `capture-freshness-manifest.ts` in your ledger
evidence as the file that must absorb it, and say so in the module's header comment.

Building a second, parallel monitor is the specific outcome to avoid. Two files spelling one
thing differently is exactly the drift that let the line archive die for three weeks, and
the eight single-purpose monitors already in that directory make it the path of least
resistance.

**Definition of done.** Unit test covering fresh, stale and flag-off. The reading
appears on the truth surface the ops route already renders. No database call from
your session: the loader is injected and the test supplies a fake.

---

## 4. What to escalate instead of deciding

Stop and write the question into your ledger row rather than choosing, if you hit
any of these. They are architect or founder calls and a wrong guess is expensive:

- The join key is wrong in a way that needs the join CHANGED, not just measured.
  Changing fixture identity resolution touches the triplication problem and the
  twin-candidate logic, and it can silently re-scope the whole board.
- Any prop path that would reach a published number, a tier, a rank or a customer
  string.
- Any finding that a fictional pool already reaches a live path.
- Anything that wants a schema change. Props need none. If you think you need one,
  you have taken a wrong turn.
- Any temptation to raise the credit cap. That spends the founder's money.
- A conflict between this queue and a law.

---

## 5. What done looks like for the whole run

Six ledger rows, each DONE with a real SHA or BLOCKED with a pasted error. A
working tree that passes typecheck, lint, 26/26 guardrails, and whose only ledger
violation is the pre-existing M-1. No flag touched, no schema touched, no
published number moved, no fictional row anywhere near a real pick.

And one honest sentence in your final ledger evidence answering the question this
run exists to answer: **is anything actually landing in the table we are paying
for.**
