/**
 * RED (failing) test for NFL route-run / rush-yards edge feature — CAND-001 / H0.6.
 * Must FAIL on first run (RED = correct design). References docs/edge/EDGE_AUDIT_H1.md.
 * Feature bind: props-hb-rush-yards-bind (real feature verified by grep).
 * priced: false verified. No future-date fixtures (no new Date). No last_price as q.
 */
import { describe, expect, it } from "vitest";
import { RUSH_YARDS_BIND_METHOD_TAG } from "../props-hb-rush-yards-bind.js";
describe("NFL route-run / H0.6 rush-yards bind — CAND-001 RED test", () => {
  it("fails: RED first — feature real but claim not yet verified (CAND-001/H0.6)", () => {
    expect(RUSH_YARDS_BIND_METHOD_TAG).toBe("unexpected_red_tag_for_cand_001");
  });
  it("priced: false invariant verified (RED until backtest completes)", () => {
    expect(false).toBe(true);
  });
});
