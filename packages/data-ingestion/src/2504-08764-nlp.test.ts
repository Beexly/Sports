/**
 * Tests for ./2504-08764-nlp (arXiv:2504.08764, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT strictly as a recall-oriented triage filter in a cascade — never as a standalone labeler. ADAPT proceeds if the reproducible test shows recall ≥ 0.95 at an affordable operating point.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./2504-08764-nlp";

describe("2504.08764 recall-oriented SLM triage scaffold", () => {
  it("interpolates calibrated probabilities and applies the reporter prior", () => {
    const probability = mod.calibrateTriageScore(5, [
      { rawScore: 0, probability: 0.1 },
      { rawScore: 10, probability: 0.9 },
    ]);
    expect(probability).toBeCloseTo(0.5, 10);
    expect(mod.applyReporterSpecialtyPrior(probability!, 0.8)).toBeCloseTo(0.4, 10);
    expect(mod.calibrateTriageScore(1, [])).toBeNull();
  });

  it("chooses the lowest threshold meeting the recall target", () => {
    const evaluation = mod.chooseRecallThreshold([0.1, 0.8, 0.9, 0.95], [0, 1, 1, 1]);
    expect(evaluation?.threshold).toBe(0.1);
    expect(evaluation?.recall).toBe(1);
    expect(evaluation?.precision).toBeCloseTo(0.75, 10);
    expect(mod.chooseRecallThreshold([0.1], [0])).toBeNull();
  });

  it("keeps the SLM as a disabled cascade component", () => {
    const evaluation = mod.chooseRecallThreshold([0.1, 0.9], [0, 1]);
    const gate = mod.evaluateTriageGate(evaluation, 1, 10);
    expect(gate).toEqual({ recallGate: true, affordable: true, passes: true });
    expect(mod.ENABLED).toBe(false);
  });
});
