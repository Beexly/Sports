/**
 * Vitest suite for arXiv:2609.20017 (Who Aggregates Information? Screening, Rent, and the Coexistence of CLOB and AMM Prediction Markets).
 * Gate: ADAPT is confirmed if inside-band book moves beat screened-book moves on close-direction prediction by >=4pp (p < 0.05) on the 2024 sample - i.e., the screening/pickoff distinction is real in sportsbook data; REJECT the classifier if both move types predict equally well (or equally poorly) - then book lines don't separate into informed vs recreational venues, and GSE should keep treating all line moves symmetrically.
 */
import { describe, it, expect } from "vitest";
import { signalBand, classifyBook, classHitRate } from "./2609-20017-who-aggregates-information-screening-rent";

describe("2609-20017 screening-band book classifier", () => {
  it("classifies tight inside-band quoters as pickoff-exposed", () => {
    const q = { book: "Sharp", line: -3.0, vol: 0.5, prevLine: -2.5 };
    expect(classifyBook(q, -3.0)).toBe("pickoff-exposed");
    const wide = { book: "Soft", line: -6.0, vol: 0.5, prevLine: -6.0 };
    expect(classifyBook(wide, -3.0)).toBe("screening");
    expect(() => signalBand(0, -1)).toThrow();
  });
  it("hit rate separates the classes on the gate metric", () => {
    const moves = [
      { cls: "pickoff-exposed" as const, predictedDir: 1 as const, actualDir: 1 as const },
      { cls: "pickoff-exposed" as const, predictedDir: 1 as const, actualDir: 1 as const },
      { cls: "pickoff-exposed" as const, predictedDir: -1 as const, actualDir: 1 as const },
      { cls: "screening" as const, predictedDir: 1 as const, actualDir: -1 as const },
      { cls: "screening" as const, predictedDir: 1 as const, actualDir: 1 as const },
    ];
    expect(classHitRate(moves, "pickoff-exposed")).toBeCloseTo(2 / 3, 10);
    expect(classHitRate(moves, "screening")).toBeCloseTo(0.5, 10);
    expect(Number.isNaN(classHitRate([], "pickoff-exposed"))).toBe(true);
  });
});
