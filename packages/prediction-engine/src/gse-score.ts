/**
 * The flagship GSE Score — one 0-100 number, honestly derived.
 *
 * The published `confidence` (scoring.ts:456-464) already folds the Read, Integrity,
 * Context, and Edge pillars into a single heuristic 0-100. What it CANNOT contain is
 * the Proof pillar — *how provably we can stand behind this pick*. The GSE Score adds
 * exactly that one missing dimension, and nothing else:
 *
 *     GSE Score = round( confidence × M ),  M = floor + range · P  ∈ [0.80, 1.00]
 *
 * P (0..1) is provenance credibility: a tamper-evident receipt, inclusion in a
 * published pre-kickoff slate commitment, and canonical-and-fresh status. A fully
 * proven, slate-committed, canonical, fresh pick scores M = 1.0 → GSE Score =
 * confidence. An unproven / bootstrap / stale pick is gently discounted (down to 80%).
 *
 * This is a PRESENTATION / RANKING index, calibrated in direction — NOT a win
 * probability. It does NOT touch the scoring engine: confidence and the Edge Index are
 * its inputs and are always shown alongside it. The formula constants live in the
 * method spec (gse-method-spec.ts) so the score, the doc, and the page can never drift.
 */

import type { ScoredPick, PickGrade, RiskLevel } from "@sports/types";
import type { ClvVerdict } from "./clv.js";
import { clamp, toEdgeIndex } from "./scoring.js";
import { MIN_PUBLISH_CONFIDENCE, PREMIUM_CONFIDENCE_THRESHOLD } from "./constants.js";
import { GSE_SCORE_FORMULA, GSE_SCORE_VERSION } from "./gse-method-spec.js";

export { GSE_SCORE_VERSION };

/**
 * The four real, point-in-time facts that decide how provably we stand behind a pick.
 * Every field maps to an artifact the platform already produces.
 */
export interface GseProvenanceInput {
  /** A tamper-evident PickProofReceipt was frozen at publish (pick-proof-receipt.ts). */
  readonly hasProofReceipt: boolean;
  /** The pick is included under a published pre-kickoff slate Merkle root (slate-commitment.ts). */
  readonly inPublishedSlateCommitment: boolean;
  /** The pick is canonical — not a bootstrap pick (platform-config.ts gating). */
  readonly isCanonical: boolean;
  /** The odds the pick was scored against were inside the freshness SLA. */
  readonly withinFreshnessSLA: boolean;
}

/**
 * Provenance credibility P ∈ [0, 1] — how provably we can stand behind the pick.
 * Weights come from the spec and sum to 1.0; the result is capped at 1.0.
 */
export function provenanceCredibility(p: GseProvenanceInput): number {
  const w = GSE_SCORE_FORMULA.provenanceWeights;
  const raw =
    (p.hasProofReceipt ? w.proofReceipt : 0) +
    (p.inPublishedSlateCommitment ? w.slateCommitment : 0) +
    (p.isCanonical && p.withinFreshnessSLA ? w.canonicalAndFresh : 0);
  return Math.min(1, raw);
}

/** The provenance multiplier M ∈ [floor, floor+range] = [0.80, 1.00]. */
export function provenanceMultiplier(p: GseProvenanceInput): number {
  return GSE_SCORE_FORMULA.multiplierFloor + GSE_SCORE_FORMULA.multiplierRange * provenanceCredibility(p);
}

/**
 * The flagship GSE Score (0-100): the live confidence, discounted only by how
 * provably we can stand behind the pick. Pure; the scoring engine is untouched.
 */
export function computeGseScore(confidence: number, provenance: GseProvenanceInput): number {
  const c = clamp(confidence, 0, 100);
  return Math.round(c * provenanceMultiplier(provenance));
}

export type GsePublishTier = "FREE" | "PREMIUM" | "UNPUBLISHED";

/** Where a pick sits relative to the publish/premium floors (mirrors the engine gate). */
export function gsePublishTier(confidence: number): GsePublishTier {
  if (confidence < MIN_PUBLISH_CONFIDENCE) return "UNPUBLISHED";
  if (confidence >= PREMIUM_CONFIDENCE_THRESHOLD) return "PREMIUM";
  return "FREE";
}

export interface GseScoreProof {
  /** SHA-256 content hash of the frozen PickProofReceipt, if one exists. */
  readonly receiptHash?: string | null;
  /** Published slate Merkle root the pick is committed under, if any. */
  readonly slateRoot?: string | null;
  /** CLV verdict once the pick is settled, if graded. */
  readonly clvVerdict?: ClvVerdict | null;
  /** True only when a genuinely calibrated probability backs the score (false today). */
  readonly calibrated: boolean;
}

/**
 * The flagship, plus the full context it always travels with. The GSE Score is never
 * shown bare — confidence and the Edge Index (its inputs) and the proof state ride
 * with it, so nothing is hidden behind one number.
 */
export interface GseScoreCard {
  readonly gseScore: number;
  /** The underlying heuristic confidence (0-100) — an input, shown alongside. */
  readonly confidence: number;
  /** Public Edge Index (0-100), or null when pending. */
  readonly edgeIndex: number | null;
  readonly grade: PickGrade;
  readonly riskLevel: RiskLevel;
  readonly publishTier: GsePublishTier;
  /** Provenance credibility P ∈ [0,1] that produced the haircut. */
  readonly credibility: number;
  /** The applied multiplier M ∈ [0.80, 1.00]. */
  readonly multiplier: number;
  readonly proof: GseScoreProof;
  readonly scoreVersion: string;
  readonly modelVersion: string;
}

export interface BuildGseScoreCardInput {
  /** A scored pick (the source of confidence, edge, grade, risk, model version). */
  readonly pick: Pick<ScoredPick, "confidence" | "edgeScore" | "pickGrade" | "riskLevel" | "modelVersion">;
  readonly provenance: GseProvenanceInput;
  readonly proof?: Partial<GseScoreProof>;
}

/**
 * Assemble the GSE Score Card from an existing scored pick + its proof state. Pure and
 * total — no new predictive math, no I/O. The single place that packages the flagship.
 */
export function buildGseScoreCard(input: BuildGseScoreCardInput): GseScoreCard {
  const { pick, provenance } = input;
  const credibility = provenanceCredibility(provenance);
  return {
    gseScore: computeGseScore(pick.confidence, provenance),
    confidence: clamp(Math.round(pick.confidence), 0, 100),
    edgeIndex: toEdgeIndex(pick.edgeScore),
    grade: pick.pickGrade,
    riskLevel: pick.riskLevel,
    publishTier: gsePublishTier(pick.confidence),
    credibility,
    multiplier: provenanceMultiplier(provenance),
    proof: {
      receiptHash: input.proof?.receiptHash ?? null,
      slateRoot: input.proof?.slateRoot ?? null,
      clvVerdict: input.proof?.clvVerdict ?? null,
      calibrated: input.proof?.calibrated ?? false,
    },
    scoreVersion: GSE_SCORE_VERSION,
    modelVersion: pick.modelVersion,
  };
}
