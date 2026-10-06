# PICKS_AUDIT — the pick lifecycle state machine

**Row:** P4-9 · **Command:** `.claude/commands/audit-picks.md` · **Date:** 2026-09-27
**Scope:** read-only. `allowed-tools` = Read / Grep / Glob / `git diff|log|status`. **No product code touched.**
**Helper:** `handoff/pick-lifecycle-scan.mjs` (node, exit 0; `--selftest` 6/6 PASS)

---

## RESULT

**The state machine is real, small, and mostly well-built — and it has exactly one write that bypasses it.**

Four grading lanes, one of which is the only settlement path in the tree that
still carries a race the other three were hardened against in #717. One
admin-only write reads the pick's state and then writes by `id` without
carrying the predicate into the write, which is the single check-then-act
site in fourteen product mutation sites. Grading itself is the cleanest part
of the system: four terminals, one of them (`VOID`) correctly never produced
by the grader at all.

| Class | Verdict |
|---|---|
| Illegal transitions | **NONE FOUND.** 9 of 14 product write sites carry a `result` predicate *in the write*; the other 5 are additive post-terminal writes (F3) plus F1. |
| Orphaned / unreachable states | **NONE FOUND.** All five `PickResult` members are reachable; see the clean sweep. |
| Missing terminal handling | **ONE LATENT** (F4): `VOID` is mapped to `PUSH` on a customer-facing bot path. Unreachable today because the loader filters `VOID` out. |
| Mutation bypassing the machine | **ONE** (F1): `founder-picks/create.ts:112`. |
| Concurrent grade/settle races | **ONE** (F2): `settle-sport.ts:679` has no kickoff relation filter. |

---

## THE STATE MACHINE

Declared at `packages/db/prisma/schema.prisma:1452`:

```
enum PickResult { PENDING  WIN  LOSS  PUSH  VOID }
```

`PENDING` is the default (`:548`). `VOID` is a terminal the **grader never
produces** — it is minted only by withdrawal lanes, which is the correct
separation and is why the terminal table below reads the way it does.

### Who writes what (measured, `pick-lifecycle-scan.mjs`)

**14 product mutation sites** (`apps/`, `packages/`), plus 2 operator scripts
under `scripts/` which are excluded from the audit and listed at the end.

| # | Site | Guard in the write | Terminal |
|---|---|---|---|
| 1 | `apps/web/lib/data-sources/free-settlement-runner.ts:215` | `result:"PENDING"` + `game.commenceTime <= settledAt` | computed |
| 2 | `apps/web/lib/data-sources/settle-backfill.ts:538` | `result:"PENDING"` + `game.commenceTime <= settledAt` | computed |
| 3 | `packages/ingestion-pipeline/src/settle-sport.ts:679` | `result:"PENDING"` **only** | computed |
| 4 | `apps/web/lib/settlement/zero-sit-lane.ts:890` | `result:"PENDING"` + `game.commenceTime < cutoff` | `VOID` |
| 5 | `apps/web/lib/settlement/line-integrity-lane.ts:1028` | `result: row.result` (the value it read) | `VOID` |
| 6 | `packages/ingestion-pipeline/src/supersede-unpublished-pick.ts:129` | `result:"PENDING"`, `isPublished:false` | `VOID` |
| 7 | `packages/ingestion-pipeline/src/process-sport.ts:1404` | `result:"PENDING"` | — (refresh) |
| 8 | `packages/ingestion-pipeline/src/generate-signal-slate.ts:598` | `result:"PENDING"` | — (mint) |
| 9 | `apps/web/lib/settlement/line-integrity-lane.ts:1212` | `result:"PENDING"`, `isPublished:true` | — (unpublish) |
| 10 | `apps/web/lib/settlement/zero-sit-lane.ts:750` | full `stalePredicate` re-validated in the write | — (unpublish) |
| 11 | `scripts/ops/adjudicate-stale-picks.ts:69` | `result:"PENDING"`, `isPublished:true` | — (unpublish) |
| 12 | **`apps/web/lib/founder-picks/create.ts:112`** | **NONE** | — (**F1**) |
| 13 | `apps/web/lib/settlement/free-path-clv.ts:118` | none (additive CLV) | F3 |
| 14 | `packages/ingestion-pipeline/src/settle-sport.ts:747` | none (additive CLV) | F3 |
| 15 | `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts:270` | none (retrospective `factorBreakdown`) | F3 |

*(14 product sites plus the two `scripts/` operators; the helper reports 16 total.)*

### Clean sweeps, recorded so nobody re-runs them

- **Illegal transitions: none.** Every terminal transition is a
  compare-and-set scoped to the state it read. There is no
  `PENDING → WIN` that is not `PENDING → WIN`-guarded, and no writer that
  moves a row out of a terminal state except #5 (`result: row.result`).
