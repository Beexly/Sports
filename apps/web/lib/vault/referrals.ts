export type VaultReferralStatus =
  | "clicked"
  | "converted"
  | "active"
  | "expired"
  | "voided"
  | "self_referral_blocked";

export type VaultReferralPayoutPreference =
  | "subscription_credit"
  | "stripe_connect_cash";

export type VaultReferralAttributionSnapshot = {
  id: string;
  referrerUserId: string;
  referrerEmail?: string | null;
  referredUserId?: string | null;
  referredEmail: string;
  attributionCode: string;
  clickedAt: string;
  clickExpiresAt: string;
  eligibleUntil: string;
  status: VaultReferralStatus;
  grossRevenueCents?: number | null;
  commissionRateBps: number;
  commissionAccruedCents?: number | null;
  commissionPaidCents?: number | null;
  payoutPreference: VaultReferralPayoutPreference;
  stripeConnectAccountId?: string | null;
};

export type VaultReferralClickDecision =
  | {
      status: "record_click";
      reason: "valid_new_click" | "refresh_existing_click";
      normalizedEmail: string;
    }
  | {
      status: "block";
      reason: "self_referral" | "missing_referrer" | "missing_referred_email";
      normalizedEmail: string | null;
    };

export type VaultReferralConversionDecision =
  | {
      status: "activate";
      reason: "within_attribution_window";
      attributionId: string;
    }
  | {
      status: "skip";
      reason:
        | "no_attribution"
        | "already_terminal"
        | "expired_click"
        | "self_referral";
      attributionId: string | null;
    };

export type VaultReferralAccrualDecision =
  | {
      status: "accrue";
      reason: "eligible_first_year_revenue";
      amountCents: number;
    }
  | {
      status: "skip";
      reason:
        | "not_active"
        | "outside_eligibility_window"
        | "nothing_new_to_accrue"
        | "invalid_commission_rate";
      amountCents: 0;
    };

export type VaultReferralClawbackDecision =
  | {
      status: "clawback";
      reason: "refund_exceeds_unpaid_accrual";
      amountCents: number;
    }
  | {
      status: "void_unpaid";
      reason: "refund_clears_unpaid_accrual";
      amountCents: number;
    }
  | {
      status: "none";
      reason: "no_refund" | "no_commission_exposure";
      amountCents: 0;
    };

const TERMINAL_REFERRAL_STATUSES = new Set<VaultReferralStatus>([
  "expired",
  "voided",
  "self_referral_blocked",
]);

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function isAfter(value: string, now: Date) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp < now.getTime();
}

function cents(value: number | null | undefined) {
  return Math.max(0, Math.trunc(value ?? 0));
}

export function getVaultReferralClickDecision(input: {
  referrerUserId?: string | null;
  referrerEmail?: string | null;
  referredEmail?: string | null;
  existingAttribution?: VaultReferralAttributionSnapshot | null;
}): VaultReferralClickDecision {
  const normalizedEmail = normalizeEmail(input.referredEmail);
  const normalizedReferrerEmail = normalizeEmail(input.referrerEmail);

  if (!input.referrerUserId) {
    return {
      status: "block",
      reason: "missing_referrer",
      normalizedEmail,
    };
  }

  if (!normalizedEmail) {
    return {
      status: "block",
      reason: "missing_referred_email",
      normalizedEmail: null,
    };
  }

  if (normalizedReferrerEmail && normalizedReferrerEmail === normalizedEmail) {
    return {
      status: "block",
      reason: "self_referral",
      normalizedEmail,
    };
  }

  return {
    status: "record_click",
    reason: input.existingAttribution
      ? "refresh_existing_click"
      : "valid_new_click",
    normalizedEmail,
  };
}

