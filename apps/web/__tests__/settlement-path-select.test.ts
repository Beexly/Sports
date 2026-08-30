import { describe, it, expect } from "vitest";
import {
  diagnoseOddsKeyPresence,
  isFreePath,
  selectSettlementPath,
} from "@/lib/settlement/path-select";

describe("selectSettlementPath", () => {
  it("free when absent/blank/whitespace", () => {
    expect(selectSettlementPath(undefined)).toBe("free");
    expect(selectSettlementPath(null)).toBe("free");
    expect(selectSettlementPath("")).toBe("free");
    expect(selectSettlementPath("   ")).toBe("free");
  });
  it("odds-api when any non-empty key (including deactivated token)", () => {
    expect(selectSettlementPath("sk_live_x")).toBe("odds-api");
    expect(selectSettlementPath("deactivated")).toBe("odds-api");
  });
  it("isFreePath mirrors select", () => {
    expect(isFreePath("")).toBe(true);
    expect(isFreePath("x")).toBe(false);
  });
  it("diagnose tells operator to blank key when present", () => {
    const d = diagnoseOddsKeyPresence("still-there");
    expect(d.keyPresent).toBe(true);
    expect(d.path).toBe("odds-api");
    expect(d.operatorAction.toLowerCase()).toContain("delete");
  });
});
