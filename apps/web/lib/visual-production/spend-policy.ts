/**
 * Visual Production — spend policy & generation gate.
 *
 * Higgsfield/paid generation is BLOCKED BY DEFAULT. It becomes possible only
 * when BOTH env flags are explicitly on AND the per-asset checklist passes. This
 * is the guard that makes accidental credit spend impossible — flags default off,
 * and every reason an asset is blocked is returned explicitly.
 *
 * Pure module — no network, no spend. It never calls Higgsfield; it only decides
 * whether a generation WOULD be allowed.
 */

import type { VisualAsset, ProductionBand } from "./types";

/** Master switches — both must be true to generate. Default off. */
export function isGenerationEnabled(): boolean {
  return process.env["HIGGSFIELD_GENERATION_ENABLED"] === "true";
}
export function isOwnerSpendApproved(): boolean {
  return process.env["OWNER_VISUAL_SPEND_APPROVED"] === "true";
}

/** Minimum reuse count before a paid Higgsfield asset is justified. */
export const MIN_REUSE_FOR_HIGGSFIELD = 4;

/** Map a 0–100 worthiness score to the production band it unlocks. */
export function productionBand(score: number): ProductionBand {
  if (score >= 95) return "premium_campaign_candidate";
  if (score >= 85) return "higgsfield_final_candidate";
  if (score >= 75) return "cheap_motion_test";
  if (score >= 60) return "cheap_stillframes";
  return "code_native_only";
}

export interface GenerationDecision {
  readonly allowed: boolean;
  readonly band: ProductionBand;
  /** Every blocking reason — empty when allowed. */
  readonly blockers: readonly string[];
}

/**
 * Would generating this asset via a paid provider be allowed right now? Returns
 * the full list of blockers so the Film Room can show exactly what's missing.
 */
export function evaluateGeneration(asset: VisualAsset): GenerationDecision {
  const band = productionBand(asset.priorityScore);
  const blockers: string[] = [];

  if (!isGenerationEnabled()) blockers.push("HIGGSFIELD_GENERATION_ENABLED is not true (generation disabled).");
  if (!isOwnerSpendApproved()) blockers.push("OWNER_VISUAL_SPEND_APPROVED is not true (no owner spend approval).");
  if (asset.provider === "higgsfield" && band !== "higgsfield_final_candidate" && band !== "premium_campaign_candidate") {
    blockers.push(`Priority ${asset.priorityScore} (${band}) is below the Higgsfield threshold (85+).`);
  }
  if (asset.provider === "higgsfield" && asset.plannedReuseCount < MIN_REUSE_FOR_HIGGSFIELD) {
    blockers.push(`Planned reuse ${asset.plannedReuseCount} < ${MIN_REUSE_FOR_HIGGSFIELD} (reuse gate).`);
  }
  if (!asset.approvals.productTruthVerified) blockers.push("Product truth not verified.");
  if (!asset.approvals.complianceReviewed) blockers.push("Compliance not reviewed.");
  if (!asset.approvals.rightsReviewed) blockers.push("Rights not reviewed.");
  if (!asset.approvals.overlayPlanned) blockers.push("Truth-overlay plan missing.");
  if (!asset.approvals.reducedMotionPlanned) blockers.push("Reduced-motion fallback missing.");
  if (!asset.approvals.ownerSpendApproved) blockers.push("Owner has not approved this specific asset.");
  if (asset.mediaKind === "motion" && !asset.reducedMotionFallback.trim()) {
    blockers.push("Paid motion requires a reduced-motion fallback.");
  }

  return { allowed: blockers.length === 0, band, blockers };
}
