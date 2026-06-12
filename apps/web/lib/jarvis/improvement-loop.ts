/**
 * Jarvis Improvement Loop — proposals only, never autonomous adjustment.
 *
 * Pure functions, no I/O. The loop models how Jarvis proposes improvements
 * from observed results. Hard invariant: the prediction engine is NEVER
 * adjusted automatically — calibration and model changes are proposals that
 * require owner approval and out-of-sample validation.
 */

export type ImprovementProposalType =
  | "CALIBRATION_REVIEW"
  | "PROCESS_CHANGE"
  | "MODEL_SWAP"
  | "FEATURE_GAP"
  | "DATA_QUALITY"
  | "WIRING_STEP";

export type ImprovementStatus =
  | "PROPOSED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IMPLEMENTED"
  | "HELD";

export interface ImprovementProposal {
  readonly id: string;
  readonly type: ImprovementProposalType;
  readonly title: string;
  readonly rationale: string;
  readonly expectedGain: string;
  readonly riskIfDone: string;
  readonly riskIfNotDone: string;
  readonly status: ImprovementStatus;
  readonly proposedAt: string;
  readonly requiresApproval: boolean;
  readonly affectedComponents: readonly string[];
  readonly canAutoImplement: boolean; // always false for prediction engine changes
}

/** Proposal types that touch the prediction engine — never auto-implementable. */
const PREDICTION_ENGINE_TYPES: readonly ImprovementProposalType[] = [
  "CALIBRATION_REVIEW",
  "MODEL_SWAP",
];

// ─── Creation ─────────────────────────────────────────────────────────────────

// Creates a PROPOSED improvement with a deterministic id. Enforces the
// prediction-engine invariant: calibration/model proposals can never auto-implement.
export function proposeImprovement(
  fields: Omit<ImprovementProposal, "id" | "status">
): ImprovementProposal {
  const stamp = fields.proposedAt.replace(/[:.TZ-]/g, "");
  const slug = fields.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const touchesEngine =
    PREDICTION_ENGINE_TYPES.includes(fields.type) ||
    fields.affectedComponents.some((c) => c.includes("prediction-engine"));

  return {
    ...fields,
    id: `improve-${fields.type.toLowerCase()}-${slug}-${stamp}`,
    status: "PROPOSED",
    requiresApproval: true,
    canAutoImplement: touchesEngine ? false : fields.canAutoImplement,
  };
}

// ─── Invariants ───────────────────────────────────────────────────────────────

// False for calibration/model-swap proposals and anything touching the
// prediction engine — those always require owner approval and validation.
export function canAutoImplement(proposal: ImprovementProposal): boolean {
  if (PREDICTION_ENGINE_TYPES.includes(proposal.type)) return false;
  if (proposal.affectedComponents.some((c) => c.includes("prediction-engine"))) {
    return false;
  }
  return proposal.canAutoImplement;
}

// ─── Standing proposals ───────────────────────────────────────────────────────

// The standing proposal: review settled-pick calibration on a regular cadence.
export function getSettledPicksImprovementProposal(): ImprovementProposal {
  return {
    id: "improve-calibration_review-settled-picks-standing",
    type: "CALIBRATION_REVIEW",
    title: "Review settled-pick calibration against confidence buckets",
    rationale:
      "Settled picks accumulate in the canonical ledger. Comparing observed hit " +
      "rates per confidence bucket against expectations detects drift early.",
    expectedGain:
      "Earlier detection of calibration drift; evidence base for any future " +
      "model adjustment proposal.",
    riskIfDone:
      "Low — the review is read-only analysis. Risk only arises if findings are " +
      "applied without validation, which the loop forbids.",
    riskIfNotDone:
      "Confidence scores drift from reality, eroding the calibrated 0-100 scale " +
      "and any future public trust claims.",
    status: "PROPOSED",
    proposedAt: "2026-06-12T00:00:00.000Z",
    requiresApproval: true,
    affectedComponents: ["packages/prediction-engine", "calibration review process"],
    canAutoImplement: false,
  };
}

// ─── Status ───────────────────────────────────────────────────────────────────

export interface ImprovementLoopStatus {
  readonly isActive: boolean;
  readonly proposals: readonly ImprovementProposal[];
  readonly truth: string;
  readonly canAutomaticallyAdjustPredictionEngine: false;
}

// Honest loop posture: not active; one standing proposal; engine never auto-adjusted.
export function buildImprovementLoopStatus(): ImprovementLoopStatus {
  return {
    isActive: false,
    proposals: [getSettledPicksImprovementProposal()],
    truth:
      "The improvement loop is designed but not active. No automated feedback " +
      "adjusts the prediction engine from settled results — calibration review " +
      "is manual and every change is a proposal requiring owner approval plus " +
      "out-of-sample validation.",
    canAutomaticallyAdjustPredictionEngine: false,
  };
}

// ─── Owner summary ────────────────────────────────────────────────────────────

// Compact owner-facing summary of improvement proposals by status.
export function summarizeImprovementsForOwner(
  proposals: readonly ImprovementProposal[]
): string {
  if (proposals.length === 0) {
    return "No improvement proposals on file. The loop is designed but not active.";
  }

  const byStatus = new Map<string, number>();
  for (const p of proposals) {
    byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
  }
  const parts = Array.from(byStatus.entries()).map(([s, n]) => `${n} ${s}`);
  const autoCount = proposals.filter((p) => canAutoImplement(p)).length;

  return (
    `${proposals.length} improvement proposal${proposals.length === 1 ? "" : "s"} ` +
    `(${parts.join(", ")}). ${autoCount} auto-implementable. The prediction engine ` +
    "is never adjusted automatically."
  );
}
