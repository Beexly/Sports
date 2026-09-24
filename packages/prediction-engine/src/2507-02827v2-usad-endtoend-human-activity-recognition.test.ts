/**
 * Vitest suite for arXiv:2507.02827v2 (USAD: End-to-End Human Activity Recognition via Diffusion Model with Spatiotemporal Attention).
 * Gate: Accept as evidence that statistics-guided diffusion augmentation + adaptive composite loss improves imbalanced time-series classification; port only the augmentation recipe and composite loss, skipping the network.
 */
import { describe, it, expect } from "vitest";
import { conditioningVector, classBalancedCounts, focalLoss, adaptiveCompositeLoss } from "./2507-02827v2-usad-endtoend-human-activity-recognition";

describe("2507-02827v2 statistics-guided diffusion augmentation", () => {
  it("conditioning vector z-scores kinematic stats", () => {
    const v = conditioningVector(
      { speed: 8, accel: 2 },
      new Map([["accel", 0], ["speed", 5]]),
      new Map([["accel", 1], ["speed", 2]]),
    );
    expect(v).toEqual([2, 1.5]); // sorted keys: accel, speed
    expect(() => conditioningVector({ a: 1 }, new Map([["a", 0]]), new Map([["a", 0]]))).toThrow();
  });
  it("class balancing tops up rare classes", () => {
    const out = classBalancedCounts(new Map([["broken_tackle", 12], ["normal", 900]]), 200);
    expect(out.get("broken_tackle")).toBe(188);
    expect(out.get("normal")).toBe(0);
    expect(() => classBalancedCounts(new Map(), 0)).toThrow();
  });
  it("composite loss emphasizes rare positives", () => {
    const rare = adaptiveCompositeLoss(0.4, 1, 0.02, 2);
    const common = adaptiveCompositeLoss(0.4, 1, 0.4, 2);
    expect(rare).toBeGreaterThan(common);
    expect(() => focalLoss(0.5, 1, -1, 0.5)).toThrow();
    expect(() => adaptiveCompositeLoss(0.5, 1, 0, 2)).toThrow();
  });
});
