# Sports OS — Calibration Feedback Loop

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §4 · Cross-cutting
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/picks-intelligence.md` — settlement rules and calibration triggers
- `docs/brain/signal-ledger.md` — calibration events are ledger events
- `docs/brain/evidence-vault.md` — source quality signals updated on settlement
- `docs/brain/source-acquisition-mesh.md` — reliability scores updated on settlement
- `docs/brain/entity-graph.md` — entities involved in settled games

---

## Purpose

The calibration feedback loop is how the Sports OS intelligence network
learns. Every pick that is settled — win, loss, or push — generates a
calibration signal that flows back into the system.

Without this loop, confidence scores are guesses. With it, they are estimates
that improve over time and can be held accountable.

The calibration loop does four things:
1. Records the outcome against the prediction
2. Measures whether the confidence score was appropriate
3. Updates the model version's accuracy track record
4. Sends quality signals back to the evidence and source layer

This document governs the rules, data structures, and constraints of the
calibration loop. It does not implement calibration — that is the prediction
engine's responsibility. It defines the doctrine that all implementations
must follow.

---

## When Calibration Triggers

A calibration event triggers when:

1. A pick's game has a confirmed final result from a Tier 1 or Tier 2 source
2. The pick has `status: "ACTIVE"` at game completion
3. The settlement result is one of: WIN, LOSS, PUSH, or VOID

Calibration does NOT trigger:
- On a WITHHELD pick (it was never a prediction)
- Before game completion
- From a Tier 5 or Tier 6 result claim
- Based on inferred or estimated outcomes

**Required settlement source**: Game outcomes must be confirmed by a Tier 1
or licensed Tier 2 source before calibration triggers. A Tier 3 report of
a result is insufficient. If no Tier 1/2 confirmation is available within
6 hours of game completion, the pick is flagged SETTLEMENT_PENDING and
calibration is deferred until confirmation arrives.

---

## Calibration Data Structures

```typescript
// STATUS: PROPOSAL — for documentation purposes only.
// Implementation requires approved schema change.

type SettlementResult = "WIN" | "LOSS" | "PUSH" | "VOID";
type CalibrationOutcome = "CORRECT" | "INCORRECT" | "PUSH" | "VOID";

type PickSettlement = {
  pickId: string;
  modelVersion: string;
  settledAt: Date;
  settlementSource: {
    sourceId: string;
    sourceTier: 1 | 2;
    retrievedAt: Date;
  };
  settlementResult: SettlementResult;
  calibrationOutcome: CalibrationOutcome;

  // What the pick predicted vs. what happened
  predictedSide: string;
  predictedLine: string;
  actualResult: string;           // human-readable: "Chiefs won 24-17"
  coverResult: string;            // "Chiefs covered -3.5"

  // Calibration signals
  confidenceAtPublication: number; // the score at time of pick publication
  confidenceAccuracy: ConfidenceAccuracy;
  evidenceChainQuality: EvidenceChainQualitySignal;
  sourceQualitySignals: SourceQualitySignal[];
};

type ConfidenceAccuracy = {
  // Was the confidence score appropriate for the outcome?
  expectedWinRate: number;       // win rate implied by confidence band at publication
  actualOutcome: CalibrationOutcome;
  calibrationError: number;      // difference between implied and actual; negative = overconfident
  calibrationDirection: "OVERCONFIDENT" | "UNDERCONFIDENT" | "CALIBRATED";
};

type EvidenceChainQualitySignal = {
  // Did the evidence chain predict the correct outcome?
  primaryEvidenceAligned: boolean;    // did Tier 1/2 evidence point to winning side?
  marketAligned: boolean;             // did market gravity point to winning side?
  contradictionsCalled: boolean;      // were the stated weaknesses actually what happened?
  overallSignal: "STRONG_POSITIVE" | "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "STRONG_NEGATIVE";
};

