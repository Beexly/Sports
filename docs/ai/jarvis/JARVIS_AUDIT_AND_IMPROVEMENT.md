# Jarvis Audit Trail & Improvement Loop

Code: `apps/web/lib/jarvis/audit-ledger.ts` + `improvement-loop.ts`.

## Audit ledger — honest status: PARTIAL

What exists today: picks are versioned, the settlement ledger is canonical,
and `AuditEntry` types + markdown formatting are code-backed. What does NOT
exist: a persistent unified store for agent actions, approvals, and tool
calls. `buildAuditLedgerStatus()` reports `isWired: false`.

Event types: SENSE_EVENT, INTERPRET_EVENT, DECISION_PROPOSED, ACTION_APPROVED,
ACTION_REJECTED, ACTION_COMPLETED, MEMORY_WRITTEN, PROMPT_CREATED,
AGENT_HANDOFF, TOOL_USED, ERROR, IMPROVEMENT_PROPOSED.

Manual entries live in `docs/ai/jarvis/vault/08-audit/AUDIT_LEDGER.md`
(append-only; corrections are new entries). Next wiring step: persist
`AuditEntry` rows and write one on every action-queue transition.

## Improvement loop — honest status: NOT active

The loop proposes; it never acts. `ImprovementProposal` types:
CALIBRATION_REVIEW, PROCESS_CHANGE, MODEL_SWAP, FEATURE_GAP, DATA_QUALITY,
WIRING_STEP. Every proposal records rationale, expected gain, risk if done,
risk if not done, and affected components.

### Hard invariants

- `canAutomaticallyAdjustPredictionEngine` is **always false**.
- `canAutoImplement()` returns false for CALIBRATION_REVIEW, MODEL_SWAP, and
  anything whose affected components include the prediction engine.
- Engine changes require owner approval **plus out-of-sample validation**.

### Standing proposal

`getSettledPicksImprovementProposal()` — review settled-pick calibration per
confidence bucket against the canonical ledger, on a regular manual cadence.
