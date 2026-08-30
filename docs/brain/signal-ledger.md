# Sports OS — Signal Ledger

**Status**: Doctrine only. Schema implementation is BLOCKED pending approval.
**Source**: Prompt 1 §4.5 · Component 8
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Block reference**: BLOCK-2 in `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`

---

## Purpose

The Signal Ledger is the full lifecycle audit trail for every pick,
recommendation, Brain answer, and public claim produced by Sports OS.

From the moment a question is asked or a pick is initiated, to the moment
it is settled and its calibration is updated, every step is recorded.
The ledger makes Sports OS auditable, accountable, and self-correcting.

**Implementation status**: BLOCKED — schema change required.
The Signal Ledger table and event types do not yet exist in the database.
Implementation requires a separate approved change proposal.

---

## What the Signal Ledger Tracks

The ledger records discrete events in the lifecycle of an intelligence output.
Each event is immutable once written. The ledger is append-only.

---

## Ledger Event Types

### Phase 1 — Intake

| Event | Description |
|---|---|
| `question_asked` | An operator or user submits a question to the Brain |
| `pick_initiated` | The pick generation pipeline begins for a game/market |
| `source_searched` | A source lookup was performed for a specific entity |
| `source_retrieved` | A source returned data (includes tier, freshness, content hash) |
| `entity_resolved` | A named entity was matched to a canonical entity graph ID |

### Phase 2 — Intelligence Processing

| Event | Description |
|---|---|
| `evidence_retrieved` | An EvidenceItem was retrieved from the vault for consideration |
| `evidence_created` | A new EvidenceItem was written to the Evidence Vault |
| `odds_captured` | Current odds or line data was captured for a market |
| `line_movement_detected` | A material line movement was observed |
| `market_gravity_scored` | The Market Gravity component produced a pressure score |
| `model_score_generated` | The prediction engine produced a confidence score |
| `confidence_assigned` | A confidence value (0–100) was assigned to the output |
| `risk_assigned` | A risk classification was assigned |
| `weakening_signal_noted` | A contradicting or weakening evidence item was flagged |
| `contradiction_detected` | Two evidence items were found in conflict |

### Phase 3 — Review and Publication Gate

| Event | Description |
|---|---|
| `explanation_generated` | The narrative rationale was generated for the output |
| `public_gate_checked` | The output was evaluated against public-safety criteria |
| `public_gate_passed` | Output cleared all public-safety checks |
| `public_gate_failed` | Output was withheld — gate failure reason recorded |
| `human_review_queued` | Output was sent to operator review queue |
| `human_review_completed` | An operator reviewed and approved or rejected the output |
| `human_override_applied` | An operator manually overrode a model score or gate decision |

### Phase 4 — Publication

| Event | Description |
|---|---|
| `answer_published` | A Brain answer was published to an authorized surface |
| `answer_withheld` | A Brain answer was withheld — reason recorded |
| `pick_published` | A pick was published to the appropriate tier surface |
| `pick_withheld` | A pick was withheld — reason recorded |
| `public_claim_created` | A public-facing claim was approved and published |
| `public_claim_retracted` | A published claim was retracted — reason recorded |

### Phase 5 — Settlement and Calibration

| Event | Description |
|---|---|
| `game_completed` | The referenced game ended |
| `result_recorded` | The actual game result was recorded |
| `pick_settled` | The pick outcome was determined (WIN / LOSS / PUSH / VOID) |
| `settlement_reviewed` | An operator confirmed the settlement |
| `calibration_updated` | The model's confidence calibration was updated with the delta |
| `model_version_recorded` | The model version that produced this output is logged |

---

## LedgerEntry Schema (PROPOSAL)

