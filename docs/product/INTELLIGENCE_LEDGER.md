# Intelligence Ledger — the FDR-disciplined Conscience

*Organism-level meta-intelligence: is GSE getting better at turning reality into deserved decisions over
time? Module: `packages/decision-factory/src/intelligence-ledger.ts`.*

## The seven ledgers

| Ledger | Metric |
|---|---|
| Detection | `detectionValue` (meaningful change × time advantage × decision relevance) |
| Refusal | `RefusalAlpha = trapAvoidanceValue − falseSuppressionCost` |
| Scar | `ScarHitRate = trueTrapSuppressions ÷ ghostSuppressions` (+ false-block rate) |
| Source Rent | `decisionLeverageCreated − falseConfidenceCost − sourceCost` |
| Compression | `cardDecisionLeverage ÷ factVolumeCostNoise` |
| Product Clarity | `decisionLeverageDisplayed ÷ cognitiveLoad` |
| Theory Health | from `ecologyCensus` — `LAW + ½·HYPOTHESIS − QUARANTINED − RETIRED` over total |

## The discipline (the point)

A Conscience that can praise itself is worthless. Every "we improved" claim is treated as a hypothesis:

1. Per ledger, a **one-sample t-test on the per-cycle first-differences** (`studentTTwoSidedP`, reused
   from `@sports/prediction-engine`) — is the metric trending up beyond noise, with sample size `n`?
2. The seven p-values are corrected together with **Benjamini-Hochberg FDR** (`benjaminiHochberg`,
   q=0.10).
3. A ledger reads as **improving only if** its trend is positive **AND** it survives FDR.

**Result:** a lucky last-cycle uptick on a noisy metric is *not* declared a discovery. The acceptance
test proves exactly this — Product Clarity ends higher than it started but, because its trend is noise,
the Conscience refuses to call it a win.

## What is real / fixture-only

- The math is real and tested (3 tests). Inputs are `LedgerSample[]` series — currently fixtures.
- It is **owner-facing telemetry**, never public copy. The public sees only its gentle face
  ("What we learned" / the scar memory), never the raw metrics.

## Honest limits

- `IntelligenceDelta` sums FDR-surviving deltas; it is a directional indicator, not a calibrated score.
- Confidence intervals via `conformal-intervals` are available in the engine but not yet wired into the
  ledger output — a P2 enhancement. Today the ledger reports `n`, `pValue`, `qValue`, and the
  survives-FDR boolean, which is enough to prevent p-hacking but not yet a full uncertainty band.
