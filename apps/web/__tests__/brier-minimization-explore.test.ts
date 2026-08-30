import { describe, expect, it } from "vitest";
import {
  explainLiveMurphy,
  resNeededForBrierFloor,
  BRIER_MINIMIZATION_LEVERS,
  summarizeBrierProgram,
  BRIER_OPTIMIZATION_TECHNIQUES,
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
    expect(BRIER_MINIMIZATION_LEVERS.some((l) => l.family === "forbidden")).toBe(true);
  });

  it("technique catalog present", () => {
    expect(BRIER_OPTIMIZATION_TECHNIQUES.some((t) => t.id === "murphy_target")).toBe(true);
    expect(BRIER_OPTIMIZATION_TECHNIQUES.some((t) => t.id === "integrity_delta")).toBe(true);
  });

  it("summarize program red", () => {
    const s = summarizeBrierProgram({
      brier: 0.25,
      reliability: 0.01,
      resolution: 0.005,
      uncertainty: 0.25,
    });
    expect(s.status).toBe("RED");
    expect(s.resGap).toBeGreaterThan(0);
  });
});
