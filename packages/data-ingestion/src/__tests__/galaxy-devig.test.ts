import { describe, expect, it } from "vitest";
import { americanToDecimal, deVigFairProbs } from "../galaxy-devig.js";

describe("americanToDecimal", () => {
  it("maps favorite and dog", () => {
    expect(americanToDecimal(-159)).toBeCloseTo(1 + 100 / 159, 6);
    expect(americanToDecimal(132)).toBeCloseTo(2.32, 6);
  });
  it("returns null for junk", () => {
    expect(americanToDecimal(0)).toBeNull();
    expect(americanToDecimal(Number.NaN)).toBeNull();
  });
});

describe("deVigFairProbs — Galaxy formula p_i = (1/O_i) / sum(1/O_j)", () => {
  it("Bills -159 / +132 → 0.5875 / 0.4125 (verified 2026-08-27)", () => {
    const p = deVigFairProbs([
      { name: "BUF", price: -159 },
      { name: "PIT", price: 132 },
    ]);
    expect(p["BUF"]).toBeCloseTo(0.5875, 3);
    expect(p["PIT"]).toBeCloseTo(0.4125, 3);
    expect((p["BUF"] ?? 0) + (p["PIT"] ?? 0)).toBeCloseTo(1, 4);
  });
  it("skips when a side has no price (never invents -110)", () => {
    expect(deVigFairProbs([{ name: "A", price: -110 }, { name: "B" }])).toEqual({});
  });
});
