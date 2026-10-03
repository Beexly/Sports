/**
 * Pairwise reasoning trace.
 *
 * Two axes, caller-declared, not inferred:
 *   reasoning similar  = the two signals name the same reasoningPath
 *   conclusion agrees  = they name the same outcome and their probabilities
 *                        sit within CONCLUSION_AGREEMENT_GAP
 *
 * That yields four states. Disagreement is recorded. It is not averaged away.
 *
 * `confidence` is a count ratio of those states. It is not a calibrated
 * probability. No outcome was used to fit it. `confidenceIsProbability`
 * is false so a caller cannot treat the ratio as a win probability.
 *
 * This module does not emit a pick, a recommendation, a bet, or a value edge.
 */

import type { SignalFamily } from "@sports/types";

/** Same gap the ingestion trace uses. Not fit on the holdout. */
export const CONCLUSION_AGREEMENT_GAP = 0.08;

/**
 * A stale signal keeps its identity. Its declared weight is multiplied by
 * this, not deleted. 0.5 is a penalty, not a calibrated discount.
 */
export const STALENESS_WEIGHT_MULTIPLIER = 0.5;

export type DisagreementState =
  | "CONVERGENT_AGREEMENT"
  | "DIVERGENT_AGREEMENT"
  | "CONVERGENT_DISAGREEMENT"
  | "DIVERGENT_DISAGREEMENT";

export interface SignalObservation {
  readonly signalId: string;
  readonly sourceModule: string;
  readonly family: SignalFamily;
  /** Same string means the reasoning path is being treated as similar. */
  readonly reasoningPath: string;
  /** The outcome this number is about. Home and away are not the same question. */
  readonly outcome: string;
  /** Strictly inside (0, 1) when the conclusion is a probability. */
  readonly probability?: number;
  readonly declaredWeight?: number;
  /** ISO-8601. Compared with the decision timestamp. */
  readonly evidenceTimestamp: string;
  readonly provenance: readonly string[];
}

export interface AggregationRequest {
  readonly signals: readonly SignalObservation[];
  /** ISO-8601. Evidence older than this minus the window is stale. */
  readonly decisionTimestamp: string;
  readonly decisionWindowMs: number;
  /** Provenance entries that mean the signal came from a blocked kernel. */
  readonly blockedProvenance?: readonly string[];
}

export interface SignalEntry {
  readonly signalId: string;
  readonly sourceModule: string;
  readonly family: SignalFamily;
  readonly reasoningPath: string;
  readonly outcome: string;
  readonly probability: number;
  readonly declaredWeight: number;
  readonly effectiveWeight: number;
  readonly stale: boolean;
  readonly evidenceTimestamp: string;
  readonly provenance: readonly string[];
}

export interface ConflictPair {
  readonly a: string;
  readonly b: string;
  readonly state: DisagreementState;
  readonly reasoningSimilar: boolean;
  readonly conclusionAgrees: boolean;
  readonly gap: number;
}

export interface AggregationTrace {
  readonly signals: readonly SignalEntry[];
  readonly conflicts: readonly ConflictPair[];
  readonly consistency: { readonly passed: boolean; readonly violations: readonly string[] };
  /**
   * (1 + divergent-agreement pairs) / (1 + divergent-agreement + both disagreement states).
   * Range (0, 1]. Not fitted. Not a probability of an outcome.
   */
  readonly confidence: number;
  readonly confidenceIsProbability: false;
  readonly publishablePick: false;
  readonly traceSummary: string;
}

export type AggregationEval =
  | { readonly ok: true; readonly data: AggregationTrace }
  | { readonly ok: false; readonly reason: string };

type ForbiddenPickKey = "pick" | "recommendation" | "bet" | "value_edge" | "valueEdge";
type _AggregationHasNoPick = Extract<keyof AggregationTrace, ForbiddenPickKey> extends never ? true : never;
const _aggregationPickBrand: _AggregationHasNoPick = true;
void _aggregationPickBrand;

function fail(reason: string): AggregationEval {
  return { ok: false, reason };
}

function isProbability(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v < 1;
}

