/**
 * Cost Governor — every paid operation must have a REASON, and is blocked by default.
 *
 * Agent-built platforms die from "small" recurring spend (cron, previews, LLM calls,
 * raw-JSON storage, image gen) more often than from one big bill. The governor makes
 * spend a deliberate, justified decision: a paid operation is BLOCKED unless it cites a
 * valid justification, a free rights-cleared source forces it back to the free path,
 * and "owner approved" only counts when approval was actually granted (never inferred).
 *
 * Pure, no I/O — a policy decision function plus a throwing guard for hot paths.
 */

export type PaidOperationType =
  | "odds_api"
  | "llm"
  | "storage"
  | "deploy"
  | "image_generation"
  | "observability"
  | "external_api";

export type JustificationCode =
  | "no_free_cleared_source"
  | "required_for_proof"
  | "required_for_revenue"
  | "user_facing_value"
  | "owner_approved"
  | "blocked";

export interface CostRequest {
  readonly operation: PaidOperationType;
  readonly justification: JustificationCode;
  /**
   * True when a free, rights-cleared source already covers this need. Free-first
   * doctrine: if it's covered for free, the paid op is blocked regardless of any other
   * justification. (Applies to data ops; harmless for the rest, which won't set it.)
   */
  readonly freeClearedSourceAvailable?: boolean;
  /** Explicit owner approval — REQUIRED for the owner_approved justification to count. */
  readonly ownerApproved?: boolean;
  readonly estimateUsd?: number;
  readonly note?: string;
}

export type CostDecision = "ALLOW" | "BLOCK";

export interface CostRuling {
  readonly decision: CostDecision;
  readonly operation: PaidOperationType;
  readonly justification: JustificationCode;
  readonly reason: string;
}

const VALID_JUSTIFICATIONS: ReadonlySet<JustificationCode> = new Set([
  "no_free_cleared_source",
  "required_for_proof",
  "required_for_revenue",
  "user_facing_value",
  "owner_approved",
]);

/**
 * Rule a paid operation ALLOW or BLOCK. Default posture is BLOCK; ALLOW requires a
 * valid justification, no free cleared alternative, and (for owner_approved) real approval.
 */
export function governCost(req: CostRequest): CostRuling {
  const base = { operation: req.operation, justification: req.justification } as const;

  // 1. Explicit block, or any non-justifying code → blocked.
  if (req.justification === "blocked" || !VALID_JUSTIFICATIONS.has(req.justification)) {
    return { ...base, decision: "BLOCK", reason: "No valid justification — paid operations are blocked by default." };
  }

  // 2. Free-first: a free, rights-cleared source forces the paid op back to free.
  if (req.freeClearedSourceAvailable === true) {
    return {
      ...base,
      decision: "BLOCK",
      reason: "A free, rights-cleared source covers this need — escalating to paid is not justified.",
    };
  }

  // 3. Owner approval must be explicit, never inferred from the code alone.
  if (req.justification === "owner_approved" && req.ownerApproved !== true) {
    return {
      ...base,
      decision: "BLOCK",
      reason: "Justification claims owner approval, but approval was not explicitly granted.",
    };
  }

  return { ...base, decision: "ALLOW", reason: `Allowed: ${req.justification}.` };
}

/** Throwing guard for runtime hot paths — refuses to perform a blocked paid operation. */
export function requirePaidOperation(req: CostRequest): void {
  const ruling = governCost(req);
  if (ruling.decision === "BLOCK") {
    throw new Error(`cost-governor: ${req.operation} blocked — ${ruling.reason}`);
  }
}
