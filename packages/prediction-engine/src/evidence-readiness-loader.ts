/**
 * Runtime caller for the evidence readiness matrix.
 *
 * Pure function boundary: an evidence bundle in, a per-factor verdict out.
 * No database. Does not gate publish or scoring — report only.
 *
 * Keys are enumerated from EVIDENCE_FACTOR_DEFINITIONS so a new matrix
 * row cannot silently drop off this loader.
 */

import {
  buildEvidenceReadinessMatrix,
  EVIDENCE_FACTOR_DEFINITIONS,
  getEvidenceFactorDefinition,
  type EvidenceFactorKey,
  type EvidenceMatrixRow,
  type EvidenceReadinessMatrix,
} from "./evidence-readiness-matrix.js";
import type { EvidenceRecord } from "@sports/types";
import type { TrialEntry, TrialsRegistry } from "./edge-lab/trials-registry.js";

export const EVIDENCE_FACTOR_KEYS: readonly EvidenceFactorKey[] =
  EVIDENCE_FACTOR_DEFINITIONS.map((d) => d.key);

export interface EvidenceBundle {
  readonly evidence: readonly EvidenceRecord[];
  readonly now?: Date;
}

export function evaluateFactorReadiness(
  factorKey: EvidenceFactorKey,
  bundle: EvidenceBundle,
): EvidenceMatrixRow {
  getEvidenceFactorDefinition(factorKey);
  const matrix = buildEvidenceReadinessMatrix({
    evidence: bundle.evidence,
    now: bundle.now,
  });
  const row = matrix.rows.find((r) => r.key === factorKey);
  if (!row) {
    throw new Error(`Matrix omitted factor ${factorKey}`);
  }
  return row;
}

export function reportAllFactorReadiness(bundle: EvidenceBundle): EvidenceReadinessMatrix {
  return buildEvidenceReadinessMatrix({
    evidence: bundle.evidence,
    now: bundle.now,
  });
}

/**
 * Rung-2 admission mill. Only factors the matrix already marked as able to
 * contribute to a score. SHADOW_READY with canContributeToScore false stays out.
 */
export function rung2EligibleFactorKeys(
  matrix: EvidenceReadinessMatrix,
): readonly EvidenceFactorKey[] {
  return matrix.rows.filter((row) => row.canContributeToScore).map((row) => row.key);
}

export const EVIDENCE_READINESS_FAMILY = "rung2_evidence_readiness";

/**
 * Hash-chain a matrix snapshot. Outcome is always "recorded": the mill
 * enumerates eligibility, it does not invent a p-value.
 */
export function recordEvidenceReadinessTrial(args: {
  readonly registry: TrialsRegistry;
  readonly matrix: EvidenceReadinessMatrix;
  readonly recordedAt: string;
  readonly runId: string;
}): TrialEntry {
  if (!args.runId) throw new RangeError("recordEvidenceReadinessTrial: runId is required");
  const eligible = rung2EligibleFactorKeys(args.matrix);
  return args.registry.append({
    trialId: `${EVIDENCE_READINESS_FAMILY}:${args.runId}`,
    family: EVIDENCE_READINESS_FAMILY,
    kind: "model_admission",
    recordedAt: args.recordedAt,
    params: {
      integrityScore: args.matrix.integrityScore,
      activeContributingFactors: args.matrix.activeContributingFactors,
      shadowReadyFactors: args.matrix.shadowReadyFactors,
      blockedCriticalFactors: [...args.matrix.blockedCriticalFactors],
      eligibleFactorKeys: [...eligible],
    },
    pValue: null,
    statistic: args.matrix.integrityScore,
    outcome: "recorded",
  });
}
