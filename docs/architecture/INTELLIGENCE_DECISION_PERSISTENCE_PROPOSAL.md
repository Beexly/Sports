# Intelligence Decision Persistence Proposal

Status: `OWNER_GATED_PROPOSAL`

Date: 2026-07-15

Migration executed: **No**

## Problem proven in the current schema

`GateDecision` stores status, reason, reason code, optional edge index/confidence, model version, time, and JSON evidence references. It does not freeze the executable offered quote, market dispersion/movement, decision threshold, boundary result, reversal condition, public explanation, uncertainty, rights/freshness decision, or canonical digest.

That omission matters most for `PASSED`: there may be no `Pick`, so later code cannot reconstruct the market and threshold without reading a later quote or guessing. Repository search also found readers of `GateDecision` but no `db.gateDecision.create`, `.update`, or `.upsert` writer. A schema change alone would therefore create another inert architecture artifact.

The current schema also has aggregate calibration machinery but no immutable pick-to-calibration-effect record. The playback adapter correctly reports that effect as not captured.

## Proposed durable truth

Create an append-only `IntelligenceDecisionSnapshot` at decision time and derive the event stream from it. Do **not** persist a second renderer-specific event truth.

Suggested fields:

```prisma
model IntelligenceDecisionSnapshot {
  id                    String   @id @default(cuid())
  schemaVersion         String
  gameId                String
  pickId                String?
  gateDecisionId        String?  @unique
  decisionKind          String   // PUBLISHED | PASSED
  selection             String?
  reason                String   @db.Text
  reasonCode            String
  decidedAt             DateTime

  marketKind            String
  offeredPrice          Int?
  offeredPoint          Float?
  bookCoverage          Int
  dispersion            Float?
  movement              Float?
  marketCapturedAt      DateTime

  boundaryMetric        String
  boundaryObserved      Float?
  boundaryThreshold     Float?
  boundaryCrossed       Boolean?
  reversalCondition     String   @db.Text

  modelVersion          String
  publicRepresentation  String   @db.Text
  internalOutput        Json?
  uncertainty           String   @db.Text
  disagreement          String?  @db.Text

  sourceTier            String
  rightsState           String
  healthState           String
  freshnessState        String
  contradictionState    String
  publicEligible        Boolean
  publicationReasonCodes Json
  digest                String   @unique
  createdAt             DateTime @default(now())

  evidence              IntelligenceDecisionEvidence[]

  @@index([gameId, decidedAt])
  @@index([pickId])
  @@index([decisionKind, decidedAt])
}

model IntelligenceDecisionEvidence {
  id              String   @id @default(cuid())
  decisionId      String
  evidenceKind    String
  evidenceId      String
  disposition     String   // SUPPORTING | WEAKENING | CONTRADICTED | CONTEXT
  factorKey       String?
  effectiveAt     DateTime?
  createdAt       DateTime @default(now())

  decision IntelligenceDecisionSnapshot @relation(fields: [decisionId], references: [id], onDelete: Restrict)

  @@unique([decisionId, evidenceKind, evidenceId, factorKey])
  @@index([evidenceKind, evidenceId])
}
```

`internalOutput` is server-only and may only enter a COCKPIT projection. If the security review rejects storing it, replace it with `internalOutputDigest` and retain the protected source artifact elsewhere. PUBLIC and PAID projections must remain structurally incapable of serializing it.

For pick-specific learning attribution, add a grade-once sidecar rather than mutating the decision snapshot:

```prisma
model PickCalibrationEffect {
  id                String   @id @default(cuid())
  pickId            String   @unique
  proofReceiptId    String   @unique
  modelVersion      String
  policyVersion     String
  populationKey     String
  bucketKey         String
  frozenModelProb   Float
  outcome           Float    // 1 win, 0 loss; pushes/voids excluded by policy
  brierContribution Float
  effectSummary     String   @db.Text
  evidenceDigest    String   @unique
  recordedAt        DateTime
  createdAt         DateTime @default(now())

  @@index([modelVersion, recordedAt])
  @@index([populationKey, recordedAt])
}
```

## Required writer, not optional

The gate/scoring pipeline must create the legacy `GateDecision`, the new snapshot, and all evidence bindings in one transaction before a pick can be published or a pass can be considered reconstructable.

Writer sequence:

1. Select the exact executable odds rows and their ingestion/source snapshots.
2. Compute the offered market, book coverage, dispersion, movement, and captured time from those rows only.
3. Freeze the model version, boundary metric/value/threshold/result, reason, reversal condition, and evidence directions.
4. Evaluate rights, health, freshness, and contradiction using the same policy used for publication.
5. Canonicalize the snapshot and evidence references and compute the digest.
6. In one database transaction, create `GateDecision`, `IntelligenceDecisionSnapshot`, evidence rows, and—only for a cleared publication—the immutable Pick/proof path.
7. Reject duplicate or digest-mismatched retries; adopt an identical prior row idempotently.

Settlement may create `PickCalibrationEffect` once, only when the immutable proof receipt contains a valid frozen probability and the canonical population policy includes the pick. Losses, wins, pushes, voids, and bootstrap rows must retain the existing eligibility rules.

## No-guess migration and rollout

1. Rebase the proposal onto the then-current Prisma schema.
2. Generate a migration but do not apply it to production.
3. Run Prisma validation/generation and a shadow-database diff proving only additive tables, relations, and indexes.
4. Implement the writer and failing-first transaction/idempotency/privacy tests.
5. Run in shadow mode: build snapshots beside current decisions, compare derived publication outcomes, and publish none from the new path.
6. Audit rights and raw-output access with PUBLIC, PAID, and COCKPIT serialization tests.
7. Obtain explicit owner approval before applying any migration or enabling a writer.
8. Do not backfill legacy PASS rows unless every required quote, source snapshot, threshold, and effective time is provable. Unprovable rows remain unavailable.

## Acceptance gates

- A complete PASS reconstructs without a Pick and without reading a quote captured after `decidedAt`.
- The same digest yields the Game Room, transcript/table, Observatory/Twin, autopsy, Media Studio draft, and cockpit explanation views.
- PUBLIC and PAID JSON cannot contain `internalOutput`, raw source payloads, internal-only rights, or paid-only market fields.
- Every evidence factor binds to at least one immutable evidence reference or is explicitly not captured/not applicable.
- Retry, concurrency, and partial-transaction tests prove no orphan decision, pick, proof receipt, or evidence row.
- A settled pick produces at most one calibration effect and only from the frozen pregame probability.
- Production migration, feature enablement, and backfill each require separate owner approval.
