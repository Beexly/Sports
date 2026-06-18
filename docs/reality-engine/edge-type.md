# Edge Type — Module Doc

**Source:** `packages/prediction-engine/src/edge-type.ts`
**Test:** `packages/prediction-engine/src/__tests__/edge-type.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`edge-type.ts` is the vocabulary layer for WHY a candidate pick might have an edge.
It defines 13 named edge types — 12 specific mispricing patterns plus the honest
default `no-clear-edge` — and provides a tagger (`tagEdgeType`) that labels a
candidate pick with the kind of edge it is acting on, using only the signals
already available in stored odds data. The labels are hypotheses recorded for
future per-type reliability analysis, not facts asserted at tagging time.

## Why It Matters to the Win-Rate Pillar

Per-type win rates are how the platform eventually learns which signals are real
edges and which are noise. Without a consistent vocabulary, every pick is opaque.
With named edge types and per-type CLV and result tracking, the learning loop in
`reports/reality-engine/minimum-viable-win-rate-loop.md` (step 13) can measure
"do book-disagreement-lag picks actually beat the close at a higher rate than
no-clear-edge picks?" — and down-weight or retire types that do not.

## Inputs and Outputs

```typescript
// The tagger's input
interface EdgeTypeSignals {
  edgeDecision?: EdgeDecision;       // SPEAK / LEAN / PASS from edge-engine.ts
  edgeAgreement?: AnchorAgreement;   // CONFIRMS / NONE / CONTRADICTS
  homeProbDispersion?: number | null; // cross-book P(home) MAD
  bookCount?: number | null;          // how many books (must be ≥ 3 for disagreement)
  lineMovementMagnitude?: number | null; // absolute opener→current move
  lineMovementReversal?: number | null;  // signed retrace after the move
}

// The tagger's output
interface EdgeTypeTag {
  type: EdgeType | null;       // null when no market read exists at all
  detectableNow: boolean;      // true only for HAVE-status types
  reason: string;              // plain-language, auditable, never a certainty claim
  requiresData: readonly RequiresDataCandidate[]; // data-blocked types named, not fired
}
```

Key thresholds (documented in source, auditable and tunable):

| Constant | Value | Meaning |
|---|---|---|
| `BOOK_DISAGREEMENT_DISPERSION` | 0.03 | Minimum P(home) MAD across books for a disagreement read |
| `MIN_BOOKS_FOR_DISAGREEMENT` | 3 | One book cannot disagree with itself |
| `OVERCORRECTION_MIN_MOVE` | 0.5 | Minimum opener→current move magnitude |
| `OVERCORRECTION_MIN_REVERSAL` | 0.25 | Minimum retrace magnitude (opposite direction) |

### The 13 edge types

Three types are `detectableNow: true` (HAVE status) and can be returned as positives:
- `book-disagreement-lag` — a softer book lags the consensus (dispersion signal)
- `market-overcorrection` — a line moved far then retraced (line-movement history)
- `no-clear-edge` — the honest default when no edge clears its threshold

The remaining 10 types are `detectableNow: false` (PARTIAL or MISSING status) and
are NEVER returned as positives. They appear only in the `requiresData` array of every
tag result, recording the leverage point and the signals required to unlock detection.
Examples: `stale-injury-price` (needs an injury-status feed), `weather-underreaction`
(needs a weather feed), `ol-dl-mismatch` (needs line-unit grades).

## Honesty and Inertness Boundary

- **Weight 0.** This module does not score, gate, tier, or price anything. It is NOT
  imported by `scoring.ts` or any live request path.
- **A tag is a hypothesis, not proof.** A pick tagged `market-overcorrection` is a
  claim to be validated against CLV and final result, never a fact asserted here.
- **Data-blocked types are NEVER false positives.** If a signal is missing, the type
  is listed under `requiresData`, not returned as `type`.
- **Absence collapses to `no-clear-edge` or `null`.** The module never guesses a type
  to look smart.
- **The module cannot tell us** whether any tagged pick has a real edge. That
  determination requires calibrated CLV tracking over a material settled sample.

## Forbidden Public Claims

- Do not publish a pick with the claim "this is a book-disagreement-lag edge" as a
  fact. It is a hypothesis label. The calibration gate must close first.
- Do not print per-type win rates derived from fewer than 100 settled picks per type;
  below that sample the rate is noise.
- Never assert that a data-blocked type applies to a pick. The `requiresData` list is
  for internal tracking only.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/edge-type.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

This module is measurement-only for now. Before edge-type tags could influence a
published pick:

1. `MODEL_VERSION` bump in `scoring.ts`.
2. `CalibrationProposal` in `docs/calibration-proposals/` showing held-out ECE ≤ raw ECE.
3. Per-type CLV beat-rate over ≥ 100 settled picks per type showing the type adds
   signal above `no-clear-edge`.
4. Owner approval.

## Related

- [`reports/reality-engine/edge-type-taxonomy-v1.md`](../../reports/reality-engine/edge-type-taxonomy-v1.md) — the taxonomy this module implements
- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md)
- [`docs/brain/signal-ledger.md`](../brain/signal-ledger.md) — signal provenance and ownership
- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md)
