# Line integrity — what was found, what shipped, and what is the founder's to decide

**Ledger rows: C-270, C-271, C-272, C-273. Remediation of C-197.**
**Branch `claude/launch-line-integrity`. Nothing in this branch is enabled by default.**

This document contains no recommendation to flip anything, and no corrected
hit rate.

---

## 1. What deliverable 1 found

**The finding is real. Its stated mechanism is not.**

C-197 says published picks carry a **model-predicted margin** in the `line`
field. They do not. `packages/prediction-engine/src/scoring.ts` computes

- `avgSpread` (line 411) — the arithmetic **mean of every book's quoted spread**
- `avgTotal` (line 685) — the arithmetic **mean of every book's quoted total**

and stores that mean in `Pick.line` (lines 653 and 857). `Missouri Tigers -53.8`
/ `-53.83333333333334` is the mean of real book lines on a blowout FCS fixture,
not model output: it is reproduced in test from `[-53.5, -54, -54, -53.5, -54, -54]`
(`packages/prediction-engine/src/__tests__/quoted-book-line.test.ts`).

This changes the remedy, not the severity. There is **no write path connecting
the engine's margin to the price field**, so there is nothing to disconnect.
What is wrong is that a *consensus statistic* is displayed as a placeable price
and settled as one. A member cannot place -53.83, and CLAUDE.md rule 1 forbids
publishing it. Both of C-197's consequences stand.

### Does it still happen, per path

Measured with `LINE_INTEGRITY_PUBLISH_GUARD_ENABLED` unset — production today.

| Path | Still happens? | Where |
|---|---|---|
| SPREAD published off a quoted line | **YES** | `scoring.ts:653` (`line: avgSpread`) |
| TOTAL published off a quoted line | **YES** | `scoring.ts:857` (`line: avgTotal`) |
| MLB spread off the ±1.5 run-line ladder | **No — already refused** | `scoring.ts:431`, `isPublishableSpreadLine` (C-119/C-125) |
| MLB **total** off the grid | **YES** | no ladder twin exists for totals |
| Any line with **no** bookmaker quote | **Cannot occur** | `MIN_BOOKMAKERS` gates both scorers on quoted rows |

