/**
 * DECISION FACTORY — acceptance (the compiler, the moat, and the dynamic layer).
 *
 * Focused A–I: the frame compiles with a per-pass trace; compression is measured; the autopsy emits
 * NO lesson on an unlucky loss; (H) a settled trap becomes a ghost that suppresses its twin; (I) the
 * regime reconfigures behavior (CALM vs SHOCK) and a suppressing regime downgrades a card.
 */

import { describe, it, expect } from "vitest";
import { runDecisionFieldFrame, field001Input } from "@sports/decision-field-runtime";
import {
  compileFieldFrame,
  computeCompressionMetrics,
  runProductIntelligenceLoop,
  deriveRegimeProfile,
  makeTwinInput,
  settledTrapCard,
  settledUnluckyCard,
  calmRegimeInputs,
  shockRegimeInputs,
  suppressingRegimeInputs,
} from "../index.js";

describe("Compiler — multi-pass trace", () => {
  const { frame, traces } = compileFieldFrame(field001Input);

  it("emits a 14-pass trace and one card", () => {
    expect(traces).toHaveLength(14);
    expect(traces[0]!.passName).toBe("point_in_time_filter");
    expect(frame.emittedCards).toHaveLength(1);
  });

  it("the point-in-time pass records the future fact as suppressed", () => {
    expect(traces[0]!.suppressedCount).toBe(1);
    expect(traces[0]!.inputCount).toBe(7);
    expect(traces[0]!.outputCount).toBe(6);
  });

  it("compression metric reports facts → cards", () => {
    const m = computeCompressionMetrics(frame);
    expect(m.factsIngested).toBe(7);
    expect(m.cardsEmitted).toBe(1);
    expect(m.compressionRatio).toBeGreaterThan(0);
    expect(m.summary).toContain("→");
  });
});

describe("Product Intelligence Loop — process over outcome", () => {
  it("an unlucky loss on a sound process emits NO lesson and no ghost", () => {
    const out = runProductIntelligenceLoop(settledUnluckyCard);
    expect(out.verdict).toBe("unlucky_loss");
    expect(out.emitsLesson).toBe(false);
    expect(out.loopAction).toBe("NO_CHANGE");
    expect(out.emittedGhost).toBeNull();
  });

  it("a process error emits a lesson and a ghost scar", () => {
    const out = runProductIntelligenceLoop(settledTrapCard);
    expect(out.verdict).toBe("process_error");
    expect(out.emitsLesson).toBe(true);
    expect(out.loopAction).toBe("GHOST");
    expect(out.emittedGhost).not.toBeNull();
    expect(out.emittedGhost!.severity).toBeGreaterThanOrEqual(0.8);
  });
});

describe("(H) Scar memory — a settled trap suppresses its twin next cycle", () => {
  it("control: with no scar, the twin emits a real card", () => {
    const control = runDecisionFieldFrame(makeTwinInput([]));
    expect(control.emittedCards).toHaveLength(1);
    expect(control.suppressedCards).toHaveLength(0);
  });

  it("with the emitted ghost, the twin is suppressed — the loop closed", () => {
    const loop = runProductIntelligenceLoop(settledTrapCard);
    expect(loop.emittedGhost).not.toBeNull();
    const scarred = runDecisionFieldFrame(makeTwinInput([loop.emittedGhost!]));
    expect(scarred.emittedCards).toHaveLength(0);
    expect(scarred.suppressedCards).toHaveLength(1);
    expect(scarred.conscience.scarSuppressions).toBeGreaterThanOrEqual(1);
  });
});

describe("(I) Regime reconfiguration — observe more, recommend less under shock", () => {
  it("CALM and SHOCK map to different product regimes and budgets", () => {
    const calm = deriveRegimeProfile(calmRegimeInputs);
    const shock = deriveRegimeProfile(shockRegimeInputs);
    expect(calm.productRegime).toBe("CALM");
    expect(shock.productRegime).toBe("SHOCK");
    // Shock observes MORE (bigger surface, faster cadence) but ACTS LESS (higher action/proof bars).
    expect(shock.cardSurfaceLimit).toBeGreaterThan(calm.cardSurfaceLimit);
    expect(shock.observationCadenceMultiplier).toBeGreaterThan(calm.observationCadenceMultiplier);
    expect(shock.actionThresholdDelta).toBeGreaterThan(calm.actionThresholdDelta);
    expect(shock.proofRequirementDelta).toBeGreaterThan(calm.proofRequirementDelta);
  });

  it("a suppressing regime downgrades the same field to a non-card", () => {
    const profile = deriveRegimeProfile(suppressingRegimeInputs);
    expect(profile.suppressAction).toBe(true);
    expect(profile.regimeSafety).toBe(0);
    const suppressed = runDecisionFieldFrame({ ...field001Input, regimeInputs: suppressingRegimeInputs });
    expect(suppressed.emittedCards).toHaveLength(0);
    expect(suppressed.suppressedCards.length).toBeGreaterThanOrEqual(1);
  });
});
