# Graded line versus displayed line (ledger C-143)

**Status:** measurement and disclosure shipped; the policy decision is the founder's.
**Written:** 2026-09-08 by the settlement-evidence session on `claude/launch-settlement-evidence`.
**Nothing in this document or its branch changes which line a pick is graded on.**

## 1. The defect, in one paragraph

A SPREAD or TOTAL pick carries two lines. `clvLockLine` is captured at publish and
never moves. `line` is refreshed on every odds cycle while the pick is PENDING.
Settlement grades against `selectGradingLine()` in
`packages/prediction-engine/src/settlement.ts`, which returns `clvLockLine` when
present and falls back to `line` only for a row that has no lock. The public card
(`apps/web/components/picks/pick-card.tsx`) rendered `line` and nothing else. So a
subscriber who read the card and the final score could compute a different result
from the one we published, with no indication that the settlement used another
number. That is an honesty defect on a product whose premise is that its numbers
are reproducible. It is not a grading bug: every grade in this population follows
the documented rule.

## 2. Where the rule lives

Every settlement lane calls the same function on the same two fields:

| Lane | Call site |
|---|---|
| Free grader (cron `settle-picks`, path free) | `apps/web/lib/data-sources/free-settlement-runner.ts`, `selectGradingLine({ clvLockLine, line })` when building `PendingPick` |
| Free backfill (stale tail) | `apps/web/lib/data-sources/settle-backfill.ts`, same construction |
| Paid supplement | `packages/ingestion-pipeline/src/settle-sport.ts`, `const gradingLine = selectGradingLine(pick)` |
| Zero-sit void lane | `apps/web/lib/settlement/zero-sit-lane.ts`, same construction (a void grades nothing; the line is only used to re-run the matcher) |
| Score repair tool (PR #720, unmerged) | `scripts/ops/lib/score-repair.ts` `regradePick`, same function, so a repaired grade uses the same line as the original |

The rule's own justification is in the settle-sport comment: grading on a line
that drifts on every refresh cycle would settle a published WIN as a LOSS and
contradict the CLV verdict, which is graded against the lock. The lock is the
number the pick was receipted at (`pickReceipt.clvLockLine` on the settlement
event payload), and the number the CLV grade already compares to the close
(`gradePickClv` takes `lockLine: pick.clvLockLine`).

## 3. Measurement method

**What was measured, by whom.** The counts below were measured read-only on the
production Neon database by the C-115 and C-143 sessions on 2026-09-07 and are
recorded in `docs/ops/AGENT_LEDGER.md` rows C-115 and C-143 with their queries'
provenance. This session had no database access and did not re-run them. The
table is live and picks settle continuously, so anyone re-running will get a
different total; the proportions are what matter.

**How to reproduce, from code paths.** Two tools now exist:

1. `apps/web/lib/ops/settlement-contradiction.ts` `classifySettledPick()` returns
   `GRADED_ON_LOCK_LINE` for exactly the C-143 population A rows: correct against
   `clvLockLine`, wrong against `line`. `tallyContradictions()` rolls a population
   up. It is pure and fail-closed (exact team-name matching, `UNGRADEABLE` on any
   ambiguity).
2. `npm run ops:classify-settlement-evidence` (this branch, read-only, dry-run
   only) reports `lineDiffers` per settled pick, computed from the settle-time
   evidence when the event carries `gradedLine` and from the row's
   `clvLockLine ?? line` otherwise, with the source named.

The SQL the ledger rows used, restated so it can be re-run by the founder
(read-only; do not run it from an agent session):

```sql
-- published, settled TOTAL picks with a final on their own game row
SELECT p.id, p.selection, p.line, p."clvLockLine", p.result, g."homeScore", g."awayScore"
FROM picks p JOIN games g ON g.id = p."gameId"
WHERE p."isPublished" AND p."pickType" = 'TOTAL' AND p.result IN ('WIN','LOSS','PUSH')
  AND g."homeScore" IS NOT NULL AND g."awayScore" IS NOT NULL;
-- "differ":  p."clvLockLine" IS NOT NULL AND p."clvLockLine" <> p.line
-- "flip":    sign(total - clvLockLine) <> sign(total - line), total = homeScore + awayScore
```

**From the truth surface.** `GET /api/ops/public-surface-truth` carries no
lock-versus-display tally. What it did report, read by this session at
2026-09-08 19:22:29 UTC (its own `generatedAt`): settlement HEALTHY, 2694
commenced picks, 0 overdue; `sample.canonicalSettled` 2212; calibration
eligibility GREEN, n 475, ECE 0.0466, 11 consecutive green runs against 3
required, model version `mixed:v5.2.7,v5.2.6,v5.0.0,v5.1.0`. None of those numbers
bears on C-143 directly; they are recorded because they were observed and because
they date this document.

## 4. Counts

All from ledger rows C-115 and C-143, production read-only SQL, 2026-09-07
19:5x UTC unless stated.

| Population | Count | Source |
|---|---|---|
| Published settled TOTAL picks with a final on their own row | 588 | C-143 |
| … where `clvLockLine` differs from `line` | 432 (73%) | C-143 |
| … where the difference flips the outcome | 34 | C-143 |
| Published settled TOTAL picks whose stored result contradicts the DISPLAYED line | 81 of 590 | C-115 |
| … of those, correctly graded against `clvLockLine` (population A, the C-143 subject) | 34 | C-115 |
| … of those, explained by neither line (population B, the C-115 subject) | 47 | C-115 |

All 34 outcome-flipping rows sit inside the 81 that contradict the display line,
which is the identity the C-115 row reports. Population B is a different defect
(a game row overwritten with another fixture's score after a correct grade; root
cause and remaining open question in C-115) and must not be conflated with this
one.

Worked example (C-143): pick `cmtp7olso04ci9t2po0eeh9eo`, card reads OVER 83.5,
actual total 77, graded WIN against `clvLockLine` 74. Correct by its own rule;
unreadable from the card until this branch.

What this session could and could not reproduce: the code paths above are
verified by tests on this branch; the database counts are not re-measured here.

## 5. What shipped on this branch

- `PublicPick.gradedLine` (`packages/types`), published by `/api/picks` on settled
  SPREAD and TOTAL rows only, null on MONEYLINE, PENDING and VOID. It is the
  `clvLockLine ?? line` value, restated in
  `apps/web/lib/picks/graded-line-display.ts` so the display module does not
  import the engine.
- The pick card renders, on a settled TOTAL whose graded line differs from the
  displayed one: "Graded at +74, the line locked when this pick was published.
  The +83.5 shown above is the line as last refreshed." Both numbers, plain
  words, nothing hidden.
- Settle-time evidence now records the graded line
  (`PickSettlementEvent.payload.settledWith.gradedLine`) on all four lanes, so
  the number a grade used is an immutable event-time fact rather than a
  reconstruction (ledger C-120).

## 6. The two policy options

The founder decides which number is canonical. Both options are stated with
their consequences; neither is recommended here because the choice is about what
the product promises, not about code.

### Option A: the locked line is canonical (status quo for grading; the display changes)

Keep `selectGradingLine` as it is. Make the card show the locked line as THE line
on every pick from the moment it is published, and relabel the refreshed number
as market movement (the Pro-tier `lineMovement` chip already carries opening and
current).

Consequences:
- No grade changes, past or future. The track record and the CLV grade already
  rest on the lock, so nothing contradicts anything else.
- The card's headline number stops moving after publish. A subscriber who saw
  OVER 74 at publish sees OVER 74 at settlement. That is the honest version of
  "the number we published".
- The refreshed `line` remains visible only as movement context. Signal-slate
  rows (no book) are unaffected.
- Cost: a display change on the card and on every other surface that shows
  `line` for a published pick; enumerating those surfaces is a work package,
  not a one-line change.

### Option B: the displayed line is canonical (the settlement rule changes)

Change `selectGradingLine` to grade against `line` (or, more defensibly, freeze
`line` at publish so it stops drifting, which makes it equal to the lock and
collapses the two into one number).

Consequences:
- Forward-only. Settled rows are never re-graded and `settledAt` is never
  re-stamped (the lesson of C-258 on PR #720 stands). The 34 flipped rows keep
  their published results and their new on-card disclosure.
- Grading against a drifting number is the failure the rule was written to
  prevent: a pick published at OVER 74 can be graded at 83.5 and lose a number the
  subscriber never saw. If B is chosen, freezing `line` at publish is the
  variant that avoids that, and it is a change to the odds refresh path, not to
  settlement.
- The CLV grade compares the lock to the close. Under B the graded line and the
  CLV line can differ on the same pick, which reintroduces the contradiction the
  settle-sport comment describes, unless `line` is frozen.
- MODEL_VERSION is frozen by `scripts/guardrails/model-freeze.mjs`; grading is
  outside the engine, but a settlement-rule change is a product-claim change and
  should be announced with the same care as a version bump.

### Either way

- The disclosure shipped here stays until the two numbers are one number. It is
  the minimum that makes the published result reproducible from the card.
- SPREAD rendering is an open item: the card shows the chosen side's number
  inside `selection` while `line` is stored home-perspective, so "shown at Y"
  needs the side resolved before the note can be worded. `gradedLine` is
  already published for SPREAD; only the card note is TOTAL-only.
- Rows settled before 2026-09-07 20:20 UTC carry no evidence and rows settled
  before this branch deploys carry no `gradedLine`; the classifier reconstructs
  from `clvLockLine`, which is immutable, and says so.

## 7. Decision requested

Founder: choose A or B (with the freeze-at-publish variant if B). Record the
decision in ledger row C-143. Until then, nothing changes which line grades.
