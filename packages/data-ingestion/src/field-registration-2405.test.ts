import { describe, expect, it } from "vitest";
import { homographyTransform, registrationError, registrationGatePasses } from "./field-registration-2405.js";

const IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as [[number, number, number], [number, number, number], [number, number, number]];

describe("field registration", () => {
  it("identity homography is a fixed point", () => {
    const t = homographyTransform(IDENTITY, { px: 3, py: 4 });
    expect(t.x).toBeCloseTo(3, 10);
    expect(t.y).toBeCloseTo(4, 10);
  });
  it("translation homography shifts points", () => {
    const H = [[1, 0, 10], [0, 1, 5], [0, 0, 1]] as typeof IDENTITY;
    const t = homographyTransform(H, { px: 0, py: 0 });
    expect(t.x).toBeCloseTo(10, 10);
    expect(t.y).toBeCloseTo(5, 10);
  });
  it("registration error is 0 for a perfect homography", () => {
    const err = registrationError(IDENTITY, [
      { frame: { px: 1, py: 1 }, field: { x: 1, y: 1 } },
      { frame: { px: 2, py: 3 }, field: { x: 2, y: 3 } },
    ]);
    expect(err).toBeCloseTo(0, 10);
    expect(registrationGatePasses(err)).toBe(true);
  });
  it("returns Infinity on empty controls and fails the gate", () => {
    expect(registrationError(IDENTITY, [])).toBe(Infinity);
    expect(registrationGatePasses(Infinity)).toBe(false);
  });
});

