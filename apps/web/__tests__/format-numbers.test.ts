import { describe, expect, it } from "vitest";
import { dec, EM_DASH, int, pct, signed, TABULAR } from "@/lib/format/numbers";

/**
 * Shared number formatting for performance/calibration surfaces
 * (docs/POLISH_BACKLOG.md #4 — tabular-nums everywhere, one-decimal standard).
 */
describe("lib/format/numbers", () => {
  describe("pct", () => {
    it("defaults to one decimal (percent-scale input)", () => {
      expect(pct(54.32)).toBe("54.3%");
      expect(pct(60)).toBe("60.0%");
      expect(pct(0)).toBe("0.0%");
    });

    it("honors a digits override", () => {
      expect(pct(54.327, 2)).toBe("54.33%");
      expect(pct(54.32, 0)).toBe("54%");
    });

    it("returns an em-dash for missing values", () => {
      expect(pct(null)).toBe(EM_DASH);
      expect(pct(undefined)).toBe(EM_DASH);
      expect(pct(Number.NaN)).toBe(EM_DASH);
      expect(pct(Number.POSITIVE_INFINITY)).toBe(EM_DASH);
    });
  });

  describe("dec", () => {
    it("defaults to one decimal", () => {
      expect(dec(2.345)).toBe("2.3");
      expect(dec(7)).toBe("7.0");
    });

    it("honors a digits override (e.g. Brier at 3)", () => {
      expect(dec(0.187, 3)).toBe("0.187");
      expect(dec(0.25, 3)).toBe("0.250");
    });

    it("returns an em-dash for missing values", () => {
      expect(dec(null)).toBe(EM_DASH);
      expect(dec(undefined)).toBe(EM_DASH);
      expect(dec(Number.NaN)).toBe(EM_DASH);
    });
  });

  describe("signed", () => {
    it("prefixes positives, keeps negatives, one-decimal default", () => {
      expect(signed(1.25)).toBe("+1.3");
      expect(signed(-1.25)).toBe("-1.3");
    });

    it("renders zero unsigned (including negative values that round to zero)", () => {
      expect(signed(0)).toBe("0.0");
      expect(signed(-0.04)).toBe("0.0");
      expect(signed(0.04)).toBe("0.0");
    });

    it("honors a digits override", () => {
      expect(signed(2.345, 2)).toBe("+2.35");
      expect(signed(-2, 0)).toBe("-2");
    });

    it("returns an em-dash for missing values", () => {
      expect(signed(null)).toBe(EM_DASH);
      expect(signed(undefined)).toBe(EM_DASH);
      expect(signed(Number.NaN)).toBe(EM_DASH);
    });
  });

  describe("int", () => {
    it("rounds to a whole number", () => {
      expect(int(7)).toBe("7");
      expect(int(7.6)).toBe("8");
      expect(int(0)).toBe("0");
    });

    it("groups thousands (en-US)", () => {
      expect(int(1234.6)).toBe("1,235");
      expect(int(1000000)).toBe("1,000,000");
    });

    it("returns an em-dash for missing values", () => {
      expect(int(null)).toBe(EM_DASH);
      expect(int(undefined)).toBe(EM_DASH);
      expect(int(Number.NaN)).toBe(EM_DASH);
    });
  });

  it("exports the tabular-nums utility class for stat alignment", () => {
    expect(TABULAR).toBe("tabular-nums");
  });
});
