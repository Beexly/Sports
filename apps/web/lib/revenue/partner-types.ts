export type RevenuePartnerCategory =
  | "sportsbook"
  | "dfs"
  | "fantasy_tool"
  | "sports_data"
  | "sports_cards"
  | "creator_tool"
  | "ai_tool"
  | "newsletter_tool"
  | "podcast_tool"
  | "cloud_tool"
  | "local_sponsor"
  | "general_sponsor";

export type RevenueApprovalStatus = "unreviewed" | "approved" | "rejected" | "suspended" | "expired";

export type RevenueSurface =
  | "media_kit"
  | "partners_page"
  | "newsletter"
  | "youtube"
  | "short_form"
  | "podcast"
  | "blog"
  | "api_docs"
  | "internal_only";

export type RevenueOfferRiskClass = "low" | "medium" | "high";

export type RevenueMotion = "affiliate" | "sponsor" | "content_collab" | "api_beta" | "local_sponsor" | "reject";

export interface RevenuePartner {
  readonly id: string;
  readonly displayName: string;
  readonly category: RevenuePartnerCategory;
  readonly approvalStatus: RevenueApprovalStatus;
  readonly approvedAt?: string;
  readonly expiresAt?: string;
  readonly allowedSurfaces: readonly RevenueSurface[];
  readonly disclosureRequired: boolean;
  readonly notes?: readonly string[];
}

export interface RevenueOffer {
  readonly id: string;
  readonly partnerId: string;
  readonly publicName: string;
  readonly category: RevenuePartnerCategory;
  readonly approvalStatus: RevenueApprovalStatus;
  readonly riskClass: RevenueOfferRiskClass;
  readonly allowedSurfaces: readonly RevenueSurface[];
  readonly termsUrl?: string;
  readonly disclosureText?: string;
  readonly responsibleGamingText?: string;
  readonly minimumAge?: number;
  readonly eligibleStates?: readonly string[];
  readonly restrictedStates?: readonly string[];
  readonly approvedAt?: string;
  readonly expiresAt?: string;
  readonly containsDepositLanguage?: boolean;
  readonly containsContestOrPrizeLanguage?: boolean;
}

export const HIGH_RISK_PARTNER_CATEGORIES = ["sportsbook", "dfs"] as const satisfies readonly RevenuePartnerCategory[];

export function isHighRiskPartnerCategory(category: RevenuePartnerCategory): boolean {
  return HIGH_RISK_PARTNER_CATEGORIES.includes(category as (typeof HIGH_RISK_PARTNER_CATEGORIES)[number]);
}

export function isHighRiskOffer(offer: RevenueOffer): boolean {
  return (
    offer.riskClass === "high" ||
    isHighRiskPartnerCategory(offer.category) ||
    offer.containsDepositLanguage === true ||
    offer.containsContestOrPrizeLanguage === true
  );
}

export function hasExpired(expiresAt: string | undefined, now: Date): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() <= now.getTime();
}

export function normalizedState(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(trimmed) ? trimmed : undefined;
}
