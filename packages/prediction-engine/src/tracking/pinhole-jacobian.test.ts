import { describe, expect, it } from "vitest";
import {
  conditionNumber2x3,
  imageJacobian2x3,
  insituMeasureGate,
  projectPinhole,
  type Mat3,
  type Vec3,
} from "./pinhole-jacobian.js";

const I: Mat3 = {
  m: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
};
const K: Mat3 = {
  m: [
    [100, 0, 320],
    [0, 80, 240],
    [0, 0, 1],
  ],
};
const T: Vec3 = { x: 0, y: 0, z: 0 };

describe("pinhole jacobian", () => {
  it("projects the optical-axis point to the principal point", () => {
    const p = projectPinhole({ x: 0, y: 0, z: 10 }, K, I, T);
    expect(p.u).toBeCloseTo(320, 6);
    expect(p.v).toBeCloseTo(240, 6);
    expect(p.zCam).toBeCloseTo(10, 6);
  });

  it("matches the analytic 2x3 jacobian on the optical axis", () => {
    const j = imageJacobian2x3({ x: 0, y: 0, z: 10 }, K, I, T);
    expect(j).not.toBeNull();
    expect(j![0][0]).toBeCloseTo(10, 6);
    expect(j![0][1]).toBeCloseTo(0, 6);
    expect(j![0][2]).toBeCloseTo(0, 6);
    expect(j![1][1]).toBeCloseTo(8, 6);
    expect(conditionNumber2x3(j!)).toBeGreaterThan(1);
  });

  it("rejects behind-camera and occluded frames", () => {
    const behind = insituMeasureGate({ x: 0, y: 0, z: -1 }, K, I, T, 0);
    expect(behind.accept).toBe(false);
    expect(behind.reason).toBe("behind-camera");
    const occ = insituMeasureGate({ x: 0, y: 0, z: 10 }, K, I, T, 0.5);
    expect(occ.accept).toBe(false);
    expect(occ.reason).toBe("occluded");
    const ok = insituMeasureGate({ x: 0, y: 0, z: 10 }, K, I, T, 0.1);
    expect(ok.accept).toBe(true);
  });
});