export function getVaultReferralConversionDecision(
  attribution: VaultReferralAttributionSnapshot | null,
  input: {
    referredEmail: string;
    referredUserId: string;
    now?: Date;
  },
): VaultReferralConversionDecision {
  if (!attribution) {
    return {
      status: "skip",
      reason: "no_attribution",
      attributionId: null,
    };
  }

  if (TERMINAL_REFERRAL_STATUSES.has(attribution.status)) {
    return {
      status: "skip",
      reason: "already_terminal",
      attributionId: attribution.id,
    };
  }

  const normalizedAttributionEmail = normalizeEmail(attribution.referredEmail);
  const normalizedInputEmail = normalizeEmail(input.referredEmail);
  const normalizedReferrerEmail = normalizeEmail(attribution.referrerEmail);

  if (
    normalizedInputEmail &&
    normalizedReferrerEmail &&
    normalizedInputEmail === normalizedReferrerEmail
  ) {
    return {
      status: "skip",
      reason: "self_referral",
      attributionId: attribution.id,
    };
  }

  if (
    normalizedAttributionEmail &&
    normalizedInputEmail &&
    normalizedAttributionEmail !== normalizedInputEmail
  ) {
    return {
      status: "skip",
      reason: "no_attribution",
      attributionId: attribution.id,
    };
  }

  const now = input.now ?? new Date();
  if (isAfter(attribution.clickExpiresAt, now)) {
    return {
      status: "skip",
      reason: "expired_click",
      attributionId: attribution.id,
    };
  }

  return {
    status: "activate",
    reason: "within_attribution_window",
    attributionId: attribution.id,
  };
}

export function getVaultReferralAccrualDecision(
  attribution: VaultReferralAttributionSnapshot,
  now = new Date(),
): VaultReferralAccrualDecision {
  if (attribution.status !== "active") {
    return {
      status: "skip",
      reason: "not_active",
      amountCents: 0,
    };
  }

  if (isAfter(attribution.eligibleUntil, now)) {
    return {
      status: "skip",
      reason: "outside_eligibility_window",
      amountCents: 0,
    };
  }

  if (
    !Number.isFinite(attribution.commissionRateBps) ||
    attribution.commissionRateBps <= 0
  ) {
    return {
      status: "skip",
      reason: "invalid_commission_rate",
      amountCents: 0,
    };
  }

  const grossRevenueCents = cents(attribution.grossRevenueCents);
  const alreadyAccruedCents = cents(attribution.commissionAccruedCents);
  const targetAccrualCents = Math.floor(
    (grossRevenueCents * attribution.commissionRateBps) / 10000,
  );
  const amountCents = Math.max(0, targetAccrualCents - alreadyAccruedCents);

  if (amountCents === 0) {
    return {
      status: "skip",
      reason: "nothing_new_to_accrue",
      amountCents: 0,
    };
  }

  return {
    status: "accrue",
    reason: "eligible_first_year_revenue",
    amountCents,
  };
}

export function getVaultReferralClawbackDecision(input: {
  refundCents: number;
  commissionRateBps: number;
  commissionAccruedCents?: number | null;
  commissionPaidCents?: number | null;
}): VaultReferralClawbackDecision {
  const refundCents = cents(input.refundCents);
  const accruedCents = cents(input.commissionAccruedCents);
  const paidCents = cents(input.commissionPaidCents);

  if (refundCents === 0) {
    return {
      status: "none",
      reason: "no_refund",
      amountCents: 0,
    };
  }

  if (!Number.isFinite(input.commissionRateBps) || input.commissionRateBps <= 0) {
    return {
      status: "none",
      reason: "no_commission_exposure",
      amountCents: 0,
    };
  }

  const refundCommissionCents = Math.floor(
    (refundCents * input.commissionRateBps) / 10000,
  );
  const unpaidExposureCents = Math.max(0, accruedCents - paidCents);
  const paidExposureCents = Math.max(0, refundCommissionCents - unpaidExposureCents);

  if (paidExposureCents > 0) {
    return {
      status: "clawback",
      reason: "refund_exceeds_unpaid_accrual",
      amountCents: paidExposureCents,
    };
  }

  if (refundCommissionCents > 0) {
    return {
      status: "void_unpaid",
      reason: "refund_clears_unpaid_accrual",
      amountCents: refundCommissionCents,
    };
  }

  return {
    status: "none",
    reason: "no_commission_exposure",
    amountCents: 0,
  };
}
