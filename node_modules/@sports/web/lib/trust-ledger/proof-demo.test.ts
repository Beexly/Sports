import { describe, it, expect } from "vitest";
import { buildProofDemo } from "./proof-demo";

describe("buildProofDemo — tamper-evident proof of record", () => {
  const demo = buildProofDemo();

  it("commits a real 64-hex SHA-256 Merkle root", () => {
    expect(demo.publishedRoot).toMatch(/^[0-9a-f]{64}$/);
  });

  it("recomputing the intact ledger matches the published commitment", () => {
    expect(demo.intactMatches).toBe(true);
  });

  it("detects the tamper: flipping a LOSS to a WIN changes the root", () => {
    expect(demo.tamper.matches).toBe(false);
    expect(demo.tamper.recomputedRoot).not.toBe(demo.publishedRoot);
    expect(demo.tamper.from).toBe("LOSS");
    expect(demo.tamper.to).toBe("WIN");
  });

  it("an inclusion proof folds up to the published root", () => {
    expect(demo.proof.verified).toBe(true);
    expect(demo.proof.siblings.length).toBeGreaterThan(0);
  });
});
