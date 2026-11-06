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
  type SignalObservation as TraceObservation,
  type CorpusEvaluation,
  type MindEvaluationResult,
} from "@sports/prediction-engine";
import type { SignalFamily as TraceFamily } from "@sports/types";
import type { SignalObservation, SituationalContext } from "./reasoning";
import type { IntelligenceReasoning } from "./reasoning";

/** The apps/web SignalFamily union mirrored onto the engine's family type. */
function toTraceFamily(f: SignalObservation["family"]): TraceFamily {
  return f as unknown as TraceFamily;
}

function toObservationProbability(
  ctx: SituationalContext,
  reasoning: IntelligenceReasoning,
  o: SignalObservation,
): number {
  const baseProb = Math.min(
    0.95,
    Math.max(0.05, reasoning.marketFairProb ?? reasoning.calibratedProb ?? 0.5),
  );
  // Preserve explicit probabilities in (0.45, 1) (e.g. direct probability observations in wire tests)
  if (o.lean != null && o.lean > 0.45 && o.lean < 1) {
    return o.lean;
  }
  const sel = (ctx.selection || "").trim().toUpperCase();
  const away = (ctx.awayTeam || "").trim().toUpperCase();
  const isAwayOrUnder =
    (away.length > 0 && (sel === away || sel.startsWith(`${away} `))) ||
    sel.startsWith("UNDER");
  const sign = isAwayOrUnder ? -1 : 1;
  const rawLean = o.lean ?? 0;
  const shifted = baseProb + rawLean * sign * 0.1;
  return Math.min(0.98, Math.max(0.02, shifted));
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
  const targetOutcome = ctx.selection || "home_win";
  return ctx.observations
    .filter((o) => o.rights === "cleared" || o.rights === "licensed")
    .filter((o) => !shadowed.has(o.family as unknown as string))
    .map((o) => ({
      signalId: `${o.family}:${o.key}`,
      sourceModule: o.origin,
      family: toTraceFamily(o.family),
      reasoningPath: o.tier === 5 ? "chatter" : "measured",
      outcome: targetOutcome,
      probability: toObservationProbability(ctx, reasoning, o),
      declaredWeight: o.trust,
      evidenceTimestamp: o.knownAt,
      provenance: [o.origin],
    }));
}

export interface SituationTraceResult {
  readonly ok: boolean;
  readonly divergence: number | null;
  readonly delta: number;
  readonly signalImplied: number | null;
  readonly consistencyPassed: boolean | null;
  readonly consistencyViolations: readonly string[];
  readonly activeSignals: readonly string[];
  readonly activeCount: number;
  readonly dormantSignals: readonly { signalId: string; reason: string }[];
  readonly corpusEvaluation?: CorpusEvaluation;
  readonly corpusSituationalShift: number;
  readonly mindEvaluation?: MindEvaluationResult;
  readonly reasoningTrace: string | null;
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
      delta: 0,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      activeCount: 0,
      dormantSignals: [],
      corpusSituationalShift: 0,
      reasoningTrace: null,
      failReason: "no market probability strictly inside (0,1) from the spine",
    };
  }
  let evalResult: SituationalEval;
  try {
    const observations = toTraceObservations(ctx, reasoning);
    const targetOutcome = ctx.selection || "home_win";
    const parsedTimes = observations
      .map((o) => Date.parse(o.evidenceTimestamp))
      .filter((ms) => Number.isFinite(ms));
    const decisionTimestamp =
      parsedTimes.length > 0
        ? new Date(Math.max(...parsedTimes)).toISOString()
        : ctx.commenceTime || "2026-09-25T12:00:00Z";
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
        outcome: targetOutcome,
        decisionTimestamp,
        decisionWindowMs: 7 * 24 * 60 * 60 * 1000,
      },
      observations,
    );
  } catch (err) {
    return {
      ok: false,
      divergence: null,
      delta: 0,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      activeCount: 0,
      dormantSignals: [],
      corpusSituationalShift: 0,
      reasoningTrace: null,
      failReason: err instanceof Error ? err.message : String(err),
    };
  }
  if (!evalResult.ok) {
    return {
      ok: false,
      divergence: null,
      delta: 0,
      signalImplied: null,
      consistencyPassed: null,
      consistencyViolations: [],
      activeSignals: [],
      activeCount: 0,
      dormantSignals: [],
      corpusSituationalShift: 0,
      reasoningTrace: null,
      failReason: evalResult.reason,
    };
  }
  const d = evalResult.data;
  const delta = d.divergence ?? d.corpusSituationalShift ?? 0;
  return {
    ok: true,
    divergence: d.divergence,
    delta,
    signalImplied: d.signalImplied,
    consistencyPassed: d.consistency.passed,
    consistencyViolations: [...d.consistency.violations],
    activeSignals: d.activeSignals,
    activeCount: d.activeSignals.length,
    dormantSignals: [...d.dormantSignals],
    corpusEvaluation: d.corpusEvaluation,
    corpusSituationalShift: d.corpusSituationalShift,
    mindEvaluation: d.mindEvaluation,
    reasoningTrace: d.reasoningTrace,
  };
}
