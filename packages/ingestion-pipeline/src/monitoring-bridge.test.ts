import { describe, expect, it } from "vitest";
import {
  runDriftEnsemble,
  runEcdd,
  runHawkesThreat,
  runPageHinkley,
  runPudd,
  evalBootstrapGoT,
  evalSimulateHawkes,
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

describe("monitoring-bridge detector classes", () => {
  it("runPageHinkley fail-closes on empty or non-finite stream", () => {
    expect(runPageHinkley([]).ok).toBe(false);
    expect(runPageHinkley([0.2, Number.NaN]).ok).toBe(false);
  });

  it("runPageHinkley produces alarms on a real Brier stream", () => {
    const r = runPageHinkley([0.2, 0.21, 0.22, 0.35, 0.4, 0.45, 0.5, 0.55]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.alarms.length).toBe(8);
      expect(r.fired).toBeGreaterThanOrEqual(0);
    }
  });

  it("runPudd fail-closes on invalid counts", () => {
    expect(runPudd([]).ok).toBe(false);
    expect(runPudd([{ uncertain: 5, total: 3 }]).ok).toBe(false);
  });

  it("runPudd produces alarms on a real count stream", () => {
    const weeks = Array.from({ length: 14 }, (_, i) => ({
      uncertain: i < 8 ? 2 : 12,
      total: 20,
    }));
    const r = runPudd(weeks);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.alarms.length).toBe(14);
    }
  });
});

describe("monitoring-bridge Hawkes bootstrap/simulate", () => {
  const params = { mu: [0.3], alpha: [[0.4]], beta: [1.2] };

  it("evalBootstrapGoT fail-closes on nBoot < 2", () => {
    const r = evalBootstrapGoT(params, 10, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("nBoot");
  });

  it("evalBootstrapGoT returns mean and se", () => {
    let i = 0;
    const rand = () => {
      i += 1;
      return (i % 7) / 7;
    };
    const r = evalBootstrapGoT(params, 10, 5, rand);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) {
      expect(r.mean).toHaveLength(1);
      expect(r.se).toHaveLength(1);
    }
  });

  it("evalSimulateHawkes fail-closes on bad T and returns events on real params", () => {
    expect(evalSimulateHawkes(params, 0).ok).toBe(false);
    let i = 0;
    const rand = () => {
      i += 1;
      return (i % 5) / 5;
    };
    const r = evalSimulateHawkes(params, 5, rand);
    expect(r.ok, r.ok ? "" : `reason=${r.reason}`).toBe(true);
    if (r.ok) expect(Array.isArray(r.events)).toBe(true);
  });
});
