/**
 * Vitest suite for arXiv:2506.04282v1 (DrSR: LLM based Scientific Equation Discovery with Dual Reasoning from Data and Experience).
 * Gate: ADOPT dual reasoning if full DrSR-style beats plain GSE-SR by ≥15% OOD NMSE on 2024–2025 AND valid-program rate ≥90% (vs whatever plain achieves); REJECT if the insight/idea modules add cost without ≥15% gain.
 */
import { describe, it, expect } from "vitest";
import { ideaWorkingSet, auditLine, auditWorthy, ENABLED } from "./2506-04282v1-drsr-llm-based-scientific-equation";

describe("2506-04282v1 DrSR dual-reasoning loop (disabled)", () => {
  it("ranks experience and counts distinct skeletons", () => {
    const exp = [
      { skeleton: "+ V C", score: 0.8 },
      { skeleton: "* V V", score: 0.9 },
      { skeleton: "+ V C", score: 0.85 },
    ];
    const { top, distinctSkeletons } = ideaWorkingSet(exp, 2);
    expect(top[0]!.skeleton).toBe("* V V");
    expect(top).toHaveLength(2);
    expect(distinctSkeletons).toBe(2);
  });
  it("formats and filters the analyst audit", () => {
    const ins = [
      { text: "pressure residuals spike in dome games", evidence: "resid +0.4", confidence: 0.8 },
      { text: "noise", evidence: "none", confidence: 0.2 },
    ];
    expect(auditWorthy(ins)).toHaveLength(1);
    expect(auditLine(ins[0]!)).toContain("dome games");
  });
  it("is disabled pending the LLM insight/idea modules", () => {
    expect(ENABLED).toBe(false);
  });
});
