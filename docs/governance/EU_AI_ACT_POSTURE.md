# EU AI Act — Posture Note

> **DISCLAIMER**: This is an internal engineering note, not legal advice and
> not a compliance determination. GSE/Beexly has not sought, and this
> document does not constitute, a legal opinion on EU AI Act applicability
> or risk-tier classification. Any such determination should come from
> qualified counsel.

## Where we think we likely sit

The consumer-facing sports-prediction product (picks, analysis, content) is,
on the engineering team's own read of the publicly available risk-tier
categories, most plausibly in the **limited-risk or minimal-risk** range —
it is not biometric categorization, not a safety component of a regulated
product, not credit scoring, not law enforcement, and does not fit the
other high-risk annex categories as we currently understand them. **This is
not asserted as a legal conclusion** — it is the engineering team's working
assumption for prioritization purposes, pending actual legal review.

## Why we built this anyway

Two reasons independent of our own risk-tier guess:

1. **B2B evidence chains.** If a business customer integrates our AI
   surfaces into their own regulated workflow, our tool calls may become
   *inputs* to evidence they need to produce for their own compliance
   obligations. A signed, publicly verifiable receipt (`@sports/governed`)
   means we can hand a counterparty something concrete rather than "trust
   us" — regardless of which tier applies to us directly.
2. **Building the evidence trail now is cheap; building it retroactively is
   not.** Signed receipts, an append-only event ledger, and shadow-mode
   metrics cost little to run today and become the raw material for
   whatever real compliance work (ours or a counterparty's) comes later.

## What we are explicitly NOT claiming

- **No "AI Act certified" claim anywhere** — in code, docs, marketing copy,
  or sales material. This phrase should never appear describing this
  product; if it does, that is a bug to be corrected immediately.
- No claim of conformity assessment, CE marking applicability, or
  fundamental-rights-impact-assessment completion.
- No claim that receipts alone satisfy any specific EU AI Act article —
  they are a traceability primitive, not a compliance program.

## Current status

Evidence-building phase: signed receipts + keyring + ledger are live
(SHADOW-safe by default; see `packages/governed/README.md`). No formal
legal risk-tier assessment has been commissioned as of this writing.
