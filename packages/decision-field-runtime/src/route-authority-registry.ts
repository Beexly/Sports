/**
 * ROUTE AUTHORITY REGISTRY — surface area, but authority-gated.
 *
 * Scores24's power is page count. GSE answers with a page FACTORY where every route declares what it is
 * allowed to publish: live, preview, fixture, owner-gated, data-gated, rights-gated, or do-not-publish —
 * and bonus routes are compliance-gated, prediction routes require trial support, trend routes require
 * passport support. No route may exist without an authority status. Fixture-safe registry.
 *
 * Forbidden-copy is expressed as RULE IDs (categories), never the banned literals themselves, so the
 * registry can be the index without becoming a denylist of phrases.
 *
 * Pure + deterministic. Spec: docs/product/SEO_ROUTE_FACTORY.md.
 */

export type RouteStatus = "LIVE_ALLOWED" | "PREVIEW_ALLOWED" | "FIXTURE_ONLY" | "OWNER_GATED" | "DATA_GATED" | "RIGHTS_GATED" | "DO_NOT_PUBLISH";

/** Named copy-rule categories (not the literal phrases) a route forbids. */
export type CopyRule = "CERTAINTY" | "LIVE_CLAIM" | "BEST_WITHOUT_CRITERIA" | "SAFEST_WITHOUT_CRITERIA" | "NO_LOSS_WITHOUT_CAVEAT" | "PROFIT_PROMISE" | "PARLAY_PUSH" | "PROVEN_PERFORMANCE";

export interface RouteAuthority {
  readonly pattern: string;
  readonly family: string;
  readonly userIntent: string;
  readonly status: RouteStatus;
  readonly requiresComplianceReview: boolean; // bonus/sportsbook routes
  readonly requiresPredictionTrial: boolean; // prediction routes
  readonly requiresTrendPassport: boolean; // trend routes
  readonly forbiddenCopyRules: readonly CopyRule[];
}

export const ROUTE_AUTHORITY_REGISTRY: readonly RouteAuthority[] = [
  { pattern: "/matches/preview/[slug]", family: "match-center", userIntent: "see a match's anatomy", status: "FIXTURE_ONLY", requiresComplianceReview: false, requiresPredictionTrial: true, requiresTrendPassport: true, forbiddenCopyRules: ["CERTAINTY", "LIVE_CLAIM"] },
  { pattern: "/matches/[sport]/[eventId]", family: "match-center", userIntent: "live match center", status: "DATA_GATED", requiresComplianceReview: false, requiresPredictionTrial: true, requiresTrendPassport: true, forbiddenCopyRules: ["CERTAINTY"] },
  { pattern: "/predictions/[sport]", family: "prediction", userIntent: "predictions on trial", status: "PREVIEW_ALLOWED", requiresComplianceReview: false, requiresPredictionTrial: true, requiresTrendPassport: false, forbiddenCopyRules: ["CERTAINTY"] },
  { pattern: "/trends/[sport]", family: "trend", userIntent: "trends with fragility", status: "PREVIEW_ALLOWED", requiresComplianceReview: false, requiresPredictionTrial: false, requiresTrendPassport: true, forbiddenCopyRules: ["CERTAINTY"] },
  { pattern: "/tools/slip-mri", family: "tool", userIntent: "diagnose a slip's risk", status: "PREVIEW_ALLOWED", requiresComplianceReview: false, requiresPredictionTrial: false, requiresTrendPassport: false, forbiddenCopyRules: ["PARLAY_PUSH", "PROFIT_PROMISE", "CERTAINTY"] },
  { pattern: "/bonuses", family: "bonus-affiliate", userIntent: "compare offers safely", status: "OWNER_GATED", requiresComplianceReview: true, requiresPredictionTrial: false, requiresTrendPassport: false, forbiddenCopyRules: ["NO_LOSS_WITHOUT_CAVEAT", "BEST_WITHOUT_CRITERIA", "CERTAINTY"] },
  { pattern: "/sportsbooks", family: "ratings", userIntent: "bookmaker evidence cards", status: "OWNER_GATED", requiresComplianceReview: true, requiresPredictionTrial: false, requiresTrendPassport: false, forbiddenCopyRules: ["BEST_WITHOUT_CRITERIA", "SAFEST_WITHOUT_CRITERIA"] },
  { pattern: "/proof/stat-passports", family: "proof", userIntent: "inspect the stats", status: "PREVIEW_ALLOWED", requiresComplianceReview: false, requiresPredictionTrial: false, requiresTrendPassport: false, forbiddenCopyRules: ["CERTAINTY"] },
  { pattern: "/proof/prediction-trials", family: "proof", userIntent: "see predictions graded", status: "PREVIEW_ALLOWED", requiresComplianceReview: false, requiresPredictionTrial: true, requiresTrendPassport: false, forbiddenCopyRules: ["CERTAINTY", "PROVEN_PERFORMANCE"] },
];

/** Validate the registry — every route must declare a status and meet its family's gates. */
export function validateRouteAuthority(routes: readonly RouteAuthority[] = ROUTE_AUTHORITY_REGISTRY): { ok: boolean; problems: readonly string[] } {
  const problems: string[] = [];
  for (const r of routes) {
    if (!r.status) problems.push(`${r.pattern}: no authority status`);
    if (r.family === "bonus-affiliate" || r.family === "ratings") {
      if (!r.requiresComplianceReview) problems.push(`${r.pattern}: bonus/ratings route must require compliance review`);
      if (r.status === "LIVE_ALLOWED" || r.status === "PREVIEW_ALLOWED") problems.push(`${r.pattern}: bonus/ratings route must be OWNER_GATED until configured`);
    }
    if (r.family === "prediction" && !r.requiresPredictionTrial) problems.push(`${r.pattern}: prediction route must require trial support`);
    if (r.family === "trend" && !r.requiresTrendPassport) problems.push(`${r.pattern}: trend route must require trend-passport support`);
  }
  return { ok: problems.length === 0, problems };
}
