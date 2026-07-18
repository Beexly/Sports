/**
 * Promo codes — DRAFT/CONFIG ONLY.
 *
 * Promos are allowed but must never make Galaxy feel desperate. Every code here
 * is INACTIVE by default and NON-STACKABLE, carries compliance copy, and tracks
 * an explicit owner-approval state. This module does NOT create Stripe coupons
 * and does NOT discount anything at runtime — wiring a code to live billing is a
 * separate, owner-approved step (see OWNER_DECISIONS_NEEDED). It exists so the
 * strategy is reviewable and the pricing page can describe founding access
 * honestly.
 *
 * Pure module — no DB, no Stripe, fully unit-testable.
 */

import type { ValueTierId } from "./value-architecture";
import { PRICING_PHASES } from "./pricing-phases";

export type PromoOfferKind = "percent_off_annual" | "founding_rate" | "upgrade_incentive" | "content_unlock";

export interface PromoCode {
  readonly code: string;
  readonly audience: string;
  readonly offer: string;
  readonly offerKind: PromoOfferKind;
  /** Plans the code may apply to. */
  readonly eligiblePlans: readonly ValueTierId[];
  readonly window: string;
  /** Usage cap, or null when limited only by date. */
  readonly usageLimit: number | null;
  /** Hard rule: promos never stack. */
  readonly stackable: false;
  /** Responsible, non-hype compliance line shown wherever the promo appears. */
  readonly complianceCopy: string;
  /** Owner must approve before this can be wired to live billing. */
  readonly ownerApproved: boolean;
  /** Inactive until the owner flips it on AND coupon infra exists. */
  readonly active: boolean;
  /** The metric that, if breached, kills the promo (promo-addiction guard). */
  readonly killSwitchMetric: string;
}

const RG = "Informational only. Subscriptions are for sports intelligence and education, not a guarantee of profit. 21+. Play responsibly.";

// The GALAXYFOUNDING promo describes the FOUNDING phase's rate specifically (it
// stays fixed forever per the grandfather guarantee, independent of whatever
// phase is currently live) — derived from pricing-phases.ts, never hardcoded,
// so the two can never drift apart.
const FOUNDING_PHASE = PRICING_PHASES.find((p) => p.id === "FOUNDING")!;

export const PROMO_CODES: readonly PromoCode[] = [
  {
    code: "FOUNDING50",
    audience: "Founding annual subscribers — first 90 days",
    offer: "50% off the first year on annual Pro or Elite",
    offerKind: "percent_off_annual",
    eligiblePlans: ["PRO", "ELITE"],
    window: "90 days from launch",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    // Owner-approved (Garrett's 90-day / 50%-off-annual decision). Stays inactive
    // until live Stripe coupon infrastructure exists — flip `active` to true once
    // the Stripe secrets are set and the coupon is created.
    ownerApproved: true,
    active: false,
    killSwitchMetric: "90-day founding window elapsed OR annual margin floor breached",
  },
  {
    code: "GALAXYFOUNDING",
    audience: "Founding members during the launch window",
    offer: `Founding rate: Pro $${FOUNDING_PHASE.pro.annual}/yr, Elite $${FOUNDING_PHASE.elite.annual}/yr (owner-approved founding discount)`,
    offerKind: "founding_rate",
    eligiblePlans: ["PRO", "ELITE"],
    window: "Launch / limited founding period",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "founding seats remaining hits 0 OR founding end date passes",
  },
  {
    code: "KICKOFF20",
    audience: "NFL kickoff seasonal",
    offer: "20% off annual only",
    offerKind: "percent_off_annual",
    eligiblePlans: ["PRO", "ELITE"],
    window: "NFL kickoff week",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "annual-discount margin floor breached",
  },
  {
    code: "CFBPREP15",
    audience: "College football prep",
    offer: "15% off annual (or limited preview access)",
    offerKind: "percent_off_annual",
    eligiblePlans: ["PRO", "ELITE"],
    window: "CFB pre-season",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "annual-discount margin floor breached",
  },
  {
    code: "IQUPGRADE",
    audience: "Pro members upgrading to Elite",
    offer: "First month of Elite at the Pro price (owner-approved upgrade incentive)",
    offerKind: "upgrade_incentive",
    eligiblePlans: ["ELITE"],
    window: "Lifecycle — triggered on eligible Pro accounts",
    usageLimit: 1,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "Elite gross-margin contribution turns negative",
  },
  {
    code: "BLACKFIELD30",
    audience: "Black Friday / Cyber Monday",
    offer: "30% off annual only",
    offerKind: "percent_off_annual",
    eligiblePlans: ["PRO", "ELITE"],
    window: "One week max",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "promo redemption share of new annual > 60%",
  },
  {
    code: "RETURN15",
    audience: "Win-back (lapsed members) — hidden lifecycle code",
    offer: "15% off annual or monthly reactivation",
    offerKind: "percent_off_annual",
    eligiblePlans: ["PRO", "ELITE"],
    window: "Lifecycle — hidden, not publicly listed",
    usageLimit: 1,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "reactivation churn-back rate > 50% within 60 days",
  },
  {
    code: "NOHYPE",
    audience: "Posture campaign — proof over promises",
    offer: "Unlock a premium report or No-Bet / Market Mirage preview (no price discount)",
    offerKind: "content_unlock",
    eligiblePlans: ["FREE"],
    window: "Brand campaign",
    usageLimit: null,
    stackable: false,
    complianceCopy: RG,
    ownerApproved: false,
    active: false,
    killSwitchMetric: "content-unlock abuse (multi-account farming) detected",
  },
] as const;

export function getPromoCode(code: string): PromoCode | undefined {
  const upper = code.trim().toUpperCase();
  return PROMO_CODES.find((p) => p.code === upper);
}

/** Active codes only — empty until the owner approves + coupon infra is wired. */
export function getActivePromoCodes(): readonly PromoCode[] {
  return PROMO_CODES.filter((p) => p.active && p.ownerApproved);
}
