/**
 * Runtime validation of the revenue fences' metadata trust boundary.
 *
 * `FenceInput.metadata` is `Record<string, unknown>` — arbitrary caller data
 * (draft-fence-workflow spreads it in verbatim). The fences' `metadataOffer` /
 * `metadataPartner` helpers are the ONLY validation between that untrusted blob
 * and the union-typed `RevenueOffer` / `RevenuePartner` domain objects.
 *
 * These tests assert at RUNTIME (apps/web tests are excluded from `tsc`, so a
 * type-level assertion here would prove nothing) that malformed metadata is
 * REJECTED and fails CLOSED rather than being cast through into policy code
 * that compares against union members with `===`.
 */

import { describe, expect, it } from "vitest";

import { affiliateDisclosureFence, responsibleGamingFence } from "@/lib/fences/index";

/**
 * A regulated sportsbook offer carrying ZERO responsible-gaming metadata: no
 * `responsibleGamingText`, no `minimumAge`, no `eligibleStates`. It must never
 * pass the responsible-gaming fence.
 *
 * Both discriminators are off-union: `riskClass: "critical"` is not
 * low|medium|high, and `category: "Sportsbook"` is not the lowercase
 * "sportsbook" union member. Every field is still a `string`, so a
 * `typeof x === "string"` check accepts all of them.
 */
const OFF_UNION_REGULATED_OFFER = {
  allowedSurfaces: ["newsletter"],
  approvalStatus: "approved",
  category: "Sportsbook",
  id: "book_offer",
  partnerId: "book_partner",
  publicName: "Book review",
  riskClass: "critical",
};

describe("responsible-gaming fence: metadata trust boundary", () => {
  it("fails closed on a regulated offer whose riskClass/category are off-union strings", async () => {
    const result = await responsibleGamingFence.evaluate({
      metadata: { offer: OFF_UNION_REGULATED_OFFER, userState: "NJ" },
      surface: "partner",
      text: "",
    });

    // isHighRiskOffer() compares with ===, so an off-union riskClass/category
    // makes a regulated offer look low-risk and the whole review is skipped.
    expect(result.ok).toBe(false);
    expect(result.severity).toBe("BLOCK");
  });

  it("fails closed when containsDepositLanguage is a string instead of a boolean", async () => {
    const result = await responsibleGamingFence.evaluate({
      metadata: {
        offer: {
          ...OFF_UNION_REGULATED_OFFER,
          // `=== true` is false for the string "true", so this deposit offer
          // reads as non-deposit and skips responsible-gaming review.
          containsDepositLanguage: "true",
        },
        userState: "NJ",
      },
      surface: "partner",
      text: "",
    });

    expect(result.ok).toBe(false);
    expect(result.severity).toBe("BLOCK");
  });

  it("fails closed when allowedSurfaces holds non-surface elements", async () => {
    const result = await responsibleGamingFence.evaluate({
      metadata: {
        offer: { ...OFF_UNION_REGULATED_OFFER, allowedSurfaces: [42, null] },
        userState: "NJ",
      },
      surface: "partner",
      text: "",
    });

    expect(result.ok).toBe(false);
    expect(result.severity).toBe("BLOCK");
  });
});

describe("affiliate-disclosure fence: metadata trust boundary", () => {
  it("fails closed on a partner whose category/approvalStatus are off-union strings", async () => {
    const result = await affiliateDisclosureFence.evaluate({
      metadata: {
        partner: {
          allowedSurfaces: ["newsletter"],
          approvalStatus: "Approved",
          category: "Sportsbook",
          disclosureRequired: false,
          displayName: "Regulated Book",
          id: "book_partner",
        },
        surface: "newsletter",
      },
      surface: "partner",
      text: "",
    });

    expect(result.ok).toBe(false);
    expect(result.severity).toBe("BLOCK");
  });

  it("fails closed on an offer whose approvalStatus is off-union", async () => {
    const result = await affiliateDisclosureFence.evaluate({
      metadata: {
        offer: { ...OFF_UNION_REGULATED_OFFER, approvalStatus: "pending-review" },
        partner: {
          allowedSurfaces: ["newsletter"],
          approvalStatus: "approved",
          category: "sportsbook",
          disclosureRequired: true,
          displayName: "Regulated Book",
          id: "book_partner",
        },
        surface: "newsletter",
      },
      surface: "partner",
      text: "Sponsored disclosure: GSE may receive compensation.",
    });

    expect(result.ok).toBe(false);
    expect(result.severity).toBe("BLOCK");
  });
});
