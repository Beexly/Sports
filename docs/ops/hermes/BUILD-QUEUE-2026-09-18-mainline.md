# Hermes build queue, 2026-09-18: mainline

Issued by the architect session. This is the large queue. The props queue
(`BUILD-QUEUE-2026-09-18-props.md`) is separate and runs first if you have not done it.

`AGENTS.md` and `CLAUDE.md` bind you in full. Nothing here overrides a law. Where this
file and a law disagree, the law wins and you mark the task BLOCKED.

Work the waves in order. Inside a wave, tasks are independent and order does not matter.
Do not skip ahead: wave 1 is small and fixes things every later wave reports through.

---

## 0. The standing contract

### What you may never do, no exceptions

- **No database.** No queries, no migrations, no probes, not even read-only. Law 7. If a
  task appears to need a database answer, build the read-only tool the founder runs and
  mark the task BLOCKED on that run.
- **No env flag, no gate, no secret.** Law 3. Never set, unset, read or verify a flag.
- **No package installs.** Law 7. Bare `npm install` for setup is fine.
- **No forbidden paths.** Law 2: `packages/db/prisma/schema.prisma`, `migrations/**`,
  `.github/workflows/**`, `scripts/guardrails/**`, `.claude/**`, any `.env*`,
  `package-lock.json`, `.gitignore`, `.githooks/**`, `apps/web/lib/ai-control-plane/**`.
- **No new guardrail scripts.** `scripts/guardrails/**` is frozen. Every new guard in this
  queue is a **test** under a `__tests__` directory. That is deliberate and not a
  workaround: a test runs in CI through the existing job and needs no frozen file touched.
- **No schema change.** Every task here fits existing tables. If you think you need a new
  column, you have taken a wrong turn; mark BLOCKED and say which task.
- **Never weaken a guard**, loosen an assertion, delete a banned phrase, or lower a
  threshold. Law 9. A red guard means the code is wrong.
- **Never change a published number**, a tier, a rank, or a customer-facing string unless
  a task says so explicitly. None of them do.
- **No `MODEL_VERSION` change.** Do not touch `constants.ts`.
- **No `git push`** unless the founder said so for this session. Otherwise commit locally
  and record `UNPUSHED` with branch and SHA.
- **Never fabricate.** If a number is not measured, it does not exist. Do not close a gap
  with a default, a heuristic profile, a rule-based matrix or a priority weight. Absent
  means silent, never assumed.

### Two structural traps that will bite you

1. **22 files under `apps/web` partially mock `@sports/prediction-engine`.** A NEW
   cross-package import into `apps/web/lib/board/state.ts` or `apps/web/app/api/picks/route.ts`
   resolves to `undefined` under those mocks and collapses the board to zero rows.
   `@sports/types` is the boundary both sides cross intact. If a task needs a shared
   predicate on the web side, it goes in `packages/types`.
2. **`packages/*` must never import `apps/web`.** The workspace graph forbids it. Anything
   the engine needs from the web app is injected as a function by the cron route.

### How to work

AGENTS.md THE LOOP. Claim your ledger row in `docs/ops/AGENT_LEDGER.md` in the same commit
that starts the work, owner `hermes`, one row per task. Titles unique. `DONE` needs a SHA
that resolves for someone else, not just in your working copy.

**Verify block before every code commit, real exit codes, never piped away:**

```bash
npm run typecheck                       # exit 0
npm run lint                            # exit 0
npx vitest run <this task's test file>  # green
```

Before the final commit of the run:

```bash
npm run guardrails                      # 26/26
node scripts/ops/check-agent-ledger.mjs # only the known M-1 violation
```

**M-1 is expected to fail and is not yours.** Owner `motif`, outside the allowed set, red
on `main` too. Ledger rule 2 forbids editing a row you do not own. Leave it, do not
comment on it.

**Two attempts per task.** Then revert, mark BLOCKED with the exact error pasted in, move
on. A BLOCKED task with an honest error is a success.

**One task, one commit.** Stage by name, never `git add -A`. Tag `[hermes-main-N]`.

---

## Wave 1: three verified defects, small and precise

These are already diagnosed. Do not re-investigate, implement.

