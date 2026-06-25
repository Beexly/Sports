import { describe, it, expect } from "vitest";
import { getProductIntelligence } from "@/lib/cockpit/product-intelligence";

/**
 * Owner Product-Intelligence view-model — derived from fixtures, Prisma-free.
 * Locks the three panels the cockpit renders: the FDR-disciplined Conscience,
 * the Galileo-Week acquisition preview (never LIVE), and scar utility.
 */

describe("getProductIntelligence (fixtures)", () => {
  const view = getProductIntelligence();

  it("reports all 7 intelligence ledgers with an FDR q and an improving count", () => {
    expect(Object.keys(view.ledger.ledgers).length).toBe(7);
    expect(view.ledger.fdrQ).toBeGreaterThan(0);
    expect(view.ledger.improvingCount).toBeGreaterThanOrEqual(1);
    // Detection improves on a genuine upward trend in the fixture series.
    expect(view.ledger.ledgers.detection.improving).toBe(true);
  });

  it("exposes all 8 Galileo atlases + a public moment, and never runs LIVE", () => {
    expect(view.atlas.mode).toBe("PREVIEW_FIXTURES");
    expect(view.atlas.publicMoment.length).toBeGreaterThan(0);
    for (const k of [
      "sourceRace",
      "marketAbsorption",
      "fantasyAbsorption",
      "decisionCard",
      "scar",
      "intelligenceDelta",
      "missedObservation",
      "overObservation",
    ] as const) {
      expect(view.atlas).toHaveProperty(k);
    }
  });

  it("scar utility: a bad-process card emits a ghost lesson; an unlucky loss does not", () => {
    expect(view.scar.length).toBe(2);
    const trap = view.scar[0]!;
    const unlucky = view.scar[1]!;
    expect(trap.emitsLesson).toBe(true);
    expect(trap.loopAction).toBe("GHOST");
    expect(unlucky.emitsLesson).toBe(false);
  });
});
