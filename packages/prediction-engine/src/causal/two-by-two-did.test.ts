import { describe, expect, it } from "vitest";
import { differenceInDifferences } from "./two-by-two-did.js";

describe("two by two difference in differences", () => {
  it("returns the interaction and ignores a shared trend", () => {
    expect(differenceInDifferences(10, 18, 10, 12)).toBe(6);
    expect(differenceInDifferences(10, 14, 4, 8)).toBe(0);
  });
});
