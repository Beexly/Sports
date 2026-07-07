import { describe, expect, it } from "vitest";
import { formatLineMovement } from "@/components/picks/pick-card";

/**
 * Line movement is a Pro trust surface. Two honesty rules under test:
 * TOTAL shows the real open/now pair (side-free numbers); SPREAD shows
 * magnitude only, because Pick.line is stored home-perspective and quoting it
 * raw beside an away-side selection would contradict the pick (the same trap
 * the selection box documents).
 */
describe("formatLineMovement", () => {
  it("TOTAL shows the full open -> now pair", () => {
    const r = formatLineMovement({ opening: 8.5, current: 9.5 }, "TOTAL");
    expect(r.label).toBe("Opened 8.5 · now 9.5");
    expect(r.moved).toBe(true);
  });

  it("SPREAD shows magnitude only (home-perspective numbers stay in the tooltip)", () => {
    const r = formatLineMovement({ opening: -6.5, current: -7.5 }, "SPREAD");
    expect(r.label).toBe("Moved 1 since open");
    expect(r.label).not.toContain("-6.5");
    expect(r.title).toContain("-6.5");
    expect(r.title).toContain("home-team perspective");
  });

  it("a genuinely unmoved line says so instead of inventing movement", () => {
    const r = formatLineMovement({ opening: 44, current: 44 }, "SPREAD");
    expect(r.label).toBe("Unmoved since open");
    expect(r.moved).toBe(false);
  });

  it("rounds float noise to one decimal", () => {
    const r = formatLineMovement({ opening: 7, current: 7.3000000004 }, "SPREAD");
    expect(r.label).toBe("Moved 0.3 since open");
  });
});
