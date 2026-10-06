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
  readonly divergenceIsEdge: false;
  readonly consistency: AggregationTrace["consistency"];
  readonly reasoningTrace: string;
  readonly publishablePick: false;
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
      divergenceIsEdge: false,
      consistency: aggregated.data.consistency,
      reasoningTrace,
      publishablePick: false,
    },
  };
}
