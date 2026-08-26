---
description: Verify every claim in copy, marketing, or meta content before it ships. Use when writing or editing public copy, landing pages, pricing text, performance statements, or anything a customer will read.
allowed-tools: Read, Grep, Glob, Bash(npm run guard:*)
---

# Claims check

Every accuracy, ROI, or performance number in customer-facing copy must trace to
graded-pick data or be removed. There is no third option.

## The banned sentence

Never write "every pick is sealed with a receipt before kickoff." It is false.
The receipt mint is conditional: it only fires when `marketFairProb` ∈ (0,1) and
`entryOdds !== 0`, and receipt failure is non-fatal
(`packages/ingestion-pipeline/src/process-sport.ts`). Trust the symbol, not the
line number — the ledger's anchors have drifted before.

## The check

1. List every factual claim in the draft — every number, every "we do X",
   every implied guarantee.
2. For each: name the file or query that proves it. No source means the claim
   comes out. Not softened. Out.
3. Pricing facts resolve from `apps/web/lib/pricing/pricing-phases.ts` only.
4. Canonical URLs resolve from `apps/web/lib/seo/site-url.ts` (www host, never
   apex).
5. Run the guards and read the real exit codes:
   ```
   npm run guard:commercial-copy && npm run guard:performance-claims
   ```

## The standing constraint

Season 2026 is capture and shadow. Claim nothing. Certification is a 2027 event
on every sport, per C-33's own arithmetic. Any drift toward a 2026 performance
claim violates the plan, and the plan is the product.

The honest position is also the marketable one: this is the only sports product
whose credibility grows when the results are null. Copy should lean into that
rather than around it.
