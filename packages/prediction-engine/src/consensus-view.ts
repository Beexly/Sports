/**
 * Consensus surface view-model — turns the engine's consensus/divergence,
 * edge-significance, and proof-of-record outputs into a STRUCTURED, prose-free
 * view-model for the public glass-box "consensus surface".
 *
 * Deliberately tokens, not sentences: the UI maps each token to already-vetted
 * copy (lib/trust-claims.ts), so this never introduces unscanned marketing prose
 * and never overclaims. Pure, no I/O.
 */
import type { ConsensusResult } from "./consensus.js";
import type { SignificanceResult } from "./edge-significance.js";

export type AgreementLevel = "high" | "moderate" | "low";
export type DivergenceDirection = "home" | "away" | "none";
export type VerificationStatus = "verified" | "unverified";

export interface ConsensusView {
  /** Consensus P(home) as a percentage 0–100, or null. */
  readonly consensusHomePct: number | null;
  readonly agreement: AgreementLevel;
  /** Side the referees favour vs the market — the divergence/edge direction. */
  readonly divergenceSide: DivergenceDirection;
  /** Magnitude of market divergence in percentage points (abs), or null. */
  readonly divergencePct: number | null;
  readonly sourceCount: number;
  readonly outlierSources: readonly string[];
  /** Did the edge clear the significance self-grade? null = not assessed. */
  readonly edgeProven: boolean | null;
  /** Track-record commitment present + verifiable? */
  readonly verification: VerificationStatus;
}

export interface ConsensusViewOptions {
  readonly significance?: SignificanceResult | null;
  readonly proofRoot?: string | null;
}

const HIGH_AGREEMENT = 0.8;
const MODERATE_AGREEMENT = 0.5;
const DIVERGENCE_EPSILON = 0.005; // <0.5 pt → treat as no meaningful divergence

export function buildConsensusView(
  consensus: ConsensusResult,
  options: ConsensusViewOptions = {},
): ConsensusView {
  const agreement: AgreementLevel =
    consensus.agreementScore >= HIGH_AGREEMENT
      ? "high"
      : consensus.agreementScore >= MODERATE_AGREEMENT
        ? "moderate"
        : "low";

  const div = consensus.marketDivergence;
  const divergenceSide: DivergenceDirection =
    div == null || Math.abs(div) < DIVERGENCE_EPSILON ? "none" : div > 0 ? "home" : "away";

  return {
    consensusHomePct:
      consensus.consensusHomeProb != null ? Number((consensus.consensusHomeProb * 100).toFixed(1)) : null,
    agreement,
    divergenceSide,
    divergencePct: div != null ? Number((Math.abs(div) * 100).toFixed(1)) : null,
    sourceCount: consensus.sources,
    outlierSources: consensus.outliers.map((o) => o.source),
    edgeProven: options.significance ? options.significance.significant : null,
    verification: options.proofRoot ? "verified" : "unverified",
  };
}
