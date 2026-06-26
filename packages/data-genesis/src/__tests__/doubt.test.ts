import { describe, it, expect } from "vitest";
import { buildStructuredDoubt, hasBlockingDoubt, summarizeDoubt, type DoubtCaseInput } from "../doubt.js";
import { toSignalId } from "../brands.js";

const signal = { signalId: toSignalId("test") };
const at = "2026-06-26T00:00:00.000Z";

function build(cases: DoubtCaseInput[]) {
  return buildStructuredDoubt(signal, cases, at);
}

describe("StructuredDoubt — blocking rules", () => {
  it("a critical unresolved doubt blocks promotion", () => {
    const d = build([{ category: "data_quality", severity: "critical", claim: "c", evidence: "e" }]);
    expect(d.unresolvedCriticalCount).toBe(1);
    expect(d.promotionBlocked).toBe(true);
    expect(hasBlockingDoubt(d)).toBe(true);
  });

  it("a critical doubt WITH a mitigation no longer blocks (resolved)", () => {
    const d = build([{ category: "data_quality", severity: "critical", claim: "c", evidence: "e", mitigation: "added a second source" }]);
    expect(d.unresolvedCriticalCount).toBe(0);
    expect(d.promotionBlocked).toBe(false);
  });

  it("licensing doubts default to blocking unless explicitly mitigated", () => {
    expect(build([{ category: "licensing", severity: "low", claim: "c", evidence: "e" }]).promotionBlocked).toBe(true);
    expect(build([{ category: "licensing", severity: "low", claim: "c", evidence: "e", mitigation: "license confirmed" }]).promotionBlocked).toBe(false);
  });

  it("model_leakage doubts default to blocking unless explicitly mitigated", () => {
    expect(build([{ category: "model_leakage", severity: "medium", claim: "c", evidence: "e" }]).promotionBlocked).toBe(true);
    expect(build([{ category: "model_leakage", severity: "medium", claim: "c", evidence: "e", mitigation: "feature audited; no target leak" }]).promotionBlocked).toBe(false);
  });

  it("market_absorption does not block by default (it reduces readiness, not gates)", () => {
    const d = build([{ category: "market_absorption", severity: "high", claim: "c", evidence: "e" }]);
    expect(d.promotionBlocked).toBe(false);
  });

  it("an empty doubt set is allowed and non-blocking", () => {
    const d = build([]);
    expect(d.cases).toHaveLength(0);
    expect(d.promotionBlocked).toBe(false);
    expect(summarizeDoubt(d)).toMatch(/no doubt cases/);
  });

  it("each case gets a deterministic, namespaced doubt id", () => {
    const d = build([
      { category: "data_quality", severity: "low", claim: "a", evidence: "e" },
      { category: "sample_size", severity: "low", claim: "b", evidence: "e" },
    ]);
    expect(d.cases[0]!.doubtId.startsWith("doubt:")).toBe(true);
    expect(d.cases[0]!.doubtId).not.toBe(d.cases[1]!.doubtId);
  });
});
