# Pick Autopsy — Module Doc

**Source:** `packages/prediction-engine/src/pick-autopsy.ts`
**Test:** `packages/prediction-engine/src/__tests__/pick-autopsy.test.ts`
**Status:** implemented-inert / weight 0

## Purpose

`pick-autopsy.ts` is the structured settlement-time classifier for WHY a settled
pick turned out the way it did. It maps a settled pick's stored facts — result,
CLV verdict, line movement, data freshness — onto the 16-class taxonomy defined in
`reports/reality-engine/pick-autopsy-taxonomy-v1.md` and returns one of the 10
classes that are computable today from data already on the Pick row.

## Why It Matters to the Win-Rate Pillar

The central principle is that **result is not the verdict**. A pick that beat the
close and lost to a buzzer-beater was a good process pick — the edge was real;
variance hit. A pick that lost the close, contradicted the model's own number, and
won anyway was a lucky result — do not reward that process. Classifying on result
alone is how a tout fools itself. CLV + line movement + freshness separate process
from luck and tell the learning loop what to reinforce versus down-weight.

## Inputs and Outputs

```typescript
// Classifier input
interface AutopsyInput {
  result: PickResult;                  // WIN | LOSS | PUSH | VOID | PENDING
  clvVerdict?: ClvVerdict | null;      // BEAT_CLOSE | MATCHED_CLOSE | LOST_TO_CLOSE
  clvValue?: number | null;            // signed CLV (detail only)
  lineMovement?: AutopsyLineMovement;  // closeReachedOurNumber, lockedWorseThanOpener
  confidence?: number | null;          // published 0–100 (context only, not verdict)
  freshness?: AutopsyFreshness;        // stale flag, dataQualityScore
}

// Classifier output
interface AutopsyResult {
  cls: AutopsyClass;               // always one of COMPUTABLE_NOW_CLASSES
  computability: "computable-now"; // always computable-now in this classifier
  learningUpdate: string;          // what the model should do with this class
  reason: string;                  // plain-language, auditable
}
```

### The 10 computable-now classes (returned by `classifyAutopsy`)

| Class | Meaning | Learning update |
|---|---|---|
| `good-win` | Won AND beat the close | Reinforce the edge type |
| `bad-win` | Won but lost to the close — lucky | Do not reward; flag result-flattered |
| `good-loss` | Lost but beat the close — right process | Preserve the edge; do not punish |
| `bad-loss` | Lost AND lost to the close | Down-weight the inputs |
| `CLV-win/result-loss` | Beat the close, lost the game | Reinforce process |
| `CLV-loss/result-win` | Lost the close, won the game | Treat as luck; do not reinforce |
| `market-already-corrected` | Close reached our number — read was right but late | Act earlier; do not distrust the signal |
| `bad-price` | Right side, wrong number (locked worse than opener) | Execution lesson, not model lesson |
| `stale-data` | Acted on out-of-date data at bet time | Down-weight; pipeline failure, not model failure |
| `volatility-ignored` | Lost with a matched close — fell inside expected variance | Recalibrate uncertainty, not the central estimate |
| `insufficient-data` | Inputs cannot support an honest classification | Exclude from learning |

### The 6 unreachable classes (needs-more-signal)

`bad-expression`, `wrong-causal-assumption`, `injury-exit-variance`,
`no-bet-gate-saved-us`, `no-bet-gate-cost-us` — these require a correlated-market
outcome feed, an edge-type causal tag, an in-game event feed, or the K3 No-Bet
Ledger, respectively. The classifier can **never** return them by design; missing
evidence collapses to `insufficient-data` rather than forcing a label.

## Honesty and Inertness Boundary

- **Weight 0.** Not imported by `scoring.ts` or any live path. Settlement-time only.
- **The six needs-more-signal classes are structurally unreachable.** Any attempt
  to generate them would indicate a coding error; the function never guesses.
- **The module cannot tell us** whether suppressed no-bets were correct until the
  K3 No-Bet Ledger tracks rejected markets to settlement.
- **`insufficient-data` is always the honest path** when inputs are ambiguous,
  missing, or unsettled (PUSH / VOID / PENDING).

## Forbidden Public Claims

- Do not publish per-autopsy-class rates as performance evidence before the K3
  No-Bet Ledger exists and the settlement sample reaches 100+ decisive picks.
- Do not use autopsy class labels in subscriber-facing copy. They are internal
  learning infrastructure.
- Never imply that `good-loss` outcomes are failures — they represent correct
  process that lost to variance.

## Validation

Unit test: `packages/prediction-engine/src/__tests__/pick-autopsy.test.ts`

Inertness guard: `packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`

## Activation Path

The autopsy classifier is settlement-time measurement infrastructure. Learning
updates it implies (reinforce / down-weight edge types) cannot feed back into
`scoring.ts` until:

1. The K3 No-Bet Ledger exists and settled markets are tracked.
2. A per-class sample of ≥ 100 settled picks is available.
3. A `CalibrationProposal` demonstrates the learning update improves held-out ECE.
4. `MODEL_VERSION` bump + owner approval.

## Related

- [`reports/reality-engine/pick-autopsy-taxonomy-v1.md`](../../reports/reality-engine/pick-autopsy-taxonomy-v1.md) — the taxonomy this module implements
- [`reports/reality-engine/clv-quality-measurement-plan.md`](../../reports/reality-engine/clv-quality-measurement-plan.md)
- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md)
- [`docs/brain/claim-governance.md`](../brain/claim-governance.md)
