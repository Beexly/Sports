import { describe, it, expect } from "vitest";
import { ENABLED, ACCEPTANCE_GATE, gammaIt, adjustedPlusMinus, pocketSurvival } from "./2609-33664-hmm-pass-blocking.js";

describe("2609-33664-hmm-pass-blocking", () => {
  it("is disabled until tracking data and the Tuesday seal are wired", () => {
    expect(ENABLED).toBe(false);
  });

  it("declares an acceptance gate", () => {
    expect(ACCEPTANCE_GATE).toBeDefined();
  });

  it("exports the HMM helpers as callables", () => {
    expect(typeof gammaIt).toBe("function");
    expect(typeof adjustedPlusMinus).toBe("function");
    expect(typeof pocketSurvival).toBe("function");
  });
});
