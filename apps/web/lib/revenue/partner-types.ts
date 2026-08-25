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

/*
 * Runtime union guards.
 *
 * The fences receive `RevenueOffer` / `RevenuePartner` shapes inside
 * `FenceInput.metadata`, which is `Record<string, unknown>` — arbitrary caller
 * data. A `typeof x === "string"` check is NOT enough there: the policy code
 * below compares union members with `===` (`riskClass === "high"`,
 * `HIGH_RISK_PARTNER_CATEGORIES.includes(category)`), so an off-union string
 * such as "critical" or "Sportsbook" makes a regulated offer read as low-risk
 * and skips responsible-gaming review entirely.
 *
 * Each table is `Record<Union, true>`, so adding a member to one of the unions
 * above fails the build until the table is updated — the guards cannot drift
 * out of sync with the types.
 */

const REVENUE_PARTNER_CATEGORY_TABLE = {
  ai_tool: true,
  cloud_tool: true,
  creator_tool: true,
  dfs: true,
  fantasy_tool: true,
  general_sponsor: true,
  local_sponsor: true,
  newsletter_tool: true,
  podcast_tool: true,
  sports_cards: true,
  sports_data: true,
  sportsbook: true,
} as const satisfies Record<RevenuePartnerCategory, true>;

const REVENUE_APPROVAL_STATUS_TABLE = {
  approved: true,
  expired: true,
  rejected: true,
  suspended: true,
  unreviewed: true,
} as const satisfies Record<RevenueApprovalStatus, true>;

const REVENUE_SURFACE_TABLE = {
  api_docs: true,
  blog: true,
  internal_only: true,
  media_kit: true,
  newsletter: true,
  partners_page: true,
  podcast: true,
  short_form: true,
  youtube: true,
} as const satisfies Record<RevenueSurface, true>;

const REVENUE_OFFER_RISK_CLASS_TABLE = {
  high: true,
  low: true,
  medium: true,
} as const satisfies Record<RevenueOfferRiskClass, true>;

/**
 * True when `value` is a key of `table`. Uses hasOwnProperty rather than a
 * truthiness lookup so inherited Object.prototype keys ("toString",
 * "constructor", …) are not mistaken for union members.
 */
function isUnionMember<T extends string>(table: Record<T, true>, value: unknown): value is T {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(table, value);
}

export function isRevenuePartnerCategory(value: unknown): value is RevenuePartnerCategory {
  return isUnionMember(REVENUE_PARTNER_CATEGORY_TABLE, value);
}

export function isRevenueApprovalStatus(value: unknown): value is RevenueApprovalStatus {
  return isUnionMember(REVENUE_APPROVAL_STATUS_TABLE, value);
}

export function isRevenueSurface(value: unknown): value is RevenueSurface {
  return isUnionMember(REVENUE_SURFACE_TABLE, value);
}

export function isRevenueOfferRiskClass(value: unknown): value is RevenueOfferRiskClass {
  return isUnionMember(REVENUE_OFFER_RISK_CLASS_TABLE, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSurfaceList(value: unknown): value is readonly RevenueSurface[] {
  return Array.isArray(value) && value.every(isRevenueSurface);
}

/** An absent optional field is valid; a present one must match `check`. */
function optional(value: unknown, check: (v: unknown) => boolean): boolean {
  return value === undefined || check(value);
}

const isString = (v: unknown): boolean => typeof v === "string";
const isBoolean = (v: unknown): boolean => typeof v === "boolean";
const isStringList = (v: unknown): boolean => Array.isArray(v) && v.every(isString);

/**
 * Narrow untrusted input to a `RevenuePartner`, validating union membership and
 * every optional field that is present. Returns null when the value is not a
 * well-formed partner. Pure, total, never throws.
 */
export function parseRevenuePartner(value: unknown): RevenuePartner | null {
  if (!isRecord(value)) return null;
  if (typeof value["id"] !== "string" || typeof value["displayName"] !== "string") return null;
  if (!isRevenuePartnerCategory(value["category"])) return null;
  if (!isRevenueApprovalStatus(value["approvalStatus"])) return null;
  if (!isSurfaceList(value["allowedSurfaces"])) return null;
  if (typeof value["disclosureRequired"] !== "boolean") return null;
  if (!optional(value["approvedAt"], isString)) return null;
  if (!optional(value["expiresAt"], isString)) return null;
  if (!optional(value["notes"], isStringList)) return null;
  return value as unknown as RevenuePartner;
}

/**
 * Narrow untrusted input to a `RevenueOffer`, validating union membership and
 * every optional field that is present — including the booleans
 * `containsDepositLanguage` / `containsContestOrPrizeLanguage`, which
 * `isHighRiskOffer` compares with `=== true` and which therefore fail open if a
 * string slips through. Returns null when the value is not a well-formed offer.
 * Pure, total, never throws.
 */
export function parseRevenueOffer(value: unknown): RevenueOffer | null {
  if (!isRecord(value)) return null;
  if (
    typeof value["id"] !== "string" ||
    typeof value["partnerId"] !== "string" ||
    typeof value["publicName"] !== "string"
  ) {
    return null;
  }
  if (!isRevenuePartnerCategory(value["category"])) return null;
  if (!isRevenueApprovalStatus(value["approvalStatus"])) return null;
  if (!isRevenueOfferRiskClass(value["riskClass"])) return null;
  if (!isSurfaceList(value["allowedSurfaces"])) return null;
  if (!optional(value["termsUrl"], isString)) return null;
  if (!optional(value["disclosureText"], isString)) return null;
  if (!optional(value["responsibleGamingText"], isString)) return null;
  if (!optional(value["minimumAge"], (v) => typeof v === "number" && Number.isFinite(v))) return null;
  if (!optional(value["eligibleStates"], isStringList)) return null;
  if (!optional(value["restrictedStates"], isStringList)) return null;
  if (!optional(value["approvedAt"], isString)) return null;
  if (!optional(value["expiresAt"], isString)) return null;
  if (!optional(value["containsDepositLanguage"], isBoolean)) return null;
  if (!optional(value["containsContestOrPrizeLanguage"], isBoolean)) return null;
  return value as unknown as RevenueOffer;
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
