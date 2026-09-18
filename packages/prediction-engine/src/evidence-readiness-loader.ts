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