### Task 1. Make the conformal quantile refuse instead of clamping

`apps/web/lib/calibration/cqr.ts:12-15` computes
`rank = ceil((1 - alpha) * (n + 1)) - 1` then clamps with
`Math.min(Math.max(rank, 0), n - 1)`. At n 5 and alpha 0.1 the clamp silently returns the
largest available score and the function reports 90 percent coverage while delivering
83.33 percent.

The correct pattern already exists in this repo:
`apps/web/lib/calibration/conformal-calibration.ts:174` returns `Number.POSITIVE_INFINITY`
below its `minN`. Copy that behaviour: when the finite-sample rank would exceed `n - 1`,
return positive infinity rather than clamping. An infinite width is an honest refusal; a
clamped width is a false coverage claim.

**Definition of done.** `apps/web/lib/calibration/__tests__/cqr-refuses-small-sample.test.ts`
proving: at n 5 alpha 0.1 the function returns positive infinity, not a finite score; at a
sample large enough for the requested level it returns the correct order statistic; the
existing callers handle an infinite width without throwing. Do not change any floor.

### Task 2. Close the null-clock leak in the TRAINING loader only

`apps/web/lib/calibration/in-play-exclusion.ts:60-66` keeps a row when either clock is
null. Its own doc comment says so: "a null on either keeps the row."

**Read this twice.** Do NOT change `partitionInPlay`'s behaviour for the eligibility
sample. That sample is a gate input and changing what it counts is founder-only under
law 3. Instead add a SEPARATE, stricter predicate for training-set use, exported alongside
the existing one, which excludes a row when either clock is unreadable and returns the
excluded rows tagged with a reason so the caller can count them.

The architecture states this exact split: training is stricter than eligibility, and says
so out loud.

**Definition of done.** A test proving the new predicate excludes a null-clock row and the
existing `partitionInPlay` still keeps it, in the same file, side by side, so the asymmetry
is visible and deliberate. Zero change to any eligibility artifact.

### Task 3. Pin what the sort key actually does today

`apps/web/lib/ranking/sort-key.ts` reads `rankingP` as its primary key.
`packages/prediction-engine/src/ranking-prob.ts` computes `rankingP` as
`0.7 * trueProb + 0.3 * (confidence / 100)`, and its own line 40 says a missing or
non-finite `trueProb` falls back to confidence only. So confidence reaches the ordering
three ways: always at 30 percent weight, entirely when `trueProb` is absent, and twice more
as a terminal fallback inside `sort-key.ts`.

**You are not fixing this.** Changing the ordering changes what a paying customer sees and
is founder-gated. You are PINNING it, so the gap between the document's invariant and the
code is a failing-or-passing test rather than a paragraph.

**Deduplicated:** the ranking queue's task 1 is the same file. If that queue got there
first, mark this row DONE citing its SHA and move on. Do not build it twice.

**Definition of done.** `apps/web/lib/ranking/__tests__/sort-key-confidence-paths.test.ts`
with one case per route, each asserting the CURRENT behaviour and carrying a comment naming
it as current-not-desired, plus a reference to the founder decision in architecture
section 7. Do not change `sort-key.ts` or `ranking-prob.ts`.

---

## Wave 2: capture, because wall-clock time is the only thing we cannot buy back

Every day one of these is not logging is a day of sample that never exists. None of them
touches a published number. All of them write to tables that already exist.

**The uniqueness trap, read before writing any capture.** `GameSignal` is unique on
`(gameId, sourceName, signalKey)` and `Signal` on `(entityType, entityId, key, season, week)`.
Both are latest-value stores, not logs. An upsert under a shared key silently destroys the
prior observation, which is the same sample destruction this wave exists to prevent. When
the fact is point-in-time (a forecast at a lead time, a dated snapshot), the distinguishing
dimension goes INSIDE the key, so each observation lands on its own row.

**The bootstrap trap.** `GameSignal.isBootstrap` defaults to `true` and readers filter on
it. Every writer you add passes `isBootstrap: false` EXPLICITLY at the call site. `true` is
reserved for a sample backfill you will never perform.

### Task 4. Persist the nflverse officials dataset

