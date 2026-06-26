/**
 * MetaDoubtReport — "did we doubt the signal well enough?"
 *
 * StructuredDoubt records reasons a signal might be wrong. Meta-doubt audits the doubt itself: did we
 * cover every axis a careful skeptic would check? Is the signal over-confident relative to how thinly
 * we doubted it? Without this layer, a system can manufacture the APPEARANCE of rigor (a couple of
 * easy doubts) and promote on it. Meta-doubt is the defense against fake rigor.
 */

import { metaIdFrom } from "./ids.js";
import { coveredDoubtCategories, type DoubtCategory, type StructuredDoubt } from "./doubt.js";
import type { SyntheticSignal } from "./signal.js";
import type { MetaDoubtId, SignalId } from "./brands.js";

export interface MetaDoubtReport {
  metaId: MetaDoubtId;
  signalId: SignalId;
  generatedAt: string;
  /** Fraction of required doubt categories actually covered, in [0,1]. */
  doubtCoverageScore: number;
  missingDoubtCategories: readonly DoubtCategory[];
  adversarialReviewPassed: boolean;
  overconfidenceFlag: boolean;
  unresolvedBlindSpots: readonly string[];
  metaDoubtApplied: true;
}

/** The axes a synthetic signal must be doubted along before anyone trusts it. */
export const DEFAULT_REQUIRED_DOUBT_CATEGORIES: readonly DoubtCategory[] = [
  "data_quality",
  "sample_size",
  "source_freshness",
  "calibration",
  "market_absorption",
  "model_leakage",
  "licensing",
];

function round(value: number, digits = 4): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

export interface RunMetaDoubtOptions {
  requiredCategories?: readonly DoubtCategory[];
  /** Confidence at/above which weak doubt coverage trips the overconfidence flag. */
  highConfidenceThreshold?: number;
  /** Minimum coverage to treat the doubt as adversarially complete. */
  minCoverageForPass?: number;
}

/**
 * Audit a signal's structured doubt. `generatedAt` is taken from the doubt record itself, so the
 * report is deterministic and clock-free. A signal is over-confident when its confidence is high but
 * its doubt coverage is weak — the exact combination that lets fake rigor through.
 */
export function runMetaDoubt(
  signal: Pick<SyntheticSignal, "signalId" | "confidence">,
  structuredDoubt: StructuredDoubt,
  options: RunMetaDoubtOptions = {},
): MetaDoubtReport {
  const required = options.requiredCategories ?? DEFAULT_REQUIRED_DOUBT_CATEGORIES;
  const highConfidenceThreshold = options.highConfidenceThreshold ?? 0.7;
  const minCoverageForPass = options.minCoverageForPass ?? 1;

  const covered = coveredDoubtCategories(structuredDoubt);
  const missing = required.filter((c) => !covered.has(c));
  const doubtCoverageScore = required.length === 0 ? 1 : round((required.length - missing.length) / required.length);

  const overconfidenceFlag = signal.confidence >= highConfidenceThreshold && doubtCoverageScore < 0.7;

  const adversarialReviewPassed =
    doubtCoverageScore >= minCoverageForPass &&
    structuredDoubt.unresolvedCriticalCount === 0 &&
    !overconfidenceFlag;

  const unresolvedBlindSpots: string[] = [
    ...missing.map((c) => `no doubt raised for "${c}"`),
    ...(overconfidenceFlag ? ["high confidence paired with weak doubt coverage"] : []),
    ...(structuredDoubt.unresolvedCriticalCount > 0
      ? [`${structuredDoubt.unresolvedCriticalCount} unresolved critical doubt(s)`]
      : []),
  ];

  return {
    metaId: metaIdFrom(structuredDoubt.signalId),
    signalId: structuredDoubt.signalId,
    generatedAt: structuredDoubt.generatedAt,
    doubtCoverageScore,
    missingDoubtCategories: missing,
    adversarialReviewPassed,
    overconfidenceFlag,
    unresolvedBlindSpots,
    metaDoubtApplied: true,
  };
}
