# GSE 2026 — Scoring Systems (Workstream L)

**Status:** Implemented + tested. Source of truth: `apps/web/lib/gse/gse-scoring-systems.ts`
(the shared `GseScore` primitive + the 20-system registry) plus the per-domain scorers.
Tests: `apps/web/lib/gse/gse-contracts.test.ts`.

## The shared primitive

Every judgement GSE makes is a `GseScore`:

```ts
interface GseScore {
  id: string;                 // which scoring system produced it
  score: number;              // clamped 0..100
  band: ScoreBand;            // very_low | low | moderate | high | very_high
  confidence: ScoreConfidence;// speculative | tentative | supported | well_supported
  rationale: readonly string[]; // why — never empty for a real score
  flags: readonly string[];     // cautions / missing inputs / risk flags
}
```

Helpers: `clampScore` (NaN→0, bounds 0..100), `toBand` (thresholds 20/40/60/80),
`makeScore` (guarantees band + arrays exist), `weightedAverage` (normalised, returns 0 not NaN).

**Orientation matters.** Each system declares `orientation`:
- `higher_is_better` — quality/confidence/readiness scores.
- `higher_is_riskier` — the watchlist set (fragility, counter-severity, falsifier risk,
  bias risk, cognitive load, rights risk). The cockpit `ScoreBadge` flips the palette so a
  high risk score reads red, not green.

A score measures *fitness/judgement*, never *truth*. A perfect data-quality score can still be
factually wrong — which is exactly why the Evidence Engine layers contradiction and falsifiers on top.

## The 20 systems

| # | Score | fn | Orientation | Surface | One-line |
|---|---|---|---|---|---|
| 1 | Data Quality | `scoreDataQuality` | better | mixed | Item fitness: completeness·freshness·consistency·reliability·confirm/contradict·lineage·rights |
| 2 | Source Integrity | `scoreSourceIntegrity` | better | internal | Source trust over time: reliability·accuracy·rights·fallback·dependency |
| 3 | Evidence Strength | `scoreEvidenceStrength` | better | mixed | Noisy-OR over evidence; correlated evidence discounted to avoid echo inflation |
| 4 | Counter-Evidence Severity | `scoreCounterEvidenceSeverity` | riskier | mixed | Noisy-OR over the counter-case |
| 5 | Falsifier Risk | `scoreFalsifierRisk` | riskier | mixed | Likelihood × unmonitored-penalty × urgency, combined |
| 6 | Recommendation Confidence | `scoreRecommendationConfidence` | better | mixed | Evidence·data·model-agreement, tempered multiplicatively by counter + falsifier |
| 7 | Decision Fragility | `scoreDecisionFragility` | riskier | mixed | One-shock-breaks-it: falsifier·counter·staleness·concentration·urgency |
| 8 | User Bias Risk | `scoreUserBiasRisk` | riskier | user-visible | Loss-chasing weighted highest; framed for self-reflection, never shame |
| 9 | Cognitive Load | `scoreCognitiveLoad` | riskier | internal | CTA·density·jargon·decisions·novelty burden |
| 10 | Page Intelligence | `scorePageIntelligence` | better | internal | Decision named + evidence + **counter-evidence** + freshness + source + no-play + autopsy |
| 11 | Jarvis Readiness | `scoreJarvisReadiness` | better | internal | Forbidden-claims + source + confidence + fallback + audit + context |
| 12 | Agent Trust | `scoreAgentTrust` | better | internal | Contract completeness (≤70) + earned-from-runs (≤30) |
| 13 | Product Opportunity | `scoreProductOpportunity` | better | internal | Pain·unique·revenue·retention·data·fit·first-of-kind − complexity; **rights + trust hard gates** |
| 14 | Revenue Readiness | `scoreRevenueReadiness` | better | internal | Value·disclosures·price-source·refund·claim-safety; banned copy hard-caps |
| 15 | Launch Readiness | `scoreLaunchReadiness` | better | internal | 10 gates; data/trust/legal are **blocking** and hard-cap a go |
| 16 | Public Claim Safety | `scorePublicClaimSafety` | better | internal | Banned-phrase hard-cap + soft-certainty + unsourced-causal penalties |
| 17 | First-of-Kind Moat | `scoreMoat` | better | internal | Data·trust·compounding·switching; replicability inverted (copyable = head start) |
| 18 | Calibration Health | `scoreCalibrationHealth` | better | mixed | Error·drift·sample·bins; <100 settled hard-caps below publishable |
| 19 | Memory Usefulness | `scoreMemoryUsefulness` | better | internal | Decay on half-life × relevance; consent = hard gate, unconfirmed capped ≤35 |
| 20 | Source-Rights Risk | `scoreSourceRightsRisk` | riskier | internal | Status base risk; permission_required/blocked/excluded ≥80 = hard stop |

## Design rules common to all scorers

1. **Always return rationale + flags.** A bare number is not a judgement; the reasons travel with it.
2. **Hard gates beat weighted averages.** Rights, trust, consent, banned language, and blocking
   launch gates *cap* the score — you cannot average past a legal sign-off or buy conversion with
   banned copy. (See `scoreProductOpportunity`, `scoreLaunchReadiness`, `scoreRevenueReadiness`,
   `scorePublicClaimSafety`, `scoreMemoryUsefulness`.)
3. **Noisy-OR for evidence aggregation.** Multiple independent supports raise the score with
   diminishing returns; correlated supports are discounted (40% weight) so three retellings of one
   tweet are not three facts.
4. **Confidence ≠ probability of winning.** `scoreRecommendationConfidence` is *process* confidence.
   It is never surfaced as a win probability.
5. **Earned, not declared.** `scoreAgentTrust` cannot exceed ~70 without observed, calibrated runs;
   `scoreCalibrationHealth` cannot publish below 100 settled outcomes.

## Misuse risks (per the registry `misuseRisk` field)

The biggest danger is over-trusting a high score as truth. Each spec names its own misuse mode;
the red-team review (`GSE_2026_RED_TEAM_REVIEW.md`) tracks the cross-cutting ones: presenting a
risk-oriented score with the wrong palette, publishing calibration early, and treating
"passes the scanner" as "safe to ship" (humans still review copy).

## V1 status

All 20 are executable pure functions today, exercised by 51 passing tests. The remaining work is
wiring real inputs (live data, settled outcomes, observed agent runs) into them — the contracts are
ready for that without change.