```typescript
// STATUS: PROPOSAL — not implemented.
// Implementation requires schema approval via
// docs/adr/pre-implementation-change-proposal-template.md
// Do not create this type in any application code without approval.

type LedgerEventType =
  | "question_asked" | "pick_initiated"
  | "source_searched" | "source_retrieved" | "entity_resolved"
  | "evidence_retrieved" | "evidence_created"
  | "odds_captured" | "line_movement_detected"
  | "market_gravity_scored" | "model_score_generated"
  | "confidence_assigned" | "risk_assigned"
  | "weakening_signal_noted" | "contradiction_detected"
  | "explanation_generated"
  | "public_gate_checked" | "public_gate_passed" | "public_gate_failed"
  | "human_review_queued" | "human_review_completed" | "human_override_applied"
  | "answer_published" | "answer_withheld"
  | "pick_published" | "pick_withheld"
  | "public_claim_created" | "public_claim_retracted"
  | "game_completed" | "result_recorded"
  | "pick_settled" | "settlement_reviewed"
  | "calibration_updated" | "model_version_recorded";

type PickResult = "WIN" | "LOSS" | "PUSH" | "VOID";

type LedgerEntry = {
  id: string;                    // System-assigned UUID
  eventType: LedgerEventType;
  outputId: string;              // Pick ID, answer ID, or claim ID
  outputType: "pick" | "answer" | "public_claim";
  entityIds: string[];           // Canonical entity IDs involved
  evidenceIds: string[];         // EvidenceItem IDs referenced (if any)
  modelVersion?: string;         // Prediction engine version
  operatorId?: string;           // If human action
  eventAt: Date;                 // When this event occurred
  metadata: Record<string, unknown>; // Event-specific payload
  immutable: true;               // Ledger entries are never modified
};

type PickSettlement = {
  pickId: string;
  gameId: string;
  result: PickResult;
  settledAt: Date;
  settledBy: "auto" | "operator";
  confidencePredicted: number;   // 0–100, from pick generation
  confidenceCalibrationDelta: number; // Actual outcome vs. predicted
  modelVersion: string;
};
```

---

## Append-Only Rule

The Signal Ledger is append-only. No entry may be modified or deleted after
creation. Corrections are made by creating new entries with a reference to
the entry being corrected. This preserves the full audit trail even when
errors occur.

---

## Calibration Feedback Loop

The ledger is the mechanism by which Sports OS becomes self-correcting:

1. Every pick has a `model_score_generated` event with `confidencePredicted`
2. After settlement, `calibration_updated` records the delta
3. The delta is used to adjust future confidence scores for the same model version
4. A model version must accumulate 30+ settlements before its win-rate is
   reported publicly (per `docs/adr/source-freshness-and-deploy-readiness-guide.md`)

This prevents premature win-rate claims and ensures published statistics
are statistically meaningful.

---

## Public Accountability

The Signal Ledger is the foundation for:

- The Calibration Transparency page (`/intelligence/calibration` — future, blocked until
  30+ settlements)
- The Pick Provenance Timeline (signature component — future)
- The Loss Room (post-settlement autopsy — cockpit surface currently)
- Human audit of any pick at any time

---

## Implementation Prerequisites

Before the Signal Ledger schema can be created:

1. Evidence Vault schema must be approved and implemented (LedgerEntry references EvidenceItem)
2. Entity Graph schema must be approved and implemented
3. Pick schema must be stable and versioned
4. A Prisma migration proposal must be submitted
5. The append-only constraint must be enforced at the database level (no UPDATE / DELETE)
6. Settlement workflow must be designed before `pick_settled` events can be emitted

---

## Cross-Reference

- Evidence Vault: `docs/brain/evidence-vault.md` — vault items referenced in ledger
- Entity Graph: `docs/brain/entity-graph.md` — entities referenced in ledger
- Market Gravity: `docs/brain/market-gravity.md` — market_gravity_scored events
- Claim Governance: `docs/brain/claim-governance.md` — public_claim events
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — human review events
- ADR Source Freshness: `docs/adr/source-freshness-and-deploy-readiness-guide.md`
