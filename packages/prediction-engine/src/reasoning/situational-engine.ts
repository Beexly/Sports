/**
 * Interprets an aggregation trace for one game.
 *
 * A market price is used only when the caller already has a probability
 * inside (0, 1). This module does not convert a line into a probability
 * and it does not flag a value edge. Divergence is a difference of two
 * numbers. It is not a bet.
 */

import type { SignalFamily } from "@sports/types";
import {
  aggregateSignals,
  type AggregationTrace,
  type SignalObservation,
} from "./aggregation-trace.js";
import {
  evaluateFullCorpus,
  type CorpusEvaluation,
} from "./corpus-evaluator.js";
import {
  evaluateMindReasoning,
  type MindEvaluationResult,
} from "./mind-reasoning.js";
import { schemeReasoningLine, type SchemePlay } from "../coach-sim/scheme-state.js";

export interface GameContext {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly venue: string;
  readonly restDaysHome: number;
  readonly restDaysAway: number;
  readonly weather: string;
  /** Price, kept as a price. Not converted. */
  readonly marketLine: number | null;
  /** Required. Strictly inside (0, 1). Named by `outcome`. */
  readonly marketImpliedProbability: number;
  readonly outcome: string;
  readonly decisionTimestamp: string;
  readonly decisionWindowMs: number;
  /** Families that count as relevant. Omit to treat every family as relevant. */
  readonly relevantFamilies?: readonly SignalFamily[];
  /** Optional physiological, aerodynamic, and market situational fields */
  readonly altitudeFt?: number;
  readonly windSpeedMph?: number;
  readonly temperatureF?: number;
  readonly crowdDecibels?: number;
  readonly publicTicketPct?: number;
  readonly publicHandlePct?: number;
  readonly timeZoneShiftHours?: number;
  readonly olContinuityDelta?: number;
  readonly dlContinuityDelta?: number;
  readonly dbContinuityDelta?: number;
  readonly dlContinuityScore?: number;
  readonly dbContinuityScore?: number;
  readonly coachAggressivenessDelta?: number;
  readonly turnoverMarginDelta?: number;
  readonly acuteChronicWorkloadRatio?: number;
  readonly workloadRatio?: number;
  readonly officiatingPenaltyRate?: number;
  readonly officiatingCrewPenaltyRate?: number;
  readonly precipitationRateMmHr?: number;
  readonly offensivePaceSec?: number;
  readonly surfaceTractionCoeff?: number;
  /** FTN scheme draw from the drive. Absent reads do not change. */
  readonly schemePlay?: SchemePlay;
}

export interface SituationalReading {
  readonly context: GameContext;
  readonly trace: AggregationTrace;
  readonly activeSignals: readonly string[];
  readonly dormantSignals: readonly { readonly signalId: string; readonly reason: string }[];
  readonly marketImplied: number;
  /** Weighted mean of the active signals on this outcome. Null when none are active. */
  readonly signalImplied: number | null;
  readonly divergence: number | null;
  readonly consistency: AggregationTrace["consistency"];
  readonly reasoningTrace: string;
  readonly publishablePick: false;
  /** Corpus literature evaluation */
  readonly corpusEvaluation: CorpusEvaluation;
  /** Final scaled shift applied in probability space */
  readonly corpusSituationalShift: number;
  /** Autonomous Mind reasoning evaluation from 3,085 literature records */
  readonly mindEvaluation: MindEvaluationResult;
  /** Trench and secondary continuity deltas & scores */
  readonly olContinuityDelta?: number;
  readonly dlContinuityDelta?: number;
  readonly dbContinuityDelta?: number;
  readonly dlContinuityScore?: number;
  readonly dbContinuityScore?: number;
}

export type SituationalEval =
  | { readonly ok: true; readonly data: SituationalReading }
  | { readonly ok: false; readonly reason: string };

type ForbiddenPickKey = "pick" | "recommendation" | "bet" | "value_edge" | "valueEdge";
type _SituationHasNoPick = Extract<keyof SituationalReading, ForbiddenPickKey> extends never ? true : never;
const _situationPickBrand: _SituationHasNoPick = true;
void _situationPickBrand;

function fail(reason: string): SituationalEval {
  return { ok: false, reason };
}

