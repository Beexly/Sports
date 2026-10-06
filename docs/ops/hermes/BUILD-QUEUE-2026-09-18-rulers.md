# Hermes build queue, 2026-09-18: the ruler stack

Issued by the architect session. Sixth queue, and it jumps the run order to first.

`AGENTS.md` and `CLAUDE.md` bind you in full. Where this file and a law disagree, the law
wins and you mark the task BLOCKED.

---

## 0. Why this queue exists, and why it outranks the other five

An outside analysis supplied the skeleton for this layer without access to this tree. Its
file paths were all wrong, which is expected and not the point. Its ARCHITECTURE was right,
and on one item it independently derived a fix this session had already found in the code,
which is the strongest form of evidence available here: two analyses that could not see each
other landing on the same defect.

The skeleton's claim, restated in this repository's terms: **every other queue's output is
graded by three rulers, and all three are currently broken.** Until they are fixed, more
intelligence pointed at this codebase produces more confident agreement about numbers that
cannot be trusted. That is why this queue runs first.

The five tasks below are the rulers plus the two things that make multiple independent
models worth more than one. None is in any other queue. Four of the five are named in the
architecture and unqueued; the fifth was found while binding the skeleton to the tree.

**The acceptance test every other queue carries applies here too, with one deliberate
exception named in task 3.** Merged and deployed with no founder action, nothing a customer
sees behaves differently.

---

## 1. Hard boundaries

- **No schema edit.** `packages/db/prisma/schema.prisma` and `migrations/**` are law 2.
  Every column this queue needs already exists; where one does not, the SQL is authored
  under `docs/ops/proposals/` and the founder applies it.
- **No database.** Law 7. Every test uses an injected fake or a pure function.
- **No `MODEL_VERSION` change.** Nothing here alters a scoring path. Task 4 changes a
  refusal boundary, which is the withholding direction and needs no bump, by the same
  asymmetry argument the conviction gate already rests on.
- **No env flag, no gate flip, no published number, no fabricated value.**
- **Never replace a working module with a simpler one.** Two of these tasks touch files that
  already carry real, tested behaviour. You are extending them, never rewriting them.

---

## 2. How to work

AGENTS.md THE LOOP. Claim your ledger row in the same commit that starts the work. One task,
one commit. Verify block before each: `npm run typecheck`, `npm run lint`, and this task's
own test file green. Two attempts, then BLOCKED with the exact error.

---

## 3. The tasks

### Task 1. The as-of quarantine, so no head is ever fitted on the answer

**The defect, verified.** `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts`
selects settled WIN or LOSS rows (`:96-101`), calls `buildIndependentFairValues` with the
game's `commenceTime` (`:172-183`), and overwrites `factorBreakdown.independentEdge.trueProb`
in place with no version marker beyond a rationale string containing the word Retrospective
(`:235-257`). It runs from two schedules, its own four-hourly cron and again inline inside
the six-hourly calibration cron. Two of the independents it blends do not honour the
`commenceTime` they are handed: `fetchMlbStandings` takes only a season number and no date
at all (`build-independent-fair-values.ts:291-308`), and the NFL EPA read dispatched at
`:661` is a whole-season aggregate with the same property.

**Every row this function has ever touched carries a probability partly computed from
information that postdates the outcome it is scoring.** Any model fitted on that column is
fitting on the answer, and the only thing separating those rows from clean ones today is a
sentence of prose.

**The useful framing, from the outside skeleton:** this is a bitemporal violation. Every
value has a valid time, when the fact was true, and a transaction time, when this system
learned it. An as-of read at a decision time may use only rows whose transaction time is at
or before that decision time. The backfill writes with a transaction time of now and a valid
time of kickoff, and nothing records the difference.

**Build.**
- A typed field on the write, `independentEdge.trueProbBasis`, one of
  `post_settlement_backfill` or `as_of_mint`. A trainer then excludes by a checked value
  rather than by matching a word in a prose string.
- A local `assertObservedAtOrBefore` guard, mirroring `asof-store.ts`'s existing
  `assertNoLookahead` (`:184-199`), wrapped around `fetchMlbStandings` and the NFL EPA
  dispatch. Today that tripwire only polices reads already routed through its own
  `FeatureStore.get`, which protects nothing outside the edge-lab harness. Wrapped around
  those two, it throws the moment either source is asked to answer for a date it cannot
  honestly speak to.

**Definition of done.** Unit tests proving: a write with no basis is refused; a recompute
whose inputs carry a timestamp after the decision time throws rather than returning a
number; a clean as-of recompute reproduces the stored value exactly. **Do not add a
placeholder return value to make a test pass.** A constant standing in for a computed
probability is a fabricated value under rule 8, whatever the comment beside it says.

### Task 2. Same-book closing value, so the 23 percent means something

