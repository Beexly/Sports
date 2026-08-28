import { describe, expect, it } from "vitest";
import {
  creditTelemetry,
  daysLeftInWindow,
  decideCreditSpend,
  DEFAULT_CREDIT_CONFIG,
  sportMonthlyAllowance,
  type CreditBudgetConfig,
} from "../credit-governor.js";

const cfg = (over: Partial<CreditBudgetConfig> = {}): CreditBudgetConfig => ({
  ...DEFAULT_CREDIT_CONFIG,
  ...over,
});

describe("credit-governor", () => {
  describe("daysLeftInWindow", () => {
    it("counts remaining days including today for a day-1 reset (30-day month)", () => {
      // day 1 -> 30 left; day 15 -> 16 left; day 30 -> 1 left
      expect(daysLeftInWindow(1, 1, 30)).toBe(30);
      expect(daysLeftInWindow(15, 1, 30)).toBe(16);
      expect(daysLeftInWindow(30, 1, 30)).toBe(1);
    });
  });

  describe("sportMonthlyAllowance", () => {
    it("even-splits the monthly budget across sportCount when no explicit share", () => {
      expect(sportMonthlyAllowance("americanfootball_nfl", cfg({ sportCount: 8 }))).toBe(2500);
    });
    it("honors an explicit per-sport share", () => {
      expect(
        sportMonthlyAllowance(
          "americanfootball_nfl",
          cfg({ perSportShare: { americanfootball_nfl: 8000 } }),
        ),
      ).toBe(8000);
    });
  });

  describe("decideCreditSpend — live calls", () => {
    it("allows a live call when comfortably above the pace floor", () => {
      const d = decideCreditSpend("americanfootball_nfl", 1, 20_000, cfg({ nowDayOfMonth: 1, sportCount: 8 }));
      expect(d.allowed).toBe(true);
      expect(d.historical).toBe(false);
      expect(d.dailyPaceTarget).toBe(Math.floor(2500 / 30)); // ~83
    });

    it("refuses when the spend would exceed upstream remaining", () => {
      const d = decideCreditSpend("americanfootball_nfl", 5, 3, cfg({ nowDayOfMonth: 1 }));
      expect(d.allowed).toBe(false);
      expect(d.projectedRemaining).toBe(3 - 5);
    });
  });

  describe("decideCreditSpend — pace-based early-stop on historical (10x)", () => {
    it("refuses a 10x historical pull once remaining drops below the daily pace floor", () => {
      // allowance 2500, day 1 of 30 => pace floor ~83. 1 historical call costs 10.
      // remaining 50 < 83 => refused.
      const d = decideCreditSpend(
        "americanfootball_nfl",
        1,
        50,
        cfg({ nowDayOfMonth: 1, sportCount: 8 }),
        { historical: true },
      );
      expect(d.allowed).toBe(false);
      expect(d.historical).toBe(true);
      expect(d.reason).toContain("historical 10x pull refused");
    });

    it("allows a 10x historical pull when remaining is above the pace floor", () => {
      const d = decideCreditSpend(
        "americanfootball_nfl",
        1,
        5_000,
        cfg({ nowDayOfMonth: 1, sportCount: 8 }),
        { historical: true },
      );
      expect(d.allowed).toBe(true);
      expect(d.projectedRemaining).toBe(5_000 - 10);
    });

    it("applies the 10x multiplier to the effective cost", () => {
      // Historical pull of 2 => effective 20; remaining 19 => over budget.
      const d = decideCreditSpend(
        "americanfootball_nfl",
        2,
        19,
        cfg({ nowDayOfMonth: 1, sportCount: 8 }),
        { historical: true },
      );
      expect(d.allowed).toBe(false);
      expect(d.projectedRemaining).toBe(19 - 20);
    });
  });

  describe("decideCreditSpend — keyless path (no signal)", () => {
    it("never refuses on credit grounds when remainingRequests is null, but reports the pace target", () => {
      const d = decideCreditSpend("espn_public_sport", 1, null, cfg({ nowDayOfMonth: 1 }));
      expect(d.allowed).toBe(true);
      expect(d.projectedRemaining).toBe(-1);
      expect(d.dailyPaceTarget).toBeGreaterThan(0);
      expect(d.reason).toContain("keyless");
    });
  });

  describe("creditTelemetry (cockpit)", () => {
    it("flags under-pace-floor when remaining is below the daily target", () => {
      const t = creditTelemetry("americanfootball_nfl", 40, cfg({ nowDayOfMonth: 1, sportCount: 8 }));
      expect(t.monthlyAllowance).toBe(2500);
      expect(t.dailyPaceTarget).toBe(83);
      expect(t.underPaceFloor).toBe(true);
    });
    it("is not under pace floor when remaining is healthy", () => {
      const t = creditTelemetry("americanfootball_nfl", 9_000, cfg({ nowDayOfMonth: 1, sportCount: 8 }));
      expect(t.underPaceFloor).toBe(false);
    });
  });
});
