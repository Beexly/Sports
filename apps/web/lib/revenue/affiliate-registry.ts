/**
 * Affiliate registry — Workstream M2.
 *
 * Compliance-first: every partner needs owner approval + disclosure language
 * before activation. Sportsbook/casino = high-risk, deferred by default.
 *
 * Honest-empty today: no active affiliate relationships.
 * Add entries only after: (a) owner approval, (b) compliance review,
 * (c) geo/state restrictions confirmed, (d) disclosure language drafted.
 */

export type CommissionType =
  | "cpa"         // cost-per-acquisition (fixed per sign-up)
  | "rev_share"   // percentage of revenue generated
  | "flat_fee"    // flat monthly/campaign fee
  | "hybrid";     // CPA + rev-share combo

export type AffiliateCategory =
  | "fantasy_tools"
  | "sports_analytics"
  | "sports_apparel"
  | "ticketing"
  | "sports_nutrition"
  | "creator_tools"
  | "sports_media"
  | "training_equipment"
  | "sports_bar_league"
  | "newsletter_swap"
  | "sportsbook"      // HIGH RISK — deferred; requires full compliance review
  | "casino"          // HIGH RISK — deferred; requires full compliance review
  | "other";

/** Risk rating drives the approval gate threshold */
export type RiskRating =
  | "low"       // no gambling / wagering exposure; minimal regulatory risk
  | "medium"    // some regulatory nuance; geo restrictions possible
  | "high"      // sportsbook/casino/wagering adjacent; full compliance required
  | "deferred"; // compliance review not yet started; cannot activate

export type OwnerApprovalStatus =
  | "approved"     // owner has signed off; ready to activate once all fields set
  | "pending"      // submitted; awaiting owner review
  | "not_submitted"// not yet brought to the owner gate
  | "declined";    // owner declined for this cycle

export type AffiliatePartner = {
  id: string;
  partner: string;
  category: AffiliateCategory;
  commissionType: CommissionType | null;
  /** E.g. "United States" or specific states; null = not yet assessed */
  geoRestrictions: string | null;
  /**
   * FTC-compliant disclosure language that MUST appear on every placement.
   * Must be set before activation. null = not yet drafted.
   */
  disclosureLanguage: string | null;
  riskRating: RiskRating;
  /**
   * Where the affiliate link/mention is approved to appear.
   * null = not approved for any placement yet.
   */
  approvedPlacement: string | null;
  ownerApprovalStatus: OwnerApprovalStatus;
  /** ISO date string when entry was created */
  createdAt: string;
  notes: string | null;
};

/**
 * The affiliate partner registry.
 *
 * HONESTY RULE: This list is empty at launch because there are no active
 * affiliate relationships. Add entries only after the full compliance gate
 * (disclosure language, owner approval, geo review). Never fabricate a partner.
 */
const AFFILIATE_PARTNERS: readonly AffiliatePartner[] = [];
// No affiliate partners active or in review yet.

export type AffiliateRegistrySummary = {
  total: number;
  active: number;
  pendingApproval: number;
  deferred: number;
  partners: readonly AffiliatePartner[];
  compliancePosture: string;
  note: string;
};

/**
 * Load the affiliate registry for cockpit display.
 */
export function loadAffiliateRegistry(): AffiliateRegistrySummary {
  const active = AFFILIATE_PARTNERS.filter(
    (p) => p.ownerApprovalStatus === "approved"
  ).length;

  const pendingApproval = AFFILIATE_PARTNERS.filter(
    (p) =>
      p.ownerApprovalStatus === "pending" ||
      p.ownerApprovalStatus === "not_submitted"
  ).length;

  const deferred = AFFILIATE_PARTNERS.filter(
    (p) => p.riskRating === "deferred" || p.riskRating === "high"
  ).length;

  return {
    total: AFFILIATE_PARTNERS.length,
    active,
    pendingApproval,
    deferred,
    partners: AFFILIATE_PARTNERS,
    compliancePosture:
      "Every partner requires: (1) owner approval, (2) FTC-compliant disclosure language, " +
      "(3) geo/state restrictions confirmed, (4) approved placement defined. " +
      "Sportsbook and casino affiliates are high-risk and deferred — full compliance review " +
      "and geo-restriction mapping required before any use.",
    note:
      AFFILIATE_PARTNERS.length === 0
        ? "No affiliate relationships active or in review. Add entries after the compliance gate: owner approval + disclosure language + geo review."
        : `${AFFILIATE_PARTNERS.length} partner(s) in registry.`,
  };
}

/** Required fields before any affiliate can be activated */
export const ACTIVATION_REQUIREMENTS = [
  "disclosureLanguage must be set (FTC-compliant, exact wording)",
  "ownerApprovalStatus must be 'approved'",
  "geoRestrictions must be confirmed (not null)",
  "approvedPlacement must be defined",
  "riskRating must not be 'deferred'",
] as const;

/** High-risk categories — cannot activate without full compliance review */
export const HIGH_RISK_CATEGORIES: readonly AffiliateCategory[] = [
  "sportsbook",
  "casino",
];