**The defect, verified.** `packages/prediction-engine/src/clv-capture.ts`'s
`deriveClosingSnapshotFromOdds` (`:90-144`) averages whatever Odds rows the caller hands it,
and its own `ClosingOddsRow` type (`:38`) carries no bookmaker field. Both callers,
`settle-sport.ts:622-633` and `free-path-clv.ts:36-49`, explicitly omit bookmaker from their
Prisma select, so the function could not restrict itself to one book set even if it wanted
to. Today's grade compares an average over whichever books priced the game at mint against
an average over whichever, possibly different, books priced it near kickoff.

**That is why 23.0 percent against a 52.4 percent requirement cannot be read as a statement
about the model at all.** It is a statement about the model and the book composition
together, and the two are not separable in the current number.

**Two things the skeleton got wrong that you must not reproduce.** First, a signed line
delta is not this metric: 52.4 percent is a RATE, the share of picks whose price beat the
close, and a delta averaged across sides is meaningless because a line moving from -3 to -2
is good if we took the underdog and bad if we took the favourite. The existing module
already knows this; it grades per pick, with a verdict, and carries a `ClvKind` of `POINTS`
or `PROBABILITY` (`:67`). Keep that. Second, an intersection computed from which timestamps
happen to be present is a no-op on real rows, where both are present. The intersection must
be over bookmaker KEYS.

**Build.** The close side has a better source sitting one function away and unused:
`settle-sport.ts:867` already calls `markClosingSnapshotsIfEnabled`, which tags the last
pre-existing `OddsLineSnapshot` row per market, book and side as phase CLOSE
(`line-archive.ts:206`, `:240`, `:262-263`), and that table has carried a `book` column
since it was created (`schema.prisma:467`, `:472`). Its OPEN tag marks the first snapshot
ever taken for a market, not a pick's own mint moment, so it cannot answer the mint side;
its CLOSE tag is exactly the same-book close this grader needs, already computed, already
running, and never read by the grader sitting beside the call that produces it.

For the mint side, `publish-time-market-p.ts` already reconstructs, per book, the snapshot a
pick was minted against, from the same append-only Odds table, for a different purpose. The
same rule, extended to record WHICH bookmaker keys it used rather than only their average,
gives the mint-side book set for free.

Grade only over the intersection of bookmaker keys present at both ends. **Refuse, never
average across the mismatch, when that intersection is empty**, and count the refusals by
reason. Report the book composition beside the grade so a reader can see when it changed.

**Store it additively:** `clvSameBookValue`, `clvSameBookVerdict` and `clvBookBasis` beside
the existing `clvValue` and `clvVerdict`, with the proposal SQL under `docs/ops/proposals/`
for the founder to apply. Nothing that reads the current columns changes behaviour. Both
numbers are reported side by side, exactly the way `ece-debiased.ts` already reports raw
beside corrected.

**Definition of done.** Tests proving: a row with no bookmaker key is refused, not silently
included; the grade is computed over the key intersection and not the union; an empty
intersection refuses rather than producing a number; a book present at mint and absent at
close is counted as a composition change and named in the report; and the per-pick verdict
respects which side was taken, with a fixture where the same line movement grades opposite
for the two sides.

### Task 3. The gate decision writer, so a pass leaves a record

**The defect, verified.** `gate_decisions` holds 1,167 rows spanning 2026-06-10 to
2026-06-11 and nothing since. This is not a stalled cron: no code in this repository writes
the table, tests excluded. Three files read it: `apps/web/lib/board/passes.ts`,
`apps/web/lib/board/state.ts`, `apps/web/lib/bot-outbox/load.ts`. Every consumer of the
gate's own record has been on a fallback path for over three months, which is why
`pass-reason.ts` has to document that fallback rows were never evaluated.

**The trap, and it is the whole task.** The model already exists and is complete
(`schema.prisma:665-687`): `status`, `reason`, `reasonCode`, `edgeIndex`, `confidence`,
`modelVersion`, `evaluatedAt`, `evidenceRefs`. You do NOT need a new reason vocabulary; the
columns and the `GateDecisionStatus` enum are already there, and inventing a parallel enum
beside them is the drift a cross-queue review caught twice in this same batch of queues.

**`isBootstrap` defaults to `true` (`:675`) and the readers filter on it.** A writer that
omits the field therefore produces rows the lane never shows, which looks exactly like
having no writer at all. Set it explicitly, every time.

**This task is the one deliberate exception to the acceptance test, and it is disclosed.**
Once a writer exists, the three readers stop rendering fallback rows and start rendering
real ones, so the passes panel changes. That is the entire point of the task and it is why
it is called out here rather than discovered on merge. It changes an explanation, never a
pick, never a price, never an ordering.

