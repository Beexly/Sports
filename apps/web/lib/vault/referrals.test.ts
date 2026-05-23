import { describe, expect, it } from "vitest";
import {
  getVaultReferralAccrualDecision,
  getVaultReferralClawbackDecision,
  getVaultReferralClickDecision,
  getVaultReferralConversionDecision,
  type VaultReferralAttributionSnapshot,
} from "./referrals";

const baseAttribution: VaultReferralAttributionSnapshot = {
  id: "ref_123",
  referrerUserId: "user_referrer",
  referrerEmail: "member@example.com",
  referredUserId: null,
  referredEmail: "prospect@example.com",
  attributionCode: "VAULT-ABCD",
  clickedAt: "2026-05-01T12:00:00.000Z",
  clickExpiresAt: "2026-05-31T12:00:00.000Z",
  eligibleUntil: "2027-05-01T12:00:00.000Z",
  status: "clicked",
  grossRevenueCents: 20000,
  commissionRateBps: 1000,
  commissionAccruedCents: 0,
  commissionPaidCents: 0,
  payoutPreference: "subscription_credit",
};

describe("Vault referral click decisioning", () => {
  it("records valid referral clicks with normalized email", () => {
    expect(
      getVaultReferralClickDecision({
        referrerUserId: "user_referrer",
        referrerEmail: "member@example.com",
        referredEmail: " Prospect@Example.COM ",
      }),
    ).toEqual({
      status: "record_click",
      reason: "valid_new_click",
      normalizedEmail: "prospect@example.com",
    });
  });

  it("blocks self-referrals before attribution is created", () => {
    expect(
      getVaultReferralClickDecision({
        referrerUserId: "user_referrer",
        referrerEmail: "member@example.com",
        referredEmail: "member@example.com",
      }),
    ).toEqual({
      status: "block",
      reason: "self_referral",
      normalizedEmail: "member@example.com",
    });
  });

  it("can refresh an existing attribution without changing semantics", () => {
    expect(
      getVaultReferralClickDecision({
        referrerUserId: "user_referrer",
        referrerEmail: "member@example.com",
        referredEmail: "prospect@example.com",
        existingAttribution: baseAttribution,
      }),
    ).toMatchObject({
      status: "record_click",
      reason: "refresh_existing_click",
    });
  });
});

describe("Vault referral conversion decisioning", () => {
  it("activates attribution within the click window", () => {
    expect(
      getVaultReferralConversionDecision(baseAttribution, {
        referredEmail: "prospect@example.com",
        referredUserId: "user_referred",
        now: new Date("2026-05-15T12:00:00.000Z"),
      }),
    ).toEqual({
      status: "activate",
      reason: "within_attribution_window",
      attributionId: "ref_123",
    });
  });

  it("skips expired and terminal attributions", () => {
    expect(
      getVaultReferralConversionDecision(baseAttribution, {
        referredEmail: "prospect@example.com",
        referredUserId: "user_referred",
        now: new Date("2026-06-01T12:00:01.000Z"),
      }),
    ).toEqual({
      status: "skip",
      reason: "expired_click",
      attributionId: "ref_123",
    });

    expect(
      getVaultReferralConversionDecision(
        { ...baseAttribution, status: "voided" },
        {
          referredEmail: "prospect@example.com",
          referredUserId: "user_referred",
          now: new Date("2026-05-15T12:00:00.000Z"),
        },
      ),
    ).toEqual({
      status: "skip",
      reason: "already_terminal",
      attributionId: "ref_123",
    });
  });

  it("does not attach attribution to the wrong referred email", () => {
    expect(
      getVaultReferralConversionDecision(baseAttribution, {
        referredEmail: "other@example.com",
        referredUserId: "user_other",
        now: new Date("2026-05-15T12:00:00.000Z"),
      }),
    ).toEqual({
      status: "skip",
      reason: "no_attribution",
      attributionId: "ref_123",
    });
  });
});

describe("Vault referral accrual decisioning", () => {
  it("accrues only the commission delta on first-year revenue", () => {
    expect(
      getVaultReferralAccrualDecision(
        {
          ...baseAttribution,
          status: "active",
          grossRevenueCents: 20000,
          commissionAccruedCents: 500,
        },
        new Date("2026-07-01T12:00:00.000Z"),
      ),
    ).toEqual({
      status: "accrue",
      reason: "eligible_first_year_revenue",
      amountCents: 1500,
    });
  });

  it("skips inactive, expired, or fully accrued referrals", () => {
    expect(
      getVaultReferralAccrualDecision(baseAttribution, new Date("2026-07-01")),
    ).toMatchObject({ status: "skip", reason: "not_active" });

    expect(
      getVaultReferralAccrualDecision(
        { ...baseAttribution, status: "active" },
        new Date("2027-06-01"),
      ),
    ).toMatchObject({ status: "skip", reason: "outside_eligibility_window" });

    expect(
      getVaultReferralAccrualDecision(
        {
          ...baseAttribution,
          status: "active",
          grossRevenueCents: 20000,
          commissionAccruedCents: 2000,
        },
        new Date("2026-07-01"),
      ),
    ).toMatchObject({ status: "skip", reason: "nothing_new_to_accrue" });
  });
});

describe("Vault referral clawback decisioning", () => {
  it("voids unpaid accrual before creating cash clawback exposure", () => {
    expect(
      getVaultReferralClawbackDecision({
        refundCents: 20000,
        commissionRateBps: 1000,
        commissionAccruedCents: 2000,
        commissionPaidCents: 0,
      }),
    ).toEqual({
      status: "void_unpaid",
      reason: "refund_clears_unpaid_accrual",
      amountCents: 2000,
    });
  });

  it("creates a clawback only for paid exposure", () => {
    expect(
      getVaultReferralClawbackDecision({
        refundCents: 20000,
        commissionRateBps: 1000,
        commissionAccruedCents: 2000,
        commissionPaidCents: 1500,
      }),
    ).toEqual({
      status: "clawback",
      reason: "refund_exceeds_unpaid_accrual",
      amountCents: 1500,
    });
  });
});
