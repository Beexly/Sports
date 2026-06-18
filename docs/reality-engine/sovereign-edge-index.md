# Sovereign Edge Index — Module Doc

**Source:** `packages/prediction-engine/src/sovereign-edge-index.ts`
**Test:** `packages/prediction-engine/src/__tests__/sovereign-edge-index.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`sovereign-edge-index.ts` is the shadow composition layer that folds the platform's
existing signals — independent edge assessment, calibration trust, CLV beat-rate,
price-vs-break-even, and stability — into a single `SovereignLabel` plus a
component breakdown and plain-language reasons. It is the "Sovereign Edge Index"
section described in `reports/reality-engine/workstream-k-activation-audit.md`.

## Why It Matters to the Win-Rate Pillar

The index makes explicit what "a real, certifiable edge" requires: not just a model
saying the market is wrong, but calibrated probability evidence that it is wrong by
enough to clear the price's break-even rate, backed by a CLV track record that
confirms we have historically beaten the close on similar picks. By composing these
signals in one place with a structured label and per-component breakdown, the index
makes the decision-support reasoning auditable rather than implicit.

## Inputs and Outputs

```typescript
interface SovereignEdgeInput {
  edge: {
    decision: EdgeDecision;      // SPEAK | LEAN | PASS
    shrunkEdge: number;          // evidence/uncertainty/agreement-shrunk edge
    expectedClv: number;         // expected probability points vs close
    agreement: AnchorAgreement;  // CONFIRMS | NONE | CONTRADICTS
  };
  calibration: {
    calibrated: boolean;         // true ONLY when a held-out calibrator is active
    ece?: number | null;         // expected calibration error, lower is better
  };
  calibratedProbability?: number | null; // valid only when calibration.calibrated is true
  clvBeatRate?: number | null;   // historical beat-rate [0, 1] on this segment
  clvSampleSize?: number | null; // graded picks the beat-rate covers
  americanPrice?: number | null; // e.g. -200 (for price-specific break-even)
  uncertainty?: number | null;   // model/market uncertainty [0, 1]
  volatility?: number | null;    // market volatility [0, 1]
}

interface SovereignEdgeResult {
  label: SovereignLabel; // ATTACK | WAIT | WATCH | PASS | NO_BET | CHANGE_MARKET | NEEDS_REVIEW
  weight: 0;             // always 0 — never priced into live confidence
  breakEven: number;     // break-even rate implied by the price
  components: readonly SovereignComponent[]; // per-signal breakdown, scored 0–1
  reasons: readonly string[]; // plain-language reasons behind the label
}
```

Key constant: `SOVEREIGN_MIN_CLV_SAMPLE = 20` — minimum graded picks before a CLV
beat-rate can support (not certify) an ATTACK label.

### Label meanings

| Label | Meaning |
|---|---|
| `ATTACK` | Calibrated edge clears every bar; all conditions met. Requires active calibration. |
| `WAIT` | Real edge, but stability is low or CLV track record is thin — hold for a better read |
| `WATCH` | Promising but not certifiable (e.g. calibration inactive); monitor |
| `PASS` | No demonstrable edge; the honest default silence |
| `NO_BET` | A hard disqualifier fired (price below break-even, edge PASS) |
| `CHANGE_MARKET` | An independent estimator CONTRADICTS our read — our model is the outlier |
| `NEEDS_REVIEW` | Inputs are contradictory or invalid; human review required |

## Honesty and Inertness Boundary

**The non-negotiable honesty guard:**
When `calibration.calibrated` is false, or when `calibratedProbability` is outside
`[0, 1]`, the index **can NEVER return ATTACK**. It caps at WATCH (or PASS/NO_BET
if the edge decision is PASS). This mirrors the calibration rules in
`conviction-tier.ts`: missing or uncalibrated probability → no certainty claim.

This guard reflects the current reality: the settled sample is below 100 picks,
so no calibrator is active. Every result today will be WATCH, PASS, NO_BET,
CHANGE_MARKET, or NEEDS_REVIEW — never ATTACK.

- **Weight is always 0.** The `SovereignEdgeResult.weight` field is typed as literal
  `0` and is always 0. Any future wire-in must be loud and explicit.
- **Components are a breakdown, not a score.** Each component score is normalized
  0–1 for auditability; they are not summed into a final number.
- **The module cannot tell us** whether a pick will win. It composes existing
  signals; it does not add new predictive information.

## Forbidden Public Claims

- Never publish a `SovereignLabel` as a subscriber-facing recommendation without
  first wiring it through the calibration gate (MODEL_VERSION bump + CalibrationProposal).
- Never present the `ATTACK` label as a high-conviction endorsement of an outcome.
  It is a structured summary of signal alignment, not a prediction of the game result.
- Never quote the `breakEven` field as anything other than the mathematical
  break-even implied by the American price.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/sovereign-edge-index.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

Before the Sovereign Edge Index could contribute to a published pick:

1. The calibration pipeline must be active (ECE ≤ 0.05 on a held-out set of ≥ 100).
2. A `CalibrationProposal` demonstrates held-out ECE ≤ raw ECE.
3. `MODEL_VERSION` bump in `scoring.ts` explicitly wires the index with a defined weight.
4. Owner approval.

Until then: measurement and decision-support only, never priced.

## Related

- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md) — origin and design of this index
- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md)
- [`docs/brain/market-gravity.md`](../brain/market-gravity.md)
- [`docs/brain/claim-governance.md`](../brain/claim-governance.md)
