/**
 * Partner · credits · affiliate doctrine — productized with teeth.
 * Competitive law: NO sportsbook affiliate funnel.
 * Revenue spine: Stripe subscription tiers only (FREE/PRO/ELITE).
 * Credits = closed-loop product currency, never cash-out / wager stake.
 */

export type PartnerKind =
  | "stripe_billing"
  | "data_provider"
  | "infra"
  | "media_attribution"
  | "academic_lab"
  | "sportsbook_affiliate" // always blocked
  | "casino_affiliate"; // always blocked

export type PartnerStatus = "ALLOWED" | "BLOCKED" | "REVIEW" | "DARK";

export type PartnerEntry = {
  id: string;
  name: string;
  kind: PartnerKind;
  status: PartnerStatus;
  revenueShare: boolean;
  notes: string;
};

export type CreditGrant = {
  userId: string;
  units: number;
  reason: "subscription_tier" | "skill_contest" | "founder_comp" | "refund_credit";
  convertibleToCash: false;
  convertibleToWager: false;
  grantedAt: string;
};

export type RevenueStream = {
  id: string;
  name: string;
  allowed: boolean;
  channel: "stripe" | "enterprise_api" | "blocked_affiliate" | "blocked_other";
  honestyNote: string;
};

/** Hard block list — product doctrine, not marketing copy. */
export const BLOCKED_PARTNER_KINDS: readonly PartnerKind[] = [
  "sportsbook_affiliate",
  "casino_affiliate",
] as const;

export const REVENUE_STREAMS: readonly RevenueStream[] = [
  {
    id: "stripe.pro",
    name: "GSE Pro subscription",
    allowed: true,
    channel: "stripe",
    honestyNote: "Primary revenue — paid access to denser API + cockpit tools",
  },
  {
    id: "stripe.elite",
    name: "GSE Elite subscription",
    allowed: true,
    channel: "stripe",
    honestyNote: "Highest Stripe tier — still no sportsbook kickbacks",
  },
  {
    id: "api.enterprise",
    name: "Enterprise rights-tagged API",
    allowed: true,
    channel: "enterprise_api",
    honestyNote: "Contract + SPDX export classification required",
  },
  {
    id: "aff.sportsbook",
    name: "Sportsbook affiliate CPA/revshare",
    allowed: false,
    channel: "blocked_affiliate",
    honestyNote: "Doctrine: No sportsbook affiliate funnel — forever blocked",
  },
  {
    id: "aff.casino",
    name: "Casino / DFS affiliate",
    allowed: false,
    channel: "blocked_affiliate",
    honestyNote: "Blocked — integrity product, not a tout funnel",
  },
] as const;

export const DEFAULT_PARTNERS: readonly PartnerEntry[] = [
  {
    id: "stripe",
    name: "Stripe Billing",
    kind: "stripe_billing",
    status: "ALLOWED",
    revenueShare: false,
    notes: "Subscription SoR for FREE/PRO/ELITE entitlements",
  },
  {
    id: "nflverse",
    name: "nflverse (CC-BY-4.0)",
    kind: "data_provider",
    status: "ALLOWED",
    revenueShare: false,
    notes: "Attribution required; base data not resold as exclusive",
  },
  {
    id: "open-meteo",
    name: "Open-Meteo",
    kind: "data_provider",
    status: "ALLOWED",
    revenueShare: false,
    notes: "Weather context; free API terms",
  },
  {
    id: "vercel",
    name: "Vercel",
    kind: "infra",
    status: "ALLOWED",
    revenueShare: false,
    notes: "Deploy + cron host",
  },
  {
    id: "polymarket-gamma",
    name: "Polymarket Gamma (public)",
    kind: "data_provider",
    status: "ALLOWED",
    revenueShare: false,
    notes: "Independent quote plane — not a sportsbook affiliate",
  },
  {
    id: "draftkings-aff",
    name: "DraftKings affiliate",
    kind: "sportsbook_affiliate",
    status: "BLOCKED",
    revenueShare: true,
    notes: "HARD BLOCK — competitive doctrine",
  },
  {
    id: "fanduel-aff",
    name: "FanDuel affiliate",
    kind: "sportsbook_affiliate",
    status: "BLOCKED",
    revenueShare: true,
    notes: "HARD BLOCK — competitive doctrine",
  },
] as const;

export type PartnerGateResult =
  | { ok: true; partner: PartnerEntry }
  | { ok: false; code: string; error: string };

export function assessPartner(entry: PartnerEntry): PartnerGateResult {
  if (BLOCKED_PARTNER_KINDS.includes(entry.kind)) {
    return {
      ok: false,
      code: "affiliate_blocked",
      error: `${entry.kind} is permanently blocked by competitive doctrine`,
    };
  }
  if (entry.status === "BLOCKED") {
    return {
      ok: false,
      code: "partner_blocked",
      error: entry.notes,
    };
  }
  if (entry.revenueShare && entry.kind !== "stripe_billing") {
    return {
      ok: false,
      code: "revenue_share_review",
      error: "Non-Stripe revenue share requires founder counsel review",
    };
  }
  return { ok: true, partner: entry };
}

export function grantCredits(
  partial: Omit<CreditGrant, "convertibleToCash" | "convertibleToWager">,
): CreditGrant | { ok: false; code: string; error: string } {
  if (!Number.isFinite(partial.units) || partial.units <= 0) {
    return { ok: false, code: "invalid_units", error: "units must be positive finite" };
  }
  return {
    ...partial,
    convertibleToCash: false,
    convertibleToWager: false,
  };
}

export function allowedRevenueStreams(): RevenueStream[] {
  return REVENUE_STREAMS.filter((s) => s.allowed);
}

export function partnerStackSnapshot() {
  const assessed = DEFAULT_PARTNERS.map((p) => ({
    id: p.id,
    kind: p.kind,
    ...assessPartner(p),
  }));
  const blocked = assessed.filter((a) => !a.ok).length;
  const allowed = assessed.filter((a) => a.ok).length;
  return {
    partners: assessed,
    allowedCount: allowed,
    blockedCount: blocked,
    revenueAllowed: allowedRevenueStreams().map((s) => s.id),
    revenueBlocked: REVENUE_STREAMS.filter((s) => !s.allowed).map((s) => s.id),
    law: [
      "No sportsbook affiliate funnel",
      "Stripe tiers are the product revenue spine",
      "Credits never convert to cash or wager stake",
      "Data partners: attribution + SPDX, not kickbacks",
    ] as const,
  };
}