The MLB-total row is the sibling-lane pattern this repo keeps hitting: the
run-line ladder guard was added to SPREAD and never to TOTAL, and TOTAL is the
**worse half** of the finding (369 of 599 off-grid, against SPREAD's 310 of 719).

## 2. What the existing guard already blocks

On `main` at `8cc0695` (the `#719` merge), the "no-fabricated-price" work
(C-132..C-135) is about **prices**, not lines. It stops the scorer inventing a
`-110` where no book quoted one, and makes one book set canonical for every
price- and depth-derived value on both SPREAD and TOTAL. None of it constrains
the stored `line`.

The only line-shaped guard that exists today is `isPublishableSpreadLine`:
baseball SPREAD only, refusing anything off the ±1.5 / 2.5 / 3.5 ladder. It is
kept, not replaced — it catches the case the new guard cannot, where **every**
book quotes the same contaminated line.

## 3. What shipped, and what it is gated on

| Ships | State | Flag |
|---|---|---|
| `isQuotedBookLine` + refusal in both scorers (C-270) | **OFF** | `LINE_INTEGRITY_PUBLISH_GUARD_ENABLED` |
| Void/unpublish remediation lane (C-271) | **OFF** | `LINE_INTEGRITY_VOID_ENABLED` |
| `lineIntegrity` block on the ops truth surface (C-272) | **On, read-only** | — |
| `npm run ops:regrade-lines` (C-273) | **On, report-only** | — |

### 3a. The publish guard (C-270) — and why it is BLOCKED to the founder

`isQuotedBookLine(line, quotedLines)` refuses a pick whose stored mean is not a
line some book on the row quoted. It is deliberately **not** a half-point-grid
test: books quote quarter-point Asian handicaps and whole-number totals, so the
grid is a proxy and the book set is the fact.

Enforcement ships **off**, and turning it on is not an agent's call:

1. **It changes what the engine publishes.** The dispatch brief says to block
   any part that changes engine output. (It does *not* trip
   `scripts/guardrails/model-freeze.mjs`, which gates a `MODEL_VERSION` bump on
   a matching IMPLEMENTED calibration proposal and does not hash engine code —
   verified: `model-freeze OK v5.2.7`, no bump.)
2. **It overturns a recorded decision.** `baseball-run-line.test.ts:31` states
   in terms that a blanket must-be-quoted rule "would gut the board", and keeps
   the ladder baseball-only on purpose. On C-197's own production numbers,
   enabling it suppresses roughly **43% of SPREAD** and **62% of TOTAL** picks —
   24 hours before NFL kickoff.

**Publishing without a line is not available.** `Pick.line` is `Float` **NOT
NULL** in `schema.prisma`, which AGENTS.md law 2 freezes. So the C-252
"no book price" semantics cannot be applied to SPREAD/TOTAL: the only two
states are publish-the-mean or refuse.

### 3b. The remediation lane (C-271)

Automated, per the founder policy of 2026-09-05 that no pick ever sits on a
human (founder-delegated 2026-09-08, via orchestrator). Runs as settle-picks
step 3c, after the zero-sit lane and before the outbox drain.

- **VOID half** — a settled published SPREAD/TOTAL pick whose stored line was
  not quoted by any book for that game and market at or before `generatedAt`
  gets `result = VOID` through the same transactional outbox the graders use,
  with one `PickSettlementEvent` carrying `rcaCode: LINE_NOT_QUOTED`, the stored
  line, the nearest book line (or `null`), and the source odds row ids.
  **`settledAt` is never re-stamped** and the result is **withdrawn, never
  rewritten in place** to some other outcome.
- **UNPUBLISH half** — an unsettled published pick with the same defect gets
  `isPublished = false`, with an append-only memory event in the same
  transaction. Nothing is deleted; the result stays `PENDING` and the zero-sit
  lane still owns its eventual grading.

Nothing is voided on missing evidence: an odds read failure skips the pick, and
the `NO_QUOTE_ROWS` branch fires only when the query succeeded and returned
nothing. Both halves are idempotent — every write is scoped to the state it
read, so a second run selects nothing and a race loser writes nothing.

One deviation, recorded rather than silently substituted: the brief asked for
the flag to be read "exactly the way the zero-sit lane reads its flag". **The
zero-sit lane has no flag** — it ships always-on — so this uses the repo's
env-flag idiom (`?.trim().toLowerCase() === "true"`, default false).

### 3c. Exposure without SQL (C-272)

`lineIntegrity` on `/api/ops/public-surface-truth`, read-only. Two different
populations, named apart, because the recurring defect class here
(C-241/C-246/C-250) is a count whose label is not what it measures:

| Field | What it counts |
|---|---|
| `publishedUnsettledOffGridOrBadRunline` (+ `...By`) | Exact, no odds join. Currently published **unsettled** SPREAD/TOTAL picks off the half-point grid, or MLB spreads not on the run-line ladder, by sport and market. A **lower bound**: off-grid is certainly not a book line, but an on-grid line may still never have been quoted. |
| `publishedUnsettledNotQuoted` / `publishedUnsettledInspected` / `publishedUnsettledCapReached` | Exact against the odds table, over the rows this call inspected. Published unsettled picks whose line no book quoted at publish time. |
| `remainingToVoid` / `remainingInspected` / `remainingCapReached` | Exact against the odds table, over the rows this call inspected. Settled published picks the VOID half would act on right now. |
| `voidedByLane` | Settlement events stamped `rcaCode: LINE_NOT_QUOTED`. |
| `unpublishedByLane` | Append-only memory events written by the unpublish half. |
| `laneEnabled`, `publishGuardEnabled` | Whether either flag is currently on. |

**The flip precondition: `remainingToVoid` reads 0, with `remainingCapReached`
false.** A `remainingToVoid` of 0 while `remainingCapReached` is true is a floor,
not a total, and does not satisfy it.

### 3d. The dry-run tool (C-273)

```
npm run ops:regrade-lines
npm run ops:regrade-lines -- --json --limit 500
```

Report-only. For every settled published SPREAD/TOTAL pick whose stored grading
line is off the half-point grid, it resolves the publish-time book line using
the **same resolver order as the calibration loader** (C-253/C-110: real
bookmakers only, each one's latest row at or before `generatedAt`) and prints
the stored line, the book line or `NONE`, the result on record, the result that
book line would give via the engine's own `calculatePickResult` /
`selectGradingLine`, and whether they differ — aggregated by sport and market.

It writes nothing. `--execute`, `--write`, `--apply`, `--fix` and `--regrade`
exit 2 before touching the database; there is no write mode to enable.

Which book line is "the" book line is a **reporting choice**, stated rather
than buried: the modal line across books, ties broken toward the line nearest
the stored value. It is not an approved grading policy and nothing in the
product grades against it.

**No corrected hit rate appears in this document or in the tool's output**, and
none should be derived from the difference counts. A win percentage computed off
an unapproved grading policy is precisely the claim C-197 exists to prevent.

## 4. Automated vs founder-only

| Step | Who |
|---|---|
| Detect the defect at publish time | Automated (guard, when enabled) |
| Void settled defective picks | Automated (lane, when enabled) |
| Unpublish unsettled defective picks | Automated (lane, when enabled) |
| Count what remains | Automated (truth surface, always on) |
| Report what a re-grade would change | Automated (`ops:regrade-lines`, always on) |
| **Set `LINE_INTEGRITY_VOID_ENABLED=true` in Vercel** | **Founder only**, via the browser agent |
| **Set `LINE_INTEGRITY_PUBLISH_GUARD_ENABLED=true` in Vercel** | **Founder only**, via the browser agent — this is the board-suppression decision in §3a |
| `PERFORMANCE_STATS_ENABLED`, `PRICING_PHASE=PROVEN` | **Founder only**, and gated on §3c |

No agent flips any of these, and no agent runs a repair against production.

## 5. One measurement worth having in front of the decision

Read-only `GET /api/ops/public-surface-truth`, **2026-09-08 23:59 UTC**,
deployment `9046ff22a`: `calibrationEligibility.status` is **GREEN** with
`consecutiveGreen` **31**. The three-run streak the gate requires is met, and
`lineIntegrity` is absent because this branch is not deployed.

State plainly what that does and does not mean. The eligibility floors are
computed from settled picks graded against the stored lines — the same lines
this document is about. A GREEN calibration streak measured on that input is
not independent evidence that the input is sound, so it is not a reason to
flip anything, and it is not a reason not to. It is the reason the
`remainingToVoid` precondition in §3c exists.

## 6. Not established here

- **The engine's quality.** Nothing above measures whether the model is good.
- **How many recorded results are actually wrong.** `ops:regrade-lines` reports
  what a book-line grade would change; it has not been run against production
  by this branch, and running it is read-only whenever someone chooses to.
- **Whether the surviving board is large enough to sell.** The ~43%/62%
  suppression figures come from C-197's production counts, not from a run of the
  guard against live data.
