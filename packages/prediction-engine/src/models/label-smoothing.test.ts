import { describe, expect, it } from "vitest";
import { smoothLabel } from "./label-smoothing.js";

describe("label smoothing", () => {
  it("moves mass off the annotated class and keeps the row summing to one", () => {
    const row = smoothLabel(0, 2, 0.2);
    expect(row[0]).toBeCloseTo(0.9);
    expect(row[1]).toBeCloseTo(0.1);
    expect(row[0] + row[1]).toBeCloseTo(1);
  });
});
