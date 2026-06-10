# Lumera Owner Approval Ledger — Product Spec

## Purpose
The Owner Approval Ledger makes Lumera autonomous without becoming reckless. Automation can draft, enrich, compress, classify, and flag. It cannot publish trust-sensitive changes without owner approval.

## Workflow states
1. imported
2. enriched_by_ai
3. image_processed
4. copy_review_required
5. claim_review_required
6. pricing_review_required
7. supplier_review_required
8. owner_review_required
9. approved
10. published
11. blocked
12. archived

## Ledger schema
```ts
type ApprovalLedgerEntry = {
  id: string;
  productId: string;
  action: string;
  actorType: 'system' | 'ai' | 'owner' | 'admin';
  actorId?: string;
  previousState?: string;
  nextState?: string;
  summary: string;
  riskFlags: string[];
  evidenceIds: string[];
  createdAt: string;
};
```

## Admin UI
- Product queue grouped by blocker.
- Diff view for AI copy changes.
- Image before/after review.
- Claim evidence checklist.
- “Approve publish” button only appears when all gates pass.
- Rejection reasons become training data for future automation.

## Acceptance criteria
- Every product publish has an owner approval entry.
- Every AI-generated field is traceable.
- Every rejection has a reason.
- Ledger is append-only.
