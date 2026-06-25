/**
 * GALILEO ENGINE — Edge Ledger (Phase 7).
 *
 * Every candidate the engine produces enters the ledger and is bound by promotion rules
 * that make the prior session's lessons UNFORGETTABLE. The under-totals mirage promoted
 * itself on CLV + one in-sample season; the rush-under only earned trust after three
 * out-of-sample seasons AND settlement. The ledger encodes exactly that discipline:
 *
 *   - CLV-only cannot become ACTIVE.
 *   - In-sample-only cannot become ACTIVE.
 *   - One-season-only cannot become ACTIVE.
 *   - FDR-only without OOS cannot become ACTIVE.
 *   - OOS without settlement cannot become ACTIVE.
 *   - Any future-game contamination forces REJECTED until cleaned.
 *   - Any data-quality bug forces a re-run before promotion.
 *
 * A tested gate that FAILED (settlement-negative, OOS-fail, FDR-fail) is REJECTED — a failed
 * hypothesis is a result, not a global "no edge." Pure + deterministic: the same evidence
 * always yields the same allowed status, so promotion is auditable.
 */

export type EdgeStatus =
  | "REJECTED"
  | "WATCHLIST"
  | "SHADOW_COLLECTING"
  | "SHADOW_READY"
  | "ACTIVE";

/** A gate's outcome: passed, failed (tested and lost), or not yet run. */
export type EvidenceStatus = "pass" | "fail" | "not_run";

export interface EdgeCandidate {
  readonly candidateId: string;
  readonly hypothesis: string;
  /** WHY the market may be wrong (structural reason — required; no fishing). */
  readonly structuralReason: string;
  readonly market: string;
  readonly dataWindow: string;
  readonly sampleSize: number;
  readonly seasonsCovered: number;
  /** Did the pick beat the closing line? */
  readonly clv: EvidenceStatus;
  /** Did it settle profitably (≥ break-even on real outcomes)? */
  readonly settlement: EvidenceStatus;
  /** Did it replicate out-of-sample on a different season? */
  readonly oos: EvidenceStatus;
  /** Did it survive multiple-testing (FDR) control? */
  readonly fdr: EvidenceStatus;
  readonly liquidityNote: string;
  /** True once a liquidity check has actually been performed and is acceptable. */
  readonly liquidityChecked: boolean;
  readonly dataQualityClean: boolean;
  readonly futureContamination: boolean;
  readonly reportPath?: string;
  readonly commitHash?: string;
}

export interface LedgerVerdict {
  readonly candidateId: string;
  /** The HIGHEST status this evidence permits. Never exceeds it on promote(). */
  readonly maxStatus: EdgeStatus;
  readonly rejected: boolean;
  readonly needsRerun: boolean;
  /** Human-readable reasons (the audit trail). */
  readonly reasons: readonly string[];
  /** The specific ACTIVE blockers still outstanding. */
  readonly activeBlockers: readonly string[];
}

export interface LedgerOptions {
  readonly minSample?: number;
  /** Minimum independent seasons for ACTIVE. Default 2 ("one-season-only cannot ACTIVE"). */
  readonly minSeasons?: number;
}

const STATUS_RANK: Record<EdgeStatus, number> = {
  REJECTED: 0,
  WATCHLIST: 1,
  SHADOW_COLLECTING: 2,
  SHADOW_READY: 3,
  ACTIVE: 4,
};

const REQUIRED_FIELDS: Array<keyof EdgeCandidate> = [
  "candidateId",
  "hypothesis",
  "structuralReason",
  "market",
  "dataWindow",
];

/** True if the mandatory descriptive fields are present (no anonymous candidates). */
export function requiredFieldsComplete(c: EdgeCandidate): boolean {
  return REQUIRED_FIELDS.every((f) => typeof c[f] === "string" && (c[f] as string).trim().length > 0);
}

/**
 * Evaluate the highest ledger status the candidate's evidence permits, with the full reason
 * trail. This is the single source of truth for promotion — `promote()` cannot exceed it.
 */
