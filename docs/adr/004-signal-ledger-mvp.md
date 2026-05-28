# ADR 004 — Signal Ledger MVP

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)
**Author:** Autonomous launch loop
**Related:** ADR 003 (Evidence Vault MVP), `docs/brain/signal-ledger.md`

## Context

The Signal Ledger is Component 8 of the Sports OS Intelligence Network
(`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` §4.5).
It is the immutable, append-only audit trail for every pick, Brain
answer, and public claim Sports OS produces — from intake through
settlement and calibration.

Today the platform has no audit trail of intelligence-pipeline events.
That blocks four things:

1. **Calibration transparency.** `/intelligence/calibration` cannot be
   built until 30+ settled picks per model version are queryable from a
   trusted append-only source. Today win-rate math reads from
   `db.pick` directly (per ADR 001), which is the *outcome* record —
   not the lifecycle that produced it.
2. **Public claim accountability.** Claim Governance (ADR 005, in
   parallel) requires `public_claim_created` and `public_claim_retracted`
   events to be queryable forever after publication. There is no table
   for these today.
3. **Pick Provenance Timeline.** The signature UI component cannot
   render the chain of evidence → model score → review → publication
   for any pick without a per-pick event stream.
4. **Loss autopsy at scale.** `/cockpit/loss-room` today reconstructs
   reasoning from log files; this is brittle and not joinable to
   evidence.

This ADR proposes the schema, migration, and first-consumer surface for
the Signal Ledger MVP. **No code is written until this is approved.**

## Decision (proposed)

Introduce one new Prisma model — `SignalLedgerEntry` — that records
every discrete event in the lifecycle of a `Pick`, `BrainAnswer`, or
`PublicClaim`. The model is append-only at the database level (no
UPDATE / DELETE grants on the table for the application role).

The first consumer is the existing settlement workflow: every
`pick_settled` event becomes a ledger row. This proves the write path
without changing any public surface, and immediately enables the
30-pick gate to be queried from a single trustworthy source.

```ts
// PROPOSAL — not implemented. Do not create this in application code
// until this ADR is Accepted.

evidenceItemId: String?    // FK to EvidenceItem (ADR 003), nullable
                           // because intake events precede evidence
modelVersion:   String?
operatorId:     String?    // FK to User, set for human events
metadata:       Json       // event-specific payload, validated per type
createdAt:      DateTime   @default(now())
// no updatedAt — immutability enforced by lack of UPDATE grant
```

## Prisma model (PROPOSAL — not implemented)

```prisma
// packages/db/prisma/schema.prisma — proposed addition

model SignalLedgerEntry {
  id              String   @id @default(uuid())
  eventType       String   // LedgerEventType (see docs/brain/signal-ledger.md)
  outputId        String   // pickId, answerId, or publicClaimId
  outputType      String   // "pick" | "answer" | "public_claim"
  entityIds       String[] // canonical entity IDs (Phase 1: free-text; Phase 2 FK)
  evidenceIds     String[] // EvidenceItem IDs referenced
  evidenceItemId  String?  // primary EvidenceItem if exactly one
  modelVersion    String?
  operatorId      String?
  metadata        Json
  eventAt         DateTime @default(now())
  createdAt       DateTime @default(now())

  evidenceItem    EvidenceItem? @relation(fields: [evidenceItemId], references: [id])
  operator        User?         @relation(fields: [operatorId], references: [id])

  @@index([outputType, outputId])
  @@index([eventType, eventAt])
  @@index([modelVersion, eventType])
  @@index([eventAt])
}
```

## Migration plan

1. Approval recorded (this ADR moves from Proposed → Accepted).
2. ADR 003 (Evidence Vault) must be Accepted first — `evidenceItemId` is
   a real FK and the `evidenceIds` arrays must reference real rows.
3. Create migration: `prisma migrate dev --name add_signal_ledger_entry`.
4. Run `prisma generate`.
5. After migration: revoke `UPDATE` and `DELETE` privileges on
   `SignalLedgerEntry` from the application database role. Only the
   `db_admin` role retains them. This enforces append-only at the
   database, not at the ORM. Document in
   `docs/runbooks/append-only-grants.md` (new).
