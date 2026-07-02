/**
 * Promotions — Public Payload Shapes
 *
 * Defines the shape of the public marketplace response and the helper that
 * filters/normalizes raw Promotion rows into the public payload. Anything not
 * exposed here is private to the operator surface.
 *
 * Rule: the public response is computed from `evaluatePromotionForPublish`.
 * If anything in the row fails the gate, it is *omitted* — never blanked out
 * inline — and the failure is surfaced to the operator cockpit instead.
 */

import type { Promotion } from "@prisma/client";
import { evaluatePromotionForPublish, parseStateList } from "./guards";

export interface PublicPromotion {
  readonly id: string;
  readonly slug: string;
  readonly sportsbookKey: string;
  readonly operatorName: string;
  readonly headline: string;
  readonly offerSummary: string;
  readonly offerCategory: string;
  /** Only present when an affiliate URL is configured; never fabricated. */
  readonly affiliateUrl: string | null;
  readonly termsUrl: string;
  readonly promoCode: string | null;
  readonly eligibleStates: readonly string[];
  readonly minimumAge: number;
  readonly disclosureText: string;
  readonly responsibleGamingText: string;
  readonly expiresAt: string | null;
}

export interface PublicPromotionsResponse {
  readonly success: boolean;
  readonly data: readonly PublicPromotion[];
  readonly meta: {
    readonly total: number;
    readonly filteredCount: number;
    readonly state: string | null;
    readonly notice: string;
  };
}

const PUBLIC_NOTICE =
  "Sportsbook promotions shown here are listed for informational purposes. " +
  "Terms apply at the operator. 21+ where applicable. If you or someone you know " +
  "has a gambling problem, help is available: 1-800-GAMBLER.";

/**
 * Convert a raw Promotion row into the public payload shape, *only* if it
 * passes every compliance gate. Returns null otherwise.
 */
export function toPublicPromotion(
  promo: Promotion,
  options: { now?: Date; state?: string | null } = {}
): PublicPromotion | null {
  const verdict = evaluatePromotionForPublish(promo, options);
  if (!verdict.publishable) return null;

  // The non-null assertions are safe because the gate verified each field.
  return {
    id: promo.id,
    slug: promo.slug,
    sportsbookKey: promo.sportsbookKey,
    operatorName: promo.operatorName,
    headline: promo.headline,
    offerSummary: promo.offerSummary,
    offerCategory: promo.offerCategory,
    affiliateUrl: promo.affiliateUrl ?? null,
    termsUrl: promo.termsUrl!,
    promoCode: promo.promoCode ?? null,
    eligibleStates: parseStateList(promo.eligibleStates),
    minimumAge: promo.minimumAge,
    disclosureText: promo.disclosureText!,
    responsibleGamingText: promo.responsibleGamingText!,
    expiresAt: promo.expiresAt ? promo.expiresAt.toISOString() : null,
  };
}

export function buildPublicPromotionsResponse(
  rows: readonly Promotion[],
  options: { now?: Date; state?: string | null } = {}
): PublicPromotionsResponse {
  const filtered: PublicPromotion[] = [];
  for (const row of rows) {
    const payload = toPublicPromotion(row, options);
    if (payload) filtered.push(payload);
  }
  return {
    success: true,
    data: Object.freeze(filtered),
    meta: {
      total: rows.length,
      filteredCount: filtered.length,
      state: options.state ?? null,
      notice: PUBLIC_NOTICE,
    },
  };
}

export const PUBLIC_PROMOTIONS_NOTICE = PUBLIC_NOTICE;
