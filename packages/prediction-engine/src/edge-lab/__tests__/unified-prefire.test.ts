import { describe, expect, it } from "vitest";
import {
  composePrefireWithSelective,
  evaluateUnifiedPrefire,
} from "../unified-prefire";

const green = {
  dualAsOfOk: true,
  calibrationReady: true,
  quoteFresh: true,
  liveBoardOn: true,
} as const;

describe("evaluateUnifiedPrefire", () => {
  it("production default LIVE_BOARD off → ABSTAIN without selective", () => {
    const r = evaluateUnifiedPrefire({ ...green, liveBoardOn: false });
    expect(r.proceedToSelective).toBe(false);
    if (!r.proceedToSelective) {
      expect(r.decision).toBe("ABSTAIN");
      expect(r.reason).toBe("live_board_off");
    }
  });

  it("all green → proceedToSelective", () => {
    const r = evaluateUnifiedPrefire(green);
    expect(r.proceedToSelective).toBe(true);
    if (r.proceedToSelective) {
      expect(r.decision).toBe("PROCEED");
      expect(r.chain).toContain("prefire:proceed_to_selective");
    }
  });

  it("dual-asOf fail before cal / live", () => {
    const r = evaluateUnifiedPrefire({
      dualAsOfOk: false,
      dualAsOfCode: "quote_stale",
      calibrationReady: false,
      quoteFresh: false,
      liveBoardOn: false,
    });
    expect(r.proceedToSelective).toBe(false);
    if (!r.proceedToSelective) expect(r.reason).toBe("dual_asof_fail");
  });

  it("calibration not ready", () => {
    const r = evaluateUnifiedPrefire({
      ...green,
      calibrationReady: false,
    });
    expect(r.proceedToSelective).toBe(false);
    if (!r.proceedToSelective) expect(r.reason).toBe("calibration_not_ready");
  });

  it("quote stale", () => {
    const r = evaluateUnifiedPrefire({ ...green, quoteFresh: false });
    expect(r.proceedToSelective).toBe(false);
    if (!r.proceedToSelective) expect(r.reason).toBe("quote_stale");
  });
});

describe("composePrefireWithSelective", () => {
  it("does not fire when prefire holds", () => {
    const prefire = evaluateUnifiedPrefire({ ...green, liveBoardOn: false });
    const c = composePrefireWithSelective({
      prefire,
      selectiveWouldFire: true,
      edge: 0.05,
    });
    expect(c.fire).toBe(false);
  });

  it("fires only when prefire + selective green", () => {
    const prefire = evaluateUnifiedPrefire(green);
    const c = composePrefireWithSelective({
      prefire,
      selectiveWouldFire: true,
      edge: 0.04,
    });
    expect(c.fire).toBe(true);
    if (c.fire) expect(c.edge).toBe(0.04);
  });

  it("selective refuse after prefire proceed", () => {
    const prefire = evaluateUnifiedPrefire(green);
    const c = composePrefireWithSelective({
      prefire,
      selectiveWouldFire: false,
      selectiveRefuseReason: "edge_below_tau",
    });
    expect(c.fire).toBe(false);
    if (!c.fire) expect(c.reason).toBe("selective_refused");
  });
});