- **Lock order is consistent.** `settle-backfill.ts:530-532` documents the
  invariant "PICK then GAME" and all three free lanes follow it;
  `zero-sit-lane.ts:880-889` records that holding the GAME first caused an
  ABBA deadlock against the other two and was fixed. The paid lane
  (`settle-sport.ts:678`) takes a PICK lock only and never a GAME lock, so it
  cannot deadlock with them. **No lock-order finding.**
- **Grading is total and refuses to fabricate.**
  `packages/prediction-engine/src/settlement.ts:81` `calculatePickResult`
  emits `WIN`/`LOSS`/`PUSH` across all three `PickType`s, and its
  fall-through `:123` **throws** rather than returning a manufactured `PUSH` —
  with a comment naming the exact corruption it prevents. This is the single
  best piece of code in the lifecycle and should not be touched.
- **The grade reads the LOCKED line, not the drifting one.**
  `settlement.ts:137` `selectGradingLine` returns `clvLockLine ?? line`, and
  `settle-sport.ts:650` calls it, so a refresh that moved `line` while the
  pick was PENDING cannot re-grade the pick against a different number.
- **Side-flip freeze.** `process-sport.ts:1379-1396` refuses to rewrite a
  published pick when the model flips to the other side of the market, and
  says why in the log line. A published pick's identity is its side, and the
  lock and receipt were minted for the original.
- **MONEYLINE draw handling is sport-aware.** `settlement.ts:95-96` grades a
  tied soccer match a `LOSS` (three-way market) and a tie in any other sport a
  `PUSH`.

---

## FINDINGS

### F1 (medium) — the one write that bypasses the state machine

**`apps/web/lib/founder-picks/create.ts:112`**

```ts
// :50-62  — the state IS read, and a settled row IS refused
const existing = await db.pick.findUnique({
  where: { gameId_pickType: { gameId: input.gameId, pickType: input.pickType } },
  select: { id: true, result: true, modelVersion: true },
}).catch(() => null);
if (existing && existing.result !== "PENDING") {
  return { ok: false, error: `Existing pick on this game is already ${existing.result}. …` };
}
// …two more awaits, including an optional network call to baseballsavant…
// :111-116 — and the state is NOT carried into the write
await db.pick.update({ where: { id: existing.id }, data });
```

The freeze is enforced at the **read**, and the write is an unconditional
`update` by `id`. Every other writer in the tree carries the predicate into
the statement itself, and two of them name the reason in a comment that quotes
the ticket: *"Race-safe upsert (GSE-SEC-043): scope the UPDATE to
`result:"PENDING"` so a concurrent settle cannot have its freshly-graded
result overwritten by this refresh cycle"* (`process-sport.ts:1398-1402`,
`generate-signal-slate.ts:595-597`). The founder-pick override is the only
product write site that does not.

**What the `data` payload would rewrite on a row that had been graded in the
window** (`create.ts:80-109`): `selection`, `line`, `confidence`,
`clvLockLine`, `clvLockPrice`, `pickGrade`, `reasoning`, `factorBreakdown`,
and `edgeScore` / `consensusPct` / `bookmakerCount` → `0`. It also sets
`isPublished: true`.

**Consequence if it fires.** The row keeps `result: WIN` and its
`clvValue` / `clvVerdict` (untouched) while `selection`, `line` and
`clvLockLine` now hold the founder's numbers. The record then shows a WIN
that was not graded against the line displayed, a `clvVerdict` computed from a
lock the row no longer carries, and a `factorBreakdown` whose odds provenance
has been zeroed. `isPublished: true` additionally re-publishes a row that the
line-integrity unpublish half (`:1212`) or the zero-sit stale-unpublish
(`:750`) may have just withdrawn — with no `jarvisMemoryEvent`, so the
withdrawal leaves no durable trace that it was reversed.

**How reachable.** Narrow, and honestly so: `validateFounderPick`
(`types.ts:113-122`) refuses a game that has kicked off and fails closed on an
unparseable kickoff, so at `:44` the game is in the future and no lane should
be settling it. The window is the span between the `findUnique` at `:50` and
the `update` at `:112`, which includes an optional Statcast network fetch. The
TOCTOU becomes real only if a lane grades the pick inside that window while
the game has not commenced — which is **exactly the case F2 permits and the
other three lanes forbid.** The two findings compose; neither is alarming
alone.

**Blast radius.** Admin-only (`app/api/admin/founder-picks/route.ts`), so this
needs a deliberate founder action, not an attacker. It is filed as a
correctness defect, not a security one.

**Proposed fix** (NOT APPLIED — read-only row):

