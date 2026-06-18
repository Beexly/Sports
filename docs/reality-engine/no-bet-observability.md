# No-Bet Observability — Module Doc

**Source:** `packages/prediction-engine/src/no-bet-ledger.ts`
**Test:** `packages/prediction-engine/src/__tests__/no-bet-ledger.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`no-bet-ledger.ts` is the read-only observability layer for pick-publication
suppression decisions. It classifies a batch of candidate picks into "published"
vs "no-bet" and counts the reasons each candidate was suppressed (below the
minimum confidence floor, edge PASS, independent estimator CONTRADICTS). It
surfaces the existing `MIN_PUBLISH_CONFIDENCE` gate as countable, auditable output
so the prediction team can track where suppression decisions are being made —
but not whether those decisions were correct.

## Why It Matters to the Win-Rate Pillar

No-bet discipline is one of the hardest things to prove. A high suppression rate
might mean the model is appropriately selective, or it might mean the confidence
floor is too high. A low suppression rate might mean the platform publishes
everything, or it might mean candidates are already well-filtered. Neither
interpretation is available without tracking suppressed candidates to settlement.

This module is the first step: measure that suppression happened and why. The second
step — the K3 No-Bet Ledger — tracks those rejected markets to settlement so
discipline can eventually be proven or disproven as alpha. That ledger is a separate,
owner-gated K3 deliverable that does not yet exist.

## Inputs and Outputs

```typescript
interface NoBetCandidate {
  confidence: number;                    // 0–100 (the primary gate)
  edgeDecision?: EdgeDecision | null;    // SPEAK | LEAN | PASS
  agreement?: AnchorAgreement | null;    // CONFIRMS | NONE | CONTRADICTS
  calibrated?: boolean | null;           // whether a calibrated probability exists
}

interface NoBetAnalysis {
  weight: 0;             // always 0 — never priced into live confidence
  total: number;         // candidates analysed
  published: number;     // candidates that cleared every gate
  noBet: number;         // candidates suppressed (total − published)
  noBetRate: number;     // noBet / total, [0, 1], or 0 when total is 0
  byReason: readonly NoBetReasonCount[]; // per-gate counts, sorted by count descending
  caveats: readonly string[]; // always non-empty — read before drawing conclusions
}
```

The exported threshold: `MIN_PUBLISH_CONFIDENCE` (re-exported from `constants.ts`).

### Suppression gate precedence

Applied in this order, first match wins:

1. `below-min-confidence` — `confidence < MIN_PUBLISH_CONFIDENCE` (hard floor, always checked first)
2. `edge-contradicts` — `agreement === "CONTRADICTS"`
3. `edge-pass` — `edgeDecision === "PASS"`
4. `published` — no gate fired; the pick cleared every check

This precedence is documented in the source and enforced consistently so the
classification is auditable across runs.

## Honesty and Inertness Boundary

- **Weight 0.** Not imported by `scoring.ts` or any live path.
- **This is NOT the K3 No-Bet Ledger.** The persistent database ledger that tracks
  rejected markets to settlement is a separate deliverable. This module measures
  that a suppression HAPPENED; it cannot determine whether the suppression was correct.
- **The module cannot tell us** whether any suppressed pick would have won. The
  `caveats` field on every `NoBetAnalysis` states this explicitly and is always
  non-empty.
- **`noBetRate` is an operational metric, not a quality metric.** A 60% suppression
  rate is not evidence of good discipline; it is evidence of 60% suppression. Quality
  is only provable once settlement data exists.

## Forbidden Public Claims

- Do not publish the `noBetRate` to subscribers as evidence of selectivity or
  discipline without a corresponding settlement outcome analysis from the K3 Ledger.
- Do not present the `byReason` breakdown as a performance statistic.
- Never claim that a low publication rate implies a higher-quality set of published
  picks without settlement data to support that claim.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/no-bet-ledger.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

The observability analyzer itself is measurement-only and will never be priced into
live confidence (it measures decisions, not outcomes). The K3 No-Bet Ledger — the
next step — requires:

1. Schema approval for a `RejectedCandidate` table with market, pick type, confidence,
   gate reason, and settlement result fields.
2. Owner approval and a migration.
3. A settlement-tracking worker that closes out rejected markets after game time.
4. At least 100 settled rejected markets before any discipline claim can be made.

## Related

- [`reports/reality-engine/no-bet-quality-measurement-plan.md`](../../reports/reality-engine/no-bet-quality-measurement-plan.md) — the K3 No-Bet Ledger design
- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md)
- [`docs/brain/signal-ledger.md`](../brain/signal-ledger.md)
- [`docs/brain/claim-governance.md`](../brain/claim-governance.md)
- [`docs/adr/001-public-performance-policy.md`](../adr/001-public-performance-policy.md)
