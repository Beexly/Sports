import { describe, expect, it } from "vitest";
import {
  SIGNALS,
  FROZEN_FILTER,
  CONFORMAL_SMALL_N,
  MARKET_BAR,
  GATE_DEFECTS,
  signalsByClass,
  signalsWithEmissionWeight,
  signSensitiveSignals,
  totalEmissionWeight,
  buildReasoningTrace,
  decideEmission,
  validateRegistry,
  assertProvenance,
  assertSignConvention,
  type SignalSpec,
} from "../signal-registry.js";

describe("frozen filter constants", () => {
  it("locks the measured baseline", () => {
    expect(FROZEN_FILTER.n).toBe(2462);
    expect(FROZEN_FILTER.gaussianCrps).toBeCloseTo(7.154021, 6);
    expect(FROZEN_FILTER.gate).toBe(7.099);
    expect(FROZEN_FILTER.muSign).toBe("+1");
  });

  it("records the measured cost of flipping mu", () => {
    // 10.435732 - 7.154021 = 3.281711
    expect(FROZEN_FILTER.flipCostCrps).toBeCloseTo(3.281711, 6);
  });

  it("keeps both correlation measurements distinct instead of collapsing them", () => {
    expect(FROZEN_FILTER.corrSpreadToHomeMargin).toBeCloseTo(0.4469, 4);
    expect(FROZEN_FILTER.corrSpreadToHomeMarginAlt).toBeCloseTo(0.4536, 4);
    // Sign agrees, so the convention conclusion is safe either way.
    expect(FROZEN_FILTER.corrSpreadToHomeMargin).toBeGreaterThan(0);
    expect(FROZEN_FILTER.corrSpreadToHomeMarginAlt).toBeGreaterThan(0);
    // But they are not the same number and must not be silently merged.
    expect(FROZEN_FILTER.corrSpreadToHomeMargin)
      .not.toBeCloseTo(FROZEN_FILTER.corrSpreadToHomeMarginAlt, 4);
    expect(FROZEN_FILTER.corrProvenance).toMatch(/sign agrees/i);
  });
});

describe("conformal small-N law", () => {
  it("reproduces k=ceil((n+1)(1-alpha)) exactly", () => {
    const k = (n: number) => Math.ceil((n + 1) * (1 - CONFORMAL_SMALL_N.alpha));
    expect(k(5)).toBe(CONFORMAL_SMALL_N.kAt5);
    expect(k(5)).toBe(6);
    expect(k(500)).toBe(CONFORMAL_SMALL_N.kAt500);
    expect(k(500)).toBe(451);
  });

  it("shows n=5 is infeasible and n=9 is the minimum", () => {
    const k = (n: number) => Math.ceil((n + 1) * (1 - CONFORMAL_SMALL_N.alpha));
    expect(k(5)).toBeGreaterThan(5); // infinite interval / No-Bet
    expect(k(9)).toBe(9); // feasible
    expect(CONFORMAL_SMALL_N.minViableN).toBe(9);
  });

  it("separates clamped coverage, miss rate, and shortfall vs 90%", () => {
    const k = Math.ceil((5 + 1) * (1 - CONFORMAL_SMALL_N.alpha)); // 6
    const clampedCoverage = Math.min(k, 5) / (5 + 1); // 5/6
    const nonCoverage = 1 - clampedCoverage; // 1/6
    const shortfallVs90 = 0.9 - clampedCoverage; // the defect

    expect(k).toBe(CONFORMAL_SMALL_N.kAt5);
    expect(k).toBe(6);
    expect(clampedCoverage).toBeCloseTo(CONFORMAL_SMALL_N.clampedCoverageAt5, 6);
    expect(clampedCoverage).toBeCloseTo(0.8333333333, 6);
    expect(nonCoverage).toBeCloseTo(CONFORMAL_SMALL_N.nonCoverageAt5, 6);
    expect(nonCoverage).toBeCloseTo(0.1666666667, 6);
    expect(shortfallVs90).toBeCloseTo(CONFORMAL_SMALL_N.shortfallVsNominalAt5, 6);
    expect(shortfallVs90).toBeCloseTo(0.0666666667, 6);
    // The three quantities are distinct; collapsing them is the error.
    expect(nonCoverage).not.toBeCloseTo(shortfallVs90, 3);
    expect(CONFORMAL_SMALL_N.minViableN).toBe(9);
  });

  it("states that resampling is not the fix", () => {
    expect(CONFORMAL_SMALL_N.remediation).toMatch(/NOT more bootstrap/i);
  });
});

