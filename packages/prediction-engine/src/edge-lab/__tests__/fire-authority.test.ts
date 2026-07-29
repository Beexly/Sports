import { describe, expect, it } from "vitest";
import {
  evaluateFireAuthority,
  FIRE_DEMO_SCENARIOS,
  topologyScore,
} from "../fire-authority.js";

describe("fire authority (frontier composition)", () => {
  it("production default never fires (LIVE_BOARD off)", () => {
    const s = FIRE_DEMO_SCENARIOS.find((x) => x.id === "live_off")!;
    const r = evaluateFireAuthority(s.input);
    expect(r.fire).toBe(false);
    if (!r.fire) {
      expect(r.reason).toBe("live_board_off");
      expect(r.decision).toBe("ABSTAIN");
      expect(r.readyForEdgeFire).toBe(false);
    }
  });

  it("fires only when all preconditions + live on + selective yes", () => {
    const s = FIRE_DEMO_SCENARIOS.find((x) => x.id === "would_fire_if_live")!;
    const r = evaluateFireAuthority(s.input);
    expect(r.fire).toBe(true);
    if (r.fire) {
      expect(r.edge).toBeCloseTo(0.05, 5);
      expect(r.chain).toContain("gate:FIRE");
      expect(r.readyForEdgeFire).toBe(true);
    }
  });

  it("dual-asOf fail short-circuits before selective", () => {
    const s = FIRE_DEMO_SCENARIOS.find((x) => x.id === "dual_fail")!;
    const r = evaluateFireAuthority(s.input);
    expect(r.fire).toBe(false);
    if (!r.fire) {
      expect(r.reason).toBe("dual_asof_fail");
      expect(r.detail).toBe("quote_stale");
    }
  });

  it("calibration refuse independent of selective", () => {
    const s = FIRE_DEMO_SCENARIOS.find((x) => x.id === "cal_fail")!;
    const r = evaluateFireAuthority(s.input);
    expect(r.fire).toBe(false);
    if (!r.fire) expect(r.reason).toBe("calibration_not_ready");
  });

  it("selective refuse surfaces multiprob reason", () => {
    const s = FIRE_DEMO_SCENARIOS.find((x) => x.id === "selective_refused")!;
    const r = evaluateFireAuthority(s.input);
    expect(r.fire).toBe(false);
    if (!r.fire) {
      expect(r.reason).toBe("selective_refused");
      expect(r.detail).toBe("edge_below_tau");
    }
  });

  it("topology readyForEdgeFire requires live board", () => {
    const t = topologyScore({
      dualAsOfOk: true,
      calibrationReady: true,
      liveBoardOn: false,
      quoteFresh: true,
    });
    expect(t.readyForEdgeFire).toBe(false);
    expect(t.reasons).toContain("live_board_off");
  });

  it("all demo scenarios produce auditable chain", () => {
    for (const s of FIRE_DEMO_SCENARIOS) {
      const r = evaluateFireAuthority(s.input);
      expect(r.chain[0]).toBe("fire_authority.v1");
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("never fires when selectiveWouldFire false even if live", () => {
    const r = evaluateFireAuthority({
      dualAsOfOk: true,
      calibrationReady: true,
      liveBoardOn: true,
      quoteFresh: true,
      selectiveWouldFire: false,
      selectiveRefuseReason: "interval_too_wide",
    });
    expect(r.fire).toBe(false);
  });
});