`packages/data-ingestion/src/nflverse-source.ts:160-164` registers `officials`, grain
`game`, since 2015, one all-time file. Nothing has ever persisted it.

Write one `GameSignal` row per game under an officials source category, resolving the
nflverse game id to this platform's `Game.id` by season, week and team abbreviation.

**Correction, verified.** An earlier draft said that join "already exists in
`context-enrichment.ts`; copy it". It does not; that module's only lookup is a
`teamGameLog.findFirst` at `:116`. The closest real precedent is
`packages/data-ingestion/src/nfl-preseason-map.ts`, which remaps feed rows onto existing
games **by team pair plus commence time** using `normalizeComparableText` from
`team-text-match.js`, and `packages/data-ingestion/src/nflverse-id-crosswalk.ts`, which is
the season-matched identity crosswalk for PLAYERS and carries the law "never invent an id".

Neither is the same key shape you need, so you are writing this join, not copying one. Reuse
`normalizeComparableText` for team-name comparison rather than writing a third
normalization, apply the crosswalk's law (never invent an id, refuse and count instead), and
say in your ledger evidence that the join is new.

**Definition of done.** Unit test with a fixture covering: a matched game writes one row
with `isBootstrap: false`; an unmatched game writes nothing and is counted; a re-run is
idempotent.

### Task 5. Persist NWS weather per game, per lead time

`apps/web/lib/weather/game-weather.ts` fetches a real NWS forecast and stores nothing, with
a 60-minute in-memory cache. It is already clearance-gated.

Write one `GameSignal` row per game per lead-time bucket, with the bucket IN the signal key
(for example `forecast_t_minus_24h`, `forecast_t_minus_6h`, `actual_at_kickoff`) so the
uniqueness constraint cannot collapse four observations into one.

**NWS only.** Do NOT wire Open-Meteo. Its own module comment flags the free hosted tier as
non-commercial or fair-use, which is a genuine rights ambiguity and a founder ruling, not a
deferral of convenience.

**Definition of done.** Unit test: three lead times produce three rows; a re-run at the
same lead time is idempotent; a fetch failure writes nothing and throws nothing.

### Task 6. Put the three orphan persisters on a cron

`apps/web/lib/ingestion/pfr-adv-stats.ts`, `team-week-stats.ts` and `rush-tendencies.ts`
exist, compile, and are already clearance-gated (two through the shared nflverse ingestion
gate wrapper, one directly). Nothing calls them, so `PfrAdvStat` and `TeamWeekStat` are
never written.

Add them to an existing cron route following the satellite pattern in
`apps/web/app/api/cron/refresh-player-stats/route.ts`. Do not add a new `vercel.json`
entry; a new schedule needs founder review.

**State the expected outcome honestly in the code comment and your ledger evidence:**
`pfr_advstats` is `permission_required` with `automation_allowed: false` in the app rights
registry, so its writer will fail closed and persist ZERO rows until a founder rights
ruling. That is correct behaviour and the point of the task is that the path exists and is
observable, not that data flows. Do not "fix" the clearance refusal.

**Definition of done.** Unit test: each persister is invoked once per run; a clearance
refusal is counted and does not throw; the route still succeeds when all three write zero.

### Task 7. Cron the historical archive backfill

`apps/web/app/api/cron/backfill-historical-games/route.ts` exists and wraps
`ingestHistoricalGames`, one fetch of a single all-seasons asset. It has no cron entry, so
`HistoricalGame` is manual-only, and that archive is what makes leave-one-season-out
validation possible.

Same constraint as task 6: attach to an existing route rather than adding a schedule.

**Gate it, or it fires every cycle.** `ingestHistoricalGames` replaces a whole table from a
single all-seasons asset. Attached naively to a route that runs every fifteen minutes it
would do that replace every fifteen minutes. Put it behind a low-frequency predicate
modelled on `apps/web/lib/ingestion/satellite-window.ts`, which already expresses
"once per day in a stated window" against the labelled season. Weekly is enough for an
archive that changes weekly.

**Definition of done.** Unit test that the route is reachable, that the frequency gate
refuses outside its window, and that a re-run inside the window is idempotent.

