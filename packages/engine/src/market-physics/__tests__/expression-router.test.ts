import { describe, it, expect } from "vitest";
import { route, type ExpressionInput } from "../expression-router.js";

function input(over: Partial<ExpressionInput> = {}): ExpressionInput {
  return {
    ledgerStatus: "ACTIVE",
    clv: "pass",
    settlement: "pass",
    liquidityChecked: true,
    timestamp: "2024-09-08T16:00:00Z",
    book: "pinnacle",
    line: 70.5,
    isBestNumber: true,
    ...over,
  };
}

describe("expression router", () => {
  it("LOCK_NOW for an active, settlement-proven edge at the best number", () => {
    const o = route(input());
    expect(o.expression).toBe("LOCK_NOW");
    expect(o.evidenceClass).toBe("both");
    expect(o.confidence).toBeGreaterThan(0.5);
    expect(o.book).toBe("pinnacle");
    expect(o.line).toBe(70.5);
  });

  it("LINE_SHOP_ONLY when not the best number", () => {
    expect(route(input({ isBestNumber: false })).expression).toBe("LINE_SHOP_ONLY");
  });

  it("WAIT_FOR_BETTER_NUMBER when the line is expected to move our way", () => {
    expect(route(input({ expectsFavorableMove: true })).expression).toBe("WAIT_FOR_BETTER_NUMBER");
  });

  it("REQUIRES_LIQUIDITY_CHECK when limits are unverified", () => {
    expect(route(input({ liquidityChecked: false })).expression).toBe("REQUIRES_LIQUIDITY_CHECK");
  });

  it("SETTLEMENT_CANDIDATE when settlement-proven but not yet ACTIVE", () => {
    expect(route(input({ ledgerStatus: "SHADOW_READY" })).expression).toBe("SETTLEMENT_CANDIDATE");
  });

  it("CLV_ONLY_NOT_SETTLEMENT_PROVEN when only CLV passed", () => {
    const o = route(input({ settlement: "not_run", ledgerStatus: "SHADOW_COLLECTING" }));
    expect(o.expression).toBe("CLV_ONLY_NOT_SETTLEMENT_PROVEN");
    expect(o.evidenceClass).toBe("clv");
  });

  it("REJECTED_FAKE_EDGE for a rejected ledger or settlement-negative", () => {
    expect(route(input({ ledgerStatus: "REJECTED" })).expression).toBe("REJECTED_FAKE_EDGE");
    expect(route(input({ settlement: "fail" })).expression).toBe("REJECTED_FAKE_EDGE");
  });

  it("SHADOW_CANDIDATE / WATCH / PASS by ledger status with no settlement/CLV", () => {
    expect(route(input({ clv: "not_run", settlement: "not_run", ledgerStatus: "SHADOW_COLLECTING" })).expression).toBe("SHADOW_CANDIDATE");
    expect(route(input({ clv: "not_run", settlement: "not_run", ledgerStatus: "WATCHLIST" })).expression).toBe("WATCH");
    expect(route(input({ clv: "not_run", settlement: "not_run", ledgerStatus: "WATCHLIST", contradiction: undefined })).book).toBe("pinnacle");
  });

  it("carries the supporting contradiction and timestamp through", () => {
    const o = route(input({ contradiction: "total moved 3 but RB rush prop did not" }));
    expect(o.supportingContradiction).toContain("total moved");
    expect(o.timestamp).toBe("2024-09-08T16:00:00Z");
  });
});
