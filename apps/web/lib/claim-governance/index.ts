/**
 * Claim Governance Engine (ADR 005)
 *
 * Every claim eligible to appear on a public surface must pass through
 * evaluateClaimApproval() before rendering. The function is pure — it takes
 * evidence and returns a verdict. The caller is responsible for persisting
 * the verdict to PublicClaim and for gating the UI on governanceStatus.
 *
 * Rules (all must pass for APPROVED):
 *   1. Win-rate claims require gateCleared (≥30 settled per model version)
 *   2. Sharp-action claims require sourceTier ≤ 2
 *   3. Rumors require sourceTier ≤ 2 AND are never public-safe
 *   4. No claim may use banned phrases (trust-gate enforces this separately)
 *   5. Accuracy claims require calibrationReport.gateCleared
 */

import type { CalibrationReport } from "@/lib/signal-ledger";

// ── Types ─────────────────────────────────────────────────────────────────

export type ClaimType =
  | "win_rate"
  | "accuracy"
  | "confidence"
  | "sharp_action"
  | "rumor"
  | "injury_status"
  | "line_movement"
  | "odds_snapshot"
  | "public_lean"
  | "informational";

export interface ClaimEvidenceSummary {
  evidenceIds: string[];
  sourceTiers: number[];
  claimType: ClaimType;
  calibrationReport?: CalibrationReport;
}

export type ClaimGovernanceVerdict = "APPROVED" | "REJECTED";

export interface GovernanceResult {
  verdict: ClaimGovernanceVerdict;
  rejectionCode?: string;
  rejectionNote?: string;
}

// ── Rejection codes ───────────────────────────────────────────────────────

const REJECTION = {
  WINRATE_GATE_NOT_CLEARED: {
    code: "WINRATE_GATE_NOT_CLEARED",
    note: "Win-rate claims are blocked until ≥30 picks settle per model version. This is an anti-tout guardrail.",
  },
  ACCURACY_GATE_NOT_CLEARED: {
    code: "ACCURACY_GATE_NOT_CLEARED",
    note: "Accuracy claims require calibration gate clearance (≥30 settled picks per model version).",
  },
  SHARP_ACTION_TIER_INSUFFICIENT: {
    code: "SHARP_ACTION_TIER_INSUFFICIENT",
    note: "Sharp-action claims must be backed by Tier 1 or Tier 2 source evidence.",
  },
  RUMOR_TIER_INSUFFICIENT: {
    code: "RUMOR_TIER_INSUFFICIENT",
    note: "Rumor claims must be backed by Tier 1 or Tier 2 source evidence before surface exposure.",
  },
  NO_EVIDENCE: {
    code: "NO_EVIDENCE",
    note: "This claim has no backing evidence IDs. All surfaced claims must reference EvidenceItem rows.",
  },
} as const;

// ── Pure evaluator ───────────────────────────────────────────────────────

/**
 * Pure function — no DB calls. Pass loaded evidence and calibration state.
 * Returns APPROVED or REJECTED with a coded reason.
 */
export function evaluateClaimApproval(
  evidence: ClaimEvidenceSummary,
): GovernanceResult {
  const { claimType, evidenceIds, sourceTiers, calibrationReport } = evidence;

  // All claims need at least one piece of backing evidence.
  if (evidenceIds.length === 0) {
    return { verdict: "REJECTED", ...REJECTION.NO_EVIDENCE };
  }

  const minTier = sourceTiers.length > 0 ? Math.min(...sourceTiers) : 99;

  switch (claimType) {
    case "win_rate": {
      const cleared = calibrationReport?.gateCleared ?? false;
      if (!cleared) {
        return { verdict: "REJECTED", ...REJECTION.WINRATE_GATE_NOT_CLEARED };
      }
      break;
    }

    case "accuracy": {
      const cleared = calibrationReport?.gateCleared ?? false;
      if (!cleared) {
        return { verdict: "REJECTED", ...REJECTION.ACCURACY_GATE_NOT_CLEARED };
      }
      break;
    }

    case "sharp_action": {
      if (minTier > 2) {
        return {
          verdict: "REJECTED",
          ...REJECTION.SHARP_ACTION_TIER_INSUFFICIENT,
        };
      }
      break;
    }

    case "rumor": {
      if (minTier > 2) {
        return { verdict: "REJECTED", ...REJECTION.RUMOR_TIER_INSUFFICIENT };
      }
      break;
    }

    // confidence, injury_status, line_movement, odds_snapshot, public_lean,
    // informational — approved if evidence present and passing tier checks above.
    default:
      break;
  }

  return { verdict: "APPROVED" };
}

// ── DB persistence helpers ─────────────────────────────────────────────────

import { db as prisma } from "@sports/db";
import type { PublicClaim } from "@prisma/client";

export interface ClaimSubmission {
  surfacePath: string;
  claimType: ClaimType;
  claimText: string;
  evidenceIds: string[];
  sourceTiers: number[];
  calibrationReport?: CalibrationReport;
  actor?: string;
}

/**
 * Submit a claim for governance evaluation and persist the result.
 * Returns the persisted PublicClaim row.
 */
export async function submitClaim(input: ClaimSubmission): Promise<PublicClaim> {
  const result = evaluateClaimApproval({
    claimType: input.claimType,
    evidenceIds: input.evidenceIds,
    sourceTiers: input.sourceTiers,
    calibrationReport: input.calibrationReport,
  });

  const now = new Date();

  return prisma.publicClaim.create({
    data: {
      surfacePath: input.surfacePath,
      claimType: input.claimType,
      claimText: input.claimText,
      evidenceIds: input.evidenceIds,
      sourceTiers: input.sourceTiers,
      governanceStatus: result.verdict === "APPROVED" ? "APPROVED" : "REJECTED",
      evaluatedAt: now,
      evaluatedBy: input.actor ?? "system",
      rejectionCode: result.rejectionCode ?? null,
      rejectionNote: result.rejectionNote ?? null,
      publishedAt: result.verdict === "APPROVED" ? now : null,
    },
  });
}

/** Retire all active claims on a surface path (e.g., before re-publishing). */
export async function retireClaimsForSurface(surfacePath: string): Promise<number> {
  const { count } = await prisma.publicClaim.updateMany({
    where: {
      surfacePath,
      governanceStatus: { in: ["APPROVED", "PENDING"] },
      retiredAt: null,
    },
    data: {
      governanceStatus: "RETIRED",
      retiredAt: new Date(),
    },
  });
  return count;
}
