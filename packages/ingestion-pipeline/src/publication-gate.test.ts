import { describe, expect, it } from "vitest";
import { evaluatePublication, publicationAllowed, type SealedVerdictRef } from "./publication-gate.js";

const HASH = "a".repeat(64);

function sealed(verdict: SealedVerdictRef["verdict"]): SealedVerdictRef {
  return { verdict, hash: HASH, sealedAt: "2026-11-12T21:00:00.000Z" };
}

describe("evaluatePublication", () => {
  it("blocks when called with nothing at all", () => {
    const d = evaluatePublication({ env: {} });
    expect(d.allowed).toBe(false);
    expect(d.blockedBy.length).toBeGreaterThan(0);
  });

  it("blocks when the env flag is not exactly \"true\"", () => {
    for (const value of [undefined, "", "1", "TRUE", "yes", "false"]) {
      const d = evaluatePublication({
        env: { PUBLIC_PICKS_ENABLED: value },
        sealedVerdict: sealed("SHADOW"),
        emissionGatePassed: true,
      });
      expect(d.allowed).toBe(false);
      expect(d.blockedBy.join(" ")).toContain("PUBLIC_PICKS_ENABLED");
    }
  });

  it("blocks when there is no sealed verdict", () => {
    const d = evaluatePublication({
      env: { PUBLIC_PICKS_ENABLED: "true" },
      sealedVerdict: null,
      emissionGatePassed: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.blockedBy.join(" ")).toContain("no sealed pregame verdict");
  });

  it("blocks every non-publishable verdict", () => {
    for (const verdict of ["MISSING_DATA", "PASS", "NO_BET"] as const) {
      const d = evaluatePublication({
        env: { PUBLIC_PICKS_ENABLED: "true" },
        sealedVerdict: sealed(verdict),
        emissionGatePassed: true,
      });
      expect(d.allowed).toBe(false);
      expect(d.blockedBy.join(" ")).toContain(verdict);
    }
  });

  it("blocks a sealed verdict with a malformed hash", () => {
    const d = evaluatePublication({
      env: { PUBLIC_PICKS_ENABLED: "true" },
      sealedVerdict: { verdict: "SHADOW", hash: "not-a-hash", sealedAt: "2026-11-12T21:00:00.000Z" },
      emissionGatePassed: true,
    });
    expect(d.allowed).toBe(false);
    expect(d.blockedBy.join(" ")).toContain("manifest hash");
  });

  it("blocks when the emission gate has not passed", () => {
    const d = evaluatePublication({
      env: { PUBLIC_PICKS_ENABLED: "true" },
      sealedVerdict: sealed("SHADOW"),
      emissionGatePassed: false,
    });
    expect(d.allowed).toBe(false);
    expect(d.blockedBy.join(" ")).toContain("emission gate");
  });

  it("allows only when every condition holds", () => {
    const d = evaluatePublication({
      env: { PUBLIC_PICKS_ENABLED: "true" },
      sealedVerdict: sealed("SHADOW"),
      emissionGatePassed: true,
    });
    expect(d.allowed).toBe(true);
    expect(d.blockedBy).toEqual([]);
  });

  it("reports every blocker at once, not just the first", () => {
    const d = evaluatePublication({ env: {} });
    expect(d.blockedBy.length).toBe(3);
  });

  it("publicationAllowed is false in the real environment today", () => {
    // The emission gate reads passed:false, so even with the flag on this is
    // false. This assertion is the point of the module.
    expect(publicationAllowed({ env: { PUBLIC_PICKS_ENABLED: "true" } })).toBe(false);
  });
});