export function evaluateLedgerStatus(c: EdgeCandidate, options: LedgerOptions = {}): LedgerVerdict {
  const minSample = options.minSample ?? 100;
  const minSeasons = options.minSeasons ?? 2;
  const reasons: string[] = [];
  const activeBlockers: string[] = [];

  // Hard stops first.
  if (c.futureContamination) {
    return {
      candidateId: c.candidateId,
      maxStatus: "REJECTED",
      rejected: true,
      needsRerun: true,
      reasons: ["Future-game contamination detected — REJECTED until the data is cleaned and re-run."],
      activeBlockers: ["future-contamination"],
    };
  }
  if (!requiredFieldsComplete(c)) {
    return {
      candidateId: c.candidateId || "(missing id)",
      maxStatus: "REJECTED",
      rejected: true,
      needsRerun: false,
      reasons: ["Missing required fields (id/hypothesis/structuralReason/market/dataWindow)."],
      activeBlockers: ["incomplete-record"],
    };
  }
  if (!c.dataQualityClean) {
    return {
      candidateId: c.candidateId,
      maxStatus: "WATCHLIST",
      rejected: false,
      needsRerun: true,
      reasons: ["Data-quality issue present — forced re-run before any promotion. Capped at WATCHLIST."],
      activeBlockers: ["data-quality"],
    };
  }

  // A gate that was tested and FAILED rejects the candidate (a failed hypothesis is a result).
  const failed: string[] = [];
  if (c.settlement === "fail") failed.push("settlement-negative");
  if (c.oos === "fail") failed.push("oos-fail");
  if (c.fdr === "fail") failed.push("fdr-fail");
  if (failed.length > 0) {
    return {
      candidateId: c.candidateId,
      maxStatus: "REJECTED",
      rejected: true,
      needsRerun: false,
      reasons: [`Tested and failed: ${failed.join(", ")}. REJECTED (this hypothesis failed — not a global 'no edge').`],
      activeBlockers: failed,
    };
  }

  // Build the ACTIVE blocker list from the promotion rules.
  if (c.settlement !== "pass") activeBlockers.push("settlement-not-proven");
  if (c.oos !== "pass") activeBlockers.push("oos-not-proven");
  if (c.fdr !== "pass") activeBlockers.push("fdr-not-proven");
  if (c.seasonsCovered < minSeasons) activeBlockers.push(`seasons<${minSeasons}`);
  if (c.sampleSize < minSample) activeBlockers.push(`sample<${minSample}`);
  if (!c.liquidityChecked) activeBlockers.push("liquidity-unchecked");

  // Annotate the canonical rule reasons.
  if (c.clv === "pass" && c.settlement !== "pass") reasons.push("CLV-only (settlement unproven) — cannot be ACTIVE.");
  if (c.settlement !== "pass" && c.oos !== "pass" && c.fdr === "pass") reasons.push("In-sample/FDR-only without OOS — cannot be ACTIVE.");
  if (c.oos === "pass" && c.settlement !== "pass") reasons.push("OOS without settlement — cannot be ACTIVE.");
  if (c.seasonsCovered < minSeasons) reasons.push(`One-season-only (seasons=${c.seasonsCovered} < ${minSeasons}) — cannot be ACTIVE.`);

  let maxStatus: EdgeStatus;
  if (activeBlockers.length === 0) {
    maxStatus = "ACTIVE";
    reasons.push("All gates passed (settlement + OOS + FDR + multi-season + sample + liquidity) — ACTIVE-eligible.");
  } else if (c.fdr === "pass" && (c.settlement === "pass" || c.oos === "pass")) {
    maxStatus = "SHADOW_READY";
    reasons.push("Strong evidence (FDR + settlement-or-OOS) but an ACTIVE blocker remains — SHADOW_READY.");
  } else if (c.clv === "pass" || c.fdr === "pass" || c.oos === "pass" || c.settlement === "pass") {
    maxStatus = "SHADOW_COLLECTING";
    reasons.push("Some positive evidence; more required — SHADOW_COLLECTING.");
  } else {
    maxStatus = "WATCHLIST";
    reasons.push("Structural hypothesis with no positive evidence yet — WATCHLIST.");
  }

  return { candidateId: c.candidateId, maxStatus, rejected: false, needsRerun: false, reasons, activeBlockers };
}

export interface PromotionResult {
  readonly allowed: boolean;
  readonly grantedStatus: EdgeStatus;
  readonly requestedStatus: EdgeStatus;
  readonly reasons: readonly string[];
}

/**
 * Attempt to set a candidate to `requested`. Granted only if the evidence permits at least
 * that status; otherwise the candidate is held at the highest permitted status and the
 * blockers are returned. This is the structural guarantee that nothing reaches ACTIVE without
 * settlement + OOS + FDR + multi-season + sample + liquidity.
 */
export function promote(
  c: EdgeCandidate,
  requested: EdgeStatus,
  options: LedgerOptions = {},
): PromotionResult {
  const verdict = evaluateLedgerStatus(c, options);
  const allowed = STATUS_RANK[requested] <= STATUS_RANK[verdict.maxStatus];
  return {
    allowed,
    grantedStatus: allowed ? requested : verdict.maxStatus,
    requestedStatus: requested,
    reasons: allowed
      ? [`Granted ${requested} (max permitted ${verdict.maxStatus}).`]
      : [`Denied ${requested}; held at ${verdict.maxStatus}. Blockers: ${verdict.activeBlockers.join(", ")}.`, ...verdict.reasons],
  };
}