```ts
// :112 — carry the read into the write, matching the other 13 sites
const frozen = await db.pick.updateMany({
  where: { id: existing.id, result: "PENDING" },
  data,
});
if (frozen.count === 0) {
  return { ok: false, error: "Pick settled while you were writing it. Nothing was changed." };
}
```

This also converts a silent no-op-if-settled into a reportable refusal.
Second, worth considering separately: add `isPublished: false` to the payload
for an override of an unpublished slot, so the founder path cannot re-publish
what a withdrawal lane removed. **`create.test.ts` has no case for the
override path at all** (9 tests, none touching `existing`), so the freeze is
currently untested at both layers.

---

### F2 (medium) — the paid settlement lane is missing the #717 kickoff guard

**`packages/ingestion-pipeline/src/settle-sport.ts:679`**

```ts
const settled = await db.$transaction(async (tx) => {
  const updated = await tx.pick.updateMany({
    where: { id: pick.id, result: "PENDING" },          // ← no kickoff predicate
    data: { result, settledAt },
  });
```

The three free lanes each carry the kickoff bound **in the write**, and each
carries a comment saying why:

- `free-settlement-runner.ts:215-220` — *"The kickoff predicate rides in the
  WRITE, not just the read above. Prisma's default isolation does not lock the
  game row, so a schedule correction can commit between that findUnique and
  this statement… grading a game that has not been played is the one outcome
  this lane must never commit (Devin Review, #717)."*
- `settle-backfill.ts:534-543` — same clause, same reasoning.
- `zero-sit-lane.ts:887-891` — *"The kickoff bound rides here too, so a game
  already moved before this statement refuses without writing anything."*

The paid lane's candidate read is also unbounded: `:396` and `:425` are
`include: { picks: { where: { result: "PENDING" } } }` with no kickoff term
either, and the game's only gate is the odds provider's own
`score.completed` flag at `:392`.

**Consequence.** A schedule correction that pushes a game's `commenceTime`
into the future can commit between the provider's score fetch and the write,
and this lane grades it anyway. The other three refuse.

**How reachable.** Narrower than it looks, and the audit should say so: it
requires a provider that reports a game complete while the database holds a
future kickoff for it — a stale schedule row, a postponed-then-played game, or
a reschedule that has not landed. The lane is also the only one of the four
whose pick set is keyed on an **externalId** (`:395`) rather than a resolved
fixture, so it is the lane most exposed to the fixture-triplication problem
AGENTS.md documents.

**Test evidence.** The free path has 12 dedicated race tests with negative
controls (`apps/web/__tests__/free-settlement-race.test.ts`, including
*"leaves the pick PENDING when the postponement commits between the two
writes"* and *"negative control: without the rollback the same race settles the
pick"*). **Nothing tests the kickoff race for the paid lane, because the paid
lane does not have the guard to test.**

**Proposed fix** (NOT APPLIED):

```ts
where: {
  id: pick.id,
  result: "PENDING",
  game: { commenceTime: { lte: settledAt } },   // matches the three free lanes
},
```

and, because the paid lane must not silently skip such a pick, classify the
`count === 0` as `KICKOFF_MOVED` the way `free-settlement-runner.ts:234-244`
already does, rather than the bare `continue` at `:726`.

---

### F3 (low) — five additive writes to a terminal row, unguarded by design

`settle-sport.ts:747` (CLV), `free-path-clv.ts:118` (CLV),
`backfill-independent-trueprob.ts:270` (`factorBreakdown`),
`zero-sit-lane.ts:750` (unpublish). These write columns the schema documents
as filled **after** settlement — the CLV block at `schema.prisma:553-566` says
so explicitly — so an unguarded write is defensible. Two things are still worth
knowing, and neither is filed as a defect:

1. **The CLV writes are not conditioned on the row still being settled.** A pick
   voided by the line-integrity lane between settlement and CLV grading can
   still have `clvValue` / `clvVerdict` written. Readers already handle this —
   `clv-sample-policy.ts:24` names `CLV_WITHDRAWN_RESULT = "VOID"` and
   `clv-void-exclusion-all-readers.test.ts` pins the exclusion — so the
   exposure is contained, but the writer is where the containment *should*
   live rather than at four downstream readers.
2. **`backfill-independent-trueprob.ts:270` rewrites `factorBreakdown` on rows
   already filtered to `result in ["WIN","LOSS"]` (`:97-100`).** That is a
   retrospective write to settled rows by design — and it is the contamination
   `docs/ops/hermes/ARCH-3` already named: any model fitted on
   `independentEdge.trueProb` inherits a value computed **after** the outcome
   was known. The code's own rationale string (`:255`) says it "does not
   rewrite published confidence/selection/result," which is true and is also
   why it is easy to miss. The queue item that governs it is ARCH-12 T1
   (as-of quarantine), already open; this audit does not reopen it.

---

### F4 (low, latent) — `VOID` is reported to customers as a `PUSH`

**`apps/web/lib/bot-outbox/records.ts:84-89`**

```ts
function mapPickResult(result: PickResultValue): "W" | "L" | "PUSH" | "PENDING" {
  if (result === "WIN") return "W";
  if (result === "LOSS") return "L";
  if (result === "PUSH" || result === "VOID") return "PUSH";   // ← two different facts
  return "PENDING";
}
```

A `VOID` is a withdrawal: the line-integrity lane voids a pick because *the
line was wrong*, and the zero-sit lane voids one that never commenced. Both are
the rows AGENTS.md says "are expected to grade badly, and removing them from
the record would flatter our numbers by dropping exactly the rows the model
said were worst." Announcing a withdrawal to a customer as a `PUSH` is a
"you didn't lose" outcome, on precisely the picks the engine says it should
not have offered.

**It is latent, and the audit checked rather than assumed.** The only loader
feeding this mapper is `bot-outbox/load.ts:69-81`, whose filter is
`result: { in: ["WIN","LOSS","PUSH"] }` — `VOID` never arrives. So no
customer can see this today. `records.ts` has exactly one importer
(`load.ts:12`).

**Two treatments of `VOID` already exist in the repo**, and the correct one is
not the one on the customer path: `autonomy/settlement-learning.ts:69-72`
excludes `VOID` from learning samples with `eligible: false` and a reason.
That is right. `records.ts:87` is the outlier.

**Proposed fix** (NOT APPLIED): return a fifth state, or drop the `VOID` arm
and let it fall through to `PENDING` — which is what the current loader would
produce anyway if it ever let a `VOID` through. Either way, add a test that
pins `VOID` to a non-`PUSH` outcome, so the mapper cannot be widened silently.

---

## A NOTE ON THE SCANNER

Two bugs of my own, recorded rather than hidden — this is the third time in
this queue a selftest has caught something, and it is the reason the flag
exists.

1. **`gitLines` dropped blank lines**, so every reported `file:line` was
   shifted by the file's blank-line count. The first full run cited
   `founder-picks/create.ts:102` for a write that is at `:112`. Fixed by a
   separate `gitFileLines` that preserves line numbering. Every line number in
   this report was then re-verified against a hand read, and all 15 match.
2. **The selftest's own sixth specimen failed on first run** — it passed the
   *formatted* view to the terminal-detection rule, which expects the raw
   site. The specimen was wrong, not the rule; fixed the specimen.

Two **limitations of the scan itself**, so its zeros are read correctly:

- `WIN` and `PUSH` read 0 producers because every grader writes `result` from
  a **variable** (`data: { result, settledAt }`). They are produced — by
  `calculatePickResult`. The scan reports computed lanes separately for this
  reason.
- The scan's F2 flag over-reports. It marks `line-integrity-lane.ts:1028` and
  `supersede-unpublished-pick.ts:129` as missing a kickoff filter, and both
  are **correct without one**: the first voids a row that is already terminal
  (a kickoff bound is meaningless there) and the second voids a slot-holder
  that has not commenced. All three flagged lanes were read individually;
  `settle-sport.ts:679` is the only real F2.

---

## NOT DETERMINED

Stated rather than implied.

- **Nothing was executed against a database.** Every claim about behaviour
  under concurrency is read from code, not observed. The race windows named
  here are read from the awaits between the read and the write.
- **The paid lane's live reachability is unmeasured.** Whether
  `settle-sport.ts` runs in production at all, and with which provider, is a
  deployment fact outside this command's tools.
- **The `stalePredicate` used at `zero-sit-lane.ts:750-751`** was not traced to
  its full definition; the claim made here is only that the predicate is
  re-validated inside the write, which is visible at the call site.
- **No rendered-surface, performance, or visual question** — those are P4-10
  and P4-11 and were not started.
- **Scan coverage is tracked non-test source only.** 29 tracked files over
  2MB and any built `.next` bundle were not inspected, carried forward from
  P4-6/P4-7/P4-8 unchanged.
- **Two `scripts/` operators write picks** (`adjudicate-stale-picks.ts:69`,
  `db-smoke.mjs:146`). Both carry `result:"PENDING"` predicates and were read
  rather than audited; `db-smoke.mjs` is an integration smoke script, not
  product code, and is excluded from every count above.

---

## REPRODUCE

```bash
node handoff/pick-lifecycle-scan.mjs --selftest   # 6/6, exit 0
node handoff/pick-lifecycle-scan.mjs               # exit 0
```

The selftest proves each rule can fire on a known specimen, so a future zero
means "none found" rather than "the pattern stopped matching". Read it with
this report: the two `-- no kickoff filter` hits on the VOID lanes are
expected and are explained above.