export function interpretSituation(
  context: GameContext,
  signals: readonly SignalObservation[],
  blockedProvenance: readonly string[] = [],
  options?: {
    readonly corpusEvaluatorWeight?: number;
  },
): SituationalEval {
  if (context.homeTeam.trim().length === 0 || context.awayTeam.trim().length === 0) {
    return fail("situation: home and away teams are required");
  }
  if (context.outcome.trim().length === 0) return fail("situation: outcome is required");
  const market = context.marketImpliedProbability;
  if (typeof market !== "number" || !Number.isFinite(market) || market <= 0 || market >= 1) {
    return fail(`situation: marketImpliedProbability ${String(market)} is not inside (0, 1) and was not clamped`);
  }

  const aggregated = aggregateSignals({
    signals,
    decisionTimestamp: context.decisionTimestamp,
    decisionWindowMs: context.decisionWindowMs,
    blockedProvenance,
  });
  if (!aggregated.ok) return aggregated;

  const relevant = context.relevantFamilies;
  const active: string[] = [];
  const dormant: { signalId: string; reason: string }[] = [];
  let weight = 0;
  let weighted = 0;

  for (const signal of aggregated.data.signals) {
    if (signal.outcome !== context.outcome) {
      dormant.push({ signalId: signal.signalId, reason: `outcome ${signal.outcome} is not ${context.outcome}` });
      continue;
    }
    if (relevant !== undefined && !relevant.includes(signal.family)) {
      dormant.push({ signalId: signal.signalId, reason: `family ${signal.family} is outside this context` });
      continue;
    }
    if (signal.stale) {
      dormant.push({ signalId: signal.signalId, reason: "evidence is older than the decision window" });
      continue;
    }
    active.push(signal.signalId);
    weight += signal.effectiveWeight;
    weighted += signal.probability * signal.effectiveWeight;
  }

  // Layer 2 literature corpus evaluation
  const corpusEvaluation = evaluateFullCorpus(context, {
    evaluatorWeight: options?.corpusEvaluatorWeight,
  });
  const corpusSituationalShift = corpusEvaluation.situationalAdjustment * corpusEvaluation.evaluatorWeight;

  // Autonomous Mind reasoning evaluation from 3,085 literature records
  const mindEvaluation = evaluateMindReasoning(context);

  const signalImplied = weight > 0 ? weighted / weight : null;
  const divergence = signalImplied === null ? null : signalImplied - market;
  const reasoningTrace = [
    `${context.awayTeam} at ${context.homeTeam}, venue ${context.venue}, outcome ${context.outcome}`,
    `rest home ${context.restDaysHome}, rest away ${context.restDaysAway}, weather ${context.weather}`,
    context.marketLine === null ? "market line not supplied" : `market line ${context.marketLine} left as a price`,
    `market implied ${market}`,
    active.length === 0 ? "no active signal on this outcome" : `active: ${active.join(", ")}`,
    dormant.length === 0 ? "no dormant signal" : dormant.map((item) => `${item.signalId} dormant: ${item.reason}`).join("; "),
    signalImplied === null ? "no signal-implied number" : `signal-implied ${signalImplied.toFixed(6)}, divergence ${divergence!.toFixed(6)}, not an edge`,
    aggregated.data.consistency.passed
      ? "consistency passed"
      : `consistency failed: ${aggregated.data.consistency.violations.join(" | ")}`,
    aggregated.data.traceSummary,
    `Trench/secondary continuity: OL delta ${context.olContinuityDelta ?? 0}, DL delta ${context.dlContinuityDelta ?? 0}, DB delta ${context.dbContinuityDelta ?? 0}.`,
    `Corpus evaluator: touched ${corpusEvaluation.itemsEvaluatedCount} items (${corpusEvaluation.totalLoadedCount} loaded, ${corpusEvaluation.itemsSkippedCount} skipped, ${corpusEvaluation.coveragePct.toFixed(1)}% coverage). Net shift: ${corpusSituationalShift.toFixed(6)} (weight ${corpusEvaluation.evaluatorWeight}).`,
    `Mind Reasoning: ${mindEvaluation.applicablePrinciples.length} principles active. Lean: ${mindEvaluation.situationalPick.selection} (${(mindEvaluation.situationalPick.modelFairProbability * 100).toFixed(1)}% fair vs ${(market * 100).toFixed(1)}% market). SGP: ${mindEvaluation.sameGameParlay.name}.`,
    ...(context.schemePlay ? [schemeReasoningLine(context.schemePlay)] : []),
  ].join(". ");

  return {
    ok: true,
    data: {
      context,
      trace: aggregated.data,
      activeSignals: active,
      dormantSignals: dormant,
      marketImplied: market,
      signalImplied,
      divergence,
      consistency: aggregated.data.consistency,
      reasoningTrace,
      publishablePick: false,
      corpusEvaluation,
      corpusSituationalShift,
      mindEvaluation,
      olContinuityDelta: context.olContinuityDelta ?? 0,
      dlContinuityDelta: context.dlContinuityDelta ?? 0,
      dbContinuityDelta: context.dbContinuityDelta ?? 0,
      dlContinuityScore: context.dlContinuityScore,
      dbContinuityScore: context.dbContinuityScore,
    },
  };
}
