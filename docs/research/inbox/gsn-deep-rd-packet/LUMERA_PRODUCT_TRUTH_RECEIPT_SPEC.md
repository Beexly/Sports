# Lumera Product Truth Receipt — Product Spec

## Purpose
The Product Truth Receipt is the public proof layer that separates Lumera from fake-commerce noise. It is not a legal wall of text. It is a buyer-confidence layer that explains what is known, what is claimed, what is uncertain, and what the owner approved.

## Customer-facing sections
- Product facts: material, dimensions, quantity, variants, condition.
- Image status: original, supplier-provided, owner-shot, edited, mockup.
- Claim support: each major claim has evidence or is removed.
- Shipping clarity: processing time, carrier assumptions, limits.
- Returns clarity: window, condition requirements, exceptions.
- Known limitations: anything that might affect fit, color, compatibility, or expectations.
- Last reviewed: timestamp and owner approval.

## Schema
```ts
type ProductTruthReceipt = {
  id: string;
  productId: string;
  facts: ProductFact[];
  claims: ProductClaim[];
  imageProvenance: ImageProvenance[];
  supplierNotes?: string;
  shippingPromiseId?: string;
  returnPolicySnapshotId?: string;
  knownLimitations: string[];
  ownerApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  publishableState: 'draft' | 'blocked' | 'approved' | 'published';
};
```

## UI behavior
- Compact badge on product card: “Truth checked.”
- PDP drawer: receipt details.
- If receipt is incomplete, product cannot publish.
- If a claim is unsupported, the drawer shows “claim removed or awaiting support,” not vague language.

## Acceptance criteria
- Every live product has a receipt.
- Every live claim is supported or owner-approved with evidence.
- Every image has provenance.
- Shipping and returns are visible before checkout.
