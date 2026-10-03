# Exactly-Once Runtime — Track A: Control Event Ledger, Track B: Formal-Receipt Detection

**Date:** 2026-07-22
**Status:** IMPLEMENTED_ON_DRAFT_BRANCH / DORMANT-BEYOND-EMISSION / NOT_MERGED
**Scope of this pass:** Track A (control-event ledger + SRQC projection seed)
AND Track B (formal-receipt detection cron), both on the same branch/PR by
explicit owner authorization to extend PR #181 rather than wait for it to
merge first. Tracks C (Iceberg odds history) and D (Kafka/Flink) from the
handoff remain explicitly NOT in this change.

## What this adds

Two additive tables and the code that keeps them idempotent:

- **`control_event_ledger`** — an append-only record of control-plane
  outcomes. Primary key `eventId` is a **deterministic** string derived from
  the source row's own permanent identity plus the event type
  (`${invocationId}:FINALIZED_SUCCESS`, `${attemptId}:ATTEMPT_STARTED`, …).
  Never a wall-clock value, never a random UUID minted at the write site.
- **`processed_event`** — a composite-keyed `(eventId, sink)` gate. Its
  presence alone means "this sink has finished acting on this event." It is
  the primitive a future pull-based consumer (Formal Heartbeat receipt
  export, a Safety Ledger worker) checks before acting and marks after.

## The dual-path decision (why same-statement, not a separate write)

The control store (`apps/web/lib/ai-control-plane/control-store.ts`) has no
injectable transaction seam — every "atomic" operation is a **single** SQL
statement (a multi-CTE `WITH` or one guarded `UPDATE`). Rather than add a
second, best-effort ledger write that could drift from the real outcome, the
ledger `INSERT ... ON CONFLICT ("eventId") DO NOTHING` is folded **into the
same statement** as the authoritative state transition it records, in three
(plus one) places:

| Function | Event | Gating |
|---|---|---|
| `finalizeSuccess` | `FINALIZED_SUCCESS` | ledger CTE gated on the `inv` finalize CTE |
| `finalizeFailure` | `FINALIZED_{FAILED,AMBIGUOUS,BUDGET_BLOCKED,POLICY_BLOCKED}` | gated on the `inv` CTE |
| `recordAttemptFailure` | `ATTEMPT_FAILED` | gated on the `att` CTE |
| `startAttempt` | `ATTEMPT_STARTED` | gated on the `att` insert CTE |

Because each ledger insert is gated on its transition's CTE, **a fenced-out
or already-terminal caller writes neither the state change nor the ledger
row.** The ledger can therefore never record a transition that did not
actually happen — the property that a separate best-effort write could not
guarantee. This is the dual-path decision: the ledger is not a parallel
outbox racing the state machine; it is a projection written *by* the state
machine's own atomic step.

Idempotency under double delivery (a caller retry after a network hiccup, or
two racing redeliveries of the same recovery-queue entry) is then twofold:
the fenced `WHERE` guard means a repeat call matches zero rows in its
transition CTE, and `ON CONFLICT ("eventId") DO NOTHING` covers the residual
exact-key case. Proven against real Postgres (sequential AND concurrent) in
`apps/web/__tests__/ai-control-plane-event-ledger-pg.test.ts`.

**Coupling cost, stated honestly:** because the ledger insert lives inside
control-store's core statements, every integration test (or environment)
that hand-migrates a dedicated schema and uses `createPgControlStore` must
now include the `20260722220000_add_control_event_ledger` migration. The one
such existing suite (`ai-control-plane-budget-pg.test.ts`) has been updated;
CI's `db:push` already syncs the full schema, so the shared CI database is
unaffected.

## The projection stub (seed of α)

