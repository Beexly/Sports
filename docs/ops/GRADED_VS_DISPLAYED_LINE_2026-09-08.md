# Graded line versus displayed line (ledger C-143)

**Status:** DECIDED (section 5). Measurement, disclosure and the display change are shipped.
**Written:** 2026-09-08 by the settlement-evidence session on `claude/launch-settlement-evidence`.
**Decided:** 2026-09-08 by the founder, delegated via the launch orchestrator; applied by the PR steward session on the same branch.
**Nothing in this document or its branch changes which line a pick is graded on.** The decision changes only which number the card and the settled-pick payload lead with.

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

## 5. The decision

**DECIDED. Founder, delegated 2026-09-08 via the launch orchestrator.** This is
option A below. It is recorded here as taken, not offered.

1. **The line that GRADES does not change.** Settlement keeps using
   `selectGradingLine`: `clvLockLine` when the pick carries one, else `line`.
   That is the publish-time line — the number the customer actually saw when the
   pick went out. No grade is recomputed, no `settledAt` is re-stamped, and the
   34 flipped rows keep their published results.
2. **The DISPLAY changes.** On a settled pick, the graded line is the PRIMARY
   number, labelled "Graded at X". The later, refreshed line appears only as
   secondary context, and only when it is a different number.
3. The settled-pick payload carries the graded line as its own field
   (`PublicPick.gradedLine`) so any consumer can lead with it the same way.

The reasoning, in one line: the result we publish must be reproducible from the
number we show, and the number we show should be the one the reader was given at
publish. A refreshed line that arrives after the pick is out is market context,
not the basis of the grade, and it should not be the number that leads.

## 6. What shipped on this branch

- `PublicPick.gradedLine` (`packages/types`), published by `/api/picks` on settled
  SPREAD and TOTAL rows only, null on MONEYLINE, PENDING and VOID. It is the
  `clvLockLine ?? line` value, restated in
  `apps/web/lib/picks/graded-line-display.ts` so the display module does not
  import the engine. `line` stays on the payload unchanged, as the later
  refreshed number and secondary context.
- `gradedLineDisplay()` in the same module returns the settled-row line slot:
  `primaryText` "Graded at +74" and `secondaryText` "Line as last refreshed:
  +83.5", the second one null when the two numbers agree.
- The pick card leads a settled TOTAL with "Graded at +74" in the line slot, and
  puts "Line as last refreshed: +83.5" beneath it only when the numbers differ.
  A PENDING row keeps the live "Line: +83.5" lead: nothing has been graded yet,
  so the live number is still the number that matters to it.
- Settle-time evidence records the graded line
  (`PickSettlementEvent.payload.settledWith.gradedLine`) on all four lanes, so
  the number a grade used is an immutable event-time fact rather than a
  reconstruction (ledger C-120).

## 7. What this decision does NOT cover

- **SPREAD card rendering.** The card renders no `line` for SPREAD at all: the
  chosen side's number lives inside the stored `selection` string, and `line` is
  home-perspective, so leading with `line` would contradict the selection on an
  away-favoured pick. There is therefore no second, later number displayed
  beside a SPREAD selection today, and nothing here needs to change for the
  decision to hold on that card. What was NOT established in the session that
  made this change is whether the stored `selection` string itself can drift
  after publish. If it can, a settled SPREAD card can show a number the grade
  did not use, and that is the same defect in a different place. Ledger row
  **C-264** carries it. It is an open question, not a known defect.
- **Other surfaces that render `line` for a published pick** (anything beyond
  the pick card). Enumerating them is a work package; the card is the surface
  the C-143 measurement covers.
- **Rows with no evidence.** Rows settled before 2026-09-07 20:20 UTC carry no
  settlement evidence, and rows settled before this branch deploys carry no
  `gradedLine` in that evidence. The classifier reconstructs from `clvLockLine`,
  which is immutable, and names the source it used.

## 8. The option that was NOT taken

Recorded so the choice is legible later. **Option B: make the displayed line
canonical** — change `selectGradingLine` to grade against `line`, or (more
defensibly) freeze `line` at publish so it stops drifting and the two numbers
collapse into one.

Why it was not taken:

- Grading against a drifting number is the failure the current rule exists to
  prevent: a pick published at OVER 74 could be graded at 83.5 and lose on a
  number the subscriber never saw.
- The CLV grade compares the lock to the close. Under B the graded line and the
  CLV line can differ on the same pick, reintroducing the contradiction the
  `settle-sport` comment describes, unless `line` is frozen at publish.
- The freeze-at-publish variant is a change to the odds refresh path, not to
  settlement, and it remains available later without contradicting anything
  decided here: it would make the refreshed line equal the graded line, at which
  point the secondary context in section 5 simply stops rendering on its own.
