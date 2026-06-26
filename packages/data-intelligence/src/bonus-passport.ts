/**
 * BONUS / OFFER INTEGRITY — GSE's rights-safe, compliance-gated answer to sportsbook bonus pages.
 *
 * Scores24 monetizes hard through bonus cards and "best sportsbook" rankings. GSE's version is honest by
 * construction: an offer cannot be displayed unless it was verified (has a `lastVerifiedAt`), its
 * jurisdiction was checked, and a responsible-gaming disclaimer is attached; an affiliate link is NEVER
 * surfaced unless the owner has configured it; "best" requires a stated methodology; and "risk-free"
 * copy is rejected unless an explaining caveat is present. GSE never operates betting — it documents
 * offers. Fixture-only here (affiliate OFF), no live data, no network.
 *
 * Pure + deterministic. Spec: docs/product/BONUS_OFFER_INTEGRITY.md.
 */

export type LegalityStatus = "VERIFIED_LEGAL" | "VERIFIED_RESTRICTED" | "UNVERIFIED" | "UNKNOWN";

export interface BonusInput {
  readonly offerId: string;
  readonly bookmaker: string;
  readonly jurisdiction: string; // e.g. "US-NJ", "Ontario"
  readonly bonusType: string; // "welcome" | "free-bet" | "deposit-match" | ...
  readonly headline: string;
  readonly promoCode?: string | null;
  readonly minDeposit?: number | null;
  readonly maxBonus?: number | null;
  readonly rolloverRequirement?: string | null; // e.g. "1x", "10x"
  readonly expiry?: string | null;
  readonly eligibleUsers?: string | null;
  readonly paymentRestrictions?: string | null;
  readonly termsUrl?: string | null;
  readonly affiliateUrl?: string | null;
  /** Owner switch — affiliate links are NEVER surfaced unless this is true. */
  readonly affiliateConfigured: boolean;
  /** Required to display as "current" — null means unverified, cannot show. */
  readonly lastVerifiedAt?: string | null;
  readonly legalityStatus: LegalityStatus;
  readonly riskNotes?: string | null;
}

export interface BonusPassport {
  readonly offerId: string;
  readonly bookmaker: string;
  readonly jurisdiction: string;
  readonly bonusType: string;
  readonly headline: string;
  readonly promoCode: string | null;
  readonly minDeposit: number | null;
  readonly maxBonus: number | null;
  readonly rolloverRequirement: string | null;
  readonly expiry: string | null;
  readonly eligibleUsers: string | null;
  readonly paymentRestrictions: string | null;
  readonly termsUrl: string | null;
  readonly affiliateUrl: string | null; // null unless affiliateConfigured
  readonly affiliateConfigured: boolean;
  readonly lastVerifiedAt: string | null;
  readonly legalityStatus: LegalityStatus;
  readonly legalityLabel: string;
  readonly riskNotes: string | null;
  readonly displayAllowed: boolean;
  readonly displayBlockedReasons: readonly string[];
  readonly disclaimer: string;
  readonly responsibleGamingRequired: true;
  readonly fixtureWatermarked: true;
}

const RG_DISCLAIMER = "21+ where applicable. Gambling involves risk. Verify all terms on the sportsbook's own site. If gambling is a problem, help is available — see the National Problem Gambling Helpline.";
const RISK_FREE = /\brisk[-\s]?free\b/i;
const CAVEAT = /(terms apply|subject to|conditions|see terms|net loss|bonus bet|non-withdrawable)/i;

export function buildBonusPassport(i: BonusInput): BonusPassport {
  const reasons: string[] = [];
  if (i.lastVerifiedAt == null) reasons.push("not verified (no lastVerifiedAt) — cannot be shown as current");
  if (i.legalityStatus === "UNKNOWN" || i.legalityStatus === "UNVERIFIED") reasons.push("jurisdiction legality not verified");
  // "risk-free" headline is rejected unless an explaining caveat is present.
  if (RISK_FREE.test(i.headline) && !CAVEAT.test(`${i.headline} ${i.riskNotes ?? ""}`)) {
    reasons.push('a "no-loss" promotional claim without an explaining caveat');
  }
  const displayAllowed = reasons.length === 0;

  const legalityLabel =
    i.legalityStatus === "VERIFIED_LEGAL" ? "Verified available in this jurisdiction"
    : i.legalityStatus === "VERIFIED_RESTRICTED" ? "Verified — restricted/limited here"
    : "Legality NOT verified — do not assume availability";

  return {
    offerId: i.offerId,
    bookmaker: i.bookmaker,
    jurisdiction: i.jurisdiction,
    bonusType: i.bonusType,
    headline: i.headline,
    promoCode: i.promoCode ?? null,
    minDeposit: i.minDeposit ?? null,
    maxBonus: i.maxBonus ?? null,
    rolloverRequirement: i.rolloverRequirement ?? null,
    expiry: i.expiry ?? null,
    eligibleUsers: i.eligibleUsers ?? null,
    paymentRestrictions: i.paymentRestrictions ?? null,
    termsUrl: i.termsUrl ?? null,
    // affiliate link NEVER surfaces unless the owner configured it.
    affiliateUrl: i.affiliateConfigured ? (i.affiliateUrl ?? null) : null,
    affiliateConfigured: i.affiliateConfigured,
    lastVerifiedAt: i.lastVerifiedAt ?? null,
    legalityStatus: i.legalityStatus,
    legalityLabel,
    riskNotes: i.riskNotes ?? null,
    displayAllowed,
    displayBlockedReasons: reasons,
    disclaimer: RG_DISCLAIMER,
    responsibleGamingRequired: true,
    fixtureWatermarked: true,
  };
}

