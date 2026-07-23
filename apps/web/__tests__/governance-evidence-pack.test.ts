/**
 * `buildEvidencePack` — pure assembly of the (honest, non-certifying)
 * EU AI Act evidence pack. See docs/governance/EU_AI_ACT_EVIDENCE_PACK.md.
 */
import { describe, it, expect } from "vitest";
import {
  buildEvidencePack,
  type EvidenceItem,
} from "@/lib/governance/evidence-pack";

const DISCLAIMER =
  "Evidence inventory only. Not a declaration of EU AI Act conformity, CE marking, or high-risk certification.";

describe("buildEvidencePack", () => {
  it("carries the disclaimer verbatim", () => {
    const pack = buildEvidencePack([]);
    expect(pack.disclaimer).toBe(DISCLAIMER);
  });

  it("passes items through unchanged", () => {
    const items: EvidenceItem[] = [
      { id: "a", control: "control-a", artifactPath: "docs/a.md" },
      {
        id: "b",
        control: "control-b",
        artifactPath: "docs/b.md",
        nist: "AC-1",
        iso42001: "6.2",
        euTheme: "risk-management",
      },
    ];
    const pack = buildEvidencePack(items);
    expect(pack.items).toEqual(items);
    expect(pack.items).toHaveLength(2);
  });

  it("produces a valid ISO timestamp in generatedAt", () => {
    const pack = buildEvidencePack([]);
    expect(() => new Date(pack.generatedAt)).not.toThrow();
    const parsed = new Date(pack.generatedAt);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(pack.generatedAt).toBe(parsed.toISOString());
  });

  it("handles an empty items array (the honest common case here)", () => {
    const pack = buildEvidencePack([]);
    expect(pack.items).toEqual([]);
  });
});
