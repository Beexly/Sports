import { describe, it, expect } from "vitest";
import { ENABLED, ACCEPTANCE_GATE, shrinkBtl } from "./1807-09236-empirical-bayes-btl.js";

describe("1807-09236-empirical-bayes-btl", () => {
  it("is disabled until wired into the ratings layer", () => {
    expect(ENABLED).toBe(false);
  });

  it("declares an acceptance gate", () => {
    expect(ACCEPTANCE_GATE).toBeDefined();
  });

  it("exports shrinkBtl as a callable", () => {
    expect(typeof shrinkBtl).toBe("function");
  });
});
