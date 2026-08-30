import { describe, expect, it } from "vitest";
import {
  clopperPearsonInterval,
  formatClopperPearsonPct,
} from "@/lib/performance/clopper-pearson-interval";

describe("clopperPearsonInterval presentation", () => {
  it("returns null when there is no sample", () => {
    expect(clopperPearsonInterval(0, 0)).toBeNull();
    expect(clopperPearsonInterval(1, -1)).toBeNull();
  });

  it("formats a 95% band as a percentage range", () => {
    const ci = clopperPearsonInterval(55, 100);
    expect(ci).not.toBeNull();
    expect(ci!.n).toBe(100);
    expect(ci!.point).toBeCloseTo(0.55, 4);
    expect(ci!.low).toBeLessThan(0.55);
    expect(ci!.high).toBeGreaterThan(0.55);
    expect(formatClopperPearsonPct(ci!)).toMatch(/^\d+\.\d-\d+\.\d%$/);
  });
});