### Task 8. Alarm on capture staleness

Nothing in this repository monitors `odds_line_snapshots` freshness. That is how the line
archive died silently for three weeks in August: the failure was swallowed into a row count
and no alarm existed to trip.

Build `apps/web/lib/data-reliability/capture-freshness-manifest.ts`, the file architecture
Track A item A12 names: a generalized capture-freshness reading, one entry per capture
family, last row timestamp per family, and an alarm predicate when it exceeds a stated
threshold while that family is expected to be writing. Generalize the proven
`classifyGlobalMaxFetchedAt` pattern rather than inventing a new one. It reads, never
writes, never throws into its caller. The loader is INJECTED so your test supplies a fake
and your session never touches a database.

**Use that exact filename.** The props queue's task 6 is the same mechanism scoped to prop
rows, and it is now instructed to register prop-market rows as one family inside THIS file
if it exists, or to flag itself for absorption into it if it does not. If you name the file
something else, that handshake silently fails and the repository gets two freshness monitors
instead of one.

**Definition of done.** Unit test covering fresh, stale, and not-expected-to-be-writing.
The reading appears on the ops truth surface that already renders reliability output.

---

### A wiring requirement that applies to tasks 4 and 5

Tasks 6 and 7 say explicitly to attach their writers to an existing cron route. Tasks 4 and
5 did not, and a writer nobody calls captures nothing. Since this wave's whole argument is
that every day not logging is sample that never exists, a task that builds a writer and
leaves it unreachable fails its own purpose while looking complete.

So: tasks 4 and 5 each attach their writer to an existing route, the same way tasks 6 and 7
do, with no new `vercel.json` entry. If you cannot find a suitable route, do NOT add a
schedule; mark the task BLOCKED and say which route you considered and why it did not fit.

And when you write the run's closing ledger evidence, only claim as "now capturing" what is
actually reachable from a scheduled route. A writer that exists but is called by nothing is
reported as built-not-wired, plainly.

---

## Wave 3: close the learning loop

Every component of a continuous loop exists in this repository and not one is wired to a
schedule. That is the reason ten months of work has not compounded. These four tasks are
the crank.

### Task 9. Give walk-forward a fixture group key

`packages/prediction-engine/src/edge-lab/walk-forward.ts:80-137` sorts by decision time and
cuts folds by ROW INDEX. It has no group key at all; grep for `group`, `fixture` and
`gameId` returns nothing. One game contributes up to three markets whose outcomes move
together, so a fold boundary can put the same fixture on both sides and every bound
computed from it overstates the evidence.

Add an optional group key. When supplied, no group may appear in both the training and test
side of any fold. When omitted, behaviour is byte-identical to today, so nothing that calls
it now changes.

**Definition of done.** `walk-forward-fixture-grouping.test.ts` proving: with a group key,
no fixture spans a fold boundary, asserted by enumeration not by count; without one, the
existing tests still pass unchanged.

### Task 10. Let the market probability enter as a fixed offset

`packages/prediction-engine/src/edge-lab/logistic.ts:94` states in its own comment that the
gradient step is "ridge-penalized log-loss (intercept unpenalized)", and `:109` applies
`lambda * w[j]` to every coefficient. So a head built naively on it shrinks toward the BASE
RATE, not toward the market, which loses the entire safety property.

Add support for a fixed offset term: a per-row value added to the linear predictor with its
coefficient pinned at 1 and never penalized or updated. Existing callers that pass no
offset must be byte-identical.

**The identity test is the point of the task:** as the penalty grows without bound, a head
with the market logit as its offset must reproduce the market probability exactly.

**Definition of done.** `market-offset-identity.test.ts` proving the identity property at
large lambda, plus a test that the no-offset path is unchanged. Do not wire this into any
production scorer. It is a library capability this run, nothing more.

### Task 11. Give the evidence readiness matrix a runtime caller

`packages/prediction-engine/src/evidence-readiness-matrix.ts` defines 13 factor keys with
per-factor trust, sample and age floors at `:18-31` and `:82-252`. It is exported from the
barrel at `packages/prediction-engine/src/index.ts:168` and called by NOTHING at runtime. It is the registry contract this
architecture needs and we wire it rather than inventing a second one.

