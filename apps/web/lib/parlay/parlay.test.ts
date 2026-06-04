import { describe, it, expect } from "vitest";
import { SAMPLE_LEGS, computeVitals, decimalToAmerican } from "./parlay";

describe("decimalToAmerican", () => {
  it("converts favourites and underdogs", () => {
    expect(decimalToAmerican(1.91)).toBe("-110");
    expect(decimalToAmerican(2.0)).toBe("+100");
    expect(decimalToAmerican(3.2)).toBe("+220");
  });
  it("guards degenerate input", () => {
    expect(decimalToAmerican(1)).toBe("—");
    expect(decimalToAmerican(0)).toBe("—");
  });
});

describe("computeVitals — the parlay genome math", () => {
  it("reads the full illustrative ticket as negative EV and Mutated", () => {
    const v = computeVitals(SAMPLE_LEGS);
    expect(v.count).toBe(SAMPLE_LEGS.length);
    expect(v.ev).toBeLessThan(0); // the lesson: the vig compounds
    expect(v.survivability).toBeLessThan(0.1); // brittle: all legs must hit
    expect(v.correlated.length).toBe(1); // the two Game-1 legs
    expect(v.verdict).toBe("Mutated"); // correlated + negative EV
  });

  it("flips to Balanced / positive EV when pared to the lone value leg", () => {
    const valueLeg = SAMPLE_LEGS.find((l) => l.id === "l1")!;
    const v = computeVitals([valueLeg]);
    expect(v.ev).toBeGreaterThan(0);
    expect(v.correlated.length).toBe(0);
    expect(v.verdict).toBe("Balanced");
  });

  it("treats an empty ticket as Empty", () => {
    const v = computeVitals([]);
    expect(v.verdict).toBe("Empty");
    expect(v.survivability).toBe(0);
  });

  it("surfaces the same-game correlation as a surgeon's note", () => {
    const v = computeVitals(SAMPLE_LEGS);
    expect(v.suggestions.some((s) => /Game 1/.test(s))).toBe(true);
  });
});
