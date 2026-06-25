import { describe, it, expect } from "vitest";
import { classifyCausalRole, proposeLatentFactor, decomposeShock } from "../causal-representation-foundry.js";
import { inferBookPolicy } from "../inverse-bookmaker-mind.js";
import { detectDarkMatter } from "../market-dark-matter.js";
import { mapGeodesic, correctionEnergy } from "../belief-geodesic.js";
import { detectPhaseTransition, crossedRoleBoundary } from "../phase-transition-detector.js";

describe("Causal Representation Foundry", () => {
  it("separates cause / effect / non-causal by lead-lag and correlation", () => {
    expect(classifyCausalRole({ name: "x", leadLagMs: -120_000, correlation: 0.6 })).toBe("cause");
    expect(classifyCausalRole({ name: "y", leadLagMs: 120_000, correlation: 0.6 })).toBe("effect");
    expect(classifyCausalRole({ name: "z", leadLagMs: -120_000, correlation: 0.05 })).toBe("non_causal");
  });
  it("accepts a latent factor only when it compresses ≥2 co-moving variables", () => {
    expect(proposeLatentFactor({ proposedName: "role_mass_transfer", members: ["a", "b", "c"], sharedVarianceProxy: 0.8 }).accepted).toBe(true);
    expect(proposeLatentFactor({ proposedName: "x", members: ["a"], sharedVarianceProxy: 0.9 }).accepted).toBe(false);
  });
  it("decomposes a labeled shock into hidden classes", () => {
    expect(decomposeShock("wr_injury").length).toBeGreaterThan(1);
  });
});

describe("Inverse Bookmaker Mind", () => {
  it("reads a low-limit off-fair public price as a trap, not ignorance", () => {
    const v = inferBookPolicy({ fairDeviation: 0.05, publicSideLean: 0.8, sharpFollowLagMs: 0, limitProxy: 0.2, copycatScore: 0.2 });
    expect(v.dominantMotive).toBe("trapping_public_with_low_limits");
    expect(v.possiblyExploitable).toBe(false);
  });
  it("flags an off-fair, full-limit, non-public price as a rare genuine-misprice candidate", () => {
    const v = inferBookPolicy({ fairDeviation: 0.05, publicSideLean: 0.2, sharpFollowLagMs: 0, limitProxy: 0.8, copycatScore: 0.2 });
    expect(v.dominantMotive).toBe("possibly_genuinely_mispriced");
    expect(v.possiblyExploitable).toBe(true);
  });
  it("identifies a consensus copycat", () => {
    expect(inferBookPolicy({ fairDeviation: 0, publicSideLean: 0.3, sharpFollowLagMs: 0, limitProxy: 0.6, copycatScore: 0.8 }).dominantMotive).toBe("copying_consensus");
  });
});

describe("Market Dark Matter", () => {
  it("quarantines an uncleared hidden-pressure signal (no public claim)", () => {
    const v = detectDarkMatter({ sharpBeforePublicMs: 4 * 60_000, asymmetricPropMovement: 0.7, altCurvatureShift: 0.6, publicNewsPresent: false, sourceCleared: false });
    expect(v.hiddenPressureDetected).toBe(true);
    expect(v.disposition).toBe("RESEARCH_ONLY");
    expect(v.publicClaimAllowed).toBe(false);
    expect(v.quarantined).toBe(true);
  });
  it("promotes to candidate only when independently source-cleared", () => {
    const v = detectDarkMatter({ sharpBeforePublicMs: 4 * 60_000, asymmetricPropMovement: 0.7, altCurvatureShift: 0.6, publicNewsPresent: false, sourceCleared: true });
    expect(v.disposition).toBe("SOURCE_CLEARED_CANDIDATE");
    expect(v.publicClaimAllowed).toBe(true);
  });
  it("emits no signal when a public cause explains the move", () => {
    expect(detectDarkMatter({ sharpBeforePublicMs: 4 * 60_000, asymmetricPropMovement: 0.7, altCurvatureShift: 0.6, publicNewsPresent: true, sourceCleared: false }).disposition).toBe("NO_SIGNAL");
  });
});

describe("Belief Geodesic", () => {
  const at = (m: number) => `2024-09-08T${String(10 + Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}:00Z`;
  it("scores a straight path as efficient and a jagged path as inefficient", () => {
    const straight = mapGeodesic([{ timestamp: at(0), belief: 0.4 }, { timestamp: at(10), belief: 0.45 }, { timestamp: at(20), belief: 0.5 }]);
    expect(straight.efficiency).toBeCloseTo(1, 6);
    expect(straight.reversals).toBe(0);
    const jagged = mapGeodesic([{ timestamp: at(0), belief: 0.4 }, { timestamp: at(10), belief: 0.6 }, { timestamp: at(20), belief: 0.4 }, { timestamp: at(30), belief: 0.6 }]);
    expect(jagged.efficiency).toBeLessThan(0.5);
    expect(jagged.reversals).toBe(2);
  });
  it("computes correction energy", () => {
    expect(correctionEnergy(0.4, 0.55, 0.8, 0.5)).toBeCloseTo(0.06, 5);
  });
});

describe("Phase Transition Detector", () => {
  it("detects a transition from early-warning signals", () => {
    const v = detectPhaseTransition({ dispersionDelta: 0.7, correctionSpeed: 0.2, altCurvatureInstability: 0.6, mainDerivativeDesync: 0.7, attentionAcceleration: 0.6, liquidityThinning: 0.6 });
    expect(v.transitionDetected).toBe(true);
    expect(v.earlyWarnings.length).toBeGreaterThan(2);
  });
  it("detects a crossed role-state boundary (committee → bell-cow)", () => {
    expect(crossedRoleBoundary({ name: "RB1", before: 0.3, after: 0.75, bands: [0.33, 0.5, 0.7] }).crossed).toBe(true);
    expect(crossedRoleBoundary({ name: "RB1", before: 0.72, after: 0.78, bands: [0.33, 0.5, 0.7] }).crossed).toBe(false);
  });
});