`apps/web/lib/ai-control-plane/srqc-projection.ts` is a **pure, detection-
only** fold from a window of ledger events into a small abstract state vector
`(claimPhase, exposurePhase, pendingCountClass ∈ {ZERO, ONE, GE2},
fingerprintBound, hasRejectedFp)`. It is the seed of the abstraction function
a future Self-Refining Quotient Certificate would refine — deliberately
minimal, and `admitUnderSRQC` **always admits** (no runtime behavior is gated
on it) while still computing the projection so the event shape is forced to
carry enough information.

Its one tested job today is **CTI detectability**: a window with two attempts
concurrently pending on the same invocation projects to `pendingCountClass ===
"GE2"` — the shape of inductive CTI #1 for `InvocationClaim`
(`AtMostOnePendingPerInvocation`). If a projection over a real ledger window
ever reports `GE2`, that is a signal the runtime produced a state the Formal
Foundry proofs forbid. See `ai-control-plane-srqc-projection.test.ts`.

## Track B — formal-receipt detection cron

**Code:** `apps/web/lib/ai-control-plane/formal-receipt-job.ts`,
`apps/web/app/api/cron/run-formal-receipt/route.ts`. No schema change — reuses
Track A's `processed_event` table under two new sink names
(`"formal_receipt"`, `"formal_receipt_violation"`); no new tables.

Track B is the first PULL-based consumer of the ledger Track A built: a
scheduled job that reads a trailing window via `readRecentEvents`, projects it
through the SAME `projectWindow` described above, and — if any invocation's
projected state has `pendingCountClass === "GE2"` or
`hasRejectedFp === true && fingerprintBound === false` — writes a structured
`console.error` line (`invocationId`, the offending fields, a witness
`eventId`, the window bounds) an operator can investigate.

**Detection-only, explicitly:**

- `admitUnderSRQC` is not called by this job and remains always-`ADMIT` on
  every live path, unchanged.
- **No `FormalIncident` table.** Still explicitly deferred (see below) — this
  pass's only artifacts are the log line and `processed_event` bookkeeping.
- Formal Heartbeat (`formal-heartbeat/`) is not imported by this job or its
  route and gains no I/O — the GE2/rejected-fingerprint check is done
  directly against `srqc-projection.ts`'s existing pure output.
- Fails closed: `event-ledger.ts`'s `StoreUnavailable` propagates through the
  job to the route, which maps it to HTTP 500 — never a silently "clean" 200.

**Exactly-once shape:** every distinct ledger `eventId` swept by a pass is
marked processed under sink `"formal_receipt"` (an audit trail; `markProcessed`'s
own `ON CONFLICT DO NOTHING` is the gate, so no separate pre-read is done).
The violation LOG LINE — the one side effect here that isn't naturally
idempotent the way an `INSERT ... ON CONFLICT` is — is gated with the
Pattern D check-then-act idiom under sink `"formal_receipt_violation"`,
keyed on a real, permanent **witness eventId**: the chronologically last
ledger row seen for the offending invocation in the window. Because
`processed_event.eventId` has a foreign key to `control_event_ledger`, no
synthetic "window" key can be used — a real row stands in for the window
instead. Proven against real Postgres (GE2 shape detected, legal sequential
shape produces zero false positives, identical window run twice logs at
most once) in `apps/web/__tests__/formal-receipt-cron.test.ts`.

**Schedule:** `vercel.json`, `/api/cron/run-formal-receipt`, `45 9 * * *`
(once daily), with a 26h lookback window (24h cadence + 2h buffer) so no
window boundary can leave a gap. No `.github/workflows/external-cron.yml`
entry was added — that workflow exists to give the Hobby-plan-capped
odds/settlement jobs a sub-daily cadence; this is non-urgent detection work,
so the daily-plus-overlap window is the right cost/benefit call, not an
oversight. Auth is the same `cronAuthError` bearer-token check as every
other `/api/cron/*` route.

## Versioned envelope (FormalIncident + SrqcVersion)

Two additive tables, on top of Track A + Track B (same branch, owner
authorized). Migration
`20260722230000_add_formal_incident_srqc_version`; writers in
`apps/web/lib/ai-control-plane/formal-incident.ts`, exported through the
sealed `internal.ts` barrel.

