import { describe, expect, it } from "vitest";
import {
  assessPartner,
  grantCredits,
  partnerStackSnapshot,
  DEFAULT_PARTNERS,
  allowedRevenueStreams,
} from "../partner-stack.js";

describe("partner-stack", () => {
  it("blocks sportsbook affiliates hard", () => {
    const dk = DEFAULT_PARTNERS.find((p) => p.id === "draftkings-aff")!;
    const r = assessPartner(dk);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("affiliate_blocked");
  });

  it("allows Stripe", () => {
    const stripe = DEFAULT_PARTNERS.find((p) => p.id === "stripe")!;
    const r = assessPartner(stripe);
    expect(r.ok).toBe(true);
  });

  it("credits never convert to cash/wager", () => {
    const g = grantCredits({
      userId: "u1",
      units: 100,
      reason: "subscription_tier",
      grantedAt: "2026-07-29T00:00:00.000Z",
    });
    expect("ok" in g && g.ok === false).toBe(false);
    if ("ok" in g) return;
    expect(g.convertibleToCash).toBe(false);
    expect(g.convertibleToWager).toBe(false);
  });

  it("refuses non-positive credit units", () => {
    const g = grantCredits({
      userId: "u1",
      units: 0,
      reason: "skill_contest",
      grantedAt: "t",
    });
    expect("ok" in g && g.ok === false).toBe(true);
  });

  it("snapshot lists blocked affiliate revenue", () => {
    const s = partnerStackSnapshot();
    expect(s.revenueBlocked).toContain("aff.sportsbook");
    expect(s.revenueAllowed).toContain("stripe.pro");
    expect(s.blockedCount).toBeGreaterThanOrEqual(2);
    expect(allowedRevenueStreams().every((r) => r.allowed)).toBe(true);
  });
});
