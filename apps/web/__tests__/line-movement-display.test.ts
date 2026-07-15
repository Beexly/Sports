import { describe, expect, it } from "vitest";
import { formatLineMovement, formatPickLine } from "@/components/picks/pick-card";

/**
 * Line movement is a Pro trust surface. Two honesty rules under test:
 * TOTAL shows the real open/now pair (side-free numbers); SPREAD shows
 * magnitude only, because Pick.line is stored home-perspective and quoting it
 * raw beside an away-side selection would contradict the pick (the same trap
 * the selection box documents).
 */
describe("formatLineMovement", () => {
  it("TOTAL shows the full open -> now pair", () => {
    const r = formatLineMovement({ opening: 8.5, current: 9.5 }, "TOTAL", "MLB");
    expect(r.label).toBe("Opened 8.5 · now 9.5");
    expect(r.moved).toBe(true);
  });

  it("SPREAD shows magnitude only (home-perspective numbers stay in the tooltip)", () => {
    const r = formatLineMovement({ opening: -6.5, current: -7.5 }, "SPREAD", "NFL");
    expect(r.label).toBe("Moved 1 since open");
    expect(r.label).not.toContain("-6.5");
    expect(r.title).toContain("-6.5");
    expect(r.title).toContain("home-team perspective");
  });

  it("a genuinely unmoved line says so instead of inventing movement", () => {
    const r = formatLineMovement({ opening: 44, current: 44 }, "SPREAD", "NFL");
    expect(r.label).toBe("Unmoved since open");
    expect(r.moved).toBe(false);
  });

  it("normalizes quarter-point float noise without exposing tails", () => {
    const r = formatLineMovement({ opening: 7, current: 7.250000000000001 }, "SPREAD", "MLS");
    expect(r.label).toBe("Moved 0.25 since open");
  });

  it("withholds a legacy non-tradable movement value", () => {
    const r = formatLineMovement({ opening: 7, current: 7.3000000004 }, "SPREAD", "MLS");
    expect(r.label).toBe("Line movement unavailable");
    expect(r.moved).toBe(false);
  });
});

describe("formatPickLine", () => {
  it("uses unit-specific canonical formatting", () => {
    expect(formatPickLine(-110, "MONEYLINE", "NFL")).toBe("-110");
    expect(formatPickLine(120, "MONEYLINE", "NFL")).toBe("+120");
    expect(formatPickLine(9, "TOTAL", "MLB")).toBe("9");
    expect(formatPickLine(-0.25, "SPREAD", "MLS")).toBe("-0.25");
  });

  it("withholds unsupported prices and non-tradable points", () => {
    expect(formatPickLine(-7750, "MONEYLINE", "NFL")).toBe("N/A");
    expect(formatPickLine(8.954545454545455, "TOTAL", "MLB")).toBe("N/A");
    expect(formatPickLine(-3.25, "SPREAD", "NFL")).toBe("N/A");
  });
});
