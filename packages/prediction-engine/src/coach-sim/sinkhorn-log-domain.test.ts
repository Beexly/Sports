import { describe, expect, it } from "vitest";
import { sinkhorn, sinkhornLogDomain } from "./sinkhorn-targets";

describe("log-domain Sinkhorn", () => {
  const r = [0.4, 0.35, 0.25];
  const c = [0.5, 0.3, 0.2];
  const C = [
    [0.0, 0.4, 1.0],
    [0.4, 0.0, 0.7],
    [1.0, 0.7, 0.0],
  ];

  it("recovers both marginals", () => {
    const { plan, info } = sinkhornLogDomain(r, c, C, 0.2);
    expect(info.converged).toBe(true);
    for (let i = 0; i < r.length; i++) {
      const row = plan[i]!.reduce((s, v) => s + v, 0);
      expect(row).toBeCloseTo(r[i]!, 6);
    }
    for (let j = 0; j < c.length; j++) {
      let col = 0;
      for (let i = 0; i < r.length; i++) col += plan[i]![j]!;
      expect(col).toBeCloseTo(c[j]!, 6);
    }
  });

  it("matches the scaling iteration at a moderate epsilon", () => {
    const stable = sinkhornLogDomain(r, c, C, 0.2).plan;
    const scaled = sinkhorn(r, c, C, 0.2);
    for (let i = 0; i < r.length; i++) {
      for (let j = 0; j < c.length; j++) {
        expect(stable[i]![j]!).toBeCloseTo(scaled[i]![j]!, 4);
      }
    }
  });
});
