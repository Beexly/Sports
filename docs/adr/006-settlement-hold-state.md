# ADR 006 — Persisted Settlement-Hold State

**Date:** 2026-08-13
**Status:** Proposed — no schema change, no implementation (owner approves before build)
**Author:** Hermes continuous run (PHASE 1b, item 1 of 3)
**Supersedes:** nothing. **Depends on:** ADR 003 (server-side paywall hardening) only by adjacency.

## Context

The platform settles picks automatically via `/api/cron/settle-picks` (hourly at `:20`).
On the free path, when the two score sources disagree,
`apps/web/lib/data-sources/free-settlement-runner.ts:330-344` **holds** the pick
(`o.status === "HELD"`) and pushes `holdReason: "DISPUTED"` into an in-memory
`rcaInputs` array, then `continue`s. The pick row is left `result: "PENDING"` with
no marker.

That hold is **deliberate and load-bearing.** `apps/web/lib/autonomy/operating-kernel.ts:172-183`
is explicit:

> `${obs.stpExceptions} exception(s) (DISPUTED / orient / path) need human evidence — never force-settle.`

Refusing to invent a score is the product thesis (no fake data — `CLAUDE.md` rule #1).
Holding is correct behavior. **The defect is that the hold is never persisted.**

Meanwhile `apps/web/lib/performance/settlement-health.ts:140-155` counts overdue as:

```ts
db.pick.count({
  where: { ...baseWhere, result: "PENDING", game: { commenceTime: { lt: overdueCutoff } } },
});
```

There is **no hold exclusion** — because there is no column to exclude on. So two
radically different conditions produce an identical signal:

1. "Settlement correctly refused to guess a disputed score" → a held pick.
2. "Settlement is actually broken and forgot this pick" → a stuck pick.

That ambiguity is what drives `settlement = DEGRADED` → the P0 founder step →
`operator status = degraded` → the launch preflight's `RESULT: FAIL`. The owner
cannot tell a one-click adjudication worklist from a real outage.

**The strict constraint (from `CONTINUOUS.md` PHASE 1b):** there is no field to
exclude on, so we do NOT add a `WHERE` clause. We do NOT add a column to
`schema.prisma` — that file is **LAW 4 off-limits** without an approved proposal,
and a schema change needs an owner-run migration. This ADR is the proposal.

## Decision

Add **one additive model** — `SettlementHold` — that records, per pick per
settlement run, that the pick was deliberately held and why. No existing model,
column, or index is modified. No `Pick` column is added (keeping `schema.prisma`
untouched beyond this single additive model). No data is migrated at write time.

### `SettlementHold`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` `@id @default(cuid())` | |
| `pickId` | `String` | FK to `Pick.id` — the held pick. **Not** a hard Prisma FK unless the owner approves a relation; a plain indexed column keeps the change additive and avoids touching the `Pick` model. |
| `holdReason` | `String` | `"DISPUTED"` today; kept as `String` (not enum) because orient/path holds are on the roadmap and an enum would force a later migration. |
| `settlementRunAt` | `DateTime` | timestamp of the run that decided to hold. Lets us know "was held as recently as X" vs "held once, three runs ago." |
| `sourceA` / `sourceB` | `String?` | the two disagreeing scores that triggered the hold (evidence, not a decision). |
| `resolvedAt` | `DateTime?` | null = still held; set when an owner adjudicates. Lets health distinguish "held and pending human" from "held and resolved." |
| `createdAt` | `DateTime @default(now())` | |

Unique on `(pickId, settlementRunAt)` so re-running the same run is idempotent.
Indexed on `(pickId, resolvedAt)` so the cockpit "needs adjudication" view (P1b-3)
and the health exclusion query are cheap.

### How the signal splits (the payoff)

`settlement-health.ts` overdue count becomes:

```ts
db.pick.count({
  where: {
    ...baseWhere,
    result: "PENDING",
    game: { commenceTime: { lt: overdueCutoff } },
    NOT: { settlementHolds: { some: { resolvedAt: null } } }, // exclude actively-held
  },
});
```

"Refused to guess" (has an unresolved `SettlementHold`) is now excluded from
overdue. `settlement = DEGRADED` becomes a true failure signal. The held picks
surface instead in the P1b-3 adjudication view, not as a false outage.

### Alternatives considered

1. **Add a `holdReason` column directly on `Pick`.** Rejected. It edits the `Pick`
   model in `schema.prisma`, tripping LAW 4's "no unapproved schema change," and
   conflates "the pick's current settlement outcome" with "a per-run hold event" —
   a pick can be held across multiple runs. A single column loses the run history.

2. **Derive held-ness by re-running the disagreeing matcher on demand** (no storage).
   Rejected. The matcher is a network call with two external score sources; re-running
   it from the health probe re-introduces the exact failure mode we are trying to make
   observable, and it cannot recover *why* a pick was held once the run's `rcaInputs`
   are gone. Storage is the honest fix.

3. **(Chosen) Separate `SettlementHold` record.** One additive model, no `Pick`
   edit, preserves per-run history, carries the evidence (`sourceA`/`sourceB`), and
   gives both the health exclusion and the P1b-3 worklist the field they need.

### Blast radius

- **Zero runtime behavior change at write time.** The runner still holds; it now
  *also* writes a `SettlementHold` row before `continue`. Hold decision logic is
  untouched.
- Touches `CLAUDE.md` rules: #1 (no fake data — preserved, we record refusals not
  scores), #5 (freshness — the `settlementRunAt`/`resolvedAt` columns make the
  hold observable), #3 (server-side enforcement — the hold stays server-side).
- No public surface change. No paywall, no auth change.
- The `free-settlement-runner.ts` write is the only product-code edit, and only
  after this ADR is approved (separate build task, not this one).

### Rollback

`DROP TABLE "SettlementHold";` — affects no other object. The `Pick` model is
untouched, so removing the table fully reverts the change.

## Consequences

**Enables:** (a) `settlement-health.ts` can exclude held picks, turning a false
outage into a quiet, correct state; (b) the P1b-3 cockpit "needs adjudication" view
has a real column to query; (c) the launch preflight `RESULT: FAIL` stops firing on
deliberate refusals.

**Costs:** one additive table, one migration (owner-run), Prisma client regen.

**Out of scope (separate changes):** the runner's write (build task after approval),
the P1b-3 view, any auto-resolve logic, any change to *why* a pick is held.

## Safety

- Additive only. No `ALTER`/`DROP` on existing objects. No `Pick` column.
- `SettlementHold` stores *why a score was refused*, never a guessed score. Rule #1 holds.
- No public route reads or writes it directly; only the cron runner writes and the
  cockpit view (P1b-3, read-only) and health query read it.
- Migration is committed but **not applied** (agent holds no production `DATABASE_URL`).

## Operator step (not automated)

```bash
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

## Follow-ups

1. Build task (post-approval): write the `SettlementHold` row in
   `free-settlement-runner.ts` before the `continue` at line ~344.
2. Build task (post-approval): exclude unresolved holds in `settlement-health.ts`
   (snippet above).
3. P1b-3: read-only cockpit "needs adjudication" view over unresolved holds.
