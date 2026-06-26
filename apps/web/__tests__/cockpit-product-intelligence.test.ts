import { describe, it, expect } from "vitest";
import { getProductIntelligence } from "@/lib/cockpit/product-intelligence";

/**
 * Owner Product-Intelligence view-model — derived from fixtures, Prisma-free.
 * Locks the three panels the cockpit renders: the FDR-disciplined Conscience,
 * the Galileo-Week acquisition preview (never LIVE), and scar utility.
 */

describe("getProductIntelligence (fixtures)", () => {
  const view = getProductIntelligence();

  it("reports all 7 intelligence ledgers honestly — a FIXTURE TREND, nothing validated", () => {
    expect(Object.keys(view.ledger.ledgers).length).toBe(7);
    expect(view.ledger.fdrQ).toBeGreaterThan(0);
    // On fixtures the Conscience must NOT claim validated improvement.
    expect(view.ledger.dataMode).toBe("FIXTURE");
    expect(view.ledger.validated).toBe(false);
    expect(view.ledger.improvingCount).toBe(0);
    expect(view.ledger.upwardTrendCount).toBeGreaterThanOrEqual(1);
    // Detection trends up but is explicitly not validated.
    expect(view.ledger.ledgers.detection.trendDirection).toBe("UP");
    expect(view.ledger.ledgers.detection.status).toBe("FIXTURE_TREND");
    expect(view.ledger.ledgers.detection.improving).toBe(false);
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
