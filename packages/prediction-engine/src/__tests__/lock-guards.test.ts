import { describe, expect, it } from "vitest";
import {
  guardCapture,
  guardCaptureRow,
  plausibleAmericanPrice,
  spreadSignConsistent,
  type CaptureOddsRow,
} from "../lock-guards.js";

describe("lock-guards", () => {
  describe("plausibleAmericanPrice", () => {
    it("accepts normal prices", () => {
      expect(plausibleAmericanPrice(-110)).toBe(true);
      expect(plausibleAmericanPrice(150)).toBe(true);
      expect(plausibleAmericanPrice(-10000)).toBe(true);
      expect(plausibleAmericanPrice(10000)).toBe(true);
    });
    it("rejects 0, non-finite, and out-of-range prices", () => {
      expect(plausibleAmericanPrice(0)).toBe(false);
      expect(plausibleAmericanPrice(undefined)).toBe(false);
      expect(plausibleAmericanPrice(NaN)).toBe(false);
      expect(plausibleAmericanPrice(-50000)).toBe(false);
      expect(plausibleAmericanPrice(50000)).toBe(false);
    });
  });

  describe("spreadSignConsistent", () => {
    it("passes when spread<0 (home favored) and lock selects home", () => {
      expect(spreadSignConsistent(-3.5, true).ok).toBe(true);
    });
    it("passes when spread>0 (home underdog) and lock selects away", () => {
      expect(spreadSignConsistent(3.5, false).ok).toBe(true);
    });
    it("quarantines a sign flip (home favored but lock picks away)", () => {
      const v = spreadSignConsistent(-3.5, false);
      expect(v.ok).toBe(false);
      expect(v.reason).toContain("spread sign");
    });
    it("quarantines a sign flip (home underdog but lock picks home)", () => {
      const v = spreadSignConsistent(3.5, true);
      expect(v.ok).toBe(false);
    });
    it("passes through when no spread is present", () => {
      expect(spreadSignConsistent(undefined, true).ok).toBe(true);
    });
  });

  describe("guardCaptureRow", () => {
    it("passes a clean H2H row", () => {
      const row: CaptureOddsRow = { bookmaker: "dk", market: "H2H", homePrice: -150, awayPrice: 130 };
      expect(guardCaptureRow(row, true).ok).toBe(true);
    });
    it("quarantines an H2H row with an implausible away ML price", () => {
      const row: CaptureOddsRow = { bookmaker: "dk", market: "H2H", homePrice: -150, awayPrice: -50000 };
      const v = guardCaptureRow(row, true);
      expect(v.ok).toBe(false);
      expect(v.reason).toContain("implausible away ML price");
    });
    it("quarantines a SPREADS row with a 0 home spread price", () => {
      const row: CaptureOddsRow = {
        bookmaker: "dk",
        market: "SPREADS",
        spread: -3.5,
        homeSpreadPrice: 0,
        awaySpreadPrice: -110,
      };
      const v = guardCaptureRow(row, true);
      expect(v.ok).toBe(false);
      expect(v.reason).toContain("implausible home spread price");
    });
  });

  describe("guardCapture (batch filter)", () => {
    it("keeps clean rows and quarantines bad ones, reporting reasons", () => {
      const rows: CaptureOddsRow[] = [
        { bookmaker: "dk", market: "H2H", homePrice: -150, awayPrice: 130 },
        { bookmaker: "bad", market: "H2H", homePrice: -150, awayPrice: 0 },
        { bookmaker: "flip", market: "SPREADS", spread: -3.5, homeSpreadPrice: -110, awaySpreadPrice: -110 },
      ];
      const result = guardCapture(rows, (r) => r.market === "SPREADS" ? false : true);
      // row 0 kept, row 1 quarantined (price), row 2 quarantined (sign flip: home favored but selected away)
      expect(result.kept).toHaveLength(1);
      expect(result.quarantined).toHaveLength(2);
      expect(result.quarantined.map((q) => q.reason)).toEqual(
        expect.arrayContaining([
          expect.stringContaining("implausible away ML price"),
          expect.stringContaining("spread sign"),
        ]),
      );
    });
  });
});
