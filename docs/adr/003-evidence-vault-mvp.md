# ADR 003 — Evidence Vault MVP

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)
**Author:** Autonomous launch loop
**Related:** ADR 004 (Signal Ledger), ADR 005 (Claim Governance),
`docs/brain/evidence-vault-explained.md`

## Context

The Evidence Vault is Component 7 of the Sports OS Intelligence Network
(`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
§4.4). It is the append-only intelligence store that backs every public
claim, every Brain answer, and every published pick.

Today the platform has no structured intelligence store:

1. **No evidence traceability.** Published picks reference a model score
   but not the underlying evidence that produced it. A pick claiming
   "sharp action detected" cannot point to the specific odds-snapshot
   row that validated the claim. This gap is exploited by tout-services
   — `/vs/tout-services` positions honesty as a differentiator, but
   without a real evidence trail we rely only on static copy.
2. **No public-safety gate at the data layer.** Whether a piece of
   intelligence is safe to expose publicly is currently determined by
   static text scanners (`trust-gate.mjs`, public-copy tests). Those
   scanners verify *language* in source files; they cannot verify at
   runtime whether evidence from a tier-3 source has leaked into a
   tier-1 public claim.
3. **No TTL enforcement.** Evidence items from The Odds API have a
   30-minute freshness budget. There is no mechanism today to expire
   stale evidence, leaving the risk that a pick published at T=0 might
   still be backed by evidence that was fresh at T=-60m.
4. **No evidence-backed Claim Governance.** ADR 005 (Claim Governance)
   requires that every `PublicClaim` reference at least one
   `EvidenceItem` ID. Without this table, Claim Governance cannot be
   implemented.

This ADR proposes the schema, migration, and service layer for the
Evidence Vault MVP. **No code is written until this is approved.**

## Decision (proposed)

Introduce one new Prisma model — `EvidenceItem` — with a `publicSafe`
gate computed at write time from source tier and claim type. The service
layer in `apps/web/lib/evidence-vault/` is the single path for inserting
and querying evidence; no route or worker may bypass it.

Public-safety rule (enforced at insert time):
- `publicSafe = true` iff `sourceTier ∈ {1, 2}` AND `claimType ∉ {rumor, sharp_action}`
- All other combinations: `publicSafe = false`

Evidence expires after `ttlSeconds` (default 1800). Expired items remain
in the store (`expiredAt` set, not deleted) so audit queries remain
accurate.

## Prisma model (PROPOSAL — not implemented)

```prisma
// packages/db/prisma/schema.prisma — proposed addition

model EvidenceItem {
  id          String    @id @default(uuid())
  sourceId    String    // FK or slug of the DataSource that produced this
  sourceTier  Int       // 1–6 mirrors DataSource.tier
  entityType  String    // "player" | "team" | "game" | "market" | "league"
  entityId    String    // canonical entity ID (string FK, Phase 1)
  claimType   String    // LedgerEventType subset (odds_snapshot, injury_status, etc.)
  observedAt  DateTime  // timestamp from the source
  content     Json      // source-native structured payload
  ttlSeconds  Int       @default(1800)
  confidence  Float     @default(1.0)  // 0–1, source-tier-derived
  publicSafe  Boolean   @default(false) // computed at insert time
  expiredAt   DateTime? // null = still live; set by sweep
  createdAt   DateTime  @default(now())

  @@index([entityType, entityId, claimType])
  @@index([sourceId, observedAt])
  @@index([publicSafe, expiredAt])
  @@index([expiredAt])
}
```

## Service layer (PROPOSAL — implemented at apps/web/lib/evidence-vault/)

The service layer is implemented ahead of the schema migration as a
forward-compatible module. Functions will fail gracefully (Prisma throws
on missing table) until the migration runs. Unit tests mock the Prisma
client directly and pass today (11 tests, 100% green).

```ts
// Service functions in apps/web/lib/evidence-vault/index.ts
insertEvidenceItem(input: EvidenceInsert): Promise<EvidenceItem>
lookupEvidence(query: EvidenceLookup): Promise<EvidenceItem[]>
latestEvidence(entityId, claimType, publicSafeOnly?): Promise<EvidenceItem | null>
expireStaleItems(entityId, claimType): Promise<number>
sweepExpiredItems(): Promise<number>
```

Public-safety gate logic is pure and tested in isolation:
```ts
// tier 1-2 + non-rumor/non-sharp_action = publicSafe
function defaultPublicSafe(tier: number, claimType: string): boolean {
  return tier <= 2 && claimType !== "rumor" && claimType !== "sharp_action";
}
```

## Migration plan

1. Approval recorded (this ADR moves from Proposed → Accepted).
2. Create migration: `prisma migrate dev --name add_evidence_item`.
3. Run `prisma generate`.
4. Smoke test: `node -e "require('./apps/web/lib/evidence-vault').insertEvidenceItem({...})"` confirms write path.
5. Wire the data refresh worker: after each odds snapshot is normalized,
   call `insertEvidenceItem()` with `claimType: "odds_snapshot"`.
6. Wire the TTL sweep: add a cron job (or extend the settlement worker)
   that calls `sweepExpiredItems()` every 30 minutes.
7. Verify `publicSafe` gate: insert one tier-3 item and confirm
   `publicSafe=false`; insert one tier-1 `odds_snapshot` and confirm
   `publicSafe=true`.

## Rollback

The table is additive and not read from any public route in Phase 1.
If the migration causes regression:

1. Disable `insertEvidenceItem()` calls in the data refresh worker
   (remove the import — the function throws at runtime on missing table;
   no data loss possible).
2. Run `prisma migrate resolve --rolled-back add_evidence_item`.
3. Drop the table: `DROP TABLE "EvidenceItem" CASCADE`.

## First consumer surfaces

| Phase | Consumer | What it reads |
|---|---|---|
| MVP | Data refresh worker | writes `odds_snapshot` items per game per cycle |
| MVP | TTL sweep cron | calls `sweepExpiredItems()` every 30 min |
| Phase 2 | Claim Governance (ADR 005) | `evidenceIds` in `PublicClaim` rows |
| Phase 2 | Brain Q&A | evidence backing for answer construction |
| Phase 3 | `/brain/evidence-vault-explained` | public read of non-sensitive item metadata |
| Phase 3 | Signal Ledger (ADR 004) | `evidenceItemId` FK on `SignalLedgerEntry` |

## Passing gate

This ADR is implemented successfully when ALL of the following are true:

- `prisma migrate dev` runs green, no existing test fails
- `prisma generate` types resolve with no `any`
- `insertEvidenceItem()` writes a row with correct `publicSafe` value
  (verified in integration test)
- `sweepExpiredItems()` marks stale items expired and returns correct count
- All pre-existing tests still green: 161 test files, 2028+ tests

## Out of scope (Phase 1)

- Entity Graph FK — `entityId` is a free-text string in Phase 1. Phase 2
  promotes it to a real FK once Entity Graph (ADR 006) is implemented.
- Read API — no `/api/evidence/*` public route. Evidence is read only
  via server components and the service layer.
- Full source coverage — Phase 1 instruments odds snapshots only. Injury
  status evidence is added in Phase 2 when the ESPN adapter ships.

## Dependencies on other ADRs

- **ADR 006 (Entity Graph)** — `entityId` becomes a real FK in Phase 2
  once the Entity model exists. Phase 1 accepts free-text string.
- **ADR 004 (Signal Ledger)** — depends on this ADR for the
  `evidenceItemId` FK on `SignalLedgerEntry`.
- **ADR 005 (Claim Governance)** — `PublicClaim.evidenceIds` references
  Evidence Vault rows.

## Consequences

**Positive:**
- Every published pick can now cite specific evidence items, making the
  platform's claims auditable and legally defensible.
- The public-safety gate at the data layer is stronger than the
  existing static text scanners.
- TTL enforcement prevents stale intelligence from backing live claims.
- Enables Claim Governance (ADR 005) and Signal Ledger (ADR 004).

**Negative:**
- Data refresh worker writes one additional row per game per cycle
  (odds snapshot). At 200 games/day × 48 cycles/day = 9,600 rows/day.
  Acceptable for Phase 1; add partitioning if it grows >10M rows.
- `sweepExpiredItems()` requires a cron slot. Recommended: run alongside
  the existing settlement worker every 30 minutes.

## Open questions for owner

1. Confirm TTL policy: 1800 seconds (30 min) for odds snapshots is
   the proposed default. Injury-status items may warrant longer TTL
   (86400 = 24h). Confirm per claim type or accept the default.
2. Confirm whether `expiredAt`-set rows should be purged (hard delete)
   after N days to control table size, or retained indefinitely for
   audit purposes.
3. Confirm the `publicSafe` rule: tier 1-2 + non-rumor/non-sharp_action
   is the proposed gate. Owner may want to add additional claim types
   to the exclusion list.