**Two knock-on items ride with this, both measured, neither to be fixed in isolation:**
`todayBounds()` is duplicated byte for byte at `passes.ts:76` and `state.ts:305`, both using
the Node process zone, which is UTC on the host; when a writer exists the right zone is
Central, because the panel answers "what did we evaluate today" for a reader, and NOT
Eastern, which is the game-day contract and a different question. Separately,
`passes.ts:126/277/361/366` stamp the panel with a UTC date, so from 19:00 Central onward
the board would headline today's passes with tomorrow's date. Both are latent only because
the panel has no rows to headline.

**Definition of done.** The writer exists and is called from the path that already decides,
with `isBootstrap` set explicitly and a test that fails if it is omitted; `reasonCode` comes
from the existing enum and a test rejects an unknown value; a reader returns null on no row
rather than a default, with a test proving the fallback path is not reached on a clean
lookup; and the retention rule is written into the task's ledger row as an escalation,
because it is a founder decision.

### Task 4. The conformal quantile refuses instead of clamping

**Two independent analyses found this same defect, which is why it is here.**
`apps/web/lib/calibration/cqr.ts:10-16` computes the finite-sample rank correctly,
`Math.ceil((1 - alpha) * (n + 1)) - 1`, and then clamps it into range:
`rank = Math.min(Math.max(rank, 0), n - 1)`. At n 5 and alpha 0.1 the honest rank is out of
range, meaning the sample cannot support the requested coverage; the clamp silently returns
the largest observed score instead, so the function claims 90 percent coverage and delivers
83.33.

**Build.** Below the sample size that supports the requested coverage, return positive
infinity rather than clamping. An infinite interval is the honest statement that this
stratum cannot yet support a claim. It is also directly actionable downstream: an infinite
interval is a refusal to price, which is the withholding direction and needs no
`MODEL_VERSION` bump.

Apply the same rule per stratum, not only globally. `packages/prediction-engine/src/certificate/stratum-coverage.ts`
already defines `StratumParts`, `stratumKey()` and `parseStratumKey()`; extend those rather
than defining a second key format.

**Definition of done.** Tests proving: the quantile equals the ceil((n+1)(1-alpha)) order
statistic on a sample large enough to support it; a sample below that floor returns positive
infinity and never a clamped score; the n 5 alpha 0.1 case specifically returns infinity
rather than 83.33 percent coverage; and each stratum carries its own quantile, with two
strata of different sizes returning different answers.

### Task 5. Fold independence, which is what makes three models worth more than one

**The defect, verified.** `packages/prediction-engine/src/edge-lab/walk-forward.ts:80-137`
implements purge, embargo and a sealed holdout correctly, and then cuts folds by ROW INDEX:
`sorted.slice(startIdx, endIdx)`. There is no group key anywhere in the function.

**Why that is worse here than in a generic codebase.** This repository has documented
fixture triplication: an NFL fixture can exist as three `games` rows. Rows belonging to one
real-world fixture can therefore land on both sides of a train and test boundary, and the
model is then evaluated on a fixture it was trained on. The measured skill is inflated by an
amount nobody has quantified.

**And this is the specific thing that decides whether running several independent models is
worth anything.** Models that share contaminated folds are not independent estimates. They
are one estimate wearing several labels, and their agreement is not evidence.

**Build.** A group key on `walkForwardSplits`: rows carrying the same fixture identity never
split across a boundary. Derive fixture identity from the logic that already exists,
`findTwinCandidate` and the id-shape enumeration in
`packages/ingestion-pipeline/src/game-identity.ts` with `isEspnExternalId` at
`fixture-collapse.ts:65`; do not invent a second notion of fixture sameness. Keep purge and
embargo exactly as they are. The function stays pure and takes the key as an argument, so a
caller with no grouping concern passes the identity function and gets today's behaviour.

**Definition of done.** Tests proving: no fixture id appears in both the train and test side
of any fold; the existing purge and embargo behaviour is unchanged on a fixture set with no
duplicate ids, byte for byte; a fixture whose rows straddle a boundary is moved wholly to
one side rather than dropped; and folds remain contiguous in time after grouping. **Report
the measured difference** between grouped and ungrouped skill on a fixture set that contains
real duplicates, because the size of that gap is the number nobody has.

---

## 4. Escalate, do not decide

- The retention rule for `gate_decisions` before its writer ships.
- Whether the gate decision record is coming back or is being retired. If retired, the three
  readers and the table should go, because code that reads a source nothing writes is worse
  than no code. That is a founder call and this queue assumes it is coming back.
- Any proposal to change a scoring path, a floor, or a published number.
- Any temptation to make a test pass with a constant.

---

## 5. What done looks like

Five rulers that can be trusted, so that every other queue's output can be graded, and so
that several independent models fitted against this data are genuinely independent rather
than one model with several labels.
