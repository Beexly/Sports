import { describe, expect, it } from "vitest";
import { compilableClaims, compileClaim, OBLIGATIONS_BY_TYPE, type TypedClaim } from "../claim-lang";
import type { ClaimContext } from "@/lib/claims/public-claim-compiler";

const cleanPublic = (over: Partial<ClaimContext> = {}): ClaimContext => ({
  kind: "GENERIC",
  text: "We grade every decision with a receipt.",
  canExposePerformanceStats: true,
  settledSampleSize: 500,
  minSettledForPublic: 100,
  isBootstrap: false,
  ...over,
});

describe("ClaimLang / TruthCompiler", () => {
  it("blocks a fact claim missing required obligations", () => {
    const claim: TypedClaim = { id: "c1", type: "fact", statement: "X is true", visibility: "internal", satisfied: ["as-of-timestamp"] };
    const r = compileClaim(claim);
    expect(r.ok).toBe(false);
    expect(r.unmet).toContain("evidence-ref");
    expect(r.compiledStatement).toBeNull();
  });

  it("compiles a fact claim once all obligations are satisfied", () => {
    const claim: TypedClaim = { id: "c2", type: "fact", statement: "X is true", visibility: "internal", satisfied: ["as-of-timestamp", "evidence-ref"] };
    const r = compileClaim(claim);
    expect(r.ok).toBe(true);
    expect(r.compiledStatement).toBe("X is true");
  });

  it("requires a public-claim context for performance claims and delegates to the public compiler", () => {
    const missingCtx: TypedClaim = {
      id: "perf-1",
      type: "performance",
      statement: "We win a lot",
      visibility: "public",
      satisfied: ["as-of-timestamp", "model-version", "calibration-context"],
    };
    expect(compileClaim(missingCtx).ok).toBe(false);

    // Performance gate ALLOWs only when the underlying public compiler allows.
    const blocked: TypedClaim = {
      ...missingCtx,
      id: "perf-2",
      publicClaim: cleanPublic({ kind: "WIN_RATE", settledSampleSize: 3, minSettledForPublic: 100, modelVersion: "v1" }),
    };
    const blockedResult = compileClaim(blocked);
    expect(blockedResult.ok).toBe(false);
    expect(blockedResult.publicCompile?.verdict).toBe("BLOCK");
  });

  it("allows a performance claim when the public compiler allows", () => {
    const ok: TypedClaim = {
      id: "perf-3",
      type: "performance",
      statement: "Calibrated, model-stamped, settled performance.",
      visibility: "public",
      satisfied: ["as-of-timestamp", "model-version", "calibration-context"],
      publicClaim: cleanPublic({ kind: "ROI", modelVersion: "v2026.6.1", settledSampleSize: 500, minSettledForPublic: 100 }),
    };
    const r = compileClaim(ok);
    expect(r.ok).toBe(true);
    expect(r.publicCompile?.verdict).toBe("ALLOW");
  });

  it("blocks any public claim that trips the banned-phrase scanner", () => {
    const claim: TypedClaim = {
      id: "perf-4",
      type: "performance",
      statement: "guaranteed lock of the year",
      visibility: "public",
      satisfied: ["as-of-timestamp", "model-version", "calibration-context"],
      publicClaim: cleanPublic({ kind: "GENERIC", text: "This is a guaranteed lock — can't lose." }),
    };
    expect(compileClaim(claim).ok).toBe(false);
  });

  it("compilableClaims keeps only passing claims", () => {
    const good: TypedClaim = { id: "g", type: "fact", statement: "ok", visibility: "internal", satisfied: ["as-of-timestamp", "evidence-ref"] };
    const bad: TypedClaim = { id: "b", type: "fact", statement: "no", visibility: "internal", satisfied: [] };
    expect(compilableClaims([good, bad]).map((c) => c.id)).toEqual(["g"]);
  });

  it("forecast claims require an uncertainty band and a falsifier", () => {
    expect(OBLIGATIONS_BY_TYPE.forecast).toContain("uncertainty-band");
    expect(OBLIGATIONS_BY_TYPE.forecast).toContain("falsifier");
  });
});