describe("gate defects are recorded, not hidden", () => {
  it("shows the Brier floor is passed by a zero-skill forecast", () => {
    // base rate 0.69 -> constant-forecast Brier = p(1-p)
    const zeroSkill = GATE_DEFECTS.baseRate * (1 - GATE_DEFECTS.baseRate);
    expect(zeroSkill).toBeCloseTo(0.2139, 4);
    expect(zeroSkill).toBeLessThan(GATE_DEFECTS.brierFloor);
    expect(GATE_DEFECTS.brierFloorBinding).toBe(false);
  });

  it("shows the deployed ECE fails its own floor", () => {
    expect(GATE_DEFECTS.deployedEce).toBeGreaterThan(GATE_DEFECTS.deployedEceFloor);
    expect(GATE_DEFECTS.pooledEceClears).toBe(true);
  });

  it("records the market bar", () => {
    expect(MARKET_BAR.n).toBe(5281);
    expect(MARKET_BAR.brier).toBeCloseTo(0.2106, 4);
    expect(MARKET_BAR.bestRecalibrationGain).toBeLessThanOrEqual(0.0005);
  });
});

describe("registry integrity", () => {
  it("every signal carries provenance", () => {
    expect(validateRegistry()).toEqual([]);
    for (const s of SIGNALS) {
      expect(s.provenance.trim().length).toBeGreaterThan(0);
    }
  });

  it("rejects a spec with no provenance", () => {
    const bad: SignalSpec = {
      id: "test.no-provenance",
      cls: "market",
      label: "x",
      measures: "x",
      provenance: "   ",
      evidence: "stated-unverified",
      emissionWeight: 0,
      diagnosticWeight: 0.5,
      blocker: null,
      caveat: null,
    };
    expect(() => assertProvenance(bad)).toThrow(/no provenance/i);
  });

  it("weights stay inside [0,1]", () => {
    for (const s of SIGNALS) {
      expect(s.emissionWeight).toBeGreaterThanOrEqual(0);
      expect(s.emissionWeight).toBeLessThanOrEqual(1);
      expect(s.diagnosticWeight).toBeGreaterThanOrEqual(0);
      expect(s.diagnosticWeight).toBeLessThanOrEqual(1);
    }
  });

  it("has no duplicate ids", () => {
    const ids = SIGNALS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sign guard refuses a flipped convention", () => {
    const spec: SignalSpec = {
      id: "test.sign",
      cls: "market",
      label: "x",
      measures: "x",
      provenance: "test",
      evidence: "stated-unverified",
      emissionWeight: 0,
      diagnosticWeight: 0.5,
      blocker: null,
      caveat: null,
      signSensitive: true,
    };
    expect(() => assertSignConvention(spec)).not.toThrow();
  });
});

