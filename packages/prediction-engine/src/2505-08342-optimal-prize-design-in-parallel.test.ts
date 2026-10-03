/**
 * Vitest suite for arXiv:2505.08342 (Optimal Prize Design in Parallel Rank-order Contests).
 * Gate: ADAPT if the offline replay shows routed contest selection beating uniform GPP entry by ≥5 pp ROI over 4 weeks AND the x(φ) sorting simulation reproduces the known qualitative pattern (top-heavy large-field GPPs concentrate the highest estimated skill share).
 */
import { describe, it, expect } from "vitest";
import { skillShare, routeBankroll } from "./2505-08342-optimal-prize-design-in-parallel";

describe("2505-08342 contest routing by skill-share", () => {
  const rng = (() => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
  it("top-heavy contests concentrate skilled share", () => {
    const heavy = skillShare(0.9, 5000, 8, rng);
    const flat = skillShare(0.1, 5000, 8, rng);
    expect(heavy).toBeGreaterThan(flat);
    expect(() => skillShare(2, 100, 1, rng)).toThrow();
  });
  it("bankroll routes to soft, high-overlay contests", () => {
    const alloc = routeBankroll([
      { id: "soft", skillShare: 0.1, overlay: 0.1, fee: 0.01 },
      { id: "tough", skillShare: 0.6, overlay: 0.1, fee: 0.01 },
    ]);
    expect((alloc.get("soft") ?? 0)).toBeGreaterThan(alloc.get("tough") ?? 0);
    const z = [...alloc.values()].reduce((a, b) => a + b, 0);
    expect(z).toBeCloseTo(1, 10);
  });
});
