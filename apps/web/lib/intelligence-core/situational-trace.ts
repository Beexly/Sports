/**
 * WIRE: situational-engine (packages/prediction-engine) into the production
 * intelligence spine (apps/web/lib/intelligence-core).
 *
 * WHY: `interpretSituation` — the L2 aggregation-trace divergence engine —
 * sat loaded-but-never-invoked (loaded-vs-invoked.json, 145 such modules).
 * The spine computed `edgeVsMarket` from a single scalar; the situational
 * engine adds what the scalar cannot: per-family consistency, dormant-signal
 * accounting, and the aggregation trace with per-signal weights.
 *
 * CONTRACT (both sides, honestly respected):
 *  - interpretSituation NEVER returns a pick/value edge. divergence is a
 *    difference of numbers. This module does not convert it into a bet.
 *  - A market price is used ONLY when a probability strictly inside (0,1)
 *    already exists from the calibrated spine. No line->prob conversion here.
 *  - Fail-open: a situational trace failure MUST NOT break the pick path —
 *    it degrades to `situationTrace: null` with the reason recorded.
 */

import {
  interpretSituation,
  type SituationalEval,
} from "../../../../packages/prediction-engine/src/reasoning/situational-engine";
import type { SignalObservation as TraceObservation } from "../../../../packages/prediction-engine/src/reasoning/aggregation-trace";
import type { SignalObservation, SituationalContext } from "./reasoning";
import type { IntelligenceReasoning } from "./reasoning";

/** The apps/web SignalFamily union mirrored onto the engine's family type. */
function toTraceFamily(f: SignalObservation["family"]): TraceObservation["family"] {
  return f as TraceObservation["family"];
}

/**
 * Signed lean -> probability strictly inside (0, 1).
 * o.lean <= 0 used to become `probability: undefined`, which aborted
 * aggregateSignals before the corpus and mind evaluators.
 */
export function leanToBoundedProbability(lean: number | null | undefined): number {
  if (lean == null || !Number.isFinite(lean)) return 0.5;
  if (lean > 0 && lean < 1) return lean;
  const mapped = 1 / (1 + Math.exp(-2.2 * lean));
  return Math.min(0.999, Math.max(0.001, mapped));
}

/**
 * Build the trace-side observations from the spine's observations. Only
 * publishable, non-shadowed observations enter the trace: shadowed families
 * must not re-enter reasoning through a second door (the spine already
 * enforces this inside reason(); we mirror the filter here).
 */
export function toTraceObservations(
  ctx: SituationalContext,
  reasoning: IntelligenceReasoning,
): TraceObservation[] {
  const shadowed = new Set<string>(
    reasoning.shadowReport?.families ?? [],
  );
  return ctx.observations
    .filter((o) => o.rights === "cleared" || o.rights === "licensed")
    .filter((o) => !shadowed.has(o.family as unknown as string))
    .map((o) => ({
      signalId: `${o.family}:${o.key}`,
      sourceModule: o.origin,
      family: toTraceFamily(o.family),
      reasoningPath: o.tier === 5 ? "chatter" : "measured",
      outcome: "home_win",
      probability: leanToBoundedProbability(o.lean),
      declaredWeight: o.trust,
      evidenceTimestamp: o.knownAt,
      provenance: [o.origin],
    }));
}

export interface SituationTraceResult {
  readonly ok: boolean;
  readonly divergence: number | null;
  readonly signalImplied: number | null;
  readonly consistencyPassed: boolean | null;
  readonly consistencyViolations: readonly string[];
  readonly activeSignals: readonly string[];
  readonly dormantSignals: readonly { signalId: string; reason: string }[];
  readonly reasoningTrace: string | null;
  readonly corpusItemsLoaded?: number;
  readonly corpusItemsEvaluated?: number;
  readonly mindRecordsLoaded?: number;
  readonly mindApplicablePrinciplesCount?: number;
  readonly corpusSituationalShift?: number;
  readonly mindNetSituationalAdjustment?: number;
  readonly failReason?: string;
}

/**
 * Run the situational engine over the spine's result. Market probability
 * comes from the spine's OWN calibrated fair-probability (inside (0,1) by
 * construction) — never from a raw line.
 */
export function runSituationalTrace(
  ctx: SituationalContext,
  reasoning: IntelligenceReasoning,
): SituationTraceResult {
  const marketProb = reasoning.marketFairProb;
  if (marketProb == null || !(marketProb > 0 && marketProb < 1)) {
    return {
      ok: false,
      divergence: null,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      dormantSignals: [],
      reasoningTrace: null,
      failReason: "no market probability strictly inside (0,1) from the spine",
    };
  }
  let evalResult: SituationalEval;
  try {
    evalResult = interpretSituation(
      {
        homeTeam: ctx.homeTeam ?? "selection-A",
        awayTeam: ctx.awayTeam ?? "selection-B",
        venue: "unspecified",
        restDaysHome: ctx.situation.restDaysHome ?? 7,
        restDaysAway: ctx.situation.restDaysAway ?? 7,
        weather:
          ctx.situation.weatherImpact != null
            ? `impact:${ctx.situation.weatherImpact}`
            : "unspecified",
        marketLine: ctx.market.line ?? null,
        marketImpliedProbability: marketProb,
        outcome: ctx.selection,
        decisionTimestamp: new Date().toISOString(),
        // Structural observations are not market ticks. A 15-minute window
        // was expiring week-long trench facts before the corpus ran.
        decisionWindowMs: 7 * 24 * 60 * 60 * 1000,
        windSpeedMph: ctx.physical?.windSpeedMph,
        temperatureF: ctx.physical?.temperatureF,
        precipitationRateMmHr: ctx.physical?.precipitationRateMmHr,
        altitudeFt: ctx.physical?.altitudeFt,
      },
      toTraceObservations(ctx, reasoning),
    );
  } catch (err) {
    // Fail-open by contract (header): a trace failure MUST NOT break the pick
    // path. interpretSituation can THROW (not just return !ok) — e.g. the
    // mind-corpus loader raising when the literature artifact is not shipped
    // in a deployment — and an uncaught throw here previously killed the
    // entire runIntelligence path. Record the reason, degrade, never block.
    return {
      ok: false,
      divergence: null,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      dormantSignals: [],
      reasoningTrace: null,
      failReason: err instanceof Error ? err.message : String(err),
    };
  }
  if (!evalResult.ok) {
    return {
      ok: false,
      divergence: null,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      dormantSignals: [],
      reasoningTrace: null,
      failReason: evalResult.reason,
    };
  }
  const d = evalResult.data;
  return {
    ok: true,
    divergence: d.divergence,
    signalImplied: d.signalImplied,
    consistencyPassed: d.consistency.passed,
    consistencyViolations: [...d.consistency.violations],
    activeSignals: d.activeSignals,
    dormantSignals: [...d.dormantSignals],
    reasoningTrace: d.reasoningTrace,
    corpusItemsLoaded: d.corpusEvaluation.totalLoadedCount,
    corpusItemsEvaluated: d.corpusEvaluation.itemsEvaluatedCount,
    mindRecordsLoaded: d.mindEvaluation.totalMindRecordsLoaded,
    mindApplicablePrinciplesCount: d.mindEvaluation.applicablePrinciples.length,
    corpusSituationalShift: d.corpusSituationalShift,
    mindNetSituationalAdjustment: d.mindEvaluation.netSituationalAdjustment,
  };
}
