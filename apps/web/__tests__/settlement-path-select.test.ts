import { describe, it, expect } from "vitest";
import {
  diagnoseOddsKeyPresence,
  isFreePath,
  selectSettlementPath,
  selectSettlementPlan,
} from "@/lib/settlement/path-select";

describe("selectSettlementPath (legacy two-value contract)", () => {
  it("free when absent/blank/whitespace", () => {
    expect(selectSettlementPath(undefined)).toBe("free");
    expect(selectSettlementPath(null)).toBe("free");
    expect(selectSettlementPath("")).toBe("free");
    expect(selectSettlementPath("   ")).toBe("free");
  });
  it("odds-api (supplement available) when any non-empty key, including a deactivated token", () => {
    expect(selectSettlementPath("sk_live_x")).toBe("odds-api");
    expect(selectSettlementPath("deactivated")).toBe("odds-api");
  });
  it("isFreePath mirrors select", () => {
    expect(isFreePath("")).toBe(true);
    expect(isFreePath("x")).toBe(false);
  });
});

describe("selectSettlementPlan (free-first law, 2026-09-02)", () => {
  it("the primary grader is free no matter what the key says", () => {
    expect(selectSettlementPlan(undefined).primary).toBe("free");
    expect(selectSettlementPlan("").primary).toBe("free");
    expect(selectSettlementPlan("deactivated").primary).toBe("free");
    expect(selectSettlementPlan("sk_live_x").primary).toBe("free");
  });
  it("adds the paid supplement only when a key is present", () => {
    expect(selectSettlementPlan(undefined)).toEqual({ primary: "free", paidSupplement: false, label: "free" });
    expect(selectSettlementPlan("   ")).toEqual({ primary: "free", paidSupplement: false, label: "free" });
    expect(selectSettlementPlan("sk_live_x")).toEqual({
      primary: "free",
      paidSupplement: true,
      label: "free+odds-api",
    });
  });
  it("?path=free forces the supplement off even with a key", () => {
    expect(selectSettlementPlan("sk_live_x", { forceFree: true })).toEqual({
      primary: "free",
      paidSupplement: false,
      label: "free",
    });
  });
});

describe("diagnoseOddsKeyPresence", () => {
  it("with a key present, says the free grader still runs first and how to read a dead key", () => {
    const d = diagnoseOddsKeyPresence("still-there");
    expect(d.keyPresent).toBe(true);
    expect(d.path).toBe("odds-api");
    expect(d.operatorAction).toMatch(/free grader runs first/i);
    expect(d.operatorAction).toMatch(/paidSupplement\.failedSports/);
  });
  it("with no key, says free only", () => {
    const d = diagnoseOddsKeyPresence("");
    expect(d.keyPresent).toBe(false);
    expect(d.path).toBe("free");
    expect(d.operatorAction).toMatch(/path:free/);
  });
});