export function aggregateSignals(request: AggregationRequest): AggregationEval {
  const decisionMs = Date.parse(request.decisionTimestamp);
  if (!Number.isFinite(decisionMs)) return fail("aggregation: decisionTimestamp is not a parseable time");
  if (!Number.isFinite(request.decisionWindowMs) || request.decisionWindowMs < 0) {
    return fail("aggregation: decisionWindowMs must be >= 0");
  }
  const blocked = new Set(request.blockedProvenance ?? []);
  const seen = new Set<string>();
  const signals: SignalEntry[] = [];
  const violations: string[] = [];

  for (const signal of request.signals) {
    if (signal.signalId.trim().length === 0) return fail("aggregation: empty signalId");
    if (seen.has(signal.signalId)) return fail(`aggregation: duplicate signalId ${signal.signalId}`);
    seen.add(signal.signalId);
    if (!isProbability(signal.probability)) {
      return fail(`aggregation: ${signal.signalId} probability ${String(signal.probability)} is not inside (0, 1) and was not clamped`);
    }
    if (signal.outcome.trim().length === 0) return fail(`aggregation: ${signal.signalId} has no outcome`);
    if (signal.reasoningPath.trim().length === 0) return fail(`aggregation: ${signal.signalId} has no reasoningPath`);
    const evidenceMs = Date.parse(signal.evidenceTimestamp);
    if (!Number.isFinite(evidenceMs)) {
      violations.push(`${signal.signalId}: evidenceTimestamp is not a parseable time`);
    }
    const age = Number.isFinite(evidenceMs) ? decisionMs - evidenceMs : Number.POSITIVE_INFINITY;
    const stale = age > request.decisionWindowMs;
    const declared = signal.declaredWeight ?? 1;
    if (!Number.isFinite(declared) || declared < 0) {
      return fail(`aggregation: ${signal.signalId} declaredWeight ${declared} is not >= 0`);
    }
    const effectiveWeight = stale ? declared * STALENESS_WEIGHT_MULTIPLIER : declared;
    if (signal.provenance.some((step) => blocked.has(step))) {
      violations.push(`${signal.signalId}: provenance terminates in a blocked module`);
    }
    signals.push({
      signalId: signal.signalId,
      sourceModule: signal.sourceModule,
      family: signal.family,
      reasoningPath: signal.reasoningPath,
      outcome: signal.outcome,
      probability: signal.probability,
      declaredWeight: declared,
      effectiveWeight,
      stale,
      evidenceTimestamp: signal.evidenceTimestamp,
      provenance: signal.provenance,
    });
  }

  const conflicts: ConflictPair[] = [];
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const a = signals[i]!;
      const b = signals[j]!;
      if (a.outcome !== b.outcome) continue;
      const reasoningSimilar = a.reasoningPath === b.reasoningPath;
      const gap = Math.abs(a.probability - b.probability);
      const conclusionAgrees = gap <= CONCLUSION_AGREEMENT_GAP;
      const state: DisagreementState = reasoningSimilar
        ? conclusionAgrees
          ? "CONVERGENT_AGREEMENT"
          : "CONVERGENT_DISAGREEMENT"
        : conclusionAgrees
          ? "DIVERGENT_AGREEMENT"
          : "DIVERGENT_DISAGREEMENT";
      conflicts.push({
        a: a.signalId,
        b: b.signalId,
        state,
        reasoningSimilar,
        conclusionAgrees,
        gap,
      });
    }
  }

  let divergentAgreement = 0;
  let disagreement = 0;
  for (const pair of conflicts) {
    if (pair.state === "DIVERGENT_AGREEMENT") divergentAgreement += 1;
    if (pair.state === "CONVERGENT_DISAGREEMENT" || pair.state === "DIVERGENT_DISAGREEMENT") disagreement += 1;
  }
  const confidence = (1 + divergentAgreement) / (1 + divergentAgreement + disagreement);

  const majorityByOutcome = new Map<string, { yes: number; no: number }>();
  for (const signal of signals) {
    const bucket = majorityByOutcome.get(signal.outcome) ?? { yes: 0, no: 0 };
    if (signal.probability >= 0.5) bucket.yes += 1;
    else bucket.no += 1;
    majorityByOutcome.set(signal.outcome, bucket);
  }
  for (const signal of signals) {
    const bucket = majorityByOutcome.get(signal.outcome)!;
    const majorityHigh = bucket.yes >= bucket.no;
    const thisHigh = signal.probability >= 0.5;
    if (thisHigh !== majorityHigh && bucket.yes !== bucket.no) {
      violations.push(`${signal.signalId}: conclusion is opposite the majority on ${signal.outcome}`);
    }
  }

  const summary = [
    `${signals.length} signal(s), ${conflicts.length} pair(s) on a shared outcome`,
    conflicts.map((pair) => `${pair.a} vs ${pair.b}: ${pair.state}`).join("; ") || "no shared-outcome pair",
    `confidence ratio ${confidence.toFixed(6)} is not a probability`,
    violations.length === 0 ? "consistency passed" : `consistency failed: ${violations.join(" | ")}`,
  ].join(". ");

  return {
    ok: true,
    data: {
      signals,
      conflicts,
      consistency: { passed: violations.length === 0, violations },
      confidence,
      confidenceIsProbability: false,
      publishablePick: false,
      traceSummary: summary,
    },
  };
}
