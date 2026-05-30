/**
 * Targeted coverage for evaluatePromotionForPublish branches not reached by
 * promotions-guards.test.ts.
 *
 * The primary test covers: missing disclosure/RG/terms, expired, BLOCKED status,
 * UNREVIEWED compliance, banned hype, state restrictions, no eligible states,
 * unknown/demo sportsbookKey.
 *
 * This file covers:
 *   - STATUS_NOT_ACTIVE reviewable=false when status=BLOCKED
 *   - STATUS_NOT_ACTIVE reviewable=true when status=PAUSED (non-BLOCKED inactive)
 *   - COMPLIANCE_NOT_APPROVED reviewable=false when complianceStatus=BLOCKED
 *   - COMPLIANCE_NOT_APPROVED reviewable=true when complianceStatus=UNREVIEWED
 *   - EXPIRED blocker reviewable=false
 *   - MISSING_DISCLOSURE reviewable=true (soft requirement)
 *   - expiresAt=null → no EXPIRED blocker (never expires)
 *   - parseStateList: object/number inputs return []
 */

import { describe, it, expect } from "vitest";
import {
  evaluatePromotionForPublish,
  parseStateList,
} from "@/lib/promotions/guards";
import type { Promotion } from "@prisma/client";

const TS_NOW = new Date("2026-05-18T12:00:00Z");

function makePromotion(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: "promo_gaps",
    slug: "gaps-promo",
    sportsbookKey: "stellar",
    operatorName: "Stellar Sportsbook",
    headline: "Bonus bet on first deposit",
    offerSummary: "Deposit and wager to qualify.",
    offerCategory: "DEPOSIT_MATCH" as Promotion["offerCategory"],
    affiliateType: "CPA" as Promotion["affiliateType"],
    affiliateUrl: "https://example.com/aff",
    termsUrl: "https://example.com/terms",
    promoCode: null,
    eligibleStates: ["NJ", "NY"],
    restrictedStates: [],
    country: "US",
    minimumAge: 21,
    status: "ACTIVE" as Promotion["status"],
    complianceStatus: "APPROVED" as Promotion["complianceStatus"],
    disclosureText: "Sponsored content. Commission may apply.",
    responsibleGamingText: "21+ only. Call 1-800-GAMBLER if needed.",
    lastReviewedAt: TS_NOW,
    reviewedBy: "manual:operator",
    expiresAt: new Date("2026-12-31T23:59:59Z"),
    createdAt: TS_NOW,
    updatedAt: TS_NOW,
    ...overrides,
  } as Promotion;
}

// ============================================================
// STATUS_NOT_ACTIVE reviewable flag branches
// ============================================================

describe("STATUS_NOT_ACTIVE — reviewable=false when status=BLOCKED", () => {
  it("BLOCKED status has reviewable=false on the STATUS_NOT_ACTIVE blocker", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ status: "BLOCKED" as Promotion["status"] }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "STATUS_NOT_ACTIVE");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(false);
  });
});

describe("STATUS_NOT_ACTIVE — reviewable=true when status=PAUSED", () => {
  it("PAUSED status has reviewable=true on the STATUS_NOT_ACTIVE blocker", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ status: "PAUSED" as Promotion["status"] }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "STATUS_NOT_ACTIVE");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(true);
  });
});

// ============================================================
// COMPLIANCE_NOT_APPROVED reviewable flag branches
// ============================================================

describe("COMPLIANCE_NOT_APPROVED — reviewable=false when complianceStatus=BLOCKED", () => {
  it("BLOCKED complianceStatus has reviewable=false on the blocker", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ complianceStatus: "BLOCKED" as Promotion["complianceStatus"] }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "COMPLIANCE_NOT_APPROVED");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(false);
  });
});

describe("COMPLIANCE_NOT_APPROVED — reviewable=true when complianceStatus=UNREVIEWED", () => {
  it("UNREVIEWED complianceStatus has reviewable=true on the blocker", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ complianceStatus: "UNREVIEWED" as Promotion["complianceStatus"] }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "COMPLIANCE_NOT_APPROVED");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(true);
  });
});

// ============================================================
// EXPIRED — reviewable=false
// ============================================================

describe("EXPIRED blocker — reviewable is always false", () => {
  it("EXPIRED blocker has reviewable=false (expiry is not operator-fixable)", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ expiresAt: new Date("2025-01-01T00:00:00Z") }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "EXPIRED");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(false);
  });
});

// ============================================================
// MISSING_DISCLOSURE — reviewable=true (soft requirement)
// ============================================================

describe("MISSING_DISCLOSURE — reviewable=true", () => {
  it("MISSING_DISCLOSURE blocker is reviewable (operator can fix)", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ disclosureText: null }),
      { now: TS_NOW }
    );
    const blocker = verdict.blockers.find((b) => b.code === "MISSING_DISCLOSURE");
    expect(blocker).toBeDefined();
    expect(blocker?.reviewable).toBe(true);
  });
});

// ============================================================
// expiresAt=null → no EXPIRED blocker
// ============================================================

describe("expiresAt=null — no expiry blocker", () => {
  it("promotion with null expiresAt does not produce EXPIRED blocker", () => {
    const verdict = evaluatePromotionForPublish(
      makePromotion({ expiresAt: null }),
      { now: TS_NOW }
    );
    const codes = verdict.blockers.map((b) => b.code);
    expect(codes).not.toContain("EXPIRED");
  });
});

// ============================================================
// parseStateList — edge cases not in primary test
// ============================================================

describe("parseStateList — non-array inputs", () => {
  it("returns [] for a plain object", () => {
    expect(parseStateList({ NJ: true })).toEqual([]);
  });

  it("returns [] for a number", () => {
    expect(parseStateList(42)).toEqual([]);
  });

  it("returns [] for a string", () => {
    expect(parseStateList("NJ")).toEqual([]);
  });

  it("accepts mixed valid/invalid array items and filters correctly", () => {
    expect(parseStateList(["NJ", "CA", "invalid", "XYZ", 42, null, "ny"])).toEqual(["NJ", "CA"]);
  });
});
