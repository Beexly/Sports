/**
 * Vitest suite for arXiv:2509.23455v1 (3DPCNet: Pose Canonicalization for Robust Viewpoint-Invariant 3D Kinematic Analysis from Monocular RGB cameras).
 * Gate: Adopt the canonicalization layer if on real multi-angle NFL film it reduces cross-view MPJPE by >=20% vs the geometric baseline AND median frame-to-frame rotation jitter is <=2 degrees after temporal smoothing.
 */
import { describe, it, expect } from "vitest";
import { hipYaw, canonicalizePose, mpjpe, rotationJitter, Joint3D } from "./2509-23455v1-3dpcnet-pose-canonicalization-for-robust";

describe("2509-23455v1 pose canonicalization", () => {
  it("canonicalization is yaw-invariant", () => {
    const mk = (yaw: number): Joint3D[] => {
      const rot = (x: number, z: number): Joint3D => [
        x * Math.cos(yaw) - z * Math.sin(yaw), 0, x * Math.sin(yaw) + z * Math.cos(yaw),
      ];
      return [rot(-0.2, 0), rot(0.2, 0), rot(0, 1)]; // hips + nose
    };
    const a = canonicalizePose(mk(0.5), 0, 1);
    const b = canonicalizePose(mk(1.7), 0, 1);
    expect(mpjpe(a, b)).toBeLessThan(1e-9);
    expect(() => canonicalizePose(mk(0), 0, 9)).toThrow();
  });
  it("MPJPE and jitter behave", () => {
    const p: Joint3D[] = [[0, 0, 0], [1, 0, 0]];
    expect(mpjpe(p, p)).toBe(0);
    expect(rotationJitter([0, 0.01, 0.02, 0.015])).toBeLessThan(2);
    expect(() => mpjpe(p, [[0, 0, 0]])).toThrow();
    expect(() => rotationJitter([1])).toThrow();
  });
});
