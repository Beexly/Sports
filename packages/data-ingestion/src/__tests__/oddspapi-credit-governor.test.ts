import { describe, expect, it } from "vitest";
import {
  decideOddsPapiCall,
  ODDSPAPI_MONTHLY_CREDITS,
  ODDSPAPI_DAILY_BUDGET,
  ODDSPAPI_BILLABLE_MIN_INTERVAL_MS,
  type OddsPapiCallDecisionInput,
} from "../oddspapi-credit-governor.js";

const NOW = new Date("2026-09-18T12:00:00Z");

function input(overrides: Partial<OddsPapiCallDecisionInput> = {}): OddsPapiCallDecisionInput {
  return { purpose: "historical", remaining: null, now: NOW, ...overrides };
}

describe("OddsPapi credit governor", () => {
  it("exposes the 250/month free-tier budget", () => {
    expect(ODDSPAPI_MONTHLY_CREDITS).toBe(250);
    expect(ODDSPAPI_DAILY_BUDGET).toBe(8);
  });

  describe("historical (unmetered) purpose", () => {
    it("allows when never observed", () => {
      expect(decideOddsPapiCall(input()).allow).toBe(true);
    });
    it("allows when credits remain", () => {
      expect(decideOddsPapiCall(input({ remaining: 200 })).allow).toBe(true);
    });
    it("holds on a FRESH zero (vendor blocks everything but /account)", () => {
      const d = decideOddsPapiCall(
        input({ remaining: 0, observedAt: NOW.toISOString() }),
      );
      expect(d.allow).toBe(false);
      expect(d.reason).toMatch(/exhausted/i);
    });
    it("allows a stale-zero /account probe to re-observe", () => {
      const d = decideOddsPapiCall(
        input({ remaining: 0, observedAt: "2026-08-01T00:00:00Z" }),
      );
      expect(d.allow).toBe(true);
      expect(d.reason).toMatch(/probe/i);
    });
  });

  describe("billable purpose", () => {
    it("allows with no observation (probe via unmetered /account)", () => {
      expect(decideOddsPapiCall(input({ purpose: "billable" })).allow).toBe(true);
    });
    it("holds on a fresh zero", () => {
      expect(
        decideOddsPapiCall(
          input({ purpose: "billable", remaining: 0, observedAt: NOW.toISOString() }),
        ).allow,
      ).toBe(false);
    });
    it("allows freely when pace funds the month", () => {
      const d = decideOddsPapiCall(input({ purpose: "billable", remaining: 250 }));
      expect(d.allow).toBe(true);
      expect(d.reason).toMatch(/pace ok/i);
    });
    it("rations to one call per interval when pace is below the floor", () => {
      // 1 credit left with ~321h to month end: far below the 0.333/h floor.
      const low = input({
        purpose: "billable",
        remaining: 1,
        lastBillableCallAt: null,
      });
      expect(decideOddsPapiCall(low).allow).toBe(true);
      const recent = input({
        purpose: "billable",
        remaining: 1,
        lastBillableCallAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      });
      expect(decideOddsPapiCall(recent).allow).toBe(false);
      // After the interval elapses, one more call may go out.
      const stale = input({
        purpose: "billable",
        remaining: 1,
        lastBillableCallAt: new Date(
          NOW.getTime() - ODDSPAPI_BILLABLE_MIN_INTERVAL_MS - 1000,
        ),
      });
      expect(decideOddsPapiCall(stale).allow).toBe(true);
    });
  });
});