type SourceQualitySignal = {
  sourceId: string;
  sourceTier: 1 | 2 | 3 | 4 | 5;
  aligned: boolean;     // did this source's evidence align with the correct outcome?
  reliabilityDelta: number; // reliability score adjustment to apply (e.g., +1, -2)
};
```

---

## Calibration Rules

### Model Version Accuracy Tracking

Every calibration event updates the model version's running accuracy record.

**Tracked metrics per model version**:

| Metric | Definition |
|---|---|
| Total settled | COUNT of WIN + LOSS (excludes PUSH, VOID) |
| Win count | COUNT of WIN outcomes |
| Loss count | COUNT of LOSS outcomes |
| Win rate | Win count / Total settled |
| Calibration error (mean) | Mean of calibrationError across all settled picks |
| Calibration error (STDEV) | Standard deviation of calibrationError |
| Coverage by sport | Win rate broken down per sport |
| Coverage by pick type | Win rate broken down by SPREAD / TOTAL / PROP / ML |

**Version accuracy rules**:

- Win rate is never displayed until 30 picks are settled for the version
- Win rate is not projected forward or annualized
- A model version that reaches 100 settled picks with win rate below 45%
  triggers an operator alert — this is a model health warning, not
  automatic retirement
- A model version is never silently replaced mid-season — version changes
  require a version increment and a note in the public-facing record

### Confidence Calibration Adjustment

When a model version accumulates calibration data, the system checks whether
its confidence scores are calibrated:

**Calibration check rule** (applied per model version, per 50-pick window):

| Confidence band | Expected win rate | Acceptable actual range |
|---|---|---|
| 80–100 (Strong) | ~65–75% | 58–80% |
| 65–79 (Moderate) | ~55–65% | 48–72% |
| 50–64 (Lean) | ~50–55% | 43–62% |
| 0–49 | Withheld — not tracked for win rate |

If a confidence band's actual win rate falls outside its acceptable range
for two consecutive 50-pick windows, a calibration alert is raised.
The operator reviews the alert and decides whether to:
1. Accept the current calibration (no change)
2. Adjust the confidence scoring algorithm (requires model version increment)
3. Widen the acceptable range (requires documented justification)

Calibration adjustment is a deliberate operator decision — the system never
autonomously adjusts confidence scores based on short-run variance.

### Evidence Quality Feedback

Settlement outcomes generate quality signals that update evidence and source
scores. These signals are cumulative and lagged — they influence future
evidence weighting, not historical pick scores.

**Evidence quality feedback rules**:
- Source reliability scores update within 24 hours of settlement confirmation
- Reliability score changes are bounded: no single settlement event changes
  a score by more than ±5 points
- Reliability scores are smoothed over a 30-pick rolling window — one bad
  result does not tank a historically reliable source
- A source that has been correct 90%+ of the time on a specific claim type
  (e.g., injury status) gains a claim-type reliability bonus

### PUSH and VOID Handling

PUSH and VOID picks are excluded from win rate calculations.
They are NOT excluded from the ledger — they are settled and recorded.

PUSH and VOID do NOT generate negative calibration signals.
They also do NOT generate positive calibration signals.

A model version that generates an unusual number of VOID picks (more than
15% of total picks) triggers a review — this may indicate a systematic
issue with game selection or scheduling data.

---

## Calibration Timeline

After game completion:

| Time after game | Event |
|---|---|
| 0–15 min | System polls for Tier 1/2 settlement confirmation |
| 15–60 min | Settlement confirmation expected for standard games |
| 60 min – 6 hr | SETTLEMENT_PENDING flag if no confirmation yet |
| 6 hr | Operator alert if still no Tier 1/2 confirmation |
| After confirmation | Calibration event written to Signal Ledger |
| Within 24 hr | Source reliability scores updated |
| On next model report cycle | Win rate metrics updated if threshold met |

---

## Model Versioning and Calibration

When a model version is incremented, calibration history does NOT carry over.
The new version starts fresh — it accumulates its own settlement record.

**Version increment triggers** (from `docs/brain/picks-intelligence.md`):
- Algorithm change that materially affects confidence scoring
- Source weighting change
- New claim type added
- Calibration adjustment approved by operator

**Why history does not carry over**: Blending accuracy data from different
model versions would make the track record misleading. If version 1.2 goes
22-18 and version 2.0 goes 8-5 in its first 13 picks, displaying a combined
30-23 record implies a coherent model that does not exist.

**Historical record preservation**: All historical calibration data is
retained and accessible in the cockpit by model version. The public record
shows the current version's accuracy and links to historical version records.

---

## What Calibration Cannot Do

The calibration loop provides statistical learning. It cannot:

- Guarantee that future picks will be accurate
- Transform a thin-evidence pick into a confident one retroactively
- Prove that the model has predictive power (sample sizes in sports are small)
- Eliminate the role of variance in sports outcomes
- Replace human judgment when the evidence is genuinely ambiguous

**Forbidden calibration claims**:
- "Our model has proven predictive accuracy" — sports outcomes involve
  irreducible variance; calibration tracks observed accuracy, not proof
- "Past win rate predicts future performance" — this must not appear on any
  public surface in any form
- "The model is improving" — this implies a trend from too small a sample;
  only say "calibration data is accumulating"

**Approved language for calibration transparency**:
- "As of [date], this model version has settled [N] picks at [W]W–[L]L ([rate]%)"
- "Win rate is tracked per model version and updated daily"
- "Past performance does not guarantee future results"
- "Confidence scores are calibrated against settled outcomes — not invented"

---

## Calibration Transparency

The existence and operation of the calibration loop is disclosed on the
public `/methodology` surface. Users may see:

- That calibration exists and how it works (high level)
- The current model version's settled record (after 30 picks)
- The version history of model versions (names/dates only, not algorithm details)
- That PUSH and VOID picks are excluded from the record

Users may NOT see:
- Raw calibration data tables
- Source reliability scores
- Evidence quality signals per source
- Internal calibration alerts or thresholds

The calibration loop is a trust signal for users — "the system holds itself
accountable" — not a technical disclosure.
