import { describe, expect, it } from "vitest";
import {
  MURPHY_RES_DEFINITION,
  buildMurphyResSnapshot,
} from "@/lib/calibration/murphy-res-definition";

describe("Murphy RES definition", () => {
  it("states higher-is-better and forbids map/win-rate confusion", () => {
    expect(MURPHY_RES_DEFINITION.higherIsBetter).toBe(true);
    expect(MURPHY_RES_DEFINITION.notTheSameAs.some((s) => /win rate/i.test(s))).toBe(
      true,
    );
    expect(MURPHY_RES_DEFINITION.howNotToRaise.some((s) => /Platt/i.test(s))).toBe(
      true,
    );
  });

  it("buildMurphyResSnapshot matches live identity class and gap math", () => {
    const snap = buildMurphyResSnapshot({
      brier: 0.2749,
      reliability: 0.0262,
      resolution: 0.0022,
      uncertainty: 0.2499,
    });
    expect(snap.live.resNeededForBrierFloor).toBeCloseTo(0.02 + 0.2499 - 0.22, 4);
    expect(snap.live.resGap).toBeGreaterThan(0.04);
    expect(snap.explain).toContain("RES");
    expect(snap.live.separationHint.toLowerCase()).toContain("res");
  });
});
