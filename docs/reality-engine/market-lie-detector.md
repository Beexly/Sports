# Market Lie Detector — Module Doc

**Source:** `packages/prediction-engine/src/market-lie-detector.ts`
**Test:** `packages/prediction-engine/src/__tests__/market-lie-detector.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`market-lie-detector.ts` provides two pure functions for adversarial honesty:

1. **`classifyLineMove`** — labels the likely cause of an observed line move as a
   hypothesis from the movement's shape alone (net move, path, reversals, dispersion,
   public-majority direction, time to game). Every output is explicitly hedged;
   `news-reaction-candidate` is always flagged as unconfirmed because the platform
   has no news ingestion feed.

2. **`antiModel`** — the adversary pass that tries to **falsify** the platform's own
   shadow pick. The anti-model argues against acting; if every falsification attempt
   fails (`SURVIVES`), that is a necessary — but never sufficient — condition for
   considering a pick high-conviction. A pick surviving the anti-model earns monitoring,
   not a free pass.

## Why It Matters to the Win-Rate Pillar

Disciplined prediction requires actively trying to disprove your own thesis before
acting on it. The anti-model formalizes this: it applies hard falsifiers (edge PASS,
independent estimator CONTRADICTS, uncalibrated + strong market gravity) and soft
falsifiers (thin CLV history, high dispersion) in a structured pass, producing a
verdict (`FALSIFIED`, `WEAKENED`, `SURVIVES`) and a ranked list of counter-arguments.
This surfaces the strongest objection to any shadow pick in one auditable place.

## Inputs and Outputs

### `classifyLineMove`

```typescript
interface LineMoveFacts {
  netMove: number;               // signed net change in P(home) first→last
  pathLength: number;            // sum of absolute step deltas
  reversals: number;             // sign changes in consecutive non-zero deltas
  dispersionDelta: number;       // change in cross-book dispersion (+ = grew)
  movedWithMajority?: boolean | null; // did the move follow public majority?
  hoursToGame?: number | null;   // hours to kickoff when move was observed
}

interface LineMoveCause {
  cause: LineMoveCauseLabel; // sharp-reverse | steam | news-reaction-candidate |
                             //   vig-rebalance | chop | indeterminate
  confidence: number;        // observational strength 0–1, NOT a win probability
  reasoning: string;         // always starts "consistent with…" or "pattern suggests…"
  isHypothesis: true;        // structural honesty tag — always true
}
```

Named thresholds:

| Constant | Value | Meaning |
|---|---|---|
| `LM_MIN_MEANINGFUL_NET_MOVE` | 0.02 | Minimum |netMove| for cause labelling |
| `LM_STEAM_MIN_NET_MOVE` | 0.04 | Minimum |netMove| for steam |
| `LM_NEWS_DISPERSION_SPIKE` | 0.015 | Dispersion spike threshold for news-reaction candidate |
| `LM_VIG_MAX_NET_MOVE` | 0.015 | Maximum |netMove| for vig-rebalance |
| `LM_VIG_MAX_DISPERSION_DELTA` | 0.01 | Maximum |dispersionDelta| for vig-rebalance |
| `LM_CHOP_MIN_REVERSALS` | 3 | Reversal count for chop |

### `antiModel`

```typescript
interface AntiModelInput {
  edgeDecision: EdgeDecision;          // SPEAK | LEAN | PASS
  agreement: AnchorAgreement;          // CONFIRMS | SPLIT | SOLO | CONTRADICTS | NONE
  calibrated: boolean;                 // is a calibrated probability available?
  marketGravityAgainstUs?: number | null; // 0–100, higher = more against us
  clvBeatRate?: number | null;         // historical beat-rate [0, 1]
  clvSampleSize?: number | null;       // graded picks the rate covers
  dispersion?: number | null;          // cross-book dispersion [0, 1]
}

interface AntiModelResult {
  verdict: "FALSIFIED" | "WEAKENED" | "SURVIVES";
  counterArguments: readonly string[];  // all falsifiers that held
  strongestCounter: string | null;      // most damaging counter-argument
  weight: 0;                            // always 0
  survivingIsNotSufficient: true;       // structural honesty tag
}
```

Anti-model thresholds:

| Constant | Value |
|---|---|
| `ANTI_STRONG_GRAVITY_THRESHOLD` | 60 (0–100 gravity score) |
| `ANTI_WEAK_CLV_BEAT_RATE` | 0.5 |
| `ANTI_MIN_CLV_SAMPLE` | 20 |
| `ANTI_HIGH_DISPERSION_THRESHOLD` | 0.05 |

## Honesty and Inertness Boundary

- **Weight 0 on both functions.** Neither is imported by `scoring.ts`.
- **`classifyLineMove` is always a hypothesis.** The `isHypothesis: true` flag is
  structural — embedded in the type, not just the docs. Every `reasoning` string
  opens with "consistent with…" or "pattern suggests…".
- **`news-reaction-candidate` is explicitly flagged as unconfirmed.** The platform
  has no news-timestamp ingestion feed (K3 dependency). Publishing this label as a
  confirmed cause would be false.
- **`antiModel` surviving is necessary but NOT sufficient.** The `survivingIsNotSufficient: true`
  field is literal `true` in every result. Calibrated probability, a SPEAK edge, and a
  CLV track record are all still required before acting.
- **The anti-model cannot tell us** whether a pick will win; it can only tell us
  whether our falsification attempts failed.

## Forbidden Public Claims

- Never print a `LineMoveCauseLabel` to subscribers as a confirmed cause. "Sharp
  action detected" from a `sharp-reverse` tag would be a false claim without verified
  sharp-side ticket data.
- Never publish an `AntiModelVerdict` as a subscriber-facing signal. `SURVIVES` is
  not high-conviction; it is a cleared floor.
- `confidence` in `LineMoveCause` is an observational strength score, not a win
  probability. Never present it as a probability of the pick winning.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/market-lie-detector.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

Both functions are deliberative decision-support aids. Before either could contribute
to a published pick:

1. K3 news-timestamp feed must exist before `news-reaction-candidate` labels can be
   confirmed (otherwise that label remains permanently unconfirmed).
2. K3 CLV validation pipeline + ≥ 20 graded picks per segment.
3. `CalibrationProposal` showing improved held-out ECE.
4. `MODEL_VERSION` bump + owner approval.

## Related

- [`reports/reality-engine/workstream-k-activation-audit.md`](../../reports/reality-engine/workstream-k-activation-audit.md)
- [`docs/brain/market-gravity.md`](../brain/market-gravity.md)
- [`docs/brain/signal-ledger.md`](../brain/signal-ledger.md)
- [`docs/brain/claim-governance.md`](../brain/claim-governance.md)
- [market-gravity-temporal.md](market-gravity-temporal.md) — produces the `netMove`, `pathLength`, `reversals` inputs to `classifyLineMove`
