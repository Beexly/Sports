import { describe, expect, it } from "vitest";
import {
  explainLiveMurphy,
  resNeededForBrierFloor,
  BRIER_MINIMIZATION_LEVERS,
} from "@/lib/calibration/brier-minimization-explore";

describe("brier minimization explore", () => {
  it("res needed is positive when unc high", () => {
    const need = resNeededForBrierFloor(0.25, 0.22, 0.02);
    expect(need).toBeCloseTo(0.05, 5);
  });

  it("explains live murphy", () => {
    const s = explainLiveMurphy({
      brier: 0.2749,
      reliability: 0.0262,
      resolution: 0.0022,
      uncertainty: 0.2499,
    });
    expect(s).toMatch(/RES/);
    expect(s).toMatch(/ranking/i);
  });

  it("lists autonomous RES levers", () => {
    expect(BRIER_MINIMIZATION_LEVERS.some((l) => l.targets === "RES" && l.autonomous)).toBe(
      true,
    );
  });
});
