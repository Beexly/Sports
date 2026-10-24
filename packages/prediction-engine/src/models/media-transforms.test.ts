import { describe, expect, it } from "vitest";
import {
  alphaFromHalfLife,
  geometricAdstock,
  hillWithSlope,
  logisticSaturation,
  michaelisMenten,
} from "./media-transforms.js";

describe("media transforms", () => {
  it("decays a one-shot spend by alpha^lag and hits half at kappa", () => {
    expect(geometricAdstock([1, 0, 0], 0.5, 3)).toEqual([1, 0.5, 0.25]);
    expect(alphaFromHalfLife(1)).toBeCloseTo(0.5);
    expect(hillWithSlope(4, 2, 4)).toBeCloseTo(0.5);
    expect(michaelisMenten(3, 10, 3)).toBeCloseTo(5);
    expect(logisticSaturation(0, 1)).toBeCloseTo(0);
    expect(() => geometricAdstock([1], 1.2, 2)).toThrow(/\[0, 1\]/);
  });
});
