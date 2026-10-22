import { describe, expect, it } from "vitest";
import { keyNumberMass } from "./key-number-mass.js";

describe("key number mass", () => {
  it("counts rounded margins that land on a key number", () => {
    const mass = keyNumberMass([3, 3.2, 7, -7, 10], [3, 7, 10]);
    expect(mass[3]).toBeCloseTo(0.4);
    expect(mass[7]).toBeCloseTo(0.4);
    expect(mass[10]).toBeCloseTo(0.2);
  });
});