6. Wire the first writer: the existing pick-settlement worker writes a
   `pick_settled` ledger entry alongside the `Pick.status` update.
7. Add a Vitest suite that proves the write path: settle a pick →
   exactly one ledger entry exists with eventType `pick_settled`,
   correct outputId, evidenceIds carried over.
8. Backfill: insert one synthetic `pick_settled` entry per existing
   settled pick using `Pick.settledAt` and `Pick.modelVersion`.
   Backfill rows carry `metadata.backfilled: true` so reports can
   exclude them from forward-looking calibration math.

## Rollback

If the migration causes regression in the settlement workflow:

1. Re-grant UPDATE/DELETE on `SignalLedgerEntry` to the application role.
2. Disable the new write call in the settlement worker (single feature
   flag: `SIGNAL_LEDGER_WRITE_ENABLED=false`).
3. Run `prisma migrate resolve --rolled-back <migration-name>`.
4. Drop the table: `DROP TABLE "SignalLedgerEntry" CASCADE`.

The table is additive and not yet read from any surface, so rollback
does not affect any other Prisma model or any public route.

## First consumer surfaces

| Phase | Consumer | Event type written |
|---|---|---|
| MVP | settlement worker | `pick_settled`, `calibration_updated` |
| MVP | `/cockpit/loss-room` (read-only) | reads ledger by `outputType=pick` |
| Phase 2 | pick generation pipeline | `pick_initiated`, `confidence_assigned`, `pick_published` |
| Phase 2 | Brain answer pipeline | `question_asked`, `answer_published` |
| Phase 3 | `/intelligence/calibration` page | reads 30+ `pick_settled` rows per model version |
| Phase 3 | Pick Provenance Timeline component | reads full event chain for a single `outputId` |

## Passing gate

This ADR is implemented successfully when ALL of the following are true:

- `prisma migrate dev` runs green
- `prisma generate` types resolve, no `any` in the new code
- Append-only grants are confirmed (`SHOW GRANTS` proves application
  role has only SELECT + INSERT on the table)
- Settlement of one pick writes exactly one ledger row, verifiable in
  a Vitest test
- All pre-existing tests still green: 765/765 brand-safety, 42/42 smoke,
  guard:trust 0 hits
- Backfill ran cleanly: count of `pick_settled` ledger rows equals
  count of settled picks pre-migration

## Out of scope (Phase 1)

- Entity Graph foreign keys — `entityIds` is a free-text `String[]` in
  Phase 1. Phase 2 promotes it to FK once the Entity Graph schema lands.
- Real-time streaming. Ledger writes are synchronous within the same
  transaction as the originating event. A change-data-capture stream
  can be added later if `/intelligence/calibration` needs sub-minute
  freshness.
- Full event-type coverage. Phase 1 ships only `pick_settled` and
  `calibration_updated` writers. The other 30+ event types in
  `docs/brain/signal-ledger.md` ship in subsequent ADRs as their
  upstream consumers come online.
- Public read API. No `/api/ledger` route is added. The first public
  consumer (`/intelligence/calibration`) reads via server component
  directly from the Prisma client, gated by the readiness gate.

## Dependencies on other ADRs

- **ADR 003 (Evidence Vault MVP)** — must be Accepted first. The
  `evidenceItemId` FK is a real relation.
- **ADR 005 (Claim Governance)** — depends on this ADR for
  `public_claim_created` / `public_claim_retracted` events.

## Consequences

**Positive:**
- The 30-pick calibration gate becomes queryable from a single source.
- Pick retraction has a real audit row, not just a log line.
- Loss autopsy and provenance timeline both become straightforward
  server-component reads instead of log-parsing.

**Negative:**
- Every settlement now writes two rows (Pick.status update + ledger
  entry). Acceptable; settlement is not hot-path.
- Append-only grants require an out-of-ORM database step that has to
  be re-run after every fresh schema reset. Documented in the
  runbook.

## Open questions for owner

1. Confirm append-only via database grants is the right enforcement
   level (vs Prisma middleware vs `@@unique` tricks).
2. Confirm the backfill plan does not pollute calibration math —
   `metadata.backfilled: true` is the proposed marker.
3. Confirm Phase 1 ships only the settlement writer, not the full
   pipeline coverage.
