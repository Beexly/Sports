import { describe, expect, it } from "vitest";
import {
  runDriftEnsemble,
  runEcdd,
  runHawkesThreat,
} from "./monitoring-bridge.js";

describe("monitoring-bridge runEcdd", () => {
  it("fail-closes on empty stream", () => {
    const r = runEcdd([]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("non-empty");
  });

  it("fail-closes on non-binary errors", () => {
    const r = runEcdd([0, 1, 2 as 0]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("0|1");
  });

  it("runs ECDD over a real error stream", () => {
    const r = runEcdd([0, 0, 1, 0, 1, 1, 1, 0, 1, 1]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state).toBeDefined();
      expect(r.worstCaseDelay).toBeGreaterThan(0);
    }
  });
});

describe("monitoring-bridge runDriftEnsemble", () => {
  it("fail-closes on empty alarms", () => {
    const r = runDriftEnsemble({ alarms: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("at least one");
  });

  it("evaluates an alarm set", () => {
    const r = runDriftEnsemble({
      alarms: [
        { detector: "ecdd", week: 10 },
        { detector: "pudd", week: 11 },
        { detector: "pageHinkley", week: 12 },
      ],
      regimeWeeks: [10, 20],
      totalWeeks: 30,
      graceWeeks: 3,
      windowWeeks: 3,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).toBeDefined();
      expect(Array.isArray(r.majority)).toBe(true);
    }
  });
});

describe("monitoring-bridge runHawkesThreat", () => {
  it("fail-closes on misaligned mu/beta", () => {
    const r = runHawkesThreat({ mu: [0.5], alpha: [[0]], beta: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("aligned");
  });

  it("fail-closes on non-positive beta", () => {
    const r = runHawkesThreat({ mu: [0.5], alpha: [[0]], beta: [0] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("beta");
  });

  it("computes generation-of-threat on a real param set", () => {
    const r = runHawkesThreat(
      { mu: [0.3], alpha: [[0.4]], beta: [1.2] },
      30,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toBeDefined();
  });
});