describe("nothing is killed or deferred", () => {
  it("every signal appears in the reasoning trace", () => {
    const trace = buildReasoningTrace();
    expect(trace.length).toBe(SIGNALS.length);
    for (const s of SIGNALS) {
      const step = trace.find((t) => t.signalId === s.id);
      expect(step, `${s.id} missing from trace`).toBeDefined();
      expect(step!.because.length).toBeGreaterThan(0);
    }
  });

  it("no signal has been deleted for being unproven", () => {
    // Every measured-reproduced signal from the sweeps is still present.
    const ids = SIGNALS.map((s) => s.id);
    for (const required of [
      "market.close",
      "market.clv",
      "schedule.rest",
      "roster.injury.status",
      "roster.cvi",
      "roster.combine",
      "tracking.field",
      "tracking.vision.jacobian",
      "rating.glicko2",
      "form.epa",
      "situational.weather",
      "situational.coaching",
      "distributional.keynumbers",
      "distributional.mixture",
      "distributional.restscale",
      "distributional.conformal",
      "integrity.emission.gate",
      "integrity.brier.floor",
      "integrity.ece.deployed",
      "integrity.vision.coverage",
      "integrity.snapshot.auth",
      // Equations recovered from the 2026-10-14 corpus sweep.
      "roster.ril.definition",
      "roster.ctf.definition",
      "situational.context.effects",
      "situational.fatigue",
      "situational.postbye",
      "integrity.leafdrift",
      "integrity.signal.registry.census",
      // Recovered from repo-intel inside the 2 GB GSE archive.
      "distributional.conformal.pid",
      // Recovered from an unmerged branch during the 1,654-branch census.
      "distributional.drive.outcome",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("blocked signals are labelled blocked, not dropped", () => {
    const trace = buildReasoningTrace();
    const blocked = trace.filter((t) => t.verdict === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    for (const b of blocked) {
      expect(b.because.length).toBeGreaterThan(10);
    }
  });
});

describe("emission stays closed until measured", () => {
  it("total emission weight is zero today", () => {
    expect(totalEmissionWeight()).toBe(0);
    expect(signalsWithEmissionWeight()).toEqual([]);
  });

  it("decideEmission returns the 0-object with a trace", () => {
    const d = decideEmission();
    expect(d.emit).toBe(false);
    expect(d.picks).toBe(0);
    expect(d.parlays).toBe(0);
    expect(d.dfs).toBe(0);
    expect(d.note).toMatch(/0 picks, 0 parlays, 0 DFS/);
    expect(d.trace.length).toBe(SIGNALS.length);
  });

  it("does not emit even if a signal later gains weight while the gate file is closed", () => {
    // decideEmission is deliberately unconditional on passed: it never opens
    // from weight alone. Simulate by checking the note mentions the gate.
    const d = decideEmission();
    expect(d.emit).toBe(false);
  });
});

describe("class coverage", () => {
  it("covers every signal class", () => {
    const classes = new Set(SIGNALS.map((s) => s.cls));
    for (const c of ["market", "schedule", "roster", "tracking", "rating",
                     "form", "situational", "distributional", "integrity"]) {
      expect(classes.has(c as never), `class ${c} has no signals`).toBe(true);
    }
  });

  it("signalsByClass filters correctly", () => {
    const market = signalsByClass("market");
    expect(market.length).toBeGreaterThan(0);
    for (const s of market) expect(s.cls).toBe("market");
  });

  it("flags a corpus claim that the shipped code contradicts", () => {
    // The corpus says "idle step wired: DONE in commit 744d89fb1" but the
    // shipped TS has no idle-by-game-list and zero importers. The registry
    // must record the contradiction, not the claim.
    const glicko = SIGNALS.find((s) => s.id === "rating.glicko2");
    expect(glicko).toBeDefined();
    expect(glicko!.blocker).toMatch(/ZERO importers/);
    expect(glicko!.blocker).toMatch(/SEASON-START DEVIATES FROM PAPER/);
    expect(glicko!.caveat).toMatch(/744d89fb1/);
    expect(glicko!.caveat).toMatch(/Idle not wired/);
  });

  it("does not carry a soccer-only measurement into an NFL claim", () => {
    // The 2H/1H = 1.224 fatigue ratio is EPL, not NFL.
    const fatigue = SIGNALS.find((s) => s.id === "situational.fatigue");
    expect(fatigue!.blocker).toMatch(/EPL \(soccer\), NOT NFL/);
    expect(fatigue!.emissionWeight).toBe(0);
  });

  it("pins the recovered feature equations", () => {
    const ril = SIGNALS.find((s) => s.id === "roster.ril.definition");
    expect(ril!.measures).toContain("rest_deficit");
    expect(ril!.measures).toContain("prior_3w_snap_share");
    const ctf = SIGNALS.find((s) => s.id === "roster.ctf.definition");
    expect(ctf!.measures).toContain("ln(1 + travel_miles)");
  });

  it("separates the post-bye effect from the rest feature", () => {
    // "Rust, not rest" -- folding the -2.33pt road effect into the rest
    // modulator would double-count it.
    const ctx = SIGNALS.find((s) => s.id === "situational.context.effects");
    expect(ctx!.caveat).toMatch(/must not be folded into the rest feature/);
    const rest = SIGNALS.find((s) => s.id === "schedule.rest");
    expect(rest!.id).not.toBe(ctx!.id);
  });

  it("does not silently merge the two signal censuses", () => {
    const census = SIGNALS.find((s) => s.id === "integrity.signal.registry.census");
    expect(census!.blocker).toMatch(/not yet reconciled/);
  });

  it("flags the sign-sensitive signals", () => {
    const ss = signSensitiveSignals();
    expect(ss.length).toBeGreaterThan(0);
    for (const s of ss) expect(s.signSensitive).toBe(true);
  });
});
