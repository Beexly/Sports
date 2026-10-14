
import { describe, it, expect } from "vitest";
import { evaluateNoBet } from "./no-bet-evaluation";

describe("no-bet gate wiring (honesty gate on the publish path)", () => {
  it("refuses with MISSING_INPUT when the spine produced no calibrated prob", () => {
    const r = evaluateNoBet({
      calibratedProb: null,
      marketFairProb: 0.6,
      dbRowCount: 100,
      dataFreshnessAt: new Date(),
      now: new Date(),
      liveBoardEnabled: false,
    });
    expect(r).not.toBeNull();
    expect(r!.codes).toContain("MISSING_INPUT");
    expect(r!.action).toBe("NO_BET");
  });

  it("fires NO_BET on negative edge even with clean inputs", () => {
    const r = evaluateNoBet({
      calibratedProb: 0.55,
      marketFairProb: 0.6,
      dbRowCount: 100,
      dataFreshnessAt: new Date(),
      now: new Date(),
      liveBoardEnabled: false,
    });
    expect(r!.action).toBe("NO_BET");
    expect(r!.codes).toContain("LIVE_BOARD_OFF");
  });

  it("refuses on stale odds beyond the freshness budget", () => {
    const r = evaluateNoBet({
      calibratedProb: 0.65,
      marketFairProb: 0.55,
      dbRowCount: 100,
      dataFreshnessAt: new Date(Date.now() - 7 * 3600 * 1000),
      now: new Date(),
      liveBoardEnabled: true,
    });
    expect(r!.codes).toContain("STALE_ODDS");
  });

  it("PLAY requires positive edge over tau + fresh odds + live board on", () => {
    const r = evaluateNoBet({
      calibratedProb: 0.65,
      marketFairProb: 0.55,
      dbRowCount: 100,
      dataFreshnessAt: new Date(),
      now: new Date(),
      liveBoardEnabled: true,
    });
    expect(r!.action).toBe("PLAY");
    expect(r!.codes).toHaveLength(0);
  });
});
