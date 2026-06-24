import { describe, expect, it } from "vitest";
import { evaluateAperture, type ApertureInput } from "../aperture";
import { passGenome, quarantineGenome, signalGenome } from "../fixtures";
import { findDrift, replayDecision } from "../decision-replay";

const base: ApertureInput = {
  market: { book: "b", line: -2.5, price: -110, devigFairProb: 0.5, userAvailable: true, edgeHalfLifeMs: 1000 * 60 * 30 },
  evidence: { sourceTier: "official", independentSources: 3, freshnessAgeMinutes: 15, rightsCleared: true, conflict: false, rumorQuarantined: false, permissions: { decisionUse: true, publicUse: true } },
  model: { modelVersion: "v1", probability: 0.58, confidenceDisplay: 64, uncertaintyBand: { low: 0.5, high: 0.66 }, calibrationHealth: 0.8, refused: false },
  compliance: { rightsCleared: true, publicClaimAllowed: true, contestBoundaryRespected: true, responsibleGamingRisk: false, languageClean: true },
};
const merge = (over: Partial<ApertureInput>): ApertureInput => ({ ...base, ...over });

describe("ApertureStateMachine", () => {
  it("emits Signal when a clean edge survives every gate", () => {
    const r = evaluateAperture(base);
    expect(r.state).toBe("signal");
    expect(r.edge).toBeCloseTo(0.08, 5);
  });

  it("quarantines on any hard safety failure (terminal)", () => {
    expect(evaluateAperture(merge({ compliance: { ...base.compliance, rightsCleared: false } })).state).toBe("quarantine");
    expect(evaluateAperture(merge({ compliance: { ...base.compliance, languageClean: false } })).state).toBe("quarantine");
    expect(evaluateAperture(merge({ evidence: { ...base.evidence, rumorQuarantined: true } })).state).toBe("quarantine");
  });

  it("passes when there is no actionable edge", () => {
    const r = evaluateAperture(merge({ model: { ...base.model, probability: 0.505 } }));
    expect(r.state).toBe("pass");
    expect(r.decidedBy).toBe("edge-gate");
  });

  it("passes (restraint) when the model refuses", () => {
    expect(evaluateAperture(merge({ model: { ...base.model, refused: true } })).state).toBe("pass");
  });

  it("waits when the number is not user-reachable", () => {
    expect(evaluateAperture(merge({ market: { ...base.market, userAvailable: false } })).state).toBe("wait");
  });

  it("shadows on thin/conflicting evidence or low calibration", () => {
    expect(evaluateAperture(merge({ evidence: { ...base.evidence, conflict: true } })).state).toBe("shadow");
    expect(evaluateAperture(merge({ evidence: { ...base.evidence, independentSources: 1 } })).state).toBe("shadow");
    expect(evaluateAperture(merge({ model: { ...base.model, calibrationHealth: 0.3 } })).state).toBe("shadow");
  });

  it("is deterministic for the same input", () => {
    expect(evaluateAperture(base)).toEqual(evaluateAperture(base));
  });
});

describe("fixtures reflect their intended aperture state", () => {
  it("signal / pass / quarantine", () => {
    expect(signalGenome.aperture).toBe("signal");
    expect(passGenome.aperture).toBe("pass");
    expect(quarantineGenome.aperture).toBe("quarantine");
  });

  it("never marks a projection priced", () => {
    for (const g of [signalGenome, passGenome, quarantineGenome]) {
      expect(g.proof.priced).toBe(false);
    }
  });
});

describe("DecisionReplay", () => {
  it("reproduces a faithful genome from frozen inputs", () => {
    const r = replayDecision(signalGenome);
    expect(r.reproducible).toBe(true);
    expect(r.replayedState).toBe(r.recordedState);
  });

  it("detects drift when the recorded state disagrees with replay", () => {
    const tampered = { ...signalGenome, aperture: "pass" as const };
    expect(replayDecision(tampered).reproducible).toBe(false);
    expect(findDrift([signalGenome, tampered])).toHaveLength(1);
  });
});
