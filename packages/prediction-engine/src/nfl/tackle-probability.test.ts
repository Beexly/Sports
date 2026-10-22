import { describe, expect, it } from "vitest";
import {
  blockersBetween,
  encircleQuadrants,
  isChaseDown,
  isGroupTackle,
  isOpenField,
  missedTackleRateBand,
  tackleApproach,
  tackleEfficiency,
  tacklePlayPoints,
  tackleYardsSaved,
} from "./tackle-probability.js";

describe("tackle probability derivatives", () => {
  it("counts a 10-second play, a clean game, and a group tackle", () => {
    expect(tacklePlayPoints(10)).toBe(22000);
    expect(tackleEfficiency(15, 15)).toBe(1);
    expect(tackleEfficiency(0, 0)).toBeNull();
    expect(missedTackleRateBand(0.17)).toBe("in-band");
    expect(isGroupTackle(3)).toBe(true);
    expect(isGroupTackle(2)).toBe(false);
  });

  it("separates downhill from a chase and counts a blocker on the line", () => {
    expect(tackleApproach({ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 1, y: 0 })).toBe("downhill");
    expect(tackleApproach({ x: 0, y: 0 }, { x: -4, y: 0 }, { x: 1, y: 0 })).toBe("upfield");
    expect(isChaseDown("upfield", 8, 5)).toBe(true);
    expect(isChaseDown("downhill", 8, 5)).toBe(false);
    expect(isOpenField(0)).toBe(true);
    expect(blockersBetween({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: 5, y: 0 }, { x: 5, y: 4 }], 1)).toBe(1);
    expect(encircleQuadrants([0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2])).toBe(4);
    expect(tackleYardsSaved(8, 3)).toBe(5);
  });
});