/** The safe public display projection — strips anything not allowed, always carries the disclaimer. */
export function bonusDisplay(p: BonusPassport): {
  readonly canShow: boolean;
  readonly bookmaker: string;
  readonly headline: string | null;
  readonly rollover: string | null;
  readonly minDeposit: number | null;
  readonly legalityLabel: string;
  readonly affiliateUrl: string | null;
  readonly affiliateDisclosure: string | null;
  readonly verifyNote: string;
  readonly disclaimer: string;
} {
  return {
    canShow: p.displayAllowed,
    bookmaker: p.bookmaker,
    headline: p.displayAllowed ? p.headline : null,
    rollover: p.rolloverRequirement,
    minDeposit: p.minDeposit,
    legalityLabel: p.legalityLabel,
    affiliateUrl: p.affiliateUrl, // already gated by config in the passport
    affiliateDisclosure: p.affiliateUrl ? "Affiliate link — GSE may earn a commission. This does not change the offer's terms." : null,
    verifyNote: "Verify all terms on the sportsbook's own site before depositing.",
    disclaimer: p.disclaimer,
  };
}

// ───────────────────────── Bookmaker Rating Passport ─────────────────────────
export interface BookmakerRatingInput {
  readonly bookmaker: string;
  readonly jurisdiction: string;
  readonly licenseStatus: string;
  readonly paymentMethods?: readonly string[];
  readonly withdrawalNotes?: string | null;
  readonly bonusQuality?: number | null; // 0–100
  readonly oddsQuality?: number | null; // 0–100
  readonly userRiskNotes?: string | null;
  readonly ratingMethodology?: string | null; // REQUIRED to show any "rating"
  readonly lastVerifiedAt?: string | null;
}

export interface BookmakerRatingPassport {
  readonly bookmaker: string;
  readonly jurisdiction: string;
  readonly licenseStatus: string;
  readonly paymentMethods: readonly string[];
  readonly withdrawalNotes: string | null;
  readonly bonusQuality: number | null;
  readonly oddsQuality: number | null;
  readonly userRiskNotes: string | null;
  readonly affiliateDisclosure: string;
  readonly ratingMethodology: string | null;
  readonly lastVerifiedAt: string | null;
  /** A numeric rating is only displayable WITH a stated methodology AND verification — no naked "best". */
  readonly ratingDisplayable: boolean;
  readonly displayBlockedReasons: readonly string[];
  readonly fixtureWatermarked: true;
}

export function buildBookmakerRating(i: BookmakerRatingInput): BookmakerRatingPassport {
  const reasons: string[] = [];
  if (i.ratingMethodology == null) reasons.push("no stated rating methodology — cannot publish a rating or call any book 'best'");
  if (i.lastVerifiedAt == null) reasons.push("not verified");
  return {
    bookmaker: i.bookmaker,
    jurisdiction: i.jurisdiction,
    licenseStatus: i.licenseStatus,
    paymentMethods: i.paymentMethods ?? [],
    withdrawalNotes: i.withdrawalNotes ?? null,
    bonusQuality: i.bonusQuality ?? null,
    oddsQuality: i.oddsQuality ?? null,
    userRiskNotes: i.userRiskNotes ?? null,
    affiliateDisclosure: "Ratings are independent of any affiliate relationship; affiliate links, if shown, are disclosed.",
    ratingMethodology: i.ratingMethodology ?? null,
    lastVerifiedAt: i.lastVerifiedAt ?? null,
    ratingDisplayable: reasons.length === 0,
    displayBlockedReasons: reasons,
    fixtureWatermarked: true,
  };
}

/** GSE's posture, asserted in code: GSE documents offers; it does not operate betting. */
export const GSE_BETTING_POSTURE = {
  operatesBetting: false as const,
  takesWagers: false as const,
  statement: "Galaxy Sports Edge is an information service. It does not operate a sportsbook, take wagers, or guarantee outcomes.",
};

// ───────────────────────── Fixtures (affiliate OFF, illustrative) ─────────────────────────
export const BONUS_FIXTURES: readonly BonusInput[] = [
  {
    offerId: "fx-welcome-1", bookmaker: "Fixture Book A", jurisdiction: "US-NJ", bonusType: "deposit-match",
    headline: "Deposit match up to $250 (fixture · illustrative)", promoCode: "FIXTURE", minDeposit: 10, maxBonus: 250,
    rolloverRequirement: "1x", expiry: "fixture", eligibleUsers: "new users", paymentRestrictions: "no e-wallets for bonus",
    termsUrl: null, affiliateUrl: "https://example.invalid/aff", affiliateConfigured: false,
    lastVerifiedAt: "2026-06-26", legalityStatus: "VERIFIED_LEGAL", riskNotes: "Bonus is a deposit match, not cash.",
  },
  {
    // deliberately UNVERIFIED → must be display-blocked
    offerId: "fx-unverified", bookmaker: "Fixture Book B", jurisdiction: "Unknown", bonusType: "free-bet",
    headline: "Unverified bonus (fixture)", affiliateConfigured: false, lastVerifiedAt: null, legalityStatus: "UNKNOWN",
  },
];

export function buildAllBonusPassports(): readonly BonusPassport[] {
  return BONUS_FIXTURES.map(buildBonusPassport);
}
