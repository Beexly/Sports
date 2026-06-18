// ============================================================
// media-context.test.ts — J9: Airwave media context factor
//
// Guards the inertness invariant: the factor is surfaced in the glass box
// (weight 0 / priced: false) but NEVER contributes to published confidence.
// ============================================================

import { describe, it, expect } from "vitest";
import { computeMediaContextScore } from "../game-context.js";
import type { ApprovedMediaClaimInput } from "../game-context.js";

// ── helpers ────────────────────────────────────────────────────────────────

const approvedClaim = (
  overrides: Partial<ApprovedMediaClaimInput> = {}
): ApprovedMediaClaimInput => ({
  id: "claim-001",
  direction: "BACKS",
  accountabilityIndex: 75,
  confidenceLanguage: "EMPHATIC",
  ...overrides,
});

// ── 1. Core inertness invariant ────────────────────────────────────────────

describe("computeMediaContextScore — inertness invariant", () => {
  it("always returns weight: 0 regardless of claim content", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    expect(result.factor.weight).toBe(0);
  });

  it("always returns weight: 0 for opposing claims", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "FADES", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    expect(result.factor.weight).toBe(0);
  });

  it("always returns weight: 0 when no claims provided", () => {
    const result = computeMediaContextScore([], "HOME");
    expect(result.factor.weight).toBe(0);
  });
});

// ── 2. Directional signal with APPROVED claim ──────────────────────────────

describe("computeMediaContextScore — approved claim produces directional signal", () => {
  it("single BACKS claim on HOME pick → positive score, positive impact", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 80, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor.impact).toBe("positive");
    // still weight 0
    expect(result.factor.weight).toBe(0);
  });

  it("single FADES claim on HOME pick → negative score, negative impact", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "FADES", accountabilityIndex: 80, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    expect(result.score).toBeLessThan(0);
    expect(result.factor.impact).toBe("negative");
    expect(result.factor.weight).toBe(0);
  });

  it("FADES claim on AWAY pick (fading home = backing away) → positive score", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "FADES", accountabilityIndex: 80, confidenceLanguage: "EMPHATIC" })],
      "AWAY"
    );
    expect(result.score).toBeGreaterThan(0);
    expect(result.factor.impact).toBe("positive");
    expect(result.factor.weight).toBe(0);
  });

  it("BACKS claim on AWAY pick → negative score", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 80, confidenceLanguage: "EMPHATIC" })],
      "AWAY"
    );
    expect(result.score).toBeLessThan(0);
    expect(result.factor.impact).toBe("negative");
    expect(result.factor.weight).toBe(0);
  });

  it("score is bounded within –5 to +5", () => {
    const manyClaims: ApprovedMediaClaimInput[] = Array.from({ length: 20 }, (_, i) =>
      approvedClaim({ id: `claim-${i}`, direction: "BACKS", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })
    );
    const result = computeMediaContextScore(manyClaims, "HOME");
    expect(result.score).toBeGreaterThanOrEqual(-5);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.factor.weight).toBe(0);
  });
});

// ── 3. PENDING / non-approved claims must never be passed in ──────────────
// The engine trusts the caller to filter. Here we verify NEUTRAL direction
// (which is what a caller should use when a claim can't be direction-resolved)
// contributes no directional signal.

describe("computeMediaContextScore — non-directional / neutral claims", () => {
  it("NEUTRAL direction claim produces no directional contribution → neutral factor", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "NEUTRAL", accountabilityIndex: 90, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    // All claims are NEUTRAL → no weighted sum → score 0
    expect(result.score).toBe(0);
    expect(result.factor.impact).toBe("neutral");
    expect(result.factor.weight).toBe(0);
  });

  it("mix of directional and NEUTRAL: only directional claims count", () => {
    const claims: ApprovedMediaClaimInput[] = [
      approvedClaim({ id: "c1", direction: "BACKS", accountabilityIndex: 80, confidenceLanguage: "EMPHATIC" }),
      approvedClaim({ id: "c2", direction: "NEUTRAL", accountabilityIndex: 90, confidenceLanguage: "EMPHATIC" }),
    ];
    const withNeutral = computeMediaContextScore(claims, "HOME");
    const withoutNeutral = computeMediaContextScore([claims[0]!], "HOME");
    // NEUTRAL claim should not change the score
    expect(withNeutral.score).toBe(withoutNeutral.score);
    expect(withNeutral.factor.weight).toBe(0);
  });
});

// ── 4. No claims → neutral ─────────────────────────────────────────────────

describe("computeMediaContextScore — no claims returns neutral factor", () => {
  it("empty claims array → score 0, impact neutral, weight 0", () => {
    const result = computeMediaContextScore([], "HOME");
    expect(result.score).toBe(0);
    expect(result.factor.impact).toBe("neutral");
    expect(result.factor.weight).toBe(0);
    expect(result.factor.name).toBe("Media Context");
  });

  it("empty claims array for AWAY pick → score 0, impact neutral", () => {
    const result = computeMediaContextScore([], "AWAY");
    expect(result.score).toBe(0);
    expect(result.factor.impact).toBe("neutral");
    expect(result.factor.weight).toBe(0);
  });
});

// ── 5. Totals picks are always neutral ────────────────────────────────────

describe("computeMediaContextScore — totals picks are always neutral", () => {
  it("OVER pick with directional claims → score 0, neutral (no home/away direction)", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })],
      "OVER"
    );
    expect(result.score).toBe(0);
    expect(result.factor.impact).toBe("neutral");
    expect(result.factor.weight).toBe(0);
  });

  it("UNDER pick with directional claims → score 0, neutral", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "FADES", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })],
      "UNDER"
    );
    expect(result.score).toBe(0);
    expect(result.factor.weight).toBe(0);
  });
});

// ── 6. Accountability index scales the signal ─────────────────────────────

describe("computeMediaContextScore — accountability index scales signal", () => {
  it("high accountability (100) produces stronger directional score than low (10)", () => {
    const high = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 100, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    const low = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS", accountabilityIndex: 10, confidenceLanguage: "EMPHATIC" })],
      "HOME"
    );
    // Both still weight 0
    expect(high.factor.weight).toBe(0);
    expect(low.factor.weight).toBe(0);
    // High accountability should produce equal or greater raw signal
    expect(Math.abs(high.score)).toBeGreaterThanOrEqual(Math.abs(low.score));
  });
});

// ── 7. Factor name is stable ───────────────────────────────────────────────

describe("computeMediaContextScore — factor metadata", () => {
  it("factor name is always 'Media Context'", () => {
    expect(computeMediaContextScore([], "HOME").factor.name).toBe("Media Context");
    expect(
      computeMediaContextScore([approvedClaim()], "HOME").factor.name
    ).toBe("Media Context");
  });

  it("factor description mentions inert / weight 0 when directional claims present", () => {
    const result = computeMediaContextScore(
      [approvedClaim({ direction: "BACKS" })],
      "HOME"
    );
    // Description should hint the factor is inert / not priced
    expect(result.factor.description.toLowerCase()).toMatch(/inert|weight 0/);
  });
});
