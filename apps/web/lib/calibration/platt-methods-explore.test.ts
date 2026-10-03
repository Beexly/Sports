import { describe, expect, it } from "vitest";
import {
  explorePlattMethods,
  plattMethodCatalog,
  smokePlattMap,
} from "@/lib/calibration/platt-methods-explore";

describe("platt-methods-explore", () => {
  it("catalog marks raisesRes false and gate respects RES", () => {
    const closed = plattMethodCatalog(false);
    expect(closed.every((m) => m.raisesRes === false)).toBe(true);
    expect(closed.find((m) => m.id === "map_irls")!.applyAllowed).toBe(false);
    const open = plattMethodCatalog(true);
    expect(open.find((m) => m.id === "map_irls")!.applyAllowed).toBe(true);
  });

  it("explore keeps applyGate closed when liveRes low", () => {
    const train = Array.from({ length: 80 }, (_, i) => ({
      p: 0.2 + (i % 10) * 0.06,
      y: (i % 3 === 0 ? 1 : 0) as 0 | 1,
    }));
    const test = train.slice(0, 40);
    const art = explorePlattMethods({
      train,
      test,
      liveRes: 0.002,
    });
    expect(art.applyGateOpen).toBe(false);
    expect(art.holdout?.brierByMethod.identity).toBeGreaterThan(0);
  });

  it("smoke MAP produces finite A,B", () => {
    const samples = [
      ...Array.from({ length: 40 }, () => ({ p: 0.9, y: 1 as const })),
      ...Array.from({ length: 40 }, () => ({ p: 0.1, y: 0 as const })),
    ];
    const fit = smokePlattMap(samples);
    expect(Number.isFinite(fit.params.A)).toBe(true);
    expect(Number.isFinite(fit.params.B)).toBe(true);
  });
});