- **`formal_incident`** is the DURABLE row-store for an abstract CTI Track B's
  projection witnessed — a state the Formal Foundry's proofs forbid
  (`pendingCountClass = GE2` → `violationKind = "GE2_PENDING"`, or a rejected
  fingerprint with no bound id → `"REJECTED_FP_UNBOUND"`). It records
  `abstractState`, the `eventIds` the incident is gated on, the active
  `srqcVersion` (if any), and a `status` (`open`/`acknowledged`/`closed`).
- **`srqc_version`** is the human-activated certificate-version register:
  `version` PK, `indInvHash`, optional `refinementReceiptHash`, a
  `candidate`/`active`/`superseded` `status`, and `activatedAt`.

**Incident-writing reuses Track B's exactly-once gate — no new dedup
mechanism.** In `formal-receipt-job.ts` the `recordFormalIncident` call is
co-located INSIDE the same branch that is gated on the
`markProcessed(sql, witnessEventId, FORMAL_RECEIPT_VIOLATION_SINK)` mark
returning `"marked"` — the exact point a violation is *newly* logged. So
double-running the job over the same window writes the incident at most once.
As a belt-and-suspenders second layer, the row `id` is derived from
`${witnessEventId}:${violationKind}` and inserted `ON CONFLICT (id) DO
NOTHING`, so even a stray double-call cannot produce two rows. The active
SrqcVersion is read ONCE per pass and reused for every incident, never a
round-trip per violation.

**SrqcVersion activation is script-only / human.** Promotion from `candidate`
to `active` happens exclusively via `scripts/activate-srqc-version.mjs`, run
by hand by an operator with a chosen `DATABASE_URL`. There is intentionally NO
CI job or cron route wired to it, and none should be added — activation is a
human decision about which certificate generation is live. The script
supersedes the current active and activates the target in one CTE
(supersede-then-activate), so there is never a window with zero active
versions and never more than one.

**Still detection-only.** This adds durable records and a version register; it
changes NO control-plane decision. `admitUnderSRQC` (`srqc-projection.ts`)
remains always-ADMIT, and there is no ENFORCE path anywhere — that is a later,
separately-gated mission. `srqc-projection.ts` and `formal-heartbeat/` are
untouched by this pass.

## What remains lab-only / deferred

- **Formal Heartbeat stays dormant.** `formal-heartbeat/` is not wired to any
  production I/O by this change (Track A, B, or the versioned envelope). The
  `processed_event` gate exists so a future receipt-export consumer *can* be
  made effectively-once, and Track B is now the first such consumer for
  detection purposes — but no Formal-Heartbeat-authored consumer is activated
  here.
- **No ENFORCE path.** The `FormalIncident` / `SrqcVersion` tables now exist
  and are written (see above), but they are detection/record-keeping only. No
  code gates a control-plane admission on a certificate version or an open
  incident; `admitUnderSRQC` stays always-ADMIT. Wiring ENFORCE is a separate,
  later, explicitly-gated mission.
- **No Iceberg, Kafka, Flink, Airflow.** Tracks C and D remain deferred until
  a concrete scale/latency measurement forces them; the DB-primary ledger is
  the substrate they would fan out from, per the handoff's own dual-path
  sketch (DB outbox/ledger primary for Heartbeat latency, a bus as fan-out,
  `isolation.level=read_committed` on integrity consumers, the LSO-lag note).

## Invariants preserved

This change adds a projection surface; it does not alter any control-plane
decision. Every existing Formal Foundry property test and the full
`formal-heartbeat` suite remain green, and the 100-concurrent no-double-spend
budget acceptance test still passes end-to-end through the modified
`startAttempt` / `finalize` statements. The emission cannot open any CTI
class the Foundry closed: it only records transitions the store already
made under its existing fencing.
