import { describe, expect, it } from "vitest";
import { BOOK_PICK_AUTHORIZATION, bookPickVerdictGate } from "./book-pick-verdict-gate.js";

describe("bookPickVerdictGate", () => {
  it("allows only the explicit authorization", () => {
    const gate = bookPickVerdictGate(BOOK_PICK_AUTHORIZATION);
    expect(gate.publishable).toBe(true);
    expect(gate.reasonCode).toBe("TRACE_VERDICT_GROUNDED");
  });

  it.each([
    ["WITHHELD", "TRACE_VERDICT_WITHHELD"],
    ["INSUFFICIENT", "TRACE_VERDICT_INSUFFICIENT"],
    ["INVALID", "TRACE_VERDICT_INVALID"],
    ["ASSOCIATION_ONLY", "TRACE_VERDICT_ASSOCIATION_ONLY"],
  ] as const)("refuses %s", (verdict, code) => {
    const gate = bookPickVerdictGate(verdict);
    expect(gate.publishable).toBe(false);
    expect(gate.reasonCode).toBe(code);
    expect(gate.reason).not.toMatch(/0\.5/);
  });

  it.each([undefined, null, ""])("refuses an absent verdict (%s)", (verdict) => {
    const gate = bookPickVerdictGate(verdict);
    expect(gate.publishable).toBe(false);
    expect(gate.reasonCode).toBe("TRACE_VERDICT_ABSENT");
  });

  it("refuses an unrecognized string instead of treating it as authorization", () => {
    const gate = bookPickVerdictGate("publish");
    expect(gate.publishable).toBe(false);
    expect(gate.reasonCode).toBe("TRACE_VERDICT_UNKNOWN");
  });
});
