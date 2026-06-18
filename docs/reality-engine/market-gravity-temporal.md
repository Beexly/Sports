# Market Gravity Temporal — Module Doc

**Source:** `packages/prediction-engine/src/market-gravity-temporal.ts`
**Test:** `packages/prediction-engine/src/__tests__/market-gravity-temporal.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`market-gravity-temporal.ts` is the temporal companion to the existing point-in-time
`marketGravityIndex` in `market-read.ts`. Where the point-in-time index answers "how
strongly is the market pulling toward one side RIGHT NOW?", this module answers "how
did the market MOVE from open to close?" — characterizing the shape of that movement
over an ordered series of odds snapshots.

## Why It Matters to the Win-Rate Pillar

Understanding line-movement shape is a prerequisite for interpreting CLV. A pick that
beat the close because of a choppy, indecisive market is different from one that beat
a fast, directional steam move. The trajectory labels (`steaming`, `chopping`,
`drifting`, `stable`, `mixed`) give the autopsy and edge-type pipelines the context
they need to interpret whether a CLV beat was meaningful. Without temporal context,
CLV is still a verdict — just a less interpretable one.

## Inputs and Outputs

```typescript
// One timestamped odds snapshot in the series
interface GravitySnapshot {
  timestampMs: number;         // epoch milliseconds — never from the system clock
  fairHomeProb: number;        // de-vigged consensus P(home), [0, 1]
  homeProbDispersion: number;  // cross-book MAD of de-vigged P(home), [0, 1]
  bookCount: number;           // books quoted in this snapshot
}

interface MarketGravityTrajectory {
  weight: 0;                        // always 0, never priced into confidence
  snapshotCount: number;            // snapshots supplied
  netMove: number;                  // first→last signed change in fairHomeProb
  pathLength: number;               // sum of absolute step-to-step changes
  efficiency: number | null;        // |netMove| / pathLength; null when pathLength=0
  reversals: number;                // sign changes in consecutive non-zero deltas
  velocityPerHour: number | null;   // netMove per elapsed hour; null if <2 snapshots
  dispersionTrend: DispersionTrend; // "converging" | "diverging" | "flat"
  trajectory: MarketTrajectoryLabel; // the shape label (see below)
  side: MarketSide;                 // "home" | "away" | "none"
  notes: readonly string[];         // honesty caveats — always non-empty
}
```

### Trajectory labels

| Label | Meaning |
|---|---|
| `steaming` | Large (≥ 0.04), directional, efficient (≥ 0.7) move |
| `chopping` | High reversals (≥ 3) or low efficiency (< 0.4) with meaningful path |
| `drifting` | Slow directional lean: |netMove| in [0.01, 0.04) |
| `stable` | Very little movement: pathLength < 0.01 |
| `mixed` | Some movement, no dominant pattern |

Thresholds are named constants in the source (`STEAM_MIN_NET_MOVE`, `STEAM_MIN_EFFICIENCY`,
`CHOP_MIN_REVERSALS`, etc.) and are documented and tunable.

### Self-suppression

With fewer than 2 snapshots, the function returns `trajectory: "stable"`,
`side: "none"`, all movement fields as 0/null, and a note explaining the suppression.
It never returns a misleading read from a single data point.

## Honesty and Inertness Boundary

- **Weight 0.** Not imported by `scoring.ts` or any live path.
- **Observational labels only.** A `steaming` label means the market moved in a
  large, directional, efficient way. It does not mean the sharps were on the correct
  side, that the market was right, or that you should act the same direction.
- **The module cannot tell us** whether the market's movement reflects superior
  information. That determination requires downstream CLV validation against settled
  outcomes, which is the K3 gate.
- **Every result carries `notes`** — honesty caveats about what trajectory labels
  measure and what they cannot tell us. These are structural, not optional.
- **No clock reads.** All timestamps must be passed in; the module never reads
  `Date.now()` internally.

## Forbidden Public Claims

- Do not publish trajectory labels to subscribers as directional signals. A "steaming"
  label on the other side of our pick is a reason to investigate, not a mechanical override.
- Do not present dispersion trends as consensus accuracy signals. Convergence means
  books agreed more by the end — it does not mean the consensus was correct.
- Never quote velocity or net move as evidence of which side to act on.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/market-gravity-temporal.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

This module is measurement-only and its trajectory labels are intended to enrich the
autopsy and edge-type pipelines, not to directly influence confidence. Before any
downstream use:

1. K3 No-Bet Ledger and CLV validation pipeline must be operational.
2. Per-trajectory CLV beat-rate analysis over ≥ 100 settled picks per label.
3. `CalibrationProposal` demonstrating that trajectory data improves held-out ECE.
4. `MODEL_VERSION` bump + owner approval.

## Related

- [`docs/brain/market-gravity.md`](../brain/market-gravity.md) — the point-in-time companion index
- [`docs/brain/signal-ledger.md`](../brain/signal-ledger.md)
- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md)
- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md)
