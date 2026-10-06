/**
 * Vitest suite for arXiv:2506.01373v1 (No Train Yet Gain: Towards Generic Multi-Object Tracking in Sports and Beyond).
 * Gate: ADOPT the McByte gating pattern if the McByte variant reduces ID switches by ≥ 30% vs ByteTrack on the 3-segment window with HOTA ≥ baseline; REJECT (keep ByteTrack/OC-SORT) if the gain is < 10% or throughput falls below 10 FPS offline-batch equivalent.
 */
import { describe, it, expect } from "vitest";
import { majorityVote, associationCost, countIdSwitches, idSwitchReduction } from "./2506-01373v1-no-train-yet-gain-towards";

describe("2506-01373v1 McByte gating with OCR cue", () => {
  it("majority vote picks the modal jersey number", () => {
    expect(majorityVote([11, null, 11, 22, 11])).toBe(11);
    expect(majorityVote([null, null])).toBeNull();
  });
  it("OCR match discounts the association cost", () => {
    const base = associationCost(0.5, 0.3, 0.9, 11, 22, 1.0);
    const matched = associationCost(0.5, 0.3, 0.9, 11, 11, 1.0);
    expect(matched).toBeLessThan(base);
    expect(matched).toBeCloseTo(0.5 + 0.3 - 0.9, 10);
    expect(() => associationCost(0.5, 0.3, 2, 11, 11, 1)).toThrow();
  });
  it("counts ID switches across frames", () => {
    const matches = [
      [1, 2],
      [1, 2],
      [3, 2], // tracklet 0 switches 1 -> 3
      [3, 2],
    ];
    expect(countIdSwitches(matches)).toBe(1);
    expect(idSwitchReduction(10, 6)).toBeCloseTo(0.4, 10);
    expect(() => idSwitchReduction(0, 1)).toThrow();
  });
});
