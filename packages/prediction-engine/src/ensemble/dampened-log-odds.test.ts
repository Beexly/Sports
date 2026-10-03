
import { describe, expect, it } from "vitest";
import { dampenedLogOddsCombine, tuneDamping } from "./dampened-log-odds";

describe("dampened-log-odds", () => {
  it("damping=1 equals plain log-odds averaging", () => {
    expect(dampenedLogOddsCombine([0.7, 0.8], 1)).toBeCloseTo(
      1 / (1 + Math.exp(-((Math.log(0.7 / 0.3) + Math.log(0.8 / 0.2)) / 2))),
      10,
    );
  });
  it("damping < 1 pulls the consensus toward 0.5", () => {
    const full = dampenedLogOddsCombine([0.8, 0.9], 1);
    const damp = dampenedLogOddsCombine([0.8, 0.9], 0.5);
    expect(Math.abs(damp - 0.5)).toBeLessThan(Math.abs(full - 0.5));
  });
  it("tuneDamping picks the validation-best damping", () => {
    // members overconfident: true p ~ 0.6 but members say 0.9
    const members = Array.from({ length: 50 }, () => [0.9, 0.92]);
    const outcomes = Array.from({ length: 50 }, (_, i) => (i % 5 < 3 ? 1 : 0));
    const best = tuneDamping(members, outcomes, [0.3, 0.6, 1.0]);
    expect(best).toBeLessThan(1.0);
  });
  it("edge cases throw", () => {
    expect(() => dampenedLogOddsCombine([], 0.8)).toThrow();
    expect(() => dampenedLogOddsCombine([0.5], 0)).toThrow();
    expect(() => tuneDamping([], [], [0.5])).toThrow();
  });
});
