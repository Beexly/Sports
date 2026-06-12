# Jarvis Action Queue

Code: `apps/web/lib/jarvis/action-queue.ts`. The queue models every action
Jarvis could take, with a hard approval boundary. No executor is wired —
approved actions are carried out by humans today.

## Lifecycle

```
PROPOSED ──→ NEEDS_APPROVAL ──→ APPROVED ──→ RUNNING ──→ COMPLETED ─┐
   │                │                                      │  FAILED ─┼─→ SCRIBED
   └─(read-only ────┴─────────→ REJECTED ─────────────────────────────┘
      checks only)→ RUNNING
```

`transitionActionState` enforces the map; invalid jumps return an error.
`PROPOSED → RUNNING` is rejected unless `canExecuteWithoutApproval` is true.

## Approval flow

- `canExecuteWithoutApproval(item)` is true ONLY for `READ_ONLY_CHECK` items
  with no approval flag. Every other type — including drafts, proposals, and
  reviews — returns false from the gate.
- `createActionItem` force-sets `approvalRequired=true` for any non-read-only
  type, and `validateActionItem` rejects items that violate the invariant.
- Every action requires a non-empty `rollbackPlan` before it is valid.
- COMPLETED/FAILED/REJECTED actions terminate in SCRIBED: the scribe entry is
  part of the lifecycle, not optional cleanup.

## Action types

READ_ONLY_CHECK, DESIGN_PROPOSAL, CODE_CHANGE_PROPOSAL, DOC_UPDATE_PROPOSAL,
TEST_RUN, DEPLOYMENT_PROPOSAL, EMAIL_DRAFT, CALENDAR_DRAFT, GITHUB_PR_REVIEW,
AIRWAVE_REVIEW, GSE_DATA_CHECK, GSN_STUDIO_BRIEF.
