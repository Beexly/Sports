import { describe, expect, it } from "vitest";
import { gradCamMap, guidedBackpropGate, guidedGradCam } from "./grad-cam.js";

describe("grad-cam", () => {
  it("keeps a positive location and zeros a negative one", () => {
    expect(gradCamMap([[1, -2]], [[1, 1]])).toEqual([1, 0]);
    expect(guidedBackpropGate(1, 0.4)).toBeCloseTo(0.4);
    expect(guidedBackpropGate(-1, 0.4)).toBe(0);
    expect(guidedGradCam([2, 0], [0.5, 0.5])).toEqual([1, 0]);
  });
});
