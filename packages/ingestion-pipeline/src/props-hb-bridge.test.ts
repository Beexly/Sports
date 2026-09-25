import { describe, expect, it } from "vitest";
import {
  buildModelProbOver,
  estimatePropOver,
} from "./props-hb-bridge.js";

const samples = [
  { games: 10, total: 20 },
  { games: 10, total: 80 },
  { games: 10, total: 50 },
  { games: 12, total: 90 },
  { games: 8, total: 15 },
];

describe("props-hb-bridge", () => {
  it("estimates P(over) from rate samples", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples,
      line: 5.5,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.pOver).toBeGreaterThan(0);
      expect(r.data.pOver).toBeLessThan(1);
      expect(r.data.pOver + r.data.pUnder).toBeCloseTo(1, 5);
      expect(r.data.prior.alpha).toBeGreaterThan(0);
      expect(r.data.posterior.alpha).toBeGreaterThan(0);
    }
  });

  it("fail-closes on empty samples", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples: [],
      line: 5.5,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no rate samples");
  });

  it("fail-closes on invalid line", () => {
    const r = estimatePropOver({
      playerId: "p1",
      propType: "receptions",
      samples,
      line: Number.NaN,
    });
    expect(r.ok).toBe(false);
  });

  it("buildModelProbOver keys by playerId:propType and records failures", () => {
    const { modelProbOver, failures } = buildModelProbOver([
      { playerId: "p1", propType: "receptions", samples, line: 5.5 },
      { playerId: "p2", propType: "yards", samples: [], line: 45.5 },
    ]);
    expect(Object.keys(modelProbOver)).toEqual(["p1:receptions"]);
    expect(modelProbOver["p1:receptions"]).toBeGreaterThan(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.key).toBe("p2:yards");
  });
});
