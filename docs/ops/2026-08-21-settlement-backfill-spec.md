# Settlement Backfill — Implementation Spec (T11)

**Status:** SPEC — ready to build. Written 2026-08-21 by the direction seat, from the
T9 diagnosis (`docs/ops/2026-08-21-settlement-backlog-diagnosis.md`), verified against
code before writing: `settle-sport.ts:184` is `client.getScores(sport.key, 2)`.

## The defect, precisely

The paid settlement path fetches scores with `daysFrom=2`. The Odds API's scores
endpoint returns only games from the last N days (its own maximum is 3). Any PENDING
pick whose game completed **before that window** — because the cron was dead (it was,
twice, on 2026-08-17), because a game was postponed and finished late, or because of
any future outage — becomes **permanently unsettleable by the paid path**. The
backlog is a ratchet: it can only grow. Public truth endpoint currently reports
**CRITICAL, 86 of 1739 overdue** — on the exact surface whose accuracy this product
sells.

## The fix, three parts

### A. Widen the paid window: `daysFrom` 2 → 3 (one token)

`packages/ingestion-pipeline/src/settle-sport.ts:184` (and the preseason call a few
lines below, which also passes `2`). 3 is The Odds API's documented maximum for this
parameter — verify against the client wrapper's type/docs in
`packages/data-ingestion` before assuming. This alone does not fix the ratchet; it
only shrinks the trap's mouth.

### B. Backfill lane for picks older than the paid window

New function `backfillStaleSettlement` (suggested home:
`packages/ingestion-pipeline/src/settle-backfill.ts`), invoked from the settle cron
route **after** the per-sport paid loop (and from the free path after
`runFreePathSettlement`):

1. Query PENDING picks whose game `commenceTime` is older than the paid window
   (cutoff: `now - 3 days`), joined to their games. Cap per run (e.g. 50) so a cron
   invocation stays inside its time budget; the cron runs repeatedly, the backlog
   drains across runs.
2. Resolve final scores via the **existing free score sources** (ESPN + nflverse —
   the spend-guard comment at `settle-sport.ts:171-176` says these are free+cleared;
   `runFreePathSettlement` is the working example of using them). Reuse its
   resolution helpers — do NOT write a new fetcher. Free-source usage MUST go through
   the same clearance path the free lane already uses; if you find the free lane does
   NOT call `checkClearance()`, flag it in the report — do not replicate the gap.
3. Settle each resolved pick through the **same settlement function the existing
   paths use** (same WIN/LOSS/PUSH grading, same repair drains where applicable) so
   grading logic stays in one place. No new grading code.
4. **Terminal rule for the genuinely unresolvable:** if a pick's game is older than
   the backfill grace (**14 days**) and neither free source can produce a final
   score, mark the pick `VOID` following the existing VOID conventions in
   `settle-sport.ts` (find how postponed/cancelled games are voided today and reuse
   that exact path), recording an operator-readable reason string that names the
   sources tried. If no existing VOID path covers this case, mark the task BLOCKED
   with what you found instead of inventing a new state — a wrong terminal state on
   the public record is worse than a slow one.

### C. Health metric must reflect the lane

`apps/web/lib/performance/settlement-health.ts` computes the overdue count the truth
endpoint publishes. Confirm backfilled/voided picks leave the overdue set through the
existing computation with no changes. Only if the metric needs a change, keep it
additive (e.g. a `backfilledTotal` field) — never relax what counts as overdue.

## Hard constraints (NON-NEGOTIABLE)

- **No live DB or network calls during build/verify.** All tests use injected fakes
  for the DB client and score sources. Never run a script that connects — the
  laptop `.env` holds PRODUCTION credentials. The deploy and the first live backfill
  run are the founder's, in daylight.
- **No schema changes.** `prisma/schema.prisma` and `migrations/**` are sealed. Work
  entirely within existing models/fields.
- **No new paid API usage.** The backfill lane is free-sources only; the spend guard
  must not gain new paid call sites.
- **No weakened guards.** The CRITICAL banner clearing must come from picks actually
  settling, never from redefining "overdue."

## Done when (all four, real exit codes)

1. New unit tests exit 0, covering at minimum: a >3-day-old PENDING pick settles
   through the backfill lane with a mocked free-source score; a >14-day unresolvable
   pick VOIDs with reason; an in-window pick is untouched by the lane; the per-run
   cap is respected.
2. `npx tsc --noEmit` exits 0 in every touched package.
3. `npm run guardrails` link 1-2 (ledger guard + selftest) and trust-gate exit 0.
4. The report row cites the commit SHA and states, explicitly, that no live
   connection was made at any point.