Build a loader that takes a factor key and an evidence bundle and returns the matrix's
verdict, with a pure function boundary so it needs no database. Wire it to one read-only
surface that reports readiness per factor. It must not gate anything yet.

**Definition of done.** Unit test per verdict branch, and a test asserting the loader
reports on all 13 keys rather than a hardcoded subset, enumerating them from the matrix
itself so the count cannot drift.

### Task 12. Make pre-registration a committed file, not a runtime timestamp

`packages/prediction-engine/src/edge-lab/trials-registry.ts` implements a hash chain and
Benjamini-Hochberg control and has never run. Its `recordedAt` is caller-supplied and the
only existing runner stamps it at execution time, so "the chain timestamp precedes the
result" is satisfied by construction by every run, including one that peeked.

Build a loader that reads a pre-registration JSON from `docs/calibration-proposals/feature-trials/`
and refuses to run a candidate whose file is not already committed. Shape per candidate:
hypothesis, exact feature definition, code hash, stratum list, kill line as a NUMBER with
its confidence level and n floor, family id, false-discovery level, placebo spec.

**Definition of done.** Unit test: a committed pre-registration loads; a missing or
malformed one refuses; a kill line that is not a number refuses. **Run no trial.**

---

## Wave 4: enumerating guards, so none of this regresses

Every guard here is a TEST, never a new file under `scripts/guardrails/`. Every one
ENUMERATES rather than asserting a count, because counts drift and a drifting count is how
the 19-versus-22 partial-mock discrepancy survived for weeks.

### Task 13. No uncertified number renders as a percentage

Sweep every customer-facing surface (the picks route, board state, exports, cockpit views,
pick card) for a rendered percentage, and assert that each one traces to either the
de-vigged market probability or a certified head. Print every offender in the failure
message.

This is the single guard the architecture says is stated in several places and enforced in
none. If it finds real violations, do NOT fix them in this task: mark BLOCKED, list them,
and stop. What it finds is an architect decision.

### Task 14. `packages/*` never imports `apps/web`

Walk the import graph and assert the set of violations is empty, naming any it finds.

### Task 15. The partial-mock list is enumerated, never counted

Create an enumerating assertion over the files that partially mock
`@sports/prediction-engine`, listing the files themselves rather than counting them. If no
count-based assertion exists to replace, create the enumeration fresh; do not stall looking
for one.

**Correction, verified, and an earlier draft of this task was flatly wrong.** It said to
assert that `apps/web/lib/board/state.ts` and `apps/web/app/api/picks/route.ts` "import
nothing from the engine barrel". They both DO today: `state.ts:2` imports
`{ getReadinessGates, MODEL_VERSION, toEdgeIndex }` and `route.ts:6` imports
`{ getReadinessGates, bootstrapGateResponse }`. That assertion would fail on its first
commit and turn the build red, which breaks this queue's own acceptance test.

The hazard is a NEW import, not the existing ones, exactly as wave 1 frames it. So pin the
CURRENT symbol set per file and fail when it GROWS. An added symbol is the thing that
resolves to `undefined` under the partial mocks; the symbols already there are load-bearing
and tested.

---

## Escalate, do not decide

Write the question into your ledger row and stop, if you hit any of these. Each is an
architect or founder call and a wrong guess is expensive:

- Task 13 finds a real uncertified percentage on a customer surface.
- Any task appears to need a schema change, a new cron schedule, or an env flag.
- Any task would change a published number, a tier, a rank, or a customer string.
- A fictional or sample data pool already reaches a live path.
- Fixing something would require changing fixture identity resolution or the join key, which
  touches the triplication problem and can silently re-scope the whole board.
- A conflict between this queue and a law.

---

## What done looks like

Fifteen ledger rows, each DONE with a resolvable SHA or BLOCKED with a pasted error. A
working tree passing typecheck, lint and 26/26 guardrails, whose only ledger violation is
the pre-existing M-1. No flag, no schema, no published number, no fabricated value.

And in your final ledger evidence, one honest sentence per wave: what is now capturing that
was not this morning, and which loop components are now reachable from something other than
a script nobody runs.
