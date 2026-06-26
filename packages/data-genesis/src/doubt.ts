/**
 * StructuredDoubt — every synthetic signal must be doubted on the record before it can be trusted.
 *
 * A DoubtCase is a single, categorized, severity-rated reason the signal might be wrong, with its
 * evidence and (optionally) its mitigation. Some categories are blocking by default — a `licensing`
 * or `model_leakage` doubt blocks promotion unless explicitly mitigated; a `critical` doubt blocks
 * until resolved. The point is to make doubt a first-class artifact, not an afterthought.
 */

import { doubtIdFrom } from "./ids.js";
import type { DoubtId, SignalId } from "./brands.js";
import type { SyntheticSignal } from "./signal.js";

export type DoubtCategory =
  | "data_quality"
  | "sample_size"
  | "source_freshness"
  | "market_absorption"
  | "model_leakage"
  | "calibration"
  | "licensing"
  | "counter_signal"
  | "assumption"
  | "distribution_shift"
  | "human_review"
  | "unknown";

export type DoubtSeverity = "low" | "medium" | "high" | "critical";

export interface DoubtCase {
  doubtId: DoubtId;
  category: DoubtCategory;
  severity: DoubtSeverity;
  claim: string;
  evidence: string;
  mitigation?: string;
  blocksPromotion: boolean;
}

export interface StructuredDoubt {
  signalId: SignalId;
  generatedAt: string;
  cases: readonly DoubtCase[];
  unresolvedCriticalCount: number;
  promotionBlocked: boolean;
}

/** Categories that block promotion by default until they are explicitly mitigated. */
const DEFAULT_BLOCKING_CATEGORIES: ReadonlySet<DoubtCategory> = new Set<DoubtCategory>([
  "licensing",
  "model_leakage",
]);

export interface DoubtCaseInput {
  category: DoubtCategory;
  severity: DoubtSeverity;
  claim: string;
  evidence: string;
  mitigation?: string;
  /** Explicit override. When omitted, the blocking rule below decides. */
  blocksPromotion?: boolean;
}

function resolvesBlock(input: DoubtCaseInput): boolean {
  return typeof input.mitigation === "string" && input.mitigation.trim().length > 0;
}

/** Decide whether a case blocks promotion: explicit override wins; else apply the default rules. */
function computeBlocks(input: DoubtCaseInput): boolean {
  if (typeof input.blocksPromotion === "boolean") return input.blocksPromotion;
  const mitigated = resolvesBlock(input);
  if (mitigated) return false;
  if (input.severity === "critical") return true;
  if (DEFAULT_BLOCKING_CATEGORIES.has(input.category)) return true;
  return false;
}

/**
 * Build the structured doubt for a signal from a set of case inputs. Each case gets a deterministic id
 * derived from the signal id and its index. unresolvedCriticalCount counts critical cases that are
 * still blocking; promotionBlocked is true when any case blocks.
 */
export function buildStructuredDoubt(
  signal: Pick<SyntheticSignal, "signalId">,
  caseInputs: readonly DoubtCaseInput[],
  generatedAt: string,
): StructuredDoubt {
  const cases: DoubtCase[] = caseInputs.map((input, i) => {
    const blocksPromotion = computeBlocks(input);
    const out: DoubtCase = {
      doubtId: doubtIdFrom(signal.signalId, i),
      category: input.category,
      severity: input.severity,
      claim: input.claim,
      evidence: input.evidence,
      blocksPromotion,
    };
    if (input.mitigation !== undefined) out.mitigation = input.mitigation;
    return out;
  });

  const unresolvedCriticalCount = cases.filter(
    (c) => c.severity === "critical" && c.blocksPromotion,
  ).length;
  const promotionBlocked = cases.some((c) => c.blocksPromotion);

  return {
    signalId: signal.signalId,
    generatedAt,
    cases,
    unresolvedCriticalCount,
    promotionBlocked,
  };
}

/** True when any case blocks promotion. */
export function hasBlockingDoubt(doubt: StructuredDoubt): boolean {
  return doubt.promotionBlocked;
}

/** Categories present in the doubt set (used by meta-doubt to find coverage gaps). */
export function coveredDoubtCategories(doubt: StructuredDoubt): ReadonlySet<DoubtCategory> {
  return new Set(doubt.cases.map((c) => c.category));
}

/** A short, human-readable summary of the doubt posture. */
export function summarizeDoubt(doubt: StructuredDoubt): string {
  if (doubt.cases.length === 0) return "no doubt cases recorded";
  const bySeverity = doubt.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.severity] = (acc[c.severity] ?? 0) + 1;
    return acc;
  }, {});
  const counts = (["critical", "high", "medium", "low"] as const)
    .filter((s) => bySeverity[s])
    .map((s) => `${bySeverity[s]} ${s}`)
    .join(", ");
  const blocked = doubt.promotionBlocked ? "promotion BLOCKED" : "no blocking doubt";
  return `${doubt.cases.length} doubt case(s) — ${counts}; ${blocked}`;
}
