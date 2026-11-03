import { describe, it, expect } from "vitest";
import {
  ENABLED,
  ACCEPTANCE_GATE,
  quantileValue,
  decisionResidual,
  recoverTau,
  assertTauSealed,
  makeNextScoreSamples,
  exampleRecovery,
} from "./2309-00756-inverse-mdp-fourth-down.js";

describe("2309-00756-inverse-mdp-fourth-down", () => {
  it("is disabled until wired into locked-projection.ts", () => {
    expect(ENABLED).toBe(false);
  });

  it("declares an acceptance gate", () => {
    expect(ACCEPTANCE_GATE).toBeDefined();
  });

  it("exports the inverse-MDP helpers as callables", () => {
    expect(typeof quantileValue).toBe("function");
    expect(typeof decisionResidual).toBe("function");
    expect(typeof recoverTau).toBe("function");
    expect(typeof assertTauSealed).toBe("function");
    expect(typeof makeNextScoreSamples).toBe("function");
    expect(typeof exampleRecovery).toBe("function");
  });
});
