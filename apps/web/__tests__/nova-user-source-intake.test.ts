import { describe, expect, it } from "vitest";

import {
  buildUserSourceReviewQueue,
  summarizeUserSuppliedSourceIntake,
  validateUserSuppliedSourceIntake,
} from "@/lib/opportunity-engine/source-intake";

describe("NOVA user-supplied source intake", () => {
  it("preserves every submitted link as discovery without creating claims", () => {
    const summary = summarizeUserSuppliedSourceIntake();
    expect(summary).toEqual({
      total: 28,
      instagram: 11,
      hubspotTrackingRedirects: 17,
      ownerReviewRequired: 28,
      verifiedClaims: 0,
      rawTrackingUrlsRetained: false,
    });
    expect(validateUserSuppliedSourceIntake()).toEqual([]);
  });

  it("routes every item to owner review with no external action authority", () => {
    const queue = buildUserSourceReviewQueue();
    expect(queue).toHaveLength(28);
    expect(queue.map((item) => item.sourceLine)).toEqual([
      3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45,
      47, 49, 51, 53, 55, 57,
    ]);
    for (const item of queue) {
      expect(item.evidenceTier).toBe("DISCOVERY_ONLY");
      expect(item.disposition).toBe("OWNER_REVIEW");
      expect(item.claimsExtracted).toBe(0);
      expect(item.externalActionsAllowed).toBe(false);
      expect(item.nextAction.length).toBeGreaterThan(0);
    }
  });

  it("never exposes recipient-specific HubSpot redirect URLs", () => {
    const redirects = buildUserSourceReviewQueue().filter(
      (item) => item.kind === "hubspot_tracking_redirect",
    );
    expect(redirects).toHaveLength(17);
    for (const item of redirects) {
      expect(item.locator).toMatch(/^d2rl2304\.na1\.hubspotlinks\.com#sha256:[a-f0-9]{64}$/);
      expect(item.locator).not.toContain("/Ctc/");
      expect(item.locator).not.toContain("?");
    }
  });
});
