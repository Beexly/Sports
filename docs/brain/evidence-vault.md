# Sports OS — Evidence Vault

**Status**: Doctrine only. Schema implementation is BLOCKED pending approval.
**Source**: Prompt 1 §4.4 · Component 6
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Block reference**: BLOCK-1 in `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`

---

## Purpose

The Evidence Vault is the central store for every observed fact, source
observation, claim, and signal that flows through Sports OS. It is the
source of truth for all pick rationale, Brain answer evidence, and public
claim accountability.

Every public claim made by Sports OS must trace to one or more Evidence
Vault items. No claim is published without a vault record. No vault record
is created without a declared source tier.

**Implementation status**: BLOCKED — schema change required.
The `EvidenceItem` type and its associated Prisma table do not yet exist.
Implementation requires a separate approved change proposal.

---

## What the Evidence Vault Stores

The vault stores a structured record for every piece of intelligence that
enters the Sports OS pipeline:

- Official injury designations and practice reports
- Odds and line data from licensed APIs
- Trusted secondary reporting
- Market movement observations
- Weak signal watchlist items (cockpit-only, never public-facing)
- Model scores and outputs (Tier 6 — never source of truth)
- Human review decisions and overrides

Each vault item carries full provenance: who observed it, when, from what
source tier, and what entity it pertains to.

---

## EvidenceItem Schema (PROPOSAL)

```typescript
// STATUS: PROPOSAL — not implemented.
// Implementation requires schema approval via
// docs/adr/pre-implementation-change-proposal-template.md
// Do not create this type in any application code without approval.

type EvidenceItem = {
  id: string;                    // System-assigned UUID
  sourceId: string;              // References Source Registry entry
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  entityType: string;            // EntityType from entity-graph.md
  entityId: string;              // Canonical entity ID
  claimType: string;             // "injury_status" | "line_value" | "rumor" | etc.
  observedAt: Date;              // When the source published or stated this
  publishedAt?: Date;            // When the original source published (if known)
  retrievedAt: Date;             // When Sports OS fetched this
  validUntil?: Date;             // TTL expiry — from source-hierarchy.md
  sourceQuality:
    | "OFFICIAL"
    | "LICENSED"
    | "TRUSTED_SECONDARY"
    | "MARKET"
    | "WEAK_SIGNAL"
    | "LOW_TRUST";
  confidence: number;            // 0–100, calibrated against historical results
  publicSafe: boolean;           // Whether this item may appear on a public surface
  summary: string;               // One-sentence human-readable description
  rawContent?: string;           // Original source content (cockpit-only)
  contradictionStatus:
    | "NONE"                     // No known conflicting evidence
    | "POSSIBLE"                 // Potential conflict detected, unresolved
    | "CONFLICTED";              // Confirmed conflict with another vault item
  humanReviewed: boolean;        // Whether a human operator has reviewed this item
  humanReviewedAt?: Date;
  humanReviewedBy?: string;      // Operator ID
  pickIds: string[];             // Picks that reference this evidence item
  claimIds: string[];            // Public claims that reference this evidence item
};
```

---

## Storage Rules

### What must be stored

1. Every piece of evidence used in any pick rationale
2. Every piece of evidence used in any Brain answer
3. Every piece of evidence referenced in any public claim
4. Every Tier-5 watchlist item (cockpit-only, `publicSafe: false`)
5. Human review decisions and their rationale

### What must not be stored

1. PII not relevant to sports intelligence (personal contact information, etc.)
2. Content from BLOCK-11 sources (FL Studio, pirated/cracked software archives)
3. Content from BLOCK-12 sources (system-prompts archives, leaked proprietary text)
4. Raw odds data that cannot be redistributed per The Odds API license terms
5. Content where the source cannot be attributed to a tier

### Freshness enforcement

A vault item whose `validUntil` has passed is considered stale. Stale items
must not be used as evidence for any new pick or public claim without
re-verification from the original source tier.

### Contradiction resolution

When `contradictionStatus` is `CONFLICTED`:
1. The item must not be used as standalone evidence for any public claim
2. A human review must be queued
3. The pick or claim referencing this evidence must be held until resolution
4. The higher-tier source takes precedence when resolving the conflict

---

## Public Safety Rules

An `EvidenceItem` may only appear on a public surface when ALL of the
following are true:

- `publicSafe: true`
- `sourceTier` is 1, 2, or 3 (Tier 4 may appear as market context with caveat)
- `contradictionStatus` is `NONE` or `POSSIBLE` with a human review note
- `validUntil` has not passed (or item is explicitly re-verified)
- `humanReviewed: true` for any Tier-3 item used as primary pick evidence

---

## Calibration Integration

After every settlement:
1. The settlement record updates the `confidence` calibration on the relevant vault items
2. Items whose confidence was materially miscalibrated are flagged for model review
3. The Signal Ledger records the calibration delta

This creates the closed feedback loop that makes confidence scores meaningful
over time rather than static estimates.

---

## Implementation Prerequisites

Before the Evidence Vault schema can be created:

1. Entity Graph schema must be approved and implemented
2. Source Registry must be operational (`docs/source-registry-spec.md`)
3. Signal Ledger schema must be co-designed (vault items link to ledger events)
4. A Prisma migration proposal must be submitted via the change proposal template
5. `humanReviewed` gate must be wired into the promotion checklist
6. `publicSafe` flag must be enforced server-side before any vault item reaches a public API

---

## Cross-Reference

- Entity Graph: `docs/brain/entity-graph.md` — entity resolution for vault items
- Signal Ledger: `docs/brain/signal-ledger.md` — audit trail that references vault items
- Source Hierarchy: `docs/brain/source-hierarchy.md` — tier definitions
- Claim Governance: `docs/brain/claim-governance.md` — vault items required per claim
- Source Registry: `docs/source-registry-spec.md` — source metadata
- ADR Change Proposal: `docs/adr/pre-implementation-change-proposal-template.md`
- ADR Promotion Checklist: `docs/adr/promotion-publication-checklist.md`
